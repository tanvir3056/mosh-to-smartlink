import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createAccountOwner,
  createSongImportDraft,
  getAdminSongPageBySongId,
  getUserByUsername,
  publishedSongPageTag,
  updateLocalPasswordHash,
  updateSongDraft,
} from "@/lib/data";
import { appEnv } from "@/lib/env";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import type { ImportBundle } from "@/lib/types";
import { buildPublicSongPath, normalizeUsername } from "@/lib/utils";

const seedRequestSchema = z.object({
  scenario: z.enum(["basic", "email-capture"]).default("basic"),
  seedName: z.string().trim().min(1).max(48).optional(),
});

function isQaRouteEnabled() {
  return appEnv.nodeEnv !== "production";
}

function buildArtworkDataUrl(seedName: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1200">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f1720" />
          <stop offset="100%" stop-color="#3fd4c4" />
        </linearGradient>
      </defs>
      <rect width="1200" height="1200" fill="url(#bg)" />
      <circle cx="930" cy="250" r="180" fill="rgba(255,255,255,0.12)" />
      <circle cx="250" cy="960" r="220" fill="rgba(255,255,255,0.08)" />
      <text x="96" y="960" fill="#f8fafc" font-family="Arial, sans-serif" font-size="92" font-weight="700">
        ${seedName}
      </text>
      <text x="96" y="1060" fill="#d8f7f3" font-family="Arial, sans-serif" font-size="54">
        Backstage QA
      </text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function buildImportBundle(seedName: string): ImportBundle {
  const slugSeed = seedName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const trackId = `qa${slugSeed.replace(/-/g, "").slice(0, 18)}`.padEnd(20, "x");
  const title = `QA ${seedName}`;
  const artistName = "Backstage QA";

  return {
    song: {
      spotifyTrackId: trackId,
      spotifyTrackUrl: `https://open.spotify.com/track/${trackId}`,
      title,
      artistName,
      albumName: "Quality Control",
      artworkUrl: buildArtworkDataUrl(seedName),
      previewUrl: null,
      releaseYear: 2026,
      explicit: false,
      durationMs: 182000,
      rawSource: {
        oembed: {},
        ogDescription: `${artistName} · ${title} · Song · 2026`,
      },
    },
    links: [
      {
        service: "spotify",
        url: "https://example.com/spotify",
        matchStatus: "matched",
        matchSource: "qa_seed",
        confidence: 1,
        notes: null,
      },
      {
        service: "apple_music",
        url: "https://example.com/apple-music",
        matchStatus: "matched",
        matchSource: "qa_seed",
        confidence: 1,
        notes: null,
      },
      {
        service: "youtube_music",
        url: "https://example.com/youtube-music",
        matchStatus: "matched",
        matchSource: "qa_seed",
        confidence: 1,
        notes: null,
      },
      {
        service: "amazon_music",
        url: "https://example.com/amazon-music",
        matchStatus: "matched",
        matchSource: "qa_seed",
        confidence: 1,
        notes: null,
      },
      {
        service: "deezer",
        url: "https://example.com/deezer",
        matchStatus: "matched",
        matchSource: "qa_seed",
        confidence: 1,
        notes: null,
      },
      {
        service: "tidal",
        url: "https://example.com/tidal",
        matchStatus: "matched",
        matchSource: "qa_seed",
        confidence: 1,
        notes: null,
      },
    ],
    importStatus: "succeeded",
  };
}

async function ensureQaAdminUser() {
  const username = normalizeUsername("qa-artist");
  const existingUser = await getUserByUsername(username);
  const passwordHash = await hashPassword(appEnv.demoAdminPassword);

  if (existingUser) {
    await updateLocalPasswordHash(existingUser.id, passwordHash);
    return existingUser;
  }

  return createAccountOwner({
    userId: `user_${crypto.randomUUID()}`,
    username,
    loginEmail: `${username}@users.backstage.local`,
    passwordHash,
  });
}

export async function POST(request: Request) {
  if (!isQaRouteEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const parsed = seedRequestSchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid QA seed request." },
      { status: 400 },
    );
  }

  const user = await ensureQaAdminUser();
  const seedName =
    parsed.data.seedName ??
    `${parsed.data.scenario}-${crypto.randomUUID().slice(0, 8)}`;
  const bundle = buildImportBundle(seedName);
  const songId = await createSongImportDraft(bundle, user.username, user.id);
  const adminPage = await getAdminSongPageBySongId(songId, user.id);

  if (!adminPage) {
    return NextResponse.json(
      { error: "The QA song page could not be created." },
      { status: 500 },
    );
  }

  await updateSongDraft({
    ownerUserId: user.id,
    songId,
    title: adminPage.song.title,
    artistName: adminPage.song.artistName,
    albumName: adminPage.song.albumName,
    artworkUrl: adminPage.song.artworkUrl,
    previewUrl: adminPage.song.previewUrl,
    headline:
      parsed.data.scenario === "email-capture"
        ? "Unlock the free download"
        : "Stream now",
    slug: adminPage.page.slug,
    status: "published",
    emailCapture:
      parsed.data.scenario === "email-capture"
        ? {
            enabled: true,
            title: "Download the song for free",
            description:
              "Drop your email to unlock the track and hear about future drops first.",
            buttonLabel: "Get the download",
            downloadUrl: "https://example.com/free-download.mp3",
            downloadLabel: "Download the track",
            tag: "qa-free-download",
          }
        : {
            enabled: false,
            title: null,
            description: null,
            buttonLabel: null,
            downloadUrl: null,
            downloadLabel: null,
            tag: null,
          },
    links: adminPage.links.map((link) => ({
      service: link.service,
      url: link.url,
      matchStatus: link.matchStatus,
      matchSource: link.matchSource,
      confidence: link.confidence,
      notes: link.notes,
    })),
  });

  const updatedPage = await getAdminSongPageBySongId(songId, user.id);
  const publicSlug = updatedPage?.page.slug ?? adminPage.page.slug;

  revalidatePath(buildPublicSongPath(user.username, publicSlug));
  revalidateTag(publishedSongPageTag(user.username, publicSlug), "max");

  return NextResponse.json({
    songId,
    username: user.username,
    slug: publicSlug,
    scenario: parsed.data.scenario,
  });
}

