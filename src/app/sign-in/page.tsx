import { BrandLockup } from "@/components/brand/brand-lockup";
import { SignInForm } from "@/components/admin/sign-in-form";
import { APP_NAME } from "@/lib/constants";
import { appEnv } from "@/lib/env";

export default async function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-8">
      <section className="app-shell-card w-full max-w-lg rounded-[2rem] p-3 sm:p-4">
        <div className="app-card rounded-[1.6rem] p-8">
          <BrandLockup
            includeDomain
            tagline="Sign in to manage your own release pages, links, and campaign insights."
            tone="light"
          />
          <p className="mt-6 text-xs uppercase tracking-[0.28em] text-[var(--app-muted)]">
            Creator sign-in
          </p>
          <h1 className="mt-4 font-[var(--font-display)] text-5xl font-semibold leading-none tracking-[-0.04em] text-[var(--app-text)]">
            Welcome back to {APP_NAME}
          </h1>
          <p className="mt-4 text-sm leading-7 text-[var(--app-muted)]">
            Sign in with your username and password to manage your smart-link pages.
          </p>

          <div className="mt-8">
            <SignInForm modeLabel={appEnv.hasSupabaseAuth ? "Supabase sessions" : "Local development mode"} />
          </div>
        </div>
      </section>
    </main>
  );
}
