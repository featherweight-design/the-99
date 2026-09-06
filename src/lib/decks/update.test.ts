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
    lineCount: 0,
    notes: [],
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
      cardFor,
    });

    expect(result.out.map((r) => r.oracleId)).toEqual(["o-tithe"]);
    expect(result.in.map((r) => r.oracleId)).toEqual(["o-swords"]);
    expect(result.unchanged.map((r) => r.oracleId)).toEqual(["o-sol-ring"]);
    expect(result.in[0].name).toBe("Swords to Plowshares");
  });

  // A real list only changes the count of basics, and a diff announcing "your
  // Islands went 12 → 9" would bury the cards that actually left the deck.
  it("reconciles a quantity change silently, as unchanged", () => {
    const result = plan({
      parsed: parsed({ cards: [{ oracleId: "o-island", quantity: 9, sourceLine: 4 }] }),
      deckCards: [card("o-island", { quantity: 12 })],
      commanderOracleId: KORVOLD,
      cardFor,
    });
    expect(result.out).toHaveLength(0);
    expect(result.in).toHaveLength(0);
    expect(result.unchanged).toEqual([
      { oracleId: "o-island", ...cardFor("o-island"), sourceLine: null, quantity: 9, auto: true },
    ]);
  });

  // Silent in the diff, but still a write. Calling it "nothing changed" would
  // refuse the only change this list asks for.
  it("does not call a quantity-only list nothing changed", () => {
    const result = plan({
      parsed: parsed({ cards: [{ oracleId: "o-island", quantity: 9, sourceLine: 4 }] }),
      deckCards: [card("o-island", { quantity: 12 })],
      commanderOracleId: KORVOLD,
      cardFor,
    });
    expect(result.noChange).toBe(false);
  });

  it("calls a list that matches the deck exactly nothing changed", () => {
    const result = plan({
      parsed: parsed({ cards: [{ oracleId: "o-island", quantity: 12, sourceLine: 4 }] }),
      deckCards: [card("o-island", { quantity: 12 })],
      commanderOracleId: KORVOLD,
      cardFor,
    });
    expect(result.noChange).toBe(true);
  });

  // An export writes the commander into its own list. Putting it in the 99 would
  // change the deck's colour identity, so it is dropped rather than added.
  it("drops the deck's own commander from the list", () => {
    const result = plan({
      parsed: parsed({ cards: [{ oracleId: KORVOLD, quantity: 1, sourceLine: 5 }, { oracleId: "o-sol-ring", quantity: 1, sourceLine: 6 }] }),
      deckCards: [],
      commanderOracleId: KORVOLD,
      cardFor,
    });
    expect(result.in.map((r) => r.oracleId)).toEqual(["o-sol-ring"]);
  });

  it("refuses a list that declares a different commander", () => {
    const result = planDeckUpdate({
      parsed: parsed({ declaredCommander: { oracleId: ATRAXA, name: "Atraxa, Praetors' Voice", sourceLine: 1 } }),
      deckCards: [card("o-sol-ring")],
      commanderOracleId: KORVOLD,
      cardFor,
    });
    expect(result).toEqual({ listCommander: "Atraxa, Praetors' Voice" });
  });

  // A shortlist is not a declaration. Refusing on it would break every deck
  // whose ninety-nine includes a legend.
  it("does not refuse a list that merely contains a legend", () => {
    const result = plan({
      parsed: parsed({
        cards: [{ oracleId: "o-sol-ring", quantity: 1, sourceLine: 7 }],
        legendaryCandidates: [
          { oracleId: ATRAXA, name: "Atraxa, Praetors' Voice", sourceLine: 4, colorIdentity: ["W"], imageUri: null },
        ],
      }),
      deckCards: [],
      commanderOracleId: KORVOLD,
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
      cardFor,
    });
    expect(result.unresolved).toEqual(unresolved);
  });

  // The second way the "nothing changed" screen is reached: unnamed lines alone
  // are not a change, because they replace rows that say the same thing.
  it("reports no change when only the unnamed lines differ", () => {
    const result = plan({
      parsed: parsed({
        cards: [{ oracleId: "o-sol-ring", quantity: 1, sourceLine: 8 }],
        unresolved: [{ rawName: "Lotus Petal?", quantity: 1, sourceLine: 12 }],
      }),
      deckCards: [card("o-sol-ring")],
      commanderOracleId: KORVOLD,
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
      cardFor,
    });
    // First line wins: the row points at where the card first appears.
    expect(result.in).toEqual([
      { oracleId: "o-island", ...cardFor("o-island"), sourceLine: 10, quantity: 9, auto: false },
    ]);
  });
});
