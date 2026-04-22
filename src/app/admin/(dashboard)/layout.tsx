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
    <div className="min-h-screen bg-[var(--app-surface)] text-[var(--app-text)]">
      <div className="mx-auto grid min-h-screen w-full max-w-[1680px] lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden border-r border-[var(--app-line)] bg-[linear-gradient(180deg,#fbfaf6_0%,#f3efe7_100%)] lg:flex lg:min-h-screen lg:flex-col lg:px-5 lg:py-6">
          <div>
            <BrandLockup
              includeDomain
              tagline={null}
              tone="light"
              className="items-start"
            />
          </div>

          <Link href="/admin/songs/new" className="mt-8">
            <Button className="w-full justify-center shadow-none">
              <Plus className="h-4 w-4" />
              Import song
            </Button>
          </Link>

          <div className="mt-8">
            <div className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--app-muted)]">
              Navigation
            </div>
            <AdminNav />
          </div>

          <div className="mt-auto space-y-3">
            <div className="rounded-[1.2rem] border border-[var(--app-line)] bg-white px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--app-muted)]">
                Account
              </div>
              <div className="mt-2 text-sm font-medium text-[var(--app-text)]">@{session.username}</div>
              <div className="mt-1 text-xs text-[var(--app-muted)]">{session.loginEmail}</div>
            </div>
            <div className="rounded-[1.2rem] border border-[var(--app-line)] bg-white px-4 py-3 text-sm text-[var(--app-muted)]">
              Live links use {APP_DOMAIN_HINT} style URLs with your username in the path.
            </div>
            <form action={signOutAction}>
              <Button type="submit" tone="secondary" className="w-full justify-center">
                Sign out
              </Button>
            </form>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="border-b border-[var(--app-line)] bg-[rgba(252,251,248,0.88)] px-4 py-4 backdrop-blur-xl sm:px-6 lg:hidden">
            <div className="flex items-start justify-between gap-4">
              <BrandLockup includeDomain tagline={null} tone="light" compact />
              <div className="flex items-center gap-2">
                <Link href="/admin/songs/new">
                  <Button className="shadow-none">Import</Button>
                </Link>
                <form action={signOutAction}>
                  <Button type="submit" tone="secondary" className="shadow-none">
                    Sign out
                  </Button>
                </form>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <AdminNavLinks orientation="horizontal" />
            </div>
          </header>

          <main className="px-4 pb-8 pt-5 sm:px-6 sm:pb-12 sm:pt-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
