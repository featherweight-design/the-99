# Proxied cards, per deck — design

Date: 2026-09-14
Branch: `spec/deck-proxies`
Handoff: `design/design_handoff_the99_proxies/` — R1 + R2, audited 🟢 Green on 2026-09-15.
Status: accepted; see the addendum at the foot of this file for what the design rounds added

## Problem

Some cards in a deck are printed, not owned. Two reasons, and both are ordinary:
the card is too expensive to buy (The Ozolith in HD Gods), or the collection
holds fewer copies than the decks that want them and one deck gets the real card
while the others get paper.

Today the app has no way to say so. A printed card reads as a card the player
does not have: it carries a buy tag, it sits in the deck's Shopping list, it is
priced into the deck's cost, it rides along in the Mana Pool basket, and the
deck never reads as complete. Worse, in the not-enough-copies case the deck
holding the printed copy still claims the single real one, so the deck that
physically has the card is told it is short and sent shopping — the exact
implicit-pull failure the availability model exists to prevent.

The fix is a per-deck mark: this deck's copy of this card is a proxy.

## What a proxy is

**A proxy is a statement that this deck needs nothing from the collection for
this card.** The deck's slot is filled; the collection is untouched; the deck
claims nothing.

That single sentence decides almost every question below, and it is worth
stating in the negative too. A proxy is *not* a note to buy the card later, it
is *not* a suppression of the buy tag with the claim left standing, and it is
*not* a property of the card or of the collection. It is one deck's answer about
one slot.

## Rulings

Settled during brainstorming on 2026-09-14. These are not open.

1. **A proxied card releases the physical copy.** Own one Sol Ring across two
   decks, proxy it in B, and A reads as covered rather than short. B's slot
   reads filled. Rejected: keeping the claim and suppressing only the nagging,
   which would leave A short and solve nothing.
2. **Proxying is outside versioning.** Toggling takes effect at once, never puts
   the deck in a pending state, never appears on `/decks/[id]/changes`, and needs
   no commit. Cost, accepted: version history cannot say which cards were proxies
   at the time of a given commit.
3. **Commanders can be proxied.** Expensive legends are the most proxied cards
   there are, so the feature would read as broken without it.
4. **Three surfaces, not one.** The deck that owns the proxy, the card's own
   detail receipt, and a list answering "what am I proxying across every deck" —
   the list a print run or a later buying decision is made from.
5. **A proxy covers the deck's whole ask for that card.** No quantity. Commander
   is a singleton format; the multi-copy exceptions (Dragon's Approach,
   Persistent Petitioners) would be printed as a set anyway.

## Data model

```sql
create table deck_proxies (
  deck_id    uuid not null references decks(id) on delete cascade,
  oracle_id  uuid not null references cards(oracle_id),
  created_at timestamp not null default now(),
  primary key (deck_id, oracle_id)
);

create index deck_proxies_oracle_idx on deck_proxies (oracle_id, deck_id);
```

The primary key's order serves the claim anti-join, which always knows the deck.
The card detail receipt asks the opposite question — every deck proxying *this*
card — and would scan the whole table for it, so the second index leads on
`oracle_id`.

**A side table rather than a column on `deck_cards`,** for two reasons that each
decide it alone. Neither commander is a `deck_cards` row —
`decks.commander_oracle_id` and `decks.partner_oracle_id` are their own columns —
so a column on that table could not express ruling 3 at all. And ruling 2 puts
proxy state outside versions, so a column would have to be either absent from
`deck_version_cards` (an asymmetry between the two lists, waiting to be read
wrong) or present and deliberately ignored.

`created_at` is not decoration: the proxy list orders on it, and it is the only
record of when a printed copy entered a deck.

### A proxy row is inert unless the card is in the deck

**Every read joins `deck_proxies` against current membership** — a `deck_cards`
row, or either of `decks.commander_oracle_id` / `partner_oracle_id`. A row whose
card has since left the deck therefore does nothing while it is absent.

That scoping is narrower than it first appears, which is the second reason it
cannot be the guarantee: a **committed** deck claims from `deck_version_cards`,
not from `deck_cards`, so a card removed from a sleeved deck's draft is still
claimed by its version — and the proxy row is still matched against it.

**That is defence in depth, and it is not the guarantee.** The first version of
this spec said it was, and that was wrong: an inert row is not a gone row, and
re-adding the same card makes the anti-join match it again, so the card arrives
*silently already proxied* — the exact failure the scoping was supposed to make
unreachable. Worse on the fill's path, where the app itself re-adds a card and
the player is then told they need not buy something they never said they were
printing.

