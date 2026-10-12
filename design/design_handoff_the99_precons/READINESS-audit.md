# READINESS audit: Commander precons (R1/R2 audit, 2026-10-11)

**R4 addendum (tiles and Card view): re-audited 2026-10-12, GREEN. See "R4 re-audit" at the end of this file.**

**R3 addendum (built-from link and v0): re-audited 2026-10-11, GREEN. See "R3 re-audit" at the end of this file.** The R1/R2 audit below is unchanged.

Audited against `docs/superpowers/design-briefs/2026-10-11-commander-precons.md` (Hugh's five rulings,
engineering's nine locks, six open questions, Fixtures) and the tree at `origin/main` 00e254f17.
**Build from R2**: `The 99 - Precons (R2).dc.html` (canvas) and `Precons R2.dc.html` (frame). R1's two
files (`The 99 - Precons (R1).dc.html`, `Precons.dc.html`) are kept for history, as the README says.

## Verdict: GREEN

Every ruling, lock and open question is drawn or answered, and nothing drawn needs data the feed or the
engine cannot supply. The first pass was YELLOW on two product calls (findings 1 and 2); Hugh answered both
on 2026-10-11, approving R2 as drawn. Every remaining finding is engineering's to resolve in the plan, and
none needs a Design round. R2 is current.

### Hugh's answers, 2026-10-11

1. **Ruling 3:** yes, a `Commander precons` line on /decks that opens its own page, `/decks/precons`. No tab
   bar.
2. **The cart line:** yes, it shares the row with the precon line: half width at 900, and at 390 one row of
   two cells, the cart reading `Shop all decks · 307 · $843.99`.

### Amendment to the cart design

Answer 2 **amends `design/design_handoff_the99_all_decks_cart/`** (#1438). Its `CartEntry` is no longer a
full-width line on both widths: on /decks it is the first cell of the head row this handoff draws (P1, P2,
and the `R2 change: /decks head on a phone` and `Change: /decks head` sections of
`design-tables/precons.md`). At 390 its title is `Shop all decks` (new key `entry.titlePhone`) with the meta
`307 · $843.99` (`entry.figurePhone`); at 900 the approved `Shopping for all decks` line and figure stay, in
a half-width cell. With the precons switch off (P4), or no precon line, the cart line takes its approved
full width. Whichever of the two features ships first builds the row; the second fills its cell.

## Coverage

| Brief item | Where | Holds |
|---|---|---|
| Ruling 1: Commander Deck only | L1 lists 185 of the 197 `Commander Deck` entries (twins folded) | holds. 197 re-counted against `DeckList.json` today |
| Ruling 2: Start from a precon makes a draft | N1 door, S1 confirm, S2 arrival with status `Draft` | holds |
| Ruling 3: browsable precon tab on /decks | P1/P2 line on /decks to the route `/decks/precons` | **drawn as a route, not a tab** (finding 1) |
| Ruling 4: read-only list drawn like the deck view, with an owned count | O1 to O3, V1, V2: `DecklistGroup` by type, owned dots, counts only | holds |
| Ruling 5 / lock 1: fetched once | nothing drawn depends on a live fetch; L4 is "unreadable", not "offline" | holds (finding 9) |
| Lock 2: small data | rows need name, code, release, commanders, cards with oracle id, printing, count | holds; colours derive from the commanders' cards |
| Lock 3: unmapped counted and shown | R5, O4 (STATES only) | holds, with a copy defect (finding 4) |
| Lock 4/5: contract check, ingest lock | not Design's | n/a |
| Lock 6: owned = any printing, computed at read | G5, the dot, every figure | holds |
| Lock 7: draft, never assumes 99 | S1 facts, G8, V2 `98 beside them` | holds (finding 6) |
| Lock 8: MTGJSON licence kept | AB frame, `mtgjsonCredit` | **target block does not exist** (finding 5) |
| Lock 9: off by a switch | G7 `PRECONS_ENABLED`, P4, N2 | holds |
| Q1 twin | one row under the plain edition, twin named, twin URL redirects | answered |
| Q2 already built | `N shared` comparison, never "built from" (G2) | answered |
| Q3 printing | shown read-only, not carried into the draft | answered (finding 7) |
| Q4 basics | excluded, said on every figure, `BasicsLine` | answered |
| Q5 order | Newest default, Most owned one choice away, per browser | answered |
| Q6 part of it | whole 100 this round (G6 sketches the select / unselect option) | answered |
| 900 + 390, STATES, design table, About entry | all present | holds |
| Fixtures | Counter Intelligence 91/91, Eldrazi Unbound 74/85, Wretched Ranks 18/67, Avengers Assemble 30/84 twin; Food and Fellowship as the pair | holds. Food and Fellowship verified: MTGJSON lists Frodo, Adventurous Hobbit and Sam, Loyal Attendant as its two commanders |
| Vocabulary | no `tick` anywhere; the one canvas match is `sticky`; no verdict word on ownership | holds |

## Engineering facts verified

- `DecklistGroup` (`src/components/decks/decklist-group.tsx:48`) takes `deckId: string` (required),
  `newestAsOf` (required) and no `readOnly`; `DecklistRow` likewise. G9 is real work: a `readOnly` path or a
  `PreconGroup` wrapper. The owned dot (solid `--success` / dashed hollow) is the shipped mark
  (`decklist-row.tsx:486`). `siblings` exists for Prev/Next.
- Card details already run without a deck: `card-detail-provider.tsx` takes `deckId: string | null` and an
  `atPrinting` with a `scryfallId`, so G9/G10 need no new provider.
- `HelpMeChooseDoor` is `src/components/intake/help-me-choose-door.tsx` (the table names the file without its
  directory), rendered at `create-picker.tsx:389` behind `helpDoor`. The desktop sub is
  `addPanelCopy.createPicker.sub` / `.subAlone` in `src/lib/copy/decks-builder.ts:380`, not a precons key.
- `createDeck(commanderOracleId, name, selectedOracleIds, partnerOracleId, answers)` (`actions.ts`) takes ids
  without counts, so G8 is right that 15 Wastes cannot pass through it. `importDeck`'s write half
  (`import-actions.ts:323-356`: deck, `deck_cards` with quantities, printing picks, one transaction, then
  `revalidateClaims`) is the half a `createDeckFromPrecon` should share.
- `/decks` filters mirror through `mirrorUrl` with a `colour` param (`decks-view.tsx:115`); `FilterChassis`,
  `ColourPips`, `CommanderThumb`, `TextField`, `HoverPreviewProvider`, `DECK_NAME_MAX`, `deckBodySize`,
  `useLocalFlag` and the per-browser deck sort (`sort-memory.ts`) all exist as named.
- Tokens: every token the R2 canvas reads is in `globals.css` except `--btn`, a canvas-local
  `#C9D3D6` that stands for the shipped `PrimaryButton` fill (`--fg`, Kaldheim `#C6D2D3`). The table already
  says `PrimaryButton`; nothing new is owed.
- The cart (`design_handoff_the99_all_decks_cart/`, #1438) is a merged design, not built. Its `CartEntry` is a
  full-width line on both widths. This round changes that geometry (finding 2).
- Static `/decks/precons` sits beside `/decks/new`, `/decks/import` and the cart's `/decks/shopping`, and
  takes precedence over `/decks/[id]`.

## Findings

1. **resolved (Hugh, 2026-10-11) · Ruling 3, "tab" drawn as a route (G11).** /decks gets a `Commander precons` line beside the
   cart's line, opening `/decks/precons`. Design recommends against a literal tab: /decks has no tab bar, and
   one would put the shelves under a tab of their own. The reading fits how the cart already shares the page.
   Hugh confirmed the route.
2. **resolved (Hugh, 2026-10-11) · The cart line changes shape (R2 change 3, P1).** The approved cart handoff draws its /decks
   line full width at 900 and 390. Here it becomes a half-width cell at 900, and at 390 a half cell titled
   `Shop all decks` with meta `307 · $843.99` (the approved meta also says `to buy` and `7 decks`). That buys
   the phone fold back (+68px instead of +123px). Hugh approved the label and the geometry; recorded above
   as an amendment to the cart design.
3. **eng-resolvable · Arrival strip shape and lifetime (G12).** The design table draws a rounded box (radius
   10, `--border-strong`) living "until dismissed or the first commit". The shipped `ArrivalStrip` is a
   full-width band under the spine (`--surface-rail`, `border-bottom`), shown on the one navigation that
   carries `?imported=1` (`src/lib/decks/arrival.ts`) and dismissed per deck by `useLocalFlag`. The table says
   "the import arrival strip", so the shipped strip is built: its shell, a sibling param (`?from=precon`, as
   `updated` is a sibling of `imported`) for one trip, and the same dismissal key. Nothing waits on a commit.
4. **eng-resolvable · "100" is hard-coded where lock 3 can make it false.** `open.twin`, `start.lead`,
   `start.facts.cardsValue`, `start.beside` (`99` / `98`), `arrival.body` / `bodyAll` and the About caption say
   100 (or 99 beside). With one unmapped card (O4, "so 99 are listed") each would claim a card the draft does
   not hold. The figures take the count the ingest kept. Wording to /copy-review.
5. **eng-resolvable · Lock 8's "data credits" block does not exist.** /about has no data-credits section; its
   `credits` entry is "How credits work", the AI credits. The precedent for a source is a key line
   (`'Combos come from Commander Spellbook.'` on the combos entry). Decision: the MTGJSON credit and its notice
   go in the precon entry as a key line, keeping the notice verbatim. That makes five key lines against the
   template's four, which /prose-pass settles with the rest of the entry. If Hugh later wants a data-credits
   section crediting every source (Scryfall, EDHREC, Spellbook, Mana Pool, MTGJSON), that is its own round.
6. **eng-resolvable · `createDeckFromPrecon` (G8).** Reads the precon server-side by `fileName`, writes the
   commander(s) and the feed's exact entries with counts through the import's write half, runs
   `requireMember`, and redirects with the arrival param. Two checks the plan owns: the five multi-commander
   precons must pass the app's own pair rule (`canPair`) before the action trusts them, and the legality pass
   must be run over all 185 lists once; any card it would skip is shown, never dropped silently, because the
   arrival copy promises the precon's list.
7. **eng-resolvable · Printings (Q3).** With `DECK_PRINTINGS_ENABLED` on, `importDeck` writes a printing pick
   where the player holds the exact printing a line names. Design's answer is that the draft carries no
   precon printing, so `createDeckFromPrecon` writes no picks. Deck printings then picks from held copies as
   for any deck, and S1's `picked from the copies you hold` stays true. Settled by the R2 approval; noted
   because the import does differently.
8. **eng-resolvable · Shared rule, twin key, figure (G2, G3, G4).** Taken as proposed: shared = same commander
   oracle ids and at least 75% of the precon's non-basic oracle ids in the deck's current list, computed at
   read; twins grouped by identical (oracle id, count, commander) multisets with the plain name as
   representative; the denominator is distinct mapped non-basic oracle ids, commanders included, basics by
   type line. The plan measures the 75% on staging (Hugh's six HD Tune decks match, a shared commander with a
   different list does not) before it is a constant.
9. **eng-resolvable · Caching and the list query (G5).** `/decks/precons` reads `collection_items` and every
   deck's list, so it is a `cachePageForUser` route with `check:list-cache` covering its tables. The /decks
   line's `185 decklists · newest …` is catalog data, keyed on the catalog generation, so the precon ingest
   must stamp `catalog_refreshes` like the other ingests. L4 means the precon tables are empty or unreadable,
   not that MTGJSON is down.
   The /decks line reads those same tables, and STATES L4 keeps the door lines standing when the list cannot
   be read, so its summary loader is failure-tolerant: a failed or empty read keeps the line and drops its
   meta (`Commander precons` alone at 900, `Precons` alone at 390), and never fails /decks. The line goes
   only when the switch is off (P4). `/decks/precons` then renders L4.
10. **eng-resolvable · About entry shape (G7).** As in the cart audit: `keys` for `keyLines`, a required
    `width`, the specimen becomes a figure in `src/components/about/`, `switch: 'PRECONS_ENABLED'` needs a new
    `AboutSwitch` member. `ABOUT_VERSION` is 14 today; the entry takes the next free number when its PR
    lands, not a pre-assigned 17. Caption and keys go through /prose-pass.
11. **eng-resolvable · Copy file placement.** `createPicker.subDoors` / `subPrecon` belong in
    `addPanelCopy.createPicker` (`decks-builder.ts`), and `cartTitlePhone` / `cartMetaPhone` in the cart's copy
    file, not in `precons.ts`.
12. **copy-review · Strings to settle.** Every string is a placeholder by Design's own note. Flagged so far:
    `licence` twice in the About credit (US English: `license`); the date form in `newest 2 Oct 2026`;
    `arrival.body`'s "the 11 you don't are in Shopping", which is true but Shopping can hold more (a card owned
    but spoken for by a committed deck is also there, `isShoppingCard`), so the strip's figure and the
    Shopping count can differ on arrival. No `tick` strings anywhere; selection copy, if G6 is ever drawn, is
    select / unselect.

## Errata (Design's files, for the next round; not edited here)

Raised in review round 1 (Copilot, 2026-10-11). The handoff is Design's record, so these are corrections
the build follows, not edits to the drawing.

| File | Says | Build follows |
|---|---|---|
| `design-tables/precons.md` (Route: /decks/precons, URL row) | `replaceState` as `decks-view` | `mirrorUrl` (`src/lib/url/mirror.ts`), which is what `decks-view` actually uses (AGENTS.md, "Writing the address bar without navigating") |
| `The 99 - Precons (R2).dc.html`, `README.md` R2 change 2, `STATES-precons.md` R2 deltas, `design-tables/precons.md` | R1's stacked phone lines cost +123px; R2's single cell costs +60px | The frame's own values give R1 14 + 56 + 8 + 56 + 12 = 146px and R2 12 + 52 + 4 = 68px whether one or two cells draw. R2's two-cell geometry is what ships either way, so nothing built changes; the build measures the real fold on staging (tile start against the tab bar's top at 390 × 844) rather than quoting either figure |

## Decisions made here (only one answer defensible)

- Build from R2; R1 files are history (README status line).
- Arrival strip: the shipped strip's shell and one-trip param, not the drawn box (finding 3).
- The card total in copy is the kept count, never a literal 100 (finding 4).
- MTGJSON credit as a key line on the precon entry, notice verbatim (finding 5).
- No printing picks written on a precon start (finding 7, per Design's approved Q3 answer).
- Copy keys move to the files that own those surfaces (finding 11).
- The /decks precon line survives a failed summary read, meta dropped (finding 9).

## Questions for Hugh

None open. Both were answered on 2026-10-11 (above).


---

# R3 re-audit: built-from link and v0 (2026-10-11)

Audited against the brief's "Addendum: built-from link and v0 (2026-10-11)" (Hugh's three rulings, the six
engineering locks, open question 2, "What Design owns", the fixtures), the prompt Design received, and the
tree at `origin/main` a201f9048. Files: `HANDOFF-R3 · built-from link.md`, canvas
`The 99 - Precons R3 · Built-from Link.dc.html` (K1–K16), frame `Precons Link.dc.html`, STATES §K,
`design-tables/precons.md` §K, `precons-link · copy strings.ts`, and one key line in `about · precons.ts`.
Design's drop deleted this file; it is kept, and this section is added to it.

## Verdict: GREEN

Every ruling and lock is honored, every deliverable is drawn at 900 and 390, open question 2 is answered,
and every figure drawn is computable from stored data. Every finding below is engineering's to resolve in
the PR 6 plan or `/copy-review`'s to word; none needs a Design round. Design's two gaps are decided here
(findings 3 and 4), and Hugh can overrule either.

## Coverage

| Requirement | Where | Holds |
|---|---|---|
| Ruling 1: link from the deck page or the precon page; the 40% / 60% rule suggests, never links | K1, K2, K3, K5, K6, K7, K15 | yes; the suggestion only offers `Link it` (finding 3 for the one deck with no deck-page door) |
| Ruling 2: v0 is the precon's list, before v1; no version rewritten or renumbered | K10, K11, K12, K14 | yes |
| Ruling 3: unlink | K8, K12, K13 | yes |
| Lock 1: one link per deck; a CE twin links to its plain edition | K7 (`linking moves it here`), HANDOFF §1 | yes; a precon may carry several decks (K16), which the lock allows |
| Lock 2: suggestion computed at read; none on a linked deck | K4, K15, HANDOFF §2 | yes; the dismissal is client-side, nothing stored |
| Lock 3: v0 lowest, LAST in a newest-first rail, never reordered | K10, STATES K must-nots | yes |
| Lock 4: v0 is never current, sleeved, stamped, a `since` source, a pin, or a reason to call a deck committed | K10, K12, K14, HANDOFF §5, §6 | yes on every drawn surface; the `since` and pin readers are engineering's (finding 7) |
| Lock 5: unlink removes the link and v0 only | K13 (`Unlink` in the bone fill, not `--danger`) | yes |
| Lock 6: the deck is never rewritten | K1–K4 draw the decklist unchanged on purpose | yes |
| Open question 2: a linked brew's Versions tab | K14: yes, count 1, v0 alone, nothing current, still a brew | yes |
| Design owns: link control, suggestion + dismissal, linked state (deck, open precon, row), unlink + confirm, v0 row + v1's diff, two precons, two decks | K1–K16 | all drawn |
| Every frame at 900 and 390 | canvas renders each section twice (`hint-size` 900 and 390, `phone`) | yes, all 16 |
| Fixtures | K1 Eldrazi Unbound 73/85; K2/K11 Counter Intelligence 64/91, swapped; K15 Mutant Menace 41/85; K5 HD - Zombies vs Wretched Ranks 13/67, no suggestion | yes |
| No verdict word on a share | strings and frame | yes: counts only (`73 of its 85`, `73 shared`); the canvas's percentages are Design's notes, never drawn copy |
| Select / unselect, never tick | `pickPrecon.selectAria` / `unselectAria`, K6 | yes; no `tick` anywhere |
| US English | R3 strings | yes in R3; the R2 errata (`licence`) still stand |
| STATES and design-table rows | STATES K1–K16 + K1d, K3p, K6n; table §K, nine rows | yes (finding 9 for the gaps) |

**Spot-checked against the frame:** suggestion strip `border 1px var(--border-strong)`, `border-radius:10px`,
`--surface-rail`, `padding:11px 4px 11px 14px`, inset 22 / 16; Link button height `phone ? 44 : 36`; picker
radio 22px, `2px solid var(--accent)` on and `--border-dashed` off; picker rows `minHeight: phone ? 56 : 52`;
v0 divider mono 9.5px, `letter-spacing:0.14em`, uppercase, `--fg-faint`; against-v0 box dashed, radius 8;
v0 panel note `--surface-sunken`, dashed, radius 9, full width. All match the table. Every token the frame
reads is in `globals.css` except `--btn`, read as `var(--btn, var(--fg))`: the shipped `PrimaryButton` fill,
as the R1/R2 audit already noted.

## Engineering facts verified

- `precons` carries `file_name`, `name`, `set_code`, `release_date`, `twin_of` and `unmapped_count`;
  `precon_cards` carries `oracle_id`, `quantity` and `is_commander` (`src/db/schema.ts:2657`, `:2675`). So
  v0's name, set, `released Aug 2023`, commander(s), card count and mana value, and every share and kept
  count (distinct non-basic oracle ids against a deck's current list or v1's), are computable at read. The
  link column on `decks` does not exist yet; PR 6 adds it (lock 1).
- `VersionRail` marks `current: i === 0` and `initial={previous === null}`
  (`src/components/decks/version-history.tsx:272-273`). HANDOFF's "v0 is a third kind passed in, `current`
  stays over committed rows only" is required: with v0 as an ordinary row, a linked brew's only row would be
  `i === 0` and read as current.
- `VersionDiff` already draws the commander change (`commanderMoved`, `copy.commanderChange`), the mana-value
  box and `todayNote` (`src/components/decks/version-diff.tsx:355-517`), so K11's swapped commander needs
  nothing new, as Design says.
- The brew test HANDOFF §6 cites at `builder-shell.tsx:210` is the `versions` prop's doc at `:211-214` on this
  tree; the line moved, the claim holds.
- `ArrivalStrip` (`src/components/decks/arrival-strip.tsx`) and `useLocalFlag(key)`
  (`src/components/decks/use-local-flag.ts:23`) exist as the strip shell and the per-browser dismissal.
- `ABOUT_VERSION` is 14 (`src/lib/copy/about.ts:61`, `about.version.json`). `AboutEntry.keys` is "0–4 lines".
- Open PRs touching precons: #1484 "Precons PR 3: an open precon, /decks/precons/[fileName]" (titles read
  only). PR 4 and PR 5 are not open. R3 is PR 6 and lands after them: it adds `Link a deck` beside PR 4's
  Start button and replaces O1's built sentence on PR 3's page, so it edits their surfaces later rather than
  conflicting with them in flight.

## Findings

1. **eng-resolvable · About entry: no `ABOUT_VERSION` bump, `since: 14`.** The entry is switch-gated on
   `PRECONS_ENABLED`, and a switched entry is seen by its id, so turning the switch on is what announces it.
   `since` equals the current `ABOUT_VERSION`, 14, not the handoff's 17. This supersedes R1/R2 finding 10's
   "the next free number". R3's key line rides in the same entry; it needs no bump of its own.
2. **prose-pass · Six key lines against a contract of four.** R3 adds a fifth line to `about · precons.ts`,
   and R1/R2 finding 5 already put the MTGJSON credit in as a key line, so the entry carries six against
   `keys`' "0–4 lines". `/prose-pass` cuts the entry to four (the CE line and the printings line are the
   likeliest to merge or move into the caption), keeping the R3 line's two facts: a link starts Versions at
   v0, and nothing in the deck changes.
3. **decided · G-R3-1: an unlinked brew with no suggestion links from the open precon only.** Ruling 1 offers
   the deck page or the precon page; for this one case the precon page is the door. The alternatives cost
   more than the case: a Versions tab on every brew is the empty tab Versioning ruled out, and a standing
   header control is noise on the fifteen of Hugh's 21 decks that are not precon builds. A brew started from
   a precon is linked by PR 4 and gets K14's tab, so the case is a brew built by hand that shares under 40%
   with the same commander and under 60% with any. Hugh can overrule.
4. **decided · G-R3-2: the dismissal is per browser**, keyed `deckId + fileName` through `useLocalFlag`, as
   Design recommends. It is the shipped precedent (the arrival strip and the deck sort), it writes nothing,
   which keeps lock 2's "never stored" literal, and Versions' foot row stays as the way back.
5. **eng-resolvable · The suggestion strip takes the shipped `ArrivalStrip` shell.** HANDOFF §2 and table §K
   draw it as R2's rounded box (radius 10, `--border-strong`, inset 22 / 16). R1/R2 finding 3 already settled
   that the arrival strip is built in the shipped full-width band (`--surface-rail`, `border-bottom`), so two
   strips under one header would otherwise differ. The suggestion builds in that band, holding its meta line,
   `Link it` (36 / 44) and ✕ (44); K15's two rows stack inside it. Frame mismatch: the shipped shell wins,
   for the same reason as R1/R2 finding 3.
6. **eng-resolvable · "100 cards" is hard-coded twice.** `confirm.facts.v0` and `historyOriginCopy.originMeta`
   say `100 cards`. HANDOFF's own "Not done" says a precon with an unmapped card lists 99, so both take the
   card count from `precon_cards` (the R1/R2 finding 4 rule), never a literal.
7. **eng-resolvable · Readers lock 4 names that no frame can show.** The plan's answer to open question 1
   lists every reader and proves v0 is skipped by each: `newestVersion`, the claim model, `versionLiveAt` and
   game stamping, Home's `max(committed_at)`, the commit's `since` inheritance (a linked brew's first commit
   must inherit from nothing, so every `since` falls through to v1's `committed_at`),
   `pinAnalysisToVersion` / `isNewestVersion`, the synopsis pin, and the brew/committed tests. The drawn
   surfaces (K10, K12, K14) already keep v0 out of `current`, the accent and the committed status.
8. **copy-review · `originBody` has no brew form.** `v0 is <precon>’s list as the box sells it. It’s history
   only: this deck is sleeved as <vN>.` has no `vN` on a linked brew (K14), and K14 does not draw v0 opened.
   A brew's v0 note drops the sleeved clause (for example, ending at `It’s history only.`). Also for
   `/copy-review`: `73 of its 85 cards are still in it` (K8), where `its` is the precon's and `it` the deck,
   and the `the box lists it` / `the box sells it` pair, which should be one phrase.
9. **eng-resolvable · Undrawn states follow R2.** STATES has K3p for link pending and failed; unlink's
   `Unlinking…` and `That didn’t unlink. Try again.` follow the same S1d/S1e row, in the K13 dialog. Table §K
   has no rows for K8's `Unlink` beside the built sentence, K9's row clause, K14's brew line or K15's two
   rows; each reuses R2's own-box, row-line and strip-row values.
10. **superseded · R1/R2 finding 8's shared rule.** The 75% same-commander rule there is replaced by ruling 1's
    40% with the same commander or 60% with any, for the suggestion and, per K9, for the row and open-precon
    shared line. The plan still measures the thresholds on staging before they are constants.
11. **note · The approval line.** README and HANDOFF say R3 was "approved (Hugh, 2026-10-12)" with three R1
    notes applied. The date is after this audit, and nothing on record here shows the approval; it is
    Design's statement and is carried as such. The three notes it names (no header line, the basics note
    dropped, the v0 note full width) are drawn.

## R3 errata (Design's files, for the next round; not edited here)

Raised in review round 1 (Copilot, 2026-10-11). The handoff is Design's record, so these are corrections the
build follows, not edits to the drawing.

| File | Says | Build follows |
|---|---|---|
| `Precons Link.dc.html` (K12, the v0 note) | `…as the box sells it, It’s history only` (comma) | `precons-link · copy strings.ts` `originBody`, which ends the sentence at `sells it.`. Frame mismatch: the copy strings win, and `/copy-review` words the line (finding 8). |
| `README.md` (R3 status line) | G-R3-1 and G-R3-2 "still open for Hugh" | Both are decided here (findings 3 and 4); Hugh can overrule either. |
| `design-tables/precons.md` §K (Suggestion strip row) and HANDOFF §2 | radius 10, `--border-strong`, inset 22 / 16 | The shipped `ArrivalStrip` band (`src/components/decks/arrival-strip.tsx:34-35`: `--surface-rail`, `border-bottom`, full width), per finding 5 and R1/R2 finding 3. Here the shipped component wins over the table. |

## Decisions made here (only one answer defensible)

- `since: 14` and no `ABOUT_VERSION` bump (finding 1).
- G-R3-1: the open precon is the door for an unlinked brew with no suggestion (finding 3).
- G-R3-2: dismissal per browser through `useLocalFlag` (finding 4).
- The suggestion strip builds in the shipped `ArrivalStrip` shell (finding 5).
- Card counts in R3 copy come from `precon_cards`, never a literal 100 (finding 6).

## Questions for Hugh

None blocking. Findings 3 and 4 are decided on precedent and can be overruled.

# R4 re-audit: tiles and Card view (2026-10-12)

Audited against the prompt Design got (`boards/design-prompt-precons-tiles.md`: Hugh's rulings of
2026-10-12, questions 1 to 6, the deliverables and constraints), the R4 files
(`HANDOFF-R4 · tiles and card view.md`, canvas `The 99 - Precons R4 · Tiles and Grid.dc.html`, frame
`Precons Tiles.dc.html`, STATES §T and §G, design table §T and §G, `precons-tiles · copy strings.ts`), and
the tree at `origin/main` 124e78d4c, which holds PR 3 (#1484), PR 4 (#1498), PR 5 (#1506), 6a-1 (#1509),
6a-2 (#1512) and the printing fix (#1501). 6b (v0 in Versions) was read from its local branch, not yet
open. Counts are measured on **staging**.

**Landing note.** Design's drop was a full copy of the folder made on an older base, and it deleted this
file and the R3 errata in it. Only R4 landed: the four new files, and the R4 hunks of `README.md`,
`STATES-precons.md`, `about · precons.ts` and `design-tables/precons.md` (each of which differed from `main`
by R4 additions alone). This file is kept.

## Verdict: GREEN

All six questions are answered and every deliverable is drawn at 900 and 390. Nothing drawn needs data the
list or the open precon does not already ship. The findings are engineering's to resolve in the plan, plus
copy for `/copy-review` and the About line for `/prose-pass`. One confirmation for Hugh (G-R4-4) does not
block: Design recommends what Hugh leaned toward.

## Coverage

| Prompt item | Where | Holds |
|---|---|---|
| Q1 · rows or tiles as default, with reasoning | HANDOFF §1: tiles; rows one press away and remembered | yes (G-R4-4 is the confirmation) |
| Q2 · the switch | HANDOFF §2: the shipped `ViewToggle` well (`≣` Rows · `▦` Tiles), not /decks' `Tiles · Stats`, with the reason; 900 in the chassis after sort, 390 on the search row | yes |
| Q3 · what a tile carries | HANDOFF §3, STATES T3a–T3g: commander card art, `you own N of M`, name, pips + `SET · Mon YYYY`, a foot for shared / linked decks, twin and unmapped | yes |
| Q4 · twins and partners | HANDOFF §4, T3d, T3e | yes |
| Q5 · density at 390 and 900, filters and sort above | HANDOFF §5: 2-up / 4-up, chassis, result line and L2 band as R2, year heads as rows | yes |
| Q6 · the open precon's grid | HANDOFF §6, G0–G3: List stays default, the deck's well on the list-note line, owned dot + `not owned`, basics one dashed tile per name, R3 link and v0 controls above the switch | yes |
| Frame: tile view, default | canvas `tiles` (T1) | 900 and 390 |
| Frame: the switch | canvas `rows` (T2), well in both | 900 and 390 |
| Frame: tile states (high, low, linked, twin, partners, missing art) | canvas `board` (T3a–T3f) | 900 and 390 |
| Frame: empty-collection band over tiles | canvas `tilesEmpty` (T4) | 900 and 390 |
| Frame: open precon in Grid (owned and missing, basics, commander first) with its switch | canvas `openCard` (G1), `openList` (G0) | 900 and 390 |
| STATES delta and design-table rows | STATES §T (T1–T6), §G (G0–G3), must-nots; table §T (16 rows), §G (10 rows) | yes |
| Reuse `deck-card-tile.tsx`'s anatomy | `TILE_SHELL`, `TILE_ART_RATIO`, `TILE_ART_CLIP`, `CardTileCaption` + `CARD_TILE_CAPTION_SUB_H` | yes; every name exists on `main` (finding 4 for the read-only tile) |
| Scryfall corner matte (radius ≥ 3.1% of width) | shell 9/10px: art 174px at 390 (5.4px needed), 205px at 900 (6.4px); partner cards 5px on ~114/135px (3.5/4.2px) | yes, every image box clears |
| No verdict word on a share | T3a/T3b drawn identically; must-nots; `aria` says `You own N of M of its cards` | yes |
| Select / unselect | no selection is added; the strings file says select / unselect if any is | yes |
| US English | strings: clean. Canvas note `recognise`, HANDOFF prose `status colour` | errata below; neither is drawn copy |
| About key line, switch-gated, `since: 14`, no bump | `about · precons.ts` adds one key line and a `phone` sentence | yes (finding 7 on the count of lines) |

**Spot-checked against `Precons Tiles.dc.html`:** tile radius `R = phone ? 9 : 10`; grid
`repeat(${cols},minmax(0,1fr))`, `cols = phone ? 2 : 4`, gap `phone ? 10 : 12`, `alignItems: stretch`;
shell 1px `--border` on `--surface`; art `aspectRatio 63 / 88`, bottom radius `R`, `--surface-sunken` plate;
caption meta mono `phone ? 9 : 9.5`, `you own` `--fg-faint` + figure 600 `--fg`; name `phone ? 12 : 13`;
caption `minHeight: phone ? 70 : 65`; foot line `minHeight: phone ? 44 : 34`, padding `5px 9px` / `5px 10px`;
foot deck `phone ? 11.5 : 12`, underline offset 3 at 55% accent; foot meta mono 9.5 `--fg-muted`; partners
`width 66%`, `left 5% top 4%` and `right 5% bottom 4%`, radius 5, the second ringed `0 0 0 1px
--surface-sunken`; no-art mono 9 `--fg-locked` `no card image yet`; well `marginLeft: phone ? 0 : 2`;
basic tile `×15` `--fg-body` + `basic · not counted` `--fg-faint`, sub `CMM · first of 3 arts`. All match
the table.

## Engineering facts verified

- **Staging, 2026-10-12:** `precons` holds 197 rows, 16 with `twin_of`, so the list draws **181** tiles,
  not 197 (G-R4-1). 5 listed precons have two commanders (Design's 5). 0 listed commanders lack art through
  `preconArt`, so T3f is a guarded state with no case today. 398 (precon, basic) pairs list the same
  basic more than once, so `first of N arts` has real data behind it (G-R4-2).
- **No new wire field.** `PreconCommander` already carries `imageUri` (`src/lib/precons/list.ts:40`), set
  through `preconArt` (`list-read.ts:29`, the precon's own printing since #1501), for every commander
  including a partner's second. Tiles cost image loads, not payload.
- **Image weight.** `preconArt` resolves to Scryfall `normal` (`transform-printings.ts:215`); three
  measured at 83, 89 and 97KB. All 186 (181 + 5 second partners) would be ~16MB.
- **The rows already pay it.** `CommanderThumb` draws its art as a CSS background
  (`src/components/ui/commander-thumb.tsx`, `cssUrl(imageUri)`), which a browser fetches for every rendered
  row whether on screen or not: the shipped rows view asks for all ~186 `normal` images today. That is the
  exact cost the deck tile's own comment records (`deck-card-tile.tsx:262-265`).
- **The lazy rule.** `/collection`'s grid draws `HydratedImg` (`ui/hydrated-art.tsx:73`) with
  `eager={i < GRID_EAGER_TILES}` (`collection/grid-view.tsx:48`, 4); everything else waits for hydration
  and 600px of the viewport. A plain `loading="lazy"` img in server HTML starts on parse, which is what
  held `/collection` at ~20s on the slow profile (AGENTS.md).
- `ViewToggle` takes `compact` (`ui/view-toggle.tsx:46`). `viewToggleCopy` has `deck` (List / Card) and
  `collection` (Rows / Grid) (`lib/copy/card-surfaces.ts:61`); a `precons` pair is new. The deck page's
  stored key is `the99:deck-view` (`decks/group-toggle.tsx:36`), so `the99:precons:openView` is separate as
  HANDOFF §6 asks.
- `useStoredView` takes an opt-in cookie `mirror` so the server draws the stored choice
  (`ui/use-stored-view.ts:30-41`); the precon order uses it without one (`precon-list-view.tsx:50`).
- `DeckCardTile` has no read-only form: it takes `deckId` and calls `useDeckMutation`,
  `useRemoveOptimisticCard`, `useLockCards` and `usePendingChange` (`decks/deck-card-tile.tsx:64-90`).
  `DecklistGroup`'s card branch passes `deckId` straight to it (`decks/decklist-group.tsx:110-118`). The open
  precon already renders `DecklistGroup` in its read-only list form (`precons/open-precon-view.tsx:185,200`).
- The deck's card grid is `grid-cols-2 gap-[12px] md:grid-cols-[repeat(auto-fill,minmax(178px,1fr))]
  md:gap-[20px]` (`decklist-group.tsx:110`); at the 900 frame's content width that gives 4 columns, the
  frame's count, with gaps 12/20 against the table's 10/12.
- `byCard` merges a card's printings and keeps the first (`open-precon-view.tsx:51-58`), so the arts count
  is dropped there today, as G-R4-2 says.
- The shipped row's foot strings are `copy.row.built` / `builtShared` / `twin` / `unmapped`
  (`lib/copy/precons.ts:51-60`); the twin line reads `also sold as a Collector’s Edition · same list`.
- The About entry on `main` has four keys (`lib/copy/about.ts:1046-1050`), `since: 14`, switch
  `PRECONS_ENABLED`. 6b, in flight, moves the Collector's Edition key into the caption and adds the v0
  link line, so it stays at four.

## Findings

1. **eng-resolvable · Tile art loads through `HydratedImg`, first 4 eager.** Each `PreconTile` draws its art
   as an `<img>` through `HydratedImg`, with `eager={i < GRID_EAGER_TILES}` imported from
   `collection/grid-view.tsx` rather than a second constant. Never a CSS background (it fetches all ~186) and
   never a bare `loading="lazy"` in server HTML (it starts on parse). 4 is the first screen at both widths:
   one 4-up row at 900, two 2-up rows at 390. `probe:payload`/`measure:load` should read the tile view's
   cold load before and after, at both widths.
2. **eng-resolvable · The stored view mirrors to a cookie.** The list draws tiles or rows on the server, and
   the two differ in height and in what art they request. Without a mirror a reader who stored rows gets
   tiles (and 4 eager images) on the server pass, then a flip. `useStoredView(PRECON_VIEW_KEY, …, { cookie,
   serverValue })`, read in the page, as `/collection` does. The open precon's view needs none: List is the
   default and is what the server draws.
3. **eng-resolvable · Rows already fetch every image (a shipped cost, not R4's).** `CommanderThumb`'s CSS
   background means `/decks/precons` in rows asks for ~16MB of art today. Tiles as the default (finding 1)
   avoid it for most readers; the rows view keeps it. The plan names a follow-up for `CommanderThumb` on
   this list, so it isn't quietly dropped. Not built here.
4. **eng-resolvable · The read-only tile is a new form of `DeckCardTile`, not a prop flip.** It must not call
   the mutation, optimistic, lock or draft hooks, which assume a deck. Two clean shapes: a `readOnly` branch
   that skips them, or a `ReadOnlyCardTile` built from the shared shell, art box and `CardTileCaption`.
   Either way the art is `card.imageUri` (`preconArt`, the precon's printing) and the press opens card
   details on that printing (O6, #1501), as the list's rows do now.
5. **decided · The open precon's grid is the deck's grid as shipped.** `DecklistGroup`'s card branch, one
   grid declaration, with its gaps (12 at 390, 20 at 900) rather than the table's 10 / 12. The prompt asks to
   reuse the deck's grid, and a second declaration would drift. Column counts agree (2 / 4 at the frame's
   widths). The list's tile grid (§T) is new and follows the table.
6. **decided · G-R4-2: basics carry their arts count.** `byCard` counts the rows it merges for a basic and
   passes it as `arts`; the sub reads `CMM · first of 3 arts`, or the plain printing at one art. The data is
   there (398 pairs on staging) and the change is local to the open precon.
7. **prose-pass · The R4 key line is a fifth against a contract of four.** With 6b the entry holds four
   keys. The R4 line (`Precons show as tiles…`) merges with an existing line or moves into the caption's
   first paragraph, which already says where the list lives. `since` stays 14, no bump, no new entry. The
   `phone` sentence's `Tiles sit two across` is fine as drawn.
8. **decided · G-R4-3: the About specimen becomes `PreconTile`.** The specimen shows the surface as a reader
   first meets it, and with tiles the default that is a tile. The fixture keeps Eldrazi Unbound, 74 of 85.
   Hugh can overrule.
9. **copy-review · The tile's foot strings differ from the row's.** The tile's `footTwin` drops the row's
   `· same list`, and `footShared` drops `your deck`. Both are placeholders; `/copy-review` decides
   whether the tile reuses `preconsCopy.row` or carries its own short forms at 174px. Also new: the
   `precons` pair for `viewToggleCopy`, `noArt` (the deck tile's own is `no art on file`), `tileNotOwned`,
   the two list notes, and `aria`.
10. **eng-resolvable · Unlinked decks in a tile take one line each.** The shipped row draws R6's single
    `your decks A and B` line when nothing is linked (`precon-row.tsx:74-84`). HANDOFF §3 gives the tile one
    line per deck in every case, which suits 174px. The tile does that; the row is unchanged.
11. **note · No conflict with shipped link and printing behavior.** Tile and Card view art is `preconArt`,
    the precon's printing (#1501). The link, `Link a deck`, `Unlink`, Start and the own box sit above the
    open precon's switch and do not move (STATES must-not); the tile's foot reads the same `built` list the
    row reads after 6a-1/6a-2. 6b touches Versions and the About caption only; R4's About edit lands after it
    and rebases on its four keys.

## R4 errata (Design's files, for the next round; not edited here)

| File | Says | Build follows |
|---|---|---|
| `HANDOFF-R4` header and §2, README R4 line, G-R4-1 | 197 tiles, 16 twins | 181 tiles, 16 twins, measured on staging. The page draws `rows.length`, so nothing is built from the figure. |
| `HANDOFF-R4` G-R4-1 | "the brief's measurement was 197 listed, 12 twins and 185 rows" | Staging today: 197 entries, 16 twins, 181 listed. |
| canvas `The 99 - Precons R4 · Tiles and Grid.dc.html`, intro | `recognise` | `recognize`. Canvas note, never drawn copy. |
| `HANDOFF-R4` §3 | `no status colour` | `color`. Prose, never drawn copy. |
| `design-tables/precons.md` §G grid | gap 10 / 12 | The deck grid as shipped, 12 / 20 (finding 5). Here the shipped component wins over the table. |
| `about · precons.ts` | `since: 17`, five key lines plus R4's | `since: 14`; four keys, per 6b and finding 7. |
| `README.md` R4 line | G-R4-1 to G-R4-4 "open for Hugh" | G-R4-1 measured, G-R4-2 and G-R4-3 decided here (findings 6, 8); G-R4-4 is Hugh's confirmation below. |

## Decisions made here (only one answer defensible)

- Tile art through `HydratedImg`, `GRID_EAGER_TILES` eager (finding 1).
- The list's stored view mirrors to a cookie (finding 2).
- The open precon reuses the deck's grid as shipped (finding 5).
- Basics count their arts in `byCard` (finding 6, G-R4-2).
- The About specimen follows the default, `PreconTile` (finding 8, G-R4-3); Hugh can overrule.

## Questions for Hugh

1. **G-R4-4 · Tiles as the list's default?** You leaned tiles; Design recommends tiles, with rows one press
   away and remembered per browser. A yes is the build as drawn. A no flips the default, the URL value
   (`?view=tiles`) and the About line, and nothing else.
