# Deck versioning — design

**Issue:** #389 · **Date:** 2026-09-09 · **Status:** design approved, plan not yet written

## Problem

A deck is not a fixed object. It gets tuned — deliberately after a run of losses, or gradually
and without anyone writing down why. The app holds only the deck as it stands right now, so two
things are unavailable: the record that today's list is the third attempt rather than the first,
and any safe place to tinker before committing to the change.

The concrete workflow that surfaced this. "HD Tune — Mutant Menace" is one of the oldest decks,
so under `created_at` seniority it claims every card it lists. Tuning it means considering
roughly forty cards: some sit free in the collection, some are already sleeved in newer decks,
and some are not owned at all. Two things are needed and neither exists:

1. **Nothing may be pulled out of a newer deck implicitly.** A card sleeved elsewhere is spoken
   for. The right answer is "buy another copy", with the option — never the default — to pull it
   from the other deck deliberately.
2. **A safe place to tinker, then a commit.** Add and remove freely, sit above or below 99 while
   thinking, then lock the result as the next version and get two lists out of it: what to buy,
   and what to pull back into the collection.

The current workaround is Deckcheck.co: removals go into its "Considering" list, additions go
straight into the deck, and the two get cross-compared by hand. The removals half works. The
additions half does not, because the list does not distinguish a card already owned from a card
that has to be bought.

The looking-backwards half matters later — "I am seeing more losses in v2, what changed?" — and
is worth only as much groundwork now as keeps it possible.

## Decisions taken

Recorded so they are not re-litigated during implementation.

1. **Always-draft.** A deck that has been committed at least once never edits its committed list
   directly. Edits accumulate as a pending change set until the next commit. There is no mode to
   enter and no session to forget to start.
2. **A committed version beats seniority, and the pull is offered.** A copy sleeved in any other
   deck's committed version is unavailable, however old the deck asking for it. The card that
   holds it is named, and pulling it is a one-click action the builder may take.
3. **Commit produces the to-do list; it does not assert the work is done.** Committing emits the
   buy list and the pull list. The new version becomes the deck's list immediately, so cards not
   yet bought keep the buy tag they would carry today. There is no separate "I have done it"
   step and no checklist to close out.
4. **No versions until the first commit.** A deck with no version edits live, exactly as today —
   fill, keep, sweep and top-off are untouched. The first commit draws the line.
5. **Games are stamped with the version live at the time; the diff is shown.** No per-version
   win-rate figures this round.

## Data model

Three schema changes.

```
deck_versions
  id                   uuid  primary key
  deck_id              uuid  → decks.id, on delete cascade
  number               int   1, 2, 3…
  committed_at         timestamp not null default now()
  note                 text  nullable
  commander_oracle_id  uuid  not null → cards.oracle_id
  partner_oracle_id    uuid  nullable → cards.oracle_id
  unique (deck_id, number)
  index (deck_id, number)

deck_version_cards
  version_id  uuid → deck_versions.id, on delete cascade
  oracle_id   uuid → cards.oracle_id
  quantity    int  not null
  primary key (version_id, oracle_id)

deck_games
  + version_id  uuid  nullable → deck_versions.id, on delete set null
```

**A version stores the full list, not a diff from its predecessor.** Roughly 99 rows per commit,
which costs nothing. A diff chain would make "what is sleeved right now" a fold over history, and
that read runs inside the claim model on every availability query in the application.

**A version snapshots both commander columns.** Changing a commander is a version boundary like
any other, and the claim model already unions those columns alongside the decklist. A version
that did not carry them would force the claim query to read the live `decks` row for part of its
answer, mixing draft truth and committed truth in the one query that must never mix them.

**`deck_games.version_id` is nullable and clears rather than cascades.** Games logged before this
ships were played by a list nobody recorded; null is the accurate value and a backfill would be a
fabricated claim. Deleting a version must never delete the games played under it.

**There is no `is_draft` column.** Draft state is not stored — it is `deck_cards` differing from
the newest version's cards. One source of truth, so no flag can go stale against the rows it
describes. A deck with no `deck_versions` row is a brew, and edits to it are live.

### Migration

Existing decks at a full body (99, or 98 with a partner — `deckBodySize()`) get a v1 stamped from
their current `deck_cards`. Brews below that get no version and keep behaving exactly as they do
today. Stamping a brew would make a 40-card list's claims hard overnight, which is a behaviour
change nobody asked for. Existing games keep a null `version_id`.

## The claim model

`src/lib/decks/availability-query.ts` changes at its root. `all_claims` stops reading
`deck_cards` and reads each deck's newest `deck_versions` row: its `deck_version_cards` plus that
version's two commander columns. A deck with no version keeps claiming off `deck_cards`, soft,
exactly as a brew does today.

**`mature` retires.** The `>= 99 - (partner ? 1 : 0)` threshold was a guess at "is this deck
sleeved". A committed version answers it outright. This deletes the CTE, deletes the literal that
has to be kept in step with `deckBodySize()`, and retires the #334 commander carve-out as a
special case: a committed deck's commander claim is hard because the whole version is hard.

