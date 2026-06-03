// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest";

const mockGetUserSession = vi.hoisted(() => vi.fn());
const mockProcessArtworkUpload = vi.hoisted(() => vi.fn());
const mockStoreArtworkAsset = vi.hoisted(() => vi.fn());
const mockUpdateUserAvatarUrl = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  getUserSession: mockGetUserSession,
}));

vi.mock("@/lib/artwork", () => ({
  processArtworkUpload: mockProcessArtworkUpload,
}));

vi.mock("@/lib/storage", () => ({
  storeArtworkAsset: mockStoreArtworkAsset,
}));

vi.mock("@/lib/data", () => ({
  updateUserAvatarUrl: mockUpdateUserAvatarUrl,
}));

function buildAvatarRequest(file: File | null) {
  const formData = new FormData();

  if (file) {
    formData.set("file", file);
  }

  return new Request("https://backstage.test/api/admin/avatar", {
    method: "POST",
    body: formData,
  });
}

describe("POST /api/admin/avatar", () => {
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
      url: "https://cdn.example.com/avatar.webp",
      mode: "storage",
    });
    mockUpdateUserAvatarUrl.mockResolvedValue(undefined);
  });

  test("stores the optimized avatar and persists it on the account", async () => {
    const { POST } = await import("@/app/api/admin/avatar/route");
    const file = new File([new Uint8Array([9, 8, 7])], "avatar.png", {
      type: "image/png",
    });

    const response = await POST(buildAvatarRequest(file));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      avatarUrl: "https://cdn.example.com/avatar.webp",
      mode: "storage",
    });
    expect(mockProcessArtworkUpload).toHaveBeenCalledWith({
      bytes: new Uint8Array([9, 8, 7]),
      crop: null,
    });
    expect(mockStoreArtworkAsset).toHaveBeenCalledWith({
      ownerUserId: "user_1",
      songId: null,
      bytes: new Uint8Array([1, 2, 3]),
      mimeType: "image/webp",
    });
    expect(mockUpdateUserAvatarUrl).toHaveBeenCalledWith(
      "user_1",
      "https://cdn.example.com/avatar.webp",
    );
  });

  test("requires an authenticated account", async () => {
    const { POST } = await import("@/app/api/admin/avatar/route");
    const file = new File([new Uint8Array([1])], "avatar.png", {
      type: "image/png",
    });
    mockGetUserSession.mockResolvedValueOnce(null);

    const response = await POST(buildAvatarRequest(file));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Sign in before uploading an avatar.",
    });
    expect(mockProcessArtworkUpload).not.toHaveBeenCalled();
  });

  test("returns a clean validation error when no file is provided", async () => {
    const { POST } = await import("@/app/api/admin/avatar/route");

    const response = await POST(buildAvatarRequest(null));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "No avatar file was provided.",
    });
  });

  test("returns a clean validation error when image processing rejects the file", async () => {
    const { POST } = await import("@/app/api/admin/avatar/route");
    const file = new File([new Uint8Array([1, 2, 3])], "bad.png", {
      type: "image/png",
    });

    mockProcessArtworkUpload.mockRejectedValueOnce(
      new Error("The uploaded file is not a valid image."),
    );

    const response = await POST(buildAvatarRequest(file));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Avatar uploads must be valid image files.",
    });
    expect(mockStoreArtworkAsset).not.toHaveBeenCalled();
    expect(mockUpdateUserAvatarUrl).not.toHaveBeenCalled();
  });

  test("returns a clean server error when optimized avatar cannot be stored", async () => {
    const { POST } = await import("@/app/api/admin/avatar/route");
    const file = new File([new Uint8Array([1, 2, 3])], "avatar.png", {
      type: "image/png",
    });

    mockStoreArtworkAsset.mockRejectedValueOnce(new Error("storage unavailable"));

    const response = await POST(buildAvatarRequest(file));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Avatar could not be saved right now. Please try again.",
    });
    expect(mockUpdateUserAvatarUrl).not.toHaveBeenCalled();
  });

  test("returns a clean server error when the account update fails", async () => {
    const { POST } = await import("@/app/api/admin/avatar/route");
    const file = new File([new Uint8Array([1, 2, 3])], "avatar.png", {
      type: "image/png",
    });

    mockUpdateUserAvatarUrl.mockRejectedValueOnce(new Error("column missing"));

    const response = await POST(buildAvatarRequest(file));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Avatar could not be saved right now. Please try again.",
    });
  });
});
