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
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-3">
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
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm transition",
              active
                ? "border-[rgba(111,143,116,0.24)] bg-white text-[var(--app-text)] shadow-[0_8px_24px_rgba(73,93,79,0.08)]"
                : "border-[var(--app-line)] bg-white/56 text-[var(--app-muted)] hover:border-[rgba(111,143,116,0.24)] hover:bg-white/78 hover:text-[var(--app-text)]",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
