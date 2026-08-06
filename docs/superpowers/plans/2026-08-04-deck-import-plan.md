# Implementation plan — Deck import (Moxfield) (#42)

Handoff: `design/design_handoff_the99_deck_import/` (R2, verdict 🟢 Green)
Brief: `docs/superpowers/specs/2026-08-02-deck-import-design.md`

A player pastes a decklist, uploads a `.csv`/`.txt`, or gives a Moxfield URL. We parse it, match
names against the catalog, and **create the deck immediately — there is no review gate**. Lines that
don't match persist as *unresolved rows* attached to the deck, visible among the real cards, and the
player resolves each one through a card search or deletes it.

## How to read this plan

Nine PRs, in order. Each has numbered tasks naming the file and what changes. Tests are written
first; every task that touches logic names the assertion before the implementation.

### Build order — the dependency is retired

**All nine PRs can run in sequence with no external wait, as of 2026-08-05.**

This section previously read "PRs 7–9 cannot begin until #158's PR 6 merges," because
`quick-add-bar.tsx` did not exist and the arrival chrome sits inside the shell #158 rewrites.
**#158 is now fully merged** — all six PRs (#169, #170, #171, #173, #175, #180) plus its close-out
doc PR (#186) — so `quick-add-bar.tsx` exists and PR 8 has a construct to take its combobox from.

The merge-conflict watch on `src/components/decks/builder-shell.tsx` is likewise moot: #158 went
first, as planned, so PR 7 here builds on the current shell rather than racing it.

Launch gating is **not** a build-order constraint but is easy to confuse with one: `/decks/import`
ships unlinked in PR 4 and only becomes reachable from `/decks` in PR 6. See the briefing.

### Five facts established while writing these tasks

1. **`deckCounts` has no `total`.** The handoff says unresolved rows must be "in `total` and out of
   `built`", but `deckCounts` (`src/lib/decks/grouping.ts:41-49`) returns exactly
   `{ built, ownedCount, toBuyCount }`. `total` is a **new field**, not a widened one. Its comment
   already warns that two implementations would let the counter strip and the decklist disagree
   mid-mutation — so the unresolved count enters through this one function, on both the server list
   and the optimistic client list.

2. **A default parameter protects callers but not `toEqual`.** The runtime call sites — `read.ts:152`
   (spread into `getDeckDetail`, so `total` propagates into the returned detail type) and
   `builder-shell.tsx:55` — are genuinely safe. But `deckCounts`'s tests do **not** live in a
   `grouping.test.ts`; they are in `src/lib/decks/read.test.ts:225-244`, and two of them assert the
   whole shape (`:240` and `:244`). Both must be edited in the same PR that adds `total`. Editing
   them is a task below, not an accident to discover in CI.

3. **All three helpers take a single object argument.** `statusPill(args: { built, ownedCount })`
   (`status.ts:9`), `shouldCelebrate(args: { status, alreadyCelebrated })` (`celebration.ts:9`),
   `deckCounts(cards)` (`grouping.ts:41`). New inputs are **fields on the object**, never positional
   parameters. Getting this wrong is a compile error at three call sites: `read.ts:202`,
   `builder-shell.tsx:63`, `status.test.ts:5-11`.

4. **`statusPill` cannot see unresolved rows, and that is gap 2's real shape.** It returns `Complete`
   whenever `built === 99 && ownedCount === built`, so a deck with 99 matched cards *plus*
   unresolved rows reads `Complete` today. Gap 2 worried the `Complete` block was unreachable dead
   code; it is the opposite — the block is the guard, the arithmetic is the mechanism, and the test
   asserting 99-built-plus-unresolved reads `Playable` is what stops a later refactor collapsing
   them. The handoff says the same thing from the design side: the pill needs no new variant because
   97/99 already reads `Building`; the block is belt-and-braces for the one deck that reaches 99
   built and still carries unresolved lines.

5. **There is no storage for an unresolved row, and the parser/matcher are done.** The collection
   flow's `UnmatchedRow` (`src/lib/collection/issue-filter.ts:4-8`) lives only inside
   `csv_uploads.preview_payload`, abandoned if the upload is never confirmed; deck import is this
   repo's first append-only, partially-successful import and needs a real table. Meanwhile
   `parseCollectionCsv` (`parse.ts:85`) already reads Moxfield, Archidekt, Deckbox and ManaBox
   exports, `parsePasteList` (`paste.ts:15`) reads `3 Sol Ring` / `3x Sol Ring` / bare names, and
   `matchRows` (`match.ts:21`) resolves by Scryfall ID → oracle ID → case-insensitive name with
   split-card handling, already classing tokens and emblems as `skipped` rather than `unmatched`.
   Import **composes** these. It does not modify them.

### The failure taxonomy, settled

| State | Condition | Where it is detected |
|---|---|---|
| 4 | URL is not a Moxfield deck URL | client, before any request |
| 5 | Deck is private | 403 from the fetch |
| 6 | Deck not found or deleted | 404 |
| 7 | Unreachable or rate-limited — **the only retryable one** | 5xx / 429 / timeout |
| 8 | File wrong type or too large | client, before upload |
| 9 | Rows parsed, **zero matched** | after `matchRows` |
| 10 | **Zero rows** after parse | after `parsePasteList` / `parseCollectionCsv` |

9 and 10 are distinguishable today. `parsePasteList` falls through to `quantity = 1` for any
non-blank line (`paste.ts:38-40`), so gibberish yields *rows that all fail at match* — state 9 — and
only a genuinely empty source yields zero rows. R1 had this inverted and asked for a parser change;
none is needed, and state 9's copy was rewritten accordingly (`unparseable` → `noneMatched`, both
bodies taking a line count).

