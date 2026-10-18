# README — Text inks addendum

`design/design_handoff_the99_themes/addendum-text-inks/` · **R1** · 2026-10-17

Token values only, in two text inks, across the six themes. No surface, layout or copy changes.
One token is added (`--accent-text`); everything else is a value change to a token that ships.

## The problem, measured

Engineering's audit, reproduced exactly with `contrast()` from `src/lib/theme/color.ts` on the hexes in
`src/app/globals.css`. The six solid grounds are `--bg`, `--surface`, `--surface-raised`,
`--surface-sunken`, `--surface-rail` and `--elevated`. `--elevated` is the weakest ground for every value
below.

- `--accent` as text (308 sites) fails AA in Oil Haze (3.89 to 4.42 on five grounds) and First Frost
  (3.67 to 4.46 on three). `--accent-hover` fails once: First Frost on `--elevated`, 4.46.
- `--fg-faint` as text (611 sites) fails somewhere in all six themes: Neon Rain 3.41–4.12 and Oil Haze
  3.70–4.29 everywhere; Low Sun and First Frost on `--surface-raised` and `--elevated`; Canopy and
  Witching Hour on `--elevated` only.

## Decisions

**1 · `--fg-faint` is read text. It owes 4.5:1 on every ground.** A sample of the 611 sites settles it:
dates, type lines, field labels, section kickers, meta lines ("1,284 cards · read 3 days ago") and whole
12–12.5px help sentences. Almost all of it is 9.5–12px mono, the smallest text in the app, which is where
contrast matters most, not least. The decorative alternative (3:1, read text moved to `--fg-muted`) was
rejected: it would flatten the ramp to one tier for secondary text, and the faint tier is doing real
hierarchy work under muted. The few genuinely decorative faint marks (an `aria-hidden` `·` or `›`) clear
the new value comfortably and need nothing.

**2 · Each theme's `--fg-faint` is lifted the least that clears 4.5:1 with headroom.** The rule: hold
OKLCH hue and chroma, raise lightness until the minimum over the six grounds is ≥ 4.55. Hue moves at most
1.1° (Low Sun, from 8-bit rounding); chroma stays under the text ramp's 0.03 budget in all six. The cost is
the step under `--fg-muted`, which narrows in every theme. First Frost is tightest (OKLab L gap
0.085 → 0.036); each theme board draws the three inks on `--elevated` side by side so the step can be
judged by eye.

**3 · First Frost lifts `--accent` in place.** `#5C86C9` → `#6C97DB`, hue held to 0.13°. Fills, the
focus ring and the fit bar move with it, which is the theme's own blue a step brighter. It also widens
the accent's separation from `--u`, which shipped at 0.101 ΔE, one hundredth over the floor; it is now
0.155. `--accent-hover` keeps its shipped step above it: `#6C95D8` → `#7CA6EA`.

**4 · Oil Haze rules a separate text accent.** No lift that holds the hue clears both 4.5:1 and the
contract's 0.10 ΔE floor between `--accent` and `--success`: lightening the teal walks it to `--success`'s
lightness (0.088 at the straight lift). The only values that clear both turn the hue 9.6° toward cyan and
double the chroma (0.054 → 0.102), a louder teal than Oil Haze. So:

- `--accent` stays `#52827A` everywhere it is a fill, ring or bar, keeping its 0.117 ΔE from `--success`.
- New **`--accent-text: #5D8E85`**, the hue-held lift, 4.57:1 on `--elevated`. The 308 text sites move
  to it.
- In the other five themes `--accent-text` is `var(--accent)`, an alias in the way `--avail-hard` is, so
  First Frost's text tracks its lifted accent and nothing else moves.
- `--accent-text` sits 0.088 ΔE and 40° of hue from `--success`. The 0.10 gate exists so a fill or mark
  cannot be read as a status; text carries its own words, so the gate is not extended to it. Stated here
  so the figure is on record rather than discovered.
- There is precedent: `--avail-hard-fg` exists because the accent "is often too dark" to read as text.

**5 · Oil Haze's `--accent-hover` lifts too, though it already passed.** 30 text links hover from the
accent to `--accent-hover`. Over the new text ink the shipped hover `#629189` would sit 0.011 L above it,
an invisible hover. `#6E9D95` restores the shipped 0.050 L step. Its ΔE from `--success` is 0.071; hover
is not gated, and shipped hover was already 0.083.

## For engineering

- Values: `TOKEN-TABLE.md` and `tokens.json` in this folder.
- `contract.test.ts`, "clears every contrast floor": `--fg-faint` moves from 3:1 on `--surface` to 4.5:1
  on all six grounds, and `--accent-text` (and `--accent-hover`) join it at 4.5:1 on all six.
- `--accent-text` is a new contract key: add it to `CONTRACT` and to `ALIASES` as `var(--accent)`, with
  Oil Haze the one block that writes a hex. The alias test needs that exception.
- `--fg-placeholder` does not move. It was written out as hex so a `--fg-faint` change would not move
  it; in the four themes where it repeated `--fg-faint`, the two now differ (the twin is allowed to).
- Trial run: these values applied to a worktree of `main` at `c81e35e` pass all 3,604 tests in
  `src/lib/theme` and `src/components/shell`, including the credit chip, wash and placeholder suites.
- No code or test pins the old hexes; only historical design tables under `docs/superpowers/` quote them.
