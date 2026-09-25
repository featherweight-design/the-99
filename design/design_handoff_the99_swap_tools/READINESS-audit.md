# Readiness audit: the small swap tools (sub-project 4), R4

**Audited:** 2026-09-24, against `origin/main` at `ec9980e4`. Every file:line below was read on that commit.
**Brief:** `docs/superpowers/design-briefs/2026-09-24-small-swap-tools.md` (§2 and §5 locked, §3.0 readings, §4 open, §6 engineering's).
**Package:** this folder, committed as delivered. `README.md` R2–R4 supersede its R1 sections, as it says itself. Design's own `READINESS.md` is answered in §5 below.
**Measured on `staging`** (read-only, Neon branch `br-polished-pond-a6e63y0b`), per AGENTS.md.

## Hugh's rulings (2026-09-24)

Hugh approved this audit on 2026-09-24 and ruled on all three §4 questions.

- **H1: Add from Fits your decks with no spare copy adds the card as a buy**, with a buy tag, like every other
  Add in the app. There is no hard stop.
- **H2: `Undo swap` in both the swap tools and tuning.** Tuning's shipped `Put it back` (`deck-tuning.ts:206`)
  is renamed to match. `Put back` stays for a removed card on the review page, which is a different action (F10).
- **H3: a utility land's stand-in says what it gives up**, for example *gives up: uncounterable creatures*
  for Cavern of Souls. It never claims *gives up nothing* unless that is true. This answers F2.

**F1, the staple read in Fits your decks, is with Design as an addendum.** The picker waits on it; the
stand-ins sheet builds now, as the verdict below says.

## Verdict: Orange

Build the swap tools (canvas 1a–1e) now, with the engineering corrections below. Design answered all seven §4
questions, nothing contradicts a §2 or §5 ruling, and every requested state is drawn at 390 and 1300.

**One Design item remains (F1): the staple treatment in Fits your decks is not drawn.** Brief §3.5 asked Design to
say how a universal staple reads so it never looks like a commander-specific fit, and nothing in the package does.
It touches two figures: the Fits picker's commander chip, and a spell stand-in's commander figure, since Sol Ring (MV 1,
ramp) is a valid stand-in for Mana Vault in a deck that lacks it. The picker waits on a small addendum and on the
universal-staple module (#926). The stand-ins sheet builds now, and its figure takes the staple read when the addendum
lands. Three decisions go to Hugh (§4). One of them (H3) comes out of this audit, not the handoff.

---

## 1 · Against the brief

### The seven §4 calls

| § | Question | Design's call | Where |
|---|---|---|---|
| 4.1 | Where stand-ins open | A `ModalChrome` body, 640 wide and centred on desktop, a sheet from 52px on the phone. A name opens `CardModal` stacked, `backLabel="Cheaper stand-ins"`, paging through the stand-ins | README §4.1, R2 "Viewing a stand-in" |
| 4.2 | Default vs set limit | One line, `Marking cards over $10`. A null column shows a `default` chip, and a set limit shows `reset to $10` in its place | README §4.2, R2 "Limit count" |
| 4.3 | A land's drawback | Words only, one mono clause each. An unnamed drawback is italic `gives up something we couldn’t name · read the card`, never blank | README §4.3 |
| 4.4 | Undo after a take; savings | The receipt takes the row's slot (UndoRow's shell), or sits under a row one copy fewer. The strip shows the new total only | README §4.4 |
| 4.5 | Fits order | By name, A–Z, labelled `by name` | README §4.5 |
| 4.6 | Add on a fitting deck | Proposed: **Add** while a free copy remains, **Add to buy** after. Hugh decides (§4 H1) | README R4, READINESS "Owed to Hugh" 1 |
| 4.7 | Fits placement, open by default | On demand. `Find a deck for it →` sits in the modal's fixed footer and opens a picker stacked over the card | README R2, R3 |

All seven are answered.

### §2 rulings and §5

| Ruling | Respected? | Note |
|---|---|---|
| 1, 3, 4: limit per card, per deck, $10 default, sweep in Shopping | Yes | 1a draws default, set, editing and none over. Any row's stand-ins open from the card modal (R2) |
| 2: only Shopping rows | Yes | The fixture is the 8-card Shopping list, `$407.78`, which sums correctly (below) |
| 5: land by colors, free first, then cheapest, each names a drawback | Yes | But see F2: the ruling offers color stand-ins for lands whose job is more than their colors |
| 5a: fetch by land types | Yes | Wooded Foothills to Terramorphic Expanse, Evolving Wilds, Fabled Passage, Prismatic Vista |
| 6: spell by role, MV at or under, ranked by commander figure; no-role says so | Yes | `norole` (Doubling Season) and `nothing` (Swords) drawn. `noRoleLand` and `nothingCheaperLand` have copy and share the frame |
| 7: a take is Apply, with an undo | Yes, relabelled | R2 renames the undo `Undo swap`, where ruling 7's text says `Put it back`. §6 left the label open. Hugh decides (§4 H2) |
| 8, 9: #218 answers "my decks", in the card modal everywhere | Yes | The footer link is on every card modal where the card is legal and the reader has a deck |
| 10: two facts side by side, never a score | Yes | Two chips, no joining glyph, no combined figure |
| §5: no model, no score, never breaks the deck, cheaper or free, basics never flagged, no guess | Yes | |
| §3.5: staple treatment | **No** | F1 |

**Fixture arithmetic, re-checked.** The 8 Shopping prices (`Shopping View.dc.html:141-148`) sum to 40,778 cents.
Taking Sunbaked Canyon ($1.12, bought) gives $115.06. Taking Sacred Foundry (free) gives $113.94. At $25 Wooded
Foothills ($22.10) drops out. Every spell stand-in shares the original's role under `classifyRoles`
(`roles.ts:10-22`): Birds, Llanowar Elves and Avacyn's Pilgrim match `{t}: add`, and Mystic Remora, Esper Sentinel
and Phyrexian Arena match `draw a card`. Doubling Season has no role.

### Widths

Every state mounts at both widths (`The 99 - Swap Tools.dc.html`, the `dc-import` pairs): limit default and set at
1300 and 390 full, editing and none over as crops. The rows over and under are shown as crops. The sheet is drawn at 640 and 390 in all ten
kinds (`lands`, `spells`, `fetch`, `norole`, `nothing`, `loading`, `failed`, `refused`, `partner`, `taken`). After a
take, bought and free are drawn at both widths. The card modal footer is drawn at 824 and 390 for three card kinds. The picker is drawn
at 560 and 390 in `several`, `loading`, `allhold`, `colors` and `added`.

The brief's "not legal" and "no decks" Fits states are answered by hiding the door (R2): the footer link does not
render for either, so there is nothing to draw. That is a coherent answer. Undrawn states the code can reach are in
F4 and F5.

### About entry

**Not drawn, correctly.** The deck-analysis line batches its entries at launch (AGENTS.md, and
`docs/superpowers/plans/2026-09-20-deck-analysis-surface.md:355-357`, one `ABOUT_VERSION` bump). Sub-project 4 has
no plan yet. **Its plan must name the batched task:** a *Cheaper stand-ins* entry and a *Find a deck for it* entry,
written into the line's launch batch, and no bump in this sub-project's own PRs.

---

## 2 · Against the code

### Surfaces

| Surface | As described? | Evidence |
|---|---|---|
| Shopping membership | Yes. Basics out, proxied out, unowned in, owned only when `over` | `shopping.ts:31-44` |
| `PriceStrip` returns null without provenance or an empty list, so the limit line must be its sibling | Yes | `price-strip.tsx:30, 36`; mount `group-toggle.tsx:355-357` |
| Buy tag in its reserved slot, the ✕ after it | Yes. `FIGURE_SLOT` is 46px and fits `$293.84` | `decklist-row.tsx:555-570, 612-629`; `buy-tag.tsx:62` |
| Row plate has no ring today; the tile's is `--warning` 50% | Yes. The over ring (60%) is new, no new token | `buy-tag.tsx:22-35` |
| The meta line holds the cost and the EDHREC figure; `over $10` amends it | Yes, and README says so | `decklist-row.tsx:172-201` |
| UndoRow's shell for the receipt | Yes. Sunken, dashed `--border-strong`, mono 11.5 / 12 `--fg-locked` | `decklist-row.tsx:651-695` |
| Apply's skin, the applied `AnsweredRow` | Yes | `suggestion-card.tsx:74-77, 255-296` |
| The swap body cuts one copy at a time | Yes | `verdicts.ts:132-143` |
| `ModalChrome` phone sheet from 52; stacked card sheet from 96 | Yes | `receipt-modal.tsx:158-160`; `card-modal.tsx:404` |
| `ModalChrome` at 640 | **No.** The width is `560 \| 700 \| 760` | `receipt-modal.tsx:120, 213-215`; F7 |
| A sheet stacked OVER a card modal (the picker) | **No.** `ModalChrome` is only ever the sheet underneath | `receipt-modal.tsx:133-139`; F3 |
| `CardModal` `stacked` and `backLabel` | Yes | `card-modal.tsx:421-443, 536` |
| Card modal desktop footer: link-out, then Prev/Next | Yes | `card-modal.tsx:1819-1856` |
| Card modal phone footer with Prev/Next | **No.** The phone has no Prev/Next, and its link-out is in flow at the end of the scroll | `card-modal.tsx:1806-1817`; F8 |
| `AvailabilityDetail` | Yes, returns null on a free card with no claims | `card-modal.tsx:263-270`, mounted `:1727` |
| `LoadingScreen` with the crown on `dots` | Yes, stopped under reduced motion | `loading-screen.tsx:15`; `globals.css:619, 694, 744` |

### Data behind each fact

| Fact | Source | Note |
|---|---|---|
| Price | `loadPrices` picks live over stale, non-foil over foil, then cheapest | `price-query.ts:67, 93-97`. The drawn figure is `priceOf`, which is null for a sold-out row (`price.ts:82-104`). F5, F6 |
| Commander figure | `commander_support_cards.inclusion`, `real`, already a percentage | `schema.ts:997`; `synergy-read.ts:243-245`. Staging has 892,400 rows and none null, max 100 |
| Pair figure | `commander_pair_support_cards.inclusion` | `schema.ts:1075`. Staging holds one pair, the one partner deck, with 271 cards. F14 |
| Role | `classifyRoles`; a deck's counts use `primaryRole`, the first role only | `roles.ts:25-48`; `read.ts:89-92`; `mix.ts:32-46`. F9 |
| Need target | `recommendedMix`; `rolesUsable` is local | `mix.ts:107-140`, `:112-114` |
| Land colors | `producibleColors`, never called outside its test | `mana.ts:12, 30-64`. F2 |
| Fetch types | No reader exists | §6 |
| Legality, identity | `cards.commanderLegal`, `fitsIdentity` | `schema.ts:43`; `score.ts:237`. Not in the card payload: F3 |
| Add | `addCardToDeck` | `actions.ts:484` |
| Universal staples | Not on main. `src/lib/staples/universal.ts` is in #926 (open) | F1 |

### Tokens

Every token the package uses is declared in all six themes in `src/app/globals.css`. Each was grepped as a `--x:`
declaration and appears 6 times: `--accent`, `--accent-hover`, `--accent-shadow`, `--accent-strong`, `--avail-hard`,
`--avail-hard-fg`, `--avail-over-border`, `--avail-soft`, `--bg`, `--border`, `--border-dashed`, `--border-strong`,
`--danger`, `--elevated`, `--fact`, `--fg`, `--fg-body`, `--fg-faint`, `--fg-locked`, `--fg-muted`, `--success`,
`--surface`, `--surface-rail`, `--surface-raised`, `--surface-sunken` and `--warning`. `--display` is the canvas's own
variable; the code uses `--font-display-face` through the `font-display` class. No new token and no new hex, as
Design's checks claim.

---

## 3 · Findings

| # | Sev | Evidence (origin/main) | Finding and correction | Owner |
|---|---|---|---|---|
| F1 | **High** | No handoff file mentions a staple. Sol Ring is drawn only in `allhold` (`Fits Your Decks.dc.html:151, 170`) | **The staple treatment in Fits your decks is not drawn.** Brief §3.5 made it Design's call. On staging the shared definition (#926: a staple in at least 3/4 of the `format_staples` conditions) names five cards: Arcane Signet, Sol Ring and Swiftfoot Boots (16 of 16 conditions), Rogue's Passage (15) and Reliquary Tower (13). A deck missing one of them would show a high `N% of X decks` chip. That reads as a commander-specific fit, which is what the brief rules out. **Correction:** Design draws the staple read of the commander chip in the picker at 560 and 390. It also says whether a stand-in row carries the same read, since §3.5 means the figure to mean one thing in both tools. Engineering imports `loadUniversalStaples` from #926 and does not restate the rule | Design |
| F2 | Medium | `mana.ts:12`, `:56-60`; `shopping.ts:32`; staging decks | **Ruling 5 offers color stand-ins for lands whose job is more than their colors.** Cavern of Souls is in a staging deck, unowned, at $48.24. `ANY_COLOR` reads it as making every color. Its stand-ins would include Command Tower, reading `gives up nothing`. Gaea's Cradle and Boseiju read as green, so a basic Forest would lead as free: a basic is never on Shopping, so taking one never puts it there. The drawback line describes only the stand-in, never what the original does beyond mana, so the list implies an equivalence the tool has not checked. **Correction (proposed):** a land takes color stand-ins only when its text is fully accounted for by mana abilities and drawbacks the classifier names. Any other land is a text-job land and gets `noRoleLand`, as ruling 6 already says for Strip Mine. This narrows ruling 5, so Hugh rules (§4 H3) | eng (Hugh rules) |
| F3 | Medium | `card-detail.ts:308-326`; `receipt-modal.tsx:133-139`; `card-detail-provider.tsx:99, 268` | **The Fits door and picker need payload and a new stacking order.** (a) The card payload does not select `commanderLegal`, and nothing tells the modal whether the reader has a deck. Both gate the footer link (READINESS amendment 3a). (b) `ModalChrome` is always the sheet under a stacked card, through `registerSheet`. The picker is the reverse: a sheet over the card, from 96px on the phone, with a `← {card}` back. (c) A card opened from the stand-ins sheet draws the Take footer instead of Buy and Find (canvas 1c). **Correction:** add `commanderLegal` and a has-decks flag to the detail payload. Build the reverse stacking once, in the provider, since it is the only host of `CardModal`. Load the picker's payload when it opens (Design's eng list item 6) | eng |
| F4 | Medium | `Fits Your Decks.dc.html` states; copy `fits.addRefused`, `sheet.undoRefused` | **Undrawn failure states.** The picker's load can fail, an Add can be refused, and an Undo swap can be refused. Copy exists for the last two, but none is drawn. **Correction:** the picker's failure takes the stand-ins sheet's `failed` shape (still crown, `--danger` tag, heading, body, Try again). Both refusals render `MutationError` under their row, the row's shipped pattern (`decklist-row.tsx:631`). New sentences go to `/copy-review` | eng |
| F5 | Low | `price.ts:92, 100-104`; `price-query.ts:93` | **The limit compares the drawn figure, so a sold-out row is never over.** §3.0 says the original is compared at `loadPrices`' frozen figure. The row draws `sold out` with no figure, though, and `priceOf` returns null. Flagging it `over $10` would cite a price the reader cannot see. Treat a sold-out row as unpriced: it is never over, and its sheet lists free copies only. That sheet is undrawn, and two of its strings do not fit it: each lead promises to-buy rows after the free ones (`then the cheapest`, `then the rest by how often …`), and `nothingCheaper` and `nothingCheaperLand` cite the original's price. **Correction:** add a free-copies-only lead and a price-free empty sentence through `/copy-review`, using the same frame. Staging has 6 sold-out cards and none in a deck, so this is rare | eng |
| F6 | Low | `price.ts:82-97` | **"Stocked now" is `priceState` returning `priced` or `foilOnly`.** Reuse it rather than writing a new `as_of` clause. A foil-only stand-in's figure is `priceOf`'s foil figure, and `BuyTag` already draws it | eng |
| F7 | Low | `receipt-modal.tsx:120, 213-215` | **`ModalChrome` has no 640 width.** **Correction:** add `640` to the union and `WIDTH_CLASS`, as Design's call 1 draws it | eng |
| F8 | Low | `card-modal.tsx:1806-1817`, `:1819-1856` | **The phone footer is not traced from the shipped modal.** `Card Details.dc.html:109-116` draws a phone footer with Prev/Next, but the phone modal has neither Prev/Next nor a pinned footer. **Correction:** on the phone, put the 44px `Find a deck for it →` row directly under the in-flow Mana Pool link. Do not build a phone Prev/Next. The desktop footer is as drawn | eng |
| F9 | Low | `read.ts:89-92`; `mix.ts:32-46, 122-123` | **The need chip for a multi-role card or a land.** Role counts tally `primaryRole`, the first role only, so the chip must name that role or its count is for another role. A land's target resolves separately, through `landMeasured`, not `rolesUsable`. **Correction:** name `primaryRole`, and for a land show `land N of T` only when `landMeasured` holds. Otherwise omit the chip | eng |
| F10 | Low | `decks-builder.ts:327`; `decklist-row.tsx:688`; `deck-versioning.ts:289`; `deck-tuning.ts:206` | **The undo inventory behind H2 is off by one label.** Design and brief §6 say the removal undo reads `Put back`. On the decklist row it reads **`Undo`**. `Put back` is the review screen's control, and tuning's is `Put it back`. So `Undo swap` would sit beside `Undo` in the same Shopping list, which supports Design's recommendation. **Correction:** carry this inventory to Hugh (H2) and `/copy-review` | eng |
| F11 | Low | `verdicts.ts:84-117` | **The refused body names a cause the swap cannot know.** `applyItem` returns null for five conditions, with no reason. The copy says the deck was edited "in another tab or on another device". **Correction:** return a reason from the shared body, or cut the cause from the sentence at `/copy-review`. A thrown error is a failure, not a refusal, and takes `MutationError` | eng |
| F12 | Low | `decklist-row.tsx:511-516`, `:49-58` | **The ⇄ spends width the row already lacks.** On the phone it adds a net 35px (44px less the 9px overlap) to a row the code already calls tight at 390. On desktop every row pays the 22px slot inside the 2-up grid. **Correction:** probe the name's width at 390 and at the narrowest 2-up desktop width, over the longest staging Shopping names, with `over $10` inline | eng |
| F13 | Low | README §4.4, "Also called", Components, State list; copy file; `Fits Your Decks.dc.html:170, 173` | **Stale R1 text and canvas-to-copy drift.** README's R1 sections still say `Put it back`, and still describe an always-open Fits block, the excluded-decks foot, and the not-legal and no-decks states. The copy file keeps R1-only strings (`excludedOne`, `excludedMany`, `hardStop`, and `fits.add`, which R4's `addUsesFree` replaces; `fits.added`, `in the draft`, is still drawn in the `added` state and stays). The canvas's `allHold` drops "They’re listed above.", and its colors sentence reads "neither of your commanders is" where the file has "none". **Correction:** R2–R4 win. The copy file is the source, R1-only strings are dropped unless Hugh keeps the hard stop, and `/copy-review` settles the drift | eng |
| F14 | Low | `commander_pair_support` on staging: 1 row | **A pair the index does not hold lists nothing.** Every stand-in then falls to `not listed · cheapest first`, and `leadSpells` still promises an order by the pair's decks. **Correction:** when nothing is listed, the lead drops its second clause (`/copy-review`). Fits shows a pair's chip as the pair's figure, in the drawn chip | eng |
| F15 | Low | `Fits Your Decks.dc.html:177`, `:181`; README R4 | **Two canvas-only drifts in the picker.** (a) The R4 copy line under the head is set only in `several`, `loading` and `added`, so `allhold` and `colors` draw none, though both states know the card's copies. (b) The picker's loading crown carries an inline animation with no reduced-motion stop. **Correction:** draw the copy line in every picker state that knows ownership, and build the loading state from the shipped `LoadingScreen`, which already stops under reduced motion (§2, Surfaces) | eng |

