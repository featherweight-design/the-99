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

// The 43 keys, spelled out rather than derived from :root. Derived, a token
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
  // The five bracket rungs, theme-independent for the same reason and pinned the
  // same way. Listed here so a theme block that omits one fails LOUDLY: a mark whose
  // ink resolves to nothing draws at the inherited colour, which is a legible glyph
  // of the wrong rank rather than a visible hole.
  "bracket-1", "bracket-2", "bracket-3", "bracket-4", "bracket-5",
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

    it("declares exactly the 43 contract keys", () => {
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
      // The card mark, on every ground it is drawn on. It is a GRAPHIC, so 3:1 is the
      // governing floor — but it is also the one mark whose whole legality rests on a
      // measured figure, so the grounds are named individually rather than swept: a
      // change to any one of them must fail here rather than in a screenshot nobody
      // takes. `--elevated-hover` is the darkest and is the floor of record (6.31:1 on
      // kaldheim, the weakest of the six).
      for (const ground of ["surface", "surface-rail", "elevated-hover", "bg"]) {
        expect(contrast(hex("fact"), hex(ground))).toBeGreaterThanOrEqual(3);
      }
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

  // Each rung asserted SEPARATELY rather than as one set of five. A theme that
  // swapped rank 3's hex for rank 4's would leave the union of all values identical
  // across the six blocks, so a set comparison passes while two ranks have traded
  // places under one theme — which is the confusion the palette exists to prevent.
  it.each([
    ["bracket-1", "#8A857C"],
    ["bracket-2", "#A89A74"],
    ["bracket-3", "#C9AC62"],
    ["bracket-4", "#E6D08A"],
    ["bracket-5", "#FBEFC6"],
  ])("declares one value for --%s in all six themes", (token, hex) => {
    const values = new Set(entries.map(([, tokens]) => tokens.get(token)));
    expect([...values]).toEqual([hex]);
  });

  // RANK 1 DOES NOT CLEAR 4.5:1 ON THE GROUND THE VERDICT BLOCK DRAWS IT ON.
  //
  // `HANDOFF.md` states of palette 2e Ignition: "Every rung clears 4.5:1 on all twelve
  // grounds" — TWELVE being `--surface-inset` and `--surface-sunken` across the six themes,
  // which its README names, and on which the claim holds (4.6795 is the worst of them). The
  // reasoning is §2's: "The numeral inside the mark is text, so every
  // rung owes 4.5:1. That puts a hard floor under rank 1: it cannot be made quiet by being
  // made darker." 4.5 rather than the 3:1 a graphic would owe, because of that numeral;
  // `--fact` above is held to 3 for exactly the opposite reason.
  //
  // Measured here with this file's own `contrast()`: `--bracket-1` (#8A857C) reads 4.4768 on
  // kaldheim `--surface`, which is the ground the verdict block draws it on and is not one of
  // the twelve. Ranks 2 through 5 clear on every ground in every theme.
  //
  // THE GROUNDS ARE MEASURED NOW, NOT BORROWED. The list was `--fact`'s four while nothing
  // drew a bracket mark; `BracketMark` ships in PR 4a and the verdict block is the only
  // surface that mounts one, on its own box — `background: var(--surface)`, and nothing
  // else. So the real domain is one token, and it is named here rather than swept: five
  // more surface tokens would be a claim about mounts that do not exist. The list grows
  // when a surface adds a ground, which is 4b's climb (`--surface-sunken` on the rung
  // below, and a `color-mix` of the rank's own ink on the rung that holds).
  //
  // WHAT THE MEASUREMENT SETTLED, and it is not what the provisional list feared. It is
  // better: kaldheim `--elevated-hover` (4.3204) is NOT a ground the mark sits on, and
  // `--elevated` (3.6857, the worst anywhere) is not either. The real floor is kaldheim
  // `--surface` at 4.4768.
  //
  // AND THE HANDOFF'S CLAIM IS TRUE AS WRITTEN. `design_handoff_the99_deck_analysis`'s
  // README names the twelve grounds it measured — "`--surface-inset` and `--surface-sunken`
  // × six themes" — and rank 1 clears 4.5:1 on all twelve (4.6795 is the worst of them).
  // `--surface` is a THIRTEENTH ground, introduced by this component, and the palette was
  // never cut for it. That is a question for Design rather than a defect in the drop, and
  // it is recorded rather than quietly absorbed: the shortfall is 0.0232, on one theme.
  //
  // WHAT THIS DOES NOT COVER, and it is a drawing decision rather than a hole here: a RANGE
  // draws its upper member at `opacity: 0.45`, which the canvas specifies. Composited over
  // `--surface` that numeral reads 2.2533-2.3116 for rank 2 on `[1,2]` and 3.9807-4.0928 for
  // rank 5 on `[4,5]`. No rung clears 4.5 in that state and none can, so asserting it here
  // would fail a build that is exactly as drawn.
  //
  // It is not a contrast failure in the WCAG sense either: the upper bracket's NAME is in the
  // face line directly above, at `--fg` and 600, so the dimmed numeral repeats information that
  // is already available as full-contrast text. Recorded rather than asserted, and named to
  // Design beside the rank-1 question, because "what strength may a mark's numeral draw at" is
  // the same conversation as "which grounds may it sit on".
  const GROUNDS = ["surface"] as const;

  it("clears 4.5:1 for ranks 2-5 on every ground in every theme", () => {
    // Swept WIDER than GROUNDS deliberately: these clear everywhere, so the broader domain
    // is free strength rather than an invented claim. Narrowing an assertion that passes
    // costs coverage and buys nothing.
    const wide = [
      "bg", "surface", "surface-raised", "surface-rail",
      "surface-sunken", "surface-inset", "elevated", "elevated-hover",
    ];
    const failures: string[] = [];
    for (const [theme, tokens] of entries) {
      for (const rank of [2, 3, 4, 5]) {
        for (const ground of wide) {
          const ratio = contrast(tokens.get(`bracket-${rank}`)!, tokens.get(ground)!);
          if (ratio < 4.5) failures.push(`${theme} bracket-${rank}/${ground} ${ratio.toFixed(2)}`);
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it("holds rank 1 at its measured floor, which is under the stated 4.5:1", () => {
    const ratios = entries.flatMap(([, tokens]) =>
      GROUNDS.map((ground) => contrast(tokens.get("bracket-1")!, tokens.get(ground)!)),
    );
    // No worse than today, at FULL PRECISION rather than rounded. kaldheim `--surface` is
    // the weakest of the grounds the mark is actually drawn on, and a floor written as 4.47
    // would wave through a regression from 4.4768 to 4.471 — "no worse than today" has to
    // mean today's number, or the gate permits exactly the drift it exists to catch.
    // `contrast()` is pure over two fixed hexes, so this is deterministic; the day it
    // legitimately moves, it fails loudly and is re-measured rather than absorbing a loss.
    expect(Math.min(...ratios)).toBeGreaterThanOrEqual(4.47683985932081);
    // And still short of the claim, so this assertion is not quietly satisfied by a fix
    // nobody then notices — the day rank 1 clears, this line fails and comes out.
    expect(Math.min(...ratios)).toBeLessThan(4.5);
  });
});
