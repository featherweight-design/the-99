# Gap report: Combos one piece away, UI-3 (card details block + the combo over a card)

Table: `docs/superpowers/design-tables/combos-close-ui-3.md`. Ratified resolutions: `ui3-spec.md` OPEN-1..15.
Branch `combos-ui-3` at 14009532f (diff against origin/main). These are accepted deviations and are not counted as gaps:
OPEN-5 (the identity filter only runs with commanders passed, and never on the flat list), OPEN-11 (Add is not
optimistic), and OPEN-10 (the opened card's own buy tag never shows sold out).

Files: `src/components/cards/combo-partners-detail.tsx` (CPD), `src/components/decks/combo-where-line.tsx` (CWL),
`src/components/cards/card-combo-sheet.tsx` (CCS), `src/components/decks/receipt-modal.tsx` (RM),
`src/components/cards/card-detail-provider.tsx` (CDP), `src/lib/combos/modal-block.ts` (MB),
`src/lib/combos/near-combos.ts` (NC), `src/lib/collection/card-detail.ts` (CD).

## PASS 1: Visual properties

### 1. Block chrome
| Row | Result |
|---|---|
| Host / order (after Bracket facts, before availability) | ✅ MATCH (card-modal.tsx:2781-2788, unchanged mount) |
| margin-top 16 / 22 (ratified) | ✅ MATCH `mt-[16px] md:mt-[22px]` (CPD:103) |
| padding 14/16, 18/20 | ✅ MATCH `p-[14px_16px] md:p-[18px_20px]` (CPD:103) |
| radius 10, bg `--bg`, border 1px `--border` | ✅ MATCH (CPD:103-104) |
| Absent with no lines | ✅ MATCH `if (!hasPartners) return null` (CPD:75,87). `withCardCombos` leaves the field out when the list is empty (CD:305) |

### 2. Header row
| Row | Result |
|---|---|
| Whole row is the disclosure button inside a heading | ✅ MATCH (CPD:111-163) |
| flex, center, gap 10 | ✅ MATCH (CPD:121) |
| min-height 52 (ratified) | ✅ MATCH (CPD:121) |
| Text column: mobile is a column with gap 3px | ❌ MISMATCH. Design: column, gap 3px. Implementation: `flex-col` with no gap at 390 (`sm:gap-[10px]` only) (CPD:126). This is the shipped header and was not changed |
| Text column: one line from `sm` (ratified) | ✅ MATCH `sm:flex-row sm:items-center` (CPD:126) |
| 2a glyph | ✅ MATCH `ComboGlyph` (shipped, unchanged) |
| 2b label Mono 10, .1em, uppercase, `--fg-faint` | ✅ MATCH (CPD:127-131) |
| 2c summary 10/10.5 sm, `--fg-muted`, truncate; inDeck `--success`; order and zero-omit | ✅ MATCH (CPD:145-157; `summariseCardCombos` MB) |
| 2d scope line 10/10.5, `--fg-locked`, truncate, open with a deck only, opening deck's name | ✅ MATCH (CPD:137-143) |
| 2e `*` mono 11, `--accent-text`, 44×52, open only, qualifier unchanged | ✅ MATCH (CPD:167-191) |
| 2f chevron, disclosure, `--fg-faint` | ✅ MATCH (CPD:161; shipped `Chevron` size) |

### 3. Open list
| Row | Result |
|---|---|
| ul list-none, mt 6, p 0, column, gap 0 | ✅ MATCH (wrapper `mt-[6px]` CPD:302; ul CPD:295) |
| Semantics: an `h4` before each `ul` | ✅ MATCH (CPD:303-317, 328) |
| 3a heading Mono 9, .12em, uppercase, `--fg-faint`, pt10 pb4, border-top `--border`, no count | ✅ MATCH (CPD:330) |
| 3a an empty group is not drawn | ✅ MATCH (CPD:305,311) |
| 3a `.gh + li` border-top 0 | ✅ MATCH `[&>li:first-child]:border-t-0` on headed lists (CPD:295) |
| 3b line flex, center, gap 10, min-h 44, border-top `--border` | ✅ MATCH (CPD:370) |
| 3b plain `li`; a click outside `a, button` opens the combo | ✅ MATCH (CPD:360-367) |
| 3b pressed/focus outline 2px accent, offset 2, radius 6 | ✅ MATCH via `active:` and `has-[[data-combo-press]:focus-visible]` (CPD:372) |
| 3c lemniscate + turn-again mark beside it (OPEN-13) | ✅ MATCH (CPD:377-384) |
| 3d text column flex-1, min-w-0, column, gap 2 | ✅ MATCH (CPD:385) |
| 3e `.p1` Sans 13 `--fg-body`, lead + `b` 600 `--fg`, not a button, ellipsis | ✅ MATCH (CPD:387-389). The ellipsis is on the name; the lead is `flex-none` |
| 3e commander tag Mono 10 `--fg-faint` ml 4 (OPEN-13) | ✅ MATCH (CPD:390-392; `isCommander` NC) |
| 3f `.p2` flex, center, gap 7, Mono 10, `--fg-body` | ✅ MATCH (CPD:395) |
| Where: inDeck (green dot + `--success` text) | ✅ MATCH (CWL:33-39) |
| Where: spare | ✅ MATCH (CWL:41-47) |
| Where: elsewhere (deck link to `/decks/{id}`, first committed, `+N` faint) | ✅ MATCH (CWL:49-81; `holdingDecks` committed first) |
| Where: notOwned priced (`.od.no` dashed `--fg-locked` ring + buy tag + qualifier) | ✅ MATCH (CWL:22, 86-91) |
| Where: sold out `--fg-muted` / never stocked: nothing | ✅ MATCH (CWL:92-96) |
| 3g `.dlk` color, underline `--border-strong`, offset 2 | ✅ MATCH (CWL:68) |
| 3g hit 12px vs UI-1's 15px | ✅ accepted ambiguity 5 (CWL:68 uses 15px) |
| 3g pressed `.hit` outline (2px accent, offset 2, radius 3) | ❌ MISMATCH (low). The link has no active-state outline. Focus shows only the global `:focus-visible` ring (globals.css:686) (CWL:65-71) |
| 3g press navigates and does not open the combo | ✅ MATCH (`closest("a, button")` guard CPD:363) |
| 3h buy tag Mono 10, `--warning`, 1px `--accent-shadow`, radius 4, px 5, lh 15 | ✅ MATCH (CWL:88) |
| 3i `›` `--fg-faint`, w 20, centered, real button, aria `{card} + {partner}` | ✅ MATCH (CPD:399-410) |
| 3i stacked card: no column, no press | ✅ MATCH (`press ? ... : null` CPD:360,371,399) |

### 4. Order and grouping
| Row | Result |
|---|---|
| Deck in scope, card in scope: G1 inDeck in the read's order; G2 spare, elsewhere, buy cheapest first, unpriced last | ✅ MATCH `groupCardCombos` / `byWhere` (MB) |
| Card not in scope (OPEN-6): flat list, scope line kept, inDeck first | ✅ MATCH (`inScope` false gives a flat list with WHERE_RANK inDeck 0; the scope line depends only on `deckName`, CPD:137) |
| Deck-less: flat, no headings, no scope line | ✅ MATCH |
| Non-addable partner omitted (OPEN-5) | ✅ MATCH within the accepted deviation (`keptInDeckScope` NC) |
| Closed counts from the same deduped list (OPEN-1) | ✅ MATCH (`summariseCardCombos` runs `onePerPartner`; cap = `CARD_COMBOS_SHORTLIST` CD) |

### 5. Combo over a card
| Row | Result |
|---|---|
| 5a mobile sheet (bottom, radius 18 top, covers the card's height) | ✅ MATCH, near enough (RM:243-246, `h-[calc(100%-52px)]`, radius 14 top when not `fit`). Inherited from shipped `ModalChrome` |
| 5a grabber 40×4 | ❌ MISMATCH (low, inherited). `ModalChrome` draws no grabber. UI-2's sheet draws none either |
| 5a desktop 760 wide, 40px down, lighter scrim | ✅ MATCH (`width={760}` CCS:96; `md:pt-[calc(...+40px)]` and a 60% scrim RM:226,235) |
| 5a card kept mounted underneath, covered | ✅ MATCH (`overCard` lifts it into `held`; CDP:1699-1703 keeps its lines) |
| 5b back bar `.bk2` (52px, `← {card}` left in Sans 500 13.5 with a 16px `--fg-muted` arrow, ✕ 44×44 right, title not drawn) | ❌ MISMATCH (medium). The implementation uses `ModalChrome`'s `overCard` header (CCS:92-98, RM:376-421): it DRAWS the title `{A} + {B}` as a visible display-font `h2` (15/16px, 43px tall on the phone), and puts a 32px pill `← {card}` (12.5px semibold) on the RIGHT in place of the ✕, with no ✕. The combo title is therefore drawn twice, once in the header `h2` and once in `ComboBody`'s `h3` (RM:600). The `.bk2` markup already exists as `ModalPanel`'s `back` branch (RM:327-352). The label text and the aria (`← {card}`, `Back to {card}`) do match OPEN-8 |
| 5c body column/row, gaps, padding | ✅ MATCH (RM:582) |
| 5c plates row gap 7, desktop self-start | ✅ MATCH (RM:583) |
| 5c plate 96 wide, art, missing outline | ✅ MATCH (RM:591 and shipped tile) |
| 5c plate name 11px | ❌ MISMATCH (low, inherited UI-2). `text-[11px] md:text-[10.5px]` (RM:508) |
| 5c plate where-line variants | ✅ MATCH (CWL `on="plate"`) |
| 5c plate order: opened card first, then partner (OPEN-10) | ✅ MATCH (CCS:73) |
| 5c opened card's plate is not a press | ✅ MATCH (`stillOracleId` → `press={false}` RM:595, 518-523) |
| 5c partner plate opens card details stacked | ✅ MATCH (`CardDetailTrigger` → third layer CDP:1823) |
| 5c title Display 700 16px, lemniscate, ` + ` faint 400 | ❌ MISMATCH (low, inherited UI-2). 16px on phone but `md:text-[17px]` (RM:600). Everything else matches |
| 5c chips, fields, mana, steps, needs | ✅ MATCH (RM:627-667) |
| 5d foot flex, gap 12, border-top, 12/16/18 | ✅ MATCH (RM:673) |
| 5d Spellbook link Mono 10.5, accent, underline offset 3, min-h 44 | ⚠ The board uses `--accent`; the implementation uses `--accent-text` for both color and underline (RM:679). Inherited from UI-2, and the same accessible-ink substitution as `*` (2e) |
| 5d Add: 44 tall, px 18, radius 9, Sans 600 13.5, partner name | ❌ MISMATCH (low). `h-[44px] md:h-[36px]` (CCS:125), so 36px at desktop. This copies UI-2's precedent (combos-close-sheet.tsx:269) |
| 5d Add shown when deck in scope + deck page + group 2 + addable | ✅ MATCH `offersAdd` (CCS:46-49) and `deckId={deckPage ? deckId : null}` (CDP:1817). Addability follows the read's filter (accepted OPEN-5) |
| 5d after Add: close to the card, re-read, line moves to group 1 | ✅ MATCH (CCS:86-89, CDP:1467-1481 → `evict` re-loads the open card) |
| 5e stacked partner card, back `{A} + {B}` | ✅ MATCH (`registerSheet(backLabel = title)` RM:195; third layer `backLabel` CDP:1857) |
| 5e depth: the third layer's lines are not pressable | ✅ MATCH (the third-layer `CardModal` passes no `onOpenCombo`, so it defaults to null) |

### 6/7. Hover, transitions, responsive
✅ MATCH. No hover or transition is added. The lines stay two-line at 1300. The block's padding and margin step up at `md`.

## PASS 2: State reachability

| State | Result |
|---|---|
| S14 Closed | ✅ REACHABLE. Counts come from `summariseCardCombos(near.combos)` (CPD:90). The server sets `cardCombos` (CD `withCardCombos`) |
| S15 Open, deck + card in scope | ✅ REACHABLE. `inScope` is computed in `loadCardCombos` (NC); the split comes from `groupCardCombos`; `where`, `decks`, `cents/soldOut/qualifier` (priced via `loadPrices`), `produces` and `isCommander` are all carried |
| S15 group empty | ✅ REACHABLE (CPD:305,311) |
| Open, card not in scope (OPEN-6) | ✅ REACHABLE (`inScope` false → flat list; scope line from `deckName`) |
| Open, deck-less | ✅ REACHABLE (no `deck` arg → `inScope` false, no `deckName`) |
| Stacked card, no press (OPEN-9) | ✅ REACHABLE (`sheetsBelow > 0 \|\| partnerOf !== null` → null CDP:1804; the third layer defaults to null) |
| Empty | ✅ REACHABLE (the field is left out → block null) |
| Switch off | ✅ REACHABLE (`nearCombosEnabled(env)` false → `withComboPartners`, `cardCombos` never set; the shipped branch is CPD:203-268) |
| Line pressed | ✅ REACHABLE. The provider's `setComboSheet` renders `CardComboSheet` with steps, mana, prerequisites and produces through `nearComboModal`, and art for both plates (`imageUri` on `CardComboOther` and the card's resolved printing) |
| Deck link pressed | ✅ REACHABLE (CWL:65) |
| S10 To buy over card | ⚠️ PARTIALLY. Plates, buy tag, title, chips, fields and foot (+Add per OPEN-11) are all drawn. The partner plate's dashed missing outline is drawn only when `inScope` (CCS:106), so a to-buy partner opened deck-less or from a card not in the deck gets no `.pl.miss` outline |
| S11 Owned over card | ✅ REACHABLE (the plate where-line uses `partner.where`) |
| S11 Whole over card | ✅ REACHABLE (`offersAdd` false for inDeck; no missing outline) |
| S12 Plate pressed | ✅ REACHABLE (backLabel = sheet title) |
| S13 No mana / unknown | ✅ REACHABLE (shipped `Mana` fallback strings) |
| Add succeeded | ✅ REACHABLE (`onAdded` → close → `evict` → re-load) |

## Gaps

1. **Combo sheet header** (medium). The header is the `overCard` pill header, not `.bk2`. It draws the title visibly, which duplicates the body's `h3`. It puts a 32px `← {card}` pill on the right instead of a 52px back bar with `←` on the left and ✕ on the right, and it draws no ✕. CCS:92-98, RM:376-421.
2. Header text column at 390 has gap 0, not 3px (low; the shipped header). CPD:126.
3. `.dlk` has no pressed `.hit` outline; only the global focus ring (low). CWL:65-71.
4. Add is 36px tall at desktop, not 44px (low; UI-2 precedent). CCS:125.
5. S10 outside deck scope draws no dashed missing outline on the to-buy partner plate (low; state partially). CCS:106.
6. Inherited from UI-2's shared `ComboBody`/`ModalChrome`, outside UI-3's diff (low): no phone grabber; title `md:text-[17px]`; plate name `md:text-[10.5px]`; Spellbook link in `--accent-text` rather than `--accent`. RM:243, 600, 508, 679.

VERDICT: PASS WITH GAPS. One medium visual gap (gap 1, the combo sheet's header) and five low ones. Every state is reachable except S10 outside deck scope, which is partial.

## Confirm pass

1. Combo sheet `.bk2` back bar: FIXED. `CardComboSheet` passes `back={{ label: name, aria: copy.card.backAria(name), onBack: onClose }}` and still passes `overCard` (src/components/cards/card-combo-sheet.tsx:99, 101). `ModalPanel` tests `back !== undefined` first in its header ternary, so it wins over `overCard` (src/components/decks/receipt-modal.tsx:327): 52px row, title `sr-only` (:333), back button `aria-label={back.aria}` in Sans 500 13.5px `--fg` with a 16px `--fg-muted` arrow, 44x44 close. `overCard` still sets `onCard` for `registerSheet`'s card lift (:193-195).
2. 3px gap between label and summary at 390: FIXED. `flex-col gap-[3px] sm:flex-row sm:gap-[10px]` (src/components/cards/combo-partners-detail.tsx:126, 216).
3. `.dlk` pressed outline: FIXED. `active:rounded-[3px] active:[outline:2px_solid_var(--accent)] active:outline-offset-2` (src/components/decks/combo-where-line.tsx:68).

Dispositions:

- Item 4 (Add 36px at desktop): not a gap; UI-2's ratified table (combos-close-ui-2.md line 343) draws a 36px Add at 1300.
- Item 6 (grabber, 17px title, 10.5px plate name, Spellbook link ink in UI-2's shared ComboBody/ModalChrome): outside UI-3's diff, carried to the close-out's whole-brief design-review.
- Item 5 (dashed missing outline only with a deck in scope): by design, OPEN-6; with no deck or a card outside it there is no missing piece to mark.

VERDICT: PASS. All three fixes confirmed; remaining items dispositioned above.
