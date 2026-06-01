import { NextResponse } from "next/server";

import { getUserSession } from "@/lib/auth";
import { SERVICE_LABELS } from "@/lib/constants";
import { getAnalyticsSnapshot } from "@/lib/data";
import type { AnalyticsSnapshot } from "@/lib/types";
import { buildPublicSongPath } from "@/lib/utils";

export const runtime = "nodejs";

function parseRangeDays(input: string | null) {
  const parsed = Number.parseInt(input ?? "30", 10);

  if (parsed === 7 || parsed === 30 || parsed === 90) {
    return parsed;
  }

  return 30;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function escapeCsvCell(value: string | number | null | undefined) {
  let cell = String(value ?? "");

  if (/^\s*[=+\-@]/.test(cell) || /^[\t\r]/.test(cell)) {
    cell = `'${cell}`;
  }

  return `"${cell.replaceAll('"', '""')}"`;
}

function buildCsvRow(values: Array<string | number | null | undefined>) {
  return values.map(escapeCsvCell).join(",");
}

function buildAnalyticsExportCsv(analytics: AnalyticsSnapshot, rangeDays: number) {
  const rows: string[] = [
    buildCsvRow(["Section", "Metric", "Value", "Clicks", "CTR", "Extra"]),
    buildCsvRow(["Summary", "Range days", rangeDays]),
    buildCsvRow(["Summary", "Visits", analytics.totalVisits]),
    buildCsvRow(["Summary", "Unique visitors", analytics.uniqueVisitors]),
    buildCsvRow(["Summary", "Service clicks", analytics.totalClicks]),
    buildCsvRow(["Summary", "Click-through rate", formatPercent(analytics.clickThroughRate)]),
    buildCsvRow(["Summary", "Email leads", analytics.totalEmailLeads]),
    buildCsvRow(["Summary", "Email lead rate", formatPercent(analytics.emailLeadRate)]),
    buildCsvRow([]),
    buildCsvRow(["Daily trend", "Date", "Visits", "Unique visitors", "Clicks", "CTR"]),
    ...analytics.daily.map((row) =>
      buildCsvRow([
        "Daily trend",
        row.date,
        row.visits,
        row.uniqueVisitors,
        row.clicks,
        formatPercent(row.ctr),
      ]),
    ),
    buildCsvRow([]),
    buildCsvRow(["Streaming services", "Service", "Clicks"]),
    ...analytics.serviceBreakdown.map((row) =>
      buildCsvRow(["Streaming services", SERVICE_LABELS[row.service], row.clicks]),
    ),
    buildCsvRow([]),
    buildCsvRow(["Top sources", "Source", "Visits", "Clicks", "CTR"]),
    ...analytics.referrers.map((row) =>
      buildCsvRow(["Top sources", row.label, row.visits, row.clicks, formatPercent(row.ctr)]),
    ),
    buildCsvRow([]),
    buildCsvRow(["Campaigns", "Source", "Medium", "Campaign", "Visits", "Clicks", "CTR"]),
    ...analytics.utms.map((row) =>
      buildCsvRow([
        "Campaigns",
        row.source,
        row.medium,
        row.campaign,
        row.visits,
        row.clicks,
        formatPercent(row.ctr),
      ]),
    ),
    buildCsvRow([]),
    buildCsvRow(["Devices", "Device", "Visits", "Clicks", "CTR"]),
    ...analytics.devices.map((row) =>
      buildCsvRow(["Devices", row.label, row.visits, row.clicks, formatPercent(row.ctr)]),
    ),
    buildCsvRow([]),
    buildCsvRow(["Locations", "Country", "City", "Visits", "Clicks", "CTR"]),
    ...analytics.geos.map((row) =>
      buildCsvRow([
        "Locations",
        row.country,
        row.city,
        row.visits,
        row.clicks,
        formatPercent(row.ctr),
      ]),
    ),
    buildCsvRow([]),
    buildCsvRow(["Per-song performance", "Release", "Public path", "Visits", "Clicks", "CTR"]),
    ...analytics.songs.map((row) =>
      buildCsvRow([
        "Per-song performance",
        row.title,
        buildPublicSongPath(row.username, row.slug),
        row.visits,
        row.clicks,
        formatPercent(row.ctr),
      ]),
    ),
  ];

  return rows.join("\r\n");
}

export async function GET(request: Request) {
  const session = await getUserSession();

  if (!session) {
    return NextResponse.json(
      { error: "Sign in before exporting analytics." },
      { status: 401 },
    );
  }

  const rangeDays = parseRangeDays(new URL(request.url).searchParams.get("range"));
  const analytics = await getAnalyticsSnapshot(session.userId, rangeDays);
  const fileDate = new Date().toISOString().slice(0, 10);

  return new NextResponse(buildAnalyticsExportCsv(analytics, rangeDays), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="backstage-analytics-${rangeDays}d-${fileDate}.csv"`,
      "cache-control": "no-store",
    },
  });
}
