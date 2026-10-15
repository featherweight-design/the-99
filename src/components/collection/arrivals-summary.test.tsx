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
    expect(screen.getByText(copy.summary.ledeNoReceipt)).toBeTruthy();
    // A missing receipt records nothing, so no deck outcome is claimed from it.
    expect(document.body.textContent).not.toMatch(/buy list|contested|Nothing your decks care about moved|new file/);
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
    expect(copy.summary.nowShort(["Gishath"], "Replacing")).toBe("Replacing left a deck short: Gishath.");
  });
  it("joins three with and", () => {
    expect(copy.summary.nowShort(["A", "B", "C"], "Replacing")).toBe("Replacing left 3 decks short: A, B and C.");
  });
});

describe("ArrivalsSummary after a Sync (collection sync call 7, ruling 3)", () => {
  const sync = (over: Partial<{ kept: number; decided: number; tokens: number; cards: number }> = {}) => ({ kept: 119, decided: 3, tokens: 114, ...over });
  const synced = (s: Summary | null, sy = sync()) => (
    <ArrivalsSummary summary={s} contested={[]} preview={null} filename="The Vault.csv" stampDate="Oct 15, 2026" sync={sy} />
  );

  it("carries on past `left` with the kept clause and the decided sentence, on the shipped comma join", () => {
    const s = summary({ totalBefore: 4616, arrived: 15, left: 2, still: [{ deckId: DECK, oracleId: CARD, owed: 1, reason: { kind: "gone" } }] });
    render(synced(s, sync({ tokens: 0 })));
    const lede = copy.summary.ledeOwing(4616, 15, 2, { kept: 119, decided: 3 });
    expect(lede).toBe(
      "Was 4,616. 15 arrived, 2 left, and the 119 cards you changed in the app stayed as you had them. " +
        "You decided 3. Here’s what your decks still need after the update.",
    );
    expect(screen.getByText(lede)).toBeTruthy();
    // The shipped layout: the same heading, Sync's eyebrow, and the stamp below the lede in Sync's word.
    expect(screen.getByText(copy.summary.heading(102))).toBeTruthy();
    expect(screen.getByText(copy.summary.eyebrowSync)).toBeTruthy();
    expect(screen.getByText(copy.summary.syncFileStamp("Oct 15, 2026", "The Vault.csv"))).toBeTruthy();
    expect(screen.queryByText(/^uploaded /)).toBeNull();
  });

  it("says the tokens a Sync that also moved cards changed, neutrally and agreeing in number", () => {
    const s = summary({ totalBefore: 4616, arrived: 15, left: 2, still: [{ deckId: DECK, oracleId: CARD, owed: 1, reason: { kind: "gone" } }] });
    render(synced(s, sync({ kept: 119, decided: 3, tokens: 114, cards: 17 })));
    expect(screen.getByText(
      "Was 4,616. 15 arrived, 2 left, and the 119 cards you changed in the app stayed as you had them. " +
        "You decided 3. 114 tokens changed. Here’s what your decks still need after the update.",
    )).toBeTruthy();
    expect(copy.summary.lede(10, 1, 0, { kept: 0, decided: 0, tokens: 1 })).toMatch(/^Was 10\. 1 arrived, 0 left\. 1 token changed\. Here’s/);
    expect(copy.summary.ledeNothingToReportSync({ kept: 0, decided: 0, tokens: 2 })).toMatch(/ 2 tokens changed\.$/);
  });

  it("agrees for one kept card: it stayed as you had it", () => {
    expect(copy.summary.lede(10, 1, 0, { kept: 1, decided: 0 })).toMatch(/^Was 10\. 1 arrived, 0 left, and the 1 card you changed in the app stayed as you had it\. Here’s/);
    expect(copy.summary.ledeNothingToReportSync({ kept: 1, decided: 0 })).toContain("The 1 card you changed in the app stayed as you had it.");
  });

  it("is not tokens-only when a Sync changed a card row that moved no copy count (a printing, a finish, a condition)", () => {
    render(synced(summary({ arrived: 0, left: 0, totalAfter: 100 }), sync({ kept: 0, decided: 0, tokens: 2, cards: 3 })));
    expect(screen.queryByText(/Your cards are as you left them/)).toBeNull();
    expect(screen.getByText(copy.summary.ledeNothingToReportSync({ kept: 0, decided: 0, tokens: 2 }))).toBeTruthy();
  });

  it("is tokens-only when the Sync changed no card row", () => {
    render(synced(summary({ arrived: 0, left: 0, totalAfter: 100 }), sync({ kept: 0, decided: 0, tokens: 2, cards: 0 })));
    expect(screen.getByText(copy.summary.ledeTokensOnly(2))).toBeTruthy();
  });

  // An Everything Sync can change no card row and still have answered conflicts (every one App) or kept the
  // player's own changes. The tokens-only sentence says neither, so it is not that Sync's (Y1: never drop
  // the kept clause): the general Sync lede carries both.
  it("is not tokens-only when a Sync that changed no card row decided a conflict or kept a card", () => {
    for (const [kept, decided] of [[0, 3], [5, 0]] as const) {
      const { unmount } = render(synced(summary({ arrived: 0, left: 0, totalAfter: 100 }), sync({ kept, decided, tokens: 2, cards: 0 })));
      expect(screen.queryByText(/Your cards are as you left them/)).toBeNull();
      expect(screen.getByText(copy.summary.ledeNothingToReportSync({ kept, decided, tokens: 2 }))).toBeTruthy();
      unmount();
    }
    // The fallback for a summary stored before `cards` reads the same way.
    render(synced(summary({ arrived: 0, left: 0, totalAfter: 100 }), sync({ kept: 0, decided: 1, tokens: 2 })));
    expect(screen.getByText(copy.summary.ledeNothingToReportSync({ kept: 0, decided: 1, tokens: 2 }))).toBeTruthy();
  });

  it("drops the decided sentence when nothing was decided, and the kept clause when nothing was kept", () => {
    expect(copy.summary.lede(10, 1, 0, { kept: 4, decided: 0 })).toMatch(/^Was 10\. 1 arrived, 0 left, and the 4 cards you changed in the app stayed as you had them\. Here’s/);
    expect(copy.summary.lede(10, 1, 0, { kept: 0, decided: 2 })).toMatch(/^Was 10\. 1 arrived, 0 left\. You decided 2\. Here’s/);
    // A Replace's lede is byte for byte what it was.
    expect(copy.summary.lede(10, 1, 0)).toMatch(/^Was 10\. 1 arrived, 0 left\. Here’s/);
  });

  it("says Syncing, not Replacing, when it left a deck short", () => {
    const s = summary({ version: 3, arrived: 1, left: 1, nowShort: [{ deckId: DECK, oracleId: CARD, short: 1 }] });
    render(synced(s));
    expect(screen.getByText(/Syncing left a deck short: HD Avatar Aang\./)).toBeTruthy();
    expect(screen.queryByText(/Replacing left/)).toBeNull();
    expect(copy.summary.nowShort(["A", "B"], "Syncing")).toBe("Syncing left 2 decks short: A and B.");
  });

  it("a tokens-only Sync takes the nothing-to-report line with Sync's ending, and claims no card moved", () => {
    render(synced(summary({ arrived: 0, left: 0, totalAfter: 100 }), sync({ kept: 0, decided: 0, tokens: 114 })));
    expect(screen.getByText(copy.summary.ledeTokensOnly(114))).toBeTruthy();
    expect(copy.summary.ledeTokensOnly(114)).toBe(
      "Nothing your decks care about moved. Your cards are as you left them, and 114 tokens changed.",
    );
    expect(screen.queryByText(copy.summary.ledeNothingToReport)).toBeNull();
    // No `0 cards differ from the old list` beside the stamp.
    expect(screen.queryByText(new RegExp(copy.summary.fileDelta(0)))).toBeNull();
  });

  it("a Sync that moved cards no deck cares about keeps the file's own delta beside the stamp", () => {
    render(synced(summary({ arrived: 3, left: 1, totalAfter: 102 }), sync({ kept: 0, decided: 0, tokens: 0, cards: 4 })));
    expect(screen.getByText(copy.summary.ledeNothingToReportSync({ kept: 0, decided: 0, tokens: 0 }))).toBeTruthy();
    expect(screen.getByText(new RegExp(copy.summary.fileDelta(4)))).toBeTruthy();
  });

  it("a Sync whose rows moved no copy count says no `0 cards differ`", () => {
    render(synced(summary({ arrived: 0, left: 0, totalAfter: 100 }), sync({ kept: 2, decided: 0, tokens: 0, cards: 3 })));
    expect(screen.queryByText(new RegExp(copy.summary.fileDelta(0)))).toBeNull();
  });

  it("a Sync that moved cards no deck cares about keeps the kept clause, and never says the collection is the file", () => {
    render(synced(summary(), sync({ kept: 7, decided: 1, tokens: 0 })));
    const lede = copy.summary.ledeNothingToReportSync({ kept: 7, decided: 1 });
    expect(screen.getByText(lede)).toBeTruthy();
    expect(lede).toContain("The 7 cards you changed in the app stayed as you had them. You decided 1.");
    expect(lede).not.toContain("new file");
  });

  it("a lost Sync receipt says synced, not replaced", () => {
    render(synced(null));
    expect(screen.getByText(copy.summary.headingNoReceiptSync)).toBeTruthy();
  });

  it("a lost Sync receipt claims no deck outcome, and says the Sync's own figures", () => {
    render(synced(null, sync({ kept: 2, decided: 1, tokens: 3, cards: 5 })));
    const lede = copy.summary.ledeNoReceiptSync({ kept: 2, decided: 1, tokens: 3 });
    expect(screen.getByText(lede)).toBeTruthy();
    expect(lede).toContain("The 2 cards you changed in the app stayed as you had them. You decided 1. 3 tokens changed.");
    expect(document.body.textContent).not.toMatch(/buy list|contested|Nothing your decks care about moved/);
  });

  it("a lost Replace receipt claims no deck outcome", () => {
    render(<ArrivalsSummary summary={null} contested={[]} preview={null} filename="f.csv" stampDate="Oct 15, 2026" />);
    expect(screen.getByText(copy.summary.ledeNoReceipt)).toBeTruthy();
    expect(screen.queryByText(copy.summary.ledeNothingToReport)).toBeNull();
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

  it("keeps the shipped row for a deck the line does not name, so a brew's soft read is not lost", () => {
    const BREW = "brew";
    const s4 = summary({
      version: 4,
      cleared: [{ deckId: BRAGO, oracleId: SOL, copies: 1 }, { deckId: BREW, oracleId: SOL, copies: 1 }],
      names: { cards: names.cards, decks: { ...names.decks, [BREW]: "HD - Kratos" } },
      went: { [SOL]: { kind: "held", decks: [{ deckId: BRAGO, copies: 1, picked: false }], copies: 2, ownedBefore: 15 } },
    });
    render4(s4, true);
    expect(screen.getByText(addedCopyCopy.row.goesTo("HD - Brago"))).toBeTruthy();
    expect(screen.getByText("HD - Kratos")).toBeTruthy();
    expect(screen.getByText(copy.summary.sectionCleared(2))).toBeTruthy();
  });

  it("offers Change in the note only when a drawn row has a chooser", () => {
    render(
      <ArrivalsSummary
        summary={v4}
        contested={[]}
        preview={null}
        filename="collection.csv"
        stampDate="14 Sep 2026"
        addedCopy
        chooser={{}}
      />,
    );
    expect(screen.getByText(addedCopyCopy.row.goesToMany(["HD - Brago", "HD - Eldrazi"]))).toBeTruthy();
    expect(screen.getByText(copy.summary.sectionClearedNote)).toBeTruthy();
    expect(screen.queryByText(copy.summary.sectionClearedNote + addedCopyCopy.summaryNoteTail)).toBeNull();
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
