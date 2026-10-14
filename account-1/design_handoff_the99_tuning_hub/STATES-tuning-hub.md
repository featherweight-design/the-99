# States — Tuning hub (R1 approved; Proposed cuts R2 approved, 2026-10-10; Mana Balance R3 for review, 2026-10-10)

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

## Mana Balance (R3, evidence)
Hugh, 2026-10-10: evidence, never a verdict. Frames are in `… (R3) · B Mana Balance, evidence.dc.html`. R1 B1, B1b, B6 and B7 and the R1 table below are superseded; B8 stands; B2 to B6 (Look deeper) are out of scope.

**Must not, on every Mana Balance state:** a word, color, icon or order that says a color is short, fine, met, covered or balanced; `--warning`, `--success` or `--danger` on any figure; highlighting whichever of two side-by-side figures is lower; sorting colors by any comparison (always W U B R G, the Colors card's order); a label mention.

| State | Drawn | What shows | Must not |
|---|---|---|---|
| Ready, several colors (R3a: Karsten column → Needed) | M1 / M1b (Gishath) | Lead; color table (pips with the commander, the figure without it under it, sources with lands · other and the Colors card's bars and shares, Karsten's figure for the hardest card, captioned `to cast {card} ({code})`); the Karsten note under the table; Hardest costs with color chips, six rows; Lands (count, three tapped kinds, average MV, Karsten's land count with its formula and the draw caveat); colorless line; Help with a color (picker only); citation foot | a run button; a suggestion before a color is picked; a figure that differs from the Colors card |
| Ready, one color | M2 / M2b (Wizards) | Same; no color chips on Hardest costs; picker offers the one color | an empty column for the absent colors |
| A color with sources and no pips | M1 (Gishath blue, black) | Its row: pips `0`, its sources, Karsten `—` with `no pips to cast` | hide the row (the Colors card draws it) |
| Pattern rows | M3 / M3b | Code, copies, names (commander tagged; 3 then `+N more`), Karsten: a number, `at most N`, or `no published figure` | estimate a missing figure; color the figure |
| Colorless | M6 / M6b (Eldrazi) | One line: no colored pip; colorless line; Lands block in full; land-count citation; no picker | refuse; a color table of zeros |
| No sources | M7 / M7b | Lead says no card adds colored mana yet; table with sources `0`; Lands block; picker | refuse |
| Failed (count) | R1 B8 / B8b, unchanged | `We couldn't count this deck's mana`, `Couldn't count` mark | a picker with no count |
| Help: picked | M4a, M5a | Pressed chip, `aria-pressed`; the result below | ask before a pick |
| Help: result | M4b / M4c (Gishath green), M5b / M5c (Aang blue) | Header with the color's sources now; Swap basics rows (`up to N`, before → after per changed color) or the neutral none row; Staples, owned first (owned · N free / to buy + BuyTag + link-out; how often, labelled by its source; colors it adds; a trade line when a basic can trade for it) | Apply / Add / Cut; a staple of a color outside the identity; a to-buy staple above an owned one; a price when `priceCents` is null |
| Help: no basic swap | M4b (Gishath green) | Dashed row, `No basic swap for green.` + ⓘ `How moves are picked` | name a color as the reason |
| Help: no staples | M8 / M8b | Dashed row, `No staples to show for green.`, no reason given | guess a reason (thin data, all held) |
| Help: failed | M9 | B8's shape, smaller: mark (`Couldn't read`), one sentence, Try again; the evidence above stands | hide the evidence |

### Superseded (R1, kept for the record)
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
| Land, a color short | A5 / A5b | **Superseded (R3):** no color is ever short |
| Land count under its target, shelf exists | rule table (R3) | `consider →` (the strip's own land count, not Mana Balance's) |
| Land otherwise, deck has a colored pip | rule table (R3) | `balance mana →` / `balance →` |
| Land otherwise, colorless deck | rule table (R3) | dash |


**Whole view:** `… (R3b) · B Mana Balance, full view.dc.html` puts R3 and R3a into one page (Gishath).

## Mana Balance R3a (Needed, one door; Hugh, 2026-10-11, Ruling 1 revised the same day)
Frames: `… (R3a) · B Mana Balance, pointer.dc.html`. Overrides R3 where they meet. Gone: R3's per-color picker (`Help adding a color`), the `Reading the Karsten figure` box, and `Karsten` as a column, row or caption label. **No lead line:** no color is named until the player opens Improve my mana.

| State | Drawn | What shows | Must not |
|---|---|---|---|
| View on open | N1 / N1b | the R3 evidence; the door at the foot | any color named, ranked or pointed at |
| Pattern rows | N2 / N2b | `You have N · Needs N` · `Needs at most N` · `No published figure`; column `Needed` | tint by gap |
| Explanation, closed / open | N1 / N2, N3; R3b F1 | the role strip's rationale disclosure: mono link closed; open, the accent-ruled panel with Hide, **Needs** (Hugh's sentence) and **Source** (the article, TCGplayer link) | an ⓘ per row; Karsten named without his source |
| Door, closed | N1, N1b | `Improve my mana` button | a color preselected |
| Color step | N3 (Gishath), N3b (Aang), N3c (Blood Rites) | one line on the order; radio rows tightest first (sources against the tightest cost shared by 2+ nonland cards, commander excluded; ties W U B R G), none checked; cost + Have · Needs; pipless color last (`9 sources · no pips`); ✕ | a star, tint or weight on the first row |
| Color step, one color | N4 | skipped: the door opens blue's help directly | a one-row step |
| Door, colorless | N5 | absent | |

## Mana Balance R3b (full view, folded sections; LGTM 2026-10-11)
Frames: `… (R3b) · B Mana Balance, full view.dc.html`. **This is the build target.**

| State | Drawn | What shows | Must not |
|---|---|---|---|
| On open, default | F3 / F3b | title + sub; color table (Needed); "What 'Needs' means" (closed); Hardest costs folded; Lands folded; Improve my mana (closed); citation | any color named or ranked; a section open by default |
| Hardest costs open | F3c, F1 | ▸ rotated 90°; color chips, pattern rows (You have · Needs), foot | |
| Lands open | F1 | ▸ rotated; the six fact rows + caveat | |
| Folded state | — | remembered per deck; restored on return | resetting on every visit |
| Explanation open | F1 | StripRationale panel: **Needs** (Hugh's sentence) + **Source** (article, TCGplayer link) + Hide | |
| Door → step → result | F2 → F2b → F1 | step tightest first, none selected; pick → help result with `Change color` | preselecting the first row |
