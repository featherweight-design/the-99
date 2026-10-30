# READINESS: Deck Stats card (b), PR 4b (R2)

**Status:** R2, approved by Hugh 2026-10-09. **🟢 green for build**: the theme check and the staging measurement are owed in the build lane. Frames m1 to m3 at 390 and 1300, counting rules mt.

| Part | Readiness | Note |
|---|---|---|
| Two-segment source bar | **Ready** | One element per color, split by land vs. non-land. Length is the share of all sources. |
| Stripe fill | **Ready, theme check owed** | Same hue, 135°, 2px on 5px, 1px inset edge. Min width 8px at 390, 10px at 1300, taken from the land segment. Mixed bars floor at 13 / 15px. Measure `--w` and the C row on six themes. |
| Radii | **Ready** | Single-part bars are rounded 3 on all corners; mixed bars round only the outer ends. |
| Header | **Ready** | `Mana colors` + ⓘ + denominator on one line, `nowrap`, at 390. |
| Tooltip | **Ready** | Replaces the caption. Tap at 390, hover/focus at 1300. |
| Legend / lands-only line | **Ready** | Legend when non-land > 0; otherwise the one line. |
| Non-land color parse | **Engineering** | Plan: 310 of 755 `{T}: Add` cards name one color; any-color and multi-ability rocks need more. What the parse can't read is not counted, never guessed. Measure that remainder on staging. |
| Land search attribution | **Engineering** | 187 matches in the plan's read. "A basic land" needs the deck's basic types (already loaded for Q1 fetches). |
| Curve weighting | **Dropped** | Nothing to build. `demand` stays raw. |
| Copy | **To /copy-review** | `deck-stats-mana · copy strings.ts`. |

## Gap report

1. **Rulings touched:** R2 ruling 3's "non-land sources are counted and drawn hollow" is superseded for PR 4b, and hollow squares leave the card. R1 ruling 3 (raw pip-share butterfly) holds. The title changes from `Colors, asked for and made` to `Mana colors`.
2. **About:** the `deck-stats` key line on non-land colors needs an edit when 4b ships.
3. **Theme coverage:** Low Sun only.

## What a green looks like

- Gishath at 390 and 1300: green's pip bar is the longest on the card (50%). Its source bar is solid to 15, then striped to 21, at 32%. The two lengths visibly differ, and nothing says "short".
- The header is one line at 390.
- A deck with no mana rocks, dorks or land search has all-solid, fully rounded bars, no legend and the one line, with the same figures as PR 4.
- No dashed square, no caption under the card, no "weighted" string.
