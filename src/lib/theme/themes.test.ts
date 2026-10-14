import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseThemeBlocks } from "./parse-css";
import {
  DEFAULT_THEME,
  isThemeKey,
  RETIRED_THEMES,
  THEME_COOKIE,
  THEME_COOKIE_MAX_AGE,
  THEMES,
  themeCookieValue,
  themeFor,
} from "./themes";

const CSS = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "..", "..", "app", "globals.css"),
  "utf8",
);

describe("theme registry", () => {
  it("lists six themes in picker order, default first", () => {
    expect(THEMES.map((t) => t.key)).toEqual([
      "amonkhet",
      "kamigawa",
      "ixalan",
      "phyrexia",
      "eldraine",
      "kaldheim",
    ]);
    expect(DEFAULT_THEME).toBe("amonkhet");
  });

  it("carries the handoff's names verbatim", () => {
    expect(THEMES.map((t) => t.name)).toEqual([
      "Low Sun",
      "Neon Rain",
      "Canopy",
      "Oil Haze",
      "Witching Hour",
      "First Frost",
    ]);
  });

  // Both directions. A key with no block paints nothing; a block with no key is
  // a theme nobody can reach from the picker.
  it("matches the registry to globals.css exactly", () => {
    expect([...parseThemeBlocks(CSS).keys()].sort()).toEqual(THEMES.map((t) => t.key).sort());
  });

  // The default is declared on `:root, [data-theme="amonkhet"]` together, so a
  // picker chip can preview Low Sun under another theme. What matters is
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

  it("moves a retired id to its nearest survivor, not to the default", () => {
    expect(themeFor("innistrad")).toBe("phyrexia");
    expect(themeFor("duskmourn")).toBe("kaldheim");
  });

  it("keeps a live id and falls back to the default for anything else", () => {
    expect(themeFor("kaldheim")).toBe("kaldheim");
    expect(themeFor("ravnica")).toBe(DEFAULT_THEME);
    expect(themeFor(undefined)).toBe(DEFAULT_THEME);
  });

  // The id arrives from a cookie, so it can name anything Object.prototype has.
  // A membership test that walks the prototype chain resolves those to a member
  // with no survivor on it, and the caller paints `undefined` or throws.
  it.each(["toString", "__proto__", "constructor", "hasOwnProperty"])(
    "treats %s as an unknown id, not a retired one",
    (key) => {
      expect(themeFor(key)).toBe(DEFAULT_THEME);
    },
  );

  // A retired id whose survivor was itself retired would resolve to a block that
  // no longer exists — the unstyled shell the fallback is there to prevent.
  it("points every retired id at a theme that still exists", () => {
    for (const { survivor } of Object.values(RETIRED_THEMES)) {
      expect(isThemeKey(survivor)).toBe(true);
    }
  });

  // The two sets have to stay disjoint: a key in both would make `themeFor`
  // order-dependent and the picker's notice fire for a theme still on offer.
  it("retires no id that the picker still lists", () => {
    for (const key of Object.keys(RETIRED_THEMES)) {
      expect(THEMES.some((t) => t.key === key)).toBe(false);
    }
  });

  it("names the cookie and keeps it for a year", () => {
    expect(THEME_COOKIE).toBe("the99_theme");
    expect(THEME_COOKIE_MAX_AGE).toBe(60 * 60 * 24 * 365);
  });
});

describe("themeCookieValue", () => {
  it("reads the persisted id from a cookie string, wherever it sits", () => {
    expect(themeCookieValue("a=1; the99_theme=ixalan; b=2")).toBe("ixalan");
    expect(themeCookieValue("the99_theme=ixalan")).toBe("ixalan");
  });

  it("is undefined when the cookie is absent", () => {
    expect(themeCookieValue("")).toBeUndefined();
    expect(themeCookieValue("other_the99_theme=ixalan")).toBeUndefined();
  });
});
