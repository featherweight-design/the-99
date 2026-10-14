# Upcoming precons, and a "New in the app" Home banner

Design brief, 2026-10-14. Asks for a Design round on two surfaces that tell a reader a Commander set is coming, or
has just arrived: an announced group on the Precons page that shows revealed commanders before any decklist exists,
and a banner on Home when the catalog first shows a new set or precon. It is the second item in the Design queue
(priorities board, "Upcoming precons + the 'New in the app' Home banner", Hugh 2026-10-14). **It is a separate
release from Precons and does not gate them**: Precons ships without it. The data half is built (#1742) and has no
caller; this brief is what a caller draws. Hugh's rulings are few (below), so this brief says what the code does
today, what staging holds, what engineering has locked, and what Design owns.

## The problem

A Commander set is public a month or more before its decks are. Staging, read-only, 2026-10-14:

| Set | Code | Releases | Printings spoiled | Distinct commander-eligible cards |
|---|---|---|---|---|
| Star Trek Commander | `trc` | 2026-11-13 (30 days) | 41 | 15 |
| Darkhold Destiny Commander | `mdc` | 2027-04-09 (177 days) | 1 | 1 |

"Commander-eligible" here is a legendary creature. No printing in either set says "can be your commander" in its
text and none is a Background or has Partner, so legendary creature is the whole count today. Star Trek's 16
legendary printings are 15 cards: Christine Chapel, Combat Medic is spoiled twice (collector numbers 78 and 300).
Darkhold's one printing is Gargantos, the Endbringer (colors B and G). All 41 + 1 printings carry the small art the
list thumbnails draw. Both sets have a parent expansion the catalog holds (`trk`, `mdd`).

The reader cannot see any of this in the app. Precons lists 197 decks, the newest released 2026-10-02, and a set
with no MTGJSON deck list yet is not a `precons` row, so it is absent. A reader who wants to know what commanders
are coming leaves for Scryfall. Separately, when the daily catalog refresh brings something new (a set, or a
precon once MTGJSON lists it) nothing in the app says so: the Precons list just has one more tile in it.

## Hugh's rulings (2026-10-13 and 2026-10-14)

1. **Show announced precons that have no decklist yet** on the Precons screen (question of 2026-10-13, ranked into
   the Design queue 2026-10-14). The data is possible: Scryfall's sets list carries upcoming Commander sets with
   release dates before MTGJSON has their lists.
2. **A Home banner for a set or precon arriving in the app**, with a per-reader seen marker "like About's seen
   state".
3. **A separate release from Precons.** Precons does not wait for it.
4. **The announced tile moved here from small polish**, so it is part of this round.

Nothing else is ruled. Everything under "Open for Design to call" is open.

## What exists today

All paths are on `main`; line numbers were read on 2026-10-14 and move.

**The Precons page** (`src/app/decks/precons/page.tsx`, behind `PRECONS_ENABLED`)
- Draws `PreconListView` (`src/components/decks/precons/precon-list-view.tsx`): a header (back link, the title
  "Commander precons", one mono sub-line with the count and first and last year), a filter chassis (search, color
  pips, order menu, tiles/rows toggle), an optional `EmptyCollectionBand`, then the list **grouped by year**
  (`groupByYear`), one `<section>` with an `<h2>` and a per-year count each.
- Tiles are the default (`PreconTile`, `precon-tile.tsx`): the commander's card art in the 63:88 box (two commanders
  stagger in one box), a caption whose meta line is "you own N of M", the precon's name, and color dots. The whole
  tile links to the precon. Rows (`precon-row.tsx`) show a small thumb, the name and the same count.
- An empty or unreadable list is `PreconsDown` ("couldn't be read"), never "there are none". The page is cached per
  reader on the data stamp and the catalog generation.
- A precon is a **MTGJSON deck**: every tile has a decklist behind it, a count of owned cards, and "Start a deck from
  it". There is no tile for something that has none of those, and the tile's whole meaning (own N of M) is undefined
  for it.

**Home** (`src/app/page.tsx` renders `Dashboard`, `src/components/home/dashboard.tsx`)
- Top to bottom: a header (kicker, title, Update collection / actions), Ready to build, the player's decks
  (`ResumeDecks`, or `HomeDecksZero`), then the commitments card. A brand-new account sees `FirstRunChecklist`
  instead.
