import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const CreateListSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lists = await prisma.list.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { items: true } } },
  });

  return NextResponse.json(lists);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = CreateListSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
  }

  const list = await prisma.list.create({
    data: { name: parsed.data.name, description: parsed.data.description ?? null, userId: session.user.id },
    include: { _count: { select: { items: true } } },
  });

  return NextResponse.json(list, { status: 201 });
}
