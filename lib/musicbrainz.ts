/**
 * MusicBrainz + Cover Art Archive client.
 *
 * All requests are server-side only.
 * MB requires a descriptive User-Agent header on every request.
 * MB rate limit: 1 req/sec per IP for anonymous clients.
 *
 * inc parameter reference (MB API v2):
 *   /release:       artists | labels | recordings | release-groups | media
 *                   artist-rels | label-rels | recording-rels | release-rels
 *                   release-group-rels | url-rels | work-rels
 *   /recording:     artists | releases | artist-rels | work-rels | url-rels
 *   /release-group: artists | releases | artist-credits | tags
 *
 * NOTE: "relations" is NOT a valid inc value. Use specific types (artist-rels etc.)
 */

import type {
  MBRecording,
  MBRecordingDetail,
  MBReleaseDetail,
  MBArtistCredit,
  MBRelation,
  ItemMetadata,
  SearchSuggestion,
  ArtistSuggestion,
  DiscoverParams,
  DiscoverResult,
  DiscoverResponse,
  AlbumTracklist,
  TracklistTrack,
} from "@/types";

const MB_BASE = "https://musicbrainz.org/ws/2";
const CAA_BASE = "https://coverartarchive.org";

function userAgent(): string {
  const contact = process.env.MUSICBRAINZ_CONTACT ?? "contact@example.com";
  return `musicislyfe/1.0 (${contact})`;
}

