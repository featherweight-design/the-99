import { describe, expect, it } from "vitest";

import { preconUpgradeEnabled } from "./flag";

const env = (v: string | undefined) => ({ NODE_ENV: "test", PRECON_UPGRADE_ENABLED: v }) as NodeJS.ProcessEnv;

describe("preconUpgradeEnabled", () => {
  it("is on only for the exact string true", () => {
    expect(preconUpgradeEnabled(env("true"))).toBe(true);
    for (const v of [undefined, "", "on", "1", "TRUE", "off"]) expect(preconUpgradeEnabled(env(v))).toBe(false);
  });
});
