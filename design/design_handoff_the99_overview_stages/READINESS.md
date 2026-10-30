# Readiness: Overview stages, why these cards, toast and checkbox

**Verdict: Green.** Approved by Hugh on 2026-10-30 ("this looks great, nice work"). Item 1 builds option B (board `Overview-Visual`) on option A's rules (board `Overview-Stages`). Items 2 and 3 take the recommended call. The three items are independent.

## For Hugh

1. **Copy.** New strings for `/copy-review`:
   - Item 1: *Game plan* · *Early* · *Mid* · *Close* · *Alternate commander*
   - Item 2: *Why these cards* · *Written once both lists are in. Pick while you wait.* · *Said once both lists are in.*
2. **About.** The Overview and Suggested changes entries may each want a line (the stages; the why box on bigger runs). Your call, as always.

## For engineering, by item

1. **Overview (iteration 3 renderer, option B).**
   - `SynopsisSections`: Core strategy becomes **Game plan**, exactly 3 rows labeled from `STAGE_LABELS` by position, never from the model. Desktop (md+): three cards across on one line of diamonds (Close's diamond in accent), each with its lead card's image (the first `[[mark]]` in the line) at 72×100 and the line. Phone: the rail, each stage a card with a 52×72 image.
   - **Alternate commander:** only when the content carries `alternate` (precon whose box has one). A dashed box with the crown under the plan. A player's deck and a precon without one draw nothing in its place.
   - **Commander** beside the Overview paragraph: full card, 96×134 desktop / 72×100 phone, rotated −3°.
   - **Land line:** replaces the fixed range in Keep and Send back. A 64px figure tile (the `landKeepNumber`, Cinzel, "lands" under it) beside the model's line. The figure comes from the app's number, so it can't disagree with the line.
   - **Key tips:** exactly 2, each with its first two named cards fanned (52×72, −7° and +6°). One column on a phone.
   - **Key cards:** a grid of full card images (63×88 with name and job beside on desktop, 3 across; on a phone 3 across with name and job under).
   - **Weaknesses:** the leading "Moderate:" / "Minor:" becomes a chip (Moderate in `--warning`), the line starts after it.
   - Every image and name is the shipped card-open (`CardName`'s press and hover preview), art from `FindingArt`. A card with no art falls back to the name alone; never a broken image.
   - Unchanged: the Overview paragraph on the tab and the precon page, Based on, refused slots, stale banner, the version modal.
2. **Suggested changes: why these cards.**
   - From N ≥ 6 (one constant). A **Why these cards** box (You asked box's look) after the lead and read line, above the group switch (desktop) or the Additions/Cuts switch (phone), plus one line at the top of each list under its count.
   - Written in the cuts call as `why: { lead, add, cut }` (lead ≤ 120 chars, side lines ≤ 160, at most 2 card marks each), stored on the report and shown in History. Older runs draw no box.
   - The slots are held with the faint line from the first row; they fill when the cuts finish. A failed line is left out; a failed lead drops the box.
3. **Toast and checkbox: no code change.** The shipped `ToastFrame` and `Checkbox` are the app-wide style. The Announcements handoff carries an erratum pointing at them.

## Notes

- Item 1's option B fixture is HD - Half Shell with text written for the drawing (the canvas can't load the sample decks' card images). Option A's boards carry the samples' text verbatim.
- `scratch-gen/` regenerates the boards. It is reference material, never shipped code.
