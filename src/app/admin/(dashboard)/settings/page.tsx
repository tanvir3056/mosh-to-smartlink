import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CheckCircle2,
  Download,
  Globe2,
  Inbox,
  Save,
  Settings2,
  ShieldCheck,
  Target,
  User,
  Users,
} from "lucide-react";

import {
  saveGeneralSettingsAction,
} from "@/app/admin/actions";
import {
  AvatarUploadControl,
} from "@/components/admin/avatar-upload-control";
import {
  EmailLeadsPanel,
  EmailLeadsPanelUnavailable,
} from "@/components/admin/email-leads-panel";
import { TrackingSettingsForm } from "@/components/admin/tracking-settings-form";
import { Button } from "@/components/ui/button";
import { requireUserSession } from "@/lib/auth";
import { APP_DOMAIN_HINT } from "@/lib/constants";
import {
  getEmailConnectorConfig,
  getEmailLeadSnapshot,
  getUserAvatarUrl,
  getTrackingConfig,
} from "@/lib/data";
import type { EmailConnectorConfig, EmailLeadSnapshot, TrackingConfig } from "@/lib/types";
import { cn } from "@/lib/utils";

type SettingsTab = "general" | "integrations" | "leads";

const SETTINGS_TABS: Array<{ label: string; value: SettingsTab; href: string }> = [
  { label: "General", value: "general", href: "/admin/settings" },
  { label: "Integrations", value: "integrations", href: "/admin/settings?tab=integrations" },
  { label: "Lead inbox", value: "leads", href: "/admin/settings?tab=leads" },
];

async function submitGeneralSettingsForm(formData: FormData) {
  "use server";
  await saveGeneralSettingsAction(formData);
  redirect("/admin/settings?saved=general");
}

function parseSettingsTab(value: string | string[] | undefined): SettingsTab {
  const tab = Array.isArray(value) ? value[0] : value;

  if (tab === "integrations" || tab === "leads") {
    return tab;
  }

  return "general";
}

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseSettingsResult(params: Record<string, string | string[] | undefined>) {
  const saved = getSingleParam(params.saved);
  const synced = getSingleParam(params.synced);
  const syncError = getSingleParam(params.syncError);

  if (saved === "general" || saved === "integrations") {
    return {
      label: "Settings saved",
      message: "Settings saved.",
      tone: "success" as const,
    };
  }

  if (synced === "1") {
    return {
      label: "Lead sync refreshed",
      message: "Lead sync refreshed.",
      tone: "success" as const,
    };
  }

  if (syncError === "1") {
    return {
      label: "Lead sync failed",
      message: "Lead sync could not be completed. Try again in a moment.",
      tone: "error" as const,
    };
  }

  return null;
}

function SettingsResultToast({
  result,
}: {
  result: ReturnType<typeof parseSettingsResult>;
}) {
  if (!result) {
    return null;
  }

  const isError = result.tone === "error";

  return (
    <div
      role="status"
      aria-label={result.label}
      className={cn(
        "fixed bottom-6 left-1/2 z-50 inline-flex -translate-x-1/2 items-center gap-2 rounded-[var(--r-full)] px-[18px] py-3 text-[13.5px] font-semibold shadow-[var(--sh-lg)]",
        isError
          ? "border border-[var(--app-red-line)] bg-[var(--app-red-soft)] text-[var(--app-red-text)]"
          : "bg-[var(--app-text)] text-[var(--app-bg)]",
      )}
    >
      <CheckCircle2 className="h-4 w-4" />
      {result.message}
    </div>
  );
}

