"use client";

import { Check, Copy, ExternalLink, Eye, Link2 } from "lucide-react";
import { useEffect, useState } from "react";

import { APP_DOMAIN_HINT } from "@/lib/constants";
import type { PageStatus } from "@/lib/types";
import { buildPublicSongPath } from "@/lib/utils";

function actionLinkClass(tone: "primary" | "secondary" = "secondary") {
  return tone === "primary"
    ? "app-interactive inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-[7px] bg-[var(--app-accent)] px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(76,75,219,0.18)] select-none touch-manipulation transition-[transform,background-color,box-shadow] duration-200 ease-out hover:bg-[var(--app-accent-strong)] active:scale-[0.985] active:bg-[var(--app-accent-strong)] active:text-white sm:w-auto"
    : "app-interactive inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-[7px] border border-[var(--app-line)] bg-white px-4 text-sm font-semibold text-[var(--app-text)] shadow-[0_1px_2px_rgba(20,24,34,0.05)] select-none touch-manipulation transition-[transform,background-color,border-color,color,box-shadow] duration-200 ease-out hover:bg-[var(--app-panel-muted)] active:scale-[0.985] active:border-[var(--app-line-strong)] active:bg-[#ece8df] active:text-[var(--app-text)] sm:w-auto";
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

  return (
    <section className="app-card overflow-hidden rounded-[14px]">
      <div className="flex items-center justify-between gap-4 border-b border-[var(--app-line)] px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[8px] border border-[var(--app-line)] bg-[var(--app-panel-muted)] text-[var(--app-muted)]">
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

      <div className="grid gap-4 p-5">
        <div className="flex min-h-12 items-center gap-3 rounded-[10px] border border-[var(--app-line)] bg-[var(--app-panel-muted)] px-4">
          <Link2 className="h-4 w-4 shrink-0 text-[var(--app-muted)]" />
          <span className="min-w-0 flex-1 truncate font-mono text-[13.5px] font-medium text-[var(--app-text)]">
            {displayPath}
          </span>
          <button
            type="button"
            onClick={async () => {
              const publicUrl =
                typeof window === "undefined"
                  ? publicPath
                  : `${window.location.origin}${publicPath}`;
              await navigator.clipboard.writeText(publicUrl);
              setCopied(true);
            }}
            className="inline-flex min-h-8 shrink-0 items-center justify-center gap-1.5 rounded-[7px] border border-[var(--app-line)] bg-[var(--app-panel)] px-3 text-[13px] font-[550] text-[var(--app-muted)] transition hover:bg-white hover:text-[var(--app-text)]"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <div className="grid gap-3 sm:flex sm:flex-wrap">
          <a
            href={previewHref}
            className={actionLinkClass(isPublished ? "secondary" : "primary")}
            style={!isPublished ? { color: "#fff", WebkitTextFillColor: "#fff" } : undefined}
          >
            <Eye className="h-4 w-4" />
            {isPublished ? "Admin preview" : "Preview draft"}
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
          ) : null}
        </div>
      </div>
    </section>
  );
}
