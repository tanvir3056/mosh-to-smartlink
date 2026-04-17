import { ImportSongForm } from "@/components/admin/import-song-form";
import { requireAdminSession } from "@/lib/auth";

export default async function NewSongPage() {
  const session = await requireAdminSession();

  return (
    <section className="grid gap-5">
      <div className="app-card rounded-[1.75rem] p-5">
        <p className="app-kicker">
          Create song page
        </p>
        <h2 className="mt-3 text-3xl font-semibold text-[var(--app-text)]">
          Import from one Spotify track URL
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--app-muted)]">
          The importer fetches Spotify metadata, artwork, and preview when available,
          then attempts free-only best-effort matching across Apple Music, YouTube
          Music, Amazon Music, Deezer, and TIDAL. Every result still lands on a
          manual review screen before publish.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            "1. Paste one released Spotify track URL",
            "2. Review links and optionally replace artwork",
            "3. Publish and copy the live fan page URL",
          ].map((step) => (
            <div
              key={step}
              className="app-card-soft rounded-[1.2rem] px-4 py-3 text-sm text-[var(--app-text)]"
            >
              {step}
            </div>
          ))}
        </div>
      </div>

      <div className="app-card rounded-[1.75rem] p-5">
        <ImportSongForm requestedBy={session.email} />
      </div>
    </section>
  );
}
