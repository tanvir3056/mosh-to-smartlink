import { BrandLockup } from "@/components/brand/brand-lockup";
import { SignUpForm } from "@/components/admin/sign-up-form";
import { APP_NAME } from "@/lib/constants";
import { appEnv } from "@/lib/env";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SignUpPage() {
  return (
    <main className="bs-admin-theme flex min-h-screen flex-col bg-[var(--app-bg)]">
      <header className="flex items-center justify-between px-5 py-5 sm:px-6">
        <BrandLockup tagline={null} tone="light" compact />
      </header>
      <div className="flex flex-1 items-center justify-center px-5 pb-16 pt-4">
      <section className="app-enter w-full max-w-[408px]">
        <div className="app-card overflow-hidden rounded-[14px] p-0 shadow-[0_8px_24px_oklch(0.2_0.02_270_/_0.10),0_2px_6px_oklch(0.2_0.02_270_/_0.06)]">
          <div className="px-7 pt-7 text-center">
          <BrandLockup
            tagline={null}
            tone="light"
            className="justify-center"
          />
          <h1 className="mt-5 font-[var(--font-display)] text-[23px] font-semibold tracking-[-0.02em] text-[var(--app-text)]">
            Create your account
          </h1>
          <p className="mt-1.5 text-sm text-[var(--app-muted)]">
            Claim your {APP_NAME} link space in seconds.
          </p>
          </div>

          <div className="px-7 py-6">
            <SignUpForm modeLabel={appEnv.hasSupabaseAuth ? "Secure account creation" : "Local development mode"} />
          </div>
        </div>
      </section>
      </div>
    </main>
  );
}
