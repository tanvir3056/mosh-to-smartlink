import Link from "next/link";

import { EmailCaptureCard } from "@/components/public/email-capture-card";
import { MetaPixel } from "@/components/public/meta-pixel";
import { PreviewPlayer } from "@/components/public/preview-player";
import { ServiceList } from "@/components/public/service-list";
import { VisitTracker } from "@/components/public/visit-tracker";
import type { SongPageWithLinks } from "@/lib/types";

export function PublicSongPage({
  page,
  mode = "live",
  editorHref,
}: {
  page: SongPageWithLinks;
  mode?: "live" | "preview";
  editorHref?: string;
}) {
  const isPreview = mode === "preview";

  return (
    <main className="deathcore-field relative min-h-screen overflow-hidden bg-[#08080a]">
      {!isPreview ? (
        <MetaPixel
          pixelId={page.tracking.metaPixelId}
          enabled={page.tracking.metaPixelEnabled}
          pageTitle={page.song.title}
          artistName={page.song.artistName}
        />
      ) : null}
      <div
        className="absolute inset-0 scale-[1.08] bg-cover bg-center opacity-24 blur-[54px] saturate-[1.35]"
        style={{ backgroundImage: `url(${page.song.artworkUrl})` }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,6,0.3),rgba(8,8,10,0.82)_38%,rgba(5,5,6,0.98)_100%)]" />
      <div className="absolute bottom-6 left-1/2 h-24 w-[min(36rem,92vw)] -translate-x-1/2 border-x border-[#eee6d6]/10" />

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

        <section className="deathcore-shell app-enter w-full max-w-[27.25rem] overflow-hidden rounded-[1.35rem]">
          <PreviewPlayer
            previewUrl={page.song.previewUrl}
            artworkUrl={page.song.artworkUrl}
            title={page.song.title}
            artistName={page.song.artistName}
          />

          <div className="relative bg-[linear-gradient(180deg,#121114,#09090b)] px-5 pb-4 pt-3 text-center sm:px-6">
            <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(238,230,214,0.36),transparent)]" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#c9bda9]">
              {page.song.artistName}
            </p>
            <h1 className="mt-2 text-balance font-[var(--font-display)] text-[2.15rem] font-semibold leading-[0.92] text-[#fff9ec]">
              {page.song.title}
            </h1>
            <p className="mx-auto mt-2 max-w-[20rem] text-[13px] font-medium text-[#b8b0a3]">
              {page.page.headline || "Stream now"}
            </p>
          </div>

          <ServiceList
            page={page}
            mode={isPreview ? "preview" : "live"}
          />

          <EmailCaptureCard
            page={page}
            mode={isPreview ? "preview" : "live"}
          />
        </section>
      </div>

      {!isPreview ? (
        <VisitTracker
          username={page.page.username}
          slug={page.page.slug}
        />
      ) : null}
    </main>
  );
}
