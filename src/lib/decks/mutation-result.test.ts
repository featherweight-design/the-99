import { describe, expect, it } from "vitest";
import type { DeckAddRejection } from "./add-validation";
import { deckAddRejectionMessage } from "./mutation-result";

const rejections: DeckAddRejection[] = [
  "deck-full",
  "not-commander-legal",
  "off-color-identity",
  "is-commander",
];

describe("deckAddRejectionMessage", () => {
  it("gives every rejection its own plain-language reason", () => {
    const messages = rejections.map(deckAddRejectionMessage);
    expect(new Set(messages).size).toBe(rejections.length);
    for (const message of messages) {
      expect(message).not.toMatch(/[!]/);
      expect(message.length).toBeGreaterThan(20);
    }
  });

  it("names the 99-card cap so the user knows what to do", () => {
    expect(deckAddRejectionMessage("deck-full")).toContain("99");
  });
});