export async function GET(request: Request) {
  if (!isQaRouteEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const url = new URL(request.url);
  const intent = url.searchParams.get("intent");
  const slug = url.searchParams.get("slug");
  const email = url.searchParams.get("email")?.trim().toLowerCase() ?? null;

  if (intent === "user") {
    const user = await getUserByUsername(normalizeUsername("qa-artist"));

    return NextResponse.json({
      user: user
        ? {
            username: user.username,
            loginEmail: user.loginEmail,
            hasPasswordHash: Boolean(user.passwordHash),
            matchesDemoPassword: await verifyPassword(
              appEnv.demoAdminPassword,
              user.passwordHash,
            ),
          }
        : null,
    });
  }

  if (intent === "lead" && slug && email) {
    const { dbQuery } = await import("@/lib/db/driver");

    const rows = await dbQuery<{
      email: string;
      normalized_email: string;
      utm_source: string | null;
      utm_medium: string | null;
      utm_campaign: string | null;
      utm_content: string | null;
      connector_status: string;
    }>(
      `
        select
          ecs.email,
          ecs.normalized_email,
          ecs.utm_source,
          ecs.utm_medium,
          ecs.utm_campaign,
          ecs.utm_content,
          ecs.connector_status
        from email_capture_submissions ecs
        join song_pages sp on sp.id = ecs.page_id
        where sp.slug = $1
          and ecs.normalized_email = $2
        order by ecs.created_at desc
        limit 1
      `,
      [slug, email],
    );

    return NextResponse.json({
      lead: rows[0] ?? null,
    });
  }

  return NextResponse.json({ error: "Unsupported QA request." }, { status: 400 });
}
