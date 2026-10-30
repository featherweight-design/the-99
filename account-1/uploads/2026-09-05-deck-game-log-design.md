# Win/loss tracking for decks — design

**Date:** 2026-09-05
**Branch:** `docs/deck-game-log-design`
**Serves:** #9 (extends the deck page from #8; unlocks the tuning tier, #10)
**Status:** spec — approved in conversation 2026-09-05, pending implementation plan

---

## 1. Why this exists

A deck in The 99 is currently a thing you build and then never hear from again. The app knows what is in
it and knows nothing about whether it works. Every question worth asking about a finished deck — is it too
slow, does it run out of gas, does it fold in bigger pods — is answerable only from games actually played,
and today that record lives nowhere.

#9 exists to create that record. It is deliberately the smallest feature that turns played games into a
signal, because the payoff is not the log itself: it is #10, the tuning tier, which cannot recommend a
change to a deck until something tells it what is wrong with the deck.

The motivating case is the Gisa Zombies deck. It wins by going wide and recurring creatures, and it loses
by emptying its hand around turn eight. Three games is enough for a person to notice that. Nothing in the
app notices it, so nothing in the app can act on it.

### The constraint that shapes everything

The value of this feature is entirely downstream. A log that only shows you back what you typed is worth
close to nothing — you were at the game, you remember it. The log becomes worth keeping only if the app can
count across games and say *this happened three times out of three*.

That requirement lands on the note field and dictates its shape. Free-text notes are the fastest thing to
write at the table and the only thing the app can never aggregate: "ran out of gas" and "hand was empty by
turn 8" describe one problem in two strings, and no amount of counting will join them. So the strength and
weakness capture is a **fixed vocabulary**, chosen at design time, stored as stable keys.

The opposite failure is just as real. A log that takes two minutes to fill in is a log you abandon by game
four, and an abandoned log produces no patterns either. Every decision below is pulled between those two
poles: enough structure to count, little enough friction to keep doing.

---

## 2. Scope

**In scope:**

- Two new tables — a game row and its axis marks — plus the migration.
- A fixed axis vocabulary as a code constant.
- `logGame` and `deleteGame` server actions.
- A read module: list a deck's games, and a pure function that aggregates them into a summary.
- A **Games** tab on the deck page presenting the summary, the log form, and the history.

**Out of scope:**

- **Any card suggestion.** #9 names the gap ("ran out of gas, 3/3 games") and stops there. Turning a named
  gap into concrete adds and cuts is #10's entire reason to exist, and building it here would leave #10
  with nothing.
- Editing a logged game (see §4).
- Opponents, commanders faced, turn counts, game length, mulligans. Each is plausible and none is needed to
  produce a pattern; they can be added to `deck_games` later without disturbing anything here.
- Cross-deck statistics ("my best deck"). One deck at a time is the question #10 asks.

---

## 3. Data model

Two tables, keyed and cascaded like `deck_cards`. This repo does not use `pgEnum` — constrained strings are
`text` plus a `check()` (see `collection_items_finish_check`, `commander_scores_synergy_state_check`), and
these follow that.

### `deck_games` — one row per game played

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK `defaultRandom()` | |
| `deckId` | `uuid` → `decks.id`, `onDelete: "cascade"` | deleting a deck deletes its history |
| `userId` | `text` | Clerk user ID, same convention as `decks.userId` |
| `result` | `text` | `check` — `in ('win', 'loss', 'draw')` |
| `podSize` | `integer` | `check` — `between 2 and 8` |
| `playedAt` | `timestamp` `notNull().defaultNow()` | when the game happened |
| `createdAt` | `timestamp` `notNull().defaultNow()` | when the row was written |

`userId` is denormalised from `decks` deliberately. Every read of this table is already scoped to one user,
and carrying the ID means ownership checks and history queries never need the join.

`playedAt` is separate from `createdAt` so a game logged the morning after still sorts to the night it
happened.

### `deck_game_axes` — one row per checked box

| Column | Type | Notes |
|---|---|---|
| `gameId` | `uuid` → `deck_games.id`, `onDelete: "cascade"` | |
| `axis` | `text` | a stable key from the vocabulary constant |
| `polarity` | `text` | `check` — `in ('worked', 'hurt')` |

Composite primary key `(gameId, axis)`.

That composite key is doing real work. It makes "the same axis marked both worked and hurt in a single
game" **unrepresentable**, rather than an invariant a server action has to remember to enforce. Aggregation
is then a plain `GROUP BY axis, polarity` with no arrays and no `unnest`.

A join table rather than two `text[]` columns on `deck_games` for the same reason: arrays can hold the
contradiction, and they make the aggregate query worse.

### The axis vocabulary

