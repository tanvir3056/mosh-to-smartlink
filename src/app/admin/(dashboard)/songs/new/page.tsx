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
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(420px,480px)] xl:items-start">
      <div className="order-2 grid gap-5 xl:order-1">
        <div className="app-card app-enter rounded-[1.85rem] p-5 sm:p-6 lg:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="app-kicker text-[var(--app-muted)]">Import</span>
            <span className="app-chip">Spotify</span>
            <span className="app-chip">Draft first</span>
            <span className="app-chip">Review required</span>
          </div>

          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-[var(--app-text)] sm:text-[3.35rem] sm:leading-[0.98]">
            Import released track
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--app-muted)] sm:text-[15px]">
            Paste one Spotify track URL. Backstage pulls metadata, artwork, preview,
            and available service links, then sends you straight into review.
          </p>

          <div className="mt-8 grid gap-3 lg:grid-cols-3">
            {checkpoints.map((item, index) => (
              <div
                key={item.title}
                className="app-card-soft rounded-[1.35rem] px-4 py-4 sm:px-5"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-[var(--app-line)] bg-white px-2 text-[11px] font-semibold text-[var(--app-text)] shadow-[0_4px_12px_rgba(11,14,19,0.04)]">
                    0{index + 1}
                  </span>
                  <p className="text-sm font-semibold text-[var(--app-text)]">
                    {item.title}
                  </p>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--app-muted)]">
                  {item.body}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-[1.35rem] border border-[var(--app-line)] bg-white/78 px-4 py-4 text-sm text-[var(--app-muted)]">
            <span className="app-kicker text-[var(--app-muted)]">Workspace</span>
            <span className="font-semibold text-[var(--app-text)]">@{session.username}</span>
            <span className="hidden h-1 w-1 rounded-full bg-[var(--app-line-strong)] sm:inline-flex" />
            <span>Drafts stay private until publish.</span>
          </div>
        </div>
      </div>

      <div className="order-1 app-card app-enter app-enter-delay-2 rounded-[1.85rem] p-5 sm:p-6 xl:order-2 xl:sticky xl:top-6">
        <div className="mb-5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="app-kicker text-[var(--app-muted)]">Spotify track URL</p>
            <span className="app-chip">Main action</span>
          </div>
          <h2 className="mt-3 text-[1.9rem] font-semibold tracking-[-0.04em] text-[var(--app-text)]">
            Paste link
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--app-muted)]">
            One valid track link creates the draft and opens review.
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-[var(--app-line)] bg-[rgba(255,255,255,0.8)] p-4 shadow-[0_1px_0_rgba(255,255,255,0.74)_inset] sm:p-5">
          <ImportSongForm requestedBy={`@${session.username}`} />
        </div>
      </div>
    </section>
  );
}
