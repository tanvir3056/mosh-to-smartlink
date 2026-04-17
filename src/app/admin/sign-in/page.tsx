import { redirect } from "next/navigation";

import { BrandLockup } from "@/components/brand/brand-lockup";
import { SignInForm } from "@/components/admin/sign-in-form";
import { getAdminSession } from "@/lib/auth";
import { APP_NAME } from "@/lib/constants";
import { appEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function AdminSignInPage() {
  const session = await getAdminSession();

  if (session) {
    redirect("/admin");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-8">
      <section className="app-card w-full max-w-md rounded-[2rem] p-8">
        <BrandLockup includeDomain tagline="Private control room for release links, review, and attribution." />
        <p className="mt-6 text-xs uppercase tracking-[0.28em] text-[var(--app-muted-2)]">
          Private admin
        </p>
        <h1 className="mt-4 font-[var(--font-display)] text-5xl font-semibold leading-none tracking-[-0.04em] text-[var(--app-text)]">
          {APP_NAME} control room
        </h1>
        <p className="mt-4 text-sm leading-7 text-[var(--app-muted)]">
          One admin account controls the whole app. Sign in to import a released
          Spotify track, review the page, publish it, and copy the live link.
        </p>

        <div className="mt-8">
          <SignInForm
            email={appEnv.adminEmail}
            modeLabel={appEnv.hasSupabaseAuth ? "Supabase Auth" : "Local demo auth"}
          />
        </div>

        {!appEnv.hasSupabaseAuth ? (
          <p className="mt-4 text-xs leading-6 text-[var(--app-muted)]">
            Local verification mode is active because Supabase auth env vars are not
            configured in this workspace. The production path still uses Supabase
            Auth when credentials are supplied.
          </p>
        ) : null}
      </section>
    </main>
  );
}
