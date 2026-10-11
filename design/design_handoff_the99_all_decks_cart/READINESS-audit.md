# READINESS audit: Shopping for all decks

R1 audit, 2026-10-11. Audited against `docs/superpowers/design-briefs/2026-10-11-all-decks-shopping-cart.md`
(Hugh's four rulings, engineering's eight locks, the eight open questions, Fixtures) and against `main` at
`673b657fc`. The canvases were read as source (scene data and props in `All Decks Cart.dc.html`, the section list
in `The 99 - All Decks Cart (R1).dc.html`); nothing under `design/` is imported.

## Verdict: GREEN

Updated 2026-10-11 with Hugh's answers to the four questions the first pass raised (below). That pass was YELLOW
on G1 and G11. Both are now ruled, and nothing left needs Design.

The drop honours all four rulings and the eight locks. Hugh amended two of the locks: lock 7, by the S1b chooser
(his R1 LGTM, widened to brews below), and lock 5, by the split-link answer to Q6. Every deliverable the brief
lists is drawn at 900 and 390. That covers the fixture cart, the Sol Ring line as listed, being bought and
bought, all selected, some and none, the empty and thin states, checkout and return, the STATES rows, the design
table and the About entry. The link-size measurement engineering owed (lock 5) is done (finding 1).

## Hugh's answers (2026-10-11)

1. **G1, deck names on a cart line: the FULL deck name.** `3 · HD - Gishath, HD - Kratos, HD -Thorin`. The
   canvases draw short names (`short:` in the scene data). The build uses the full name everywhere a deck is
   named: the decks line, the confirm's deck list and the receipt. The string swaps its value, Design already
   wraps it and never truncates it, so there is no redraw.
2. **G11, when fewer copies are bought than decks want, the player CHOOSES, brews included.** The S1b chooser
   extends to brews. **Build lock 9**, recorded here for the plan: `assignCopyFor` and the claim model accept a
   `card_assignments` row for a deck with no committed version. Today they refuse one
   (`src/lib/decks/assign.ts:85-91`), and a brew claims softly off its live list. This changes the claim model
   for the whole app, not just the cart. **Blast radius**, each surface needing its own tests and a probe on a
   brew that holds an assignment:
   - availability: `claimModel`, `availabilityState`, the pills and the card marks
   - Deck printings
   - Shopping: `isShoppingCard`, `loadDeckBuyRows`, the roll-up, the tile figure and Home's Commitments
   - I got it: `markBought`, the held slot and the receipt
   - the cart

   ContestedCardRow's `draftNote` and `draftNoteMany` sentences ("only committed decks can be given a copy")
   become false once brews can be chosen, so they go to `/copy-review` with the build. S1c (brews drawn inert) is
   retired.
