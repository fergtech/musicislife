import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { GlobalSearch } from "@/components/GlobalSearch";
import { SignOutButton } from "@/components/SignOutButton";

interface Props {
  isAuthenticated: boolean;
  username?: string | null;
  avatarUrl?: string | null;
}

export function SiteHeader({ isAuthenticated, username, avatarUrl }: Props) {
  const profileHref = username ? `/u/${username}` : "/settings/profile";

  return (
    <header className="sticky top-0 z-10 border-b border-surface-2 bg-surface-0/80 backdrop-blur">
      <div className="mx-auto grid h-14 max-w-4xl grid-cols-3 items-center px-4 sm:flex sm:justify-between">

        {/* Left — logo + desktop nav */}
        <div className="flex items-center justify-start gap-3 sm:gap-6">
          <Link href="/" className="text-xl font-bold text-accent">
            musicislyfe
          </Link>
          {isAuthenticated && (
            <nav className="hidden items-center gap-1 sm:flex">
              <Link
                href="/"
                className="rounded-md px-3 py-1.5 text-sm text-neutral-400 transition-colors hover:bg-surface-2 hover:text-neutral-100"
              >
                My Lists
              </Link>
              <Link
                href="/discover"
                className="rounded-md px-3 py-1.5 text-sm text-neutral-400 transition-colors hover:bg-surface-2 hover:text-neutral-100"
              >
                Discover
              </Link>
            </nav>
          )}
        </div>

        {/* Centre — mobile nav icons (authenticated only) */}
        {isAuthenticated ? (
          <nav className="flex items-center justify-center gap-1 sm:hidden">
            <Link
              href="/"
              aria-label="My Lists"
              className="rounded-md px-2 py-1.5 text-neutral-400 transition-colors hover:bg-surface-2 hover:text-neutral-100"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
              </svg>
            </Link>
            <Link
              href="/discover"
              aria-label="Discover"
              className="rounded-md px-2 py-1.5 text-neutral-400 transition-colors hover:bg-surface-2 hover:text-neutral-100"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </Link>
          </nav>
        ) : (
          <div /> /* keep grid balanced on mobile */
        )}

        {/* Right — search + profile/auth */}
        <div className="flex items-center justify-end gap-2">
          {isAuthenticated ? (
            <>
              <GlobalSearch />
              <Link
                href={profileHref}
                aria-label={username ? "Open profile" : "Set up profile"}
                className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-surface-2"
                title={username ? `@${username}` : "Set up profile"}
              >
                {username ? (
                  <Avatar username={username} avatarUrl={avatarUrl ?? null} size={28} />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-neutral-300" aria-hidden>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 21a8 8 0 10-16 0" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                )}
                <span className="hidden text-sm text-neutral-300 sm:block">
                  {username ? `@${username}` : "Set up profile"}
                </span>
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link href="/login" className="btn-primary text-sm">
              Log in / Sign up
            </Link>
          )}
        </div>

      </div>
    </header>
  );
}
