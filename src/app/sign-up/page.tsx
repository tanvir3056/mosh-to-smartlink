import { redirect } from "next/navigation";

import { BrandLockup } from "@/components/brand/brand-lockup";
import { SignUpForm } from "@/components/admin/sign-up-form";
import { getUserSession } from "@/lib/auth";
import { APP_NAME } from "@/lib/constants";
import { appEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  const session = await getUserSession();

  if (session) {
    redirect("/admin");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-8">
      <section className="app-shell-card w-full max-w-lg rounded-[2rem] p-3 sm:p-4">
        <div className="app-card rounded-[1.6rem] p-8">
          <BrandLockup
            includeDomain
            tagline="Create a workspace in seconds and start publishing your own release links."
            tone="light"
          />
          <p className="mt-6 text-xs uppercase tracking-[0.28em] text-[var(--app-muted)]">
            Create account
          </p>
          <h1 className="mt-4 font-[var(--font-display)] text-5xl font-semibold leading-none tracking-[-0.04em] text-[var(--app-text)]">
            Start using {APP_NAME}
          </h1>
          <p className="mt-4 text-sm leading-7 text-[var(--app-muted)]">
            Choose a unique username and a password. No email verification is required in this first version.
          </p>

          <div className="mt-8">
            <SignUpForm modeLabel={appEnv.hasSupabaseAuth ? "Instant Supabase account" : "Local development mode"} />
          </div>
        </div>
      </section>
    </main>
  );
}
