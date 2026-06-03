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
      <body className="bs-admin-theme min-h-full bg-[var(--app-bg)] text-[var(--app-text)]">
        <main className="flex min-h-screen items-center justify-center px-6 py-10 text-center">
          <section className="app-enter w-full max-w-[440px]">
            <title>Backstage</title>
            <div className="mx-auto mb-5 flex h-[60px] w-[60px] items-center justify-center rounded-[var(--r-lg)] border border-[var(--app-amber-line)] bg-[var(--app-amber-soft)] text-[var(--app-amber-text)]">
              !
            </div>
            <p className="app-kicker text-[var(--app-muted)]">Continue to your account</p>
            <h1 className="mt-3 font-[var(--font-display)] text-2xl font-semibold tracking-[-0.02em]">
              Backstage gives every artist a clean home for every release.
            </h1>
            <p className="mt-2.5 text-[14.5px] leading-6 text-[var(--app-muted)]">
              The app ran into an unexpected error. Your data is safe. Sign in
              first, open the homepage, or reload the page.
            </p>
            {error.digest ? (
              <p className="mt-5 font-mono text-xs uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
                Reference: {error.digest}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap justify-center gap-2.5">
              <a
                href="/sign-in"
                className="inline-flex min-h-10 items-center justify-center rounded-[var(--r-sm)] border border-transparent bg-[var(--app-accent)] px-3.5 text-sm font-[550] text-[var(--app-text-on)] shadow-[var(--sh-xs)]"
              >
                Sign in
              </a>
              <a
                href="/"
                className="inline-flex min-h-10 items-center justify-center rounded-[var(--r-sm)] border border-[var(--app-line)] bg-[var(--app-panel)] px-3.5 text-sm font-[550] text-[var(--app-text)] shadow-[var(--sh-xs)]"
              >
                Open homepage
              </a>
              <button
                type="button"
                onClick={reloadPage}
                className="inline-flex min-h-10 items-center justify-center rounded-[var(--r-sm)] border border-transparent bg-transparent px-3.5 text-sm font-[550] text-[var(--app-muted)] hover:bg-[var(--app-panel-muted)] hover:text-[var(--app-text)]"
              >
                Reload page
              </button>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
