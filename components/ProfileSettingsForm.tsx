"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "./Avatar";
import type { ProfileRow, SocialLinks } from "@/types";

interface Props {
  initialProfile: ProfileRow | null;
}

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid" | "unchanged";

const SOCIAL_FIELDS: Array<{
  key: keyof SocialLinks;
  label: string;
  placeholder: string;
  prefix?: string;
}> = [
  { key: "instagram", label: "Instagram", placeholder: "yourhandle", prefix: "@" },
  { key: "twitter",   label: "Twitter / X", placeholder: "yourhandle", prefix: "@" },
  { key: "tiktok",    label: "TikTok", placeholder: "yourhandle", prefix: "@" },
  { key: "website",   label: "Website", placeholder: "https://example.com" },
  { key: "email",     label: "Email", placeholder: "you@example.com" },
];

export function ProfileSettingsForm({ initialProfile }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [username,    setUsername]    = useState(initialProfile?.username ?? "");
  const [avatarUrl,   setAvatarUrl]   = useState<string | null>(initialProfile?.avatarUrl ?? null);
  const [socialLinks, setSocialLinks] = useState<SocialLinks>(initialProfile?.socialLinks ?? {});
  const [isPublic,    setIsPublic]    = useState(initialProfile?.isPublic ?? true);

  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(false);

  // Debounced username availability check
  useEffect(() => {
    const trimmed = username.trim().toLowerCase();
    if (!trimmed) { setUsernameStatus("idle"); return; }
    if (trimmed === initialProfile?.username) { setUsernameStatus("unchanged"); return; }

    const timer = setTimeout(async () => {
      setUsernameStatus("checking");
      try {
        const res = await fetch(`/api/profiles/check-username?username=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        if (data.reason === "invalid") { setUsernameStatus("invalid"); return; }
        setUsernameStatus(data.available ? "available" : "taken");
      } catch {
        setUsernameStatus("idle");
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username, initialProfile?.username]);

  function handleSocialChange(key: keyof SocialLinks, value: string) {
    setSocialLinks((prev) => ({ ...prev, [key]: value }));
  }

  function handleSocialBlur(key: keyof SocialLinks) {
    // Strip leading @ on handle fields
    if (key === "instagram" || key === "twitter" || key === "tiktok") {
      setSocialLinks((prev) => ({
        ...prev,
        [key]: (prev[key] ?? "").replace(/^@+/, ""),
      }));
    }
  }

  // Client-side canvas resize → base64 JPEG
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const SIZE = 256;
        canvas.width  = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext("2d")!;
        // Center-crop square
        const min = Math.min(img.width, img.height);
        const sx  = (img.width  - min) / 2;
        const sy  = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, SIZE, SIZE);
        setAvatarUrl(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);

    // Reset so same file can be re-selected
    e.target.value = "";
  }

  const canSave =
    username.trim().length >= 3 &&
    (usernameStatus === "available" || usernameStatus === "unchanged" || usernameStatus === "idle");

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess(false);

    const res = await fetch("/api/profiles/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username:    username.trim().toLowerCase(),
        avatarUrl,
        socialLinks,
        isPublic,
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save.");
      return;
    }

    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
    router.refresh();
  }

  const statusMsg: Record<UsernameStatus, string | null> = {
    idle:      null,
    checking:  "Checking…",
    available: "✓ Available",
    taken:     "✗ Already taken",
    invalid:   "✗ 3–30 chars, letters/numbers/_ / - only",
    unchanged: null,
  };
  const statusColor: Record<UsernameStatus, string> = {
    idle:      "",
    checking:  "text-neutral-500",
    available: "text-green-400",
    taken:     "text-red-400",
    invalid:   "text-red-400",
    unchanged: "",
  };

  return (
    <div className="space-y-8">
      {/* Avatar */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">Avatar</h2>
        <div className="flex items-center gap-4">
          <Avatar username={username || "?"} avatarUrl={avatarUrl} size={72} />
          <div className="flex flex-col gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="btn-secondary text-sm"
            >
              Upload photo
            </button>
            {avatarUrl && (
              <button
                type="button"
                onClick={() => setAvatarUrl(null)}
                className="text-xs text-neutral-500 hover:text-red-400 transition-colors"
              >
                Remove photo
              </button>
            )}
          </div>
        </div>
        {!avatarUrl && (
          <p className="text-xs text-neutral-600">No photo uploaded — showing auto-generated avatar.</p>
        )}
      </section>

      {/* Username */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">Username</h2>
        <div>
          <div className="flex items-center rounded-lg border border-surface-3 bg-surface-1 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent transition-colors">
            <span className="pl-3 text-neutral-500 select-none">@</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
              placeholder="yourhandle"
              maxLength={30}
              className="flex-1 bg-transparent px-2 py-2 text-neutral-100 outline-none placeholder:text-neutral-600"
            />
          </div>
          {statusMsg[usernameStatus] && (
            <p className={`mt-1 text-xs ${statusColor[usernameStatus]}`}>
              {statusMsg[usernameStatus]}
            </p>
          )}
        </div>
        <p className="text-xs text-neutral-600">
          Your public profile will be at musicislyfe.app/u/{username || "yourhandle"}
        </p>
      </section>

      {/* Social links */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">Social Links</h2>
        <div className="space-y-2">
          {SOCIAL_FIELDS.map(({ key, label, placeholder, prefix }) => (
            <div key={key} className="flex items-center gap-2">
              <label className="w-28 shrink-0 text-sm text-neutral-400">{label}</label>
              <div className="flex flex-1 items-center rounded-lg border border-surface-3 bg-surface-1 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent transition-colors">
                {prefix && (
                  <span className="pl-3 text-neutral-500 select-none">{prefix}</span>
                )}
                <input
                  value={socialLinks[key] ?? ""}
                  onChange={(e) => handleSocialChange(key, e.target.value)}
                  onBlur={() => handleSocialBlur(key)}
                  placeholder={placeholder}
                  className="flex-1 bg-transparent px-3 py-2 text-sm text-neutral-100 outline-none placeholder:text-neutral-600"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Privacy */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">Privacy</h2>
        <label className="flex cursor-pointer items-start gap-3">
          <div className="relative mt-0.5">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="sr-only"
            />
            <div
              className={`h-5 w-9 rounded-full transition-colors ${isPublic ? "bg-accent" : "bg-surface-3"}`}
            />
            <div
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${isPublic ? "translate-x-4" : "translate-x-0.5"}`}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-200">Public profile</p>
            <p className="text-xs text-neutral-500 mt-0.5">
              {isPublic
                ? "Anyone can view your profile and lists."
                : "Only you can view your profile and lists."}
            </p>
          </div>
        </label>
      </section>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving || !canSave}
          className="btn-primary"
        >
          {saving ? "Saving…" : initialProfile ? "Save changes" : "Create profile"}
        </button>
        {initialProfile && (
          <a
            href={`/u/${initialProfile.username}`}
            className="btn-secondary text-sm"
            target="_blank"
            rel="noopener noreferrer"
          >
            View profile ↗
          </a>
        )}
        {success && <span className="text-sm text-green-400">✓ Saved!</span>}
        {error   && <span className="text-sm text-red-400">{error}</span>}
      </div>
    </div>
  );
}
