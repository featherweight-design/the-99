# Plan — Home parity

**Handoff:** `design/design_handoff_the99_home/` (R1) · **Verdict:** 🟡 Yellow, audited 2026-09-13.
All findings close eng-side; none needed a Design round-trip.

Written against `origin/main` at `0fab4a73`.

Home had drifted into two pages. The resume block and Commitments are desktop-only; `Your decks` —
the rail — is the phone's only deck surface and a second, worse `/decks`. This plan deletes the
rail, grows the resume block to four rows sorted by last touched, and mounts Commitments on the
phone. Two PRs: the stamp's data, then the page.

**Shipping ahead of the brief is Hugh's call, made 2026-09-13.** The home redesign
(`design-pipeline-status.md:157`) is unbriefed and waits on the commander-image treatment and rank
3's roll-up vocabulary. This is a parity pass, not that redesign, and may be re-cut by it.

---

## The readiness audit's findings, and where each one closes

| # | Finding | Closes |
|---|---|---|
| R1 | `last_edited_at` does not exist in any form — `decks` has `created_at` and nothing else temporal; `deck_cards` carries no timestamp | PR 1, task 1–3. This is the round's real cost, not "a query that does not exist" |
| R2 | `last_opened_at` is assumed not written | Verified: no such column, no write path. Stays out of the key, by absence |
| R3 | The empty resume block (0 decks) is drawn absent, heading and all | Already shipped behaviour — `resume-decks.tsx:262` returns null on an empty list. Ratified by precedent, no ruling needed |
| R4 | Relative stamps vs absolute | Ratified by precedent: every relative date on home already measures against the one server clock `Dashboard` takes as `now`. `/copy-review` in PR 2 |
| R5 | Whether a logged game counts as touching a deck | It already does — shipped `resumeDecks` leads on `lastPlayedAt`. Keeping it is the no-change answer |

### Errata — the handoff's figures, corrected against code

The handoff says it restores shipped geometry and changes no row. Four of its figures are neither
shipped nor legal, and the drawing is right where the table is wrong.

| E | Handoff says | Shipped / canonical | Build |
|---|---|---|---|
| E1 | Resume row art bleed `74px` desktop / `62px` phone | `99px` portrait — `art-wash.md:822` fixes portrait width at **band × 1.37**, so a 72px band is 99. 74 is legal at no band; 62 implies a 45px band | `99` at both widths |
| E2 | Row `min-height: 64` desktop / `72` phone | `h-[72px]` **stated, not a floor** (`resume-decks.tsx:94`) — the wash root is a hard 72 and a taller row shows an unwashed strip | Stated `72` at both widths |
| E3 | "3px status rule on the left edge" | That is the **rail's** keyline (`deck-rail.tsx:79`) — the block this round deletes. The resume row has never had one | No rule. The status pill is the row's status signal |
| E4 | Deck name `15.5px` | `14.5px` (`resume-decks.tsx:126`) | `14.5` |
| E5 | STATES §C prints `imported {t} ago` for a never-edited deck, while §B excludes deck creation from the sort key — so such a deck has no key value and cannot appear at all | — | `last_edited_at` backfills to `created_at`, which makes creation a *floor* rather than a sort term; the verb is `edited`. `imported` is dropped — nothing distinguishes an import from an edit once the backfill lands, and a verb that cannot be derived is a verb that would be guessed |

E1–E4 are recorded in the handoff's `README.md` errata table in PR 2. No Design prompt: the
handoff's own stated intent is "shipped geometry, unchanged", and these are the shipped figures.

---

## Global constraints

1. **Touched means edit, commit, or logged game — never opened, never filed.** `folders.ts` does
   not touch. Filing a deck on a shelf is not work on the deck, which is the same reasoning that
   keeps `last_opened_at` out of the key.
2. **The correlated subqueries alias and qualify.** `AGENTS.md` — Drizzle omits table
   qualification in the projection of a single-table select, so
   `where ${deckVersions.deckId} = ${decks.id}` renders as `where "deck_id" = "id"`, compares each
   row's foreign key to its own primary key, and returns null forever with no error.
   `lastPlayedSql` (`read.ts:521`) is already written correctly and is the shape to copy. A
   `.toSQL()` test asserts the qualified form, as `built.test.ts` already does for `notBuiltBy`.
