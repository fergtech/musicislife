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
}

export function ListCard({ list }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

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
      className="card group flex flex-col gap-2 hover:border-accent/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-neutral-100 group-hover:text-accent transition-colors">
          {list.name}
        </span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="shrink-0 text-neutral-600 hover:text-red-400 transition-colors text-xs p-1 -mt-1 -mr-1 rounded"
          aria-label="Delete list"
        >
          {deleting ? "…" : "✕"}
        </button>
      </div>
      <p className="text-sm text-neutral-500">
        {list._count.items} {list._count.items === 1 ? "item" : "items"}
      </p>
    </Link>
  );
}
