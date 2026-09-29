import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TUTOR_DETECTION } from "../../lib/bracket/rules";
import { BRACKET_RULES_SOURCE, SPELLBOOK_SOURCE } from "../../lib/bracket/sources";
import { deckAnalysisCopy } from "../../lib/copy/deck-analysis";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { DeckPageSwitches } from "./deck-page-switches";
import { ProvenanceOpener } from "./provenance-panel";

const copy = deckAnalysisCopy;

function draw(howItWorks?: boolean) {
  const opener = (
    <CardDetailProvider fetchCard={async () => null}>
      <ProvenanceOpener />
    </CardDetailProvider>
  );
  render(howItWorks === undefined ? opener : <DeckPageSwitches howItWorks={howItWorks}>{opener}</DeckPageSwitches>);
  fireEvent.click(screen.getByRole("button", { name: new RegExp(copy.provenance.toggle) }));
}

describe("How we make these decisions", () => {
  // 3c: an opener with the tab's arrow, and a sheet titled by what was pressed.
  it("opens a sheet named by its opener, and closes it", () => {
    render(
      <CardDetailProvider fetchCard={async () => null}>
        <ProvenanceOpener />
      </CardDetailProvider>,
    );
    const opener = screen.getByRole("button", { name: new RegExp(copy.provenance.toggle) });
    expect(opener.getAttribute("aria-haspopup")).toBe("dialog");
    expect(screen.queryByText(copy.provenance.lead)).toBeNull();
    fireEvent.click(opener);
    const sheet = screen.getByRole("dialog", { name: copy.provenance.toggle });
    expect(within(sheet).getByText(copy.provenance.lead)).toBeTruthy();
    fireEvent.click(within(sheet).getByRole("button", { name: copy.sheets.closeProvenance }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("draws five rows, and a misses line on every one but game changers", () => {
    draw();
    expect(screen.getAllByRole("term").map((t) => t.textContent)).toEqual([
      "Game changers", "Mass land denial", "Extra turns", "Two-card infinites", "Tutors",
    ]);
    expect(screen.getByText(copy.detection.extraTurns.misses)).toBeTruthy();
    expect(screen.getByText(copy.detection.combos.misses)).toBeTruthy();
  });

  // Brief §5.5: the tutor row states its measured basis, and the size of the set it was measured on.
  it("gives tutors a row with the measured basis and the size of the set", () => {
    draw();
    expect(screen.getByText(copy.detection.tutors.from).textContent).toContain(TUTOR_DETECTION.basis);
    expect(screen.getByText(copy.detection.tutors.misses).textContent).toContain("974");
  });

  // The rules are a blog post and can move, so the row links the post and dates the last read.
  it("links the published rules and Spellbook, and dates when the rules were checked", () => {
    draw();
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual([BRACKET_RULES_SOURCE.url, SPELLBOOK_SOURCE.url]);
    expect(screen.getByText(copy.provenance.rulesChecked("22 Sep 2026"))).toBeTruthy();
  });

  // About's "How the app reaches its answers" (Hugh, 2026-09-28): the tags appear here too, behind
  // HOW_IT_WORKS_ENABLED. Off (or outside the provider) the sheet is exactly as it was.
  it("draws no method tag with the switch off, or outside the provider", () => {
    for (const on of [undefined, false]) {
      draw(on);
      expect(document.querySelectorAll("[data-method]")).toHaveLength(0);
      fireEvent.click(screen.getByRole("button", { name: copy.sheets.closeProvenance }));
      document.body.innerHTML = "";
    }
  });

  it("tags each row with how its count is reached when the switch is on", () => {
    draw(true);
    const tags = screen.getAllByRole("term").map((t) =>
      [...t.querySelectorAll("[data-method]")].map((el) => el.getAttribute("data-method")),
    );
    expect(tags).toEqual([["list"], ["rules", "decks"], ["rules", "decks"], ["decks"], ["rules"]]);
    expect(screen.getAllByRole("term")[0].textContent).toContain("published list");
  });

  // Brief §5.1: the count reads Scryfall's copy of Wizards' list, and the sentence says so.
  it("names Scryfall as what the Game Changer count reads", () => {
    draw();
    expect(screen.getByText(copy.detection.gameChangers.from).textContent).toMatch(/Scryfall/);
  });
});