- **Home has no notice or banner slot today.** The only thing that announces a change is the **About sheet**
  (`src/components/shell/about-sheet.tsx`): a non-modal card at the foot of a phone, opened by a document load
  after an `ABOUT_VERSION` bump, that reserves its height through `--about-sheet-h`. It is mounted by the shell, so it
  can sit over Home. The new banner and the sheet can be on screen together.

**What the data half gives a caller** (#1742, `src/lib/precons/upcoming.ts`)
- `loadUpcomingSets(userId, now)` returns the non-digital `commander` sets released after today's UTC day, soonest
  first (ties by code): `code`, `name`, `releasesOn` (`YYYY-MM-DD`), `cardCount` (what Scryfall reports for the set,
  41 and 1 now), `parentName`, `arrivedAt` (when the catalog first showed it, **null when it was already there
  before stamping began**) and `seen` (this reader has been shown it).
- `markUpcomingSeen(userId, codes)` unions codes into `user_prefs.upcoming_seen_codes`. It takes the codes the caller
  drew (at most 50), drops anything that is not a set code, and is idempotent.
- `catalog_first_seen` is written by the daily `seed-sets` and `ingestPrecons`. **The first run for a kind is a
  baseline** (everything then in the catalog is stamped `baseline`, so a fresh install announces nothing);
  arrivals after it carry a real `arrivedAt`.
- It returns **sets only**. It does not read the spoiled printings of a set, and it has no caller.

**What staging holds today, and what that means for the banner.** `catalog_first_seen` exists on staging (migration
0122) and is **empty**: the next daily refresh stamps it, and that first stamp is a baseline. So `trc` and `mdc` will
both read `arrivedAt = null` and **neither would ever raise the banner**. The banner's first real arrival is
whatever the catalog gains after that baseline. No history exists to say how often that is, so this brief does not
guess a rate; Design should draw for "rare" and for "three at once after a big announcement" (see States).

## What engineering has locked

These are decided by the built half and the repository's rules, not by Design.

1. **The seen marker is per reader**, one row of `user_prefs`, purged with the account. A set a reader has seen stays
   seen on every device. It is not a cookie and not a per-browser store.
2. **Seen is recorded when the reader is shown the thing**, by the caller, through `markUpcomingSeen`. Whether
   "shown" means the banner rendered, or the reader dismissed it, or opened the Precons page, is Design's call
   (below); the marker itself is the same either way.
3. **No model calls.** Nothing here generates a sentence about a set. Every word is the set's name, date or card
   names from the catalog, or fixed copy.
4. **Data the surfaces can draw today:** a set's code, name, release date, parent expansion name, card count, and its
   spoiled printings (name, type line, color identity, small and normal art, collector number) from `printings` and
   `cards`. **Not available:** deck names, deck lists, how many decks the set has, which commander belongs to which
   deck, prices. Those arrive from MTGJSON when the decks are listed.
5. **A spoiled printing is not a commander the catalog has legalized.** Legality of a brand-new card can lag. The
   tile may name a legendary creature as a "revealed commander"; it must not promise a deck or a legality it cannot
   know. Engineering will pick the eligibility test (legendary creature today; the plan decides how to treat
   "can be your commander" text and Backgrounds once a set has any).
6. **The announced group sits behind `PRECONS_ENABLED`** at minimum, since it lives on a page that 404s without it.
   Whether the upcoming surfaces, and the Home banner, have a switch of their own (they ship separately) is the
   plan's call; a switch that requires `PRECONS_ENABLED` is engineering's lean.
7. **Seen has no "precon" form yet.** The marker stores set codes. A newly listed precon (a `precons` row with a
   `catalog_first_seen` stamp of kind `precon`) has a file name, and one set can bring several precons; how the
   banner names and de-duplicates a precon arrival, and whether a set that was announced and then gets its decks
   counts as seen already, is for the engineering plan. Design draws the banner; it does not need to settle the key.

## Constraints

- **Mobile and desktop ship together.** 390 and desktop, in the same PR.
- **The Precons page's existing rules hold**: tiles default, filters in the URL, the year grouping, the "own N of M"
  meaning, `PreconsDown` for an unreadable list. Upcoming sets must not read as precons the reader can open,
  start from, or own cards of.
- **A date is shown as a date.** Release dates are UTC calendar days (`YYYY-MM-DD`) and "today" is the UTC day. A
  countdown that says "tomorrow" or "today" must be computed against that same day, not the reader's local one, or
  it disagrees with the list by an evening. Design draws the forms; copy goes through `/copy-review`.
- **The banner never blocks.** Not modal, no scroll lock, no focus grab (the About sheet's contract, and the reason a
  second one is acceptable beside it only if it is quiet). It has a real dismiss, and the dismiss works with the
  keyboard.
- **A failed read draws nothing.** If the upcoming read throws, the Precons list draws as it does today and Home draws
  no banner. An empty upcoming list is not an error and draws no group.
- **Screen readers.** The group has a heading; a revealed commander is named in text, not by its art alone; a banner
  is a labelled region with a real button to dismiss, and it is not announced as an alert (it is not urgent).
- **Reduced motion.** Anything that appears or leaves (a banner entering, a tile changing state) respects it.

## Open for Design to call

1. **Tile versus group.** The brief's two shapes, with a third:
   - **One tile per upcoming set** in the existing grid, in a state that cannot be mistaken for a precon: the
     set's name, the date, and a stack or strip of its revealed commanders in place of the single commander art.
   - **A group above the years**, an "Announced" section with its own heading, holding one block per upcoming set,
     each block showing that set's revealed commanders as a row of cards. More room for 15 commanders than one tile
     has, at the cost of a surface unlike anything else on the page.
   - **A tile that opens**: the tile in the grid, which opens a read-only list of the set's revealed commanders (a
     sheet, or a page in the shape of the open precon). This adds a destination; say what it holds and whether it
     has to be built for a set with one commander.
   Say which, and why, with 15 commanders (Star Trek) and 1 (Darkhold) side by side. The page must also hold
   today's quiet case: no upcoming set at all.
