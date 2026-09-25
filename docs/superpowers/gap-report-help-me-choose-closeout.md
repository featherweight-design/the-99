# Gap report — Help me choose close-out (d8's walk, gaps 1–12)

Tables: `docs/superpowers/design-tables/help-me-choose.md` (results) and `help-me-choose-deeper.md` (the
deeper look), plus `help-me-choose-doors.md` for gap 12. The gaps come from the close-out walk, not
from a fresh enumeration. Each one is checked against the table row it cites, and proved by a press
in a real browser at 1300 and 390 where it is visible.

| # | Table row | Was | Now | Proof |
|---|---|---|---|---|
| 1 | NarrowOption › Label column: label nowrap; Count: `white-space / flex` nowrap / none | the five-color label ran on under the count | label `overflow-hidden text-ellipsis` inside its `min-w-0` column; count `flex-none` | `probe:help-me-choose-screens` §9 at 390 and 320, `Drop White · Blue · Black · Red · Green`. It reads the label's own overflow, and FAILS on the reverted build (`labelInside: false` at both widths) |
| 2 | Deeper › 3b stub: weight 600; flex, not set (takes the rest of the row) | `font-normal`, sized to content | weight 600; `flex-auto md:flex-none`, row `w-full md:w-auto` | `probe:help-me-choose-deeper` §2: resolved weight `600` at both widths, and at 390 the press fills the row beside Stop (`fill 0`) |
| 3 | inventory | "a few fit" never photographed | row `results-few`, `c=r,g&m=exact&t=dinosaurs,tokens&k=2`, waiting on `narrow-few` alone; `results-narrow` kept and relabelled, since it lands on best fits for one color and one theme, a different state | contact sheet |
| 4 | 5c searching | the shell's deckNew screen | *(pending the orchestrator's ruling)* | — |
| 5 | 3c / 3e | a failed credit read hid a settled look | `standing` nullable; a settled look draws with no count line and no press; with nothing settled the press stays hidden | `page.test.ts` and `deeper-look.test.tsx`; the page test FAILS with the guard reverted to `allowance &&` |
| 6 | 3b | `in_flight` / `reused` read as DIDN'T FINISH | Looking, polling a read-only `lookStatus`; that look's read of this ask is delivered, `idle` returns the offer, 120s reads failed; Stop ends the wait; `refused` stays failed | unit tests (two mutations fail them); `probe:help-me-choose-read` (the cutoff mutation fails it); `probe:help-me-choose-deeper` §5, a second tab at 1300 and 390: `["looking","offer"]`, and it spends nothing |
| 7 | 3b | no accessible name | `1 credit. Looking…`, built as the other states are | `probe:help-me-choose-deeper` §2 at both widths |
| 8 | 4e: every row adds the unpriced line | only ready rows | counting and failed rows take it from the card's chip; a ready row's own count decides | `choose-row.test.tsx` (FAILS with the chip fallback removed) |
| 9 | Thumb 40 × 56, radius 5; pips gap 4px; ShowMore button flex `1 1 100%` / none | 44 × 62 at 6; gap 3; sized to content | `CommanderThumb size="result"` (the `row` size is unchanged for its other callers); `IdentityPips gap={4}`; `flex-[1_1_100%] md:flex-none`; the skeleton's thumb matches | `probe:help-me-choose-screens` §8: `40x56`, `5px`, `4px` at both widths; Show more 354 of 354 at 390 and 122 of 1080 at 1300 |
| 10 | Deeper chip: after the free-match chips | in the form's order among them | free-match chips, then deeper ones, each group in form order | `read-as-bar.test.tsx`; `probe:help-me-choose-deeper` §3 |
| 11 | Not used › Phrase: curly quotes; border-bottom 1px dotted `--border-dashed` | `<q>` (the browser's quotes) with a dotted underline | a span carrying `“…”`, `border-b border-dotted` | `read-as-bar.test.tsx`; `probe:help-me-choose-deeper` §3, resolved `dotted` at both widths |
| 12 | Doors › "Make the 44px line the target" | the link's overlay spanned the link only | the wrapper is positioned, so the overlay spans the line, lead included | `probe:help-me-choose-doors`: the lead's own point hits the link, and a press there lands on the intake, at both widths |

Gap 13 (the "Colour" labels) belongs to another lane and is not touched here.
