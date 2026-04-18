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
  { href: "/admin/songs/new", label: "Import song", icon: Sparkles },
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
        orientation === "vertical" ? "flex flex-col" : "flex min-w-max flex-row",
      )}
    >
      {navItems.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === item.href
            : pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-sm select-none touch-manipulation transition-[background-color,border-color,color,box-shadow] duration-200 ease-out",
              active
                ? "border-[var(--app-line)] bg-white text-[var(--app-text)] shadow-[0_1px_0_rgba(255,255,255,0.8),0_10px_18px_rgba(11,14,19,0.05)]"
                : "border-transparent text-[var(--app-muted)] hover:border-[var(--app-line)] hover:bg-white/70 hover:text-[var(--app-text)]",
            )}
          >
            <span
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-colors",
                active
                  ? "border-[var(--app-line)] bg-[var(--app-panel-muted)] text-[var(--app-text)]"
                  : "border-transparent bg-transparent text-[var(--app-muted)]",
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
