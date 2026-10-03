import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { slotDeck } from "../../lib/bracket/slot";
import type { Bracket } from "../../lib/bracket/types";
import type { ComboRef, FlagSource } from "../../lib/profile/types";
import { deckAnalysisCopy } from "../../lib/copy/deck-analysis";
import { BracketClimb, NEIGHBOUR_OPACITY, YOURS_TINT } from "./bracket-climb";
import { COMMANDER, deckProfile, profileCard } from "./__fixtures__/deck-profile";
import { contrast, mixOklab } from "../../lib/theme/color";
import { parseThemeBlocks } from "../../lib/theme/parse-css";
import { CardDetailProvider } from "../cards/card-detail-provider";

/**
 * Every case is a REAL profile through the REAL verdict. The climb's three rungs are a function
 * of the permitted range, and a hand-written verdict can hold a range `permitsFor` never returns
 * — the climb would then be tested against a deck that cannot exist.
 */

const PARTNER = profileCard("cmd2", "Tymna the Weaver");

const combo = (pieces: string[]): ComboRef => ({
  variantId: "v1",
  cards: pieces.map((p) => ({ oracleId: p, name: p })),
  produces: ["Infinite mana"],
  bracketTag: "casual",
  usesCommander: false,
  manaValueNeeded: null,
  manaNeeded: null,
  steps: null,
  notablePrerequisites: null,
});

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
  "4,5": () =>
    deckProfile({
      cards: [COMMANDER, ...["a", "b", "c", "d"].map((id) => profileCard(id, `GC ${id}`))],
      gameChangerIds: new Set(["a", "b", "c", "d"]),
    }),
  /** Both pieces in the command zone, so no removal can break the combo. */
  blocked: () =>
    deckProfile({
      cards: [COMMANDER, PARTNER],
      commanderOracleIds: [COMMANDER.oracleId, PARTNER.oracleId],
      twoCardCombos: [combo([COMMANDER.oracleId, PARTNER.oracleId])],
    }),
};

const draw = (key: keyof typeof SHAPES, declared: Bracket | null = null) => {
  const profile = SHAPES[key]();
  const verdict = slotDeck(profile);
  render(<BracketClimb verdict={verdict} profile={profile} locked={new Set()} declared={declared} />);
  return verdict;
};

const rungs = () => screen.getAllByTestId("climb-rung");
const copy = deckAnalysisCopy.climb;

describe("which rungs are drawn", () => {
  // THREE, NOT FIVE. The brackets a deck is nowhere near are not drawn, which is what removed
  // the repeated "ruled out" line by construction.
  it("draws the bracket below, yours and the one above", () => {
    draw("3");
    expect(rungs().map((r) => `${r.dataset.bracket}:${r.dataset.role}`)).toEqual([
      "2:below",
      "3:yours",
      "4:above",
    ]);
  });

  // A range puts `yours` at its LOWER member: the deck is at the bottom of what it permits until
  // the player says otherwise, so `[1,2]` is a rung at 1 with 2 above it and no rung below.
  it("draws two rungs at the bottom of the ladder", () => {
    draw("1,2");
    expect(rungs().map((r) => `${r.dataset.bracket}:${r.dataset.role}`)).toEqual([
      "1:yours",
      "2:above",
    ]);
  });

  // Three, not two: `climb` puts `yours` at the range's lower member, so `[4,5]` is a rung at 4
  // with 3 below it and 5 above. Only a deck at 1 or at 5 loses a rung.
  it("draws three rungs on the high range, with the claimable one above", () => {
    draw("4,5");
    expect(rungs().map((r) => `${r.dataset.bracket}:${r.dataset.role}`)).toEqual([
      "3:below",
      "4:yours",
      "5:above",
    ]);
  });
});

describe("the rung that holds", () => {
  it("names only the rules the deck actually holds, with what the bracket allows", () => {
    draw("3");
    const yours = rungs().find((r) => r.dataset.role === "yours")!;
    const figures = within(yours).getAllByTestId("climb-figure").map((f) => f.textContent);
    expect(figures).toEqual(["Game changers23 allowed"]);
  });

  // `counted: false` is why an extra-turn figure at 2 prints `no cap` rather than an allowance:
  // that bracket REPORTS the count and attaches no verdict to it.
  it("prints no cap where the bracket reports a figure without capping it", () => {
    draw("2");
    const yours = rungs().find((r) => r.dataset.role === "yours")!;
    expect(within(yours).getByTestId("climb-figure").textContent).toBe("Extra turns1no cap");
  });

  // A rung listing four zeroes says nothing; the findings block below carries every count. And
  // an empty one draws NO sentence: the only one available is the rung above's, which the
  // contact sheet caught being drawn twice, one under the other, on a `[1,2]` deck.
  it("draws nothing at all when the deck holds none of them", () => {
    draw("1,2");
    const yours = rungs().find((r) => r.dataset.role === "yours")!;
    expect(within(yours).queryAllByTestId("climb-figure")).toHaveLength(0);
    expect(within(yours).queryByText(copy.aboveAllowed)).toBeNull();
    expect(screen.getAllByText(copy.aboveAllowed)).toHaveLength(1);
  });
});

