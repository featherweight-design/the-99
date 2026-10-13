import { afterEach, describe, expect, it, vi } from "vitest";
import { inspect } from "node:util";
import { ENV_VIEW, envViewWith } from "./env-view";

describe("ENV_VIEW", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("reads a stubbed value through and prints as {}", () => {
    vi.stubEnv("ENV_VIEW_PROBE", "on");
    expect(ENV_VIEW.ENV_VIEW_PROBE).toBe("on");
    expect("ENV_VIEW_PROBE" in ENV_VIEW).toBe(true);
    // Booleans and a count only: were the view broken, a diff of the value itself would print the environment.
    expect(Object.keys(ENV_VIEW).length).toBe(0);
    expect(JSON.stringify(ENV_VIEW) === "{}").toBe(true);
    expect(inspect(ENV_VIEW) === "{}").toBe(true);
  });

  it("lays its overrides over the environment, and still prints as {}", () => {
    vi.stubEnv("ENV_VIEW_PROBE", "on");
    vi.stubEnv("ENV_VIEW_OTHER", "kept");
    const env = envViewWith({ ENV_VIEW_PROBE: "off" });
    expect(env.ENV_VIEW_PROBE).toBe("off");
    expect(env.ENV_VIEW_OTHER).toBe("kept");
    expect(Object.keys(env).length).toBe(0);
    expect(inspect(env) === "{}").toBe(true);
  });
});
