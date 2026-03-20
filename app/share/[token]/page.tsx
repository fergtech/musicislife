import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { SharePageClient } from "@/components/SharePageClient";

interface Props {
  params: { token: string };
}

export async function generateMetadata({ params }: Props) {
  const list = await prisma.list.findUnique({
    where: { shareToken: params.token },
    select: { name: true },
  });
  return { title: list ? `${list.name} · musicislyfe` : "Shared List · musicislyfe" };
}

export default async function SharePage({ params }: Props) {
  const session = await getServerSession(authOptions);
  const list = await prisma.list.findUnique({
    where: { shareToken: params.token },
    include: { items: { orderBy: { createdAt: "asc" } } },
  });

  if (!list) notFound();

  const data = {
    token: params.token,
    name: list.name,
    description: list.description ?? null,
    createdAt: list.createdAt.toISOString(),
    items: list.items.map((item) => ({
      id: item.id,
      type: item.type as "SONG" | "ALBUM",
      title: item.title,
      artistName: item.artistName,
      albumName: item.albumName ?? null,
      releaseYear: item.releaseYear ?? null,
      coverArtUrl: item.coverArtUrl ?? null,
    })),
  };

  return (
    <div className="min-h-screen bg-surface-0">
      <header className="border-b border-surface-2 bg-surface-0/80 backdrop-blur px-4 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link href="/" className="text-sm font-bold text-accent">
            musicislyfe
          </Link>
          {session ? (
            <Link href="/" className="btn-secondary text-sm">
              My Lists
            </Link>
          ) : (
            <Link href="/login" className="btn-primary text-sm">
              Log in / Sign up
            </Link>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-10">
        <SharePageClient list={data} />
      </main>
    </div>
  );
}
