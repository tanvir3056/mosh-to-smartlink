import { ImportSongForm } from "@/components/admin/import-song-form";
import { requireUserSession } from "@/lib/auth";

export default async function NewSongPage() {
  const session = await requireUserSession();

  const checkpoints = [
    {
      title: "Paste Spotify link",
      body: "One released track URL creates the draft.",
    },
    {
      title: "Review links",
      body: "Fix missing services or hide anything you do not need.",
    },
    {
      title: "Publish when ready",
      body: "Nothing goes live until you press Publish.",
    },
  ];

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(400px,460px)] xl:items-start">
      <div className="order-2 grid gap-5 xl:order-1">
        <div className="app-card app-enter rounded-[1.85rem] p-5 sm:p-6 lg:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="app-kicker text-[var(--app-muted)]">Import</span>
            <span className="app-chip">Spotify only</span>
            <span className="app-chip">Draft first</span>
          </div>

          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-[var(--app-text)] sm:text-[3.35rem] sm:leading-[0.98]">
            Import released track
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--app-muted)] sm:text-[15px]">
            Paste one Spotify track URL. Backstage pulls metadata, artwork, preview,
            and available service links, then sends you straight into review.
          </p>

          <div className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <div className="app-card-soft rounded-[1.5rem] px-4 py-4 sm:px-5 sm:py-5">
              <p className="app-kicker text-[var(--app-muted)]">What happens next</p>
              <div className="mt-4 grid gap-3">
                {checkpoints.map((item, index) => (
                  <div
                    key={item.title}
                    className="grid gap-1 rounded-[1.15rem] border border-[var(--app-line)] bg-white/80 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-[var(--app-line)] bg-[var(--app-panel-muted)] px-2 text-[11px] font-semibold text-[var(--app-text)]">
                        0{index + 1}
                      </span>
                      <p className="text-sm font-semibold text-[var(--app-text)]">
                        {item.title}
                      </p>
                    </div>
                    <p className="pl-10 text-sm leading-6 text-[var(--app-muted)]">
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3">
              <div
                className="app-card-soft rounded-[1.35rem] px-4 py-4 sm:px-5"
              >
                <p className="app-kicker text-[var(--app-muted)]">Requested by</p>
                <p className="mt-3 text-xl font-semibold tracking-[-0.03em] text-[var(--app-text)]">
                  @{session.username}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">
                  Drafts stay inside your workspace until you publish.
                </p>
              </div>

              <div className="app-note rounded-[1.35rem] px-4 py-4 text-sm leading-6 sm:px-5">
                Missing services can stay on search fallback, be replaced with manual
                links, or be hidden before publish.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="order-1 app-card app-enter app-enter-delay-2 rounded-[1.85rem] p-5 sm:p-6 xl:order-2 xl:sticky xl:top-6">
        <div className="mb-5">
          <p className="app-kicker text-[var(--app-muted)]">Spotify track URL</p>
          <h2 className="mt-3 text-[1.9rem] font-semibold tracking-[-0.04em] text-[var(--app-text)]">
            Paste link
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--app-muted)]">
            One link creates the draft. Review starts immediately after import.
          </p>
        </div>

        <div className="app-card-soft rounded-[1.4rem] p-4 sm:p-5">
          <ImportSongForm requestedBy={`@${session.username}`} />
        </div>
      </div>
    </section>
  );
}
