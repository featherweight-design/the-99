import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { slotDeck } from "../../lib/bracket/slot";
import type { ComboRef, FlagSource } from "../../lib/profile/types";
import { deckAnalysisCopy } from "../../lib/copy/deck-analysis";
import { COMMANDER, deckProfile, population, profileCard } from "./__fixtures__/deck-profile";
import { VerdictBlock, analyzedWhen } from "./verdict-block";
import { DIM_OPACITY } from "./bracket-mark";

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
  /**
   * `[3]` reached by TWO rules at the bracket below, which is the only way two can co-occur.
   *
   * At bracket 1 the only rule that can fire alone is extra turns — anything else violates
   * bracket 2 as well and the deck is no longer `[2]`. At bracket 2 mass land denial violates
   * bracket 3 too, so what is left is game changers beside a combo: both are capped at zero
   * there, neither moves bracket 3, and the combo's pieces are unreachable so the deck does not
   * climb to `[4]`.
   */
  "3-two-rules": () =>
    deckProfile({
      cards: [
        COMMANDER,
        profileCard("rhystic", "Rhystic Study"),
        profileCard("p1", "Thassa's Oracle"),
        profileCard("p2", "Demonic Consultation"),
      ],
      gameChangerIds: new Set(["rhystic"]),
      twoCardCombos: [combo(["p1", "p2"])],
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

const drawn = (key: keyof typeof SHAPES) => {
  const profile = SHAPES[key]();
  return { verdict: slotDeck(profile), profile };
};

const draw = (key: keyof typeof SHAPES, permits = key as string) => {
  const profile = SHAPES[key]();
  const verdict = slotDeck(profile);
  expect(verdict.permits.join(",")).toBe(permits);
  render(<VerdictBlock analyzedAt={new Date().toISOString()} verdict={verdict} profile={profile} />);
  return verdict;
};

describe("the head (Analysis tab handoff §2, row 2)", () => {
  // A RANGE draws both marks, the upper at 0.65 with a `/` between them, and names both brackets.
  // No label, no pill, and no `Split`: the redrawn box retires all three.
  it("names both brackets beside both marks on a range", () => {
    draw("4,5");
    expect(screen.getByTestId("verdict-name").textContent).toBe("Optimized or cEDH");
    const marks = within(screen.getByTestId("verdict-marks")).getAllByTestId("bracket-mark");
    expect(marks.map((m) => m.dataset.bracket)).toEqual(["4", "5"]);
    expect((marks[1].parentElement as HTMLElement).style.opacity).toBe(String(DIM_OPACITY));
    expect(screen.getByTestId("verdict-marks").textContent).toContain("/");
    expect(screen.queryByText("Split")).toBeNull();
    expect(screen.queryByRole("heading", { name: deckAnalysisCopy.verdict.heading })).toBeNull();
  });

  it("names one bracket once, beside one mark, on an exact reading", () => {
    draw("3");
    expect(screen.getAllByText("Upgraded")).toHaveLength(1);
    expect(screen.getAllByTestId("bracket-mark")).toHaveLength(1);
  });

  // THE LOWER MEMBER INKS THE NAME, derived rather than listed: `[1,2]` takes `--bracket-1`.
  it("inks the name from the range's lower member", () => {
    draw("1,2");
    expect(screen.getByTestId("verdict-name").getAttribute("style")).toContain("var(--bracket-1)");
  });

  it("dates the reading under the name", () => {
    draw("3");
    expect(screen.getByTestId("verdict-analyzed").textContent).toBe("analyzed a moment ago");
  });
});

describe("analyzedWhen", () => {
  const at = new Date("2026-09-18T12:00:00Z");
  const after = (ms: number) => new Date(at.getTime() + ms);
  it("is a moment, then minutes, then the short date at the hour", () => {
    expect(analyzedWhen(at, after(30_000))).toBe("a moment ago");
    expect(analyzedWhen(at, after(60_000))).toBe("1 minute ago");
    expect(analyzedWhen(at, after(59 * 60_000))).toBe("59 minutes ago");
    expect(analyzedWhen(at, after(60 * 60_000))).toBe("18 Sep");
  });
});

describe("the sub-line", () => {
  it("asks for intent at the bottom of the low range and the top of the high one", () => {
    draw("1,2");
    expect(screen.getByText(deckAnalysisCopy.verdict.intentLow)).toBeTruthy();
    // ROUND 3 RETIRED THE RINGED `?`: the declaration's own chips ask the question now.
    expect(screen.queryByText("?")).toBeNull();
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

  // THE INVARIANT, not a figure nothing can produce. `ruledOutAllowance`'s `allows only N`
  // reading is unreachable from this component: `below` is 1, 2 or 3; every rule caps at zero at
  // 1 and 2, and `below === 3` needs `[4]`, which arrives with `violatesB3` false and therefore
  // no bracket-3 violation to report. The copy function's other reading is covered directly in
  // `deck-analysis.test.ts`.
  it("says `none at all` on every ruled-out reading a deck can reach", () => {
    for (const key of ["2", "3", "3-two-rules"] as const) {
      const { unmount } = render(<VerdictBlock analyzedAt={new Date().toISOString()} {...drawn(key)} />);
      expect(screen.getByText(/allows none at all\./)).toBeTruthy();
      expect(screen.queryByText(/allows only/)).toBeNull();
      unmount();
    }
  });

  it("reads a one-rule deck as its count in words", () => {
    draw("3");
    expect(
      screen.getByText(
        "Two game changers, and Core allows none at all. Nothing else in the 99 reaches further.",
      ),
    ).toBeTruthy();
  });

  // BOTH RULES, joined. Naming one would let a reader cut those cards and find the answer
  // unmoved — and a single-rule fixture passes with `nameList(facts)` replaced by `facts[0]`,
  // which is what this shape exists to stop.
  it("reads a two-rule deck as both rules, joined", () => {
    draw("3-two-rules", "3");
    expect(
      screen.getByText(
        "One game changer and one two-card infinite, and Core allows none at all. Nothing else "
        + "in the 99 reaches further.",
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
    expect(screen.queryByText("?")).toBeNull();
  });
});

describe("the population line", () => {
  const withPopulation = (counts: Parameters<typeof population>[0], of: "commander" | "pair" = "commander") => {
    const profile = deckProfile({ population: population(counts, of) });
    render(<VerdictBlock analyzedAt={new Date().toISOString()} verdict={slotDeck(profile)} profile={profile} />);
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
    render(<VerdictBlock analyzedAt={new Date().toISOString()} verdict={slotDeck(profile)} profile={profile} />);
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
    render(<VerdictBlock analyzedAt={new Date().toISOString()} verdict={slotDeck(profile)} profile={profile} />);
    expect(screen.getByText(/Myrel, Shield of Argive and Tymna the Weaver decks/)).toBeTruthy();
  });
});
