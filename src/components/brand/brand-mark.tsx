import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex h-12 w-12 items-center justify-center rounded-[1.1rem] border border-[var(--app-line)] bg-white/84 shadow-[0_10px_24px_rgba(73,93,79,0.08)] backdrop-blur-md",
        className,
      )}
      {...props}
    >
      <svg
        viewBox="0 0 64 64"
        className="h-8 w-8"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="32" cy="32" r="28" fill="rgba(111,143,116,0.12)" />
        <path
          d="M20 39.5c0-11.8 8.1-20.6 23.5-22.8-1 15.6-9.1 24.1-23.5 22.8Z"
          fill="var(--app-accent)"
          opacity="0.9"
        />
        <path
          d="M24 40.5c4.7-7.7 11.2-13.8 19.8-18.2"
          stroke="#ffffff"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M31.4 26.8c1.4 3.8 1 7.2-0.8 10.4"
          stroke="#ffffff"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <circle cx="46.5" cy="19.5" r="4.5" fill="var(--app-accent-mint)" />
      </svg>
    </span>
  );
}
