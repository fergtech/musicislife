"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  listId: string;
  listName: string;
}

export function ListShareMenu({ listId, listName }: Props) {
  const [open, setOpen] = useState(false);
  const [shareState, setShareState] = useState<"idle" | "loading" | "copied" | "revoked">("idle");
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleCopyLink() {
    setShareState("loading");
    setOpen(false);
    const res = await fetch(`/api/lists/${listId}/share`);
    if (!res.ok) { setShareState("idle"); return; }
    const { shareToken } = await res.json();
    const url = `${window.location.origin}/share/${shareToken}`;
    await navigator.clipboard.writeText(url);
    setShareState("copied");
    setTimeout(() => setShareState("idle"), 2500);
  }

  async function handleRevokeLink() {
    setOpen(false);
    await fetch(`/api/lists/${listId}/share`, { method: "DELETE" });
    setShareState("revoked");
    setTimeout(() => setShareState("idle"), 2000);
  }

  const label =
    shareState === "loading" ? "Generating…"
    : shareState === "copied" ? "✓ Link copied!"
    : shareState === "revoked" ? "Link revoked"
    : "Share / Export";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="btn-secondary text-sm"
        disabled={shareState === "loading"}
      >
        {label}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-52 rounded-xl border border-surface-2 bg-surface-1 shadow-xl py-1">
          {/* Download as file */}
          <a
            href={`/api/lists/${listId}/export?format=json`}
            download={`${listName}.musicislyfe.json`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-neutral-300 hover:bg-surface-2 transition-colors"
          >
            <svg className="h-4 w-4 shrink-0 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download as file
          </a>

          {/* Copy share link */}
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-neutral-300 hover:bg-surface-2 transition-colors"
          >
            <svg className="h-4 w-4 shrink-0 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Copy share link
          </button>

          {/* Export PDF */}
          <a
            href={`/api/lists/${listId}/export`}
            download
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-neutral-300 hover:bg-surface-2 transition-colors"
          >
            <svg className="h-4 w-4 shrink-0 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export PDF
          </a>

          <div className="border-t border-surface-2 my-1" />

          {/* Revoke link */}
          <button
            onClick={handleRevokeLink}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-surface-2 transition-colors"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            Revoke share link
          </button>
        </div>
      )}
    </div>
  );
}
