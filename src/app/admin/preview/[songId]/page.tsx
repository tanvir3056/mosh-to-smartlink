import { notFound } from "next/navigation";

import { PublicSongPage } from "@/components/public/song-page";
import { requireUserSession } from "@/lib/auth";
import { getAdminSongPageBySongId } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AdminPreviewPage({
  params,
}: {
  params: Promise<{ songId: string }>;
}) {
  const session = await requireUserSession();

  const { songId } = await params;
  const page = await getAdminSongPageBySongId(songId, session.userId);

  if (!page) {
    notFound();
  }

  return (
    <PublicSongPage
      page={page}
      mode="preview"
      editorHref={`/admin/songs/${songId}`}
    />
  );
}
