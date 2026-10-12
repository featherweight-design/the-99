import { describe, expect, it } from "vitest";
import { deckNotesEnabled } from "./notes-flag";

describe("deckNotesEnabled", () => {
  it.each([undefined, "", "1", "TRUE", "yes", "false"])("is off for %j", (v) => {
    expect(deckNotesEnabled({ DECK_NOTES_ENABLED: v } as unknown as NodeJS.ProcessEnv)).toBe(false);
  });
  it("is on only for the exact string true", () => {
    expect(deckNotesEnabled({ DECK_NOTES_ENABLED: "true" } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });
});
