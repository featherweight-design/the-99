import { describe, expect, it } from "vitest";

import { storePreferenceEnabled } from "./flag";

const env = (e: Record<string, string>) => e as unknown as NodeJS.ProcessEnv;

describe("storePreferenceEnabled", () => {
  it("is on for exactly 'true'", () => {
    expect(storePreferenceEnabled(env({ STORE_PREFERENCE_ENABLED: "true" }))).toBe(true);
    for (const v of ["", "1", "TRUE", "on", "false"]) expect(storePreferenceEnabled(env({ STORE_PREFERENCE_ENABLED: v }))).toBe(false);
    expect(storePreferenceEnabled(env({}))).toBe(false);
  });
});
