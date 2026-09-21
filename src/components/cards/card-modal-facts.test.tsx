import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { cardMarkCopy } from "../../lib/copy/card-mark";
import type { BrowseCard } from "../../lib/collection/browse";
import { BracketFactsDetail } from "./card-modal";

const card = (facts?: BrowseCard["facts"]): BrowseCard =>
  ({
    oracleId: "o-1", name: "Armageddon", typeLine: "Sorcery", manaCost: "{3}{W}", cmc: 4,
    oracleText: null, keywords: [], rarity: "rare", colorIdentity: ["W"], imageUri: null,
    printedName: null, quantity: 1, printings: [], setCodes: [], primarySetCode: "4ED",
    preferredPrinting: null, facts,
  }) as unknown as BrowseCard;

describe("the modal's bracket-facts block", () => {
  it("renders nothing at all for a card carrying no fact", () => {
    // Absence is the design, and it is silence rather than a clearance: detection on two
    // of the three is measured and partial, so a drawn "nothing to report" would read as
    // a cleared check the data cannot support.
    const { container } = render(<BracketFactsDetail card={card()} />);
    expect(container.innerHTML).toBe("");
  });

  it("spells every fact out, in the fixed order", () => {
    render(<BracketFactsDetail card={card(["gameChanger", "massLandDenial", "extraTurns"])} />);
    expect(screen.getByText(cardMarkCopy.modalHeading)).toBeTruthy();
    const items = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(items).toEqual([
      cardMarkCopy.gameChanger,
      cardMarkCopy.massLandDenial,
      cardMarkCopy.extraTurns,
    ]);
  });

  it("draws the joined facts, not only the one that rides the card row", () => {
    // The finding this closes: the modal's loader never attached the joined pair, so mass
    // land denial and extra turns could not appear here however the card was flagged.
    render(<BracketFactsDetail card={card(["massLandDenial"])} />);
    expect(screen.getByText(cardMarkCopy.massLandDenial)).toBeTruthy();
    expect(screen.queryByText(cardMarkCopy.gameChanger)).toBeNull();
  });

  it("says nothing about provenance, a bracket, or a threshold", () => {
    // Round 2 owns the detection sentences and their slot; writing one here would hand
    // that round a slot it did not design.
    const { container } = render(
      <BracketFactsDetail card={card(["gameChanger", "extraTurns"])} />,
    );
    const text = (container.textContent ?? "").toLowerCase();
    for (const banned of ["source", "flagged", "bracket 1", "allowed", "of 24", "limit"]) {
      expect(text).not.toContain(banned);
    }
  });
});
