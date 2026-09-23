# Design Brief: Deck notices, legality and data changes (sub-project 9)

**Date:** 2026-09-23 · **Branch:** `docs/deck-notices-brief` (held for Hugh's approval; not yet a PR)
**Rulings:** Hugh, 2026-09-23. The standing-analysis rulings are recorded in
`design/design_handoff_the99_analysis_tab/READINESS-r1-audit.md:25-52`; ruling 6 there (`:42-47`)
names this feature and scopes it out of the Analysis-tab round. The rest of §2 was ruled the same day
for this brief.
**Spec:** `docs/superpowers/specs/2026-09-19-deck-analysis-foundation-design.md:2293-2295`: rule-0
legality reporting has its data (`ProfileLegality`) and "what remains is a surface for it, which is
Design's to place".
**Frame:** the consolidated Analysis tab, `design/design_handoff_the99_analysis_tab/HANDOFF.md`, and
its one banner (`:50`, rules at `:57-59` and `:110`). The deck tile is
`src/components/decks/deck-card.tsx` (its bracket chip at `:532`); the deck header's chip is
`src/components/decks/spine-desktop.tsx:449` and `spine-mobile.tsx:107`.

**Verified against `origin/main` at `7cf81c53`.** Every file:line below was read on that commit.

This round asks: **how does a deck say "the world changed under you" quietly, next to a prompt that
already says "you changed the deck", without the two reading as one thing?**

---

## §1 What this is

**A deck now keeps one standing analysis.** Hugh's rulings for the Analysis tab (audit `:27-47`)
make the last analysis the player ran the deck's bracket everywhere until they run another. Only
their own edits mark it changed, through an `isDirty` flag, and a catalog refresh, a new set or a
price update never does. That lifecycle is engineering's PR C (audit `:289`) and is not built yet:
on `main` a stored analysis still lapses when the catalog generation moves or after seven days
(`src/lib/profile/stored.ts:86-102`, `src/lib/profile/stored-sql.ts:20`), and no `isDirty` exists
anywhere under `src/`.

**Once PR C lands, a data change under a deck becomes silent.** The analysis stands, the bracket
holds, and a card that became a Game Changer on Monday is not in it. This feature closes that gap
without breaking the ruling: the app never re-analyzes on the player's behalf and never marks the
deck changed. It puts a **subtle notice** on the deck, lets the player read **what changed**, and
leaves the decision to re-analyze with them.

**Legality rides the same surface.** The profile already computes it: `ProfileLegality` carries
`banned` and `identityViolations` (`src/lib/profile/types.ts:281-287`), built at
`src/lib/profile/build.ts:392-401`. **Nothing draws it.** A search of `src/components` finds no
reader of `legality` or `identityViolations`; the only hits under `src/app` are a test and comments.

## §2 Rulings, locked (Hugh, 2026-09-23)

1. **One standing analysis, and only the player's edits mark it changed.** System updates never
   set `isDirty`, never re-analyze, and never move the held bracket (audit `:39-47`).
2. **A bracket-relevant data change under a deck raises a subtle notice on that deck.** The player
   can see what changed and decides whether to re-analyze.
3. **Five kinds of change qualify:**
   - a card **becoming, or ceasing to be, a Game Changer** (`cards.game_changer`, Scryfall's own
     boolean, refreshed weekly by the catalog job: `src/db/schema.ts:60-71`);
   - a change to a card's **bracket flags**: mass land denial, extra turns, tutor
     (`card_bracket_flags`, `schema.ts:1413-1445`, written by the weekly Combo refresh);
   - a Commander Spellbook **combo added or removed** that involves the deck's cards
     (`spellbook_variants` / `spellbook_variant_cards`, `schema.ts:1313` and `:1387-1402`);
   - a **bracket rules change**, modeled as a rules-version bump (the limits live in
     `src/lib/bracket/rules.ts`, e.g. `GAME_CHANGER_LIMIT` at `:14`);
   - a **legality change**: a card that stops being Commander-legal after it was added.
4. **A deck is notified only when a change touches its own cards.** Spellbook adds combos between
   long-existing cards every week, not only with new sets, so this filter is what keeps notices
   rare. A rules change is the one kind that is not card-scoped (§6).
5. **Legality is folded into the same surface.** A legality entry names the cards and the reason.
6. **A legality check comes before the synopsis is spent.** Analysis is free and deterministic;
   only the synopsis costs a model call, against a daily per-player allowance (audit ruling 7,
   `:48-52`). A player should not spend that allowance on a deck that is not legal.
7. **"Legal for analysis" stays body count only** for the Analysis-tab build in progress: 99, or
   98 with a partner (audit ruling 1, `:29-30`; `deckBodySize` at `src/lib/decks/deck-size.ts:9-11`).
   This brief does not change that. A deck holding a banned card can still be analyzed.

## §3 What Design is asked to draw

Both widths, 390 and 1300, for everything below.

### 3.1 The notice

A quiet signal on a deck that has something in its what-changed list. **Each surface draws it in
one place, not two**:
- **the deck page**, where the header already carries the bracket chip, and
- **the deck tile** on `/decks`, where the chip sits beside the deck's other figures.

Two cases it has to hold. A notice about DATA qualifies an analysis the deck already has, so the
chip is the obvious neighbor. A notice about LEGALITY can exist on a deck that has never been
analyzed and so has no chip. The placement has to work for both.

### 3.2 The what-changed list

What the notice opens. Grouped by kind, in whatever order Design calls: **Game Changers, bracket
flags, combos, rules, legality**. Only groups with something in them are drawn. **Every entry
names its cards**, and every card name opens the card, as a name in a receipt does. Changes run
both ways and the list says which: a card that joined the Game Changers list and one that left it,
a combo Spellbook added and one it removed. A rules entry states the rule that moved, in words.

**Candidate container:** `ModalChrome` in `src/components/decks/receipt-modal.tsx`, which already
carries the receipt, the combo and the reasoning, and is taking the synopsis as a fourth body. A
fifth body inherits its header rule, its phone treatment and its stacking rule for a card opened
from inside it. Design may call otherwise (§4).

### 3.3 Acknowledgement

What makes the notice go away. The open question is whether **reading the list** clears it, or
only **re-analyzing** does (§4.3). Legality entries may need their own answer: a banned card is
still in the deck after it has been read about.

### 3.4 The legality entries

Two reasons, each naming its cards:
- **Not legal in Commander.** The source is `cards.commander_legal`, which the catalog ingest sets
  to `legalities.commander === "legal"` (`src/lib/scryfall/transform.ts:46`). That collapses
  Scryfall's `banned` and `not_legal` into one false, so today the app cannot say "banned" for
  certain. Design writes the reason line for the case it can state; engineering can keep
  Scryfall's value if the word matters (§6).
- **Outside the commander's colors.** The card, and the colors that put it outside the identity.

A legality entry is a standing state as well as an event: it arrives when a ban lands (a data
change) or when a card enters by a side door (§6), and it lasts while the card is in the deck.

### 3.5 Beside the Re-analyze prompt

Two different signals, and the player has to be able to tell them apart:
- **"You changed the deck."** `isDirty`, answered by the Analysis tab's one banner and its
  Re-analyze button (`HANDOFF.md:50`). The handoff forbids a second place that says stale
  (`HANDOFF.md:57-59`, `:110`).
- **"The world changed under the deck."** This notice.

A deck can carry both at once, and the deck page already has its own non-dismissible pending
banner for an uncommitted draft (`src/components/decks/pending-banner.tsx:3-4`). **Design keeps the
two analysis signals distinguishable without drawing two competing banners.** Draw the deck in all
four combinations: neither, dirty only, notice only, both.

### 3.6 The check before the synopsis

The state a player meets when they press Analyze or Re-analyze on a deck with a legality entry.
Analysis runs (§2.7). What Design draws is how the player learns, before the synopsis is written,
that the deck is not legal and that writing it will spend the allowance anyway, or will not be
offered (§4.6).

## §4 Open for Design to call

1. **Where the notice sits** on the deck page and on the tile, and what it looks like on a deck
   with no chip.
2. **The list's container:** a fifth `ModalChrome` body, or something else.
3. **Acknowledgement:** reading the list clears the notice, or only a re-analysis does. And
   whether legality entries follow the same rule or stay until the cards leave.
4. **How the notice and the Re-analyze banner stay distinct** when both apply, on the page and
   inside the Analysis tab.
5. **Group order** in the list, and how an entry states direction (added or removed).
6. **The pre-synopsis legality check:** a warning the player can pass, or the synopsis withheld
   until the deck is legal.
7. **Whether an entry carries a date** (the week the change landed), and how it reads.

## §5 Locked, and not open

- **Never an automatic re-analysis, never `isDirty`, never a moved bracket.** The held bracket
  stays exactly as the player last analyzed it.
- **No prediction.** An entry says what changed, never what it would do to the bracket. The
  handoff already rules out any hint at whether changes matter (`HANDOFF.md:58-59`); only a
  re-analysis answers that.
- **No second stale banner in the Analysis tab** (`HANDOFF.md:110`).
- **Only the deck's own cards.** A change to a card the deck does not hold never reaches it.
- **Not sources:** price updates, a new set with nothing bracket-relevant in it, the monthly
  commander index (it moves the recommended mix and the population line, not the verdict's
  limits), and the synopsis's own prose.
- **Every entry names cards**; a count alone is never an entry.
- **The add refusals stand.** A notice never replaces a refusal, and never blocks an edit.

## §6 What engineering owns (not for Design)

Recorded so the round is not asked about them. All of it is deterministic; no model call.

- **Depends on PR C.** Until the stored analysis stops lapsing (audit `:289`), a catalog refresh
  hides it outright (`stored.ts:100-102`), and there is nothing for a notice to qualify.
- **A change log, written by each ingest as a diff before its publish, on its own sequence.**
  `catalog_refreshes` cannot key it: it is one row, overwritten (`schema.ts:1274-1282`), its write
  is deliberately non-fatal (`src/lib/cache/stamp-catalog.ts`), and six writers stamp it
  (`src/lib/scryfall/seed.ts:51`, `seed-sets.ts:35`, `seed-printings.ts:294`,
  `src/lib/spellbook/seed.ts:404`, `scripts/build-commander-index.ts:72`,
  `scripts/build-staples.ts:663`), most of them bracket-irrelevant. Each stored analysis already
  records `catalog` and `computed_at` (`deck_profiles`, `schema.ts:1469-1476`); it should also
  record the log's high-water sequence at compute time. **A deck's notices are the log entries
  after that mark that intersect its cards and commanders.**
- **The card ingest is not transactional.** `seedCards` upserts in batches of 500 as it streams
  (`src/lib/scryfall/seed.ts:15-48`), so the diff of `game_changer` and `commander_legal` needs the
  before-values captured first and the entries written once the run completes.
- **The combo ingest publishes twice, and a refused publish writes no entries.** Flags publish in
  their own transaction (`src/lib/spellbook/seed.ts:300`) before the bulk; variants in a second
  (`:388`). The classifier floors refuse before either (`:289-292`), and the variant and field
  floors refuse after the flags have published (`:362-363`, `:373-375`). So each diff is written
  inside its own publish transaction: a run can log flag changes and no combo changes, and a
  refused publish logs nothing.
- **Which combos count: the verdict's own rule, assembled only.** The profile counts two-card,
  template-free variants whose pieces the deck holds under §4.3b's three rules
  (`src/lib/profile/load.ts:119-153`) and whose output passes `isInfiniteOrGameEnding` (`:176`).
  The notice filter is that rule, applied to added and removed `variant_id`s. The only near-miss
  logic in `src/lib` is two-card, one piece missing (`src/lib/combos/near-miss.ts:7`,
  `pairsWithOnePiece` at `:72`, `loadCompletionPartners` at `:227`); there is no general
  all-but-one read for larger combos. A one-away combo moves no figure in a stored analysis, so it
  is **not** a notice source.
- **Tutors are not read from the flag table.** The profile classifies tutors from oracle text at
  load (`load.ts:373`, `classifySearches`); `card_bracket_flags.tutor` feeds other surfaces. So a
  tutor-flag diff moves no stored analysis, and a tutor change reaches a deck only through a
  classifier change, which is a rules-version bump. Mass land denial and extra turns do come from
  the flag table (`load.ts:358-363`).
- **A rules version, separated from the list fingerprint.** `rules.ts` carries no version today.
  `PROFILE_VERSION` (`src/lib/profile/version.ts:12`) is folded into the fingerprint
  (`src/lib/profile/fingerprint.ts:46`), so a builder bump today reads, to the stored lookup, as a
  different list. Under ruling 1 that must not become the player's edit. A rules or builder bump
  writes one log entry, stated in words, that applies to every deck analyzed before it.
- **Legality: where illegal cards come from.** Hand adds refuse a not-legal, off-identity or
  commander card (`src/lib/decks/add-validation.ts:46-63`, called at `src/app/decks/actions.ts:497-503`),
  and a repeat add of a singleton is a no-op rather than a refusal (`:482-490`). The bulk paths run
  the same check (`restoreAutoCards`, `:854-866`; `runTopOff`, `:968`). Three side doors remain:
  - **Import** keeps them. `importDeck` validates only the commanders (`src/app/decks/import-actions.ts:198-209`)
    and inserts every matched row into the 99 (`:233-252`). Resolving an unresolved line refuses a
    not-legal card (`:326`) but skips color identity on purpose (`:276-282`).
  - **A ban** landing in the weekly catalog refresh: the `commander_legal` diff above.
  - **A commander change: not open on `main`.** No write changes an existing deck's
    `commander_oracle_id` (it is set only at create, `actions.ts:351` and `:417`, and at import,
    `import-actions.ts:241`), and updating a deck from a list with a different commander is
    refused (`src/lib/copy/deck-import.ts:570-572`). The profile's own comment anticipates a swap
    (`types.ts:283-285`); if one is built, it is a legality source.
- **Legality entries are derived live** from the deck's cards against `commander_legal` and the
  commanders' identity, exactly as `build.ts:392-401` does, so they need no analysis to exist. The
  ban event is the log's; the standing state is the cards'.
- **Scryfall's word.** If Design's reason line needs "banned" as distinct from "not legal", the
  catalog keeps Scryfall's `legalities.commander` value beside the boolean.
- **Payload.** The tile needs one boolean per deck from the `/decks` loader
  (`listDecksWithStats`, `src/lib/decks/read.ts:816`); the list itself loads when opened.

## §7 Sequence

This brief waits for Hugh's approval before it goes to Design. The build follows PR C, which it
depends on. The About entry is batched with the rest of the analysis line's entries at launch, so
it is not drawn in this round.