**Seniority moves from `decks.created_at` to `deck_versions.committed_at`** — who sleeved the
card first, rather than who registered the deck first. This is what makes the Mutant Menace case
come out right in both directions:

- *Before the commit.* The draft adds Cyclonic Rift. Mutant Menace's committed version does not
  list it, so it makes no claim; the other deck's version does. `free` is 0 and the draft row
  shows a buy tag. Mutant Menace being the older deck never enters into it.
- *After the commit.* Two committed versions now claim one copy. Ordered by `created_at`, Mutant
  Menace would win on age and the newer deck would silently be told to shop — the exact implicit
  pull this design exists to prevent, deferred by one click. Ordered by `committed_at`, the deck
  that sleeved it first keeps it and Mutant Menace's new version carries the buy tag until a copy
  is actually bought.

Over-subscription stops being the everyday case and becomes the genuinely impossible one: two
versions that cannot both be true, reachable when a CSV re-import shrinks the collection beneath
what the committed versions claim. `committed_at` ordering still resolves it, and the shortfall
still caps at the supply so a deck is never told to buy copies a senior claimant also lacks.

### Pulling a card from another deck

Taking the offered pull removes the card from the source deck's list *and* commits a version on
that deck recording the removal. Pulling a card out of a box is a physical change to that deck,
so it earns a version; committing immediately is also what frees the copy on the spot, rather
than leaving the asking deck showing a buy tag until someone remembers to go and commit the
source.

**Guard:** if the source deck already has pending changes of its own, the pull is not offered as
a one-click action. The offer becomes a link to that deck to release the card there. Committing
automatically would sweep somebody's half-finished tinkering into a version they never asked for.

## Surfaces

All five are UI and therefore gated on a design handoff carrying a READINESS verdict. What
follows fixes the behaviour they must express, not the drawing.

**1. Pending state on the deck page.** A committed deck with a non-empty diff says so — a count
of adds and of removes — with the affected rows marked in the decklist. The list on screen stays
the draft: 104 cards is a real number the page shows without complaint, because that is the
tinkering the feature exists to allow. Coverage strip, mix targets and role counts read the draft
too, since they exist to say whether the deck being built works.

**2. Review changes.** Adds and removes side by side. This replaces the manual Deckcheck
cross-compare, and the thing it adds is splitting the adds three ways: owned and free, owned but
sleeved in another deck, and not owned. The middle group carries the pull offer, one per card,
naming the deck that holds it.

**3. Commit.** Turns the draft into the next version and emits two lists. **Buy**: draft cards
with no free copy, priced, feeding the existing Mana Pool link-out. **Pull**: cards the version
dropped, noted as back in the pool — no action required, because the commit already released the
claim. An optional note records why the version exists; it is unrecoverable afterwards, which is
why it is offered at commit time.

**4. Version history and diff.** Versions with date, note, and `+n / −n`. Opening one shows it
against its predecessor. A v1 with no predecessor reads "initial", not "+99".

**5. The game log stamp.** A logged game records the version live when it was PLAYED, which for a
backdated game is not the current one. History rows show it
as a small marker. Games from before this shipped show nothing rather than a guess.

**Discard** sits beside Commit, throws the draft away and restores `deck_cards` from the newest
version. The draft is not itself versioned, so this is unrecoverable and confirms first — the
same bar the bulk keep took in #476.

**Open for Design:** the top-off flow already places cards into a deck and already produces a buy
list. On a committed deck its adds become pending and its buy list becomes a preview of what the
commit will ask for. That is coherent, but two surfaces then make a purchase claim, and Design
should see them together.

## Modules

`src/lib/decks/committed.ts` already exists and means "which deck is this card already in". The
new concept must not borrow that word. The vocabulary is *version*, *draft*, and *commit a
version* — never "committed cards".

- `src/lib/decks/versions.ts` — read a deck's newest version, write a new one from `deck_cards`,
  restore `deck_cards` from a version.
- `src/lib/decks/draft-diff.ts` — pure. Draft rows plus version rows in, adds and removes out,
  and the three-way partition of the adds by availability. Pure means unit-testable without a
  database, which matters because the feature's correctness rests on this function.
- `src/lib/decks/availability-query.ts` — the claim-source swap and the `committed_at` ordering.
  Adds no CTE; deletes the maturity one.
- `src/app/decks/actions.ts` — `commitVersion`, `discardDraft`, `pullFromDeck`, each through
  `requireDeck` as every existing deck mutation is.

## Testing

`draft-diff` and the buy/pull partition get real unit tests.

The claim model is raw SQL, and this repository has no integration-test harness for query
builders — the deck lifecycle work hit the same wall and shipped without them. Rather than assert
coverage that does not exist, the claim change is proved by a `scripts/probe-*.mjs` run against
the local-dev fixture accounts, exercising four states by name:

1. A draft add cannot take a card out of another deck's committed version.
2. A pending remove still claims, because the card is still sleeved.
3. Between two committed versions claiming one copy, the earlier `committed_at` holds it.
4. An accepted pull frees the copy immediately.

## Phasing

Four pull requests, each shippable on its own.

