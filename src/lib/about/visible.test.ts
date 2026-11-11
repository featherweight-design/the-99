import { describe, expect, it } from "vitest";
import { isFirstRun, lineKept, NEVER_SEEN } from "./visible";

const env = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;

describe("isFirstRun", () => {
  it("is a brand-new account alone: no floor and no ids", () => {
    expect(isFirstRun(NEVER_SEEN)).toBe(true);
    expect(isFirstRun({ version: 1, ids: [] })).toBe(false);
    expect(isFirstRun({ version: 0, ids: ["credits"] })).toBe(false);
  });
});

describe("lineKept", () => {
  it("keeps a line on a retired switch whatever its name is set to", () => {
    expect(lineKept("ANALYSIS_TAB_ENABLED", env({ ANALYSIS_TAB_ENABLED: "off" }))).toBe(true);
    expect(lineKept("!ANALYSIS_TAB_ENABLED", env({}))).toBe(false);
  });

  it("keeps a list only while every switch in it holds", () => {
    expect(lineKept(["ANALYSIS_TAB_ENABLED", "!ANALYSIS_TAB_ENABLED"], env({}))).toBe(false);
    expect(lineKept(["ANALYSIS_TAB_ENABLED", "TUNING_ENABLED"], env({}))).toBe(true);
  });
});
