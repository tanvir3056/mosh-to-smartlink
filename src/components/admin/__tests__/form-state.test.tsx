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

  test("does not expose raw database errors to artists", () => {
    render(
      <FormStateMessage
        error={
          'insert or update on table "songs" violates foreign key constraint on table "streaming_links_song_id_fk": Failed SQL statement: insert into streaming_links (...)'
        }
      />,
    );

    const message = screen.getByRole("alert");

    expect(message).toHaveTextContent(
      "Backstage could not finish saving that change. Reload Backstage and try again.",
    );
    expect(message).not.toHaveTextContent("streaming_links_song_id_fk");
    expect(message).not.toHaveTextContent("insert into streaming_links");
  });
});
