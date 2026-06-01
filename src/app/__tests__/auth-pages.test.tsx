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
    expect(screen.getByText("Secure session · username + password")).toBeInTheDocument();
    expect(screen.getByTestId("auth-card-footer")).toHaveTextContent(
      "New here? Create an account",
    );
  });

  test("sign-in page is rendered dynamically so login actions stay deploy-fresh", async () => {
    const signInPage = await import("@/app/sign-in/page");

    expect(signInPage.dynamic).toBe("force-dynamic");
    expect(signInPage.revalidate).toBe(0);
  });

  test("sign-up copy does not expose implementation provider jargon", async () => {
    const { default: SignUpPage } = await import("@/app/sign-up/page");

    render(await SignUpPage());

    expect(screen.queryByText(/supabase/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/first version/i)).not.toBeInTheDocument();
    expect(screen.getByText("This becomes the root of all your links.")).toBeInTheDocument();
    expect(
      screen.getByText(
        "By creating an account you agree to the Terms and acknowledge the Privacy Policy.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId("auth-card-footer")).toHaveTextContent(
      "Already have an account? Sign in",
    );
  });

  test("sign-up page is rendered dynamically so account creation actions stay deploy-fresh", async () => {
    const signUpPage = await import("@/app/sign-up/page");

    expect(signUpPage.dynamic).toBe("force-dynamic");
    expect(signUpPage.revalidate).toBe(0);
  });
});
