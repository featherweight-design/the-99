import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { ANSWER_TOKENS_WORST_CASE, MAX_SUGGESTIONS, MODEL_TIMEOUT_MS, THINKING_HEADROOM_TOKENS, TUNING_MAX_TOKENS, TUNING_RETRY_FLOOR_MS, intentTooLong, seededAnswersIntent, seededIntent } from "./limits";

// The deck page's maxDuration bounds the run's Server Action, so the model deadline must fit
// under it with room for the reads and writes around the call. Read from the page's source:
// Next requires the export to be a literal, and importing the page would pull in the server.
describe("MODEL_TIMEOUT_MS", () => {
  it("fits under the deck page's maxDuration, leaving time for the rest of the run", () => {
    // import.meta.url, not __dirname: Vitest runs tests as ESM.
    const page = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../app/decks/[id]/page.tsx"), "utf8");
    const match = page.match(/export const maxDuration = (\d+);/);
    expect(match).not.toBeNull();
    const maxDurationMs = Number(match![1]) * 1000;
    expect(MODEL_TIMEOUT_MS).toBeLessThan(maxDurationMs);
    expect(maxDurationMs - MODEL_TIMEOUT_MS).toBeGreaterThanOrEqual(10_000);
  });
});

describe("TUNING_RETRY_FLOOR_MS", () => {
  it("leaves a first attempt room to fail and still retry inside the deadline", () => {
    // A floor at or past the deadline would forbid every retry; one under the p50 attempt (32s)
    // would let most doomed retries start.
    expect(TUNING_RETRY_FLOOR_MS).toBeLessThan(MODEL_TIMEOUT_MS);
    expect(TUNING_RETRY_FLOOR_MS).toBeGreaterThan(32_000);
  });
});

describe("TUNING_MAX_TOKENS", () => {
  it("holds the schema's worst-case answer and room for adaptive thinking over it", () => {
    // The schema's caps, per suggestion: add, cut, rationale, short rationale, four citations.
    const chars = 200 + 200 + 400 + 80 + 4 * 160;
    // About four characters a token, and about 60 tokens of JSON keys and punctuation.
    const perSuggestion = Math.ceil(chars / 4) + 60;
    expect(ANSWER_TOKENS_WORST_CASE).toBeGreaterThanOrEqual(perSuggestion * MAX_SUGGESTIONS);
    expect(TUNING_MAX_TOKENS).toBeGreaterThanOrEqual(ANSWER_TOKENS_WORST_CASE + THINKING_HEADROOM_TOKENS);
  });
});

describe("intentTooLong", () => {
  it("accepts an intent at the cap and refuses one over it", () => {
    expect(intentTooLong("a".repeat(120))).toBe(false);
    expect(intentTooLong("a".repeat(121))).toBe(true);
    expect(intentTooLong("")).toBe(false);
  });

  it("counts code points, as the column does", () => {
    // 120 emoji are 240 UTF-16 units and 120 code points: the column stores them.
    expect(intentTooLong("🂡".repeat(120))).toBe(false);
    expect(intentTooLong("🂡".repeat(121))).toBe(true);
  });
});

describe("seededIntent", () => {
  it("names the commander in the whole sentence when it fits", () => {
    expect(seededIntent(["Gisa, Glorious Resurrector"])).toBe(
      "Built around Gisa, Glorious Resurrector, from the cards you own.",
    );
  });

  it("names a pair as a pair", () => {
    expect(seededIntent(["Tymna the Weaver", "Thrasios, Triton Hero"])).toContain(
      "Tymna the Weaver and Thrasios, Triton Hero",
    );
  });

  // The catalog's longest names run past 60 characters, and a pair of them is past the cap.
  it("never returns more than the cap, counting code points, however long the names", () => {
    const long = "Asmoranomardicadaistinaculdacar ".repeat(3).trim();
    for (const names of [[long], [long, long], ["\u{1F600}".repeat(200)]]) {
      const intent = seededIntent(names);
      expect(intentTooLong(intent)).toBe(false);
      expect(intent.startsWith("Built around ")).toBe(true);
    }
    expect(seededIntent([long, long]).endsWith("….")).toBe(true);
  });
});

describe("seededAnswersIntent (F2)", () => {
  const none = { themes: [], cardName: null, budgetDollars: null, bracket: null };

  it("writes every answer as the brief", () => {
    expect(seededAnswersIntent(["Gishath, Sun's Avatar"], { themes: ["Dinosaurs"], cardName: "Doubling Season", budgetDollars: 150, bracket: 3 }))
      .toBe("Built around Gishath, Sun's Avatar: Dinosaurs, with Doubling Season, under $150, bracket 3.");
  });

  it("names two themes as a list", () => {
    expect(seededAnswersIntent(["Gishath, Sun's Avatar"], { ...none, themes: ["Dinosaurs", "Ramp", "Landfall"] }))
      .toBe("Built around Gishath, Sun's Avatar: Dinosaurs, Ramp and Landfall.");
  });

  it("falls back to the commander and its themes when the whole sentence is over the cap", () => {
    const long = "A".repeat(80);
    const s = seededAnswersIntent(["Gishath, Sun's Avatar"], { themes: ["Dinosaurs"], cardName: long, budgetDollars: 150, bracket: 3 });
    expect(s).toBe("Built around Gishath, Sun's Avatar: Dinosaurs.");
  });

  it("falls back to seededIntent when even that is over, and with nothing asked", () => {
    const names = ["Gishath, Sun's Avatar"];
    expect(seededAnswersIntent(names, { ...none, themes: ["T".repeat(120)] })).toBe(seededIntent(names));
    expect(seededAnswersIntent(names, none)).toBe(seededIntent(names));
  });

  it("never passes the cap, counted in code points", () => {
    const s = seededAnswersIntent(["Æ".repeat(200)], { themes: ["Ω".repeat(50)], cardName: "x", budgetDollars: 1, bracket: 1 });
    expect([...s].length).toBeLessThanOrEqual(120);
  });
});
