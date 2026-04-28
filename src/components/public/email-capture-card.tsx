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
    <section className="border-t border-white/6 bg-[#11141a] px-5 pb-5 pt-5 text-white sm:px-6 sm:pb-6">
      <div className="grid gap-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/42">
              {capture.badgeLabel}
            </p>
            <h2 className="mt-2 text-pretty font-[var(--font-display)] text-[1.2rem] font-semibold tracking-[-0.035em] text-white">
              {capture.title}
            </h2>
          </div>
          {isPreview ? (
            <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.14em] text-white/38">
              Preview
            </span>
          ) : null}
        </div>

        <p className="max-w-xl text-[0.93rem] leading-6 text-white/64">
          {capture.description}
        </p>

        {isPreview ? (
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10.75rem]">
            <input
              disabled
              type="email"
              value="fan@example.com"
              readOnly
              className="min-h-11 rounded-[0.9rem] border border-[#d6cbb9] bg-[#f7f3eb] px-4 text-[15px] text-[#171a1f] opacity-80"
            />
            <button
              type="button"
              disabled
              className="inline-flex min-h-11 items-center justify-center rounded-[0.9rem] bg-[#f4efe4] px-5 text-sm font-semibold text-[#171a1f] opacity-80"
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
