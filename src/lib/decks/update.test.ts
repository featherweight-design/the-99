import { describe, expect, it } from "vitest";
import type { DeckImport } from "./import";
import { planDeckUpdate, type DeckUpdateCard, type DeckUpdatePlan } from "./update";

const KORVOLD = "o-korvold";
const ATRAXA = "o-atraxa";

const NAMES: Record<string, string> = {
  "o-sol-ring": "Sol Ring",
  "o-signet": "Arcane Signet",
  "o-tithe": "Smothering Tithe",
  "o-island": "Island",
  "o-swords": "Swords to Plowshares",
};
const TYPE_LINES: Record<string, string> = {
  "o-island": "Basic Land — Island",
  "o-swords": "Instant",
};
/** The parsed list's rows carry the line that named them; the planner passes it
 *  through to the additions and the diff prints it. */
const cardFor = (oracleId: string) => ({
  name: NAMES[oracleId] ?? oracleId,
  typeLine: TYPE_LINES[oracleId] ?? "Artifact",
});

function parsed(over: Partial<DeckImport> = {}): DeckImport {
  return {
    cards: [],
    unresolved: [],
    legendaryCandidates: [],
    declaredCommander: null,
    declaredPartner: null,
    lineCount: 0,
    notes: [],
    printings: [],
    ...over,
  };
}

const card = (oracleId: string, over: Partial<DeckUpdateCard> = {}): DeckUpdateCard => ({
  oracleId,
  ...cardFor(oracleId),
  quantity: 1,
  auto: true,
  ...over,
});

function plan(args: Parameters<typeof planDeckUpdate>[0]) {
  const result = planDeckUpdate(args);
  if ("listCommander" in result) throw new Error("expected a plan, got a conflict");
  return result as DeckUpdatePlan;
}

