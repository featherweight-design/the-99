import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExternalLink } from "./external-link";

describe("ExternalLink", () => {
  it("opens in a new tab without handing the opener over", () => {
    render(<ExternalLink href="https://manapool.com/cards?q=Sol%20Ring" label="Buy it" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener");
  });

  it("names itself with the label and the new-tab suffix, in that order", () => {
    const { container } = render(
      <ExternalLink href="https://manapool.com" label="Buy these at Mana Pool" />,
    );
    // Asserted on the DOM rather than the computed accessible name:
    // dom-accessibility-api trims each text node before joining them, which
    // drops the suffix's leading space that a screen reader does read.
    expect(container.querySelector(".sr-only")!.textContent).toBe(" (opens in a new tab)");
    expect(screen.getByRole("link").textContent).toBe(
      "Buy these at Mana Pool\u00A0\u2197 (opens in a new tab)",
    );
  });

  it("binds the arrow to the last word and hides it from assistive tech", () => {
    const { container } = render(<ExternalLink href="https://manapool.com" label="Buy it" />);
    const glyph = container.querySelector('[aria-hidden="true"]')!;
    expect(glyph.textContent).toBe("\u00A0\u2197");
  });

  it("paints the focus ring on focus-visible only", () => {
    render(<ExternalLink href="https://manapool.com" label="Buy it" />);
    const className = screen.getByRole("link").className;
    expect(className).toContain("focus-visible:outline-2");
    expect(className).not.toContain("focus:outline-2");
  });

  it("takes a 44px-tall coarse-pointer hit that stays off its neighbours", () => {
    render(<ExternalLink href="https://manapool.com" label="Buy it" />);
    expect(screen.getByRole("link")).toHaveClass("pointer-coarse:after:h-[max(44px,100%)]", "pointer-coarse:after:w-[calc(100%+6px)]");
  });
});
