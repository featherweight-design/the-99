# READINESS audit: Commander precons (R1/R2 audit, 2026-10-11)

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

## Decisions made here (only one answer defensible)

- Build from R2; R1 files are history (README status line).
- Arrival strip: the shipped strip's shell and one-trip param, not the drawn box (finding 3).
- The card total in copy is the kept count, never a literal 100 (finding 4).
- MTGJSON credit as a key line on the precon entry, notice verbatim (finding 5).
- No printing picks written on a precon start (finding 7, per Design's approved Q3 answer).
- Copy keys move to the files that own those surfaces (finding 11).

## Questions for Hugh

None open. Both were answered on 2026-10-11 (above).
