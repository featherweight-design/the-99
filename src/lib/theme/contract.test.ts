import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { chroma, contrast, deltaEOk } from "./color";
import { parseThemeBlocks } from "./parse-css";

// import.meta.url, not __dirname: Vitest runs tests as ESM.
const CSS = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "..", "..", "app", "globals.css"),
  "utf8",
);
const THEMES = parseThemeBlocks(CSS);

// The 35 keys, spelled out rather than derived from :root. Derived, a token
// dropped from every theme at once would still pass.
const CONTRACT = [
  "bg", "surface", "surface-raised", "surface-rail", "surface-sunken",
  "surface-inset", "elevated", "elevated-hover", "border", "border-strong",
  "border-dashed", "fg", "fg-body", "fg-muted", "fg-faint", "fg-locked",
  "accent", "accent-hover", "accent-strong", "accent-shadow", "accent-dim",
  "accent-mid", "success", "warning", "danger", "avail-soft", "avail-hard",
  "avail-hard-fg", "avail-over-fg", "avail-over-border", "w", "u", "b", "r", "g",
];

const ALIASES: Record<string, string> = {
  "avail-soft": "var(--fg-muted)",
  "avail-hard": "var(--accent)",
};

// The fit bar draws a three-step ramp from --accent-dim through --accent-mid to
// --accent. Outside that one component the two extra steps have no separate
// identity, so every theme sets them to the values it already has. Written down
// here so a theme block that duplicates any *other* pair is caught as the
// copy-paste it almost certainly is.
const INTENTIONAL_TWINS = [
  ["accent-dim", "accent-shadow"],
  ["accent-mid", "accent-strong"],
];

const SURFACES = [
  "bg", "surface", "surface-raised", "surface-rail", "surface-sunken",
  "surface-inset", "elevated", "elevated-hover",
];
const BORDERS = ["border", "border-strong", "border-dashed"];
const TEXT = ["fg", "fg-body", "fg-muted", "fg-faint", "fg-locked"];
const PIPS = ["w", "u", "b", "r", "g"];
const SEMANTICS = ["success", "warning", "danger"];

const entries = [...THEMES.entries()];

describe("theme contract", () => {
  it("finds at least the default theme", () => {
    expect(THEMES.has("amonkhet")).toBe(true);
  });

  describe.each(entries)("%s", (name, tokens) => {
    const hex = (key: string) => {
      const value = tokens.get(key);
      if (!value) throw new Error(`${name} is missing --${key}`);
      return value;
    };

    it("declares exactly the 35 contract keys", () => {
      expect([...tokens.keys()].sort()).toEqual([...CONTRACT].sort());
    });

    it("writes every value as a hex, except the two aliases", () => {
      for (const key of CONTRACT) {
        if (key in ALIASES) expect(hex(key)).toBe(ALIASES[key]);
        else expect(hex(key)).toMatch(/^#[0-9A-F]{6}$/i);
      }
    });

    it("gives every key its own value, bar the fit-bar ramp", () => {
      const twin = new Map(INTENTIONAL_TWINS.flatMap(([a, b]) => [[a, b], [b, a]]));
      const seen = new Map<string, string>();
      for (const key of CONTRACT) {
        if (key in ALIASES) continue;
        const value = hex(key).toUpperCase();
        const owner = seen.get(value);
        if (owner && twin.get(key) !== owner) {
          expect.unreachable(`--${key} repeats --${owner} (${value})`);
        }
        if (!owner) seen.set(value, key);
      }
    });

    it("keeps surfaces under 0.02 chroma", () => {
      for (const key of SURFACES) expect(chroma(hex(key))).toBeLessThanOrEqual(0.02);
    });

    it("keeps borders under 0.04 chroma", () => {
      for (const key of BORDERS) expect(chroma(hex(key))).toBeLessThanOrEqual(0.04);
    });

    it("keeps the text ramp under 0.03 chroma", () => {
      for (const key of TEXT) expect(chroma(hex(key))).toBeLessThanOrEqual(0.03);
    });

    it("clears every contrast floor", () => {
      expect(contrast(hex("fg"), hex("bg"))).toBeGreaterThanOrEqual(7);
      expect(contrast(hex("fg-body"), hex("surface"))).toBeGreaterThanOrEqual(4.5);
      expect(contrast(hex("fg-muted"), hex("surface"))).toBeGreaterThanOrEqual(4.5);
      expect(contrast(hex("fg-faint"), hex("surface"))).toBeGreaterThanOrEqual(3);
      expect(contrast(hex("fg-locked"), hex("surface"))).toBeGreaterThanOrEqual(3);
      // The accent button's label is --bg, in every theme block present.
      expect(contrast(hex("bg"), hex("accent"))).toBeGreaterThanOrEqual(4.5);
      // The focus ring is the accent, drawn on the canvas.
      expect(contrast(hex("accent"), hex("bg"))).toBeGreaterThanOrEqual(3);
    });

    it("separates every pip and semantic from the accent by 0.10 delta-E", () => {
      for (const key of [...PIPS, ...SEMANTICS]) {
        expect(deltaEOk(hex(key), hex("accent"))).toBeGreaterThanOrEqual(0.1);
      }
    });

    it("separates every pip from every other pip by 0.10 delta-E", () => {
      for (let i = 0; i < PIPS.length; i++) {
        for (let j = i + 1; j < PIPS.length; j++) {
          expect(deltaEOk(hex(PIPS[i]), hex(PIPS[j]))).toBeGreaterThanOrEqual(0.1);
        }
      }
    });
  });
});