---

## PR 1 — Schema only

Additive, with no consumer. Ships safely ahead of everything and cannot regress a live surface.
The counts and status changes deliberately **do not** ride along — they are behaviour on a surface
that will have zero unresolved rows in existence for five more PRs, so they land in PR 6 where
something consumes them.

1. **`src/db/schema.ts`** — add `deckUnresolvedRows`:
   `id` uuid pk `defaultRandom()`; `deckId` uuid → `decks.id` `onDelete: "cascade"`; `rawName` text
   notNull; `quantity` integer notNull default 1; `sourceLine` integer notNull; `createdAt`
   timestamp notNull `defaultNow()`. No FK to `cards` — the whole point of the row is that it has no
   oracle ID. Index on `deckId`.
   **No unique key on `(deckId, rawName)`:** a decklist can legitimately carry the same unmatched
   string on two lines, and collapsing them would silently change the player's count. `sourceLine`
   distinguishes them and is the group's sort key, so rows sit in the order the player's file had
   them.
2. **`pnpm db:generate`** — commit the generated migration. Do not hand-write it.

---

## PR 2 — The import pipeline, server-side

No UI. Composes the existing parser and matcher into a deck, and encodes every locked edge case as a
test.

1. **`src/lib/decks/import.ts`** — `buildDeckImport(...)` returning
   `{ cards: { oracleId, quantity }[]; unresolved: { rawName, quantity, sourceLine }[];
   legendaryCandidates: { oracleId, name, sourceLine }[]; notes: ImportNote[] }`. Pure — no db, no
   auth — so every edge case below is a unit test rather than an integration one.
   `legendaryCandidates` carries `sourceLine` because PR 5's picker rows show it.
2. Encode the four locked decisions **as named branches**, each with its own test:
   - **Sideboard / maybeboard lines are not imported.** Commander has no sideboard and importing
     them inflates the deck past 100. Detect the section markers the exporters emit, drop what
     follows, and raise an `ImportNote` so the count is explained rather than mysterious.
   - **Quantity > 1 on a non-basic imports at quantity 1** and raises a note. The card is
     identifiable — only the count is wrong — so an unresolved row would overstate the problem. Use
     `isBasicLand` (`grouping.ts:30`), which already exists.
   - **A commander that also appears in the 99 is deduped silently.** An export artifact, not intent.
   - **Re-importing the same deck creates a second deck.** Explicitly *no* dedupe check. Updating in
     place is sync, a different and much larger feature; the test asserting two decks is what stops
     import quietly becoming it.
3. **`src/lib/decks/import.test.ts`** — one test per branch, plus: a row `matchRows` returned as
   `skipped` (token/emblem) becomes **neither** a card nor an unresolved row, and a row returned as
   `unmatched` becomes an unresolved row carrying its original `line` as `sourceLine`.
