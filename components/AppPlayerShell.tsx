"use client";

import { PlayerProvider } from "@/contexts/PlayerContext";
import { GlobalMiniPlayer } from "./GlobalMiniPlayer";

/**
 * Wraps the authenticated app with the global audio player context.
 * Lives here (client component) so it can be imported by the server layout.
 */
export function AppPlayerShell({ children }: { children: React.ReactNode }) {
  return (
    <PlayerProvider>
      {children}
      <GlobalMiniPlayer />
    </PlayerProvider>
  );
}
