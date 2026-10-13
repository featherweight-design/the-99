// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { inlineCssEnabled } from "../../../next.config";

/** The config as a build reads it, with the switch set as given. */
async function configWith(value: string | undefined) {
  vi.resetModules();
  vi.stubEnv("INLINE_CSS_ENABLED", value);
  return (await import("../../../next.config")).default;
}

afterEach(() => vi.unstubAllEnvs());

describe("the inline CSS experiment", () => {
  it("is on only when its switch reads exactly true", () => {
    expect(inlineCssEnabled({ INLINE_CSS_ENABLED: "true" })).toBe(true);
    for (const v of [undefined, "", "false", "1", "TRUE"]) expect(inlineCssEnabled({ INLINE_CSS_ENABLED: v })).toBe(false);
  });

  it("reaches the config a build reads, and is off where the switch is unset", async () => {
    expect((await configWith("true")).experimental?.inlineCss).toBe(true);
    expect((await configWith(undefined)).experimental?.inlineCss).toBe(false);
  });
});
