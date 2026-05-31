import { describe, expect, test } from "vitest";

import { dynamic, revalidate } from "@/app/page";

describe("home page cache policy", () => {
  test("renders the root page dynamically so stale deploy shells do not trap browsers", () => {
    expect(dynamic).toBe("force-dynamic");
    expect(revalidate).toBe(0);
  });
});
