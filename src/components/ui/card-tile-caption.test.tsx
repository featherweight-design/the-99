import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BuyTag } from "../decks/buy-tag";
import { ProxyTag } from "../decks/proxy-tag";
import { AvailabilityMarker } from "./availability-marker";
import {
  CARD_TILE_CAPTION_H,
  CARD_TILE_CAPTION_SUB_H,
  CARD_TILE_SLOT_BOX,
  CardTileCaption,
  slotOutline,
} from "./card-tile-caption";

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

  it("draws the sub-line under the name, and nothing where no caller gives one", () => {
    const { container } = render(
      <CardTileCaption meta={<span>MARKS</span>} name="Mystical Tutor" nameSub={<span>TLE · uncommon</span>} />,
    );
    // Under the name rather than on the meta line: the marks there pushed it off the tile.
    const text = container.textContent ?? "";
    expect(text.indexOf("Mystical Tutor")).toBeLessThan(text.indexOf("TLE · uncommon"));
    const meta = screen.getByText("MARKS").parentElement as HTMLElement;
    expect(meta.textContent).not.toContain("TLE");

    const { container: bare } = render(<CardTileCaption name="Sol Ring" />);
    expect(bare.querySelector('[data-testid="tile-sub"]')).toBeNull();
    // A third line takes the taller floor, whose sum it is; the two-line caption keeps its own.
    expect(container.firstElementChild?.className).toContain(CARD_TILE_CAPTION_SUB_H);
    expect(bare.firstElementChild?.className).toContain(CARD_TILE_CAPTION_H);
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

describe("the one box — all three occupants, forced", () => {
  // The probe cannot make this comparison on live data: a fixture whose cards
  // are all owned and none printed draws nothing but chips, and it passed a
  // mutation that gave the chip its border back. Here all three are rendered
  // side by side, which is the only place the invariant is actually tested.
  const OCCUPANTS = () => [
    render(
      <AvailabilityMarker
        availability={{ owned: 2, hard: 2, soft: 0, free: 0, claims: [] } as never}
        density="chip"
        plate={false}
      />,
    ).container.firstElementChild as HTMLElement,
    render(<BuyTag variant="tile" plate={false} density="collapsed" label="Not owned" />)
      .container.firstElementChild as HTMLElement,
    render(<ProxyTag variant="band" plate={false} />).container
      .firstElementChild as HTMLElement,
  ];

  it("gives all three the same box class", () => {
    const classes = OCCUPANTS().map((el) =>
      CARD_TILE_SLOT_BOX.split(" ").every((c) => el.className.includes(c)),
    );
    expect(classes).toEqual([true, true, true]);
  });

  it("lets none of them pay for a border", () => {
    // A border is 1px of layout on every side; an outline and an inset shadow
    // are not. One occupant with a border is 2px taller than the two beside it,
    // and "one box" becomes a claim the eye refutes — which jsdom cannot see,
    // so this asserts the CAUSE rather than the height.
    for (const el of OCCUPANTS()) {
      expect(el.className.split(/\s+/)).not.toContain("border");
      expect(el.style.border).toBe("");
    }
  });
});

// `cqw` resolves against the nearest container, so a tile that drops TILE_FIELD rounds by the
// viewport instead and no browser check on another surface notices. Each surface that draws the
// scaled radius must also draw the field it measures.
describe("the scaled tile radius", () => {
  it.each(["deck-card-tile", "deck-card-undo-tile", "read-only-card-tile", "token-tile"])(
    "%s draws TILE_FIELD on its tile root beside the scaled classes",
    (name) => {
      const src = readFileSync(join(process.cwd(), "src/components/decks", `${name}.tsx`), "utf8");
      expect(src).toMatch(/<li className=\{`[^`]*\$\{TILE_FIELD\}/);
      expect(src).toContain("TILE_SHELL_SCALED");
    },
  );
});
