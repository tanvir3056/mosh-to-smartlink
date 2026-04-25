alter table if exists song_pages
  add column if not exists email_capture_enabled boolean not null default false;

alter table if exists song_pages
  add column if not exists email_capture_title text;

alter table if exists song_pages
  add column if not exists email_capture_description text;

alter table if exists song_pages
  add column if not exists email_capture_button_label text;

alter table if exists song_pages
  add column if not exists email_capture_download_url text;

alter table if exists song_pages
  add column if not exists email_capture_download_label text;

alter table if exists song_pages
  add column if not exists email_capture_tag text;

create table if not exists email_connectors (
  id text primary key,
  owner_user_id text not null references app_users(id) on delete cascade,
  provider text not null check (provider in ('mailchimp')),
  encrypted_api_key text,
  audience_id text,
  default_tags text,
  double_opt_in boolean not null default false,
  created_at timestamptz not null default current_timestamp,
  updated_at timestamptz not null default current_timestamp,
  unique (owner_user_id, provider)
);

create index if not exists email_connectors_owner_updated_idx
  on email_connectors (owner_user_id, updated_at desc);

create table if not exists email_capture_submissions (
  id text primary key,
  owner_user_id text not null references app_users(id) on delete cascade,
  song_id text not null references songs(id) on delete cascade,
  page_id text not null references song_pages(id) on delete cascade,
  visit_id text references visits(id) on delete set null,
  visitor_id text not null,
  email text not null,
  normalized_email text not null,
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
  connector_provider text check (connector_provider is null or connector_provider in ('mailchimp')),
  connector_status text not null check (connector_status in ('not_configured', 'synced', 'failed')) default 'not_configured',
  connector_error text,
  connector_synced_at timestamptz,
  created_at timestamptz not null default current_timestamp,
  updated_at timestamptz not null default current_timestamp,
  unique (owner_user_id, page_id, normalized_email)
);

create index if not exists email_capture_submissions_owner_created_idx
  on email_capture_submissions (owner_user_id, created_at desc);

create index if not exists email_capture_submissions_song_created_idx
  on email_capture_submissions (song_id, created_at desc);
