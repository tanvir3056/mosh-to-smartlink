create table if not exists app_users (
  id text primary key,
  auth_user_id text unique,
  username text not null unique,
  login_email text not null unique,
  password_hash text,
  created_at timestamptz not null default current_timestamp,
  updated_at timestamptz not null default current_timestamp
);

alter table if exists tracking_config
  drop constraint if exists tracking_config_id_check;

alter table if exists tracking_config
  add column if not exists owner_user_id text references app_users(id) on delete cascade;

alter table if exists songs
  add column if not exists owner_user_id text references app_users(id) on delete cascade;

alter table if exists song_pages
  add column if not exists owner_user_id text references app_users(id) on delete cascade;

alter table if exists visits
  add column if not exists owner_user_id text references app_users(id) on delete cascade;

alter table if exists click_events
  add column if not exists owner_user_id text references app_users(id) on delete cascade;

alter table if exists import_attempts
  add column if not exists owner_user_id text references app_users(id) on delete cascade;

do $$
declare
  has_existing_data boolean;
  legacy_auth_user_id text;
  legacy_email text;
  legacy_username text;
begin
  select
    exists(select 1 from tracking_config)
    or exists(select 1 from songs)
    or exists(select 1 from song_pages)
    or exists(select 1 from visits)
    or exists(select 1 from click_events)
    or exists(select 1 from import_attempts)
  into has_existing_data;

  if has_existing_data and not exists (select 1 from app_users) then
    select user_id, email
    into legacy_auth_user_id, legacy_email
    from admin_access
    where id = 'singleton'
    limit 1;

    legacy_username := trim(both '-' from lower(regexp_replace(split_part(coalesce(legacy_email, 'owner'), '@', 1), '[^a-zA-Z0-9]+', '-', 'g')));
    legacy_username := coalesce(nullif(legacy_username, ''), 'owner');

    insert into app_users (
      id,
      auth_user_id,
      username,
      login_email,
      created_at,
      updated_at
    )
    values (
      coalesce(nullif(legacy_auth_user_id, ''), 'user_legacy'),
      nullif(legacy_auth_user_id, ''),
      legacy_username,
      coalesce(nullif(legacy_email, ''), concat(legacy_username, '@users.backstage.local')),
      current_timestamp,
      current_timestamp
    )
    on conflict do nothing;
  end if;
end $$;

with default_owner as (
  select id
  from app_users
  order by created_at asc, id asc
  limit 1
)
update tracking_config tc
set owner_user_id = default_owner.id
from default_owner
where tc.owner_user_id is null;

with default_owner as (
  select id
  from app_users
  order by created_at asc, id asc
  limit 1
)
update songs s
set owner_user_id = default_owner.id
from default_owner
where s.owner_user_id is null;

update song_pages p
set owner_user_id = s.owner_user_id
from songs s
where p.song_id = s.id
  and p.owner_user_id is null;

update visits v
set owner_user_id = s.owner_user_id
from songs s
where v.song_id = s.id
  and v.owner_user_id is null;

update click_events c
set owner_user_id = s.owner_user_id
from songs s
where c.song_id = s.id
  and c.owner_user_id is null;

update import_attempts i
set owner_user_id = s.owner_user_id
from songs s
where i.song_id = s.id
  and i.owner_user_id is null;

with default_owner as (
  select id
  from app_users
  order by created_at asc, id asc
  limit 1
)
update import_attempts i
set owner_user_id = default_owner.id
from default_owner
where i.song_id is null
  and i.owner_user_id is null;

alter table if exists tracking_config
  alter column owner_user_id set not null;

alter table if exists songs
  alter column owner_user_id set not null;

alter table if exists song_pages
  alter column owner_user_id set not null;

alter table if exists visits
  alter column owner_user_id set not null;

alter table if exists click_events
  alter column owner_user_id set not null;

alter table if exists import_attempts
  alter column owner_user_id set not null;

alter table if exists songs
  drop constraint if exists songs_spotify_track_id_key;

alter table if exists song_pages
  drop constraint if exists song_pages_slug_key;

create unique index if not exists songs_owner_spotify_track_idx
  on songs (owner_user_id, spotify_track_id);

create unique index if not exists song_pages_owner_slug_idx
  on song_pages (owner_user_id, slug);

create unique index if not exists tracking_config_owner_user_id_idx
  on tracking_config (owner_user_id);

create index if not exists songs_owner_updated_idx
  on songs (owner_user_id, updated_at desc);

create index if not exists song_pages_owner_status_idx
  on song_pages (owner_user_id, status, updated_at desc);

create index if not exists visits_owner_created_idx
  on visits (owner_user_id, created_at desc);

create index if not exists click_events_owner_created_idx
  on click_events (owner_user_id, created_at desc);

create index if not exists import_attempts_owner_created_idx
  on import_attempts (owner_user_id, created_at desc);
