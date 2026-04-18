import type { QueryResultRow } from "pg";

import { APP_NAME, STREAMING_SERVICES } from "@/lib/constants";
import { dbQuery, dbTransaction } from "@/lib/db/driver";
import { appEnv } from "@/lib/env";
import type {
  AnalyticsSnapshot,
  DashboardSnapshot,
  ImportBundle,
  MatchCandidate,
  SongPageWithLinks,
  StreamingLinkRecord,
  TrackingConfig,
  TrackingContext,
  UTMAttribution,
} from "@/lib/types";
import { createId, slugify } from "@/lib/utils";

type SongPageJoinRow = QueryResultRow & {
  song_id: string;
  spotify_track_id: string;
  spotify_track_url: string;
  song_title: string;
  artist_name: string;
  album_name: string | null;
  artwork_url: string;
  preview_url: string | null;
  preview_source: string | null;
  release_year: number | null;
  explicit: boolean;
  duration_ms: number | null;
  song_created_at: string;
  song_updated_at: string;
  page_id: string;
  slug: string;
  headline: string;
  status: "draft" | "published" | "unpublished";
  published_at: string | null;
  unpublished_at: string | null;
  page_created_at: string;
  page_updated_at: string;
  link_id: string | null;
  service: StreamingLinkRecord["service"] | null;
  url: string | null;
  match_status: StreamingLinkRecord["matchStatus"] | null;
  match_source: string | null;
  confidence: string | number | null;
  notes: string | null;
  position: number | null;
  meta_pixel_id: string | null;
  meta_pixel_enabled: boolean | null;
  meta_test_event_code: string | null;
  site_name: string | null;
};

function defaultTrackingConfig(): TrackingConfig {
  return {
    siteName: APP_NAME,
    metaPixelId: null,
    metaPixelEnabled: false,
    metaTestEventCode: null,
  };
}

function createSinceIso(rangeDays: number) {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (rangeDays - 1));
  return since.toISOString();
}

function normalizeDateKey(value: string | Date) {
  const raw = String(value);

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw.slice(0, 10);
  }

  return new Date(raw).toISOString().slice(0, 10);
}

async function ensureSingletonRows() {
  await dbQuery(
    `
      insert into tracking_config (id, site_name)
      values ('singleton', $1)
      on conflict (id) do nothing
    `,
    [APP_NAME],
  );

  await dbQuery(
    `
      insert into admin_access (id, email)
      values ('singleton', $1)
      on conflict (id) do update set
        email = excluded.email,
        updated_at = current_timestamp
    `,
    [appEnv.adminEmail],
  );
}

function mapSongPage(rows: SongPageJoinRow[]): SongPageWithLinks | null {
  const firstRow = rows[0];

  if (!firstRow) {
    return null;
  }

  return {
    song: {
      id: firstRow.song_id,
      spotifyTrackId: firstRow.spotify_track_id,
      spotifyTrackUrl: firstRow.spotify_track_url,
      title: firstRow.song_title,
      artistName: firstRow.artist_name,
      albumName: firstRow.album_name,
      artworkUrl: firstRow.artwork_url,
      previewUrl: firstRow.preview_url,
      previewSource: firstRow.preview_source,
      releaseYear: firstRow.release_year,
      explicit: Boolean(firstRow.explicit),
      durationMs: firstRow.duration_ms,
      createdAt: firstRow.song_created_at,
      updatedAt: firstRow.song_updated_at,
    },
    page: {
      id: firstRow.page_id,
      songId: firstRow.song_id,
      slug: firstRow.slug,
      headline: firstRow.headline,
      status: firstRow.status,
      publishedAt: firstRow.published_at,
      unpublishedAt: firstRow.unpublished_at,
      createdAt: firstRow.page_created_at,
      updatedAt: firstRow.page_updated_at,
    },
    links: rows
      .filter((row) => row.link_id && row.service && row.match_status && row.match_source)
      .map((row) => ({
        id: row.link_id as string,
        songId: row.song_id,
        service: row.service as StreamingLinkRecord["service"],
        url: row.url,
        matchStatus: row.match_status as StreamingLinkRecord["matchStatus"],
        matchSource: row.match_source as string,
        confidence:
          row.confidence === null ? null : Number.parseFloat(String(row.confidence)),
        notes: row.notes,
        position: row.position ?? 0,
        createdAt: row.page_created_at,
        updatedAt: row.page_updated_at,
      }))
      .sort((left, right) => left.position - right.position),
    tracking: {
      siteName: firstRow.site_name ?? APP_NAME,
      metaPixelId: firstRow.meta_pixel_id,
      metaPixelEnabled: Boolean(firstRow.meta_pixel_enabled),
      metaTestEventCode: firstRow.meta_test_event_code,
    },
  };
}

