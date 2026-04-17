import Link from "next/link";

import { signOutAction } from "@/app/admin/actions";
import { AdminNav } from "@/components/admin/admin-nav";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { Button } from "@/components/ui/button";
import { APP_DOMAIN_HINT } from "@/lib/constants";
import { requireAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireAdminSession();

  return (
    <div className="mx-auto min-h-screen w-full max-w-7xl px-4 py-4 sm:px-8 sm:py-8">
      <div className="overflow-hidden rounded-[2.25rem] border border-[var(--app-line)] bg-[linear-gradient(180deg,rgba(231,238,228,0.96),rgba(246,249,242,0.78))] shadow-[0_24px_70px_rgba(63,84,69,0.08)] backdrop-blur-xl">
        <div className="flex flex-col gap-5 px-5 py-6 lg:flex-row lg:items-end lg:justify-between sm:px-8 sm:py-8">
          <div>
            <BrandLockup includeDomain tagline="Private release-link ops for one artist, one catalog, and one source of truth." />
            <h1 className="mt-5 font-[var(--font-display)] text-4xl font-semibold tracking-[-0.04em] text-[var(--app-text)]">
              Release control room
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--app-muted)]">
              Import a Spotify release, review the links, publish the fan-facing
              page, and track what happens after paid social clicks land.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.22em] text-[var(--app-muted)]">
              <span className="app-chip">
                One admin
              </span>
              <span className="app-chip">
                First-party analytics
              </span>
              <span className="app-chip">
                {APP_DOMAIN_HINT}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:items-end">
            <Link href="/admin/songs/new">
              <Button>Import a song</Button>
            </Link>
            <div className="rounded-full border border-[var(--app-line)] bg-white/75 px-3 py-2 text-sm text-[var(--app-muted)]">
              Signed in as {session.email}
            </div>
            <form action={signOutAction}>
              <Button type="submit" tone="secondary">
                Sign out
              </Button>
            </form>
          </div>
        </div>

        <div className="border-t border-[var(--app-line)] bg-white/48 px-5 py-4 backdrop-blur-md sm:px-8">
          <AdminNav />
        </div>

        <div className="mx-5 mt-5 rounded-[1.35rem] border border-[var(--app-line)] bg-white/58 px-4 py-4 text-sm text-[var(--app-muted)] sm:mx-8">
          Workflow: import a track, tighten the links and artwork, publish, then
          push the live URL into ads, bios, and social posts.
        </div>

        <div className="mt-6 px-5 pb-5 sm:px-8 sm:pb-8">{children}</div>
      </div>
    </div>
  );
}
