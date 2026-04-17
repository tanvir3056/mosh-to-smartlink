import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <div className="app-card w-full max-w-md rounded-[2rem] p-8 text-center">
        <p className="app-kicker">
          Not found
        </p>
        <h1 className="mt-4 text-4xl font-semibold text-[var(--app-text)]">
          That song page is not live.
        </h1>
        <p className="mt-3 text-sm leading-7 text-[var(--app-muted)]">
          The page may still be in draft, unpublished, or the slug may have changed.
        </p>
        <div className="mt-6 flex justify-center">
          <Link href="/">
            <Button>Return home</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
