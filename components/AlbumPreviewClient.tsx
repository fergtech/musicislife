"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ChangeEvent,
} from "react";
import Link from "next/link";
import type { AlbumTracklist, ItunesPreview } from "@/types";

// ─── Types ───────────────────────────────────────────────────────────────────

type PreviewState = "loading" | "ready" | "unavailable";

interface TrackRow {
  position: number;
  title: string;
  recordingMbId: string;
  durationMs?: number;
  previewState: PreviewState;
  previewUrl?: string;
}

interface ListOption {
  id: string;
  name: string;
  _count: { items: number };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDuration(ms: number | undefined): string {
  if (!ms) return "";
  return formatTime(ms / 1000);
}

// Fetch iTunes previews for all tracks in batches of 5
async function fetchPreviewsBatch(
  tracks: AlbumTracklist["tracks"],
  artistName: string,
  onResult: (idx: number, result: ItunesPreview | null) => void,
) {
  const BATCH = 5;
  for (let i = 0; i < tracks.length; i += BATCH) {
    const batch = tracks.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (track, offset) => {
        const idx = i + offset;
        try {
          const res = await fetch(
            `/api/itunes?track=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(artistName)}`,
          );
          if (res.status === 204 || !res.ok) {
            onResult(idx, null);
          } else {
            const data: ItunesPreview = await res.json();
            onResult(idx, data);
          }
        } catch {
          onResult(idx, null);
        }
      }),
    );
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  album: AlbumTracklist;
}

