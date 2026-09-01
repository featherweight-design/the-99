import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseEdhrecPayload } from "./parse";

// import.meta.url, not __dirname: Vitest runs tests as ESM, where __dirname is undefined.
const fixture = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "__fixtures__", "muldrotha.json"), "utf8"));

describe("parseEdhrecPayload", () => {
  it("extracts a flat, deduped list of top card names from all cardlists", () => {
    const { topCards } = parseEdhrecPayload(fixture);
    expect(topCards.length).toBeGreaterThan(10);
    expect(topCards).toContain("Sol Ring");
    expect(new Set(topCards).size).toBe(topCards.length);
  });
  it("returns empty topCards for a malformed payload", () => {
    expect(parseEdhrecPayload({}).topCards).toEqual([]);
    expect(parseEdhrecPayload({ container: { json_dict: { cardlists: [{ cardviews: {} }] } } }).topCards).toEqual([]);
  });
  it("retains inclusion % when the payload carries num_decks/potential_decks", () => {
    const { inclusionByName } = parseEdhrecPayload(fixture);
    expect(inclusionByName["rhystic study"]).toBe(71);
  });
  it("prefers explicit inclusion when present", () => {
    const { inclusionByName } = parseEdhrecPayload(fixture);
    expect(inclusionByName["bolas's citadel"]).toBe(34.5);
  });
  it("omits cards without inclusion data", () => {
    const { inclusionByName } = parseEdhrecPayload(fixture);
    expect(inclusionByName["spore frog"]).toBeUndefined();
  });
  it("stores inclusionByName keys in lowercase for mixed-case card names", () => {
    const payload = {
      container: {
        json_dict: {
          cardlists: [
            {
              cardviews: [
                { name: "Sol Ring", num_decks: 500, potential_decks: 1000 },
              ],
            },
          ],
        },
      },
    };
    const { inclusionByName } = parseEdhrecPayload(payload);
    expect(inclusionByName["sol ring"]).toBe(50);
    expect(inclusionByName["Sol Ring"]).toBeUndefined();
  });
});

describe("parseEdhrecPayload — synergy", () => {
  // The committed muldrotha.json fixture is trimmed to `{ name }`, so `synergy`
  // cannot be proven present from the repo. These inline payloads carry it
  // rather than editing the fixture to assert a shape we have not observed
  // upstream — that would be fabricating evidence of the API's contract.
  const withCardviews = (cardviews: unknown[]) => ({
    container: { json_dict: { cardlists: [{ cardviews }] } },
  });

  it("collects synergy keyed lowercase when the payload carries it", () => {
    const { synergyByName } = parseEdhrecPayload(
      withCardviews([{ name: "Sol Ring", synergy: 0.23 }]),
    );
    expect(synergyByName["sol ring"]).toBe(0.23);
  });

  it("omits the key entirely when synergy is absent — never defaults to 0", () => {
    // 0 would render a real bar for no data. Absence is the drawn state.
    const { synergyByName } = parseEdhrecPayload(
      withCardviews([{ name: "Spore Frog", num_decks: 10, potential_decks: 100 }]),
    );
    expect(synergyByName).not.toHaveProperty("spore frog");
  });

  it("ignores a non-numeric synergy", () => {
    const { synergyByName } = parseEdhrecPayload(
      withCardviews([{ name: "Sol Ring", synergy: "0.23" }]),
    );
    expect(synergyByName).not.toHaveProperty("sol ring");
  });

  it("carries negative synergy through the parse layer unchanged", () => {
    // Sign is a suggest.ts concern (only positive lift surfaces); parse reports
    // what upstream said.
    const { synergyByName } = parseEdhrecPayload(
      withCardviews([{ name: "Bad Card", synergy: -0.4 }]),
    );
    expect(synergyByName["bad card"]).toBe(-0.4);
  });

  it("returns an empty synergy map for a payload with no cardlists", () => {
    expect(parseEdhrecPayload({}).synergyByName).toEqual({});
  });
});

const gisa = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "__fixtures__", "gisa.json"), "utf8"));

