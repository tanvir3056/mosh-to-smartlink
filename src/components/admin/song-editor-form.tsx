"use client";
/* eslint-disable @next/next/no-img-element */

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  EyeOff,
  ExternalLink,
  Globe2,
  Link2,
  ListMusic,
  Mail,
  Save,
  Search,
} from "lucide-react";

import { INITIAL_ACTION_STATE, type ActionState } from "@/app/admin/action-types";
import {
  publishSongAction,
  saveSongDraftAction,
  unpublishSongAction,
} from "@/app/admin/actions";
import { ArtworkUploadField } from "@/components/admin/artwork-upload-field";
import { DeleteSongButton } from "@/components/admin/delete-song-button";
import { FormStateMessage } from "@/components/admin/form-state";
import { PublicLinkPanel } from "@/components/admin/public-link-panel";
import { StatusPill } from "@/components/admin/status-pill";
import { ServiceIcon } from "@/components/service-icon";
import { Button } from "@/components/ui/button";
import { SERVICE_LABELS, STREAMING_SERVICES } from "@/lib/constants";
import type {
  DashboardSongRow,
  EmailConnectorConfig,
  MatchStatus,
  ReviewStatus,
  SongPageWithLinks,
  StreamingService,
} from "@/lib/types";
import { buildPublicSongPath, buildServiceSearchUrl } from "@/lib/utils";

type ResolutionMode = "search_fallback" | "manual";

type ServiceDraft = {
  url: string;
  originalUrl: string;
  isVisible: boolean;
  matchStatus: MatchStatus;
  resolutionMode: ResolutionMode;
};

function deriveReviewStatus(
  matchStatus: SongPageWithLinks["links"][number]["matchStatus"],
  url: string | null,
): ReviewStatus {
  if (!url || matchStatus === "unresolved") {
    return "unresolved";
  }

  if (matchStatus === "matched") {
    return "approved";
  }

  return "needs_review";
}

function formatConfidence(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "No score";
  }

  return `${Math.round(value * 100)}% confidence`;
}

