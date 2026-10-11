import { describe, expect, it } from "vitest";
import { allDecksCartEnabled } from "./all-decks-cart-flag";

describe("allDecksCartEnabled", () => {
  it("is on only for the exact string", () => {
    expect(allDecksCartEnabled({ ALL_DECKS_CART_ENABLED: "true" } as unknown as NodeJS.ProcessEnv)).toBe(true);
    expect(allDecksCartEnabled({ ALL_DECKS_CART_ENABLED: "TRUE" } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(allDecksCartEnabled({} as NodeJS.ProcessEnv)).toBe(false);
  });
});
