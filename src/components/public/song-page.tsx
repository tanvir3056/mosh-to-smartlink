import Link from "next/link";

import { EmailCaptureCard } from "@/components/public/email-capture-card";
import { MetaPixel } from "@/components/public/meta-pixel";
import { PreviewPlayer } from "@/components/public/preview-player";
import { ServiceList } from "@/components/public/service-list";
import { VisitTracker } from "@/components/public/visit-tracker";
import type { SongPageWithLinks } from "@/lib/types";
import { buildPublicSongPath } from "@/lib/utils";

export function PublicSongPage({
  page,
  searchString,
  mode = "live",
  editorHref,
}: {
  page: SongPageWithLinks;
  searchString: string;
  mode?: "live" | "preview";
  editorHref?: string;
}) {
  const isPreview = mode === "preview";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a0c10]">
      {!isPreview ? (
        <MetaPixel
          pixelId={page.tracking.metaPixelId}
          enabled={page.tracking.metaPixelEnabled}
          pageTitle={page.song.title}
          artistName={page.song.artistName}
        />
      ) : null}
      <div
        className="absolute inset-0 scale-[1.18] bg-cover bg-center opacity-32 blur-[112px]"
        style={{ backgroundImage: `url(${page.song.artworkUrl})` }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,9,12,0.38),rgba(7,9,12,0.82)_32%,rgba(7,9,12,0.96)_100%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center px-3 py-6 sm:px-6 sm:py-10">
        {isPreview ? (
          <div className="mb-5 flex w-full max-w-[27.25rem] items-center justify-between gap-3 text-[11px] text-white/58">
            <Link
              href={editorHref ?? "/admin"}
              className="transition hover:text-white"
            >
              Back to editor
            </Link>
            <span className="text-white/42">
              {page.page.status === "published" ? "Admin preview" : "Draft preview"}
            </span>
          </div>
        ) : null}

        <section className="w-full max-w-[27.25rem] overflow-hidden rounded-[1.55rem]">
          <PreviewPlayer
            previewUrl={page.song.previewUrl}
            artworkUrl={page.song.artworkUrl}
            title={page.song.title}
            artistName={page.song.artistName}
          />

          <div className="bg-[#121318] px-5 pb-3.5 pt-2.5 text-center sm:px-6">
            <p className="text-[11px] font-medium text-white/50">
              {page.song.artistName}
            </p>
            <h1 className="mt-1.5 text-balance font-[var(--font-display)] text-[1.95rem] font-semibold tracking-[-0.04em] text-white">
              {page.song.title}
            </h1>
            <p className="mt-1 text-[13px] text-white/42">
              {page.page.headline || "Stream now"}
            </p>
          </div>

          <EmailCaptureCard
            page={page}
            searchString={searchString}
            mode={isPreview ? "preview" : "live"}
          />

          <ServiceList
            page={page}
            searchString={searchString}
            mode={isPreview ? "preview" : "live"}
          />
        </section>
      </div>

      {!isPreview ? (
        <VisitTracker
          username={page.page.username}
          slug={page.page.slug}
          path={buildPublicSongPath(page.page.username, page.page.slug)}
          searchString={searchString}
        />
      ) : null}
    </main>
  );
}
