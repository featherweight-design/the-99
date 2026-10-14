# READINESS — Update a deck by re-import (R1)

**Self-assessed: 🟡 Yellow. One hard dependency on a sibling amendment, and one item Design
wants a ruling on rather than a nod.**

This is the only one of the four that is a new flow, and the only one that can destroy the
player's work. Both facts are why it is Yellow rather than Green with notes.

## Blocking

1. **Amendment 3 must land first, or this flow needs a redraw.** An update that lands the deck
   over 99 is refused by `add-validation.ts:42`'s cap. The player's list then arrives five cards
   short with nothing on screen saying which five went missing — which is the single worst
   outcome available in this feature, because the whole promise is *the list becomes the deck*.
   If amendment 3 slips, the diff has to grow a hard stop: refuse to apply past 99 and name the
   cards it would drop. **That is a redraw of the apply bar and one new state**, and it is the
   only dependency between the four amendments.

## Needs a ruling — one item

2. **There is no undo of an applied update, and Design does not think the diff is enough on its
   own forever.** The diff is the confirmation, and the flow leans on it hard: removals first,
   `you added this` on hand-placed cards, a sentence counting them, a per-row `Keep`, and a CTA
   that states its own arithmetic. A player who skims all five of those and applies has lost
   cards they placed by hand over a month.
   Design's preference: **ship R1 as drawn, and treat undo as the next increment** — keeping
   removed rows for a session is a new table or a soft-delete column, and it should be estimated
   as its own thing rather than smuggled in here. What is needed now is Product agreeing that
   *the diff is the undo* for v1, on the record, because every mitigation above is a
   consequence of that decision.

## Called, not asked — flagged for the record

3. **This is the product's first confirm step**, and every previous pass refused one. The
   principle behind those refusals was that the action was reversible or cheap; this one is
   neither. Stated plainly so the audit does not read it as drift.
4. **The commander cannot be changed** (decision 6). A swap re-decides the colour identity and
   the legality of all ninety-nine — a new deck wearing an old name. Two exits, and the primary
   one is the shipped import flow carrying the text the player already pasted.
5. **Additions have no per-row refusal.** Refusing individual additions turns update into a
   curated merge, which is the quick-add bar's job.
6. **Default is remove.** The list is the source of truth; anything else means the paste does
   not do what it says.
7. **`auto` is cleared on every unchanged card the list names**, so `Clear all auto` afterwards
   cannot delete cards the player just declared. This is a real behaviour change to a shipped
   sweep and it is the least visible call in the handoff.
8. **Unresolved rows are replaced, not merged.** An old line number points into a file nobody
   has any more.
9. **The update arrival strip's dismissal is not persisted**, unlike a first import's. Reusing
   `arrivalDismissKey(deckId)` would mean the strip never shows on any deck that was ever
   imported. State 24 is the argument.
10. **The celebration is suppressed with no new flag** — the update param is read into the
    existing `arrivedFromImport` argument at the component boundary. `celebration.ts` is
    untouched.
11. **`>75%` is the everything-out threshold**, and it is a judgement. One constant, and the
    sort of number that wants tuning against real pastes.

## Not blocking, and worth reading before estimating

12. **The diff is computed twice, on purpose.** The client renders a plan; the server re-parses
    and re-plans on Apply, and **the only thing the client contributes is the `keep` array**.
    Trusting a client-computed diff would let a crafted request delete an arbitrary set of
    cards. Same reason `importDeck` re-validates the commander the picker sent back.
13. **`planDeckUpdate` should be pure**, in `src/lib/decks/update.ts`, for the same reason
    `import.ts` is: every ruling in the decisions log becomes a unit test instead of an
    integration one. `buildDeckImport` is reused unchanged to parse.
14. **`import-actions.ts`'s doc comment is now wrong** and it is load-bearing documentation —
    it is the sentence that warned against this feature arriving by accident. It should point
    at `updateDeckFromList` and keep saying that `importDeck` never dedupes.
15. **`you added this` is a proxy, not a fact** (gap 3). `auto = false` is also true of a card a
    previous import brought in, so those will be marked. The copy says *"you added this"* and
    not *"you added this by hand"* precisely because of that, and a previous import was still
    the player's list. Fixing it properly means recording how a card entered the deck — a
    schema change.
16. **A basic land's quantity change is invisible** (gap 2). Basics are the only cards with
    quantity > 1; they land in `unchanged` and reconcile silently. The diff will not tell you
    your Islands went 12 → 9.
17. **A 400-line paste produces a 300-row expanded group with no windowing** (gap 6) — the same
    hole `commanders-windowing` accepted at 214 rows. The four-rows-plus-disclosure cap holds
    the *unexpanded* screen at both widths.
18. **The diff cannot show what a card does** (gap 8). Rows carry a name and a type line;
    deciding whether to keep *Mystic Remora* may want the card. `CardDetailProvider` is not
    mounted on this route, and mounting it means a modal over a page whose whole job is one
    decision. Second most likely request.
19. **No stored source and no import history**, per `arrival.ts`'s ruling that provenance is a
    fact about one navigation. It is also the door to a real sync feature — which is what the
    shipped comment was warning about in the first place.

## Not blocking

- No new token, no new hex, no new motion class, no new modal, no toast, no dialog, no confirm
  *dialog* (the diff is a page), no `--danger` anywhere in the flow.
- Every failure banner, the parsing block, the mode chips, the textarea, the dropzone, the byte
  caps, the unresolved-row treatment and the arrival strip's geometry are shipped and reused.
- `celebration.ts`, `status.ts`, `fill.ts`, `last-slots.ts`, `suggest.ts`, `availability.ts`,
  `RollupBands` and the role counter strip are all untouched.
- `buildDeckImport` is untouched and reused whole, including the section skipping, the
  `*CMDR*` handling, the Partner note, the quantity clamp and the line numbering.
- One shipped edit in the entire amendment, and it is a code comment.
- Two new components (the diff page, the diff row), one new pure module, one new server action,
  one new route, one new URL param, no new localStorage key.
- Every figure across the canvas, the README, `STATES-reimport.md` and the copy file agrees:
  91 built + 2 unresolved · 106 lines → 103 matched + 3 unnamed · 84 unchanged + 19 in = 103 ·
  7 out, 1 kept → 6 removed · 91 − 6 + 19 = **104** · `?updated=19-6`.
