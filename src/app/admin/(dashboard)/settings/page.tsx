import { TrackingSettingsForm } from "@/components/admin/tracking-settings-form";
import { getTrackingConfig } from "@/lib/data";

export default async function AdminSettingsPage() {
  const trackingConfig = await getTrackingConfig();

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.85fr)] xl:items-start">
      <div className="app-card rounded-[1.75rem] p-5 sm:p-6 xl:sticky xl:top-6">
        <p className="app-kicker text-[var(--app-muted)]">Settings</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-[var(--app-text)]">
          Tracking and site settings
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--app-muted)]">
          Keep V1 disciplined. First-party analytics is the main reporting layer,
          and Meta Pixel stays optional.
        </p>

        <div className="mt-6 grid gap-3">
          {[
            "Site name appears across admin and public pages.",
            "Meta Pixel only fires on published public pages.",
            "Anything not cleanly supported in V1 stays out of this screen.",
          ].map((line) => (
            <div
              key={line}
              className="rounded-[1.2rem] border border-[var(--app-line)] bg-white px-4 py-4 text-sm leading-7 text-[var(--app-text)]"
            >
              {line}
            </div>
          ))}
        </div>
      </div>

      <div className="app-card rounded-[1.75rem] p-5 sm:p-6">
        <TrackingSettingsForm config={trackingConfig} />
      </div>
    </section>
  );
}
