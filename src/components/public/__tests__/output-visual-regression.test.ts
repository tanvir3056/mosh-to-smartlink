import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

describe("public output visual treatment", () => {
  test("keeps the output page free of decorative red glows and crop marks", () => {
    const globalsCss = readFileSync("src/app/globals.css", "utf8");
    const previewPlayer = readFileSync(
      "src/components/public/preview-player.tsx",
      "utf8",
    );
    const songPage = readFileSync("src/components/public/song-page.tsx", "utf8");

    expect(globalsCss).not.toContain("rgba(240, 68, 68");
    expect(globalsCss).not.toContain("0 0 54px rgba(179, 22, 36");
    expect(previewPlayer).not.toContain("absolute inset-3 border");
    expect(previewPlayer).not.toContain("absolute bottom-3 left-3 h-10 w-10");
    expect(previewPlayer).not.toContain("absolute right-3 top-3 h-10 w-10");
    expect(songPage).not.toContain("border-x border-[#eee6d6]/10");
  });
});
