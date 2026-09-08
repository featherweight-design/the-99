# The 99 — The rail head is the mark (design handoff, R1 · ruled)

`design/design_handoff_the99_rail_mark/` · 2026-09-08

**A one-component change with a brand consequence.** The 62px rail's head ships a bare 26px
outlined diamond, so `<Crowned99>` — the locked primary mark — renders nowhere a desktop user
looks, and the head duplicates Discover's nav glyph. **Ruled 1a: the head renders the crowned
numeral.** No token, prop, route or copy change.

Follows the folder convention of `design/design_handoff_the99_refresh/`, whose
`CHROME-rail-and-tabs.md` specified the diamond this supersedes.

## Engineering errata

The ruling shipped as drawn. The handoff's prose below is kept verbatim as the record of what was
ruled and why, so five statements it makes about the code and its arithmetic are corrected here
rather than edited in place. Reasoning for each is in
`docs/superpowers/plans/2026-09-08-rail-mark.md`.

| The handoff says | What shipped |
|---|---|
| `<Crowned99>` renders "only in the wide rail and `MobileHeader`" | It also renders in the signed-out hero (`src/app/page.tsx`). The wide rail was deleted in the 2026-09-07 refresh, so its `"rail"` variant rendered nowhere |
| A third variant is added beside `"rail"` | `"rail-62"` **replaces** `"rail"`, which had no call sites |
| "No token, prop, route or copy change" | One prop change: `variant` is now required, the dead default having been its only purpose |
| `src/lib/copy/shell.ts` gains `shellCopy.railMarkAria` | Not added. `Crowned99` already renders `role="img" aria-label="The 99"` for every variant, and a second copy of the name would be a second source of truth |
| Lockup 32.5 × 39; the nav block starts 13px lower | 32.5 is the canvas's flex box, which rotated squares overflow — the painted row is 35.0 wide. Height 39 is right. The nav block drops **17px**: 13 counts the head's 26 → 39 without the spacer's 16 → 20, and the handoff's own head-zone figures (56 → 73) give 17 |

Two numbers are converted rather than copied, because the canvas lays the crown out in flex and
the app draws one SVG that already does the rotation maths: the gap passed is the 3px of visible
air the handoff asks to *see*, not the 6px CSS gap that produces it on unrotated boxes; and the
numeral baseline sits 22px under the crown rather than 4 + 23, because the canvas's
`line-height: 1` carries −4px of half-leading that an SVG `<text>` has no line box to inherit.

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
