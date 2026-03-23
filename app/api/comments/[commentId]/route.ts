import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function deleteDescendants(commentId: string) {
  const children = await prisma.comment.findMany({ where: { parentId: commentId }, select: { id: true } });
  for (const child of children) await deleteDescendants(child.id);
  await prisma.comment.deleteMany({ where: { parentId: commentId } });
}

export async function PATCH(req: NextRequest, { params }: { params: { commentId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const comment = await prisma.comment.findUnique({ where: { id: params.commentId } });
  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (comment.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const content = String(body.content ?? "").trim();
  if (!content || content.length > 1000)
    return NextResponse.json({ error: "Content required (max 1000 chars)" }, { status: 400 });

  const updated = await prisma.comment.update({
    where: { id: params.commentId },
    data: { content },
  });
  return NextResponse.json({ id: updated.id, content: updated.content, updatedAt: updated.updatedAt.toISOString() });
}

export async function DELETE(_req: NextRequest, { params }: { params: { commentId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const comment = await prisma.comment.findUnique({
    where: { id: params.commentId },
    include: { list: { select: { userId: true } } },
  });
  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAuthor = comment.userId === session.user.id;
  const isListOwner = comment.list.userId === session.user.id;
  if (!isAuthor && !isListOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await deleteDescendants(params.commentId);
  await prisma.comment.delete({ where: { id: params.commentId } });
  return new NextResponse(null, { status: 204 });
}
