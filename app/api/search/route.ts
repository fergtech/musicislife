import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  searchAll,
  fetchArtistAlbums,
  fetchArtistSongs,
} from "@/lib/musicbrainz";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q")?.trim();
  const type = searchParams.get("type")?.toUpperCase();
  const artistId = searchParams.get("artistId");

  // Artist browse: ?type=ARTIST_ALBUMS&artistId=... or ?type=ARTIST_SONGS&artistId=...
  if (type === "ARTIST_ALBUMS" || type === "ARTIST_SONGS") {
    if (!artistId) {
      return NextResponse.json({ error: "artistId required" }, { status: 400 });
    }
    try {
      const results =
        type === "ARTIST_ALBUMS"
          ? await fetchArtistAlbums(artistId)
          : await fetchArtistSongs(artistId);
      return NextResponse.json(results);
    } catch (err) {
      console.error("[search artist browse]", err);
      return NextResponse.json({ error: "Failed to fetch artist works" }, { status: 502 });
    }
  }

  // Unified search
  if (!q || q.length < 2) {
    return NextResponse.json({ error: "Query too short" }, { status: 400 });
  }

  try {
    const results = await searchAll(q);
    return NextResponse.json(results);
  } catch (err) {
    console.error("[search]", err);
    return NextResponse.json({ error: "Search failed" }, { status: 502 });
  }
}
