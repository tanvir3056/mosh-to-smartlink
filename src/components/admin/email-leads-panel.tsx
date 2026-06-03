import Link from "next/link";
import { Download, Inbox, RefreshCw } from "lucide-react";

import { resyncEmailLeadsFormAction } from "@/app/admin/actions";
import type { EmailLeadSnapshot } from "@/lib/types";
import { buildPublicSongPath, formatDateTime } from "@/lib/utils";

function StatusBadge({
  status,
}: {
  status: "synced" | "failed" | "not_configured";
}) {
  const styles =
    status === "synced"
      ? "border-[var(--app-green-line)] bg-[var(--app-green-soft)] text-[var(--app-green-text)]"
      : status === "failed"
        ? "border-[var(--app-red-line)] bg-[var(--app-red-soft)] text-[var(--app-red-text)]"
        : "border-[var(--app-line)] bg-[var(--app-panel-muted)] text-[var(--app-muted)]";

  const label =
    status === "synced" ? "Synced" : status === "failed" ? "Needs attention" : "Stored locally";

  return (
    <span
      className={`inline-flex w-fit items-center rounded-[7px] border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] ${styles}`}
    >
      {label}
    </span>
  );
}

export function EmailLeadsPanel({
  snapshot,
  showSummary = true,
}: {
  snapshot: EmailLeadSnapshot;
  showSummary?: boolean;
}) {
  const compact = !showSummary;

  return (
    <section
      aria-labelledby="lead-inbox-title"
      className={`app-card app-enter app-enter-delay-1 rounded-[14px] ${
        compact ? "overflow-hidden p-0" : "p-5 sm:p-6 lg:p-7"
      }`}
    >
      <div
        className={
          compact
            ? "flex flex-wrap items-center justify-between gap-3 border-b border-[var(--app-line)] px-[18px] py-[15px]"
            : "flex flex-wrap items-start justify-between gap-4"
        }
      >
        {compact ? (
          <div className="flex min-w-0 items-center gap-2.5">
            <Inbox className="h-4 w-4 shrink-0 text-[var(--app-muted-2)]" />
            <h3 id="lead-inbox-title" className="text-[15.5px] font-semibold text-[var(--app-text)]">
              Lead inbox
            </h3>
          </div>
        ) : (
          <div className="max-w-3xl">
            <p className="app-kicker text-[var(--app-muted)]">Captured leads</p>
            <h3
              id="lead-inbox-title"
              className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--app-text)]"
            >
              Lead inbox
            </h3>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--app-muted)]">
              Every submission lands here first. Export anytime, or let Mailchimp sync in the background.
            </p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <form action={resyncEmailLeadsFormAction}>
            <button
              type="submit"
              className="app-interactive inline-flex min-h-9 items-center justify-center gap-2 rounded-[7px] border border-[var(--app-line)] bg-[var(--app-panel)] px-3.5 text-sm font-semibold text-[var(--app-text)] shadow-[var(--sh-xs)] transition hover:border-[var(--app-line-strong)] hover:bg-[var(--app-panel-muted)]"
            >
              <RefreshCw className="h-4 w-4" />
              Re-sync
            </button>
          </form>
          <Link
            href="/api/admin/email-leads/export"
            prefetch={false}
            className="app-interactive inline-flex min-h-9 items-center justify-center gap-2 rounded-[7px] border border-[var(--app-line)] bg-[var(--app-panel)] px-3.5 text-sm font-semibold text-[var(--app-text)] shadow-[var(--sh-xs)] transition hover:border-[var(--app-line-strong)] hover:bg-[var(--app-panel-muted)]"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Link>
        </div>
      </div>

      {showSummary ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total leads", value: snapshot.totalLeads },
            { label: "Synced", value: snapshot.syncedLeads },
            { label: "Local only", value: snapshot.localOnlyLeads },
            { label: "Needs attention", value: snapshot.failedLeads },
          ].map((item) => (
            <div key={item.label} className="rounded-[10px] border border-[var(--app-line)] bg-[var(--app-panel)] px-4 py-4 shadow-[0_1px_0_oklch(1_0_0_/_0.2)_inset]">
              <p className="app-kicker text-[var(--app-muted)]">{item.label}</p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--app-text)]">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {snapshot.items.length > 0 ? (
        <div className={compact ? "" : "mt-6"}>
          <div className={`grid gap-3 lg:hidden ${compact ? "p-3" : ""}`}>
            {snapshot.items.map((lead) => (
              <article
                key={lead.id}
                className="rounded-[10px] border border-[var(--app-line)] bg-[var(--app-panel)] px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--app-text)]">{lead.email}</p>
                    <p className="mt-1 text-[13px] text-[var(--app-muted)]">
                      {formatDateTime(lead.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={lead.connectorStatus} />
                </div>

                <div className="mt-4 grid gap-3 text-sm">
                  <div>
                    <p className="app-kicker text-[var(--app-muted)]">Release</p>
                    <p className="mt-1 font-medium text-[var(--app-text)]">{lead.songTitle}</p>
                    <p className="text-[13px] text-[var(--app-muted)]">{lead.artistName}</p>
                  </div>
                  <div>
                    <p className="app-kicker text-[var(--app-muted)]">Source</p>
                    <p className="mt-1 font-medium text-[var(--app-text)]">
                      {lead.source ?? lead.referrerHost ?? "Direct"}
                    </p>
                    <p className="text-[13px] text-[var(--app-muted)]">
                      {lead.campaign ?? lead.medium ?? lead.country ?? "No campaign data"}
                    </p>
                  </div>
                  <div className="text-[12px] text-[var(--app-muted)]">
                    {buildPublicSongPath(lead.username, lead.slug)}
                  </div>
                  {lead.connectorError ? (
                    <p className="text-[12px] leading-5 text-[var(--app-red-text)]">
                      {lead.connectorError}
                    </p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>

          <div
            className={`hidden overflow-hidden bg-[var(--app-panel)] lg:block ${
              compact ? "" : "rounded-[12px] border border-[var(--app-line)]"
            }`}
          >
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm text-[var(--app-text)]">
                <thead className="border-b border-[var(--app-line)] bg-[var(--app-panel-muted)] text-[11px] uppercase tracking-[0.12em] text-[var(--app-muted)]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Release</th>
                    <th className="px-4 py-3 font-semibold">Source</th>
                    <th className="px-4 py-3 font-semibold">When</th>
                    <th className="px-4 py-3 font-semibold text-right">Sync</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.items.map((lead) => (
                    <tr key={lead.id} className="border-b border-[var(--app-line)] last:border-b-0">
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
                      <td className="px-4 py-4 align-top text-[13px] text-[var(--app-muted)]">
                        {formatDateTime(lead.createdAt)}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-col items-end">
                          <StatusBadge status={lead.connectorStatus} />
                          {lead.connectorError ? (
                            <p className="mt-2 max-w-xs text-[12px] leading-5 text-[var(--app-red-text)]">
                              {lead.connectorError}
                            </p>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`rounded-[10px] border border-dashed border-[var(--app-line)] bg-[var(--app-panel-muted)] px-4 py-5 text-sm leading-7 text-[var(--app-muted)] ${
            compact ? "m-3" : "mt-6"
          }`}
        >
          No leads yet.
        </div>
      )}
    </section>
  );
}

export function EmailLeadsPanelUnavailable() {
  return (
    <section className="app-card app-enter app-enter-delay-1 rounded-[14px] p-5 sm:p-6">
      <p className="app-kicker text-[var(--app-muted)]">Captured leads</p>
      <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--app-text)]">
        Lead inbox unavailable
      </h3>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--app-muted)]">
        New leads can still be captured on live pages, but the table could not load right now.
      </p>
    </section>
  );
}
