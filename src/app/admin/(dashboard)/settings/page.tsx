import Link from "next/link";
import {
  CheckCircle2,
  Download,
  Globe2,
  Inbox,
  Mail,
  Settings2,
  ShieldCheck,
  User,
} from "lucide-react";

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

function parseSettingsTab(value: string | string[] | undefined): SettingsTab {
  const tab = Array.isArray(value) ? value[0] : value;

  if (tab === "integrations" || tab === "leads") {
    return tab;
  }

  return "general";
}

function SettingsTabs({ activeTab }: { activeTab: SettingsTab }) {
  return (
    <nav
      aria-label="Settings sections"
      className="inline-flex max-w-full overflow-x-auto rounded-[7px] border border-[var(--app-line)] bg-[var(--bg-sunken)] p-[3px]"
    >
      {SETTINGS_TABS.map((tab) => {
        const active = tab.value === activeTab;

        return (
          <Link
            key={tab.value}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-[32px] shrink-0 items-center justify-center rounded-[5px] px-[13px] text-[13px] font-semibold transition",
              active
                ? "bg-[var(--app-panel)] text-[var(--app-text)] shadow-[0_1px_2px_oklch(0.2_0.02_270_/_0.06)]"
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
    <section className="app-card overflow-hidden rounded-[14px] p-0">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--app-line)] px-[18px] py-[15px]">
        <div className="flex items-center gap-2.5">
          <Icon className="h-4 w-4 text-[var(--app-muted-2)]" />
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

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-[10px] border border-[var(--app-line)] bg-[var(--app-panel-muted)] px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--app-muted-2)]">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 truncate text-[13.5px] font-semibold text-[var(--app-text)]",
          mono && "font-mono",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function StatusLine({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "green" | "amber" | "neutral";
}) {
  const toneClass =
    tone === "green"
      ? "text-[var(--app-green-text)]"
      : tone === "amber"
        ? "text-[var(--app-amber-text)]"
        : "text-[var(--app-text)]";

  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--app-line)] py-3 last:border-b-0">
      <span className="text-[13.5px] text-[var(--app-muted)]">{label}</span>
      <span className={cn("text-right text-[13.5px] font-semibold", toneClass)}>{value}</span>
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
}) {
  return (
    <div className="app-card flex min-h-[118px] flex-col justify-between rounded-[14px] p-[18px]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-[550] text-[var(--app-muted)]">{label}</p>
        <span
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-[7px]",
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
    </div>
  );
}

function TopAction({
  activeTab,
  settingsReady,
}: {
  activeTab: SettingsTab;
  settingsReady: boolean;
}) {
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
  session,
  trackingConfig,
  emailConnector,
  leadSnapshot,
}: {
  session: { username: string; loginEmail: string };
  trackingConfig: TrackingConfig | null;
  emailConnector: EmailConnectorConfig | null;
  leadSnapshot: EmailLeadSnapshot | null;
}) {
  const mailchimpConnected = emailConnector?.hasApiKey && Boolean(emailConnector.audienceId);
  const publicPath = `${APP_DOMAIN_HINT}/${session.username}/...`;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SectionCard icon={User} title="Site settings" sub="Your public link space.">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(140deg,oklch(0.7_0.13_50),oklch(0.55_0.18_18))] text-[17px] font-semibold text-white">
              {session.username[0]?.toUpperCase() ?? "B"}
            </span>
            <div className="min-w-0">
              <div className="text-[15px] font-semibold text-[var(--app-text)]">
                @{session.username}
              </div>
              <div className="truncate text-[13px] text-[var(--app-muted)]">
                {session.loginEmail}
              </div>
            </div>
          </div>

          <InfoRow label="Username" value={`@${session.username}`} />
          <InfoRow label="Contact email" value={session.loginEmail} />
          <InfoRow label="Live URL pattern" value={publicPath} mono />
        </div>
      </SectionCard>

      <SectionCard icon={Globe2} title="Public defaults" sub="Applied to new releases.">
        <div className="grid gap-1">
          <StatusLine label="Workspace name" value={trackingConfig?.siteName ?? "Backstage"} />
          <StatusLine
            label="Meta Pixel"
            value={trackingConfig?.metaPixelEnabled ? "Enabled" : "Off"}
            tone={trackingConfig?.metaPixelEnabled ? "green" : "neutral"}
          />
          <StatusLine
            label="Mailchimp"
            value={mailchimpConnected ? "Connected" : "Local lead storage"}
            tone={mailchimpConnected ? "green" : "amber"}
          />
          <StatusLine
            label="Captured leads"
            value={leadSnapshot ? leadSnapshot.totalLeads.toLocaleString() : "Unavailable"}
          />
        </div>

        <div className="mt-4 rounded-[10px] border border-[var(--app-line)] bg-[var(--app-panel-muted)] px-4 py-3 text-[13px] leading-5 text-[var(--app-muted)]">
          Song-specific download offers, headlines, and destination reviews still live inside each
          release editor.
        </div>
      </SectionCard>
    </div>
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
        <Metric label="Total leads" value={leadSnapshot.totalLeads} icon={Inbox} accent />
        <Metric label="Synced" value={leadSnapshot.syncedLeads} icon={CheckCircle2} />
        <Metric label="Local only" value={leadSnapshot.localOnlyLeads} icon={Mail} />
        <Metric label="Needs attention" value={leadSnapshot.failedLeads} icon={ShieldCheck} />
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
    <section className="app-enter mx-auto w-full max-w-[1180px] pb-20">
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
          session={session}
          trackingConfig={trackingConfig}
          emailConnector={emailConnector}
          leadSnapshot={leadSnapshot}
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
