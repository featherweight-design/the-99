import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArrivalsSummary } from "./arrivals-summary";
import { cardAssignmentsCopy as copy } from "../../lib/copy/card-assignments";
import { addedCopyCopy } from "../../lib/copy/added-copy";
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
    fromImport: true,
    owned: 1,
    claimants: [
      { deckId: DECK, deckName: "HD Avatar Aang", quantity: 1, commanderCopies: 0, granted: 0, since: 1, versionNumber: 7, allocated: 1 },
      { deckId: "d2", deckName: "Elemental Dragons", quantity: 1, commanderCopies: 0, granted: 0, since: 2, versionNumber: 1, allocated: 0 },
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
    expect(screen.getByText(copy.summary.done)).toBeTruthy();
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
    // The note beside the button is retired: the label names its destination.
    expect(screen.queryByText(/nothing here needs saving/)).toBeNull();
  });
});

describe("ArrivalsSummary — decks left short", () => {
  const decks = { d1: "Gishath", d2: "Brago", d3: "Tovolar", d4: "Gods" };
  const withShort = (rows: { deckId: string; short: number }[]) => summary({
    version: 3,
    arrived: 0,
    left: 40,
    nowShort: rows.map((r) => ({ ...r, oracleId: CARD })),
    names: { cards: { [CARD]: "Brushland" }, decks },
  });

  it("names the decks the upload left short, most short first, after the lede", () => {
    render(view(withShort([{ deckId: "d2", short: 1 }, { deckId: "d1", short: 3 }])));
    expect(screen.getByText(/Replacing left 2 decks short: Gishath and Brago\./)).toBeTruthy();
    expect(screen.queryByText(copy.summary.ledeNothingToReport)).toBeNull();
  });

  it("sums a deck's shortfall across its cards before ordering, and names each deck once", () => {
    const s = summary({
      version: 3, arrived: 0, left: 40,
      nowShort: [
        { deckId: "d1", oracleId: "o1", short: 1 }, { deckId: "d2", oracleId: "o1", short: 2 },
        { deckId: "d1", oracleId: "o2", short: 2 },
      ],
      names: { cards: { o1: "Brushland", o2: "Sol Ring" }, decks },
    });
    render(view(s));
    // Gishath is short 3 across two cards, Brago 2 on one: Gishath first, each named once.
    expect(screen.getByText(/Replacing left 2 decks short: Gishath and Brago\./)).toBeTruthy();
  });

  it("counts past three names", () => {
    render(view(withShort([
      { deckId: "d1", short: 4 }, { deckId: "d2", short: 3 }, { deckId: "d3", short: 2 }, { deckId: "d4", short: 1 },
    ])));
    expect(screen.getByText(/Replacing left 4 decks short: Gishath, Brago, Tovolar and 1 more\./)).toBeTruthy();
  });

  it("never pairs a short deck with the nothing-to-decide lede", () => {
    // A committed deck can go short on a card its draft already dropped: no buy row, no still row.
    const s = withShort([{ deckId: "d1", short: 1 }]);
    render(view(s));
    expect(screen.getByText(new RegExp(copy.summary.ledeOwing(s.totalBefore, s.arrived, s.left).slice(0, 20)))).toBeTruthy();
    expect(screen.queryByText(/nothing to decide/)).toBeNull();
  });

  it("says nothing about short decks on a version-2 receipt", () => {
    render(view(summary({ left: 40 })));
    expect(screen.queryByText(/Replacing left/)).toBeNull();
  });
});

describe("copy.summary.nowShort", () => {
  it("names one deck without a count", () => {
    expect(copy.summary.nowShort(["Gishath"])).toBe("Replacing left a deck short: Gishath.");
  });
  it("joins three with and", () => {
    expect(copy.summary.nowShort(["A", "B", "C"])).toBe("Replacing left 3 decks short: A, B and C.");
  });
});