1. **Schema, migration, v1 backfill.** No behaviour change.
2. **The claim-model swap, plus the probe.** Lands alone: it silently changes buy tags across the
   whole application with no UI change to explain them. The pull request description must state
   which decks' shopping lists move and why.
3. **`commitVersion` / `discardDraft` / the diff**, behind whatever Design draws for the deck
   page.
4. **Version history, the diff view, and the game stamp.**

## Risks

- **The backfill.** Stamping every existing deck would make half-built brews' claims hard
  overnight. Mitigated by stamping only decks at a full body; brews keep today's behaviour
  exactly.
- **PR 2 is invisible and wide.** Buy tags move across the application with nothing on screen to
  account for it. Mitigated by the probe and by an explicit description of the movement.
- **Two truths, one table.** "What the deck will be" and "what is sleeved" become separate reads.
  Mitigated by naming them unmistakably in the query layer rather than relying on convention, and
  by keeping the sleeved read confined to `availability-query.ts`.

## Addendum R1 — corrections from the plan review

A code review of the implementation plan found three places where the design above states an
intent the obvious implementation does not deliver. The intent stands; the mechanism changes.

**1. Seniority is per card, not per deck.** "Seniority moves to `committed_at`" reads naturally
as "order decks by their newest version's timestamp", and that is wrong. A deck that has held
Cyclonic Rift for a year and then commits an unrelated swap would jump to the back of the queue
on *every* card it holds, and be told to buy copies already sleeved in its own box — the same
implicit pull this design exists to prevent, arriving from the other direction.

The date that orders a claim is therefore carried on the claim: `deck_version_cards.since`, plus
`deck_versions.commander_since` and `partner_since` for the two commander columns. At commit each
is inherited from the predecessor version when that version held the same card, and set to the
new version's `committed_at` when it did not. Continuity is decided once, at the rare write,
rather than folded out of history by the hot read.

This also fixes the remove-and-re-add case, which a `min(committed_at)` over history would get
wrong: a card dropped in v2 and re-added in v4 starts a fresh run at v4, so the deck that sleeved
it in between keeps it.

The backfill sets `since = committed_at = decks.created_at`, so the day PR 2 lands, seniority
among already-full decks is *exactly* what it is today. The movement is confined to full-body
decks versus brews, which narrows the "PR 2 is invisible and wide" risk considerably.

**2. `mature` becomes `sleeved`, and one downstream reader was missed.** The `free` expression in
`loadAvailability` reads `skip_deck.mature` through a scalar subquery, well away from the CTEs
being replaced. It moves with the rename.

**3. The buy list must survive the draft/version divergence.** `loadDeckBuyRows` inner-joins its
decklist rows to `claim_decks_all` to find the vantage deck's own place in the queue. Once claims
come from versions and the decklist stays `deck_cards`, a draft-added card has no row on the
claim side and is silently dropped from the buy list — the one figure the player commits against.
It becomes a left join, and a card the vantage deck does not hold in its version is junior to
every sleeved claimant, which is what makes "a draft add cannot take a card out of another deck"
fall out of the ordering rather than needing a rule of its own.

Two smaller consequences, recorded so they are not read as bugs later:

- On a committed deck's own page, a card the *draft* added contributes nothing to `own_claim`, so
  it reads as free when a free copy exists. That is correct — the deck has not sleeved it — and
  is asserted by the probe.
- A version number is `max + 1` inside a transaction. The deck row is locked `for update` first,
  because a pull commits a source deck inside another deck's flow and two commits racing would
  otherwise collide on `deck_versions_deck_number_key`.

## Addendum R2 — a pasted decklist is a draft

The design above assumes the draft is reached one card at a time, through the deck page and the
Add panel. It is not the only way in. `updateDeckFromList` in `src/app/decks/update-actions.ts`
replaces a deck's contents from pasted text, and that is how the deck this feature was asked for
actually gets tinkered with: the list is edited on Deckcheck and pasted back.

**A paste lands in the draft and never commits.** The user commits, always. This needs no code
change — `updateDeckFromList` writes `deck_cards` and `deck_unresolved_rows`, both of which are
draft state on a deck that has committed a version, and touches no version table, so the paste
already behaves this way. On a brew with no version there is nothing to diff against and a paste
is simply the deck, exactly as today. It is recorded here because the reverse is the tempting reading, and it would
skip the one moment the feature exists for: seeing the buy list and being offered the pulls
before the claims move.

A guarantee falls out of it for free. Until the commit, the deck still claims exactly what its
committed version claimed, so a newer deck cannot lose a card to a list somebody is still
deciding on — which is the seniority complaint this design opens with, answered on the paste
path without a rule of its own.

Two consequences for the surfaces:

- Pending state and Review changes must read as well at forty changed rows as at two. Arriving
  by paste is the normal case, not the edge one, and a diff drawn card-by-card will not hold.
- The update flow already previews its own in/out list before writing. On a committed deck there
  are then two diffs for the same deck — that preview, and pending changes. Same overlap class as
  the top-off buy list in §Surfaces, and it goes to Design with it.

## Out of scope

Per-version win-rate figures, inference over version history, versioning the deck intent field
introduced by #10, and any backfill of existing games to a version.
