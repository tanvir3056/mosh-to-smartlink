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
    <section className="mx-auto grid w-full max-w-[1180px] gap-5">
      <div className="app-enter px-0 py-1">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="app-kicker text-[var(--app-muted)]">Settings</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[var(--app-text)]">
              Settings
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">
              Workspace defaults, integrations and collected leads.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-[9px] border border-[var(--app-line)] bg-white px-3 py-2 text-sm text-[var(--app-muted)] shadow-[0_1px_2px_rgba(20,24,34,0.05)]">
            <span className="app-chip">Mailchimp</span>
            <span className="app-chip">Lead inbox</span>
            <span className="app-chip">Export</span>
          </div>
        </div>
      </div>

      <div className="app-card app-enter app-enter-delay-1 rounded-[14px] px-5 py-5 sm:px-6 sm:py-6 lg:px-7">
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
