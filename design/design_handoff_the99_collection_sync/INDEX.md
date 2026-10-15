# The 99 — Collection Sync · R2 handoff package

A third choice at upload, Sync, beside Replace and Add, and its review: the file's changes taken, the app's kept, and the
cards both sides changed differently decided by the player. Phone and desktop.

Source of truth: `docs/superpowers/design-briefs/2026-10-14-collection-sync.md` (branch `brief/collection-sync`).

## Start here

R2 (2026-10-15): where an `R2 - *` board exists it replaces the `R1 - *` one. R2 tightened the desktop choice cards
and renamed `Kept from the app` to `Kept from The 99`; README §R2 has the details.

| Read | For |
|---|---|
| **`The 99 - Collection Sync (R2).dc.html`** | **The ten calls, the merge rule and the locks, in one board.** |
| `R1 - Choice-Desktop.dc.html` / `R1 - Choice-Phone.dc.html` | The choice with three cards: nothing picked, Sync picked, unavailable, focus. |
| `R1 - Stale.dc.html` | The stale-file banner and Sync's follow-up, both widths. |
| `R1 - Review-Desktop.dc.html` / `R1 - Review-Phone.dc.html` | The review with no conflicts, and tokens only. |
| `R1 - Conflicts-Desktop.dc.html` / `R1 - Conflicts-Phone.dc.html` | A few, many, all answered, the held button, focus. |
| `R1 - Edge-States.dc.html` | Reading, a re-sync, nothing to keep, the cap, the stale pick named. |
| `R1 - Confirm.dc.html` | Short-deck dialog, confirming, refused, unconfirmed. |
| `R1 - Receipt.dc.html` | The summary, History's entry, the partial revert. |
| `R1 - About-Entry.dc.html` | The About edits. |
| `README.md` | Each open question answered, with reasons; the gap report. |
| `STATES-collection-sync.md` | The matrix. |
| `READINESS.md` | R2, approved by Hugh. |
| `collection-sync · copy strings.ts` | Every new string, for `/copy-review`. |
| `about · collection sync.ts` | The About edits as code. |
| `design-tables/collection-sync.md` | The design-table section. |
| `brand/` | The locked brand sheet. |

The same canvas is live as a Design artifact in account 2. Open the `.dc.html` files with `support.js` beside them.

## The answer in one line

Sync is the third card, none picked; its review is the shipped review with four Sync tiles, one tokens line, and the
cards both sides changed on top as pairs of radios with two bulk presses; every count is in cards.