function formatDuration(value: number | null | undefined) {
  if (!value) {
    return null;
  }

  const totalSeconds = Math.max(0, Math.round(value / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function reviewStatusLabel(value: ReviewStatus) {
  switch (value) {
    case "approved":
      return "Approved";
    case "needs_review":
      return "Needs review";
    case "unresolved":
      return "Unresolved";
  }
}

function serviceStatusTone(label: string) {
  if (label === "Approved") {
    return "border-[var(--app-green-line)] bg-[var(--app-green-soft)] text-[var(--app-green-text)]";
  }

  if (label === "Needs review" || label === "Search fallback") {
    return "border-[var(--app-amber-line)] bg-[var(--app-amber-soft)] text-[var(--app-amber-text)]";
  }

  return "border-[var(--app-line)] bg-[var(--app-panel-muted)] text-[var(--app-muted)]";
}

function ServiceStatusBadge({ label }: { label: string }) {
  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-semibold ${serviceStatusTone(label)}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}

function ServiceConfidencePill({ label }: { label: string }) {
  return (
    <span className="hidden h-6 shrink-0 items-center rounded-full border border-[var(--app-line)] bg-[var(--app-panel-muted)] px-2.5 text-[12px] font-medium text-[var(--app-muted)] sm:inline-flex">
      {label}
    </span>
  );
}

function ServiceVisibilitySwitch({
  name,
  checked,
  onChange,
  ariaLabel = "Show on public page",
}: {
  name: string;
  checked: boolean;
  onChange: (isVisible: boolean) => void;
  ariaLabel?: string;
}) {
  return (
    <label className="group relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full">
      <input
        name={name}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
        aria-label={ariaLabel}
        className="peer sr-only"
      />
      <span className="pointer-events-none absolute inset-0 rounded-full border border-[var(--app-line)] bg-[var(--app-panel-muted)] transition peer-checked:border-[var(--app-accent-line)] peer-checked:bg-[var(--app-accent)] peer-focus-visible:shadow-[var(--ring)]" />
      <span className="pointer-events-none relative ml-0.5 h-5 w-5 rounded-full bg-[var(--app-panel)] shadow-[var(--sh-sm)] transition-transform peer-checked:translate-x-5" />
    </label>
  );
}

function formatDestinationAttention(count: number) {
  if (count === 0) {
    return "All visible destinations are ready.";
  }

  return `${count} destination${count === 1 ? "" : "s"} still ${
    count === 1 ? "needs" : "need"
  } attention before launch.`;
}

function needsResolutionControl(
  matchStatus: SongPageWithLinks["links"][number]["matchStatus"] | MatchStatus,
  url: string | null,
) {
  return !url || matchStatus !== "matched";
}

function isValidHttpUrl(value: string | null) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && Boolean(url.hostname);
  } catch {
    return false;
  }
}

type EditorFormAction = (payload: FormData) => void;

function EditorSection({
  icon,
  id,
  title,
  subtitle,
  right,
  children,
  className,
}: {
  icon: React.ReactNode;
  id?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`app-card overflow-hidden rounded-[var(--r-lg)] ${className ?? ""}`}
    >
      <div className="flex flex-col gap-3 border-b border-[var(--app-line)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-start gap-3 sm:items-center">
          <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[var(--r-sm)] border border-[var(--app-line)] bg-[var(--app-panel-muted)] text-[var(--app-muted)]">
            {icon}
          </span>
          <div className="min-w-0">
            <h3 className="text-[15.5px] font-semibold text-[var(--app-text)]">
              {title}
            </h3>
            {subtitle ? (
              <p className="mt-0.5 text-[12.5px] text-[var(--app-muted)]">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
        {right ? (
          <div className="w-full sm:w-auto sm:shrink-0 [&>*]:w-full sm:[&>*]:w-auto">
            {right}
          </div>
        ) : null}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function SaveButtons({
  canPublish,
  isPublished,
  draftAction,
  publishAction,
  unpublishAction,
  stacked = false,
}: {
  canPublish: boolean;
  isPublished: boolean;
  draftAction: EditorFormAction;
  publishAction: EditorFormAction;
  unpublishAction: EditorFormAction;
  stacked?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <div className={`flex flex-col gap-3 ${stacked ? "" : "sm:flex-row"}`}>
      {isPublished ? (
        <>
          <Button
            type="submit"
            formAction={publishAction}
            busy={pending}
            disabled={pending || !canPublish}
          >
            <Save className="h-4 w-4" />
            Save changes
          </Button>
          <Button
            type="submit"
            tone="ghost"
            formAction={unpublishAction}
            busy={pending}
          >
            <EyeOff className="h-4 w-4" />
            Unpublish
          </Button>
        </>
      ) : (
        <>
          <Button
            type="submit"
            formAction={publishAction}
            busy={pending}
            disabled={pending || !canPublish}
          >
            <Globe2 className="h-4 w-4" />
            Publish release
          </Button>
          <Button
            type="submit"
            tone="secondary"
            formAction={draftAction}
            busy={pending}
          >
            <Save className="h-4 w-4" />
            Save draft
          </Button>
        </>
      )}
    </div>
  );
}

function MetaField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-[var(--app-text)]">{label}</span>
      {children}
    </label>
  );
}

function LeadConnectorField({
  connector,
}: {
  connector?: EmailConnectorConfig | null;
}) {
  const connected = Boolean(connector?.hasApiKey && connector.audienceId);
  const value = connected
    ? `Mailchimp · ${connector?.audienceId}`
    : "Local lead inbox";

  return (
    <div className="grid gap-2">
      <label htmlFor="email-capture-connector" className="text-sm font-medium text-[var(--app-text)]">
        Connector
      </label>
      <div className="flex overflow-hidden rounded-[var(--r-sm)] border border-[var(--app-line)] bg-[var(--app-panel)] shadow-[var(--sh-xs)]">
        <input
          id="email-capture-connector"
          value={value}
          readOnly
          className="min-h-10 min-w-0 flex-1 bg-transparent px-3 text-[13px] text-[var(--app-text)] outline-none"
        />
        <span
          className={
            connected
              ? "inline-flex items-center border-l border-[var(--app-green-line)] bg-[var(--app-green-soft)] px-3 text-[12px] font-semibold lowercase text-[var(--app-green-text)]"
              : "inline-flex items-center border-l border-[var(--app-line)] bg-[var(--app-panel-muted)] px-3 text-[12px] font-semibold lowercase text-[var(--app-muted)]"
          }
        >
          {connected ? "connected" : "local"}
        </span>
      </div>
    </div>
  );
}

function LeadConnectorNote({
  connector,
}: {
  connector?: EmailConnectorConfig | null;
}) {
  const connected = Boolean(connector?.hasApiKey && connector.audienceId);

  return (
    <div className="rounded-[var(--r-md)] border border-[var(--app-accent-line)] bg-[var(--app-accent-soft)] px-4 py-3 text-[13px] leading-6 text-[var(--app-muted)]">
      {connected
        ? "Leads sync to your connected Mailchimp audience and appear in Settings -> Lead inbox."
        : "Leads are saved in Settings -> Lead inbox. Connect Mailchimp in Settings to sync automatically."}
    </div>
  );
}

export function SongEditorForm({
  page,
  performance,
  emailConnector,
  showImportedDraftConfirmation = false,
  showMissingLinksReview = false,
  showPublishedConfirmation = false,
  showUnpublishedConfirmation = false,
}: {
  page: SongPageWithLinks;
  performance?: DashboardSongRow | null;
  emailConnector?: EmailConnectorConfig | null;
  showImportedDraftConfirmation?: boolean;
  showMissingLinksReview?: boolean;
  showPublishedConfirmation?: boolean;
  showUnpublishedConfirmation?: boolean;
}) {
  const [draftState, draftAction] = useActionState<ActionState, FormData>(
    saveSongDraftAction,
    INITIAL_ACTION_STATE,
  );
  const [publishState, publishAction] = useActionState<ActionState, FormData>(
    publishSongAction,
    INITIAL_ACTION_STATE,
  );
  const [unpublishState, unpublishAction] = useActionState<ActionState, FormData>(
    unpublishSongAction,
    INITIAL_ACTION_STATE,
  );
  const state =
    publishState.error || publishState.success
      ? publishState
      : unpublishState.error || unpublishState.success
        ? unpublishState
        : draftState;
  const [artworkUrl, setArtworkUrl] = useState(page.song.artworkUrl);
  const serviceLookup = useMemo(
    () => new Map(page.links.map((entry) => [entry.service, entry])),
    [page.links],
  );
  const fallbackQuery = useMemo(
    () => [page.song.artistName, page.song.title].filter(Boolean).join(" "),
    [page.song.artistName, page.song.title],
  );
  const [serviceDrafts, setServiceDrafts] = useState<
    Record<StreamingService, ServiceDraft>
  >(() =>
    Object.fromEntries(
      STREAMING_SERVICES.map((service) => {
        const link = page.links.find((entry) => entry.service === service);
        return [
          service,
          {
            url: link?.url ?? "",
            originalUrl: link?.url ?? "",
            isVisible: link?.isVisible ?? true,
            matchStatus: link?.matchStatus ?? "unresolved",
            resolutionMode:
              !link?.url || link?.matchStatus === "search_fallback" || link?.matchStatus === "unresolved"
                ? "search_fallback"
                : "manual",
          } satisfies ServiceDraft,
        ];
      }),
    ) as Record<StreamingService, ServiceDraft>,
  );
  const [expandedServices, setExpandedServices] = useState<
    Record<StreamingService, boolean>
  >(() =>
    Object.fromEntries(
      STREAMING_SERVICES.map((service) => {
        const link = page.links.find((entry) => entry.service === service);
        const needsAttention =
          !link?.url ||
          link.matchStatus !== "matched" ||
          deriveReviewStatus(link.matchStatus, link.url) !== "approved";

        return [service, needsAttention];
      }),
    ) as Record<StreamingService, boolean>,
  );
  const importedMissingServices = useMemo(
    () =>
      STREAMING_SERVICES.filter((service) => {
        const link = serviceLookup.get(service);
        return !link?.url || link.matchStatus === "search_fallback" || link.matchStatus === "unresolved";
      }),
    [serviceLookup],
  );
  const [showMissingLinksDialog, setShowMissingLinksDialog] = useState(
    () => showMissingLinksReview && importedMissingServices.length > 0,
  );
  const linkedServices = STREAMING_SERVICES.filter((service) => {
    const draft = serviceDrafts[service];
    const effectiveUrl =
      draft.resolutionMode === "search_fallback"
        ? buildServiceSearchUrl(service, fallbackQuery)
        : draft.url;

    return draft.isVisible && isValidHttpUrl(effectiveUrl);
  }).length;
  const manualReviewCount = STREAMING_SERVICES.filter((service) => {
    const draft = serviceDrafts[service];
    if (!draft.isVisible) {
      return false;
    }

    const effectiveStatus =
      needsResolutionControl(draft.matchStatus, draft.url) &&
      draft.resolutionMode === "search_fallback"
        ? "search_fallback"
        : draft.matchStatus;
    const effectiveUrl =
      draft.resolutionMode === "search_fallback"
        ? buildServiceSearchUrl(service, fallbackQuery)
        : draft.url || null;

    return (
      !effectiveUrl ||
      (deriveReviewStatus(effectiveStatus, effectiveUrl) !== "approved" &&
        effectiveStatus !== "search_fallback")
    );
  }).length;
  const visitCount = performance?.visitCount ?? 0;
  const clickCount = performance?.clickCount ?? 0;
  const publishReady = linkedServices > 0;
  const allVisibleDestinationsReady = publishReady && manualReviewCount === 0;
  const readinessScore = publishReady
    ? Math.min(100, Math.round((linkedServices / STREAMING_SERVICES.length) * 100))
    : 0;
  const readinessMessage = publishReady || manualReviewCount > 0
    ? formatDestinationAttention(manualReviewCount)
    : "Show at least one valid streaming destination before this page goes live.";
  const publicHref = buildPublicSongPath(page.page.username, page.page.slug);
  const isPublished = page.page.status === "published";
  const headerLinkHref = isPublished
    ? publicHref
    : "#streaming-destinations";
  const headerLinkLabel = isPublished ? "Open live page" : "Review links";
  const HeaderLinkIcon = isPublished ? ExternalLink : Search;
  const [leadCaptureEnabled, setLeadCaptureEnabled] = useState(
    page.emailCapture.enabled,
  );
  const [leadCaptureDraft, setLeadCaptureDraft] = useState({
    title: page.emailCapture.title ?? "",
    buttonLabel: page.emailCapture.buttonLabel ?? "",
    description: page.emailCapture.description ?? "",
    downloadUrl: page.emailCapture.downloadUrl ?? "",
    downloadLabel: page.emailCapture.downloadLabel ?? "",
    tag: page.emailCapture.tag ?? "",
  });

  function updateServiceDraft(
    service: StreamingService,
    updater: (draft: ServiceDraft) => ServiceDraft,
  ) {
    setServiceDrafts((current) => ({
      ...current,
      [service]: updater(current[service]),
    }));
  }

  function closeMissingLinksDialog() {
    setShowMissingLinksDialog(false);
  }

  function toggleServiceExpanded(service: StreamingService) {
    setExpandedServices((current) => ({
      ...current,
      [service]: !current[service],
    }));
  }

  function updateLeadCaptureDraft(
    key: keyof typeof leadCaptureDraft,
    value: string,
  ) {
    setLeadCaptureDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <>
      {showMissingLinksDialog && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-[rgba(16,19,27,0.38)] px-4 py-8 backdrop-blur-sm sm:items-center">
          <div className="app-card w-full max-w-3xl rounded-[var(--r-lg)] p-5 shadow-[var(--sh-xl)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="app-kicker text-[var(--app-muted)]">
                  Link review
                </p>
                <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--app-text)]">
                  Some music service links were not found.
                </h3>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--app-muted)]">
                  Choose search fallback or add a link manually before you save or publish.
                </p>
              </div>
              <button
                type="button"
                onClick={closeMissingLinksDialog}
                className="app-chip shrink-0"
              >
                Continue
              </button>
            </div>

            <div className="mt-6 grid gap-4">
              {importedMissingServices.map((service) => {
                const draft = serviceDrafts[service];
                const fallbackUrl = buildServiceSearchUrl(service, fallbackQuery);
                const manualFieldError = state.fieldErrors?.[service];

                return (
                  <div
                    key={`review-${service}`}
                    className="rounded-[var(--r-md)] border border-[var(--app-line)] bg-[var(--app-panel)] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-base font-semibold text-[var(--app-text)]">
                        {SERVICE_LABELS[service]}
                      </div>
                      <label className="inline-flex items-center gap-2 text-sm text-[var(--app-muted)]">
                        <input
                          type="checkbox"
                          checked={draft.isVisible}
                          onChange={(event) => {
                            const isVisible = event.currentTarget.checked;
                            updateServiceDraft(service, (current) => ({
                              ...current,
                              isVisible,
                            }));
                          }}
                          className="h-4 w-4 rounded border-slate-300 bg-transparent"
                        />
                        Show on page
                      </label>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-[var(--r-sm)] border border-[var(--app-line)] bg-[var(--app-panel-muted)] px-4 py-3 text-sm font-medium text-[var(--app-text)]">
                        <input
                          type="radio"
                          name={`review-${service}`}
                          checked={draft.resolutionMode === "search_fallback"}
                          onChange={() =>
                            updateServiceDraft(service, (current) => ({
                              ...current,
                              resolutionMode: "search_fallback",
                              matchStatus: "search_fallback",
                              url: fallbackUrl,
                            }))
                          }
                          className="h-4 w-4"
                        />
                        Use search fallback
                      </label>
                      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-[var(--r-sm)] border border-[var(--app-line)] bg-[var(--app-panel-muted)] px-4 py-3 text-sm font-medium text-[var(--app-text)]">
                        <input
                          type="radio"
                          name={`review-${service}`}
                          checked={draft.resolutionMode === "manual"}
                          onChange={() =>
                            updateServiceDraft(service, (current) => ({
                              ...current,
                              resolutionMode: "manual",
                              matchStatus: current.url ? "manual" : "unresolved",
                              url:
                                current.matchStatus === "search_fallback" ||
                                current.url === fallbackUrl
                                  ? ""
                                  : current.url,
                            }))
                          }
                          className="h-4 w-4"
                        />
                        Manually add link
                      </label>
                    </div>

                    {draft.resolutionMode === "manual" ? (
                      <div className="mt-4 grid gap-2">
                        <label className="app-kicker text-[var(--app-muted)]">
                          Manual URL
                        </label>
                        <input
                          value={draft.url}
                          onChange={(event) => {
                            const url = event.currentTarget.value;
                            updateServiceDraft(service, (current) => ({
                              ...current,
                              url,
                              matchStatus: url ? "manual" : "unresolved",
                            }));
                          }}
                          className="app-input"
                          placeholder="https://..."
                          aria-invalid={Boolean(manualFieldError)}
                        />
                        {manualFieldError ? (
                          <p className="text-sm text-red-600">{manualFieldError}</p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-4 text-sm leading-7 text-[var(--app-muted)]">
                        The public page will keep the Search button for {SERVICE_LABELS[service]}.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <form
        action={draftAction}
        className="mx-auto grid w-full max-w-[1240px] gap-5"
      >
        <input type="hidden" name="song_id" value={page.song.id} />
        <input type="hidden" name="current_slug" value={page.page.slug} />
        <input
          type="hidden"
          name="spotify_track_id"
          value={page.song.spotifyTrackId}
        />
        <input
          type="hidden"
          name="spotify_track_url"
          value={page.song.spotifyTrackUrl}
        />
        <input
          type="hidden"
          name="release_year"
          value={page.song.releaseYear ?? ""}
        />
        <input
          type="hidden"
          name="release_date"
          value={page.song.releaseDate ?? ""}
        />
        <input type="hidden" name="isrc" value={page.song.isrc ?? ""} />
        <input
          type="hidden"
          name="explicit"
          value={page.song.explicit ? "true" : "false"}
        />
        <input
          type="hidden"
          name="duration_ms"
          value={page.song.durationMs ?? ""}
        />

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-4">
            <img
              src={artworkUrl}
              alt={`${page.song.artistName} - ${page.song.title} artwork`}
              className="h-14 w-14 shrink-0 rounded-[var(--r-lg)] object-cover shadow-[var(--sh-md)]"
              loading="eager"
              decoding="async"
            />
            <div className="min-w-0">
              <Link
                href="/admin"
                className="mb-2 inline-flex items-center gap-1 text-[13px] font-medium text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Release library
              </Link>
              <p className="app-kicker text-[var(--app-muted)]">Review &amp; publish</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--app-text)]">
                {page.song.title}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--app-muted)]">
                <span>{page.song.artistName}</span>
                <StatusPill status={page.page.status} />
                <span className="app-chip">@{page.page.username}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={headerLinkHref}
              target={isPublished ? "_blank" : undefined}
              rel={isPublished ? "noreferrer" : undefined}
              className="app-interactive inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--r-sm)] border border-[var(--app-line)] bg-[var(--app-panel)] px-4 text-sm font-semibold text-[var(--app-text)] shadow-[var(--sh-xs)] transition hover:bg-[var(--app-panel-muted)]"
            >
              <HeaderLinkIcon className="h-4 w-4" />
              {headerLinkLabel}
            </a>
            <Button
              type="submit"
              formAction={publishAction}
              disabled={!publishReady}
            >
              {page.page.status === "published" ? (
                <>
                  <Save className="h-4 w-4" />
                  Save changes
                </>
              ) : (
                <>
                  <Globe2 className="h-4 w-4" />
                  Publish release
                </>
              )}
            </Button>
          </div>
        </div>

        {showImportedDraftConfirmation ? (
          <section className="app-card-soft rounded-[var(--r-lg)] border-[var(--app-green-line)] bg-[var(--app-green-soft)] px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 gap-3">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[9px] border border-[var(--app-green-line)] bg-[var(--app-panel)] text-[var(--app-green-text)]">
                  <CheckCircle2 className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0">
                  <p className="app-kicker text-[var(--app-green-text)]">
                    Import complete
                  </p>
                  <h2 className="mt-2 text-[16px] font-semibold tracking-[-0.015em] text-[var(--app-text)]">
                    Draft created - review before it goes live
                  </h2>
                  <p className="mt-1 max-w-2xl text-[13px] leading-6 text-[var(--app-muted)]">
                    Review the imported details, confirm streaming destinations, then publish when everything looks right.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <a
                  href="#streaming-destinations"
                  className="inline-flex min-h-9 items-center justify-center rounded-[var(--r-sm)] bg-[var(--app-accent)] px-3.5 text-sm font-semibold text-white shadow-[var(--sh-xs)] transition hover:bg-[var(--app-accent-strong)]"
                >
                  Review &amp; publish
                </a>
                <Link
                  href="/admin"
                  className="inline-flex min-h-9 items-center justify-center rounded-[var(--r-sm)] border border-[var(--app-line)] bg-[var(--app-panel)] px-3.5 text-sm font-semibold text-[var(--app-text)] shadow-[var(--sh-xs)] transition hover:bg-[var(--app-panel-muted)]"
                >
                  Back to library
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        {showPublishedConfirmation ? (
          <section className="app-card-soft rounded-[var(--r-lg)] border-[var(--app-green-line)] bg-[var(--app-green-soft)] px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 gap-3">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[9px] border border-[var(--app-green-line)] bg-[var(--app-panel)] text-[var(--app-green-text)]">
                  <CheckCircle2 className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0">
                  <p className="app-kicker text-[var(--app-green-text)]">
                    Published
                  </p>
                  <h2 className="mt-2 text-[16px] font-semibold tracking-[-0.015em] text-[var(--app-text)]">
                    Release published - live link is ready
                  </h2>
                  <p className="mt-1 max-w-2xl text-[13px] leading-6 text-[var(--app-muted)]">
                    Your smart link is live. Share it now or keep refining the release details.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <Link
                  href={publicHref}
                  target="_blank"
                  className="inline-flex min-h-9 items-center justify-center rounded-[var(--r-sm)] bg-[var(--app-accent)] px-3.5 text-sm font-semibold text-white shadow-[var(--sh-xs)] transition hover:bg-[var(--app-accent-strong)]"
                >
                  Open live page
                </Link>
                <Link
                  href="/admin"
                  className="inline-flex min-h-9 items-center justify-center rounded-[var(--r-sm)] border border-[var(--app-line)] bg-[var(--app-panel)] px-3.5 text-sm font-semibold text-[var(--app-text)] shadow-[var(--sh-xs)] transition hover:bg-[var(--app-panel-muted)]"
                >
                  Back to library
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        {showUnpublishedConfirmation ? (
          <section className="app-card-soft rounded-[var(--r-lg)] border-[var(--app-amber-line)] bg-[var(--app-amber-soft)] px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 gap-3">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[9px] border border-[var(--app-amber-line)] bg-[var(--app-panel)] text-[var(--app-amber-text)]">
                  <EyeOff className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0">
                  <p className="app-kicker text-[var(--app-amber-text)]">
                    Unpublished
                  </p>
                  <h2 className="mt-2 text-[16px] font-semibold tracking-[-0.015em] text-[var(--app-text)]">
                    Release unpublished - page is private
                  </h2>
                  <p className="mt-1 max-w-2xl text-[13px] leading-6 text-[var(--app-muted)]">
                    Fans will no longer see this release until you publish again.
                  </p>
                </div>
              </div>
              <Link
                href="/admin"
                className="inline-flex min-h-9 items-center justify-center rounded-[var(--r-sm)] border border-[var(--app-line)] bg-[var(--app-panel)] px-3.5 text-sm font-semibold text-[var(--app-text)] shadow-[var(--sh-xs)] transition hover:bg-[var(--app-panel-muted)]"
              >
                Back to library
              </Link>
            </div>
          </section>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_336px] xl:items-start">
        <div className="grid gap-5">
          <PublicLinkPanel
            username={page.page.username}
            slug={page.page.slug}
            status={page.page.status}
            previewHref={`/admin/preview/${page.song.id}`}
          />
          <EditorSection
            icon={<ListMusic className="h-4 w-4" />}
            title="Release details"
            subtitle="The basics fans see on the page."
          >
            <div className="grid gap-5 md:grid-cols-[132px_minmax(0,1fr)] md:items-start">
              <div className="grid gap-3">
                <img
                  src={artworkUrl}
                  alt={`${page.song.artistName} - ${page.song.title} artwork`}
                  className="h-[108px] w-[108px] rounded-[var(--r-lg)] border border-[var(--app-line)] object-cover shadow-[var(--sh-md)]"
                  loading="eager"
                  decoding="async"
                />
                <ArtworkUploadField
                  value={artworkUrl}
                  onChange={setArtworkUrl}
                  songId={page.song.id}
                />
              </div>

              <div className="grid gap-4">
                <MetaField label="Title">
                  <input name="title" defaultValue={page.song.title} className="app-input" />
                </MetaField>
                <div className="grid gap-4 sm:grid-cols-2">
                  <MetaField label="Artist">
                    <input
                      name="artist_name"
                      defaultValue={page.song.artistName}
                      className="app-input"
                    />
                  </MetaField>
                  <MetaField label="Album">
                    <input
                      name="album_name"
                      defaultValue={page.song.albumName ?? ""}
                      className="app-input"
                    />
                  </MetaField>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <label htmlFor="release-slug" className="text-sm font-medium text-[var(--app-text)]">
                  Slug
                </label>
                <div className="flex min-h-10 overflow-hidden rounded-[var(--r-sm)] border border-[var(--app-line)] bg-[var(--app-panel)] shadow-[var(--sh-xs)] transition focus-within:border-[var(--app-accent)] focus-within:ring-4 focus-within:ring-[var(--app-accent-soft)]">
                  <span className="inline-flex items-center border-r border-[var(--app-line)] bg-[var(--app-panel-muted)] px-3 font-mono text-[13px] font-medium text-[var(--app-muted)]">
                    /{page.page.username}/
                  </span>
                  <input
                    id="release-slug"
                    name="slug"
                    defaultValue={page.page.slug}
                    className="min-w-0 flex-1 bg-transparent px-3 font-mono text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-faint)]"
                    aria-describedby="release-slug-hint"
                  />
                </div>
                <span id="release-slug-hint" className="text-[12.5px] text-[var(--app-muted)]">
                  Lowercase, dashes only.
                </span>
              </div>
              <MetaField label="Preview clip URL">
                <input
                  name="preview_url"
                  defaultValue={page.song.previewUrl ?? ""}
                  className="app-input"
                  placeholder="Optional 30-second preview"
                />
              </MetaField>
            </div>

            <MetaField label="Headline">
              <input name="headline" defaultValue={page.page.headline} className="app-input" />
            </MetaField>
          </EditorSection>

          <EditorSection
            icon={<Link2 className="h-4 w-4" />}
            id="streaming-destinations"
            title="Streaming destinations"
            subtitle="Where fans land when they pick a service."
            right={
              <Button
                type="button"
                tone="subtle"
                onClick={() => setShowMissingLinksDialog(true)}
              >
                <Search className="h-4 w-4" />
                Fix missing links
              </Button>
            }
          >
            <div className="grid gap-4">
              {STREAMING_SERVICES.map((service) => {
                const link = serviceLookup.get(service);
                const draft = serviceDrafts[service];
                const fallbackUrl = buildServiceSearchUrl(service, fallbackQuery);
                const manualFieldError = state.fieldErrors?.[service];
                const needsResolution = needsResolutionControl(
                  draft.matchStatus,
                  draft.url || null,
                );
                const effectiveMatchStatus = needsResolution
                  ? draft.resolutionMode === "search_fallback"
                    ? "search_fallback"
                    : draft.url
                      ? "manual"
                      : "unresolved"
                  : draft.matchStatus;
                const reviewStatus = needsResolution
                  ? draft.resolutionMode === "search_fallback"
                    ? "approved"
                    : draft.url
                      ? "approved"
                      : "unresolved"
                  : link
                    ? link.reviewStatus ?? deriveReviewStatus(effectiveMatchStatus, draft.url || null)
                    : deriveReviewStatus(effectiveMatchStatus, draft.url || null);
                const isExpanded = expandedServices[service] ?? needsResolution;
                const serviceLabel = SERVICE_LABELS[service];

                return (
                  <div
                    key={service}
                    className={`overflow-hidden rounded-[var(--r-md)] border border-[var(--app-line)] transition ${
                      draft.isVisible
                        ? "bg-[var(--app-panel)]"
                        : "bg-[var(--app-panel-muted)] opacity-75"
                    }`}
                  >
                    <div className="grid gap-3 p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
                      <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[var(--r-sm)] border border-[var(--app-line)] bg-[var(--app-panel-muted)]">
                        <ServiceIcon service={service} className="max-w-[22px]" />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-[var(--app-text)]">
                          {serviceLabel}
                        </div>
                        <div className="text-[11.5px] text-[var(--app-muted)]">
                          {needsResolution
                            ? draft.resolutionMode === "search_fallback"
                              ? "Search fallback selected"
                              : draft.url
                                ? "Manual destination"
                                : "No automatic match"
                            : reviewStatus === "approved"
                              ? "High confidence match"
                              : "Found - please confirm"}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
                        <ServiceStatusBadge
                          label={
                            needsResolution
                            ? draft.resolutionMode === "search_fallback"
                              ? "Search fallback"
                              : draft.url
                                ? "Manual link"
                                : "Unresolved"
                            : reviewStatusLabel(reviewStatus)
                          }
                        />
                        <ServiceConfidencePill label={formatConfidence(link?.confidence ?? null)} />
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          aria-label={`${isExpanded ? "Collapse" : "Expand"} ${serviceLabel} destination details`}
                          onClick={() => toggleServiceExpanded(service)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--r-sm)] border border-transparent text-[var(--app-muted)] transition hover:border-[var(--app-line)] hover:bg-[var(--app-panel-muted)] hover:text-[var(--app-text)]"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                        <ServiceVisibilitySwitch
                          name={`${service}_is_visible`}
                          checked={draft.isVisible}
                          onChange={(isVisible) =>
                            updateServiceDraft(service, (current) => ({
                              ...current,
                              isVisible,
                            }))
                          }
                        />
                      </div>
                    </div>

                    {isExpanded ? (
                    <div className="grid gap-3 border-t border-[var(--app-line)] p-3 sm:p-4">
                      <input
                        type="hidden"
                        name={`${service}_original_url`}
                        defaultValue={link?.url ?? ""}
                      />
                      <input
                        type="hidden"
                        name={`${service}_review_status`}
                        value={reviewStatus}
                      />
                      <input
                        type="hidden"
                        name={`${service}_match_source`}
                        defaultValue={link?.matchSource ?? "manual_review"}
                      />
                      <input
                        type="hidden"
                        name={`${service}_confidence_reason`}
                        defaultValue={link?.confidenceReason ?? ""}
                      />
                      <input
                        type="hidden"
                        name={`${service}_matched_title`}
                        defaultValue={link?.matchedTitle ?? ""}
                      />
                      <input
                        type="hidden"
                        name={`${service}_matched_artist`}
                        defaultValue={link?.matchedArtist ?? ""}
                      />
                      <input
                        type="hidden"
                        name={`${service}_matched_album`}
                        defaultValue={link?.matchedAlbum ?? ""}
                      />
                      <input
                        type="hidden"
                        name={`${service}_matched_duration_ms`}
                        defaultValue={link?.matchedDurationMs ?? ""}
                      />
                      <input
                        type="hidden"
                        name={`${service}_matched_release_date`}
                        defaultValue={link?.matchedReleaseDate ?? ""}
                      />
                      <input
                        type="hidden"
                        name={`${service}_matched_isrc`}
                        defaultValue={link?.matchedIsrc ?? ""}
                      />
                      <input
                        type="hidden"
                        name={`${service}_confidence`}
                        defaultValue={link?.confidence ?? ""}
                      />
                      <input
                        type="hidden"
                        name={`${service}_notes`}
                        defaultValue={link?.notes ?? ""}
                      />
                      <input
                        type="hidden"
                        name={`${service}_resolution_mode`}
                        value={needsResolution ? draft.resolutionMode : ""}
                      />

                      {needsResolution ? (
                        <div className="grid gap-3 rounded-[var(--r-md)] border border-[var(--app-line)] bg-[var(--app-soft)]/55 p-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="inline-flex items-center gap-2 text-sm text-[var(--app-text)]">
                              <input
                                type="radio"
                                name={`inline-${service}-resolution`}
                                checked={draft.resolutionMode === "search_fallback"}
                                onChange={() =>
                                  updateServiceDraft(service, (current) => ({
                                    ...current,
                                    resolutionMode: "search_fallback",
                                    matchStatus: "search_fallback",
                                    url: fallbackUrl,
                                  }))
                                }
                                className="h-4 w-4"
                              />
                              Use search fallback
                            </label>
                            <label className="inline-flex items-center gap-2 text-sm text-[var(--app-text)]">
                              <input
                                type="radio"
                                name={`inline-${service}-resolution`}
                                checked={draft.resolutionMode === "manual"}
                                onChange={() =>
                                  updateServiceDraft(service, (current) => ({
                                    ...current,
                                    resolutionMode: "manual",
                                    matchStatus: current.url ? "manual" : "unresolved",
                                    url:
                                      current.matchStatus === "search_fallback" ||
                                      current.url === fallbackUrl
                                        ? ""
                                        : current.url,
                                  }))
                                }
                                className="h-4 w-4"
                              />
                              Manually add link
                            </label>
                          </div>

                          {draft.resolutionMode === "manual" ? (
                            <label className="grid gap-2">
                              <span className="app-kicker text-[var(--app-muted)]">
                                Manual link
                              </span>
                              <input
                                name={`${service}_url`}
                                value={draft.url}
                                onChange={(event) => {
                                  const url = event.currentTarget.value;
                                  updateServiceDraft(service, (current) => ({
                                    ...current,
                                    url,
                                    matchStatus: url ? "manual" : "unresolved",
                                  }));
                                }}
                                className="app-input"
                                placeholder="https://..."
                                aria-invalid={Boolean(manualFieldError)}
                              />
                              {manualFieldError ? (
                                <p className="text-sm text-red-600">{manualFieldError}</p>
                              ) : null}
                            </label>
                          ) : (
                            <>
                              <input
                                type="hidden"
                                name={`${service}_url`}
                                value={draft.url || fallbackUrl}
                              />
                              <p className="text-sm leading-7 text-[var(--app-muted)]">
                                The public page will show a Search button for {SERVICE_LABELS[service]}.
                              </p>
                            </>
                          )}
                        </div>
                      ) : (
                        <>
                          <label className="grid gap-2">
                            <span className="app-kicker text-[var(--app-muted)]">
                              Destination URL
                            </span>
                            <input
                              name={`${service}_url`}
                              value={draft.url}
                              onChange={(event) => {
                                const url = event.currentTarget.value;
                                updateServiceDraft(service, (current) => ({
                                  ...current,
                                  url,
                                }));
                              }}
                              className="app-input"
                              aria-invalid={Boolean(manualFieldError)}
                            />
                            {manualFieldError ? (
                              <p className="text-sm text-red-600">{manualFieldError}</p>
                            ) : null}
                          </label>

                          <div className="grid gap-3 lg:grid-cols-[200px_minmax(0,1fr)]">
                            <label className="grid gap-2">
                              <span className="app-kicker text-[var(--app-muted)]">
                                Link state
                              </span>
                              <select
                                name={`${service}_match_status`}
                                value={draft.matchStatus}
                                onChange={(event) => {
                                  const matchStatus = event.currentTarget.value as MatchStatus;
                                  updateServiceDraft(service, (current) => ({
                                    ...current,
                                    matchStatus,
                                    resolutionMode:
                                      matchStatus === "search_fallback"
                                        ? "search_fallback"
                                        : "manual",
                                  }));
                                }}
                                className="app-input"
                              >
                                <option value="matched">Matched</option>
                                <option value="manual">Manual link</option>
                                <option value="search_fallback">Search fallback</option>
                                <option value="unresolved">Unresolved</option>
                              </select>
                            </label>
                          </div>
                        </>
                      )}

                      {(link?.confidenceReason ||
                        link?.matchedTitle ||
                        link?.matchedArtist ||
                        link?.matchedAlbum ||
                        link?.matchedDurationMs ||
                        link?.matchedReleaseDate ||
                        link?.matchedIsrc) && (
                        <div className="grid gap-2 rounded-[var(--r-md)] border border-[var(--app-line)] bg-[var(--app-soft)]/70 p-3">
                          {link?.confidenceReason && (
                            <div className="text-sm text-[var(--app-text)]">
                              {link.confidenceReason}
                            </div>
                          )}

                          <div className="grid gap-2 text-xs text-[var(--app-muted)] sm:grid-cols-2 xl:grid-cols-3">
                            {link?.matchedTitle && (
                              <div>
                                <div className="app-kicker text-[var(--app-muted)]">Matched title</div>
                                <div className="mt-1 text-sm text-[var(--app-text)]">{link.matchedTitle}</div>
                              </div>
                            )}
                            {link?.matchedArtist && (
                              <div>
                                <div className="app-kicker text-[var(--app-muted)]">Matched artist</div>
                                <div className="mt-1 text-sm text-[var(--app-text)]">{link.matchedArtist}</div>
                              </div>
                            )}
                            {link?.matchedAlbum && (
                              <div>
                                <div className="app-kicker text-[var(--app-muted)]">Matched album</div>
                                <div className="mt-1 text-sm text-[var(--app-text)]">{link.matchedAlbum}</div>
                              </div>
                            )}
                            {link?.matchedDurationMs && (
                              <div>
                                <div className="app-kicker text-[var(--app-muted)]">Duration</div>
                                <div className="mt-1 text-sm text-[var(--app-text)]">
                                  {formatDuration(link.matchedDurationMs)}
                                </div>
                              </div>
                            )}
                            {link?.matchedReleaseDate && (
                              <div>
                                <div className="app-kicker text-[var(--app-muted)]">Release date</div>
                                <div className="mt-1 text-sm text-[var(--app-text)]">
                                  {link.matchedReleaseDate}
                                </div>
                              </div>
                            )}
                            {link?.matchedIsrc && (
                              <div>
                                <div className="app-kicker text-[var(--app-muted)]">ISRC</div>
                                <div className="mt-1 text-sm text-[var(--app-text)]">{link.matchedIsrc}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {needsResolution && (
                        <input
                          type="hidden"
                          name={`${service}_match_status`}
                          value={effectiveMatchStatus}
                        />
                      )}
                    </div>
                    ) : (
                      <div className="hidden">
                        <input
                          type="hidden"
                          name={`${service}_original_url`}
                          value={link?.url ?? ""}
                        />
                        <input
                          type="hidden"
                          name={`${service}_review_status`}
                          value={reviewStatus}
                        />
                        <input
                          type="hidden"
                          name={`${service}_match_source`}
                          value={link?.matchSource ?? "manual_review"}
                        />
                        <input
                          type="hidden"
                          name={`${service}_confidence_reason`}
                          value={link?.confidenceReason ?? ""}
                        />
                        <input
                          type="hidden"
                          name={`${service}_matched_title`}
                          value={link?.matchedTitle ?? ""}
                        />
                        <input
                          type="hidden"
                          name={`${service}_matched_artist`}
                          value={link?.matchedArtist ?? ""}
                        />
                        <input
                          type="hidden"
                          name={`${service}_matched_album`}
                          value={link?.matchedAlbum ?? ""}
                        />
                        <input
                          type="hidden"
                          name={`${service}_matched_duration_ms`}
                          value={link?.matchedDurationMs ?? ""}
                        />
                        <input
                          type="hidden"
                          name={`${service}_matched_release_date`}
                          value={link?.matchedReleaseDate ?? ""}
                        />
                        <input
                          type="hidden"
                          name={`${service}_matched_isrc`}
                          value={link?.matchedIsrc ?? ""}
                        />
                        <input
                          type="hidden"
                          name={`${service}_confidence`}
                          value={link?.confidence ?? ""}
                        />
                        <input
                          type="hidden"
                          name={`${service}_notes`}
                          value={link?.notes ?? ""}
                        />
                        <input
                          type="hidden"
                          name={`${service}_resolution_mode`}
                          value={needsResolution ? draft.resolutionMode : ""}
                        />
                        <input
                          type="hidden"
                          name={`${service}_url`}
                          value={
                            needsResolution &&
                            draft.resolutionMode === "search_fallback"
                              ? draft.url || fallbackUrl
                              : draft.url
                          }
                        />
                        <input
                          type="hidden"
                          name={`${service}_match_status`}
                          value={effectiveMatchStatus}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </EditorSection>

          <EditorSection
            icon={<Mail className="h-4 w-4" />}
            title="Lead capture"
            subtitle="Collect emails in exchange for a reward."
          >
            <label className="app-card-soft flex items-center justify-between gap-3 rounded-[var(--r-md)] px-4 py-3 text-sm text-[var(--app-text)]">
              <span className="min-w-0">
                <span className="block font-semibold">
                  Enable email capture on this song page
                </span>
                <span className="mt-0.5 block text-[12.5px] text-[var(--app-muted)]">
                  Add a reward form below the streaming destinations.
                </span>
              </span>
              <ServiceVisibilitySwitch
                name="email_capture_enabled"
                checked={leadCaptureEnabled}
                ariaLabel="Enable email capture on this song page"
                onChange={setLeadCaptureEnabled}
              />
            </label>

            {leadCaptureEnabled ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <MetaField label="Offer title">
                    <input
                      name="email_capture_title"
                      value={leadCaptureDraft.title}
                      onChange={(event) =>
                        updateLeadCaptureDraft("title", event.currentTarget.value)
                      }
                      className="app-input"
                      placeholder="Download the song for free"
                    />
                  </MetaField>
                  <MetaField label="Button label">
                    <input
                      name="email_capture_button_label"
                      value={leadCaptureDraft.buttonLabel}
                      onChange={(event) =>
                        updateLeadCaptureDraft("buttonLabel", event.currentTarget.value)
                      }
                      className="app-input"
                      placeholder="Get the download"
                    />
                  </MetaField>
                  <LeadConnectorField connector={emailConnector} />
                </div>

                <MetaField label="Offer description">
                  <textarea
                    name="email_capture_description"
                    value={leadCaptureDraft.description}
                    onChange={(event) =>
                      updateLeadCaptureDraft("description", event.currentTarget.value)
                    }
                    className="app-input min-h-28 resize-y"
                    placeholder="Drop your email to unlock the track and hear about future releases first."
                  />
                </MetaField>

                <div className="grid gap-4 sm:grid-cols-2">
                  <MetaField label="Reward URL">
                    <input
                      name="email_capture_download_url"
                      value={leadCaptureDraft.downloadUrl}
                      onChange={(event) =>
                        updateLeadCaptureDraft("downloadUrl", event.currentTarget.value)
                      }
                      className="app-input"
                      placeholder="https://..."
                    />
                  </MetaField>
                  <MetaField label="Reward label">
                    <input
                      name="email_capture_download_label"
                      value={leadCaptureDraft.downloadLabel}
                      onChange={(event) =>
                        updateLeadCaptureDraft("downloadLabel", event.currentTarget.value)
                      }
                      className="app-input"
                      placeholder="Download song"
                    />
                  </MetaField>
                </div>

                <MetaField label="Connector tag">
                  <input
                    name="email_capture_tag"
                    value={leadCaptureDraft.tag}
                    onChange={(event) =>
                      updateLeadCaptureDraft("tag", event.currentTarget.value)
                    }
                    className="app-input"
                    placeholder="free-download"
                  />
                </MetaField>
                <LeadConnectorNote connector={emailConnector} />
              </>
            ) : (
              <div className="rounded-[var(--r-md)] border border-dashed border-[var(--app-line)] bg-[var(--app-panel-muted)] px-4 py-4">
                <p className="text-sm font-semibold text-[var(--app-text)]">
                  Lead capture is off.
                </p>
                <p className="mt-1 max-w-2xl text-[13px] leading-6 text-[var(--app-muted)]">
                  Turn it on when this release needs an email form, free download,
                  or reward handoff.
                </p>
                <input
                  name="email_capture_title"
                  type="hidden"
                  value={leadCaptureDraft.title}
                />
                <input
                  name="email_capture_button_label"
                  type="hidden"
                  value={leadCaptureDraft.buttonLabel}
                />
                <input
                  name="email_capture_download_url"
                  type="hidden"
                  value={leadCaptureDraft.downloadUrl}
                />
                <input
                  name="email_capture_download_label"
                  type="hidden"
                  value={leadCaptureDraft.downloadLabel}
                />
                <input
                  name="email_capture_description"
                  type="hidden"
                  value={leadCaptureDraft.description}
                />
                <input
                  name="email_capture_tag"
                  type="hidden"
                  value={leadCaptureDraft.tag}
                />
              </div>
            )}
          </EditorSection>

          <div className="app-card rounded-[var(--r-lg)] p-5 xl:hidden">
            <div className="flex flex-col gap-4">
              <div>
                <p className="app-kicker text-[var(--app-muted)]">Publishing rail</p>
                <h3 className="mt-2 text-base font-semibold text-[var(--app-text)]">
                  {allVisibleDestinationsReady
                    ? "Ready to publish"
                    : publishReady
                      ? "Almost ready"
                      : "Not ready to publish"}
                </h3>
                <p className="mt-2 text-sm leading-7 text-[var(--app-muted)]">
                  {readinessMessage}
                </p>
              </div>
              <SaveButtons
                canPublish={publishReady}
                isPublished={page.page.status === "published"}
                draftAction={draftAction}
                publishAction={publishAction}
                unpublishAction={unpublishAction}
              />
            </div>
          </div>

          <section className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--app-red-line)] bg-[var(--app-panel)]">
            <div className="flex items-center gap-3 border-b border-[var(--app-red-line)] bg-[var(--app-red-soft)] px-5 py-4">
              <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[var(--r-sm)] bg-[var(--app-panel)] text-[var(--app-red-text)]">
                <CircleAlert className="h-4 w-4" />
              </span>
              <h3 className="text-[15.5px] font-semibold text-[var(--app-red-text)]">
                Danger zone
              </h3>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                <div className="text-sm font-semibold text-[var(--app-text)]">
                  Delete this release
                </div>
                <p className="mt-1 max-w-xl text-[13px] leading-6 text-[var(--app-muted)]">
                  Permanently removes the page and its link. Visitors will hit a 404.
                  Analytics history is also deleted. This cannot be undone.
                </p>
              </div>
              <div className="shrink-0">
                <DeleteSongButton
                  songId={page.song.id}
                  songLabel={`${page.song.artistName} - ${page.song.title}`}
                  inline
                  variant="ghost"
                />
              </div>
            </div>
          </section>

          <FormStateMessage error={state.error} success={state.success} />
        </div>

          <aside className="hidden gap-4 xl:sticky xl:top-6 xl:grid">
            <section className="app-card overflow-hidden rounded-[var(--r-lg)]">
              <div className="flex items-center gap-4 border-b border-[var(--app-line)] bg-[linear-gradient(160deg,var(--app-accent-soft),var(--app-panel))] p-5">
                <div
                  className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full"
                  style={{
                    background: `conic-gradient(var(--app-accent) ${readinessScore}%, var(--app-line) 0)`,
                  }}
                >
                  <div className="grid h-[54px] w-[54px] place-items-center rounded-full bg-[var(--app-panel)] text-base font-semibold text-[var(--app-text)]">
                    {readinessScore}%
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[var(--app-text)]">
                    {page.page.status === "published"
                      ? "Live & healthy"
                      : allVisibleDestinationsReady
                        ? "Ready to publish"
                        : publishReady
                          ? "Almost ready"
                          : "Needs attention"}
                  </h3>
                  <p className="mt-1 text-[13px] leading-5 text-[var(--app-muted)]">
                    {publishReady
                      ? readinessMessage
                      : "Review the destinations before publishing."}
                  </p>
                </div>
              </div>

              <div className="px-5 py-2">
                {[
                  { label: "Artwork", value: artworkUrl ? "Ready" : "Missing", tone: artworkUrl ? "text-[var(--app-green-text)]" : "text-[var(--app-amber-text)]" },
                  { label: "Metadata", value: "Complete", tone: "text-[var(--app-green-text)]" },
                  { label: "Services ready", value: `${linkedServices} of ${STREAMING_SERVICES.length}`, tone: publishReady ? "text-[var(--app-amber-text)]" : "text-[var(--app-red-text)]" },
                  { label: "Manual review", value: manualReviewCount ? `${manualReviewCount} link${manualReviewCount === 1 ? "" : "s"}` : "None", tone: manualReviewCount ? "text-[var(--app-amber-text)]" : "text-[var(--app-green-text)]" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-3 border-b border-[var(--app-line)] py-3 text-sm last:border-b-0"
                  >
                    <span className="text-[var(--app-muted)]">{item.label}</span>
                    <span className={`font-semibold ${item.tone}`}>{item.value}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-[var(--app-line)] p-4">
                <SaveButtons
                  canPublish={publishReady}
                  isPublished={page.page.status === "published"}
                  draftAction={draftAction}
                  publishAction={publishAction}
                  unpublishAction={unpublishAction}
                  stacked
                />
              </div>
            </section>

            <section className="app-card rounded-[var(--r-lg)] p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-[var(--app-text)]">Performance</h3>
                <span className="app-chip">{page.page.status === "published" ? "Last 30d" : "No data yet"}</span>
              </div>
              {page.page.status === "published" ? (
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    { label: "Visits", value: visitCount },
                    { label: "Clicks", value: clickCount },
                    { label: "CTR", value: visitCount > 0 ? Math.round((clickCount / visitCount) * 100) : 0, suffix: "%" },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="text-2xl font-semibold tracking-[-0.03em] text-[var(--app-text)]">
                        {item.value}{item.suffix ?? ""}
                      </div>
                      <div className="mt-1 text-[11px] text-[var(--app-muted)]">{item.label}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-[var(--app-muted)]">
                  Publish to start collecting visits and clicks.
                </p>
              )}
            </section>
          </aside>
        </div>
      </form>
    </>
  );
}
