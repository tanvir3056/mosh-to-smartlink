import {
  EmailLeadsPanel,
  EmailLeadsPanelUnavailable,
} from "@/components/admin/email-leads-panel";
import { TrackingSettingsForm } from "@/components/admin/tracking-settings-form";
import { requireUserSession } from "@/lib/auth";
import {
  getEmailConnectorConfig,
  getEmailLeadSnapshot,
  getTrackingConfig,
} from "@/lib/data";

export default async function AdminSettingsPage() {
  const session = await requireUserSession();
  const [trackingResult, connectorResult, leadSnapshotResult] = await Promise.allSettled([
    getTrackingConfig(session.userId),
    getEmailConnectorConfig(session.userId),
    getEmailLeadSnapshot(session.userId),
  ]);
  const settingsReady =
    trackingResult.status === "fulfilled" && connectorResult.status === "fulfilled";
  const trackingConfig =
    trackingResult.status === "fulfilled" ? trackingResult.value : null;
  const emailConnector =
    connectorResult.status === "fulfilled" ? connectorResult.value : null;
  const leadSnapshot =
    leadSnapshotResult.status === "fulfilled" ? leadSnapshotResult.value : null;

  if (trackingResult.status === "rejected") {
    console.error(
      "Failed to load tracking config for settings page.",
      trackingResult.reason,
    );
  }

  if (connectorResult.status === "rejected") {
    console.error(
      "Failed to load email connector config for settings page.",
      connectorResult.reason,
    );
  }

  if (leadSnapshotResult.status === "rejected") {
    console.error(
      "Failed to load email lead snapshot for settings page.",
      leadSnapshotResult.reason,
    );
  }

  return (
    <section className="mx-auto grid w-full max-w-[1320px] gap-5">
      <div className="app-card app-enter rounded-[1.85rem] px-5 py-5 sm:px-6 sm:py-6 lg:px-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="app-kicker text-[var(--app-muted)]">Settings</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--app-text)] sm:text-4xl">
              Site settings
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--app-muted)]">
              Public defaults, Mailchimp sync, and lead export.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {["Mailchimp", "Lead inbox", "Excel export"].map((item) => (
              <span
                key={item}
                className="rounded-full border border-[var(--app-line)] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--app-text)]"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="app-card app-enter app-enter-delay-1 rounded-[1.9rem] px-5 py-5 sm:px-6 sm:py-6 lg:px-7">
        {settingsReady && trackingConfig && emailConnector ? (
          <TrackingSettingsForm config={trackingConfig} connector={emailConnector} />
        ) : (
          <div className="grid gap-4">
            <div>
              <p className="app-kicker text-[var(--app-muted)]">Configuration</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--app-text)]">
                Settings unavailable
              </h3>
              <p className="mt-3 text-sm leading-7 text-[var(--app-muted)]">
                The page loaded, but the saved settings could not be read right now.
                Reload and try again.
              </p>
            </div>
          </div>
        )}
      </div>

      {leadSnapshot ? (
        <EmailLeadsPanel snapshot={leadSnapshot} />
      ) : (
        <EmailLeadsPanelUnavailable />
      )}
    </section>
  );
}
