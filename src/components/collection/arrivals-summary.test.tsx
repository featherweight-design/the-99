import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArrivalsSummary } from "./arrivals-summary";
import { cardAssignmentsCopy as copy } from "../../lib/copy/card-assignments";
import type { ArrivalsSummary as Summary } from "../../lib/collection/arrivals";
import type { ContestedCard } from "../../lib/collection/summary-read";

const CARD = "o1";
const DECK = "d1";

function summary(over: Partial<Summary> = {}): Summary {
  return {
    version: 2,
    totalBefore: 100,
    totalAfter: 102,
    arrived: 3,
    left: 1,
    issues: { unmatched: 0, parseErrors: 0 },
    cleared: [],
    still: [],
    contested: [],
    names: { cards: { [CARD]: "Brushland" }, decks: { [DECK]: "HD Avatar Aang" } },
    ...over,
  };
}

const view = (s: Summary | null, contested: ContestedCard[] = []) => (
  <ArrivalsSummary
    summary={s}
    contested={contested}
    preview={null}
    filename="collection.csv"
    stampDate="14 Sep 2026"
  />
);

function contestedCard(): ContestedCard {
  return {
    oracleId: CARD,
    cardName: "Brushland",
    arrived: 1,
    ownedBefore: 0,
    owned: 1,
    brewNames: [],
    claimants: [
      { deckId: DECK, deckName: "HD Avatar Aang", quantity: 1, commanderCopies: 0, since: 1, versionNumber: 7, allocated: 1 },
      { deckId: "d2", deckName: "Elemental Dragons", quantity: 1, commanderCopies: 0, since: 2, versionNumber: 1, allocated: 0 },
    ],
  };
}

