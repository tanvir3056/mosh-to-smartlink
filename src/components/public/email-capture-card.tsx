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
    <section className="border-t border-[#eee6d6]/10 bg-[linear-gradient(180deg,#101012,#08080a)] px-5 pb-5 pt-5 text-[#fff9ec] sm:px-6 sm:pb-6">
      <div className="grid gap-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c9bda9]">
              {capture.badgeLabel}
            </p>
            <h2 className="mt-2 text-pretty font-[var(--font-display)] text-[1.28rem] font-semibold tracking-[-0.02em] text-[#fff9ec]">
              {capture.title}
            </h2>
          </div>
          {isPreview ? (
            <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.14em] text-[#b8b0a3]">
              Preview
            </span>
          ) : null}
        </div>

        <p className="max-w-xl text-[0.93rem] leading-6 text-[#c9c0b2]">
          {capture.description}
        </p>

        {isPreview ? (
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10.75rem]">
            <input
              disabled
              type="email"
              value="fan@example.com"
              readOnly
              className="min-h-11 rounded-[0.7rem] border border-[#d8d1c4] bg-white px-4 text-[15px] text-[#111827] opacity-90 shadow-[0_1px_0_rgba(255,255,255,0.86)_inset]"
            />
            <button
              type="button"
              disabled
              className="inline-flex min-h-11 items-center justify-center rounded-[0.7rem] border border-[#d8d1c4] bg-white px-5 text-sm font-semibold text-[#111827] opacity-90 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_8px_18px_rgba(0,0,0,0.16)]"
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