2. **What a revealed commander shows.** The card art (full size where it is the subject, or the small thumb), the
   name, the color identity, or all three. What happens at 15 (all of them, a cap with "and N more", a
   scroll). How a set with **zero** revealed commanders reads. What a **double-spoiled** card (two printings, one
   card) does: one commander, not two. Whether a revealed commander links anywhere (to its card details, or
   nowhere). Pairs and Partners do not occur in either set today, so they are not drawn unless Design wants one.
3. **How release dates and countdowns read.** Absolute date only, a relative form ("in 30 days"), or both; where the
   switch happens ("in 3 days", "tomorrow", "today"); and how a date six months out (Darkhold, 177 days) reads
   differently from one in a month. A set whose date is **today** is no longer upcoming (the read excludes it);
   say what the reader sees the day it releases and before its decks are listed. That day exists, and it is not
   the same as the tile turning into precons (below).
4. **Banner placement and priority.** Home has no slot for it. Where it sits relative to the header, Ready to build
   and the decks list, and whether it spans the page or sits beside something at desktop. How it behaves **beside
   the About sheet** when both are due on one load (one, the other, stacked, and who yields on a phone, where the
   sheet is a foot card that already reserves space). Whether a first-run account sees it (the checklist is the
   page then).
5. **What the banner says, and what "arrives" means.** One line per arrival, or a single line that rolls several
   up ("2 new Commander sets and 1 precon"), and the cap. Whether it names the thing, links to Precons (and to
   where on it), and what its action is. Whether it also covers an **announced** set the reader has not yet seen
   (data: `seen = false`, `arrivedAt` set), or only a precon whose deck list is new, or both; the data supports
   both and the Hugh ruling names "a set or precon".
6. **Dismiss and seen.** The brief locks that seen is per reader and durable. Design chooses *when* a thing becomes
   seen: when the banner is shown, when the reader dismisses it, when the reader opens Precons, or when the reader
   scrolls the group into view. Pick one and say what the other three do. Whether there is an undo, and whether a
   dismissed banner has any trace left (a dot on Precons in the nav, a marker on the announced tile).
7. **When decklists land.** The day MTGJSON lists the decks, the set's announced block is replaced by real precons
   in the year groups. Draw the transition: what a reader who had seen the announced tile sees (the tile is gone and
   N new tiles are in the list, or the announced block names its decks). Whether the new precons are marked "new"
   in the list for a while, and for how long; whether a reader who had not yet seen the set gets one banner, not
   two (set announced, then decks listed). Whether the announced block can show **both**, a set whose lists have
   landed for some decks and not others, and what it says.

## States to draw

At 390 and desktop. The Precons page in tiles and in rows (the view toggle holds), and Home.

**Precons page**
- **No upcoming sets.** The page exactly as shipped, no empty group and no heading.
- **One upcoming set, no commanders revealed.** The set's name and date, no art; a plate in the shipped tile's
  no-art language.
