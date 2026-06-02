"use client";

import { LogOut, Menu, Plus, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { signOutAction } from "@/app/admin/actions";
import { AdminNavLinks } from "@/components/admin/admin-nav";
import { ThemeToggle } from "@/components/admin/theme-toggle";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { Button } from "@/components/ui/button";

export function MobileAdminMenu({
  username,
  loginEmail,
}: {
  username: string;
  loginEmail: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuButtonLabel = open ? "Close navigation" : "Open navigation";
  const userInitial = username[0]?.toUpperCase() ?? "B";

  useEffect(() => {
    const closeOnNavigation = window.setTimeout(() => setOpen(false), 0);

    return () => window.clearTimeout(closeOnNavigation);
  }, [pathname]);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-[58px] items-center justify-between border-b border-[var(--app-line)] bg-[var(--glass)] px-3.5 backdrop-blur-xl lg:hidden">
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
          <button
            type="button"
            aria-label={menuButtonLabel}
            aria-controls="admin-mobile-menu"
            aria-expanded={open}
            onClick={() => setOpen((current) => !current)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-[7px] border border-transparent bg-transparent text-[var(--app-muted)] transition hover:border-[var(--app-line)] hover:bg-[var(--app-panel-muted)] hover:text-[var(--app-text)]"
          >
            {open ? (
              <X className="h-[18px] w-[18px]" />
            ) : (
              <Menu className="h-[18px] w-[18px]" />
            )}
          </button>
        </div>
      </header>

      {open ? (
        <div
          className="fixed inset-x-0 bottom-0 top-[58px] z-40 bg-[var(--scrim)] lg:hidden"
          onClick={() => setOpen(false)}
        >
          <div
            id="admin-mobile-menu"
            className="border-b border-[var(--app-line)] bg-[var(--app-panel)] p-3.5 shadow-[0_8px_24px_oklch(0.2_0.02_270_/_0.10),0_2px_6px_oklch(0.2_0.02_270_/_0.06)]"
            onClick={(event) => event.stopPropagation()}
          >
            <AdminNavLinks orientation="vertical" ariaLabel="Mobile workspace" />
            <div className="mt-3 grid gap-2">
              <Link
                href="/admin/songs/new"
                className="app-interactive inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-[var(--r-sm)] border border-transparent bg-[var(--app-accent)] px-3.5 text-sm font-[550] text-white shadow-[var(--sh-xs)] transition hover:bg-[var(--app-accent-strong)]"
                style={{ color: "#fff", WebkitTextFillColor: "#fff" }}
              >
                <Plus className="h-4 w-4" />
                Import song
              </Link>
              <ThemeToggle
                withLabel
                className="w-full justify-center border-[var(--app-line)] bg-[var(--app-panel-muted)] text-[var(--app-text)]"
              />
            </div>
            <div className="my-3 h-px bg-[var(--app-line)]" />
            <div className="flex items-center gap-2 rounded-[10px] px-2 py-2">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(140deg,oklch(0.7_0.13_50),oklch(0.55_0.18_18))] text-[13px] font-semibold text-white">
                {userInitial}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-semibold text-[var(--app-text)]">
                  @{username}
                </span>
                <span className="block truncate text-[11.5px] text-[var(--app-muted-2)]">
                  {loginEmail}
                </span>
              </span>
              <form action={signOutAction}>
                <Button type="submit" tone="subtle" className="min-h-8 px-3 text-[13px]">
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
