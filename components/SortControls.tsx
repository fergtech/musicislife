"use client";

export type SortField = "title" | "artistName" | "releaseYear" | "createdAt";
export type SortDir = "asc" | "desc";

interface Props {
  field: SortField;
  dir: SortDir;
  onChange: (field: SortField, dir: SortDir) => void;
}

const FIELDS: { value: SortField; label: string }[] = [
  { value: "createdAt", label: "Date added" },
  { value: "title", label: "Title" },
  { value: "artistName", label: "Artist" },
  { value: "releaseYear", label: "Year" },
];

export function SortControls({ field, dir, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-neutral-500">Sort by</span>
      <select
        value={field}
        onChange={(e) => onChange(e.target.value as SortField, dir)}
        className="rounded-lg border border-surface-3 bg-surface-1 px-2 py-1 text-xs text-neutral-200 outline-none focus:border-accent"
      >
        {FIELDS.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>
      <button
        onClick={() => onChange(field, dir === "asc" ? "desc" : "asc")}
        className="btn-ghost px-2 py-1 text-xs"
        aria-label={dir === "asc" ? "Sort descending" : "Sort ascending"}
      >
        {dir === "asc" ? "↑ Asc" : "↓ Desc"}
      </button>
    </div>
  );
}
