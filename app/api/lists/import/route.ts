import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const ImportItemSchema = z.object({
  type: z.enum(["SONG", "ALBUM"]),
  mbId: z.string().min(1),
  artistMbId: z.string().nullable().optional(),
  title: z.string().min(1),
  artistName: z.string().min(1),
  albumName: z.string().nullable().optional(),
  releaseYear: z.number().int().nullable().optional(),
  coverArtUrl: z.string().nullable().optional(),
  writers: z.array(z.string()).optional(),
  producers: z.array(z.string()).optional(),
});

const ImportSchema = z.object({
  version: z.literal(1),
  app: z.literal("musicislyfe"),
  name: z.string().min(1).max(120),
  description: z.string().max(500).nullable().optional(),
  items: z.array(ImportItemSchema),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = ImportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid file format. Make sure this is a musicislyfe export." },
      { status: 400 },
    );
  }

  const { name, description, items } = parsed.data;

  const list = await prisma.list.create({
    data: {
      name,
      description: description ?? null,
      userId: session.user.id,
      items: {
        create: items.map((item) => ({
          type: item.type,
          mbId: item.mbId,
          artistMbId: item.artistMbId ?? null,
          title: item.title,
          artistName: item.artistName,
          albumName: item.albumName ?? null,
          releaseYear: item.releaseYear ?? null,
          coverArtUrl: item.coverArtUrl ?? null,
          writers: item.writers ?? [],
          producers: item.producers ?? [],
        })),
      },
    },
  });

  return NextResponse.json({ id: list.id }, { status: 201 });
}
