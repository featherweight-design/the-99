import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProxyTag } from "./proxy-tag";
import { readFileSync } from "node:fs";
import { proxyCopy } from "../../lib/copy/proxies";

describe("the proxy mark", () => {
  it("draws the glyph and speaks the word", () => {
    // Three carriers, never one: the glyph is drawn, the title is for a pointer,
    // and the accessible name says it in full. A one-character mark is only safe
    // for a fact the app must not be vague about if the word is reachable.
    const { container } = render(<ProxyTag />);
    expect(container.textContent).toContain(proxyCopy.tag.glyph);
    expect(screen.getByText(proxyCopy.tag.aria)).toBeTruthy();
    expect(container.querySelector("[title]")?.getAttribute("title"))
      .toBe(proxyCopy.tag.title);
  });

  it("hides the glyph from a screen reader", () => {
    const { container } = render(<ProxyTag />);
    // Otherwise it reads out "P" beside the word it stands for.
    const glyph = Array.from(container.querySelectorAll("[aria-hidden='true']"));
    expect(glyph.some((el) => el.textContent === proxyCopy.tag.glyph)).toBe(true);
  });

  it("names its owner on a pair, and only on a pair", () => {
    const { container } = render(<ProxyTag pairName="Tymna" />);
    // Two commanders, one caption row: a bare glyph could belong to either.
    expect(container.textContent).toContain(proxyCopy.tag.pair("Tymna"));
    expect(screen.getByText(proxyCopy.tag.pairAria("Tymna"))).toBeTruthy();
  });

  it("never prints a quantity", () => {
    // Ruling 5: a proxy covers the deck's whole ask and has no quantity, so
    // `P×2` is not a state this component can reach.
    const { container } = render(<ProxyTag pairName="Tymna" />);
    expect(container.textContent).not.toMatch(/×\d/);
  });

  it("spends no colour, and takes the scrim only on the band", () => {
    const { container: row } = render(<ProxyTag variant="row" />);
    const { container: band } = render(<ProxyTag variant="band" />);
    const rowStyle = row.querySelector("span")?.getAttribute("style") ?? "";
    const bandStyle = band.querySelector("span")?.getAttribute("style") ?? "";
    // Every hue in the contract is booked, and the one thing this must never
    // say is OWNED — which rules out the two a reader would reach for.
    for (const style of [rowStyle, bandStyle]) {
      expect(style).not.toContain("--accent");
      expect(style).not.toContain("--success");
      expect(style).not.toContain("--warning");
      expect(style).toContain("dashed");
      // An inset shadow, never a border: a border is layout, and this tag shares
      // its slot with the collapsed buy tag, which has none. A 2px difference
      // would nudge the row every time the state flipped.
      expect(style).not.toMatch(/(^|;)\s*border:/);
      // Outside the box model, so the shared slot does not reflow when the two
      // marks swap. `outline` keeps the dashed stroke; a box-shadow could not.
      expect(style).toContain("outline");
    }
    // The scrim is the band's alone: on a flat surface the dashed edge already
    // clears its 3:1 floor, and over art nothing is guaranteed.
    expect(bandStyle).toContain("color-mix");
    expect(rowStyle).not.toContain("color-mix");
  });
});

describe("the surfaces that draw the mark", () => {
  const src = (file: string) => readFileSync(`src/components/decks/${file}`, "utf8");

  it("is drawn by the card tile as well as the row", () => {
    // The Card view read `card.owned` alone and drew a buy tag on a printed
    // card — one deck, one card, one glance apart from the List view saying the
    // opposite. Both now ask `deckRowTag`.
    for (const file of ["deck-card-tile.tsx", "decklist-row.tsx"]) {
      expect(src(file)).toContain("deckRowTag(");
      expect(src(file)).toContain("ProxyTag");
    }
  });

  it("is drawn by the commander caption at BOTH widths", () => {
    // A feature that appears at one width only is the defect the acceptance
    // walk exists to catch, and this one lost the phone entirely in review.
    for (const file of ["spine-desktop.tsx", "spine-mobile.tsx"]) {
      expect(src(file)).toContain("ProxyTag");
      // …and the count under the bar, which the phone also lacked.
      expect(src(file)).toContain("proxyCopy.deckHeader.line");
    }
  });
});
