"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      aria-label="Sign out"
      title="Sign out"
      className="btn-ghost px-2 py-1.5 text-xs sm:px-3"
    >
      <span className="inline sm:hidden" aria-hidden="true">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H9" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 20H5a2 2 0 01-2-2V6a2 2 0 012-2h8" />
        </svg>
      </span>
      <span className="hidden sm:inline">Sign out</span>
    </button>
  );
}
