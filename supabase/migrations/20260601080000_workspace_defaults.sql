alter table tracking_config
  add column if not exists default_headline text not null default 'Stream now';

alter table tracking_config
  add column if not exists show_artist_name boolean not null default true;

alter table tracking_config
  add column if not exists preview_player_default_enabled boolean not null default true;

alter table tracking_config
  add column if not exists lead_capture_default_enabled boolean not null default false;
