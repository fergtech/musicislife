import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { ListDetailClient } from "@/components/ListDetailClient";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props) {
  const list = await prisma.list.findUnique({ where: { id: params.id }, select: { name: true } });
  return { title: list?.name ?? "List" };
}

export default async function ListDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const userId = session.user.id;

  const list = await prisma.list.findUnique({
    where: { id: params.id },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!list || list.userId !== userId) notFound();

  // Serialize dates to strings for client component
  const serialized = {
    id: list.id,
    name: list.name,
    description: list.description ?? null,
    createdAt: list.createdAt.toISOString(),
    updatedAt: list.updatedAt.toISOString(),
    items: list.items.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
  };

  return <ListDetailClient list={serialized} />;
}