async function createUniqueSlug(
  query: <T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ) => Promise<T[]>,
  artistName: string,
  title: string,
  songId?: string,
) {
  const base = slugify(`${artistName} ${title}`) || "song";
  let candidate = base;
  let attempt = 2;

  while (true) {
    const rows = await query<{ slug: string }>(
      `
        select slug
        from song_pages
        where slug = $1
          and ($2::text is null or song_id <> $2)
        limit 1
      `,
      [candidate, songId ?? null],
    );

    if (rows.length === 0) {
      return candidate;
    }

    candidate = `${base}-${attempt}`;
    attempt += 1;
  }
}

async function upsertStreamingLinks(
  query: <T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ) => Promise<T[]>,
  songId: string,
  links: MatchCandidate[],
) {
  for (const [index, service] of STREAMING_SERVICES.entries()) {
    const link = links.find((entry) => entry.service === service) ?? {
      service,
      url: null,
      matchStatus: "unresolved" as const,
      matchSource: "manual_review_required",
      confidence: null,
      notes: "Add a service URL before publishing.",
    };

    await query(
      `
        insert into streaming_links (
          id,
          song_id,
          service,
          url,
          match_status,
          match_source,
          confidence,
          notes,
          position
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        on conflict (song_id, service) do update set
          url = excluded.url,
          match_status = excluded.match_status,
          match_source = excluded.match_source,
          confidence = excluded.confidence,
          notes = excluded.notes,
          position = excluded.position,
          updated_at = current_timestamp
      `,
      [
        createId("link"),
        songId,
        service,
        link.url,
        link.matchStatus,
        link.matchSource,
        link.confidence,
        link.notes,
        index,
      ],
    );
  }
}

export async function ensureAppData() {
  await ensureSingletonRows();
}

export async function ensureAdminAccess(email: string, userId?: string | null) {
  await ensureAppData();
  await dbQuery(
    `
      insert into admin_access (id, email, user_id)
      values ('singleton', $1, $2)
      on conflict (id) do update set
        email = excluded.email,
        user_id = excluded.user_id,
        updated_at = current_timestamp
    `,
    [email, userId ?? null],
  );
}

export async function getTrackingConfig() {
  await ensureAppData();
  const rows = await dbQuery<{
    site_name: string;
    meta_pixel_id: string | null;
    meta_pixel_enabled: boolean;
    meta_test_event_code: string | null;
  }>(
    `
      select site_name, meta_pixel_id, meta_pixel_enabled, meta_test_event_code
      from tracking_config
      where id = 'singleton'
      limit 1
    `,
  );

  const row = rows[0];

  if (!row) {
    return defaultTrackingConfig();
  }

  return {
    siteName: row.site_name,
    metaPixelId: row.meta_pixel_id,
    metaPixelEnabled: Boolean(row.meta_pixel_enabled),
    metaTestEventCode: row.meta_test_event_code,
  } satisfies TrackingConfig;
}

export async function saveTrackingConfig(input: TrackingConfig) {
  await ensureAppData();
  await dbQuery(
    `
      insert into tracking_config (
        id,
        site_name,
        meta_pixel_id,
        meta_pixel_enabled,
        meta_test_event_code
      )
      values ('singleton', $1, $2, $3, $4)
      on conflict (id) do update set
        site_name = excluded.site_name,
        meta_pixel_id = excluded.meta_pixel_id,
        meta_pixel_enabled = excluded.meta_pixel_enabled,
        meta_test_event_code = excluded.meta_test_event_code,
        updated_at = current_timestamp
    `,
    [
      input.siteName,
      input.metaPixelId,
      input.metaPixelEnabled,
      input.metaTestEventCode,
    ],
  );
}

