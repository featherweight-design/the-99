import { describe, expect, it } from "vitest";

import { buildPhraseIndex } from "./match";
import { emptyParams, parseChooseParams, READ_WORDS_MAX_CHARS } from "./params";
import { submitTarget } from "./submit";

const DS = "0000aaaa-0000-4000-8000-000000000001";
const SOL = "0000aaaa-0000-4000-8000-000000000002";
const index = buildPhraseIndex(
  [{ slug: "dinosaurs", label: "Dinosaurs" }, { slug: "landfall", label: "Landfall" }],
  [{ oracleId: DS, name: "Doubling Season" }, { oracleId: SOL, name: "Sol Ring" }],
);
const target = (over: Partial<ReturnType<typeof emptyParams>>) => submitTarget({ ...emptyParams(), ...over }, index);
const landed = (url: string) => {
  expect(url.startsWith("/decks/new/choose?")).toBe(true);
  return parseChooseParams(new URLSearchParams(url.split("?")[1]));
};

describe("the submit redirect", () => {
  it("lands on the results with the words resolved into answers and the words kept", () => {
    const p = landed(target({ words: "dinosaurs with Doubling Season under $150 bracket 2", colors: ["r", "g"] }));
    expect(p).toMatchObject({
      results: true,
      words: "dinosaurs with Doubling Season under $150 bracket 2",
      colors: ["r", "g"],
      themes: ["dinosaurs"],
      card: DS,
      budgetDollars: 150,
      bracket: 2,
    });
  });

  it("lets a control the player set beat the words, and lists the overridden figure under Not used", () => {
    const p = landed(target({ words: "landfall under $200", budgetDollars: 90, themes: ["dinosaurs"] }));
    expect(p.budgetDollars).toBe(90);
    expect(p.themes).toEqual(["dinosaurs", "landfall"]);
    expect(p.notUsed).toContain("$200");
  });

  it("carries a second card and the unmatched phrases in n, so the results never match again", () => {
    const p = landed(target({ words: "Doubling Season and Sol Ring, lots of little tokens" }));
    expect(p.card).toBe(DS);
    expect(p.notUsed).toEqual(expect.arrayContaining(["Sol Ring", "little tokens"]));
  });

  it("resolves only the words the results keep: nothing past the limit becomes an answer", () => {
    const p = landed(target({ words: `${"x".repeat(READ_WORDS_MAX_CHARS)} dinosaurs` }));
    expect(p.themes).toEqual([]);
    expect(p.words.length).toBeLessThanOrEqual(READ_WORDS_MAX_CHARS);
  });

  it("searches a blank submit with no index read at all", () => {
    expect(submitTarget(emptyParams(), null)).toBe("/decks/new/choose?v=results");
  });
});

describe("submitTarget's card and Not used order", () => {
  const OTHER = "0000aaaa-0000-4000-8000-0000000000bb";

  it("keeps a card the form carried, and lists a different one the words name as not used", () => {
    const kept = landed(target({ card: SOL, words: "with Doubling Season" }));
    expect(kept.card).toBe(SOL);
    expect(kept.notUsed).toContain("Doubling Season");
    expect(landed(target({ card: SOL })).card).toBe(SOL);
  });

  it("never lists the carried card as not used, wherever the words name it", () => {
    const p = landed(target({ card: DS, words: "Sol Ring and Doubling Season" }));
    expect(p.card).toBe(DS);
    expect(p.notUsed).toEqual(["Sol Ring"]);
  });

  it("lets the words supply the card when the carried one is no card the intake could offer", () => {
    const p = landed(target({ card: OTHER, words: "Sol Ring and Doubling Season" }));
    expect(p.card).toBe(SOL);
    expect(p.notUsed).toEqual(["Doubling Season"]);
  });

  it("lists the player's own phrases before a figure the controls set aside", () => {
    const p = landed(target({ words: "big energy under $300", budgetDollars: 100 }));
    expect(p.notUsed.indexOf("$300")).toBeGreaterThan(p.notUsed.indexOf("big energy"));
    expect(p.notUsed.indexOf("big energy")).toBeGreaterThanOrEqual(0);
  });
});
