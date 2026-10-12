import { describe, expect, it } from "vitest";
import { addedCopyEnabled } from "./added-copy-flag";

const on = (env: Record<string, string>) => addedCopyEnabled(env as NodeJS.ProcessEnv);

describe("addedCopyEnabled", () => {
  it("is on only with both switches on", () => {
    expect(on({ ADDED_COPY_ENABLED: "true", COLLECTION_EDIT_ENABLED: "true" })).toBe(true);
    expect(on({ ADDED_COPY_ENABLED: "true" })).toBe(false);
    expect(on({ COLLECTION_EDIT_ENABLED: "true" })).toBe(false);
  });

  it("is off for anything but the exact string", () => {
    expect(on({ ADDED_COPY_ENABLED: "TRUE", COLLECTION_EDIT_ENABLED: "true" })).toBe(false);
    expect(on({ ADDED_COPY_ENABLED: "1", COLLECTION_EDIT_ENABLED: "true" })).toBe(false);
  });
});