So a removed slot takes its proxy with it. `pruneOrphanProxies(tx, deckId)` is
**one reconcile statement** — *which of this deck's proxy rows have no membership
now* — and every write that can shrink a deck's list calls it inside its own
transaction: `removeCardFromDeck`, `clearAutoCards`, `undoFillPass`,
`pullCardFromDeck`, `updateDeckFromList`, `restoreDraftFromVersion`.

Asking the always-right question rather than "which cards went" is what makes it
safe on the two paths that replace the list wholesale: there, a card the new list
still holds has left and come back inside one transaction, and a
difference-based prune would drop a proxy the player never retracted. On those
paths the call sits **after** the rewrite.

A list of six call sites is a list that rots, so it is enforced rather than
remembered: `prune-proxies.test.ts` reads the source and fails when a
`delete(deckCards)` appears in a transaction with no prune beside it, and when a
file that deletes `deck_cards` is missing from its own list. The seventh path is
the one that would otherwise ship this bug.

## The claim rule

`claimModel` in `src/lib/decks/availability-query.ts` builds `all_claims` from
six union arms — a committed version's cards, its two commanders, a brew's live
list, and its two commanders. Every arm carries `deck_id` and `oracle_id`.

The whole of ruling 1 is filtering that union:

```sql
all_claims as (
  select * from (
    ...the six arms, unchanged...
  ) ac
  where not exists (
    select 1 from deck_proxies p
    where p.deck_id = ac.deck_id and p.oracle_id = ac.oracle_id
  )
)
```

One edit retires the claim for a sleeved deck and a brew, for a list card and
for either commander, with no per-arm reasoning and no arm that can be forgotten
when a seventh is added. It is not, however, the only edit — see below.

The same anti-join applies to `own_claims`, the vantage deck's own draft ask. Without
it, a deck's own `free` would keep subtracting a copy it is not asking for, and
the deck page would report a shortfall against itself.

`owned` is untouched. The collection is a statement about cardboard and a proxy
does not change any of it.

### Two anti-joins, not one

`loadDeckBuyRows` does **not** read `all_claims`. Its own `list_claims` CTE reads
`deck_cards` directly (`availability-query.ts:473`), because what a deck can be
told to buy is its draft list while seniority is measured against what is
sleeved — the two diverging is that query's whole point. So the buy-row path
needs the same anti-join in `list_claims`, and without it a proxied card keeps a
positive buy row while the claim model says it wants nothing.

The two are separate edits on separate queries, and the probe must cover both.

### Every reader that bypasses the claim model

The anti-joins settle what a deck *claims*. They settle nothing about readers
that compute from `deck_cards` or from `owned` directly, and there are four.
Each needs the proxy explicitly.

| Reader | Today | With proxies |
|---|---|---|
| `isShoppingCard` (`shopping.ts`) | `if (!c.owned) return true` | Proxied tests first: never a Shopping row, so the price strip, the cost stat and both Mana Pool hrefs drop it |
| `deckCounts` → `statusPill` | `ownedCount` sums `c.owned`; `Complete` requires `ownedCount === built` | A proxied card counts as **covered**, so a deck whose only gaps are proxies reads `Complete` rather than `To buy` |
| `bucketAdds` (`draft-diff.ts:85`) | no availability entry → `unowned`, priced into the commit receipt | A proxied add is neither `unowned` nor `free`: it needs its own bucket, or the review screen bills a card the player printed |
| `loadCardDetail` (`card-detail.ts:144`) | skips availability entirely when `owned.length === 0` | An unowned proxied card has no `Availability` object at all, so the receipt's proxy line cannot ride on that read — see Surfaces |

**Covered is not owned.** The distinction has to survive into the model rather
than being folded away: `owned` stays a fact about the collection, and a second
figure says the slot is filled. Collapsing them would make a proxy look like a
card the player has, which is exactly what the collection must never claim.

## Surfaces

All three are UI and are **blocked on a design handoff with a READINESS verdict**
before any of them is built. The schema, the claim anti-join, the server action
and the probe are backend and proceed without one.

### 1. The deck's own card — `/decks/[id]`

The mark and unmark control lives on the card detail sheet opened from a
decklist row. The row itself gains a proxy tag in the slot the buy tag occupies,
and the commander slot takes the same control by the same route.

Two things that sheet does not have today, and both are part of this build:

