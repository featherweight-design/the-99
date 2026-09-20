import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { chroma, contrast, deltaEOk, hueGap } from "./color";
import { parseThemeBlocks } from "./parse-css";

// import.meta.url, not __dirname: Vitest runs tests as ESM.
const CSS = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "..", "..", "app", "globals.css"),
  "utf8",
);
const THEMES = parseThemeBlocks(CSS);

// The 38 keys, spelled out rather than derived from :root. Derived, a token
// dropped from every theme at once would still pass.
const CONTRACT = [
  "bg", "surface", "surface-raised", "surface-rail", "surface-sunken",
  "surface-inset", "elevated", "elevated-hover", "border", "border-strong",
  "border-dashed", "fg", "fg-body", "fg-muted", "fg-faint", "fg-locked",
  "fg-disabled",
  "accent", "accent-hover", "accent-strong", "accent-shadow", "accent-dim",
  "accent-mid", "success", "warning", "danger", "avail-soft", "avail-hard",
  "avail-hard-fg", "avail-over-fg", "avail-over-border", "w", "u", "b", "r", "g",
  // Theme-INDEPENDENT, exactly as the WUBRG pips are: `--fact` marks a standing
  // bracket fact about a card, and a bracket fact is the format's vocabulary rather
  // than this app's mood. It is in CONTRACT because every theme must still declare
  // it — an unset custom property fails silently, which is the hazard check:tokens
  // exists for. What pins it to ONE VALUE across the six is the cross-theme test at
  // the foot of this file, NOT the duplicate check: that one rebuilds `seen` per
  // theme, so it can only ever compare keys within a single block.
  "fact",
  "font-display-face",
];

// Not a colour. Excluded from the hex assertion and from the duplicate check;
// the chroma, contrast and ΔE gates need no change, because each iterates
// SURFACES, BORDERS, TEXT, PIPS or SEMANTICS rather than CONTRACT, and the font
// key is in none of them.
const FONTS = new Set(["font-display-face"]);

// A face is the `next/font` variable, optionally followed by a hand-authored
// fallback family. No theme needs that tail today, but Next's capsize table
// misses families it has not caught up with — see the fallback branch in
// globals.test.ts. The variable stays anchored at the start so a face that is
// *only* a fallback still fails.
const FACE = /^var\(--font-[a-z-]+\)(, "[A-Za-z ]+ Fallback")?$/;

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
// --fg-disabled rides in the chroma gate below but not in the contrast one: it
// sits under the 3:1 floor the rest of the ramp clears, which is why nothing
// wearing it carries meaning of its own — only a padlock glyph and an
// aria-hidden numeral, each repeating a state the words beside it already give.
const TEXT = ["fg", "fg-body", "fg-muted", "fg-faint", "fg-locked", "fg-disabled"];
const PIPS = ["w", "u", "b", "r", "g"];
const SEMANTICS = ["success", "warning", "danger"];

const EXPECTED_THEMES = [
  "amonkhet", "kamigawa", "ixalan", "phyrexia", "eldraine", "kaldheim",
];

const entries = [...THEMES.entries()];

