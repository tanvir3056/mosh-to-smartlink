// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest";

const mockGetUserSession = vi.hoisted(() => vi.fn());
const mockProcessArtworkUpload = vi.hoisted(() => vi.fn());
const mockStoreArtworkAsset = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  getUserSession: mockGetUserSession,
}));

vi.mock("@/lib/artwork", () => ({
  processArtworkUpload: mockProcessArtworkUpload,
}));

vi.mock("@/lib/storage", () => ({
  storeArtworkAsset: mockStoreArtworkAsset,
}));

function buildArtworkRequest(file: File) {
  const formData = new FormData();
  formData.set("file", file);
  formData.set("songId", "song_1");

  return new Request("https://backstage.test/api/admin/artwork", {
    method: "POST",
    body: formData,
  });
}

describe("POST /api/admin/artwork", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserSession.mockResolvedValue({
      userId: "user_1",
      username: "artist",
    });
    mockProcessArtworkUpload.mockResolvedValue({
      bytes: new Uint8Array([1, 2, 3]),
      mimeType: "image/webp",
    });
    mockStoreArtworkAsset.mockResolvedValue({
      url: "https://cdn.example.com/artwork.webp",
      mode: "storage",
    });
  });

  test("returns a clean validation error when image processing rejects the file", async () => {
    const { POST } = await import("@/app/api/admin/artwork/route");
    const file = new File([new Uint8Array([1, 2, 3])], "bad.png", {
      type: "image/png",
    });

    mockProcessArtworkUpload.mockRejectedValueOnce(
      new Error("The uploaded file is not a valid image."),
    );

    const response = await POST(buildArtworkRequest(file));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Artwork uploads must be valid image files.",
    });
    expect(mockStoreArtworkAsset).not.toHaveBeenCalled();
  });

  test("returns a clean server error when optimized artwork cannot be stored", async () => {
    const { POST } = await import("@/app/api/admin/artwork/route");
    const file = new File([new Uint8Array([1, 2, 3])], "cover.png", {
      type: "image/png",
    });

    mockStoreArtworkAsset.mockRejectedValueOnce(new Error("storage unavailable"));

    const response = await POST(buildArtworkRequest(file));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Artwork could not be saved right now. Please try again.",
    });
  });
});