describe("the rung below", () => {
  it("names the cards when there are one or two", () => {
    draw("2");
    const below = rungs().find((r) => r.dataset.role === "below")!;
    expect(below.textContent).toContain("Cut Time Warp: Exhibition allows none.");
  });

  // The LIMIT, not the excess: a deck cutting to reach Upgraded is told what it may keep.
  it("counts them and names the allowance above one or two", () => {
    draw("4,5");
    const below = rungs().find((r) => r.dataset.role === "below")!;
    expect(below.textContent).toContain("Cut one game changer, only three allowed at Upgraded.");
  });

  // THE ALLOWANCE COMES FROM THE TARGET'S REPORT, not from the cuttable pool. `upgradePath`
  // filters commanders out of `candidates` because a commander cannot be cut, so deriving the
  // limit from that list under-reports it by the number of commanders holding the rule: this
  // deck has four game changers, one of them its commander, and read "only two allowed".
  it("names the bracket's own allowance when a commander holds the rule", () => {
    const profile = deckProfile({
      cards: [COMMANDER, ...["a", "b", "c"].map((id) => profileCard(id, `GC ${id}`))],
      gameChangerIds: new Set([COMMANDER.oracleId, "a", "b", "c"]),
    });
    const verdict = slotDeck(profile);
    expect(verdict.permits).toEqual([4, 5]);
    render(<BracketClimb verdict={verdict} profile={profile} locked={new Set()} />);
    const below = rungs().find((r) => r.dataset.role === "below")!;
    expect(below.textContent).toContain("only three allowed at Upgraded");
  });

  // `upgradePath.blocked` is a real state, not an error: a combo whose only pieces are the two
  // commanders cannot be broken by removing a card.
  it("says so when no removal can reach the bracket below", () => {
    draw("blocked");
    const below = rungs().find((r) => r.dataset.role === "below")!;
    expect(below.textContent).toContain("what puts this deck past it is in the command zone");
  });
});

describe("the rung above", () => {
  it("says nothing rules it out on a single reading", () => {
    draw("3");
    const above = rungs().find((r) => r.dataset.role === "above")!;
    expect(within(above).getByText(copy.aboveAllowed)).toBeTruthy();
    expect(within(above).queryByRole("img")).toBeNull();
  });

  // THE `above` RUNG OF A RANGE POINTS AT THE ANSWER rather than asking. Round 3 moved the ask
  // into the verdict block and retired the ringed `?` that sat here: one ask per surface.
  it("points the declare rung at the block above, with no glyph", () => {
    draw("4,5");
    const above = rungs().find((r) => r.dataset.role === "above")!;
    expect(within(above).getByText(copy.declare)).toBeTruthy();
    expect(within(above).queryByRole("img")).toBeNull();
    expect(within(above).queryByText("?")).toBeNull();
    expect(within(above).getByText(copy.roleDeclare)).toBeTruthy();
  });

  // H34, superseded by addendum F: once the range is answered the in-range rungs remap to
  // `declared`/`permitted` rather than reading as the plain rung above. See "the declared range"
  // below for the full remap; this just confirms the ask and the dashed border are gone.
  it("stops asking once the range is answered", () => {
    draw("4,5", 5);
    const permitted = rungs().find((r) => r.dataset.role === "permitted")!;
    expect(within(permitted).queryByText(copy.declare)).toBeNull();
    expect(within(permitted).queryByText(copy.roleDeclare)).toBeNull();
    expect(permitted.className).not.toContain("border-dashed");
  });

  it("keeps asking over a declaration the range does not permit", () => {
    draw("4,5", 2);
    const above = rungs().find((r) => r.dataset.role === "above")!;
    expect(within(above).getByText(copy.declare)).toBeTruthy();
  });

  it("carries no declare line where the range does not reach it", () => {
    draw("1,2");
    const above = rungs().find((r) => r.dataset.role === "above")!;
    expect(within(above).queryByText(copy.declare)).toBeNull();
    expect(within(above).getByText(copy.roleAbove)).toBeTruthy();
  });
});