export function AlbumPreviewClient({ album }: Props) {
  // Track rows with progressive preview state
  const [tracks, setTracks] = useState<TrackRow[]>(() =>
    album.tracks.map((t) => ({ ...t, previewState: "loading" })),
  );

  // Audio player state
  const [currentIdx, setCurrentIdx] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Add-to-list state
  const [lists, setLists] = useState<ListOption[]>([]);
  const [selectedListId, setSelectedListId] = useState("");
  const [addingAlbum, setAddingAlbum] = useState(false);
  const [addedAlbum, setAddedAlbum] = useState(false);
  const [addError, setAddError] = useState("");

  const [imgError, setImgError] = useState(false);

  // ── Fetch iTunes previews in background on mount ────────────────────────
  useEffect(() => {
    let cancelled = false;

    fetchPreviewsBatch(album.tracks, album.artistName, (idx, result) => {
      if (cancelled) return;
      setTracks((prev) =>
        prev.map((t, i) =>
          i === idx
            ? {
                ...t,
                previewState: result?.previewUrl ? "ready" : "unavailable",
                previewUrl: result?.previewUrl,
              }
            : t,
        ),
      );
    });

    return () => { cancelled = true; };
  }, [album.tracks, album.artistName]);

  // ── Fetch user lists on mount ────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/lists")
      .then((r) => r.json())
      .then((data: ListOption[]) => {
        setLists(data);
        if (data.length > 0) setSelectedListId(data[0].id);
      })
      .catch(() => {});
  }, []);

  // ── Audio event wiring ───────────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoaded = () => setDuration(audio.duration);
    const onEnded = () => {
      setIsPlaying(false);
      // Auto-advance to next track if available
      setCurrentIdx((prev) => {
        if (prev === null) return null;
        const next = prev + 1;
        if (next < tracks.length && tracks[next].previewState === "ready") {
          return next;
        }
        return null;
      });
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("durationchange", onLoaded);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("durationchange", onLoaded);
      audio.removeEventListener("ended", onEnded);
    };
  }, [tracks]);

  // ── When currentIdx changes, load + play the new track ──────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || currentIdx === null) return;

    const track = tracks[currentIdx];
    if (!track?.previewUrl) return;

    audio.src = track.previewUrl;
    audio.currentTime = 0;
    setCurrentTime(0);
    setDuration(0);

    audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  // tracks is intentionally excluded — we only want to react to index change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx]);

  // ── Playback controls ────────────────────────────────────────────────────
  const playTrack = useCallback((idx: number) => {
    if (currentIdx === idx) {
      // Toggle play/pause on the same track
      const audio = audioRef.current;
      if (!audio) return;
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    } else {
      setCurrentIdx(idx);
    }
  }, [currentIdx, isPlaying]);

  const handleSeek = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const t = parseFloat(e.target.value);
    audio.currentTime = t;
    setCurrentTime(t);
  }, []);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || currentIdx === null) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [isPlaying, currentIdx]);

  // ── Add album to list ────────────────────────────────────────────────────
  const handleAddAlbum = useCallback(async () => {
    if (!selectedListId) return;
    setAddingAlbum(true);
    setAddError("");

    const res = await fetch(`/api/lists/${selectedListId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Use album.releaseId (already resolved server-side during tracklist fetch)
      // so the items route can call fetchAlbumMetadata() directly without an
      // extra MB resolve step that risks rate-limiting.
      body: JSON.stringify({ mbId: album.releaseId, type: "ALBUM" }),
    });

    setAddingAlbum(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setAddError(data.error ?? "Failed to add album.");
    } else {
      setAddedAlbum(true);
    }
  }, [selectedListId, album.releaseId]);

  // ── Add individual song to list ──────────────────────────────────────────
  const [addedSongs, setAddedSongs] = useState<Set<string>>(new Set());
  const [addingSong, setAddingSong] = useState<string | null>(null);

  const handleAddSong = useCallback(
    async (recordingMbId: string) => {
      if (!selectedListId || addedSongs.has(recordingMbId)) return;
      setAddingSong(recordingMbId);

      const res = await fetch(`/api/lists/${selectedListId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mbId: recordingMbId, type: "SONG" }),
      });

      setAddingSong(null);
      if (res.ok) {
        setAddedSongs((prev) => new Set([...prev, recordingMbId]));
      }
    },
    [selectedListId, addedSongs],
  );

  const currentTrack = currentIdx !== null ? tracks[currentIdx] : null;

  return (
    <div className="space-y-6 pb-32">
      {/* Hidden audio element */}
      <audio ref={audioRef} preload="none" />

      {/* Back nav */}
      <Link
        href="/discover"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-200 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Discover
      </Link>

      {/* Album header */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
        {/* Cover art */}
        <div className="relative h-44 w-44 shrink-0 overflow-hidden rounded-xl bg-surface-2 shadow-xl">
          {album.coverArtUrl && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={album.coverArtUrl}
              alt={album.title}
              className="h-full w-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-5xl text-neutral-700">
              ◉
            </div>
          )}
        </div>

        {/* Info + add panel */}
        <div className="flex-1 space-y-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Album</p>
            <h1 className="text-2xl font-bold leading-tight text-neutral-100">{album.title}</h1>
            <p className="text-neutral-400">
              {album.artistName}
              {album.releaseYear && (
                <span className="text-neutral-600"> · {album.releaseYear}</span>
              )}
            </p>
            <p className="text-sm text-neutral-600 mt-1">
              {album.tracks.length} tracks
            </p>
          </div>

          {/* Add album to list */}
          {lists.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedListId}
                onChange={(e) => setSelectedListId(e.target.value)}
                className="rounded-lg border border-surface-3 bg-surface-2 px-3 py-1.5 text-sm text-neutral-200 outline-none focus:border-accent"
              >
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>

              {addedAlbum ? (
                <span className="text-sm text-green-400">✓ Album added</span>
              ) : (
                <button
                  onClick={handleAddAlbum}
                  disabled={addingAlbum}
                  className="btn-primary text-sm"
                >
                  {addingAlbum ? "Adding…" : "+ Add album"}
                </button>
              )}

              {addError && <p className="text-xs text-red-400">{addError}</p>}
            </div>
          )}
          {lists.length === 0 && (
            <p className="text-sm text-neutral-500">
              <Link href="/" className="text-accent hover:underline">
                Create a list
              </Link>{" "}
              to save this album.
            </p>
          )}
        </div>
      </div>

      {/* Tracklist */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Tracklist
        </h2>
        <div className="space-y-1">
          {tracks.map((track, idx) => (
            <TrackRow
              key={track.recordingMbId}
              track={track}
              isCurrentTrack={currentIdx === idx}
              isPlaying={isPlaying && currentIdx === idx}
              onPlay={() => playTrack(idx)}
              onAddSong={() => handleAddSong(track.recordingMbId)}
              added={addedSongs.has(track.recordingMbId)}
              adding={addingSong === track.recordingMbId}
              hasListSelected={!!selectedListId}
            />
          ))}
        </div>
      </div>

      {/* Mini player — sticky to bottom of viewport */}
      {currentTrack && (
        <MiniPlayer
          track={currentTrack}
          albumTitle={album.title}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          onToggle={togglePlayPause}
          onSeek={handleSeek}
        />
      )}
    </div>
  );
}

