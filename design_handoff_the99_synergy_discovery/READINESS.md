# READINESS — Synergy discovery, and the last 31 (R1)

**Self-assessed: 🟢 Green with one ruling requested — and the ruling is a pre-existing defect this
pass makes reachable, not a design gap.**

The audit against §6's seven locked rulings is what settles this; the note below is what Design
believes it is handing over.

## Not blocking — the usual §0 caveat does not apply

**This handoff is not gated.** The previous two rounds on this track were 🟡 on §0. §0 is now
closed: the `Commander index` workflow populated staging with 3,342 commanders and 879,329
support-card rows, every row carrying both an inclusion and a synergy figure. What remains is a
read path on the commander route plus a join to `cards.type_line` — ordinary work inside this
feature. The brief says the readiness audit may treat this as ready-to-build, and Design agrees.

## Needs a ruling — one item, no redraw behind either answer

1. **The 99/99 celebration fires on a deck the player did not build.** `shouldCelebrate` triggers
   at 99/99. The 68-card fill deliberately stopped short, so the recommendations pass introduced no
   collision — **this pass does**, because reaching 99 in two clicks is the feature. The deck-import
   handoff (#42) flagged the identical defect from the other direction and it is still open; it now
   has two callers.
   Design's preference: the reveal is **suppressed when the last card was placed by a fill**, and
   the fill's own receipt is the counts plus the provenance line, which is what the recommendations
   pass already decided about arrivals ("no celebration, no moment"). Rejecting that costs one
   condition and no drawing.

## Called, not asked — flagged for the record

2. **The lift line is ungated from ownership** (`suggestion-tile.tsx`). Design table §8-6 has been
   holding this open on the question of whether the gate was about ownership or about thinner data.
   §0 answers it — all 879,329 rows carry both figures — so this pass closes it rather than
   deferring it a third time. One clause removed.
3. **The facet taxonomy is Design's split of `type_line`** into six buckets, and an
   artifact creature is filed as a creature. Not verified against the real type distribution of any
   commander's 258. If the distribution says otherwise, the strip's labels change and nothing else
   does.
4. **No search inside the panel**, deliberately, and it is the most likely thing to be asked for.
   Gap 6.
5. **The two locked promise strings are untouched.** `stickyPromise` and `seedNote` keep their
   text; the selection copy is a third string that branches. If the audit reads ruling 6 as
   forbidding a *branch* as well as an *edit*, the promise line cannot state the arithmetic and the
   selection becomes invisible on the desktop left column — say so, because that is a redraw.
6. **The exclusion is silent, with no count of hidden cards.** §7.3 invited the question of how
   ownership reads; this is the answer to its neighbour, not a deferral.

## Not blocking, and worth reading before estimating

7. **The dedupe between surface-A selection and the 68-card fill is not free.** A selected card
   that `planFill` would also have placed must not be placed twice, and the deck must not land at
   98. Design expects selection first, fill against the reduced pool — which means the fill's role
   counts can differ from the zero-selection case, and the provenance line's arithmetic has to
   follow. Arithmetic, not layout, so nothing here is redrawn by it.
8. **The last-31 top-up is not the 68-card fill's top-up.** `getDeckSuggestions`' flat
   `slice(0, 5)` (`actions.ts:106`, `:153`) is a different thing; the recommendations addendum
   already corrected the record on it. The last-31 controls are two new server actions over the
   ranked support list, and the roles are already met so there is no role bounding at all.
9. **`cardType` should be computed server-side, once.** The facet strip and the `All` facet both
   need a coarse bucket off `type_line`; parsing per row in the client puts the taxonomy in two
   places.
10. **The exclusion must run server-side, before the counts.** Excluding in the client means the
    facet counts are computed twice off two different lists, and they will drift.

## Not blocking

- No new token, no new hex, no new motion class, no new empty-state construct, no new modal, no
  tray, no confirm step, no toast, no new tag, no price, no derived score, no virtualisation.
- `role-counter-strip.tsx` / `role-counter-cell.tsx` untouched — the last 31 is not a role.
- `planFill` untouched; `FILL_BASELINE_TOTAL` stays derived; ruling 6's 68 is unchanged.
- `addCardToDeck` untouched — it already validates, enforces singletons and caps at 99.
- `Clear all auto` untouched, in the position and with the strings it ships.
- The null rule is drawn on **both** figures, independently, in four places (row synergy dash, row
  inclusion dash, tile `no synergy figure`, the facet-empty line) and **nowhere renders a 0%,
  a +0 pts, or a zero-width bar**.
- Every figure in the canvas is arithmetically consistent: 10 + 10 + 8 + 3 + 37 = 68; 68 + 31 = 99;
  the shallow-pool frame is 12 of 31; the short frame is 92 with 7 remaining; Shopping stays at 7.