describe("the marks", () => {
  // The neighbour rungs mount the mark TWICE because 22 is the chip form and 26 the full one:
  // different files, and a CSS rule cannot swap a mask across a breakpoint.
  it("draws the chip form and the full form on a neighbour, and one full mark on yours", () => {
    draw("3");
    const below = rungs().find((r) => r.dataset.role === "below")!;
    expect(
      within(below).getAllByTestId("bracket-mark").map((m) => m.dataset.form),
    ).toEqual(["chip", "full"]);
    const yours = rungs().find((r) => r.dataset.role === "yours")!;
    const mine = within(yours).getAllByTestId("bracket-mark");
    expect(mine).toHaveLength(1);
    expect(mine[0].dataset.form).toBe("full");
  });

  // "Do not drop the bracket mark at 390" is one of the three things the handoff lists as most
  // likely to get broken in build.
  it("gives every rung a mark", () => {
    draw("4,5");
    for (const rung of rungs()) {
      expect(within(rung).getAllByTestId("bracket-mark").length).toBeGreaterThan(0);
    }
  });
});

// "The climb states, the findings open." The ONE control is Round 4's: the lower rung's
// `what would have to go →`, which opens the upgrade path as a sheet (3b).
it("has nothing to press but the path's own opener and the reference sheet's link", () => {
  draw("3");
  const buttons = screen.queryAllByRole("button");
  expect(buttons.map((b) => b.dataset.testid ?? "path")).toEqual(["path", "see-all-brackets"]);
  expect(buttons.every((b) => b.getAttribute("aria-haspopup") === "dialog")).toBe(true);
  expect(screen.queryAllByRole("link")).toHaveLength(0);
});

// THE TWO FIGURES THE THEME CONTRACT COMPOSITES AGAINST, read back off the rendered rung. The
// contract imports the same constants, so without these a rung drawn at any other opacity or tint
// would pass it: the contract would be measuring a number the component had stopped using.
describe("what the theme contract measures is what the rung draws", () => {
  it("tints the rung that holds with YOURS_TINT of its own ink", () => {
    draw("3");
    const yours = rungs().find((r) => r.dataset.role === "yours")!;
    expect(yours.getAttribute("style")).toContain(
      `color-mix(in oklab, var(--bracket-3) ${YOURS_TINT * 100}%, var(--surface))`,
    );
  });

  it("draws a neighbour's mark at NEIGHBOUR_OPACITY, at both widths", () => {
    draw("3");
    const below = rungs().find((r) => r.dataset.role === "below")!;
    const marks = within(below).getAllByTestId("bracket-mark");
    expect(marks).toHaveLength(2);
    for (const mark of marks) {
      expect((mark.parentElement as HTMLElement).style.opacity).toBe(String(NEIGHBOUR_OPACITY));
    }
  });
});

// Addendum R2 (2a): the yours rung's TEXT reads in `--fg`; its ink stays on the mark, border and
// tint. The rank's ink as text on its own tinted rung read 3.90 on Exhibition in kaldheim.

describe("the yours rung's text", () => {
  it("draws in --fg, never the rank's ink", () => {
    draw("3");
    const yours = rungs().find((r) => r.dataset.role === "yours")!;
    const name = within(yours).getByText("Upgraded");
    expect(name.className).toContain("text-[color:var(--fg)]");
    expect(name.getAttribute("style")).toBeNull();
    // The role label ("where your cards are") too: its colour is set inline, so read it there.
    const role = within(yours).getByText(copy.roleHere).parentElement!;
    expect(role.style.color).toBe("var(--fg)");
    for (const f of within(yours).getAllByTestId("climb-figure")) {
      for (const span of f.querySelectorAll("span.font-mono")) expect(span.getAttribute("style")).toBeNull();
    }
  });

  it("clears 4.5:1 on its own tinted rung in every theme, at every rank", () => {
    const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "..", "app", "globals.css"), "utf8");
    const failures: string[] = [];
    let floor = Infinity;
    for (const [theme, tokens] of parseThemeBlocks(css)) {
      for (const rank of [1, 2, 3, 4, 5]) {
        const ground = mixOklab(tokens.get(`bracket-${rank}`)!, tokens.get("surface")!, YOURS_TINT);
        const ratio = contrast(tokens.get("fg")!, ground);
        floor = Math.min(floor, ratio);
        if (ratio < 4.5) failures.push(`${theme} bracket-${rank} ${ratio.toFixed(2)}`);
      }
    }
    expect(failures).toEqual([]);
    expect(floor).toBeGreaterThan(7.5);
  });
});

