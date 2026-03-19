import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fetchSongMetadata, fetchAlbumMetadata, resolveReleaseGroupToRelease } from "@/lib/musicbrainz";
import { z } from "zod";

interface Params {
  params: { id: string };
}

const AddItemSchema = z.object({
  mbId: z.string().min(1).optional(),
  // When adding from Discovery, pass the release-group ID instead of a release ID
  releaseGroupId: z.string().min(1).optional(),
  type: z.enum(["SONG", "ALBUM"]),
}).refine((d) => d.mbId || d.releaseGroupId, {
  message: "Either mbId or releaseGroupId is required",
});

async function requireListOwnership(userId: string, listId: string) {
  const list = await prisma.list.findUnique({ where: { id: listId } });
  if (!list || list.userId !== userId) return null;
  return list;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const list = await requireListOwnership(session.user.id, params.id);
  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const items = await prisma.listItem.findMany({
    where: { listId: params.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const list = await requireListOwnership(session.user.id, params.id);
  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = AddItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
  }

  const { type } = parsed.data;
  let { mbId, releaseGroupId } = parsed.data;

  // Resolve release-group → release if coming from Discovery
  if (type === "ALBUM" && releaseGroupId && !mbId) {
    const releaseId = await resolveReleaseGroupToRelease(releaseGroupId);
    if (!releaseId) {
      return NextResponse.json(
        { error: "Could not resolve release group to a release" },
        { status: 502 },
      );
    }
    mbId = releaseId;
  }

  // Fetch full metadata from MusicBrainz + Cover Art Archive
  let metadata;
  try {
    metadata = type === "SONG"
      ? await fetchSongMetadata(mbId!)
      : await fetchAlbumMetadata(mbId!);
  } catch (err) {
    console.error("[items POST] metadata fetch failed", err);
    return NextResponse.json({ error: "Failed to fetch metadata from MusicBrainz" }, { status: 502 });
  }

  const item = await prisma.listItem.create({
    data: {
      listId: params.id,
      type,
      mbId: metadata.mbId,
      artistMbId: metadata.artistMbId ?? null,
      title: metadata.title,
      artistName: metadata.artistName,
      albumName: metadata.albumName ?? null,
      releaseYear: metadata.releaseYear ?? null,
      coverArtUrl: metadata.coverArtUrl ?? null,
      writers: metadata.writers,
      producers: metadata.producers,
      rawMetadata: metadata.rawMetadata ?? undefined,
    },
  });

  // Bump the list's updatedAt so the dashboard sorts correctly
  await prisma.list.update({ where: { id: params.id }, data: { updatedAt: new Date() } });

  return NextResponse.json(item, { status: 201 });
}
