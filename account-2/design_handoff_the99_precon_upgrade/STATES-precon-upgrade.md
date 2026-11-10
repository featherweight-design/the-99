# STATES: Upgrade this precon (R2b)

Every frame at 390 and 1300 unless noted. Board names are the canvas's. Anything not named here is as shipped in `design_handoff_the99_precons` (O1–O6, S1) and `design_handoff_the99_suggested_changes_v2`.

**Applies everywhere.**
- 44px hit size on a phone.
- Selection says select / unselect, never tick.
- Dates are US short (`Nov 10`).
- Strategy glyphs come from `strategy-icon.tsx`, with the dashed fallback (G3).
- Drawer on a phone (no ✕; swipe or Back closes it); dialog on desktop (bare ✕).

## The page (E)
| Id | Drawn | What shows | Must not |
|---|---|---|---|
| E1 | Entry A | The plate under the Overview: fan of three of the deck's cards, `Upgrade this precon`, sentence, cost line, chevron; the whole plate presses (B: accent-outline button + glyphs) | push the list down with cards; move the head or dock; list past upgrades |
| E2 | (no frame) | A newest result exists | any history line; the press opens on that result |
| E3 | Entry E3 | Nothing backed for any commander: no row | a press into an empty flow |
| E4 | (no frame) | Switch off, early list, or no Start on the page | the row |

## The flow (I, C, B, S)
| Id | Drawn | What shows | Must not |
|---|---|---|---|
| I1 | Intro | Five expect-lines; foot standing + `Next · Commander` (or `Next · Bracket`) + `Not now` | a pick on this screen |
| C1 | Commander C1 | Two commander cards, none selected; Next off + `Choose who leads.` | pre-select |
| C2 | Commander C2 | One selected; Next on | charge for the choice |
| C3 | Commander C3 | Reached from the stepper with later picks made; a different commander clears the strategy, keeps the bracket | clear a kept result |
| B1 | Bracket B1 | 2 / 3 / 4 as the climb's rungs: bracket mark in its ink, name, sentence; box's own `where the box plays` in the role slot; Next off | offer 1 or 5; pre-select; a mark drawn as an `<img>` (black) |
| B2 ink | Bracket B2 | Picked rung: ink 12% tint and ink edge, mark 36 at 1300, inked radio | accent instead of the rank's ink |
| B2 | Bracket B2 | One selected; Next on | |
| B3 | Bracket B3 | No backed alternate: stepper is Bracket › Strategy | a Commander step with one card |
| S1 | Strategy S1 | Cards for the commander and bracket; selected one makes the foot `Upgrade toward <S>` + `12 to 18 swaps · bracket <n> · uses 2 credits · <lot>` | a confirm dialog on a first run |
| S2 | Strategy S2 | No credits: press off, shipped spent line + `Get more credits` | lose the picks |
| S2f | (no frame) | Only the free credit: R1's P3 line in the foot | spend and refuse after |
| S3 | Strategy S3 | Same commander, bracket and strategy as a kept run: the foot is the ask, `Run it again` / `Open <date>'s` | spend before the press |
| S4 | (no frame) | Session lapsed: press → shipped sign-in → back on S1 with the picks kept (`?upgrade=<c>.<b>.<s>`) | spend on return without a press |

## Wait, failed, results (W, F, R, K)
| Id | Drawn | What shows | Must not |
|---|---|---|---|
| W | Wait W | Picks line + v2 clock + leave line + 3 skeleton rows; stepper done; press off `Running · 2 credits held` | stream pairs; Stop |
| W2 | (no frame) | Flow closed mid-run | the page row reads `Upgrading toward <S> · 0:04`; reopening shows W |
| F | Wait F | `That upgrade didn't come through. Both credits are back.`; `Try again` | name the cause |
| R1 | Results R1 | Title `Your upgrade`; head + mono line (led by, bracket `as chosen`, buys, owned, date); Commander group; pairs by cut theme; foot Start + `Try another strategy` | a Pick toggle |
| R1b | (no frame) | Bracket 2 chosen | `bracket stays 2 · Core, as chosen` |
| R1c | (no frame) | The box's own commander kept | no Commander group |
| R2 | Results R2 | Under 12 at the chosen bracket: counted, refunded, startable | pad to 12 |
| R3 | (no frame) | Precon list changed since the run | shipped past-run note; Start off |
| K | (no frame) | Reopened after a result | opens on the newest result; no list of past runs |

## Start (S1u)
| Id | Drawn | What shows | Must not |
|---|---|---|---|
| S1u | Start | S1 commander row = chosen; sentence `Led by <C>, with the <N> swaps toward <S>…`; facts Commander, Cards, Bracket `as chosen`, You own, Overview (proposed), Printings | apply to an existing deck |
| S2u | (no frame) | Arrival on Your deck: shipped strip; Versions v0 = the box | commit for the player |

## Must-nots
- No pre-selected commander, bracket or strategy, and no "recommended".
- No section of cards on the page: one row only.
- No model, prompt or "AI" wording; no rejected or repaired line.
- No added card over $12; no per-pair Pick; no part-set Start.
- The commander choice and the bracket cost nothing extra.
- No motion beyond v2's wait line.
