# Gap report — partner commanders (#364)

Design source: `design/design_handoff_the99_partners/`
Property table: `docs/superpowers/design-tables/partners.md`
Branch: `feat/partner-commanders`

The design-review skill ran in its three passes: Agent 1 enumerated the table
from the design files alone (~450 property rows across five components, plus a
16-row state-coverage section); Agent 2 verified the implementation row by row
and returned 7 visual gaps and 3 state gaps; Agent 3 confirmed the triage below
and returned **0 gaps remain**.

## Fixed

| # | Surface | Gap | Fix |
|---|---------|-----|-----|
| 1 | `src/components/home/resume-decks.tsx` | §ResumeRow meta line is specified `min-width: 0`; the span had none | Added `min-w-0` to the meta-line span |
| 2 | `src/components/home/deck-rail.tsx` | The phone pair row must carry `partnerCopy.pairAria(primary, partner)`; it carried no pair signal but the denominator | Added an `sr-only` span on pair rows only, primary first. `deck-rail.test.tsx` previously asserted the partner name was absent from the whole DOM; that assertion is now scoped to the desktop list and to the phone row's visible text, and a positive case covers the accessible name |

Gap 2 is the one worth naming: the denominator is a pair signal only to a reader
who can see it *and* knows the deck's ceiling. Decision 21 says the rail draws
nothing else about the pair, and that ruling governs pixels; it was never a
licence to withhold the fact from a screen reader. The resume row already had
this treatment, and the rail was the surface that had been missed.

## Not a gap — verified against the code

| # | Agent 2's finding | Why it stands as shipped |
|---|-------------------|--------------------------|
| 3 | The mobile partner-slot container (`create-picker.tsx:426`) has no surface, border, radius or padding, against the table's Partner section wrapper row | `PartnerSlot` **is** the section wrapper — `partner-slot.tsx:69` carries `marginTop: 16`, `paddingTop: 16`, `borderTop: 1px solid var(--border)`, and both call sites render that same component. The `md:hidden mb-[16px]` div is a breakpoint shell and nothing more |
| 4 | Identity pips use `rounded-[2px]` where the table says `999px` | Pre-existing and app-wide. `git diff origin/main...HEAD` is empty for `commander-art.tsx`; `IdentityPips` is consumed by six other surfaces, and its own comment states the squared shape is deliberate — it distinguishes identity from round mana pips. Changing it is a design-ratification ticket across the app, not a partner change |
| 5 | The sidebar uses `display: block` where the table says `flex` | Untouched by this branch, and without visual consequence: the children are block-level elements carrying their own `marginBottom`, so `block` and `flex flex-col` render identically |

## Open with Design — ratification, not defects

None of these block the PR. Each is a case where the shipped behaviour is
defensible and the drawing is ambiguous or in tension with itself, so eng
resolving it unilaterally would be guessing at a design call.

1. **The re-headed list's frame.** The canvas draws the pairing strip *inside* a
   unified bordered list frame; the shipped code draws a standalone
   `rounded-[10px]` strip above a gap-separated `<ul>`. The table's own rule for
   those rows is "shipped row — must not change", so satisfying the canvas would
   mean restructuring rows the table forbids touching. The two cannot both hold.

2. **The phone Selected summary.** README:216 rules the slot sits "in the
   scrolling flow beside the name field", which is what ships. Agent 2 read the
   canvas as also drawing a `Commander` eyebrow and a primary summary row above
   it on phone. Whether the phone repeats the primary is the open question.

3. **State C on a paste-declared pair.** A pasted list that declares both
   commanders short-circuits the picker, so the import-proposal plate and the
   illegal-pairing note never render in the slot — the declared partner is
   applied directly. This is arguably the better behaviour (the state exists to
   ask a question the paste has already answered), but it means two enumerated
   states are unreachable by that path, and Design should say whether that is
   intended or whether the proposal should be shown for confirmation.
