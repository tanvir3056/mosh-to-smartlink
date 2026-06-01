import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ExternalLink, Info } from "lucide-react";

import { PublicSongPage } from "@/components/public/song-page";
import { requireUserSession } from "@/lib/auth";
import { getAdminSongPageBySongId } from "@/lib/data";
import { buildPublicSongPath, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PreviewDevice = "mobile" | "desktop";

function parsePreviewDevice(value: string | string[] | undefined): PreviewDevice {
  return value === "desktop" ? "desktop" : "mobile";
}

function segmentedClass(active: boolean) {
  return cn(
    "inline-flex min-h-8 items-center justify-center rounded-[7px] px-3 text-[13px] font-semibold transition",
    active
      ? "bg-[var(--app-panel)] text-[var(--app-text)] shadow-[0_1px_2px_rgba(20,24,34,0.06)]"
      : "text-[var(--app-muted)] hover:text-[var(--app-text)]",
  );
}

export default async function AdminPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ songId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireUserSession();

  const { songId } = await params;
  const resolvedSearchParams = await searchParams;
  const device = parsePreviewDevice(resolvedSearchParams?.device);
  const page = await getAdminSongPageBySongId(songId, session.userId);

  if (!page) {
    notFound();
  }

  const isPublished = page.page.status === "published";
  const publicHref = buildPublicSongPath(page.page.username, page.page.slug);

  return (
    <div className="bs-admin-theme flex min-h-screen flex-col bg-[var(--app-bg)] text-[var(--app-text)]">
      <header className="sticky top-0 z-20 flex min-h-[58px] shrink-0 flex-col gap-3 border-b border-[var(--app-line)] bg-[var(--app-panel)]/96 px-4 py-3 shadow-[0_1px_2px_rgba(20,24,34,0.04)] backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-[18px]">
        <Link
          href={`/admin/songs/${songId}`}
          className="app-interactive inline-flex min-h-9 items-center justify-center gap-1.5 self-start rounded-[7px] px-3 text-sm font-semibold text-[var(--app-muted)] transition hover:bg-[var(--app-panel-muted)] hover:text-[var(--app-text)] sm:self-auto"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to editor
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <span className="app-chip border-[var(--app-amber-line)] bg-[var(--app-amber-soft)] text-[var(--app-amber-text)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--app-amber)]" />
            {isPublished ? "Live preview" : "Draft preview"}
          </span>
          <nav
            aria-label="Preview device"
            className="inline-flex rounded-[9px] border border-[var(--app-line)] bg-[var(--app-panel-muted)] p-1"
          >
            <Link
              href={`/admin/preview/${songId}?device=mobile`}
              aria-current={device === "mobile" ? "page" : undefined}
              className={segmentedClass(device === "mobile")}
            >
              Mobile
            </Link>
            <Link
              href={`/admin/preview/${songId}?device=desktop`}
              aria-current={device === "desktop" ? "page" : undefined}
              className={segmentedClass(device === "desktop")}
            >
              Desktop
            </Link>
          </nav>
        </div>

        {isPublished ? (
          <Link
            href={publicHref}
            target="_blank"
            className="app-interactive inline-flex min-h-9 items-center justify-center gap-2 rounded-[7px] border border-[var(--app-line)] bg-white px-3 text-sm font-semibold text-[var(--app-text)] shadow-[0_1px_2px_rgba(20,24,34,0.05)] transition hover:bg-[var(--app-panel-muted)]"
          >
            <ExternalLink className="h-4 w-4" />
            Open live
          </Link>
        ) : (
          <button
            type="button"
            aria-disabled="true"
            disabled
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-[7px] border border-[var(--app-line)] bg-white px-3 text-sm font-semibold text-[var(--app-muted)] opacity-55"
          >
            <ExternalLink className="h-4 w-4" />
            Open live
          </button>
        )}
      </header>

      <div
        className={cn(
          "flex flex-1 justify-center px-4",
          device === "mobile" ? "items-start py-10 sm:px-6" : "items-start py-8 sm:px-6",
        )}
      >
        <div
          data-testid="admin-preview-device-frame"
          data-device={device}
          className={cn(
            "overflow-hidden border border-[var(--app-line)] bg-[var(--app-panel)] shadow-[0_24px_70px_rgba(20,24,34,0.16)]",
            device === "mobile"
              ? "w-full max-w-[390px] rounded-[34px] p-[9px]"
              : "w-full max-w-[960px] rounded-[14px]",
          )}
        >
          <div
            className={cn(
              "overflow-hidden",
              device === "mobile"
                ? "rounded-[26px] border border-[var(--app-line-soft)]"
                : "rounded-[12px]",
            )}
          >
            <PublicSongPage
              page={page}
              mode="preview"
              editorHref={`/admin/songs/${songId}`}
            />
          </div>
        </div>
      </div>

      <footer className="px-6 pb-7 text-center">
        <p className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--app-muted)]">
          <Info className="h-3.5 w-3.5" />
          The release page itself is unchanged - this is the admin preview wrapper.
        </p>
      </footer>
    </div>
  );
}
