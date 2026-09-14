# Proxied cards, per deck — design

Date: 2026-09-14
Branch: `spec/deck-proxies`
Handoff: none yet — the three UI surfaces below are blocked on one
Status: proposed

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
```

**A side table rather than a column on `deck_cards`,** for two reasons that each
decide it alone. Neither commander is a `deck_cards` row —
`decks.commander_oracle_id` and `decks.partner_oracle_id` are their own columns —
so a column on that table could not express ruling 3 at all. And ruling 2 puts
proxy state outside versions, so a column would have to be either absent from
`deck_version_cards` (an asymmetry between the two lists, waiting to be read
wrong) or present and deliberately ignored.

`created_at` is not decoration: the proxy list orders on it, and it is the only
record of when a printed copy entered a deck.

## The claim rule: one anti-join

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
when a seventh is added.

The same anti-join applies to `own_claims`, the vantage deck's own draft ask. Without
it, a deck's own `free` would keep subtracting a copy it is not asking for, and
the deck page would report a shortfall against itself.

`owned` is untouched. The collection is a statement about cardboard and a proxy
does not change any of it.

### What follows without further work

- **Buy rows and Shopping.** A proxied card leaves `loadDeckBuyRows`, so it
  leaves the Shopping filter, the price strip's total and denominator, the deck's
  `cost` stat on `/decks`, and both Mana Pool `add-deck` hrefs. One predicate,
  four consumers, as `shopping.ts` already documents.
- **Completeness.** The deck stops reading short on that card.
- **Other decks' figures.** The released copy raises their `free` on the next read.

### What does not follow

`isShoppingCard` opens with `if (!c.owned) return true`, and a proxied Ozolith is
still owned-zero — it would be *added* to Shopping by that line before the
availability arithmetic is ever consulted. So the deck-page card model
(`DeckDetailCard`) carries a `proxied: boolean`, and the predicate tests it
first. The same flag decides the row draws a proxy tag rather than a buy tag;
the two are mutually exclusive by construction, since a proxied card never
reaches the buy rows.

## Surfaces

All three are UI and are **blocked on a design handoff with a READINESS verdict**
before any of them is built. The schema, the claim anti-join, the server action
and the probe are backend and proceed without one.

### 1. The deck's own card — `/decks/[id]`

The mark and unmark control lives on the card detail sheet opened from a
decklist row: the surface that already carries that card's per-deck actions and
already draws its availability receipt. The row itself gains a proxy tag in the
slot the buy tag occupies. The commander slot takes the same control by the same
route.

### 2. The card's detail receipt

`receipt-line.tsx` accounts for every copy of a card — which decks hold it, hard
or soft. A proxying deck is deliberately absent from that accounting, because it
holds no copy. It therefore needs a line of its own: the decks holding real
copies, then the decks running a print.

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

It answers the two questions that make the list worth keeping: what to send to a
print shop, and what to buy for real later. Rows group by card and name the decks
running each one.

## Writes

One server action, `setCardProxied(deckId, oracleId, proxied)`:

1. Authorize the deck against the reader, as every deck mutation here does.
2. Insert or delete one row.
3. Fire the same claim revalidation a pull or a commit fires
   (`revalidate-claims.ts`). A proxy toggle moves other decks' figures, so their
   cached pages are stale the moment it lands. This is the step most easily
   forgotten and the one whose absence is invisible in development.

**Cleanup.** Removing a card from a deck deletes its proxy row in the same write,
and so does swapping a commander. An orphan row is not inert: re-adding that card
later would arrive silently already proxied. Deck deletion is covered by the
foreign key's cascade.

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
3. A proxied card leaves the deck's buy rows and its cost figure.
4. Unproxying restores the claim, and the other deck reads short again.

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
2. Claim anti-join, `own_claims`, the `proxied` flag on the deck card model, the
   shopping predicate, the server action and its revalidation. Backend, unblocked.
3. `pnpm probe:proxies`. Backend, unblocked.
4. The three surfaces, once the handoff returns Green.
