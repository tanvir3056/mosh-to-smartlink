import type { StreamingService } from "@/lib/types";

export const APP_NAME = "Ampveil";
export const APP_TAGLINE = "Quiet release pages for busy launch days.";
export const APP_DESCRIPTION =
  "Calm, mobile-first release pages with first-party analytics, private review, and clean fan routing.";
export const APP_DOMAIN_HINT = "ampveil.to";
export const VISITOR_COOKIE = "ffm_visitor_id";
export const LAST_VISIT_COOKIE = "ffm_last_visit_id";
export const ADMIN_SESSION_COOKIE = "ffm_admin_session";

export const STREAMING_SERVICES: StreamingService[] = [
  "spotify",
  "apple_music",
  "youtube_music",
  "amazon_music",
  "deezer",
  "tidal",
];

export const SERVICE_LABELS: Record<StreamingService, string> = {
  spotify: "Spotify",
  apple_music: "Apple Music",
  youtube_music: "YouTube Music",
  amazon_music: "Amazon Music",
  deezer: "Deezer",
  tidal: "Tidal",
};

export const SERVICE_CTAS: Record<StreamingService, string> = {
  spotify: "Play",
  apple_music: "Play",
  youtube_music: "Play",
  amazon_music: "Open",
  deezer: "Play",
  tidal: "Play",
};

export const SERVICE_HINTS: Record<StreamingService, string> = {
  spotify: "Open the Spotify release page",
  apple_music: "Listen on Apple Music",
  youtube_music: "Open in YouTube Music",
  amazon_music: "Open in Amazon Music",
  deezer: "Open the Deezer release page",
  tidal: "Listen on TIDAL",
};

export const SERVICE_ACCENTS: Record<StreamingService, string> = {
  spotify: "#1ed760",
  apple_music: "#ff5f7f",
  youtube_music: "#ff4438",
  amazon_music: "#6678ff",
  deezer: "#ff7a59",
  tidal: "#111214",
};

export const SERVICE_SEARCH_URLS: Record<StreamingService, string> = {
  spotify: "https://open.spotify.com/search/",
  apple_music: "https://music.apple.com/us/search",
  youtube_music: "https://music.youtube.com/search",
  amazon_music: "https://music.amazon.com/search/",
  deezer: "https://www.deezer.com/search/",
  tidal: "https://listen.tidal.com/search",
};
