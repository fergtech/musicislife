import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface Params {
  params: { id: string; itemId: string };
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify the list belongs to this user
  const list = await prisma.list.findUnique({ where: { id: params.id } });
  if (!list || list.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const item = await prisma.listItem.findUnique({ where: { id: params.itemId } });
  if (!item || item.listId !== params.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.listItem.delete({ where: { id: params.itemId } });
  return new NextResponse(null, { status: 204 });
}
