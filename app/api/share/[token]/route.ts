import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface Params {
  params: { token: string };
}

// GET — public: return list data for the share preview page (no auth required)
export async function GET(_req: NextRequest, { params }: Params) {
  const list = await prisma.list.findUnique({
    where: { shareToken: params.token },
    include: { items: { orderBy: { createdAt: "asc" } } },
  });

  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    name: list.name,
    description: list.description ?? null,
    itemCount: list.items.length,
    createdAt: list.createdAt.toISOString(),
    items: list.items.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      artistName: item.artistName,
      albumName: item.albumName ?? null,
      releaseYear: item.releaseYear ?? null,
      coverArtUrl: item.coverArtUrl ?? null,
    })),
  });
}

// POST — authenticated: copy shared list into the current user's account
export async function POST(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const source = await prisma.list.findUnique({
    where: { shareToken: params.token },
    include: { items: { orderBy: { createdAt: "asc" } } },
  });

  if (!source) return NextResponse.json({ error: "Share link not found or expired" }, { status: 404 });

  const copy = await prisma.list.create({
    data: {
      name: source.name,
      description: source.description ?? null,
      userId: session.user.id,
      items: {
        create: source.items.map((item) => ({
          type: item.type,
          mbId: item.mbId,
          artistMbId: item.artistMbId ?? null,
          title: item.title,
          artistName: item.artistName,
          albumName: item.albumName ?? null,
          releaseYear: item.releaseYear ?? null,
          coverArtUrl: item.coverArtUrl ?? null,
          writers: item.writers,
          producers: item.producers,
        })),
      },
    },
  });

  return NextResponse.json({ id: copy.id }, { status: 201 });
}
