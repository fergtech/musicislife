import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { searchItunesPreview } from "@/lib/itunes";

/**
 * GET /api/itunes?track=...&artist=...
 *
 * Proxies the iTunes Search API server-side so that:
 * - Results are cached at the Next.js fetch layer (1 hour)
 * - We don't expose iTunes calls directly from the browser
 * - The User-Agent is consistent
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const track = sp.get("track")?.trim();
  const artist = sp.get("artist")?.trim();

  if (!track || !artist) {
    return NextResponse.json({ error: "track and artist are required" }, { status: 400 });
  }

  try {
    const preview = await searchItunesPreview(track, artist);

    if (!preview) {
      // 204 No Content — not an error, just no preview available for this track
      return new NextResponse(null, { status: 204 });
    }

    return NextResponse.json(preview, {
      headers: {
        // Tell the browser to cache this response too
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    console.error("[itunes]", err);
    return NextResponse.json({ error: "iTunes lookup failed" }, { status: 502 });
  }
}
