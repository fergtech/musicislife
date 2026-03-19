"use client";

import { useState } from "react";
import type { DiscoverResult } from "@/types";

interface Props {
  results: DiscoverResult[];
  total: number;
  offset: number;
  limit: number;
  loading: boolean;
  onLoadMore: () => void;
  onSelect: (item: DiscoverResult) => void;
}

export function DiscoverGrid({
  results,
  total,
  offset,
  limit,
  loading,
  onLoadMore,
  onSelect,
}: Props) {
  const hasMore = offset + limit < total;

  if (!loading && results.length === 0) {
    return (
      <div className="py-20 text-center text-neutral-500">
        <p className="text-sm">No results. Try a different decade or genre.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Result count */}
      {results.length > 0 && (
        <p className="text-xs text-neutral-500">
          {total.toLocaleString()} results · showing {results.length}
        </p>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {results.map((item) => (
          <DiscoverCard key={item.mbId} item={item} onSelect={onSelect} />
        ))}

        {/* Loading skeleton tiles */}
        {loading &&
          Array.from({ length: 10 }).map((_, i) => (
            <div key={`sk-${i}`} className="aspect-square animate-pulse rounded-lg bg-surface-2" />
          ))}
      </div>

      {/* Load more */}
      {hasMore && !loading && (
        <div className="flex justify-center">
          <button onClick={onLoadMore} className="btn-secondary">
            Load more
          </button>
        </div>
      )}
    </div>
  );
}

function DiscoverCard({
  item,
  onSelect,
}: {
  item: DiscoverResult;
  onSelect: (item: DiscoverResult) => void;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <button
      onClick={() => onSelect(item)}
      className="group flex flex-col gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg"
    >
      {/* Cover art */}
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-surface-2">
        {item.coverArtUrl && !imgError ? (
          // Regular <img> so the browser follows the CAA redirect without needing
          // the final archive.org URL pre-resolved server-side.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.coverArtUrl}
            alt={`Cover for ${item.title}`}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl text-neutral-700">
            {item.type === "SONG" ? "♪" : "◉"}
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-xs font-medium text-white">
            {item.type === "ALBUM" ? "▶ Preview album" : "+ Add to list"}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="min-w-0 px-0.5">
        <p className="truncate text-sm font-medium text-neutral-100 group-hover:text-accent transition-colors">
          {item.title}
        </p>
        <p className="truncate text-xs text-neutral-500">{item.artistName}</p>
        {item.releaseYear && (
          <p className="text-xs text-neutral-600">{item.releaseYear}</p>
        )}
      </div>
    </button>
  );
}