- **One upcoming set, some commanders revealed.** Darkhold (1 commander) is this, and the thinnest real case.
- **One upcoming set, many revealed.** Star Trek (15 commanders, one of them spoiled twice).
- **Two upcoming sets at once.** Star Trek and Darkhold together, the live state today: order (soonest first) and
  how a 30-day and a 177-day date sit beside each other.
- **Search or color filter active.** Whether announced sets filter with the list (by name or commander, by color
  identity) or stay put; what the result line counts.
- **Set released, decklists not yet listed** (the release day, and the days after).
- **Decklists landed.** The set's precons in the year groups; the announced block gone or changed.
- **Read failed.** The announced block absent and the list as shipped.

**Home banner**
- **No banner.** Nothing arrived, or all seen.
- **One arrival, unseen.** An announced set; a newly listed precon.
- **Several arrivals, unseen.** At least three, to show the roll-up and its cap.
- **Banner beside the About sheet,** at 390 and at desktop.
- **Seen.** After a dismiss, and after the reader opened Precons without dismissing it, if those differ.
- **First-run account.** Whether the checklist page carries it.
- **Focus:** the dismiss and the banner's link, each with its focus ring.

## Fixtures (staging, read-only)

- The live case: `trc` (15 commanders, one double-spoiled card, 30 days out) and `mdc` (1 commander, 177 days out).
- A set with **no** revealed commander is not on staging; hand-build it.
- A banner needs an arrival, and there is none yet (the baseline note above): hand-build the stamp state, or draw
  from the two sets with `arrivedAt` set and `seen = false`. `pnpm probe:upcoming-precons` builds exactly those
  states in one rolled-back transaction on `local-dev` and shows the data shapes the surfaces receive.
- The newest shipped precons (released 2026-10-02; Keen Engineering, Reign of Dragons, Calling All Angels and
  Tramplesaurus Rex are among them) are the neighbours the announced block sits beside.

## The About decision

**Probably a new entry, because this is a feature rather than a restyle.** A reader learns something they could not
do before: see what Commander sets are coming, and be told when something new arrives. That is a capability to
discover, not a moved mark. Two things shape it:

- It **ships with its release, and can batch there.** If it ships alone it owes its own entry and `ABOUT_VERSION`
  bump in the same round; if it ships in a line with other work, the entry batches at the end of that line. The
  plan names the entry as a task beside the PR boundaries either way, with a reason if it is deferred.
- The entry follows the feature switch (`AboutSwitch`), as `precons` and `deck-tokens` do, and is announced when its
  switch flips. Its route is `/decks/precons`, with a specimen of the announced block. The existing `precons` entry
  (`src/lib/copy/about.ts`, `id: 'precons'`) gets an ordinary edit if the two are described together.
- The banner is itself a small announcement. A banner that says "new in the app" is not a reason for a second About
  entry; it is one more surface the same entry describes.

Hugh decides which features owe an entry and may overrule this; Design draws the entry on the per-entry template
artboard if one is owed.

## Copy

Every string goes through `/copy-review`: the announced block's heading, the date and countdown forms, a
no-commanders-yet line, the banner's lines (singular, plural, and the roll-up), the dismiss label, and any screen
reader text. The working strings are placeholders. US English; "select/unselect" never "tick".

## Paths

- `src/lib/precons/upcoming.ts` (`loadUpcomingSets`, `markUpcomingSeen`, `utcDay`), `src/lib/catalog/first-seen.ts`
- `src/app/decks/precons/page.tsx`, `src/components/decks/precons/precon-list-view.tsx`, `precon-tile.tsx`,
  `precon-row.tsx`, `precons-down.tsx`
- `src/lib/precons/list.ts` (`groupByYear`), `src/lib/precons/list-read.ts`, `src/lib/copy/precons.ts`
- `src/app/page.tsx`, `src/components/home/dashboard.tsx`, `src/components/shell/about-sheet.tsx`
- `scripts/probe-upcoming-precons.mts` and `docs/probes.md` (the data states)
- `src/db/schema.ts` (`catalog_first_seen`, `user_prefs.upcoming_seen_codes`)

## Deliverable

A handoff in `design/design_handoff_the99_upcoming_precons/`: the announced surface on the Precons page in tiles and
rows at 390 and desktop, the Home banner at both, every state above, the answer to each open question, the About
entry if one is owed, and the `STATES` rows and design-table sections they add.
