# The 99 — I got it (design handoff, R2)

`design/design_handoff_the99_i_got_it/` · 2026-10-09 · collection home epic, sub-project 4

**Status: approved to ship (Hugh, 2026-10-09, LGTM).** The current canvases are R2 · A+B and R1 · C+D+E. R1 · A+B is withdrawn and kept only for the record. Fidelity is high. Geometry, tokens and component reuse are final. Card names, deck names and figures are illustrative.

**Review history.** R1 §A was withdrawn: there was no real estate on the Shopping rows for a separate control, so R2 makes the buy tag the control. **R2 review (Hugh, 2026-10-09), applied:**
- The key is now two short items (`⇄ cheaper stand-ins`, `buy bought it? press to add it`), with the ⇄ at 15px. They sit in one row on desktop (matching the Collection and Deck details keys) and in a two-column grid on the phone. The ⇄ item replaces shipped `swapToolsCopy` text.
- The confirm is the app's normal modal on desktop: a 520px centred dialog with the scrim, round ✕ and focus trap. The phone keeps the bottom sheet.
- The title is `Bought this card?` with the card's name under it. The details link uses the same words.
- Removed: the lede, the preset and changed lines, `Back to the listed one`, `listed $X` on tiles, and the `you own … →` line. The preset printing still comes from the price, but the modal shows no price.
- Printing tiles are larger (104px desktop, 100px phone).
- **Shipped-row change:** below `lg`, the stack is now `buy` on top and `over $X` under it.

Source of truth: `docs/superpowers/design-briefs/2026-10-09-collection-i-got-it.md` (main). Read alongside: `decks/{buy-tag,decklist-row}.tsx`, `cards/printing-region.tsx` (in the 1+2 choose role), and the collection edit handoff (`design_handoff_the99_collection_edit/`, approved): its §E `ShortDeckWarning`, F1's `HistoryEntry`, R2 §D's toast and B4m's row-layout picker.

**About these files.** The canvases are design references built in HTML. Open them with `support.js` beside them, then rebuild in the app's stack. Every value is an existing token, and the canvases pin Kaldheim (First Frost) from `globals.css`. **No new tokens and no new dependencies.**

| File | Holds |
|---|---|
| `… (R2) · A Row and B Confirm.dc.html` | **Current.** §A1: the shipped Shopping view at 1300 (with a confirm open) and at 390, plus the two-line key. §A2: every row shape, none of them changed. §A3: the buy tag's states. §A4: the second way in, from the card's details. §B1/§B2: the confirm, as the normal modal on desktop and the bottom sheet on the phone. |
| `… (R1) · A Row and B Confirm.dc.html` | **Superseded.** It added a separate control to the row. Kept for the record (it uses `IGI Row R1`). Its confirm frames now render the R2 confirm, since the part is shared. |
| `… (R1) · C Receipt, D History and E Switch off.dc.html` | §C1/C2: the write landing, the row leaving, the row staying (claimed by an older deck, and partial), at 390 and desktop. §C3: undo checking, the warning (sheet and dialog), in flight, done, failed. §C4: the leave transition. §D: History entries (live, reverted from the toast, deleted deck) at both widths. §E: switch off. |
| `IGI Row.dc.html`, `IGI Confirm.dc.html`, `IGI Toast.dc.html`, `IGI Row R1.dc.html` | Canvas parts imported by the canvases. They aren't production components. |
| `STATES-i-got-it.md` | Every state, with its Must-nots. |
| `READINESS.md` | Self-assessed readiness and gaps. |
| `i-got-it · copy strings.ts` | Proposed `src/lib/copy/i-got-it.ts`. Intent only; the strings go through `/copy-review`. |
| `about-entry/` | The About entry, S1 `shopping-got-it`: its §G template artboard, the `AboutEntry` object and a README. It goes in chapter 03 after `stand-ins`, `since: 12`, and ships with the launch bump. |
| `brand/` | The locked brand sheet, copied in so the package is self-contained. |

The About entry is packaged here, in `about-entry/`, not as an addendum under `design_handoff_the99_about/`.

---

## The eight Design calls (brief §"Open for Design to call")

