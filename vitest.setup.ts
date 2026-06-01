import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

vi.mock("next/font/google", () => ({
  Hanken_Grotesk: ({ variable }: { variable: string }) => ({
    variable: `mock-${variable}`,
  }),
  JetBrains_Mono: ({ variable }: { variable: string }) => ({
    variable: `mock-${variable}`,
  }),
  Schibsted_Grotesk: ({ variable }: { variable: string }) => ({
    variable: `mock-${variable}`,
  }),
}));
