import Link from "next/link";

import { BrandLockup } from "@/components/brand/brand-lockup";
import { Button } from "@/components/ui/button";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";

export default async function HomePage() {
  return (
    <main className="deathcore-field relative mx-auto flex min-h-screen w-full flex-col justify-center overflow-hidden px-5 py-8 sm:px-8 sm:py-12">
      <div className="absolute left-1/2 top-8 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full border border-[#eee6d6]/8" />
      <section className="deathcore-shell app-enter relative mx-auto w-full max-w-6xl rounded-[1.4rem] p-3 sm:p-4">
        <div className="grid gap-8 rounded-[1.1rem] bg-[linear-gradient(180deg,#101012,#08080a)] p-6 sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:p-10">
          <div className="flex flex-col justify-between">
            <div>
              <BrandLockup
                includeDomain
                tagline="Smart release links, destination review, and first-party campaign visibility for every artist account."
              />
              <p className="mt-8 app-kicker text-[#c9bda9]">Release links for real teams</p>
              <h1 className="mt-3 max-w-3xl font-[var(--font-display)] text-5xl font-semibold leading-[0.92] text-[#fff9ec] sm:text-6xl">
                {APP_NAME} gives every artist a clean home for every release.
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-[#c9c0b2] sm:text-base">
                {APP_DESCRIPTION} Create an account, import a track, review the destinations, and share a per-artist smart link like{" "}
                <code className="rounded-full border border-[#eee6d6]/12 bg-[#eee6d6]/10 px-2.5 py-1 text-[#fff9ec]">
                  /username/song-slug
                </code>.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/sign-up">
                <Button>Create account</Button>
              </Link>
              <Link href="/sign-in">
                <Button tone="secondary" className="border-[#eee6d6]/14 bg-[#eee6d6]/8 text-[#fff9ec] hover:bg-[#eee6d6]/12">
                  Sign in
                </Button>
              </Link>
            </div>
          </div>

          <div className="deathcore-bone-panel app-enter app-enter-delay-1 rounded-[1.05rem] border border-[#eee6d6]/24 p-5 shadow-[0_20px_48px_rgba(0,0,0,0.28)] sm:p-6">
            <p className="app-kicker text-[#8f1420]">How it works</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-[#111113]">
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
                  className="rounded-[0.55rem] border border-[#b9ac99] bg-[#f8f1e3] px-4 py-4 text-sm font-medium leading-7 text-[#111113] shadow-[0_1px_0_rgba(255,255,255,0.75)_inset]"
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
