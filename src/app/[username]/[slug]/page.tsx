import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicSongPage } from "@/components/public/song-page";
import { getPublishedSongPage } from "@/lib/data";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}): Promise<Metadata> {
  const { username, slug } = await params;
  const page = await getPublishedSongPage(username, slug);

  if (!page) {
    return {
      title: "Song not found",
    };
  }

  return {
    title: `${page.song.artistName} • ${page.song.title}`,
    description: `Stream ${page.song.title} by ${page.song.artistName} across your favorite services.`,
    openGraph: {
      title: `${page.song.artistName} • ${page.song.title}`,
      description: `Stream ${page.song.title} by ${page.song.artistName}.`,
      images: [
        {
          url: page.song.artworkUrl,
        },
      ],
    },
  };
}

export default async function PublicSongRoute({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  const { username, slug } = await params;
  const page = await getPublishedSongPage(username, slug);

  if (!page) {
    notFound();
  }

  return <PublicSongPage page={page} />;
}
