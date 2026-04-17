import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";
import { MetaPixel } from "@/components/public/meta-pixel";
import { PreviewPlayer } from "@/components/public/preview-player";
import { ServiceList } from "@/components/public/service-list";
import { VisitTracker } from "@/components/public/visit-tracker";
import type { SongPageWithLinks } from "@/lib/types";

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
    <main className="relative min-h-screen overflow-hidden bg-[#0f1712]">
      {!isPreview ? (
        <MetaPixel
          pixelId={page.tracking.metaPixelId}
          enabled={page.tracking.metaPixelEnabled}
          pageTitle={page.song.title}
          artistName={page.song.artistName}
        />
      ) : null}
      <div
        className="absolute inset-0 scale-[1.15] bg-cover bg-center opacity-45 blur-[90px]"
        style={{ backgroundImage: `url(${page.song.artworkUrl})` }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(232,238,226,0.12),transparent_22%),linear-gradient(180deg,rgba(10,16,12,0.32),rgba(12,18,14,0.88)_34%,rgba(9,12,10,0.98))]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center px-4 py-6 sm:px-8 sm:py-10">
        {isPreview ? (
          <div className="mb-4 flex w-full max-w-[25rem] items-center justify-between text-[11px] uppercase tracking-[0.24em] text-white/60">
            <Link
              href={editorHref ?? "/admin"}
              className="rounded-full border border-white/10 bg-black/28 px-3 py-1.5 backdrop-blur-md"
            >
              Back to editor
            </Link>
            <span className="rounded-full border border-white/10 bg-black/28 px-3 py-1.5 backdrop-blur-md">
              {page.page.status === "published" ? "Admin preview" : "Draft preview"}
            </span>
          </div>
        ) : null}

        <section className="w-full max-w-[25rem] overflow-hidden rounded-[2rem] border border-white/10 bg-[#fbf8f1] shadow-[0_35px_120px_rgba(0,0,0,0.35)]">
          <PreviewPlayer
            previewUrl={page.song.previewUrl}
            artworkUrl={page.song.artworkUrl}
          />

          <div className="bg-[#2f3430] px-6 pb-7 pt-6 text-center">
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/50">
              {page.song.artistName}
            </p>
            <h1 className="mt-3 text-[2.1rem] font-semibold tracking-[-0.05em] text-white">
              {page.song.title}
            </h1>
            <p className="mt-2 text-base text-white/66">
              {page.page.headline || "Stream now"}
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[11px] uppercase tracking-[0.2em] text-white/52">
              {page.song.releaseYear ? (
                <span className="rounded-full border border-white/10 bg-white/4 px-3 py-1.5">
                  Released {page.song.releaseYear}
                </span>
              ) : null}
              <span className="rounded-full border border-white/10 bg-white/4 px-3 py-1.5">
                {page.song.previewUrl ? "Preview available" : "Full song only"}
              </span>
              {page.song.albumName ? (
                <span className="rounded-full border border-white/10 bg-white/4 px-3 py-1.5">
                  {page.song.albumName}
                </span>
              ) : null}
            </div>
          </div>

          <ServiceList
            page={page}
            searchString={searchString}
            mode={isPreview ? "preview" : "live"}
          />
        </section>

        {isPreview ? (
          <p className="mt-4 max-w-[22rem] text-center text-xs leading-6 text-white/42">
            Preview mode is private to the admin and does not record visits or
            clicks.
          </p>
        ) : (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/18 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-white/56">
            <BrandMark className="h-6 w-6 rounded-xl" />
            {page.tracking.siteName}
          </div>
        )}
      </div>

      {!isPreview ? (
        <VisitTracker
          songId={page.song.id}
          pageId={page.page.id}
          path={`/${page.page.slug}`}
          searchString={searchString}
        />
      ) : null}
    </main>
  );
}
