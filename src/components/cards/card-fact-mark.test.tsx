import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CARD_FACTS, cardMarkCopy } from "../../lib/copy/card-mark";
import { CARD_FACT_MARK_PX, CardFactMark } from "./card-fact-mark";

describe("CardFactMark", () => {
  it("draws one glyph per fact, each spoken with the rules' own name", () => {
    for (const fact of CARD_FACTS) {
      const { unmount } = render(<CardFactMark fact={fact} />);
      expect(screen.getByRole("img", { name: cardMarkCopy[fact] })).toBeTruthy();
      unmount();
    }
  });

  it("draws at one size, which no caller can change", () => {
    // The set shipped at 12, 13, 14 and 16 across six mounts while the size was a prop,
    // so the same fact read as a different mark depending on the list. There is no prop
    // to pass now, and this pins the figure the glyphs were drawn for.
    const { container } = render(<CardFactMark fact="gameChanger" />);
    const svg = container.querySelector("svg");
    expect(CARD_FACT_MARK_PX).toBe(16);
    expect(svg?.getAttribute("width")).toBe("16");
    expect(svg?.getAttribute("height")).toBe("16");
  });

  it("goes silent where the surface composes its own accessible name", () => {
    // /collection's row and tile place the fact clause themselves, after the card's
    // own name. A mark that also spoke would say it twice, in the wrong order.
    render(<CardFactMark fact="extraTurns" silent />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.queryByLabelText(cardMarkCopy.extraTurns)).toBeNull();
  });

  it("carries the glow as a filter rather than a shadow, so no row grows", () => {
    const { container } = render(<CardFactMark fact="massLandDenial" />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("style")).toContain("drop-shadow");
    expect(svg?.getAttribute("style")).not.toContain("box-shadow");
  });

  it("reads its ink from the token rather than a literal", () => {
    // --fact is declared in all six themes; a literal here would ship one theme's
    // value into the other five.
    const { container } = render(<CardFactMark fact="gameChanger" />);
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

  it("names all three facts in one case, so no member of the set reads apart", () => {
    // The Game Changer list keeps its own name in the tooltip's sentence, where it is
    // named AS a list; the label a player reads in the key and the modal is lowercase
    // like the other two.
    expect(cardMarkCopy.gameChanger).toBe("game changer");
    expect(cardMarkCopy.massLandDenial).toBe("mass land denial");
    expect(cardMarkCopy.extraTurns).toBe("extra turns");
    expect(cardMarkCopy.tooltip.gameChanger).toContain("Game Changer list");
  });
});
