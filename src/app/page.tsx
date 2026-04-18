import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BrandLockup } from "@/components/brand/brand-lockup";
import { Button } from "@/components/ui/button";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";
import { listPublishedPages } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const pages = await listPublishedPages();

  if (pages.length === 1) {
    redirect(`/${pages[0].slug}`);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-5 py-8 sm:px-8 sm:py-12">
      <section className="app-shell-card rounded-[2rem] p-3 sm:p-4">
        <div className="grid gap-8 rounded-[1.7rem] bg-[linear-gradient(180deg,#10141b,#0b0f15)] p-6 sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:p-10">
          <div className="flex flex-col justify-between">
            <div>
              <BrandLockup
                includeDomain
                tagline="Private release control for one artist, one catalog, and one clean paid-traffic workflow."
              />
              <p className="mt-8 app-kicker text-white/40">Admin gateway</p>
              <h1 className="mt-3 max-w-3xl font-[var(--font-display)] text-5xl font-semibold leading-[0.92] tracking-[-0.05em] text-white sm:text-6xl">
                {APP_NAME} gives your releases one polished page and one source of truth.
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/62 sm:text-base">
                {APP_DESCRIPTION}
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/admin/sign-in">
                <Button>Open admin dashboard</Button>
              </Link>
              {pages[0] ? (
                <Link href={`/${pages[0].slug}`}>
                  <Button tone="secondary" className="border-white/10 bg-white/4 text-white hover:bg-white/8">
                    Preview latest live page
                  </Button>
                </Link>
              ) : null}
            </div>
          </div>

          <div className="app-card rounded-[1.8rem] p-5 sm:p-6">
            <p className="app-kicker text-[var(--app-muted)]">Published pages</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--app-text)]">
              {pages.length ? "Current live release links" : "No live pages yet"}
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--app-muted)]">
              {pages.length
                ? "Open a live page directly or head into the admin to import the next track."
                : "Import your first released song from the admin dashboard to create a fan-facing smart link."}
            </p>

            {pages.length ? (
              <div className="mt-6 grid gap-3">
                {pages.map((page) => (
                  <Link
                    key={page.slug}
                    href={`/${page.slug}`}
                    className="flex items-center gap-4 rounded-[1.2rem] border border-[var(--app-line)] bg-white px-4 py-3 transition hover:bg-[var(--app-panel-muted)]"
                  >
                    <Image
                      src={page.artwork_url}
                      alt=""
                      width={56}
                      height={56}
                      className="h-14 w-14 rounded-xl object-cover"
                      unoptimized={page.artwork_url.startsWith("data:")}
                    />
                    <div className="min-w-0">
                      <div className="truncate font-medium text-[var(--app-text)]">
                        {page.title}
                      </div>
                      <div className="truncate text-sm text-[var(--app-muted)]">
                        {page.artist_name}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-[1.3rem] border border-dashed border-[var(--app-line)] px-4 py-10 text-center text-sm text-[var(--app-muted)]">
                No live release links yet.
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
