import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const include = {
  user: {
    select: { id: true, profile: { select: { username: true, avatarUrl: true } } },
  },
} as const;

function shape(c: any) {
  return {
    id: c.id,
    listId: c.listId,
    parentId: c.parentId,
    content: c.content,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    author: {
      id: c.user.id,
      username: c.user.profile?.username ?? "unknown",
      avatarUrl: c.user.profile?.avatarUrl ?? null,
    },
  };
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const comments = await prisma.comment.findMany({
    where: { listId: params.id },
    orderBy: { createdAt: "asc" },
    include,
  });
  return NextResponse.json(comments.map(shape));
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const list = await prisma.list.findUnique({ where: { id: params.id } });
  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const content = String(body.content ?? "").trim();
  if (!content || content.length > 1000)
    return NextResponse.json({ error: "Content required (max 1000 chars)" }, { status: 400 });

  // Validate parentId belongs to this list if provided
  if (body.parentId) {
    const parent = await prisma.comment.findUnique({ where: { id: body.parentId } });
    if (!parent || parent.listId !== params.id)
      return NextResponse.json({ error: "Invalid parentId" }, { status: 400 });
  }

  const comment = await prisma.comment.create({
    data: {
      listId: params.id,
      userId: session.user.id,
      parentId: body.parentId ?? null,
      content,
    },
    include,
  });

  return NextResponse.json(shape(comment), { status: 201 });
}
