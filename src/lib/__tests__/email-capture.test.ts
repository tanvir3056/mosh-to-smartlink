import { describe, expect, test } from "vitest";

import { normalizeRewardUrl } from "@/lib/email-capture";

describe("normalizeRewardUrl", () => {
  test("keeps a full https URL intact", () => {
    expect(normalizeRewardUrl("https://downloads.example.com/file.mp3")).toBe(
      "https://downloads.example.com/file.mp3",
    );
  });

  test("adds https to bare domains", () => {
    expect(normalizeRewardUrl("downloads.example.com/file.mp3")).toBe(
      "https://downloads.example.com/file.mp3",
    );
  });

  test("rejects non-URLs", () => {
    expect(normalizeRewardUrl("N/A")).toBeNull();
  });
});
