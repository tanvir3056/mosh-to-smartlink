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
    <section className="mx-auto grid w-full max-w-[1440px] gap-6">
      <div className="app-card app-enter rounded-[1.9rem] p-5 sm:p-6 lg:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="app-kicker text-[var(--app-muted)]">Settings</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--app-text)] sm:text-4xl">
              Tracking, leads, and delivery
            </h2>
            <p className="mt-4 text-sm leading-7 text-[var(--app-muted)]">
              Keep the product defaults clean, connect the one live lead sync you
              support today, and manage every captured contact from one stable
              control panel.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {["Mailchimp only", "Local lead inbox", "Excel export"].map((item) => (
              <span
                key={item}
                className="rounded-full border border-[var(--app-line)] bg-white/88 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--app-text)]"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_320px] 2xl:items-start">
        <div className="grid gap-6">
          <div className="app-card app-enter app-enter-delay-1 rounded-[1.9rem] p-5 sm:p-6 lg:p-7">
            <TrackingSettingsForm config={trackingConfig} connector={emailConnector} />
          </div>

          {leadSnapshot ? (
            <EmailLeadsPanel snapshot={leadSnapshot} />
          ) : (
            <EmailLeadsPanelUnavailable />
          )}
        </div>

        <aside className="app-card app-enter app-enter-delay-2 rounded-[1.75rem] p-5 sm:p-6 2xl:sticky 2xl:top-6">
          <p className="app-kicker text-[var(--app-muted)]">Operating notes</p>
          <div className="mt-4 grid gap-3">
            {[
              {
                title: "Public defaults",
                body: "Site name and Meta Pixel rules apply account-wide to every published page.",
              },
              {
                title: "Lead routing",
                body: "Every lead stores here first. Mailchimp is an optional outbound sync, not your source of truth.",
              },
              {
                title: "Exports",
                body: "You can export the inbox for Excel even when Mailchimp is disconnected or paused.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[1.2rem] border border-[var(--app-line)] bg-[var(--app-panel-muted)]/45 px-4 py-4"
              >
                <p className="text-sm font-semibold text-[var(--app-text)]">{item.title}</p>
                <p className="mt-1.5 text-sm leading-7 text-[var(--app-muted)]">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
