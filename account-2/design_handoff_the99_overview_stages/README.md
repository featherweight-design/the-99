# The 99 · Overview stages and why these cards (account 2, 2026-10-30)

Canvas: https://claude.ai/artifact/8pnpUJ5CEbAPA98vqJqWgQ
Status: R1, awaiting Hugh's review. Goes to main only on approval, as one small-items-style handoff.

Two small items from Hugh's design prompt of 2026-10-30, each drawn over the shipped surface it changes, at 390 and 1300. Everything not listed stays as shipped. Strings marked as drafts are for /copy-review.

Sources read: main @4c15b9f; brief `docs/superpowers/design-briefs/2026-10-29-overview-iteration-3-renderer.md` and `overview-i3-samples/` (branch design/overview-i3-renderer-brief, PR #2397); `src/components/decks/{synopsis-body,synopsis-overview,receipt-modal,suggested-changes-run}.tsx`, `src/lib/synopsis/{stages,limits}.ts`, `src/lib/copy/{synopsis,precons}.ts`; handoff suggested_changes_v2 (and small_items_4's kit).

| Board | Item |
|---|---|
| `Main.dc.html` | The calls |
| `Overview-Stages.dc.html` | 1 · Overview: the stages and the alternate commander |
| `Why-These.dc.html` | 2 · Suggested changes: why these cards |

## 1 · Overview: the stages and the alternate commander

Drawn in the shipped Overview modal (`SynopsisSections`, ModalChrome 700; the phone sheet), with the samples' iteration-3 text verbatim: Counter Intelligence (a precon whose box carries Kilo, Apogee Mind) and HD - Brago (a player's own deck).

1. **Game plan** replaces Core strategy's numbered list: three rows labeled by position, **Early**, **Mid**, **Close**, in the modal's mono label, on a rail of three 8px diamonds (the Weaknesses diamond), Close's in accent. Label column 72px desktop, 66px phone. Labels come from `STAGE_LABELS`, never the model.
2. **Alternate commander (precon only):** directly under Close, inside Game plan, a sunken box like Keep and Send back, the Commanders crown and the label **Alternate commander**, then the line. Absent for a player's deck and a precon without one: the section ends at Close, nothing says it is missing.
3. **The land line:** one body line under the Mulligan heading, above the Keep and Send back boxes, replacing the fixed range each box drew first. The boxes hold only their 1 to 2 lines.
4. **Key tips** stay after Mulligan with the left rule, now exactly 2. **Key cards** unchanged in place and form (5 to 8).
5. Unchanged: the Overview paragraph and its entries, Weaknesses, Based on, the refused slot, the stale banner, the version modal.
6. Copy (drafts): *Game plan* · *Early* · *Mid* · *Close* · *Alternate commander*.

## 2 · Suggested changes: why these cards

1. **When:** from N = 6 (12+ changes). One constant.
2. **Where:** a **Why these cards** box (the You asked box's look) after the lead and read line, above the group switch and lists (desktop) or above the Additions/Cuts switch (phone); plus one line at the top of each list, under its count.
3. **What:** a lead (≤ 120 chars) on what the set does for the request; an additions line and a cuts line (≤ 160 each) naming the groups in that side with counts. At most two card links each (`CardName`).
4. **While streaming:** the box and both side lines hold their place from the first row with a faint line (*Written once both lists are in. Pick while you wait.* / *Said once both lists are in.*), so nothing lands above a list being picked from. They fill when the cuts finish.
5. **History:** stored with the run, shown on a past run. Older runs draw no box.
6. **Engineering:** written in the cuts call as `why: { lead, add, cut }` on the stored report; each line runs the run's own checks; a failed line is left out, a failed lead drops the box.

Below N = 6 the results are as shipped.

## Files

The `.dc.html` artboards (images as `/_blob/` urls on the canvas), `canvas.json`, `art/` (the card crops uploaded), `support.js`. `scratch-gen/scg/ov.py` regenerates the boards (`python3 ov.py local`, then `node shot4.js Main Overview-Stages Why-These` to render and check), extending the Suggested changes v2 / Small items 4 kit.