### Engineering notes, not findings

- **Fetch reader.** `a basic land card` finds every basic type, so Terramorphic Expanse finds a Mountain or Forest.
  It also carries `basicOnly`. Prismatic Vista finds only a basic as well.
- **Free at take time.** A stand-in listed as free can be claimed by another deck before Take lands. The take still
  lands. The receipt's `your free copy` comes from the take's own read, not from the list's.
- **Empty Shopping.** The strip returns null on an empty list (`price-strip.tsx:36`). The limit line should do the same:
  there is nothing to mark.
- **The limit column.** `decks.shopping_limit_cents`, nullable, beside `declaredBracket` (`schema.ts:305`) and
  `intent` (`:318`).
- **Probes.** The new surfaces need a probe with a built fixture: a committed deck whose Shopping list carries an
  over-limit land, a fetch and a spell. The dev account's soft claims will not produce the `over` rows on their own.

---

## 4 · For Hugh

- **H1 (Design READINESS 1, brief §4.6).** In the picker: **Add** while a free copy remains, then **Add to buy**, or
  a hard stop with one line under the head.
- **H2 (Design READINESS 2).** Relabel the swap undo `Undo swap` in both tools, moving tuning's shipped `Put it back`
  (`deck-tuning.ts:206`), where ruling 7's text says `Put it back`. Today the row's removal undo reads `Undo`, and the
  review screen's reads `Put back` (F10).
