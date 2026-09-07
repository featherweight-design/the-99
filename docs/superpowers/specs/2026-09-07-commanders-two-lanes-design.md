# Commanders and Discover — two lanes, two destinations

**Date:** 2026-09-07
**Status:** approved in brainstorming, awaiting spec review
**Supersedes the control model shipped by:** #340 (PR #398)

## Why this exists

`/commanders` today is one page with a segmented toggle switching between two entirely
separate pipelines. `page.tsx:68` branches on `parseScope(sp.scope) === "play"`: one side
runs `getRankedList` into `CommandersView`, the other runs `loadDiscovery` into
`DiscoveryView`. The two sides do not share a control rack — `DiscoveryView` passes `join`
and `query` to `FilterBar`, `CommandersView` passes neither — so the rack changes shape
when the toggle moves.

That is the root of every reported symptom:

- The colour-match control (`Contains` / `Exactly`) appears only when a colour is lit
  **and** only on the discovery side (`filter-bar.tsx:311`), causing a vertical jump.
- The owned lane has no search, because search was built for the other pipeline.
- `Score against` (`Everything I own` / `What's free`) reads as a peer of the scope toggle
  while meaning something that only makes sense on one lane.
- Mobile stacks six equally weighted labelled blocks, burying search at the bottom.

Two features were designed and then merged into one surface. This spec separates them
again.

### The original intent, restated

- **Collection lane.** "What can I build around from what I already have." A few hundred
  rows. `What's free` was invented here, because the first version double-counted cards
  already sleeved into decks.
- **Discover lane.** "What should I get into that I don't own." ~3,300 rows, with two
  rankings: best supported by my existing collection, and most novel to me.

## Confirmed defects this replaces

1. **Availability silently filters under `Something new`.** `Score against` is documented
   as a scoring denominator, and under `Best fit` that is true — `freePool` feeds the `osc`
   LEFT JOIN at `candidates.ts:246-257`, never a `WHERE`, and `candidateCount` is identical
   in both modes. But the novelty floor tests `ownedSupport >= 0.3 * edhrecTotal`
   (`novelty.ts:20-23`) against whichever pool is selected, so the free pool raises the bar
   and removes rows (`list.ts:145-153`). A scoring control changes list membership.

2. **A control note counts another control's exclusions.** `filtered`
   (`discovery-view.tsx:96-101`) composes the colour filter with the name search, and the
   exact-identity note prints that combined figure as though colour alone produced it
   (`filter-bar.tsx:514`, `602`). With `test` in the search field and one red pip lit, the
   note reads "0 of 3,325 are Red and nothing else" — false; the dev database holds 330
   commander-legal rows with `color_identity = '{R}'`. The predicate itself is correct
   (`filter.ts:25-37`, uppercase WUBRG on both sides, `colorIdentity` on both sides).

3. **The owned lane lists commanders already helming a deck.** `getRankedList`
   (`ranked-list.ts:26-63`) has no deck predicate; it ranks every commander-legal card in
   the collection and decorates built ones via `receiptCountsByCommander`. Discover, where
   it matters less, *does* exclude them (`candidates.ts:297-311`).

## Prior art

Verified by search. Moxfield's in-builder collection filter could not be verified
(moxfield.com returns 403 to fetches); TappedOut could not be sourced at all.

| Product | How it splits "mine" from "everything" |
|---|---|
| Archidekt | Collection destination **and** an ownership checkbox inside global search |
| Deckbox | Inventory destination, plus a scope dropdown on search |
| Moxfield, Steam, Spotify, Plex | Two destinations |
| BoardGameGeek | Both: a collection destination, plus a thinner Owned facet in search |
| Scryfall, EDHREC | No ownership concept at all |

No verified product uses a mode toggle at the top of a single page for this.

Two pieces of guidance are directly on point:

> "Use a segmented control to provide closely related choices that affect an object, state,
> or view." — Apple HIG, Segmented controls

> "Don't disable or hide tab bar buttons… Having tab bar buttons available in some cases
> but not others makes your app's interface appear unstable and unpredictable." — Apple
> HIG, Tab bars

NN/g's test for in-page tabs is that each tab "should maintain the same layout with
different data" (*Tabs, Used Right*). Our two lanes fail that hardest of all: they do not
share a layout, because they do not share a rack.

An ownership *facet* was rejected on the same evidence. A facet promises "same results,
fewer of them." Here owned-versus-not is not a narrowing of one query — it selects a
different scoring function — so the promise cannot be kept.

## The design

### Two destinations

Nav becomes Home / Collection / **Commanders** / **Discover** / Decks
(`shell/nav.tsx:21-26`, currently four items rendered as a desktop rail and a mobile
`TabBar`).

**`/commanders` — the owned lane.**
Population: commanders you own and have not built. Helmed commanders are removed by a
`NOT IN (select commander_oracle_id from decks where user_id = ?)` predicate added to
`getRankedList`, mirroring `unbuiltCommanders`.

Controls: colour pips, colour match, search, availability. One order (fit), so the existing
inert `Order: Fit ↓ · fixed` label stays a label rather than becoming a menu.

**`/discover` — the wide lane.**
Population: every commander-legal card you do not already own. Owned commanders are
excluded at the query, built or not, because the owned lane is where they live.

