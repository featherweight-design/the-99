# Commander precons

Design brief, 2026-10-11. Asks for a Design round on Commander precons: a player can start a deck from a
Commander precon, and can browse the precons on `/decks` and open any one as a read-only decklist that says how
many of its cards they own. Hugh scoped it on 2026-10-11 and ranked it third of four new features. Nothing is
built; the data source is new. This brief says what Hugh closed, what the code does today, what the feed is and
what was measured against it, what engineering has locked, and what Design owns.

## Rulings 2026-10-11 (Hugh, closed)

Source: the priorities board, "New features scoped with Hugh 2026-10-11", item 3. They are not reopened here.

1. **Commander precons only.** The MTGJSON deck type `Commander Deck`. Other deck types in the same feed
   (Brawl, MTGO Commander, Theme Deck, Jumpstart, Secret Lair drops that are not typed Commander Deck, and the
   rest) are out.
2. **From New deck: "Start from a precon" makes a draft deck.**
3. **A browsable precon tab on `/decks`.**
4. **Each precon opens a read-only decklist, drawn like the player's own deck view, with how many of its cards
   they own.**
5. **New feed, fetched once** (the repository's rule for upstream data; see "What engineering has locked").

## What exists today

**New deck.** `/decks/new` has two doors, a pre-filled one (a valid `?commander=`) and a picker
(`src/app/decks/new/page.tsx:1`, the picker at `:73-76`). The picker is `CreatePicker`
(`src/components/decks/create-picker.tsx:124`), which already carries a second door, Help me choose
(`HelpMeChooseDoor`, `create-picker.tsx:389`, gated by `helpDoor`). "Start from a precon" would be a further
door here. The create action is `createDeck(commanderOracleId, name, selectedOracleIds, partnerOracleId,
answers)` (`src/app/decks/actions.ts:405`); it validates every id because "a server action answers any crafted
request", and skips a selected card that fails the legality pass rather than refusing the create.

**Deck import, the closest existing path.** `importDeck` (`src/app/decks/import-actions.ts:167`) takes pasted or
file text, resolves it to catalog cards (`resolveDeckListInput`, `src/lib/decks/import.ts:162`, then
`buildDeckImport`, `import.ts:303`), picks a commander (a declared one needs no pick, a missing one runs a
picker, states 11 to 12) and writes the deck. Its result carries unresolved rows, notes, and printing counts
(`import-actions.ts:70-90`). A precon needs none of the text resolving: the feed gives each card's oracle id.
What it can reuse is the write half and the arrival strip.

**The deck view.** A deck's list is drawn by `DecklistGroup`
(`src/components/decks/decklist-group.tsx:48`) over `DeckDetailCard` rows (`src/lib/decks/grouping.ts:14`), one
group per card type, each row carrying owned state, availability and price. The read-only precon list should
mirror this, with the rows' editing affordances absent (Design's call, below).

**`/decks` has no tab structure.** Its controls are shelves (folders): `shelf-line`, `shelf-menu`, `shelf-sheet`
in `src/components/decks/`, and the page is `src/app/decks/page.tsx` rendering `DecksView`
(`src/components/decks/decks-view.tsx`). A shelf is navigation, not a filter. The shopping-cart brief
(`2026-10-11-all-decks-shopping-cart.md`) also adds a surface to `/decks`; the two have to share the page.

