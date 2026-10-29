import { describe, expect, it } from "vitest";

import { compareHtml, type CompareDeck } from "./overview-stages-html.mjs";

const doc = {
  overview: [{ text: "A deck led by [[Meren of Clan Nel Toth]] <b>." }], strategy: [], winsBy: [{ text: "Grinds value." }], alternate: [],
  stages: [{ text: "Setup with [[Satyr Wayfinder]]." }, { text: "Engine." }, { text: "Close." }],
  keep: [{ text: "A cheap creature." }], sendBack: [{ text: "No creature." }], tips: [{ text: "Tip." }],
  keyCards: [{ card: "Viscera Seer", job: { text: "An outlet." } }], weaknesses: [{ text: "Moderate: hate." }],
};
const deck: CompareDeck = {
  id: "x", name: "Plunder the Graves", commanders: ["Meren of Clan Nel Toth"], kind: "precon", landLine: "Keep 2 to 4 lands.",
  old: { doc: { ...doc, stages: [], winsBy: [], strategy: [{ text: "Old step." }] }, refused: [{ section: "keyCards", reason: "over_budget" }], source: "stored" },
  new: { doc, refused: [], source: "stages" },
  checks: null,
};

describe("the side-by-side page", () => {
  const page = compareHtml("T", [deck], ["one line"]);
  it("shows the stage labels, Wins by, the old Core strategy and a refusal, marks as card names", () => {
    expect(page).toContain("<dt>Early</dt><dd>Setup with <span class=\"card\">Satyr Wayfinder</span>.</dd>");
    expect(page).toContain("<dt>Mid</dt>");
    expect(page).toContain("<dt>Close</dt>");
    expect(page).toContain("<dt>Wins by</dt>");
    expect(page).toContain("Core strategy");
    expect(page).toContain("Refused (over_budget)");
  });
  it("escapes what the model wrote, and stacks the columns below desktop width", () => {
    expect(page).toContain("&lt;b&gt;");
    expect(page).not.toContain("<b>.</b>");
    expect(page).toMatch(/@media \(min-width: 760px\) \{ \.pair \{ grid-template-columns: 1fr 1fr; \} \}/);
    expect(page).toContain('name="viewport"');
  });
});
