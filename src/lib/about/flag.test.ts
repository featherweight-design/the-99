import { describe, expect, it } from "vitest";
import { aboutSheetEnabled } from "./flag";

const env = (v?: string) => (v === undefined ? {} : { ABOUT_SHEET_ENABLED: v }) as NodeJS.ProcessEnv;

describe("aboutSheetEnabled", () => {
  it("is on only for the exact string true", () => {
    expect(aboutSheetEnabled(env("true"))).toBe(true);
    expect(aboutSheetEnabled(env("1"))).toBe(false);
    expect(aboutSheetEnabled(env("TRUE"))).toBe(false);
    expect(aboutSheetEnabled(env(""))).toBe(false);
    expect(aboutSheetEnabled(env())).toBe(false);
  });
});
