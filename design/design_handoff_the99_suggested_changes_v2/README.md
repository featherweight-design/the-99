# The 99 · Suggested changes v2 (account 2, 2026-10-28)

Ask for N cards in and N out, say what to change, and pick N of each from about 1.5N offered.
Canvas: https://claude.ai/artifact/QY9JsqnZvEcQNWvaAQ9QcJ (Main, Intake, Not-At-99, Results-3, Results-10, Results-20, Short-Run, Wait, History, Apply, About).
Status: APPROVED by Hugh 2026-10-28 ("This all LGTM"), after R1b, R2 (his rulings with engineering) and R2b. READINESS: Green (see `READINESS.md`).

Source of truth: `docs/superpowers/specs/2026-10-27-suggested-changes-v2-design.md` (#2295; §3, §4, §5.5, §7, §7a, §11). Eval: `scripts/eval/` (#2291), `docs/superpowers/eval/count-mechanism/`.
Extends `design_handoff_the99_tuning_hub/` and `design_handoff_the99_deck_tuning/`. The pick pattern follows the Proposed cuts list (`design_handoff_the99_small_items/` item 1). The About change is in the visual system (`design_handoff_the99_about_visual/`).

Drawn over the shipped Tuning hub and Suggested changes (two lists) at 390 and 1300. Fixture: HD - Half Shell, Core, focus +1/+1 counters. Card images are real cards from earlier rounds; reasons and figures are stand-ins.
States are in `STATES-suggested-changes-v2.md`; every new string is in `suggested-changes-v2 · copy strings.ts`.

## Boards

| Board | What |
|---|---|
| Main | The rulings, Hugh's feedback, the calls, engineering gaps |
| Intake | Fresh; filled (N=10, two chips, bracket Up to 3); how a chip behaves; edges (same request, N at 20); the bracket card's four choices |
| Not-At-99 | Under 99 (inert tile, Top off link), over 99 (Proposed cuts link), drifting off 99 mid-flow |
| Results-3 | N=3, 5 a side, flat: nothing picked, 3 + 2 (Apply waits), 3 + 3, applied |
| Results-10 | N=10, 15 a side, By type (default) and By role |
| Results-20 | N=20, 30 a side, aimed at 3 · Upgraded: reached, and not reached |
| Short-Run | Under N: "Found 14 under your $2 cap" (charged) and short for no stated reason (refunded) |
| Wait | Streaming: 0:12 first additions, 0:38 cuts follow, 0:52 taking a while, 2:04 about two minutes, 2:21 in and a little short |
| History | The run list, an old run still live, a stale run; the request beside the results |
| Apply | Confirm (modal / sheet), 20 + 20 at the max height, applied, undone, apply fails |
| About | Decks › Analysis: the Suggested changes label, a new Good to know card, the credits card, the Try it line |

## The design

1. **Only at 99.** Suggested changes runs on a deck at exactly 99 (100 with the commander) and keeps it there. Under or over, its tile goes inert in the shipped way and its line links to Top off (Your deck) or Proposed cuts. If the deck drifts off 99 mid-flow, Send and Apply stop and say why with the same link; picks are kept.
2. **Intake: one panel, three numbered steps, one Suggest changes press.** No Next. An empty request still sends.
   - Step 1: the − N + stepper, 1 to 20 (20 the launch maximum), with "3 in, 3 out. You'll pick from about 5 of each."
   - Step 2: "What are you looking to change?", never pre-filled. **What we noticed** wraps under the box at both widths: up to four chips (short role, focus, newest game note, second role). A tap appends its sentence, highlighted for a beat; the chip turns dashed with ✓ and comes back if its words leave the box.
   - The **Bracket** card sits beside the box on desktop (the box grows to its height) and under the chips on a phone: Keep at 2 · Core (the default), Down to 1 · Exhibition, Up to 3 · Upgraded, Up to 4 · Optimized, each with its line. Keep means nothing suggested moves the deck out of its bracket.
   - Step 3: the shipped Kept for this deck box, unchanged.
   - Same inputs on an unchanged list ask once before spending (spec §8).
3. **Results: one list per side, one Pick per row.** The shipped two-list line with Add/Reject replaced by one toggle, Pick → ✓ Picked. Desktop side by side; a phone switches halves with the shipped segmented control, each carrying n of N. A side at N greys its other Picks (picks capped at N per side). No Reject.
   - Flat at 5 a side. From N=4, rows group under the deck toolbar's **By type · By role** switch with the same stored choice (`the99:deck-grouping`, default By type). By type: the deck page's type groups with the deck's count. By role: the shelf roles with "you have X of Y". Each heading says where the picks take it.
   - With a bracket aim, *You asked* carries it, each addition that reaches it carries the shipped bracket flag with "the bracket you asked for", and the bar says "bracket 2 → 3 · Upgraded, as asked", or that the picks don't reach it and how (Apply still allowed).
4. **Apply: one action, a confirmation, one Undo.** The pinned bar keeps the tally (+N in −N out). Unequal counts keep Apply off and name the fix. Equal: **Apply 2N changes**. It opens a confirmation (ModalChrome eyebrow head, 560; the shipped sheet on a phone) listing what comes in and goes out with the bracket outcome, max height **min(640px, 100dvh − 96px)** on desktop and **88%** as a sheet; head and button stay, the lists scroll. ✕ closes with nothing changed. Applied: rows read ✓ Added / ✓ Cut and the bar holds **Undo all 2N** until the next commit; the unpicked rows stay pickable. Undone: all back, picks kept. A failure is the shared toast; nothing is half-applied.
5. **The wait: never cut short.** A clock and "11 to add and 4 to cut so far". Additions stream in, then cuts; each row lands at the end of its list marked *new* for a beat; a side groups once it is all in. Each list ends in **Still finding more** (cuts first say "Cuts start once the first additions are in"). Picks work from the first row and are kept; Apply opens when both lists are in. A note at about 45 seconds and another at about 2 minutes. A run that finishes short gives its count and reason. No Stop control; leaving is fine, the tile shows the run and it lands in History.
6. **A short run** (under N) says how many it found and which restriction bound it; every count downstream follows the shorter list. Charged when the player's own restriction explains the gap, refunded otherwise (spec §9).
7. **History** quotes each run's request and says asked · found · applied. An opened run shows *You asked* beside its outcome on desktop (stacked on a phone). Same version: still live, with its Undo. A newer version committed: read-only with the shipped past-run note; rows read Added, Cut or Not picked. No Suggest again; New run opens a fresh intake.
8. **About** (Decks › Analysis): the Suggested changes label, a new Good to know card (pick N of each, counts match before Apply), the credits card (a short run keeps its credit only when your own limits held it short) and the Try it line. Copy table on the About board.
