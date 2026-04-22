import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  ChevronRight,
  Eye,
  Globe2,
  Radio,
  Sparkles,
} from "lucide-react";

import { DeleteSongButton } from "@/components/admin/delete-song-button";
import { StatusPill } from "@/components/admin/status-pill";
import { Button } from "@/components/ui/button";
import { requireUserSession } from "@/lib/auth";
import { getDashboardSnapshot } from "@/lib/data";
import { buildPublicSongPath, formatDateTime } from "@/lib/utils";

function ctr(clicks: number, visits: number) {
  if (visits <= 0) {
    return "—";
  }

  return `${Math.round((clicks / visits) * 100)}%`;
}

export default async function AdminOverviewPage() {
  const session = await requireUserSession();
  const snapshot = await getDashboardSnapshot(session.userId);
  const liveRate =
    snapshot.totalSongs > 0
      ? `${Math.round((snapshot.publishedSongs / snapshot.totalSongs) * 100)}% live`
      : "No pages yet";

  return (
    <div className="grid gap-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="app-kicker text-[var(--app-muted)]">Overview</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-[var(--app-text)] sm:text-5xl">
            Songs
          </h1>
          <p className="mt-3 text-sm leading-7 text-[var(--app-muted)] sm:text-base">
            Manage released-song pages, publish live links, and keep first-party
            performance visible in one workspace.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/admin/songs/new">
            <Button className="shadow-none">
              <Sparkles className="h-4 w-4" />
              Import song
            </Button>
          </Link>
          <Link href="/admin/analytics">
            <Button tone="secondary" className="shadow-none">
              <BarChart3 className="h-4 w-4" />
              View analytics
            </Button>
          </Link>
        </div>
      </section>

      <section className="app-card overflow-hidden rounded-[1.6rem]">
        <div className="grid gap-px bg-[var(--app-line)] sm:grid-cols-2 xl:grid-cols-5">
          {[
            {
              label: "Song pages",
              value: snapshot.totalSongs,
              note: liveRate,
              icon: Sparkles,
            },
            {
              label: "Published",
              value: snapshot.publishedSongs,
              note: "Live pages open to fans",
              icon: Radio,
            },
            {
              label: "Drafts",
              value: snapshot.draftSongs,
              note: "Still in private review",
              icon: Eye,
            },
            {
              label: "Visits",
              value: snapshot.totalVisits,
              note: "First-party landing views",
              icon: Globe2,
            },
            {
              label: "Clicks",
              value: snapshot.totalClicks,
              note: "Tracked service exits",
              icon: BarChart3,
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="flex min-h-[152px] flex-col justify-between bg-white p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="app-kicker text-[var(--app-muted)]">{card.label}</p>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--app-line)] bg-[var(--app-panel-muted)] text-[var(--app-text)]">
                    <Icon className="h-4 w-4" />
                  </span>
                </div>

                <div>
                  <div className="text-3xl font-semibold tracking-[-0.04em] text-[var(--app-text)]">
                    {card.value}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">
                    {card.note}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="app-card rounded-[1.6rem] p-5 sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="app-kicker text-[var(--app-muted)]">Library</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--app-text)]">
              Live and draft pages
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--app-muted)]">
              Open a draft, preview the public page, jump to the live link, or remove
              a release that should no longer exist.
            </p>
          </div>

          <Link href="/admin/songs/new">
            <Button className="shadow-none">Import song</Button>
          </Link>
        </div>

        <div className="mt-6">
          {snapshot.songs.length === 0 ? (
            <div className="rounded-[1.4rem] border border-dashed border-[var(--app-line)] px-4 py-12 text-center text-sm text-[var(--app-muted)]">
              No songs yet. Import your first Spotify release to generate a draft.
            </div>
          ) : (
            <div className="overflow-hidden rounded-[1.4rem] border border-[var(--app-line)]">
              <div className="hidden grid-cols-[minmax(0,2.15fr)_120px_100px_100px_100px_240px] gap-4 bg-[var(--app-panel-muted)] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--app-muted)] lg:grid">
                <span>Release</span>
                <span>Status</span>
                <span>Visits</span>
                <span>Clicks</span>
                <span>CTR</span>
                <span>Actions</span>
              </div>

              <div className="divide-y divide-[var(--app-line)]">
                {snapshot.songs.map((song) => (
                  <div
                    key={song.songId}
                    className="grid gap-4 bg-white px-4 py-4 transition-colors hover:bg-[#fcfbf8] lg:grid-cols-[minmax(0,2.15fr)_120px_100px_100px_100px_240px] lg:items-center lg:px-5"
                  >
                    <div className="flex min-w-0 gap-4">
                      <Image
                        src={song.artworkUrl}
                        alt=""
                        width={72}
                        height={72}
                        className="h-[72px] w-[72px] rounded-[1rem] object-cover"
                        unoptimized={song.artworkUrl.startsWith("data:")}
                      />
                      <div className="min-w-0">
                        <div className="truncate text-lg font-semibold text-[var(--app-text)]">
                          {song.title}
                        </div>
                        <div className="text-sm text-[var(--app-muted)]">{song.artistName}</div>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.18em] text-[var(--app-muted)]">
                          <span>/{song.slug}</span>
                          <span>@{song.username}</span>
                          <span>Updated {formatDateTime(song.updatedAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 lg:block">
                      <span className="app-kicker text-[var(--app-muted)] lg:hidden">Status</span>
                      <StatusPill status={song.status} />
                    </div>

                    <div className="flex items-center justify-between gap-3 text-sm text-[var(--app-text)] lg:block">
                      <span className="app-kicker text-[var(--app-muted)] lg:hidden">Visits</span>
                      <span>{song.visitCount}</span>
                    </div>

                    <div className="flex items-center justify-between gap-3 text-sm text-[var(--app-text)] lg:block">
                      <span className="app-kicker text-[var(--app-muted)] lg:hidden">Clicks</span>
                      <span>{song.clickCount}</span>
                    </div>

                    <div className="flex items-center justify-between gap-3 text-sm text-[var(--app-text)] lg:block">
                      <span className="app-kicker text-[var(--app-muted)] lg:hidden">CTR</span>
                      <span>{ctr(song.clickCount, song.visitCount)}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <Link href={`/admin/songs/${song.songId}`}>
                        <Button tone="secondary">
                          Edit
                        </Button>
                      </Link>
                      <Link href={`/admin/preview/${song.songId}`}>
                        <Button tone="secondary">
                          <Eye className="h-4 w-4" />
                          Preview
                        </Button>
                      </Link>
                      {song.status === "published" ? (
                        <Link href={buildPublicSongPath(song.username, song.slug)}>
                          <Button tone="secondary">
                            <ArrowUpRight className="h-4 w-4" />
                            Live
                          </Button>
                        </Link>
                      ) : null}
                      <DeleteSongButton
                        songId={song.songId}
                        songLabel={`${song.artistName} - ${song.title}`}
                        compact
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {snapshot.songs.length > 0 ? (
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="app-card rounded-[1.6rem] p-5 sm:p-6">
            <p className="app-kicker text-[var(--app-muted)]">Workflow</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--app-text)]">
              Keep the release flow simple
            </h2>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {[
                "Import from one Spotify URL.",
                "Review destinations and artwork.",
                "Publish when the page is ready.",
              ].map((line, index) => (
                <div key={line} className="rounded-[1.2rem] border border-[var(--app-line)] bg-white px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-[var(--app-text)]">
                      0{index + 1}
                    </span>
                    <ChevronRight className="h-4 w-4 text-[var(--app-muted)]" />
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[var(--app-muted)]">{line}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="app-card rounded-[1.6rem] p-5 sm:p-6">
            <p className="app-kicker text-[var(--app-muted)]">Current state</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--app-text)]">
              Quick read
            </h2>
            <div className="mt-5 space-y-3">
              {[
                `${snapshot.publishedSongs} published pages`,
                `${snapshot.draftSongs} drafts still in review`,
                `${snapshot.totalVisits} visits and ${snapshot.totalClicks} clicks recorded`,
              ].map((line) => (
                <div key={line} className="rounded-[1rem] border border-[var(--app-line)] bg-white px-4 py-3 text-sm text-[var(--app-text)]">
                  {line}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
