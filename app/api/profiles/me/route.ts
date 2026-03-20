import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import type { SocialLinks, ProfileRow } from "@/types";

const USERNAME_RE = /^[a-z0-9_-]+$/;

const SocialLinksSchema = z.object({
  instagram: z.string().max(30).optional(),
  twitter:   z.string().max(15).optional(),
  tiktok:    z.string().max(24).optional(),
  website:   z.string().url().max(200).optional().or(z.literal("")),
  email:     z.string().email().max(200).optional().or(z.literal("")),
}).optional();

const PatchSchema = z.object({
  username:    z.string().min(3).max(30).regex(USERNAME_RE, "Letters, numbers, _ and - only").optional(),
  avatarUrl:   z.string().max(600_000).nullable().optional(), // base64 data URL; ~450KB raw → 600KB encoded
  socialLinks: SocialLinksSchema,
  isPublic:    z.boolean().optional(),
});

function serialize(p: {
  id: string; userId: string; username: string; avatarUrl: string | null;
  socialLinks: Prisma.JsonValue; isPublic: boolean;
  createdAt: Date; updatedAt: Date;
}): ProfileRow {
  return {
    ...p,
    socialLinks: (p.socialLinks ?? {}) as SocialLinks,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.profile.findUnique({ where: { userId: session.user.id } });
  return NextResponse.json({ profile: profile ? serialize(profile) : null });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
  }

  const data = parsed.data;
  const username = data.username?.toLowerCase();

  // Check if this is a first-time save (no existing profile)
  const existing = await prisma.profile.findUnique({ where: { userId: session.user.id } });
  if (!existing && !username) {
    return NextResponse.json({ error: "Username is required to create a profile." }, { status: 400 });
  }

  // Clean social links: strip empty strings so stored JSON stays clean
  const cleanedLinks = data.socialLinks
    ? Object.fromEntries(
        Object.entries(data.socialLinks).filter(([, v]) => v !== "" && v !== undefined)
      ) as SocialLinks
    : undefined;

  try {
    const profile = await prisma.profile.upsert({
      where: { userId: session.user.id },
      create: {
        userId:      session.user.id,
        username:    username!,
        avatarUrl:   data.avatarUrl ?? null,
        socialLinks: (cleanedLinks ?? {}) as Prisma.InputJsonValue,
        isPublic:    data.isPublic ?? true,
      },
      update: {
        ...(username                    && { username }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
        ...(cleanedLinks !== undefined   && { socialLinks: cleanedLinks as Prisma.InputJsonValue }),
        ...(data.isPublic !== undefined  && { isPublic: data.isPublic }),
      },
    });

    return NextResponse.json({ profile: serialize(profile) });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
    }
    throw e;
  }
}
