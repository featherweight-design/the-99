# The 99 — Update a deck by re-import (design handoff, R1)

**Amendment 2 of four, and the only one that is a new flow.** No new brief: it amends
`design/design_handoff_the99_deck_import/` (#42) — specifically the sentence in
`import-actions.ts` that says the opposite:

> *"There is deliberately **no dedupe**: importing the same list twice creates two decks.
> Updating in place is sync — a different and much larger feature — and quietly becoming it is
> the failure mode this comment guards against."*

This is that feature, built deliberately rather than by accident. Files:
`The 99 - Deck Reimport.dc.html` (canvas — pan/zoom), `STATES-reimport.md` (18 states × both
widths), `deck-reimport · copy strings.ts`.

**The one-line summary:** *import creates, update replaces, and the difference is that update
can delete.* Everything in the shape follows from that: **the diff is always shown**, nothing is
written until Apply, **removals are the top of the screen** with a per-row `Keep`, and the ones
the player added by hand say so.

**Mock numbers, used consistently everywhere:** deck at **91** built + 2 unresolved; paste of
**106** lines → 103 matched + 3 unnamed; **84** unchanged, **19** in, **7** out of which the
player keeps 1 → applied as 19 in / 6 out; lands at **104 / 99**, which is amendment 3's `Over`
state on purpose.

---

## The five calls the brief asked for

| Call | Answer |
|---|---|
| Entry point | **Both.** The deck card's `⋯` menu (desktop) and a `GhostButton` beside Export in the builder spine (both widths). One route: `/decks/[id]/import`. |
| Diff before committing? | **Always**, and it is the product's only confirm step. Earned by the deletions. |
| How removals read | **Listed, not counted.** Every removal is a row with a `Keep` toggle; hand-added ones carry `you added this` in `--warning`. No strikethrough, no red. Default is remove. |
| Arrival | The shipped strip's geometry with **delta copy instead of total copy** — *"19 in, 6 out, 1 you kept."* Its own param, and its dismissal is **not persisted**. |
| Celebration | **Suppressed**, on the rule that already suppresses a first import and a fill: the player did not place the last card. |

## What update deliberately cannot do

- **Change the commander.** A list naming a different one is a conflict state with two ways
  out, and neither is a swap.
- **Merge.** There is no "add these and keep everything" mode — that is the quick-add bar, one
  card at a time, and it exists.
- **Rename the deck.**
- **Run unattended.** No auto-sync, no polling, no remembered source.

## States delivered

| # | Frame | Desktop | Phone |
|---|---|---|---|
| A | The five-step flow, and what differs from a first import | ✓ | ✓ |
| B1 | Entry — the deck card `⋯` menu | ✓ | — (no menu at 390px, by decision) |
| B2 | Entry — the spine control beside Export | ✓ | ✓ |
| B3 | The four rejected entry points | ✓ | ✓ |
| C1 | Step 2, the list — the shipped entry surface minus two things | ✓ | ✓ |
| C2 | The diff against `ImportEntry`, line by line | ✓ | ✓ |
| D1 | **Step 3, the diff** — four groups, counts, apply bar | ✓ | — |
| D2 | Why the groups are in that order; the CTA counting down | ✓ | ✓ |
| D3 | The removal row: at rest, kept, hand-added, focused | ✓ | ✓ (52px form in E1) |
| E1 | **Step 3 at 390px**, scrolled to the removals, with the route dock | — | ✓ |
| E2 | The phone rules applied; the a11y contract | ✓ | ✓ |
| F1 | Nothing changed | ✓ | — (same construct) |
| F2 | A different commander — the conflict banner | ✓ | — |
| F3 | Everything out — the >75% threshold line | ✓ | — |
| F4 | Applying, and a refused write | ✓ | — |
| G1 | The two arrival strips, side by side | ✓ | ✓ |
| G2 | Landing at 99 — no celebration | — | ✓ |
| G3 | Landing at 104 — where amendments 2 and 3 meet | — | ✓ |
| H | What Apply writes: the five non-visual calls | ✓ | ✓ |

---

## Decisions log

### 1. **Both** entry points, and the route belongs to the deck
The deck exists in two places — a card on `/decks` and the builder — and a player who wants to
paste an updated list can be in either. So:

- **The deck card's `⋯` menu gains one item, first, above Rename — at both widths.** The menu
  is then ordered by consequence — a list, a word, a deck — and the new item is the only one of
  the three anybody opens the menu *for*.
  **R2 ruling.** R1 said the deck card had no `⋯` at 390px. The overflow menu shipped at 390px
  on 2026-09-05 (PR #289, 44px target), so the premise is gone, and the item appears on the
  phone too: a menu whose contents differ by width is a second information architecture, and a
  player who learns the gesture on desktop must not find it missing on the phone. Same item,
  same position, same string; the row is already 44px. **The spine control stays as well** —
  one entry point per width was the alternative, and the spine is where a player already
  editing the deck looks.
- **The spine gains a `GhostButton` beside Export**, at both widths. The spine has no overflow
  menu, and a one-item menu is a menu-shaped button. Ghost against Export's brass solid is the
  right order — exporting is what most players do from this header.

At 390px both are ghost pills at a 44px hit box on the row Export already occupies. Two fit
390px with room to spare, and the phone Export is *already* a ghost link, so the pair reads as
siblings rather than as a demoted primary.

**The route is `/decks/[id]/import`.** Update only ever starts from a deck; there is no path to
it that does not already know which deck, which is what keeps the destructive flow from sharing
a button with the safe one.

**Rejected:** phone parity *instead of* the spine control (see the ruling above);
the decklist toolbar (that row is about which cards you are *looking at*); the
import route with a deck picker (turns one question into two and puts the destructive path
behind the same button as the safe one); a dropzone in the empty builder (an empty deck has
nothing to diff — its update is just an import).

### 2. **The diff is always shown.** This is the product's one confirm step
Every other pass has refused a confirmation, and correctly: the add panel has no confirm, the
fills have no confirm, `Clear all auto` has no dialog, removals are spent slots carrying `Undo`.
The principle behind all of those is that **the action is reversible or cheap**.

An applied update is neither. It can delete nineteen cards the player placed by hand over a
month, and there is no undo (gap 1). So the diff is not a courtesy screen — it is the undo,
moved in front of the action.

**And it is a page, not a dialog:** its own route, its own URL, back-navigable, no focus trap.
The list step is a page; the diff is longer than the list step; a modal that scrolls for 100
rows is a page with a trap on it.

### 3. Four groups, ordered by **what is at stake**: out, in, unnamed, unchanged
- **Out first.** The only group containing a decision and the only one that can lose the player
  something. A diff that opens with its additions is a diff that buries its deletions.
- **In second, and it is a list rather than a decision.** No per-row toggle: refusing
  individual additions turns update into a curated merge, which is the quick-add bar's job. Its
  header carries the shipped `14 owned · 5 to buy` split, because nineteen new cards can cost
  money and that is the app's vocabulary for saying so.
- **Unnamed third.** Not a failure — the shipped importer already treats an unmatched line as a
  resolvable row on the deck, and this reuses that whole treatment including the `#1A160F` plate
  and dashed border.
- **Unchanged last, collapsed behind one disclosure.** Eighty-four rows carrying no decision,
  sitting above the one control that matters, would *be* the screen.

**Groups are capped at four rows plus a disclosure at both widths** — that cap is what keeps
the removals and the apply control on one phone screen.

### 4. Removals: **default remove, per-row `Keep`, and `you added this`**
The list is the source of truth. A player pasting 106 lines is telling you what the deck is, so
**default is remove** — anything else means the paste does not do what it says.

But the deletion set is not homogeneous, and the diff says so:

- **`Keep` is per row**, a 34px (desktop) / 44px (phone) toggle with `aria-pressed`, the same
  contract as the synergy row's `+ / ✓`. Selecting it **changes the row**, not just the button
  (`--elevated-hover` fill, `--accent-shadow` border) — at 44px in a group of seven a lone
  changed glyph is not scannable.
- **`Keep all N`** sits in the group header for the player who pasted the wrong list and noticed
  one screen too late.
- **`you added this`** — a `--warning` pill — marks any removal the player placed by hand
  (`auto = false` and not from the previous import). It is the **inverse of the shipped `auto`
  tag**, and both appear in the group: `auto` in neutral, because the app placed it and losing
  it costs nothing; `you added this` in `--warning`, because a person did. The count also leads
  the group's sentence: *"Two of them you added by hand."*
- **No strikethrough and no red.** A struck-through row says the deletion has happened, and
  nothing has happened. Same principle as the add panel's spent slot: the row holds its place
  and carries a control.

### 5. **The CTA states what it will do, live**
`Update the deck — 19 in, 6 out`, recomputed on every `Keep`, with `1 kept · lands at 104 / 99`
beside it. It is the last thing the player reads before the only irreversible click in the flow,
so it should not say `Apply`.

### 6. The commander conflict is a **dead end with two exits, and neither is a swap**
It fires only when the list **declares** a commander (`*CMDR*` or a `Commander` section) that
is not this deck's — an undeclared list is not a conflict, it is 106 lines for the commander you
already have.

Changing a deck's commander re-decides the colour identity and the legality of all ninety-nine
cards. That is a new deck wearing an old name. So: the shipped failure banner (`--elevated-hover`
on `--warning`'s left rule, never `--danger`), and **the primary way out is the flow that
already works** — the list becomes its own deck, carrying the text the player already pasted,
and they end up with both decks.

### 7. `Everything out` is a **line, not a block**
When the removals exceed three quarters of the deck, the diff adds one warning line and one
extra way out (`Import as new instead`). **Nothing is blocked** — a player rebuilding a deck
from scratch is doing something legitimate — but at that ratio the most likely truth is that
they pasted a different deck's list, and the screen should say so before they apply it.

### 8. Arrival: **delta copy, its own param, and no persisted dismissal**
The shipped strip's geometry exactly — `--surface-rail`, `--success` ✓, 12px, dismissible.
Three changes:

- **Total copy becomes delta copy.** A first import's only fact is how much arrived; an
  update's only interesting fact is what moved. The kept clause is included because the player
  made that decision one screen ago and deserves to see it honoured.
- **A second param, not a second meaning for the first.** `?updated=19-6`, parsed strictly
  (`/^\d+-\d+$/`) — the same strictness `arrivedFromImport` applies to its own value — falling
  back to a countless *"Updated from your list."* rather than printing garbage.
- **The dismissal is not persisted.** This is the one place the shipped pattern cannot be
  reused: `arrivalDismissKey(deckId)` is already set from the first import, so an update's strip
  would never show at all. Arrival is provenance of *one navigation* — the strip's own source
  says so — so an update's strip lives for that navigation and is gone next visit, dismissed or
  not.

### 9. The celebration is **suppressed, with no new flag**
`shouldCelebrate` already has two suppressions and its source states the shared reason: *the
reveal is a receipt for a deck the player built.* A list is not a deck the player built. So the
update param is read into the existing `arrivedFromImport` argument at the component boundary —
**no new argument, no new localStorage key, no change to `celebration.ts`**.

The receipt is the strip plus the counts, which is what the recommendations pass decided about
arrivals: *no celebration, no moment.* The reveal keeps waiting for the first card the player
places themselves.

### 10. What Apply writes — five calls that are not visual
1. **Added cards are `auto = false`.** `auto` means *the app put this here*; a card the
   player's own list names is the player's choice.
2. **`auto` is cleared on every unchanged card the list names.** A card the app suggested that
   the player's list now declares is in the deck on purpose — so `Clear all auto` afterwards
   will not delete cards the player just declared. (Drawn in the diff: `Ponder` still wears
   `auto` in the removals, because the list did *not* name it.)
3. **Unresolved rows are replaced, not merged.** Merging accumulates stale rows the player
   already dealt with, and an old line number points into a file nobody has any more.
4. **Kept cards are exempt and left exactly as they were**, `auto` included. If the app placed
   it and the player keeps it against their own list, it is still the app's suggestion.
5. **One transaction**, and the double-submit guard is the shipped synchronous ref — `pending`
   only turns true on the next render, so two clicks in one tick would apply the same update
   twice.

---

## Component notes

Hexes live only in `globals.css`. **No new token, no new hex, no new motion class, no new modal,
no toast.** Two new components (the diff page and its row); everything else is shipped
geometry.

| Component | Spec |
|---|---|
| **Entry: menu item** | `deck-card-overflow.tsx`'s row geometry verbatim: `radius 6px`, `padding 9px 12px`, 13px, `--fg`, `hover:--elevated`. First in the list. |
| **Entry: spine control** | Desktop `GhostButton`, 13px, `padding 10px 16px`, radius 8px, immediately left of Export. Phone: mono 11px, `1px --border-strong`, radius 7px, **min-height 44px**, on Export's row. |
| **Update entry surface** | `ImportEntry` verbatim minus the name field and the commander step. Heading names the deck; submit reads `Compare with this deck`; a `--fg-faint` line beside it says nothing is saved. |
| **Diff page** | Own route. `max-width 900px` desktop, `padding 30px 32px`; phone `16px 18px` with a route dock. Four `<section>`s with real headings. |
| **Count chips** | The facet strip's construct: radius 999px, `--surface` on `1px --border-strong`, figure mono 13px, label mono 11px `--fg-body`. Out/unnamed figures `--warning`, in `--success`, unchanged `--fg-faint` on `1px --border`. |
| **Group header** | Mono 11px `--accent`/`--warning`/`--success`, `letter-spacing .16em`, uppercase, `border-bottom 1px --border`, `padding-bottom 10px`. Right slot holds `Keep all N` or the owned/to-buy split. |
| **Diff row (desktop)** | 44px min-height, `--surface` on `1px --border`, radius 8px, `padding 0 6px 0 12px`, gap 10px. Slots: ownership dot 7px · name 13.5px ellipsed · markers · type mono 10px `--fg-locked` 120–150px · control. |
| **Diff row (phone)** | 52px, meta on a second line — the shipped Shopping-row shape. Type line yields first; the `you added this` and `auto` markers do not. |
| **`Keep` toggle** | 34px tall / 64px min-width desktop; **44×44** phone. At rest: `1px --border-strong`, label `Keep` in `--fg-body`. Kept: `1px --accent`, `color-mix(--accent 10%, transparent)`, `Kept ✓` (desktop) / `✓` (phone). `aria-pressed`. |
| **Kept row** | Fill `--elevated-hover`, border `--accent-shadow`. No transition. |
| **`you added this`** | Mono 10px `--warning`, `1px --accent-shadow`, radius 999px, `padding 3px 8px`. Real text in the row's reading order. |
| **`auto` marker** | The shipped `AutoTag`, unchanged, neutral. |
| **Unnamed row** | The shipped unresolved-row treatment: `#1A160F` plate, `1px dashed --accent-shadow`, mono 13px, `line N` right. |
| **Disclosure** | `CoverageDisclosure` geometry: full-width 44px, `1px dashed --border-strong`, mono 12px `--accent`. |
| **Apply bar (desktop)** | `border-top 1px --border`, `padding-top 20px`. `PrimaryButton` 44px + ghost `Cancel` + a mono `--fg-faint` summary right. |
| **Apply dock (phone)** | Route dock on `--surface-rail`, `border-top 1px --border-strong`, `padding 12px 16px`, full-width 44px primary, `Cancel` as a mono link on the line below. Reserve `dock + var(--tabbar-h) + 12px`. |
| **Conflict / everything-out / failure** | The shipped `FailureBanner`, verbatim, `--warning` left rule. |
| **Applying** | The shipped `ParsingBlock` dots + heading. |
| **Arrival strip** | `ArrivalStrip` geometry verbatim, delta copy, non-persisted dismissal. |

## Notes for engineering

- **New route:** `src/app/decks/[id]/import/page.tsx` + `src/components/decks/update-entry.tsx`
  (the list step) + `src/components/decks/update-diff.tsx` (the diff) + `update-diff-row.tsx`.
- **New pure module:** `src/lib/decks/update.ts` — `planDeckUpdate({ current, imported })` →
  `{ add, remove, unchanged, unresolved, conflictCommander }`. Pure, like `import.ts`, and for
  the same reason: every ruling above becomes a unit test rather than an integration one.
  `buildDeckImport` is **reused unchanged** to parse the list.
- **New server action:** `updateDeckFromList(deckId, { text, source, keep: string[] })` in
  `import-actions.ts`, beside `importDeck`. It re-parses server-side rather than trusting a
  diff computed in the client — the same reason `importDeck` re-validates the commander the
  picker sent back. **The `keep` array is the only thing the client contributes.**
- **One transaction:** delete removed `deckCards`, insert added, clear `auto` on named
  unchanged, delete all `deckUnresolvedRows` for the deck and insert the new ones. Batch at
  `INSERT_BATCH = 500` as `importDeck` does.
- **Update `import-actions.ts`'s doc comment.** The "no dedupe / updating in place is sync"
  paragraph is now wrong and it is load-bearing documentation; it should point at
  `updateDeckFromList` and keep saying that `importDeck` itself still never dedupes.
- **`src/lib/decks/arrival.ts`:** add `UPDATED_PARAM = "updated"` and
  `parseUpdateArrival(value)` returning `{ in, out } | null` on `/^\d+-\d+$/`. **No new
  localStorage key** — an update's strip dismissal is component state.
- **`celebration.ts`: untouched.** The component reads
  `arrivedFromImport(imported) || parseUpdateArrival(updated) !== null` into the existing
  argument.
- **`add-validation.ts`:** the update path does not call it per card, but the 99 cap has to be
  gone for this flow to work at all — **hard dependency on amendment 3** (gap 4).
- **`deck-card-overflow.tsx`:** one `<a>`, first in the menu. It is already `relative z-10`
  above the card's Link overlay, so no new nested-interactive problem.
- **`builder-spine.tsx`:** one `GhostButton` in the export slot's flex row, both widths.
- **Optimistic anything is out of scope** — the diff is a page and Apply navigates.
- **Copy** lives in `src/lib/copy/deck-import.ts` as a `deckImportCopy.update` block — see
  `deck-reimport · copy strings.ts`. Nothing shipped is edited except that one doc comment.

## Gap report

1. **There is no undo of an applied update.** The diff is the confirmation and it is the only
   one. A player who applies with six hand-added cards in the removals, having skimmed the
   screen, has lost them. Mitigated by the group order, the `you added this` marker, the
   sentence, and the CTA's live counts — but not solved. **The most likely thing to be asked
   for, and the one Design would most like a ruling on**: a real undo means keeping the removed
   rows for a session, which is a new table or a soft-delete column.
2. **A card removed and re-added by the same update is invisible.** If the list names a card
   the deck holds at a different quantity (a basic land), it lands in `unchanged` and the
   quantity is silently reconciled. Basics are the only cards with a quantity > 1, so this is
   narrow, but the diff will not tell you that your Islands went from 12 to 9.
3. **`you added this` depends on `auto` being trustworthy.** It is the only signal available
   and it is a proxy: a card added by a *previous import* is also `auto = false`, so it will be
   marked as hand-added when it was not. Fixing it properly means recording *how* a card
   entered the deck, which is a schema change. Flagged rather than fixed; the copy is
   deliberately *"you added this"* rather than *"you added this by hand"*, and a previous
   import was the player's list, so the claim is defensible.
4. **Hard dependency on amendment 3.** An update that lands over 99 is refused by
   `add-validation`'s cap, and the player's list arrives five cards short with nothing saying
   which five went missing. If amendment 3 slips, this flow needs a hard stop in the diff —
   refuse to apply past 99 and name the dropped cards. That is a redraw, and it is the only
   dependency between the four amendments.
5. **No import history and no stored source.** Nothing records where a deck's list came from,
   so update cannot offer *"same source as last time"*. Deliberate, per `arrival.ts`'s ruling
   that provenance is a fact about one navigation — and it is the door to a sync feature, which
   is what the shipped comment was warning about in the first place.
6. **A 400-line paste against a 91-card deck** produces a diff with 300+ additions. The
   four-rows-plus-disclosure cap holds the screen, but the expanded group is a 300-row list with
   no windowing — the same hole `commanders-windowing` accepted at 214 rows and amendment 3's
   gap 5 names from the other side.
7. **The `>75%` threshold for the everything-out line is a judgement, not a measurement.** One
   constant, and it is the sort of number that wants tuning against real pastes.
8. **The diff cannot show what a card *does*.** Rows carry a name and a type line; deciding
   whether to keep *Mystic Remora* may need the card. `CardDetailProvider` is not mounted on
   this route and mounting it means a modal over a page whose whole job is one decision. Left
   out deliberately; it is the second most likely request.
