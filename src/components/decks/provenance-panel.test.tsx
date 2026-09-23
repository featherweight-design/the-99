import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BRACKET_RULES_SOURCE, SPELLBOOK_SOURCE } from "../../lib/bracket/sources";
import { deckAnalysisCopy } from "../../lib/copy/deck-analysis";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { ProvenanceOpener } from "./provenance-panel";

const copy = deckAnalysisCopy;

function draw() {
  render(
    <CardDetailProvider fetchCard={async () => null}>
      <ProvenanceOpener />
    </CardDetailProvider>,
  );
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

  it("draws four rows, and a misses line on every one but game changers", () => {
    draw();
    expect(screen.getAllByRole("term").map((t) => t.textContent)).toEqual([
      "Game changers", "Mass land denial", "Extra turns", "Two-card infinites",
    ]);
    expect(screen.getByText(copy.detection.extraTurns.misses)).toBeTruthy();
    expect(screen.getByText(copy.detection.combos.misses)).toBeTruthy();
  });

  // The rules are a blog post and can move, so the row links the post and dates the last read.
  it("links the published rules and Spellbook, and dates when the rules were checked", () => {
    draw();
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual([BRACKET_RULES_SOURCE.url, SPELLBOOK_SOURCE.url]);
    expect(screen.getByText(copy.provenance.rulesChecked("22 Sep 2026"))).toBeTruthy();
  });
});
