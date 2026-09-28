# Readiness audit: Suggested changes manifest addendum

Audited 2026-09-28 against origin/main. Brief: `docs/superpowers/design-briefs/2026-09-28-tuning-manifest-affordance.md` (branch `docs/tuning-manifest-brief`, PR #1095).

## Verdict: 🟢 Green

The addendum does the one job Hugh's ruling (2026-09-28) set: the manifest stays a read-only disclosure and nothing in it reads as pressable. No product question remains open. Engineering corrections are listed below, and none needs a Design round.

## The brief's three questions, answered

1. **The status mark.** The 18px bordered box is replaced by a glyph in a 14px slot with no border, radius or box (README `:44-47`). Pending is a 5px `--fg-locked` dot, read is a 12px weight-600 ✓ in `--accent`, and the never-read empty-games row carries a mono `–`. The pair reads as pending and read, not unchecked and checked, because there is no container to fill.
2. **The row border.** Read rows lose their border, radius and fill (README `:35-36`; the shipped `--elevated`/`--surface` fills are at `manifest-rows.tsx:53-57`). Rows are separated by 1px `--border` rules (one above the list, one under each row) with the gap at 0, and the rows sit 2px in from the edges. `cursor: default`, no hover.
3. **Row height.** Read rows drop to 36px on the phone and 32px on desktop, because they are no longer targets. The empty-games row holds the list's only control, and `Log a game →` becomes a true 44px target on the phone (38px on desktop). The height lives on the `<button>` itself, not on the row. The row is 46 / 40px to hold it inside its dashed border (README `:56`, `:59`).

## Checks

| Check | Result |
|---|---|
| Nothing in the manifest reads as pressable | Pass. No box, no fill, no row border, no hover, `cursor: default` on rows. |
| `Log a game →` is a 44px `<button>` on the phone | Pass. `h-[44px] md:h-[38px]`, `py-[12px]` (about 43px today) removed, still a `<button>`, global focus ring kept (`globals.css:572-575`). |
| Done is never color alone | Pass. Dot to ✓ shape change, label `--fg-body` to `--fg`, and visually hidden `read` / `not read yet`. |
| Contrast on `--surface-sunken`, six themes | ✓ 4.42 to 9.26, dot 3.16 to 3.44, done label 11.55 to 15.29. Every mark clears 3:1 as a graphic. Phyrexia's ✓ is 4.42 as text, inherited from the shipped ✓. |
| Collapsed Results line is lowercase `read from …` | Pass. Unchanged (`deck-tuning.ts:163`) and quoted lowercase throughout. |
| Every token declared in all six themes | Pass. No new tokens. `--display` is canvas-only. |
| Generating vs Ready stay distinct | Pass. Same dot for pending. The run is told apart by the accent panel border, the loading heading, `Reading…` and `Stop`, and `2 of 4 read`. Pending counts are absent while a run is in flight. |
| About entry owed | None. A cosmetic restyle of an existing surface, and no About figure draws the manifest. |

## Engineering corrections

1. Render the empty-games row first, then a separate ruled list, inside `flex flex-col gap-[8px]`. `manifestRows` always puts that row first (`tuning-panel.tsx:605`), so the split is safe. Keep `data-testid="manifest-row"` on both.
2. In the Generating state with no games, the empty-games row has no button (`tuning-panel.tsx:295` passes no `onLogGame`). Keep it at 46 / 40px so it does not change height between Ready and Generating. The canvas does not draw this state.
3. Add `read` and `not read yet` to `deckTuningCopy.manifest`. No live region per row; the panel's one status line stands.
4. `scripts/probe-tuning-panel.mjs:209-210` asserts every manifest row at 38 / 44px and will fail on this restyle. Move that floor to 32 / 36px for read rows, measure the `Log a game →` button at exactly 44px on the phone and at least 38px on desktop, assert no read row has a fill or a side or top border, and fail when no no-games deck is walked. Run it against `py-[12px]` put back and confirm it reads 43px and fails.
5. Amend the parent `READINESS.md:175-176`: a done row is carried by the ✓ and the label ink, not a fill, and the manifest's only target is `Log a game →` at 44 / 38px. Note in `STATES-tuning-panel.md` (`:20`, `:44`, `:52`) that "unchecked" is drawn as the pending dot.

## Noted, not blocking

- The mark column is not aligned between the rows: the empty-games row's mark sits about 11px to the right of the ruled rows' marks. It is drawn that way and built as drawn.
- In kaldheim, `--fg` and `--fg-body` differ by 1.21:1, so the ✓ alone carries done there. That meets the rule.
- The counts in `--fg-faint` read 4.02 (kamigawa) and 4.20 (phyrexia). This is inherited and outside this brief.
- The canvas's P2 badge calls `Log a game →` a "link"; it is a `<button>`. Canvas label only.

## Copy review

New visually hidden strings `read` and `not read yet` go to /copy-review (screen readers will voice "Your games, read, 9 games"; check the joiner). No visible copy changes.
