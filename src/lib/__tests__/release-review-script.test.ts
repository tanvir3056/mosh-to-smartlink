import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { describe, expect, test } from "vitest";

const execFileAsync = promisify(execFile);

describe("release review report generator", () => {
  test("creates an evidence-first review artifact without empty placeholder findings", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "backstage-review-"));
    const scriptPath = path.resolve("scripts/release-review.mjs");

    try {
      const { stdout } = await execFileAsync("node", [scriptPath], {
        cwd: tempDir,
      });
      const outputPath = stdout.trim();
      const markdown = await readFile(outputPath, "utf8");

      expect(markdown).toContain("## Verification Evidence");
      expect(markdown).toContain("npm run test:e2e");
      expect(markdown).toContain("node scripts/qa-smoke.mjs basic");
      expect(markdown).toContain("Evidence status");
      expect(markdown).not.toContain("| critical |  |");
      expect(markdown).not.toContain("https://mosh-to-smartlink.vercel.app");
    } finally {
      await rm(tempDir, {
        recursive: true,
        force: true,
      });
    }
  });
});
