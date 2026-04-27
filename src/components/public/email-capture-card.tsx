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
    <section className="border-t border-[#dfd8cb] bg-[#f3efe7] px-5 pb-5 pt-4 text-[#181b20] sm:px-6 sm:pb-6">
      <div className="rounded-[1.3rem] border border-[#ddd3c3] bg-[linear-gradient(180deg,#f5ead6_0%,#f8f2e6_100%)] px-4 py-4 shadow-[0_1px_0_rgba(255,255,255,0.35)_inset] sm:px-5">
        <div className="grid gap-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#786955]">
                {capture.badgeLabel}
              </p>
              <h2 className="mt-2 text-pretty font-[var(--font-display)] text-[1.2rem] font-semibold tracking-[-0.035em] text-[#171a1f]">
                {capture.title}
              </h2>
            </div>
            {isPreview ? (
              <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.14em] text-[#8a7c68]">
                Preview
              </span>
            ) : null}
          </div>

          <p className="max-w-xl text-[0.93rem] leading-6 text-[#5d5448]">
            {capture.description}
          </p>

          {isPreview ? (
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <input
                disabled
                type="email"
                value="fan@example.com"
                readOnly
                className="min-h-11 rounded-[0.9rem] border border-[#d7cdbd] bg-[#fffdf7] px-4 text-[15px] text-[#181b20] opacity-80"
              />
              <button
                type="button"
                disabled
                className="inline-flex min-h-11 items-center justify-center rounded-[0.9rem] bg-[#101215] px-5 text-sm font-semibold text-white opacity-80"
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
      </div>
    </section>
  );
}
