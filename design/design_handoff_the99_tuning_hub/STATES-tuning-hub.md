# States — Tuning hub (R1 approved; Proposed cuts R2 approved, 2026-10-10)

Brief §7: ready / running / results / refused / failed, for every tool, at 900 and 390. Frame ids refer to the canvases.

**Applies everywhere.**
- **Failure mark:** a 16-grid `!` disc in `--danger`, beside the heading, with its old tag text as the `aria-label`. It is the only `--danger` on any panel.
- **Credit cost:** a `◆ 1 credit` segment inside the paid button, with the standing line under it.
- **Dates:** US short form, month first (`Oct 7 · 9:40 PM`).
- **Tool marks:** `TuningToolMark`, beside the tool's name and never in place of it.

## Hub
| State | Drawn | What shows | Must not |
|---|---|---|---|
| Landing, over 100 | A1 / A1b | Four tiles with marks; Proposed cuts offered with `this deck is N over`, cost `free · look deeper 1 credit` | reorder tiles; badge or count unread anything |
| Landing, ≤ 100 | A2 / A2b | Proposed cuts inert, its reason as the purpose line | remove the slot; make it focusable |
| Landing, run in flight | A3 / A3b | That tile accent-bordered, with a dot, status and elapsed time; History reads `· 1 running` | banner, toast, disable other tiles |
| Tool open | A4 / A4b | Desktop underline tabs with marks; phone `‹ Tuning` + mark + `n of 4 tools` | new route; reuse the deck-tab pill style |
| Before a first reading | not drawn (as shipped) | The tab's empty state; Tuning absent | — |
| Reset | A6 | Landing after leaving Analysis or the page, or reloading | pin a past result open |

## Suggested changes
Unchanged from `design_handoff_the99_deck_tuning`, except **results become two lists** (B10 / B10b): Additions and Cuts.
- Each line has its own reason and citations, and its own Add or Cut / Reject.
- `Apply all` takes every open line, and becomes `Apply the rest` once anything is answered.
- A neutral tally sits in the section head.

All other states are unchanged.

## Mana Balance
| State | Drawn | What shows | Must not |
|---|---|---|---|
| Ready = results (tier 1) | B1 / B1b | Deeper band on top; lead; Color · Cost · Sources · Status table; Deck Stats legend + tick; `1 not counted ⓘ` (tooltip open in B1); Additions and Cuts with counted strips, Apply all, tally | a run button; a running frame; a percentage; a separate cost tag |
| Running (tier 2) | B2 / B2b | Band accent-bordered, `Looking deeper…`, real counts, elapsed, Stop (open 6) | hide or dim the count |
| Results (tier 2) | B3 / B3b | Deeper block above, kind-tagged lines with citations; count unchanged below | replace or merge into the count |
| Refused (tier 2) | B4 / B4b | Neutral note, credit back, Look deeper still offered | `--danger` |
| Failed (tier 2) | B5 / B5b | Failure mark, credit back, `Try again │ ◆ 1 credit` | auto-retry |
| Credits used up, part answered | B6 / B6b | Button disabled with no segment, `0 of 3 credits left`; answered lines collapsed; tally `+2 in · −0 out · the deck goes to 107` + `Proposed cuts →` | disable tier 1; warn about going over |
| Thin EDHREC | B7 / B7b | No staple addition; dashed line says why | refuse (ruling 6) |
| Failed (tier 1) | B8 / B8b | Failure mark + `We couldn't count this deck's mana`; no deeper band | offer Look deeper with no count |
| Refused (tier 1) | — | Does not exist (ruling 6) | — |

## Proposed cuts (R2, model-first)
Hugh, 2026-10-09: the free ranked list is withdrawn. The free pass is counted facts only; Look deeper names the cuts. Frames are in `… (R2) · C Proposed cuts and History.dc.html`. R1 C1 to C3 are superseded.

| State | Drawn | What shows | Must not |
|---|---|---|---|
| Counting (free) | R1 C1 shape, not redrawn | Manifest ticking behind 400ms, `Counting your N cards` | fan; Stop; credit line |
| Ready = the count (free) | C1 / C1b | Lead (over-99 figure in `--fg`); Look deeper first, filled `--accent` with segment and credit line; What we counted (role overages, curve crowding, bracket flags against the declared bracket, EDHREC spread); never-cut foot | name, rank or order any card; `--warning` on any over figure; a bracket flag the declared bracket allows |
| Running (deeper) | C2 / C2b | Band accent-bordered in the offer's slot, what it's reading, elapsed, Stop (open 6); count live below | block editing; hide the count |
| Results (deeper) | C3 / C3b | `N to cut`: one line per named card (Suggestion tag, sentence, chips quoting the count verbatim, Cut / Keep); foot `n of N named · each figure checked`; count below under `The count` | adds; bracket claims in prose; Checked/Unchecked tiers; replace the count |
| Part answered / short | C4 / C4b | Answered rows in their slots; dashed slot for a dropped line; count recounted (`as the list is now`); no new offer from result cuts | pad to N; a second call to fill; reorder |
| Thin EDHREC | C5 (offer) / C5b (named) | EDHREC fact row absent; dashed row with the deck count; offer lead names the gap; no EDHREC chips | refuse; show EDHREC as zero |
| Refused (deeper) | C6 / C6b | B4 neutral note, credit back, Look deeper still offered, count below | `--danger` |
| Refused (all locked) | C6c | Count shown; neutral note; no offer | `--danger`; offer a call that can name nothing |
| Failed (deeper) | C7 / C7b | Failure mark (`Didn't finish`), one sentence, credit back, `Try again │ ◆ 1 credit`; count below | auto-retry; the mark above the heading |
| Failed (count) | B8 shape, not redrawn | `We couldn't count this deck's cards` (`Couldn't count`); no offer | offer Look deeper with no count |
| Credits used up | not redrawn (B6 rule) | Button disabled, no segment, `0 of 3 credits left`; count unchanged | hide the count |
| Back to 99 | C8 / C8b | Finishes in place in one line; tile goes inert | vanish mid-view; mention History |
| Fact vs claim | C9 / C9b | Shape, tag, type and words differ; the chip quotes the fact | color as the only carrier |

## History
| State | Drawn | What shows | Must not |
|---|---|---|---|
| Ready / with a run in flight | H1 / H1b | Scroll container (420 / 460) with sticky month headings and a foot fade; filter chips (scroll sideways on phone); rows with mark + tool, tier (`free` / `◆ 1 credit` / `◆ deeper look` pill), outcome | group by tool; grow the page without bound |
| Filtered | H2 | Same, one tool | — |
| Empty | H2b | Dashed box: what lands here | a call to action |
| A run opened (results) | H3 / H3b | Read-only past result, dashed "list has moved" note | any write control |
| Failed to load | H4 / H4b | Failure mark beside the sentence, Try again | — |
| Refused | — | Not applicable | — |

## Roles strip (Your deck only)
| State | Drawn | Caption |
|---|---|---|
| Short, shelf exists | A5 | `consider →` |
| Short, no shelf / met | A5 | dash |
| Land, a color short | A5 / A5b | `balance mana →` / `balance →` |
| Land, short, colors covered | rule table | `consider →` |
