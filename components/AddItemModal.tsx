"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { SearchSuggestion, ArtistSuggestion } from "@/types";

type AnyResult = SearchSuggestion | ArtistSuggestion;

interface ListOption {
  id: string;
  name: string;
}

interface Props {
  listId?: string;   // optional — if omitted, modal fetches & shows a list picker
  onAdded: (item: unknown) => void;
  onClose: () => void;
}

const TYPE_LABEL: Record<string, string> = { SONG: "Song", ALBUM: "Album", ARTIST: "Artist" };

export function AddItemModal({ listId: listIdProp, onAdded, onClose }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AnyResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // List picker (used when no listId prop is provided)
  const [lists, setLists] = useState<ListOption[]>([]);
  const [selectedListId, setSelectedListId] = useState(listIdProp ?? "");

  useEffect(() => {
    if (listIdProp) return; // already have one
    fetch("/api/lists")
      .then((r) => r.json())
      .then((data: ListOption[]) => {
        setLists(data);
        if (data.length > 0) setSelectedListId(data[0].id);
      })
      .catch(() => {});
  }, [listIdProp]);

  const activeListId = listIdProp ?? selectedListId;

  // Artist drill-in state
  const [selectedArtist, setSelectedArtist] = useState<ArtistSuggestion | null>(null);
  const [artistView, setArtistView] = useState<"albums" | "songs">("albums");
  const [artistWorks, setArtistWorks] = useState<SearchSuggestion[]>([]);
  const [loadingWorks, setLoadingWorks] = useState(false);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Debounced unified search
  useEffect(() => {
    if (selectedArtist) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      setError("");
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error();
        setResults(await res.json());
      } catch {
        setError("Search failed. Try again.");
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, selectedArtist]);

  // Artist drill-in
  const drillIntoArtist = useCallback(async (artist: ArtistSuggestion, view: "albums" | "songs") => {
    setSelectedArtist(artist);
    setArtistView(view);
    setLoadingWorks(true);
    setArtistWorks([]);
    setError("");
    try {
      const browseType = view === "albums" ? "ARTIST_ALBUMS" : "ARTIST_SONGS";
      const res = await fetch(`/api/search?type=${browseType}&artistId=${artist.mbId}`);
      if (!res.ok) throw new Error();
      setArtistWorks(await res.json());
    } catch {
      setError("Failed to load artist works.");
    } finally {
      setLoadingWorks(false);
    }
  }, []);

  const handleAdd = useCallback(async (item: SearchSuggestion) => {
    if (!activeListId) { setError("Select a list first."); return; }
    setAdding(item.mbId);
    setError("");
    // All ALBUM results now carry release-group IDs (searchAlbums uses /release-group,
    // fetchArtistAlbums uses /release-group). Use releaseGroupId so the items route
    // resolves to a release before calling fetchAlbumMetadata.
    const body = item.type === "ALBUM"
      ? { releaseGroupId: item.mbId, type: "ALBUM" }
      : { mbId: item.mbId, type: "SONG" };
    try {
      const res = await fetch(`/api/lists/${activeListId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to add item");
      }
      onAdded(await res.json());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add item");
      setAdding(null);
    }
  }, [activeListId, onAdded, onClose]);

  // Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (selectedArtist) { setSelectedArtist(null); setArtistWorks([]); }
      else onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, selectedArtist]);

  // ── Artist drill-in view ────────────────────────────────────────────────────
  if (selectedArtist) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="w-full max-w-lg rounded-xl border border-surface-2 bg-surface-1 shadow-2xl flex flex-col max-h-[80vh]">
          <div className="flex items-center gap-3 border-b border-surface-2 px-4 py-3">
            <button
              onClick={() => { setSelectedArtist(null); setArtistWorks([]); }}
              className="text-neutral-500 hover:text-neutral-100 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-neutral-100">{selectedArtist.name}</p>
              {selectedArtist.disambiguation && (
                <p className="text-xs text-neutral-500">{selectedArtist.disambiguation}</p>
              )}
            </div>
            <button onClick={onClose} className="btn-ghost text-xs px-2 py-1">✕</button>
          </div>

          <div className="flex gap-1 px-4 pt-3">
            {(["albums", "songs"] as const).map((v) => (
              <button
                key={v}
                onClick={() => drillIntoArtist(selectedArtist, v)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  artistView === v ? "bg-accent text-white" : "bg-surface-2 text-neutral-400 hover:text-neutral-100"
                }`}
              >
                {v === "albums" ? "Albums" : "Songs"}
              </button>
            ))}
          </div>

          {error && <p className="px-4 pt-2 text-sm text-red-400">{error}</p>}

          <div className="overflow-y-auto flex-1 px-2 pb-2 pt-2">
            {loadingWorks && <p className="py-8 text-center text-sm text-neutral-500">Loading…</p>}
            {!loadingWorks && artistWorks.length === 0 && (
              <p className="py-8 text-center text-sm text-neutral-500">No {artistView} found.</p>
            )}
            {artistWorks.map((r) => (
              <WorkRow
                key={r.mbId}
                item={r}
                adding={adding === r.mbId}
                onAdd={() => handleAdd(r)}
                onPreview={() => { onClose(); router.push(`/discover/preview/${r.mbId}`); }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Main search view ────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-xl border border-surface-2 bg-surface-1 shadow-2xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between border-b border-surface-2 px-4 py-3">
          <h2 className="font-semibold text-neutral-100">Add to list</h2>
          <button onClick={onClose} className="btn-ghost text-xs px-2 py-1">✕</button>
        </div>

        {/* List picker — shown only when no listId was passed as prop */}
        {!listIdProp && (
          <div className="px-4 pt-3">
            {lists.length === 0 ? (
              <p className="text-xs text-neutral-500">No lists yet — create one from My Lists.</p>
            ) : (
              <select
                value={selectedListId}
                onChange={(e) => setSelectedListId(e.target.value)}
                className="w-full rounded-lg border border-surface-3 bg-surface-2 px-3 py-1.5 text-sm text-neutral-200 outline-none focus:border-accent"
              >
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            )}
          </div>
        )}

        <div className="px-4 pt-3 pb-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search songs, albums, or artists…"
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {error && <p className="px-4 text-sm text-red-400">{error}</p>}

        <div className="overflow-y-auto flex-1 px-2 pb-2">
          {searching && <p className="py-8 text-center text-sm text-neutral-500">Searching…</p>}

          {!searching && query.length >= 2 && results.length === 0 && (
            <p className="py-8 text-center text-sm text-neutral-500">No results found.</p>
          )}

          {!searching && results.map((r) => {
            if (r.type === "ARTIST") {
              return (
                <div key={r.mbId} className="flex items-center gap-3 rounded-lg p-3 hover:bg-surface-2 transition-colors">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-surface-3 flex items-center justify-center text-neutral-500 text-sm font-bold">
                    {r.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-medium text-neutral-100">{r.name}</p>
                      <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium bg-surface-3 text-neutral-400">Artist</span>
                    </div>
                    {(r.artistType || r.disambiguation) && (
                      <p className="truncate text-xs text-neutral-500">
                        {[r.artistType, r.disambiguation].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => drillIntoArtist(r, "albums")}
                      className="rounded px-2 py-1 text-xs bg-surface-2 text-neutral-400 hover:bg-surface-3 hover:text-neutral-100 transition-colors"
                    >
                      Albums
                    </button>
                    <button
                      onClick={() => drillIntoArtist(r, "songs")}
                      className="rounded px-2 py-1 text-xs bg-surface-2 text-neutral-400 hover:bg-surface-3 hover:text-neutral-100 transition-colors"
                    >
                      Songs
                    </button>
                  </div>
                </div>
              );
            }

            // Song or Album
            const item = r as SearchSuggestion;
            return (
              <WorkRow
                key={item.mbId}
                item={item}
                adding={adding === item.mbId}
                onAdd={() => handleAdd(item)}
                onPreview={() => { onClose(); router.push(`/discover/preview/${item.mbId}`); }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Shared result row ────────────────────────────────────────────────────────

function WorkRow({
  item,
  adding,
  onAdd,
  onPreview,
}: {
  item: SearchSuggestion;
  adding: boolean;
  onAdd: () => void;
  onPreview: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg p-3 hover:bg-surface-2 transition-colors">
      <div className="h-10 w-10 shrink-0 rounded bg-surface-3 flex items-center justify-center text-neutral-600 text-sm">
        {item.type === "SONG" ? "♪" : "◉"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-medium text-neutral-100">{item.title}</p>
          <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium bg-surface-3 text-neutral-400">
            {TYPE_LABEL[item.type]}
          </span>
        </div>
        <p className="truncate text-xs text-neutral-400">
          {item.artistName}
          {item.albumName && item.type === "SONG" && (
            <span className="text-neutral-600"> · {item.albumName}</span>
          )}
          {item.releaseYear && (
            <span className="text-neutral-600"> · {item.releaseYear}</span>
          )}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        {item.type === "ALBUM" && (
          <button
            onClick={onPreview}
            className="rounded px-2 py-1 text-xs bg-surface-2 text-neutral-400 hover:bg-surface-3 hover:text-neutral-100 transition-colors"
          >
            Preview
          </button>
        )}
        <button
          onClick={onAdd}
          disabled={adding}
          className="rounded px-2 py-1 text-xs bg-surface-2 text-neutral-400 hover:bg-surface-3 hover:text-neutral-100 transition-colors disabled:opacity-50"
        >
          {adding ? "Adding…" : "+ Add"}
        </button>
      </div>
    </div>
  );
}
