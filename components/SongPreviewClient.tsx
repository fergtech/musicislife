"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePlayer } from "@/lib/player-context";
import type { ItemMetadata } from "@/types";

interface ListOption {
  id: string;
  name: string;
}

interface Props {
  song: ItemMetadata;
}

export function SongPreviewClient({ song }: Props) {
  const router = useRouter();
  const { playSong, currentSong } = usePlayer();

  const [imgError,       setImgError]       = useState(false);
  const [lists,          setLists]          = useState<ListOption[]>([]);
  const [selectedListId, setSelectedListId] = useState("");
  const [adding,         setAdding]         = useState(false);
  const [added,          setAdded]          = useState(false);
  const [addError,       setAddError]       = useState("");

  const isPlaying = currentSong?.mbId === song.mbId;

  // Fetch user lists
  useEffect(() => {
    fetch("/api/lists")
      .then((r) => r.json())
      .then((data: ListOption[]) => {
        setLists(data);
        if (data.length > 0) setSelectedListId(data[0].id);
      })
      .catch(() => {});
  }, []);

  async function handleAdd() {
    if (!selectedListId) return;
    setAdding(true);
    setAddError("");
    const res = await fetch(`/api/lists/${selectedListId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mbId: song.mbId, type: "SONG" }),
    });
    setAdding(false);
    if (res.ok) {
      setAdded(true);
    } else {
      const data = await res.json().catch(() => ({}));
      setAddError(data.error ?? "Failed to add song.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-200 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* Song header */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
        {/* Cover art */}
        <div className="relative h-44 w-44 shrink-0 overflow-hidden rounded-xl bg-surface-2 shadow-xl">
          {song.coverArtUrl && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={song.coverArtUrl}
              alt={song.title}
              className="h-full w-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-5xl text-neutral-700">
              ♪
            </div>
          )}
        </div>

        {/* Info + controls */}
        <div className="flex-1 space-y-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Song</p>
            <h1 className="text-2xl font-bold leading-tight text-neutral-100">{song.title}</h1>
            <p className="text-neutral-400">
              {song.artistName}
              {song.releaseYear && (
                <span className="text-neutral-600"> · {song.releaseYear}</span>
              )}
            </p>
            {song.albumName && (
              <p className="mt-0.5 text-sm text-neutral-600">{song.albumName}</p>
            )}
          </div>

          {/* Play button — uses global mini player */}
          <button
            onClick={() =>
              playSong({
                mbId:        song.mbId,
                title:       song.title,
                artistName:  song.artistName,
                albumName:   song.albumName,
                coverArtUrl: song.coverArtUrl,
              })
            }
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
              isPlaying
                ? "bg-accent/20 text-accent ring-1 ring-accent"
                : "bg-accent text-white hover:bg-accent-hover"
            }`}
          >
            {isPlaying ? (
              <>
                <span className="animate-pulse">▶</span> Now playing…
              </>
            ) : (
              <>▶ Play preview</>
            )}
          </button>
          <p className="text-xs text-neutral-700">30s preview via iTunes · plays in the mini player below</p>

          {/* Add to list */}
          {lists.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedListId}
                onChange={(e) => setSelectedListId(e.target.value)}
                className="rounded-lg border border-surface-3 bg-surface-2 px-3 py-1.5 text-sm text-neutral-200 outline-none focus:border-accent"
              >
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
              {added ? (
                <span className="text-sm text-green-400">✓ Added to list</span>
              ) : (
                <button onClick={handleAdd} disabled={adding} className="btn-primary text-sm">
                  {adding ? "Adding…" : "+ Add song"}
                </button>
              )}
              {addError && <p className="text-xs text-red-400">{addError}</p>}
            </div>
          ) : (
            <p className="text-sm text-neutral-500">
              <a href="/" className="text-accent hover:underline">Create a list</a> to save this song.
            </p>
          )}
        </div>
      </div>

      {/* Credits */}
      {(song.writers.length > 0 || song.producers.length > 0) && (
        <div className="rounded-xl border border-surface-2 bg-surface-1 p-4 space-y-2">
          {song.writers.length > 0 && (
            <p className="text-sm text-neutral-400">
              <span className="font-medium text-neutral-500">Written by </span>
              {song.writers.join(", ")}
            </p>
          )}
          {song.producers.length > 0 && (
            <p className="text-sm text-neutral-400">
              <span className="font-medium text-neutral-500">Produced by </span>
              {song.producers.join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
