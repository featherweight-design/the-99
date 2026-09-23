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
`src/components/decks/spine-desktop.tsx:456` and `spine-mobile.tsx:87`.

**Verified against `origin/main` at `4ba8df85`.** Every file:line below was read on that commit.

This round asks: **how does a deck say "the world changed under you" quietly, next to a prompt that
already says "you changed the deck", without the two reading as one thing?**

---

## §1 What this is

**A deck now keeps one standing analysis.** Hugh's rulings for the Analysis tab (audit `:26-47`)
make the last analysis the player ran the deck's bracket everywhere until they run another. Only
their own edits mark it changed, and a catalog refresh, a new set or a price update never does.
That lifecycle is built: it was the audit's PR C (`:289`) and shipped as #891 and #892. The
ruling's isDirty is `deck_profiles.dirty` (`src/db/schema.ts:1495`), which `touchDeck` sets in the
edit's own transaction (`src/lib/decks/touch.ts:82-83`). A stored reading never lapses on the
catalog or its age (`src/lib/profile/stored.ts:18-19`), and the tile's chip reads the stored range
with no freshness clause at all (`src/lib/profile/stored-sql.ts:16-22`).

**So a data change under a deck is already silent.** The analysis stands, the bracket holds, and
a card that became a Game Changer on Monday is not in it. This feature closes that gap
without breaking the ruling: the app never re-analyzes on the player's behalf and never marks the
deck changed. It puts a **subtle notice** on the deck, lets the player read **what changed**, and
leaves the decision to re-analyze with them.

**Legality rides the same surface.** The profile already computes the deck's rules legality:
`ProfileLegality` carries `banned` and `identityViolations` (`src/lib/profile/types.ts:282-288`),
built at `src/lib/profile/build.ts:392-403`. **Nothing draws it.** No component reads `banned` or
`identityViolations`.

**The word "legality" is already taken, though.** Since #892 the Analysis tab's `legality` prop
(`src/components/decks/analysis-panel.tsx:41-47`, read at `:73-74`) and `deckLegality`
(`src/lib/profile/stored.ts:58-63`) both mean the BODY COUNT: 99, or 98 with a partner (§2.7).
This feature should not overload the word. Its copy and code should name the reason (not legal
in Commander, outside the commander's colors; §3.4), or say "rules" (a `rulesViolations`, not a
second `legality`). Naming the reason is the safer of the two in copy, since the list also
carries a group for bracket rules changes (§2.3).

## §2 Rulings, locked (Hugh, 2026-09-23)