export async function listPublishedPages() {
  await ensureAppData();
  return dbQuery<{
    slug: string;
    title: string;
    artist_name: string;
    artwork_url: string;
  }>(
    `
      select p.slug, s.title, s.artist_name, s.artwork_url
      from song_pages p
      join songs s on s.id = p.song_id
      where p.status = 'published'
      order by p.published_at desc nulls last, p.updated_at desc
    `,
  );
}

export async function getPublishedSongPageBySlug(slug: string) {
  await ensureAppData();
  const rows = await dbQuery<SongPageJoinRow>(
    `
      select
        s.id as song_id,
        s.spotify_track_id,
        s.spotify_track_url,
        s.title as song_title,
        s.artist_name,
        s.album_name,
        s.artwork_url,
        s.preview_url,
        s.preview_source,
        s.release_year,
        s.explicit,
        s.duration_ms,
        s.created_at as song_created_at,
        s.updated_at as song_updated_at,
        p.id as page_id,
        p.slug,
        p.headline,
        p.status,
        p.published_at,
        p.unpublished_at,
        p.created_at as page_created_at,
        p.updated_at as page_updated_at,
        l.id as link_id,
        l.service,
        l.url,
        l.match_status,
        l.match_source,
        l.confidence,
        l.notes,
        l.position,
        tc.site_name,
        tc.meta_pixel_id,
        tc.meta_pixel_enabled,
        tc.meta_test_event_code
      from song_pages p
      join songs s on s.id = p.song_id
      left join streaming_links l on l.song_id = s.id
      left join tracking_config tc on tc.id = 'singleton'
      where p.slug = $1
        and p.status = 'published'
      order by coalesce(l.position, 999) asc
    `,
    [slug],
  );

  return mapSongPage(rows);
}

export async function getAdminSongPageBySongId(songId: string) {
  await ensureAppData();
  const rows = await dbQuery<SongPageJoinRow>(
    `
      select
        s.id as song_id,
        s.spotify_track_id,
        s.spotify_track_url,
        s.title as song_title,
        s.artist_name,
        s.album_name,
        s.artwork_url,
        s.preview_url,
        s.preview_source,
        s.release_year,
        s.explicit,
        s.duration_ms,
        s.created_at as song_created_at,
        s.updated_at as song_updated_at,
        p.id as page_id,
        p.slug,
        p.headline,
        p.status,
        p.published_at,
        p.unpublished_at,
        p.created_at as page_created_at,
        p.updated_at as page_updated_at,
        l.id as link_id,
        l.service,
        l.url,
        l.match_status,
        l.match_source,
        l.confidence,
        l.notes,
        l.position,
        tc.site_name,
        tc.meta_pixel_id,
        tc.meta_pixel_enabled,
        tc.meta_test_event_code
      from songs s
      join song_pages p on p.song_id = s.id
      left join streaming_links l on l.song_id = s.id
      left join tracking_config tc on tc.id = 'singleton'
      where s.id = $1
      order by coalesce(l.position, 999) asc
    `,
    [songId],
  );

  return mapSongPage(rows);
}

