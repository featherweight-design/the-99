# The 99: Shopping for all decks (design handoff, R1)

`design/design_handoff_the99_all_decks_cart/` · 2026-10-11 · mirrors `design_handoff_the99_tuning_hub/` (R3 shape)

**Status: R1, approved (LGTM, Hugh, 2026-10-11)** after one feedback round: the Card Assignments chooser for buying fewer copies than decks need (S1b), the phone list scroll, the centred empty state, no entry line when nothing needs buying (E4), and "select" in place of "tick" throughout. Source of truth: `docs/superpowers/design-briefs/2026-10-11-all-decks-shopping-cart.md` (main). Hugh's four rulings and engineering's eight locks are taken as closed. This round answers §"What Design owns" and the eight open questions. Fixtures are the brief's staging figures (7 of 21 decks, 307 copies, $843.99). Per-deck figures match the roll-up and the tile to the cent. Card prices are illustrative, and so are the subset line counts (188 lines for 5 of 7).

**About these files.** The canvases are design references built in HTML. Open them with `support.js` beside them. **No new tokens, no new motion, no new dependencies.**

| File | Holds |
|---|---|
| `The 99 - All Decks Cart (R1).dc.html` | C0 the calls. A1 /decks entry and tile link, A2 all selected, A3 some deselected, A4 none selected, A5 by deck. S1–S4 Sol Ring: confirm, being bought, bought, part-bought. K1 checkout and return. T1 sold out, T2 price read failed. E1 one deck, E2 commander-only deck, E3 empty. AB the About entry. |
| `All Decks Cart.dc.html` | The frame component (`scene`, `phone`, `theme`). Imported by the canvas. |
| `STATES-all-decks-cart.md` | Every state, with Must-nots. |
| `design-tables/all-decks-cart.md` | **Commit to `docs/superpowers/design-tables/all-decks-cart.md`.** |
| `all-decks-cart · copy strings.ts` | Proposed `src/lib/copy/all-decks-cart.ts`. Placeholders; `/copy-review` resolves wording. |
| `about · all decks cart.ts` | The new About entry. |
| `READINESS.md` | Self-assessed readiness and the gap report. |
| `brand/` | Locked brand sheet, copied for self-containment. |

## Design's calls (§What Design owns)

1. **Where: a route, `/decks/shopping`,** opened from one line under the Decks header (`Shopping for all decks · 307 to buy · $843.99 · 7 decks`) and from each tile's `N to buy · $X`. The line is the first place `shopping.total` appears on /decks. It's absent when no deck has a roll-up row (E4). The cart's own empty state (E3) is centred in the page body and reachable only directly. A sheet can't hold 291 lines well, and a block would push 21 tiles down.
2. **Structure: by card by default, by deck one switch away.** By card answers "what do I buy": commanders first, then cards several decks need (three before two), then A to Z. By deck uses Consider's shelf header, with the select in it, folded except the deck you arrived from.
3. **The line is Hugh's form** (`3 · Gishath, Kratos, Thorin`) on its own mono line under the card name. Names wrap and are never truncated, so five decks just make a longer line. The tag shows the line's total, with each deck's copy at its own printing pick.
4. **Selections sit beside the total.** On desktop: a column, with the checkout under it. On a phone: a fold above the list. The list scrolls in its own 460px box, so the checkout dock and its link are never 291 lines away. Deselected rows keep their place, with an empty box, `--fg-muted` name and `--fg-locked` figure. `Select all` / `Deselect all` sits in the head. Figures re-render in place, with no motion.
5. **Totals: the roll-up's, read, never subtracted.** The figure, `307 copies · 7 decks`, PriceStrip's provenance line and `pricedClause` when priced is under total. A failed read drops the figure but keeps the link (T2), which is the one place the cart departs from PriceStrip.
6. **Owned but held elsewhere: one faint fact.** `you own 17 · all 17 in other decks`, mono 10.5 `--fg-faint`, only when owned. There's no verdict word, no warning colour and no icon. The buy tag is unchanged.
7. **Checkout: one link, `Buy these at Mana Pool`,** with one line under it saying what it sends: `291 lines, names and quantities only. You pick printings there.` Coming back to the tab shows one dismissable band that points to the buy tags. Nothing is marked bought for the player.
8. **Bought from the cart:** one confirm per line (S1). Buying fewer copies than decks turns the deck list into the Card Assignments chooser, so the player picks which decks get them (S1b, G11). Then then `adding…` (S2), then the held slot and receipt (S3), or a line that stays at its new count (S4). The receipt body comes from the read.

