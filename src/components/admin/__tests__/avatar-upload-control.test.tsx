import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { AvatarUploadControl } from "@/components/admin/avatar-upload-control";

describe("AvatarUploadControl", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          avatarUrl: "https://cdn.example.com/avatar.webp",
        }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("renders the saved avatar and keeps the upload action enabled", () => {
    render(
      <AvatarUploadControl
        username="warcry"
        avatarUrl="https://images.example.com/avatar.jpg"
      />,
    );

    expect(screen.getByAltText("warcry avatar")).toHaveAttribute(
      "src",
      "https://images.example.com/avatar.jpg",
    );
    expect(screen.getByRole("button", { name: "Upload avatar" })).toBeEnabled();
  });

  test("uploads a selected image and updates the avatar preview", async () => {
    const { container } = render(
      <AvatarUploadControl username="warcry" avatarUrl={null} />,
    );
    const input = container.querySelector<HTMLInputElement>("input[type='file']");
    const file = new File([new Uint8Array([1, 2, 3])], "avatar.png", {
      type: "image/png",
    });

    expect(input).not.toBeNull();
    expect(screen.getByText("W")).toBeInTheDocument();

    fireEvent.change(input as HTMLInputElement, {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/admin/avatar",
        expect.objectContaining({
          method: "POST",
          body: expect.any(FormData),
        }),
      );
    });
    expect(await screen.findByAltText("warcry avatar")).toHaveAttribute(
      "src",
      "https://cdn.example.com/avatar.webp",
    );
  });

  test("surfaces an upload error without replacing the current preview", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: "Avatar uploads must be image files.",
      }),
    } as Response);
    const { container } = render(
      <AvatarUploadControl
        username="warcry"
        avatarUrl="https://images.example.com/avatar.jpg"
      />,
    );
    const input = container.querySelector<HTMLInputElement>("input[type='file']");
    const file = new File([new Uint8Array([1])], "avatar.txt", {
      type: "text/plain",
    });

    fireEvent.change(input as HTMLInputElement, {
      target: { files: [file] },
    });

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Avatar uploads must be image files.",
    );
    expect(screen.getByAltText("warcry avatar")).toHaveAttribute(
      "src",
      "https://images.example.com/avatar.jpg",
    );
  });
});
