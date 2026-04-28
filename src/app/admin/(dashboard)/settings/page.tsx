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
    <section className="mx-auto grid w-full max-w-[1320px] gap-6">
      <div className="app-card rounded-[1.9rem] p-5 sm:p-6 lg:p-7">
        <p className="app-kicker text-[var(--app-muted)]">Settings</p>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <h2 className="text-4xl font-semibold tracking-[-0.04em] text-[var(--app-text)]">
              One place for public defaults, Mailchimp sync, and lead delivery
            </h2>
            <p className="mt-4 text-sm leading-7 text-[var(--app-muted)]">
              Keep this page operational, not decorative: set your public page
              defaults, connect the only live sync target you support today, and
              review every captured lead without leaving the admin.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {[
              "Mailchimp only",
              "Local-first lead storage",
              "Excel export built in",
            ].map((item) => (
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

      <div className="app-card rounded-[1.9rem] p-5 sm:p-6 lg:p-7">
        <TrackingSettingsForm config={trackingConfig} connector={emailConnector} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(300px,0.92fr)] xl:items-start">
        <div>
          {leadSnapshot ? (
            <EmailLeadsPanel snapshot={leadSnapshot} />
          ) : (
            <EmailLeadsPanelUnavailable />
          )}
        </div>

        <aside className="app-card rounded-[1.75rem] p-5 sm:p-6">
          <p className="app-kicker text-[var(--app-muted)]">Operating notes</p>
          <div className="mt-4 grid gap-3">
            {[
              {
                title: "Public defaults",
                body: "Site name and Meta Pixel rules apply across every published page in this account.",
              },
              {
                title: "Lead routing",
                body: "Every lead stores in Backstage first. Mailchimp is optional outbound sync, not the source of truth.",
              },
              {
                title: "Tags and cleanup",
                body: "Default tags stamp every synced contact. You can export the full inbox even if Mailchimp is turned off.",
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
