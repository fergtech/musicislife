import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ListCard } from "@/components/ListCard";
import { CreateListForm } from "@/components/CreateListForm";
import { ImportListButton } from "@/components/ImportListButton";

export const metadata = { title: "My Lists" };

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const userId = session.user.id;

  const lists = await prisma.list.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { items: true } } },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Lists</h1>
        <ImportListButton />
      </div>

      <CreateListForm />

      {lists.length === 0 ? (
        <p className="text-center text-neutral-500 py-16">
          No lists yet. Create your first one above.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {lists.map((list) => (
            <ListCard key={list.id} list={list} />
          ))}
        </div>
      )}
    </div>
  );
}
