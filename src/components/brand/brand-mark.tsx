import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex h-12 w-12 items-center justify-center rounded-[1.1rem] border border-white/12 bg-black/40 shadow-[0_20px_40px_rgba(0,0,0,0.3)] backdrop-blur-md",
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
        <rect
          x="10"
          y="10"
          width="44"
          height="44"
          rx="13"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth="1.5"
        />
        <path
          d="M24 16.5v31"
          stroke="white"
          strokeWidth="4.4"
          strokeLinecap="round"
        />
        <path
          d="M24 18h8.2c5.4 0 9.8 3.8 9.8 8.7 0 3.2-1.8 5.8-4.6 7 3.5 1.1 5.8 4 5.8 7.7 0 5.2-4.8 9.1-10.5 9.1H24"
          stroke="var(--app-accent)"
          strokeWidth="4.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M43.2 16v8.2"
          stroke="var(--app-accent-mint)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <circle cx="43.2" cy="14" r="2.4" fill="var(--app-accent-mint)" />
      </svg>
    </span>
  );
}
