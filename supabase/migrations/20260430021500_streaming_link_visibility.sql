alter table streaming_links
  add column if not exists is_visible boolean not null default true;

update streaming_links
set is_visible = true
where is_visible is null;

create index if not exists streaming_links_song_visible_idx
  on streaming_links (song_id, is_visible, position);
