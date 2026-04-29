"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

import type { ActionState } from "@/app/admin/action-types";
import { normalizeRewardUrl } from "@/lib/email-capture";
import { APP_NAME, STREAMING_SERVICES } from "@/lib/constants";
import { requireUserSession, signInUser, signOutUser, signUpUser } from "@/lib/auth";
import {
  createSongImportDraft,
  deleteSongById,
  saveEmailConnectorConfig,
  publishedSongPageTag,
  saveTrackingConfig,
  updateSongDraft,
} from "@/lib/data";
import { buildImportBundle } from "@/lib/matching";
import type {
  MatchCandidate,
  MatchStatus,
  ReviewStatus,
  SongPageWithLinks,
  TrackingConfig,
} from "@/lib/types";
import { fetchSpotifyTrackImport } from "@/lib/spotify";
import { buildPublicSongPath } from "@/lib/utils";

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getNullableStringValue(formData: FormData, key: string) {
  const value = getStringValue(formData, key);
  return value.length > 0 ? value : null;
}

function isMatchStatus(value: string): value is MatchStatus {
  return (
    value === "matched" ||
    value === "manual" ||
    value === "search_fallback" ||
    value === "unresolved"
  );
}

function isReviewStatus(value: string): value is ReviewStatus {
  return value === "approved" || value === "needs_review" || value === "unresolved";
}

function getNullableNumberValue(formData: FormData, key: string) {
  const raw = getStringValue(formData, key);

  if (!raw) {
    return null;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function deriveReviewStatus(matchStatus: MatchStatus, url: string | null): ReviewStatus {
  if (!url || matchStatus === "unresolved") {
    return "unresolved";
  }

  if (matchStatus === "matched") {
    return "approved";
  }

  return "needs_review";
}

function parseLinksFromFormData(formData: FormData): MatchCandidate[] {
  return STREAMING_SERVICES.map((service) => {
    const requestedMatchStatus = getStringValue(formData, `${service}_match_status`);
    const url = getNullableStringValue(formData, `${service}_url`);
    const originalUrl = getNullableStringValue(formData, `${service}_original_url`);
    const isManualOverride = url !== originalUrl && Boolean(url);
    const parsedMatchStatus = isMatchStatus(requestedMatchStatus)
      ? requestedMatchStatus
      : "manual";
    const matchStatus = !url
      ? "unresolved"
      : isManualOverride && parsedMatchStatus === "matched"
        ? "manual"
        : parsedMatchStatus;
    const requestedReviewStatus = getStringValue(formData, `${service}_review_status`);
    const reviewStatus = isReviewStatus(requestedReviewStatus)
      ? requestedReviewStatus
      : deriveReviewStatus(matchStatus, url);
    const confidence = Number.parseFloat(
      getStringValue(formData, `${service}_confidence`) || "0",
    );

    return {
      service,
      url,
      matchStatus,
      reviewStatus,
      matchSource:
        isManualOverride
          ? "manual_review"
          : getStringValue(formData, `${service}_match_source`) || "manual_review",
      confidence:
        isManualOverride
          ? null
          : Number.isFinite(confidence) && confidence > 0
            ? Number(confidence.toFixed(2))
            : null,
      notes:
        isManualOverride
          ? "Edited manually in admin."
          : getNullableStringValue(formData, `${service}_notes`),
      confidenceReason:
        isManualOverride
          ? "URL edited manually in admin."
          : getNullableStringValue(formData, `${service}_confidence_reason`),
      matchedTitle: isManualOverride
        ? null
        : getNullableStringValue(formData, `${service}_matched_title`),
      matchedArtist: isManualOverride
        ? null
        : getNullableStringValue(formData, `${service}_matched_artist`),
      matchedAlbum: isManualOverride
        ? null
        : getNullableStringValue(formData, `${service}_matched_album`),
      matchedDurationMs: isManualOverride
        ? null
        : getNullableNumberValue(formData, `${service}_matched_duration_ms`),
      matchedReleaseDate: isManualOverride
        ? null
        : getNullableStringValue(formData, `${service}_matched_release_date`),
      matchedIsrc: isManualOverride
        ? null
        : getNullableStringValue(formData, `${service}_matched_isrc`),
    };
  });
}

function parseEmailCaptureFromFormData(
  formData: FormData,
): SongPageWithLinks["emailCapture"] & { invalidDownloadUrl: boolean } {
  const rawDownloadUrl = getNullableStringValue(formData, "email_capture_download_url");
  const normalizedDownloadUrl = normalizeRewardUrl(rawDownloadUrl);

  return {
    enabled: getStringValue(formData, "email_capture_enabled") === "on",
    title: getNullableStringValue(formData, "email_capture_title"),
    description: getNullableStringValue(formData, "email_capture_description"),
    buttonLabel: getNullableStringValue(formData, "email_capture_button_label"),
    downloadUrl: normalizedDownloadUrl,
    downloadLabel: getNullableStringValue(formData, "email_capture_download_label"),
    tag: getNullableStringValue(formData, "email_capture_tag"),
    invalidDownloadUrl: Boolean(rawDownloadUrl && !normalizedDownloadUrl),
  };
}

export async function signInAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const username = getStringValue(formData, "username");
  const password = getStringValue(formData, "password");

  if (!username || !password) {
    return {
      error: "Enter your username and password.",
      success: null,
    };
  }

  const result = await signInUser(username, password);

  if (result.error) {
    return {
      error: result.error,
      success: null,
    };
  }

  redirect("/admin");
}

export async function signUpAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const username = getStringValue(formData, "username");
  const password = getStringValue(formData, "password");

  if (!username || !password) {
    return {
      error: "Choose a username and password to create your account.",
      success: null,
    };
  }

  const result = await signUpUser(username, password);

  if (result.error) {
    return {
      error: result.error,
      success: null,
    };
  }

  redirect("/admin");
}

