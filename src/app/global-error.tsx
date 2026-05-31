"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Root error recovery must bypass Next client routing when the router/runtime is the failing layer. */
import { useEffect } from "react";

import "./globals.css";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("Root application render failed.", error);
  }, [error]);

  useEffect(() => {
    try {
      const recoveryKey = `backstage-root-recovery:${window.location.pathname}:${error.digest ?? "no-digest"}`;

      if (window.sessionStorage.getItem(recoveryKey) === "tried") {
        return;
      }

      window.sessionStorage.setItem(recoveryKey, "tried");
      const recoveryUrl = new URL(window.location.href);
      recoveryUrl.searchParams.set("recover", Date.now().toString());
      window.location.replace(recoveryUrl.toString());
    } catch (recoveryError) {
      console.warn("Root application recovery reload was skipped.", recoveryError);
    }
  }, [error.digest]);

  const reloadPage = () => {
    if (typeof window === "undefined") {
      unstable_retry();
      return;
    }

    window.location.reload();
  };

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[var(--app-bg)] text-[var(--app-text)]">
        <main className="deathcore-field relative mx-auto flex min-h-screen w-full flex-col justify-center overflow-hidden px-5 py-8 sm:px-8 sm:py-12">
          <div className="absolute left-1/2 top-8 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full border border-[#eee6d6]/8" />
          <section className="deathcore-shell app-enter relative mx-auto w-full max-w-6xl rounded-[1.4rem] p-3 sm:p-4">
            <title>Backstage</title>
            <div className="grid gap-8 rounded-[1.1rem] bg-[linear-gradient(180deg,#101012,#08080a)] p-6 sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:p-10">
              <div className="flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-[1.1rem] border border-white/12 bg-black/40 text-xl font-semibold text-white shadow-[0_20px_40px_rgba(0,0,0,0.3)] backdrop-blur-md">
                      B
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold uppercase tracking-[0.18em] text-white">
                          Backstage
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/72">
                          backstage.to
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-white/60">
                        Smart release links, destination review, and first-party campaign visibility for every artist account.
                      </p>
                    </div>
                  </div>
                  <p className="mt-8 app-kicker text-[#c9bda9]">Release links for real teams</p>
                  <h1 className="mt-3 max-w-3xl font-[var(--font-display)] text-5xl font-semibold leading-[0.92] text-[#fff9ec] sm:text-6xl">
                    Backstage gives every artist a clean home for every release.
                  </h1>
                  <p className="mt-5 max-w-2xl text-sm leading-7 text-[#c9c0b2] sm:text-base">
                    The page is refreshing a stale browser state. You can continue from here, or reload once to fetch the newest app shell.
                  </p>
                </div>
              </div>

              <div className="deathcore-bone-panel app-enter app-enter-delay-1 rounded-[1.05rem] border border-[#eee6d6]/24 p-5 shadow-[0_20px_48px_rgba(0,0,0,0.28)] sm:p-6">
                <p className="app-kicker text-[#8f1420]">Continue</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-[#111113]">
                  Open the latest Backstage app shell
                </h2>
                <p className="mt-4 text-sm font-medium leading-7 text-[#38332a]">
                  This fallback uses normal browser links, so it still works if the Next.js client router is recovering from an old deploy.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <a
                    href="/"
                    className="app-interactive inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#cdbf9e] bg-[#111113] px-4 text-sm font-semibold text-[#fff9ec] shadow-[0_1px_0_rgba(255,255,255,0.18)_inset]"
                  >
                    Open homepage
                  </a>
                  <a
                    href="/sign-in"
                    className="app-interactive inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#cdbf9e] bg-[#f8f1e3] px-4 text-sm font-semibold text-[#111113] shadow-[0_1px_0_rgba(255,255,255,0.75)_inset]"
                  >
                    Sign in
                  </a>
                </div>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={reloadPage}
                    className="app-interactive inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#cdbf9e] bg-white px-4 text-sm font-semibold text-[#111113] shadow-[0_1px_0_rgba(255,255,255,0.75)_inset]"
                  >
                    Reload page
                  </button>
                </div>
              </div>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
