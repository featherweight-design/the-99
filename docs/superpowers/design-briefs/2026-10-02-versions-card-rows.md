# Card rows on the Versions tab

Design brief, 2026-10-02. A rework of an existing surface (a version's opened diff on the deck's
Versions tab); no new data beyond what other card rows already read.

## The finding

From Hugh's walk on 2026-10-02 (intake item H31), in his words:

> Card rows [on Versions] should have more info matching other card rows. Example: If I have a new
> version, it's helpful to see what cards I already own and those that I need to buy. We should
> also enable viewing Card Details and have a hover preview here.

## What ships today (the record)

1. **A version's row is the lightest card row in the app: a name and a cost track.**
   `DiffCardRow` (`src/components/decks/version-diff.tsx`) draws the card's name (or
   `{name} {from} → {to}` for a quantity move, via `printsPair`) and `CostTrack`. Nothing on it is
   pressable, and no card preview opens over it.
2. **That is a ruling, not an omission.** The deck versioning handoff:
   "The opened diff carries no ownership dot, no prices and no pull offers. It is a record of what
   the deck *was*, so the version row is the lightest of the three row types: name and cost track.
   A buy tag on a 2024 version would price a decision nobody is making"
   (`design/design_handoff_the99_deck_versioning/README.md`, decision 7). The panel says so on
   screen: `this is what the deck was, not what it needs` (`history.diffNote`,
   `src/lib/copy/deck-versioning.ts`). **Hugh's ask reverses half of that ruling**, so this round
   has to say what replaces it, and the diff note's sentence with it.
3. **The data carries only what the row draws.** `VersionDiffCard` (`src/lib/decks/versions.ts`)
   is `oracleId`, `name`, `typeLine`, `manaCost`, `from`, `to`: no art, no ownership, no price. It
   is read when a version's row opens (`getVersionDiff`, `src/app/decks/actions.ts`), cached per
   visit by the rail.
4. **The card modal is already mounted around it; the hover preview is not.** The Versions tab
   (`VersionRail`, `builder-shell.tsx`) renders inside the deck page's `CardDetailProvider`, so a
   `CardDetailTrigger` would work there unchanged. `HoverPreviewProvider` is mounted per surface (the
   decklist, the top-off list, the review page, the stand-ins sheet and the Analysis tab each mount
   their own). Under the Versions tab the only one is inside each opened version's overview sheet
   (`VersionOverviewLink`, `synopsis-version.tsx`); the diff's rows sit under none.

## What the other card rows draw (the pattern to match)

| Row | Where | Draws |
|---|---|---|
| Decklist row | Deck page, List view (`decklist-row.tsx`) | Ownership dot (`OwnershipDot`), availability marker (`AvailabilityMarker`), buy tag with price (`BuyTag`), cost pips, a `CardDetailTrigger` name opening the card modal (with Prev/Next through the list), hover preview (`usePreviewRow`), intent prefetch |
| Review row | `/decks/[id]/changes` (`update-diff-row.tsx`) | The diff of the live draft: availability rollup, buy tag on an `in` row, Pull it, Put back, the card modal (siblings across both columns) and hover preview |
| Version row | Versions tab (`version-diff.tsx`) | Name and cost track only |

The review row is the closest relative: it already draws a diff (in and out columns) with
availability and the buy tag. The difference is time. The review row describes the draft, which is
what the deck is about to be; a version row describes a list that may be months old.

## What "own" means on a version

A version is history, but the reader's collection is now. So every figure Hugh asks for is
**today's**, about **today's** collection:

- **Owned:** does the reader own a copy now (`collection_items`).
- **To buy:** owns none now, priced at today's price (`printing_prices`, the same newest-price read
  every buy tag uses).
- **Claimed:** whether today's copies are free or held by other decks (`loadAvailability`). Whether
  this round shows that, or only owned and to buy, is open below.

None of this is a claim about the version itself, which is the ruling's concern. A version whose
cards are all owned today reads that way even if they were bought last week.

## The ask

**Version rows that read like the app's other card rows**: which cards the reader owns today and
which they would need to buy, the card modal on the name, and the hover preview on the row.

## Open for Design

1. **Which figures.** Owned and to buy only (Hugh's example), or the full availability marker
   (claimed by another deck, in a brew) as the decklist draws it. The decklist's figures are about
   this deck's claim on the cards; a version is not a claim, so the full marker may say more than
   is true.
2. **Price.** A to-buy row with today's price, or the buy tag without a figure. The ruling's
   worry was "a buy tag on a 2024 version would price a decision nobody is making"; say whether the
   tag now prices one, or only marks.
3. **Out rows.** A card the version cut: does it carry ownership at all? Owning a card that left
   the deck is rarely the question.
4. **Which versions.** Every version, or only the newest (Hugh's "if I have a new version")?
5. **The diff note.** `this is what the deck was, not what it needs` no longer describes the
   panel. Replace it, drop it, or narrow it to say the figures are today's.
6. **The card modal's list.** Prev/Next through one column, or across both (the review row's
   rule).
7. **Phone.** The row is 44px on the phone with the name truncating; say what fits beside it at
   390.
8. **The About entry.** The `versions` entry describes this surface. Whether this is an edit to it
   or nothing at all is Hugh's call.

Copy for any new string goes through `/copy-review`, not this round.

**Out of scope:** what a version stores, the rail's own rows, pulling or buying from a version, and
the review page.

## Engineering notes (not decisions)

- `VersionDiffCard` gains `imageUri` (the owned printing's, through the collection reader, as the
  decklist resolves it) and today's owned count and price, read per open, not per version.
- A `HoverPreviewProvider` around the diff's columns, beside the overview sheet's own rather than
  around it.
- Opening a version already makes two calls (`getVersionDiff` and `fetchVersionSynopsis`); the
  figures make a third, or ride in the diff's own read. Still fetched on open, never with the rail.

## Where it lives

- `src/components/decks/version-diff.tsx`: `DiffCardRow`, the columns, the diff note.
- `src/components/decks/version-history.tsx`: `VersionRail`.
- `src/lib/decks/versions.ts`: `VersionDiffCard`, `loadVersionDiff`.
- `src/components/decks/decklist-row.tsx`, `update-diff-row.tsx`: the rows to match.
- Handoff: `design/design_handoff_the99_deck_versioning/` (the ruling in decision 7).
- Intake: H31.