## Open questions, answered

1. **Remember deselects?** This visit only, as engineering prefers. If Hugh wants persistence, use the `useStoredView` shape keyed by deck id, with new decks starting selected.
2. **By card or by deck?** Both, with by card as the default.
3. **Owned line:** see call 6.
4. **Multi-deck Bought:** one confirm for 3 copies, with the decks listed. The held slot is cart-only, and deck pages re-read on load.
5. **Part-way purchase:** the line stays at the read's count with `N added this visit`. A cleared line becomes the held slot until the visit ends.
6. **Link limit:** not drawn. It's engineering's refusal until Hugh answers.
7. **Commander-only deck:** yes, it gets a select and a group (E2).
8. **Tile into cart:** yes, through a raised second link to `?deck=<id>` with that deck unfolded and every deck still selected.

## Gap report

- **G1 · Deck short names.** Hugh's form uses `Gishath`, `Mutant Menace`, but the decks are named `HD - Gishath`, `HD Tune - Mutant Menace`, `HD -Thorin`. No short-name rule exists. Options: (a) full deck names (always true, but long), (b) the commander's short name where it's unique among selected decks, (c) a stored per-deck short name. **Drawn as the brief writes them; the selections and by-deck headers keep full names. Hugh decides.**
- **G1a · The tile link isn't always there.** A deck with pending changes shows `N changes since vN` in the detail slot, which outranks the to-buy figure (Mutant Menace on staging). That tile has no link into the cart, so the entry line is the reliable way in.
- **G1b · Commander short names, now known.** From the live UI: Counter Intelligence is Kilo, Apogee Mind, and Mutant Menace is The Wise Mothman. Option (b) in G1 would give `Kilo` and `The Wise Mothman`, which are as clear as the deck names.
- **G11 · Choosing which decks get the copies (S1b) needs assignments for brews.** The chooser is the shipped ContestedCardRow, and Add writes one `card_assignments` row per picked deck along with the purchase. Assignments refuse decks with no committed version today, and all three Sol Ring decks are brews. Either Hugh lifts that refusal for cart purchases, or brew options draw inert with the shipped `draftNoteMany` sentence and the default order (first listed) decides. Committed decks can always be chosen.
- **G2 · A multi-deck `markBought`.** Lock 7 names it. The confirm needs one press id over N decks, a `source` that isn't one deck (`shopping:cart`), `requireMember` per deck, and receipt facts that can name several decks.
- **G3 · Feature switch.** `ALL_DECKS_CART_ENABLED`, plus an `AboutSwitch` member for the entry.
- **G4 · Line prices.** The roll-up returns deck-level `cents` only. By-card line totals and by-deck row figures need per-row prices from `loadDeckBuyRows` through each deck's printing picks. The page total stays the roll-up's sum (lock 6), so the line totals must add up to it. A probe should check this.
- **G5 · PriceStrip on a failed read** renders nothing. The cart needs a `CartCheckout` that keeps the link (T2).
- **G6 · Held slot provider.** I got it's provider is one per deck page, keyed by deck id. The cart needs its own, keyed `cart`, that survives the switch between views.
- **G7 · A line half sold out.** When one deck's pick is priced and another's is sold out, the tag can't say both. Proposed: the priced sum, with the line counted under `pricedClause`. This is unconfirmed.
- **G8 · Page cache.** `/decks/shopping` reads the same roll-up as `/decks`. Selections and view are client state, so no new table is read, but the route still needs `cachePageForUser` and a `check:list-cache` entry.
- **G9 · Mana Pool URL length** (lock 5) is still unmeasured. K3 isn't drawn.
- **G10 · Return detection.** The band keys on `visibilitychange` after the link's press, in session state. A player who never left the tab sees no band, which is the intent.

## Not done this round
- The over-limit link (Q6), until Hugh answers.
- Frames are in Kaldheim, the live theme, with Metamorphous display type and the `--btn` fill on New deck, matched to Hugh's screenshots of /decks. Amonkhet and Kamigawa are available through the `theme` prop but weren't reviewed.