Lives in `src/lib/decks/game-axes.ts` as a frozen array of `{ key, label }`. Rows store `key`.

Provisional set of eight — **labels are Design's call, keys are not** (§8):

| Key | Provisional label | Reads as |
|---|---|---|
| `speed` | Speed out of the gate | got going fast / started too slow |
| `card_flow` | Card flow | kept drawing / ran out of gas |
| `mana` | Mana | hit land drops / screwed or flooded |
| `interaction` | Interaction | answered threats / no answers |
| `board` | Board presence | built a board / got outsized |
| `resilience` | Resilience | recovered from a wipe / never recovered |
| `engine` | The engine | the deck's core plan fired / never came together |
| `closing` | Closing the game | converted the win / stalled out |

The axes are **polarity-neutral**: one list, and logging a game means dropping the two-to-four that actually
mattered into *What worked* or *What let me down*. Because both directions of an axis are the same key, "card
flow was great once and terrible three times" nets to a single unambiguous number instead of two unrelated
phrases the app has to guess are opposites.

`check()` deliberately does **not** constrain `axis`. Pinning the vocabulary in SQL would mean a migration
every time Design renames or adds a box, and the write path validates against the constant anyway. Adding an
axis is a code change; relabelling one is a copy change.

Migration is whatever `pnpm db:generate` emits — next in sequence at whatever `drizzle/` is at when the work
starts. Do not hardcode a number in the plan; it moves.

---

## 4. Write path

Two server actions in `src/app/decks/actions.ts`, both returning `DeckMutationResult` so they slot into the
`MutationError` surface the deck page already renders.

```
logGame(deckId, { result, podSize, playedAt?, worked: string[], hurt: string[] })
deleteGame(deckId, gameId)
```

`deleteGame` takes `deckId` alongside the game ID so both actions authorise through the same
`requireDeck(deckId, userId)` call and revalidate the same way. It then loads the game row and confirms it
belongs to that deck before deleting — the deck check alone would let a caller pass their own deck's ID with
someone else's game ID.

Both follow the shape `addCardToDeck` established (`src/app/decks/actions.ts`):

1. `const userId = await requireUserId()`
2. `await requireDeck(deckId, userId)` — ownership
3. validate the input
4. transaction: insert the game row, then its axis rows (`deleteGame`: delete the row, axes cascade)
5. `for (const path of deckSurfaces(deckId)) revalidatePath(path)`

Step 5 uses `deckSurfaces()` from `src/lib/decks/revalidate.ts` rather than a hand-written path. It returns
`["/decks/<id>", "/decks", "/"]`, and it is the pattern to follow — a single hardcoded `/decks/<id>` leaves
the deck list and the home page stale. It is not yet universal: a few older actions still revalidate one
path by hand (`actions.ts:549`, `actions.ts:605`). Those are the exception to move away from, not a
precedent to copy.

Validation, every failure **returned** as `{ ok: false, message }` from `REJECTION_MESSAGES` and never
thrown — thrown errors are for database failures, per the existing convention:

- `result` is one of the three values
- `podSize` is an integer 2–8
- every key in `worked` and `hurt` exists in the vocabulary constant
- no key appears in both lists
- `playedAt` is not in the future

Each list is then **deduplicated** before the insert. A checkbox UI cannot produce `worked: ['mana', 'mana']`,
but a crafted request can, and it would hit the composite primary key and *throw* — surfacing a database
error where the convention promises a returned rejection. Collapsing each list to a unique set removes the
case rather than adding a sixth rule to remember. A repeated key carries no meaning the first one does not,
so there is nothing to reject.

**No `FOR UPDATE` lock.** `addCardToDeck` locks because it reads the deck's card count, decides against the
99-card cap, and writes — a read-modify-write whose invariant two concurrent callers could break. Logging a
game has no such invariant: nothing about a new game depends on what other games exist, so two concurrent
logs are both simply correct. Locking here would be copied from a case that is not this one.

**No edit action.** Delete-and-relog covers a mislogged result, and an update path would have to reconcile
an existing set of axis rows against a new one for no gain at this scale. If it chafes in use it is a small
addition later.

---

## 5. Read path

A new `src/lib/decks/games.ts`:

- **`listDeckGames(deckId, userId)`** — games with their axis marks attached, newest `playedAt` first.
- **`summarizeGames(games)`** — a **pure function. No database access.**

`summarizeGames` returns:

- `count` — games logged
- `record` — `{ wins, losses, draws }`
- `axes` — for each axis with at least one mark: `{ key, worked, hurt, net }` where `net = worked - hurt`
- three buckets derived from that: **Keep** (`net > 0`), **Fix** (`net < 0`), **Mixed** (`net === 0`)

