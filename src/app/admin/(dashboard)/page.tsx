import Image from "next/image";
import Link from "next/link";

import { DeleteSongButton } from "@/components/admin/delete-song-button";
import { StatusPill } from "@/components/admin/status-pill";
import { Button } from "@/components/ui/button";
import { getDashboardSnapshot } from "@/lib/data";
import { formatDateTime } from "@/lib/utils";

export default async function AdminOverviewPage() {
  const snapshot = await getDashboardSnapshot();

  return (
    <div className="grid gap-5">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Songs", value: snapshot.totalSongs },
          { label: "Published", value: snapshot.publishedSongs },
          { label: "Drafts", value: snapshot.draftSongs },
          { label: "Visits", value: snapshot.totalVisits },
          { label: "Clicks", value: snapshot.totalClicks },
        ].map((card) => (
          <div
            key={card.label}
            className="app-card-soft rounded-[1.5rem] p-5"
          >
            <div className="app-kicker">
              {card.label}
            </div>
            <div className="mt-3 text-3xl font-semibold text-[var(--app-text)]">
              {card.value}
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="app-card rounded-[1.75rem] p-5">
          <div className="app-kicker">
            Workflow
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-[var(--app-text)]">
            Import, review, publish, share
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              "Import one Spotify track URL.",
              "Fix links, title, slug, or artwork on the review screen.",
              "Publish and use the live URL in ads or bio links.",
            ].map((step) => (
              <div
                key={step}
                className="app-card-soft rounded-[1.2rem] px-4 py-4 text-sm leading-7 text-[var(--app-muted)]"
              >
                {step}
              </div>
            ))}
          </div>
        </div>

        <div className="app-card rounded-[1.75rem] p-5">
          <div className="app-kicker">
            Quick start
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-[var(--app-text)]">
            Build the next live page
          </h2>
          <p className="mt-3 text-sm leading-7 text-[var(--app-muted)]">
            Start from a Spotify URL, then review the generated page before it goes
            live to fans.
          </p>
          <Link href="/admin/songs/new" className="mt-5 inline-flex">
            <Button>Import a Spotify track</Button>
          </Link>
        </div>
      </section>

      <section className="app-card rounded-[1.75rem] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-[var(--app-text)]">Song pages</h2>
            <p className="mt-1 text-sm text-[var(--app-muted)]">
              Draft, edit, publish, or unpublish any released-song page.
            </p>
          </div>
          <Link href="/admin/songs/new">
            <Button>Import a Spotify track</Button>
          </Link>
        </div>

        <div className="mt-5 grid gap-3">
          {snapshot.songs.length === 0 ? (
            <div className="rounded-[1.25rem] border border-dashed border-[var(--app-line)] px-4 py-10 text-center text-sm text-[var(--app-muted)]">
              No songs yet. Import your first Spotify release to generate a draft.
            </div>
          ) : (
            snapshot.songs.map((song) => (
              <div
                key={song.songId}
                className="grid gap-4 rounded-[1.25rem] border border-[var(--app-line)] bg-white/84 p-4 shadow-[0_8px_18px_rgba(73,93,79,0.04)] sm:grid-cols-[72px_minmax(0,1fr)_auto]"
              >
                <Image
                  src={song.artworkUrl}
                  alt=""
                  width={72}
                  height={72}
                  className="h-[72px] w-[72px] rounded-[1rem] object-cover"
                  unoptimized={song.artworkUrl.startsWith("data:")}
                />
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-lg font-semibold text-[var(--app-text)]">{song.title}</div>
                    <StatusPill status={song.status} />
                  </div>
                  <div className="text-sm text-[var(--app-muted)]">{song.artistName}</div>
                  <div className="mt-2 text-sm text-[var(--app-muted)]">/{song.slug}</div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-[var(--app-muted-2)]">
                    <span>{song.visitCount} visits</span>
                    <span>{song.clickCount} clicks</span>
                    <span>Updated {formatDateTime(song.updatedAt)}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  <Link href={`/admin/songs/${song.songId}`}>
                    <Button tone="secondary">Edit</Button>
                  </Link>
                  <Link href={`/admin/preview/${song.songId}`} className="text-sm text-[var(--app-muted)]">
                    Open preview
                  </Link>
                  {song.status === "published" ? (
                    <Link href={`/${song.slug}`} className="text-sm text-[var(--app-text)]">
                      Open live page
                    </Link>
                  ) : null}
                  <DeleteSongButton
                    songId={song.songId}
                    songLabel={`${song.artistName} - ${song.title}`}
                    compact
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
