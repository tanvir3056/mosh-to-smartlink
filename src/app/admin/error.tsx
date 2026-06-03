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
    <div className="bs-admin-theme min-h-screen bg-[var(--app-bg)] px-4 py-10 text-[var(--app-text)] sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-3xl items-center justify-center">
        <section className="app-card w-full max-w-[440px] rounded-[14px] px-6 py-8 text-center sm:px-8">
          <p className="app-kicker text-[var(--app-muted)]">Admin error</p>
          <h1 className="mt-4 font-[var(--font-display)] text-2xl font-semibold tracking-[-0.02em] text-[var(--app-text)]">
            This page hit a snag
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-[14.5px] leading-6 text-[var(--app-muted)]">
            The admin stayed up, but this screen could not finish loading. Try
            again, or sign in again if your session expired.
          </p>

          {error.digest ? (
            <p className="mt-5 font-mono text-xs uppercase tracking-[0.08em] text-[var(--app-muted-2)]">
              Reference: {error.digest}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col justify-center gap-2.5 sm:flex-row">
            <Button
              type="button"
              onClick={() => unstable_retry()}
            >
              Try again
            </Button>
            <Link
              href="/sign-in"
              className="inline-flex min-h-10 items-center justify-center rounded-[7px] border border-[var(--app-line)] bg-[var(--app-panel)] px-3.5 text-sm font-[550] text-[var(--app-text)] shadow-[var(--sh-xs)]"
            >
              Sign in again
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-10 items-center justify-center rounded-[7px] px-3.5 text-sm font-[550] text-[var(--app-muted)] transition hover:bg-[var(--app-panel-muted)] hover:text-[var(--app-text)]"
            >
              Back to home
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
