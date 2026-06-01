import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  ArrowUpRight,
  Download,
  Eye,
  Globe2,
  Monitor,
  MousePointer2,
  Music2,
  Radio,
  Sparkles,
  Target,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { requireUserSession } from "@/lib/auth";
import { SERVICE_LABELS } from "@/lib/constants";
import { getAnalyticsSnapshot } from "@/lib/data";
import type { AnalyticsSnapshot } from "@/lib/types";
import { buildPublicSongPath, cn } from "@/lib/utils";

const RANGE_OPTIONS = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
] as const;

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function ratio(value: number, max: number) {
  if (max <= 0) {
    return 0;
  }

  return Math.max(8, Math.round((value / max) * 100));
}

function parseRangeDays(input: string | string[] | undefined) {
  const value = Array.isArray(input) ? input[0] : input;
  const parsed = Number.parseInt(value ?? "30", 10);

  if (parsed === 7 || parsed === 30 || parsed === 90) {
    return parsed;
  }

  return 30;
}

function buildLinePath(values: number[], width: number, height: number, padding: number) {
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

function buildAreaPath(values: number[], width: number, height: number, padding: number) {
  if (values.length === 0) {
    return "";
  }

  const line = buildLinePath(values, width, height, padding);
  const startX = padding;
  const endX = values.length === 1 ? width / 2 : width - padding;
  const baseline = height - padding;

  return `${line} L${endX.toFixed(2)} ${baseline.toFixed(2)} L${startX.toFixed(2)} ${baseline.toFixed(2)} Z`;
}

function Panel({
  title,
  sub,
  right,
  icon: Icon,
  children,
}: {
  title: string;
  sub?: string;
  right?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="app-card overflow-hidden rounded-[14px] p-0">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--app-line)] px-[18px] py-[15px]">
        <div className="flex items-center gap-2.5">
          {Icon ? <Icon className="h-4 w-4 text-[var(--app-muted-2)]" /> : null}
          <div>
            <h2 className="text-[14.5px] font-semibold text-[var(--app-text)]">{title}</h2>
            {sub ? (
              <p className="mt-0.5 text-xs text-[var(--app-muted-2)]">{sub}</p>
            ) : null}
          </div>
        </div>
        {right}
      </div>
      <div className="p-[18px]">{children}</div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string | number;
  note?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
}) {
  return (
    <section className="app-card flex min-h-[132px] flex-col justify-between rounded-[14px] p-[18px]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-[550] text-[var(--app-muted)]">{label}</p>
        <span
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-[7px]",
            accent
              ? "bg-[var(--app-accent-soft)] text-[var(--app-accent-text)]"
              : "bg-[var(--app-panel-muted)] text-[var(--app-muted-2)]",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div>
        <div className="font-[var(--font-display)] text-[30px] font-semibold leading-none tracking-[-0.02em] text-[var(--app-text)]">
          {value}
        </div>
        {note ? <p className="mt-2 text-[12.5px] text-[var(--app-muted-2)]">{note}</p> : null}
      </div>
    </section>
  );
}

