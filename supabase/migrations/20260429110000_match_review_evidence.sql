alter table if exists songs
  add column if not exists isrc text;

alter table if exists songs
  add column if not exists release_date date;

alter table if exists streaming_links
  add column if not exists review_status text;

alter table if exists streaming_links
  add column if not exists matched_title text;

alter table if exists streaming_links
  add column if not exists matched_artist text;

alter table if exists streaming_links
  add column if not exists matched_album text;

alter table if exists streaming_links
  add column if not exists matched_duration_ms integer;

alter table if exists streaming_links
  add column if not exists matched_release_date date;

alter table if exists streaming_links
  add column if not exists matched_isrc text;

alter table if exists streaming_links
  add column if not exists confidence_reason text;

alter table if exists streaming_links
  drop constraint if exists streaming_links_review_status_check;

update streaming_links
set review_status = case
  when match_status = 'matched' then 'approved'
  when match_status = 'manual' then 'approved'
  when match_status = 'search_fallback' then 'needs_review'
  else 'unresolved'
end
where review_status is null;

alter table if exists streaming_links
  alter column review_status set default 'needs_review';

alter table if exists streaming_links
  alter column review_status set not null;

alter table if exists streaming_links
  add constraint streaming_links_review_status_check
  check (review_status in ('approved', 'needs_review', 'unresolved'));

create index if not exists streaming_links_song_review_idx
  on streaming_links (song_id, review_status, position);
