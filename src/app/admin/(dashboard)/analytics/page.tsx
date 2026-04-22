import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  ArrowUpRight,
  Globe2,
  Monitor,
  MousePointer2,
  Radio,
  Users,
} from "lucide-react";

import { requireUserSession } from "@/lib/auth";
import { SERVICE_LABELS } from "@/lib/constants";
import { getAnalyticsSnapshot } from "@/lib/data";
import { buildPublicSongPath } from "@/lib/utils";

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

function TrendChart({
  visits,
  clicks,
  labels,
}: {
  visits: number[];
  clicks: number[];
  labels: string[];
}) {
  const width = 760;
  const height = 260;
  const padding = 24;
  const max = Math.max(...visits, ...clicks, 1);
  const visitArea = buildAreaPath(visits, width, height, padding);
  const visitLine = buildLinePath(visits, width, height, padding);
  const clickLine = buildLinePath(clicks, width, height, padding);

  const grid = Array.from({ length: 4 }, (_, index) => {
    const y = padding + ((height - padding * 2) / 3) * index;
    return { y, value: Math.round(max - (max / 3) * index) };
  });

  return (
    <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-[var(--app-line)] bg-[linear-gradient(180deg,#fdfcf8_0%,#f4f1e9_100%)] p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[16rem] w-full" role="img" aria-label="Visits and outbound clicks over time">
        <defs>
          <linearGradient id="visits-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(63,212,196,0.34)" />
            <stop offset="100%" stopColor="rgba(63,212,196,0.02)" />
          </linearGradient>
        </defs>

        {grid.map((row) => (
          <g key={row.y}>
            <line
              x1={padding}
              x2={width - padding}
              y1={row.y}
              y2={row.y}
              stroke="rgba(21,25,34,0.08)"
              strokeDasharray="3 8"
            />
            <text
              x={padding}
              y={row.y - 8}
              fill="rgba(94,102,116,0.8)"
              fontSize="11"
            >
              {row.value}
            </text>
          </g>
        ))}

        <path d={visitArea} fill="url(#visits-fill)" />
        <path
          d={visitLine}
          fill="none"
          stroke="var(--app-accent-strong)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={clickLine}
          fill="none"
          stroke="#151922"
          strokeWidth="2.6"
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
              fill="rgba(94,102,116,0.9)"
              fontSize="11"
              textAnchor={index === 0 ? "start" : index === labels.length - 1 ? "end" : "middle"}
            >
              {label}
            </text>
          );
        })}
      </svg>

      <div className="mt-4 flex flex-wrap gap-3 text-sm text-[var(--app-muted)]">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--app-accent-strong)]" />
          Visits
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#151922]" />
          Click-throughs
        </span>
      </div>
    </div>
  );
}

