## No-collection entry, PR 4: the ways in and the lock (2026-10-15)

Handoff: `design/design_handoff_the99_no_collection_entry/`: `R2 - FirstRun-Desktop.dc.html`, `R2 - FirstRun-Phone.dc.html`,
`R1 - Empty-Desktop.dc.html`, `R1 - Empty-Phone.dc.html`, `STATES-no-collection-entry.md` S1, S12 (Home), S13, S15,
S16 and §The lock, the README's calls 1, 2, 6 and 7, and `design-tables/no-collection-entry.md`. Plan
`docs/superpowers/plans/2026-10-15-no-collection-entry.md`, PR 4. Everything here is drawn only when
`NO_COLLECTION_ENTRY_ENABLED` resolves on (it needs `COLLECTION_EDIT_ENABLED`); off, every surface is as shipped.

Enumerated from the handoff first, then each row verified against the code. ✓ matches; ≈ matches with the deviation
named.

### The ways group (`WaysGroup`, one component)

| # | Property | Handoff | Built | |
|---|---|---|---|---|
| 1 | Where | step 1, under the upload's two buttons; the empty Collection, under its Upload tile | `first-run-step-one.tsx` through ReplaceFlow's `ways` slot; `collection-empty-doors.tsx` | ✓ |
| 2 | Order | Precons I own, Import a deck, Add cards (by hand) | as drawn | ✓ |
| 3 | Group | `role="group"` named by its kicker | `role="group"`, `aria-labelledby` the kicker | ✓ |
| 4 | Kicker | mono 9.5, .14em, `--fg-faint`, uppercase | as drawn | ✓ |
| 5 | Rule | step 1: 1px `--border` above, 12px; empty Collection: none, 16px | `border-t` on `step1` only | ✓ |
| 6 | Desktop | three columns, label 13/600 `--fg` + faint `›`, sub 12 `--fg-muted`, 44px, press 10px past the text | `sm:grid-cols-3`, `sm:-ml-[10px] sm:px-[10px]` | ✓ |
| 7 | Phone | three 44px rows, hairline between, label and `›` only | `min-h-[44px]`, `border-b-[1px]` `--border`, sub `hidden sm:block` | ≈ the board's hairline is a step lighter than `--border`; no lighter token exists and the handoff adds none |
| 8 | Subs | step 1 the full forms; the empty Collection the short forms | `surface` picks them | ✓ |
| 9 | No fill, no border | text presses; upload stays the only fill | `bg-transparent`, no border at `sm` | ✓ |
| 10 | Hover / focus | `--surface-sunken`; 2px `--accent` ring | as drawn | ✓ |
| 11 | Precons off (S15) | the row absent, the other two keep their columns | absent; `sm:grid-cols-2` | ✓ |
| 12 | Press targets | Precons I own: the pick; Import a deck: `/decks/import`; Add cards: the shipped `AddCardsSheet` | `?pick=own` (and `&from=collection` from the empty Collection, for its `‹ Collection`), `/decks/import`, the sheet | ✓ |
| 13 | Step 1's button row | `Add cards by hand` leaves it | the row is Upload a CSV and Paste a list | ✓ |
| 14 | Phone body | the shipped short body | `step1BodyShort` with the group | ✓ |
| 15 | Paste panel | not drawn | the group leaves with the button row while the panel is open | ≈ engineering call |

### The empty Collection (S13)

| # | Property | Handoff | Built | |
|---|---|---|---|---|
| 16 | Doors | one Upload tile, 540 wide on desktop, the shipped 64px row on the phone | the shipped tile in a `md:max-w-[540px]` column | ✓ |
| 17 | Body | `Bring a file over, or start another way.` as its second clause | `collectionEditCopy.ways.emptyBody` | ✓ |

### The lock (call 6)

| # | Property | Handoff | Built | |
|---|---|---|---|---|
| 18 | Collection | open at zero cards | `lockedItems` drops it when the shell passes `openLock` | ✓ |
| 19 | Well | Commanders, Discover, Decks; Collection outside it | as drawn | ✓ |
| 20 | Phone bracket | over tabs 3 to 5 | `ml-[40%]` (two slots) | ✓ |
| 21 | Note | names the other two | `nameList` over the three | ✓ |
| 22 | Note button | first run `Go to step 1`; elsewhere `Add your cards` to `/collection` | `useNoteAction` | ✓ |
| 23 | With a deck | the note adds `Your decks are on Home until then.` | appended to the sentence, so the slot's description carries it | ✓ |
| 24 | Go to step 1 off Home | (not drawn) | goes to `/`, where step 1 is, rather than the replace page | ≈ engineering call (the plan's fallback fix) |
| 25 | Page line | `Commanders, Discover and Decks open once your cards are in.` | first run and Home with decks, desktop only | ✓ |
| 26 | Edit off (S16) | the shipped four-slot lock | the line's switch needs editing, so `openLock` is null | ✓ |

### Home with a deck and no cards (S12)

| # | Property | Handoff | Built | |
|---|---|---|---|---|
| 27 | Kicker | `0 cards · 1 deck` | `refreshCopy.home.kickerNoCards` | ✓ |
| 28 | Header | `Add your cards` the one fill, in place of Update collection and New deck | a `PrimaryButton` to `/collection` | ✓ |
| 29 | Ready to build | absent, not empty | it already leaves when nothing is ranked | ✓ |
| 30 | Commitments | not drawn | kept as shipped | ≈ the board draws the resume row only; the card is unchanged |

### The rankers' empty states (Open 7)

| # | Property | Handoff | Built | |
|---|---|---|---|---|
| 31 | Title | `Nothing to rank yet` on both | `commandersCopy.noCards.on`, `discoveryCopy.noCards.on` | ✓ |
| 32 | Button | `Add your cards` to `/collection` | `NoCardsEmpty`, one component | ✓ |
| 33 | Switch off | the shipped words | the `off` keys, to `/collection` as shipped | ≈ the board's caption says `/collection/replace`; the plan keeps today's `/collection` |
