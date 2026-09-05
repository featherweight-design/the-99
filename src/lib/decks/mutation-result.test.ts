import { describe, expect, it } from "vitest";
import type { DeckAddRejection } from "./add-validation";
import { deckAddRejectionMessage } from "./mutation-result";

const rejections: DeckAddRejection[] = [
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
});