function EmptyBlock({ label }: { label: string }) {
  return (
    <div className="rounded-[1.3rem] border border-dashed border-[var(--app-line)] bg-[var(--app-panel-muted)] px-4 py-8 text-center text-sm text-[var(--app-muted)]">
      {label}
    </div>
  );
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
  const topReferrer = analytics.referrers[0];
  const topDevice = analytics.devices[0];
  const topCampaign = analytics.utms[0];
  const bestDay = [...analytics.daily].sort((left, right) => right.visits - left.visits)[0];
  const visitSeries = analytics.daily.map((entry) => entry.visits);
  const clickSeries = analytics.daily.map((entry) => entry.clicks);
  const trendLabels = analytics.daily.map((entry) => format(parseISO(entry.date), "MMM d"));
  const maxServiceClicks = Math.max(...analytics.serviceBreakdown.map((row) => row.clicks), 0);
  const maxSourceVisits = Math.max(...analytics.referrers.map((row) => row.visits), 0);
  const maxDeviceVisits = Math.max(...analytics.devices.map((row) => row.visits), 0);
  const repeatVisitRate =
    analytics.totalVisits > 0
      ? Math.max(0, (analytics.totalVisits - analytics.uniqueVisitors) / analytics.totalVisits)
      : 0;

  return (
    <div className="grid gap-6">
      <section className="app-card rounded-[1.9rem] p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="app-kicker text-[var(--app-muted)]">Analytics</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-[var(--app-text)]">
              Marketing performance that actually helps decisions
            </h1>
            <p className="mt-3 text-sm leading-7 text-[var(--app-muted)]">
              Inspired by music analytics tools that prioritize trends, source quality,
              and audience behavior over vanity numbers. This dashboard stays focused on
              your first-party funnel: landing traffic, outbound clicks, service
              choice, campaign attribution, and device mix.
            </p>
          </div>

          <div className="grid w-full max-w-[18rem] grid-cols-3 rounded-full border border-[var(--app-line)] bg-white/82 p-[4px] shadow-[inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-sm sm:w-auto">
            {RANGE_OPTIONS.map((option) => {
              const active = option.days === rangeDays;

              if (active) {
                return (
                  <span
                    key={option.days}
                    aria-current="page"
                    className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--app-panel-muted)] px-4 text-sm font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]"
                    style={{
                      color: "#151922",
                      WebkitTextFillColor: "#151922",
                    }}
                  >
                    <span
                      style={{
                        color: "#151922",
                        WebkitTextFillColor: "#151922",
                      }}
                    >
                      {option.label}
                    </span>
                  </span>
                );
              }

              return (
                <Link
                  key={option.days}
                  href={`/admin/analytics?range=${option.days}`}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-[var(--app-text)] select-none touch-manipulation transition-[background-color,color] duration-200 ease-out hover:bg-[var(--app-panel-muted)]"
                  style={{
                    color: "#151922",
                    WebkitTextFillColor: "#151922",
                  }}
                >
                  <span
                    style={{
                      color: "#151922",
                      WebkitTextFillColor: "#151922",
                    }}
                  >
                    {option.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-6 grid gap-px overflow-hidden rounded-[1.5rem] border border-[var(--app-line)] bg-[var(--app-line)] md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Page visits",
              value: formatCount(analytics.totalVisits),
              note: `${rangeDays}-day landing-page traffic`,
              icon: Globe2,
            },
            {
              label: "Unique visitors",
              value: formatCount(analytics.uniqueVisitors),
              note: `${formatPercent(
                analytics.totalVisits > 0 ? analytics.uniqueVisitors / analytics.totalVisits : 0,
              )} of visits were first-time sessions`,
              icon: Users,
            },
            {
              label: "Outbound clicks",
              value: formatCount(analytics.totalClicks),
              note: topService
                ? `${SERVICE_LABELS[topService.service]} is leading destination choice`
                : "No service clicks recorded yet",
              icon: MousePointer2,
            },
            {
              label: "CTR",
              value: formatPercent(analytics.clickThroughRate),
              note: `${formatPercent(repeatVisitRate)} repeat-visit rate`,
              icon: ArrowUpRight,
            },
          ].map((card) => {
            const Icon = card.icon;

            return (
              <div key={card.label} className="flex min-h-[152px] flex-col justify-between bg-white p-5">
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

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="app-card rounded-[1.9rem] p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="app-kicker text-[var(--app-muted)]">Trend</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-[var(--app-text)]">
                Visits and click-throughs over time
              </h2>
              <p className="mt-2 text-sm leading-7 text-[var(--app-muted)]">
                Spotify for Artists emphasizes timeline context. This view does the same for
                your smart-link funnel, so you can see whether traffic is translating into
                action over the selected window.
              </p>
            </div>
            <div className="rounded-[1.2rem] border border-[var(--app-line)] bg-white px-4 py-3 text-sm text-[var(--app-muted)]">
              {bestDay
                ? `Best day: ${format(parseISO(bestDay.date), "MMM d")} • ${bestDay.visits} visits`
                : "No trend data yet"}
            </div>
          </div>

          <TrendChart visits={visitSeries} clicks={clickSeries} labels={trendLabels} />
        </div>

        <div className="grid gap-5">
          <section className="app-card rounded-[1.9rem] p-5 sm:p-6">
            <p className="app-kicker text-[var(--app-muted)]">Signal</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-[var(--app-text)]">
              What to pay attention to
            </h2>
            <div className="mt-5 grid gap-3">
              {[
                {
                  label: "Top referrer",
                  value: topReferrer?.label ?? "Direct",
                  note: topReferrer
                    ? `${topReferrer.visits} visits • ${formatPercent(topReferrer.ctr)} CTR`
                    : "No referrer data yet",
                },
                {
                  label: "Top service",
                  value: topService ? SERVICE_LABELS[topService.service] : "No service data",
                  note: topService ? `${topService.clicks} clicks` : "Clicks will appear here",
                },
                {
                  label: "Top device",
                  value: topDevice?.label ?? "Unknown",
                  note: topDevice
                    ? `${topDevice.visits} visits • ${formatPercent(topDevice.ctr)} CTR`
                    : "Device data will appear here",
                },
                {
                  label: "Top campaign",
                  value: topCampaign?.campaign ?? "(none)",
                  note: topCampaign
                    ? `${topCampaign.source} / ${topCampaign.medium} • ${topCampaign.visits} visits`
                    : "Campaign data will appear here",
                },
              ].map((row) => (
                <div key={row.label} className="rounded-[1.25rem] border border-[var(--app-line)] bg-white px-4 py-4">
                  <div className="app-kicker text-[var(--app-muted)]">{row.label}</div>
                  <div className="mt-3 text-lg font-semibold tracking-[-0.03em] text-[var(--app-text)]">
                    {row.value}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">{row.note}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="app-card rounded-[1.9rem] p-5 sm:p-6">
            <p className="app-kicker text-[var(--app-muted)]">Quality</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-[var(--app-text)]">
              Conversion quality
            </h2>
            <div className="mt-5 grid gap-3">
              {[
                {
                  label: "Visitor-to-click rate",
                  value: formatPercent(analytics.clickThroughRate),
                },
                {
                  label: "Repeat visits",
                  value: formatPercent(repeatVisitRate),
                },
                {
                  label: "Clicks per visitor",
                  value:
                    analytics.uniqueVisitors > 0
                      ? `${(analytics.totalClicks / analytics.uniqueVisitors).toFixed(1)}x`
                      : "0x",
                },
              ].map((row) => (
                <div key={row.label} className="rounded-[1.25rem] border border-[var(--app-line)] bg-[var(--app-panel-muted)] px-4 py-4">
                  <div className="app-kicker text-[var(--app-muted)]">{row.label}</div>
                  <div className="mt-3 text-xl font-semibold text-[var(--app-text)]">
                    {row.value}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="app-card rounded-[1.9rem] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="app-kicker text-[var(--app-muted)]">Sources</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-[var(--app-text)]">
                Top traffic sources
              </h2>
            </div>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--app-line)] bg-[var(--app-panel-muted)] text-[var(--app-text)]">
              <Radio className="h-4 w-4" />
            </span>
          </div>

          <div className="mt-5 grid gap-3">
            {analytics.referrers.length > 0 ? (
              analytics.referrers.map((row) => (
                <div key={row.label} className="rounded-[1.25rem] border border-[var(--app-line)] bg-white px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-[var(--app-text)]">{row.label}</div>
                      <div className="mt-1 text-sm text-[var(--app-muted)]">
                        {row.clicks} clicks • {formatPercent(row.ctr)} CTR
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-[var(--app-text)]">
                      {row.visits} visits
                    </div>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-[var(--app-panel-muted)]">
                    <div
                      className="h-2 rounded-full bg-[#151922]"
                      style={{ width: `${ratio(row.visits, maxSourceVisits)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <EmptyBlock label="Referrer data will appear after the first tracked visits." />
            )}
          </div>
        </div>

        <div className="app-card rounded-[1.9rem] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="app-kicker text-[var(--app-muted)]">Campaigns</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-[var(--app-text)]">
                UTM performance
              </h2>
            </div>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--app-line)] bg-[var(--app-panel-muted)] text-[var(--app-text)]">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>

          <div className="mt-5 grid gap-3">
            {analytics.utms.length > 0 ? (
              analytics.utms.map((row) => (
                <div key={`${row.source}-${row.medium}-${row.campaign}`} className="rounded-[1.25rem] border border-[var(--app-line)] bg-white px-4 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-medium text-[var(--app-text)]">{row.campaign}</div>
                      <div className="mt-1 text-sm text-[var(--app-muted)]">
                        {row.source} • {row.medium}
                      </div>
                    </div>
                    <div className="text-sm text-[var(--app-text)]">
                      {row.visits} visits • {row.clicks} clicks • {formatPercent(row.ctr)} CTR
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyBlock label="UTM-tagged campaign traffic will appear here." />
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="app-card rounded-[1.9rem] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="app-kicker text-[var(--app-muted)]">Services</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-[var(--app-text)]">
                Clicks by streaming destination
              </h2>
            </div>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--app-line)] bg-[var(--app-panel-muted)] text-[var(--app-text)]">
              <MousePointer2 className="h-4 w-4" />
            </span>
          </div>

          <div className="mt-5 grid gap-3">
            {analytics.serviceBreakdown.length > 0 ? (
              analytics.serviceBreakdown.map((row) => (
                <div key={row.service} className="rounded-[1.25rem] border border-[var(--app-line)] bg-white px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-[var(--app-text)]">
                      {SERVICE_LABELS[row.service]}
                    </span>
                    <span className="text-sm font-semibold text-[var(--app-text)]">
                      {row.clicks}
                    </span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-[var(--app-panel-muted)]">
                    <div
                      className="h-2 rounded-full bg-[var(--app-accent)]"
                      style={{ width: `${ratio(row.clicks, maxServiceClicks)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <EmptyBlock label="Service click distribution will appear after the first outbound clicks." />
            )}
          </div>
        </div>

        <div className="app-card rounded-[1.9rem] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="app-kicker text-[var(--app-muted)]">Devices</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-[var(--app-text)]">
                Device mix and conversion rate
              </h2>
            </div>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--app-line)] bg-[var(--app-panel-muted)] text-[var(--app-text)]">
              <Monitor className="h-4 w-4" />
            </span>
          </div>

          <div className="mt-5 grid gap-3">
            {analytics.devices.length > 0 ? (
              analytics.devices.map((row) => (
                <div key={row.label} className="rounded-[1.25rem] border border-[var(--app-line)] bg-white px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium capitalize text-[var(--app-text)]">
                        {row.label}
                      </div>
                      <div className="mt-1 text-sm text-[var(--app-muted)]">
                        {row.clicks} clicks • {formatPercent(row.ctr)} CTR
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-[var(--app-text)]">
                      {row.visits} visits
                    </div>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-[var(--app-panel-muted)]">
                    <div
                      className="h-2 rounded-full bg-[#151922]"
                      style={{ width: `${ratio(row.visits, maxDeviceVisits)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <EmptyBlock label="Device breakdown will appear after tracked visits land." />
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="app-card rounded-[1.9rem] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="app-kicker text-[var(--app-muted)]">Locations</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-[var(--app-text)]">
                Country and city
              </h2>
            </div>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--app-line)] bg-[var(--app-panel-muted)] text-[var(--app-text)]">
              <Globe2 className="h-4 w-4" />
            </span>
          </div>

          <div className="mt-5 grid gap-3">
            {analytics.geos.length > 0 ? (
              analytics.geos.map((row) => (
                <div key={`${row.country}-${row.city}`} className="rounded-[1.25rem] border border-[var(--app-line)] bg-white px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-[var(--app-text)]">
                        {row.country}
                        {row.city !== "Unknown" ? ` • ${row.city}` : ""}
                      </div>
                      <div className="mt-1 text-sm text-[var(--app-muted)]">
                        {row.clicks} clicks • {formatPercent(row.ctr)} CTR
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-[var(--app-text)]">
                      {row.visits} visits
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyBlock label="Geo data will appear where privacy-safe country or city signals are available." />
            )}
          </div>
        </div>

        <div className="app-card rounded-[1.9rem] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="app-kicker text-[var(--app-muted)]">Per-song</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-[var(--app-text)]">
                Song performance
              </h2>
            </div>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--app-line)] bg-[var(--app-panel-muted)] text-[var(--app-text)]">
              <Users className="h-4 w-4" />
            </span>
          </div>

          <div className="mt-5 grid gap-3">
            {analytics.songs.length > 0 ? (
              analytics.songs.map((row) => (
                <div key={row.songId} className="rounded-[1.25rem] border border-[var(--app-line)] bg-white px-4 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-medium text-[var(--app-text)]">{row.title}</div>
                      <div className="mt-1 text-sm text-[var(--app-muted)]">
                        {buildPublicSongPath(row.username, row.slug)}
                      </div>
                    </div>
                    <div className="text-sm text-[var(--app-text)]">
                      {row.visits} visits • {row.clicks} clicks • {formatPercent(row.ctr)} CTR
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyBlock label="Song-level performance will appear after traffic starts landing." />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
