import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Avatar } from "@/components/Avatar";
import type { SocialLinks } from "@/types";

interface Props {
  params: { username: string };
}

export async function generateMetadata({ params }: Props) {
  return { title: `@${params.username} · musicislyfe` };
}

const SOCIAL_CONFIG: Array<{
  key: keyof SocialLinks;
  label: string;
  href: (v: string) => string;
  icon: string;
}> = [
  { key: "instagram", label: "Instagram", href: (v) => `https://instagram.com/${v}`,  icon: "IG" },
  { key: "twitter",   label: "Twitter/X",  href: (v) => `https://x.com/${v}`,          icon: "𝕏" },
  { key: "tiktok",    label: "TikTok",     href: (v) => `https://tiktok.com/@${v}`,    icon: "TT" },
  { key: "website",   label: "Website",    href: (v) => v,                             icon: "↗" },
  { key: "email",     label: "Email",      href: (v) => `mailto:${v}`,                 icon: "✉" },
];

export default async function PublicProfilePage({ params }: Props) {
  const username = params.username.toLowerCase();
  const session  = await getServerSession(authOptions);

  const profile = await prisma.profile.findUnique({
    where:  { username },
    select: {
      userId:      true,
      username:    true,
      avatarUrl:   true,
      socialLinks: true,
      isPublic:    true,
    },
  });

  if (!profile) notFound();

  const isOwner = session?.user.id === profile.userId;
  const socialLinks = (profile.socialLinks ?? {}) as SocialLinks;

  // Fetch lists
  const listsRaw = await prisma.list.findMany({
    where:   { userId: profile.userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true, name: true, description: true, updatedAt: true,
      _count: { select: { items: true } },
      items: {
        where:  { coverArtUrl: { not: null } },
        take:   8,
        select: { coverArtUrl: true },
      },
    },
  });

  const lists = listsRaw.map((list) => {
    const arts = list.items.map((i) => i.coverArtUrl as string);
    const seed = list.id.charCodeAt(list.id.length - 1) % (arts.length || 1);
    return { ...list, featuredArt: arts[seed] ?? null };
  });

  return (
    <div className="min-h-screen bg-surface-0">
      {/* Header */}
      <header className="border-b border-surface-2 bg-surface-0/80 backdrop-blur px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="text-sm font-bold text-accent">musicislyfe</Link>
          {session ? (
            <Link href="/" className="btn-secondary text-sm">My Lists</Link>
          ) : (
            <Link href="/login" className="btn-primary text-sm">Log in / Sign up</Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 space-y-10">
        {/* Private profile guard */}
        {!profile.isPublic && !isOwner ? (
          <div className="py-24 text-center space-y-2">
            <p className="text-lg font-semibold text-neutral-300">Private profile</p>
            <p className="text-sm text-neutral-500">@{username} has a private profile.</p>
          </div>
        ) : (
          <>
            {/* Profile header */}
            <div className="flex items-start gap-5">
              <Avatar username={profile.username} avatarUrl={profile.avatarUrl} size={80} />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-neutral-100">@{profile.username}</h1>
                  {isOwner && (
                    <Link href="/settings/profile" className="btn-secondary text-xs">
                      Edit profile
                    </Link>
                  )}
                </div>

                {/* Social links */}
                {Object.values(socialLinks).some(Boolean) && (
                  <div className="flex flex-wrap gap-2">
                    {SOCIAL_CONFIG.map(({ key, label, href, icon }) => {
                      const val = socialLinks[key];
                      if (!val) return null;
                      return (
                        <a
                          key={key}
                          href={href(val)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={label}
                          className="inline-flex items-center gap-1.5 rounded-full border border-surface-3 bg-surface-1 px-3 py-1 text-xs text-neutral-400 hover:border-accent/50 hover:text-neutral-200 transition-colors"
                        >
                          <span>{icon}</span>
                          <span>
                            {key === "website" ? val.replace(/^https?:\/\//, "") : `@${val}`}
                          </span>
                        </a>
                      );
                    })}
                  </div>
                )}

                <p className="text-sm text-neutral-500">
                  {lists.length} {lists.length === 1 ? "list" : "lists"}
                </p>
              </div>
            </div>

            {/* Lists */}
            {lists.length === 0 ? (
              <p className="text-center text-neutral-500 py-16 text-sm">No lists yet.</p>
            ) : (
              <div>
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">
                  Music Lists
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {lists.map((list) => (
                    <Link
                      key={list.id}
                      href={`/u/${profile.username}/lists/${list.id}`}
                      className="group relative flex flex-col overflow-hidden rounded-xl border border-surface-2 bg-surface-1 hover:border-accent/50 transition-colors"
                    >
                      {/* Featured art */}
                      <div className="relative aspect-[16/7] w-full overflow-hidden bg-surface-2">
                        {list.featuredArt ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={list.featuredArt}
                              alt=""
                              aria-hidden
                              className="absolute inset-0 h-full w-full object-cover scale-110 blur-md brightness-40"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={list.featuredArt}
                                alt={`Cover art for ${list.name}`}
                                className="h-20 w-20 rounded-lg shadow-2xl ring-1 ring-white/10 object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            </div>
                          </>
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-4xl text-neutral-700">◉</div>
                        )}
                      </div>

                      <div className="px-4 py-3">
                        <p className="truncate font-semibold text-neutral-100 group-hover:text-accent transition-colors">
                          {list.name}
                        </p>
                        <p className="mt-0.5 text-sm text-neutral-500">
                          {list._count.items} {list._count.items === 1 ? "item" : "items"}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
