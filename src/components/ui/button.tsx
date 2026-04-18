import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  busy?: boolean;
  tone?: "primary" | "secondary" | "ghost" | "danger";
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
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold select-none touch-manipulation transition-[transform,background-color,border-color,color,box-shadow] duration-200 ease-out active:scale-[0.985] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-accent)] disabled:cursor-not-allowed disabled:opacity-60",
        tone === "primary" &&
          "bg-[var(--app-accent)] text-[#062c28] shadow-[0_14px_32px_rgba(63,212,196,0.28)] hover:bg-[var(--app-accent-strong)] active:bg-[var(--app-accent-strong)] active:text-[#062c28] active:shadow-[0_8px_18px_rgba(63,212,196,0.24)]",
        tone === "secondary" &&
          "border border-[var(--app-line)] bg-white text-[var(--app-text)] hover:border-[var(--app-line-strong)] hover:bg-[var(--app-panel-muted)] active:border-[var(--app-line-strong)] active:bg-[#ece8df] active:text-[var(--app-text)] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]",
        tone === "ghost" &&
          "text-[var(--app-muted)] hover:bg-black/4 hover:text-[var(--app-text)] active:bg-black/6 active:text-[var(--app-text)]",
        tone === "danger" &&
          "border border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100 active:border-red-300 active:bg-red-100 active:text-red-700",
        className,
      )}
      {...props}
    >
      {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}