describe("theme contract", () => {
  it("declares all six themes", () => {
    expect([...THEMES.keys()].sort()).toEqual([...EXPECTED_THEMES].sort());
  });

  describe.each(entries)("%s", (name, tokens) => {
    const hex = (key: string) => {
      const value = tokens.get(key);
      if (!value) throw new Error(`${name} is missing --${key}`);
      return value;
    };

    it("declares exactly the 38 contract keys", () => {
      expect([...tokens.keys()].sort()).toEqual([...CONTRACT].sort());
    });

    it("writes every value as a hex, except the aliases and the face", () => {
      for (const key of CONTRACT) {
        if (FONTS.has(key)) expect(hex(key)).toMatch(FACE);
        else if (key in ALIASES) expect(hex(key)).toBe(ALIASES[key]);
        else expect(hex(key)).toMatch(/^#[0-9A-F]{6}$/i);
      }
    });

    it("gives every key its own value, bar the ramp and a settled accent", () => {
      const twin = new Map(INTENTIONAL_TWINS.flatMap(([a, b]) => [[a, b], [b, a]]));
      const seen = new Map<string, string>();
      for (const key of CONTRACT) {
        if (key in ALIASES || FONTS.has(key)) continue;
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
      // --avail-hard-fg exists so the "sleeved elsewhere" count reads as body
      // text rather than as decoration; the accent itself is often too dark.
      expect(contrast(hex("avail-hard-fg"), hex("surface"))).toBeGreaterThanOrEqual(7);
    });

    // --b shipped near-black, which cleared the ΔE gates below on lightness
    // alone while its --bg glyph was invisible against it. The floor is stated
    // for --b only: the other four pips are lighter than the canvas by design
    // and sit between 3.4 and 4.5, so a blanket 4.5 would fail them.
    it("carries a legible --bg glyph on the black pip", () => {
      expect(contrast(hex("bg"), hex("b"))).toBeGreaterThanOrEqual(4.5);
    });

    it("separates every pip and semantic from the accent by 0.10 delta-E", () => {
      for (const key of [...PIPS, ...SEMANTICS]) {
        expect(deltaEOk(hex(key), hex("accent"))).toBeGreaterThanOrEqual(0.1);
      }
    });

    // CANOPY ONLY, and deliberately so.
    //
    // ΔE cannot see this failure: shipped, Canopy's --success measured 0.132
    // from --g and passed every assertion in this file — because the suite
    // compares semantics to --accent and pips to each other, and never compares
    // a semantic to a pip. The two greens sat 0.5° apart at two lightnesses,
    // which reads as ONE green wherever an ownership dot sits beside a cost pip.
    //
    // The same 0.5° gap is still true of amonkhet, kamigawa, eldraine and
    // kaldheim, which share both hex values. They are NOT held to this floor:
    // Canopy was the reported clash because its accent is a third green, so
    // three greens share one surface rather than two, and whether the other four
    // read badly is a design question nobody has asked. Widening this to every
    // theme would fail four of them on contact.
    //
    // Pinning the property rather than the hex: reverting --success to the
    // shared value left all 1089 assertions green before this existed.
    it("separates Canopy's --success from its green pip by hue, not lightness", () => {
      if (name !== "ixalan") return;
      expect(hueGap(hex("success"), hex("g"))).toBeGreaterThanOrEqual(20);
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

describe("the display face", () => {
  it("reaches the utility through one level of indirection", () => {
    expect(CSS).toContain("--font-display: var(--font-display-face)");
  });

  it("gives each theme a different face", () => {
    // Read from the parsed map, not by slicing the raw CSS: a slice that runs
    // from a theme's selector to end-of-file will happily match the *next*
    // theme's declaration and report a missing face as present.
    // Each face is asserted present before the set is counted. A `Set` holds
    // every `undefined` as one member but a single missing face still leaves
    // six entries, so uniqueness alone would pass a theme that declares no
    // face at all whenever it is the only one missing.
    const faces = [...THEMES.entries()].map(([name, tokens]) => {
      const face = tokens.get("font-display-face");
      expect(face, `${name} declares no --font-display-face`).toMatch(FACE);
      return face;
    });
    expect(faces).toHaveLength(6);
    expect(new Set(faces).size).toBe(6);
  });

  it("never redefines --font-display inside a theme block", () => {
    for (const tokens of THEMES.values()) {
      expect(tokens.has("font-display")).toBe(false);
    }
  });
});

// Asserted ACROSS the six themes rather than within one. The duplicate check above
// runs inside `describe.each`, so it cannot see a token that drifted BETWEEN themes —
// a different hex for `--fact` under one `[data-theme]` leaves every one of its
// assertions green.
//
// `--fact` alone, deliberately. The WUBRG pips are theme-independent in spirit and
// not in fact: Canopy shifts `--g` to #527030 where the other five carry #4B7A46,
// because that theme's accent is itself green and the pip has to stay separable from
// it — which the hue gate above pins. Listing them here would have failed for a
// reason that is correct.
describe("theme-independent tokens", () => {
  it("declares one value for --fact in all six themes", () => {
    // A bracket fact is the FORMAT's vocabulary rather than this app's mood, so the
    // mark reads the same whatever theme the reader is in.
    const values = new Set(entries.map(([, tokens]) => tokens.get("fact")));
    expect([...values]).toEqual(["#8FA6BE"]);
  });
});
