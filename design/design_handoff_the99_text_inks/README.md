# The 99 — Text inks addendum (design handoff, R1)

`design/design_handoff_the99_text_inks/` · 2026-10-21 · **R1, relayed by Hugh 2026-10-21**

Answers prompt 4 of `boards/design-prompts-2026-10-18.md` ("Theme contrast: the accent and faint inks as text"). Evidence:
lane 9b's read-only audit, `boards/accent-contrast-audit-2026-10-18.md`. An addendum to the theme system
(`design/design_handoff_the99_themes/`, with `design/design_handoff_the99_theme_replacement/` for Canopy and Witching
Hour): token values only, no surface, layout or copy change.

Canvas: `The 99 - Text Inks Addendum R1.html`, a single bundled page with eight boards. Open it from disk.

| # | Board | What it shows |
|---|---|---|
| 1 | Ledger · every changed value | The ten rows below. |
| 2 | Oil Haze · why a text accent | Three ways through Phyrexia's accent, drawn on `--elevated`. |
| 3 | First Frost · kaldheim | Each changed ink on all six grounds, shipped against proposed, and the `--fg-faint` step under `--fg-muted`. |
| 4 | Oil Haze · phyrexia | The same. |
| 5 | Low Sun · amonkhet | The same. |
| 6 | Neon Rain · kamigawa | The same. |
| 7 | Canopy · ixalan | The same. |
| 8 | Witching Hour · eldraine | The same. |

**The one-line summary:** *nine values move and one token is added, so `--accent` and `--fg-faint` read at 4.5:1 as text
on all six solid grounds in every theme, each lift holding its hue.*

---

## The two calls

| # | Question | Call |
|---|---|---|
| 1 | `--accent` as text fails AA in Phyrexia and Kaldheim | **Kaldheim lifts `--accent` in place**, fills included (`#5C86C9` to `#6C97DB`). **Phyrexia gets a separate text accent**, `--accent-text` (`#5D8E85`), and its `--accent` stays `#52827A` for fills, the focus ring and the fit bar. In the other five themes `--accent-text` is declared as `var(--accent)`, the way `--avail-hard` is. The 308 text sites move onto `--accent-text`. |
| 2 | Is `--fg-faint` read text or decoration? | **Read text, so 4.5:1 on all six grounds.** No site moves to `--fg-muted`; the faint ink is lifted in all six themes instead. |

### Why Phyrexia needs its own text accent (board 2)

Every lift of Phyrexia's `--accent` that holds the hue lands within 0.10 ΔE of `--success`, which is the contract's own
floor for the accent. The only lifts that clear it turn the hue 9° or more and double the chroma. Board 2 draws three
ways through:

- **A · Lift `--accent` in place.** `#5D8E85`, 4.57:1, hue moved 1.1°, but ΔE from `--success` 0.088, under 0.10.
  Fails a gate.
- **B · Turn the hue until it clears.** `#0C9491`, 4.56:1, ΔE 0.106, but 9.6° toward cyan and chroma 0.054 to 0.102.
  Loses the haze.
- **C · A separate text accent (proposed).** `--accent` stays `#52827A` (ΔE 0.117 from `--success`, kept) and the new
  `--accent-text` is `#5D8E85`. The text ink sits 0.088 ΔE from `--success` but 40° of hue away, and it is never a fill.

Phyrexia's `--accent-hover` already passed (4.77), but it is lifted so text-link hover keeps the shipped 0.05 L step over
the new text ink: the shipped hover sits 0.011 L above `#5D8E85`, which would read as no hover at all.

---

## The ledger (board 1)

The six grounds are `--bg`, `--surface`, `--surface-raised`, `--surface-sunken`, `--surface-rail` and `--elevated`.
`--elevated` is the weakest ground for every value here. Figures are `contrast()` from `src/lib/theme/color.ts` on the
hexes in `globals.css`.

| Theme | Token | Shipped | Proposed | Weakest ground | Hue moved | Note |
|---|---|---|---|---|---|---|
| Oil Haze `phyrexia` | `--accent-text` | new (was `--accent` `#52827A`) | `#5D8E85` | 3.89 → 4.57 | 1.1° | Text only. The fill stays `#52827A`. |
| Oil Haze `phyrexia` | `--accent-hover` | `#629189` | `#6E9D95` | 4.77 → 5.57 | 0.2° | Passed already; lifted to keep its 0.05 L step over the text ink. |
| Oil Haze `phyrexia` | `--fg-faint` | `#78747E` | `#87838D` | 3.70 → 4.56 | 0.0° | Failed on all six grounds. |
| First Frost `kaldheim` | `--accent` | `#5C86C9` | `#6C97DB` | 3.67 → 4.56 | 0.1° | Lifted in place, fills included. ΔE from `--u` widens 0.101 → 0.155. |
| First Frost `kaldheim` | `--accent-hover` | `#6C95D8` | `#7CA6EA` | 4.46 → 5.47 | 0.1° | Keeps its shipped step over the accent. |
| First Frost `kaldheim` | `--fg-faint` | `#7C8A8C` | `#8A999B` | 3.78 → 4.58 | 0.7° | Tightest step to `--fg-muted` of the six (0.036 L). |
| Low Sun `amonkhet` | `--fg-faint` | `#8B8270` | `#948B78` | 4.04 → 4.55 | 1.1° | Failed on `--surface-raised` and `--elevated`. |
| Neon Rain `kamigawa` | `--fg-faint` | `#6F7486` | `#84899B` | 3.41 → 4.56 | 0.1° | Failed on all six grounds. The largest lift of the set. |
| Canopy `ixalan` | `--fg-faint` | `#808C7C` | `#879383` | 4.20 → 4.60 | 0.0° | Failed on `--elevated` only. |
| Witching Hour `eldraine` | `--fg-faint` | `#898395` | `#8F899B` | 4.23 → 4.58 | 0.0° | Failed on `--elevated` only. |

