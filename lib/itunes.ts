/**
 * Apple iTunes Search API client.
 *
 * Free, no authentication, CORS-friendly (we proxy it anyway for caching).
 * Returns 30-second MP3 preview clips for songs.
 * Docs: https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/
 */

import type { ItunesPreview } from "@/types";

const ITUNES_BASE = "https://itunes.apple.com";

interface ItunesRawTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string;
  previewUrl?: string;
  artworkUrl100?: string;
  trackTimeMillis?: number;
  kind?: string;
}

/**
 * Search iTunes for a track preview by name + artist.
 *
 * Strategy: query "{trackName} {artistName}", entity=song, limit=5, then
 * pick the result whose trackName most closely matches (case-insensitive).
 * This handles slight iTunes ↔ MusicBrainz title discrepancies.
 */
export async function searchItunesPreview(
  trackName: string,
  artistName: string,
): Promise<ItunesPreview | undefined> {
  const term = `${trackName} ${artistName}`.trim();
  const url = new URL(`${ITUNES_BASE}/search`);
  url.searchParams.set("term", term);
  url.searchParams.set("entity", "song");
  url.searchParams.set("media", "music");
  url.searchParams.set("limit", "5");

  try {
    const res = await fetch(url.toString(), {
      // iTunes responses are stable — cache for 1 hour
      next: { revalidate: 3600 },
    });
    if (!res.ok) return undefined;

    const data = (await res.json()) as {
      resultCount: number;
      results: ItunesRawTrack[];
    };

    if (!data.resultCount || !data.results.length) return undefined;

    // Prefer a result whose track name matches exactly (case-insensitive),
    // then fall back to the first result with a previewUrl.
    const normalised = trackName.toLowerCase().trim();
    const exact = data.results.find(
      (r) => r.trackName.toLowerCase().trim() === normalised && r.previewUrl,
    );
    const best = exact ?? data.results.find((r) => r.previewUrl);

    if (!best?.previewUrl) return undefined;

    return {
      trackId: best.trackId,
      trackName: best.trackName,
      artistName: best.artistName,
      collectionName: best.collectionName,
      previewUrl: best.previewUrl,
      artworkUrl: best.artworkUrl100,
      durationMs: best.trackTimeMillis,
    };
  } catch {
    return undefined;
  }
}
