import { describe, expect, it } from "vitest";
import { lineupEnabled } from "./lineup-flag";

describe("lineupEnabled", () => {
  it("is on for the exact string 'true' and off for anything else", () => {
    expect(lineupEnabled({ LINEUP_ENABLED: "true" } as unknown as NodeJS.ProcessEnv)).toBe(true);
    for (const v of [undefined, "", "1", "TRUE", "yes"]) expect(lineupEnabled({ LINEUP_ENABLED: v } as unknown as NodeJS.ProcessEnv)).toBe(false);
  });
});