1. **One standing analysis, and only the player's edits mark it changed.** System updates never
   set `dirty` (the ruling's isDirty), never re-analyze, and never move the held bracket
   (audit `:39-47`).
2. **A bracket-relevant data change under a deck raises a subtle notice on that deck.** The player
   can see what changed and decides whether to re-analyze.
3. **Five kinds of change qualify:**
   - a card **becoming, or ceasing to be, a Game Changer** (`cards.game_changer`, Scryfall's own
     boolean, refreshed weekly by the catalog job: `src/db/schema.ts:60-71`);
   - a change to a card's **bracket flags**: mass land denial or extra turns
     (`card_bracket_flags`, `schema.ts:1427-1459`, written by the weekly Combo refresh). The
     table's `tutor` flag is not a trigger: the verdict classifies tutors from oracle text, so a
     tutor-flag diff cannot move a stored analysis. A change to that classifier is a bracket rules
     change and notifies as one (§6);
   - a Commander Spellbook **combo added or removed** that involves the deck's cards
     (`spellbook_variants` / `spellbook_variant_cards`, `schema.ts:1327` and `:1401-1416`);
   - a **bracket rules change**, modeled as a bump of a bracket-rules version kept apart from
     the profile builder's version (the limits live in `src/lib/bracket/rules.ts`, e.g.
     `GAME_CHANGER_LIMIT` at `:14`; the classifiers that feed the verdict are listed in §6);
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
   This brief does not change that. A deck holding a banned card can still be analyzed. In code,
   `legality` means this body count today (§1).

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
flags, combos, rules, legality**. Only groups with something in them are drawn. **Every
card-scoped entry names its cards**, and every card name opens the card, as a name in a receipt
does. Changes run
both ways and the list says which: a card that joined the Game Changers list and one that left it,
a combo Spellbook added and one it removed. A rules entry is not card-scoped: it names the rule that moved and what it now says, in words,
and never lists the deck's cards.

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
- **"You changed the deck."** `dirty` (the ruling's isDirty), answered by the Analysis tab's one
  banner and its Re-analyze button (`HANDOFF.md:50`). The handoff forbids a second place that says stale
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

- **Never an automatic re-analysis, never `dirty`, never a moved bracket.** The held bracket
  stays exactly as the player last analyzed it. The one recompute the player does not ask for is
  the quiet rebuild of an old-format reading after a deploy (§6), which Hugh accepted as a code
  change rather than an edit; it must never swallow a notice.
- **No prediction.** An entry says what changed, never what it would do to the bracket. The
  handoff already rules out any hint at whether changes matter (`HANDOFF.md:58-59`); only a
  re-analysis answers that.
- **No second stale banner in the Analysis tab** (`HANDOFF.md:110`).
- **Only the deck's own cards.** A change to a card the deck does not hold never reaches it.
- **Not sources:** price updates, a new set with nothing bracket-relevant in it, the monthly
  commander index (it moves the recommended mix and the population line, not the verdict's
  limits), and the synopsis's own prose.
- **Every card-scoped entry names its cards**; a count alone is never an entry. A rules entry
  names the rule that moved and what it now says, never a list of the whole deck.
- **The add refusals stand.** A notice never replaces a refusal, and never blocks an edit.

## §6 What engineering owns (not for Design)

Recorded so the round is not asked about them. All of it is deterministic; no model call.

- **The lifecycle this depends on is built.** PR C (audit `:289`) shipped as #891 and #892: a
  stored reading no longer lapses, so every analyzed deck has a standing analysis for a notice to
  qualify. Engineering does not wait on anything to start.
- **A change log, written by each ingest as a diff before its publish, on its own sequence.**
  `catalog_refreshes` cannot key it: it is one row, overwritten (`schema.ts:1288-1296`), its write
  is deliberately non-fatal (`src/lib/cache/stamp-catalog.ts`), and six writers stamp it
  (`src/lib/scryfall/seed.ts:51`, `seed-sets.ts:35`, `seed-printings.ts:294`,
  `src/lib/spellbook/seed.ts:404`, `scripts/build-commander-index.ts:72`,
  `scripts/build-staples.ts:663`), most of them bracket-irrelevant. Each stored analysis already
  records `catalog` and `computed_at` (`deck_profiles`, `schema.ts:1482-1502`, the columns at
  `:1486` and `:1489`), and the table's comment says `catalog` is kept for this feature and read
  by nothing today (`:1473-1474`). Neither can serve as the mark, because the quiet rebuild below
  moves both. The row should also record the log's high-water sequence at compute time. **A
  deck's notices are the log entries after that mark that intersect its cards and commanders.**
- **The card ingest is not transactional, so its entries are written per batch.** `seedCards`
  streams the bulk file and flushes each 500-row batch as its own upsert statement
  (`src/lib/scryfall/seed.ts:15-40`, flushed at `:46` and `:48`), with no transaction around the
  run. A run can fail after earlier batches have committed. A log written only at the end of the
  run would then leave `game_changer` or `commander_legal` changed with no entry, and the next
  run's before-values would already hold the new state, so that transition would never be logged.
  **Each batch's entries are written in the same transaction as that batch's upsert:** read the
  batch's current `game_changer` and `commander_legal` for its oracle ids, upsert, and insert the
  entries for the rows that moved, then commit all three together. A batch either lands with its
  entries or not at all, and a failed run leaves every committed change logged.
- **The combo ingest publishes twice, and each diff is written inside its own publish.** Flags
  publish in their own transaction (`src/lib/spellbook/seed.ts:300`) before the bulk; variants in
  a second (`:388`). The flag diff (mass land denial and extra turns only, per ruling 3) is
  written in the first transaction and the combo diff in the second. Which entries survive
  depends on where a run stops:
  - **Refused before the flag publish** (the classifier floors, `:289-292`): nothing is
    published and **no entries are written**. The previous flags and variants stand.
  - **Refused or failed after the flag publish** (the variant floor, `:362-363`; the field
    floors, `:374-376`; or a bulk download or variant transaction that throws): the flags are
    already live, as the ingest intends, so **the flag entries are committed and kept**. The
    variant transaction never commits, so **that run writes no combo entries**, and the previous
    variants stand. The next run that publishes variants diffs against those previous variants,
    so no combo change is lost.
- **Which combos count: the verdict's own rule, assembled only.** The profile counts two-card,
  template-free variants whose pieces the deck holds under §4.3b's three rules
  (`src/lib/profile/load.ts:119-155`) and whose output passes `isInfiniteOrGameEnding` (`:176`).
  The notice filter is that rule, applied to added and removed `variant_id`s. The only near-miss
  logic in `src/lib` is two-card, one piece missing (`src/lib/combos/near-miss.ts:7`,
  `pairsWithOnePiece` at `:72`, `loadCompletionPartners` at `:227`); there is no general
  all-but-one read for larger combos. A one-away combo moves no figure in a stored analysis, so it
  is **not** a notice source.
- **Tutors are not read from the flag table, so a tutor-flag diff is not logged.** The profile
  classifies tutors from oracle text at load (`load.ts:373`, `classifySearches` at
  `src/lib/bracket/tutor-targets.ts:280`, which calls `classifyTutor` at `:197`);
  `card_bracket_flags.tutor` feeds other surfaces. So a tutor-flag diff moves no stored analysis
  and is not a notice trigger (ruling 3). A tutor change reaches a deck only through a change to
  that classifier, which is a bracket-rules bump (below). Mass land denial and extra turns do come
  from the flag table (`load.ts:358-363`), and those two diffs are logged.
- **A bracket-rules version, kept apart from `PROFILE_VERSION`.** `rules.ts` carries no version
  today, and `PROFILE_VERSION` (`src/lib/profile/version.ts:12`) cannot stand in for one: its
  bumps are builder changes, and the ones on record are a land-capable fact group (version 2) and
  a role-classification fix (version 3, `:15-32`), neither of which touches the verdict. Logging
  every profile bump as a rules notice would tell players a rule moved when none did. So a
  separate **bracket-rules version** lives beside `rules.ts` and is bumped only when logic that
  can move the verdict changes:
  - the limits and policies in `src/lib/bracket/rules.ts` (`GAME_CHANGER_LIMIT` at `:14`,
    `MASS_LAND_DENIAL_LIMIT` at `:24`, `EXTRA_TURN_LIMIT_BRACKET_1` at `:34`, `COMBO_POLICY` at
    `:48`, `permitsFor` at `:91`, `comboLandsEarly` at `:120`);
  - the tutor classifier the verdict reads (`classifyTutor` and `classifySearches`, above);
  - the combo rule the verdict applies: `isInfiniteOrGameEnding`
    (`src/lib/spellbook/combo-features.ts:33`) and the §4.3b piece rules in
    `src/lib/profile/load.ts:119-155`.

  The mass-land-denial and extra-turn oracle classifiers (`isMassLandDenial` and `isExtraTurn`,
  `src/lib/bracket/oracle-rules.ts:125` and `:144`) run inside the combo ingest
  (`src/lib/spellbook/seed.ts:5`) and land in `card_bracket_flags`, so a change to them reaches
  decks as card-scoped flag entries at the next Combo refresh and needs no rules bump.
  A bracket-rules bump writes one rules entry, stated in words, that applies to every deck
  analyzed before it. `deck_profiles.fingerprint` stores `listFingerprint`, the list alone with
  no version in it (`src/lib/profile/fingerprint.ts:53-55`), and `PROFILE_VERSION` is its own
  column, `profile_version` (`schema.ts:1493`), so neither bump is the player's edit, as ruling 1
  requires.
- **The quiet rebuild must not swallow a notice.** `readStoredReading` recomputes a row an older
  `PROFILE_VERSION` wrote, on a clean, legal deck whose list is unchanged, against the current
  catalog, without the player asking (`stored.ts:140-149`). The upsert that stores it rewrites
  `catalog`, `permits` and `computed_at` (`stored.ts:305-321`). Hugh accepted this on 2026-09-23
  as a code-format change, not a player edit. Two engineering requirements follow from it:
  - **The rebuild keeps the old reading's high-water mark.** It must not advance the stamp that
    says the analysis has seen log entries up to here. The rebuilt row carries the mark the
    replaced row held, the way it already keeps the replaced row's version pin (`rebuildOf`,
    `stored.ts:146-147` and `:239`). A rebuild that advanced the mark would swallow every pending
    notice on the deck before the player had read one.
  - **A profile-only bump rebuilds quietly and writes no notice.** A `PROFILE_VERSION` bump
    with no bracket-rules bump changes how the builder describes the deck, not the rules it is
    held to, so it writes no entry. Because the rebuild keeps the old mark, any data entries
    already pending on the deck (a Game Changer, a flag, a combo, a ban) stay pending and still
    reach the player, which is what explains a bracket the rebuild moved against the current
    catalog.
  - **A bracket-rules bump writes a rules entry.** When the same deploy also bumps
    `PROFILE_VERSION` and so triggers the rebuild, the rules entry is what tells the player why
    the held bracket moved.
