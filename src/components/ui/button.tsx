import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  busy?: boolean;
  tone?: "primary" | "secondary" | "ghost" | "subtle" | "danger" | "danger-ghost";
}

export function Button({
  busy = false,
  className,
  children,
  tone = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--r-sm)] border px-3.5 text-sm font-[550] tracking-[-0.005em] whitespace-nowrap select-none touch-manipulation transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50",
        tone === "primary" &&
          "border-transparent bg-[var(--app-accent)] text-white shadow-[var(--sh-xs)] hover:bg-[var(--app-accent-strong)] active:bg-[var(--app-accent-strong)]",
        tone === "secondary" &&
          "border-[var(--app-line)] bg-[var(--app-panel)] text-[var(--app-text)] shadow-[var(--sh-xs)] hover:border-[var(--app-line-strong)] hover:bg-[var(--app-panel-muted)]",
        tone === "ghost" &&
          "border-transparent bg-transparent text-[var(--app-muted)] hover:bg-[var(--app-panel-muted)] hover:text-[var(--app-text)]",
        tone === "subtle" &&
          "border-[var(--app-line)] bg-[var(--app-panel-muted)] text-[var(--app-text)] hover:bg-[var(--app-line)]",
        tone === "danger" &&
          "border-transparent bg-[var(--app-red)] text-white hover:bg-[var(--app-red-text)]",
        tone === "danger-ghost" &&
          "border-[var(--app-red-line)] bg-transparent text-[var(--app-red-text)] hover:bg-[var(--app-red-soft)]",
        className,
      )}
      {...props}
    >
      {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}
