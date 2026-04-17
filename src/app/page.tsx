import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BrandLockup } from "@/components/brand/brand-lockup";
import { Button } from "@/components/ui/button";
import { APP_DESCRIPTION, APP_DOMAIN_HINT, APP_NAME } from "@/lib/constants";
import { listPublishedPages } from "@/lib/data";
import { getDatabaseMode } from "@/lib/db/driver";
import { appEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [pages, databaseMode] = await Promise.all([
    listPublishedPages(),
    getDatabaseMode(),
  ]);

  if (pages.length === 1) {
    redirect(`/${pages[0].slug}`);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-8 sm:px-8 sm:py-12">
      <div className="app-card rounded-[2rem] px-6 py-10">
        <BrandLockup includeDomain tagline="Smart release pages for artists running paid traffic." />
        <div className="mt-6 inline-flex rounded-full border border-[var(--app-line)] bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--app-muted)]">
          Working domain direction: {APP_DOMAIN_HINT}
        </div>
        <h1 className="mt-5 max-w-3xl font-[var(--font-display)] text-5xl font-semibold leading-[0.94] tracking-[-0.04em] text-[var(--app-text)] sm:text-6xl">
          A quieter place to run every release.
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--app-muted)] sm:text-base">
          {APP_NAME} keeps the fan page polished, the routing clean, and the
          attribution first-party. {APP_DESCRIPTION}
        </p>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link href="/admin">
            <Button>Open admin dashboard</Button>
          </Link>
          {pages[0] ? (
            <Link href={`/${pages[0].slug}`}>
              <Button tone="secondary">Preview latest song page</Button>
            </Link>
          ) : null}
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <div className="app-card-soft rounded-[1.5rem] p-5">
            <div className="app-kicker">
              Runtime
            </div>
            <div className="mt-3 text-2xl font-semibold text-[var(--app-text)]">
              {databaseMode === "local" ? "Local Postgres mode" : "Postgres mode"}
            </div>
            <p className="mt-2 text-sm text-[var(--app-muted)]">
              {databaseMode === "local"
                ? "Running on the embedded local database for development and verification."
                : "Connected to the configured Postgres database."}
            </p>
          </div>

          <div className="app-card-soft rounded-[1.5rem] p-5">
            <div className="app-kicker">
              Admin auth
            </div>
            <div className="mt-3 text-2xl font-semibold text-[var(--app-text)]">
              {appEnv.hasSupabaseAuth ? "Supabase Auth" : "Local demo auth"}
            </div>
            <p className="mt-2 text-sm text-[var(--app-muted)]">
              {appEnv.hasSupabaseAuth
                ? "Production sign-in is handled through Supabase Auth and a single allowed admin account."
                : "Supabase env vars are missing, so development falls back to a local-only admin sign-in path."}
            </p>
          </div>

          <div className="app-card-soft rounded-[1.5rem] p-5">
            <div className="app-kicker">
              Published pages
            </div>
            <div className="mt-3 text-2xl font-semibold text-[var(--app-text)]">
              {pages.length}
            </div>
            <p className="mt-2 text-sm text-[var(--app-muted)]">
              Import your first released track from the admin dashboard and publish
              when the service links are reviewed.
            </p>
          </div>
        </div>

        {pages.length > 1 ? (
          <div className="app-card-soft mt-10 rounded-[1.5rem] p-5">
            <div className="app-kicker">
              Live song pages
            </div>
            <div className="mt-4 grid gap-3">
              {pages.map((page) => (
                <Link
                  key={page.slug}
                  href={`/${page.slug}`}
                  className="flex items-center gap-4 rounded-[1.25rem] border border-[var(--app-line)] bg-white/86 p-3 transition hover:bg-white"
                >
                  <Image
                    src={page.artwork_url}
                    alt=""
                    width={56}
                    height={56}
                    className="h-14 w-14 rounded-xl object-cover"
                    unoptimized={page.artwork_url.startsWith("data:")}
                  />
                  <div>
                    <div className="font-medium text-[var(--app-text)]">{page.title}</div>
                    <div className="text-sm text-[var(--app-muted)]">{page.artist_name}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
