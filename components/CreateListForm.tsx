"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateListForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");

    const res = await fetch("/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim() || undefined,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to create list");
      return;
    }

    setName("");
    setDescription("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="New list name…"
          className="input flex-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
        />
        <button type="submit" disabled={loading || !name.trim()} className="btn-primary shrink-0">
          {loading ? "Creating…" : "Create list"}
        </button>
      </div>
      <textarea
        placeholder="Description (optional)…"
        className="input w-full resize-none text-sm"
        rows={2}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={500}
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  );
}
