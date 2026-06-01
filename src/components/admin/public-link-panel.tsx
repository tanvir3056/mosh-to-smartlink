"use client";

import { Check, Copy, ExternalLink, Eye } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import type { PageStatus } from "@/lib/types";
import { buildPublicSongPath } from "@/lib/utils";

function actionLinkClass(tone: "primary" | "secondary" = "secondary") {
  return tone === "primary"
    ? "app-interactive inline-flex min-h-10 items-center justify-center gap-2 rounded-[7px] bg-[var(--app-accent)] px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(76,75,219,0.18)] select-none touch-manipulation transition-[transform,background-color,box-shadow] duration-200 ease-out hover:bg-[var(--app-accent-strong)] active:scale-[0.985] active:bg-[var(--app-accent-strong)] active:text-white"
    : "app-interactive inline-flex min-h-10 items-center justify-center gap-2 rounded-[7px] border border-[var(--app-line)] bg-white px-4 text-sm font-semibold text-[var(--app-text)] shadow-[0_1px_2px_rgba(20,24,34,0.05)] select-none touch-manipulation transition-[transform,background-color,border-color,color,box-shadow] duration-200 ease-out hover:bg-[var(--app-panel-muted)] active:scale-[0.985] active:border-[var(--app-line-strong)] active:bg-[#ece8df] active:text-[var(--app-text)]";
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

  return (
    <section className="app-card grid gap-4 rounded-[14px] p-5">
      <div className="grid gap-2">
        <p className="app-kicker text-[var(--app-muted)]">
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

      <div className="app-card-soft rounded-[10px] px-4 py-4">
        <div className="app-kicker text-[var(--app-muted)]">
          URL
        </div>
        <div className="mt-2 break-all text-sm font-medium text-[var(--app-text)]">
          {publicPath}
        </div>
      </div>

      <div className="grid gap-3 sm:flex sm:flex-wrap">
        <Link href={previewHref} className={actionLinkClass()}>
          <Eye className="h-4 w-4" />
          Open admin preview
        </Link>
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
