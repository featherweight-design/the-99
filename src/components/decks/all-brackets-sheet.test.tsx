// The all-brackets reference sheet (addendum R3): its figures come from `rules.ts`, its notes quote
// Wizards once per rule, and it marks no reader's bracket.

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { COMBO_POLICY, EXTRA_TURN_LIMIT_BRACKET_1, GAME_CHANGER_LIMIT, MASS_LAND_DENIAL_LIMIT } from "../../lib/bracket/rules";
import { BRACKETS_INTRO_SOURCE, BRACKETS_OCT25_SOURCE, BRACKET_RULES_SOURCE } from "../../lib/bracket/sources";
import { deckAnalysisCopy } from "../../lib/copy/deck-analysis";
import { CardDetailProvider } from "../cards/card-detail-provider";
// The modal is loaded on demand; loaded here, after the mocks, a press draws it in the same tick.
await (await import("../cards/card-detail-provider")).warmCardModal();
import { AllBracketsSheet, allowance } from "./all-brackets-sheet";

const copy = deckAnalysisCopy.bracketsSheet;
const draw = () =>
  render(
    <CardDetailProvider fetchCard={async () => null}>
      <AllBracketsSheet onClose={() => {}} />
    </CardDetailProvider>,
  );

describe("allowance", () => {
  it("reads every figure off the rules' own constants", () => {
    expect([1, 2, 3, 4, 5].map((b) => allowance("gameChangers", b as 1))).toEqual([
      GAME_CHANGER_LIMIT[1], GAME_CHANGER_LIMIT[2], GAME_CHANGER_LIMIT[3], null, null,
    ]);
    expect([1, 2, 3, 4, 5].map((b) => allowance("massLandDenial", b as 1))).toEqual([
      MASS_LAND_DENIAL_LIMIT, MASS_LAND_DENIAL_LIMIT, MASS_LAND_DENIAL_LIMIT, null, null,
    ]);
    expect([1, 2, 3, 4, 5].map((b) => allowance("extraTurns", b as 1))).toEqual([EXTRA_TURN_LIMIT_BRACKET_1, null, null, null, null]);
    // Forbidden is none; the late-game rule at 3 is a timing no list can check.
    expect(COMBO_POLICY[3]).toBe("earlyGameOnly");
    expect([1, 2, 3, 4, 5].map((b) => allowance("twoCardCombos", b as 1))).toEqual([0, 0, null, null, null]);
  });
});

describe("AllBracketsSheet", () => {
  it("draws the rules as rows and the five brackets as columns, on desktop", () => {
    draw();
    const table = screen.getByTestId("brackets-sheet-table-wide");
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(5);
    expect(within(rows[0]).getAllByRole("columnheader").map((h) => h.textContent)).toEqual([
      "cards allowed", "Exhibition", "Core", "Upgraded", "Optimized", "cEDH",
    ]);
    expect(within(rows[1]).getAllByRole("cell").map((c) => c.textContent)).toEqual(["0", "0", "3", "no cap", "no cap"]);
    expect(within(rows[3]).getAllByRole("cell").map((c) => c.textContent)).toEqual(["0", "no cap", "no cap", "no cap", "no cap"]);
  });

  it("transposes on the phone: brackets as rows, the four rules as columns", () => {
    draw();
    const table = screen.getByTestId("brackets-sheet-table-narrow");
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(6);
    expect(within(rows[3]).getByRole("rowheader").textContent).toBe("Upgraded");
    expect(within(rows[3]).getAllByRole("cell").map((c) => c.textContent)).toEqual(["3", "0", "no cap", "no cap"]);
  });

  it("sets Upgraded's three alone in --fg / 600", () => {
    draw();
    const figures = screen.getAllByTestId("brackets-sheet-figure");
    const strong = figures.filter((f) => f.className.includes("font-semibold"));
    expect(strong.map((f) => f.textContent)).toEqual(["3", "3"]);
  });

  it("quotes Wizards once per note, in curly quotes, tagged with its post", () => {
    draw();
    const notes = screen.getAllByTestId("brackets-sheet-note");
    expect(notes).toHaveLength(6);
    const quotes = screen.getAllByTestId("brackets-sheet-quote").map((q) => q.textContent);
    expect(quotes[0]).toBe(`“${copy.quotes.gameChangers.text}”${copy.quoteTag.intro}`);
    expect(quotes[4]).toBe(`“${copy.quotes.tutors.text}”${copy.quoteTag.oct25}`);
    // The tutors note carries the findings' own `no limit` chip.
    expect(within(notes[4]).getByText(deckAnalysisCopy.findings.noLimit)).toBeTruthy();
    // Mass land denial has no reading of ours, only the quote.
    expect(notes[1].querySelectorAll("p")).toHaveLength(1);
  });

  it("names the rules' post and both quoted posts in its foot", () => {
    draw();
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual([BRACKET_RULES_SOURCE.url, BRACKETS_INTRO_SOURCE.url, BRACKETS_OCT25_SOURCE.url]);
  });

  // R2-A, confirmed by Hugh: a reference, not a second climb.
  it("marks no bracket as the reader's", () => {
    draw();
    const sheet = screen.getByTestId("brackets-sheet");
    expect(sheet.textContent).not.toContain(deckAnalysisCopy.climb.roleHere);
    // No row or header carries a rank's tint; the marks' own art paints with a background by design.
    const tinted = [...sheet.querySelectorAll<HTMLElement>("[style]")]
      .filter((e) => !e.closest("[data-testid='bracket-mark'], [aria-hidden='true']"))
      .filter((e) => /background/.test(e.getAttribute("style")!));
    expect(tinted).toEqual([]);
    expect(sheet.querySelector("[data-role='yours']")).toBeNull();
  });
});
