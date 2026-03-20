import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { SocialLinks, PublicProfile } from "@/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: { username: string } }
) {
  const username = params.username.toLowerCase();
  const session = await getServerSession(authOptions);

  const profile = await prisma.profile.findUnique({
    where: { username },
    select: {
      userId:      true,
      username:    true,
      avatarUrl:   true,
      socialLinks: true,
      isPublic:    true,
    },
  });

  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = session?.user.id === profile.userId;

  if (!profile.isPublic && !isOwner) {
    return NextResponse.json({ isPublic: false, username: profile.username }, { status: 200 });
  }

  // Fetch lists with featured-art data
  const listsRaw = await prisma.list.findMany({
    where:   { userId: profile.userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true, name: true, description: true, updatedAt: true,
      _count: { select: { items: true } },
      items: {
        where:  { coverArtUrl: { not: null } },
        take:   8,
        select: { coverArtUrl: true },
      },
    },
  });

  const lists = listsRaw.map((list) => {
    const arts = list.items.map((i) => i.coverArtUrl as string);
    const seed = list.id.charCodeAt(list.id.length - 1) % (arts.length || 1);
    return {
      id:          list.id,
      name:        list.name,
      description: list.description,
      updatedAt:   list.updatedAt.toISOString(),
      _count:      list._count,
      featuredArt: arts[seed] ?? null,
    };
  });

  const result: PublicProfile = {
    username:    profile.username,
    avatarUrl:   profile.avatarUrl,
    socialLinks: (profile.socialLinks ?? {}) as SocialLinks,
    isPublic:    profile.isPublic,
    lists,
  };

  return NextResponse.json(result);
}
