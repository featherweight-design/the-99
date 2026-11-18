# The 99 · Small items 12 (account 2, 2026-11-15)

Canvas: https://claude.ai/artifact/VafanvxMLwgwrJeAX6tDyN
Status: **R1 APPROVED by Hugh 2026-11-18** (all three items as drawn; the open questions stand as drawn: 2.5° tilt, the feed lead, the picker over the menu).

Three small changes from Hugh's notes (no separate brief): the combo sheet, the account menu, and the price label on Discover's commander rows. Each is drawn at 390 and at desktop over the shipped component it changes. Every frame is the shipped component, or a patched copy of it, rendered server-side with the shipped CSS (Low Sun). New or moved pieces get a dashed copper outline on their own frame. Strings marked DRAFT go through `/copy-review`.

To view a board, open its `.dc.html` with `support.js` and `art/` beside it.

| Board | Item |
|---|---|
| `Main.dc.html` | Every call and the open questions |
| `Combo-Sheet.dc.html` | 1 · The combo sheet, refreshed, with numbered steps |
| `Account-Menu.dc.html` | 2 · Change your signature card from the account menu |
| `Price-Label.dc.html` | 3 · The price source label sits beside the price |

Sources: main @c2440df. Shipped components read and rendered: `cards/card-combo-sheet.tsx`, `decks/combos-close-sheet.tsx`, `decks/receipt-modal.tsx` (`ComboBody`, `ReceiptTile`, `ModalPanel`), `decks/combo-where-line.tsx`, `ui/cost-pips.tsx`, `home/first-run.tsx` (`LockedStep` numeral), `feed/feed-item.tsx`, `shell/account-menu.tsx`, `social/friends-head.tsx`, `social/signature-picker.tsx`, `commanders/commander-row.tsx`. Handoffs: `combo_awareness`, `combos_close`, `user_menu`, `avatar`, `small_items_11`.

## 1 · The combo sheet, refreshed

Hugh: "Numbered steps in the Combo modal. I also feel like this modal needs a bit of a refresh. It feels a bit out of step with the rest of the UI."

1. **One body for every way in.** Card details' combo line (UI-3), the deck's combos one piece away (UI-2), and the feed's combo item, which engineering is pointing at this sheet. Only the head differs:
   - Something to go back to: the shipped `.bk2` bar (`← Avatar Aang`, `← 5 combos`) and the ×.
   - Opened by the feed on its own: the shipped `.hd2` head (the combos list's and pass sheet's head). Eyebrow `Combos you can make` (the feed kind's shipped name), the pair as the title with the ∞ glyph, the item's line as the lead, a bare ✕. The body then drops its own title.
2. **The pair leads.** The two pieces as cards at card shape (`ReceiptTile`, 150px on the phone, 128px at 760), tilted 2.5° toward each other with a 30px **+** disc between. Plate names, where-lines and the dashed missing piece are shipped. A plate opens its card details stacked, as today; the card the sheet was opened from takes no press, as today.
3. **Title, then what it makes.** ∞ + names at 18/19px display, then the produces chips on `--elevated` with no border (the hairline boxes were the loudest thing on the sheet).
4. **Facts before steps.** Mana needed and Needs in one `--surface-rail` card (radius 12, label column 92px). Needs moves above the steps: it is what must be true before step 1. Needs absent (36% of combos): the card is Mana needed alone.
5. **Numbered steps.** A `Steps` group head with its count in faint mono (the combos list's `.oa h5`), then each step on a grid of the first-run step numeral (22px, radius 6, `--border-strong`, mono 11px in `--accent-text`) and the text at 13.5/1.55 in `--fg-body`. A 1px `--border` rule joins each numeral to the next. `{X}` in a step or in Needs is drawn as the shipped `CostPips` (13px) inline.
6. **Long combos scroll.** Head and foot stay pinned; the body scrolls, so the pair and facts go first. No collapse, no "show all". At 760 the two columns scroll as one body.
7. **Foot unchanged** (`.cft`): Commander Spellbook bottom left; `Add {card}` bottom right only where today's sheet offers it. The feed-opened sheet has no Add (both pieces are owned and there is no deck in scope).
8. **Feed-opened plates** say where each copy is (`in {deck}` / `spare`), from the same `MissingPieceWhereLine` decision.
9. **Desktop** is the shipped 760 modal: plates in a 288px left column, title, facts and steps on the right.

Fixture: Avatar Aang + Searing Touch (the combos close fixture). The 9-step text is a layout fixture written for this round; the build draws Spellbook's own steps.

## 2 · Change your signature card from the account menu

Hugh: "Enable avatar editing from the user menu."

1. **The face is the press**, not a menu row (Hugh's rule: no new user-menu rows). Both heads (popover 44px, sheet 48px) wrap the shipped `Avatar` in a button with Friends' head badge (`friends-head.tsx`): 22px round, `--elevated`, dashed `--border-dashed` edge, `✎` with a card or `+` without one. Names: `socialCopy.signature.changeAria(card)` / `socialCopy.signature.choose` (shipped).
2. **It opens the same picker**, `SignaturePicker` unchanged, over the menu: on the phone its sheet covers the menu sheet; on desktop its 520 modal sits over the page and the popover stays open beneath the scrim with the face held in Friends' picking outline.
3. **Save or ✕ returns to the menu** with focus on the face. A save closes the picker once the write lands (as on Friends); the head and the trigger draw the new art. Friends keeps its own way in.

## 3 · The price source label

Hugh: "manapool" sits far from the price. It was built as the R1 canvas drew it (`ml-auto`, `commander-row.tsx:481`).

1. **Beside the figure**: the stamp moves inside `PriceFigure`, 6px after the figure, in the same flex item, so it wraps with the price and never ends a line alone. Same string (`discoveryCopy.price.source`), same 10px mono `--fg-locked`, still `aria-hidden` (the sr-only sentence carries it).
2. Not stocked reads `○ not stocked manapool`.
3. **Every row with a priced source stamp**: the stamp is drawn only by `commander-row.tsx`, which is both Discover's list and the Commanders list (`commanders-list.tsx`). One change covers both. Card details, the price strip, Shopping and the cart name Mana Pool as links or buttons, not as a stamp beside a figure.

## Open for Hugh

1. The 2.5° tilt on the combo pair, or flat.
2. Feed lead copy: `You added Searing Touch. You own both halves now.` (second sentence DRAFT).
3. Picker over the menu (drawn) or closing the menu first.

## scratch-gen

`render.tsx` (combo), `render-menu.tsx`, `render-row.tsx` SSR the shipped components and the proposals (`proposal/combo-sheet.tsx`, and `menu-new.tsx` / `row-new.tsx` with their diffs against main in `menu.diff`, `row.diff`). `scratch-only.diff` holds render-only stubs (a card-detail context stub, inline modal, a loaded deck row), never for the build. Recipe as `small_items_11/addendum-password-strength`: a scratch copy of main with the `@fwd-stack` devDeps dropped, `pnpm install --ignore-scripts`, `node css.mjs`, `tsx run2.cjs ./render-*.tsx`, `node shoot.mjs amonkhet <names>`, then `si12.py out` and `node measure.mjs <boards>`.
