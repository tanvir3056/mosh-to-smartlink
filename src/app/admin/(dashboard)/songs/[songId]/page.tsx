import { notFound } from "next/navigation";

import { SongEditorForm } from "@/components/admin/song-editor-form";
import { requireUserSession } from "@/lib/auth";
import { getAdminSongPageBySongId, getDashboardSnapshot } from "@/lib/data";

export default async function EditSongPage({
  params,
  searchParams,
}: {
  params: Promise<{ songId: string }>;
  searchParams: Promise<{ review?: string }>;
}) {
  const session = await requireUserSession();
  const { songId } = await params;
  const resolvedSearchParams = await searchParams;
  const [pageResult, dashboardResult] = await Promise.allSettled([
    getAdminSongPageBySongId(songId, session.userId),
    getDashboardSnapshot(session.userId),
  ]);
  const page = pageResult.status === "fulfilled" ? pageResult.value : null;

  if (!page) {
    if (pageResult.status === "rejected") {
      throw pageResult.reason;
    }
    notFound();
  }

  const dashboard =
    dashboardResult.status === "fulfilled" ? dashboardResult.value : null;
  const performance =
    dashboard?.songs.find((song) => song.songId === page.song.id) ?? null;

  return (
    <SongEditorForm
      page={page}
      performance={performance}
      showMissingLinksReview={resolvedSearchParams.review === "missing-links"}
    />
  );
}
