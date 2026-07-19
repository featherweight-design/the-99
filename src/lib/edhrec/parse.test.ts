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
