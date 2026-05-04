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
    <div className="min-h-screen text-[var(--app-text)]">
      <div className="mx-auto grid min-h-screen w-full max-w-[1740px] gap-4 px-4 py-4 lg:grid-cols-[300px_minmax(0,1fr)] lg:px-5 lg:py-5">
        <aside className="app-shell-card hidden lg:sticky lg:top-5 lg:flex lg:h-[calc(100vh-2.5rem)] lg:flex-col lg:overflow-hidden lg:rounded-[2rem] lg:px-5 lg:py-5">
          <div className="rounded-[1.5rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-4">
            <BrandLockup
              includeDomain
              tagline={null}
              tone="light"
              className="items-start"
            />
            <p className="mt-4 max-w-[15rem] text-sm leading-6 text-[var(--app-sidebar-muted)]">
              Build release pages, review links, and publish from one workspace.
            </p>
          </div>

          <Link href="/admin/songs/new" className="mt-6">
            <Button className="w-full justify-center">
              <Plus className="h-4 w-4" />
              Import song
            </Button>
          </Link>

          <div className="mt-7">
            <div className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--app-sidebar-muted)]">
              Navigation
            </div>
            <AdminNav />
          </div>

          <div className="mt-auto space-y-3">
            <div className="app-sidebar-card rounded-[1.35rem] px-4 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--app-sidebar-muted)]">
                Account
              </div>
              <div className="mt-3 text-sm font-medium text-[var(--app-sidebar-text)]">@{session.username}</div>
              <div className="mt-1 text-xs text-[var(--app-sidebar-muted)]">{session.loginEmail}</div>
            </div>
            <div className="app-sidebar-note rounded-[1.35rem] px-4 py-4 text-sm leading-6">
              Live links use {APP_DOMAIN_HINT} style URLs with your username in the path.
            </div>
            <form action={signOutAction}>
              <Button type="submit" tone="secondary" className="w-full justify-center border-white/10 bg-white/6 text-[var(--app-sidebar-text)] hover:bg-white/10 hover:text-[var(--app-sidebar-text)]">
                Sign out
              </Button>
            </form>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="app-shell-card sticky top-0 z-30 mb-5 rounded-[1.5rem] px-4 py-4 backdrop-blur-xl sm:px-5 lg:hidden">
            <div className="grid gap-4">
              <div className="flex items-start justify-between gap-4">
                <BrandLockup includeDomain tagline={null} tone="light" compact />
                <div className="rounded-full border border-[rgba(255,255,255,0.08)] bg-white/6 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-sidebar-text)]">
                  @{session.username}
                </div>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                <Link href="/admin/songs/new">
                  <Button className="w-full justify-center">Import song</Button>
                </Link>
                <form action={signOutAction}>
                  <Button type="submit" tone="secondary" className="border-white/10 bg-white/6 text-[var(--app-sidebar-text)] hover:bg-white/10 hover:text-[var(--app-sidebar-text)]">
                    Sign out
                  </Button>
                </form>
              </div>

              <div>
                <AdminNavLinks orientation="horizontal" />
              </div>
            </div>
          </header>

          <main className="px-1 pb-8 pt-0 sm:px-0 sm:pb-12 lg:py-2">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