- **H3 (new, F2).** Does a land whose text does more than make its colors (Cavern of Souls, Gaea's Cradle, Boseiju)
  take color stand-ins, or is its job its text, as ruling 6 says for Strip Mine?
- The §3.0 readings are drawn as written (Design READINESS 3). No ruling is needed unless Hugh wants to overrule one.

## 5 · Design's READINESS, answered

| Item | Answer |
|---|---|
| Owed to Hugh 1–3 | H1, H2; the §3.0 readings stand |
| Amendment 1 (DecklistRow) | Accepted; width probed (F12) |
| Amendment 2 (BuyTag ring) | Accepted; no new token |
| Amendment 3 (CardModal) | Accepted, with payload and stacking (F3) and the phone footer corrected (F8) |
| Eng 1 (limit column) | Accepted |
| Eng 2 (stand-in query) | Accepted, with F2 pending H3, F5 and F6 |
| Eng 3 (shared swap body, own undo store) | Accepted; return a refusal reason (F11) |
| Eng 4–5 (Shopping marks, sheet) | Accepted; add the 640 width (F7) |
| Eng 6 (Fits payload) | Accepted, plus `commanderLegal`, a has-decks flag and the universal staples (F1, F3) |
| Checks | Confirmed: no score, no new token, colour never alone, 44px phone targets |

---

## Addendum: the staple read, the door, and card → sheet → card (2026-09-24)

**Audited:** `addendum_staples_door_stacking/` against `origin/main` at `47a8a07a`. It answers this audit's F1 and
the two questions swap PR 4c waits on, and it amends the parent only where it says so.

**Verdict for the addendum: Green.** All three asks are drawn: the Fits picker at 560 and 390, the door at 1300
(824 modal) and 390, and the stack at 640 and 390. Nothing goes back to Design. One ordering is Design's reading,
which Design itself says Hugh may overrule (H4). It does not hold the verdict: overruling it moves one group and
changes no drawing.

### What came with it

- **Added:** the addendum folder, seven files.
- **Changed in the parent, by Design:** `Fits Your Decks.dc.html` and `Stand-ins Sheet.dc.html` turn every control
  drawn as a `<span>` (*Add*, *Add to buy*, *Take*, *Undo swap*, *Try again*, *Read the list again*, *Close*) into
  a real `<button type="button">`, with the default button styling reset. The reset also sets `lineHeight: 1`, so
  the padded desktop buttons (*Add*, *Add to buy*, *Take*) draw about 3 to 4px shorter than the old spans. The
  fixed-height phone buttons and the refusal row's do not move.
  `READINESS.md` records the change (*Buttons are real `<button>`s*) and adds a pointer to the addendum. No
  other parent file changed, and this audit is kept.

### The asked items

| Asked | Answered | Checked against |
|---|---|---|
| F1: the staple read in Fits your decks, at 560 and 390 | Yes. The commander chip keeps its slot and reads `staple · any commander`, and no percentage is drawn. A dashed note under the plate explains it once. Rows stay by name | `loadUniversalStaples`, `src/lib/staples/universal.ts:40`; not yet on the Fits payload (F18) |
| F1: does a stand-in carry the same read | Yes. The fact line ends `staple, any commander`. A staple to buy gets its own group, `to buy · staples, cheapest first`, between the free group and the commander ranking (H4) | `StandIn.isUniversal`, `stand-ins.ts:117`; `StandInGroups`, `:123-134` (F19) |
| The door on the shipped modal, 1300 and 390 | Yes. Desktop: in the art column under the price tag, a limit line, then `⇄ See cheaper stand-ins →`. Phone: a 44px strip under the art header | the tag's mounts, `src/components/cards/card-modal.tsx:1346`, `:1356` |
| Its over-limit color | The limit line carries it: `--warning` when over, `--fg-faint` when under. The tag is not recolored | F20 on the reason given |
| Card → sheet → card, and Escape | Yes. The card stays under the sheet, dimmed. The sheet's close becomes `← {card}` on desktop and `Back to {card}` on the phone. Escape and the scrim peel one layer at a time, with focus placed at each step. After *Take* the card's door becomes `swapped out · {stand-in} is in` | `Back to ${back}`, `card-modal.tsx:1595`; F16, F17 |

### Findings

| # | Sev | Evidence (origin/main) | Finding and correction | Owner |
|---|---|---|---|---|
| F16 | Medium | `src/components/decks/receipt-modal.tsx:159`; `card-modal.tsx:396-405`, `:1370` | **The phone stack needs a third depth.** Today a `ModalChrome` sheet sits at 52, the card modal is full height, and a stacked card sits at 96, one level only (`STACKED_SHEET`). The addendum draws this path at 52 (the card), 96 (the sheet) and 140 (the stand-in). A sheet at 96 and a card at 140 do not exist yet, and the card at 52 is new on this path. **Correction:** give both components a depth, drawn as 52 + 44 per level, and keep today's full-height card for every other opener | eng |
| F17 | Medium | `card-modal.tsx:446-447` | **The modal cannot tell a Shopping row from any other opener.** It takes `deckId` and `deckName`, but every opener on the deck page passes those (Consider, search and the decklist too), so a deck alone does not mean Shopping. **Correction:** the Shopping row's opener passes the limit, or an explicit flag, and the door renders only when that is present | eng |
| F18 | Low | `src/lib/staples/universal.ts:40`; `src/lib/swaps/stand-ins.ts:101`, `:117`; `src/lib/swaps/gather.ts:113`, `:121` | **There is no `isUniversalStaple`, and the stand-ins already have the read.** The shared definition is a set (`loadUniversalStaples`). The stand-ins gather loads it and stamps each row `isUniversal`, so the new group (F19) and the fact line read that flag. Only the Fits picker lacks it. **Correction:** give the Fits payload the same membership test. Build no second lookup | eng |
| F19 | Medium | `stand-ins.ts:123-134` | **The staples group is new.** `StandInGroups` has `free`, `cheapest`, `byCommander` and `unlisted`. A staple to buy leaves `byCommander` or `unlisted` for a new `staples` group ranked cheapest first; a free staple stays in `free`. **Correction:** add the group, selected by `isUniversal`, after H4 is ruled | eng |
| F20 | Low | `src/components/cards/price-tag.tsx:99`, `:121` | **The addendum's reason for the limit line's color is wrong; its answer is right.** It says the tag is already `--warning`-outlined for every card. The shipped tag is `--accent` on an `--accent-dim` edge, and dashed `--fg-locked` when unpriced. The limit line carrying the color still stands, since recoloring the tag would change it on every surface that draws it. **Correction:** build the limit line as drawn, and leave the tag alone | eng |
| F21 | Low | ADDENDUM-README "Copy" | **Six strings go to `/copy-review`:** `staple · any commander`, `staple, any commander`, `to buy · staples, cheapest first`, the staple note's two variants, `swapped out · {card} is in`, and `Back to {card}` | `/copy-review` |

### Hugh's rulings (2026-09-24)

Hugh approved the addendum's audit on 2026-09-24, including the three parent files.

- **H4 ruled as recommended:** a staple the player would buy sits in its OWN group, `to buy · staples, cheapest
  first`, between the free copies and the commander ranking. It is never placed by its share of decks, a figure
  its row does not show. Build F19 as written.

### For Hugh (as asked)

- **H4 (Design's reading).** When a stand-in list offers a staple you'd have to buy (Sol Ring in place of Mana
  Vault), should it come first among the cards to buy, cheapest first, in a group of its own? The alternative is
  ruling 6's order, where it sits by how often this commander's decks run it. One thing to weigh: the staple row no
  longer shows that figure, so ruling 6's order would rank it by a number the reader cannot see.
