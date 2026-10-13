import { describe, expect, it } from "vitest";
import { PROMPT_VERSION } from "./prompt-version";

// The gate compares this number and not the model, so it is what makes a deck whose last run was made on
// the previous model run again on the one now in use. Moving the model without moving it leaves them closed.
describe("PROMPT_VERSION", () => {
  it("is 9: the model moved to Sonnet 5.5 and decks run at 8 must reopen", () => {
    expect(PROMPT_VERSION).toBe(9);
  });
});
