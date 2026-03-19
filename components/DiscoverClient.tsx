"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { DiscoverFilters, FilterState } from "./DiscoverFilters";
import { DiscoverGrid } from "./DiscoverGrid";
import { DiscoverItemModal } from "./DiscoverItemModal";
import type { DiscoverResult, DiscoverResponse } from "@/types";
import { DISCOVER_DECADES as DECADES, DISCOVER_GENRES as GENRES } from "@/types";

const DEFAULT_FILTERS: FilterState = {
  decade: DECADES[2], // 70s
  tags: ["soul"],
  format: "album",
};

const LIMIT = 20;

export function DiscoverClient() {
  const router = useRouter();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [results, setResults] = useState<DiscoverResult[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DiscoverResult | null>(null);
  const [error, setError] = useState("");
  // Track the active request to ignore stale responses
  const fetchRef = useRef(0);

  const fetchResults = useCallback(
    async (currentFilters: FilterState, currentOffset: number, append: boolean) => {
      if (!currentFilters.decade || currentFilters.tags.length === 0) return;

      const id = ++fetchRef.current;
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        decadeStart: String(currentFilters.decade.start),
        decadeEnd: String(currentFilters.decade.end),
        tags: currentFilters.tags.join(","),
        format: currentFilters.format,
        offset: String(currentOffset),
        limit: String(LIMIT),
      });

      try {
        const res = await fetch(`/api/discover?${params}`);
        if (fetchRef.current !== id) return; // stale response — ignore

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "Discovery failed. Try again.");
          return;
        }

        const data: DiscoverResponse = await res.json();

        setTotal(data.total);
        setOffset(currentOffset);
        setResults((prev) => (append ? [...prev, ...data.results] : data.results));
      } catch {
        if (fetchRef.current === id) setError("Network error. Check your connection.");
      } finally {
        if (fetchRef.current === id) setLoading(false);
      }
    },
    [],
  );

  // Re-fetch whenever filters change (reset to page 0)
  useEffect(() => {
    setResults([]);
    setOffset(0);
    fetchResults(filters, 0, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  function handleLoadMore() {
    const nextOffset = offset + LIMIT;
    fetchResults(filters, nextOffset, true);
  }

  function handleSurpriseMe() {
    const randomDecade = DECADES[Math.floor(Math.random() * DECADES.length)];
    const randomGenre = GENRES[Math.floor(Math.random() * GENRES.length)];
    const randomFormat = Math.random() > 0.5 ? "album" : "song";
    setFilters({
      decade: randomDecade,
      tags: [randomGenre.id],
      format: randomFormat,
    });
  }

  const canSearch = !!filters.decade && filters.tags.length > 0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold">Discover</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Dig through decades and genres to find records worth saving.
        </p>
      </div>

      {/* Filters */}
      <DiscoverFilters
        filters={filters}
        onChange={(next) => setFilters(next)}
        onSurpriseMe={handleSurpriseMe}
        loading={loading}
      />

      {/* State messaging */}
      {!canSearch && (
        <p className="text-center text-sm text-neutral-500 py-8">
          Pick a decade and at least one genre to start digging.
        </p>
      )}

      {error && (
        <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>
      )}

      {/* Results */}
      {canSearch && (
        <DiscoverGrid
          results={results}
          total={total}
          offset={offset}
          limit={LIMIT}
          loading={loading}
          onLoadMore={handleLoadMore}
          onSelect={(item) => {
            if (item.type === "ALBUM") {
              // Albums → full preview page with tracklist + audio
              router.push(`/discover/preview/${item.mbId}`);
            } else {
              // Songs → quick-add modal
              setSelectedItem(item);
            }
          }}
        />
      )}

      {/* Song quick-add modal */}
      {selectedItem && (
        <DiscoverItemModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onAdded={() => {}}
        />
      )}
    </div>
  );
}
