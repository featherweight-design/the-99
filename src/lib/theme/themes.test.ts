import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseThemeBlocks } from "./parse-css";
import { DEFAULT_THEME, isThemeKey, THEME_COOKIE, THEME_COOKIE_MAX_AGE, THEMES } from "./themes";

const CSS = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "..", "..", "app", "globals.css"),
  "utf8",
);

describe("theme registry", () => {
  it("lists six themes in picker order, default first", () => {
    expect(THEMES.map((t) => t.key)).toEqual([
      "amonkhet",
      "kamigawa",
      "innistrad",
      "phyrexia",
      "duskmourn",
      "kaldheim",
    ]);
    expect(DEFAULT_THEME).toBe("amonkhet");
  });

  it("carries the handoff's names verbatim", () => {
    expect(THEMES.map((t) => t.name)).toEqual([
      "Gilded Stone",
      "Neon Rain",
      "Moonlit",
      "Oil and Iron",
      "Screen Glow",
      "Rune Frost",
    ]);
  });

  // Both directions. A key with no block paints nothing; a block with no key is
  // a theme nobody can reach from the picker.
  it("matches the registry to globals.css exactly", () => {
    expect([...parseThemeBlocks(CSS).keys()].sort()).toEqual(THEMES.map((t) => t.key).sort());
  });

  // The default is declared on `:root, [data-theme="amonkhet"]` together, so a
  // picker chip can preview Gilded Stone under another theme. What matters is
  // that :root is one of the two: an unrecognised data-theme has to land on a
  // complete theme rather than on bare tokens, and only :root guarantees that.
  it("keeps the default on :root, so an unknown theme degrades to a whole one", () => {
    expect(CSS).toContain(`:root,\n[data-theme="${DEFAULT_THEME}"] {`);
  });

  it("guards against anything else", () => {
    expect(isThemeKey("kaldheim")).toBe(true);
    expect(isThemeKey("ravnica")).toBe(false);
    expect(isThemeKey(undefined)).toBe(false);
    expect(isThemeKey("")).toBe(false);
  });

  it("names the cookie and keeps it for a year", () => {
    expect(THEME_COOKIE).toBe("the99_theme");
    expect(THEME_COOKIE_MAX_AGE).toBe(60 * 60 * 24 * 365);
  });
});
