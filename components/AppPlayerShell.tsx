"use client";

import { PlayerProvider } from "@/contexts/PlayerContext";
import { GlobalMiniPlayer } from "./GlobalMiniPlayer";
import { PullToRefresh } from "./PullToRefresh";

/**
 * Wraps the authenticated app with:
 * - PlayerProvider (global audio player context)
 * - PullToRefresh (pull-down gesture + visibility-based auto-refresh)
 * - GlobalMiniPlayer (sticky bottom playback bar)
 */
export function AppPlayerShell({ children }: { children: React.ReactNode }) {
  return (
    <PlayerProvider>
      <PullToRefresh>
        {children}
      </PullToRefresh>
      <GlobalMiniPlayer />
    </PlayerProvider>
  );
}
