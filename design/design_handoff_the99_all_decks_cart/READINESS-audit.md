# READINESS audit: Shopping for all decks

R1 audit, 2026-10-11. Audited against `docs/superpowers/design-briefs/2026-10-11-all-decks-shopping-cart.md`
(Hugh's four rulings, engineering's eight locks, the eight open questions, Fixtures) and against `main` at
`673b657fc`. The canvases were read as source (scene data and props in `All Decks Cart.dc.html`, the section list
in `The 99 - All Decks Cart (R1).dc.html`); nothing under `design/` is imported.

## Verdict: YELLOW

The drop honours all four rulings and does not contradict any lock, except where Hugh's own R1 LGTM amended
lock 7 (S1b, below). Every deliverable the brief lists is drawn at 900 and 390. That covers the fixture cart, the
Sol Ring line as listed, being bought and bought, all selected, some and none, the empty and thin states,
checkout and return, the STATES rows, the design table and the About entry. Two product calls are still Hugh's,
G1 and G11. Neither blocks planning, and each has a shippable default. The link-size measurement engineering owed
(lock 5) is now done (finding 1). Q6 is no longer urgent: it applies only to carts about four times the size of
Hugh's.

## Rulings and locks, checked

| Item | Drop | Result |
|---|---|---|
| Ruling 1: an entry on `/decks`, every deck missing cards starts selected, brews included, complete decks absent | A1 entry line, A2 7 of 7 selected (3 brews), the 14 complete decks absent, A3/A4 deselect | holds |
| Ruling 2: one copy per deck, `2 · Gishath, Aang` | `list.decks(qty, names)`, Sol Ring `3 · Gishath, Kratos, Thorin`; names wrap, never truncated | holds (short names are G1) |
| Ruling 3: one Mana Pool link-out, reusing the per-deck checkout and its prices | CartCheckout = PriceStrip's box + `exportLinkOutCopy.shopping`; one `manapoolAddDeckUrl` (K2) | holds |
| Ruling 4: bought cards come back through I got it | S1–S4 extend GotItConfirm / receipt / held slot | holds (G2) |
| Lock 1 / 6: the deck's quantity and price are the roll-up's, so the figures agree with the tile | Select figures and totals are roll-up sums. A3 $466.52 = $843.99 − Omnath − Mutant Menace, checked | holds |
| Lock 2 / 3: unfinished = has a roll-up row; basics and proxies never appear; unowned commander is a row | E2 commander-only deck; commanders first | holds |
| Lock 4: an owned card can be a cart line, said without hiding it | `you own 17 · all 17 in other decks`, `--fg-faint`, no verdict word, no warning colour (checked in the source: `--warning` appears only on the shipped buy tag) | holds (finding 4) |
| Lock 5: one link over merged lines | one link, K3 not drawn | holds; measured below |
| Lock 7: a purchase's effect is read again, never assumed | S3/S4 receipts read from the roll-up; S6 names the decks the read covers | holds. **S1b's chooser writes `card_assignments`**, an explicit override of seniority Hugh approved in the R1 LGTM; G11 |
| Lock 8: deselecting is a view, never a write | Selections are view state for this visit only, and `selections.note` says so; Must-nots repeat it | holds |

## Open questions, accounted for

Q1 this visit only (engineering's preference). Q2 both views, by card by default. Q3 call 6. Q4 one confirm, the
decks listed. Q5 the line stays with `N added this visit`. **Q6 explicitly left to Hugh, K3 not drawn**, as the
brief asked. Q7 yes (E2). Q8 yes, `?deck=<id>` (finding 6). All eight are answered or explicitly left.

## Findings

1. **eng-resolvable · Link size, MEASURED.** Measured read-only on staging: `loadDeckBuyRows` for the fixture
   account, merged by card name, then put through `manapoolAddDeckUrl`. 7 decks, 307 copies, **291 lines, 6,007
   bytes of text, 8,051-character URL**, so the brief's estimate holds. Then a GET of that URL to
   `manapool.com/add-deck` returned **200, and all 291 card names appear in Mana Pool's server-rendered
   response**, so the whole list decodes on their side. The ceiling is between **32,099 characters (200) and
   40,115 (414 URI Too Long)**, measured by padding the payload. At about 27.7 characters per line that is roughly
   1,150 lines, four times Hugh's cart. **Engineering owes:** (a) a `links.test.ts` case for a 291-line cart and a
   guard that refuses a URL over 32,000 characters (the Q6 path, an engineering refusal until Hugh answers);
   (b) one manual press in a browser before launch to confirm Mana Pool's add step takes all 291 lines into its
   mass entry. The GET proves transport and decoding, not their client's add step. No cart is bought.
2. **needs-Hugh · G1 deck short names.** Hugh's form names `Gishath, Aang`. The decks are named `HD - Gishath`,
   `HD -Thorin`, `HD Tune - Mutant Menace`, and no short-name rule exists. Options: (a) full deck names, (b) the
   commander's short name where it is unique among the decks on the line, (c) a stored per-deck short name. This
   is a naming decision about Hugh's own data, so there is no single defensible answer. Default if unanswered:
   (a), which is always true. Only the decks line changes.
3. **needs-Hugh · G11 the S1b chooser for brews.** S1b turns the decks on the line into ContestedCardRow when
   fewer copies are bought than decks need. Pressing Add writes `card_assignments`. `assignCopyFor`
   (`src/lib/decks/assign.ts:85-91`) gives a copy only to a deck with a current committed claim, and **all three
   Sol Ring decks are brews**, so S1b as drawn cannot happen on the fixture today. Lifting the refusal changes
   the claim model for every surface, not only the cart. Default if unanswered: S1c, brew options inert with the
   shipped `draftNoteMany`, and seniority (first listed) decides. Committed decks can always be chosen.
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

## Questions for Hugh

1. **G1:** On a cart line, name decks by (a) full deck name, (b) commander short name, or (c) a short name you
   set per deck?
2. **G11:** When you buy fewer copies than the decks need, should brews be choosable (that changes the claim
   model app-wide), or should seniority decide among brews (S1c)?
3. **Q6 (not urgent):** A cart over about 1,150 lines exceeds Mana Pool's URL limit. Should it split into several
   links, cap with a "more" link, offer copy to clipboard, or be refused?
4. **Q1 (optional):** Should deselected decks stay deselected on your next visit? The default is this visit only.
