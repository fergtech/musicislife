"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ListItemCard } from "./ListItemCard";
import { SortControls, SortField, SortDir } from "./SortControls";
import { AddItemModal } from "./AddItemModal";
import { ListShareMenu } from "./ListShareMenu";

interface Item {
  id: string;
  type: "SONG" | "ALBUM";
  mbId: string;
  artistMbId: string | null;
  title: string;
  artistName: string;
  albumName: string | null;
  releaseYear: number | null;
  coverArtUrl: string | null;
  writers: string[];
  producers: string[];
  createdAt: string;
  updatedAt: string;
}

interface Props {
  list: {
    id: string;
    name: string;
    description: string | null;
    items: Item[];
    createdAt: string;
    updatedAt: string;
  };
}

export function ListDetailClient({ list }: Props) {
  const [items, setItems] = useState<Item[]>(list.items);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Inline edit
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(list.name);
  const [editDescription, setEditDescription] = useState(list.description ?? "");
  const [listName, setListName] = useState(list.name);
  const [listDescription, setListDescription] = useState(list.description ?? "");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  async function handleSaveEdit() {
    if (!editName.trim()) return;
    setSaving(true);
    setEditError("");
    const res = await fetch(`/api/lists/${list.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName.trim(),
        description: editDescription.trim() || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setEditError(data.error ?? "Failed to save.");
      return;
    }
    setListName(editName.trim());
    setListDescription(editDescription.trim());
    setEditing(false);
  }

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [items, sortField, sortDir]);

  async function handleDelete(itemId: string) {
    setDeletingId(itemId);
    const res = await fetch(`/api/lists/${list.id}/items/${itemId}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    }
    setDeletingId(null);
  }

  function handleAdded(item: unknown) {
    setItems((prev) => [...prev, item as Item]);
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb + header */}
      <div>
        <Link href="/" className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors">
          ← My Lists
        </Link>

        {editing ? (
          <div className="mt-2 space-y-2">
            <input
              className="input w-full text-xl font-bold"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              maxLength={120}
              autoFocus
            />
            <textarea
              className="input w-full resize-none text-sm"
              rows={3}
              placeholder="Description (optional)…"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              maxLength={500}
            />
            {editError && <p className="text-sm text-red-400">{editError}</p>}
            <div className="flex gap-2">
              <button onClick={handleSaveEdit} disabled={saving || !editName.trim()} className="btn-primary text-sm">
                {saving ? "Saving…" : "Save"}
              </button>
              <button onClick={() => { setEditing(false); setEditName(listName); setEditDescription(listDescription); setEditError(""); }} className="btn-secondary text-sm">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-2 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold truncate">{listName}</h1>
                <button
                  onClick={() => setEditing(true)}
                  className="shrink-0 text-neutral-600 hover:text-neutral-300 transition-colors"
                  aria-label="Edit list"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H7v-3a2 2 0 01.586-1.414z" />
                  </svg>
                </button>
              </div>
              {listDescription && (
                <p className="mt-1 text-sm text-neutral-400 leading-relaxed max-w-prose">
                  {listDescription}
                </p>
              )}
              <p className="text-sm text-neutral-500 mt-1">
                {items.length} {items.length === 1 ? "item" : "items"}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              {items.length > 0 && (
                <ListShareMenu listId={list.id} listName={listName} />
              )}
              <button onClick={() => setShowModal(true)} className="btn-primary shrink-0">
                + Add item
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sort controls */}
      {items.length > 1 && (
        <SortControls
          field={sortField}
          dir={sortDir}
          onChange={(f, d) => { setSortField(f); setSortDir(d); }}
        />
      )}

      {/* Items */}
      {items.length === 0 ? (
        <div className="py-20 text-center text-neutral-500">
          <p className="text-sm">This list is empty.</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 btn-secondary text-sm"
          >
            Add your first item
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((item) => (
            <ListItemCard
              key={item.id}
              item={item}
              onDelete={handleDelete}
              deleting={deletingId === item.id}
            />
          ))}
        </div>
      )}

      {/* Add item modal */}
      {showModal && (
        <AddItemModal
          listId={list.id}
          onAdded={handleAdded}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
