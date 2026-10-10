# The 99 — Deck printings (design handoff, R2)

`design/design_handoff_the99_deck_printings/` · collection home epic, sub-project 3

**Status: approved to ship (Hugh, 2026-10-10, LGTM).** The current canvas is `The 99 - Deck Printings (R2).dc.html`. The two R1 canvases are superseded and kept for the record. Fidelity is high: geometry, tokens and component reuse are final. Card names, deck names and figures are illustrative.

**Review history.**
- **R1 → R2 (Hugh, 2026-10-10):** owned printings only. There's no reset and no new block. The R1 copy is cut to what the UI can't say for itself.
- **R2 touch-ups, applied:**
  - The heading no longer fades: the top fade draws only on a scrolled frame.
  - The Set field's dashed box is no longer clipped.
  - The desktop modal now matches the shipped app, in this order: title with the pips, rules text, Two-card combos, In this deck (proxy), the four-cell meta row, then the footer with Find a deck for it.

Source: `docs/superpowers/design-briefs/2026-10-09-collection-deck-printings.md` (main), Hugh's rulings 1–4 (2026-10-09), and **Hugh's R2 review (2026-10-10)**: owned printings only, no reset, and copy only where the UI is ambiguous.

## The design
**Opened from a deck, the shipped printing picker picks for that deck.** It's the card's `Set` field disclosure and `PrintingRegion role="art"` (owned source), unchanged, except that the write goes to the deck. There's no new block and no new picker.
- **Pinned line:** `For this deck · of N ▾` replaces `Your pick · of N ▾` in deck context. It's the one new string, needed because otherwise a pick could read as changing the Collection's art.
- **Tiles:** shipped. `Your pick` is this deck's pick, and `Shown now` is what the deck falls back to.
- **No reset.** Picking another tile is the way back.
- **One or no owned printings:** the shipped plain `MetaField`. Nothing to pick.

**Which printing a deck shows:** the deck's pick, then the Collection's pick, then the default (today's resolver). If a deck's pick leaves the Collection, the deck moves down the chain and the stored pick is cleared. There's no dormant tile in deck scope. The same chain feeds art, the price tag, export, Shopping and the I got it preset.

**Everything else is `main`:** rows, tiles, the card view, the hover preview and the Shopping row gain nothing. Only the art changes, plus the figure on a priced tag. The commander uses the same Set field in its own details.

**Import:** a line naming a printing you own becomes the deck's pick. The arrival strip gains one clause (`…, 12 with the printing you own.`). Other lines use the chain, and are neither failures nor listed. **Export:** each line names the printing the deck shows.

**Rulings drawn:** a pick isn't a deck edit (no pending banner, no Commit, no History line); versions after the line record the printing each card showed, and older versions show today's art, with no marker; one pick per card per deck; ownership stays by card.

## Departures from the brief
1. **Owned printings only** (R2 review). The brief's unowned, sold-out and never-stocked states only occur on a spoken-for Shopping row, where the shipped buy tag already covers them.
2. **The art role, not the choose role.** The brief locks "choose role", but that role is the catalog source. Owned-only is the art role, which already lists owned printings.
3. **No import report of unmatched printings.** A printing you don't own falls to the chain silently, so there's nothing to report.

## Follow-up (not in this PR)
1. **Import of a printing you don't own** is silent. If it's ever wanted, the strip can add `, N not in your Collection`. That isn't drawn.

## Engineering
- `PrintingRegion role="art"` gains `scope: "collection" | "deck"`. With `deck`, it hides reset and the dormant tile, and `onPick` writes `(deck_id, oracle_id) → (set_code, collector_number)`. `card-modal.tsx` passes `deck` when opened from a deck.
- The resolver: deck pick → art preference → default. On a collection write that removes the picked printing, clear the deck's pick.
- `price-query.ts` prices the resolved printing.
- Switch: `DECK_PRINTINGS_ENABLED`. Off means deck scope isn't passed and the resolver skips step 1. Picks are kept.

| File | Holds |
|---|---|
| `… (R2).dc.html` | **Current.** A1 details (desktop, 390), A2 states, A3 the chain, B deck views and commander, C import/export, D versions and switch |
| `… (R1) · A …`, `… (R1) · B, C, D …` | Superseded |
| `DP Picker.dc.html` | R2 canvas part |
| `DP Block.dc.html`, `DP Row.dc.html` | R1 canvas parts |
| `STATES-deck-printings.md`, `READINESS.md`, `deck-printings · copy strings.ts` | R2 |
| `about-entry/` | P1 `deck-printings`, chapter 03 after `export`, since 12. Ships with the launch bump (11 → 12) |
| `brand/` | The locked brand sheet, copied in. `support.js` is the canvas runtime, not production code |

**About these files.** The canvases are design references built in HTML. Open them with `support.js` beside them, then rebuild in the app's stack. Every value is an existing token, and the canvases pin Kaldheim (First Frost). **No new tokens and no new dependencies.** Strings in `deck-printings · copy strings.ts` are intent and go through `/copy-review`.

**Sequencing.** The change lands after Deck stats' money PR (PR 6), as the brief says. Phone and desktop ship in the same PR.
