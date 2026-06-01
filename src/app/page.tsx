import Link from "next/link";
import { Link as LinkIcon, Plus, Sparkles } from "lucide-react";

import { ThemeToggle } from "@/components/admin/theme-toggle";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  return (
    <main className="bs-admin-theme flex min-h-screen flex-col bg-[var(--app-bg)] text-[var(--app-text)]">
      <header className="mx-auto flex w-full max-w-[1080px] items-center justify-between px-5 py-5 sm:px-8">
        <BrandLockup tagline={null} tone="light" />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/sign-in">
            <Button tone="ghost">Sign in</Button>
          </Link>
          <Link href="/sign-up">
            <Button>Create account</Button>
          </Link>
        </div>
      </header>

      <section className="flex flex-1 items-center justify-center px-5 py-8 sm:px-8">
        <div className="grid w-full max-w-[1080px] items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <div className="app-enter">
            <span className="app-chip border-[var(--app-accent-line)] bg-[var(--app-accent-soft)] text-[var(--app-accent-text)]">
              <Sparkles className="h-3.5 w-3.5" />
              For artists & teams
            </span>
            <h1 className="mt-5 max-w-2xl font-[var(--font-display)] text-[46px] font-semibold leading-[1.05] tracking-[-0.03em] text-[var(--app-text)]">
              A clean home for
              <br />
              every release.
            </h1>
            <p className="mt-5 max-w-[29rem] text-[17px] leading-7 text-[var(--app-muted)]">
              Backstage gives every artist a clean home for every release{" "}
              {"\u2014"} one smart link that points fans to every streaming service,
              with analytics and email capture built in.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/sign-up">
                <Button className="min-h-11 px-4">
                  <Plus className="h-4 w-4" />
                  Create account
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button tone="secondary" className="min-h-11 px-4">
                  Sign in
                </Button>
              </Link>
            </div>
            <div className="mt-6 flex items-center gap-2 text-[13.5px] text-[var(--app-muted-2)]">
              <LinkIcon className="h-4 w-4" />
              <span className="font-mono">
                backstage.fm/<span className="text-[var(--app-accent-text)]">username</span>/<span className="text-[var(--app-muted)]">song-slug</span>
              </span>
            </div>
          </div>

          <div className="app-card app-enter app-enter-delay-1 overflow-hidden rounded-[14px] p-0 shadow-[0_8px_24px_oklch(0.2_0.02_270_/_0.10),0_2px_6px_oklch(0.2_0.02_270_/_0.06)]">
            <div className="flex items-center gap-2 border-b border-[var(--app-line)] px-5 py-4">
              <Sparkles className="h-4 w-4 text-[var(--app-accent-text)]" />
              <h2 className="text-[14.5px] font-semibold">How it works</h2>
            </div>
            <div className="p-2">
              {[
                ["Paste a Spotify link", "We pull artwork, metadata and matching services."],
                ["Review & tune", "Confirm links, set your slug, add email capture."],
                ["Publish one link", "Share a page that works on every service."],
              ].map(([title, body], index) => (
                <div
                  key={title}
                  className="flex items-center gap-3 rounded-[10px] px-3 py-3"
                >
                  <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-[var(--app-accent-soft)] text-[var(--app-accent-text)]">
                    {index + 1}
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-[var(--app-text)]">
                      {title}
                    </div>
                    <p className="mt-0.5 text-[12.5px] text-[var(--app-muted)]">
                      {body}
                    </p>
                  </div>
                  <span className="ml-auto font-mono text-xs text-[var(--app-muted-2)]">
                    0{index + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
