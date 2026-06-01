import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";

import { PublicSongPage } from "@/components/public/song-page";
import { getUserSession } from "@/lib/auth";
import {
  getAdminSongPageByPublicPathForOwner,
  getPublishedSongPage,
} from "@/lib/data";

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
    await connection();

    const session = await getUserSession();

    if (session) {
      const ownedPage = await getAdminSongPageByPublicPathForOwner(
        username,
        slug,
        session.userId,
      );

      if (ownedPage) {
        redirect(`/admin/preview/${ownedPage.song.id}`);
      }
    }

    notFound();
  }

  return <PublicSongPage page={page} />;
}
