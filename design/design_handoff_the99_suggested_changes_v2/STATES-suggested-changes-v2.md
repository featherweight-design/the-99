# States — Suggested changes v2 (approved 2026-10-28)

At 390 and 1300. Board names refer to the canvas. Everything not named here is as shipped in `design_handoff_the99_tuning_hub` and `design_handoff_the99_deck_tuning`.

**Applies everywhere.**
- **Dates:** US short form, month first (`Oct 26 · 18:22`).
- **Tool mark:** `TuningToolMark` for Suggested changes, beside its name.
- **Phone hit size:** 44px on every control (stepper, chips, bracket choices, Pick, segments, Apply, Undo, ✕).
- **The count rule:** additions and cuts must match before Apply, so the deck stays at 99. Picks are capped at N per side.

## Landing (the tile)
| State | Drawn | What shows | Must not |
|---|---|---|---|
| Ready, at 99 | Not-At-99, Wait A | Shipped tile; purpose "Say what you want changed…"; `1 credit per run`, last run | — |
| Under 99 | Not-At-99 A | Inert (dashed, faint, not a button); line "…This one is at 96: top it off first."; one link `Top off on Your deck →` | open the tool; show Send |
| Over 99 | Not-At-99 B | Inert; "…This one is 3 over: cut it to 99 first."; link `Proposed cuts →` opens it in place | — |
| Run in flight | Wait A | Accent edge, dot, `choosing cuts · 0:41`; History `· 1 running` | banner, toast |

## Intake
| State | Drawn | What shows | Must not |
|---|---|---|---|
| Fresh | Intake A | Steps 1 · 2 · 3, N = 3, empty box with placeholder, four chips, Bracket on Keep, shipped Kept for this deck box, Suggest changes + credit line + usual time | pre-fill the box; pre-select a chip |
| Filled | Intake B | N = 10; tapped chips dashed with ✓; text in the box; Bracket Up to 3 | — |
| Chip tapped | Intake C b | Its sentence appended at the end, highlighted for a beat; cursor follows | replace typed text |
| Chip's words removed | Intake C c | The chip returns to + | track other chips' words |
| N at 20 | Intake D | + greyed, `20 at most` | allow 21 |
| Same request | Intake D | Inline confirm: "Same request as your Oct 26 run…", `Run it again` / `Open Oct 26's run` | spend before the press |
| Deck drifts off 99 | Not-At-99 C | Send off; the line says the count and links Top off / Proposed cuts; picks kept | lose the request or picks |
| Out of credits | as shipped | The shipped credit line and refusal | — |

## The wait (streaming)
| State | Drawn | What shows | Must not |
|---|---|---|---|
| First additions | Wait A | Clock, "4 to add and 0 to cut so far", usual time; Additions rows in arrival order; `Still finding more`; Cuts: "Cuts start once the first additions are in." | steps panel; Stop |
| Both arriving | Wait B | Rows append, newest marked `new` for a beat; picks work and count; bar: `+4 in −1 out · still finding more`, "Apply opens when both lists are in. Your picks are kept.", Apply off | reorder or regroup a side while it is arriving |
| ~45 s | Wait C | Note: "This is taking a while…" | cut the run short |
| ~2 min | Wait D | Note: "Still going, about 2 minutes in…"; a finished side reads `All 15 in · grouped by type now` | — |
| In, a little short | Wait E | Count and reason line; bar becomes the normal Apply bar | pad the list |
| Left the page | Wait A (tile) | The run continues; tile shows it; it lands in History | — |

## Results
| State | Drawn | What shows | Must not |
|---|---|---|---|
| Nothing picked | Results-3 A | Both sides, `0 of N chosen`; bar "Pick up to N of each…", Apply off | — |
| Unequal | Results-3 B, Results-10 | Bar `+3 in −2 out · the deck would go to 100`, warn line naming the fix; Apply off | apply a deck off 99 |
| Equal | Results-3 C | `Apply 2N changes`, bracket outcome in the tally | `Apply N + N` |
| A side at N | Results-10 | Its other Picks greyed; unpick to swap; chip green | allow N + 1 |
| Grouped By type | Results-10 A, Results-20 | From N = 4: type groups with `n in the deck · m with your picks` | group at 5 a side or fewer |
| Grouped By role | Results-10 C | Shelf roles with `you have X of Y` | a separate grouping setting |
| Bracket aim reached | Results-20 A/B | *You asked* shows the aim; flagged additions; bar "bracket 2 → 3 · Upgraded, as asked" | — |
| Bracket aim not reached | Results-20 C | Warn line "You asked for 3 · Upgraded. None of your picks moves it…"; Apply still on | block Apply |
| Short (under N) | Short-Run A | "Found 14 under your $2 cap", counts follow the shorter list (`of 14`, Apply up to 14 + 14), credit kept | pad |
| Short, refunded | Short-Run B | Head says so; credit back | — |

## Apply
| State | Drawn | What shows | Must not |
|---|---|---|---|
| Confirm | Apply A | ModalChrome eyebrow head (560) / sheet: "Apply 3 in, 3 out", "The deck stays at 99. Bracket stays 2 · Core.", Coming in / Going out with card thumbs, ✕, `Apply 6 changes` | a second cancel button |
| Confirm, 20 + 20 | Apply A2 | Max height min(640px, 100dvh − 96px) / 88% sheet; lists scroll with a bottom fade | grow past the max |
| Applied | Apply B, Results-3 D | Rows ✓ Added / ✓ Cut; bar `back at 99`, `Undo all 6` until the next commit; unpicked rows still pickable | per-row undo |
| Undone | Apply C | "Undone. All 6 are back as they were…"; picks kept; Apply 6 changes | clear the picks |
| Failed | Apply D | Shared toast "Couldn't apply. Nothing changed, and your picks are kept." | half-apply |

## History
| State | Drawn | What shows | Must not |
|---|---|---|---|
| Run list | History A | Request quoted to one line; asked · found · applied; tier; outcome pill (`running`, `short`, `ok`); refunded tier struck | — |
| Old run, same version | History B | *You asked* beside the outcome (desktop); Added / Cut rows; `Undo all` while uncommitted; unpicked still pickable | — |
| Stale run | History C | Shipped past-run note; no Picks, no bar; rows Added / Cut / Not picked | Apply |
| v1 run | History A | Its stored summary, unchanged | rewrite |
