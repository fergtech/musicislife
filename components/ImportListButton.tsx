"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function ImportListButton() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError("");

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      const res = await fetch("/api/lists/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Import failed.");
        return;
      }

      const { id } = await res.json();
      router.push(`/lists/${id}`);
    } catch {
      setError("Invalid file. Make sure it's a musicislyfe export.");
    } finally {
      setLoading(false);
      // Reset so the same file can be re-selected if needed
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFile}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="btn-secondary text-sm"
      >
        {loading ? "Importing…" : "Import list"}
      </button>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
