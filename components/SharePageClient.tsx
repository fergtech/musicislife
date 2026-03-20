"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Item {
  id: string;
  type: "SONG" | "ALBUM";
  title: string;
  artistName: string;
  albumName: string | null;
  releaseYear: number | null;
  coverArtUrl: string | null;
}

interface Props {
  list: {
    token: string;
    name: string;
    description: string | null;
    createdAt: string;
    items: Item[];
  };
}

export function SharePageClient({ list }: Props) {
  const router = useRouter();
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleImport() {
    setImporting(true);
    setError("");
    const res = await fetch(`/api/share/${list.token}`, { method: "POST" });
    setImporting(false);

    if (res.status === 401) {
      // Not logged in — send to login with return URL
      router.push(`/login?callbackUrl=/share/${list.token}`);
      return;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to import list.");
      return;
    }

    const { id } = await res.json();
    setDone(true);
    setTimeout(() => router.push(`/lists/${id}`), 1200);
  }

  const created = new Date(list.createdAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Shared list</p>
        <h1 className="text-2xl font-bold text-neutral-100">{list.name}</h1>
        {list.description && (
          <p className="text-sm text-neutral-400 leading-relaxed max-w-prose">{list.description}</p>
        )}
        <p className="text-xs text-neutral-600">
          {list.items.length} {list.items.length === 1 ? "item" : "items"} · {created}
        </p>
      </div>

      {/* Import CTA */}
      <div className="rounded-xl border border-surface-2 bg-surface-1 px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-medium text-neutral-100">Add this list to your account</p>
          <p className="text-xs text-neutral-500 mt-0.5">Creates an exact copy you can edit freely.</p>
        </div>
        {done ? (
          <span className="text-sm text-green-400">✓ Imported! Redirecting…</span>
        ) : (
          <button onClick={handleImport} disabled={importing} className="btn-primary shrink-0">
            {importing ? "Importing…" : "Import to my account"}
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* Item list */}
      <div className="space-y-1">
        {list.items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5 bg-surface-1">
            <div className="h-10 w-10 shrink-0 rounded bg-surface-3 overflow-hidden flex items-center justify-center text-neutral-600 text-sm">
              {item.coverArtUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.coverArtUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                item.type === "SONG" ? "♪" : "◉"
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-neutral-100">{item.title}</p>
              <p className="truncate text-xs text-neutral-500">
                {item.artistName}
                {item.albumName && item.type === "SONG" && (
                  <span className="text-neutral-600"> · {item.albumName}</span>
                )}
                {item.releaseYear && (
                  <span className="text-neutral-600"> · {item.releaseYear}</span>
                )}
              </p>
            </div>
            <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium bg-surface-3 text-neutral-400">
              {item.type === "SONG" ? "Song" : "Album"}
            </span>
          </div>
        ))}
      </div>

      <p className="text-xs text-neutral-700 text-center pt-2">musicislyfe</p>
    </div>
  );
}
