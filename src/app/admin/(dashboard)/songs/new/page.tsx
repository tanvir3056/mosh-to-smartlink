import Link from "next/link";
import {
  Check,
  ChevronLeft,
  ImageIcon,
  Link2,
  ListMusic,
  Play,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { ImportSongForm } from "@/components/admin/import-song-form";
import { requireUserSession } from "@/lib/auth";

const stages = [
  {
    title: "Metadata",
    body: "Title, artist, album",
    icon: ListMusic,
  },
  {
    title: "Artwork",
    body: "Cover image",
    icon: ImageIcon,
  },
  {
    title: "Preview",
    body: "30-second clip",
    icon: Play,
  },
  {
    title: "Streaming links",
    body: "Matched across services",
    icon: Link2,
  },
];

export default async function NewSongPage() {
  const session = await requireUserSession();

  return (
    <section className="app-enter mx-auto grid w-full max-w-[760px] gap-[18px]">
      <Link
        href="/admin"
        className="inline-flex w-fit items-center gap-1.5 text-[13px] text-[var(--app-muted-2)] transition hover:text-[var(--app-text)]"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Overview
      </Link>

      <header>
        <h1 className="font-[var(--font-display)] text-[25px] font-semibold tracking-[-0.022em]">
          Import a song
        </h1>
        <p className="mt-1.5 max-w-[620px] text-[14.5px] leading-6 text-[var(--app-muted)]">
          Paste a Spotify link and Backstage builds the release page for you.
          Nothing goes live until you publish.
        </p>
      </header>

      <section className="app-card rounded-[14px] p-6">
        <ImportSongForm requestedBy={`@${session.username}`} />
      </section>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[14.5px] font-semibold">What we pull in</h2>
        <span className="app-chip border-[var(--app-accent-line)] bg-[var(--app-accent-soft)] text-[var(--app-accent-text)]">
          <Sparkles className="h-3.5 w-3.5" />
          Ready to import
        </span>
      </div>

      <section className="grid gap-3 sm:grid-cols-2">
        {stages.map((stage) => {
          const Icon = stage.icon;

          return (
            <div
              key={stage.title}
              className="flex items-center gap-3 rounded-[10px] border border-[var(--app-line)] bg-[var(--app-panel-muted)] px-3.5 py-3"
            >
              <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[8px] bg-[var(--app-panel)] text-[var(--app-muted-2)] shadow-[0_1px_2px_oklch(0.2_0.02_270_/_0.05)]">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="text-[13.5px] font-semibold text-[var(--app-text)]">
                  {stage.title}
                </div>
                <div className="text-[11.5px] text-[var(--app-muted-2)]">
                  {stage.body}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="app-card bg-[var(--app-panel-muted)] rounded-[14px] p-5">
        <div className="flex gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] border border-[var(--app-line)] bg-[var(--app-panel)] text-[var(--app-accent-text)]">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">Importing never publishes anything</h2>
            <p className="mt-1 text-[13px] leading-6 text-[var(--app-muted)]">
              We create a private draft you can edit freely. You choose the slug,
              confirm each streaming link, and decide exactly when it goes live.
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--app-green-text)]">
              <Check className="h-3.5 w-3.5" />
              Drafts stay private for @{session.username}
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
