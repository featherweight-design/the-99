import { describe, expect, it } from "vitest";
import { PROMPT_VERSION, PROMPT_VERSION_V2 } from "./prompt-version";

// The gate compares this number and not the model, so it is what makes a deck whose last run was made on
// the previous model run again on the one now in use. Moving the model without moving it leaves them closed.
describe("PROMPT_VERSION", () => {
  it("is 11: note dates read month first, as the log writes them, and decks run at 10 must reopen", () => {
    expect(PROMPT_VERSION).toBe(11);
  });
});

describe("PROMPT_VERSION_V2", () => {
  it("is 16: each listed card carries its rules text, and every call says to describe only what it lists", () => {
    expect(PROMPT_VERSION_V2).toBe(16);
  });
});
