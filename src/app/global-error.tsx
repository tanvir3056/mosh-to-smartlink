"use client";

import { useEffect } from "react";
import Link from "next/link";

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

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[var(--app-bg)] text-[var(--app-text)]">
        <main className="flex min-h-screen items-center justify-center px-5 py-10">
          <section className="app-card w-full max-w-xl rounded-[2rem] px-6 py-8 text-center sm:px-10 sm:py-10">
            <title>Backstage error</title>
            <p className="app-kicker text-[var(--app-muted)]">Temporary error</p>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[var(--app-text)] sm:text-4xl">
              Backstage hit a temporary problem.
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-[var(--app-muted)] sm:text-base">
              The app could not finish loading this screen. Try again first, or return
              home if the issue keeps happening.
            </p>

            {error.digest ? (
              <p className="mt-5 text-xs uppercase tracking-[0.18em] text-[var(--app-muted)]">
                Ref {error.digest}
              </p>
            ) : null}

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => unstable_retry()}
                className="app-interactive inline-flex min-h-11 items-center justify-center rounded-2xl border border-[rgba(6,44,40,0.06)] bg-[linear-gradient(135deg,var(--app-accent)_0%,#77e7db_100%)] px-4 text-sm font-semibold text-[#062c28] shadow-[0_14px_30px_rgba(63,212,196,0.22),0_1px_0_rgba(255,255,255,0.45)_inset]"
              >
                Try again
              </button>
              <Link
                href="/"
                className="app-interactive inline-flex min-h-11 items-center justify-center rounded-2xl border border-[var(--app-line)] bg-white px-4 text-sm font-semibold text-[var(--app-text)] shadow-[0_1px_0_rgba(255,255,255,0.7)_inset]"
              >
                Return home
              </Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
