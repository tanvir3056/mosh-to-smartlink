import { notFound } from "next/navigation";

import { PublicSongPage } from "@/components/public/song-page";
import { requireAdminSession } from "@/lib/auth";
import { getAdminSongPageBySongId } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AdminPreviewPage({
  params,
}: {
  params: Promise<{ songId: string }>;
}) {
  await requireAdminSession();

  const { songId } = await params;
  const page = await getAdminSongPageBySongId(songId);

  if (!page) {
    notFound();
  }

  return (
    <PublicSongPage
      page={page}
      searchString=""
      mode="preview"
      editorHref={`/admin/songs/${songId}`}
    />
  );
}
