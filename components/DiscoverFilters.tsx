"use client";

import { DISCOVER_DECADES, DISCOVER_GENRES } from "@/types";

export interface FilterState {
  decade: (typeof DISCOVER_DECADES)[number] | null;
  tags: string[];
  format: "album" | "song";
}

interface Props {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  onSurpriseMe: () => void;
  loading: boolean;
}

export function DiscoverFilters({ filters, onChange, onSurpriseMe, loading }: Props) {
  function setDecade(decade: (typeof DISCOVER_DECADES)[number] | null) {
    onChange({ ...filters, decade });
  }

  function toggleTag(id: string) {
    const has = filters.tags.includes(id);
    onChange({
      ...filters,
      tags: has ? filters.tags.filter((t) => t !== id) : [...filters.tags, id],
    });
  }

  function setFormat(format: "album" | "song") {
    onChange({ ...filters, format });
  }

  return (
    <div className="space-y-5 rounded-xl border border-surface-2 bg-surface-1 p-4">
      {/* Row: Format + Surprise Me */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Format toggle */}
        <div className="flex gap-1">
          {(["album", "song"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                filters.format === f
                  ? "bg-accent text-white"
                  : "bg-surface-2 text-neutral-400 hover:text-neutral-100"
              }`}
            >
              {f === "album" ? "Albums" : "Songs"}
            </button>
          ))}
        </div>

        <button
          onClick={onSurpriseMe}
          disabled={loading}
          className="btn-secondary text-sm gap-1.5"
        >
          🎲 Surprise me
        </button>
      </div>

      {/* Decades */}
      <div>
        <p className="mb-2 text-xs font-medium text-neutral-500 uppercase tracking-wider">Decade</p>
        <div className="flex flex-wrap gap-1.5">
          {DISCOVER_DECADES.map((d) => (
            <button
              key={d.label}
              onClick={() => setDecade(filters.decade?.label === d.label ? null : d)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                filters.decade?.label === d.label
                  ? "bg-accent text-white"
                  : "bg-surface-2 text-neutral-400 hover:text-neutral-100"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Genres */}
      <div>
        <p className="mb-2 text-xs font-medium text-neutral-500 uppercase tracking-wider">
          Genre <span className="text-neutral-600 normal-case">(pick one or more)</span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {DISCOVER_GENRES.map((g) => {
            const active = filters.tags.includes(g.id);
            return (
              <button
                key={g.id}
                onClick={() => toggleTag(g.id)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-accent/20 text-accent border border-accent/50"
                    : "bg-surface-2 text-neutral-400 hover:text-neutral-100 border border-transparent"
                }`}
              >
                {g.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
