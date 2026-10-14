# Handoff: The small swap tools (sub-project 4), R2

## R2 changes (Hugh's review, 2026-09-24)
- **Limit count:** the count now follows the figure on the same run (`Marking cards over $10 · default · 4 over`). On desktop it used to sit at the far right.
- **⇄ on marked rows only:** under-limit rows lose the icon. Desktop keeps an empty 22px slot so the buy tags stay aligned. Ruling 3 still holds through the card: a card modal opened from any Shopping row shows `See cheaper stand-ins →` under its buy tag.
- **Viewing a stand-in (1c):**
  - The head and every row get a 22×31 thumb.
  - On a fine pointer, hovering shows the shipped hover preview.
  - Click or tap opens CardModal `stacked`, with `backLabel="Cheaper stand-ins"`. Prev/Next page through the stand-ins.
  - A new CardModal footer slot shows `in place of Plateau`, the free or buy tag, and **Take**.
- **Loading:** LoadingScreen scaled into the sheet. It has the pulsing crown (`--accent-strong`, `dots` at a 1.2s stagger), the display heading `Checking the binder`, and a mono status.
- **Failed:** the tuning failure shape. It has the still crown (`--border-strong`), a `--danger` tag, a heading, a body, a kept line, and Try again in Apply's skin.
- **Refused:** a panel under the pressed row. It has:
  - an `--avail-over-border` edge and a `not taken` tag;
  - a heading, and both halves of the swap stated;
  - `Read the list again` as the primary action, and `Close`.
- **`Put it back` is now `Undo swap`** everywhere in this tool.
  - Recommendation: move `deckTuningCopy.card.undo` to it too, so there is one word for one mechanism.
  - The removal undo keeps `Put back`.