export async function signOutAction() {
  await signOutUser();
  redirect("/sign-in");
}

export async function importSpotifyTrackAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const spotifyUrl = getStringValue(formData, "spotify_url");
  const session = await requireUserSession();
  const requestedBy = session.username;

  if (!spotifyUrl) {
    return {
      error: "Paste a Spotify track URL to start the import.",
      success: null,
    };
  }

  let songId = "";

  try {
    const track = await fetchSpotifyTrackImport(spotifyUrl);
    const bundle = await buildImportBundle(track);
    songId = await createSongImportDraft(bundle, requestedBy, session.userId);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "The Spotify import failed. Check the URL and try again.",
      success: null,
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/analytics");
  redirect(`/admin/songs/${songId}`);
}

export async function updateSongAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const songId = getStringValue(formData, "song_id");
  const title = getStringValue(formData, "title");
  const artistName = getStringValue(formData, "artist_name");
  const artworkUrl = getStringValue(formData, "artwork_url");
  const intent = getStringValue(formData, "intent");
  const currentSlug = getStringValue(formData, "current_slug");

  if (!songId || !title || !artistName || !artworkUrl) {
    return {
      error: "Title, artist, artwork, and song identity are required.",
      success: null,
    };
  }

  const status =
    intent === "publish"
      ? "published"
      : intent === "unpublish"
        ? "unpublished"
      : "draft";
  const emailCapture = parseEmailCaptureFromFormData(formData);

  if (emailCapture.invalidDownloadUrl) {
    return {
      error: "Reward URL must be a valid web link like https://example.com/file.mp3.",
      success: null,
    };
  }

  const session = await requireUserSession();

  try {
    await updateSongDraft({
      ownerUserId: session.userId,
      songId,
      title,
      artistName,
      albumName: getNullableStringValue(formData, "album_name"),
      artworkUrl,
      previewUrl: getNullableStringValue(formData, "preview_url"),
      headline: getStringValue(formData, "headline") || "Stream now",
      slug: getStringValue(formData, "slug") || `${artistName}-${title}`,
      status,
      emailCapture,
      links: parseLinksFromFormData(formData),
    });

    revalidatePath("/admin");
    revalidatePath("/admin/analytics");
    revalidatePath(`/admin/songs/${songId}`);
    const slug = getStringValue(formData, "slug") || `${artistName}-${title}`;
    revalidatePath(buildPublicSongPath(session.username, slug));
    revalidateTag(publishedSongPageTag(session.username, slug), "max");

    if (currentSlug && currentSlug !== slug) {
      revalidatePath(buildPublicSongPath(session.username, currentSlug));
      revalidateTag(publishedSongPageTag(session.username, currentSlug), "max");
    }

    return {
      error: null,
      success:
        status === "published"
          ? "Song page published."
          : status === "unpublished"
            ? "Song page unpublished."
            : "Draft saved.",
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "The song page could not be saved.",
      success: null,
    };
  }
}

export async function saveTrackingSettingsAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireUserSession();
  const input: TrackingConfig = {
    siteName: getStringValue(formData, "site_name") || APP_NAME,
    metaPixelId: getNullableStringValue(formData, "meta_pixel_id"),
    metaPixelEnabled: getStringValue(formData, "meta_pixel_enabled") === "on",
    metaTestEventCode: getNullableStringValue(formData, "meta_test_event_code"),
  };

  await saveTrackingConfig(session.userId, input);
  await saveEmailConnectorConfig(session.userId, {
    provider: "mailchimp",
    audienceId: getNullableStringValue(formData, "mailchimp_audience_id"),
    defaultTags: getNullableStringValue(formData, "mailchimp_default_tags"),
    doubleOptIn: getStringValue(formData, "mailchimp_double_opt_in") === "on",
    apiKey: getNullableStringValue(formData, "mailchimp_api_key"),
    clearApiKey: getStringValue(formData, "mailchimp_clear_api_key") === "on",
  });

  revalidatePath("/admin/settings");
  revalidatePath("/admin");

  return {
    error: null,
    success: "Settings saved.",
  };
}

export async function deleteSongAction(formData: FormData) {
  const songId = getStringValue(formData, "song_id");
  const session = await requireUserSession();

  if (!songId) {
    throw new Error("Missing song id.");
  }

  const deleted = await deleteSongById(songId, session.userId);

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/analytics");

  if (deleted.slug && deleted.username) {
    revalidatePath(buildPublicSongPath(deleted.username, deleted.slug));
    revalidateTag(publishedSongPageTag(deleted.username, deleted.slug), "max");
  }

  redirect("/admin");
}