- **Legality: where illegal cards come from.** Hand adds refuse a not-legal, off-identity or
  commander card (`src/lib/decks/add-validation.ts:46-63`, called at `src/app/decks/actions.ts:502-506`),
  and a repeat add of a singleton is a no-op rather than a refusal (`:485-493`). The bulk paths run
  the same check (`restoreAutoCards`, `:857-871`; `runTopOff`, `:971`). Three side doors remain
  open:
  - **A ban** landing in the weekly catalog refresh: the `commander_legal` diff above.
  - **Import** keeps them. `importDeck` validates only the commanders (`src/app/decks/import-actions.ts:198-209`)
    and inserts every matched row into the 99 (`:233-253`). Resolving an unresolved line refuses a
    not-legal card (`:326`) but skips color identity on purpose (`:276-281`).
  - **Update from a list** keeps them too. `updateDeckFromList`
    (`src/app/decks/update-actions.ts:280`) inserts every card its plan adds (`plan.in`,
    `:352-360`), and `planDeckUpdate` (`src/lib/decks/update.ts:90`) checks neither
    `commander_legal` nor color identity. So pasting a list over an existing deck can add a
    banned or off-identity card.

  **A commander change is not a door on `main`.** No write changes an existing deck's
  `commander_oracle_id` (it is set only at create, `actions.ts:354` and `:420`, and at import,
  `import-actions.ts:242`), and updating a deck from a list that names a different commander or
  partner is refused (`update.ts:111-125`, thrown at `update-actions.ts:337`; the copy at
  `src/lib/copy/deck-import.ts:570-571`). The profile's own comment anticipates a swap
  (`types.ts:284-286`); if one is built, it is a legality source.
- **Legality entries are derived live** from the deck's cards against `commander_legal` and the
  commanders' identity, exactly as `build.ts:392-403` does, so they need no analysis to exist. The
  ban event is the log's; the standing state is the cards'.
- **Scryfall's word.** If Design's reason line needs "banned" as distinct from "not legal", the
  catalog keeps Scryfall's `legalities.commander` value beside the boolean.
- **Payload.** The tile needs one boolean per deck from the `/decks` loader
  (`listDecksWithStats`, `src/lib/decks/read.ts:816`); the list itself loads when opened.

## §7 Sequence

This brief waits for Hugh's approval before it goes to Design. The lifecycle it depends on (PR
C, shipped as #891 and #892) is on `main`, so the build waits only on Design's round. The About
entry is batched with the rest of the analysis line's entries at launch, so it is not drawn in
this round.
