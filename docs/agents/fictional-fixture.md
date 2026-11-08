# The fictional fixture

One invented account, **Wren Calloway**, shared by the About captures (`scripts/capture-about.mjs`) and the landing
page's interactive demo. Built by `scripts/fictional-fixtures.mts` from `scripts/lib/fictional-fixture/`. Nothing in it
derives from a real player: the collection is chosen from the CATALOG tables (`cards`, `printings`,
`commander_support_cards`, `printing_prices`) by a seeded rule, the names, notes and filenames are written in
`names.ts`, and stage 0 empties every user-keyed table so a scratch branch off local-dev carries no snapshot data.

## Run

```
# scratch branch off local-dev (0.25 CU), DATABASE_URL in the worktree .env pointed at it
pnpm fixtures:about          # purge + base stage
pnpm fixtures:about:cart     # once, after the Friends frames are shot
pnpm fixtures:about:export   # JSON, default scripts/out/fictional-fixture.json (gitignored); FIXTURE_EXPORT_PATH overrides
```

The owner is the existing headless test account (`E2E_AUDIT_USER_EMAIL` through Clerk's dev instance, or
`ABOUT_FIXTURE_USER`); no Clerk user is created. `assertScratchBranch` runs before the first write.

## Determinism

- `FIXTURE_SEED` (`rng.ts`) feeds one mulberry32 stream per purpose (`streamFor("collection")`, `"printings"`).
- Ids are uuid v5 from `FIXTURE_NAMESPACE` plus a role: `ABOUT_DECK_IDS` = `under`, `over`, `played`, `fresh`,
  `versioned` (pinned in `fixture.test.mts`); games and uploads use `game:<n>`, `upload:<n>`. Friend ids are
  `fixtureFriendId(viewer, n)` (through `friendId()` in `context.ts`) with n the friend's place in `FRIEND_NAMES`.
- Same catalog + same seed = same collection and same lists. Dates are relative to the run (`Date.now()`).

## Extras (`extras.ts`): history and proxies, no deck touched

Two small tables About's Collection places need, written at the end of the base stage and idempotent (the purge ran first).
**They never change a deck**: the five decks' ids, card lists, quantities and totals (100/88/106/100/100) are what a paid
demo was generated from, so nothing here writes `deck_cards`, `deck_locks` or a deck row (`fixture.test.mts` pins the ids and totals).

- `collection_history`: an `add` of three cards, then an `edit` raising one of them, through the app's own `applyCollectionChange`, backdated to 9 and 3 days ago. The cards are ones the account does not own, that no deck holds, that no deck's commander indexes and that are neither a buy nor a face, so they are never a "shared card" or a Shopping line. Both entries show a live Revert on `/collection/history`. They add four copies to the collection (the one table of the two that moves the owned total).
- `deck_proxies`: three single-copy cards already in one deck (`PROXY_DECK_ROLE`, `versioned`; never `played`, whose Shopping total the demo shows), so `/collection/proxies` lists them. Proxies never touch `deck_cards`.

`deck_proxies` is in `FK_CHILDREN` and `collection_history` in `USER_KEYED`, so the purge empties both and the guard holds them to the fixture's ids.

## Purge (`purge.ts`)

`USER_KEYED` lists every table with a user column and which columns; `FK_CHILDREN` the child tables; `NO_KEY_PERSONAL`
payment, webhook and waitlist tables. One `truncate table ... restart identity` (no cascade), so a table left off the
list makes Postgres refuse rather than be skipped. `flag_overrides` is `KEPT` (only its user rows are deleted). After the
purge a guard asserts no user table holds a row not owned by the fixture's ids; the same guard runs again at the END of the base stage and of the cart stage, so a row the build (the app's own writes included) put under anyone else fails the run. `collection_items_backup_20260915` is truncated only where `pg_class` has it. `purge.test.mts` compares the lists with
the Drizzle schema: a new table with a user column fails CI until it is listed.

## Export shape (format 1)

```
{ format, seed, player: { name }, deckIds: { under, over, played, fresh, versioned },
  collection: [{ oracleId, name, set, number, finish, count, condition, scryfallId }],
  decks: [{ role, id, name, commander: { oracleId, name }, cards: [{ oracleId, name, quantity }],
            versions: [{ number, note, committedAt, cards: [...] }], locked: [oracleId], notes: [text] }],
  games: [{ id, deckId, result, podSize, playedAt, versionNumber, opponents: [{ seat, name, deckName, commanderOracleId, won }] }],
  friends: [{ name, pods: [name], spares: [{ oracleId, quantity }] }],
  wishlist: [{ oracleId, quantity }], uploads: [{ filename, rowCount, confirmedAt }],
  proxies: [{ deckId, oracleId, name }], history: [{ id, kind, createdAt, raised, lowered, source }] }
```

It is read back from the database the generator wrote, so it is exactly what the app holds. Production has no fixture
account: the demo ships the export (or payloads generated on it) in the repo. A deck's pending change (Played) shows as
the difference between `cards` and the last `versions[].cards`.

## Known shape notes

- Deck sizes are rows in `deck_cards`; the profile's total (`deckTotal`, `src/lib/tuning/v2/run.ts`) adds the commander,
  which is not a row. So `played` holds 99 rows (97 built from the collection plus the two unowned buys) = **exactly
  100** (the Suggested changes deck, V2_DECK_TOTAL); `under` 87 rows = 88 (Top off); `over` 105 = 106 (Look deeper);
  `fresh` and `versioned` 99 = 100. The export carries each deck's `total`.
- **Shared card** ("Which deck needs it most?"): one owned, free, non-basic card is indexed by two or more decks'
  commanders, inside their colors, and is in none of them. The generator prints it (`shared card: ...`) and the export
  lists the candidates in `sharedCards` (name, oracleId, deckIds).
- **Credits**: `grantGift` (`src/lib/admin/gift.ts`, the admin support grant) writes one `gift` lot of 10 credits
  (`FIXTURE_CREDITS`), idempotent on `gift:<uuid v5>`, with its `admin_events` row. A gift is not a `PAID_SOURCES` source,
  and no Stripe call is made; Clerk's existence check is stubbed true. The free daily allowance sits beside it. The
  export lists the lots in `credits`.
- **Commanders**: 40 owned across 8 color pairs plus their mono colors. Discover's owned-support counts are a lazy cache
  (`owned_support_counts` + a stamp, filled on first read, computed inline until then), so the fixture calls no recompute.
- 42 popular colorless staples are deliberately NOT owned and sit in the decks, so the cart has lines to buy.
- The player's `user_prefs` row has `about_version_seen` set and no About entries marked seen.
- **The capture** (`pnpm capture:about`) imports `ABOUT_DECK_IDS` from `rng.ts` (Node strips the types) and checks each id as the account's own deck; the shell's account control is rewritten to the player's name, email and `WC` chip (`STAND_IN` in `scripts/lib/about-identity.mjs`), so it agrees with the Friends frame's "Friends see you as Wren Calloway". Run it against a build of a branch migrated to the current schema, and shoot Friends before `pnpm fixtures:about:cart` (the cart's three pods and four friends change that frame).
