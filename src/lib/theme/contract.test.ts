import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { chroma, contrast, deltaEOk, hueGap, mixOklab } from "./color";
import { NEIGHBOUR_OPACITY, YOURS_TINT } from "../../components/decks/bracket-climb";
import { DIM_OPACITY } from "../../components/decks/bracket-mark";
import { parseThemeBlocks } from "./parse-css";

// import.meta.url, not __dirname: Vitest runs tests as ESM.
const CSS = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "..", "..", "app", "globals.css"),
  "utf8",
);
const THEMES = parseThemeBlocks(CSS);

// The 44 keys, spelled out rather than derived from :root. Derived, a token
// dropped from every theme at once would still pass.
const CONTRACT = [
  "bg", "surface", "surface-raised", "surface-rail", "surface-sunken",
  "surface-inset", "elevated", "elevated-hover", "border", "border-strong",
  "border-dashed", "fg", "fg-body", "fg-muted", "fg-faint", "fg-placeholder", "fg-locked",
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
  // A placeholder is the muted ink lifted only where a theme's own would miss 4.5:1 (Kamigawa, Phyrexia), so in the
  // other four it repeats --fg-faint's hex on purpose, written out so a later --fg-faint change moves nothing here.
  ["fg-faint", "fg-placeholder"],
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

    it("declares exactly the 44 contract keys", () => {
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

  // THE BRACKET MARK IS A GRAPHICAL OBJECT, HELD TO 3:1 — ruled by the verdict addendum,
  // 2026-09-22, and it answers a question that had been unanswerable as posed.
  //
  // `HANDOFF.md` reasoned the mark to 4.5:1 from its numeral: "the numeral inside the mark is
  // text, so every rung owes 4.5:1". The addendum overturns the premise rather than the figure.
  // The mark is NEVER THE SOLE CARRIER of its meaning — `Core`, `Upgraded`, `Optimized or cEDH`
  // are written beside it every time it appears, at full opacity — so a reader who cannot
  // resolve the diamond has lost decoration, not information. That is WCAG 1.4.11's definition
  // of a non-text object, and its bar is 3:1.
  //
  // WHY THE 4.5 CHASE COULD NOT BE WON, which is the argument rather than the excuse: a
  // one-step lightening of `#8A857C` buys `--surface` (4.5372) and loses `--surface-raised`
  // (4.2631), and the next ground a later round adds restarts it. The palette was cut for two
  // grounds. Holding a graphic to a text bar is what made the game unwinnable.
  //
  // WHAT STILL OWES 4.5, and the scope is recorded here so it cannot quietly narrow: every
  // bracket NAME, every count, every allowance and every sentence. Those are text, they carry
  // the meaning, and they are drawn at full opacity in `--fg`, `--fg-body` or the rank's own
  // ink. The tests above cover the text tokens; this pair covers the mark.
  const GROUNDS = ["surface", "surface-sunken"] as const;

  // `opacity` composites in the PAINTED space, sRGB, not in OKLab: an element at alpha a is
  // `fg * a + bg * (1 - a)` per 8-bit channel. Distinct from `mixOklab`, which is what a
  // `color-mix(in oklab, …)` declaration paints.
  const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const over = (fg: string, bg: string, a: number) =>
    "#" + hex(fg)
      .map((c, i) => Math.round(c * a + hex(bg)[i] * (1 - a)).toString(16).padStart(2, "0"))
      .join("");

  it("clears 3:1 for every rank on every ground a mark is drawn on", () => {
    // Swept WIDER than GROUNDS deliberately: these clear everywhere, so the broader domain is
    // free strength rather than an invented claim. Narrowing an assertion that passes costs
    // coverage and buys nothing.
    const wide = [
      "bg", "surface", "surface-raised", "surface-rail",
      "surface-sunken", "surface-inset", "elevated", "elevated-hover",
    ];
    const failures: string[] = [];
    for (const [theme, tokens] of entries) {
      for (const rank of [1, 2, 3, 4, 5]) {
        for (const ground of wide) {
          const ratio = contrast(tokens.get(`bracket-${rank}`)!, tokens.get(ground)!);
          if (ratio < 3) failures.push(`${theme} bracket-${rank}/${ground} ${ratio.toFixed(2)}`);
        }
      }
    }
    expect(failures).toEqual([]);
  });

  // THE DIMMED HALF OF A RANGE, which is the state the 3:1 bar actually bites on.
  //
  // `BracketMark`'s `dim` draws the upper member of a range behind the one that holds. At the
  // canvas's 0.45, rank 2 composited over `--surface` read 2.2533 on kaldheim — 6 of 12
  // theme×rank pairs under 3. The addendum raised it to 0.65, measured here: the floor is
  // 3.2963, still kaldheim rank 2. 0.6 was measured too and reads 3.0128, which is not a margin
  // to spend across six themes.
  //
  // COMPOSITED, not compared raw. An `opacity` on the element is not a colour change: what a
  // reader sees is the ink mixed with whatever is behind it, so the ratio has to be taken
  // against the composite. Comparing `--bracket-2` to `--surface` and calling that the dimmed
  // reading would report 5.8939 for kaldheim, the pair that draws at 3.2963.
  it("holds the dimmed upper member of a range at 3:1", () => {
    const failures: string[] = [];
    let floor = Infinity;
    for (const [theme, tokens] of entries) {
      for (const ground of GROUNDS) {
        const bg = tokens.get(ground)!;
        // Ranks 2 and 5 are the only ones a range can draw dimmed: `permitsFor` returns
        // `[1,2]` and `[4,5]` and nothing else, so the upper member is one of those two.
        for (const rank of [2, 5]) {
          const ratio = contrast(over(tokens.get(`bracket-${rank}`)!, bg, DIM_OPACITY), bg);
          floor = Math.min(floor, ratio);
          if (ratio < 3) failures.push(`${theme} bracket-${rank}/${ground} ${ratio.toFixed(4)}`);
        }
      }
    }
    expect(failures).toEqual([]);
    // The floor at full precision, so a regression from 3.2963 to 3.01 fails here rather than
    // passing the bar above and being discovered by a screenshot.
    expect(floor).toBeGreaterThanOrEqual(3.296);
  });

  // THE CLIMB'S TWO OTHER GROUNDS, which the sweep above does not reach because neither is a
  // token read at full strength.
  //
  // A NEIGHBOUR RUNG draws its mark at `NEIGHBOUR_OPACITY` — composited, for the reason the
  // dimmed test gives. Swept over every ground rather than the two the rungs sit on today,
  // because the rung's own ground is a class string and a ground change there would not move
  // this test. Floor measured 2026-09-22: 3.1401, kaldheim rank 1 on `--surface`.
  it("holds a neighbour rung's mark at 3:1, composited", () => {
    const failures: string[] = [];
    for (const [theme, tokens] of entries) {
      for (const rank of [1, 2, 3, 4, 5]) {
        for (const ground of ["surface", "surface-sunken", "bg"]) {
          const bg = tokens.get(ground)!;
          const ink = over(tokens.get(`bracket-${rank}`)!, bg, NEIGHBOUR_OPACITY);
          const ratio = contrast(ink, bg);
          if (ratio < 3) failures.push(`${theme} bracket-${rank}/${ground} ${ratio.toFixed(4)}`);
        }
      }
    }
    expect(failures).toEqual([]);
  });

  // THE RUNG A DECK SITS ON is tinted with its own rank's ink, so the mark on it stands on a
  // ground that is partly itself. That ground is `color-mix(in oklab, ink YOURS_TINT, --surface)`
  // and exists in no stylesheet, which is why no token sweep can reach it.
  // Floor measured 2026-09-22: 3.9006, kaldheim rank 1.
  it("holds the mark at 3:1 on its own tinted rung", () => {
    const failures: string[] = [];
    for (const [theme, tokens] of entries) {
      for (const rank of [1, 2, 3, 4, 5]) {
        const ink = tokens.get(`bracket-${rank}`)!;
        const ratio = contrast(ink, mixOklab(ink, tokens.get("surface")!, YOURS_TINT));
        if (ratio < 3) failures.push(`${theme} bracket-${rank} ${ratio.toFixed(4)}`);
      }
    }
    expect(failures).toEqual([]);
  });
});
