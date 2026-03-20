"use client";

import { createContext, useContext, useState } from "react";

export interface PlayerSong {
  mbId: string;
  title: string;
  artistName: string;
  albumName?: string | null;
  coverArtUrl?: string | null;
}

interface PlayerContextValue {
  currentSong: PlayerSong | null;
  playSong: (song: PlayerSong) => void;
  clearSong: () => void;
}

const PlayerContext = createContext<PlayerContextValue>({
  currentSong: null,
  playSong: () => {},
  clearSong: () => {},
});

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentSong, setCurrentSong] = useState<PlayerSong | null>(null);

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        playSong: (song) => setCurrentSong(song),
        clearSong: () => setCurrentSong(null),
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  return useContext(PlayerContext);
}
