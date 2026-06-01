import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

const componentPath = join(
  process.cwd(),
  "src/components/admin/artwork-upload-field.tsx",
);

describe("ArtworkUploadField design tokens", () => {
  test("keeps the crop editor inside the Claude app surface system", () => {
    const source = readFileSync(componentPath, "utf8");

    expect(source).not.toContain("bg-[#0f131a]");
    expect(source).not.toContain("bg-[#090c11]");
    expect(source).not.toContain("border-white/10");
    expect(source).not.toContain("text-white/42");
    expect(source).not.toContain("text-[#10141b]");
    expect(source).toContain("bg-[var(--app-panel)]");
    expect(source).toContain("text-[var(--app-text)]");
  });
});
