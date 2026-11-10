# STATES: Upgrade this precon (R1 + addendum A1)

Every frame at 390 and 1300 unless noted. Board names are the canvas's. Everything not named here is as shipped in `design_handoff_the99_precons` (O1–O6, S1, R3 K, R4 G) and `design_handoff_the99_suggested_changes_v2`.

**Applies everywhere.** 44px hit size on a phone (cards, rows, press, links). Selection says select / unselect, never tick. Dates US short (`Nov 10`). Strategy glyph from `strategy-icon.tsx`, dashed fallback where a slug has none (G3).

## Entry (E)
| Id | Drawn | What shows | Must not |
|---|---|---|---|
| E1 | Entry E1 | Section under the Overview: label + aside, lead, 2–3 cards unselected, `Upgrade` off + `Select a direction to upgrade toward.` | pre-select; mark one recommended |
| E2 | Entry E2 | One card (420 max at 1300), unselected, press off until selected | draw it as a banner |
| E3 | Entry E3 | Dashed line `No direction to upgrade toward yet` + why; no cards, no press, no credit line | offer a run |
| E4 | (no frame) | Switch off, early list, or no Start on the page | draw the section |
| E5 | (no frame) | Loading the page | section as one skeleton block the cards' height; no press |

## Picker (P)
| Id | Drawn | What shows | Must not |
|---|---|---|---|
| P1 | Picker P1 | Pick: accent edge, filled ring; press `Upgrade toward <S>`; line `12 to 18 swaps · uses 2 credits · <lot>` | a confirm dialog on a first run |
| P1u | (no frame) | The pick pressed again: unselected; back to E1's press | keep the press on |
| P1c | (no frame) | A thumb or name pressed | shipped card details, no deck actions (O6); the card's selection doesn't change |
| P2 | Picker P2 | No credits: press off, shipped spent line + `Get more credits` (payments on) | lose the pick |
| P3 | Picker P3 | Only the free credit: press off, `An upgrade uses 2 credits, and a free credit covers 1.` + standing + `Get more credits` | let the press spend and refuse after |
| P4 | Picker P4 | Session lapsed: press → shipped sign-in → back with `?upgrade=<key>` selected, nothing spent | spend on return without a press |

## Wait (W) and failed (F)
| Id | Drawn | What shows | Must not |
|---|---|---|---|
| W | Wait W | Clock `0:04 · Finding swaps toward <S> · usually about 6 seconds`, leave line, other cards dimmed and inert, 3 skeleton rows | stream pairs; Stop |
| W2 | (no frame) | Left and came back mid-run | the clock from the run's start; result in place when done |
| W3 | (no frame) | Past 60 s (one deadline, repair included) | still the clock; the reaper turns it into F at 5 min |
| F | Wait F | `That upgrade didn't come through. Both credits are back.` mono 11 `--danger`; press `Try again` with the cost line; pick kept | name the cause; keep a part-set |

## Results (R)
| Id | Drawn | What shows | Must not |
|---|---|---|---|
| R1 | Results R1 | Rows per direction (run one selected); head, mono line (bracket move, buys total, owned count, date); pairs by the cut's theme; Start press; `Run <S> again` | a Pick toggle; a rejected line |
| R1o | Results R1 | An owned add: filled dot, `you own it`, not in the total | price an owned card |
| R1b | (no frame) | Bracket unchanged | `bracket stays 2 · Core` (v2) |
| R2 | Results R2 | Under 12: `<n> swaps toward <S>`, `Fewer than 12 fit this deck, so both credits are back.`, still startable | pad to 12 |
| R3 | (no frame) | Precon list changed since the run (ingest) | shipped past-run note; Start off; `Run <S> again` stays |

## Start (S)
| Id | Drawn | What shows | Must not |
|---|---|---|---|
| S1u | Start | S1 + sentence `With the 14 swaps toward Artifacts…`; facts Cards / Bracket / You own / Printings | apply to an existing deck |
| S1ud | (no frame) | pending / failed | as S1d / S1e |
| S2u | (no frame) | Arrival: Your deck of the draft, shipped strip with body `precon-upgrade.arrival` (DRAFT); Versions: v0 the box, the draft's diff = the swaps | commit for the player |

## Another (A)
| Id | Drawn | What shows | Must not |
|---|---|---|---|
| A1 | Another A1 | Unrun row selected opens its full card (in place on a phone; under the strip at 1300) + press `Another upgrade … · <S> stays here` | hide what it costs |
| A2 | Another A2 | Run rows show `N swaps · <date>`; selecting swaps the stored result in, free | re-run on select |
| A3 | Another A3 | Same direction again: inline ask `You upgraded toward <S> on <date>, on this same list…` · `Run it again` · `Keep <date>'s` | spend before the press |

## Who leads (C), addendum A1
| Id | Drawn | What shows | Must not |
|---|---|---|---|
| C0 | (no frame) | No backed alternate | the step; any mention of an alternate (R1 as drawn) |
| C1 | Commander C1 | `Who leads` two commander cards (art, pushes line, cost + mana value, backing count, directions, source line); press off `Choose who leads, then a direction.` | pre-select either; show directions before a pick |
| C2 | Commander C2 | Folded row `Led by <name> · <box's one> moves into the 99 · <directions>` + `Change`; `Where to take it · worked out for <name>` + that commander's cards; press and line as P1 | charge more; keep the other commander's directions |
| C3 | Commander C3 | `Change` pressed: both cards, current one selected, directions dimmed and inert | clear a stored result |
| C4 | (no frame) | Other commander chosen after a pick | keep the old direction pick |
| CR | Commander CR | First group `Commander · your pick · not one of the swaps`: `− <box's one> to the 99` → `+ <alternate> leads`, why line; mono line opens `led by <name>` | count it toward 12 to 18 when it moves into the 99 |
| CRo | (no frame) | Run takes the box's commander out | a separate group: it is a cut under its theme (G8) |
| CS | Commander CS | S1: commander row is the alternate; fact `Commander · <alt> · <box's one> moves into the 99` | change the head's own Start |

## Must-nots
- No pre-selected strategy; no "recommended", "best" or default plan; the Overview's plan marked only as a source.
- No ownership verdict word (`STATES-precons.md` must-nots hold); counts only.
- No model, token, prompt, pipeline or "AI" wording in copy; no rejected or repaired line ever shown.
- No added card over $12 drawn or priced; an unpriced add never shows.
- No per-pair Pick, no part-set Start.
- Start never touches an existing deck and never commits.
- No motion beyond v2's wait line.
- No credit cost for the commander choice; no pre-selected commander.
