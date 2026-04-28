import { EmailLeadsPanel } from "@/components/admin/email-leads-panel";
import { TrackingSettingsForm } from "@/components/admin/tracking-settings-form";
import { requireUserSession } from "@/lib/auth";
import {
  getEmailConnectorConfig,
  getEmailLeadSnapshot,
  getTrackingConfig,
} from "@/lib/data";

export default async function AdminSettingsPage() {
  const session = await requireUserSession();
  const [trackingConfig, emailConnector, leadSnapshot] = await Promise.all([
    getTrackingConfig(session.userId),
    getEmailConnectorConfig(session.userId),
    getEmailLeadSnapshot(session.userId),
  ]);

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.85fr)] xl:items-start">
      <div className="app-card rounded-[1.75rem] p-5 sm:p-6 xl:sticky xl:top-6">
        <p className="app-kicker text-[var(--app-muted)]">Settings</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-[var(--app-text)]">
          Tracking, leads, and site settings
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--app-muted)]">
          Keep the core stack disciplined: first-party analytics, optional paid
          traffic pixels, and lead capture connectors that turn a stream page into
          a real fan-acquisition page.
        </p>

        <div className="mt-6 grid gap-3">
          {[
            "Site name appears across admin and public pages.",
            "Meta Pixel only fires on published public pages.",
            "Mailchimp lives in the settings form on the right whenever you want auto-sync.",
            "Email leads always store locally first, then sync to Mailchimp when configured.",
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

      <div className="grid gap-5">
        <div className="app-card rounded-[1.75rem] p-5 sm:p-6">
          <TrackingSettingsForm config={trackingConfig} connector={emailConnector} />
        </div>
        <EmailLeadsPanel snapshot={leadSnapshot} />
      </div>
    </section>
  );
}
