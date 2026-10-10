import { describe, expect, it } from "vitest";
import { shoppingMarkBoughtEnabled } from "./mark-bought-flag";

const on = (env: Record<string, string>) => shoppingMarkBoughtEnabled(env as NodeJS.ProcessEnv);

describe("shoppingMarkBoughtEnabled", () => {
  it("is on only with both switches on", () => {
    expect(on({ SHOPPING_MARK_BOUGHT_ENABLED: "true", COLLECTION_EDIT_ENABLED: "true" })).toBe(true);
    expect(on({ SHOPPING_MARK_BOUGHT_ENABLED: "true" })).toBe(false);
    expect(on({ COLLECTION_EDIT_ENABLED: "true" })).toBe(false);
  });

  it("is off for anything but the exact string", () => {
    expect(on({ SHOPPING_MARK_BOUGHT_ENABLED: "TRUE", COLLECTION_EDIT_ENABLED: "true" })).toBe(false);
    expect(on({ SHOPPING_MARK_BOUGHT_ENABLED: "1", COLLECTION_EDIT_ENABLED: "true" })).toBe(false);
  });
});
