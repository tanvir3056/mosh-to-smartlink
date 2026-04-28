import { NextResponse } from "next/server";

import { getUserSession } from "@/lib/auth";
import { getEmailLeadExportRows } from "@/lib/data";
import { buildPublicSongPath, formatDateTime } from "@/lib/utils";

export const runtime = "nodejs";

function escapeHtml(value: string | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildLeadExportDocument(rows: Awaited<ReturnType<typeof getEmailLeadExportRows>>) {
  const bodyRows = rows
    .map(
      (lead) => `
        <tr>
          <td>${escapeHtml(formatDateTime(lead.createdAt))}</td>
          <td>${escapeHtml(lead.email)}</td>
          <td>${escapeHtml(lead.songTitle)}</td>
          <td>${escapeHtml(lead.artistName)}</td>
          <td>${escapeHtml(buildPublicSongPath(lead.username, lead.slug))}</td>
          <td>${escapeHtml(lead.source)}</td>
          <td>${escapeHtml(lead.medium)}</td>
          <td>${escapeHtml(lead.campaign)}</td>
          <td>${escapeHtml(lead.referrerHost)}</td>
          <td>${escapeHtml(lead.country)}</td>
          <td>${escapeHtml(lead.city)}</td>
          <td>${escapeHtml(lead.connectorStatus)}</td>
          <td>${escapeHtml(lead.connectorProvider)}</td>
          <td>${escapeHtml(lead.connectorError)}</td>
        </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
  <html xmlns:o="urn:schemas-microsoft-com:office:office"
        xmlns:x="urn:schemas-microsoft-com:office:excel"
        xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <style>
        table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; }
        th, td { border: 1px solid #d7dbe3; padding: 6px 8px; text-align: left; vertical-align: top; }
        th { background: #f4f6fa; font-weight: 700; }
      </style>
    </head>
    <body>
      <table>
        <thead>
          <tr>
            <th>Captured</th>
            <th>Email</th>
            <th>Song</th>
            <th>Artist</th>
            <th>Public path</th>
            <th>Source</th>
            <th>Medium</th>
            <th>Campaign</th>
            <th>Referrer host</th>
            <th>Country</th>
            <th>City</th>
            <th>Sync status</th>
            <th>Connector</th>
            <th>Connector error</th>
          </tr>
        </thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </body>
  </html>`;
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

  return new NextResponse(buildLeadExportDocument(rows), {
    headers: {
      "content-type": "application/vnd.ms-excel; charset=utf-8",
      "content-disposition": `attachment; filename="backstage-email-leads-${fileDate}.xls"`,
      "cache-control": "no-store",
    },
  });
}