export async function createSongImportDraft(
  bundle: ImportBundle,
  requestedBy: string,
) {
  await ensureAppData();

  return dbTransaction(async (query) => {
    const existingSong = await query<{
      id: string;
      preview_url: string | null;
    }>(
      `
        select id, preview_url
        from songs
        where spotify_track_id = $1
        limit 1
      `,
      [bundle.song.spotifyTrackId],
    );

    const songId = existingSong[0]?.id ?? createId("song");
    const slug = await createUniqueSlug(
      query,
      bundle.song.artistName,
      bundle.song.title,
      songId,
    );

    if (existingSong[0]) {
      await query(
        `
          update songs
          set
            spotify_track_url = $2,
            title = $3,
            artist_name = $4,
            album_name = $5,
            artwork_url = $6,
            preview_url = $7,
            preview_source = $8,
            release_year = $9,
            explicit = $10,
            duration_ms = $11,
            updated_at = current_timestamp
          where id = $1
        `,
        [
          songId,
          bundle.song.spotifyTrackUrl,
          bundle.song.title,
          bundle.song.artistName,
          bundle.song.albumName,
          bundle.song.artworkUrl,
          bundle.song.previewUrl,
          bundle.song.previewUrl ? "import_match" : null,
          bundle.song.releaseYear,
          bundle.song.explicit,
          bundle.song.durationMs,
        ],
      );
    } else {
      await query(
        `
          insert into songs (
            id,
            spotify_track_id,
            spotify_track_url,
            title,
            artist_name,
            album_name,
            artwork_url,
            preview_url,
            preview_source,
            release_year,
            explicit,
            duration_ms
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `,
        [
          songId,
          bundle.song.spotifyTrackId,
          bundle.song.spotifyTrackUrl,
          bundle.song.title,
          bundle.song.artistName,
          bundle.song.albumName,
          bundle.song.artworkUrl,
          bundle.song.previewUrl,
          bundle.song.previewUrl ? "import_match" : null,
          bundle.song.releaseYear,
          bundle.song.explicit,
          bundle.song.durationMs,
        ],
      );
    }

    const pageRows = await query<{ id: string }>(
      `
        select id
        from song_pages
        where song_id = $1
        limit 1
      `,
      [songId],
    );

    if (pageRows[0]) {
      await query(
        `
          update song_pages
          set
            slug = $2,
            headline = 'Stream now',
            updated_at = current_timestamp
          where song_id = $1
        `,
        [songId, slug],
      );
    } else {
      await query(
        `
          insert into song_pages (id, song_id, slug, headline, status)
          values ($1, $2, $3, 'Stream now', 'draft')
        `,
        [createId("page"), songId, slug],
      );
    }

    await upsertStreamingLinks(query, songId, bundle.links);

    await query(
      `
        insert into import_attempts (
          id,
          song_id,
          spotify_track_id,
          spotify_url,
          status,
          requested_by,
          request_payload,
          response_payload
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        createId("import"),
        songId,
        bundle.song.spotifyTrackId,
        bundle.song.spotifyTrackUrl,
        bundle.importStatus,
        requestedBy,
        JSON.stringify({
          spotifyTrackUrl: bundle.song.spotifyTrackUrl,
        }),
        JSON.stringify(bundle),
      ],
    );

    return songId;
  });
}

export async function updateSongDraft(input: {
  songId: string;
  title: string;
  artistName: string;
  albumName: string | null;
  artworkUrl: string;
  previewUrl: string | null;
  headline: string;
  slug: string;
  status: "draft" | "published" | "unpublished";
  links: MatchCandidate[];
}) {
  await ensureAppData();

  return dbTransaction(async (query) => {
    const uniqueSlug = await createUniqueSlug(
      query,
      input.artistName,
      input.title,
      input.songId,
    );
    const desiredSlug = slugify(input.slug) || uniqueSlug;
    const finalSlug =
      desiredSlug === uniqueSlug
        ? desiredSlug
        : await createUniqueSlug(query, "", desiredSlug, input.songId);

    await query(
      `
        update songs
        set
          title = $2,
          artist_name = $3,
          album_name = $4,
          artwork_url = $5,
          preview_url = $6,
          preview_source = case when $6::text is null then null else coalesce(preview_source, 'manual') end,
          updated_at = current_timestamp
        where id = $1
      `,
      [
        input.songId,
        input.title,
        input.artistName,
        input.albumName,
        input.artworkUrl,
        input.previewUrl,
      ],
    );

    await query(
      `
        update song_pages
        set
          slug = $2,
          headline = $3,
          status = $4,
          published_at = case when $4 = 'published' then coalesce(published_at, current_timestamp) else published_at end,
          unpublished_at = case when $4 = 'unpublished' then current_timestamp else null end,
          updated_at = current_timestamp
        where song_id = $1
      `,
      [input.songId, finalSlug, input.headline, input.status],
    );

    await upsertStreamingLinks(query, input.songId, input.links);
  });
}

export async function deleteSongById(songId: string) {
  await ensureAppData();

  return dbTransaction(async (query) => {
    const pageRows = await query<{ slug: string | null }>(
      `
        select slug
        from song_pages
        where song_id = $1
        limit 1
      `,
      [songId],
    );

    const deletedRows = await query<{ id: string }>(
      `
        delete from songs
        where id = $1
        returning id
      `,
      [songId],
    );

    if (!deletedRows[0]) {
      throw new Error("The song could not be found.");
    }

    return {
      songId: deletedRows[0].id,
      slug: pageRows[0]?.slug ?? null,
    };
  });
}

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  await ensureAppData();
  const [totals, songs] = await Promise.all([
    dbQuery<{
      total_songs: string | number;
      published_songs: string | number;
      draft_songs: string | number;
      total_visits: string | number;
      total_clicks: string | number;
    }>(
      `
        select
          (select count(*) from songs) as total_songs,
          (select count(*) from song_pages where status = 'published') as published_songs,
          (select count(*) from song_pages where status = 'draft') as draft_songs,
          (select count(*) from visits) as total_visits,
          (select count(*) from click_events) as total_clicks
      `,
    ),
    dbQuery<{
      song_id: string;
      title: string;
      artist_name: string;
      artwork_url: string;
      slug: string;
      status: "draft" | "published" | "unpublished";
      preview_url: string | null;
      updated_at: string;
      visit_count: string | number;
      click_count: string | number;
    }>(
      `
        select
          s.id as song_id,
          s.title,
          s.artist_name,
          s.artwork_url,
          p.slug,
          p.status,
          s.preview_url,
          case
            when s.updated_at > p.updated_at then s.updated_at
            else p.updated_at
          end as updated_at,
          coalesce(v.visit_count, 0) as visit_count,
          coalesce(c.click_count, 0) as click_count
        from songs s
        join song_pages p on p.song_id = s.id
        left join (
          select song_id, count(*) as visit_count
          from visits
          group by song_id
        ) v on v.song_id = s.id
        left join (
          select song_id, count(*) as click_count
          from click_events
          group by song_id
        ) c on c.song_id = s.id
        order by updated_at desc
      `,
    ),
  ]);

  const row = totals[0];

  return {
    totalSongs: Number(row?.total_songs ?? 0),
    publishedSongs: Number(row?.published_songs ?? 0),
    draftSongs: Number(row?.draft_songs ?? 0),
    totalVisits: Number(row?.total_visits ?? 0),
    totalClicks: Number(row?.total_clicks ?? 0),
    songs: songs.map((song) => ({
      songId: song.song_id,
      title: song.title,
      artistName: song.artist_name,
      artworkUrl: song.artwork_url,
      slug: song.slug,
      status: song.status,
      previewUrl: song.preview_url,
      updatedAt: song.updated_at,
      visitCount: Number(song.visit_count),
      clickCount: Number(song.click_count),
    })),
  };
}

export async function getAnalyticsSnapshot(
  rangeDays = 30,
): Promise<AnalyticsSnapshot> {
  await ensureAppData();
  const sinceIso = createSinceIso(rangeDays);

  const [
    totals,
    serviceBreakdown,
    dailyVisitEvents,
    dailyClickEvents,
    referrers,
    referrerClicks,
    utms,
    utmClicks,
    geos,
    geoClicks,
    devices,
    deviceClicks,
    songs,
    songClicks,
  ] = await Promise.all([
    dbQuery<{
      total_visits: string | number;
      unique_visitors: string | number;
      total_clicks: string | number;
    }>(
      `
        select
          (select count(*) from visits where created_at >= $1::timestamptz) as total_visits,
          (select count(distinct visitor_id) from visits where created_at >= $1::timestamptz) as unique_visitors,
          (select count(*) from click_events where created_at >= $1::timestamptz) as total_clicks
      `,
      [sinceIso],
    ),
    dbQuery<{
      service: StreamingLinkRecord["service"];
      clicks: string | number;
    }>(
      `
        select service, count(*) as clicks
        from click_events
        where created_at >= $1::timestamptz
        group by service
        order by clicks desc
      `,
      [sinceIso],
    ),
    dbQuery<{
      created_at: string;
      visitor_id: string;
    }>(
      `
        select created_at, visitor_id
        from visits
        where created_at >= $1::timestamptz
      `,
      [sinceIso],
    ),
    dbQuery<{
      created_at: string;
    }>(
      `
        select created_at
        from click_events
        where created_at >= $1::timestamptz
      `,
      [sinceIso],
    ),
    dbQuery<{
      label: string | null;
      visits: string | number;
    }>(
      `
        select coalesce(referrer_host, 'Direct') as label, count(*) as visits
        from visits
        where created_at >= $1::timestamptz
        group by label
        order by visits desc
        limit 10
      `,
      [sinceIso],
    ),
    dbQuery<{
      label: string | null;
      clicks: string | number;
    }>(
      `
        select coalesce(referrer_host, 'Direct') as label, count(*) as clicks
        from click_events
        where created_at >= $1::timestamptz
        group by label
        order by clicks desc
      `,
      [sinceIso],
    ),
    dbQuery<{
      source: string | null;
      medium: string | null;
      campaign: string | null;
      visits: string | number;
    }>(
      `
        select
          coalesce(utm_source, 'Direct') as source,
          coalesce(utm_medium, '(none)') as medium,
          coalesce(utm_campaign, '(none)') as campaign,
          count(*) as visits
        from visits
        where created_at >= $1::timestamptz
        group by source, medium, campaign
        order by visits desc
        limit 10
      `,
      [sinceIso],
    ),
    dbQuery<{
      source: string | null;
      medium: string | null;
      campaign: string | null;
      clicks: string | number;
    }>(
      `
        select
          coalesce(utm_source, 'Direct') as source,
          coalesce(utm_medium, '(none)') as medium,
          coalesce(utm_campaign, '(none)') as campaign,
          count(*) as clicks
        from click_events
        where created_at >= $1::timestamptz
        group by source, medium, campaign
        order by clicks desc
      `,
      [sinceIso],
    ),
    dbQuery<{
      country: string | null;
      city: string | null;
      visits: string | number;
    }>(
      `
        select
          coalesce(country, 'Unknown') as country,
          coalesce(city, 'Unknown') as city,
          count(*) as visits
        from visits
        where created_at >= $1::timestamptz
        group by country, city
        order by visits desc
        limit 10
      `,
      [sinceIso],
    ),
    dbQuery<{
      country: string | null;
      city: string | null;
      clicks: string | number;
    }>(
      `
        select
          coalesce(country, 'Unknown') as country,
          coalesce(city, 'Unknown') as city,
          count(*) as clicks
        from click_events
        where created_at >= $1::timestamptz
        group by country, city
        order by clicks desc
      `,
      [sinceIso],
    ),
    dbQuery<{
      label: string | null;
      visits: string | number;
    }>(
      `
        select
          coalesce(device_type, 'Unknown') as label,
          count(*) as visits
        from visits
        where created_at >= $1::timestamptz
        group by label
        order by visits desc
      `,
      [sinceIso],
    ),
    dbQuery<{
      label: string | null;
      clicks: string | number;
    }>(
      `
        select
          coalesce(device_type, 'Unknown') as label,
          count(*) as clicks
        from click_events
        where created_at >= $1::timestamptz
        group by label
        order by clicks desc
      `,
      [sinceIso],
    ),
    dbQuery<{
      song_id: string;
      slug: string;
      title: string;
      visits: string | number;
      clicks: string | number;
    }>(
      `
        select
          s.id as song_id,
          p.slug,
          s.title,
          coalesce(v.visits, 0) as visits,
          coalesce(c.clicks, 0) as clicks
        from songs s
        join song_pages p on p.song_id = s.id
        left join (
          select song_id, count(*) as visits
          from visits
          where created_at >= $1::timestamptz
          group by song_id
        ) v on v.song_id = s.id
        left join (
          select song_id, count(*) as clicks
          from click_events
          where created_at >= $1::timestamptz
          group by song_id
        ) c on c.song_id = s.id
        order by visits desc, clicks desc, title asc
      `,
      [sinceIso],
    ),
    dbQuery<{
      song_id: string;
      clicks: string | number;
    }>(
      `
        select song_id, count(*) as clicks
        from click_events
        where created_at >= $1::timestamptz
        group by song_id
        order by clicks desc
      `,
      [sinceIso],
    ),
  ]);

  const row = totals[0];
  const totalVisits = Number(row?.total_visits ?? 0);
  const totalClicks = Number(row?.total_clicks ?? 0);
  const uniqueVisitors = Number(row?.unique_visitors ?? 0);

  const referrerClickMap = new Map(
    referrerClicks.map((entry) => [entry.label ?? "Direct", Number(entry.clicks)]),
  );
  const referrerVisitMap = new Map(
    referrers.map((entry) => [entry.label ?? "Direct", Number(entry.visits)]),
  );
  const referrerLabels = new Set<string>([
    ...referrerVisitMap.keys(),
    ...referrerClickMap.keys(),
  ]);

  const utmClickMap = new Map(
    utmClicks.map((entry) => [
      `${entry.source ?? "Direct"}|${entry.medium ?? "(none)"}|${entry.campaign ?? "(none)"}`,
      Number(entry.clicks),
    ]),
  );
  const utmVisitMap = new Map(
    utms.map((entry) => [
      `${entry.source ?? "Direct"}|${entry.medium ?? "(none)"}|${entry.campaign ?? "(none)"}`,
      Number(entry.visits),
    ]),
  );
  const utmKeys = new Set<string>([...utmVisitMap.keys(), ...utmClickMap.keys()]);

  const geoClickMap = new Map(
    geoClicks.map((entry) => [
      `${entry.country ?? "Unknown"}|${entry.city ?? "Unknown"}`,
      Number(entry.clicks),
    ]),
  );
  const geoVisitMap = new Map(
    geos.map((entry) => [
      `${entry.country ?? "Unknown"}|${entry.city ?? "Unknown"}`,
      Number(entry.visits),
    ]),
  );
  const geoKeys = new Set<string>([...geoVisitMap.keys(), ...geoClickMap.keys()]);

  const deviceClickMap = new Map(
    deviceClicks.map((entry) => [entry.label ?? "Unknown", Number(entry.clicks)]),
  );
  const deviceVisitMap = new Map(
    devices.map((entry) => [entry.label ?? "Unknown", Number(entry.visits)]),
  );
  const deviceLabels = new Set<string>([
    ...deviceVisitMap.keys(),
    ...deviceClickMap.keys(),
  ]);

  const songClickMap = new Map(
    songClicks.map((entry) => [entry.song_id, Number(entry.clicks)]),
  );

  const dailyVisitMap = new Map<string, { visits: number; uniqueVisitors: Set<string> }>();

  for (const entry of dailyVisitEvents) {
    const key = normalizeDateKey(entry.created_at);
    const current = dailyVisitMap.get(key) ?? {
      visits: 0,
      uniqueVisitors: new Set<string>(),
    };
    current.visits += 1;
    current.uniqueVisitors.add(entry.visitor_id);
    dailyVisitMap.set(key, current);
  }

  const dailyClickMap = new Map<string, number>();

  for (const entry of dailyClickEvents) {
    const key = normalizeDateKey(entry.created_at);
    dailyClickMap.set(key, (dailyClickMap.get(key) ?? 0) + 1);
  }

  const daily: AnalyticsSnapshot["daily"] = [];
  const start = new Date(sinceIso);

  for (let index = 0; index < rangeDays; index += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    const key = day.toISOString().slice(0, 10);
    const visitsForDay = dailyVisitMap.get(key)?.visits ?? 0;
    const uniqueForDay = dailyVisitMap.get(key)?.uniqueVisitors.size ?? 0;
    const clicksForDay = dailyClickMap.get(key) ?? 0;

    daily.push({
      date: key,
      visits: visitsForDay,
      uniqueVisitors: uniqueForDay,
      clicks: clicksForDay,
      ctr: visitsForDay > 0 ? clicksForDay / visitsForDay : 0,
    });
  }

  return {
    rangeDays,
    totalVisits,
    uniqueVisitors,
    totalClicks,
    clickThroughRate: totalVisits > 0 ? totalClicks / totalVisits : 0,
    serviceBreakdown: serviceBreakdown.map((entry) => ({
      service: entry.service,
      clicks: Number(entry.clicks),
    })),
    referrers: [...referrerLabels]
      .map((label) => {
        const visits = referrerVisitMap.get(label) ?? 0;
        const clicks = referrerClickMap.get(label) ?? 0;
        return {
          label,
          visits,
          clicks,
          ctr: visits > 0 ? clicks / visits : 0,
        };
      })
      .sort((left, right) => right.visits - left.visits || right.clicks - left.clicks)
      .slice(0, 10),
    utms: [...utmKeys]
      .map((key) => {
        const [source, medium, campaign] = key.split("|");
        const visits = utmVisitMap.get(key) ?? 0;
        const clicks = utmClickMap.get(key) ?? 0;
        return {
          source,
          medium,
          campaign,
          visits,
          clicks,
          ctr: visits > 0 ? clicks / visits : 0,
        };
      })
      .sort((left, right) => right.visits - left.visits || right.clicks - left.clicks)
      .slice(0, 10),
    geos: [...geoKeys]
      .map((key) => {
        const [country, city] = key.split("|");
        const visits = geoVisitMap.get(key) ?? 0;
        const clicks = geoClickMap.get(key) ?? 0;
        return {
          country,
          city,
          visits,
          clicks,
          ctr: visits > 0 ? clicks / visits : 0,
        };
      })
      .sort((left, right) => right.visits - left.visits || right.clicks - left.clicks)
      .slice(0, 10),
    devices: [...deviceLabels]
      .map((label) => {
        const visits = deviceVisitMap.get(label) ?? 0;
        const clicks = deviceClickMap.get(label) ?? 0;
        return {
          label,
          visits,
          clicks,
          ctr: visits > 0 ? clicks / visits : 0,
        };
      })
      .sort((left, right) => right.visits - left.visits || right.clicks - left.clicks)
      .slice(0, 6),
    songs: songs.map((entry) => ({
      songId: entry.song_id,
      slug: entry.slug,
      title: entry.title,
      visits: Number(entry.visits),
      clicks: songClickMap.get(entry.song_id) ?? Number(entry.clicks),
      ctr:
        Number(entry.visits) > 0
          ? (songClickMap.get(entry.song_id) ?? Number(entry.clicks)) /
            Number(entry.visits)
          : 0,
    })),
    daily,
  };
}

export async function recordVisit(input: {
  songId: string;
  pageId: string;
  path: string;
  context: TrackingContext;
}) {
  await ensureAppData();

  const visitId = createId("visit");
  await dbQuery(
    `
      insert into visits (
        id,
        song_id,
        page_id,
        visitor_id,
        path,
        referrer,
        referrer_host,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_term,
        utm_content,
        user_agent,
        browser_name,
        os_name,
        device_type,
        country,
        city,
        ip_hash
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    `,
    [
      visitId,
      input.songId,
      input.pageId,
      input.context.visitorId,
      input.path,
      input.context.referrer,
      input.context.referrerHost,
      input.context.source,
      input.context.medium,
      input.context.campaign,
      input.context.term,
      input.context.content,
      input.context.userAgent,
      input.context.browserName,
      input.context.osName,
      input.context.deviceType,
      input.context.country,
      input.context.city,
      input.context.ipHash,
    ],
  );

  return visitId;
}

function mergeAttribution(
  base: UTMAttribution,
  fallback: UTMAttribution,
): UTMAttribution {
  return {
    source: base.source ?? fallback.source ?? null,
    medium: base.medium ?? fallback.medium ?? null,
    campaign: base.campaign ?? fallback.campaign ?? null,
    term: base.term ?? fallback.term ?? null,
    content: base.content ?? fallback.content ?? null,
  };
}

export async function recordClickBySlug(input: {
  slug: string;
  service: StreamingLinkRecord["service"];
  context: TrackingContext;
  lastVisitId: string | null;
  fallbackAttribution: UTMAttribution;
}) {
  await ensureAppData();
  const page = await getPublishedSongPageBySlug(input.slug);

  if (!page) {
    return null;
  }

  const link = page.links.find((entry) => entry.service === input.service);

  if (!link?.url) {
    return {
      destinationUrl: null,
    };
  }

  const attribution = mergeAttribution(input.context, input.fallbackAttribution);

  await dbQuery(
    `
      insert into click_events (
        id,
        visit_id,
        song_id,
        page_id,
        streaming_link_id,
        visitor_id,
        service,
        destination_url,
        referrer,
        referrer_host,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_term,
        utm_content,
        user_agent,
        browser_name,
        os_name,
        device_type,
        country,
        city,
        ip_hash
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
    `,
    [
      createId("click"),
      input.lastVisitId,
      page.song.id,
      page.page.id,
      link.id,
      input.context.visitorId,
      input.service,
      link.url,
      input.context.referrer,
      input.context.referrerHost,
      attribution.source,
      attribution.medium,
      attribution.campaign,
      attribution.term,
      attribution.content,
      input.context.userAgent,
      input.context.browserName,
      input.context.osName,
      input.context.deviceType,
      input.context.country,
      input.context.city,
      input.context.ipHash,
    ],
  );

  return {
    destinationUrl: link.url,
  };
}
