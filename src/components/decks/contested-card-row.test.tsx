import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ContestedCardRow } from "./contested-card-row";
import { cardAssignmentsCopy as copy } from "../../lib/copy/card-assignments";
import type { ContestedCard } from "../../lib/collection/summary-read";

const AUG = Date.UTC(2026, 7, 2);
const SEP = Date.UTC(2026, 8, 9);

function card(over: Partial<ContestedCard> = {}): ContestedCard {
  return {
    oracleId: "o1",
    cardName: "Brushland",
    arrived: 1,
    // A copy predated this import, so `keeps it` is available to a commander's option — the
    // word says the deck had the card before the import, and the first-arrival case must not
    // borrow it.
    ownedBefore: 1,
    owned: 1,
    brewNames: [],
    claimants: [
      {
        deckId: "d1", deckName: "HD Avatar Aang", quantity: 1, commanderCopies: 0,
        since: AUG, versionNumber: 7, allocated: 1,
      },
      {
        deckId: "d2", deckName: "Elemental Dragons", quantity: 1, commanderCopies: 0,
        since: SEP, versionNumber: 2, allocated: 0,
      },
    ],
    ...over,
  };
}

describe("ContestedCardRow", () => {
  it("states the supply before the demand, because the shortage is why the row exists", () => {
    render(<ContestedCardRow card={card()} />);
    expect(screen.getByText(copy.contested.supply(1, 2))).toBeTruthy();
  });

  it("names the verb in the heading and never as a button", () => {
    render(<ContestedCardRow card={card()} />);
    expect(screen.getByText(copy.contested.heading(1))).toBeTruthy();
    // The distinction from `Pull it` is the whole point: giving has no verb-button.
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("draws the queue in commit order, which is the explanation of the default", () => {
    render(<ContestedCardRow card={card()} />);
    const names = screen.getAllByText(/Aang|Dragons/).map((n) => n.textContent);
    expect(names[0]).toContain("HD Avatar Aang");
    expect(names[1]).toContain("Elemental Dragons");
  });

  it("gives each deck one outcome word and no quantity", () => {
    render(<ContestedCardRow card={card()} />);
    expect(screen.getByText(copy.contested.gets)).toBeTruthy();
    expect(screen.getByText(copy.contested.buys)).toBeTruthy();
    expect(screen.queryByText(/1 of 1/)).toBeNull();
  });

  it("stamps each option with the version the order derives from", () => {
    render(<ContestedCardRow card={card()} />);
    expect(screen.getByText(copy.contested.stamp(7, "2 Aug"))).toBeTruthy();
    expect(screen.getByText(copy.contested.stamp(2, "9 Sep"))).toBeTruthy();
  });

  it("tags this deck without promoting it", () => {
    render(<ContestedCardRow card={card()} thisDeckId="d2" />);
    expect(screen.getByText(copy.contested.thisDeck)).toBeTruthy();
    // Still second: the order is the explanation, and promoting your own deck hides why it lost.
    const names = screen.getAllByText(/Aang|Dragons/).map((n) => n.textContent);
    expect(names[0]).toContain("HD Avatar Aang");
  });

  // A commander's copy cannot be given away, so a card whose only copy is one has nothing to
  // choose — and the row says that rather than drawing a queue nobody can change.
  it("goes inert when every copy is a commander's", () => {
    render(<ContestedCardRow card={card({
      claimants: [
        {
          deckId: "d1", deckName: "Led By It", quantity: 1, commanderCopies: 1,
          since: AUG, versionNumber: 1, allocated: 1,
        },
        {
          deckId: "d2", deckName: "Lists It", quantity: 1, commanderCopies: 0,
          since: SEP, versionNumber: 1, allocated: 0,
        },
      ],
    })} />);
    expect(screen.getByText(copy.contested.headingInert)).toBeTruthy();
    // The note names the deck the shortage FALLS ON, not the commander holder: the holder is
    // keeping its copy, so naming it says the opposite of what the sentence means.
    expect(screen.getByText(copy.contested.commanderNote("Lists It"))).toBeTruthy();
    // `keeps it`, not `gets it`: it had the card before the import, so nothing changed for it.
    expect(screen.getByText(copy.contested.keeps)).toBeTruthy();
    expect(screen.queryByText(copy.contested.gets)).toBeNull();
  });

  // The folded claim: one deck holds the card as its commander AND on its list, so exactly one
  // of its two copies is in play. The row stays live and the heading narrows.
  it("narrows the heading when only a spare copy is choosable", () => {
    render(<ContestedCardRow card={card({
      owned: 2,
      arrived: 1,
      claimants: [
        {
          deckId: "d1", deckName: "Folded", quantity: 2, commanderCopies: 1,
          since: AUG, versionNumber: 3, allocated: 2,
        },
        {
          deckId: "d2", deckName: "Lists It", quantity: 1, commanderCopies: 0,
          since: SEP, versionNumber: 1, allocated: 0,
        },
      ],
    })} />);
    expect(screen.getByText(copy.contested.headingSpare)).toBeTruthy();
    expect(screen.getByText(copy.contested.commanderNoteFolded("Folded"))).toBeTruthy();
  });

  // The reader's view has to agree with the model underneath it: a commander claim is never
  // RESERVABLE, but it holds its place in the queue like any other. Allocating commander copies
  // off the top made the page say the later deck keeps it while the deck that committed first
  // buys it — the opposite of both the model and the section note.
  it("allocates in commit order, and does not promote a later commander", () => {
    render(<ContestedCardRow card={card({
      owned: 1,
      claimants: [
        {
          deckId: "d1", deckName: "First, by list", quantity: 1, commanderCopies: 0,
          since: AUG, versionNumber: 1, allocated: 1,
        },
        {
          deckId: "d2", deckName: "Later, by commander", quantity: 1, commanderCopies: 1,
          since: SEP, versionNumber: 1, allocated: 0,
        },
      ],
    })} />);
    // The earlier list claimant gets it; the later commander deck is the one that buys.
    expect(screen.getByText(copy.contested.gets)).toBeTruthy();
    expect(screen.getByText(copy.contested.buys)).toBeTruthy();
    expect(screen.queryByText(copy.contested.keeps)).toBeNull();
  });

  it("states the cap beside the heading when more than one copy arrived", () => {
    render(<ContestedCardRow card={card({
      owned: 2,
      arrived: 2,
      claimants: [
        { deckId: "d1", deckName: "One", quantity: 1, commanderCopies: 0, since: AUG, versionNumber: 1, allocated: 1 },
        { deckId: "d2", deckName: "Two", quantity: 1, commanderCopies: 0, since: SEP, versionNumber: 1, allocated: 1 },
      ],
    })} />);
    expect(screen.getByText(copy.contested.cap(2, 2))).toBeTruthy();
  });

  it("says nothing about a cap when one copy arrived", () => {
    render(<ContestedCardRow card={card()} />);
    expect(screen.queryByText(/of 1 given/)).toBeNull();
  });

  // A folded claimant that also took the spare says both halves. `keeps it` alone hides the
  // second copy and contradicts the heading, which has just offered a spare.
  it("names both halves when a folded claim also takes the spare", () => {
    render(<ContestedCardRow card={card({
      owned: 2,
      arrived: 1,
      claimants: [
        {
          deckId: "d1", deckName: "Folded", quantity: 2, commanderCopies: 1,
          since: AUG, versionNumber: 3, allocated: 2,
        },
        {
          deckId: "d2", deckName: "Lists It", quantity: 1, commanderCopies: 0,
          since: SEP, versionNumber: 1, allocated: 0,
        },
      ],
    })} />);
    expect(screen.getByText(copy.contested.keepsAndGets(1, 1))).toBeTruthy();
  });

  // A word is never the only carrier, and neither is a hue. The mark states ALLOCATION: filled
  // means this deck holds a copy as things stand, empty means it is buying one.
  it("marks each option by what it gets, filled or empty", () => {
    const { container } = render(<ContestedCardRow card={card()} />);
    const marks = container.querySelectorAll("li > span:first-child > span[aria-hidden]");
    expect(marks).toHaveLength(2);
    // The holder's mark carries an inner dot; the buyer's is an empty ring.
    expect(marks[0].children).toHaveLength(1);
    expect(marks[1].children).toHaveLength(0);
  });

  // The shape is the affordance: a square tick on a one-of-many list promises you can have two,
  // and with two copies arrived a player really can give two decks one each.
  it("goes square when more than one copy arrived", () => {
    const { container } = render(<ContestedCardRow card={card({ arrived: 2, owned: 2 })} />);
    const mark = container.querySelector("li > span:first-child > span[aria-hidden]");
    expect(mark?.getAttribute("style")).toContain("border-radius: 4px");
  });

  it("stays round at one copy", () => {
    const { container } = render(<ContestedCardRow card={card()} />);
    const mark = container.querySelector("li > span:first-child > span[aria-hidden]");
    expect(mark?.getAttribute("style")).toContain("border-radius: 999px");
  });

  // `keeps it` claims the deck had the card before the import. On a first arrival it did not,
  // however protected that copy is from here on.
  it("says a commander GETS a copy that has only just arrived", () => {
    render(<ContestedCardRow card={card({
      ownedBefore: 0,
      claimants: [
        {
          deckId: "d1", deckName: "Led By It", quantity: 1, commanderCopies: 1,
          since: AUG, versionNumber: 1, allocated: 1,
        },
        {
          deckId: "d2", deckName: "Lists It", quantity: 1, commanderCopies: 0,
          since: SEP, versionNumber: 1, allocated: 0,
        },
      ],
    })} />);
    expect(screen.getByText(copy.contested.gets)).toBeTruthy();
    expect(screen.queryByText(copy.contested.keeps)).toBeNull();
  });

  // `ownedBefore` is a fact about the COLLECTION, not about one deck. With an old copy, an
  // earlier list claimant and a later commander claimant, the queue gives the old copy to the
  // list deck and the arriving one to the commander — so the commander kept nothing, however
  // true it is that a copy existed before.
  it("says gets it when the old copy went to an earlier deck", () => {
    render(<ContestedCardRow card={card({
      ownedBefore: 1,
      arrived: 1,
      owned: 2,
      claimants: [
        {
          deckId: "d1", deckName: "Earlier, by list", quantity: 1, commanderCopies: 0,
          since: AUG, versionNumber: 1, allocated: 1,
        },
        {
          deckId: "d2", deckName: "Later, by commander", quantity: 1, commanderCopies: 1,
          since: SEP, versionNumber: 1, allocated: 1,
        },
      ],
    })} />);
    expect(screen.queryByText(copy.contested.keeps)).toBeNull();
    expect(screen.getAllByText(copy.contested.gets)).toHaveLength(2);
  });

  // A commander's copy is not giveable, so it is not one of the copies the cap counts out.
  it("counts only giveable copies in the cap", () => {
    render(<ContestedCardRow card={card({
      arrived: 2,
      owned: 2,
      claimants: [
        {
          deckId: "d1", deckName: "Led By It", quantity: 1, commanderCopies: 1,
          since: AUG, versionNumber: 1, allocated: 1,
        },
        {
          deckId: "d2", deckName: "Lists It", quantity: 2, commanderCopies: 0,
          since: SEP, versionNumber: 1, allocated: 1,
        },
      ],
    })} />);
    expect(screen.getByText(copy.contested.cap(1, 2))).toBeTruthy();
  });

  // STATE 35: a commander holds one copy and another is free. Nothing is inert about the ROW —
  // there is a real choice — so the heading stays the ordinary one while the commander's own
  // option remains unchoosable. Neither the inert case nor the folded case covers this.
  it("keeps the ordinary heading when a commander holds one copy and another is free", () => {
    render(<ContestedCardRow card={card({
      owned: 2,
      arrived: 1,
      ownedBefore: 1,
      claimants: [
        {
          deckId: "d1", deckName: "Led By It", quantity: 1, commanderCopies: 1,
          since: AUG, versionNumber: 1, allocated: 1,
        },
        {
          deckId: "d2", deckName: "Lists It", quantity: 1, commanderCopies: 0,
          since: SEP, versionNumber: 1, allocated: 1,
        },
        {
          deckId: "d3", deckName: "Also lists it", quantity: 1, commanderCopies: 0,
          since: SEP + 1, versionNumber: 1, allocated: 0,
        },
      ],
    })} />);
    expect(screen.getByText(copy.contested.heading(1))).toBeTruthy();
    expect(screen.queryByText(copy.contested.headingInert)).toBeNull();
    expect(screen.queryByText(copy.contested.headingSpare)).toBeNull();
    // The commander's option is still the one nobody can choose, and says so by its border.
    const rows = screen.getAllByRole("listitem");
    expect(rows[0].getAttribute("style")).toContain("dashed");
    expect(rows[1].getAttribute("style")).toContain("solid");
  });

  it("names a brew and excludes it, rather than counting it or offering it", () => {
    render(<ContestedCardRow card={card({ brewNames: ["Muldrotha Lands"] })} />);
    expect(screen.getByText(copy.contested.brewNote("Muldrotha Lands"))).toBeTruthy();
    // The supply line counts committed decks only — a brew cannot be given a copy, so counting
    // it would make the figure quietly wrong.
    expect(screen.getByText(copy.contested.supply(1, 2))).toBeTruthy();
  });

  it("folds several brews into one line", () => {
    render(<ContestedCardRow card={card({ brewNames: ["One", "Two", "Three"] })} />);
    expect(screen.getByText(copy.contested.brewNoteMany(3))).toBeTruthy();
  });

  it("carries the cross-reference only when the card is also owed above", () => {
    const { unmount } = render(<ContestedCardRow card={card()} />);
    expect(screen.queryByText(/answer different questions/)).toBeNull();
    unmount();
    render(<ContestedCardRow card={card()} alsoAbove />);
    expect(screen.getByText(/answer different questions/)).toBeTruthy();
  });
});
