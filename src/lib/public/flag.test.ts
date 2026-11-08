import { describe, expect, it } from "vitest";
import { publicLandingEnabled } from "./flag";

const env = (v: Record<string, string>) => v as unknown as NodeJS.ProcessEnv;

describe("publicLandingEnabled", () => {
  it("is on only when the variable is exactly 'true', and off when unset", () => {
    expect(publicLandingEnabled(env({ PUBLIC_LANDING_ENABLED: "true" }))).toBe(true);
    expect(publicLandingEnabled(env({}))).toBe(false);
    expect(publicLandingEnabled(env({ PUBLIC_LANDING_ENABLED: "false" }))).toBe(false);
    expect(publicLandingEnabled(env({ PUBLIC_LANDING_ENABLED: "on" }))).toBe(false);
  });
});
