# States — Tuning hub R1 (approved)

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

## Proposed cuts
| State | Drawn | What shows | Must not |
|---|---|---|---|
| Running (tier 1) | C1 / C1b | Manifest ticking, accent border; only after 400ms | fan; Stop; credit line |
| Results (tier 1) | C2 / C2b | Look deeper band; overage + 2 ranked candidates, one reason chip each, Cut / Keep, never-cut foot | list the commander or a locked card; fewer than overage + 2 |
| Part answered | C3 / C3b | Answered rows in their slots, lead recounted, `Rank again` | reorder; shrink the list |
| Running (tier 2) | C8 / C8b | Band accent-bordered; shortlist stays live | block Cut / Keep |
| Results (tier 2) | C9 / C9b | Deeper block above (one line per named candidate: cut it first / keep it); shortlist unchanged below | add cards; re-rank the shortlist |
| Refused / failed (tier 2) | as B4 / B5 | Same shapes, with "shortlist" for "count" | — |
| Back to 99 | C4 / C4b | Finishes in place in one line; no action row; tile goes inert | vanish mid-view; mention History |
| Thin EDHREC | C5 / C5b | Dashed row names the missing signal; no EDHREC chips | refuse |
| Refused | C6 / C6b | All locked: neutral note | `--danger` |
| Failed | C7 / C7b | Failure mark beside the heading, Try again | the mark above the heading |

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
