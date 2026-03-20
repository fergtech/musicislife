"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { AppPlayerShell } from "./AppPlayerShell";
import { usePlayer } from "@/contexts/PlayerContext";

interface Item {
  id: string;
  type: "SONG" | "ALBUM";
  mbId: string;
  title: string;
  artistName: string;
  albumName: string | null;
  releaseYear: number | null;
  coverArtUrl: string | null;
}

interface Props {
  listId: string;
  items: Item[];
}

/**
 * Wraps the public list item rows with PlayerProvider + GlobalMiniPlayer so that
 * songs are tap-to-play and albums navigate to the preview page — same behaviour
 * as a user's own list, but without edit/delete controls.
 */
export function PublicListClient({ listId, items }: Props) {
  const [artError, setArtError] = useState(false);

  const featuredArt = useMemo(() => {
    const arts = items.filter((i) => i.coverArtUrl).map((i) => i.coverArtUrl as string);
    if (!arts.length) return null;
    const seed = listId.charCodeAt(listId.length - 1) % arts.length;
    return arts[seed];
  }, [items, listId]);

  return (
    <AppPlayerShell>
      {featuredArt && !artError && (
        <div className="h-28 w-full overflow-hidden rounded-xl sm:h-36">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={featuredArt}
            alt=""
            aria-hidden
            className="h-full w-full object-cover brightness-75"
            onError={() => setArtError(true)}
          />
        </div>
      )}
      <ItemRows items={items} />
    </AppPlayerShell>
  );
}

function ItemRows({ items }: { items: Item[] }) {
  const { playSong, currentSong } = usePlayer();

  if (items.length === 0) {
    return <p className="text-center text-neutral-500 py-16 text-sm">This list is empty.</p>;
  }

  return (
    <div className="space-y-1">
      {items.map((item) => {
        const isPlaying = currentSong?.mbId === item.mbId;

        const coverThumb = (
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-surface-3 flex items-center justify-center text-neutral-600 text-sm">
            {item.coverArtUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.coverArtUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              item.type === "SONG" ? "♪" : "◉"
            )}
          </div>
        );

        const info = (
          <div className="min-w-0 flex-1">
            <p className={`truncate text-sm font-medium transition-colors group-hover:text-accent ${isPlaying ? "text-accent" : "text-neutral-100"}`}>
              {item.title}
              {isPlaying && <span className="ml-1.5 text-xs font-normal animate-pulse">▶</span>}
            </p>
            <p className="truncate text-xs text-neutral-500">
              {item.artistName}
              {item.albumName && item.type === "SONG" && (
                <span className="text-neutral-600"> · {item.albumName}</span>
              )}
            </p>
          </div>
        );

        const badge = (
          <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium bg-surface-3 text-neutral-400">
            {item.type === "SONG" ? "Song" : "Album"}
          </span>
        );

        return (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-lg border border-surface-2 bg-surface-1 px-3 py-2.5 hover:border-surface-3 transition-colors"
          >
            {item.type === "SONG" ? (
              <button
                onClick={() =>
                  playSong({
                    mbId:        item.mbId,
                    title:       item.title,
                    artistName:  item.artistName,
                    albumName:   item.albumName,
                    coverArtUrl: item.coverArtUrl,
                  })
                }
                className="group flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                {coverThumb}
                {info}
                {badge}
              </button>
            ) : (
              <Link
                href={`/discover/preview/${item.mbId}`}
                className="group flex min-w-0 flex-1 items-center gap-3"
              >
                {coverThumb}
                {info}
                {badge}
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