4. **`src/app/decks/import-actions.ts`** — `importDeck(input)` server action: auth, load match inputs
   via `loadMatchInputs` (`src/lib/collection/import.ts:32`), run the pipeline, then insert the deck,
   its `deck_cards` and its `deck_unresolved_rows` **in one transaction**. A deck that exists without
   its unresolved rows is a deck that silently lost the player's data.
5. **Extract the size limits as named constants — and do not standardise the file limit on the
   collection's.** `src/app/collection/actions.ts:100` inlines `5 * 1024 * 1024` with no constant to
   import, so both flows need lifting into one module. But they hold **different numbers on
   purpose**: a collection CSV can be twenty thousand rows and gets 5 MB; a 100-card decklist is a
   few kilobytes, and the handoff's copy says `.csv or .txt, under 2 MB` in three places. Deck
   import gets its own 2 MB constant.
   **This is not cosmetic.** State 8's drawn example is a `4.1 MB` `.xlsx` — a file that *passes* a
   5 MB check. Standardising on 5 MB would make the handoff's own illustration of the failure not a
   failure, and the copy would be lying about a limit the code doesn't enforce. The paste limit
   (100 KB) is genuinely shared and should be one constant.
   Add a test asserting the deck-import limit and the string in `deck-import.ts` agree, so the copy
   and the check cannot drift apart later.
6. **`src/lib/decks/read.ts`** — `getDeckDetail` also selects the deck's unresolved rows and returns
   them, so every consumer sees them without a second query.
7. `read.test.ts` — assert a deck with no unresolved rows returns an empty array and that its other
   fields are unchanged.

---

## PR 3 — Moxfield URL fetch

The only new third-party surface, and the only genuinely unknown part of this plan.

1. **Spike first, and record the result before writing the adapter.** Moxfield's deck API is not
   documented as a public integration surface and is known to be access-controlled; I have **not**
   verified from this repo what an unauthenticated server-side request returns. Do not assume an
   endpoint. Run the request, record the actual status codes and bodies in
   `docs/superpowers/spike-moxfield-fetch.md`, then map them.
2. **If the spike fails, the answer is a different fetch strategy — not dropping URL mode.** The URL
   is the ticket title and the only mode with no local equivalent; the handoff leads with it "because
   that is the ticket". A #42 that ships paste-and-file only is a feature the collection flow already
   has. Options to price in that order: a server request with a corrected request shape, a
   client-side fetch, or documenting an auth requirement and surfacing it as a state. Raise the
   outcome with Hugh the moment the spike lands; do not absorb it quietly either way.
3. **`src/lib/moxfield/url.ts`** — `parseMoxfieldDeckUrl(input)` returning the public deck ID or
   `null`. Pure and client-safe: **state 4 must be caught before any request leaves the browser**, so
   a typo costs nothing and cannot be mistaken for state 6.
4. **`src/lib/moxfield/url.test.ts`** — valid deck URLs with and without a trailing slash, query
   string, or `www.`; a Moxfield URL that is not a deck; a non-Moxfield URL; a bare string.
5. **`src/lib/moxfield/fetch.ts`** — `fetchMoxfieldDeck(publicId)` returning a discriminated union
   `{ ok: true; text } | { ok: false; reason: "private" | "notFound" | "unreachable" }`, mapped from
   the spike's real status codes. A timeout via `AbortSignal.timeout` maps to `unreachable`, the one
   retryable failure. **Never throw** — the caller renders copy per reason, and an exception would
   collapse three distinct states into one generic error.
6. **`src/lib/moxfield/fetch.test.ts`** — mock `fetch`; assert each status maps to its reason, and
   that a timeout is `unreachable` and not `notFound`.
7. Normalise the response into the row shape the parser already emits, so all three entry modes
   converge on one pipeline before PR 2's code sees them.

---

## PR 4 — Import entry surface: states 1–10

First UI PR. Gates 2, 3 and 4 apply.

1. **`src/app/decks/import/page.tsx`** — the new route. Nothing exists here today.
2. **`src/components/decks/import-entry.tsx`** — mode chip row (link first), three inputs, seven
   failure blocks, two waiting phases. `src/components/collection/upload-entry.tsx` is the shape to
   copy for the file and paste modes, **minus the preview return** — there is no review gate here.
   The chip row is `chip-row.tsx` geometry, single-select, **no dismiss ✕**; the paste box and
   dropzone are `UploadEntry`'s verbatim.
3. **The two waiting states are drawn differently on purpose** (decision 2). State 2 is a real
   third-party round-trip and state 3 is a local parse; collapsing them into one spinner loses the
   distinction the handoff spends a decision on.
