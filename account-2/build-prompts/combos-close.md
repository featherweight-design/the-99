# Build prompt · Combos one piece away (R1b)

Paste into Claude Code on your machine once PR #2214 is merged.

---

Build combos one piece away: the deck page lists the two-card combos the deck is one card short of, card details show which pieces you hold, and a combo opens with Spellbook's steps and mana. Start with `design/design_handoff_the99_combos_close/README.md`, then `READINESS.md` and `STATES-combos-close.md`. Open each `.dc.html` with `support.js` beside it. Work in a worktree under `.worktrees/`, as AGENTS.md says. Every new string is a placeholder for /copy-review.

Plan it as separate PRs in this order, behind one new switch, `COMBOS_CLOSE_ENABLED`, in `src/lib/switches/registry.ts`:

1. **The read (G1, G3 to G7).**
   - Extend the near-miss read (`src/lib/combos/near-miss.ts`, `pairsWithOnePiece`) for a deck: two-card combos exactly one piece away, legal in the deck's colors, with §4.3b rule 2 kept (a command-zone-only piece is never offered as a card to add).
   - Select `steps`, `mana_needed`, `mana_value_needed`, `notable_prerequisites` and `bracket_tag` from `spellbook_variants`. They're already stored; confirm no new storage is needed.
   - Where the missing card is, per availability: a spare (free ≥ 1) wins. Otherwise it's "in another deck", naming the first committed deck and listing all of them in the detail. Otherwise it's to buy, with the shipped price.
   - Compute it on the deck page's read, like the row combo mark, with no profile or Analyze. Bracket marks stay as today, and an infinite-turns combo keeps the turn-again mark.
2. **The deck page segment and the list (Deck-Page and The-List boards).**
   - **Segment:** "∞ N combos one piece away ›" on the status line, after the version. It sits in the to-do card's foot, or in the quiet strip when there's nothing to do. There's no segment at zero.
   - **List:** the segment opens a sheet at 390 and a modal at 1300, in the pass sheet's `ModalChrome`.
     - Groups: You own it (spare, then another deck), then To buy (cheapest first).
     - Each row shows ∞ (plus the turn-again mark), the missing card, "with" the held piece ("commander" when it leads), the where-line, and what the combo does.
     - In "in HD - X", the deck name links to `/decks/{id}` with a 44px hit area. The rest of the row opens the combo.
     - Adding the last one closes the sheet and the segment goes. There is no empty sheet.
3. **How it works (How-It-Works board).**
   - The shipped `ComboBody` (`receipt-modal.tsx`) opens inside the sheet ("← N combos"). Each plate gets a where-line, and the body shows Mana needed, Steps and Needs.
   - Foot: the Commander Spellbook ↗ link bottom left, and a compact "Add {card}" bottom right that adds the card as Consider's Add does. There's no "missing piece" line and no "· to buy".
   - A plate opens the shipped card details, stacked via `registerSheet`. Depth stays at two.
4. **Card details (Card-Details board).**
   - The shipped `ComboPartnersDetail` keeps its closed counts. Open, it groups lines into "Whole in this deck" and "One piece away · you hold the rest".
   - Each line gets the same where-line and opens the combo. The partner's card now opens from its plate.
5. **About (About board).**
   - Add `combos-one-away` from `about · combos one piece away.ts`, with one `ABOUT_VERSION` bump: 18 if the menu and Home line shipped 17 first, otherwise 17.
   - Edit `combo-awareness` key 1.
   - Recapture `deck-your-deck` in all six themes with the switch on (G8), and add a locator such as `[data-combos-close]` on the segment.

Phone and desktop ship in the same PR. Each UI PR passes design-review.
