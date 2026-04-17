"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { ActionState } from "@/app/admin/action-types";
import { APP_NAME, STREAMING_SERVICES } from "@/lib/constants";
import { signInAdmin, signOutAdmin } from "@/lib/auth";
import {
  createSongImportDraft,
  deleteSongById,
  saveTrackingConfig,
  updateSongDraft,
} from "@/lib/data";
import { buildImportBundle } from "@/lib/matching";
import type { MatchCandidate, MatchStatus, TrackingConfig } from "@/lib/types";
import { fetchSpotifyTrackImport } from "@/lib/spotify";

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

function parseLinksFromFormData(formData: FormData): MatchCandidate[] {
  return STREAMING_SERVICES.map((service) => {
    const matchStatus = getStringValue(formData, `${service}_match_status`);

    return {
      service,
      url: getNullableStringValue(formData, `${service}_url`),
      matchStatus: isMatchStatus(matchStatus) ? matchStatus : "manual",
      matchSource: getStringValue(formData, `${service}_match_source`) || "manual_review",
      confidence: Number.parseFloat(
        getStringValue(formData, `${service}_confidence`) || "0",
      ),
      notes: getNullableStringValue(formData, `${service}_notes`),
    };
  }).map((link) => ({
    ...link,
    confidence: Number.isFinite(link.confidence) && link.confidence > 0
      ? Number(link.confidence.toFixed(2))
      : null,
  }));
}

export async function signInAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = getStringValue(formData, "email");
  const password = getStringValue(formData, "password");

  if (!email || !password) {
    return {
      error: "Enter the admin email and password.",
      success: null,
    };
  }

  const result = await signInAdmin(email, password);

  if (result.error) {
    return {
      error: result.error,
      success: null,
    };
  }

  redirect("/admin");
}

export async function signOutAction() {
  await signOutAdmin();
  redirect("/admin/sign-in");
}

export async function importSpotifyTrackAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const spotifyUrl = getStringValue(formData, "spotify_url");
  const requestedBy = getStringValue(formData, "requested_by") || "admin";

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
    songId = await createSongImportDraft(bundle, requestedBy);
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

  try {
    await updateSongDraft({
      songId,
      title,
      artistName,
      albumName: getNullableStringValue(formData, "album_name"),
      artworkUrl,
      previewUrl: getNullableStringValue(formData, "preview_url"),
      headline: getStringValue(formData, "headline") || "Stream now",
      slug: getStringValue(formData, "slug") || `${artistName}-${title}`,
      status,
      links: parseLinksFromFormData(formData),
    });

    revalidatePath("/admin");
    revalidatePath("/admin/analytics");
    revalidatePath(`/admin/songs/${songId}`);

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
  const input: TrackingConfig = {
    siteName: getStringValue(formData, "site_name") || APP_NAME,
    metaPixelId: getNullableStringValue(formData, "meta_pixel_id"),
    metaPixelEnabled: getStringValue(formData, "meta_pixel_enabled") === "on",
    metaTestEventCode: getNullableStringValue(formData, "meta_test_event_code"),
  };

  await saveTrackingConfig(input);

  revalidatePath("/admin/settings");
  revalidatePath("/admin");

  return {
    error: null,
    success: "Tracking settings saved.",
  };
}

export async function deleteSongAction(formData: FormData) {
  const songId = getStringValue(formData, "song_id");

  if (!songId) {
    throw new Error("Missing song id.");
  }

  const deleted = await deleteSongById(songId);

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/analytics");

  if (deleted.slug) {
    revalidatePath(`/${deleted.slug}`);
  }

  redirect("/admin");
}
