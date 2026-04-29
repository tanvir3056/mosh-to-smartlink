"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { INITIAL_ACTION_STATE, type ActionState } from "@/app/admin/action-types";
import { updateSongAction } from "@/app/admin/actions";
import { ArtworkUploadField } from "@/components/admin/artwork-upload-field";
import { DeleteSongButton } from "@/components/admin/delete-song-button";
import { FormStateMessage } from "@/components/admin/form-state";
import { PublicLinkPanel } from "@/components/admin/public-link-panel";
import { StatusPill } from "@/components/admin/status-pill";
import { Button } from "@/components/ui/button";
import { SERVICE_LABELS, STREAMING_SERVICES } from "@/lib/constants";
import type { DashboardSongRow, ReviewStatus, SongPageWithLinks } from "@/lib/types";

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

function SaveButtons() {
  const { pending } = useFormStatus();

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button name="intent" value="publish" type="submit" busy={pending}>
        Publish
      </Button>
      <Button
        name="intent"
        value="draft"
        type="submit"
        tone="secondary"
        busy={pending}
      >
        Save draft
      </Button>
      <Button
        name="intent"
        value="unpublish"
        type="submit"
        tone="ghost"
        busy={pending}
      >
        Unpublish
      </Button>
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
}: {
  page: SongPageWithLinks;
  performance?: DashboardSongRow | null;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    updateSongAction,
    INITIAL_ACTION_STATE,
  );
  const [artworkUrl, setArtworkUrl] = useState(page.song.artworkUrl);
  const linkedServices = page.links.filter((entry) => Boolean(entry.url)).length;
  const manualReviewCount = page.links.filter(
    (entry) =>
      !entry.url ||
      (entry.reviewStatus ?? deriveReviewStatus(entry.matchStatus, entry.url)) !==
        "approved",
  ).length;
  const visitCount = performance?.visitCount ?? 0;
  const clickCount = performance?.clickCount ?? 0;
  const clickRate =
    visitCount > 0 ? `${Math.round((clickCount / visitCount) * 100)}% CTR` : "No clicks yet";

  return (
    <>
      <form action={formAction} className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)] xl:items-start">
        <input type="hidden" name="song_id" value={page.song.id} />
        <input type="hidden" name="current_slug" value={page.page.slug} />

        <aside className="order-2 grid gap-5 xl:order-1 xl:sticky xl:top-6">
          <div className="app-card rounded-[1.75rem] p-5">
            <Image
              src={artworkUrl}
              alt=""
              width={320}
              height={320}
              className="aspect-square w-full rounded-[1.5rem] object-cover shadow-[0_18px_40px_rgba(11,14,19,0.12)]"
              unoptimized={artworkUrl.startsWith("data:")}
            />

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <StatusPill status={page.page.status} />
              <span className="text-sm text-[var(--app-muted)]">
                {linkedServices}/{STREAMING_SERVICES.length} services ready
              </span>
            </div>

            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[var(--app-text)]">
              {page.song.artistName} • {page.song.title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--app-muted)]">
              Tighten the release details, confirm every service destination, then
              publish when the page is ready for fan traffic.
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-1">
              {[
                {
                  title: "Metadata imported",
                  body: "Spotify title, artist, artwork, and preview came in automatically.",
                },
                {
                  title: "Manual review",
                  body: `${manualReviewCount} destinations still need attention before launch.`,
                },
                {
                  title: "Performance",
                  body: `${visitCount} visits • ${clickCount} clicks • ${clickRate}`,
                },
              ].map((step) => (
                <div key={step.title} className="app-card-soft rounded-[1.2rem] px-4 py-4">
                  <div className="text-sm font-semibold text-[var(--app-text)]">
                    {step.title}
                  </div>
                  <div className="mt-2 text-sm leading-7 text-[var(--app-muted)]">
                    {step.body}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-[var(--app-line)] pt-5">
              <p className="app-kicker text-[var(--app-muted)]">Save state</p>
              <div className="mt-4">
                <SaveButtons />
              </div>
            </div>
          </div>

          <PublicLinkPanel
            username={page.page.username}
            slug={page.page.slug}
            status={page.page.status}
            previewHref={`/admin/preview/${page.song.id}`}
          />
        </aside>

        <div className="order-1 grid gap-5 xl:order-2">
          <div className="app-card grid gap-4 rounded-[1.75rem] p-5 sm:p-6">
            <div>
              <p className="app-kicker text-[var(--app-muted)]">Release details</p>
              <h3 className="mt-3 text-xl font-semibold text-[var(--app-text)]">
                Song page details
              </h3>
              <p className="mt-1 text-sm text-[var(--app-muted)]">
                Tune the public title, slug, headline, preview, and artwork before
                the page goes live.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <MetaField label="Song title">
                <input name="title" defaultValue={page.song.title} className="app-input" />
              </MetaField>
              <MetaField label="Artist name">
                <input
                  name="artist_name"
                  defaultValue={page.song.artistName}
                  className="app-input"
                />
              </MetaField>
              <MetaField label="Album name">
                <input
                  name="album_name"
                  defaultValue={page.song.albumName ?? ""}
                  className="app-input"
                />
              </MetaField>
              <MetaField label="Slug">
                <input name="slug" defaultValue={page.page.slug} className="app-input" />
              </MetaField>
            </div>

            <MetaField label="Headline">
              <input name="headline" defaultValue={page.page.headline} className="app-input" />
            </MetaField>

            <ArtworkUploadField
              value={artworkUrl}
              onChange={setArtworkUrl}
              songId={page.song.id}
            />

            <MetaField label="Preview URL">
              <input
                name="preview_url"
                defaultValue={page.song.previewUrl ?? ""}
                className="app-input"
                placeholder="Optional 30-second preview"
              />
            </MetaField>
          </div>

          <div className="app-card grid gap-4 rounded-[1.75rem] p-5 sm:p-6">
            <div>
              <p className="app-kicker text-[var(--app-muted)]">Lead capture</p>
              <h3 className="mt-3 text-xl font-semibold text-[var(--app-text)]">
                Email offer on the song page
              </h3>
              <p className="mt-1 text-sm text-[var(--app-muted)]">
                Turn this release page into a lightweight fan capture page. If a
                download URL is set, fans get the reward right after they submit.
              </p>
            </div>

            <label className="app-card-soft flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-[var(--app-text)]">
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
          </div>

          <div className="app-card grid gap-4 rounded-[1.75rem] p-5 sm:p-6">
            <div>
              <p className="app-kicker text-[var(--app-muted)]">Destinations</p>
              <h3 className="mt-3 text-xl font-semibold text-[var(--app-text)]">
                Streaming links
              </h3>
              <p className="mt-1 text-sm text-[var(--app-muted)]">
                Review every destination before publishing. Search fallbacks are
                allowed in V1, but manual correction is always available here.
              </p>
            </div>

            <div className="grid gap-4">
              {STREAMING_SERVICES.map((service) => {
                const link = page.links.find((entry) => entry.service === service);
                const reviewStatus = link
                  ? link.reviewStatus ?? deriveReviewStatus(link.matchStatus, link.url)
                  : ("unresolved" as const);
                return (
                  <div
                    key={service}
                    className="grid gap-3 rounded-[1.25rem] border border-[var(--app-line)] bg-white p-4 lg:grid-cols-[180px_minmax(0,1fr)]"
                  >
                    <div className="grid gap-2">
                      <div className="text-sm font-semibold text-[var(--app-text)]">
                        {SERVICE_LABELS[service]}
                      </div>
                      <div className="text-xs leading-6 text-[var(--app-muted)]">
                        {link?.url
                          ? "Check the destination and adjust anything that looks wrong."
                          : "No destination yet. Add a URL or leave it unresolved."}
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <span className="rounded-full border border-[var(--app-line)] bg-[var(--app-soft)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--app-text)]">
                          {reviewStatusLabel(reviewStatus)}
                        </span>
                        <span className="rounded-full border border-[var(--app-line)] bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--app-muted)]">
                          {formatConfidence(link?.confidence ?? null)}
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-3">
                      <input
                        type="hidden"
                        name={`${service}_original_url`}
                        defaultValue={link?.url ?? ""}
                      />
                      <input
                        type="hidden"
                        name={`${service}_review_status`}
                        defaultValue={reviewStatus}
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

                      <label className="grid gap-2">
                        <span className="app-kicker text-[var(--app-muted)]">
                          Destination URL
                        </span>
                        <input
                          name={`${service}_url`}
                          defaultValue={link?.url ?? ""}
                          className="app-input"
                        />
                      </label>

                      {(link?.confidenceReason ||
                        link?.matchedTitle ||
                        link?.matchedArtist ||
                        link?.matchedAlbum ||
                        link?.matchedDurationMs ||
                        link?.matchedReleaseDate ||
                        link?.matchedIsrc) && (
                        <div className="grid gap-2 rounded-2xl border border-[var(--app-line)] bg-[var(--app-soft)]/70 p-3">
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

                      <div className="grid gap-3 lg:grid-cols-[200px_minmax(0,1fr)]">
                        <label className="grid gap-2">
                          <span className="app-kicker text-[var(--app-muted)]">
                            Approval state
                          </span>
                          <select
                            name={`${service}_match_status`}
                            defaultValue={link?.matchStatus ?? "manual"}
                            className="app-input"
                          >
                            <option value="matched">Approved</option>
                            <option value="manual">Needs review</option>
                            <option value="search_fallback">Search fallback</option>
                            <option value="unresolved">Unresolved</option>
                          </select>
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="app-card rounded-[1.5rem] p-5 xl:hidden">
            <div className="flex flex-col gap-4">
              <div>
                <p className="app-kicker text-[var(--app-muted)]">Publishing rail</p>
                <p className="mt-2 text-sm leading-7 text-[var(--app-muted)]">
                  Save a draft while you review, or publish when everything is approved.
                </p>
              </div>
              <SaveButtons />
            </div>
          </div>

          <FormStateMessage error={state.error} success={state.success} />
        </div>
      </form>

      <section className="grid gap-4 rounded-[1.75rem] border border-red-200 bg-red-50 p-5">
        <div>
          <p className="app-kicker text-red-500">Danger zone</p>
          <h2 className="mt-2 text-xl font-semibold text-red-900">Delete this song</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-red-700">
            This permanently removes the song, public page, service links, import
            attempts, visits, and outbound click analytics for this record.
          </p>
        </div>

        <DeleteSongButton
          songId={page.song.id}
          songLabel={`${page.song.artistName} - ${page.song.title}`}
        />
      </section>
    </>
  );
}
