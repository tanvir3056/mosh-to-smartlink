import { SERVICE_LABELS } from "@/lib/constants";
import type { StreamingService } from "@/lib/types";
import { cn } from "@/lib/utils";

function ServiceSvg({ service }: { service: StreamingService }) {
  switch (service) {
    case "spotify":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <circle cx="12" cy="12" r="11" fill="#1ed760" />
          <path
            d="M7.2 9.4c3.1-1 6.4-.8 9.6.6"
            stroke="#fff"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M8.1 12.2c2.5-.7 5-.5 7.3.6"
            stroke="#fff"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M8.8 14.8c1.8-.4 3.5-.2 5.1.6"
            stroke="#fff"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "apple_music":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <rect x="1" y="1" width="22" height="22" rx="7" fill="#ff5f7f" />
          <path
            d="M14.8 6.7v8.1a2.3 2.3 0 1 1-1.4-2.1v-4.4l-4.2.9v6.2a2.3 2.3 0 1 1-1.4-2.1V8.1l7-1.4Z"
            fill="#fff"
          />
        </svg>
      );
    case "youtube_music":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <circle cx="12" cy="12" r="10.5" fill="none" stroke="#ff4e45" strokeWidth="2.2" />
          <circle cx="12" cy="12" r="6.2" fill="none" stroke="#ff4e45" strokeWidth="1.6" opacity="0.55" />
          <path d="m10.2 8.9 5.2 3.1-5.2 3.1Z" fill="#ff4e45" />
        </svg>
      );
    case "amazon_music":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <circle cx="12" cy="12" r="11" fill="#586ee0" />
          <path
            d="M7.2 14.5c2.6 1.6 6.9 1.5 9.6-.2"
            stroke="#fff"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <path
            d="m14.8 14.7 1.8-.3-.6 1.7"
            stroke="#fff"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "deezer":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <rect x="1" y="1" width="22" height="22" rx="7" fill="#fff3ec" />
          {[
            ["#ff5a5f", 5, 11, 2.2, 7],
            ["#ff8a5b", 8.4, 9, 2.2, 9],
            ["#fcb045", 11.8, 7, 2.2, 11],
            ["#7a7aff", 15.2, 9, 2.2, 9],
          ].map(([fill, x, y, width, height]) => (
            <rect
              key={`${fill}-${x}`}
              x={Number(x)}
              y={Number(y)}
              width={Number(width)}
              height={Number(height)}
              rx="1.1"
              fill={String(fill)}
            />
          ))}
        </svg>
      );
    case "tidal":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <rect x="1" y="1" width="22" height="22" rx="7" fill="#171717" />
          <path
            d="m12 5.2 3.2 3.2L12 11.6 8.8 8.4 12 5.2Zm-5 5 3.2 3.2L7 16.6l-3.2-3.2L7 10.2Zm10 0 3.2 3.2-3.2 3.2-3.2-3.2 3.2-3.2Zm-5 5 3.2 3.2-3.2 3.2-3.2-3.2 3.2-3.2Z"
            fill="#fff"
          />
        </svg>
      );
  }
}

export function ServiceIcon({
  service,
  className,
}: {
  service: StreamingService;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-11 w-11 items-center justify-center rounded-[1rem] border border-black/6 bg-white shadow-[0_1px_0_rgba(255,255,255,0.8),0_6px_18px_rgba(40,48,43,0.06)]",
        className,
      )}
      aria-hidden="true"
      title={SERVICE_LABELS[service]}
    >
      <ServiceSvg service={service} />
    </span>
  );
}
