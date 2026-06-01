import { ThemeToggle } from "@/components/admin/theme-toggle";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { SignInForm } from "@/components/admin/sign-in-form";
import { APP_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SignInPage() {
  return (
    <main className="bs-admin-theme flex min-h-screen flex-col bg-[var(--app-bg)]">
      <header className="flex items-center justify-between px-5 py-5 sm:px-6">
        <BrandLockup tagline={null} tone="light" compact />
        <ThemeToggle />
      </header>
      <div className="flex flex-1 items-center justify-center px-5 pb-16 pt-4">
        <section className="app-enter w-full max-w-[408px]">
          <div className="app-card overflow-hidden rounded-[14px] p-0 shadow-[0_8px_24px_oklch(0.2_0.02_270_/_0.10),0_2px_6px_oklch(0.2_0.02_270_/_0.06)]">
            <div className="px-7 pt-7 text-center">
              <h1 className="font-[var(--font-display)] text-[23px] font-semibold tracking-[-0.02em] text-[var(--app-text)]">
                Sign in to {APP_NAME}
              </h1>
              <p className="mt-1.5 text-sm text-[var(--app-muted)]">
                Manage your releases and links.
              </p>
            </div>

            <div className="px-7 py-6">
              <SignInForm />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
