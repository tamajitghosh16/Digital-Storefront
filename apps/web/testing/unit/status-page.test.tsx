// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusPage } from "@/components/primitives/status-page";

// A component-test template: render, then query the way a visitor would —
// by role and accessible name, not by class or test id.
describe("StatusPage", () => {
  it("shows the message and a way back home", () => {
    render(<StatusPage glyph="▤" code="Error 404" title="We couldn't find that page" body="It may have moved." />);

    expect(screen.getByRole("heading", { level: 1, name: "We couldn't find that page" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");
  });

  it("offers onward links into the catalogue", () => {
    render(<StatusPage glyph="▤" code="Error 404" title="Not found" body="" />);

    expect(screen.getByRole("link", { name: "Books" })).toHaveAttribute("href", "/educational-material/books");
  });
});
