# Deck notes

Design brief, 2026-10-11. Asks for a Design round on Deck notes: a short list of one-line notes on each deck,
dated automatically, that the player can tick done, edit and delete, and that can tag cards. Chris asked for it;
Hugh scoped it on 2026-10-11 and ranked it fourth of four new features. Nothing is built. This brief says what
Hugh closed, what the code does today, the decision that notes belong to the deck and not to a version, what
engineering has locked, and what Design owns.

## Rulings 2026-10-11 (Hugh, closed)

Source: the priorities board, "New features scoped with Hugh 2026-10-11", item 4. They are not reopened here.

1. **Per deck, one-line notes, auto-dated.** The player does not type a date.
2. **Tick done.** Done notes collapse under **`Done (N)`**.
3. **Edit and delete.**
4. **A note can tag a card with `[[Name]]`.** Typing `[[` offers the deck's own cards first, then any card. A
   tag opens that card's details.
5. **It lives in `Your deck`, under the description.**
6. **No reminders, no due dates, no sharing.**
7. **Engineer simply.**

## What exists today

**The description is the deck's `intent`.** `decks.intent` (`src/db/schema.ts:388`, capped at 240 code points by
`decks_intent_length_check`, `schema.ts:461`) is drawn as the tagline in the deck header, second under the name
(`DeckIntentLine`, `src/components/decks/deck-intent-line.tsx`, mounted by `spine-desktop.tsx:429` and
`spine-mobile.tsx:499`). It is edited through the pencil on the deck name, name and description as one editor
(`use-deck-header-edit.ts`; H35, `design/design_handoff_the99_deck_description/STATES-deck-description.md` §2).
It sits in the header, above the tabs, so it shows on every tab. A deck with no description draws no row.

**`Your deck` is a tab.** The deck page's tabs are built by `builderTabSpecs`
(`src/lib/decks/builder-tab-specs.ts:14`): `deck` (labelled `Your deck`, `src/lib/copy/decks-builder.ts:37`),
`analysis`, `consider`, `games`, `versions`. `Your deck` is the first tab (`builder-shell.tsx:1560`
renders them). Notes "under the description" therefore means the top of the `Your deck` tab, just below the
header that carries the tagline. Where exactly is Design's (open question 1).

