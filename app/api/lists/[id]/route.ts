import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

interface Params {
  params: { id: string };
}

async function requireListOwnership(userId: string, listId: string) {
  const list = await prisma.list.findUnique({ where: { id: listId } });
  if (!list) return null;
  if (list.userId !== userId) return null;
  return list;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const list = await requireListOwnership(session.user.id, params.id);
  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const full = await prisma.list.findUnique({
    where: { id: params.id },
    include: { items: { orderBy: { createdAt: "asc" } } },
  });
  return NextResponse.json(full);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const list = await requireListOwnership(session.user.id, params.id);
  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = z.object({
    name: z.string().min(1).max(120),
    description: z.string().max(500).nullable().optional(),
  }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
  }

  const updated = await prisma.list.update({
    where: { id: params.id },
    data: {
      name: parsed.data.name,
      ...(parsed.data.description !== undefined && { description: parsed.data.description }),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const list = await requireListOwnership(session.user.id, params.id);
  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.list.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}
