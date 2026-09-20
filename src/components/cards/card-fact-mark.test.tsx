import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CARD_FACTS, cardMarkCopy } from "../../lib/copy/card-mark";
import { CARD_FACT_MARK_FLOOR_PX, CardFactMark } from "./card-fact-mark";

describe("CardFactMark", () => {
  it("draws one glyph per fact, each spoken with the rules' own name", () => {
    for (const fact of CARD_FACTS) {
      const { unmount } = render(<CardFactMark fact={fact} size={16} />);
      expect(screen.getByRole("img", { name: cardMarkCopy[fact] })).toBeTruthy();
      unmount();
    }
  });

  it("draws nothing below the floor, and substitutes nothing for it", () => {
    // The rule the retired deck-status marks bought: a glyph past its floor does not
    // survive shrinking, so the mark is withheld rather than degraded to a dot.
    const { container } = render(
      <CardFactMark fact="gameChanger" size={CARD_FACT_MARK_FLOOR_PX - 1} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("draws at the floor itself", () => {
    const { container } = render(
      <CardFactMark fact="gameChanger" size={CARD_FACT_MARK_FLOOR_PX} />,
    );
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("goes silent where the surface composes its own accessible name", () => {
    // /collection's row and tile place the fact clause themselves, after the card's
    // own name. A mark that also spoke would say it twice, in the wrong order.
    render(<CardFactMark fact="extraTurns" size={14} silent />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.queryByLabelText(cardMarkCopy.extraTurns)).toBeNull();
  });

  it("carries the glow as a filter rather than a shadow, so no row grows", () => {
    const { container } = render(<CardFactMark fact="massLandDenial" size={14} />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("style")).toContain("drop-shadow");
    expect(svg?.getAttribute("style")).not.toContain("box-shadow");
  });

  it("reads its ink from the token rather than a literal", () => {
    // --fact is declared in all six themes; a literal here would ship one theme's
    // value into the other five.
    const { container } = render(<CardFactMark fact="gameChanger" size={16} />);
    expect(container.querySelector("svg")?.getAttribute("style")).toContain("var(--fact)");
  });
});

describe("card-mark copy", () => {
  it("makes no positive or completeness claim anywhere", () => {
    // Detection on two of the three facts is partial, so any "clean"/"none" string
    // would be a claim the data cannot support.
    const strings = JSON.stringify(cardMarkCopy).toLowerCase();
    for (const banned of ["no mass land denial", "clean", "none of", "free of", "0 of"]) {
      expect(strings).not.toContain(banned);
    }
  });

  it("states each fact's name exactly once, in the rules' own casing", () => {
    expect(cardMarkCopy.gameChanger).toBe("Game Changer");
    expect(cardMarkCopy.massLandDenial).toBe("mass land denial");
    expect(cardMarkCopy.extraTurns).toBe("extra turns");
  });
});
