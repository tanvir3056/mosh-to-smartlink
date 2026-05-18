import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { FormStateMessage } from "@/components/admin/form-state";

describe("FormStateMessage", () => {
  test("announces errors as alerts", () => {
    render(<FormStateMessage error="Paste a Spotify track URL to start the import." />);

    const message = screen.getByRole("alert");

    expect(message).toHaveTextContent("Paste a Spotify track URL to start the import.");
    expect(message).toHaveAttribute("aria-live", "assertive");
  });

  test("announces success messages politely", () => {
    render(<FormStateMessage success="Draft saved." />);

    const message = screen.getByRole("status");

    expect(message).toHaveTextContent("Draft saved.");
    expect(message).toHaveAttribute("aria-live", "polite");
  });
});
