"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  list: {
    id: string;
    name: string;
    _count: { items: number };
  };
  featuredArt: string | null;
}

export function ListCard({ list, featuredArt }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [imgError, setImgError] = useState(false);

  const showArt = !!featuredArt && !imgError;

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    if (!confirm(`Delete "${list.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    await fetch(`/api/lists/${list.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <Link
      href={`/lists/${list.id}`}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-surface-2 bg-surface-1 hover:border-accent/50 transition-colors"
    >
      {/* Featured art hero */}
      <div className="relative aspect-[16/7] w-full overflow-hidden bg-surface-2">
        {showArt ? (
          <>
            {/* Blurred background fill */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={featuredArt}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover scale-110 blur-md brightness-40"
              onError={() => setImgError(true)}
            />
            {/* Centred sharp thumbnail */}
            <div className="absolute inset-0 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={featuredArt}
                alt={`Cover art for ${list.name}`}
                className="h-20 w-20 rounded-lg shadow-2xl ring-1 ring-white/10 object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl text-neutral-700">
            ◉
          </div>
        )}

        {/* Delete button — sits in top-right corner above the image */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="absolute right-2 top-2 rounded-md bg-black/40 px-2 py-1 text-xs text-neutral-400 hover:bg-black/70 hover:text-red-400 transition-colors backdrop-blur-sm"
          aria-label="Delete list"
        >
          {deleting ? "…" : "✕"}
        </button>
      </div>

      {/* Info */}
      <div className="px-4 py-3">
        <p className="truncate font-semibold text-neutral-100 group-hover:text-accent transition-colors">
          {list.name}
        </p>
        <p className="mt-0.5 text-sm text-neutral-500">
          {list._count.items} {list._count.items === 1 ? "item" : "items"}
        </p>
      </div>
    </Link>
  );
}