In Amonkhet, Kamigawa, Ixalan, Eldraine and Kaldheim, `--accent-text` is `var(--accent)`.

### Every value on every ground (boards 3 to 8)

Order: `--bg`, `--surface`, `--surface-raised`, `--surface-sunken`, `--surface-rail`, `--elevated`.

| Theme | Token | Shipped | Proposed |
|---|---|---|---|
| phyrexia | `--accent-text` | 4.51, 4.25, 4.14, 4.42, 4.39, 3.89 | 5.30, 4.99, 4.86, 5.19, 5.15, 4.57 |
| phyrexia | `--accent-hover` | 5.54, 5.21, 5.08, 5.42, 5.38, 4.77 | 6.46, 6.08, 5.92, 6.33, 6.28, 5.57 |
| phyrexia | `--fg-faint` | 4.29, 4.04, 3.93, 4.20, 4.17, 3.70 | 5.28, 4.98, 4.84, 5.18, 5.14, 4.56 |
| kaldheim | `--accent` | 5.08, 4.46, 4.25, 4.86, 4.76, 3.67 | 6.30, 5.54, 5.28, 6.03, 5.91, 4.56 |
| kaldheim | `--accent-hover` | 6.16, 5.42, 5.16, 5.90, 5.78, 4.46 | 7.56, 6.64, 6.33, 7.24, 7.09, 5.47 |
| kaldheim | `--fg-faint` | 5.22, 4.59, 4.37, 5.00, 4.90, 3.78 | 6.32, 5.56, 5.29, 6.05, 5.93, 4.58 |
| amonkhet | `--fg-faint` | 4.95, 4.55, 4.41, 4.82, 4.74, 4.04 | 5.58, 5.13, 4.96, 5.43, 5.33, 4.55 |
| kamigawa | `--fg-faint` | 4.12, 3.81, 3.70, 4.02, 3.96, 3.41 | 5.50, 5.09, 4.94, 5.37, 5.28, 4.56 |
| ixalan | `--fg-faint` | 5.32, 4.82, 4.62, 5.24, 5.11, 4.20 | 5.84, 5.28, 5.07, 5.74, 5.60, 4.60 |
| eldraine | `--fg-faint` | 5.22, 4.79, 4.59, 5.15, 5.06, 4.23 | 5.65, 5.19, 4.97, 5.58, 5.48, 4.58 |

### The step under `--fg-muted` (boards 3 to 8)

Lifting `--fg-faint` closes its OKLCH lightness gap to `--fg-muted`. Shipped → proposed: phyrexia 0.114 → 0.063,
kaldheim 0.085 → 0.036, amonkhet 0.086 → 0.056, kamigawa 0.127 → 0.056, ixalan 0.084 → 0.060, eldraine 0.061 → 0.041.
The boards draw the two inks side by side on `--elevated` so the step can be judged by eye.

---

## Engineering notes the design depends on

- **`--accent-text` is a new contract key.** It is declared in all six theme blocks: a hex in Phyrexia, `var(--accent)`
  in the other five. `check:tokens` and `contract.test.ts`'s key list both need it.
- **Which sites move.** The audit counts 308 `--accent` text sites under `src/` (260 `text-[color:var(--accent)]`
  classes and 48 inline `color: "var(--accent)"` styles). Fills, borders, rings, the fit bar and marks stay on `--accent`.
- **Hover.** The text-link hovers (30 by board 2's count) already step to `--accent-hover`; they keep doing so, now from `--accent-text`.
- **Placeholders do not move.** `--fg-placeholder` is written as a hex on purpose, so a `--fg-faint` change leaves it
  where it is. It still clears 4.5:1 on `--surface-sunken`.
- **The theme handoff's `TOKEN-TABLE.md` and `tokens.json` are not revised in this package.** The prompt asked for them;
  this package's ledger is the record of the changed values, and `globals.css` with `contract.test.ts` is what pins them.
