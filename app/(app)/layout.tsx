import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";
import { GlobalSearch } from "@/components/GlobalSearch";
import { Avatar } from "@/components/Avatar";
import { AppPlayerShell } from "@/components/AppPlayerShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const profile = await prisma.profile.findUnique({
    where:  { userId: session.user.id },
    select: { username: true, avatarUrl: true },
  });

  return (
    <div className="min-h-screen bg-surface-0">
      {/* Top nav */}
      <header className="sticky top-0 z-10 border-b border-surface-2 bg-surface-0/80 backdrop-blur">
        <div className="mx-auto grid h-14 max-w-4xl grid-cols-3 items-center px-4 sm:flex sm:justify-between">
          <div className="flex items-center justify-start gap-3 sm:gap-6">
            <Link href="/" className="text-xl font-bold text-accent">
              musicislyfe
            </Link>
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
          </div>

          {/* Mobile centre nav */}
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

          <div className="flex items-center justify-end gap-2">
            <GlobalSearch />
            {profile ? (
              <Link
                href={`/u/${profile.username}`}
                className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-surface-2 transition-colors"
                title={`@${profile.username}`}
              >
                <Avatar username={profile.username} avatarUrl={profile.avatarUrl} size={28} />
                <span className="hidden text-sm text-neutral-300 sm:block">
                  @{profile.username}
                </span>
              </Link>
            ) : (
              <Link
                href="/settings/profile"
                className="hidden text-sm text-accent hover:underline sm:block"
                title="Set up your profile"
              >
                Set up profile
              </Link>
            )}
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Page content — wrapped with global audio player context */}
      <AppPlayerShell>
        <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
      </AppPlayerShell>
    </div>
  );
}