4. **One container, seven pieces of copy, retry exactly once** (decision 3) — retry renders only on
   state 7.
5. **`src/lib/copy/deck-import.ts`** — from `deck-import · copy strings.ts` in the handoff, verbatim.
   Follow the module shape of `src/lib/copy/decks-builder.ts`. Note `noneMatched.body` and
   `.bodyMobile` are **functions taking a line count**, not strings.
6. **Gate 2 (forced-state runtime).** All ten states driven in a browser, not reasoned about:
   throttle for the waiting states, mocked 403/404/500 for 5/6/7, an oversized file for 8, a page of
   prose for 9, an empty file for 10. Record what was forced and what appeared in the PR body.
   "Renders in the happy path" is not this gate.
7. **Gate 3 (sibling sweep).** Grep every user-facing string this PR adds against the collection
   upload surface — the two flows now describe the same operations and must not describe them in two
   voices. Check CLAUDE.md's locked vocabulary while there.
8. Mobile and desktop parity in this PR. Every field 16px on mobile; touch targets clear 44px.

---

## PR 5 — Commander selection: states 11–12

1. **A `variant` on `CreatePicker`** (`create-picker.tsx`), not a new `import-commander.tsx`. The
   row, sidebar and footer are identical; only the source list and the pre-filled name differ, and a
   second component is a second thing to keep in sync. The handoff specifies the row "verbatim".
2. **Each candidate row carries its `line N`** (decision 4) so a player with two similar legends can
   tell them apart. This is why PR 2 returns `sourceLine` on `legendaryCandidates`.
3. **The picker renders only when the source does not declare a commander.** When it does, use it and
   say nothing — a confirmation step for a fact we already have is friction.
4. **State 12 is a dead end and must read as one.** An import with no legendary creature cannot
   complete as a Commander deck; say so plainly and offer the way back. Do **not** create a
   commander-less deck — `decks.commanderOracleId` is `notNull` (`schema.ts:129`), so this is a
   schema constraint, not only a product choice.
5. Tests: a source declaring a commander skips the picker entirely; a source with three legendary
   creatures lists exactly those three with their line numbers; a source with none reaches state 12
   and creates nothing.

---

## PR 6 — Counts, and the unresolved group

Everything that can land against the builder as it stands. Also ships the deck-card badge.

1. **`src/lib/decks/grouping.ts`** — `deckCounts(cards, unresolvedCount = 0)` returns
   `total: built + unresolvedCount` alongside the existing three.
2. **`src/lib/decks/read.test.ts:225-244`** — update the two exhaustive `toEqual` assertions at
   `:240` and `:244` to include `total`, and add: with unresolved rows `total` rises while `built`,
   `ownedCount` and `toBuyCount` **do not move**; a deck of only unresolved rows reports `built: 0`
   with a non-zero `total`.
3. **`src/lib/decks/status.ts`** — add `unresolvedCount?: number` to `statusPill`'s argument object;
   return `Playable` rather than `Complete` while it is non-zero. Keep this file free of any db
   import — its header comment explains why, and a client component value-imports it.
4. **`src/lib/decks/status.test.ts`** — 99 built / 99 owned / 0 unresolved → `Complete`; 99 / 99 / **1
   unresolved** → `Playable`; existing cases unchanged.
5. **`src/lib/decks/celebration.ts`** — add `arrivedFromImport: boolean` to `shouldCelebrate`'s
   argument object; return `false` when true. This is the ruling of 2026-08-04: a clean 99-line
   import must not spend the one-shot kaiju moment on a deck the player never built; the reveal fires
   the first time they add a card themselves. **`celebration.test.ts` is the whole record of that
   ruling** — name the test so.
6. **A sibling `UnresolvedGroup` component, not a variant on `DecklistGroup`.** The handoff leaves it
   open; a plan is where it gets decided. The row component, the count colour (`--warning` not
   `--fg-faint`), the desktop right note, the Shopping-filter behaviour and the sort key all differ —
   that is most of the component. Extract the **shared header** and let both use it; don't thread a
   flag through the group.
7. **`DecklistRow` must not grow a variant flag.** It carries `oracleId` throughout and an unresolved
   row has none, so the flag would make a non-nullable field nullable at every existing call site.