function SettingsTabs({ activeTab }: { activeTab: SettingsTab }) {
  return (
    <nav
      aria-label="Settings sections"
      className="inline-flex max-w-full overflow-x-auto rounded-[var(--r-sm)] border border-[var(--app-line)] bg-[var(--app-soft)] p-[3px]"
    >
      {SETTINGS_TABS.map((tab) => {
        const active = tab.value === activeTab;

        return (
          <Link
            key={tab.value}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-[32px] shrink-0 items-center justify-center rounded-[var(--r-xs)] px-[13px] text-[13px] font-semibold transition",
              active
                ? "bg-[var(--app-panel)] text-[var(--app-text)] shadow-[var(--sh-sm)]"
                : "text-[var(--app-muted)] hover:bg-[var(--app-panel-muted)] hover:text-[var(--app-text)]",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SectionCard({
  title,
  sub,
  icon: Icon,
  right,
  children,
}: {
  title: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="app-card overflow-hidden rounded-[var(--r-lg)] p-0">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--app-line)] px-[18px] py-[15px]">
        <div className="flex items-center gap-2.5">
          <span
            data-testid="settings-section-icon"
            className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[var(--r-sm)] border border-[var(--app-line)] bg-[var(--app-panel-muted)] text-[var(--app-muted)]"
          >
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-[14.5px] font-semibold text-[var(--app-text)]">{title}</h2>
            {sub ? <p className="mt-0.5 text-xs text-[var(--app-muted-2)]">{sub}</p> : null}
          </div>
        </div>
        {right}
      </div>
      <div className="p-[18px]">{children}</div>
    </section>
  );
}

function Metric({
  label,
  value,
  sub,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
}) {
  const metricId = String(label)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return (
    <div
      data-testid={`settings-metric-${metricId}`}
      className="app-card flex min-h-[118px] flex-col justify-between rounded-[var(--r-lg)] p-[18px]"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-[550] text-[var(--app-muted)]">{label}</p>
        <span
          data-testid="settings-metric-icon"
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-[var(--r-sm)]",
            accent
              ? "bg-[var(--app-accent-soft)] text-[var(--app-accent-text)]"
              : "bg-[var(--app-panel-muted)] text-[var(--app-muted-2)]",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="font-[var(--font-display)] text-[28px] font-semibold leading-none tracking-[-0.03em] text-[var(--app-text)]">
        {value}
      </div>
      {sub ? (
        <p className="text-[12.5px] leading-5 text-[var(--app-muted-2)]">{sub}</p>
      ) : null}
    </div>
  );
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function TopAction({
  activeTab,
  settingsReady,
}: {
  activeTab: SettingsTab;
  settingsReady: boolean;
}) {
  if (activeTab === "general" && settingsReady) {
    return (
      <Button type="submit" form="general-settings-form" className="shrink-0">
        <Save className="h-4 w-4" />
        Save settings
      </Button>
    );
  }

  if (activeTab === "integrations" && settingsReady) {
    return (
      <Button type="submit" form="tracking-settings-form" className="shrink-0">
        <CheckCircle2 className="h-4 w-4" />
        Save settings
      </Button>
    );
  }

  if (activeTab === "leads") {
    return (
      <Link href="/api/admin/email-leads/export" prefetch={false} className="shrink-0">
        <Button type="button" tone="secondary">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </Link>
    );
  }

  return (
    <span className="app-chip">
      <ShieldCheck className="h-3.5 w-3.5" />
      Account live
    </span>
  );
}

function GeneralSettings({
  avatarUrl,
  session,
  trackingConfig,
}: {
  avatarUrl: string | null;
  session: { username: string; loginEmail: string };
  trackingConfig: TrackingConfig | null;
}) {
  const defaults = trackingConfig ?? {
    siteName: "Backstage",
    defaultHeadline: "Stream now",
    showArtistName: true,
    previewPlayerDefaultEnabled: true,
    leadCaptureDefaultEnabled: false,
  };

  return (
    <form
      id="general-settings-form"
      action={submitGeneralSettingsForm}
      className="grid gap-4 lg:grid-cols-2"
    >
      <SectionCard icon={User} title="Site settings" sub="Your public link space.">
        <div className="flex flex-col gap-4">
          <AvatarUploadControl username={session.username} avatarUrl={avatarUrl} />

          <label className="grid gap-2">
            <span className="text-sm font-medium text-[var(--app-text)]">Display name</span>
            <input
              name="site_name"
              defaultValue={defaults.siteName}
              className="app-input"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-[var(--app-text)]">Username</span>
            <div className="flex overflow-hidden rounded-[var(--r-sm)] border border-[var(--app-line)] bg-[var(--app-panel)] shadow-[var(--sh-xs)] focus-within:border-[var(--app-accent-line)] focus-within:ring-4 focus-within:ring-[var(--app-accent-soft)]">
              <span className="inline-flex items-center border-r border-[var(--app-line)] bg-[var(--app-panel-muted)] px-3 font-mono text-[12px] text-[var(--app-muted-2)]">
                @
              </span>
              <input
                value={session.username}
                readOnly
                aria-label="Username"
                className="min-h-10 min-w-0 flex-1 bg-transparent px-3 font-mono text-[13px] text-[var(--app-text)] outline-none"
              />
            </div>
            <span className="break-words text-[12.5px] text-[var(--app-muted-2)]">
              Public pages publish under {APP_DOMAIN_HINT}/{session.username}.
            </span>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-[var(--app-text)]">Contact email</span>
            <input
              value={session.loginEmail}
              readOnly
              aria-label="Contact email"
              className="app-input"
            />
          </label>
        </div>
      </SectionCard>

      <SectionCard icon={Globe2} title="Public defaults" sub="Applied to new releases.">
        <div className="flex flex-col gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-[var(--app-text)]">Default headline</span>
            <input
              name="default_headline"
              defaultValue={defaults.defaultHeadline}
              className="app-input"
            />
          </label>
          <div className="flex flex-col gap-3">
            <label className="app-card-soft flex items-start gap-3 rounded-[var(--r-md)] px-4 py-3">
              <input
                name="show_artist_name"
                type="checkbox"
                aria-label="Show artist name on every page"
                defaultChecked={defaults.showArtistName}
                className="mt-0.5 h-4 w-4 rounded border-[var(--app-line)] bg-transparent"
              />
              <span>
                <span className="block text-sm font-semibold text-[var(--app-text)]">
                  Show artist name on every page
                </span>
                <span className="mt-1 block text-[12.5px] leading-5 text-[var(--app-muted)]">
                  Display the artist above the title.
                </span>
              </span>
            </label>
            <label className="app-card-soft flex items-start gap-3 rounded-[var(--r-md)] px-4 py-3">
              <input
                name="preview_player_default_enabled"
                type="checkbox"
                aria-label="Enable preview player by default"
                defaultChecked={defaults.previewPlayerDefaultEnabled}
                className="mt-0.5 h-4 w-4 rounded border-[var(--app-line)] bg-transparent"
              />
              <span>
                <span className="block text-sm font-semibold text-[var(--app-text)]">
                  Enable preview player by default
                </span>
                <span className="mt-1 block text-[12.5px] leading-5 text-[var(--app-muted)]">
                  Adds the 30-second clip when available.
                </span>
              </span>
            </label>
            <label className="app-card-soft flex items-start gap-3 rounded-[var(--r-md)] px-4 py-3">
              <input
                name="lead_capture_default_enabled"
                type="checkbox"
                aria-label="Lead capture on by default"
                defaultChecked={defaults.leadCaptureDefaultEnabled}
                className="mt-0.5 h-4 w-4 rounded border-[var(--app-line)] bg-transparent"
              />
              <span>
                <span className="block text-sm font-semibold text-[var(--app-text)]">
                  Lead capture on by default
                </span>
                <span className="mt-1 block text-[12.5px] leading-5 text-[var(--app-muted)]">
                  New releases start with the email form enabled.
                </span>
              </span>
            </label>
          </div>
        </div>
      </SectionCard>

    </form>
  );
}

function IntegrationsSettings({
  settingsReady,
  trackingConfig,
  emailConnector,
}: {
  settingsReady: boolean;
  trackingConfig: TrackingConfig | null;
  emailConnector: EmailConnectorConfig | null;
}) {
  if (!settingsReady || !trackingConfig || !emailConnector) {
    return (
      <SectionCard icon={Settings2} title="Settings unavailable" sub="Configuration could not load.">
        <p className="text-sm leading-6 text-[var(--app-muted)]">
          The page loaded, but the saved settings could not be read right now. Reload and try again.
        </p>
      </SectionCard>
    );
  }

  return (
    <TrackingSettingsForm
      config={trackingConfig}
      connector={emailConnector}
      formId="tracking-settings-form"
      showFooterSubmit={false}
      compactHeader
    />
  );
}

function LeadInboxSettings({ leadSnapshot }: { leadSnapshot: EmailLeadSnapshot | null }) {
  if (!leadSnapshot) {
    return <EmailLeadsPanelUnavailable />;
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total leads" value={leadSnapshot.totalLeads} icon={Users} accent />
        <Metric
          label="This week"
          value={leadSnapshot.recentLeads}
          sub="Last 7 days"
          icon={Inbox}
        />
        <Metric
          label="Synced to Mailchimp"
          value={formatPercent(leadSnapshot.syncedLeadRate)}
          sub={`${leadSnapshot.syncedLeads} of ${leadSnapshot.totalLeads} total`}
          icon={CheckCircle2}
        />
        <Metric
          label="Conversion rate"
          value={formatPercent(leadSnapshot.leadConversionRate)}
          sub="Visits to email"
          icon={Target}
        />
      </div>
      <EmailLeadsPanel snapshot={leadSnapshot} showSummary={false} />
    </div>
  );
}

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const activeTab = parseSettingsTab(params.tab);
  const result = parseSettingsResult(params);
  const session = await requireUserSession();
  const [trackingResult, connectorResult, leadSnapshotResult, avatarResult] = await Promise.allSettled([
    getTrackingConfig(session.userId),
    getEmailConnectorConfig(session.userId),
    getEmailLeadSnapshot(session.userId),
    getUserAvatarUrl(session.userId),
  ]);
  const settingsReady =
    trackingResult.status === "fulfilled" && connectorResult.status === "fulfilled";
  const trackingConfig =
    trackingResult.status === "fulfilled" ? trackingResult.value : null;
  const emailConnector =
    connectorResult.status === "fulfilled" ? connectorResult.value : null;
  const leadSnapshot =
    leadSnapshotResult.status === "fulfilled" ? leadSnapshotResult.value : null;
  const avatarUrl =
    avatarResult.status === "fulfilled" ? avatarResult.value : null;

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

  if (avatarResult.status === "rejected") {
    console.error(
      "Failed to load avatar for settings page.",
      avatarResult.reason,
    );
  }

  return (
    <section className="app-enter mx-auto w-full max-w-[1180px] pb-20">
      <SettingsResultToast result={result} />

      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <h1 className="font-[var(--font-display)] text-[25px] font-semibold tracking-[-0.022em] text-[var(--app-text)]">
            Settings
          </h1>
          <p className="mt-1.5 max-w-[620px] text-[14.5px] leading-6 text-[var(--app-muted)]">
            Workspace defaults, integrations and your collected leads.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <TopAction activeTab={activeTab} settingsReady={settingsReady} />
        </div>
      </header>

      <div className="mb-[22px]">
        <SettingsTabs activeTab={activeTab} />
      </div>

      {activeTab === "general" ? (
        <GeneralSettings
          avatarUrl={avatarUrl}
          session={session}
          trackingConfig={trackingConfig}
        />
      ) : null}

      {activeTab === "integrations" ? (
        <IntegrationsSettings
          settingsReady={settingsReady}
          trackingConfig={trackingConfig}
          emailConnector={emailConnector}
        />
      ) : null}

      {activeTab === "leads" ? <LeadInboxSettings leadSnapshot={leadSnapshot} /> : null}
    </section>
  );
}