function RangeSwitcher({ rangeDays }: { rangeDays: number }) {
  return (
    <div className="inline-flex rounded-[7px] border border-[var(--app-line)] bg-[var(--bg-sunken)] p-[3px]">
      {RANGE_OPTIONS.map((option) => {
        const active = option.days === rangeDays;

        if (active) {
          return (
            <span
              key={option.days}
              aria-current="page"
              className="inline-flex h-[30px] items-center justify-center rounded-[5px] bg-[var(--app-panel)] px-[13px] text-[13px] font-semibold text-[var(--app-text)] shadow-[0_1px_2px_oklch(0.2_0.02_270_/_0.06)]"
            >
              {option.label}
            </span>
          );
        }

        return (
          <Link
            key={option.days}
            href={`/admin/analytics?range=${option.days}`}
            className="inline-flex h-[30px] items-center justify-center rounded-[5px] px-[13px] text-[13px] font-semibold text-[var(--app-muted)] transition hover:bg-[var(--app-panel-muted)] hover:text-[var(--app-text)]"
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}

function LineChart({
  visits,
  clicks,
  labels,
}: {
  visits: number[];
  clicks: number[];
  labels: string[];
}) {
  const width = 760;
  const height = 236;
  const padding = 22;
  const max = Math.max(...visits, ...clicks, 1);
  const visitArea = buildAreaPath(visits, width, height, padding);
  const visitLine = buildLinePath(visits, width, height, padding);
  const clickLine = buildLinePath(clicks, width, height, padding);

  const grid = Array.from({ length: 4 }, (_, index) => {
    const y = padding + ((height - padding * 2) / 3) * index;
    return { y, value: Math.round(max - (max / 3) * index) };
  });

  return (
    <div className="overflow-hidden rounded-[10px] border border-[var(--app-line)] bg-[var(--bg-sunken)] p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[236px] w-full" role="img" aria-label="Visits and clicks over time">
        <defs>
          <linearGradient id="analytics-visits-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--app-accent)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--app-accent)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {grid.map((row) => (
          <g key={row.y}>
            <line
              x1={padding}
              x2={width - padding}
              y1={row.y}
              y2={row.y}
              stroke="var(--app-line)"
              strokeDasharray="3 8"
            />
            <text x={padding} y={row.y - 8} fill="var(--app-muted-2)" fontSize="11">
              {row.value}
            </text>
          </g>
        ))}

        <path d={visitArea} fill="url(#analytics-visits-fill)" />
        <path
          d={visitLine}
          fill="none"
          stroke="var(--app-accent)"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={clickLine}
          fill="none"
          stroke="var(--app-green)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {labels.map((label, index) => {
          if (
            index !== 0 &&
            index !== labels.length - 1 &&
            index !== Math.floor((labels.length - 1) / 2)
          ) {
            return null;
          }

          const x =
            labels.length === 1
              ? width / 2
              : padding + (index * (width - padding * 2)) / (labels.length - 1);

          return (
            <text
              key={label}
              x={x}
              y={height - 2}
              fill="var(--app-muted-2)"
              fontSize="11"
              textAnchor={index === 0 ? "start" : index === labels.length - 1 ? "end" : "middle"}
            >
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function Donut({
  value,
  label,
  sub,
}: {
  value: number;
  label: string;
  sub?: string;
}) {
  const normalized = Math.max(0, Math.min(100, value));

  return (
    <div
      className="grid h-[120px] w-[120px] shrink-0 place-items-center rounded-full"
      style={{
        background: `conic-gradient(var(--app-accent) ${normalized}%, var(--app-line) 0)`,
      }}
    >
      <div className="grid h-[88px] w-[88px] place-items-center rounded-full bg-[var(--app-panel)] text-center">
        <div>
          <div className="font-[var(--font-display)] text-[24px] font-semibold tracking-[-0.03em] text-[var(--app-text)]">
            {label}
          </div>
          {sub ? <div className="mt-0.5 text-[11px] text-[var(--app-muted-2)]">{sub}</div> : null}
        </div>
      </div>
    </div>
  );
}

function HBar({
  rows,
  color = "var(--app-accent)",
  emptyLabel,
}: {
  rows: Array<{
    label: string;
    value: number;
    display?: string;
    meta?: string;
    color?: string;
  }>;
  color?: string;
  emptyLabel: string;
}) {
  const max = Math.max(...rows.map((row) => row.value), 0);

  if (rows.length === 0) {
    return <EmptyBlock label={emptyLabel} />;
  }

  return (
    <div className="grid gap-3">
      {rows.map((row) => (
        <div key={row.label} className="rounded-[10px] border border-[var(--app-line)] bg-[var(--app-panel)] px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="truncate text-[13.5px] font-semibold text-[var(--app-text)]">
                {row.label}
              </div>
              {row.meta ? (
                <div className="mt-1 truncate text-xs text-[var(--app-muted-2)]">{row.meta}</div>
              ) : null}
            </div>
            <div className="text-right text-[13px] font-semibold text-[var(--app-text)]">
              {row.display ?? row.value.toLocaleString()}
            </div>
          </div>
          <div className="mt-3 h-2 rounded-full bg-[var(--app-panel-muted)]">
            <div
              className="h-2 rounded-full"
              style={{ width: `${ratio(row.value, max)}%`, background: row.color ?? color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyBlock({ label }: { label: string }) {
  return (
    <div className="rounded-[10px] border border-dashed border-[var(--app-line)] bg-[var(--app-panel-muted)] px-4 py-8 text-center text-sm text-[var(--app-muted)]">
      {label}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[var(--app-muted)]">
      <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />
      {label}
    </span>
  );
}

function Signal({
  tone,
  icon: Icon,
  title,
  desc,
}: {
  tone: "green" | "amber" | "accent";
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  const toneClasses = {
    green: "bg-[var(--app-green-soft)] text-[var(--app-green-text)]",
    amber: "bg-[var(--app-amber-soft)] text-[var(--app-amber-text)]",
    accent: "bg-[var(--app-accent-soft)] text-[var(--app-accent-text)]",
  };

  return (
    <div className="flex gap-2.5">
      <span className={cn("inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px]", toneClasses[tone])}>
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <div className="text-[13px] font-semibold text-[var(--app-text)]">{title}</div>
        <p className="mt-0.5 text-[12.5px] leading-5 text-[var(--app-muted)]">{desc}</p>
      </div>
    </div>
  );
}

function buildSignalRows(analytics: AnalyticsSnapshot) {
  const topReferrer = analytics.referrers[0];
  const topService = analytics.serviceBreakdown[0];
  const topGeo = analytics.geos[0];

  return [
    {
      tone: "green" as const,
      icon: ArrowUpRight,
      title: topReferrer
        ? `${topReferrer.label} is leading traffic`
        : "Traffic signals are waiting",
      desc: topReferrer
        ? `${topReferrer.visits} visits with ${formatPercent(topReferrer.ctr)} click-through.`
        : "Share a published link to start collecting source data.",
    },
    {
      tone: analytics.clickThroughRate > 0 ? ("accent" as const) : ("amber" as const),
      icon: Target,
      title: `${formatPercent(analytics.clickThroughRate)} click-through rate`,
      desc:
        analytics.totalVisits > 0
          ? `${analytics.totalClicks} outbound clicks from ${analytics.totalVisits} visits.`
          : "Clicks will appear here once visitors choose a streaming service.",
    },
    {
      tone: "accent" as const,
      icon: Sparkles,
      title: topService
        ? `${SERVICE_LABELS[topService.service]} is the top service`
        : topGeo
          ? `${topGeo.country} is showing up`
          : "No top destination yet",
      desc: topService
        ? `${topService.clicks} service clicks in this range.`
        : topGeo
          ? `${topGeo.visits} visits from ${topGeo.city !== "Unknown" ? `${topGeo.city}, ` : ""}${topGeo.country}.`
          : "Publish and share a release to build the first signal.",
    },
  ];
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const rangeDays = parseRangeDays(params.range);
  const session = await requireUserSession();
  const analytics = await getAnalyticsSnapshot(session.userId, rangeDays);

  const topService = analytics.serviceBreakdown[0];
  const bestDay = [...analytics.daily].sort((left, right) => right.visits - left.visits)[0];
  const visitSeries = analytics.daily.map((entry) => entry.visits);
  const clickSeries = analytics.daily.map((entry) => entry.clicks);
  const trendLabels = analytics.daily.map((entry) => format(parseISO(entry.date), "MMM d"));
  const repeatVisitRate =
    analytics.totalVisits > 0
      ? Math.max(0, (analytics.totalVisits - analytics.uniqueVisitors) / analytics.totalVisits)
      : 0;
  const emailLeadRate = 0;
  const bounceEstimate = Math.max(0, 1 - analytics.clickThroughRate - emailLeadRate);

  return (
    <div className="app-enter mx-auto w-full max-w-[1180px] pb-20">
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-[var(--font-display)] text-[25px] font-semibold tracking-[-0.022em] text-[var(--app-text)]">
              Analytics
            </h1>
          </div>
          <p className="mt-1.5 max-w-[620px] text-[14.5px] leading-6 text-[var(--app-muted)]">
            How fans find and move through your release links.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <RangeSwitcher rangeDays={rangeDays} />
          <Button type="button" tone="secondary" disabled title="Export is not connected yet">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </header>

      <div className="mb-[22px] grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Visits"
          value={formatCount(analytics.totalVisits)}
          note={`${rangeDays}-day landing views`}
          icon={Eye}
          accent
        />
        <MetricCard
          label="Unique visitors"
          value={formatCount(analytics.uniqueVisitors)}
          note={`${formatPercent(
            analytics.totalVisits > 0 ? analytics.uniqueVisitors / analytics.totalVisits : 0,
          )} of total visits`}
          icon={Users}
        />
        <MetricCard
          label="Service clicks"
          value={formatCount(analytics.totalClicks)}
          note={topService ? `${SERVICE_LABELS[topService.service]} leads` : "No service data yet"}
          icon={MousePointer2}
        />
        <MetricCard
          label="Click-through rate"
          value={formatPercent(analytics.clickThroughRate)}
          note={`${formatPercent(repeatVisitRate)} repeat visits`}
          icon={Target}
        />
      </div>

      <section className="mb-4 grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <Panel
          title="Traffic trend"
          sub={`Visits over the last ${rangeDays} days`}
          icon={Radio}
          right={
            <div className="flex gap-3">
              <Legend color="var(--app-accent)" label="Visits" />
              <Legend color="var(--app-green)" label="Clicks" />
            </div>
          }
        >
          <LineChart visits={visitSeries} clicks={clickSeries} labels={trendLabels} />
        </Panel>

        <Panel title="Signal" sub="What changed this period" icon={Sparkles}>
          <div className="grid gap-3">
            {buildSignalRows(analytics).map((signal) => (
              <Signal
                key={signal.title}
                tone={signal.tone}
                icon={signal.icon}
                title={signal.title}
                desc={signal.desc}
              />
            ))}
          </div>
          <div className="mt-4 rounded-[10px] border border-[var(--app-line)] bg-[var(--app-panel-muted)] px-4 py-3 text-[12.5px] leading-5 text-[var(--app-muted)]">
            {bestDay
              ? `Best day: ${format(parseISO(bestDay.date), "MMM d")} with ${bestDay.visits} visits.`
              : "No trend data yet."}
          </div>
        </Panel>
      </section>

      <section className="mb-4 grid gap-4 lg:grid-cols-[1fr_1.7fr]">
        <Panel title="Conversion quality" sub="Visits that clicked through" icon={Target}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Donut
              value={Math.round(analytics.clickThroughRate * 100)}
              label={formatPercent(analytics.clickThroughRate)}
              sub="CTR"
            />
            <div className="grid flex-1 gap-3">
              {[
                {
                  label: "Clicked a service",
                  value: formatPercent(analytics.clickThroughRate),
                  color: "var(--app-accent)",
                },
                {
                  label: "Joined email list",
                  value: formatPercent(emailLeadRate),
                  color: "var(--app-green)",
                },
                {
                  label: "No outbound action",
                  value: formatPercent(bounceEstimate),
                  color: "var(--app-muted-2)",
                },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-[13px] text-[var(--app-muted)]">
                    <span className="h-2 w-2 rounded-[3px]" style={{ background: row.color }} />
                    {row.label}
                  </span>
                  <span className="font-mono text-[13px] font-semibold text-[var(--app-text)]">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="Streaming services" sub="Where clicks go" icon={MousePointer2}>
          <HBar
            emptyLabel="Service click distribution will appear after the first outbound clicks."
            rows={analytics.serviceBreakdown.map((row) => ({
              label: SERVICE_LABELS[row.service],
              value: row.clicks,
              display: row.clicks.toLocaleString(),
            }))}
          />
        </Panel>
      </section>

      <section className="mb-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Top sources" icon={Globe2}>
          <HBar
            emptyLabel="Referrer data will appear after the first tracked visits."
            color="var(--app-accent)"
            rows={analytics.referrers.map((row) => ({
              label: row.label,
              value: row.visits,
              display: `${row.visits} visits`,
              meta: `${row.clicks} clicks · ${formatPercent(row.ctr)} CTR`,
            }))}
          />
        </Panel>
        <Panel title="Campaigns" sub="utm_campaign" icon={ArrowUpRight}>
          <HBar
            emptyLabel="UTM-tagged campaign traffic will appear here."
            color="oklch(0.6 0.16 320)"
            rows={analytics.utms.map((row) => ({
              label: row.campaign,
              value: row.visits,
              display: `${row.visits} visits`,
              meta: `${row.source} / ${row.medium} · ${row.clicks} clicks`,
            }))}
          />
        </Panel>
        <Panel title="Devices" icon={Monitor}>
          <HBar
            emptyLabel="Device breakdown will appear after tracked visits land."
            color="var(--app-green)"
            rows={analytics.devices.map((row) => ({
              label: row.label,
              value: row.visits,
              display: `${row.visits} visits`,
              meta: `${row.clicks} clicks · ${formatPercent(row.ctr)} CTR`,
            }))}
          />
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
        <Panel title="Locations" sub="Top countries and cities" icon={Globe2}>
          <HBar
            emptyLabel="Geo data will appear where privacy-safe country or city signals are available."
            color="oklch(0.6 0.13 200)"
            rows={analytics.geos.map((row) => ({
              label: row.city !== "Unknown" ? `${row.country} · ${row.city}` : row.country,
              value: row.visits,
              display: `${row.visits} visits`,
              meta: `${row.clicks} clicks · ${formatPercent(row.ctr)} CTR`,
            }))}
          />
        </Panel>

        <Panel title="Per-song performance" sub="Published releases" icon={Music2}>
          {analytics.songs.length > 0 ? (
            <div className="grid gap-0">
              <div className="grid grid-cols-[1fr_76px_76px_56px] gap-3 border-b border-[var(--app-line)] pb-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--app-muted-2)]">
                <span>Release</span>
                <span className="text-right">Visits</span>
                <span className="text-right">Clicks</span>
                <span className="text-right">CTR</span>
              </div>
              {analytics.songs.map((row) => (
                <Link
                  key={row.songId}
                  href={`/admin/songs/${row.songId}`}
                  className="grid grid-cols-[1fr_76px_76px_56px] items-center gap-3 border-b border-[var(--app-line)] py-3 last:border-b-0"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-semibold text-[var(--app-text)]">
                      {row.title}
                    </span>
                    <span className="block truncate font-mono text-xs text-[var(--app-muted-2)]">
                      {buildPublicSongPath(row.username, row.slug)}
                    </span>
                  </span>
                  <span className="text-right font-mono text-[13px] text-[var(--app-text)]">
                    {row.visits.toLocaleString()}
                  </span>
                  <span className="text-right font-mono text-[13px] text-[var(--app-text)]">
                    {row.clicks.toLocaleString()}
                  </span>
                  <span className="text-right font-mono text-[13px] font-semibold text-[var(--app-green-text)]">
                    {formatPercent(row.ctr)}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyBlock label="Song-level performance will appear after traffic starts landing." />
          )}
        </Panel>
      </section>
    </div>
  );
}
