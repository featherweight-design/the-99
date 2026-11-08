import { describe, expect, it } from "vitest";
import { publicLandingEnabled } from "./flag";

describe("publicLandingEnabled", () => {
  it("is on only when the variable is exactly 'true', and off when unset", () => {
    expect(publicLandingEnabled({ PUBLIC_LANDING_ENABLED: "true" } as NodeJS.ProcessEnv)).toBe(true);
    expect(publicLandingEnabled({} as NodeJS.ProcessEnv)).toBe(false);
    expect(publicLandingEnabled({ PUBLIC_LANDING_ENABLED: "false" } as NodeJS.ProcessEnv)).toBe(false);
    expect(publicLandingEnabled({ PUBLIC_LANDING_ENABLED: "on" } as NodeJS.ProcessEnv)).toBe(false);
  });
});
