import Link from "next/link";
import { ChevronDown, Globe2, LogOut, Menu, Plus, Settings } from "lucide-react";

import { signOutAction } from "@/app/admin/actions";
import { AdminNav, AdminNavLinks } from "@/components/admin/admin-nav";
import { ThemeToggle } from "@/components/admin/theme-toggle";
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
            <ThemeToggle size="sm" />
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
              <details className="group relative">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-[10px] border border-transparent px-2 py-2 text-left transition hover:border-[var(--app-line)] hover:bg-[var(--app-panel-muted)] [&::-webkit-details-marker]:hidden">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(140deg,oklch(0.7_0.13_50),oklch(0.55_0.18_18))] text-[13px] font-semibold text-white">
                    {session.username[0]?.toUpperCase() ?? "B"}
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-[13.5px] font-semibold text-[var(--app-text)]">
                      @{session.username}
                    </span>
                    <span className="block truncate text-[11.5px] text-[var(--app-muted-2)]">
                      {session.loginEmail}
                    </span>
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--app-muted-2)] transition group-open:rotate-180" />
                </summary>

                <div className="absolute bottom-[calc(100%+8px)] left-0 right-0 z-20 rounded-[10px] border border-[var(--app-line)] bg-[var(--app-panel)] p-1.5 shadow-[0_16px_40px_rgba(20,24,34,0.13)]">
                  <div className="px-2.5 py-2">
                    <div className="flex items-center gap-2 text-[12.5px] font-semibold text-[var(--app-text)]">
                      <Globe2 className="h-3.5 w-3.5 text-[var(--app-accent-text)]" />
                      Link space
                    </div>
                    <div className="mt-1 truncate font-mono text-[11.5px] text-[var(--app-muted-2)]">
                      {APP_DOMAIN_HINT}/{session.username}/...
                    </div>
                  </div>
                  <div className="my-1 h-px bg-[var(--app-line)]" />
                  <Link
                    href="/admin/settings"
                    className="flex h-9 items-center gap-2 rounded-[7px] px-2.5 text-[13.5px] font-medium text-[var(--app-text)] transition hover:bg-[var(--app-panel-muted)]"
                  >
                    <Settings className="h-4 w-4 text-[var(--app-muted-2)]" />
                    Account settings
                  </Link>
                  <form action={signOutAction}>
                    <button
                      type="submit"
                      className="flex h-9 w-full items-center gap-2 rounded-[7px] px-2.5 text-left text-[13.5px] font-medium text-[var(--app-red-text)] transition hover:bg-[var(--app-red-soft)]"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </form>
                </div>
              </details>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 flex h-[58px] items-center justify-between border-b border-[var(--app-line)] bg-[color-mix(in_oklch,var(--app-panel)_82%,transparent)] px-3.5 backdrop-blur-xl lg:hidden">
            <BrandLockup tagline={null} tone="light" compact />
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link
                href="/admin/songs/new"
                aria-label="Import song"
                className="inline-flex h-9 w-9 items-center justify-center rounded-[7px] border border-transparent bg-transparent text-[var(--app-muted)] transition hover:border-[var(--app-line)] hover:bg-[var(--app-panel-muted)] hover:text-[var(--app-text)]"
              >
                <Plus className="h-[18px] w-[18px]" />
              </Link>
              <details className="group relative">
                <summary
                  aria-label="Open navigation"
                  className="inline-flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-[7px] border border-transparent bg-transparent text-[var(--app-muted)] transition hover:border-[var(--app-line)] hover:bg-[var(--app-panel-muted)] hover:text-[var(--app-text)] [&::-webkit-details-marker]:hidden"
                >
                  <Menu className="h-[18px] w-[18px]" />
                </summary>
                <div className="fixed inset-x-0 top-[58px] z-40 border-b border-[var(--app-line)] bg-[var(--app-panel)] p-3.5 shadow-[0_8px_24px_oklch(0.2_0.02_270_/_0.10),0_2px_6px_oklch(0.2_0.02_270_/_0.06)]">
                  <AdminNavLinks orientation="vertical" />
                  <div className="my-3 h-px bg-[var(--app-line)]" />
                  <div className="flex items-center gap-2 rounded-[10px] px-2 py-2">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(140deg,oklch(0.7_0.13_50),oklch(0.55_0.18_18))] text-[13px] font-semibold text-white">
                      {session.username[0]?.toUpperCase() ?? "B"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold text-[var(--app-text)]">
                        @{session.username}
                      </span>
                      <span className="block truncate text-[11.5px] text-[var(--app-muted-2)]">
                        {session.loginEmail}
                      </span>
                    </span>
                    <form action={signOutAction}>
                      <Button type="submit" tone="subtle" className="min-h-8 px-3 text-[13px]">
                        Sign out
                      </Button>
                    </form>
                  </div>
                </div>
              </details>
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
