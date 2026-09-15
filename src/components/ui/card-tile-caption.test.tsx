import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CARD_TILE_CAPTION_H, CardTileCaption, slotOutline } from "./card-tile-caption";

describe("CardTileCaption — the shape both card views share", () => {
  it("draws the meta line above the name line", () => {
    const { container } = render(
      <CardTileCaption meta={<span>META</span>} name="Sol Ring" />,
    );

    // Document order is the drawn order, and the handoff's reason for it is
    // that the marks qualify the picture: they sit against the art, and the
    // name closes the tile.
    const text = container.textContent ?? "";
    expect(text.indexOf("META")).toBeLessThan(text.indexOf("Sol Ring"));
  });

  it("keeps its height when every optional position is empty", () => {
    const { container: bare } = render(<CardTileCaption name="Sol Ring" />);
    const { container: full } = render(
      <CardTileCaption
        meta={<span>META</span>}
        metaTrail={<span>DSK · rare</span>}
        name="Sol Ring"
        nameTrail={<span>{"//"}</span>}
        trailing={<button type="button">×</button>}
      />,
    );

    // The one invariant the design cannot survive losing: a grid whose captions
    // are sometimes one line and sometimes two is either ragged or padded to the
    // worst case on every tile. jsdom lays nothing out, so this asserts the
    // FLOOR both captions carry rather than a measured height.
    for (const c of [bare, full]) {
      expect(c.firstElementChild?.className).toContain(CARD_TILE_CAPTION_H);
    }
  });

  it("hides the drawn name and speaks the whole one when asked", () => {
    render(
      <CardTileCaption
        name="Ratchet"
        nameHidden
        nameSpoken={<span>Ratchet, Field Medic // Ratchet, Rescue Racer</span>}
      />,
    );

    // `/collection`'s tile is one button whose accessible name is its text
    // content: the clipped caption must not be what a screen reader hears.
    expect(screen.getByText("Ratchet")).toHaveAttribute("aria-hidden", "true");
    expect(
      screen.getByText("Ratchet, Field Medic // Ratchet, Rescue Racer"),
    ).not.toHaveAttribute("aria-hidden");
  });

  it("draws the draft edge on the caption and nothing when the draft is clean", () => {
    const { container: touched } = render(
      <CardTileCaption name="Sol Ring" draftTouched />,
    );
    const { container: clean } = render(<CardTileCaption name="Sol Ring" />);

    // On the CAPTION, never the shell: the shell's border already carries
    // over-committed, and the two facts are true at once often enough to matter.
    expect(touched.firstElementChild).toHaveStyle({
      boxShadow: "inset 2px 0 0 0 var(--accent)",
    });
    expect((clean.firstElementChild as HTMLElement).style.boxShadow).toBe("");
  });

  it("gives the trailing column the caption's full height", () => {
    render(<CardTileCaption name="Sol Ring" trailing={<button type="button">×</button>} />);

    // `self-stretch` rather than a fixed square: the removal control is paid for
    // once at full height, which is what a vertically-scrolling grid can spend.
    expect(screen.getByRole("button").parentElement?.className).toContain("items-stretch");
  });
});

describe("slotOutline — the edge that is not layout", () => {
  it("draws inside the box", () => {
    // A border would add 2px to a box shared with two tags that pay none, and
    // "one box, three inks" would be a claim the eye refutes.
    expect(slotOutline("var(--accent)")).toEqual({
      outline: "1px solid var(--accent)",
      outlineOffset: "-1px",
    });
    expect(slotOutline("var(--fg-locked)", true).outline).toContain("dashed");
  });
});
