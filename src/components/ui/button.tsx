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
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(111,143,116,0.46)] disabled:cursor-not-allowed disabled:opacity-60",
        tone === "primary" &&
          "bg-[var(--app-accent)] text-white shadow-[0_10px_24px_rgba(84,113,89,0.18)] hover:bg-[var(--app-accent-strong)]",
        tone === "secondary" &&
          "border border-[var(--app-line)] bg-white/78 text-[var(--app-text)] hover:border-[rgba(111,143,116,0.3)] hover:bg-white",
        tone === "ghost" &&
          "text-[var(--app-text)]/72 hover:bg-[var(--app-accent-soft)] hover:text-[var(--app-text)]",
        tone === "danger" &&
          "border border-red-400/18 bg-red-500/12 text-red-50 hover:border-red-400/28 hover:bg-red-500/18",
        className,
      )}
      {...props}
    >
      {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}
