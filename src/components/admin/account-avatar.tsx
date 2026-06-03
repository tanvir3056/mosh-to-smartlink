/* eslint-disable @next/next/no-img-element */

const DEFAULT_AVATAR_CLASS =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(140deg,oklch(0.7_0.13_50),oklch(0.55_0.18_18))] text-[13px] font-semibold text-white";

export function AccountAvatar({
  avatarUrl,
  className = DEFAULT_AVATAR_CLASS,
  username,
}: {
  avatarUrl: string | null;
  className?: string;
  username: string;
}) {
  const initial = username.trim().charAt(0).toUpperCase() || "B";

  return (
    <span className={className}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={`${username} avatar`}
          className="h-full w-full object-cover"
        />
      ) : (
        initial
      )}
    </span>
  );
}
