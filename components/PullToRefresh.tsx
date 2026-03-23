"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const THRESHOLD = 64; // pullY px needed to trigger refresh
const MAX_PULL  = 80; // visual cap

export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pullY, setPullY] = useState(0);

  const startYRef = useRef(0);
  const pulling   = useRef(false);
  const pullYRef  = useRef(0);

  // ── Pull-to-refresh touch handling ─────────────────────────────────────────
  useEffect(() => {
    function atTop() {
      // Use <= 1 tolerance — iOS can report fractional scrollTop on rubber-band
      return (document.documentElement.scrollTop ?? window.scrollY) <= 1;
    }

    function onTouchStart(e: TouchEvent) {
      if (!atTop()) return;
      startYRef.current = e.touches[0].clientY;
      pulling.current = true;
    }

    function onTouchMove(e: TouchEvent) {
      if (!pulling.current) return;
      if (!atTop()) {
        pulling.current = false;
        pullYRef.current = 0;
        setPullY(0);
        return;
      }
      const raw = e.touches[0].clientY - startYRef.current;
      if (raw <= 0) {
        pulling.current = false;
        pullYRef.current = 0;
        setPullY(0);
        return;
      }
      // Block native iOS overscroll/bounce while we're driving the indicator
      e.preventDefault();
      const next = Math.min(raw * 0.45, MAX_PULL);
      pullYRef.current = next;
      setPullY(next);
    }

    function onTouchEnd() {
      if (!pulling.current) return;
      pulling.current = false;
      const triggered = pullYRef.current >= THRESHOLD;
      pullYRef.current = 0;
      setPullY(0);
      if (triggered) startTransition(() => router.refresh());
    }

    document.addEventListener("touchstart",  onTouchStart, { passive: true });
    // NOT passive — we need preventDefault() to suppress iOS bounce while pulling
    document.addEventListener("touchmove",   onTouchMove,  { passive: false });
    document.addEventListener("touchend",    onTouchEnd);
    document.addEventListener("touchcancel", onTouchEnd);

    return () => {
      document.removeEventListener("touchstart",  onTouchStart);
      document.removeEventListener("touchmove",   onTouchMove);
      document.removeEventListener("touchend",    onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // ── Visibility-based refresh (coming back to the PWA after 30s+ away) ──────
  useEffect(() => {
    let hiddenAt = 0;
    function onVisibility() {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
      } else if (document.visibilityState === "visible" && hiddenAt > 0) {
        if (Date.now() - hiddenAt >= 30_000) {
          startTransition(() => router.refresh());
        }
        hiddenAt = 0;
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [router]);

  const progress  = Math.min(pullY / THRESHOLD, 1);
  const showStrip = pullY > 6 || isPending;

  return (
    <>
      {/* Pull / loading indicator */}
      <div
        aria-hidden
        style={{
          height: showStrip ? (isPending && pullY === 0 ? 40 : Math.max(pullY, 8)) : 0,
          transition: pullY === 0 ? "height 0.25s ease" : "none",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          style={{
            width: 22,
            height: 22,
            opacity: isPending ? 1 : progress,
            transform: `rotate(${isPending ? 0 : progress * 270}deg)`,
            transition: isPending ? "none" : "transform 0.05s linear",
          }}
          className={isPending ? "animate-spin" : ""}
        >
          <circle
            cx="12" cy="12" r="9"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={`${progress * 45} 100`}
            className="text-accent"
          />
        </svg>
      </div>

      {children}
    </>
  );
}