3. **One clock.** The stamp is rendered from the `now` the page already passes
   (`page.tsx:140`), never `new Date()` in a component. Two clocks on one page disagree.
4. **The stamp takes the to-buy clause's slot, and the figure never truncates.** Decisions 19 and
   23 (`resume-decks.tsx:73-81`) already rule this: `86 / 9…` reads as a different number in a way
   a dropped clause does not. On a row that has both, the clause goes and the stamp stays — the
   stamp is why the block is in this order, and the roll-up count is printed on the deck tile.
5. **No new atom, token, hex or motion class.** The stamp is mono 10px `--fg-locked`, a type ramp
   that exists.
6. **Nothing on home reads `DEFAULT_DECK_SORT` after this round.** `page.tsx:98` passes it today
   and the rail renders in that order; with the rail gone, home sorts once, its own way.

---

## PR 1 — the touch stamp's data

**Files:** `src/db/schema.ts`, `drizzle/0030_*.sql`, `src/lib/decks/touch.ts` (+test),
`src/lib/decks/touched.ts` (+test), `src/lib/decks/read.ts` (+`read.test.ts` for `.toSQL()`),
`src/app/decks/actions.ts`, `update-actions.ts`, `import-actions.ts`, `src/lib/decks/versions.ts`,
`scripts/probe-touched.ts`, `package.json`.

### Task 1 — the column

`decks.lastEditedAt: timestamp("last_edited_at").notNull().defaultNow()`.

`notNull` with a default, so every existing row gets a value at migration time and no reader
branches on null. **Backfilled to `created_at`, not `now()`** — a migration that stamps every deck
with the deploy time would sort the whole list by an event that never happened. Generate with
`pnpm db:generate`, then hand-edit the backfill into the generated file:

```sql
ALTER TABLE "decks" ADD COLUMN "last_edited_at" timestamp DEFAULT now() NOT NULL;
UPDATE "decks" SET "last_edited_at" = "created_at";
```

**No index.** An earlier draft of this plan called for `decks_user_edited_idx` on
`(user_id, last_edited_at)`; it was dropped before implementation and the plan is corrected here.
The read narrows on `user_id` alone and then orders in TypeScript over a `greatest()` of three
sources — two of which are subqueries — so no index on this column is reachable by that sort. An
index nothing reads is a write cost on every deck mutation and a line of schema that implies a
query plan that does not exist.

### Task 2 — `touchDeck`

`src/lib/decks/touch.ts`:

```ts
export async function touchDeck(tx: Tx, deckId: string): Promise<void>
```

One statement, `update decks set last_edited_at = clock_timestamp() where id = $1`. Takes the
transaction handle so it lands inside the caller's transaction and cannot half-apply.

**`clock_timestamp()`, not `now()`** — corrected here from the first draft, on round 7 of review.
`now()` is the transaction's start, read before the statement waits for the deck row's lock, so an
edit queued behind another edit would stamp a time from before the one it followed. `commitVersionIn`
takes the same expression for the same reason (round 8): the two columns are compared against each
other, so they have to be read off the same clock.

**Ownership is the caller's.** Every call site already authorises the deck before mutating it;
`touchDeck` re-checking would be a second authorisation path that could disagree with the first.
The test asserts the emitted SQL and that a caller outside a transaction is a type error.

### Task 3 — the write path

Call `touchDeck` at every site that changes what the deck *is*:

| File | Sites | Touches |
|---|---|---|
| `src/app/decks/actions.ts` | 17 | Yes — adds, removals, basics, fill, sweep, rename, commander change |
| `src/app/decks/update-actions.ts` | 4 | Yes |
| `src/app/decks/import-actions.ts` | 3 | Yes — an import is the deck being written |
| `src/lib/decks/versions.ts` | 2 | **Split.** `commitVersionIn` does **not** — a commit is its own term in the sort key, and touching there would make every commit also an edit so the verb would never be `committed`. `restoreDraftFromVersion` **does**: a discard rewrites `deck_cards` wholesale, so the draft changed even though it now matches a version |
| `src/lib/decks/folders.ts` | 2 | **No.** Filing is not work on the deck (constraint 1) |