async function mbGet<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${MB_BASE}${path}`);
  // fmt=json must be present on every MB API request
  url.searchParams.set("fmt", "json");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": userAgent() },
    // Detail lookups cached 1 hour; search results 5 min
    next: { revalidate: path.startsWith("/recording/") || path.startsWith("/release/") || path.startsWith("/release-group/") ? 3600 : 300 },
  });

  if (!res.ok) {
    throw new Error(`MusicBrainz ${res.status}: ${url.pathname}`);
  }
  return res.json() as Promise<T>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Appends Lucene fuzzy operator (~) to words longer than 3 chars so that
// typos like "charman bord" will still match "Chairman of the Board".
// Short words (≤3 chars) are left literal to avoid over-matching.
function fuzzyQuery(q: string): string {
  return q
    .trim()
    .split(/\s+/)
    .map((w) => (w.length > 3 ? `${w}~` : w))
    .join(" ");
}

// MB response field is "artist-credit" (hyphenated, no 's')
function creditToName(credits: MBArtistCredit[] | undefined): string {
  if (!credits?.length) return "Unknown Artist";
  return credits.map((c) => c.name ?? c.artist.name).join(", ");
}

function creditToMbId(credits: MBArtistCredit[] | undefined): string | undefined {
  return credits?.[0]?.artist?.id;
}

function parseYear(date: string | undefined): number | undefined {
  if (!date) return undefined;
  const y = parseInt(date.slice(0, 4), 10);
  return isNaN(y) ? undefined : y;
}

// Extracts artist names from MB relation objects (returned by artist-rels inc)
function relationsOfType(relations: MBRelation[] | undefined, type: string): string[] {
  if (!relations) return [];
  return relations
    .filter((r) => r.type === type && r["target-type"] === "artist" && r.artist)
    .map((r) => r.artist!.name);
}

// ─── Cover Art Archive ────────────────────────────────────────────────────────

// Fetches the JSON index for a release and extracts the front thumbnail URL.
// The CAA JSON API: GET /release/{mbid} → { images: [{front, image, thumbnails}] }
export async function getCoverArtUrl(releaseMbId: string): Promise<string | undefined> {
  try {
    const res = await fetch(`${CAA_BASE}/release/${releaseMbId}`, {
      headers: { "User-Agent": userAgent() },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return undefined;
    const data = (await res.json()) as {
      images?: Array<{
        front: boolean;
        image: string;
        thumbnails: { "500"?: string; large?: string };
      }>;
    };
    const front = data.images?.find((img) => img.front) ?? data.images?.[0];
    return front?.thumbnails?.["500"] ?? front?.thumbnails?.large ?? front?.image;
  } catch {
    return undefined;
  }
}

// ─── Search (used by AddItemModal) ───────────────────────────────────────────

// MB recording search: GET /ws/2/recording?query=...&limit=...&fmt=json
// Response key: "recordings" (array)
export async function searchSongs(query: string, limit = 10): Promise<SearchSuggestion[]> {
  const data = await mbGet<{ recordings: MBRecording[] }>("/recording", {
    query: fuzzyQuery(query),
    limit: String(limit),
  });

  return (data.recordings ?? []).map((rec) => {
    const primaryRelease = rec.releases?.[0];
    return {
      mbId: rec.id,
      type: "SONG" as const,
      title: rec.title,
      artistName: creditToName(rec["artist-credit"]),
      albumName: primaryRelease?.title,
      releaseYear: parseYear(primaryRelease?.date),
      score: rec.score,
    };
  });
}

// MB release-group search: GET /ws/2/release-group?query=...&limit=...&fmt=json
// Returns release-group IDs — consistent with Discover and the preview page.
// Response key: "release-groups" (hyphenated), date field: "first-release-date"
export async function searchAlbums(query: string, limit = 10): Promise<SearchSuggestion[]> {
  const data = await mbGet<{
    "release-groups": Array<{
      id: string;
      title: string;
      "first-release-date"?: string;
      "primary-type"?: string;
      score?: number;
      "artist-credit"?: MBArtistCredit[];
    }>;
  }>("/release-group", {
    query: fuzzyQuery(query),
    limit: String(limit),
  });

  return (data["release-groups"] ?? []).map((rg) => ({
    mbId: rg.id,
    type: "ALBUM" as const,
    title: rg.title,
    artistName: creditToName(rg["artist-credit"]),
    releaseYear: parseYear(rg["first-release-date"]),
    score: rg.score,
  }));
}

// MB artist search: GET /ws/2/artist?query=...&limit=...&fmt=json
// Response key: "artists" (array)
// Lucene fields: artist (name), type (Person/Group/etc.), country
export async function searchArtists(query: string, limit = 10): Promise<ArtistSuggestion[]> {
  const data = await mbGet<{
    artists: Array<{
      id: string;
      name: string;
      disambiguation?: string;
      type?: string;
      score?: number;
    }>;
  }>("/artist", {
    query: fuzzyQuery(query),
    limit: String(limit),
  });

  return (data.artists ?? []).map((a) => ({
    mbId: a.id,
    type: "ARTIST" as const,
    name: a.name,
    disambiguation: a.disambiguation,
    artistType: a.type,
    score: a.score,
  }));
}

// Browse an artist's release-groups: GET /ws/2/release-group?artist={mbId}&limit=...
// "artist" browse param (not a Lucene query) returns releases for that artist.
// Response key: "release-groups"
export async function fetchArtistAlbums(artistMbId: string, limit = 20): Promise<SearchSuggestion[]> {
  const data = await mbGet<{
    "release-groups": Array<{
      id: string;
      title: string;
      "first-release-date"?: string;
      "primary-type"?: string;
      "artist-credit"?: MBArtistCredit[];
    }>;
  }>("/release-group", {
    artist: artistMbId,
    type: "album",
    limit: String(limit),
  });

  return (data["release-groups"] ?? []).map((rg) => ({
    mbId: rg.id,
    type: "ALBUM" as const,
    title: rg.title,
    artistName: creditToName(rg["artist-credit"]),
    releaseYear: parseYear(rg["first-release-date"]),
  }));
}

// Browse an artist's recordings: GET /ws/2/recording?artist={mbId}&limit=...
// Response key: "recordings"
export async function fetchArtistSongs(artistMbId: string, limit = 20): Promise<SearchSuggestion[]> {
  const data = await mbGet<{
    recordings: MBRecording[];
  }>("/recording", {
    artist: artistMbId,
    limit: String(limit),
  });

  return (data.recordings ?? []).map((rec) => {
    const primaryRelease = rec.releases?.[0];
    return {
      mbId: rec.id,
      type: "SONG" as const,
      title: rec.title,
      artistName: creditToName(rec["artist-credit"]),
      albumName: primaryRelease?.title,
      releaseYear: parseYear(primaryRelease?.date),
    };
  });
}

// Unified search: fires all three endpoints in parallel and merges by score.
// Each sub-search is capped at 5 so the merged list stays manageable (≤15).
export async function searchAll(query: string): Promise<(SearchSuggestion | ArtistSuggestion)[]> {
  const [songs, albums, artists] = await Promise.all([
    searchSongs(query, 5),
    searchAlbums(query, 5),
    searchArtists(query, 5),
  ]);
  return [...artists, ...albums, ...songs].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

// ─── Full metadata fetch (used when saving an item to a list) ─────────────────

// GET /ws/2/recording/{mbid}?inc=artists+releases+artist-rels&fmt=json
// Valid inc for recording: artists, releases, artist-rels, work-rels, url-rels
// "artist-rels" returns producer/performer credits on the recording itself.
export async function fetchSongMetadata(mbId: string): Promise<ItemMetadata> {
  const rec = await mbGet<MBRecordingDetail>(`/recording/${mbId}`, {
    inc: "artists+releases+artist-rels",
  });

  const primaryRelease = rec.releases?.[0];
  let coverArtUrl: string | undefined;
  if (primaryRelease) {
    coverArtUrl = await getCoverArtUrl(primaryRelease.id);
  }

  return {
    mbId: rec.id,
    artistMbId: creditToMbId(rec["artist-credit"]),
    type: "SONG",
    title: rec.title,
    artistName: creditToName(rec["artist-credit"]),
    albumName: primaryRelease?.title,
    releaseYear: parseYear(primaryRelease?.date),
    coverArtUrl,
    writers: relationsOfType(rec.relations, "writer"),
    producers: relationsOfType(rec.relations, "producer"),
    rawMetadata: rec,
  };
}

// GET /ws/2/release/{mbid}?inc=artists+labels&fmt=json
// Valid inc for release: artists, labels, recordings, release-groups, media
// We do NOT include relation incs here — they require specific types (artist-rels
// etc.) and writer/producer credits live on Works, not Releases.
export async function fetchAlbumMetadata(mbId: string): Promise<ItemMetadata> {
  const rel = await mbGet<MBReleaseDetail>(`/release/${mbId}`, {
    inc: "artists+labels",
  });

  const coverArtUrl = await getCoverArtUrl(rel.id);

  return {
    mbId: rel.id,
    artistMbId: creditToMbId(rel["artist-credit"]),
    type: "ALBUM",
    title: rel.title,
    artistName: creditToName(rel["artist-credit"]),
    releaseYear: parseYear(rel.date),
    coverArtUrl,
    writers: [],
    producers: [],
    rawMetadata: rel,
  };
}

// ─── Discovery ────────────────────────────────────────────────────────────────

// MB release-group search response shape
interface MBReleaseGroup {
  id: string;
  title: string;
  "primary-type"?: string;           // "Album" | "Single" | "EP" | "Broadcast" | "Other"
  "first-release-date"?: string;     // "YYYY", "YYYY-MM", or "YYYY-MM-DD"
  "artist-credit"?: MBArtistCredit[];
  releases?: Array<{ id: string; title: string }>;
  tags?: Array<{ name: string; count: number }>;
  score?: number;
}

/**
 * Builds the Lucene query string for MB release-group or recording search.
 *
 * Lucene field names (no hyphens, different from JSON response field names):
 *   release-group search: firstreleasedate, primarytype, tag
 *   recording search:     date, tag
 *
 * Examples:
 *   tag:(soul OR funk) AND firstreleasedate:[1970 TO 1979] AND primarytype:Album
 *   tag:jazz AND date:[1960 TO 1969]
 */
export function buildDiscoverQuery(params: DiscoverParams): string {
  const parts: string[] = [];

  if (params.tags.length === 1) {
    parts.push(`tag:${params.tags[0]}`);
  } else if (params.tags.length > 1) {
    parts.push(`tag:(${params.tags.join(" OR ")})`);
  }

  // Lucene field names differ from JSON response keys:
  //   release-group JSON: "first-release-date"  Lucene: firstreleasedate
  //   recording JSON: "date"                    Lucene: date
  const dateField = params.format === "album" ? "firstreleasedate" : "date";
  parts.push(`${dateField}:[${params.decadeStart} TO ${params.decadeEnd}]`);

  if (params.format === "album") {
    parts.push("primarytype:Album");
  }

  return parts.join(" AND ");
}

/**
 * Resolves a release-group MBID to its first release MBID.
 * GET /ws/2/release-group/{mbid}?inc=releases&fmt=json
 * Response includes "releases" array (valid sub-query for release-group).
 */
export async function resolveReleaseGroupToRelease(rgMbId: string): Promise<string | undefined> {
  try {
    const data = await mbGet<{ releases?: Array<{ id: string }> }>(
      `/release-group/${rgMbId}`,
      { inc: "releases" },
    );
    return data.releases?.[0]?.id;
  } catch {
    return undefined;
  }
}

// GET /ws/2/release-group?query=...&limit=...&offset=...&fmt=json
// Response key: "release-groups" (hyphenated, plural), "count", "offset"
async function discoverReleaseGroups(
  query: string,
  limit: number,
  offset: number,
): Promise<{ groups: MBReleaseGroup[]; total: number }> {
  const data = await mbGet<{
    "release-groups": MBReleaseGroup[];
    count: number;
    offset: number;
  }>("/release-group", { query, limit: String(limit), offset: String(offset) });

  return {
    groups: data["release-groups"] ?? [],
    total: data.count ?? 0,
  };
}

// GET /ws/2/recording?query=...&limit=...&offset=...&fmt=json
// Response key: "recordings" (plural), "count", "offset"
async function discoverRecordings(
  query: string,
  limit: number,
  offset: number,
): Promise<{ recordings: MBRecording[]; total: number }> {
  const data = await mbGet<{
    recordings: MBRecording[];
    count: number;
    offset: number;
  }>("/recording", { query, limit: String(limit), offset: String(offset) });

  return {
    recordings: data.recordings ?? [],
    total: data.count ?? 0,
  };
}

export async function discover(params: DiscoverParams): Promise<DiscoverResponse> {
  const limit = Math.min(params.limit ?? 20, 50);
  const offset = params.offset ?? 0;
  const query = buildDiscoverQuery(params);

  if (params.format === "song") {
    const { recordings, total } = await discoverRecordings(query, limit, offset);

    const results: DiscoverResult[] = recordings.map((rec) => {
      const primaryRelease = rec.releases?.[0];
      // CAA redirect URL: /release/{mbid}/front-250 → 250px JPEG
      const coverArtUrl = primaryRelease
        ? `${CAA_BASE}/release/${primaryRelease.id}/front-250`
        : undefined;

      return {
        mbId: rec.id,
        releaseId: primaryRelease?.id,
        type: "SONG" as const,
        title: rec.title,
        artistName: creditToName(rec["artist-credit"]),
        artistMbId: creditToMbId(rec["artist-credit"]),
        releaseYear: parseYear(primaryRelease?.date),
        coverArtUrl,
        tags: [],
      };
    });

    return { results, total, offset, limit };
  }

  const { groups, total } = await discoverReleaseGroups(query, limit, offset);

  const results: DiscoverResult[] = groups.map((rg) => ({
    mbId: rg.id,
    type: "ALBUM" as const,
    primaryType: rg["primary-type"],
    title: rg.title,
    artistName: creditToName(rg["artist-credit"]),
    artistMbId: creditToMbId(rg["artist-credit"]),
    // JSON response field: "first-release-date" (hyphenated)
    releaseYear: parseYear(rg["first-release-date"]),
    // CAA redirect URL: /release-group/{mbid}/front-250 → 250px JPEG
    coverArtUrl: `${CAA_BASE}/release-group/${rg.id}/front-250`,
    tags: (rg.tags ?? []).map((t) => t.name),
  }));

  return { results, total, offset, limit };
}

// ─── Tracklist (Album Preview page) ──────────────────────────────────────────

/**
 * Fetches a full tracklist for an album given its release-group MBID.
 * Flow: resolve RG → release → GET /release/{id}?inc=artists+recordings
 *
 * "recordings" is a valid sub-query inc for /release. It populates each
 * track's `recording` object with id, title, and length.
 */
export async function fetchAlbumTracklist(id: string): Promise<AlbumTracklist> {
  // Try id as a release-group MBID first (the normal case for items saved after the RG-ID fix).
  let releaseId = await resolveReleaseGroupToRelease(id);
  let releaseGroupId = id;

  if (!releaseId) {
    // Fall back: id might be a release MBID (items saved before the RG-ID fix).
    // Fetch the release directly to confirm it exists and recover its release-group ID.
    try {
      const rel = await mbGet<{ id: string; "release-group"?: { id: string } }>(
        `/release/${id}`,
        {},
      );
      releaseId = rel.id;
      releaseGroupId = rel["release-group"]?.id ?? id;
    } catch {
      throw new Error(`Not a valid release-group or release MBID: ${id}`);
    }
  }

  const release = await mbGet<MBReleaseDetail>(`/release/${releaseId}`, {
    inc: "artists+recordings",
  });

  const tracks: TracklistTrack[] = [];
  let globalPos = 1;
  for (const medium of release.media ?? []) {
    for (const t of medium.tracks ?? []) {
      tracks.push({
        position: t.position ?? globalPos,
        title: t.title,
        recordingMbId: t.recording.id,
        // Prefer the track-level length; fall back to recording length
        durationMs: t.length ?? t.recording.length,
      });
      globalPos++;
    }
  }

  const coverArtUrl = await getCoverArtUrl(releaseId);

  return {
    releaseId,
    releaseGroupId,
    title: release.title,
    artistName: creditToName(release["artist-credit"]),
    artistMbId: creditToMbId(release["artist-credit"]),
    releaseYear: parseYear(release.date),
    coverArtUrl,
    tracks,
  };
}
