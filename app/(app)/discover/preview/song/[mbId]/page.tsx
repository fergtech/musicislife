import { notFound } from "next/navigation";
import { fetchSongMetadata } from "@/lib/musicbrainz";
import { SongPreviewClient } from "@/components/SongPreviewClient";
import type { Metadata } from "next";

interface Props {
  params: { mbId: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const song = await fetchSongMetadata(params.mbId);
    return {
      title: `${song.title} — Preview`,
      description: `${song.artistName}${song.albumName ? ` · ${song.albumName}` : ""}`,
    };
  } catch {
    return { title: "Song Preview" };
  }
}

export default async function SongPreviewPage({ params }: Props) {
  let song;
  try {
    song = await fetchSongMetadata(params.mbId);
  } catch {
    notFound();
  }

  return <SongPreviewClient song={song} />;
}