8. Unresolved rows sort by `sourceLine`, render `line 41 of the import`, and the group is **pinned
   last** and labelled `Couldn't identify`.
9. **The Shopping filter hides the group entirely.** `src/components/decks/decklist.tsx:34` is the
   site. Unresolved rows are outside `toBuyCount`, so a shopping view listing them shows something
   you cannot buy. This is a one-line change and a shipped bug if it is skipped.
10. **The role/coverage strip gains no cell and no asterisk** (§C). Add an explicit test that
    `role-counter-strip.tsx` output is unchanged by unresolved rows, so PR 7's rewiring can't
    quietly introduce a sixth column that can never be filled.
11. Wire `total` and `unresolvedCount` through **both** the server list and `useOptimisticDeckCards`
    (`optimistic-deck.tsx:24`). Sending it through only one is exactly the disagreement
    `deckCounts`'s comment warns about.
12. **`src/components/decks/deck-card.tsx` — the unresolved-row badge** (ruled 2026-08-05). A count
    marker below the counts line on `/decks`, so a deck that imported short carries a signal
    *outside* the builder. `listDecksWithStats` (`read.ts`) must return `unresolvedCount` for it.
    **No new `statusPill` value** — the badge is additive and the status vocabulary is unchanged,
    because threading a new status through both the server list and the optimistic client list
    multiplies the surfaces that can disagree mid-mutation. It clears when the last row is resolved
    or deleted. Test: a deck with unresolved rows renders the badge; one without renders nothing.
13. **The `Import a deck` entry point on `/decks`** — this is the PR that makes the vertical live.
    `/decks/import` shipped unlinked in PR 4 by design; PR 6 is the first point at which the flow is
    coherent end-to-end (route + commander picker + a builder that can render an unresolved row).
    Placement alongside `NewDeckButton` (`src/app/decks/page.tsx:105-113`), which has separate
    mobile and desktop mounts — both need it. See the briefing's launch-gating section.

---

## PR 7 — Arrival chrome: states 13–14

1. **Arrival strip (state 13)** — full-width band below the spine: `--surface-rail`, `1px --border`
   bottom, `✓` in `--success`, dismiss ✕ in `--fg-faint`. **Dismissal persists per deck and the strip
   is gone on the next visit either way.** Key the dismissal to the deck ID, which dies with the deck
   — see the Gate 5 repeat pass.
2. **Unresolved banner (state 14)** — the replace flow's warning banner unmodified, sitting **above
   #158's coverage strip and tab pair**, with the count in the sentence and the extra clause *they
   aren't counted in the mix or in either tab below*. It disappears at zero.
3. **The banner's `Take a look →` jump** — `GhostButton` on the right at desktop, brass text link
   under the sentence on mobile. It scrolls to the pinned group.
4. **The spine is untouched.** No extra figure, no second bar, no "97 + 2". The deck's number is
   what's built; the exception lives in prose.
5. Pass `arrivedFromImport` into the celebration check in `builder-shell.tsx`.
6. **Gate 5 trigger** — the journey is reachable end-to-end here. Run all four passes and commit
   `docs/superpowers/journey-lifecycle-deck-import.md`. The **repeat** pass matters most: import →
   delete the deck → import the same list again, and confirm both the celebration flag and the
   arrival-strip dismissal are keyed to something that dies with the deck rather than to the list's
   contents. A dismissal keyed to the wrong thing is the #70 nudge bug in a new costume.
7. **Mid-run cold-eyes review fires here.** Capture the reel, dispatch the starved critic, fix
   everything valid in this run, and re-read PRs 8–9's scope against the findings before building
   them.

---

## PR 8 — Resolution: states 15–19

1. **A row-scoped instance of `quick-add-bar`'s combobox inside the row's inline expander** — not a
   `variant` on the mounted bar, and not a dialog. Props the bar does not have: `seed` (the failed
   name string), `ownedOnly={false}`, `identityFilter={false}`, and an `onPick` that resolves the row
   rather than adding a card. One construct at both widths: the same container, full width in the
   deck column on mobile. No sheet, no grabber.
2. **Owned-only is *overridden* off, not inherited, and the override is captioned.** Matching runs
   against Scryfall, not the collection, so a card the player doesn't own is a perfectly good
   resolution — inheriting the global `true` default would hide the right answer and produce a
   silent-empty-results bug. The caption is what stops it reading as a malfunction.
