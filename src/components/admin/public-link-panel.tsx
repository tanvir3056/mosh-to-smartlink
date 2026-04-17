"use client";

import { Check, Copy, ExternalLink, Eye } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import type { PageStatus } from "@/lib/types";

function actionLinkClass(tone: "primary" | "secondary" = "secondary") {
  return tone === "primary"
    ? "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--app-accent)] px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(84,113,89,0.16)] transition hover:bg-[var(--app-accent-strong)]"
    : "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--app-line)] bg-white/82 px-4 text-sm font-semibold text-[var(--app-text)] transition hover:border-[rgba(111,143,116,0.24)] hover:bg-white";
}

export function PublicLinkPanel({
  slug,
  status,
  previewHref,
}: {
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
  const publicPath = `/${slug}`;
  const publicUrl =
    typeof window === "undefined"
      ? publicPath
      : `${window.location.origin}${publicPath}`;

  return (
    <section className="app-card grid gap-4 rounded-[1.6rem] p-5">
      <div className="grid gap-2">
        <p className="app-kicker">
          Fan-facing page
        </p>
        <h3 className="text-2xl font-semibold text-[var(--app-text)]">
          {isPublished ? "Live page is ready to share" : "Slug reserved, waiting to go live"}
        </h3>
        <p className="max-w-2xl text-sm leading-7 text-[var(--app-muted)]">
          {isPublished
            ? "This is the page link you can use in ads, social bios, and messages."
            : "Fans cannot open this page yet. Publish when the links are reviewed and the artwork is final."}
        </p>
      </div>

      <div className="rounded-[1.2rem] border border-[var(--app-line)] bg-white/76 px-4 py-4">
        <div className="text-[11px] uppercase tracking-[0.24em] text-[var(--app-muted-2)]">
          URL
        </div>
        <div className="mt-2 break-all text-sm text-[var(--app-text)]">{publicUrl}</div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href={previewHref} className={actionLinkClass()}>
          <Eye className="h-4 w-4" />
          Open admin preview
        </Link>
        {isPublished ? (
          <a href={publicPath} target="_blank" rel="noreferrer" className={actionLinkClass("primary")}>
            <ExternalLink className="h-4 w-4" />
            Open live page
          </a>
        ) : null}
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(publicUrl);
            setCopied(true);
          }}
          className={actionLinkClass()}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : isPublished ? "Copy live URL" : "Copy planned URL"}
        </button>
      </div>

      <p className="text-xs leading-6 text-[var(--app-muted)]">
        Admin preview is private and does not write visit or click analytics.
      </p>
    </section>
  );
}
