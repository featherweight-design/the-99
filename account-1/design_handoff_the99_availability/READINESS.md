# READINESS — Card availability (#43), R1

> **Superseded by `ADDENDUM-READINESS.md` (R2: 🟢 Green).** Kept for the record. The blocker below
> was audited and closed; the four corrections it asked for are landed.

**Verdict: 🟡 Yellow, on one provenance blocker.** All seven open items are called and drawn, all
six locked decisions were drawable, and no decision is waiting on a ruling. The blocker is not a
design question — it is that this R1 was drawn against sibling handoffs rather than `src/`, so the
token names and component shapes it quotes are unverified.

Design-side I would ship this. Nobody should merge it until item 1 is closed.

## Blocking — needs a check

### 1. Every `src/` reference in this handoff is reconstructed, not read — *with Engineering*
The spec named in the brief (`docs/superpowers/specs/2026-08-08-card-availability-design.md`) was
not in this project; it was supplied directly and this R1 is drawn against it, so the *design* is
sound. But the source files it points at are also absent — `src/` contains only
`components/shell/nav.tsx`. Missing:

- `src/app/globals.css` — the token block the four new tokens extend
- `src/lib/decks/status.ts` — the status pill this pass reuses as its severity source
- `src/components/decks/quick-add-bar.tsx` — the `Owned only` filter decision 5 turns on
- `src/lib/copy/decks-builder.ts` — the copy block `availability · copy strings.ts` extends

So `--fg-muted`, `--brass`, `statusPill()` at `status.ts:15-24`, `quickAdd.rowOwned` at
`decks-builder.ts:158`, and the shape of the quick-add bar are all **lifted from the `add_panel`,
`decks`, `commanders` and `richness` handoffs, not from source.** Any of them may have drifted.

*(R2: audited. `rowOwned` is at `:197`, not `:158`, and the string is unchanged; brass is AAA, not
sub-AA at small text; `#1A160F` is `--surface-rail`; there is no light theme. All four landed.)*

**No state in the canvas depends on the answer** — if a token is named differently the fix is a
find-and-replace in one README paragraph and one copy file. But it should be somebody's ten
minutes before merge.

*Needs: Engineering to confirm the four token names, the two line references, and that
`quickAdd.rowOwned` still ships as `×${qty} owned`.*

### 2. The decks and commanders design tables are not in this tree — *same shape as #158's blocker 3*
Only `docs/superpowers/design-tables/appshell.md` is present. I can name what this supersedes but
not which **table rows** it retires. At minimum, on the evidence of the sibling handoffs:

- commanders `§Toolbar` (gains a third control) and `§Commander Card` (gains an evidence line)
- decks `§Decklist Row` and `§Consider Tile` (both gain the marker)
- decks `§Deck Header` (gains the over-committed summary line, conditionally)

*Needs: someone with the tables open to diff before merge.*

---

## Non-blocking, but worth a look

- **The toolbar is now three controls wide** on desktop commanders — pips, `Includes ▾`,
  `Score against`. It fits at 1300px and the `Order:` receipt still right-aligns, but this is the
  row most likely to break first at a narrow desktop width, and this pass is what pushed it there.
- **Deck names in the marker have no length budget.** `0 free — in Atraxa` fits; a 38-character
  deck name does not. Truncation point and whether the name drops entirely below some width are
  undecided — see gap report §2. The name is the useful half of the string, so this is a real
  product call, not a CSS one.
- **`hardMulti` is specified but undrawn.** `0 free — across 3 decks` is in the copy file and
  follows the same rules; no state exercises it.
- **The soft threshold cliff is inherited, not introduced.** A 98-card list is soft, a 99-card
  list of pure theory is hard. That comes from locked decision 2. The first support ticket about
  this feature will be about the 98th card.
- **No degraded state for a failed availability read.** Every surface falls back to silence, which
  is indistinguishable from the happy case. Arguably correct (fail quiet, never block) but
  undrawn — Engineering should say whether a failed read is distinguishable, and if so this needs
  a state. Gap report §6.
- **The collection page is where a player would look first**, and it is out of scope. Correctly
  so, but the follow-up ticket should inherit this marker unchanged rather than re-solving it.

## What R1 is confident about

- **One marker, four states, two densities, four surfaces** — drawn at both widths with exactly
  one structural delta (commander-detail disclosure: desktop splits, phone filters), flagged
  in-canvas rather than hidden. That is the locked parity constraint met.
- **Silence holds end to end.** Three of five decklist rows carry nothing; Lathril's commander
  tile carries nothing; a deck with no over-commitment has no summary line; a player whose
  collection covers their decks sees nothing new on any of the four surfaces. There is no string
  for the free state, deliberately, so a future copy edit cannot give silence a label.
- **Nothing is blocked and nothing is refused.** Every card in the canvas can still be added,
  including the over-committed one — which is drawn *after* a successful add. #140's refusal
  pattern appears nowhere, because nothing here was refused.
- **Nothing asserts where a card is.** The expanded disclosure copy describes lists
  (`"sleeved into decks you've finished"`, `"you'd be taking them out of something"`) and the
  over-committed marker never names a location, only a count. Flagged in the copy file as the
  sentence most likely to drift.
- **One status vocabulary.** The `Draft/Building/Playable/Complete` pill is reused verbatim as the
  severity source and rides along in the disclosure as visible evidence. No second vocabulary,
  and `decks.status` stays dead.
- **Four new tokens, all derived, no new hues, no new dependency, zero net motion.** The glyph is
  two rotated `<span>`s; the chip is flexbox; the disclosure is `useState`.
- **AA without colour.** Every marker is glyph *plus* number *plus* word; greyscaled, all four
  states stay distinct. The shipped `#C6533F` is glyph-and-border only, never text.
- **Surface 1 is the shipped commanders card, unmodified** — pip filter, `Includes ▾`,
  `Order: Fit ↓ · fixed`, the `40/100/1fr/236` grid, the Plex Mono `/100` Fit figure and the
  three-segment fit bar with legend. The availability receipt is an added line in the evidence
  column, not a reshape. *(This was wrong at first draft and corrected against source — the
  reason item 1 above is a blocker rather than a footnote.)*

## What would make this green

Item 1 checked — four token names, two line references, one shipped string. Nothing behind it
redraws; it either confirms the README or edits one paragraph of it.
