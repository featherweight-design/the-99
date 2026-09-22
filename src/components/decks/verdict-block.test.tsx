import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { slotDeck } from "../../lib/bracket/slot";
import type { ComboRef, FlagSource } from "../../lib/profile/types";
import { deckAnalysisCopy } from "../../lib/copy/deck-analysis";
import { COMMANDER, deckProfile, population, profileCard } from "./__fixtures__/deck-profile";
import { VerdictBlock } from "./verdict-block";

/**
 * Every case here is built from a REAL profile through the REAL verdict, because the readings
 * this block draws are a function of the permitted range and nothing else. A hand-written
 * verdict could hold a range `permitsFor` never returns, and the block would then be tested
 * against a deck that cannot exist.
 */

const PARTNER = profileCard("cmd2", "Tymna the Weaver");

const combo = (pieces: string[]): ComboRef => ({
  variantId: "v1",
  cards: pieces.map((p) => ({ oracleId: p, name: p })),
  produces: ["Infinite mana"],
  bracketTag: "casual",
  usesCommander: true,
  manaValueNeeded: null,
  manaNeeded: null,
  steps: null,
  notablePrerequisites: null,
});

/** The five shapes `permitsFor` can return, each reached the way a real deck reaches it. */
const SHAPES = {
  "1,2": () => deckProfile(),
  "2": () =>
    deckProfile({
      cards: [COMMANDER, profileCard("time-warp", "Time Warp")],
      extraTurnFlags: new Map([["time-warp", ["oracle_rule"] as FlagSource[]]]),
    }),
  "3": () =>
    deckProfile({
      cards: [COMMANDER, profileCard("rhystic", "Rhystic Study"), profileCard("cyc", "Cyclonic Rift")],
      gameChangerIds: new Set(["rhystic", "cyc"]),
    }),
  // `violatesB3` FALSE and the combo assembles: both pieces sit in the command zone, so nothing
  // at bracket 3 was violated and what ruled it out is the assembly.
  "4": () =>
    deckProfile({
      cards: [COMMANDER, PARTNER],
      commanderOracleIds: [COMMANDER.oracleId, PARTNER.oracleId],
      twoCardCombos: [combo([COMMANDER.oracleId, PARTNER.oracleId])],
    }),
  "4,5": () =>
    deckProfile({
      cards: [COMMANDER, ...["a", "b", "c", "d"].map((id) => profileCard(id, `GC ${id}`))],
      gameChangerIds: new Set(["a", "b", "c", "d"]),
    }),
};

const draw = (key: keyof typeof SHAPES) => {
  const profile = SHAPES[key]();
  const verdict = slotDeck(profile);
  expect(verdict.permits.join(",")).toBe(key);
  render(<VerdictBlock verdict={verdict} profile={profile} />);
  return verdict;
};

describe("the face and the chip", () => {
  it("names both brackets and says Split on a range", () => {
    draw("4,5");
    expect(screen.getByText("Optimized or cEDH")).toBeTruthy();
    expect(screen.getByText(deckAnalysisCopy.verdict.splitChip)).toBeTruthy();
    const marks = screen.getAllByTestId("bracket-mark");
    expect(marks.map((m) => m.dataset.bracket)).toEqual(["4", "5"]);
  });

  it("names one bracket and draws one mark on an exact reading", () => {
    draw("3");
    // TWICE, and that is the drawing: the face names the bracket and the chip beside the mark
    // names it again, exactly as the canvas draws `Core` over `2 Core`.
    expect(screen.getAllByText("Upgraded")).toHaveLength(2);
    expect(screen.queryByText(deckAnalysisCopy.verdict.splitChip)).toBeNull();
    expect(screen.getAllByTestId("bracket-mark")).toHaveLength(1);
  });

  // THE LOWER MEMBER INKS THE PILL, derived rather than listed — `[1,2]` takes `--bracket-1` and
  // `[4,5]` takes `--bracket-4`, and a third range could not arrive inkless.
  it("inks the chip from the range's lower member", () => {
    draw("1,2");
    expect(screen.getByText("Split").getAttribute("style")).toContain("var(--bracket-1)");
  });
});