// ADDENDUM F, H34: once a range is answered, `climb()` still decides which three rungs draw —
// only the role of the two rungs INSIDE the range changes. A rung outside it (the 4-5 deck's
// rung 3) is untouched.
describe("the declared range", () => {
  it("1,2 declared 2: the declared rung takes the full treatment, the other reads permitted", () => {
    draw("1,2", 2);
    const declared = rungs().find((r) => r.dataset.bracket === "2")!;
    const permitted = rungs().find((r) => r.dataset.bracket === "1")!;
    expect(declared.dataset.role).toBe("declared");
    expect(permitted.dataset.role).toBe("permitted");
    expect(within(declared).getByText(copy.roleDeclared)).toBeTruthy();
    expect(within(permitted).getByText(copy.rolePermitted)).toBeTruthy();
    // No rung on an answered range reads "permits more than this deck uses". A 1/2 deck holds
    // none of the four rules by definition, so the declared rung's empty body is the existing
    // empty-cell rule (README note 2), not asserted here.
    expect(within(permitted).queryByText(copy.aboveAllowed)).toBeNull();
  });

  it("1,2 declared 1: the mirror of that", () => {
    draw("1,2", 1);
    const declared = rungs().find((r) => r.dataset.bracket === "1")!;
    const permitted = rungs().find((r) => r.dataset.bracket === "2")!;
    expect(declared.dataset.role).toBe("declared");
    expect(permitted.dataset.role).toBe("permitted");
    expect(within(declared).getByText(copy.roleDeclared)).toBeTruthy();
    expect(within(permitted).getByText(copy.rolePermitted)).toBeTruthy();
  });

  it("4,5 declared 5: rung 5 is declared with no cap, rung 4 is permitted with no sentence, rung 3 is untouched", () => {
    draw("4,5", 5);
    const below = rungs().find((r) => r.dataset.bracket === "3")!;
    const permitted = rungs().find((r) => r.dataset.bracket === "4")!;
    const declared = rungs().find((r) => r.dataset.bracket === "5")!;
    expect(below.dataset.role).toBe("below");
    expect(permitted.dataset.role).toBe("permitted");
    expect(declared.dataset.role).toBe("declared");
    expect(within(declared).getAllByText(copy.noCap).length).toBeGreaterThan(0);
    // No body at all on the permitted rung: no declare sentence, no allowance figures.
    expect(within(permitted).queryByText(copy.declare)).toBeNull();
    expect(within(permitted).queryAllByTestId("climb-figure")).toHaveLength(0);
    expect(within(permitted).getByText(copy.rolePermitted)).toBeTruthy();
  });

  it("4,5 declared 4: the mirror of that, rung 5 is no longer already allowed", () => {
    draw("4,5", 4);
    const declared = rungs().find((r) => r.dataset.bracket === "4")!;
    const permitted = rungs().find((r) => r.dataset.bracket === "5")!;
    expect(declared.dataset.role).toBe("declared");
    expect(permitted.dataset.role).toBe("permitted");
    expect(within(permitted).queryByText(copy.aboveAllowed)).toBeNull();
  });

  // The 40% border is a UI edge, not text — measured rather than asserted to a stated bar, since
  // READINESS carries no threshold for it (only "check it in build"). Report the worst case.
  it("measures the permitted border's contrast against --surface, every rank, every theme", () => {
    const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "..", "app", "globals.css"), "utf8");
    let floor = Infinity;
    for (const [, tokens] of parseThemeBlocks(css)) {
      for (const rank of [1, 2, 3, 4, 5]) {
        const mixed = mixOklab(tokens.get(`bracket-${rank}`)!, tokens.get("border")!, 0.4);
        const ratio = contrast(mixed, tokens.get("surface")!);
        floor = Math.min(floor, ratio);
      }
    }
    // Sanity only: the mix must actually read as distinct from the surface it sits on.
    expect(floor).toBeGreaterThan(1);
  });
});

describe("see all brackets", () => {
  it("opens the reference sheet from the climb's foot, and closes back to the link", () => {
    const profile = SHAPES["3"]();
    render(
      <CardDetailProvider fetchCard={async () => null}>
        <BracketClimb verdict={slotDeck(profile)} profile={profile} locked={new Set()} />
      </CardDetailProvider>,
    );
    const link = screen.getByTestId("see-all-brackets");
    expect(link.getAttribute("aria-haspopup")).toBe("dialog");
    expect(link.textContent).toContain("see all brackets");
    fireEvent.click(link);
    expect(screen.getByRole("dialog", { name: "All brackets" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close all brackets" }));
    expect(screen.queryByRole("dialog", { name: "All brackets" })).toBeNull();
  });
});