Controls: colour pips, colour match, search, ranking (`Best fit` / `Something new`).

An earlier draft carried a "hide ones I can already build" checkbox here — the cheap facet
Archidekt and BGG both offer. Excluding owned commanders outright leaves that control
nothing to hide, so it is not built. The two lanes partition the population between them
rather than overlapping.

### The two exclusions, separated

The deadlock in review was that one name covered two rules with different answers:

- **"This commander is already helming a deck."** Never show it. Not a preference, so not a
  control. A toggle for "show me commanders I've already built" is one nobody moves.
- **"This commander's support cards are sleeved into other decks."** Show it, ranked
  honestly. A commander sitting in another deck as *support* may be your next deck, and
  hiding it loses that signal.

The first becomes an unconditional row filter. The second remains a scoring denominator.
That is one hard rule plus one toggle, with no interaction to reason about — as opposed to
two toggles, which is what produced the current confusion.

### Availability lives only on the owned lane

`What's free` answers "can I build this tonight," which is only a question about cards you
already own. Discover therefore scores against the whole collection, always, with no
toggle.

This deletes defect 1 at the root rather than patching it: with a single denominator, the
novelty floor cannot shift under the reader.

The accepted cost: a Discover fit score computed against cards half-committed to decks is
optimistic. That is acceptable because the reader is evaluating a commander they would have
to acquire, so "tonight" was never the frame.

### Every control always renders

Colour match is present at all times, greyed when no pip is lit, never absent. This is the
vertical jump removed, and the Apple guidance above applied literally.

### Search on both lanes

The owned lane's lack of a search field is an accident of which pipeline was built second,
not a decision.

### Mobile

One persistent row at the top: **search field and sort**, nothing else. Everything else
moves behind a **Filters** button carrying a count badge (`Filters · 2`), opening a sheet.

Active-filter chips stay visible beneath the row (`Red ✕`, `Exactly ✕`, `Clear`), so what
is applied is legible without opening the sheet. A chip is shown only for a control in a
non-default state, and dismissing one returns that control to its default — so the
`Exactly ✕` chip appears only in exact mode and dismissing it restores `Contains`, rather
than removing a control. The result line (`Showing 24 of 3,325`)
sits under the chips, once, in one place.

The sheet is a standard pattern and is not claimed as novel. What it buys here: controls
live in exactly one place, so a control appearing or disappearing costs nothing visually,
and six stacked eyebrow labels stop competing with the list for attention.

### Desktop

The rack stays inline — there is room, and a sheet at 1280px is a click tax. Ordering
matches mobile: search and sort leftmost, filters after, chips and count on one line
beneath.

### Naming

`Commanders` keeps its route and now means only what you own. `Discover` is new. The
`scope` param dies with the toggle.

Two control labels are deliberately **not** settled here. `Score against: Everything I own
/ What's free` was named when it lived on both lanes and can now say something plainer, and
`Contains / Exactly` deserves the same look. Both are wording, so they go to
`/copy-review`, not to a design round.

### Migration

`/commanders?scope=play` is a shareable URL that currently means Discover. It 308s to
`/discover`, carrying the colour params, the search, the match mode and the ranking across.
`avail` is dropped on that redirect, silently — Discover no longer has the control, and the
alternative is an error page for a param that used to be the default.

The handoff renames the parameters to one letter each (`q`, `c`, `m`, `a`, `o`, `s`). The
shipped keys `join`, `avail` and `sort` are therefore read as fallbacks and never written,
so a shared link keeps its state and rewrites itself to the new keys on the reader's first
control change.

## Code movement

- `src/lib/discovery/**` relocates under the new route substantially intact. The expensive
  part already works and is not being rewritten.
- `getRankedList` gains the deck-exclusion predicate.
- `FilterBar` is rebuilt around the sheet. It currently maintains **two parallel subtrees**
  for mobile and desktop — the join control alone exists at `filter-bar.tsx:380-394` and
  again at `575-608` — which is how the two lanes drifted apart in the first place. One
  element with responsive classes wherever the markup is genuinely the same; the mobile
  sheet is the only deliberate structural split.
- The novelty floor stops reading a pool that can change (`novelty.ts:20-23`).

## Testing

Beyond `pnpm typecheck && pnpm lint && pnpm test` and the stub-DB build, three properties
are pinned because each corresponds to a defect that actually shipped:

1. **The arithmetic identity, per lane.** Printed total − exclusions = rows on screen.
2. **Notes count only their own control.** Light a colour pip *and* type a query, then
   assert the colour note's figure ignores the query. This is defect 2, pinned.
3. **Membership is invariant under scoring controls.** Flipping availability in the owned
   lane, or sort in either lane, must never change which rows exist. This is defect 1,
   pinned.

Plus: the owned lane excludes helmed commanders; the `scope=play` redirect preserves `sort`
and colours; the colour-match control renders in every state including no-pips.

## Process

Repo rules gate UI on a design handoff with a READINESS verdict. This spec goes to Design
as a **narrow** brief — the two racks, the mobile sheet, the chip row — with the structure
above already settled rather than left open. The previous handoff went wide and returned
with the two features merged, which is the failure this spec exists to undo.

## Open questions

None blocking. The two control labels named above are routed to `/copy-review` rather than
left open here.