**The nearest existing notes are on a game, not a deck.** `deck_games.note` (`schema.ts:783`) is one free-text
note on a logged game, capped at 140 code points (`deck_games_note_length_check`, `schema.ts:786`), written by
`logGame` (`src/app/decks/actions.ts:1486`) and removed with `deleteGame` (`actions.ts:1587`). Its comment records
that the game log ships no edit action. That is the pattern the notes actions follow for ownership and refusal:
`requireUserId()` then `requireDeck(deckId, userId)`, shape-check the input ("a server action is a public
endpoint"), write, then revalidate the deck's surfaces.

**Two names to keep apart.** `decks.notes` (plural, `schema.ts:352`) is an older column that a search of `src` finds nothing reading or writing (the schema comment at `:774` names the collision). And Suggested changes has a free-text field
labelled `Additional notes` (`src/lib/copy/deck-description.ts:40`), the player's words for one run. Deck notes are
neither, and the feature should be named so it cannot be confused with them.

**A version already has a note.** `deck_versions.note` (`schema.ts:620`) is why that version was committed,
written at commit time. It is a commit message. Deck notes are a standing list on the deck.

**Card search and card details exist and are reused.**
- `searchCards(query, colorIdentity, ownedOnly, deckId?)` (`src/app/decks/[id]/search-action.ts:78`) is the Add
  panel's name search. With `colorIdentity: null` and `ownedOnly: false` it drops the colour and ownership filters,
  but it still keeps only commander-legal game cards (`cards.commanderLegal` and `isGameCardWhere()`,
  `search-action.ts:121-124`), so used unchanged it would not find a banned card. The note picker needs the same
  name matching without the legality filter (see "What engineering has locked" 2 and open question 8). It returns
  `oracleId`, `name`, type line, owned state and art. The deck's own cards need no search: the page already holds
  the list.
- `useCardDetail()` (`src/components/cards/card-detail-provider.tsx:225`) gives `open(oracleId, ...)`
  (`card-detail-provider.tsx:82`); the deck page mounts a provider that carries the deck id and the ids the deck
  holds. A tag opens details through this, as a card row does.

**Writes revalidate the deck's surfaces.** `deckSurfaces(deckId)` (`src/lib/decks/revalidate.ts:27`) is
`/decks/{id}`, `/decks` and `/`.

**The Home and `/decks` cache.** Both pages cache their payload keyed on `user_data_stamps`, which only the
`user_data_touch` trigger moves (`drizzle/0073_user_data_stamps.sql`). `pnpm check:list-cache`
(`scripts/check-list-cache.mjs`) computes the per-user tables Home and `/decks` read and fails if one has no
trigger. Notes are read by the deck page only, so they need no trigger. A note count on a deck tile would put them
on `/decks` and would need a migration adding the trigger (see "What engineering has locked").

## Notes belong to the deck, not to a version

**Decision: a note belongs to the deck.** One `deck_notes` table keyed by `deck_id` (and `user_id`), with
`on delete cascade` from `decks`, as `deck_games` is. Why:

1. **A version is a snapshot of the list.** `deck_versions` holds a commit's commanders, printings and its
   cards (`deck_version_cards`); the list the player edits is the live deck. A note is about the deck the player
   keeps: "swap in the Thassa's Oracle package", "try a second sweeper". It spans commits. Hung on a version it would
   be left behind at the next commit, which is the moment it matters.
2. **A draft has notes.** A draft deck has no version (3 of Hugh's 21 decks: Gishath, Kratos and Thorin). Notes
   have to work before the first commit, and a version-owned note would not exist yet.
3. **The description, the deck's neighbouring words, is already on the deck row** (`decks.intent`), not on a
   version. Notes sit under it for that reason.
4. **A tag is an oracle id, not a list position.** It still resolves when the card leaves the list, because the
   card exists in the catalog whether or not the deck holds it.

The cost is that restoring or comparing an old version does not "bring back" the notes the player wrote then. That
is intended; the version's own `note` already records why that commit was made.

## What engineering has locked

1. **One table, four actions.** `deck_notes`: `id`, `deck_id`, `user_id`, `body`, `done_at` (null while open),
   `created_at`, `updated_at` (null until edited). Actions: add, edit, set done or open, delete. Ownership is
   checked the way `logGame` checks it. No ordering column, no reminders, no due date, no sharing field, no
   attachment, no history of edits.
2. **A tag is stored as an oracle id the player picked, with the name it had then, never a name matched later.**
   Typing `[[` opens a picker over the deck's cards and then any card; picking one writes the card's id and its
   name at that moment into the note's text. The note draws the card's *current* catalog name, and falls back to the
   stored name when the card can no longer be found, drawn as plain text (a tag that cannot resolve). A name typed by
   hand that matches nothing stays plain text. A card removed from the deck keeps its tag. "Any card" is any game
   card, not only commander-legal ones, so a note can name a banned card to remember it; that needs a picker mode on
   the name search, which `searchCards` does not have today.
3. **Length.** One line, capped, enforced in code and by a check constraint (`char_length`), as the other
   free-text fields are. The cap is open question 2; the precedents are 140 (a game note) and 240 (the
   description).
4. **A tag opens card details** through `useCardDetail().open`, with the deck's provider, so the deck-scoped
   controls on that sheet (printings, proxy, lock) behave exactly as from a decklist row.
5. **Writes revalidate `deckSurfaces`.** Nothing else reads notes.
6. **Notes are not model input.** They go to no prompt, no fingerprint and no Suggested changes run. If a later
   feature sends them to a model they go through `playerText` (`AGENTS.md`).
7. **No trigger today.** Home and `/decks` do not read notes. A count or mark on the deck tile would put the table
   on `/decks`, `pnpm check:list-cache` would fail until a migration adds the `user_data_touch` trigger.
8. **Off until Hugh walks it.** Ships behind its own switch, off in production, as every feature here does.

## What Design owns

- **Where it sits in `Your deck`.** Under the header's description, above the decklist; open or collapsed by
  default; whether the empty state invites the first note or draws nothing.
- **The add affordance.** An input line, its placeholder, and what Enter does; how `[[` offers cards (deck cards
  first, then any card), at 900 and at 390 on a phone keyboard.
- **A note's row.** The tick, the text, the date (relative or absolute; open question 3), edit and delete, and how
  a tag reads inline (a link, a chip, a hover).
- **Tags that need a state.** A card not in the deck, a card since removed from the deck, and a tag that cannot
  resolve.
- **Done.** The `Done (N)` group: collapsed by default, how it opens, what a done note looks like, and untick.
- **Edit and delete.** In place or a sheet; delete with or without a confirm (the stakes are one line).
- **Empty, long and many.** No notes; a note at the cap; 30 notes on a phone; a done list of 40.
- **The refused write.** A save that fails, drawn with the shipped `MutationError`.
- **Copy.** Every string goes through `/copy-review`, including the feature's name (kept clear of `Additional
  notes`, the version's `note`, and the game note).

## Open questions

1. **Where in the tab?** Ruling 5 puts notes in `Your deck`, under the description, which draws in the header
   above the tabs. Within the tab: the first block, above the decklist, or beside the other panels there? Open or
   collapsed by default?
2. **How long is one line?** 140 (the game note's cap, which wraps to three lines at 390) or 240 (the
   description)? A note with two tags is longer than it looks.
3. **Newest first, or oldest first?** A to-do list reads oldest first; a log reads newest first. And whether
   `done` keeps its own date ("done 9 Oct") or only the created date shows.
4. **Does editing change the date?** Auto-dated means the creation time; whether an edit adds "edited" is
   Design's, and the schema can hold either.
5. **Is `Done (N)` also a place to delete in bulk?** Not ruled; the default is no.
6. **A cap on the number of notes per deck?** Not ruled; a cap is one constraint and a refusal state.
7. **Does a tag in a note also show on the card?** A card carries no mark that notes mention it. Out of scope
   unless Design wants it, since it would put a per-card read on the decklist.

8. **Does "any card" include a card that is not commander-legal?** The default above is yes (a banned card can
   be tagged). If not, the picker reuses `searchCards` unchanged.

## Prior art

Nothing found does exactly this.
- **Moxfield and Archidekt**: a search found no per-deck to-do or notes list for either; both have a deck
  description. This brief says only that a search found none.
- **Mochi** (flashcards) links notes with double brackets, "Typing `[[` opens a quick search box", and adds a
  backlink ([Mochi: basic formatting](https://mochi.cards/docs/markdown/basic-formatting)). It is the pattern for
  the picker, not for cards in Magic.
- **In this app:** the game log's note (`deck_games.note`) is the existing "short words attached to a deck";
  the version note is "why this commit".

## Fixtures

Staging, read-only, 2026-10-11, account `user_3GkZrrTwOJBdqUpq6GambP0BC8w`. The deck ids:

| Deck | Id | What it exercises |
|---|---|---|
| HD - Wizards | `7653dec3-bcf4-4045-8242-9000765c7601` | Two versions, no description. Holds Laboratory Maniac, Jace, Wielder of Mysteries and Counterspell, so `Try [[Laboratory Maniac]] with [[Thassa's Oracle]]` tags one card the deck holds and one it does not. |
| HD - Gishath | `904fdc61-e190-4ba5-8e34-2b18fa0584f2` | A draft with no version and no description: notes before the first commit. |
| HD - Avatar Aang | `0f585441-203e-475b-be7c-f11e67e20d79` | Two versions and a 112-character description: notes under a real tagline. |
| HD - Omnath | `dcf9a86d-f6ef-4c7c-a20c-a9807c7cdfbd` | One version and a 48-character description. |
| HD - Kratos | `2bd462de-5f94-47e5-bd29-eabea5921c75` | A draft with a 66-character description. |

Suggested note set for the frames: an open note with no tag; one with a tag on a card the deck holds; one with a
tag on a card it does not; one tag whose card has since left the deck; one at the cap; two done notes (so
`Done (2)`); a deck with none. Card names, counts and dates are real and drift; Design may treat them as
illustrative if the arithmetic stays consistent across frames.

## The About entry owed

A new feature owes an About entry in the round that ships it and an `ABOUT_VERSION` bump (`AGENTS.md`, About
entries). Design draws it on the per-entry artboard in `design/design_handoff_the99_about/`. The `[[` tag is the
part a reader will not find unless it is named.

## Paths

- Description and header: `src/db/schema.ts` (`decks.intent`), `src/components/decks/deck-intent-line.tsx`,
  `spine-desktop.tsx`, `spine-mobile.tsx`, `use-deck-header-edit.ts`,
  `design/design_handoff_the99_deck_description/`.
- Tabs: `src/lib/decks/builder-tab-specs.ts`, `src/components/decks/builder-shell.tsx`,
  `src/lib/copy/decks-builder.ts`.
- Actions to mirror: `src/app/decks/actions.ts` (`logGame`, `deleteGame`), `src/lib/decks/read.ts`
  (`requireDeck`), `src/lib/decks/revalidate.ts`.
- Card search and details: `src/app/decks/[id]/search-action.ts`, `src/components/cards/card-detail-provider.tsx`.
- Stamp and its check: `drizzle/0073_user_data_stamps.sql`, `scripts/check-list-cache.mjs`.
- The neighbouring game-log surface: `src/components/decks/games-panel.tsx`, `game-log-form.tsx`,
  `src/lib/copy/game-log.ts`.

## Deliverable

A handoff in `design/design_handoff_the99_deck_notes/` with frames at 900 and 390 for: the notes block in
`Your deck` empty and with notes; adding a note, and the `[[` picker on a deck's cards and on any card; a tag in
a note (held, not held, removed); editing and deleting; ticking done and the `Done (N)` group open and closed;
the at-cap, many-notes and refused-save states; the `STATES` rows and design-table sections they add; and the
About entry on the per-entry artboard.
