import { TrackingSettingsForm } from "@/components/admin/tracking-settings-form";
import { getTrackingConfig } from "@/lib/data";

export default async function AdminSettingsPage() {
  const trackingConfig = await getTrackingConfig();

  return (
    <section className="grid gap-5">
      <div className="app-card rounded-[1.75rem] p-5">
        <p className="app-kicker">
          Tracking config
        </p>
        <h2 className="mt-3 text-3xl font-semibold text-[var(--app-text)]">
          First-party analytics and Meta Pixel
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--app-muted)]">
          First-party analytics remain the source of truth. Meta Pixel stays
          optional and additive, with page-level and click-level hooks only.
        </p>
      </div>

      <div className="app-card rounded-[1.75rem] p-5">
        <TrackingSettingsForm config={trackingConfig} />
      </div>
    </section>
  );
}
