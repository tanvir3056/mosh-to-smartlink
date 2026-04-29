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
  const [trackingConfig, emailConnector] = await Promise.all([
    getTrackingConfig(session.userId),
    getEmailConnectorConfig(session.userId),
  ]);
  let leadSnapshot = null;

  try {
    leadSnapshot = await getEmailLeadSnapshot(session.userId);
  } catch (error) {
    console.error("Failed to load email lead snapshot for settings page.", error);
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
        <TrackingSettingsForm config={trackingConfig} connector={emailConnector} />
      </div>

      {leadSnapshot ? (
        <EmailLeadsPanel snapshot={leadSnapshot} />
      ) : (
        <EmailLeadsPanelUnavailable />
      )}
    </section>
  );
}