- **Fits your decks is now on demand.**
  - **In Card Details:** one 44/48px callout row, `Find a deck for it →`, after In your collection. There's no count on it and nothing loads until it's pressed.
  - **When the callout shows:** any Commander-legal card, for a player with at least one deck. It shows even when every copy is spoken for. It's hidden for cards that aren't legal and for players with no decks.
  - **The second modal:** pressing the callout opens a picker stacked over Card Details. It's 560 on desktop with a `← {card}` back pill, and a sheet from 96px on the phone. It loads with the crown loader.
  - **The picker's three groups:** `could take it · by name` (both chips and Add on each deck), `already holds it`, and `can't play it` with the reason.
  - **What this replaces:** the block's R1 placement (call 7). The R1 states for a card that isn't legal and for a player with no decks are gone.

Where R2 and anything below disagree, R2 wins.

## R3 (2026-09-24): Card Details drawn from the shipped modal
- **New child, `Card Details.dc.html`.** It's traced from production screenshots:
  - 824×625, with a 322px art column showing art, `Click to zoom`, ↻ on two-faced cards, and the price tag with `from`.
  - A scrolling right column with the title and pips, the type line, oracle text, bracket facts, the collapsed combos row, In your collection (with In your decks, the split and the note) and the SET / RARITY / IDENTITY / YOU OWN row. The set picker variant is included.
  - A fixed footer.
- **Three card kinds, each at the top and bottom of the scroll:** plain (Acquired Mutation), game changer + tutor + combos (Mystical Tutor) and two-faced (Tovolar). Phone whole-sheet versions of all three are included.
- **`Find a deck for it →` moves to the fixed footer**, stacked under `Buy any printing at Mana Pool ↗`, with Prev/Next on the right.
  - The footer grows from about 64px to 92px, and the scrolling body adds nothing.
  - The link is visible on every card at every scroll position. This supersedes R2's callout row after In your collection.
  - On the phone the link is a 44px row between Buy and Prev/Next.

## R4 (2026-09-24): picker groups and copies
- **`can’t play it` removed.** The picker lists only decks that can play the card, plus `already holds it`. The colors-rule-them-all-out state is one sentence.
- **Copies:** the head shows `×2 · 1 free` beside the card.
  - While a free copy remains, rows offer **Add**, which uses it.
  - Once no free copy remains, every remaining row offers **Add to buy** in the quiet skin, and the card joins that deck's Shopping list.
  - Adding to a brew is a soft claim and never flips the rows.
  - If Hugh prefers a hard stop, drop the second control and add one line under the head. Layout is unchanged.

**Brief:** `docs/superpowers/design-briefs/2026-09-24-small-swap-tools.md` (branch `docs/scoping-briefs`, PR #921).
**Canvas:** `The 99 - Swap Tools.dc.html`, with three child components that engineering maps one-to-one:
`Shopping View.dc.html` (the row and the limit line), `Stand-ins Sheet.dc.html` (the ModalChrome body) and
`Fits Your Decks.dc.html` (the modal block). Copy: `swap-tools · copy strings.ts`. The deck tuning handoff
(`design_handoff_the99_deck_tuning/`) is the reference for Take and Put it back.

Everything is drawn at 1300 and 390. The fixture is HD Gishath (RGW): 8 cards to buy, $407.78, with Plateau at $293.84.

## Canvas map

| id | What | Frames |
|---|---|---|
| §4 | The seven calls | cards |
| 1a | The limit: $10 default, $25 set, editing, none over | 1300 + 390 full; limit-line crops |
| 1b | Rows over and under the limit | Lands crop, both widths |
| 1c | Stand-ins: lands (in context), spells, fetch, no role, nothing cheaper | sheet 640 + 390 |
| 1d | Loading, failed, refused Take, partner, unnamed drawback | sheet 640 + 390 |
| 1e | After a take: in the sheet, bought, free, one copy fewer | sheet; Shopping full; crops |
| 1f | Fits your decks: several (in the modal), all hold it, colors, not legal, no decks, added | modal 820 + 390; block 468 + 358 |

## The seven calls (§4)

1. **Where stand-ins open: in a ModalChrome body at both widths.** Desktop is 640 wide and centred. The phone gets a sheet from 52px, the same geometry as the Brackets sheet. It can't open inline, because desktop Shopping is a two-column grid. A card name opened from the sheet stacks the CardModal (`stacked`, `backLabel="Cheaper stand-ins"`).
2. **The limit reads the same whether it's the default or set.** The line is `Marking cards over $10`. An untouched deck (null column) shows a `default` chip, and a deck with a set limit shows `reset to $10` in its place. The limit is never off.
3. **A land's drawbacks are words and nothing else.** There's one mono clause per stand-in. Any drawback the classifier can't name is written in italics (`gives up something we couldn’t name · read the card`) and never left blank. The original's own line reads `gives up nothing` or states its own drawback, so the two can be compared.
4. **Put it back lives in the row's slot, and the strip shows only the new total.** If the row is gone, a dashed receipt takes its slot (UndoRow's shell). If the row is still there with a copy fewer, the receipt sits directly under it. There is no "saved" figure.
5. **Fits your decks is ordered by name, A–Z,** and a `by name` label says so.
6. **Proposed, for Hugh: an Add on each fitting deck.** It calls `addCardToDeck` on that deck's draft, then reads `in the draft` and says whether the card joins as one to buy or from a free copy, with `Open the deck →`. There's no undo in the modal: the deck page's ✕ and its Put back already cover it.
7. **Placement: directly after AvailabilityDetail, before ProxyDetail, and always open.** It uses the same block chrome. Unlike AvailabilityDetail, it never renders null. Its empty states are sentences.

Also called: undoing a swap is **Put it back** (`deckTuningCopy.card.undo`), and undoing a removal stays **Put back**. They reverse different acts and can appear in the same list. This is flagged for /copy-review.

## Components

**Limit line (new, under `PriceStrip` in `GroupToggle`, Shopping only).** It's a sibling of the strip, not a child, because the strip returns null without provenance and the limit must still show. It has no plate. On desktop it's one 30px line with the key under it. On the phone the line is 44px (figure, reset and field are all 44px targets) with the key under it. The figure is 13.5 mono 600 in `--fg` with a dotted `--accent` underline. The `default` chip is 9px mono uppercase `--fg-faint` on a `--border-strong` pill. The count (`4 over` / `none over $10`) is 11 mono `--fg-muted`. The key is 10 mono `--fg-faint`, with the `⇄` in `--fg-muted`. Editing swaps the figure for a `$` field (1px `--accent`, 30 / 40px tall) with Save (Apply skin) and cancel. It takes whole dollars, 1 and up.

**DecklistRow additions (Shopping only).**
- **⇄ trigger**, between the buy tag and the ✕. It's a 13px glyph in a 22×20 slot on desktop and a 44×44 hit box on the phone (with -9px right margin so the pair keeps the ✕'s right edge). Under the limit its ink is `--border-dashed`, lifting on hover like the ✕. Over the limit it's `--warning`. Its aria-name is `swapAria` or `swapOverAria`.
- **Over the limit:** BuyTag row plate gets `box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--warning) 60%, transparent)`. The meta line appends `· over $10` in 10px mono `--warning`, inline on desktop. **This amends the row's "only the cost and the figure ride the meta line" rule.** Nothing else on the row changes, so an over-limit row never borrows `--avail-over-border`.
- **Receipt row:** the UndoRow shell (sunken, 1px dashed `--border-strong`, 44 / 34). The text is `Plateau → Sunbaked Canyon` in 11.5 mono `--fg-locked`, and `Put it back` uses UndoRow's action skin.
- **A bought stand-in** joins its group in name order with the draft's 2px `--accent` inset rule, which is the existing pending mark.

**Stand-ins sheet.**
- **Head plate:** `--bg`, 1px `--border`, 10px radius. It holds the `replacing, in {deck}` label, the dashed dot, the name (dotted underline, opens the card), BuyTag, `over $10`, and the job line (10.5 mono `--fg-muted`).
- **Lead:** 12.5 `--fg-body`.
- **Groups:** a 9.5 mono uppercase heading over a 1px rule. The heading carries the order, so rows have no rank number.
- **Row, desktop:** grid `1fr 96px 64px`, 9px vertical padding, 1px `--border` between rows.
- **Row, phone:** grid `1fr 72px`. The name, facts and price stack in the first column, and Take (72×44) spans them.
- **Row parts:** owned dot (solid `--success`) or dashed. Name at 13 / 600 with a dotted `--accent` underline. The shipped availability marker when the free copy is soft-held. A facts line in 10.5 mono `--fg-muted`, indented 14. The price cell is BuyTag, or a `free` plate in the same shape tinted `--success` at 13%.
- **Take:** Apply's exact skin.
- **Taken:** suggestion-card's applied AnsweredRow, stamped `taken`. The other rows drop Take but keep their slots.
- **Refused:** the message goes under the row in MutationError ink, with `Read the list again`.
- **Foot:** the price provenance in 9.5 mono `--fg-locked`.

**Fits your decks.**
- **Block:** AvailabilityDetail's chrome. The heading is 10 mono uppercase `--fg-faint`, with `by name` (9.5 mono `--fg-locked`) on the right.
- **Deck row:** line 1 is the deck link (13.5 `--fg-body`, underlined in `--border-strong`, truncating) with Add on the right (32px desktop / 44px phone, Apply skin). Line 2 is two chips in the citation-chip shape: `--surface-sunken`, 1px `--border`, 5px radius, a 9px uppercase `--fg-locked` label, and a 10px `--fg-muted` value. The need chip is absent when the role is absent or the targets aren't measured.
- **Foot:** one line naming the decks the colors exclude.

## State list

- **Limit:** default / set / editing / none over / (no price feed: the line still shows, and the count reads none over).
- **Row:** over / under / over but unpriced (can't happen: an unpriced row is never over, and its sheet shows free copies only).
- **Sheet:** lands · fetch · spells · no role (spell, or a land with no color and no fetch: `noRoleLand`) · nothing cheaper (spell or land) · loading · failed · refused · partner · taken.
- **After a take:** bought (the row is gone and the stand-in joins) · free (the row is gone and nothing joins) · one copy fewer (the row stays and the receipt goes under it).
- **Fits:** several · all hold it · colors rule all out · not legal · no decks · added (proposed).

## Fixture arithmetic (all checked)

- **At $10:** the Shopping list sums to $407.78 across 8 cards. Four are over: Plateau $293.84, Mana Vault $38.40, Doubling Season $42.60 and Wooded Foothills $22.10.
- **At $25:** Wooded Foothills drops out and three are over.
- **Take Sunbaked Canyon ($1.12, bought):** $115.06, still 8 cards, 3 over.
- **Take Sacred Foundry (free):** $113.94, 7 cards, 3 over.
- **Spell stand-ins** are all MV 1 or less under Mana Vault's 1. **Partner stand-ins** are all MV 3 or less under Rhystic Study's 3.

## Not in this round

- The About entry. It's batched at launch.
- #217.
- The real `availabilityCopy` strings in the drawn AvailabilityDetail (`Your copies`, `In your decks`, `holds 1`). These were drawn from the component's structure and are placeholders for the shipped keys.