Each bucket is sorted by the magnitude of `net` descending, then by `key` ascending so the order is stable
and testable rather than dependent on row order.

**Mixed is not padding.** "Mana was fine twice and screwed you twice" is a genuinely different finding from
either "mana is fine" or "mana is a problem", and collapsing it into one of the other two buckets would
assert something the games did not say. Whether the UI shows all three buckets is a presentation question
(§8); the data layer returns all three regardless.

Aggregation happens in TypeScript, not SQL, because the row count is dozens and a pure function is the thing
that can be tested exhaustively without a database. Every rule you would want to argue about — what ranks
above what, what counts as a pattern — lives in one pure function with no I/O.

**No minimum-games gate.** The summary is computed from the first game. The denominator travels with every
figure ("3/3", "1/1"), so a reader can judge the confidence themselves, and an artificial "come back after
three games" threshold would hide the feature during exactly the window when someone is deciding whether to
keep using it.

---

## 6. UI surface

The deck page (`src/app/decks/[id]/page.tsx`) renders one client component, `BuilderShell`. Games data is
therefore fetched server-side in `page.tsx` — `listDeckGames` and `summarizeGames` — and passed down as
props, matching how the rest of the deck's data already reaches the shell.

`BuilderTabs` gains a third tab, **Games**, alongside Decklist and Consider. Its content, top to bottom:

1. **Record line** — the summary's headline, e.g. `2-1 across 3 games`.
2. **Log a game** — opens the form.
3. **Keep / Fix** — the aggregated axes with their counts, the payoff surface. Whether Mixed appears here
   as a third group is Design's call (§8).
4. **History** — the games themselves, newest first, each showing result, pod size, date, its marks, and a
   delete affordance.

The form captures result, pod size, and the two axis columns from §3 — the shape approved in conversation.

The empty state (no games logged) has to carry the whole pitch for the feature, since it is what someone
sees before there is anything to show. That is a copy and layout problem, and it goes to Design.

### The design gate

#9 is a `type: design` ticket, and per `AGENTS.md` **no UI ships without a `design/design_handoff_the99_*`
handoff carrying a READINESS verdict.** Backend, database and server-action work is explicitly not gated.

The feature therefore splits cleanly:

- **Phase 1 — ungated.** Schema, migration, vocabulary constant, both server actions, the read module, and
  all their tests. Ships as backend with no user-visible surface.
- **Phase 2 — gated on the handoff.** The Games tab, the log form, the empty state, mobile and desktop
  parity in the same PR, and the design-review skill before `gh pr create`.

Phase 1 is worth shipping on its own: it is the half #10 reads, and it is the half that cannot change much
whatever Design decides about presentation.

---

## 7. Testing

**`summarizeGames` — unit, exhaustive, no database.** This is the feature's judgment, so it carries the test
weight: zero games; one game; an axis marked only worked; only hurt; net-positive; net-negative; net-zero
landing in Mixed; ties broken by key; bucket ordering; a game with no axis marks at all.

**Server actions** — following the established stub pattern in `actions.test.ts`: `vi.hoisted()` to stub the
db client before importing the action module, fake query builders, mocked `requireUserId()` and
`revalidatePath()`, assertions against recorded insert calls. Cases: ownership rejection; each validation
rejection named in §4; the same key in both lists; a key repeated within one list, asserting one axis row is
written rather than an error surfacing; the happy path's insert calls; `deleteGame` on someone else's game.

**Not tested:** that the composite primary key rejects a duplicate `(gameId, axis)`. That is Postgres doing
its job, and asserting it tests the database rather than this code.

Phase 2 adds component tests to whatever the handoff specifies, plus the design-review pass.

---

## 8. Open questions for Design

Carried into the handoff, not decided here:

1. **Axis labels.** The eight keys in §3 are settled; the eight strings are placeholders. "Card flow" has to
   be legible to someone filling this in late at night, and Design owns that wording.
2. **Whether Mixed is shown.** The data layer always returns it. Showing three buckets may be more honest
   and more cluttered than showing two.
3. **Form presentation** — dialog over the deck page, or inline within the tab. The builder is already dense.
4. **The empty state**, which carries the feature's pitch before any data exists.
5. **Low-N presentation.** No gate is imposed (§5), but a summary drawn from one game should probably not
   look as authoritative as one drawn from ten.

---

## 9. What this unlocks

#10 reads `deck_game_axes` and the `summarizeGames` output. A weakness that recurs — `card_flow` at
`net: -3` — becomes #10's input: map the axis to deck roles, compare the deck's count in that role against
comparable decks, and propose cards from the collection to fill it. That mapping table belongs to #10.

The reason the vocabulary is keys rather than prose is precisely this handoff. #10 joins on `card_flow`; it
would have to parse "ran out of gas".
