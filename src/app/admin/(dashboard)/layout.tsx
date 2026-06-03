import Link from "next/link";
import { ChevronDown, Globe2, LogOut, Plus, Settings } from "lucide-react";

import { signOutAction } from "@/app/admin/actions";
import { AccountAvatar } from "@/components/admin/account-avatar";
import { AdminNav } from "@/components/admin/admin-nav";
import { MobileAdminMenu } from "@/components/admin/mobile-admin-menu";
import { ThemeToggle } from "@/components/admin/theme-toggle";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { Button } from "@/components/ui/button";
import { APP_DOMAIN_HINT } from "@/lib/constants";
import { requireUserSession } from "@/lib/auth";
import { getUserAvatarUrl } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireUserSession();
  const avatarUrl = await getUserAvatarUrl(session.userId);

  return (
    <div className="bs-admin-theme min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      <div className="min-h-screen w-full">
        <aside className="fixed inset-y-0 left-0 z-20 hidden w-[var(--sidebar-w)] border-r border-[var(--app-line)] bg-[var(--app-panel)] px-3.5 py-[18px] lg:flex lg:flex-col">
          <div className="flex items-center justify-between px-1 pb-[18px]">
            <BrandLockup
              compact
              tagline="Release links"
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
                  <AccountAvatar avatarUrl={avatarUrl} username={session.username} />
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

        <div className="admin-dashboard-shell min-w-0 lg:pl-[var(--sidebar-w)]">
          <MobileAdminMenu
            avatarUrl={avatarUrl}
            username={session.username}
            loginEmail={session.loginEmail}
          />

          <main className="min-h-screen px-5 py-6 sm:px-8 lg:px-9 lg:py-[30px]">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
