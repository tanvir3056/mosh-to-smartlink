"use client";

import {
  BarChart3,
  LayoutDashboard,
  Settings,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/admin",
    label: "Overview",
    icon: LayoutDashboard,
    activePrefixes: ["/admin/songs/"],
    inactivePrefixes: ["/admin/songs/new"],
  },
  {
    href: "/admin/songs/new",
    label: "Import song",
    icon: Sparkles,
  },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminNav() {
  return <AdminNavLinks orientation="vertical" ariaLabel="Workspace" />;
}

export function AdminNavLinks({
  ariaLabel,
  orientation = "vertical",
}: {
  ariaLabel?: string;
  orientation?: "vertical" | "horizontal";
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        "gap-1.5",
        orientation === "vertical"
          ? "flex flex-col"
          : "grid min-w-full grid-cols-2 gap-2 sm:flex sm:min-w-max sm:flex-row",
      )}
    >
      {navItems.map((item) => {
        const activePrefixes =
          "activePrefixes" in item ? item.activePrefixes : undefined;
        const inactivePrefixes =
          "inactivePrefixes" in item ? item.inactivePrefixes : undefined;
        const active =
          (item.href === "/admin"
            ? pathname === item.href ||
              activePrefixes?.some((prefix) => pathname.startsWith(prefix)) === true
            : pathname.startsWith(item.href) ||
              activePrefixes?.some((prefix) => pathname.startsWith(prefix)) === true) &&
          inactivePrefixes?.some((prefix) => pathname.startsWith(prefix)) !== true;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "app-sidebar-nav-link relative inline-flex h-[38px] items-center gap-3 rounded-[var(--r-sm)] border px-3 text-sm font-medium select-none touch-manipulation transition-[background-color,border-color,color] duration-150 ease-out",
              orientation === "horizontal" && "min-w-0 justify-start px-3",
              active
                ? "border-transparent bg-[var(--app-accent-soft)] text-[var(--app-accent-text)]"
                : "border-transparent hover:bg-[var(--app-panel-muted)]",
            )}
          >
            {active ? (
              <span className="absolute bottom-2 left-[-10px] top-2 hidden w-[3px] rounded-full bg-[var(--app-accent)] lg:block" />
            ) : null}
            <span
              className={cn(
                "app-sidebar-nav-icon inline-flex h-5 w-5 shrink-0 items-center justify-center transition-colors",
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="app-sidebar-nav-label min-w-0 truncate font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
