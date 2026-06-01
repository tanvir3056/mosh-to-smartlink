/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { ComponentType } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Edit3,
  ExternalLink,
  Eye,
  Globe2,
  MousePointer2,
  Music2,
  Sparkles,
} from "lucide-react";

import { DeleteSongButton } from "@/components/admin/delete-song-button";
import { StatusPill } from "@/components/admin/status-pill";
import { Button } from "@/components/ui/button";
import { requireUserSession } from "@/lib/auth";
import { SERVICE_LABELS } from "@/lib/constants";
import { getDashboardSnapshot } from "@/lib/data";
import type { DashboardSnapshot } from "@/lib/types";
import { buildPublicSongPath, cn, formatDateTime } from "@/lib/utils";

type OverviewStatusFilter = "all" | "published" | "draft";

const releaseFilters: Array<{
  value: OverviewStatusFilter;
  label: string;
  href: string;
}> = [
  { value: "all", label: "All", href: "/admin" },
  { value: "published", label: "Published", href: "/admin?status=published" },
  { value: "draft", label: "Drafts", href: "/admin?status=draft" },
];

function parseStatusFilter(
  value: string | string[] | undefined,
): OverviewStatusFilter {
  const normalized = Array.isArray(value) ? value[0] : value;

  if (normalized === "published" || normalized === "draft") {
    return normalized;
  }

  return "all";
}

function ctr(clicks: number, visits: number) {
  if (visits <= 0) {
    return "—";
  }

  return `${Math.round((clicks / visits) * 100)}%`;
}

function formatDelta(value: number) {
  return `${Math.round(Math.abs(value) * 100)}%`;
}

function MetricCard({
  label,
  value,
  note,
  delta,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string | number;
  note: string;
  delta?: number | null;
  icon: ComponentType<{ className?: string }>;
  accent?: boolean;
}) {
  const hasDelta = typeof delta === "number";
  const deltaIsPositive = hasDelta ? delta >= 0 : false;
  const DeltaIcon = deltaIsPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <section className="app-card flex min-h-[132px] flex-col justify-between rounded-[var(--r-lg)] p-[18px]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-[550] text-[var(--app-muted)]">{label}</p>
        <span
          className={`inline-flex h-7 w-7 items-center justify-center rounded-[var(--r-sm)] ${
            accent
              ? "bg-[var(--app-accent-soft)] text-[var(--app-accent-text)]"
              : "bg-[var(--app-panel-muted)] text-[var(--app-muted-2)]"
          }`}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div>
        <div className="flex flex-wrap items-baseline gap-2.5">
          <div className="font-[var(--font-display)] text-[30px] font-semibold leading-none tracking-[-0.02em] text-[var(--app-text)]">
            {value}
          </div>
          {hasDelta ? (
            <span
              aria-label={`${label} ${deltaIsPositive ? "increased" : "decreased"} by ${formatDelta(delta)}`}
              className={`inline-flex h-5 items-center gap-1 rounded-[var(--r-full)] border px-1.5 text-[11.5px] font-[550] leading-none ${
                deltaIsPositive
                  ? "border-[var(--app-green-line)] bg-[var(--app-green-soft)] text-[var(--app-green-text)]"
                  : "border-[var(--app-red-line)] bg-[var(--app-red-soft)] text-[var(--app-red-text)]"
              }`}
            >
              <DeltaIcon className="h-3 w-3" />
              {formatDelta(delta)}
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-[12.5px] text-[var(--app-muted-2)]">{note}</p>
      </div>
    </section>
  );
}

function SummaryChip({
  icon: Icon,
  value,
  label,
  tone = "text-[var(--app-muted-2)]",
}: {
  icon: ComponentType<{ className?: string }>;
  value: string | number;
  label: string;
  tone?: string;
}) {
  return (
    <span className="inline-flex h-[30px] items-center gap-[7px] rounded-[var(--r-full)] border border-[var(--app-line)] bg-[var(--app-panel)] px-[11px] text-[13px] shadow-[var(--sh-xs)]">
      <Icon className={`h-3.5 w-3.5 ${tone}`} />
      <strong className="font-[650] text-[var(--app-text)]">{value}</strong>
      <span className="text-[var(--app-muted-2)]">{label}</span>
    </span>
  );
}

function rowActionClass(className?: string) {
  return cn(
    "app-interactive inline-flex h-8 min-h-8 items-center justify-center gap-1.5 rounded-[var(--r-sm)] border border-transparent px-2 text-sm font-[550] text-[var(--app-muted)] transition hover:bg-[var(--app-panel-muted)] hover:text-[var(--app-text)]",
    className,
  );
}

function buildSparklinePath(values: number[], width: number, height: number, padding: number) {
  if (values.length === 0) {
    return "";
  }

  const max = Math.max(...values, 1);

  return values
    .map((value, index) => {
      const x =
        values.length === 1
          ? width / 2
          : padding + (index * (width - padding * 2)) / (values.length - 1);
      const y = height - padding - (value / max) * (height - padding * 2);

      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function Sparkline({ values }: { values: number[] }) {
  const width = 110;
  const height = 28;
  const padding = 3;
  const path = buildSparklinePath(values, width, height, padding);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Visits trend over the last 30 days"
      className="h-7 w-[110px]"
    >
      <path
        d={path}
        fill="none"
        stroke="var(--app-accent)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
    </svg>
  );
}

function QuickReadRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] text-[var(--app-muted)]">{label}</span>
      <span className="text-right text-[13.5px] font-semibold text-[var(--app-text)]">
        {children}
      </span>
    </div>
  );
}