Each site gets the call, not a wrapper: a `withTouch` helper over 24 call sites would hide which
mutations count as work, and that list is the design ruling.

### Task 4 — the read

`read.ts`, alongside `lastPlayedSql`:

```ts
const lastCommittedSql = sql<Date | string | null>`(
  select max(dv.committed_at)
  from ${deckVersions} dv
  where dv.deck_id = ${decks}.id
)`;
```

Aliased and qualified, per constraint 2. `DeckListItem` gains `lastEditedAt: Date` and
`lastCommittedAt: Date | null`, both through the existing `toDate` guard — `read.ts:465` already
documents why a raw-SQL timestamp that silently becomes `Invalid Date` is worth throwing over.

### Task 5 — `touchedAt` / `touchedBy`, pure

`src/lib/decks/touched.ts`:

```ts
export type TouchVerb = "edited" | "committed" | "played";
export function touchedBy(deck: SortableDeck): { at: Date; verb: TouchVerb }
export function byTouched(a, b): number   // touchedAt desc, then name asc, then id
```

`greatest()` in TypeScript rather than SQL, because the three sources are already on the row and a
second ordering expression in the query would be a second definition of the same rule.

**Ties resolve `played` > `edited` > `committed`** — corrected here from this plan's first draft,
which said `commit > play > edit`, on what rounds 3 and 5 of review turned up.

A commit must be **strictly newer** than the edit to win, because migration `0024` stamped a
synthetic v1 on every already-full deck with `committed_at = decks.created_at` and this round's
migration seeds `last_edited_at` from that same column. Every deck predating versioning therefore
carries both at the same instant, having never been committed by anyone, and the first draft's rule
would have printed `committed 3mo ago` across the whole list.

A game takes its tie against both. No path writes a game and a commit in one transaction, so an
equal instant there is two `Date` values colliding at the millisecond rather than a fact about
ordering — and when the tie carries no information, the act that happened to the deck in the world
is the better thing to print than a snapshot taken of it.

Name-ascending tiebreak, per the handoff, replacing the shipped `createdAt` tiebreak. Then `id`,
because deck names are not unique (`read.ts:529`).

### Task 6 — `pnpm probe:touched`

`scripts/probe-touched.ts`, per-run `user_id`, deleted in a `finally`, pointed at `local-dev`,
**never production**. Proves what no unit test can:

1. A deck's `last_edited_at` does **not** move when it is filed on a shelf, through the real
   `moveDeck`. The add is **not** here and cannot be: every server action calls `requireUserId()`,
   so a database-only script cannot reach one. The add's two branches — a card placed, and a repeat
   the conflict clause swallows — are asserted in `actions.test.ts` against the emitted statements,
   as the removal's are.
2. A commit does not move `last_edited_at`, so the verb is `committed`; a discard does.
3. `lastCommittedAt` comes back non-null for a committed deck — the figure, against a fixture whose
   true value is known, because emitted SQL proves the question and only a row proves the answer.
4. The backfill: a deck inserted with an explicit old `created_at` reads that instant, not `now()`.

Run every check's failure path before trusting it. Done, four times: dropping the discard's stamp,
breaking the correlated subquery, emptying the migration's backfill, and teaching `moveDeck` to
stamp each fail exactly the check written for them.

---

## PR 2 — the page

**Files:** `src/components/home/dashboard.tsx` (+test), `resume-decks.tsx` (+test),
`commitments-card.tsx`, `deck-rail.tsx` (**deleted**), `deck-rail.test.tsx` (**deleted**),
`src/lib/copy/refresh.ts`, `src/app/page.tsx`, `docs/superpowers/design-tables/ui-refresh-home.md`,
`design/design_handoff_the99_home/README.md` (errata), `scripts/probe-refresh-home.mjs`,
`docs/superpowers/inventories/home-parity.json`, `package.json`.

### Task 7 — delete the rail

`DeckRail` has one consumer (`dashboard.tsx:119`). Delete the component and its test. Retire
`refreshCopy.home.decksHeading`, `.decksMore` and `.allDecks` — nothing else references them
(`folder-actions.ts:34` names the component in a comment only; update the sentence).

### Task 8 — the resume block

