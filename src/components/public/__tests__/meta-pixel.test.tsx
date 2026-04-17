import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { MetaPixel } from "@/components/public/meta-pixel";

vi.mock("next/script", () => ({
  default: function MockScript({
    id,
    children,
  }: {
    id?: string;
    children?: React.ReactNode;
  }) {
    return <script data-testid={id}>{children}</script>;
  },
}));

describe("MetaPixel", () => {
  test("renders the pixel bootstrap and tracking calls when enabled", () => {
    render(
      <MetaPixel
        pixelId="1234567890"
        enabled
        pageTitle="Mr. Brightside"
        artistName="The Killers"
      />,
    );

    const script = screen.getByTestId("meta-pixel-base");

    expect(script).toHaveTextContent("connect.facebook.net/en_US/fbevents.js");
    expect(script).toHaveTextContent("fbq('init', '1234567890')");
    expect(script).toHaveTextContent("fbq('track', 'PageView')");
    expect(script).toHaveTextContent("fbq('track', 'ViewContent'");
    expect(script).toHaveTextContent("Mr. Brightside");
    expect(script).toHaveTextContent("The Killers");
  });

  test("renders nothing when pixel is disabled", () => {
    const { container } = render(
      <MetaPixel
        pixelId="1234567890"
        enabled={false}
        pageTitle="Mr. Brightside"
        artistName="The Killers"
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
