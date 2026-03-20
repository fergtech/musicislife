import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";
import { GlobalSearch } from "@/components/GlobalSearch";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

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
                aria-label="My Lists"
                title="My Lists"
                className="rounded-md px-2 py-1.5 text-sm text-neutral-400 transition-colors hover:bg-surface-2 hover:text-neutral-100 sm:px-3"
              >
                <span className="inline sm:hidden" aria-hidden="true">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                  </svg>
                </span>
                <span className="hidden sm:inline">My Lists</span>
              </Link>
              <Link
                href="/discover"
                aria-label="Discover"
                title="Discover"
                className="rounded-md px-2 py-1.5 text-sm text-neutral-400 transition-colors hover:bg-surface-2 hover:text-neutral-100 sm:px-3"
              >
                <span className="inline sm:hidden" aria-hidden="true">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                </span>
                <span className="hidden sm:inline">Discover</span>
              </Link>
            </nav>
          </div>

          <nav className="flex items-center justify-center gap-1 sm:hidden">
            <Link
              href="/"
              aria-label="My Lists"
              title="My Lists"
              className="rounded-md px-2 py-1.5 text-sm text-neutral-400 transition-colors hover:bg-surface-2 hover:text-neutral-100"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
              </svg>
            </Link>
            <Link
              href="/discover"
              aria-label="Discover"
              title="Discover"
              className="rounded-md px-2 py-1.5 text-sm text-neutral-400 transition-colors hover:bg-surface-2 hover:text-neutral-100"
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
            <span className="hidden text-sm text-neutral-400 sm:block">
              {session.user.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}
