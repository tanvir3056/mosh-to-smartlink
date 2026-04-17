import { notFound } from "next/navigation";

import { SongEditorForm } from "@/components/admin/song-editor-form";
import { getAdminSongPageBySongId, getDashboardSnapshot } from "@/lib/data";

export default async function EditSongPage({
  params,
}: {
  params: Promise<{ songId: string }>;
}) {
  const { songId } = await params;
  const [page, dashboard] = await Promise.all([
    getAdminSongPageBySongId(songId),
    getDashboardSnapshot(),
  ]);

  if (!page) {
    notFound();
  }

  const performance =
    dashboard.songs.find((song) => song.songId === page.song.id) ?? null;

  return (
    <section className="grid gap-5">
      <div className="app-card rounded-[1.75rem] p-5">
        <p className="app-kicker">
          Review and publish
        </p>
        <h2 className="mt-3 text-3xl font-semibold text-[var(--app-text)]">
          {page.song.artistName} • {page.song.title}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--app-muted)]">
          Confirm the imported metadata, fix anything manually, and keep the public
          song page locked to released tracks only.
        </p>
      </div>

      <SongEditorForm page={page} performance={performance} />
    </section>
  );
}
