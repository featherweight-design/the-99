import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

// The server action, stubbed: what these cases are about is what the ROW does with each answer.
const assign = vi.hoisted(() => vi.fn());
vi.mock("../../app/decks/assignment-actions", () => ({ assignCopy: assign }));
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
    fromImport: true,
    owned: 1,
    claimants: [
      {
        deckId: "d1", deckName: "HD Avatar Aang", quantity: 1, commanderCopies: 0, granted: 0,
        since: AUG, versionNumber: 7, allocated: 1,
      },
      {
        deckId: "d2", deckName: "Elemental Dragons", quantity: 1, commanderCopies: 0, granted: 0,
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

  // `1 new copy` is a fact about an arrival. On a surface with no import behind it — the deck's
  // own review page — the same line states the supply, or it tells the reader their collection
  // turned up this morning.
  it("does not call the player's own copies new when no import is behind the row", () => {
    render(<ContestedCardRow card={card({ fromImport: false })} />);
    expect(screen.getByText(copy.contested.supplyOwned(1, 2))).toBeTruthy();
    expect(screen.getByText(copy.contested.headingOwned(1))).toBeTruthy();
    expect(screen.queryByText(copy.contested.supply(1, 2))).toBeNull();
    expect(screen.queryByText(copy.contested.heading(1))).toBeNull();
  });

  // `arrived` carries the TOTAL owned on the review door, and a commander's copy cannot be
  // given to anybody. Counting it offered `Give the 2 copies to` over a single movable copy.
  it("counts only the copies that can actually move on the review door", () => {
    render(<ContestedCardRow card={card({
      fromImport: false,
      arrived: 2,
      owned: 2,
      claimants: [
        { deckId: "d1", deckName: "HD Avatar Aang", quantity: 1, commanderCopies: 1, granted: 0, since: AUG, versionNumber: 7, allocated: 1 },
        { deckId: "d2", deckName: "Elemental Dragons", quantity: 1, commanderCopies: 0, granted: 0, since: SEP, versionNumber: 2, allocated: 1 },
      ],
    })} />);
    expect(screen.getByText(copy.contested.supplyOwned(1, 2))).toBeTruthy();
    expect(screen.getByText(copy.contested.headingOwned(1))).toBeTruthy();
    expect(screen.queryByText(copy.contested.headingOwned(2))).toBeNull();
    expect(screen.queryByText(copy.contested.supplyOwned(2, 2))).toBeNull();
    // And the accessible name takes the same figure, being the same claim about supply.
    expect(screen.getByRole("radiogroup", {
      name: copy.contested.a11yGroupOwned("Brushland", 1),
    })).toBeTruthy();
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
          deckId: "d1", deckName: "Led By It", quantity: 1, commanderCopies: 1, granted: 0,
          since: AUG, versionNumber: 1, allocated: 1,
        },
        {
          deckId: "d2", deckName: "Lists It", quantity: 1, commanderCopies: 0, granted: 0,
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
          deckId: "d1", deckName: "Folded", quantity: 2, commanderCopies: 1, granted: 0,
          since: AUG, versionNumber: 3, allocated: 2,
        },
        {
          deckId: "d2", deckName: "Lists It", quantity: 1, commanderCopies: 0, granted: 0,
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
          deckId: "d1", deckName: "First, by list", quantity: 1, commanderCopies: 0, granted: 0,
          since: AUG, versionNumber: 1, allocated: 1,
        },
        {
          deckId: "d2", deckName: "Later, by commander", quantity: 1, commanderCopies: 1, granted: 0,
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
        { deckId: "d1", deckName: "One", quantity: 1, commanderCopies: 0, granted: 0, since: AUG, versionNumber: 1, allocated: 1 },
        { deckId: "d2", deckName: "Two", quantity: 1, commanderCopies: 0, granted: 0, since: SEP, versionNumber: 1, allocated: 1 },
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
          deckId: "d1", deckName: "Folded", quantity: 2, commanderCopies: 1, granted: 0,
          since: AUG, versionNumber: 3, allocated: 2,
        },
        {
          deckId: "d2", deckName: "Lists It", quantity: 1, commanderCopies: 0, granted: 0,
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

  // The shape answers "can two decks each have one", so it follows the copies actually in play.
  // Two arrivals with one consumed by a commander leave one giveable copy, and a square mark
  // there promises something the allocation cannot deliver.
  it("stays round when a commander consumes one of two arrivals", () => {
    const { container } = render(<ContestedCardRow card={card({
      arrived: 2,
      owned: 2,
      ownedBefore: 0,
    fromImport: true,
      claimants: [
        {
          deckId: "d1", deckName: "Led By It", quantity: 1, commanderCopies: 1, granted: 0,
          since: AUG, versionNumber: 1, allocated: 1,
        },
        {
          deckId: "d2", deckName: "Lists It", quantity: 2, commanderCopies: 0, granted: 0,
          since: SEP, versionNumber: 1, allocated: 1,
        },
      ],
    })} />);
    const mark = container.querySelector("li > span:first-child > span[aria-hidden]");
    expect(mark?.getAttribute("style")).toContain("border-radius: 999px");
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
    fromImport: true,
      claimants: [
        {
          deckId: "d1", deckName: "Led By It", quantity: 1, commanderCopies: 1, granted: 0,
          since: AUG, versionNumber: 1, allocated: 1,
        },
        {
          deckId: "d2", deckName: "Lists It", quantity: 1, commanderCopies: 0, granted: 0,
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
    fromImport: true,
      arrived: 1,
      owned: 2,
      claimants: [
        {
          deckId: "d1", deckName: "Earlier, by list", quantity: 1, commanderCopies: 0, granted: 0,
          since: AUG, versionNumber: 1, allocated: 1,
        },
        {
          deckId: "d2", deckName: "Later, by commander", quantity: 1, commanderCopies: 1, granted: 0,
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
          deckId: "d1", deckName: "Led By It", quantity: 1, commanderCopies: 1, granted: 0,
          since: AUG, versionNumber: 1, allocated: 1,
        },
        {
          deckId: "d2", deckName: "Lists It", quantity: 2, commanderCopies: 0, granted: 0,
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
    fromImport: true,
      claimants: [
        {
          deckId: "d1", deckName: "Led By It", quantity: 1, commanderCopies: 1, granted: 0,
          since: AUG, versionNumber: 1, allocated: 1,
        },
        {
          deckId: "d2", deckName: "Lists It", quantity: 1, commanderCopies: 0, granted: 0,
          since: SEP, versionNumber: 1, allocated: 1,
        },
        {
          deckId: "d3", deckName: "Also lists it", quantity: 1, commanderCopies: 0, granted: 0,
          since: SEP + 1, versionNumber: 1, allocated: 0,
        },
      ],
    })} />);
    expect(screen.getByText(copy.contested.heading(1))).toBeTruthy();
    expect(screen.queryByText(copy.contested.headingInert)).toBeNull();
    expect(screen.queryByText(copy.contested.headingSpare)).toBeNull();
    // The commander's option is still the one nobody can choose, and says so by its border.
    // The options are radios now, not bare list items: the row became the chooser.
    const rows = screen.getAllByRole("radio");
    expect(rows[0].getAttribute("style")).toContain("dashed");
    expect(rows[1].getAttribute("style")).toContain("solid");
  });

  it("a brew led by the card sets no ceiling: the list decks stay choosable", () => {
    // One owned copy, two committed list decks, and a brew whose commander is the card. Only a
    // committed commander holds its copy; the brew's claims it softly.
    const base = card();
    render(<ContestedCardRow card={card({
      claimants: [
        ...base.claimants,
        {
          deckId: "d3", deckName: "Brew Led By It", quantity: 1, commanderCopies: 1, granted: 0,
          since: null, versionNumber: null, allocated: 0, brew: true,
        },
      ],
    })} />);
    const radios = screen.getAllByRole("radio");
    expect(radios[0].getAttribute("aria-disabled")).toBeNull();
    expect(radios[1].getAttribute("aria-disabled")).toBeNull();
    // The brew's own option is all commander, so it is the one nobody can choose.
    expect(radios[2].getAttribute("aria-disabled")).toBe("true");
  });

  it("offers a brew as an option, last, with no version stamp (2026-10-11)", () => {
    const base = card();
    render(<ContestedCardRow card={card({
      claimants: [
        ...base.claimants,
        {
          deckId: "d3", deckName: "Muldrotha Lands", quantity: 1, commanderCopies: 0, granted: 0,
          since: null, versionNumber: null, allocated: 0, brew: true,
        },
      ],
    })} />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
    expect(radios[2].textContent).toContain("Muldrotha Lands");
    // No `v7 · 2 Aug` stamp: a brew has no version to stamp.
    expect(radios[2].textContent).not.toMatch(/\bv\d+\b/);
    // The supply line counts every deck that can be given a copy, the brew included.
    expect(screen.getByText(copy.contested.supply(1, 3))).toBeTruthy();
  });

});

describe("ContestedCardRow — the chooser", () => {
  beforeEach(() => assign.mockReset());

  // Authorship survives the revalidation that every pick triggers, because it is read off the
  // row rather than held in this component's own state. Held in state, the accent and the undo
  // footer vanished the moment the server answered.
  it("reads a granted reservation as the player's own choice", () => {
    render(<ContestedCardRow card={card({
      claimants: [
        { deckId: "d1", deckName: "HD Avatar Aang", quantity: 1, commanderCopies: 0, granted: 0, since: AUG, versionNumber: 7, allocated: 0 },
        { deckId: "d2", deckName: "Elemental Dragons", quantity: 1, commanderCopies: 0, granted: 1, since: SEP, versionNumber: 2, allocated: 1 },
      ],
    })} />);
    expect(screen.getByRole("radio", { checked: true }).getAttribute("aria-label"))
      .toContain("Elemental Dragons");
  });

  it("is a radiogroup whose options are the decks", () => {
    render(<ContestedCardRow card={card()} />);
    expect(screen.getByRole("radiogroup")).toBeTruthy();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    // Nothing is checked before a pick: a filled mark means the deck HOLDS a copy by default,
    // and `aria-checked` means the player chose it. They are different facts.
    expect(screen.queryByRole("radio", { checked: true })).toBeNull();
  });

  it("moves the words and the mark on the tap, without waiting for the server", async () => {
    // Held open deliberately: if the row waited for the server, nothing below would be true yet.
    // Settled at the end so the transition does not outlive the test and hang the next hook.
    let settle: (v: unknown) => void = () => {};
    assign.mockReturnValue(new Promise((r) => { settle = r; }));
    render(<ContestedCardRow card={card()} />);
    fireEvent.click(screen.getByRole("radio", { name: /Elemental Dragons/ }));
    expect(screen.getByRole("radio", { checked: true })).toBeTruthy();
    expect(assign).toHaveBeenCalledWith("o1", "d2");
    // Settled with the DEFAULT allocation, where no deck holds a granted reservation — so the
    // optimistic check stands down rather than persisting. Asserting a checked radio here could
    // only ever pass by racing the transition.
    settle({ ok: true, card: card() });
    await waitFor(() => expect(screen.queryByRole("radio", { checked: true })).toBeNull());
  });

  it("draws no undo control under a pick — the accent row is the authorship", async () => {
    // The retired hint read `Tap <deck> again to undo this. Back to first committed` even when
    // the deck just tapped WAS the first committed, where there is nothing to undo and nothing
    // to go back to. Tapping a chosen deck again still clears it; the control only described a
    // gesture the row already affords.
    assign.mockResolvedValue({ ok: true, card: card() });
    render(<ContestedCardRow card={card()} />);
    fireEvent.click(screen.getByRole("radio", { name: /Elemental Dragons/ }));
    expect(screen.queryByText(/again to undo this/)).toBeNull();
    expect(screen.queryByText(/first committed/)).toBeNull();
    expect(screen.getByRole("radio", { checked: true }).getAttribute("aria-label"))
      .toContain("Elemental Dragons");
  });

  it("moves the copy off the previous holder on the tap, before the server answers", async () => {
    // THE BUG THIS EXISTS FOR. Only the radio was optimistic, so the picked deck went accent
    // while the deck losing the copy stayed filled until the round trip finished: two full marks
    // on a card with one copy, then one of them emptying a moment later.
    //
    // The action never resolves here, which is the point — everything asserted below is what the
    // reader sees DURING the write, not after it.
    let land: (v: unknown) => void = () => {};
    assign.mockReturnValue(new Promise((resolve) => { land = resolve; }));
    render(<ContestedCardRow card={card()} />);
    // `HD Avatar Aang` holds the copy by seniority; `Elemental Dragons` is about to take it.
    expect(screen.getByRole("radio", { name: /HD Avatar Aang/ }).textContent)
      .toContain(copy.contested.gets);
    fireEvent.click(screen.getByRole("radio", { name: /Elemental Dragons/ }));
    await waitFor(() => {
      expect(screen.getByRole("radio", { name: /Elemental Dragons/ }).textContent)
        .toContain(copy.contested.gets);
    });
    // The whole finding: the previous holder gives it up in the same frame.
    expect(screen.getByRole("radio", { name: /HD Avatar Aang/ }).textContent)
      .toContain(copy.contested.buys);
    // Let the write finish, so the transition does not outlive the test.
    land({ ok: true, card: card({ claimants: [
      { deckId: "d1", deckName: "HD Avatar Aang", quantity: 1, commanderCopies: 0, granted: 0, since: AUG, versionNumber: 7, allocated: 0 },
      { deckId: "d2", deckName: "Elemental Dragons", quantity: 1, commanderCopies: 0, granted: 1, since: SEP, versionNumber: 2, allocated: 1 },
    ] }) });
    await waitFor(() => {
      expect(screen.getByRole("radio", { checked: true })).toBeTruthy();
    });
  });

  it("previews against the copies owned, not the copies the import brought", async () => {
    // THE SUPPLY THE ROW HANDS THE PREVIEW. `arrived` is smaller than `owned` whenever a deck
    // already held a copy, and distributing the arrival starves the senior deck: it flips to
    // `buys it` for one round trip and then flips back — the same flicker, reversed.
    let land: (v: unknown) => void = () => {};
    assign.mockReturnValue(new Promise((resolve) => { land = resolve; }));
    const twoCopies = card({
      arrived: 1,
      owned: 2,
      claimants: [
        { deckId: "d1", deckName: "HD Avatar Aang", quantity: 1, commanderCopies: 0, granted: 0, since: AUG, versionNumber: 7, allocated: 1 },
        { deckId: "d2", deckName: "Elemental Dragons", quantity: 2, commanderCopies: 0, granted: 0, since: SEP, versionNumber: 2, allocated: 1 },
      ],
    });
    render(<ContestedCardRow card={twoCopies} />);
    fireEvent.click(screen.getByRole("radio", { name: /Elemental Dragons/ }));
    await waitFor(() => {
      expect(screen.getByRole("radio", { name: /Elemental Dragons/ }).textContent)
        .toContain(copy.contested.gets);
    });
    // Two copies, two decks, one apiece: the senior deck loses nothing to this pick.
    expect(screen.getByRole("radio", { name: /HD Avatar Aang/ }).textContent)
      .toContain(copy.contested.gets);
    // Resolved with the GRANT on it, so the settled state is observably different from the
    // optimistic one: `picked` stands down here and authorship is read from the data instead.
    // A payload granting nobody leaves the assertion passing on the optimistic render it was
    // meant to outlive.
    land({ ok: true, card: card({
      arrived: 1,
      owned: 2,
      claimants: [
        { deckId: "d1", deckName: "HD Avatar Aang", quantity: 1, commanderCopies: 0, granted: 0, since: AUG, versionNumber: 7, allocated: 1 },
        { deckId: "d2", deckName: "Elemental Dragons", quantity: 2, commanderCopies: 0, granted: 1, since: SEP, versionNumber: 2, allocated: 1 },
      ],
    }) });
    await waitFor(() => {
      expect(screen.getByRole("radio", { name: /Elemental Dragons/ }).getAttribute("aria-checked"))
        .toBe("true");
    });
    // Read off the DATA now, not the optimistic set — the senior deck still holds its copy.
    expect(screen.getByRole("radio", { name: /HD Avatar Aang/ }).textContent)
      .toContain(copy.contested.gets);
  });

  it("discards a superseded tap's answer instead of drawing it", async () => {
    // Next dispatches Server Actions one at a time per client, so these writes cannot race or
    // land out of order — see `node_modules/next/dist/docs/01-app/02-guides/server-actions.md`,
    // "Sequential dispatch on the client". The TAPS are not serialised though, so an earlier
    // write can still answer after the player has named a different deck, and without a tap
    // token its answer and its stand-down both landed on the newer pick.
    const withGrant = (deckId: string) => card({ claimants: [
      { deckId: "d1", deckName: "HD Avatar Aang", quantity: 1, commanderCopies: 0, granted: deckId === "d1" ? 1 : 0, since: AUG, versionNumber: 7, allocated: deckId === "d1" ? 1 : 0 },
      { deckId: "d2", deckName: "Elemental Dragons", quantity: 1, commanderCopies: 0, granted: deckId === "d2" ? 1 : 0, since: SEP, versionNumber: 2, allocated: deckId === "d2" ? 1 : 0 },
    ] });
    let landFirst: (v: unknown) => void = () => {};
    assign
      .mockImplementationOnce(() => new Promise((resolve) => { landFirst = resolve; }))
      .mockResolvedValue({ ok: true, card: withGrant("d1") });

    render(<ContestedCardRow card={card()} />);
    fireEvent.click(screen.getByRole("radio", { name: /Elemental Dragons/ }));
    fireEvent.click(screen.getByRole("radio", { name: /HD Avatar Aang/ }));
    await waitFor(() => {
      expect(screen.getByRole("radio", { name: /HD Avatar Aang/ }).getAttribute("aria-checked"))
        .toBe("true");
    });

    // The FIRST tap's write answers now, naming the deck the player has since moved off.
    landFirst({ ok: true, card: withGrant("d2") });
    await waitFor(() => expect(assign).toHaveBeenCalledTimes(2));
    // Its answer is discarded: the row still shows the deck the player last named.
    expect(screen.getByRole("radio", { name: /HD Avatar Aang/ }).getAttribute("aria-checked"))
      .toBe("true");
    expect(screen.getByRole("radio", { name: /Elemental Dragons/ }).getAttribute("aria-checked"))
      .toBe("false");
  });

  it("lets a fresher payload retire a write that is still in flight", async () => {
    // A revalidation can land while a pick is unanswered — another tab, or the action's own
    // `revalidateClaims` reaching the parent first. Adopting those props retires the write: its
    // answer is an older reading, and drawing it would undo the fresher one.
    let land: (v: unknown) => void = () => {};
    assign.mockReturnValue(new Promise((resolve) => { land = resolve; }));
    const { rerender } = render(<ContestedCardRow card={card()} />);
    fireEvent.click(screen.getByRole("radio", { name: /Elemental Dragons/ }));
    // New props arrive: the senior deck was granted the copy by something else entirely.
    const fresher = card({ claimants: [
      { deckId: "d1", deckName: "HD Avatar Aang", quantity: 1, commanderCopies: 0, granted: 1, since: AUG, versionNumber: 7, allocated: 1 },
      { deckId: "d2", deckName: "Elemental Dragons", quantity: 1, commanderCopies: 0, granted: 0, since: SEP, versionNumber: 2, allocated: 0 },
    ] });
    rerender(<ContestedCardRow card={fresher} />);
    await waitFor(() => {
      expect(screen.getByRole("radio", { name: /HD Avatar Aang/ }).getAttribute("aria-checked"))
        .toBe("true");
    });
    // The retired write answers, naming the other deck. It must not be drawn.
    land({ ok: true, card: card({ claimants: [
      { deckId: "d1", deckName: "HD Avatar Aang", quantity: 1, commanderCopies: 0, granted: 0, since: AUG, versionNumber: 7, allocated: 0 },
      { deckId: "d2", deckName: "Elemental Dragons", quantity: 1, commanderCopies: 0, granted: 1, since: SEP, versionNumber: 2, allocated: 1 },
    ] }) });
    await waitFor(() => expect(assign).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("radio", { name: /HD Avatar Aang/ }).getAttribute("aria-checked"))
      .toBe("true");
  });

  it("pressing the chosen deck again clears it", async () => {
    assign.mockResolvedValue({ ok: true, card: card() });
    render(<ContestedCardRow card={card()} />);
    const option = screen.getByRole("radio", { name: /Elemental Dragons/ });
    fireEvent.click(option);
    fireEvent.click(screen.getByRole("radio", { name: /your choice/ }));
    // A cleared row is indistinguishable from one never touched: no option checked, and the
    // accent gone with it.
    expect(screen.queryByRole("radio", { checked: true })).toBeNull();
  });

  it("redraws from the server's own reading when a pick is refused", async () => {
    assign.mockResolvedValue({
      ok: false,
      cause: "no-supply-left",
      // `fromImport: false`, as `loadContestedCard` really returns it: the live read has no
      // import behind it. The ROW does, so the sentence must still be the arrival one — which
      // it is only because the refusal reads the merged card rather than this object.
      card: card({ cardName: "Brushland", fromImport: false }),
    });
    render(<ContestedCardRow card={card()} />);
    fireEvent.click(screen.getByRole("radio", { name: /Elemental Dragons/ }));
    // TWICE, deliberately: the note the reader sees, and the live region announcing it VERBATIM
    // rather than as a summary of it.
    await waitFor(() => {
      expect(screen.getAllByText(
        copy.contested.refusedNoSupply("HD Avatar Aang", 1, "Elemental Dragons"),
      )).toHaveLength(2);
    });
    // The optimistic pick is taken back: the refusal means it never happened.
    expect(screen.queryByRole("radio", { checked: true })).toBeNull();
  });

  it("takes the fresh supply on the review door rather than freezing the first render", async () => {
    // Another tab imports a second copy while this row sits open. The live read knows; the
    // frozen `arrived` cannot, and carrying it would hold the heading at one copy for ever.
    assign.mockResolvedValue({
      ok: true,
      card: card({ fromImport: false, arrived: 0, owned: 2, claimants: [
        { deckId: "d1", deckName: "HD Avatar Aang", quantity: 1, commanderCopies: 0, granted: 0, since: AUG, versionNumber: 7, allocated: 1 },
        { deckId: "d2", deckName: "Elemental Dragons", quantity: 1, commanderCopies: 0, granted: 1, since: SEP, versionNumber: 2, allocated: 1 },
      ] }),
    });
    render(<ContestedCardRow card={card({ fromImport: false })} />);
    fireEvent.click(screen.getByRole("radio", { name: /Elemental Dragons/ }));
    await waitFor(() => {
      expect(screen.getByText(copy.contested.supplyOwned(2, 2))).toBeTruthy();
    });
    expect(screen.queryByText(copy.contested.supplyOwned(1, 2))).toBeNull();
  });

  it("does not say a copy arrived when the refusal comes from the review page", async () => {
    assign.mockResolvedValue({
      ok: false,
      cause: "no-supply-left",
      card: card({ cardName: "Brushland", fromImport: false }),
    });
    render(<ContestedCardRow card={card({ fromImport: false })} />);
    fireEvent.click(screen.getByRole("radio", { name: /Elemental Dragons/ }));
    await waitFor(() => {
      expect(screen.getAllByText(
        copy.contested.refusedNoSupplyOwned("HD Avatar Aang", 1, "Elemental Dragons"),
      )).toHaveLength(2);
    });
    // The arrival wording belongs to the receipt, and nothing arrived here.
    expect(screen.queryByText(
      copy.contested.refusedNoSupply("HD Avatar Aang", 1, "Elemental Dragons"),
    )).toBeNull();
  });

  it("names the group without an arrival when no import is behind the row", () => {
    render(<ContestedCardRow card={card({ fromImport: false })} />);
    // A screen reader takes the group's NAME in place of the supply line above it, so the
    // branch that fixes the visible text fixes nothing until this one moves too.
    expect(screen.getByRole("radiogroup", {
      name: copy.contested.a11yGroupOwned("Brushland", 1),
    })).toBeTruthy();
  });

  it("has a sentence for each drawable cause", async () => {
    for (const [cause, expected] of [
      ["claimant-no-longer-asks", copy.contested.refusedNotWanted("Elemental Dragons", "Brushland", "HD Avatar Aang")],
      ["target-is-commander", copy.contested.refusedIsCommander("Brushland", "Elemental Dragons")],
    ] as const) {
      assign.mockResolvedValue({ ok: false, cause, card: card() });
      const { unmount } = render(<ContestedCardRow card={card()} />);
      fireEvent.click(screen.getByRole("radio", { name: /Elemental Dragons/ }));
      await waitFor(() => expect(screen.getAllByText(expected).length).toBeGreaterThan(0));
      unmount();
    }
  });

  // A radiogroup is reached by Tab and traversed by arrows: every option but one carries
  // `tabIndex={-1}`, so without arrow handling a keyboard reader can see the group and never
  // reach the second deck in it.
  it("moves focus between options with the arrow keys", () => {
    render(<ContestedCardRow card={card()} />);
    const [first, second] = screen.getAllByRole("radio");
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowDown" });
    expect(document.activeElement).toBe(second);
    // …and wraps, rather than stopping at the end.
    fireEvent.keyDown(second, { key: "ArrowDown" });
    expect(document.activeElement).toBe(first);
  });

  it("skips an option nobody can choose when arrowing", () => {
    render(<ContestedCardRow card={card({
      owned: 2,
      claimants: [
        { deckId: "d1", deckName: "Lists It", quantity: 1, commanderCopies: 0, granted: 0, since: AUG, versionNumber: 1, allocated: 1 },
        { deckId: "d2", deckName: "Led By It", quantity: 1, commanderCopies: 1, granted: 0, since: SEP, versionNumber: 1, allocated: 1 },
        { deckId: "d3", deckName: "Also lists", quantity: 1, commanderCopies: 0, granted: 0, since: SEP + 1, versionNumber: 1, allocated: 0 },
      ],
    })} />);
    const radios = screen.getAllByRole("radio");
    radios[0].focus();
    fireEvent.keyDown(radios[0], { key: "ArrowDown" });
    // Past the commander, which cannot be chosen, and onto the third deck.
    expect(document.activeElement).toBe(radios[2]);
  });

  // NOT TESTED HERE: a THROWN action standing the optimistic pick down. The component's
  // `try/catch/finally` handles it, but every way of provoking it from this harness — a rejected
  // mock, a deferred rejection, a throwing async mock, each inside `act` — is reported by the
  // runner as an unhandled rejection attributed to the mock's own call site, and fails the test
  // whatever the component does. The guarantee is the `finally`, which runs on every path out of
  // that callback; it is stated there rather than proved here.

  it("draws no control on an option nobody can choose", async () => {
    render(<ContestedCardRow card={card({
      claimants: [
        { deckId: "d1", deckName: "Led By It", quantity: 1, commanderCopies: 1, granted: 0, since: AUG, versionNumber: 1, allocated: 1 },
        { deckId: "d2", deckName: "Lists It", quantity: 1, commanderCopies: 0, granted: 0, since: SEP, versionNumber: 1, allocated: 0 },
      ],
    })} />);
    const commander = screen.getByRole("radio", { name: /keeps Brushland as its commander/ });
    fireEvent.click(commander);
    expect(assign).not.toHaveBeenCalled();
  });

  // Announced FROM THE SERVER'S OWN ALLOCATION, once it has one. The trade is the news, and the
  // client cannot know which reservation the server evicted — it resolves them on
  // `(created_at, deck_id)`, not the commit order this row is drawn in. Announcing a loser before
  // the server has chosen one announces a trade that may not have happened.
  it("announces both sides of the trade, once, and only once the server has allocated", async () => {
    // After the pick: the junior deck holds the copy and the senior one buys.
    assign.mockResolvedValue({
      ok: true,
      card: card({
        claimants: [
          { deckId: "d1", deckName: "HD Avatar Aang", quantity: 1, commanderCopies: 0, granted: 0, since: AUG, versionNumber: 7, allocated: 0 },
          { deckId: "d2", deckName: "Elemental Dragons", quantity: 1, commanderCopies: 0, granted: 1, since: SEP, versionNumber: 2, allocated: 1 },
        ],
      }),
    });
    const { container } = render(<ContestedCardRow card={card()} />);
    const live = container.querySelector("[aria-live]");
    fireEvent.click(screen.getByRole("radio", { name: /Elemental Dragons/ }));
    // Nothing announced yet: no allocation has been decided.
    expect(live?.textContent).toBe("");
    await waitFor(() => {
      expect(live?.textContent).toBe(
        copy.contested.announcedPick("Elemental Dragons", "Brushland", "HD Avatar Aang"),
      );
    });
  });
});
