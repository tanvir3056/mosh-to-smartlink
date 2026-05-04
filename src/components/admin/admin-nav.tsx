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
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  {
    href: "/admin/songs/new",
    label: "Import song",
    icon: Sparkles,
    activePrefixes: ["/admin/songs/"],
  },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminNav() {
  return <AdminNavLinks orientation="vertical" />;
}

export function AdminNavLinks({
  orientation = "vertical",
}: {
  orientation?: "vertical" | "horizontal";
}) {
  const pathname = usePathname();

  return (
    <nav
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
        const active =
          item.href === "/admin"
            ? pathname === item.href
            : pathname.startsWith(item.href) ||
              activePrefixes?.some((prefix) => pathname.startsWith(prefix)) === true;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "app-interactive inline-flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-sm select-none touch-manipulation transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out",
              orientation === "horizontal" && "min-w-0 justify-start px-3 py-2.5 sm:px-3.5 sm:py-3",
              active
                ? "border-[var(--app-sidebar-line)] bg-[var(--app-sidebar-panel-strong)] text-[var(--app-sidebar-text)] shadow-[0_1px_0_rgba(255,255,255,0.05)_inset,0_18px_32px_rgba(0,0,0,0.16)]"
                : "border-transparent text-white/78 hover:border-[var(--app-sidebar-line)] hover:bg-white/7 hover:text-white",
            )}
          >
            <span
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-colors",
                orientation === "horizontal" && "h-8 w-8 shrink-0",
                active
                  ? "border-[rgba(255,255,255,0.1)] bg-white/10 text-[var(--app-sidebar-text)]"
                  : "border-transparent bg-transparent text-white/65",
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 truncate font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
