"use client";

import Image from "next/image";

interface Props {
  item: {
    id: string;
    type: "SONG" | "ALBUM";
    title: string;
    artistName: string;
    albumName: string | null;
    releaseYear: number | null;
    coverArtUrl: string | null;
    writers: string[];
    producers: string[];
  };
  onDelete: (id: string) => void;
  deleting: boolean;
}

export function ListItemCard({ item, onDelete, deleting }: Props) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-surface-2 bg-surface-1 p-3 hover:border-surface-3 transition-colors">
      {/* Cover art */}
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-surface-3">
        {item.coverArtUrl ? (
          <Image
            src={item.coverArtUrl}
            alt={`Cover for ${item.title}`}
            fill
            sizes="48px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-neutral-600 text-xs">
            {item.type === "SONG" ? "♪" : "◉"}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-sm text-neutral-100">{item.title}</p>
        <p className="truncate text-xs text-neutral-400">
          {item.artistName}
          {item.albumName && item.type === "SONG" && (
            <span className="text-neutral-600"> · {item.albumName}</span>
          )}
        </p>
        {(item.writers.length > 0 || item.producers.length > 0) && (
          <p className="truncate text-xs text-neutral-600 mt-0.5">
            {item.writers.length > 0 && `Written by ${item.writers.join(", ")}`}
            {item.writers.length > 0 && item.producers.length > 0 && " · "}
            {item.producers.length > 0 && `Produced by ${item.producers.join(", ")}`}
          </p>
        )}
      </div>

      {/* Year + type badge */}
      <div className="shrink-0 flex flex-col items-end gap-1">
        {item.releaseYear && (
          <span className="text-xs text-neutral-500">{item.releaseYear}</span>
        )}
        <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-surface-3 text-neutral-400">
          {item.type === "SONG" ? "Song" : "Album"}
        </span>
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(item.id)}
        disabled={deleting}
        className="shrink-0 text-neutral-600 hover:text-red-400 transition-colors p-1 rounded"
        aria-label="Remove item"
      >
        {deleting ? "…" : "✕"}
      </button>
    </div>
  );
}
