import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicSongPage } from "@/components/public/song-page";
import { getPublishedSongPageBySlug } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublishedSongPageBySlug(slug);

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
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, search] = await Promise.all([params, searchParams]);
  const page = await getPublishedSongPageBySlug(slug);

  if (!page) {
    notFound();
  }

  const urlSearch = new URLSearchParams();

  Object.entries(search).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => urlSearch.append(key, entry));
      return;
    }

    if (typeof value === "string") {
      urlSearch.set(key, value);
    }
  });

  return <PublicSongPage page={page} searchString={urlSearch.toString()} />;
}