1. **Where the control sits (R2).** **Nowhere new: the shipped buy tag becomes the control.** `BuyTag variant="row"` in Shopping renders as a `<button>` with the same plate, word, figure slot and over ring, so at rest it's pixel for pixel `main`'s, and nothing on the row moves. Only the wash moves: 13% at rest, 24% on hover or while open, 30% on press. Focus is the app ring. While pending, the figure slot reads `adding…` (it fits the 46px slot `sold out` already sizes). Below `lg`, the hit area grows to 44px tall by an invisible 8px above and below, and with `over $X` stacked, the stack is the one target. Its name is `I got it: <card>`, and the tag's existing sentence becomes its description. **The tag reads as one action, not a second tag, because there's still only one tag.** It's the only element on the row about buying this card, and today it does nothing when pressed. **Teaching:** one mono line joins the ⇄ hint in the Shopping head: `[buy] once it arrives: press it and the card joins your collection.` **A second way in:** in the card's details opened from a Shopping row (the existing `door` context), `I got it` sits right-aligned on the *In your collection* receipt's label line. That's the 1+2 `Edit copies` slot, and the two never draw together. The All tab's collapsed `$` tag stays inert.
2. **The confirm's form (R2 review).** The app's normal modal: a 520px centred dialog on desktop, a bottom sheet on the phone, with one form.
3. **The printing.** `PrintingRegion role="choose" layout="row"` (B4m), with larger tiles. The printing behind the Shopping price is preselected with no badge and no price shown: once bought, the price doesn't matter (Hugh). **No printing behind the price:** nothing is selected, and Add reads `Choose a printing` until a tile is chosen (Open 1).
4. **Quantity.** A stepper, preset to the need, capped at 20. Spares read `The deck needs 1 · 1 spare`. The expected count still goes with the write (`staleEdits`), but it isn't printed.
5. **The receipt.** The **1+2 toast** (R2 §D), in the app's toast slot (bottom of the phone column above the tab bar, bottom left of the desktop deck pane). It says the card, ×N, printing and finish, with `History` and `Undo`. It survives the row leaving because it isn't on the row. `role=status` is polite, and the failure is `role=alert`. It lasts the toast's 8s, held while hovered or focused or while an undo is in flight, or until the next write. **When an older deck took the copy,** the toast gives a full sentence naming that deck and what this one still needs. The row says the same thing (owned dot, `◆ short`), so nothing depends on the toast staying.
6. **Undo.** On the toast. It's a revert of the entry, and `Checking decks…` shows from the first frame. If a committed deck would be short, §E opens with a new verb, `Undoing leaves a deck short` / `Undo anyway` (dialog on desktop, sheet on the phone, Cancel focused). **The source deck is excluded from that check.** The player is on its page, undoing its own purchase, and its row coming back is the warning. Otherwise every clean undo would warn about the deck the player is looking at. On failure, Undo is withdrawn and the toast points to History, following the UndoRow rule.
7. **History.** F1's row, unchanged. The `From Shopping` tag is live in `--success` (the ink of the two other add-only kinds). The title is the card. A deck line reads `From HD Gishath's Shopping list`, where the deck name is a link resolved from `shopping:<deck id>` at read time, so a renamed deck reads its new name. **When the deck is deleted:** `From the Shopping list of a deck you've since deleted`, with no link, and Revert is kept.
8. **The leave transition.** The row's slot becomes the decklist's spent-slot shape: the same `rowShell`, so it's 52px or 34px by construction (H29), a dashed sunken box with `Etali, Primal Conqueror · in your collection` in muted mono and no controls. It's a 150ms opacity crossfade, and a swap under reduced motion. It holds until the list is read again (a tab switch or a revisit). The tab count, group count, price total and Mana Pool link update at once, and none of them changes height. A row that **stays** redraws in place and joins `Spoken for` only at that next read.

## Other decisions
- **Disabled** means another write for the same card is in flight (an undo from its toast). Each write sends the count the player saw, so a parallel write would come back stale.
- **Stale** redraws the same form in place: a banner (`role=status`, which takes focus), the own line re-read, and the count re-based on the new need. Nothing has been written, and the player confirms again. If the need is now 0, the count stays and the banner says *Add anyway if this is a spare* (`staleBodyDone`).
- **Cancel, Escape, a click outside, or opening another row's confirm** close the form, write nothing and return focus to the control. There's no "discard?".
- **One confirm open at a time** across the list.

## Open — for Hugh
1. **The fallback printing.** The brief says *the card's default printing, the same one the Add cards sheet presets*. The approved 1+2 handoff ruled that Add cards has **no** default (a required printing step). R1 follows the handoff: no price means nothing preset and a required pick. If the brief meant a real default (say, the newest printing), that's one line to change in the confirm, and B1's no-price state becomes the preset state with a different intro line.
2. **The source deck is left out of the undo warning** (call 6). It's an engineering ask on the §E check: exclude `shopping:<deck id>`'s deck. If declined, every clean undo raises the warning about the deck on screen.
3. **The toast's 8 seconds** are the 1+2 value. The claimed sentence is the longest thing the toast has carried, and it's held while focused or hovered, but on a phone with neither, 8s is tight for three lines. Design is comfortable because the row repeats the fact. If Hugh disagrees, the fallback is 12s for the claimed form only.
4. **The cap of 20** is a judgement. It's well above any Commander need and below a bulk-entry tool.

## Notes for engineering
- **Components:**
  - New: `GotItConfirm` (popover / sheet).
  - Changed: `BuyTag` gains `onPress` / `state` (`rest | open | pending | disabled`). It renders as a button only when `onPress` is given, which is Shopping, `density="full"`, with both switches on. `ShoppingHead` gains the hint line. `OwnedLine`'s sibling slot gains `I got it` when the modal came from a Shopping row.
  - Reused: `PrintingRegion role="choose" layout="row"`, `ShortDeckWarning` (gains `undo`), `HistoryEntry` (gains the `shopping_mark_bought` deck line), the app toast.
  - Changed: `DecklistRow` passes `onPress` to the tag, and gains a held-slot state alongside `spent`.
- **The write:** `applyCollectionChange`, an `edit` raising one holding, with source `shopping:<deck id>`, `staleEdits` set to the on-screen count, and an idempotency key per press.
- **The printing behind the price** has to be exposed on the price fact, to choose the preset. It isn't drawn.
- **Prefers-reduced-motion:** the 150ms slot crossfade is the only new motion.
- **Switch:** `SHOPPING_MARK_BOUGHT_ENABLED && COLLECTION_EDIT_ENABLED`. With either off, the tag is a plain span again, with no hint line and no details link.
