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
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-bold text-accent">
              musicislyfe
            </Link>
            <nav className="flex items-center gap-1">
              <Link
                href="/"
                className="rounded-md px-3 py-1.5 text-sm text-neutral-400 hover:bg-surface-2 hover:text-neutral-100 transition-colors"
              >
                My Lists
              </Link>
              <Link
                href="/discover"
                className="rounded-md px-3 py-1.5 text-sm text-neutral-400 hover:bg-surface-2 hover:text-neutral-100 transition-colors"
              >
                Discover
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
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
