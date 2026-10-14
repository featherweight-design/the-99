# The 99 — The rail head is the mark (design handoff, R1 · ruled)

`design/design_handoff_the99_rail_mark/` · 2026-09-08

**A one-component change with a brand consequence.** The 62px rail's head ships a bare 26px
outlined diamond, so `<Crowned99>` — the locked primary mark — renders nowhere a desktop user
looks, and the head duplicates Discover's nav glyph. **Ruled 1a: the head renders the crowned
numeral.** No token, prop, route or copy change.

Follows the folder convention of `design/design_handoff_the99_refresh/`, whose
`CHROME-rail-and-tabs.md` specified the diamond this supersedes.

| File | What it holds |
|---|---|
| `The 99 - Rail Mark.dc.html` | The deliverable. Three candidates drawn in the shipped 62px rail; **1a ruled**, 1b and 1c kept so the rejections are on the record. |
| `CHROME-rail-mark.md` | The spec: geometry, the rotation arithmetic, the four rules that do not change, and the two files to touch. |
| `rail-mark · copy strings.ts` | The head's accessible name — the only string this handoff adds. |
| `READINESS.md` | Self-assessed readiness and the one thing to sign off. |
| `brand/` | The locked brand sheet, copied in for self-containment. |

---

## The call

| # | Call | Answer |
|---|---|---|
| 1 | What sits in the 62px rail's head? | **1a — the crowned numeral.** Crown 6 / 8.5 / 6px `--accent`, numerals Cinzel 900 at 23px `--fg`, 4px between them; **32.5 × 39** lockup (crown row 12 + 4 + 23), centred, 14px from the top, 20px before the first nav item. |
| 2 | Is the head a nav item or a route? | **Neither.** `role="img"`, `aria-label="The 99"`, children `aria-hidden`. Home stays in the nav. (1c would have made it a link and cost the Home icon its slot — not taken.) |
| 3 | The brand sheet's 24px crown-drop floor vs. 23px numerals | **The floor governs the numerals rendering alone**, as the fallback mark. With the crown present at 23px the three diamonds still resolve — measured, after the rotation fix. Do not shrink below 20px to fit a smaller head; take 1b instead. |
| 4 | Does anything else on the rail change? | **No.** Five nav items, same order and glyphs; Discover keeps its circle-and-diamond; the 30px avatar stays pinned bottom. The head grows 26 → 39px, so the nav block starts 13px lower — head zone 14 + 39 + 20 = 73px. |
| 5 | Does `RailDiamond` come back? | **No.** The mark appears once, at the top, never per row — the rule from the refresh survives intact; only the drawing in the head changes. |

## What made this a defect rather than a preference

The head is the only place the desktop app identifies itself, and it was drawing the crown's
*middle diamond alone* — the same shape Discover's nav glyph is built from. Two surfaces, one
shape, neither reading as the brand.

## The one measurement worth carrying forward

A 45°-rotated square is **1.414× as wide as its layout box**, so a flex gap sized to the visible
air between diamond points closes to zero: `gap = air + 0.207 × (w₁ + w₂)`. At 6 / 8.5 / 6 that
is a **6px** gap for 3px of air, and the crown row is **12px** tall, not 8.5px. Caught in review on
this very canvas. An SVG crown retires the arithmetic and is the better end state.

## Code

- `src/components/marks.tsx` — one new `variant="rail-62"`: three sizes, one gap, one numeral size.
- `src/components/shell/nav.tsx` — `NavRail`'s head swaps the diamond `<span>` for
  `<Crowned99 variant="rail-62" />`; the 16px spacer becomes 20px.
- `src/lib/copy/shell.ts` — `shellCopy.railMarkAria`.

Nothing else. The tab bar, `MobileHeader`, the wide rail and every token are untouched.
