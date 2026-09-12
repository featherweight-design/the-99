import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { SetIcon } from "./set-icon";

const glyph = (c: HTMLElement) => c.querySelector("span > span") as HTMLElement | null;

describe("SetIcon", () => {
  it("is hidden from assistive technology — the set code beside it is the identifier", () => {
    const { container } = render(<SetIcon uri="https://svgs.scryfall.io/sets/eoe.svg" size={26} />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden");
  });

  it("recolours by mask rather than relying on the glyph inheriting currentColor", () => {
    // Scryfall's SVGs are a bare <path> with no fill, so they render black on every theme.
    const { container } = render(<SetIcon uri="https://svgs.scryfall.io/sets/eoe.svg" size={26} />);
    const inner = glyph(container);
    expect(inner?.style.getPropertyValue("mask-image")).toContain("eoe.svg");
    expect(inner?.style.background).toBe("var(--fg-muted)");
  });

  it("takes the success colour and a ring at 100 percent", () => {
    const { container } = render(
      <SetIcon uri="https://svgs.scryfall.io/sets/dsk.svg" size={46} tone="success" ringed />,
    );
    expect(glyph(container)?.style.background).toBe("var(--success)");
    expect((container.firstElementChild as HTMLElement).style.border)
      .toContain("var(--success)");
  });

  it("drops the plate for the ring rather than drawing both", () => {
    const { container } = render(<SetIcon uri="u" size={46} tone="success" ringed />);
    expect((container.firstElementChild as HTMLElement).style.background).toBe("transparent");
  });

  it("renders the plate and no glyph when the catalog has no icon for the set", () => {
    const { container } = render(<SetIcon uri={null} size={26} />);
    expect(glyph(container)).toBeNull();
    expect((container.firstElementChild as HTMLElement).style.background).toBe("var(--elevated)");
  });
});
