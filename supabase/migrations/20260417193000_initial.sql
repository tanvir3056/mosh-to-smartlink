create table if not exists admin_access (
  id text primary key check (id = 'singleton'),
  email text not null unique,
  user_id text unique,
  created_at timestamptz not null default current_timestamp,
  updated_at timestamptz not null default current_timestamp
);

create table if not exists tracking_config (
  id text primary key check (id = 'singleton'),
  site_name text not null default 'Velvet Rope',
  meta_pixel_id text,
  meta_pixel_enabled boolean not null default false,
  meta_test_event_code text,
  created_at timestamptz not null default current_timestamp,
  updated_at timestamptz not null default current_timestamp
);

create table if not exists songs (
  id text primary key,
  spotify_track_id text not null unique,
  spotify_track_url text not null,
  title text not null,
  artist_name text not null,
  album_name text,
  artwork_url text not null,
  preview_url text,
  preview_source text,
  release_year integer,
  explicit boolean not null default false,
  duration_ms integer,
  created_at timestamptz not null default current_timestamp,
  updated_at timestamptz not null default current_timestamp
);

create table if not exists song_pages (
  id text primary key,
  song_id text not null unique references songs(id) on delete cascade,
  slug text not null unique,
  headline text not null default 'Stream now',
  status text not null check (status in ('draft', 'published', 'unpublished')) default 'draft',
  published_at timestamptz,
  unpublished_at timestamptz,
  created_at timestamptz not null default current_timestamp,
  updated_at timestamptz not null default current_timestamp
);

create table if not exists streaming_links (
  id text primary key,
  song_id text not null references songs(id) on delete cascade,
  service text not null check (service in ('spotify', 'apple_music', 'youtube_music', 'amazon_music', 'deezer', 'tidal')),
  url text,
  match_status text not null check (match_status in ('matched', 'manual', 'search_fallback', 'unresolved')) default 'manual',
  match_source text not null,
  confidence numeric(4,2),
  notes text,
  position integer not null default 0,
  created_at timestamptz not null default current_timestamp,
  updated_at timestamptz not null default current_timestamp,
  unique (song_id, service)
);

create table if not exists import_attempts (
  id text primary key,
  song_id text references songs(id) on delete set null,
  spotify_track_id text,
  spotify_url text not null,
  status text not null check (status in ('pending', 'succeeded', 'partial', 'failed')),
  requested_by text,
  request_payload text,
  response_payload text,
  error_message text,
  created_at timestamptz not null default current_timestamp,
  updated_at timestamptz not null default current_timestamp
);

create table if not exists visits (
  id text primary key,
  song_id text not null references songs(id) on delete cascade,
  page_id text not null references song_pages(id) on delete cascade,
  visitor_id text not null,
  path text not null,
  referrer text,
  referrer_host text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  user_agent text,
  browser_name text,
  os_name text,
  device_type text,
  country text,
  city text,
  ip_hash text,
  created_at timestamptz not null default current_timestamp
);

create index if not exists visits_song_created_idx on visits (song_id, created_at desc);
create index if not exists visits_visitor_idx on visits (visitor_id);
create index if not exists visits_referrer_idx on visits (referrer_host);

create table if not exists click_events (
  id text primary key,
  visit_id text references visits(id) on delete set null,
  song_id text not null references songs(id) on delete cascade,
  page_id text not null references song_pages(id) on delete cascade,
  streaming_link_id text references streaming_links(id) on delete set null,
  visitor_id text not null,
  service text not null check (service in ('spotify', 'apple_music', 'youtube_music', 'amazon_music', 'deezer', 'tidal')),
  destination_url text not null,
  referrer text,
  referrer_host text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  user_agent text,
  browser_name text,
  os_name text,
  device_type text,
  country text,
  city text,
  ip_hash text,
  created_at timestamptz not null default current_timestamp
);

create index if not exists click_events_song_created_idx on click_events (song_id, created_at desc);
create index if not exists click_events_service_idx on click_events (service);