describe("the sub-line", () => {
  it("asks for intent at the bottom of the low range and the top of the high one", () => {
    draw("1,2");
    expect(screen.getByText(deckAnalysisCopy.verdict.intentLow)).toBeTruthy();
    expect(screen.getByRole("img", { name: deckAnalysisCopy.verdict.declareGlyphAria })).toBeTruthy();
  });

  // Both forms are in the DOM and exactly one is displayed; `display:none` is not announced, so
  // a screen reader hears one sentence rather than two.
  it("carries a narrower sentence for the phone on the high range", () => {
    draw("4,5");
    expect(screen.getByText(deckAnalysisCopy.verdict.intentHigh)).toBeTruthy();
    expect(screen.getByText(deckAnalysisCopy.verdict.intentHighShort)).toBeTruthy();
  });

  it("says what ruled the bracket below out, and counts it in words", () => {
    draw("2");
    expect(
      screen.getByText(
        "One extra-turn card, and Exhibition allows none at all. Nothing else in the 99 reaches further.",
      ),
    ).toBeTruthy();
  });

  it("names the allowance when the bracket below has room", () => {
    draw("4,5");
    // `[4,5]` is a range, so the ruled-out sentence is not drawn at all — the intent line is.
    expect(screen.queryByText(/allows only/)).toBeNull();
  });

  it("reads a two-rule deck as both rules", () => {
    draw("3");
    expect(
      screen.getByText(
        "Two game changers, and Core allows none at all. Nothing else in the 99 reaches further.",
      ),
    ).toBeTruthy();
  });

  // No violation at bracket 3 at all, so a violations-only reading would draw an empty sentence.
  it("says the combo assembled where nothing below was violated", () => {
    draw("4");
    expect(
      screen.getByText(
        "This deck can assemble a two-card infinite rather than draw into it, which is past "
        + "Upgraded. Nothing else in the 99 reaches further.",
      ),
    ).toBeTruthy();
  });

  it("draws no ringed glyph on an exact reading", () => {
    draw("3");
    expect(screen.queryByRole("img", { name: deckAnalysisCopy.verdict.declareGlyphAria })).toBeNull();
  });
});

describe("the population line", () => {
  const withPopulation = (counts: Parameters<typeof population>[0], of: "commander" | "pair" = "commander") => {
    const profile = deckProfile({ population: population(counts, of) });
    render(<VerdictBlock verdict={slotDeck(profile)} profile={profile} />);
  };

  it("carries the denominator inside the sentence", () => {
    withPopulation({ "1": 400, "2": 991 });
    expect(screen.getByText(deckAnalysisCopy.population.label)).toBeTruthy();
    expect(
      screen.getByText(
        (_, node) =>
          node?.textContent ===
          "Of the 1,391 Myrel, Shield of Argive decks that declared a bracket, 400 said Exhibition.",
      ),
    ).toBeTruthy();
  });

  // ABSENT, NEVER ZERO. A zero reads as "nobody plays this", which is a different and false
  // claim — and 27 commanders are in the first case.
  it("reports absent rather than zero where EDHREC has no declarations", () => {
    const profile = deckProfile();
    render(<VerdictBlock verdict={slotDeck(profile)} profile={profile} />);
    expect(
      screen.getByText("EDHREC has no declared brackets for Myrel, Shield of Argive."),
    ).toBeTruthy();
  });

  // A bracket nobody chose really is zero OF a known total, which is not the same as an absent
  // population — so this one prints the figure rather than the absent line.
  it("prints a zero for a bracket nobody chose, inside a known total", () => {
    withPopulation({ "2": 12 });
    expect(
      screen.getByText(
        (_, node) =>
          node?.textContent ===
          "Of the 12 Myrel, Shield of Argive decks that declared a bracket, 0 said Exhibition.",
      ),
    ).toBeTruthy();
  });

  it("names both commanders over a pair row", () => {
    const profile = deckProfile({
      cards: [COMMANDER, PARTNER],
      commanderOracleIds: [COMMANDER.oracleId, PARTNER.oracleId],
      population: population({ "1": 5 }, "pair"),
    });
    render(<VerdictBlock verdict={slotDeck(profile)} profile={profile} />);
    expect(screen.getByText(/Myrel, Shield of Argive and Tymna the Weaver decks/)).toBeTruthy();
  });
});