describe("planDeckUpdate", () => {
  it("splits the deck into out, in and unchanged", () => {
    const result = plan({
      parsed: parsed({
        cards: [
          { oracleId: "o-sol-ring", quantity: 1, sourceLine: 2 },
          { oracleId: "o-swords", quantity: 1, sourceLine: 3 },
        ],
      }),
      deckCards: [card("o-sol-ring"), card("o-tithe")],
      commanderOracleId: KORVOLD,
      deckUnresolved: [],
      cardFor,
    });

    expect(result.out.map((r) => r.oracleId)).toEqual(["o-tithe"]);
    expect(result.in.map((r) => r.oracleId)).toEqual(["o-swords"]);
    expect(result.unchanged.map((r) => r.oracleId)).toEqual(["o-sol-ring"]);
    expect(result.in[0].name).toBe("Swords to Plowshares");
  });

  // A real list only changes the count of basics, and a diff listing "your
  // Islands went 12 → 9" among the departures would bury the cards that
  // actually left the deck.
  it("reconciles a quantity change as unchanged, not as a departure", () => {
    const result = plan({
      parsed: parsed({ cards: [{ oracleId: "o-island", quantity: 9, sourceLine: 4 }] }),
      deckCards: [card("o-island", { quantity: 12 })],
      commanderOracleId: KORVOLD,
      deckUnresolved: [],
      cardFor,
    });
    expect(result.out).toHaveLength(0);
    expect(result.in).toHaveLength(0);
    expect(result.unchanged).toEqual([
      { oracleId: "o-island", ...cardFor("o-island"), sourceLine: null, quantity: 9, auto: true },
    ]);
  });

  // Not a group of its own, but the copies still have to be accounted for: the
  // landing figure is compared to 99, and a reader adding the row counts up
  // otherwise lands somewhere the screen never explains.
  it("collects the moved counts, with both figures", () => {
    const result = plan({
      parsed: parsed({
        cards: [
          { oracleId: "o-island", quantity: 9, sourceLine: 4 },
          { oracleId: "o-sol-ring", quantity: 1, sourceLine: 5 },
        ],
      }),
      deckCards: [card("o-island", { quantity: 12 }), card("o-sol-ring")],
      commanderOracleId: KORVOLD,
      deckUnresolved: [],
      cardFor,
    });
    expect(result.recounted).toEqual([
      { oracleId: "o-island", name: "Island", from: 12, to: 9 },
    ]);
  });

  it("counts two lines naming the same card once, against the deck's figure", () => {
    // `listed` sums the copies before this comparison runs, so four Islands
    // over two lines is one recount to eight, not two rows saying different
    // things.
    const result = plan({
      parsed: parsed({
        cards: [
          { oracleId: "o-island", quantity: 2, sourceLine: 4 },
          { oracleId: "o-island", quantity: 2, sourceLine: 5 },
        ],
      }),
      deckCards: [card("o-island", { quantity: 8 })],
      commanderOracleId: KORVOLD,
      deckUnresolved: [],
      cardFor,
    });
    expect(result.recounted).toEqual([
      { oracleId: "o-island", name: "Island", from: 8, to: 4 },
    ]);
  });

  // Not a group of its own, but still a write. Calling it "nothing changed"
  // would refuse the only change this list asks for.
  it("does not call a quantity-only list nothing changed", () => {
    const result = plan({
      parsed: parsed({ cards: [{ oracleId: "o-island", quantity: 9, sourceLine: 4 }] }),
      deckCards: [card("o-island", { quantity: 12 })],
      commanderOracleId: KORVOLD,
      deckUnresolved: [],
      cardFor,
    });
    expect(result.noChange).toBe(false);
  });

  it("calls a list that matches the deck exactly nothing changed", () => {
    const result = plan({
      parsed: parsed({ cards: [{ oracleId: "o-island", quantity: 12, sourceLine: 4 }] }),
      deckCards: [card("o-island", { quantity: 12 })],
      commanderOracleId: KORVOLD,
      deckUnresolved: [],
      cardFor,
    });
    expect(result.noChange).toBe(true);
    expect(result.recounted).toEqual([]);
  });

  // An export writes the commander into its own list. Putting it in the 99 would
  // change the deck's colour identity, so it is dropped rather than added.
  it("drops the deck's own commander from the list", () => {
    const result = plan({
      parsed: parsed({ cards: [{ oracleId: KORVOLD, quantity: 1, sourceLine: 5 }, { oracleId: "o-sol-ring", quantity: 1, sourceLine: 6 }] }),
      deckCards: [],
      commanderOracleId: KORVOLD,
      deckUnresolved: [],
      cardFor,
    });
    expect(result.in.map((r) => r.oracleId)).toEqual(["o-sol-ring"]);
  });

  it("refuses a list that declares a different commander", () => {
    const result = planDeckUpdate({
      parsed: parsed({ declaredCommander: { oracleId: ATRAXA, name: "Atraxa, Praetors' Voice", sourceLine: 1 } }),
      deckCards: [card("o-sol-ring")],
      commanderOracleId: KORVOLD,
      deckUnresolved: [],
      cardFor,
    });
    expect(result).toEqual({ listCommander: "Atraxa, Praetors' Voice", deckOracleId: KORVOLD });
  });

  // A shortlist is not a declaration. Refusing on it would break every deck
  // whose ninety-nine includes a legend.
  it("does not refuse a list that merely contains a legend", () => {
    const result = plan({
      parsed: parsed({
        cards: [{ oracleId: "o-sol-ring", quantity: 1, sourceLine: 7 }],
        legendaryCandidates: [
          { oracleId: ATRAXA, name: "Atraxa, Praetors' Voice", sourceLine: 4, colorIdentity: ["W"], imageUri: null, oracleText: null, typeLine: "Legendary Creature — Phyrexian Angel Horror" },
        ],
      }),
      deckCards: [],
      commanderOracleId: KORVOLD,
      deckUnresolved: [],
      cardFor,
    });
    expect(result.in).toHaveLength(1);
  });

  // The list is the deck now, so a line the new list does not carry is not a
  // line the deck is still missing.
  it("carries the list's unnamed lines, which replace the deck's own", () => {
    const unresolved = [{ rawName: "Lotus Petal?", quantity: 1, sourceLine: 12 }];
    const result = plan({
      parsed: parsed({ unresolved }),
      deckCards: [],
      commanderOracleId: KORVOLD,
      deckUnresolved: [],
      cardFor,
    });
    expect(result.unresolved).toEqual(unresolved);
  });

  // The second way the "nothing changed" screen is reached — state 12's own
  // wording: unnamed lines are not a change when the deck already carries them.
  it("reports no change when the unnamed lines are ones the deck already carries", () => {
    const result = plan({
      parsed: parsed({
        cards: [{ oracleId: "o-sol-ring", quantity: 1, sourceLine: 8 }],
        unresolved: [{ rawName: "Lotus Petal?", quantity: 1, sourceLine: 12 }],
      }),
      deckCards: [card("o-sol-ring")],
      commanderOracleId: KORVOLD,
      deckUnresolved: [{ rawName: "Lotus Petal?", quantity: 1 }],
      cardFor,
    });
    expect(result.noChange).toBe(true);
  });

  // The apply path replaces the unnamed rows wholesale, so a differing set is a
  // real write. Calling it "nothing changed" would strand the deck holding a
  // line no list still asks for, with no way to clear it.
  it("does not call a differing set of unnamed lines nothing changed", () => {
    const result = plan({
      parsed: parsed({
        cards: [{ oracleId: "o-sol-ring", quantity: 1, sourceLine: 8 }],
        unresolved: [{ rawName: "Black Lotus?", quantity: 1, sourceLine: 12 }],
      }),
      deckCards: [card("o-sol-ring")],
      commanderOracleId: KORVOLD,
      deckUnresolved: [{ rawName: "Lotus Petal?", quantity: 1 }],
      cardFor,
    });
    expect(result.noChange).toBe(false);
  });

  // A line that moved down the page is not a change to the deck: `sourceLine`
  // points into a paste that no longer exists once the update is applied.
  it("ignores the line a repeated unnamed row now sits on", () => {
    const result = plan({
      parsed: parsed({
        cards: [{ oracleId: "o-sol-ring", quantity: 1, sourceLine: 8 }],
        unresolved: [{ rawName: "Lotus Petal?", quantity: 1, sourceLine: 40 }],
      }),
      deckCards: [card("o-sol-ring")],
      commanderOracleId: KORVOLD,
      deckUnresolved: [{ rawName: "Lotus Petal?", quantity: 1 }],
      cardFor,
    });
    expect(result.noChange).toBe(true);
  });

  // State 15: legal, and the screen unmounts the `in` group rather than drawing
  // an empty one.
  it("plans removals with nothing going in", () => {
    const result = plan({
      parsed: parsed({ cards: [{ oracleId: "o-sol-ring", quantity: 1, sourceLine: 9 }] }),
      deckCards: [card("o-sol-ring"), card("o-tithe")],
      commanderOracleId: KORVOLD,
      deckUnresolved: [],
      cardFor,
    });
    expect(result.in).toHaveLength(0);
    expect(result.out).toHaveLength(1);
    expect(result.noChange).toBe(false);
  });

  // Two lines naming the same card is an export artifact; summing them keeps the
  // card out of both `out` and a duplicated `in`.
  it("sums two lines naming the same card", () => {
    const result = plan({
      parsed: parsed({
        cards: [
          { oracleId: "o-island", quantity: 4, sourceLine: 10 },
          { oracleId: "o-island", quantity: 5, sourceLine: 11 },
        ],
      }),
      deckCards: [],
      commanderOracleId: KORVOLD,
      deckUnresolved: [],
      cardFor,
    });
    // First line wins: the row points at where the card first appears.
    expect(result.in).toEqual([
      { oracleId: "o-island", ...cardFor("o-island"), sourceLine: 10, quantity: 9, auto: false },
    ]);
  });
});

