import { Layers } from "lucide-react";

import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-[var(--r-md)] bg-[linear-gradient(150deg,var(--app-accent),oklch(0.42_0.2_290))] text-white shadow-[var(--sh-sm)]",
        className,
      )}
      {...props}
    >
      <Layers className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
    </span>
  );
}