describe("parseEdhrecPayload — widened fields", () => {
  it("reads archetype tags from tag_counts, sorted by count descending", () => {
    const { tags } = parseEdhrecPayload(gisa);
    expect(tags[0]).toEqual({ slug: "zombies", label: "Zombies", count: 566 });
    expect(tags.map((t) => t.count)).toEqual([...tags.map((t) => t.count)].sort((a, b) => b - a));
  });

  it("falls back to panels.taglinks when tag_counts is absent — one source, one fallback", () => {
    const { tags } = parseEdhrecPayload({ ...gisa, tag_counts: undefined });
    expect(tags[0]).toEqual({ slug: "zombies", label: "Zombies", count: 566 });
  });

  it("reads bracket_counts and budget_counts from the top level", () => {
    const d = parseEdhrecPayload(gisa);
    expect(d.bracketCounts).toEqual({ "1": 15, "2": 608, "3": 329, "4": 78, "5": 5 });
    expect(d.budgetCounts).toEqual({ budget: 434, middle: 3481, expensive: 434 });
  });

  it("reads similar commander names", () => {
    const { similarNames } = parseEdhrecPayload(gisa);
    expect(similarNames).toContain("Ayara, First of Locthwain");
    expect(similarNames).toContain("Braids, Arisen Nightmare");
  });

  it("reads commander metadata from container.json_dict.card", () => {
    const d = parseEdhrecPayload(gisa);
    expect(d.deckCount).toBe(4349);
    expect(d.rank).toBe(649);
    expect(d.saltScore).toBeCloseTo(0.191, 3);
  });

  it("returns nulls, not zeros, when metadata is absent", () => {
    // A rank of 0 would read as the most popular commander in the game.
    const d = parseEdhrecPayload({});
    expect(d.deckCount).toBeNull();
    expect(d.rank).toBeNull();
    expect(d.saltScore).toBeNull();
  });

  it("returns the empty-but-present shape for a malformed payload", () => {
    const d = parseEdhrecPayload({});
    expect(d.tags).toEqual([]);
    expect(d.bracketCounts).toEqual({});
    expect(d.budgetCounts).toEqual({});
    expect(d.similarNames).toEqual([]);
  });

  it.each([NaN, Infinity, "648"])("omits a non-finite rank of %p", (rank) => {
    const d = parseEdhrecPayload({ container: { json_dict: { card: { rank } } } });
    expect(d.rank).toBeNull();
  });

  it("drops a tag whose count is non-finite rather than entering 0", () => {
    const { tags } = parseEdhrecPayload({ tag_counts: [{ slug: "x", value: "X", count: NaN }] });
    expect(tags).toEqual([]);
  });

  it("keeps the three pre-existing fields byte-identical for the same input", () => {
    // The widening is additive: every consumer on main must behave the same.
    const d = parseEdhrecPayload(fixture);
    expect(d.topCards).toContain("Sol Ring");
    expect(d.inclusionByName["rhystic study"]).toBe(71);
    expect(d.inclusionByName["bolas's citadel"]).toBe(34.5);
    expect(d.synergyByName).toEqual({});
  });
});

describe("parseEdhrecPayload — non-finite numbers", () => {
  // NaN and Infinity are both `typeof "number"`. Either reaching a tile draws a
  // bar of nonsense, which is worse than the honest omission a missing key gives.
  const withCardviews = (cardviews: unknown[]) => ({
    container: { json_dict: { cardlists: [{ cardviews }] } },
  });

  it.each([NaN, Infinity, -Infinity])("omits synergy of %p", (synergy) => {
    const { synergyByName } = parseEdhrecPayload(withCardviews([{ name: "Sol Ring", synergy }]));
    expect(synergyByName).not.toHaveProperty("sol ring");
  });

  it.each([NaN, Infinity])("omits explicit inclusion of %p", (inclusion) => {
    const { inclusionByName } = parseEdhrecPayload(withCardviews([{ name: "Sol Ring", inclusion }]));
    expect(inclusionByName).not.toHaveProperty("sol ring");
  });

  it("omits derived inclusion when num_decks is non-finite", () => {
    const { inclusionByName } = parseEdhrecPayload(
      withCardviews([{ name: "Sol Ring", num_decks: NaN, potential_decks: 100 }]),
    );
    expect(inclusionByName).not.toHaveProperty("sol ring");
  });

  it("omits derived inclusion when potential_decks is Infinity", () => {
    const { inclusionByName } = parseEdhrecPayload(
      withCardviews([{ name: "Sol Ring", num_decks: 10, potential_decks: Infinity }]),
    );
    expect(inclusionByName).not.toHaveProperty("sol ring");
  });
});
