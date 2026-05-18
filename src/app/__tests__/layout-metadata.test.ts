import { describe, expect, test } from "vitest";

import { metadata } from "@/app/layout";

describe("root metadata", () => {
  test("sets metadataBase so shared URLs do not resolve against localhost", () => {
    expect(metadata.metadataBase).toBeInstanceOf(URL);
    expect(metadata.metadataBase?.toString()).toBe("http://localhost:3000/");
  });
});
