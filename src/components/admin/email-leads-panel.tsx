import Link from "next/link";

import type { EmailLeadSnapshot } from "@/lib/types";
import { buildPublicSongPath, formatDateTime } from "@/lib/utils";

function StatusBadge({
  status,
}: {
  status: "synced" | "failed" | "not_configured";
}) {
  const styles =
    status === "synced"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "failed"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-slate-200 bg-slate-50 text-slate-600";

  const label =
    status === "synced" ? "Synced" : status === "failed" ? "Needs attention" : "Stored locally";

  return (
    <span
      className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${styles}`}
    >
      {label}
    </span>
  );
}

export function EmailLeadsPanel({ snapshot }: { snapshot: EmailLeadSnapshot }) {
  return (
    <section className="app-card rounded-[1.75rem] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="app-kicker text-[var(--app-muted)]">Captured leads</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--app-text)]">
            Emails captured from live song pages
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--app-muted)]">
            Backstage stores every captured email locally first. Export the list for
            Excel anytime, and use the Mailchimp settings above if you want contacts
            to sync automatically as well.
          </p>
        </div>

        <Link
          href="/api/admin/email-leads/export"
          prefetch={false}
          className="inline-flex min-h-11 items-center justify-center rounded-[1rem] border border-[var(--app-line)] bg-[var(--app-panel)] px-4 text-sm font-semibold text-[var(--app-text)] transition hover:border-[var(--app-text)]/20 hover:bg-white"
        >
          Export for Excel
        </Link>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total leads", value: snapshot.totalLeads },
          { label: "Synced", value: snapshot.syncedLeads },
          { label: "Local only", value: snapshot.localOnlyLeads },
          { label: "Needs attention", value: snapshot.failedLeads },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-[1.25rem] border border-[var(--app-line)] bg-white px-4 py-4"
          >
            <p className="app-kicker text-[var(--app-muted)]">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--app-text)]">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {snapshot.items.length > 0 ? (
        <div className="mt-5 overflow-hidden rounded-[1.35rem] border border-[var(--app-line)] bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-[var(--app-text)]">
              <thead className="border-b border-[var(--app-line)] bg-[var(--app-panel-muted)]/55 text-[11px] uppercase tracking-[0.12em] text-[var(--app-muted)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Captured</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Release</th>
                  <th className="px-4 py-3 font-semibold">Source</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.items.map((lead) => (
                  <tr key={lead.id} className="border-b border-[var(--app-line)] last:border-b-0">
                    <td className="px-4 py-4 align-top text-[13px] text-[var(--app-muted)]">
                      {formatDateTime(lead.createdAt)}
                    </td>
                    <td className="px-4 py-4 align-top font-medium text-[var(--app-text)]">
                      {lead.email}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="font-medium text-[var(--app-text)]">{lead.songTitle}</div>
                      <div className="mt-1 text-[13px] text-[var(--app-muted)]">
                        {lead.artistName}
                      </div>
                      <div className="mt-1 text-[12px] text-[var(--app-muted)]">
                        {buildPublicSongPath(lead.username, lead.slug)}
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="font-medium text-[var(--app-text)]">
                        {lead.source ?? lead.referrerHost ?? "Direct"}
                      </div>
                      <div className="mt-1 text-[13px] text-[var(--app-muted)]">
                        {lead.campaign ?? lead.medium ?? lead.country ?? "No campaign data"}
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <StatusBadge status={lead.connectorStatus} />
                      {lead.connectorError ? (
                        <p className="mt-2 max-w-xs text-[12px] leading-5 text-red-600">
                          {lead.connectorError}
                        </p>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-[1.25rem] border border-dashed border-[var(--app-line)] bg-white px-4 py-5 text-sm leading-7 text-[var(--app-muted)]">
          No leads captured yet. As soon as fans submit the form on a live page, they
          will appear here and be available for export.
        </div>
      )}
    </section>
  );
}
