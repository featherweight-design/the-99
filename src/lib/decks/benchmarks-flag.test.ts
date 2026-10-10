import { describe, expect, it } from "vitest";
import { deckBenchmarksEnabled } from "./benchmarks-flag";

describe("deckBenchmarksEnabled", () => {
  it("is on only for exactly 'true'", () => {
    expect(deckBenchmarksEnabled({ DECK_BENCHMARKS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv)).toBe(true);
    for (const v of [undefined, "", "TRUE", "1", "false"]) {
      expect(deckBenchmarksEnabled({ DECK_BENCHMARKS_ENABLED: v } as unknown as NodeJS.ProcessEnv)).toBe(false);
    }
  });
});
