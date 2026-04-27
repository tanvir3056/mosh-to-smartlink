import { EmailCaptureForm } from "@/components/public/email-capture-form";
import { resolveEmailCaptureConfig } from "@/lib/email-capture";
import type { SongPageWithLinks } from "@/lib/types";

export function EmailCaptureCard({
  page,
  mode = "live",
}: {
  page: SongPageWithLinks;
  mode?: "live" | "preview";
}) {
  const capture = resolveEmailCaptureConfig(page);

  if (!capture.enabled) {
    return null;
  }

  const isPreview = mode === "preview";

  return (
    <section className="border-t border-[#dfd8cb] bg-[linear-gradient(180deg,#efe2c9_0%,#f7f0e2_100%)] px-5 py-5 text-[#181b20] sm:px-6">
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex rounded-full border border-[#d7c6ab] bg-white/66 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5f513e]">
            {capture.badgeLabel}
          </span>
          {isPreview ? (
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#7e715f]">
              Preview only
            </span>
          ) : null}
        </div>

        <div>
          <h2 className="text-pretty font-[var(--font-display)] text-[1.45rem] font-semibold tracking-[-0.04em]">
            {capture.title}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-7 text-[#5d5448]">
            {capture.description}
          </p>
        </div>

        {isPreview ? (
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <input
              disabled
              type="email"
              value="fan@example.com"
              readOnly
              className="min-h-12 rounded-[0.95rem] border border-[#d7cdbd] bg-[#fffdf7] px-4 text-[15px] text-[#181b20] opacity-80"
            />
            <button
              type="button"
              disabled
              className="inline-flex min-h-12 items-center justify-center rounded-[0.95rem] bg-[#101215] px-5 text-sm font-semibold text-white opacity-80"
            >
              {capture.buttonLabel}
            </button>
          </div>
        ) : (
          <EmailCaptureForm
            username={page.page.username}
            slug={page.page.slug}
            buttonLabel={capture.buttonLabel}
          />
        )}
      </div>
    </section>
  );
}
