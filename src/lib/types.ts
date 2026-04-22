export type StreamingService =
  | "spotify"
  | "apple_music"
  | "youtube_music"
  | "amazon_music"
  | "deezer"
  | "tidal";

export type PageStatus = "draft" | "published" | "unpublished";

export type MatchStatus =
  | "matched"
  | "manual"
  | "search_fallback"
  | "unresolved";

export interface TrackingConfig {
  siteName: string;
  metaPixelId: string | null;
  metaPixelEnabled: boolean;
  metaTestEventCode: string | null;
}

export interface AppUserRecord {
  id: string;
  authUserId: string | null;
  username: string;
  loginEmail: string;
  passwordHash: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StreamingLinkRecord {
  id: string;
  songId: string;
  service: StreamingService;
  url: string | null;
  matchStatus: MatchStatus;
  matchSource: string;
  confidence: number | null;
  notes: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface SongRecord {
  id: string;
  ownerUserId: string;
  spotifyTrackId: string;
  spotifyTrackUrl: string;
  title: string;
  artistName: string;
  albumName: string | null;
  artworkUrl: string;
  previewUrl: string | null;
  previewSource: string | null;
  releaseYear: number | null;
  explicit: boolean;
  durationMs: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface SongPageRecord {
  id: string;
  ownerUserId: string;
  songId: string;
  username: string;
  slug: string;
  headline: string;
  status: PageStatus;
  publishedAt: string | null;
  unpublishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SongPageWithLinks {
  song: SongRecord;
  page: SongPageRecord;
  links: StreamingLinkRecord[];
  tracking: TrackingConfig;
}

export interface DashboardSongRow {
  songId: string;
  ownerUserId: string;
  username: string;
  title: string;
  artistName: string;
  artworkUrl: string;
  slug: string;
  status: PageStatus;
  previewUrl: string | null;
  updatedAt: string;
  visitCount: number;
  clickCount: number;
}

export interface DashboardSnapshot {
  totalSongs: number;
  publishedSongs: number;
  draftSongs: number;
  totalVisits: number;
  totalClicks: number;
  songs: DashboardSongRow[];
}

export interface ServiceBreakdownRow {
  service: StreamingService;
  clicks: number;
}

export interface ReferrerRow {
  label: string;
  visits: number;
  clicks: number;
  ctr: number;
}

export interface UTMRow {
  source: string;
  medium: string;
  campaign: string;
  visits: number;
  clicks: number;
  ctr: number;
}

export interface GeoRow {
  country: string;
  city: string;
  visits: number;
  clicks: number;
  ctr: number;
}

export interface DeviceRow {
  label: string;
  visits: number;
  clicks: number;
  ctr: number;
}

export interface SongPerformanceRow {
  songId: string;
  username: string;
  slug: string;
  title: string;
  visits: number;
  clicks: number;
  ctr: number;
}

export interface AnalyticsDailyPoint {
  date: string;
  visits: number;
  uniqueVisitors: number;
  clicks: number;
  ctr: number;
}

export interface AnalyticsSnapshot {
  rangeDays: number;
  totalVisits: number;
  uniqueVisitors: number;
  totalClicks: number;
  clickThroughRate: number;
  serviceBreakdown: ServiceBreakdownRow[];
  referrers: ReferrerRow[];
  utms: UTMRow[];
  geos: GeoRow[];
  devices: DeviceRow[];
  songs: SongPerformanceRow[];
  daily: AnalyticsDailyPoint[];
}

export interface SpotifyTrackImport {
  spotifyTrackId: string;
  spotifyTrackUrl: string;
  title: string;
  artistName: string;
  albumName: string | null;
  artworkUrl: string;
  previewUrl: string | null;
  releaseYear: number | null;
  explicit: boolean;
  durationMs: number | null;
  rawSource: {
    oembed: unknown;
    ogDescription: string | null;
  };
}

export interface MatchCandidate {
  service: StreamingService;
  url: string | null;
  matchStatus: MatchStatus;
  matchSource: string;
  confidence: number | null;
  notes: string | null;
}

export interface ImportBundle {
  song: SpotifyTrackImport;
  links: MatchCandidate[];
  importStatus: "succeeded" | "partial";
}

export interface UTMAttribution {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  term: string | null;
  content: string | null;
}

export interface TrackingContext extends UTMAttribution {
  visitorId: string;
  referrer: string | null;
  referrerHost: string | null;
  userAgent: string | null;
  browserName: string | null;
  osName: string | null;
  deviceType: string | null;
  country: string | null;
  city: string | null;
  ipHash: string | null;
}
