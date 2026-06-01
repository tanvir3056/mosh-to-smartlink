import Link from "next/link";
import { Plus } from "lucide-react";

import { signOutAction } from "@/app/admin/actions";
import { AdminNav, AdminNavLinks } from "@/components/admin/admin-nav";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { Button } from "@/components/ui/button";
import { APP_DOMAIN_HINT } from "@/lib/constants";
import { requireUserSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireUserSession();

  return (
    <div className="bs-admin-theme min-h-screen text-[var(--app-text)]">
      <div className="mx-auto grid min-h-screen w-full max-w-[1740px] lg:grid-cols-[252px_minmax(0,1fr)]">
        <aside className="hidden border-r border-[var(--app-line)] bg-[var(--app-panel)] px-3.5 py-[18px] lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
          <div className="flex items-center justify-between px-1 pb-[18px]">
            <BrandLockup
              compact
              tagline={null}
              tone="light"
              className="items-start"
            />
          </div>

          <Link href="/admin/songs/new" className="mb-[18px]">
            <Button className="w-full justify-center">
              <Plus className="h-4 w-4" />
              Import song
            </Button>
          </Link>

          <div>
            <div className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--app-sidebar-muted)]">
              Workspace
            </div>
            <AdminNav />
          </div>

          <div className="mt-auto">
            <div className="px-1 pb-2">
              <div className="mb-2 rounded-[10px] border border-[var(--app-line)] bg-[var(--app-panel-muted)] px-3 py-3">
                <div className="mb-1 flex items-center gap-2 text-[12.5px] font-semibold text-[var(--app-text)]">
                  <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--app-accent-soft)] text-[var(--app-accent-text)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--app-accent)]" />
                  </span>
                  Your link space
                </div>
                <div className="truncate font-mono text-[11.5px] text-[var(--app-muted-2)]">
                  {APP_DOMAIN_HINT}/{session.username}/...
                </div>
              </div>
            </div>
            <div className="border-t border-[var(--app-line)] pt-2">
              <div className="flex items-center gap-2 rounded-[10px] px-2 py-2">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(140deg,oklch(0.7_0.13_50),oklch(0.55_0.18_18))] text-[13px] font-semibold text-white">
                  {session.username[0]?.toUpperCase() ?? "B"}
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="truncate text-[13.5px] font-semibold text-[var(--app-text)]">
                    @{session.username}
                  </div>
                  <div className="truncate text-[11.5px] text-[var(--app-muted-2)]">
                    {session.loginEmail}
                  </div>
                </div>
              </div>
              <form action={signOutAction} className="mt-2">
                <Button type="submit" tone="secondary" className="w-full justify-center">
                  Sign out
                </Button>
              </form>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-[var(--app-line)] bg-[color-mix(in_oklch,var(--app-panel)_82%,transparent)] px-4 py-3 backdrop-blur-xl sm:px-5 lg:hidden">
            <div className="grid gap-4">
              <div className="flex items-start justify-between gap-4">
                <BrandLockup includeDomain tagline={null} tone="light" compact />
                <div className="rounded-full border border-[var(--app-line)] bg-[var(--app-panel)] px-3 py-1.5 text-[11px] font-semibold text-[var(--app-muted)]">
                  @{session.username}
                </div>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                <Link href="/admin/songs/new">
                  <Button className="w-full justify-center">Import song</Button>
                </Link>
                <form action={signOutAction}>
                  <Button type="submit" tone="secondary">
                    Sign out
                  </Button>
                </form>
              </div>

              <div>
                <AdminNavLinks orientation="horizontal" />
              </div>
            </div>
          </header>

          <main className="min-h-screen px-5 py-6 sm:px-8 lg:px-9 lg:py-[30px]">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
