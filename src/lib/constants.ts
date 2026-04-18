import type { StreamingService } from "@/lib/types";

export const APP_NAME = "Backstage";
export const APP_TAGLINE = "Release control for artists running paid traffic.";
export const APP_DESCRIPTION =
  "Private release pages, destination review, and first-party campaign insights for artists running paid social.";
export const APP_DOMAIN_HINT = "backstage.to";
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
  spotify: "Open in Spotify",
  apple_music: "Listen on Apple Music",
  youtube_music: "Open in YouTube Music",
  amazon_music: "Open in Amazon Music",
  deezer: "Open in Deezer",
  tidal: "Listen on TIDAL",
};

export const SERVICE_SEARCH_URLS: Record<StreamingService, string> = {
  spotify: "https://open.spotify.com/search/",
  apple_music: "https://music.apple.com/us/search",
  youtube_music: "https://music.youtube.com/search",
  amazon_music: "https://music.amazon.com/search/",
  deezer: "https://www.deezer.com/search/",
  tidal: "https://listen.tidal.com/search",
};
