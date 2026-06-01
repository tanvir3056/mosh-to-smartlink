import Link from "next/link";

export default function AdminPreviewNotFound() {
  return (
    <main className="bs-admin-theme flex min-h-screen items-center justify-center bg-[var(--app-bg)] px-5 py-10">
      <section className="app-card w-full max-w-md rounded-[18px] p-7 text-center shadow-[0_24px_70px_rgba(20,24,34,0.12)]">
        <p className="app-kicker text-[var(--app-muted)]">Preview unavailable</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-[var(--app-text)]">
          Preview could not be opened.
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--app-muted)]">
          This draft may have been deleted, moved to another account, or opened from an
          old browser state.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            href="/admin"
            className="app-interactive inline-flex min-h-10 items-center justify-center rounded-[7px] bg-[var(--app-accent)] px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(76,75,219,0.18)]"
            style={{ color: "#fff", WebkitTextFillColor: "#fff" }}
          >
            Back to library
          </Link>
          <Link
            href="/admin/songs/new"
            className="app-interactive inline-flex min-h-10 items-center justify-center rounded-[7px] border border-[var(--app-line)] bg-[var(--app-panel)] px-4 text-sm font-semibold text-[var(--app-text)]"
          >
            Import song
          </Link>
        </div>
      </section>
    </main>
  );
}
