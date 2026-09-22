import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BRACKET_RULES_SOURCE, SPELLBOOK_SOURCE } from "../../lib/bracket/sources";
import { deckAnalysisCopy } from "../../lib/copy/deck-analysis";
import { ProvenancePanel } from "./provenance-panel";

const copy = deckAnalysisCopy;

describe("How we make these decisions", () => {
  it("is collapsed until pressed, and says so", () => {
    render(<ProvenancePanel />);
    const toggle = screen.getByRole("button", { name: new RegExp(copy.provenance.toggle) });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText(copy.provenance.lead)).toBeNull();
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText(copy.provenance.lead)).toBeTruthy();
  });

  it("draws four rows, and a misses line on every one but game changers", () => {
    render(<ProvenancePanel />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getAllByRole("term").map((t) => t.textContent)).toEqual([
      "Game changers", "Mass land denial", "Extra turns", "Two-card infinites",
    ]);
    expect(screen.getByText(copy.detection.extraTurns.misses)).toBeTruthy();
    expect(screen.getByText(copy.detection.combos.misses)).toBeTruthy();
  });

  // The rules are a blog post and can move, so the row links the post and dates the last read.
  it("links the published rules and Spellbook, and dates when the rules were checked", () => {
    render(<ProvenancePanel />);
    fireEvent.click(screen.getByRole("button"));
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual([BRACKET_RULES_SOURCE.url, SPELLBOOK_SOURCE.url]);
    expect(screen.getByText(copy.provenance.rulesChecked("22 Sep 2026"))).toBeTruthy();
  });
});