// A pair deck's second half decides the identity jointly with the first, so a
// list naming a different one is a different deck for the same reason. Before
// `(Partner)` was readable this could not arise from a tag; now it can.
describe("planDeckUpdate — the pair's second half", () => {
  const PARTNER = "o-partner";
  const OTHER = "o-other-partner";

  it("refuses a list declaring a different partner", () => {
    const result = planDeckUpdate({
      parsed: parsed({
        cards: [{ oracleId: "o-sol-ring", quantity: 1, sourceLine: 3 }],
        declaredPartner: { oracleId: OTHER, name: "Tana, the Bloodsower", sourceLine: 2 },
      }),
      deckCards: [card("o-sol-ring")],
      commanderOracleId: KORVOLD,
      partnerOracleId: PARTNER,
      deckUnresolved: [],
      cardFor,
    });

    // The deck's own PARTNER is named on the other side of the banner, not its
    // primary: the disagreement being refused is about the pair's second half.
    expect(result).toEqual({ listCommander: "Tana, the Bloodsower", deckOracleId: PARTNER });
  });

  // A deck with no partner is not a pair, so any declared one changes what the
  // deck is.
  it("refuses a declared partner on a deck that leads alone", () => {
    const result = planDeckUpdate({
      parsed: parsed({
        declaredPartner: { oracleId: OTHER, name: "Tana, the Bloodsower", sourceLine: 2 },
      }),
      deckCards: [],
      commanderOracleId: KORVOLD,
      partnerOracleId: null,
      deckUnresolved: [],
      cardFor,
    });

    // No partner to name, so the primary stands for what this deck is.
    expect(result).toEqual({ listCommander: "Tana, the Bloodsower", deckOracleId: KORVOLD });
  });

  it("plans normally when the declared partner is this deck's own", () => {
    const result = plan({
      parsed: parsed({
        cards: [{ oracleId: "o-sol-ring", quantity: 1, sourceLine: 3 }],
        declaredPartner: { oracleId: PARTNER, name: "Sidar Kondo", sourceLine: 2 },
      }),
      deckCards: [card("o-sol-ring")],
      commanderOracleId: KORVOLD,
      partnerOracleId: PARTNER,
      deckUnresolved: [],
      cardFor,
    });

    expect(result.noChange).toBe(true);
  });

  // An export lists the pair; neither half fills a slot in the 99. The
  // commander's line was already dropped and the partner's was not, so an
  // untagged partner line arrived as a card going IN to its own deck.
  it("drops the deck's own partner from the list rather than adding it", () => {
    const result = plan({
      parsed: parsed({
        cards: [
          { oracleId: PARTNER, quantity: 1, sourceLine: 2 },
          { oracleId: "o-sol-ring", quantity: 1, sourceLine: 3 },
        ],
      }),
      deckCards: [card("o-sol-ring")],
      commanderOracleId: KORVOLD,
      partnerOracleId: PARTNER,
      deckUnresolved: [],
      cardFor,
    });

    expect(result.in).toEqual([]);
    expect(result.noChange).toBe(true);
  });
});
