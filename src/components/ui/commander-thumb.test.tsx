import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CommanderThumb } from "./commander-thumb";

const thumb = (el: React.ReactElement) =>
  render(el).container.firstElementChild as HTMLElement;

describe("CommanderThumb", () => {
  // Two sizes and nothing between them. What decides is what the thumb is for —
  // identifying a row you are choosing among, or standing for a choice already
  // made — never which screen it landed on, which is how one render shipped
  // 34×48 on a phone and 40×56 on a desktop for the same job.
  it("draws one of two boxes, both at the card's own 63/88", () => {
    const row = thumb(<CommanderThumb imageUri="/a.jpg" colorIdentity={["G"]} />);
    expect([row.style.width, row.style.height]).toEqual(["44px", "62px"]);
    const summary = thumb(<CommanderThumb imageUri="/a.jpg" colorIdentity={["G"]} size="summary" />);
    expect([summary.style.width, summary.style.height]).toEqual(["64px", "89px"]);
    for (const el of [row, summary]) expect(el.className).toContain("rounded-[6px]");
  });

  // One alpha replacing three. `.4` is `IdentityPips`' own and already reused by
  // the bar's track, so this converges on a number the app draws rather than on
  // a fourth one.
  it("rings every thumb at one alpha", () => {
    for (const el of [
      thumb(<CommanderThumb imageUri="/a.jpg" colorIdentity={["G"]} />),
      thumb(<CommanderThumb imageUri={null} colorIdentity={["G"]} />),
      thumb(<CommanderThumb imageUri={null} colorIdentity={[]} />),
    ]) {
      expect(el.style.boxShadow).toBe("inset 0 0 0 1px rgba(0,0,0,0.4)");
    }
  });

  // The face sits at the top of a card frame. A centred crop of 63/88 at 44px
  // wide is mostly type box.
  it("crops to the top of the card and grounds the art while it loads", () => {
    const el = thumb(<CommanderThumb imageUri="/a.jpg" colorIdentity={["G"]} />);
    expect(el.style.background).toContain("center top");
    expect(el.style.background).toContain("var(--elevated)");
  });

  // B6, extended to thumbs: an identity is a real signal and draws its gradient,
  // an absent one draws the stripes every other artless card in the app draws,
  // and neither case invents a colour.
  it("falls back to the identity, then to the stripes, and never past them", () => {
    const identity = thumb(<CommanderThumb imageUri={null} colorIdentity={["U", "R"]} />);
    expect(identity.style.background).toContain("linear-gradient(130deg");
    expect(identity.style.background).not.toContain("var(--elevated)");

    const neither = thumb(<CommanderThumb imageUri={null} colorIdentity={[]} />);
    expect(neither.style.background).toContain("repeating-linear-gradient");
  });

  // The marker a probe selects on, because shape is not enough: the decks zero
  // state draws a decorative card fan at nearly this aspect, and a probe matching
  // on aspect alone failed those against a treatment they have nothing to do with.
  it("marks itself, and names which of the two boxes it is", () => {
    expect(thumb(<CommanderThumb imageUri="/a.jpg" colorIdentity={["G"]} />)).toHaveAttribute(
      "data-commander-thumb",
      "row",
    );
    expect(
      thumb(<CommanderThumb imageUri="/a.jpg" colorIdentity={["G"]} size="summary" />),
    ).toHaveAttribute("data-commander-thumb", "summary");
  });

  // Decorative at every call site: the row names its commander in text beside
  // the thumb, and a second name would read it twice.
  it("stays out of the accessibility tree", () => {
    expect(thumb(<CommanderThumb imageUri="/a.jpg" colorIdentity={["G"]} />)).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
});
