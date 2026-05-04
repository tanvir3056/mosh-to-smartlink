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
    <section className="grid gap-5">
      <div className="app-card app-enter rounded-[1.75rem] p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="app-kicker text-[var(--app-muted)]">Review and publish</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--app-text)]">
              {page.song.artistName} • {page.song.title}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--app-muted)]">
              Confirm metadata, fix destinations, and publish only when the page is ready.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="app-chip">{page.page.status}</span>
            <span className="app-chip">@{page.page.username}</span>
          </div>
        </div>
      </div>

      <SongEditorForm
        page={page}
        performance={performance}
        showMissingLinksReview={resolvedSearchParams.review === "missing-links"}
      />
    </section>
  );
}
