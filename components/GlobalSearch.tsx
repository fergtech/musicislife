"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { AddItemModal } from "./AddItemModal";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Search"
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-neutral-400 hover:bg-surface-2 hover:text-neutral-100 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
        </svg>
        <span className="hidden sm:inline">Search</span>
      </button>

      {open && createPortal(
        <AddItemModal
          onAdded={() => {}}
          onClose={() => setOpen(false)}
        />,
        document.body,
      )}
    </>
  );
}
