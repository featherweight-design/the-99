# Wizards announcements · R1 (account 2, 2026-10-29)

Canvas: https://claude.ai/artifact/P6BAUrJjGasgDh9cTYKYxu
Brief: `docs/superpowers/design-briefs/2026-10-29-wizards-announcements.md` on main (#2373).
Status: **R1 drawn, awaiting Hugh's review.** Not a handoff yet; the handoff goes to main as `design/design_handoff_the99_announcements/` after approval.

## Boards

| Board | What it shows |
|---|---|
| Main | The flow, the seven calls, call 1's three shapes, gaps, board index |
| Home-Rows | Secret Lair, Commander decklists and Wizards news rows among shipped rows, seen and unseen, 390 and 1300 |
| Row-States | Long title and summary, missing or failed hero, 3 of 5 lists then all lists, dismissed with ✕ |
| Lead-Story | A decklists post and a Secret Lair post leading Home; their pushes |
| Offer | The "Pick what else" line (closed, opened), a kind switched off and the quiet line |
| Settings | All on, one off, push unavailable, a failed save, 390 and 1300; the kind names table |
| Announced | Early lists as precon tiles in the set's block, tiles and rows view, 390 and 1300 |
| Early-List | The view-only page; released but waiting; unmatched lines; no collection; loading |
| Release-Arrival | The release list replaces the early one, page and list, before and after |

## Calls (recommended)

1. **Hero shape**: crop to the 46x64 slot (radius 4, no card shadow). Missing or failed: a plate with a post glyph in `--fact`. Title never clamps; summary 2 lines. B (wide 86x64) and C (no picture) drawn on Main for comparison.
2. **Lead story**: Secret Lair and Commander decklists can lead; Wizards news never. `LEAD_PRIORITY`: spare-request, trade-match, combo, price-drop, commander-decklists, new-precon, new-set, secret-lair. Hero goes landscape in the lead.
3. **Offer**: while the reader has never chosen, What's new ends with one line, "Pick what else you want to hear about. New sets, price drops, trade matches and more." with Pick ▾ and ✕. Pick opens the shipped boxes in place; ✕ saves an empty choice.
4. **Decklists row presses**: both, "See the lists ›" then muted "Read the post ↗". A push opens the post.
5. **Early mark**: an "early list" tag in the `new` tag's shape, `--fact` ink; tile stays solid. The page has a dashed `--fact` band.
6. **Kind off and Precons**: Precons unaffected.
7. **Kind names** (for /copy-review): Secret Lair drops / Secret Lair; Commander decklists / Commander decklists; Other Wizards news / Wizards news. Rows sit after New precons in Settings.

## Gaps for engineering

- `Quiet` lowercases kind names ("secret lair"); each kind needs an inline form.
- Early lists use their own seen key `early:<code>`.
- Unmatched lines are kept in a last group "Not in our catalog yet"; they count toward M, never toward owned.
- The early list has its own route and redirects to the release page once that lands.
- Fixtures: "Foundations Commander" (FDC, Nov 13) and its five lists are stand-ins from the precon grid.

## Regenerate

`cd scratch-gen && BMOD=mainb python3 build.py` (local render to `out/`, needs `art/` beside it), or `python3 build.py blob <dir>` with `blobs.json` for the canvas. `node render.js <dir> Name…` checks size, broken images and clipping.
