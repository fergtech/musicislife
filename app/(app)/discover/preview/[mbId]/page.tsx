import { notFound } from "next/navigation";
import { fetchAlbumTracklist } from "@/lib/musicbrainz";
import { AlbumPreviewClient } from "@/components/AlbumPreviewClient";
import type { Metadata } from "next";

interface Props {
  params: { mbId: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const album = await fetchAlbumTracklist(params.mbId);
    return {
      title: `${album.title} — Preview`,
      description: `${album.artistName} · ${album.releaseYear ?? ""} · ${album.tracks.length} tracks`,
    };
  } catch {
    return { title: "Album Preview" };
  }
}

export default async function AlbumPreviewPage({ params }: Props) {
  let album;
  try {
    album = await fetchAlbumTracklist(params.mbId);
  } catch {
    notFound();
  }

  return <AlbumPreviewClient album={album} />;
}