3. **The override is per row, resetting on collapse** (gap 10). Persisting it across rows is the
   hidden state that causes the bug in the first place. The cost is a flip per row; take it.
4. `builder-shell.tsx` unmounts the global quick-add bar on mobile while `expandedRowId !== null`, so
   there is never a second combobox competing for the same screen.
5. Resolve and delete both go through `use-deck-mutation` and `useOptimisticDeckCards`, so built
   97 → 98, the `Your deck` tab, the group 2 → 1, the role cell and the Consider tile's `✓ In deck`
   flip all move in the click's frame. **Clear the optimistic override on the server value changing,
   not on mutation success**, or the override drops before the new HTML lands and flashes the old
   state.
6. **Both report into one polite live region under the group** (decision 6). Two live regions across
   the whole flow, no more.
7. **Undo persists until the next action on the group** (gap 4) — the drawn behaviour, made explicit
   here because nothing in the spec pins it.
8. **State 17 gets the panel's own no-results treatment, not `NoResults`.** The crab mark belongs to
   browsing a collection you own. This state is reachable whenever the failed string resembles no
   card — the common case for a typo — so it is a real state, not an empty div.
9. **Gap 9 is accepted, not fixed.** Consider can suggest the card an unresolved row was meant to be
   — dedupe is by oracle ID and the row has none — so accepting it gives the deck the card *and*
   leaves the line. Visible rather than silent, and resolving or deleting clears it. Add a test
   asserting the state is reachable and self-clearing, so it stays a known behaviour rather than
   arriving later as a bug report.

---

## PR 9 — Polish (reserved, unscoped)

Per epic-run, the last PR of every epic is a reserved polish slot. The cold-eyes review in PR 7
shrinks the subjective findings; it does not eliminate them. A reserved slot means they land in one
branch instead of spawning cleanup PRs after the run has closed.

Likely occupants: the **#59 richness collision** (gap 7 — row plate fill, group header rule, the
`buy` tag geometry the `unmatched` tag reuses, the banner's `--elevated-hover`), and the
**design-table rows** gap 5 flags as missing for the unresolved row, group header, mode chip row,
failure banner and resolution expander. Gap 8 (no canvas tweaks shipped) and gap 11 (owned-default,
closed 2026-08-04) need nothing.

---

## Gate artifacts

| Gate | Fires | Artifact |
|---|---|---|
| 1 State reachability | after PR 3, before PR 4 for states 1–10; again after PR 6 for 11–19 | `docs/superpowers/state-coverage-deck-import.md`, written in two passes |
| 2 Forced-state runtime | PRs 4, 5, 6, 7, 8 | in the PR body: what was forced, what appeared |
| 3 Sibling duplicate sweep | PRs 4, 6, 7, 8 | in the PR body |
| 4 Design-review both halves | Agent 1 before PR 4 | `docs/superpowers/design-tables/deck-import.md`, passed into every build subagent |
| 5 Journey lifecycle | PR 7 | `docs/superpowers/journey-lifecycle-deck-import.md` |
| 6 Side-effect provenance | — | not applicable; import creates records only in direct response to a user action, with no background trigger. Stated rather than skipped. |

Gate 1 runs in **two passes** on purpose — a single pass before PR 4 would fill most of its 19 rows
with speculation about components that don't exist yet, which is an attestation wearing a table's
clothes. Pass one covers the entry states, pass two the deck-page states. Both must answer the
runtime question, not only the type question: *given how this component is mounted and seeded, can
this condition ever be true?* States 9, 10, 12 and 17 each need a row proving reachability, not
merely handling.

## Before epic-run starts

This plan is not sufficient on its own. epic-run's preconditions also require a briefing, which now
exists at `docs/superpowers/plans/2026-08-05-deck-import-briefing.md`. It answers the three premise
questions — launch gating (unlinked until PR 6); off-happy-path homes (a deck with unresolved rows
lives on `/decks` with a count badge on its `DeckCard`); and the three numbered journey walk scripts
that drive Gate 5. **All of epic-run's preconditions are met as of 2026-08-05.**

## Out of scope

- **Per-deck printing overrides** (#151) — split out of #42 at the 2026-08-02 workshop.
  `card_art_preferences` is keyed `(user_id, oracle_id)` and `deck_cards` holds no printing column.
- **Two-way sync with Moxfield.** Re-import creates a second deck, deliberately.
