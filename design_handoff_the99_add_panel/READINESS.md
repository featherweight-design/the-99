# READINESS — Add panel overhaul (#158), R2

**Verdict: 🟢 Green, pending one Product ruling.** R1's seven decisions stand unchanged. R2 adds
the missing empty-deck state at both widths, calls the `Open suggestions` CTA (it dies), and
takes the two bookkeeping corrections.

Two of R1's three blockers are closed. The remaining one is with Product and does not move a
pixel either way.

## R2 delta

- **State 9 — empty deck** drawn at phone (first-run *and* returning) and desktop.
- **`Open suggestions` CTA is deleted**, not repointed. It opened the retired sheet; the Consider
  tab is 40px above the mark with its count on it, and the quick-add bar is focusable on the same
  screen. Two live entrances already — a brass primary duplicating one of them teaches that the
  tab is not the way, on the one screen where a new builder is learning the surface. No new
  string needed, because there is no button to name.
- **Found one more broken string, unprompted:** `captionFor` says suggestions are *"primed on the
  right"* — true only of the 340px column R1 retired. `captionFor` and `captionForMobile`
  collapse into a single `caption`; the breakpoint split existed only because the widths pointed
  at different constructs. This also closes the *"flagged for Design ratification"* note sitting
  on `captionForMobile` — by deleting it rather than ratifying it.
- **`roleHint` promoted to both widths** — mobile spent that budget on the CTA.
- **Corrections taken:** `prefers-reduced-motion` is `globals.css:237-243`; `.anim-sheet-in`
  named as retiring with the sheet (net motion change: one class in, one out); `§2182` added to
  the superseded rows.
- **Blocker 2 (synergy/lift) closed** — cached raw payload, parse line, defensive read falling
  back to the drawn `no EDHREC figure` omission. As specified; no redraw.
- **Blocker 3 (decks table) closed** — rows diffed audit-side.

---

## Blocking — needs a ruling

### 1. The owned-filter default flips from `false` to `true` — *with Product*
`search-pane.tsx` ships `useState(false)`. Decision 5 makes it **on**, on the reasoning that the
product premise is building from what you own and the deck already carries a shopping list for
the rest.

This is the only shipped default this handoff changes. It is a product call. **If it stays
`false`, nothing else moves** — the toggle sits in the same place either way and every state in
the canvas is drawn with both positions of the switch.

*Needs: Product's ruling. Cheap either way.*

### ~~2. Synergy/lift — is the baseline in the payload we already fetch?~~ **CLOSED at R2**
Answered eng-side: the raw EDHREC payload is cached, so lift costs a parse line and no fetch.
Read defensively, falling back to the drawn `no EDHREC figure` omission when absent — exactly as
specified at R1. No redraw. *(Original entry:)*
Decision 6 ships EDHREC **inclusion %** (already computed in `buildSuggestionPayload` via
`inclusionByName`) and *asks for* lift as `this commander's inclusion − the card's overall
inclusion rate`, shown only where positive.

The brief says a synergy figure "is not currently computed" and invites Design to say what it
wants and have Engineering confirm what is honestly available. This is that ask.

**No state in this handoff depends on it.** If the baseline is not cheaply available, this closes
as "one figure, as today" and the tile is unchanged.

*Needs: Engineering's read on the EDHREC payload.*

### ~~3. The decks design table is not in this project~~ **CLOSED at R2**
It was in the repo, not in this tree; rows diffed audit-side and `§2182` added to the superseded
list in README. *(Original entry:)*
`docs/superpowers/design-tables/decks.md` is not in the local tree (nor is `src/` — both were
read from the repo). I can name the components this supersedes but I cannot confirm which
**table rows** it retires. On the evidence of `add-panel.tsx`'s own comments, at minimum:

- `§Panel` (tab bar, sub-caption, cards list area)
- `§Suggestion Card` (whole section)
- `§Search (within Add Panel)` (whole section)
- `§Bottom sheet` (dim overlay, sheet geometry) — the construct is deleted, not respecified
- `§"+ Add cards" sticky footer button` — the slot survives, its contents change

*Needs: someone with the table open to diff before merge.*

---

## Non-blocking, but worth a look

- **Shelf cap of 12** is a guess that fills two desktop rows / six phone rows. One-line change.
- **Sort resets on navigation** (plain component state, like the decklist's grouping toggle).
  Consistent, not obviously right.
- **The strip-to-shelf link** assumes the coverage strip stays above the tabs at both widths. It
  does today.
- **iOS zoom floor closed here.** The quick-add field is `16px` on mobile. The collection filter
  handoff left this open as a global decision; this handoff just pays the vertical budget rather
  than deferring it a second time. If Product would rather set `maximum-scale=1` globally, the
  field drops to `14px` and gains 4px of sheet height back.

## What R2 is confident about

- The two-construct split (bar + view) is drawn end to end at both widths with no width-only
  construct, which is the locked parity constraint.
- Every value is a `var(--*)` that already exists. **No new token. No new dependency.**
- The card-detail modal is invited, not re-solved — and it gains sibling paging through a role
  shelf, which it does not have from suggestions today.
- Optimistic-first is inherited unchanged, including the two shipped comments that a rewrite
  tends to lose (`builder-shell.tsx:70`, `card-detail-provider.tsx`).
- Voice: three expressive moments (Consider empty, quick-add no-results, empty builder), everything
  else straight. Degraded deliberately stays straight, matching the Commanders counter-example in
  the richness pass. The empty builder's locked lines — "A king with no army." and "eats
  everything anyway" — are verbatim; only the middle clause changed, and it was direction rather
  than flavour.
- **No copy in this handoff names a construct a player cannot see.** That was the actual bug
  behind both `cta` and `captionFor`, and it is worth a lint pass on the rest of
  `src/lib/copy/` after the sheet comes out.

## What would make this green

Item 1 ruled. It is a one-line default and every state is drawn with both positions of the
switch, so there is no redraw waiting behind it either way.
