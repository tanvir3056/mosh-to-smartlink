"use client";

import { Check, Copy, ExternalLink, Eye, Link2 } from "lucide-react";
import { useEffect, useState } from "react";

import { APP_DOMAIN_HINT } from "@/lib/constants";
import type { PageStatus } from "@/lib/types";
import { buildPublicSongPath } from "@/lib/utils";

function actionLinkClass(tone: "primary" | "secondary" | "ghost" = "secondary") {
  const base =
    "app-interactive inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-[var(--r-sm)] px-4 text-sm font-semibold select-none touch-manipulation transition-[transform,background-color,border-color,color,box-shadow] duration-200 ease-out active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto";

  if (tone === "primary") {
    return `${base} bg-[var(--app-accent)] text-white shadow-[var(--sh-xs)] hover:bg-[var(--app-accent-strong)] active:bg-[var(--app-accent-strong)] active:text-white`;
  }

  if (tone === "ghost") {
    return `${base} border border-transparent bg-transparent text-[var(--app-muted)] hover:bg-[var(--app-panel-muted)] hover:text-[var(--app-text)] active:text-[var(--app-text)]`;
  }

  return `${base} border border-[var(--app-line)] bg-[var(--app-panel)] text-[var(--app-text)] shadow-[var(--sh-xs)] hover:bg-[var(--app-panel-muted)] active:border-[var(--app-line-strong)] active:bg-[var(--app-panel-muted)] active:text-[var(--app-text)]`;
}

export function PublicLinkPanel({
  username,
  slug,
  status,
  previewHref,
}: {
  username: string;
  slug: string;
  status: PageStatus;
  previewHref: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeout = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  const isPublished = status === "published";
  const publicPath = buildPublicSongPath(username, slug);
  const displayPath = `${APP_DOMAIN_HINT}${publicPath}`;
  const publicUrl = `https://${displayPath}`;

  return (
    <section className="app-card overflow-hidden rounded-[var(--r-lg)]">
      <div className="flex flex-col gap-3 border-b border-[var(--app-line)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-start gap-3 sm:items-center">
          <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[var(--r-sm)] border border-[var(--app-line)] bg-[var(--app-panel-muted)] text-[var(--app-muted)]">
            <Link2 className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-[15.5px] font-semibold text-[var(--app-text)]">
              Public link
            </h3>
            <p className="mt-0.5 text-[12.5px] text-[var(--app-muted)]">
              {isPublished
                ? "Live and shareable now."
                : "Reserved - goes live when you publish."}
            </p>
          </div>
        </div>
        <span className="app-chip shrink-0">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isPublished ? "bg-[var(--app-green)]" : "bg-[var(--app-amber)]"
            }`}
          />
          {isPublished ? "Live" : "Planned"}
        </span>
      </div>

      <div className="grid gap-4 p-4 sm:p-5">
        <div
          data-testid="public-link-copy-row"
          className="grid gap-3 rounded-[var(--r-md)] border border-[var(--app-line)] bg-[var(--app-panel-muted)] p-3 sm:min-h-12 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:px-4"
        >
          <Link2 className="hidden h-4 w-4 shrink-0 text-[var(--app-muted)] sm:block" />
          <span
            data-testid="public-link-display-path"
            className="min-w-0 break-all font-mono text-[13.5px] font-medium text-[var(--app-text)] sm:truncate"
          >
            {displayPath}
          </span>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(publicUrl);
              setCopied(true);
            }}
            className="inline-flex min-h-8 w-full shrink-0 items-center justify-center gap-1.5 rounded-[var(--r-sm)] border border-[var(--app-line)] bg-[var(--app-panel)] px-3 text-[13px] font-[550] text-[var(--app-muted)] transition hover:bg-[var(--app-panel-strong)] hover:text-[var(--app-text)] sm:w-auto"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <div className="grid gap-3 sm:flex sm:flex-wrap">
          <a
            href={previewHref}
            className={actionLinkClass("secondary")}
          >
            <Eye className="h-4 w-4" />
            Admin preview
          </a>
          {isPublished ? (
            <a
              href={publicPath}
              target="_blank"
              rel="noreferrer"
              className={actionLinkClass("primary")}
              style={{ color: "#fff", WebkitTextFillColor: "#fff" }}
            >
              <ExternalLink className="h-4 w-4" />
              Open live page
            </a>
          ) : (
            <button type="button" disabled className={actionLinkClass("ghost")}>
              <ExternalLink className="h-4 w-4" />
              Open live page
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
