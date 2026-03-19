"use client";

import { useState, useEffect, useCallback } from "react";
import type { DiscoverResult } from "@/types";

interface ListOption {
  id: string;
  name: string;
  _count: { items: number };
}

interface Props {
  item: DiscoverResult;
  onClose: () => void;
  onAdded: () => void;
}

export function DiscoverItemModal({ item, onClose, onAdded }: Props) {
  const [lists, setLists] = useState<ListOption[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");
  const [imgError, setImgError] = useState(false);

  // Fetch user's lists on mount
  useEffect(() => {
    fetch("/api/lists")
      .then((r) => r.json())
      .then((data: ListOption[]) => {
        setLists(data);
        if (data.length > 0) setSelectedListId(data[0].id);
      })
      .catch(() => setError("Couldn't load your lists."));
  }, []);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleAdd = useCallback(async () => {
    if (!selectedListId) return;
    setAdding(true);
    setError("");

    const body =
      item.type === "ALBUM"
        ? { releaseGroupId: item.mbId, type: "ALBUM" }
        : { mbId: item.mbId, type: "SONG" };

    const res = await fetch(`/api/lists/${selectedListId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setAdding(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to add item. Try again.");
      return;
    }

    setAdded(true);
    onAdded();
  }, [selectedListId, item, onAdded]);

  const typeLabel = item.primaryType ?? (item.type === "SONG" ? "Song" : "Album");

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-xl border border-surface-2 bg-surface-1 shadow-2xl overflow-hidden">
        {/* Cover art header */}
        <div className="relative h-48 w-full bg-surface-3">
          {item.coverArtUrl && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.coverArtUrl}
              alt={item.title}
              className="h-full w-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-6xl text-neutral-700">
              {item.type === "SONG" ? "♪" : "◉"}
            </div>
          )}
          {/* Gradient overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-surface-1 via-transparent to-transparent" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 transition-colors"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Title block */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-surface-3 text-neutral-400">
                {typeLabel}
              </span>
              {item.releaseYear && (
                <span className="text-xs text-neutral-500">{item.releaseYear}</span>
              )}
            </div>
            <h2 className="text-xl font-bold text-neutral-100 leading-tight">{item.title}</h2>
            <p className="text-sm text-neutral-400 mt-0.5">{item.artistName}</p>
          </div>

          {/* Tags */}
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.tags.slice(0, 6).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-surface-3 px-2.5 py-0.5 text-xs text-neutral-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Note about metadata */}
          <p className="text-xs text-neutral-600">
            Full metadata (writers, producers, cover art) will be fetched from MusicBrainz when you add this item.
          </p>

          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
          )}

          {added ? (
            <div className="rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-400 text-center">
              Added to list!
            </div>
          ) : (
            /* Add to list */
            <div className="flex gap-2">
              {lists.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  No lists yet.{" "}
                  <a href="/" className="text-accent hover:underline">
                    Create one first.
                  </a>
                </p>
              ) : (
                <>
                  <select
                    value={selectedListId}
                    onChange={(e) => setSelectedListId(e.target.value)}
                    className="flex-1 rounded-lg border border-surface-3 bg-surface-2 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-accent"
                  >
                    {lists.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({l._count.items})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAdd}
                    disabled={adding || !selectedListId}
                    className="btn-primary shrink-0"
                  >
                    {adding ? "Adding…" : "Add"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
