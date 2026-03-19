import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { renderToStream } from "@react-pdf/renderer";
import { createElement } from "react";
import { ListPDF } from "@/components/ListPDF";

interface Params {
  params: { id: string };
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const list = await prisma.list.findUnique({
    where: { id: params.id },
    include: { items: { orderBy: { createdAt: "asc" } } },
  });

  if (!list || list.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const listData = {
    name: list.name,
    description: list.description,
    createdAt: list.createdAt.toISOString(),
    items: list.items.map((item) => ({
      id: item.id,
      type: item.type as "SONG" | "ALBUM",
      title: item.title,
      artistName: item.artistName,
      albumName: item.albumName,
      releaseYear: item.releaseYear,
      coverArtUrl: item.coverArtUrl,
    })),
  };

  const stream = await renderToStream(createElement(ListPDF, { list: listData }));

  const safeName = list.name.replace(/[^a-z0-9]/gi, "-").toLowerCase();
  return new NextResponse(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
    },
  });
}
