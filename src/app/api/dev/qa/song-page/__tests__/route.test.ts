// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  mockCreateAccountOwner,
  mockCreateSongImportDraft,
  mockGetAdminSongPageBySongId,
  mockGetUserByUsername,
  mockRevalidatePath,
  mockRevalidateTag,
  mockUpdateLocalPasswordHash,
  mockUpdateSongDraft,
} = vi.hoisted(() => ({
  mockCreateAccountOwner: vi.fn(),
  mockCreateSongImportDraft: vi.fn(),
  mockGetAdminSongPageBySongId: vi.fn(),
  mockGetUserByUsername: vi.fn(),
  mockRevalidatePath: vi.fn(),
  mockRevalidateTag: vi.fn(),
  mockUpdateLocalPasswordHash: vi.fn(),
  mockUpdateSongDraft: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
  revalidateTag: mockRevalidateTag,
}));

vi.mock("@/lib/env", () => ({
  appEnv: {
    demoAdminPassword: "dev-password",
    nodeEnv: "development",
  },
}));

vi.mock("@/lib/passwords", () => ({
  hashPassword: vi.fn(async () => "salt:hash"),
  verifyPassword: vi.fn(async () => true),
}));

vi.mock("@/lib/data", () => ({
  createAccountOwner: mockCreateAccountOwner,
  createSongImportDraft: mockCreateSongImportDraft,
  getAdminSongPageBySongId: mockGetAdminSongPageBySongId,
  getUserByUsername: mockGetUserByUsername,
  publishedSongPageTag: vi.fn((username: string, slug: string) =>
    `published-song-page:${username}:${slug}`,
  ),
  updateLocalPasswordHash: mockUpdateLocalPasswordHash,
  updateSongDraft: mockUpdateSongDraft,
}));

function createDeferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

function buildSeedRequest(scenario: "basic" | "email-capture", seedName: string) {
  return new Request("https://backstage.test/api/dev/qa/song-page", {
    method: "POST",
    body: JSON.stringify({ scenario, seedName }),
  });
}

function buildAdminPage(songId: string) {
  return {
    song: {
      title: `QA ${songId}`,
      artistName: "Backstage QA",
      albumName: "Quality Control",
      artworkUrl: "https://images.example.com/qa.jpg",
      previewUrl: null,
    },
    page: {
      slug: `${songId}-slug`,
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
    ],
  };
}

describe("POST /api/dev/qa/song-page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGetUserByUsername.mockResolvedValue({
      id: "user_qa",
      username: "qa-artist",
      loginEmail: "qa-artist@users.backstage.local",
      passwordHash: "old",
    });
    mockUpdateLocalPasswordHash.mockResolvedValue(undefined);
    mockUpdateSongDraft.mockResolvedValue(true);
    mockGetAdminSongPageBySongId.mockImplementation(async (songId: string) =>
      buildAdminPage(songId),
    );
  });

  test("serializes concurrent local QA seeds so release smoke checks do not race account writes", async () => {
    const firstCreateStarted = createDeferred();
    const releaseFirstCreate = createDeferred();
    let createCount = 0;

    mockCreateSongImportDraft.mockImplementation(async () => {
      createCount += 1;

      if (createCount === 1) {
        firstCreateStarted.resolve();
        await releaseFirstCreate.promise;
        return "song_basic";
      }

      return "song_email";
    });

    const { POST } = await import("@/app/api/dev/qa/song-page/route");
    const firstResponse = POST(buildSeedRequest("basic", "basic-seed"));

    await firstCreateStarted.promise;

    const secondResponse = POST(
      buildSeedRequest("email-capture", "email-seed"),
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockCreateSongImportDraft).toHaveBeenCalledTimes(1);

    releaseFirstCreate.resolve();

    const responses = await Promise.all([firstResponse, secondResponse]);

    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    expect(mockCreateSongImportDraft).toHaveBeenCalledTimes(2);
    expect(mockUpdateSongDraft).toHaveBeenCalledTimes(2);
  });
});