**Upstream data is fetched once.** `pnpm catalog:fetch <dir>` (`scripts/catalog-fetch.ts`) downloads every source
into a directory with a manifest recording each file's URL, byte length and sha256 and the source's `updated_at`
(`catalog-fetch.ts:25-60`); `FETCH_SOURCES` names the files (`src/lib/catalog/fetch-dir.ts:16-21`). Each read has
one seam that reads the fetched file when `CATALOG_FETCH_DIR` is set and the network otherwise
(`fetchManapoolSingles`, `src/lib/manapool/client.ts:33-45`). The `Catalog refresh` workflow fetches once, verifies
the artifact, ingests staging and production from the same bytes, and records what it ingested
(`.github/workflows/catalog-refresh.yml`, steps "Fetch the catalog", "Verify the artifact", "Record what was
ingested"). Ingests hold the `catalog-ingest` lock (`src/lib/catalog/ingest-lock.ts`).

**Contract checks.** `check:scryfall` and `check:manapool` (`scripts/check-scryfall-contract.ts`,
`scripts/check-manapool-contract.ts`) touch no database, fetch the live feed, assert its shape and a real parse,
and run daily in the `Upstream contract checks` workflow so a shape change is known before the ingest that would
fail on it.

## The feed

MTGJSON v5, `https://mtgjson.com/api/v5/`. Checked 2026-10-11.

- **Index.** `DeckList.json` is 646,632 bytes: 3,112 decks of 30-odd types, each `{ code, fileName, name,
  releaseDate, source, type }`, under `meta: { date, version }` (`2026-10-11`, `5.3.0+20261011`).
- **Filter.** `type === "Commander Deck"` gives **197 decks**. Three neighbouring types contain "Commander" or
  "Brawl" and are out by ruling 1: `MTGO Commander Deck`, `Brawl Deck`, `Historic Brawl Precon Deck`.
- **Deck files.** `https://mtgjson.com/api/v5/decks/{fileName}.json`, one per deck. The 197 total 100 MB raw and
  about 31 MB gzipped (a deck averages about 510 KB raw and 157 KB gzipped, because every card carries its full printed data;
  the newest, Multiverse Reforged, is 537 KB and 167 KB).
  The single archive `AllDeckFiles.tar.gz` is 261 MB and holds every deck type, so it is the wrong download.
- **Cadence.** Rebuilt daily (`last-modified` 06:10 UTC on 2026-10-11, `cache-control: max-age=57600`). The
  Commander set itself changes only when a product is released: 24 in 2026 so far, the newest on 2026-10-02
  (five `FDC` decks and `Multiverse Reforged`, `FRC`).
- **Licence.** MIT, "Copyright (c) 2018 - Present, Zach Halpern", with the notice to be kept in copies
  ([mtgjson.com/license](https://mtgjson.com/license/)). The page does not address Wizards of the Coast's rights
  in the card content, and this brief does not claim to.
- **A deck's shape.** `data` holds `code`, `name`, `releaseDate`, `type`, `commander[]`, `mainBoard[]`,
  `sideBoard[]`, `tokens[]`, `sourceSetCodes`, `sealedProductUuids`. Every card entry has `count`, `uuid`, `name`,
  `setCode`, `number`, `isFoil`, `finishes`, and `identifiers` with `scryfallId` (the printing) and
  `scryfallOracleId` (the card). All 197 decks are exactly 100 cards (commander plus main board). The side board
  is empty on every one (0 copies across all 197).

## What was measured

Against **staging**, read-only, 2026-10-11 (the branch reports `br-polished-pond-a6e63y0b`).

- **Mapping.** The 197 decks hold 17,156 card entries, 19,700 copies. They name **14,335 distinct printings and
  6,406 distinct oracle ids. All 14,335 are in `printings` (by `scryfall_id`) and all 6,406 are in `cards`:
  zero fail to map.** Every entry has a `scryfallId`. Mapping needs no name matching, which is the failure the
  deck import has to defend against. A precon printed after the last catalog refresh would be the one miss.
- **Duplicates.** 197 listed decks hold **185 distinct contents**: 12 are Collector's Edition twins with the
  same 100 cards as the plain edition (`Forces of the Imperium` and `Forces of the Imperium Collector's
  Edition`, and so on; `40K`, `M3C`, `MSC` have them). Names also repeat across sets (`Evasive Maneuvers`,
  `Built From Scratch`, `Plunder the Graves`, `Breed Lethality` and others), so a name is not a key; `fileName`
  is.
- **Partners.** 5 decks list more than one commander entry.
- **Basics.** 3,790 of the 19,700 copies are basic lands; 121 token entries ride along (tokens are a separate
  ruling, "Tokens for my deck", and are not part of this feature).
- **By year.** 2011 and 2013 to 2016: 5 a year (none in 2012); 2017, 2018: 8; 2019: 4; 2020: 9; 2021: 15; 2022: 29; 2023: 27; 2024: 30;
  2025: 18; 2026: 24.

### Hugh's ownership (account `user_3GkZrrTwOJBdqUpq6GambP0BC8w`, 2,926 distinct cards owned)

Owned means a row in `collection_items` for the card's oracle id, any printing, the same notion as the rest of
the app. The figures below exclude basic lands, so "of 85" counts the 85 distinct non-basic cards.

| Precon | Owned | Why it matters |
|---|---|---|
| Counter Intelligence (`EOC`) | 91 of 91 | A precon he has fully, and the deck he built from it, HD Tune - Counter Intelligence. |
| Scrappy Survivors (`PIP`) | 88 of 88 | Fully owned. |
| Prismari Artistry (`SOC`) | 85 of 85 | Fully owned. |
| Sultai Arisen (`TDC`) | 85 of 85 | Fully owned. |
| Blood Rites (`LCC`) | 79 of 79 | Fully owned. |
| Mutant Menace (`PIP`) | 83 of 85 | Almost; two missing. |
| Eldrazi Unbound (`CMM`) | 74 of 85 | The partial case, 87 percent. |
| Multiverse Reforged (`FRC`, 2026-10-02) | 36 of 89 | A recent precon; 40 percent. |
| Keen Engineering (`FDC`, 2026-10-02) | 31 of 66 | The highest of the five new Foundations decks (47 percent). |
| Wretched Ranks (`FDC`, 2026-10-02) | 18 of 67 | The lowest (27 percent); commander Ghoulcaller Gisa, whom he plays. |
| Avengers Assemble (`MSC`, 2026-06-26) | 30 of 84 | Has a Collector's Edition twin with the same 30 of 84. |

Across all 197: owned share of the non-basic cards runs from 16 percent to 100 percent, median 32, 90th
percentile 45; **five precons are 100 percent owned**; none is at zero. Six of his 21 decks (the HD Tune decks) are named for a precon he owns almost entirely: Counter Intelligence,
Blood Rites, Mutant Menace, Prismari Artistry, Scrappy Survivors and Sultai Arisen. The list can show him that a
precon is one he has already built a deck from.

## Prior art

- **EDHREC** gives each precon its own page showing "the full list, possible upgrades and even a few options
  for where you can pick them up" ([budget precons article](https://edhrec.com/articles/the-best-commander-precons-you-can-buy-on-a-budget),
  which links each deck to its page). Its precon coverage is editorial (articles tagged precons, a Precon
  Upgrade Guide, [tag page](https://edhrec.com/articles/tag/precons)); no browsable precon index turned up
  (`/precons` returns 404), and nothing shows how much of a precon a reader already owns.
- **Moxfield and Archidekt** host precon decklists as ordinary user decks, linked from sellers and wikis (a
  Moxfield decklist for a Commander precon, an Archidekt page "with the detailed decklist of printings,
  editions, foils" found via search). No dedicated precon browse page was found for either, and this brief
  claims only that a search found none; Moxfield blocked a direct fetch.
- **MTGJSON** is the standard machine-readable source, used here because it carries the Scryfall ids.

What this means for the round: the per-precon page (list, upgrades, where to buy) is established; a browsable
index and an ownership count against the reader's own collection are not. Both are what Hugh asked for.

## What engineering has locked

1. **Fetched once, ingested into both databases from the same bytes**, through `catalog:fetch` and its manifest,
   after MTGJSON's 06:10 UTC build and before the daily 09:00 UTC refresh. A new source is added to
   `FETCH_SOURCES` and read through one seam, as `fetchManapoolSingles` is. The deck files are many, so the fetch
   writes them as one file. Whether that file is the raw bytes (about 100 MB, hash-checkable against upstream) or
   a reduced file (the fields below, a few MB, hash of our own output) is an engineering call made in the plan.
2. **The data kept is small.** 197 deck rows (`fileName`, `name`, `code`, `releaseDate`, the commander ids) and
   17,156 card rows (deck, oracle id, printing id, count, whether it is a commander). Tokens and the other
   per-card fields are not kept.
3. **Cards map by `scryfallOracleId` and `scryfallId`, never by name.** A card that fails to map is dropped
   from the deck and counted; on the current feed that count is zero, and a nonzero count is shown to the player
   as a precon with a missing card, never hidden.
4. **A contract check, `check:mtgjson`**, like `check:scryfall`: no database, fetch `DeckList.json` and the newest
   Commander deck, assert the index shape, `type`, and that a deck's cards carry `scryfallId` and
   `scryfallOracleId` and total 100, and run daily in `Upstream contract checks`.
5. **The ingest holds the `catalog-ingest` lock** and replaces the precon tables in one transaction, as the
   other ingests do, and is copied to production under the same rules.
6. **"Owned" is the app's one notion**: a `collection_items` row for the oracle id, any printing. The count is
   computed from the reader's collection when the page is read; it is not stored.
7. **A draft deck, not a commit.** "Start from a precon" creates a deck the same way a draft is created today
   (commander chosen, the 99 added), not a committed version. The player's own copies, claims and the I got it
   flow behave exactly as they do for any draft.
8. **MTGJSON's licence notice is kept** where the data is credited (the About page's data credits).
9. **Off until Hugh walks it.** Ships behind its own switch, off in production, as every feature here does.

## What Design owns

- **The door on New deck.** How "Start from a precon" sits beside Help me choose and the commander picker, what
  it says, and where it takes the player (the browsable list, or straight to a pick).
- **The precon tab on `/decks`.** `/decks` has no tabs today, only shelves. Whether the precon surface is a
  true tab, a segment above the shelves, or a separate page the shelf line links to, and how it coexists with
  the shopping cart surface, is Design's. Shelves are navigation and not filters.
- **The list.** 185 distinct decks across 15 years on a phone and at 900. Order (newest first is the data's
  natural order), grouping (by year, by set), a search or color filter if any, and how a row reads: precon name,
  commander (five have more than one), colors, release, and the owned count.
- **The Collector's Edition twins.** 12 pairs share a decklist. Show both, show one, or show one with a note.
- **The read-only decklist.** Drawn like the player's own deck view (`DecklistGroup`), with the editing
  affordances absent: no add, remove, lock, claim, price pick or I got it. What stays (card details on press,
  groups by type, the owned mark on each row) and what the header says.
- **How many they own.** The figure and where it lives: on the row, in the drawer's header, per group. Whether
  basics count (the figures above exclude them; a precon of 100 cards with 17 Plains reads differently with
  them in).
- **The primary action.** On the open precon: "Start a deck from this" and what happens next. What the draft
  deck is named, and how the arrival reads.
- **Empty and thin states.** A precon with one or more cards that did not map; a collection that is empty; a
  precon already started as a deck (Hugh has six); the feed unavailable; no precon matching a filter.
- **Copy.** Every string goes through `/copy-review`.

## Open questions

1. **Which twin is the precon?** Collector's Edition decks have the same list as the plain one (12 pairs).
2. **Does the precon list say which ones the player has already built a deck from?** The data supports it
   (the deck's commander and most of its cards match), and Hugh has six. It is a comparison, not a stored link.
3. **Is the precon's printing kept?** The feed names the exact printing of every card. The read-only list can
   draw the precon's art. When the player starts a deck, the deck picks printings by what they hold
   (`deck printings`); whether the draft deck carries the precon's printings or none is a product call.
4. **Do basics count toward "how many they own"?** Without them the figure is the real cards (about 80 of
   100); with them it is 100 for anyone who owns basics.
5. **Does ownership shape the list order?** Newest first, or "most of this you own" first, or the player's
   choice. The owned share ranges from 16 to 100 percent.
6. **Start from the precon, or a part of it?** Ruling 2 says a draft deck. Whether the player can leave cards
   out on the way (the ones they do not own) is not ruled.

## Fixtures

All on staging, read-only, figures as of 2026-10-11. Account `user_3GkZrrTwOJBdqUpq6GambP0BC8w`.

| Case | Precon | Figure |
|---|---|---|
| Fully owned, already built | Counter Intelligence (`EOC`), Prismari Artistry (`SOC`), Sultai Arisen (`TDC`) | 91 of 91, 85 of 85, 85 of 85 |
| Almost | Mutant Menace (`PIP`) | 83 of 85 |
| Partial | Eldrazi Unbound (`CMM`) | 74 of 85 |
| Newest, mostly unowned | Multiverse Reforged (`FRC`), 2026-10-02 | 36 of 89 |
| Lowest of the five newest | Wretched Ranks (`FDC`) | 18 of 67 |
| A Collector's Edition twin | Avengers Assemble and its Collector's Edition (`MSC`) | 30 of 84, both |
| A multi-commander precon | one of the five with more than one commander entry | |
| An empty collection | any account with no cards | 0 of N |

Counts drift with the collection and the daily feed; Design may treat them as illustrative if the arithmetic
stays consistent across frames.

## The About entry owed

A new feature owes an About entry in the round that ships it, and an `ABOUT_VERSION` bump (`AGENTS.md`, About
entries): "Start from a precon" and the precon tab. Design draws it on the per-entry artboard in
`design/design_handoff_the99_about/`. The entry also credits the data (MTGJSON, MIT).

## Paths

- Feed and fetch: `scripts/catalog-fetch.ts`, `src/lib/catalog/fetch-dir.ts`, `src/lib/manapool/client.ts`
  (the seam to copy), `scripts/check-manapool-contract.ts` and `scripts/check-scryfall-contract.ts` (the check to
  copy), `.github/workflows/catalog-refresh.yml`, `src/lib/catalog/ingest-lock.ts`.
- New deck: `src/app/decks/new/page.tsx`, `src/components/decks/create-picker.tsx`,
  `src/app/decks/actions.ts` (`createDeck`).
- Import: `src/app/decks/import-actions.ts`, `src/lib/decks/import.ts`, `src/lib/decks/import-printings.ts`.
- Deck view: `src/components/decks/decklist-group.tsx`, `src/lib/decks/grouping.ts`.
- `/decks`: `src/app/decks/page.tsx`, `src/components/decks/decks-view.tsx`, the shelf components.
- The neighbouring brief for the same page: `docs/superpowers/design-briefs/2026-10-11-all-decks-shopping-cart.md`.

## Deliverable

A handoff in `design/design_handoff_the99_precons/` with frames at 900 and 390 for: the New deck door; the precon
list on `/decks` (default, filtered or searched if drawn, empty, feed unavailable); the open read-only decklist
on a fully owned, a partial and a mostly unowned precon; the start-a-deck action and its arrival; the
Collector's Edition and multi-commander cases; the `STATES` rows and design-table sections they add; and the
About entry on the per-entry artboard.