- `RESUME_COUNT` 2 → 4.
- The section loses `hidden sm:flex` and becomes `flex`. The row container takes `flex-wrap` and
  each row a `basis-[calc(50%-6px)]`, which is what makes four rows 2×2 above the threshold and
  stacked below.

  **The threshold is 1180, not the shipped 1000** — corrected here on round 1 of review, and the
  arithmetic is the reason. The old figure was derived for a row with no stamp: 255px of fixed
  content before the commander's name got a pixel. The stamp adds ~78 of non-shrinking mono, so a
  row needs ~347, a pair ~706, and with 52px of page padding, the 20px gap, the 316px rail and the
  12px gap between the two rows that is 1106px of viewport. At 1024 the stamp was clipped away
  entirely by the row's own overflow — `pnpm probe:home` measures exactly that.

  **The body's two columns and its padding move with it.** Both were at `sm`, which gave 640–1179 a
  third layout: one column wide, with desktop padding, and Commitments beside the rows rather than
  after them.
- The row is unchanged: same 72px band, same 99px portrait, same inset (E1–E4).
- The footer line: `moreDecks(total − shown)` + `allDecks(total)`, absent when the figure is nought.
  `total` is `decks.length`, the same count the deleted heading printed.
- The caption `last touched` sits beside the section label, mono 10px. Not a control.

### Task 9 — the stamp

Mono 10px `--fg-locked`, never wrapping, never its own line. Desktop: under the count,
right-aligned. Phone: in the meta line where the to-buy clause sits (constraint 4).

Copy from the handoff's file into `refreshCopy.home.touched` and `.elapsed`, verbatim, minus
`imported` (E5). Elapsed is `hours` / `yesterday` / `days` / `weeks` / `months`, lower case, and
**no "just now"** — a stamp of 0 is not news, so under an hour reads `0h ago`.

### Task 10 — Commitments on the phone

Drop `hidden` from `commitments-card.tsx:61` and move the element out of the right-rail column into
the shared stack, last. On desktop it is now the whole right rail, the deck list above it having
left.

### Task 11 — the property table

`ui-refresh-home.md` is canonical for home and is already stale — §ResumeRows still draws a 30×42
spine the art-wash lift replaced. Re-enumerate §ResumeRows **in place** at both widths, delete
§DeckRail, and correct §Page states' populated row. A table that describes a surface nobody built
is the defect the art-wash round recorded; this one describes a surface that no longer exists.

### Task 12 — acceptance

`docs/superpowers/inventories/home-parity.json`, in the shape `scripts/contact-sheet.mjs` and
`pnpm check:shared` already read: `/` at 1440 and 390, with a `shares` block naming
`CommitmentsCard` and its module, since Commitments is now the same component at both widths and
this round's whole claim is that no block is drawn twice.

`scripts/probe-refresh-home.mjs` is rewritten, not extended — it gates a page whose rail it
currently asserts. It **asserts** rather than dumping JSON, and each check presses or measures:

1. Four resume rows at 1440, 2×2 — two distinct `y` values, two distinct `x` values.
2. Four resume rows at 390, stacked — four distinct `y`, one `x`.
3. `Commitments` is present at 390 and is the **last** block — its `y` exceeds every other section's.
4. No `Your decks` heading, and no rail, at either width.
5. Every row carries a stamp, and the stamp's text matches `/^(edited|committed|played) /`.
6. The rows are in the order the stamps claim — parse each stamp, assert non-increasing recency.
7. `All {n} decks` is a link to `/decks`, **clicked**, landing on `/decks`.
8. Row heights are 72 at both widths, and the portrait is 99 (E1, E2).
9. At 900px — the width nobody drew — rows stack rather than clipping their commander names: each
   row's name element has a non-zero width.
10. Phone targets clear 44px on every control on the page.

Screenshots per viewport for the design review, as today.

---

## Gates

Per push: `pnpm typecheck && pnpm lint && pnpm test`, the stub-DB build, then
`git fetch origin && git rebase origin/main`.

Per PR: the design-review skill (enumerate → verify → confirm) on PR 2, `pr-review` for the
Copilot cycle on both, `feature-acceptance` at PR 2 and again at feature close — the contact sheet
and the close-out walk, because a review reads a diff and cannot see a phone layout that diverged.

Deploy: migrations apply on the production Vercel build; confirm with `GET /api/health` rather than
loading a page that depends on the schema.
