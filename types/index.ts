// ─── MusicBrainz raw shapes (trimmed to what we use) ─────────────────────────

export interface MBArtistCredit {
  name?: string;
  artist: {
    id: string;
    name: string;
    "sort-name": string;
  };
  joinphrase?: string;
}

export interface MBRelease {
  id: string;
  title: string;
  date?: string;
  "artist-credit"?: MBArtistCredit[];
}

export interface MBRecording {
  id: string;
  title: string;
  length?: number;
  score?: number;
  "artist-credit"?: MBArtistCredit[];
  releases?: MBRelease[];
}

export interface MBReleaseDetail extends MBRelease {
  id: string;
  title: string;
  date?: string;
  "artist-credit"?: MBArtistCredit[];
  "label-info"?: Array<{ label?: { name: string } }>;
  media?: Array<{
    position?: number;
    tracks?: Array<{
      id: string;
      position?: number;
      title: string;
      length?: number;
      recording: MBRecording;
    }>;
  }>;
  relations?: MBRelation[];
}

export interface MBRecordingDetail extends MBRecording {
  id: string;
  title: string;
  "artist-credit"?: MBArtistCredit[];
  releases?: MBRelease[];
  relations?: MBRelation[];
}

export interface MBRelation {
  type: string;
  "target-type": string;
  direction: string;
  artist?: {
    id: string;
    name: string;
  };
  attributes?: string[];
}

// ─── Normalized suggestion returned to the client ────────────────────────────

export interface SearchSuggestion {
  mbId: string;
  type: "SONG" | "ALBUM";
  title: string;
  artistName: string;
  albumName?: string;     // for songs: which album it appeared on
  releaseYear?: number;
  coverArtUrl?: string;   // may be null until full metadata is fetched
  score?: number;
}

export interface ArtistSuggestion {
  mbId: string;
  type: "ARTIST";
  name: string;
  disambiguation?: string;  // e.g. "soul group" — disambiguates same-name artists
  artistType?: string;      // "Person" | "Group" | "Orchestra" etc.
  score?: number;
}

// ─── Full metadata used when adding an item ───────────────────────────────────

export interface ItemMetadata {
  mbId: string;
  artistMbId?: string;
  type: "SONG" | "ALBUM";
  title: string;
  artistName: string;
  albumName?: string;
  releaseYear?: number;
  coverArtUrl?: string;
  writers: string[];
  producers: string[];
  rawMetadata?: unknown;
}

// ─── API response shapes ──────────────────────────────────────────────────────

export interface ApiError {
  error: string;
}

export type SearchType = "SONG" | "ALBUM" | "ARTIST";

// ─── Discovery Mode ───────────────────────────────────────────────────────────

export interface DiscoverParams {
  decadeStart: number;
  decadeEnd: number;
  tags: string[];          // e.g. ["soul", "funk"]
  format: "album" | "song";
  offset?: number;
  limit?: number;
}

export interface DiscoverResult {
  /** Release-group MBID (albums) or recording MBID (songs) */
  mbId: string;
  /** First-release MBID — used as the cover art key for songs (release) */
  releaseId?: string;
  type: "ALBUM" | "SONG";
  /** MB primary type string, e.g. "Album", "Single", "EP" */
  primaryType?: string;
  title: string;
  artistName: string;
  artistMbId?: string;
  releaseYear?: number;
  /**
   * For albums: https://coverartarchive.org/release-group/{mbId}/front-250
   * For songs:  https://coverartarchive.org/release/{releaseId}/front-250
   * These are redirect URLs — browsers follow them automatically in <img> tags.
   */
  coverArtUrl?: string;
  tags: string[];
}

export interface DiscoverResponse {
  results: DiscoverResult[];
  total: number;
  offset: number;
  limit: number;
}

// Preset constants shared between frontend and any server helpers
export const DISCOVER_DECADES = [
  { label: "50s", start: 1950, end: 1959 },
  { label: "60s", start: 1960, end: 1969 },
  { label: "70s", start: 1970, end: 1979 },
  { label: "80s", start: 1980, end: 1989 },
  { label: "90s", start: 1990, end: 1999 },
  { label: "00s", start: 2000, end: 2009 },
  { label: "10s", start: 2010, end: 2019 },
  { label: "20s", start: 2020, end: 2029 },
] as const;

export const DISCOVER_GENRES = [
  { id: "soul",       label: "Soul" },
  { id: "r&b",        label: "R&B" },
  { id: "funk",       label: "Funk" },
  { id: "jazz",       label: "Jazz" },
  { id: "blues",      label: "Blues" },
  { id: "rock",       label: "Rock" },
  { id: "hip-hop",    label: "Hip-Hop" },
  { id: "electronic", label: "Electronic" },
  { id: "pop",        label: "Pop" },
  { id: "reggae",     label: "Reggae" },
  { id: "disco",      label: "Disco" },
  { id: "gospel",     label: "Gospel" },
  { id: "country",    label: "Country" },
  { id: "latin",      label: "Latin" },
  { id: "punk",       label: "Punk" },
  { id: "metal",      label: "Metal" },
  { id: "classical",  label: "Classical" },
] as const;

// ─── Tracklist / Album Preview ───────────────────────────────────────────────

export interface TracklistTrack {
  position: number;
  title: string;
  recordingMbId: string;
  durationMs?: number;
}

export interface AlbumTracklist {
  releaseId: string;
  releaseGroupId: string;
  title: string;
  artistName: string;
  artistMbId?: string;
  releaseYear?: number;
  coverArtUrl?: string;
  tracks: TracklistTrack[];
}

// ─── iTunes Search API ────────────────────────────────────────────────────────

export interface ItunesPreview {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string;
  previewUrl: string;
  artworkUrl?: string;
  durationMs?: number;
}

// ─── Prisma-derived types (extended) ─────────────────────────────────────────

export interface ListWithCount {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  _count: { items: number };
}

export interface ListItemRow {
  id: string;
  type: "SONG" | "ALBUM";
  mbId: string;
  artistMbId: string | null;
  title: string;
  artistName: string;
  albumName: string | null;
  releaseYear: number | null;
  coverArtUrl: string | null;
  writers: string[];
  producers: string[];
  createdAt: string;
}
