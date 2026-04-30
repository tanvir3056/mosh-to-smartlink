"use client";

import { useEffect } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("Admin route failed to render.", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[var(--app-surface)] px-4 py-10 text-[var(--app-text)] sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-3xl items-center justify-center">
        <section className="app-card w-full rounded-[2rem] px-6 py-8 text-center sm:px-10 sm:py-10">
          <p className="app-kicker text-[var(--app-muted)]">Admin error</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[var(--app-text)] sm:text-4xl">
            This page hit a temporary problem.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[var(--app-muted)] sm:text-base">
            The admin stayed up, but this screen could not finish loading. Try
            again, or sign in again if your session expired.
          </p>

          {error.digest ? (
            <p className="mt-5 text-xs uppercase tracking-[0.18em] text-[var(--app-muted)]">
              Ref {error.digest}
            </p>
          ) : null}

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              type="button"
              onClick={() => unstable_retry()}
              className="shadow-none"
            >
              Try again
            </Button>
            <Link
              href="/sign-in"
              className="app-interactive inline-flex min-h-11 items-center justify-center rounded-2xl border border-[var(--app-line)] bg-white px-4 text-sm font-semibold text-[var(--app-text)] shadow-[0_1px_0_rgba(255,255,255,0.7)_inset]"
            >
              Sign in again
            </Link>
            <Link
              href="/"
              className="app-interactive inline-flex min-h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold text-[var(--app-muted)]"
            >
              Back to home
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
