"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePlayer } from "@/lib/player-context";
import { CommentsSection } from "./CommentsSection";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  listOwnerId: string;
  items: Item[];
  description?: string | null;
  currentUserId: string | null;
  currentUserUsername: string | null;
}

// ─── Root export ─────────────────────────────────────────────────────────────

export function PublicListTabs(props: Props) {
  return <Tabs {...props} />;
}

// ─── Inner (has access to PlayerContext) ─────────────────────────────────────

type Tab = "items" | "comments";

function Tabs({ listId, listOwnerId, items, description, currentUserId, currentUserUsername }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("items");
  const [artError,  setArtError]  = useState(false);

  const featuredArt = useMemo(() => {
    const arts = items.filter((i) => i.coverArtUrl).map((i) => i.coverArtUrl as string);
    if (!arts.length) return null;
    const seed = listId.charCodeAt(listId.length - 1) % arts.length;
    return arts[seed];
  }, [items, listId]);

  return (
    <div>
      {/* Featured artwork */}
      {featuredArt && !artError && (
        <div className="mb-4 h-28 w-full overflow-hidden rounded-xl sm:h-36">
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

      {/* Description + count */}
      {description && (
        <p className="mb-1 text-sm text-neutral-400 leading-relaxed max-w-prose">{description}</p>
      )}
      <p className="mb-4 text-xs text-neutral-600">
        {items.length} {items.length === 1 ? "item" : "items"}
      </p>

      {/* Sticky tab bar */}
      <div className="sticky top-0 z-10 -mx-4 mb-4 flex border-b border-surface-2 bg-surface-0/95 px-4 backdrop-blur">
        <TabButton label="Items" active={activeTab === "items"} onClick={() => setActiveTab("items")} />
        <TabButton label="Comments" active={activeTab === "comments"} onClick={() => setActiveTab("comments")} />
      </div>

      {/* Tab content */}
      {activeTab === "items" ? (
        <ItemRows items={items} listId={listId} />
      ) : (
        <CommentsSection
          listId={listId}
          listOwnerId={listOwnerId}
          currentUserId={currentUserId}
          currentUserUsername={currentUserUsername}
        />
      )}
    </div>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
        active
          ? "border-accent text-accent"
          : "border-transparent text-neutral-500 hover:text-neutral-300"
      }`}
    >
      {label}
    </button>
  );
}

// ─── Item rows ────────────────────────────────────────────────────────────────

function ItemRows({ items, listId: _ }: { items: Item[]; listId: string }) {
  const { playSong, currentSong } = usePlayer();

  if (items.length === 0) {
    return <p className="py-16 text-center text-sm text-neutral-500">This list is empty.</p>;
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
                onClick={() => playSong({
                  mbId:        item.mbId,
                  title:       item.title,
                  artistName:  item.artistName,
                  albumName:   item.albumName,
                  coverArtUrl: item.coverArtUrl,
                })}
                className="group flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                {coverThumb}{info}{badge}
              </button>
            ) : (
              <Link
                href={`/discover/preview/${item.mbId}`}
                className="group flex min-w-0 flex-1 items-center gap-3"
              >
                {coverThumb}{info}{badge}
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
