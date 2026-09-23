# Gap report — bracket chip on the deck tile and the deck header

Source: `design/design_handoff_the99_deck_analysis/` (README §5, component notes, HANDOFF decisions
and outstanding list, ASSETS.md, the Frame canvas). Enumerated from the design alone, then checked
row by row against `bracket-chip.tsx`, `deck-card.tsx`, `spine-desktop.tsx`, `spine-mobile.tsx`.

## Verified

| Row | Design | Build |
|---|---|---|
| Composition | mark + name in a pill; a range is ONE `Split` chip (HANDOFF:19) | `BracketChip`, the verdict block's own pill extracted unchanged |
| Ring | `1px color-mix(bracket 55%)` | same, via `bracketInk(low)` |
| Split contents | mark(low) `/` mark(high, dimmed) `Split` | same; dim is `DIM_OPACITY` 0.65, the addendum's ruling 3 over the canvas's 0.45 |
| Tile cell | chip cell, immediately after `StatusPillBadge` (README:204) | one flex group in `[grid-area:chip]`, pill then chip |
| Tile row gap | flex, gap 8 (Frame:289, 3461) | `gap-[8px]` (was 6, fixed) |
| Label | Plex Sans 500, 11–12px, `--bracket-N` | `text-[11px] font-medium` (was 10.5, fixed) |
| Tile interaction | the tile is one link; the mark is not its own target (README:565) | chip is presentation inside the footer |
| Band interaction | tapping lands on the Analysis tab (README:164) | `SpineBracketChip` is a button calling `setView("analysis")` |
| Band tap target | 44px hit area, pill not grown (README:616) | `after:` pseudo-element, 11px above and below the 22px pill (added) |
| Unread deck | no chip, not a dash (README:169) | `bracket: null` renders nothing, both surfaces |
| Range undeclared | Split, never rounded (README:166) | `verdictHead` with no answer |
| Range answered | the answer | `chipAnswer` via `declarationAsk`, the verdict block's rule |

## Ruled here, from contradictions inside the handoff

1. **Named chip, not the bare mark.** HANDOFF:49 (the newest instruction) over Frame:3147.
2. **Mark at 20px, not 22.** 22 was the BARE mark matching the status pill's 22px height; the named
   chip rings it with 1px either side, so a 22px pill holds a 20px mark. 20 is still the chip form.
   Pill padding scaled from the canvas's `2/11/2/4` at 26px to `0/8/0/1`, gap 4.
3. **No held empty track on the tile.** README:204 reserved 22px so bars align tile to tile; that
   was for a fixed-width bare mark. A named chip varies by name, and the status pill before it
   already varies, so no reservation could align the bars.
4. **Band order unchanged.** HANDOFF:48 moves status + chip to their own row on the phone; that is
   an outstanding layout item of its own and is not this PR. The chip follows the status pill on
   both widths today, which costs the phone's commander name some width (it truncates sooner).

## Open, for Hugh

- **Home.** README:42/171 and HANDOFF's decisions table say "Home gets nothing"; HANDOFF:50's
  outstanding list puts the chip on Home's resume row. Not built; the ruling is his.
