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
import type { DashboardSongRow, SongPageWithLinks } from "@/lib/types";

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
    (entry) => !entry.url || entry.matchStatus !== "matched",
  ).length;
  const visitCount = performance?.visitCount ?? 0;
  const clickCount = performance?.clickCount ?? 0;
  const clickRate =
    visitCount > 0 ? `${Math.round((clickCount / visitCount) * 100)}% CTR` : "No clicks yet";

  return (
    <>
      <form action={formAction} className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)] xl:items-start">
        <input type="hidden" name="song_id" value={page.song.id} />

        <aside className="grid gap-5 xl:sticky xl:top-6">
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

            <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
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
            slug={page.page.slug}
            status={page.page.status}
            previewHref={`/admin/preview/${page.song.id}`}
          />
        </aside>

        <div className="grid gap-5">
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

            <ArtworkUploadField value={artworkUrl} onChange={setArtworkUrl} />

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
                    </div>

                    <div className="grid gap-3">
                      <input
                        type="hidden"
                        name={`${service}_match_source`}
                        defaultValue={link?.matchSource ?? "manual_review"}
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

                      <div className="grid gap-3 lg:grid-cols-[200px_minmax(0,1fr)]">
                        <label className="grid gap-2">
                          <span className="app-kicker text-[var(--app-muted)]">
                            Link state
                          </span>
                          <select
                            name={`${service}_match_status`}
                            defaultValue={link?.matchStatus ?? "manual"}
                            className="app-input"
                          >
                            <option value="matched">Matched</option>
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