describe("ArrivalsSummary — where an added copy goes", () => {
  const SOL = "sol";
  const BRAGO = "brago";
  const ELDRAZI = "eldrazi";
  const names = {
    cards: { [CARD]: "Brushland", [SOL]: "Sol Ring" },
    decks: { [DECK]: "HD Avatar Aang", [BRAGO]: "HD - Brago", [ELDRAZI]: "HD - Eldrazi" },
  };
  // Two decks stopped owing Sol Ring and one stopped owing Brushland.
  const cleared = [
    { deckId: BRAGO, oracleId: SOL, copies: 1 },
    { deckId: ELDRAZI, oracleId: SOL, copies: 1 },
    { deckId: DECK, oracleId: CARD, copies: 1 },
  ];
  const v4 = summary({
    version: 4,
    cleared,
    names,
    went: {
      [SOL]: { kind: "held", decks: [{ deckId: BRAGO, copies: 1, picked: false }, { deckId: ELDRAZI, copies: 1, picked: false }], copies: 2, ownedBefore: 15 },
      [CARD]: { kind: "held", decks: [{ deckId: DECK, copies: 1, picked: true }], copies: 1, ownedBefore: 0 },
    },
  });
  const chooser: Record<string, ContestedCard> = { [SOL]: { ...contestedCard(), oracleId: SOL, cardName: "Sol Ring" } };
  const render4 = (s: Summary, addedCopy: boolean) => render(
    <ArrivalsSummary
      summary={s}
      contested={[]}
      preview={null}
      filename="collection.csv"
      stampDate="14 Sep 2026"
      addedCopy={addedCopy}
      chooser={chooser}
    />,
  );

  it("draws one row per card on a version-4 receipt, carrying where its copies went", () => {
    render4(v4, true);
    expect(screen.getByText(copy.summary.sectionCleared(2))).toBeTruthy();
    expect(screen.getByText(addedCopyCopy.row.goesToMany(["HD - Brago", "HD - Eldrazi"]))).toBeTruthy();
    expect(screen.getByText(addedCopyCopy.row.goesToEarlier("HD Avatar Aang"))).toBeTruthy();
    expect(screen.getByText(copy.summary.sectionClearedNote + addedCopyCopy.summaryNoteTail)).toBeTruthy();
    // Change only where there is a chooser to open.
    expect(screen.getByRole("button", { name: addedCopyCopy.changeAria("Sol Ring") })).toBeTruthy();
    expect(screen.queryByRole("button", { name: addedCopyCopy.changeAria("Brushland") })).toBeNull();
  });

  it("draws a version-3 receipt per deck and card, with no line and no Change", () => {
    const v3: Summary = { ...v4, version: 3 };
    delete v3.went;
    render4(v3, true);
    expect(screen.getByText(copy.summary.sectionCleared(3))).toBeTruthy();
    expect(screen.getByText(copy.summary.sectionClearedNote)).toBeTruthy();
    expect(screen.getByText("HD - Brago")).toBeTruthy();
    expect(screen.getByText("HD - Eldrazi")).toBeTruthy();
    expect(screen.queryByText(addedCopyCopy.row.goesToMany(["HD - Brago", "HD - Eldrazi"]))).toBeNull();
    expect(screen.queryByRole("button", { name: addedCopyCopy.changeAria("Sol Ring") })).toBeNull();
  });

  it("draws a version-4 receipt exactly as before with the switch off", () => {
    render4(v4, false);
    expect(screen.getByText(copy.summary.sectionCleared(3))).toBeTruthy();
    expect(screen.getByText(copy.summary.sectionClearedNote)).toBeTruthy();
    expect(screen.queryByRole("button", { name: addedCopyCopy.changeAria("Sol Ring") })).toBeNull();
  });

  it("keeps the shipped deck rows for a card the contested section is still deciding", () => {
    render(
      <ArrivalsSummary
        summary={v4}
        contested={[{ ...contestedCard(), oracleId: SOL, cardName: "Sol Ring" }]}
        preview={null}
        filename="collection.csv"
        stampDate="14 Sep 2026"
        addedCopy
        chooser={chooser}
      />,
    );
    expect(screen.queryByText(addedCopyCopy.row.goesToMany(["HD - Brago", "HD - Eldrazi"]))).toBeNull();
    expect(screen.getByText(copy.summary.sectionCleared(3))).toBeTruthy();
  });
});