function topServiceLabel(snapshot: DashboardSnapshot) {
  if (!snapshot.topService || snapshot.totalClicks <= 0) {
    return "—";
  }

  const share = Math.round((snapshot.topService.clicks / snapshot.totalClicks) * 100);
  return `${SERVICE_LABELS[snapshot.topService.service]} · ${share}%`;
}

function topReleaseByPerformance(songs: DashboardSnapshot["songs"]) {
  return [...songs].sort((left, right) => {
    const visitDifference = right.visitCount - left.visitCount;

    if (visitDifference !== 0) {
      return visitDifference;
    }

    const clickDifference = right.clickCount - left.clickCount;

    if (clickDifference !== 0) {
      return clickDifference;
    }

    return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
  })[0];
}

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] | undefined }>;
}) {
  const session = await requireUserSession();
  const resolvedSearchParams = await searchParams;
  const activeFilter = parseStatusFilter(resolvedSearchParams.status);
  const snapshot = await getDashboardSnapshot(session.userId);
  const publishedSongs = snapshot.songs.filter((song) => song.status === "published");
  const draftSongs = snapshot.songs.filter((song) => song.status === "draft");
  const topRelease = topReleaseByPerformance(publishedSongs);
  const visibleSongs =
    activeFilter === "all"
      ? snapshot.songs
      : snapshot.songs.filter((song) => song.status === activeFilter);
  const liveRate =
    snapshot.totalSongs > 0
      ? `${Math.round((snapshot.publishedSongs / snapshot.totalSongs) * 100)}% live`
      : "No pages yet";
  const firstSongId = snapshot.songs[0]?.songId;
  const firstDraftSongId = draftSongs[0]?.songId;
  const reviewHref = firstDraftSongId
    ? `/admin/songs/${firstDraftSongId}`
    : firstSongId
      ? `/admin/songs/${firstSongId}`
      : "/admin/songs/new";
  const reviewCta = firstSongId ? "Open a draft" : "Start with import";
  const emptyTitle =
    activeFilter === "published"
      ? "No published releases yet"
      : activeFilter === "draft"
        ? "No drafts in review"
        : "No releases here yet";
  const emptyBody =
    activeFilter === "published"
      ? "Publish a reviewed draft and it will appear in this view."
      : activeFilter === "draft"
        ? "Drafts appear here while they are waiting for final review."
        : "Paste a Spotify link and Backstage builds a clean release page with every streaming service in one place.";

  return (
    <div className="app-enter mx-auto grid w-full max-w-[1180px] gap-[30px]">
      <header className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="font-[var(--font-display)] text-[25px] font-semibold tracking-[-0.022em]">
            Welcome back, {session.username}
          </h1>
          <p className="mt-1.5 max-w-[620px] text-[14.5px] leading-6 text-[var(--app-muted)]">
            Your release workspace. Import a song, fine-tune its link, and publish
            when you&apos;re ready.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/admin/analytics">
            <Button tone="secondary">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Button>
          </Link>
          <Link href="/admin/songs/new">
            <Button>
              <Sparkles className="h-4 w-4" />
              Import song
            </Button>
          </Link>
        </div>
      </header>

      <div className="flex flex-wrap gap-2.5">
        <SummaryChip
          icon={CheckCircle2}
          value={snapshot.publishedSongs}
          label="published"
          tone="text-[var(--app-green)]"
        />
        <SummaryChip
          icon={Edit3}
          value={snapshot.draftSongs}
          label="drafts"
          tone="text-[var(--app-amber)]"
        />
        <SummaryChip
          icon={Eye}
          value={snapshot.totalVisits}
          label="visits"
          tone="text-[var(--app-accent)]"
        />
        <SummaryChip icon={Sparkles} value={`@${session.username}`} label="" />
      </div>

      <section className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Song pages"
          value={snapshot.totalSongs}
          note={liveRate}
          icon={Music2}
          accent
        />
        <MetricCard
          label="Published"
          value={snapshot.publishedSongs}
          note="Live & reachable"
          icon={CheckCircle2}
        />
        <MetricCard
          label="Drafts"
          value={snapshot.draftSongs}
          note="Not yet public"
          icon={Edit3}
        />
        <MetricCard
          label="Visits · 30d"
          value={snapshot.totalVisits.toLocaleString()}
          note="First-party landing views"
          delta={snapshot.comparison.totalVisitsDeltaRate}
          icon={Eye}
        />
        <MetricCard
          label="Service clicks · 30d"
          value={snapshot.totalClicks.toLocaleString()}
          note="Tracked service exits"
          delta={snapshot.comparison.totalClicksDeltaRate}
          icon={MousePointer2}
        />
      </section>

      <section>
        <div className="mb-3.5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[17px] font-semibold">Release library</h2>
            <p className="mt-0.5 text-[13px] text-[var(--app-muted-2)]">
              Every smart link in your workspace.
            </p>
          </div>
          <nav
            aria-label="Release filters"
            className="inline-flex gap-0.5 rounded-[var(--r-sm)] border border-[var(--app-line)] bg-[var(--app-soft)] p-[3px]"
          >
            {releaseFilters.map((filter) => {
              const isActive = filter.value === activeFilter;

              return (
                <Link
                  key={filter.value}
                  href={filter.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "inline-flex h-8 items-center rounded-[var(--r-xs)] px-3 text-[13px] font-semibold transition-colors",
                    isActive
                      ? "bg-[var(--app-panel)] text-[var(--app-text)] shadow-[var(--sh-sm)]"
                      : "text-[var(--app-muted)] hover:bg-[var(--app-panel)] hover:text-[var(--app-text)]",
                  )}
                >
                  {filter.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="app-card overflow-hidden rounded-[var(--r-lg)] p-0">
          {visibleSongs.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <span className="mb-3 flex h-13 w-13 items-center justify-center rounded-[var(--r-lg)] border border-[var(--app-line)] bg-[var(--app-panel-muted)] text-[var(--app-muted-2)]">
                <Music2 className="h-6 w-6" />
              </span>
              <h3 className="text-[15.5px] font-semibold">{emptyTitle}</h3>
              <p className="mt-1 max-w-sm text-[13.5px] leading-6 text-[var(--app-muted)]">
                {emptyBody}
              </p>
              {snapshot.songs.length === 0 ? (
                <Link href="/admin/songs/new" className="mt-4">
                  <Button>
                    <Sparkles className="h-4 w-4" />
                    Import your first song
                  </Button>
                </Link>
              ) : (
                <Link href="/admin" className="mt-4">
                  <Button tone="secondary">View all releases</Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="hidden grid-cols-[1fr_116px_92px_92px_168px] gap-3.5 bg-[var(--app-panel-muted)] px-4 py-3 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[var(--app-muted-2)] lg:grid">
                <span>Release</span>
                <span>Status</span>
                <span>Visits</span>
                <span>Clicks</span>
                <span className="text-right">Actions</span>
              </div>
              <div className="divide-y divide-[var(--app-line)]">
                {visibleSongs.map((song) => (
                  <div
                    key={song.songId}
                    className="grid gap-3.5 px-4 py-3 transition-colors hover:bg-[var(--app-panel-muted)] lg:grid-cols-[1fr_116px_92px_92px_168px] lg:items-center"
                  >
                    <Link
                      href={`/admin/songs/${song.songId}`}
                      className="flex min-w-0 items-center gap-3"
                    >
                      <img
                        src={song.artworkUrl}
                        alt={`${song.artistName} - ${song.title} artwork`}
                        className="h-[42px] w-[42px] shrink-0 rounded-[9px] object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="min-w-0">
                        <div className="truncate text-[14.5px] font-semibold text-[var(--app-text)]">
                          {song.title}
                        </div>
                        <div className="truncate font-mono text-xs text-[var(--app-muted-2)]">
                          <span>{buildPublicSongPath(song.username, song.slug)}</span>
                          <span> · Updated {formatDateTime(song.updatedAt)}</span>
                        </div>
                      </div>
                    </Link>
                    <div className="flex items-center justify-between gap-3 lg:block">
                      <span className="app-kicker text-[var(--app-muted-2)] lg:hidden">
                        Status
                      </span>
                      <StatusPill status={song.status} />
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm text-[var(--app-text)] lg:block">
                      <span className="app-kicker text-[var(--app-muted-2)] lg:hidden">
                        Visits
                      </span>
                      <span>{song.visitCount || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm text-[var(--app-text)] lg:block">
                      <span className="app-kicker text-[var(--app-muted-2)] lg:hidden">
                        Clicks
                      </span>
                      <span>{song.clickCount || "—"}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 lg:justify-end">
                      <Link
                        href={`/admin/songs/${song.songId}`}
                        aria-label={`Edit ${song.title}`}
                        className={rowActionClass()}
                        title="Edit"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Link>
                      <a
                        href={`/admin/preview/${song.songId}`}
                        aria-label={`Preview ${song.title}`}
                        className={rowActionClass()}
                        title="Preview"
                      >
                        <Eye className="h-4 w-4" />
                      </a>
                      {song.status === "published" ? (
                        <Link
                          href={buildPublicSongPath(song.username, song.slug)}
                          aria-label={`Open live page for ${song.title}`}
                          className={rowActionClass()}
                          title="Open live page"
                        >
                          <ExternalLink className="h-4 w-4" />
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
            </>
          )}
        </div>
      </section>

      <section className="grid items-start gap-5 xl:grid-cols-[1.6fr_1fr]">
        <div>
          <h2 className="mb-1 text-[17px] font-semibold">How a release comes together</h2>
          <p className="mb-4 text-[13px] text-[var(--app-muted-2)]">
            Three steps from import to a live, shareable link.
          </p>
          <div className="grid gap-3.5 md:grid-cols-3">
            {[
              {
                step: "1",
                icon: Sparkles,
                title: "Import",
                desc: "Paste a Spotify URL — we pull artwork, metadata and matching services.",
                href: "/admin/songs/new",
                cta: "Import a song",
                done: true,
              },
              {
                step: "2",
                icon: Edit3,
                title: "Review",
                desc: "Confirm links, set your slug and tune the page before it goes live.",
                href: reviewHref,
                cta: reviewCta,
              },
              {
                step: "3",
                icon: Globe2,
                title: "Publish",
                desc: "Flip it live and share one link that works everywhere.",
                href: "/admin/analytics",
                cta: "See analytics",
              },
            ].map((item) => {
              const Icon = item.done ? CheckCircle2 : item.icon;

              return (
                <div
                  key={item.title}
                  className="app-card flex flex-col overflow-hidden rounded-[var(--r-lg)] p-0"
                >
                  <div className="flex flex-1 flex-col p-[18px]">
                    <div className="mb-3 flex items-center justify-between">
                      <span className={`flex h-9 w-9 items-center justify-center rounded-[9px] ${item.done ? "bg-[var(--app-green-soft)] text-[var(--app-green-text)]" : "bg-[var(--app-accent-soft)] text-[var(--app-accent-text)]"}`}>
                        <Icon className="h-4.5 w-4.5" />
                      </span>
                      <span className="font-mono text-xs font-semibold text-[var(--app-muted-2)]">
                        STEP {item.step}
                      </span>
                    </div>
                    <h3 className="text-[15px] font-semibold">{item.title}</h3>
                    <p className="mt-1 text-[13px] leading-5 text-[var(--app-muted)]">
                      {item.desc}
                    </p>
                  </div>
                  <div className="px-[18px] pb-4">
                    <Link href={item.href}>
                      <Button tone="subtle" className="h-8 min-h-8 px-3">
                        {item.cta}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <section className="app-card rounded-[var(--r-lg)] bg-[linear-gradient(165deg,var(--app-accent-soft),var(--app-panel)_75%)] p-[18px]">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--app-accent-text)]" />
            <h3 className="text-[15px] font-semibold">Quick read</h3>
          </div>
          <div className="grid gap-3 text-[13.5px]">
            <QuickReadRow label="Top release">
              {topRelease?.title ?? "—"}
            </QuickReadRow>
            <QuickReadRow label="Avg. click-through">
              {ctr(snapshot.totalClicks, snapshot.totalVisits)}
            </QuickReadRow>
            <QuickReadRow label="Best service">
              {topServiceLabel(snapshot)}
            </QuickReadRow>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13px] text-[var(--app-muted)]">Visits trend</span>
              <Sparkline values={snapshot.daily.map((row) => row.visits)} />
            </div>
          </div>
          <Link href="/admin/analytics" className="mt-5 block">
            <Button tone="secondary" className="w-full justify-center">
              Full analytics
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </section>
      </section>
    </div>
  );
}
