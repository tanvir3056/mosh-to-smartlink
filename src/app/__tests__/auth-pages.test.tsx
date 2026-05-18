import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@/app/admin/actions", () => ({
  signInAction: vi.fn(),
  signUpAction: vi.fn(),
}));

describe("auth page launch copy", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    vi.resetModules();
  });

  test("sign-in copy does not expose implementation provider jargon", async () => {
    const { default: SignInPage } = await import("@/app/sign-in/page");

    render(await SignInPage());

    expect(screen.queryByText(/supabase/i)).not.toBeInTheDocument();
    expect(screen.getByText("Sign-in mode: Secure account access")).toBeInTheDocument();
  });

  test("sign-up copy does not expose implementation provider jargon", async () => {
    const { default: SignUpPage } = await import("@/app/sign-up/page");

    render(await SignUpPage());

    expect(screen.queryByText(/supabase/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/first version/i)).not.toBeInTheDocument();
    expect(screen.getByText("Account mode: Secure account creation")).toBeInTheDocument();
  });
});
