import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PublicListTabs } from "@/components/PublicListTabs";

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

  const currentUserProfile = session
    ? await prisma.profile.findUnique({
        where:  { userId: session.user.id },
        select: { username: true },
      })
    : null;

  const list = await prisma.list.findUnique({
    where:   { id: params.listId },
    include: { items: { orderBy: { createdAt: "asc" } } },
  });

  // List must exist and belong to this profile's user
  if (!list || list.userId !== profile.userId) notFound();

  return (
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

        <PublicListTabs
          listId={list.id}
          listOwnerId={profile.userId}
          items={list.items}
          description={list.description}
          currentUserId={session?.user.id ?? null}
          currentUserUsername={currentUserProfile?.username ?? null}
        />

        <p className="text-xs text-neutral-700 text-center pt-4">musicislyfe</p>
    </main>
  );
}