describe("ArrivalsSummary", () => {
  it("names no price and no total anywhere", () => {
    render(view(summary({
      cleared: [{ deckId: DECK, oracleId: CARD, copies: 1 }],
      still: [{ deckId: DECK, oracleId: CARD, owed: 1, reason: { kind: "gone" } }],
    })));
    // A cleared purchase has no honest figure — booster, trade and gift are all arrivals — and
    // a figure for what is still owed belongs on the deck's Shopping list, where it can be
    // acted on. So no currency mark reaches this page at all.
    expect(document.body.textContent).not.toMatch(/[$£€]/);
  });

  it("renders for an empty result rather than redirecting", () => {
    render(view(summary()));
    expect(screen.getByText(copy.summary.ledeNothingToReport)).toBeTruthy();
    // …and still says what the FILE did, so "nothing moved" reads as a fact about decks rather
    // than as an import that did nothing at all. Four copies moved here: 3 in, 1 out.
    const stamp = screen.getByText(new RegExp(copy.summary.fileDelta(4)));
    expect(stamp.textContent).toContain(copy.summary.fileStamp("14 Sep 2026", "collection.csv"));
    expect(screen.getByText(copy.summary.doneNoteEmpty)).toBeTruthy();
  });

  // The receipt is written after the replace commits, so a failure between the two leaves a
  // confirmed upload with no payload. The design draws that as nothing-to-report rather than an
  // error screen, and this pins it.
  it("renders a lost receipt as nothing to report, and states no figure it does not have", () => {
    render(view(null));
    expect(screen.getByText(copy.summary.ledeNothingToReport)).toBeTruthy();
    expect(screen.getByText(copy.summary.headingNoReceipt)).toBeTruthy();
    // `0 cards in your collection` would be false for anybody with a collection, and would make
    // a successful import look like an emptied one.
    expect(screen.queryByText(copy.summary.heading(0))).toBeNull();
  });

  it("drops a section with no rows rather than heading a nought", () => {
    render(view(summary({ cleared: [{ deckId: DECK, oracleId: CARD, copies: 1 }] })));
    expect(screen.getByText(copy.summary.sectionCleared(1))).toBeTruthy();
    expect(screen.queryByText(/Still to buy/)).toBeNull();
    expect(screen.queryByText(/Still short/)).toBeNull();
  });

  it("takes the no-contention lede only when nothing at all is still owed", () => {
    render(view(summary({ cleared: [{ deckId: DECK, oracleId: CARD, copies: 1 }] })));
    expect(screen.getByText(copy.summary.ledeNoContention(100, 3, 1))).toBeTruthy();
  });

  // A single deck short by two copies is not a contested row — there is nobody to choose
  // between — but it did NOT have a copy to spare, so the sentence that says every arrival did
  // would be a plain falsehood on a valid receipt.
  it("takes the neutral lede when something is owed without being contested", () => {
    render(view(summary({
      still: [{ deckId: DECK, oracleId: CARD, owed: 2, reason: { kind: "partly", arrived: 1, wanted: 3 } }],
    })));
    expect(screen.getByText(copy.summary.ledeOwing(100, 3, 1))).toBeTruthy();
    expect(screen.queryByText(copy.summary.ledeNoContention(100, 3, 1))).toBeNull();
  });

  it("takes the contention lede when a copy has to cover two decks", () => {
    render(view(summary({ contested: [{ oracleId: CARD, arrived: 1, ownedBefore: 0 }] }), [contestedCard()]));
    expect(screen.getByText(copy.summary.lede(100, 3, 1))).toBeTruthy();
    expect(screen.getByText(copy.summary.sectionShort(1))).toBeTruthy();
  });

  it("gives a still-owed row its reason, and the unmatched one its own words", () => {
    render(view(summary({
      still: [
        { deckId: DECK, oracleId: CARD, owed: 1, reason: { kind: "partly", arrived: 1, wanted: 2 } },
        { deckId: "d2", oracleId: CARD, owed: 1, reason: { kind: "unmatched" } },
      ],
    })));
    expect(screen.getByText(copy.summary.reasonPartly(1, 2))).toBeTruthy();
    // The one reason a player can act on without buying anything: they own the card, the line failed.
    const unmatched = screen.getByText(copy.summary.reasonUnmatched);
    expect(unmatched).toBeTruthy();
    // …and it is the one reason drawn in `--warning`, because it is the one a player can act on
    // without buying anything.
    expect(unmatched.getAttribute("style")).toContain("--warning");
    expect(screen.getByText(copy.summary.reasonPartly(1, 2)).getAttribute("style"))
      .toContain("--fg-faint");
  });

  it("truncates a money section at four and never the contested one", () => {
    const many = Array.from({ length: 6 }, (_, i) => ({ deckId: `d${i}`, oracleId: CARD, copies: 1 }));
    render(view(summary({ cleared: many })));
    expect(screen.getByText(copy.summary.showAll(6))).toBeTruthy();
    expect(screen.getAllByText("Brushland")).toHaveLength(4);
  });

  it("states the issues as counts and never as the list again", () => {
    render(view(summary({ issues: { unmatched: 2, parseErrors: 1 } })));
    expect(screen.getByText(copy.summary.issues(2, 1))).toBeTruthy();
    // `IssueInspector` read the list out at the moment it could still change the decision.
    // Re-listing it here would imply the app has just discovered something.
    expect(screen.queryByRole("list", { name: /unmatched/i })).toBeNull();
  });

  it("uses the unmatched-only sentence when nothing failed to parse", () => {
    render(view(summary({ issues: { unmatched: 1, parseErrors: 0 } })));
    expect(screen.getByText(copy.summary.issuesUnmatchedOnly(1))).toBeTruthy();
  });

  it("says Done is a route, not a save", () => {
    render(view(summary({ cleared: [{ deckId: DECK, oracleId: CARD, copies: 1 }] })));
    const done = screen.getByText(copy.summary.done);
    expect(done.getAttribute("href")).toBe("/collection");
    expect(screen.getByText(copy.summary.doneNote)).toBeTruthy();
  });
});
