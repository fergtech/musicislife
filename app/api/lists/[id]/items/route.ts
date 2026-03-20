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

  // Resolve release-group → release for metadata fetching.
  // We keep the release-group ID separately so we can store it as mbId —
  // the album preview page (fetchAlbumTracklist) needs the release-group ID,
  // not the individual release ID.
  let resolvedReleaseGroupId: string | undefined = releaseGroupId;

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

  // For albums: store the release-group ID as mbId so ListItemCard can link
  // directly to /discover/preview/[releaseGroupId] (fetchAlbumTracklist expects it).
  // Fall back to the resolved release MBID for albums added without an RG ID.
  const storedMbId =
    type === "ALBUM" && resolvedReleaseGroupId
      ? resolvedReleaseGroupId
      : metadata.mbId;

  // Cover art: prefer the release-group CAA URL when we have the RG ID,
  // since it's more stable than a specific release's art.
  const coverArtUrl =
    type === "ALBUM" && resolvedReleaseGroupId
      ? `https://coverartarchive.org/release-group/${resolvedReleaseGroupId}/front-250`
      : (metadata.coverArtUrl ?? null);

  const item = await prisma.listItem.create({
    data: {
      listId: params.id,
      type,
      mbId: storedMbId,
      artistMbId: metadata.artistMbId ?? null,
      title: metadata.title,
      artistName: metadata.artistName,
      albumName: metadata.albumName ?? null,
      releaseYear: metadata.releaseYear ?? null,
      coverArtUrl,
      writers: metadata.writers,
      producers: metadata.producers,
      rawMetadata: metadata.rawMetadata ?? undefined,
    },
  });

  // Bump the list's updatedAt so the dashboard sorts correctly
  await prisma.list.update({ where: { id: params.id }, data: { updatedAt: new Date() } });

  return NextResponse.json(item, { status: 201 });
}
