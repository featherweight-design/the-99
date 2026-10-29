import { describe, expect, it } from "vitest";

import { compareHtml, type CompareDeck } from "./overview-stages-html.mjs";

const doc = {
  overview: [{ text: "A deck led by [[Meren of Clan Nel Toth]] <b>." }], strategy: [], winsBy: [{ text: "Grinds value." }], alternate: [], landKeep: [],
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

describe("the side-by-side page, iteration 3", () => {
  const three = { ...doc, winsBy: [], landKeep: [{ text: "Keep 4 lands: [[Meren of Clan Nel Toth]] costs 4." }] };
  const diy: CompareDeck = { ...deck, id: "d", name: "HD - Gods", kind: "player deck", new: { doc: three, refused: [], source: "stages" } };
  const precon: CompareDeck = { ...deck, new: { doc: { ...three, alternate: [{ text: "Lead with [[Grave Titan]]." }] }, refused: [], source: "stages" } };
  const table = {
    rows: [{ id: "d", name: "HD - Gods", kind: "player deck" as const, target: 4, stated: 3, why: "top-heavy", curve: { lands: 38, ramp: 10, nonland: 60, averageManaValue: 3.6, fivePlus: 15, twoOrLess: 12, commanderManaValue: 4, expectedLandsInSeven: 2.69 } }],
    distinctStated: [3], distinctTargets: [4], everyStatedIsTheDecks: false, differs: false,
  };
  const page = compareHtml("T", [diy, precon], [], table);
  const diyPart = page.slice(page.indexOf("<h2>HD - Gods</h2>"), page.indexOf("<h2>Plunder the Graves</h2>"));
  it("draws the land line in place of the fixed range on the new side, and keeps the range on the old", () => {
    expect(diyPart).toContain('<p class="landkeep">Keep 4 lands: <span class="card">Meren of Clan Nel Toth</span> costs 4.</p>');
    expect(diyPart.match(/class="fixed"/g)?.length).toBe(1);
  });
  it("draws a player's deck whole with no alternate and no Wins by, and tags a precon's alternate", () => {
    expect(diyPart).not.toContain("Alternate");
    expect(diyPart.split("Stages")[1]).not.toContain("Wins by");
    expect(page).toContain('<dt>Alternate <span class="scope">precon only</span></dt>');
  });
  it("tables each deck's land number, marking a stated number that is not the deck's", () => {
    expect(page).toContain("<h2>Land number by deck</h2>");
    expect(page).toContain("Does not differ across decks.");
    expect(page).toContain('<td class="bad">3</td>');
  });
});
