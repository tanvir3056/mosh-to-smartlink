import { notFound } from "next/navigation";

import { SongEditorForm } from "@/components/admin/song-editor-form";
import { requireUserSession } from "@/lib/auth";
import {
  getAdminSongPageBySongId,
  getDashboardSnapshot,
  getEmailConnectorConfig,
} from "@/lib/data";

export default async function EditSongPage({
  params,
  searchParams,
}: {
  params: Promise<{ songId: string }>;
  searchParams: Promise<{ imported?: string; review?: string }>;
}) {
  const session = await requireUserSession();
  const { songId } = await params;
  const resolvedSearchParams = await searchParams;
  const [pageResult, dashboardResult, connectorResult] = await Promise.allSettled([
    getAdminSongPageBySongId(songId, session.userId),
    getDashboardSnapshot(session.userId),
    getEmailConnectorConfig(session.userId),
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
  const emailConnector =
    connectorResult.status === "fulfilled" ? connectorResult.value : null;

  return (
    <SongEditorForm
      page={page}
      performance={performance}
      emailConnector={emailConnector}
      showImportedDraftConfirmation={resolvedSearchParams.imported === "1"}
      showMissingLinksReview={resolvedSearchParams.review === "missing-links"}
    />
  );
}
