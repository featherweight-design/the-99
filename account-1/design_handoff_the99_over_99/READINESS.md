# READINESS — Decks over 99 (R1)

**Self-assessed: 🟢 Green. One item needs a ruling and it is a vocabulary question, not a
drawing question — both answers are already drawn.**

## Needs a ruling — one item, no redraw behind either answer

1. **The fifth status pill value.** `Over` is new, and the deck-import handoff closed this
   vocabulary at four with a reason on record. Design's position is that the reason does not
   apply: it was about `unresolvedCount`, a *new input* threaded through the server list and
   the optimistic client list, whereas `statusPill()` already takes `built`. This is one
   branch on an argument that is already there.
   The alternative — falling back to `Building` at 104 — is drawn in the canvas's pill scale
   and costs nothing to switch to: one branch returns a different string, and the count, the
   bar and the trim line are unaffected. Design does not recommend it, because `Building` at
   104 sits beside a `Complete` 99 and makes the bigger deck look less finished for no stated
   reason.

## Called, not asked — flagged for the record

2. **`Complete` and `Playable` narrow to `built === 99`.** This is the load-bearing half of
   the pill change and it has a free consequence worth noticing: a deck that *arrives* over 99
   can never fire the completion reveal, which closes the #42 celebration collision from a
   third direction with no new suppression.
3. **Cutting 104 → 99 by hand fires the reveal.** `shouldCelebrate` is untouched. Design wants
   this: the status flips on a removal the player performed, which is neither an import arrival
   nor a fill. If Product would rather the reveal only ever fire on the way *up*, that is a
   fourth suppression and a new argument, and this handoff would argue against it.
4. **`MATURE_DECK_SIZE` stays `>= 99`.** An over deck claims your collection hard. Do not
   narrow it to `=== 99` for symmetry with the pill — the pill is about legality, that constant
   is about physical sleeved cards.
5. **`deck-full` and its message are deleted, not reworded**, along with the union member and
   the test that names the number.
6. **No numeric ceiling at all**, and the bar's re-scaling is what makes that safe to draw.
7. **The trim line is in the spine's centre column, not a band.** If the audit reads it as
   under-weighted, promoting it to a `RollupBands`-style band is a redraw of one frame — but it
   would put deck arithmetic in the same visual family as a collection conflict, which is the
   thing decision 4 is avoiding.

## Not blocking, and worth reading before estimating

8. **The optimistic list is where this can go wrong.** The pill, the count, the bar and both
   lines all derive from `counts.built`, which the builder already threads from its optimistic
   list into the spine. So crossing 99 moves all five in one frame for free — and that is the
   first thing to check in review, because the server list settles a moment later and any
   surface reading `deck.built` instead of `counts.built` will flicker.
9. **`toBuyCount` on an over deck is asking the player to buy cards for slots that do not
   exist.** `96 owned · 8 to buy` at 104 is arithmetically honest and practically strange, and
   the Shopping view will offer all eight. Not drawn differently; gap 3.
10. **Nothing walks the player to the cards to cut.** Deliberate — the five most recently added
    are almost never the five they want to lose. Gap 2, and the most likely thing to be asked
    for next.
11. **Two `--warning` lines can share the deck card** (`n to cut` and the unresolved marker),
    same type, same slot, distinguished by wording. Drawn as a deliberate stack, over first.
12. **`built === 100` is a singular everywhere.** `+1`, `1 to cut`, *"One over the
    ninety-nine. Cut one and it is legal."* The copy file carries both forms; nothing renders
    `1 cards`.

## Not blocking

- No new token, no new hex, no new motion class, no new component, no new band, no new modal,
  no toast, no live region, no confirm step, no ceiling, no `--danger` anywhere.
- Under 99 every surface is byte-identical to what ships, including `Math.min` on the bar.
- `RollupBands`, `celebration.ts`, `availability.ts`, `last-slots.ts`, `fill.ts`, `suggest.ts`
  and the role counter strip are all untouched.
- The fill controls and every suggestion path still stop at 99. Only a human add and an import
  can exceed it.
- The last-31 strip unmounts on an over deck with no code change (`openSlots <= 0` already
  returns an empty plan).
- Export stays enabled and stays brass; the only change there is one sentence inside the
  dialog.
- Every figure in the canvas is arithmetically consistent: 104 = 96 owned + 8 to buy;
  99 / 104 = 95.2%; 5 to cut; 137 gives 72.3% / 27.7% and 38 to cut.
