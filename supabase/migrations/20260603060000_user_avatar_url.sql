alter table if exists app_users
  add column if not exists avatar_url text;
