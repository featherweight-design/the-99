# The 99 · Suggested changes v2 · R1b (account 2, 2026-10-28)

Canvas: https://claude.ai/artifact/QY9JsqnZvEcQNWvaAQ9QcJ
Status: R1b, awaiting Hugh's audit. Goes to main only on approval, as `design/design_handoff_the99_suggested_changes_v2/`.

Source of truth: `docs/superpowers/specs/2026-10-27-suggested-changes-v2-design.md` (PR #2295, §3, §4, §5.5, §7, §7a, §11); eval in `scripts/eval/` (#2291) and `docs/superpowers/eval/count-mechanism/`.
Extends `design_handoff_the99_tuning_hub/` and `design_handoff_the99_deck_tuning/`; the pick pattern follows prompt 22's Proposed cuts list (`design_handoff_the99_small_items/` item 1); the About change is in prompt 21's visual system (`design_handoff_the99_about_visual/`).

Drawn over the shipped Tuning hub and Suggested changes (two lists) at 390 and 1300. Fixture: HD - Half Shell, focus +1/+1 counters. Card images are from the design folder (Scryfall is blocked in the container).

## R1b · Hugh's feedback (2026-10-28)
- What we noticed moves under the box on desktop too (beside it left a tall gap). Chips wrap in a row; the bracket piece sits under them.
- Applied rows: a 20px ✓ box (was 15) and **Added** / **Cut** in sentence case, 13px (also **Not picked** on a stale run).
- Grouping is the player's choice: the deck toolbar's **By type · By role** switch (`SegmentedSwitch`, `DECK_GROUPING_LABELS`) sits above the lists and uses the same stored choice (`the99:deck-grouping`, default By type). By type uses the deck page's type groups with the deck's count; By role uses the shelf roles with "you have X of Y". Results-10 shows both.

## Hugh's closed calls this draws
- Runs only at 99 and keeps the deck at 99. Under: Top off. Over: Proposed cuts.
- Intake: N (cuts equal N) · "What are you looking to change?" never pre-filled, with tappable suggestions beside the box · restrictions. Then send.
- Results: about 1.5N a side, one list per side, pick any N from each. No alternates per card.
- Nothing held back: a short run says how many it found and which restriction limited it.
- No Suggest again: a new run starts from a fresh intake; old runs live in History.

## Boards

| Board | What |
|---|---|
| Main | The eight calls, Q1 / Q7 / picks past N, engineering gaps G1-G5 |
| Intake | Fresh, filled (N=10, two chips, bracket piece on), how a chip behaves, edges (same request as last time, N at 20) |
| Not-At-99 | Under 99 (inert tile, Top off link), over 99 (Proposed cuts link), drifting off 99 mid-flow |
| Results-3 | N=3, 5 a side, flat: nothing picked, 3 + 2 (Apply waits), 3 + 3 (Apply 3 + 3), applied with one Undo |
| Results-10 | N=10, 15 a side, grouped By type (default) and By role (the other choice), each heading with where the picks take it |
| Results-20 | N=20, 30 a side, grouped; the bracket flag on the set |
| Short-Run | "Found 14 additions under your $2 cap" (charged), and short for no stated reason (refunded) |
| Wait | 0:09 choosing additions; 0:41 additions in and pickable, cuts writing; 1:52 a refill, taking longer than usual; the landing tile meanwhile |
| History | The run list (request quoted, asked · found · applied), an old run still live, a stale run |
| About | Decks › Analysis: Suggested changes label, new Good to know card (pick), credits card, Try it line; copy table |

## The calls
1. Intake is one panel with three numbered steps and one Suggest changes press; no Next. An empty request still sends. Step 3 is the shipped Kept for this deck box.
2. How many: the − N + stepper (1 to 20), with "3 in, 3 out. You'll pick from about 5 of each."
3. The request box is empty. What we noticed sits under it at both widths: up to four chips (short role, focus, a game note, a second role). A tap appends its sentence; the chip turns dashed with a ✓ and comes back if its words leave the box.
4. Results: two lists, one Pick toggle per row (Pick → ✓ Picked). Desktop side by side; phone uses the shipped segmented control with n of N on each half. A side at N greys its other Picks.
5. Flat at 5 a side; grouped from N=4, By type by default, By role on the player's choice.
6. One Apply for the set and one Undo (spec Q1 proposal). The pinned bar keeps the tally; unequal counts keep Apply off and name the fix; equal reads "Apply N + N".
7. The wait shows the two calls as two steps; additions land early and are pickable while cuts are writing (needs G1).
8. History keeps the request; an old run opens as its lists with picks marked, read-only once a newer version is committed.

## Open for Hugh
- Q1 · one apply for N+N, one undo (drawn to the proposal).
- Q7 · structured bracket choice beside the box, drawn as an optional piece (dashed, "ships later").
- Picks past N: drawn capped at N per side; lifting the cap keeps the equal-counts rule.

## For engineering
- G1 · save call 1's kept additions as a run state (e.g. `adds_ready`) so the wait can show them.
- G2 · each suggestion carries its card type group (`cardTypeGroup`) and its shelf role (the role counter's); no role → Threats & synergy.
- G3 · chip sources: worst role gap, focus, newest game note, second role gap; at most four, hidden when empty.
- G4 · the same-request check (spec §8) runs on press, before a credit is reserved.
- G5 · every string is a placeholder for /copy-review. Retires Suggest again, Suggest again anyway, the unchanged lead, Additional notes, Reject on v2 rows.

## Files
- `*.dc.html` reference `art/`; the canvas copies point at uploaded assets (`scratch-gen/scg/blobs.json`, `toblob.py`).
- `scratch-gen/scg/`: `python3 build.py local` writes `out/`; `shot.js` renders and measures each board.
- `scratch-gen/about/about_v2.py` runs inside the about_visual generator (`design_handoff_the99_about_visual/scratch-gen`).
