import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { discover, buildDiscoverQuery } from "@/lib/musicbrainz";
import type { DiscoverParams } from "@/types";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;

  // Parse + validate query params
  const decadeStart = parseInt(sp.get("decadeStart") ?? "", 10);
  const decadeEnd = parseInt(sp.get("decadeEnd") ?? "", 10);
  const rawTags = sp.get("tags") ?? "";
  const format = sp.get("format") ?? "album";
  const offset = parseInt(sp.get("offset") ?? "0", 10);
  const limit = parseInt(sp.get("limit") ?? "20", 10);

  if (isNaN(decadeStart) || isNaN(decadeEnd) || decadeStart > decadeEnd) {
    return NextResponse.json({ error: "Invalid decade range" }, { status: 400 });
  }
  if (format !== "album" && format !== "song") {
    return NextResponse.json({ error: "format must be album or song" }, { status: 400 });
  }

  const tags = rawTags
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  if (tags.length === 0) {
    return NextResponse.json({ error: "At least one tag is required" }, { status: 400 });
  }

  const params: DiscoverParams = {
    decadeStart,
    decadeEnd,
    tags,
    format: format as "album" | "song",
    offset: isNaN(offset) ? 0 : offset,
    limit: isNaN(limit) ? 20 : Math.min(limit, 50),
  };

  // Expose the built query in the response for transparency / debugging
  const builtQuery = buildDiscoverQuery(params);

  try {
    const response = await discover(params);
    return NextResponse.json({ ...response, _query: builtQuery });
  } catch (err) {
    console.error("[discover]", err);
    return NextResponse.json({ error: "Discovery fetch failed" }, { status: 502 });
  }
}