- **A deck context.** `CardDetailProvider.open` takes an oracle id and its
  siblings, nothing more, and `CardModal` has no per-deck action. A control
  calling `setCardProxied(deckId, …)` cannot scope itself from that. The deck id
  is threaded through the open call from the decklist and the commander slot, and
  stays absent for openings from `/collection` and commander detail — where a
  proxy control must not appear at all, because there is no deck to proxy into.
- **Commander proxy state.** `DeckDetailCard` models `deck_cards` rows only;
  commanders are `DeckCommander` values (`read.ts:120`) and never enter it. Each
  commander carries its own `proxied` flag, read the same way.

### 2. The card's detail receipt

The receipt is `AvailabilityDetail` in `src/components/cards/card-modal.tsx`,
backed by `BrowseCard.availability`. (Not `receipt-line.tsx`, which is the
commander recommendation's fit line on a different surface.)

It accounts for every copy of a card — which decks hold it, hard or soft. A
proxying deck is deliberately absent from that accounting, because it holds no
copy. It therefore needs a line of its own: the decks holding real copies, then
the decks running a print.

**That line cannot ride on the availability read.** `loadCardDetail` computes
availability only when the player owns at least one copy (`card-detail.ts:144`),
and the headline case for a proxy is a card owned in none. The proxying decks are
therefore their own field on the card detail payload, loaded on both branches of
that function.

`Availability.claims` must keep carrying real claimants only. The proxying decks
ride alongside as a separate field on the same read; folding them into `claims`
would make every downstream consumer — `hardDecks`, `pullSources`, the markers,
the pull authorization — start subtracting cardboard that does not exist.

### 3. The proxy list — `/collection/proxies`

A new route under the collection, reached from `/collection` exactly as
`/collection/sets` is: a `Proxies` link beside `By set` in the filter bar's rack
(`filter-bar.tsx:273`), same treatment, same grouping — both change which
surface you are on rather than filtering the one you are on.

Not a sixth nav tab. Five is the set, and this is a corner of the collection
rather than a peer of it.

**The `Proxies` link is not gated on `hasCollection`,** though `By set` beside it
is (`filter-bar.tsx:271`). A set browser with no collection has nothing to say; a
proxy list is most useful to exactly the player whose cards are all printed. The
two sit together and differ on this one condition.

It answers the two questions that make the list worth keeping: what to send to a
print shop, and what to buy for real later. Rows group by card and name the decks
running each one.

## Writes

One server action, `setCardProxied(deckId, oracleId, proxied)`:

1. Authorize the deck against the reader, as every deck mutation here does.
2. **Validate membership in the same transaction** — the card is a `deck_cards`
   row of this deck or one of its commanders. Deck ownership alone is not enough:
   without this, any oracle id at all can be posted and a row written for a card
   the deck has never held.
3. Insert or delete one row.
4. Fire the claim revalidation (`revalidate-claims.ts`), **extended**. What is
   there today covers this deck's own surfaces, `/decks`, `/`, `/collection`,
   `/commanders`, `/discover`, and the `/decks/[id]/changes` and
   `/commanders/[slug]` patterns. A proxy toggle moves figures on *other decks'
   detail pages*, which `claimSurfaces` names only for the writing deck, and it
   changes the new proxy list. Both are added: the `/decks/[id]` pattern, and the
   literal `/collection/proxies`.

**Cleanup is `pruneOrphanProxies`, at all six list-shrinking writes** — see the
data model above, which supersedes the "no cleanup path" this section claimed in
the spec's first version. Deck deletion cascades and needs none of it.

**The write takes the deck row's lock before it validates.** `select 1 from decks
where id = $1 for update`, which is the lock `removeCardFromDeck` and
`clearAutoCards` already take. Without it, a proxy write could validate
membership, then have its insert land after a concurrent removal's prune has
run, leaving an orphan for a card that is no longer in the deck — the one hole a
reconcile statement cannot close from its own side.

**Unproxying can create a shortfall.** The deck starts claiming again and may
find its copy senior-claimed elsewhere. That is the same arithmetic a pull
already performs and needs no warning of its own.

## Proof

**Unit.** The shopping predicate, pinning that `proxied` wins over `!owned` — the
one consequence that does not fall out of the claim model. And a `.toSQL()`
render of the claim model asserting the anti-join emits qualified column
references, because this repository has already shipped a correlated subquery
that compared a column to itself, returned zero for every row, and raised no
error (see AGENTS.md).

**`pnpm probe:proxies`,** against a real Postgres, because the claim model is raw
SQL no unit test here can reach:

1. A proxied list card in a sleeved deck releases its copy to another sleeved
   deck — the deck that physically holds it stops reading short.
2. A proxied **commander** does the same. This is the arm a `deck_cards` column
   could not have expressed, so it is the one a passing suite would most likely
   be silent about.
3. A proxied card leaves the deck's buy rows and its cost figure. This is the
   second anti-join, in a different query from checks 1 and 2, and a probe that
   exercises only the claim model would pass while the player is still billed.
4. A deck whose only uncovered cards are proxies reads `Complete`.
5. A proxied add on a deck with pending changes is not billed on the review
   screen or the commit receipt.
6. A card the deck does not hold cannot be proxied, and a proxy row left behind
   by a removal has no effect if the card returns.
7. Unproxying restores the claim, and the other deck reads short again.

Fixture discipline as every other probe in this repository: a per-run `user_id`,
deleted in a `finally`, pointed at `local-dev` or a scratch Neon branch, never
production.

Each check must be run against a deliberately broken build before it is
believed. A probe that reports green while measuring nothing is the failure mode
this repository has hit repeatedly.

## Out of scope

- Quantities. Ruling 5.
- Proxy state in version history. Ruling 2.
- Any notion of a proxy at the collection level, or a proxy shared between
  decks. A proxy is one deck's answer about one slot.
- Printing, print sheets, or image export. The proxy list says what to print;
  what happens next happens elsewhere.

## Build order

1. Migration and schema. Backend, unblocked.
2. Both anti-joins (`all_claims` and `list_claims`), `own_claims`, the `proxied`
   flag on the deck card model and on each commander, the four bypassing readers
   in the table above, the server action with its membership validation, and the
   extended revalidation. Backend, unblocked.
3. `pnpm probe:proxies`. Backend, unblocked.
4. The three surfaces, once the handoff returns Green.

---

# Addendum — what the design rounds added

Date: 2026-09-15. The handoff (`design/design_handoff_the99_proxies/`, R1 + R2) was audited
🟢 Green. Four rulings and three findings came out of those rounds; all of them are build
scope this spec did not previously carry.

## Rulings

1. **The mark is the glyph `P`, decoded by a key.** A one-character mark in `BuyTag`'s box,
   with a mark key under the decklist toolbar listing only the marks the current view
   contains. The word rides three carriers — the key, a `title`, and an `sr-only` name — which
   is `BuyTag`'s own arrangement at collapsed density. The key is a shared component that
   future marks are added to, not a proxy-specific legend.
2. **`/collection/proxies` is read-only.** A row names its decks and opens the card sheet;
   unmarking happens in the deck, because the sheet's control is per deck and a row belongs
   to several.
3. **The proxy count appears on the deck page AND the `/decks` tile.** The deck page's line
   sits under the progress bar; the tile takes `N proxies` in `detailFor`'s existing slot as a
   second fallback, ranked after the `Building` + `inUseElsewhere` clause. It can never take a
   warning colour, structurally: every status that would lend it one already fills that slot.
4. **`groupInBreakdown` gains a fourth term.** `3 free · 2 sleeved · 1 to buy · 1 proxied`,
   absent at zero. The alternative — leaving the terms to under-sum — was rejected: a
   breakdown that does not account for every row in its group reads as a rendering fault.

## Findings from the R2 read of the source

1. **`AvailabilitySlot` draws a buy tag on a proxied add, as shipped.**
   `update-diff-row.tsx:225` opens `if (buyable && (!card.owned || …))`, and a proxied add is
   unowned — so `/decks/[id]/changes` would quote a price for a card the player has decided
   not to buy. The slot must test proxied first. This is a defect, not a design call, and it
   is the third surface the mutual-exclusion constraint reaches.
2. **Three purchase figures must exclude a proxied add**: the review footer's `buy`, the commit
   sheet's total, and the pending banner's `money` sentence (*N of the M are short of spare
   copies*). A proxied add is not short of anything.
3. **The review row needs its own word.** `bucketWord` returns `null` for `free`, and silence
   would have been available — but `free` means *your collection has a spare copy for this*,
   and borrowing it would assert a copy in a box on the one surface whose job is saying what a
   commit will cost. The chip reads `proxied`, in the mark's dashed skin rather than a bucket's
   tinted plate.

## Copy corrections carried into the build

The handoff's copy file ships two strings whose em dash is a sentence connector, which rule 4
forbids here, and one ambiguous sentence: *"None of these is in your collection because of this
page"* can be read as "…and that is because of this page". Both are rewritten in
`src/lib/copy/proxies.ts` rather than transcribed.
