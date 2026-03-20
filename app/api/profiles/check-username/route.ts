import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const USERNAME_RE = /^[a-z0-9_-]{3,30}$/;

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("username") ?? "";
  const username = raw.toLowerCase().trim();

  if (!USERNAME_RE.test(username)) {
    return NextResponse.json({
      available: false,
      reason: "Username must be 3–30 characters (letters, numbers, _ or -).",
    });
  }

  const existing = await prisma.profile.findUnique({ where: { username } });
  return NextResponse.json({ available: !existing });
}
