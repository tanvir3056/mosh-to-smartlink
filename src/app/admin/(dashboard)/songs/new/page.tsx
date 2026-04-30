import { ImportSongForm } from "@/components/admin/import-song-form";
import { requireUserSession } from "@/lib/auth";

export default async function NewSongPage() {
  const session = await requireUserSession();

  const checkpoints = [
    {
      step: "01",
      title: "Paste Spotify link",
      body: "One released track URL creates the draft.",
    },
    {
      step: "02",
      title: "Review links",
      body: "Fix missing services or hide anything you do not need.",
    },
    {
      step: "03",
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
            Start a new song page
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--app-muted)] sm:text-[15px]">
            Paste one released Spotify track URL. Backstage pulls the metadata,
            artwork, preview, and available service links, then drops you into review.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {checkpoints.map((item) => (
              <div
                key={item.step}
                className="app-card-soft rounded-[1.35rem] px-4 py-4 sm:min-h-[152px]"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-[var(--app-line)] bg-white px-2 text-xs font-semibold text-[var(--app-text)]">
                    {item.step}
                  </span>
                  <div className="text-sm font-semibold text-[var(--app-text)]">
                    {item.title}
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-[var(--app-muted)]">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="app-card app-enter app-enter-delay-1 rounded-[1.75rem] px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="app-kicker text-[var(--app-muted)]">Review flow</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--app-text)]">
                Import first. Decide what goes live after.
              </h2>
            </div>
            <div className="app-card-soft rounded-[1.25rem] px-4 py-3 text-sm text-[var(--app-text)]">
              Requested by <span className="font-semibold">@{session.username}</span>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="app-note rounded-[1.25rem] px-4 py-4 text-sm leading-6">
              Missing services can stay on search fallback or be replaced with manual links
              before publish.
            </div>
            <div className="app-note rounded-[1.25rem] px-4 py-4 text-sm leading-6">
              You can also hide any service that should not appear on the public page.
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

        <div className="app-card-soft rounded-[1.4rem] p-4">
          <ImportSongForm requestedBy={`@${session.username}`} />
        </div>
      </div>
    </section>
  );
}