3. **Q6, a cart over about 1,150 lines: split into several Mana Pool links, labeled `part 1 of 2`.** Decided for
   this round: CartCheckout's link slot draws one `ExternalLink` row per part, stacked in the shipped 44px row
   shape. Each part is cut so its URL is at most 32,000 characters (finding 1), and a merged line is never split
   across parts. The label is `exportLinkOutCopy.shopping` plus the part, worded by `/copy-review`, and
   `checkout.sends` names each part's line count. Repeating a drawn row adds no layout, and no cart on staging
   reaches this state (Hugh's is 291 lines), so it does not go back to Design. K3 becomes this state.
4. **Q1, unselected decks stay unselected for this visit only**, as drawn.

## Vocabulary: select / unselect

Hugh asked Design to stop using tick and untick. The cart's verbs are **select** and **unselect**, everywhere.
No tick or untick string appears in any file of the drop except `support.js`, which was not searched; this
audit's text now uses select and unselect. Design's copy uses **`Deselect`**, which is neither. These strings go
to `/copy-review` to become `Unselect`:

- `selections.deselectAll`, `Deselect all` (`all-decks-cart · copy strings.ts:39`, `All Decks Cart.dc.html:581`,
  STATES A2 and the DeckSelect row of the design table)
- the About caption, `Deselect a deck to leave it out of this visit’s cart.` (`about · all decks cart.ts:14` and
  the AB section of the R1 canvas)

README, STATES and the R1 canvas notes also use `deselected` and `Deselecting never writes`. That is reference
prose, not shipped copy, so it stays as Design wrote it.

## Rulings and locks, checked

| Item | Drop | Result |
|---|---|---|
| Ruling 1: an entry on `/decks`, every deck missing cards starts selected, brews included, complete decks absent | A1 entry line, A2 7 of 7 selected (3 brews), the 14 complete decks absent, A3/A4 unselect | holds |
| Ruling 2: one copy per deck, `2 · Gishath, Aang` | `list.decks(qty, names)`, Sol Ring `3 · Gishath, Kratos, Thorin`; names wrap, never truncated | holds (short names are G1) |
| Ruling 3: one Mana Pool link-out, reusing the per-deck checkout and its prices | CartCheckout = PriceStrip's box + `exportLinkOutCopy.shopping`; one `manapoolAddDeckUrl` (K2) | holds |
| Ruling 4: bought cards come back through I got it | S1–S4 extend GotItConfirm / receipt / held slot | holds (G2) |
| Lock 1 / 6: the deck's quantity and price are the roll-up's, so the figures agree with the tile | Select figures and totals are roll-up sums. A3 $466.52 = $843.99 − Omnath − Mutant Menace, checked | holds |
| Lock 2 / 3: unfinished = has a roll-up row; basics and proxies never appear; unowned commander is a row | E2 commander-only deck; commanders first | holds |
| Lock 4: an owned card can be a cart line, said without hiding it | `you own 17 · all 17 in other decks`, `--fg-faint`, no verdict word, no warning colour (checked in the source: `--warning` appears only on the shipped buy tag) | holds (finding 4) |
| Lock 5: one link over merged lines | one link, K3 not drawn | holds; measured below |
| Lock 7: a purchase's effect is read again, never assumed | S3/S4 receipts read from the roll-up; S6 names the decks the read covers | holds. **S1b's chooser writes `card_assignments`**, an explicit override of seniority Hugh approved in the R1 LGTM; G11 |
| Lock 8: unselecting is a view, never a write | Selections are view state for this visit only, and `selections.note` says so; Must-nots repeat it | holds |

## Open questions, accounted for

Q1 this visit only (engineering's preference). Q2 both views, by card by default. Q3 call 6. Q4 one confirm, the
decks listed. Q5 the line stays with `N added this visit`. **Q6 was left to Hugh, K3 not drawn**, as the brief
asked; Hugh has since answered it (split links, answer 3). Q7 yes (E2). Q8 yes, `?deck=<id>` (finding 6). All eight are answered or explicitly left.

## Findings

1. **eng-resolvable · Link size, MEASURED.** Measured read-only on staging: `loadDeckBuyRows` for the fixture
   account, merged by card name, then put through `manapoolAddDeckUrl`. 7 decks, 307 copies, **291 lines, 6,007
   bytes of text, 8,051-character URL**, so the brief's estimate holds. Then a GET of that URL to
   `manapool.com/add-deck` returned **200, and all 291 card names appear in Mana Pool's server-rendered
   response**, so the whole list decodes on their side. The ceiling is between **32,099 characters (200) and
   40,115 (414 URI Too Long)**, measured by padding the payload. At about 27.7 characters per line that is roughly
   1,150 lines, four times Hugh's cart. **Engineering owes:** (a) a `links.test.ts` case for a 291-line cart and a
   splitter that cuts the cart into parts of at most 32,000 characters each (Hugh's answer 3), with a test;
   (b) one manual press in a browser before launch to confirm Mana Pool's add step takes all 291 lines into its
   mass entry. The GET proves transport and decoding, not their client's add step. No cart is bought.
2. **ruled (was needs-Hugh) · G1 deck short names.** Full deck names. See Hugh's answer 1.
3. **ruled (was needs-Hugh) · G11 the S1b chooser for brews.** `assignCopyFor` refused brews, and all three Sol
   Ring decks are brews, so S1b could not happen on the fixture. Hugh ruled that brews are choosable. Build lock 9,
   with its blast radius, is in Hugh's answer 2.
4. **eng-resolvable · Owned fact assumes held = owned.** `list.owned(owned)` prints `all N in other decks`
   on the reasoning that every owned copy is held elsewhere whenever the card is a buy row. That fails for a
   deck that needs more than one copy and holds some of its own (Relentless Rats and the like). Staging has no
   such line today: the largest merged quantity is 3, and every row is 1 copy. **Decision:** engineering computes
   the copies held by decks not on the line and passes both counts. The `all N` form is used only when they are
   equal. The two-number wording goes to `/copy-review`.
5. **eng-resolvable · G4 line prices.** `loadShoppingRollup` already prices every row through its deck's pick
   (`shopping-rollup.ts`, `priceFor`), then discards the rows. **Decision:** the cart's loader returns those
   priced rows from the same read, so line totals add up to the deck figures by construction rather than by a
   probe. A probe still asserts it.
6. **eng-resolvable · The tile link reaches committed `To buy` tiles only.** `deck-card.tsx` draws `N to buy ·
   $X` only for the `To buy` status, and a brew is always `New` or `Draft` (`status.ts:129`). So Gishath, Kratos
   and Thorin, 169 of the 307 copies, have no tile link, and neither does a committed deck that is Building, Over
   or Unresolved. The A1 frame draws exactly this (only Omnath and Counter Intelligence carry the link). The
   entry line is the way in for everything else, as G1a says. Nothing to redraw. The plan states it so no one
   files it as a bug.
7. **eng-resolvable · G2 multi-deck `markBought`.** One press id and one absolute collection write over N decks,
   with `requireMember` checked per deck. A deck that dropped the card returns `stale` and the line is read
   again, as today. A new source `shopping:cart` also means extending undo's `ignoreDeckId` match
   (`src/lib/collection/write.ts:575`), which compares against `shopping:<deckId>`, and History's deck line.
   The confirm's default printing is the pick the decks share, else the first deck's.
8. **eng-resolvable · G5 failed price read.** For T2 (link kept, figure dropped), the cart has to load buy rows
   even when `loadPrices` fails. Today `loadShoppingRollup` reads both in one call, so a price failure there loses
   the rows too. Split the read in the cart's loader.
9. **eng-resolvable · G7 a line half sold out.** **Decision:** the tag shows the priced copies' sum. The unpriced
   copy counts against the page's `pricedClause`, as it does in PriceStrip. A missing price never adds zero
   (`price.ts`). Tag wording is unchanged from the shipped BuyTag.
10. **eng-resolvable · G3, G6, G8, G10.** `ALL_DECKS_CART_ENABLED` plus an `AboutSwitch` member. A held-slot
    provider keyed `cart`. `cachePageForUser` on `/decks/shopping`, with `pnpm check:list-cache` computing its
    tables (the owned counts read `collection_items`). Return detection on `visibilitychange` after the press.
    All as Design proposed.
11. **eng-resolvable · About entry shape.** The proposed entry uses `keyLines`, `specimen` and `phone`. The
    shipped `AboutEntry` (`src/lib/copy/about.ts`) takes `keys` and a required `width`, and its figures live in
    `src/components/about/*-figures.tsx` keyed by id. Map: `keys` ← `keyLines`, `width: 'inset'` (as `buy-tag`);
    the specimen becomes a figure. The caption and key lines are long-form prose, so they go through `/prose-pass`.
    UI strings go through `/copy-review`. `ABOUT_VERSION` 14 → 15 is a named plan task (no open PR takes 15
    today).
12. **eng-resolvable · Design table location.** The README asks for `design-tables/all-decks-cart.md` to be
    committed to `docs/superpowers/design-tables/`. This PR changes nothing outside the handoff folder, so the
    first build PR moves it there.

## Decisions made here (only one answer defensible)

Findings 4, 5, 7 (the stale rule and default printing), 8 and 9 are logic decisions made above. They are not
layout, and they are not copy wording: any wording they imply goes to `/copy-review`.

Also decided here: how Hugh's split-link answer is drawn (answer 3). Two of Design's own files now read against
Hugh's rulings. They are left as Design wrote them, and the build follows the rulings:

| Design's line | Superseded by |
|---|---|
| STATES Must-nots: `One link. No per-deck links, no chunked links, no clipboard fallback this round.` | Answer 3: split links over about 1,150 lines |
| README G11 / STATES S1c: brew options inert | Answer 2: brews are choosable (build lock 9) |
| Scene data `short:` deck names on the decks line | Answer 1: full deck names |

## Questions for Hugh

None open. All four were answered on 2026-10-11 (above).
