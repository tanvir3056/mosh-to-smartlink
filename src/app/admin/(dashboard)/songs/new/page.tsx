import { ImportSongForm } from "@/components/admin/import-song-form";
import { requireUserSession } from "@/lib/auth";

export default async function NewSongPage() {
  const session = await requireUserSession();

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)] xl:items-start">
      <div className="order-2 app-card app-enter rounded-[1.75rem] p-5 sm:p-6 xl:order-1 xl:sticky xl:top-6">
        <p className="app-kicker text-[var(--app-muted)]">Import</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-[var(--app-text)]">
          Start a new song page
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--app-muted)]">
          Paste one released Spotify track URL. The importer pulls metadata, artwork,
          and preview, then sends you straight into review before anything goes live.
        </p>

        <div className="mt-6 grid gap-3">
          {[
            {
              title: "Spotify first",
              body: "One track URL is enough to create the draft.",
            },
            {
              title: "Review before publish",
              body: "Fix service links or swap artwork before the public page is live.",
            },
            {
              title: "Requested by",
              body: `@${session.username}`,
            },
          ].map((step, index) => (
            <div
              key={step.title}
              className="rounded-[1.2rem] border border-[var(--app-line)] bg-white px-4 py-4"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-[var(--app-line)] bg-[var(--app-panel-muted)] px-2 text-xs font-semibold text-[var(--app-text)]">
                  0{index + 1}
                </span>
                <div className="text-sm font-semibold text-[var(--app-text)]">
                  {step.title}
                </div>
              </div>
              <div className="mt-3 text-sm leading-7 text-[var(--app-muted)]">
                {step.body}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="order-1 app-card app-enter app-enter-delay-1 rounded-[1.75rem] p-5 sm:p-6 xl:order-2">
        <ImportSongForm requestedBy={`@${session.username}`} />
      </div>
    </section>
  );
}
