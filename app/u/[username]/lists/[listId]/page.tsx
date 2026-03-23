import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PublicListClient } from "@/components/PublicListClient";

interface Props {
  params: { username: string; listId: string };
}

export async function generateMetadata({ params }: Props) {
  const list = await prisma.list.findUnique({
    where:  { id: params.listId },
    select: { name: true },
  });
  return { title: list?.name ?? "List" };
}

export default async function PublicListPage({ params }: Props) {
  const username = params.username.toLowerCase();
  const session  = await getServerSession(authOptions);

  const profile = await prisma.profile.findUnique({
    where:  { username },
    select: { userId: true, username: true, isPublic: true },
  });

  if (!profile) notFound();

  const isOwner = session?.user.id === profile.userId;

  // Respect profile privacy
  if (!profile.isPublic && !isOwner) notFound();

  const list = await prisma.list.findUnique({
    where:   { id: params.listId },
    include: { items: { orderBy: { createdAt: "asc" } } },
  });

  // List must exist and belong to this profile's user
  if (!list || list.userId !== profile.userId) notFound();

  return (
    <div className="min-h-screen bg-surface-0">
      {/* Header */}
      <header className="border-b border-surface-2 bg-surface-0/80 backdrop-blur px-4 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link href="/" className="text-sm font-bold text-accent">musicislyfe</Link>
          {session ? (
            <Link href="/" className="btn-secondary text-sm">My Lists</Link>
          ) : (
            <Link href="/login" className="btn-primary text-sm">Log in / Sign up</Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10 space-y-6">
        {/* Breadcrumb */}
        <Link
          href={`/u/${profile.username}`}
          className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          ← @{profile.username}
        </Link>

        {/* List name */}
        <div className="space-y-0.5">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            {isOwner ? "Your list" : `@${profile.username}'s list`}
          </p>
          <h1 className="text-2xl font-bold text-neutral-100">{list.name}</h1>
        </div>

        {/* Owner shortcut */}
        {isOwner && (
          <Link href={`/lists/${list.id}`} className="btn-secondary text-sm inline-flex">
            Edit this list →
          </Link>
        )}

        {/* Art → description → item count → interactive items */}
        <PublicListClient
          listId={list.id}
          items={list.items}
          description={list.description}
          itemCount={list.items.length}
        />

        <p className="text-xs text-neutral-700 text-center pt-4">musicislyfe</p>
      </main>
    </div>
  );
}
