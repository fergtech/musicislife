"use client";

import { useState, useEffect, useRef, useCallback, type ChangeEvent } from "react";
import { usePlayer } from "@/lib/player-context";
import type { ItunesPreview } from "@/types";

type PreviewState = "loading" | "ready" | "unavailable";

function formatTime(s: number): string {
  if (isNaN(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function GlobalMiniPlayer() {
  const { currentSong, clearSong } = usePlayer();

  const audioRef = useRef<HTMLAudioElement>(null);
  const [previewState, setPreviewState] = useState<PreviewState>("loading");
  const [previewUrl,   setPreviewUrl]   = useState<string | null>(null);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [currentTime,  setCurrentTime]  = useState(0);
  const [duration,     setDuration]     = useState(0);

  // Fetch iTunes preview whenever the song changes
  useEffect(() => {
    if (!currentSong) return;

    setPreviewState("loading");
    setPreviewUrl(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    fetch(
      `/api/itunes?track=${encodeURIComponent(currentSong.title)}&artist=${encodeURIComponent(currentSong.artistName)}`,
    )
      .then(async (res) => {
        if (res.status === 204 || !res.ok) { setPreviewState("unavailable"); return; }
        const data: ItunesPreview = await res.json();
        if (data.previewUrl) {
          setPreviewUrl(data.previewUrl);
          setPreviewState("ready");
        } else {
          setPreviewState("unavailable");
        }
      })
      .catch(() => setPreviewState("unavailable"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSong?.mbId]); // keyed on mbId — re-fetch when song changes

  // Load + auto-play when the preview URL is resolved
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !previewUrl) return;
    audio.src = previewUrl;
    audio.currentTime = 0;
    audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  }, [previewUrl]);

  // Wire audio events (once, on mount)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime   = () => setCurrentTime(audio.currentTime);
    const onLoaded = () => setDuration(audio.duration);
    const onEnded  = () => { setIsPlaying(false); setCurrentTime(0); };

    audio.addEventListener("timeupdate",     onTime);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("durationchange", onLoaded);
    audio.addEventListener("ended",          onEnded);

    return () => {
      audio.removeEventListener("timeupdate",     onTime);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("durationchange", onLoaded);
      audio.removeEventListener("ended",          onEnded);
    };
  }, []);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [isPlaying]);

  const handleSeek = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const t = parseFloat(e.target.value);
    audio.currentTime = t;
    setCurrentTime(t);
  }, []);

  // Always render the audio element so the ref is stable.
  // The visible player is hidden when there's no current song.
  return (
    <>
      <audio ref={audioRef} preload="none" />

      {currentSong && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-surface-2 bg-surface-1/95 px-4 py-3 backdrop-blur-md">
          <div className="mx-auto max-w-4xl space-y-2">
            {/* Progress bar — only when preview is ready */}
            {previewState === "ready" && (
              <div className="flex items-center gap-3">
                <span className="w-10 text-right text-xs tabular-nums text-neutral-500">
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={duration || 30}
                  step={0.1}
                  value={currentTime}
                  onChange={handleSeek}
                  className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-surface-3 accent-accent"
                />
                <span className="w-10 text-xs tabular-nums text-neutral-500">
                  {duration > 0 ? formatTime(duration) : "0:30"}
                </span>
              </div>
            )}

            {/* Controls row */}
            <div className="flex items-center gap-3">
              {/* Cover art */}
              {currentSong.coverArtUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentSong.coverArtUrl}
                  alt=""
                  aria-hidden
                  className="h-9 w-9 shrink-0 rounded object-cover"
                />
              )}

              {/* Play / loading / unavailable button */}
              {previewState === "loading" && (
                <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-surface-3" />
              )}
              {previewState === "unavailable" && (
                <div
                  title="No preview available"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-3 text-neutral-600"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </div>
              )}
              {previewState === "ready" && (
                <button
                  onClick={togglePlayPause}
                  aria-label={isPlaying ? "Pause" : "Play"}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-white transition-transform hover:scale-105 active:scale-95"
                >
                  {isPlaying ? (
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                  ) : (
                    <svg className="h-3.5 w-3.5 translate-x-px" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
              )}

              {/* Song info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-100">{currentSong.title}</p>
                <p className="truncate text-xs text-neutral-500">
                  {currentSong.artistName}
                  {currentSong.albumName && (
                    <span className="text-neutral-600"> · {currentSong.albumName}</span>
                  )}
                  {previewState === "ready" && (
                    <span className="hidden text-neutral-700 sm:inline"> · 30s preview via iTunes</span>
                  )}
                  {previewState === "unavailable" && (
                    <span className="text-neutral-600"> · No preview available</span>
                  )}
                </p>
              </div>

              {/* Close */}
              <button
                onClick={() => {
                  audioRef.current?.pause();
                  clearSong();
                }}
                aria-label="Close player"
                className="shrink-0 rounded p-1 text-neutral-600 hover:text-neutral-300 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
