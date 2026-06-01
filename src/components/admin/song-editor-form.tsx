"use client";
/* eslint-disable @next/next/no-img-element */

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Eye,
  EyeOff,
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
  MatchStatus,
  ReviewStatus,
  SongPageWithLinks,
  StreamingService,
} from "@/lib/types";
import { buildServiceSearchUrl } from "@/lib/utils";

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
  title,
  subtitle,
  right,
  children,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`app-card overflow-hidden rounded-[14px] ${className ?? ""}`}>
      <div className="flex items-center justify-between gap-4 border-b border-[var(--app-line)] px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[8px] border border-[var(--app-line)] bg-[var(--app-panel-muted)] text-[var(--app-muted)]">
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
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
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

export function SongEditorForm({
  page,
  performance,
  showMissingLinksReview = false,
}: {
  page: SongPageWithLinks;
  performance?: DashboardSongRow | null;
  showMissingLinksReview?: boolean;
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

  return (
    <>
      {showMissingLinksDialog && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-[rgba(16,19,27,0.38)] px-4 py-8 backdrop-blur-sm sm:items-center">
          <div className="app-card w-full max-w-3xl rounded-[14px] p-5 shadow-[0_20px_70px_rgba(20,24,34,0.18)] sm:p-6">
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
                    className="rounded-[12px] border border-[var(--app-line)] bg-[var(--app-panel)] p-4"
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
                      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-[7px] border border-[var(--app-line)] bg-[var(--app-panel-muted)] px-4 py-3 text-sm font-medium text-[var(--app-text)]">
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
                      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-[7px] border border-[var(--app-line)] bg-[var(--app-panel-muted)] px-4 py-3 text-sm font-medium text-[var(--app-text)]">
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
              className="h-14 w-14 shrink-0 rounded-[12px] object-cover shadow-[0_12px_28px_rgba(20,24,34,0.12)]"
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
              href={`/admin/preview/${page.song.id}`}
              className="app-interactive inline-flex min-h-10 items-center justify-center gap-2 rounded-[7px] border border-[var(--app-line)] bg-[var(--app-panel)] px-4 text-sm font-semibold text-[var(--app-text)] shadow-[0_1px_2px_rgba(20,24,34,0.05)] transition hover:bg-[var(--app-panel-muted)]"
            >
              <Eye className="h-4 w-4" />
              {page.page.status === "published" ? "Preview" : "Preview draft"}
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
                  className="h-[108px] w-[108px] rounded-[12px] border border-[var(--app-line)] object-cover shadow-[0_12px_28px_rgba(20,24,34,0.12)]"
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
              <MetaField label="Slug">
                <input name="slug" defaultValue={page.page.slug} className="app-input" />
              </MetaField>
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
                    className={`overflow-hidden rounded-[12px] border border-[var(--app-line)] transition ${
                      draft.isVisible
                        ? "bg-[var(--app-panel)]"
                        : "bg-[var(--app-panel-muted)] opacity-75"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-3 p-3">
                      <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[8px] border border-[var(--app-line)] bg-[var(--app-panel-muted)]">
                        <ServiceIcon service={service} className="max-w-[22px]" />
                      </span>
                      <div className="min-w-[180px] flex-1">
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
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex min-h-9 items-center rounded-[7px] border border-[var(--app-line)] bg-[var(--app-soft)] px-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--app-text)]">
                          {needsResolution
                            ? draft.resolutionMode === "search_fallback"
                              ? "Search fallback"
                              : draft.url
                                ? "Manual link"
                                : "Unresolved"
                            : reviewStatusLabel(reviewStatus)}
                        </span>
                        <span className="inline-flex min-h-9 items-center rounded-[7px] border border-[var(--app-line)] bg-[var(--app-panel)] px-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--app-muted)]">
                          {formatConfidence(link?.confidence ?? null)}
                        </span>
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          aria-label={`${isExpanded ? "Collapse" : "Expand"} ${serviceLabel} destination details`}
                          onClick={() => toggleServiceExpanded(service)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-[7px] border border-transparent text-[var(--app-muted)] transition hover:border-[var(--app-line)] hover:bg-[var(--app-panel-muted)] hover:text-[var(--app-text)]"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                        <label className="inline-flex items-center gap-2 text-sm text-[var(--app-text)]">
                          <input
                            name={`${service}_is_visible`}
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
                          Show on public page
                        </label>
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
                        <div className="grid gap-3 rounded-[10px] border border-[var(--app-line)] bg-[var(--app-soft)]/55 p-3">
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
                        <div className="grid gap-2 rounded-[10px] border border-[var(--app-line)] bg-[var(--app-soft)]/70 p-3">
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
            <label className="app-card-soft flex items-center gap-3 rounded-[10px] px-4 py-3 text-sm text-[var(--app-text)]">
              <input
                name="email_capture_enabled"
                type="checkbox"
                defaultChecked={page.emailCapture.enabled}
                className="h-4 w-4 rounded border-slate-300 bg-transparent"
              />
              Enable email capture on this song page
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <MetaField label="Offer title">
                <input
                  name="email_capture_title"
                  defaultValue={page.emailCapture.title ?? ""}
                  className="app-input"
                  placeholder="Download the song for free"
                />
              </MetaField>
              <MetaField label="Button label">
                <input
                  name="email_capture_button_label"
                  defaultValue={page.emailCapture.buttonLabel ?? ""}
                  className="app-input"
                  placeholder="Get the download"
                />
              </MetaField>
            </div>

            <MetaField label="Offer description">
              <textarea
                name="email_capture_description"
                defaultValue={page.emailCapture.description ?? ""}
                className="app-input min-h-28 resize-y"
                placeholder="Drop your email to unlock the track and hear about future releases first."
              />
            </MetaField>

            <div className="grid gap-4 sm:grid-cols-2">
              <MetaField label="Reward URL">
                <input
                  name="email_capture_download_url"
                  defaultValue={page.emailCapture.downloadUrl ?? ""}
                  className="app-input"
                  placeholder="https://..."
                />
              </MetaField>
              <MetaField label="Reward label">
                <input
                  name="email_capture_download_label"
                  defaultValue={page.emailCapture.downloadLabel ?? ""}
                  className="app-input"
                  placeholder="Download song"
                />
              </MetaField>
            </div>

            <MetaField label="Connector tag">
              <input
                name="email_capture_tag"
                defaultValue={page.emailCapture.tag ?? ""}
                className="app-input"
                placeholder="free-download"
              />
            </MetaField>
          </EditorSection>

          <section className="overflow-hidden rounded-[14px] border border-[var(--app-red-line)] bg-[var(--app-panel)]">
            <div className="flex items-center gap-3 border-b border-[var(--app-red-line)] bg-[var(--app-red-soft)] px-5 py-4">
              <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[8px] bg-[var(--app-panel)] text-[var(--app-red-text)]">
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

          <div className="app-card rounded-[14px] p-5 xl:hidden">
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

          <FormStateMessage error={state.error} success={state.success} />
        </div>

          <aside className="hidden gap-4 xl:sticky xl:top-6 xl:grid">
            <section className="app-card overflow-hidden rounded-[14px]">
              <div className="flex items-center gap-4 border-b border-[var(--app-line)] bg-[linear-gradient(160deg,var(--app-accent-soft),#fff)] p-5">
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

            <section className="app-card rounded-[14px] p-5">
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
