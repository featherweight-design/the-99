# READINESS — Locked cards (R2, Hugh: LGTM 2026-09-24)

**Self-assessed: 🟢 Green for build planning.** Canonical canvas: `The 99 - Never Cut v2.dc.html`.
Where R2 and R1 disagree, R2 wins. R1 (`The 99 - Never Cut.dc.html`) is history.

## Engineering list, in dependency order
1. **Schema + action.** `deck_cards.never_cut boolean not null default false`. It isn't versioned and it's removed
   with the card. `setCardLocked(deckId, oracleId, on)`: the membership test and refusal are `setCardProxied`'s, and
   it revalidates the deck page and the tuning set.
2. **`LockMark` primitive.** `state: "closed" | "open"`, `ink`, 11×13. A CSS shape (arch, left leg, body, keyhole),
   `aria-hidden`.
3. **Decklist row.** A 22px desktop slot left of ✕ (hover shortcut, `tabIndex -1`). Phone mark. `describedBy`.
4. **Card tile.** A meta-line mark after the slot occupants, before the fact marks.
5. **Lock cards mode.** Deck-page state (not persisted). A toolbar button in both views. It swaps the ✕ for an
   `aria-pressed` toggle on rows and tiles; the key hides; one line with the count. It's optimistic and serialised
   like `ProxyControl`, with one live-region message per settle.
6. **Tuning.** A pack field, the prompt tag + rule (bump `prompt-version`), a `neverCut` validator drop after `cutInDeck`
   (not counted in the lead), `applies = false` when the cut is locked (`cutLocked`), and the all-locked Ready state.
7. **Swap tools.** Stand-ins skip locked cards: no ⇄, and no *See cheaper stand-ins →* in the modal.
8. **Climb 3b.** Locked cards sort last; the `listedLast` / `unreachable` sentences.
9. **Copy.** `never-cut · copy strings.ts` → `src/lib/copy/locked-cards.ts`, for `/copy-review`.

## Settled with Hugh
- No card-modal control. Locking lives on the deck page (rows and tiles).
- The mode is the mechanism on the phone, in tiles, and for the keyboard. The desktop row hover is a shortcut.
- Suggested changes is implicit: no manifest row and no read-line or lead clause.
- In the mode, locked uses `--accent` (matching *Done*). Unlocked uses the open-lock glyph.

## Open (not blocking)
- **Cap:** Design recommends none (R1 call 6). A cap would be a refusal on the toggle and a copy line; the layout wouldn't change.
- **Climb geometry:** 3b is drawn schematically in R1 1d. Match the shipped `UpgradePathPanel` sheet, and take only the
  order, mark and sentence from here.
- **Keyhole ink** is `--bg`. On the accent-filled toggle that reads slightly darker than the box. Accepted.

## Held
- The lock is only ever the player's choice. Nothing infers, suggests or seeds it; *Reject* never sets it.
- No score and no About entry (it batches at the analysis launch).
- A deck with no locks renders as shipped, plus the `Lock cards` button and the invisible 22px desktop slot.
- Colour is never the only carrier: open vs closed shape, `aria-pressed`, title, description.
- Targets: 44px on the phone in the mode; the phone at rest adds no target; the desktop toggle is 26×22 (pointer and keyboard).
