import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchSongMetadata, fetchAlbumMetadata } from "@/lib/musicbrainz";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const mbId = searchParams.get("mbId");
  const type = searchParams.get("type")?.toUpperCase();

  if (!mbId) return NextResponse.json({ error: "mbId required" }, { status: 400 });
  if (type !== "SONG" && type !== "ALBUM") {
    return NextResponse.json({ error: "type must be SONG or ALBUM" }, { status: 400 });
  }

  try {
    const metadata = type === "SONG"
      ? await fetchSongMetadata(mbId)
      : await fetchAlbumMetadata(mbId);
    return NextResponse.json(metadata);
  } catch (err) {
    console.error("[metadata]", err);
    return NextResponse.json({ error: "Metadata fetch failed" }, { status: 502 });
  }
}