// ─── TrackRow ─────────────────────────────────────────────────────────────────

function TrackRow({
  track,
  isCurrentTrack,
  isPlaying,
  onPlay,
  onAddSong,
  added,
  adding,
  hasListSelected,
}: {
  track: TrackRow;
  isCurrentTrack: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onAddSong: () => void;
  added: boolean;
  adding: boolean;
  hasListSelected: boolean;
}) {
  return (
    <div
      className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
        isCurrentTrack ? "bg-accent/10 border border-accent/30" : "hover:bg-surface-2"
      }`}
    >
      {/* Track number */}
      <span
        className={`w-6 shrink-0 text-right text-xs ${
          isCurrentTrack ? "text-accent" : "text-neutral-600"
        }`}
      >
        {isCurrentTrack && isPlaying ? (
          <span className="inline-block animate-pulse">▶</span>
        ) : (
          track.position
        )}
      </span>

      {/* Title */}
      <span
        className={`flex-1 truncate text-sm ${
          isCurrentTrack ? "font-medium text-accent" : "text-neutral-200"
        }`}
      >
        {track.title}
      </span>

      {/* Duration */}
      {track.durationMs && (
        <span className="shrink-0 text-xs text-neutral-600 tabular-nums">
          {formatDuration(track.durationMs)}
        </span>
      )}

      {/* Play button */}
      <PlayButton state={track.previewState} isPlaying={isCurrentTrack && isPlaying} onPlay={onPlay} />

      {/* Add song button — visible on hover or when track is current */}
      {hasListSelected && (
        <button
          onClick={onAddSong}
          disabled={added || adding}
          title={added ? "Added" : "Add song to list"}
          className={`shrink-0 rounded p-1 text-xs transition-colors ${
            added
              ? "text-green-400"
              : "text-neutral-600 hover:text-neutral-200 opacity-0 group-hover:opacity-100"
          }`}
        >
          {adding ? "…" : added ? "✓" : "+"}
        </button>
      )}
    </div>
  );
}

// ─── PlayButton ───────────────────────────────────────────────────────────────

function PlayButton({
  state,
  isPlaying,
  onPlay,
}: {
  state: PreviewState;
  isPlaying: boolean;
  onPlay: () => void;
}) {
  if (state === "loading") {
    return (
      <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-surface-3" />
    );
  }

  if (state === "unavailable") {
    return (
      <div
        title="No preview available"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-700 cursor-not-allowed"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      </div>
    );
  }

  return (
    <button
      onClick={onPlay}
      aria-label={isPlaying ? "Pause preview" : "Play preview"}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-white transition-transform hover:scale-110 active:scale-95"
    >
      {isPlaying ? (
        // Pause icon
        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
        </svg>
      ) : (
        // Play icon (offset slightly for optical centering)
        <svg className="h-3.5 w-3.5 translate-x-px" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      )}
    </button>
  );
}

// ─── MiniPlayer ───────────────────────────────────────────────────────────────

function MiniPlayer({
  track,
  albumTitle,
  isPlaying,
  currentTime,
  duration,
  onToggle,
  onSeek,
}: {
  track: TrackRow;
  albumTitle: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onToggle: () => void;
  onSeek: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-surface-2 bg-surface-1/95 px-4 py-3 backdrop-blur-md">
      <div className="mx-auto max-w-4xl">
        {/* Progress bar */}
        <div className="mb-2 flex items-center gap-3">
          <span className="w-10 text-right text-xs tabular-nums text-neutral-500">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 30}
            step={0.1}
            value={currentTime}
            onChange={onSeek}
            className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-surface-3 accent-accent"
          />
          <span className="w-10 text-xs tabular-nums text-neutral-500">
            {duration > 0 ? formatTime(duration) : "0:30"}
          </span>
        </div>

        {/* Track info + controls */}
        <div className="flex items-center gap-4">
          {/* Play/pause */}
          <button
            onClick={onToggle}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white transition-transform hover:scale-105 active:scale-95"
          >
            {isPlaying ? (
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="h-4 w-4 translate-x-px" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-neutral-100">{track.title}</p>
            <p className="truncate text-xs text-neutral-500">
              {albumTitle} · 30s preview via iTunes
            </p>
          </div>

          {/* iTunes attribution (required by Apple guidelines) */}
          <p className="hidden shrink-0 text-xs text-neutral-700 sm:block">
            Preview via iTunes
          </p>
        </div>
      </div>
    </div>
  );
}
