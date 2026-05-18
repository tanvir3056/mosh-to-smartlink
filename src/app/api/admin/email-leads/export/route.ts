import { NextResponse } from "next/server";

import { getUserSession } from "@/lib/auth";
import { getEmailLeadExportRows } from "@/lib/data";
import { buildPublicSongPath, formatDateTime } from "@/lib/utils";

export const runtime = "nodejs";

function escapeCsvCell(value: string | null | undefined) {
  let cell = String(value ?? "");

  if (/^\s*[=+\-@]/.test(cell) || /^[\t\r]/.test(cell)) {
    cell = `'${cell}`;
  }

  return `"${cell.replaceAll('"', '""')}"`;
}

function buildCsvRow(values: Array<string | null | undefined>) {
  return values.map(escapeCsvCell).join(",");
}

function buildLeadExportCsv(rows: Awaited<ReturnType<typeof getEmailLeadExportRows>>) {
  const headers = [
    "Captured",
    "Email",
    "Song",
    "Artist",
    "Public path",
    "Source",
    "Medium",
    "Campaign",
    "Referrer host",
    "Country",
    "City",
    "Sync status",
    "Connector",
    "Connector error",
  ];
  const bodyRows = rows.map((lead) =>
    buildCsvRow([
      formatDateTime(lead.createdAt),
      lead.email,
      lead.songTitle,
      lead.artistName,
      buildPublicSongPath(lead.username, lead.slug),
      lead.source,
      lead.medium,
      lead.campaign,
      lead.referrerHost,
      lead.country,
      lead.city,
      lead.connectorStatus,
      lead.connectorProvider,
      lead.connectorError,
    ]),
  );

  return [buildCsvRow(headers), ...bodyRows].join("\r\n");
}

export async function GET() {
  const session = await getUserSession();

  if (!session) {
    return NextResponse.json(
      { error: "Sign in before exporting captured leads." },
      { status: 401 },
    );
  }

  const rows = await getEmailLeadExportRows(session.userId);
  const fileDate = new Date().toISOString().slice(0, 10);

  return new NextResponse(buildLeadExportCsv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="backstage-email-leads-${fileDate}.csv"`,
      "cache-control": "no-store",
    },
  });
}
