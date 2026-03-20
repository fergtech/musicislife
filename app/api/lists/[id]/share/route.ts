import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { randomBytes } from "crypto";

interface Params {
  params: { id: string };
}

async function requireOwnership(userId: string, listId: string) {
  const list = await prisma.list.findUnique({ where: { id: listId } });
  if (!list || list.userId !== userId) return null;
  return list;
}

// GET — return existing share URL, or generate one if none exists
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const list = await requireOwnership(session.user.id, params.id);
  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let { shareToken } = list;
  if (!shareToken) {
    shareToken = randomBytes(16).toString("hex");
    await prisma.list.update({ where: { id: params.id }, data: { shareToken } });
  }

  return NextResponse.json({ shareToken });
}

// DELETE — revoke the share link
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const list = await requireOwnership(session.user.id, params.id);
  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.list.update({ where: { id: params.id }, data: { shareToken: null } });
  return new NextResponse(null, { status: 204 });
}
