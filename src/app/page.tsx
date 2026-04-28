import Link from "next/link";

import { BrandLockup } from "@/components/brand/brand-lockup";
import { Button } from "@/components/ui/button";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";

export default async function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-5 py-8 sm:px-8 sm:py-12">
      <section className="app-shell-card rounded-[2rem] p-3 sm:p-4">
        <div className="grid gap-8 rounded-[1.7rem] bg-[linear-gradient(180deg,#10141b,#0b0f15)] p-6 sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:p-10">
          <div className="flex flex-col justify-between">
            <div>
              <BrandLockup
                includeDomain
                tagline="Smart release links, destination review, and first-party campaign visibility for every artist account."
              />
              <p className="mt-8 app-kicker text-white/40">Release links for real teams</p>
              <h1 className="mt-3 max-w-3xl font-[var(--font-display)] text-5xl font-semibold leading-[0.92] tracking-[-0.05em] text-white sm:text-6xl">
                {APP_NAME} gives every artist a clean home for every release.
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/62 sm:text-base">
                {APP_DESCRIPTION} Create an account, import a track, review the destinations, and share a per-artist smart link like{" "}
                <code className="rounded-full bg-white/8 px-2.5 py-1 text-white/82">
                  /username/song-slug
                </code>.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/sign-up">
                <Button>Create account</Button>
              </Link>
              <Link href="/sign-in">
                <Button tone="secondary" className="border-white/10 bg-white/4 text-white hover:bg-white/8">
                  Sign in
                </Button>
              </Link>
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-black/6 bg-[linear-gradient(180deg,#f6f3ed_0%,#efebe1_100%)] p-5 shadow-[0_20px_48px_rgba(8,12,18,0.12)] sm:p-6">
            <p className="app-kicker text-[#727b88]">How it works</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--app-text)]">
              One app, many artists, clean release links
            </h2>
            <div className="mt-6 grid gap-3">
              {[
                "Create a username and password in seconds.",
                "Import one released Spotify track per page.",
                "Review links, swap artwork, then publish.",
                "Share public pages on per-user paths instead of one global slug pool.",
              ].map((line) => (
                <div
                  key={line}
                  className="rounded-[1.2rem] border border-black/7 bg-[#fbfaf7] px-4 py-4 text-sm leading-7 text-[var(--app-text)] shadow-[0_1px_0_rgba(255,255,255,0.8)_inset]"
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
