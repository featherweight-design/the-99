# The 99 — Deck printings (design handoff, R3)

`design/design_handoff_the99_deck_printings/` · collection home epic, sub-project 3

**Status: approved to ship (Hugh, 2026-10-10).** R3 answers audit findings D1 and D2 (`READINESS-audit.md`, PR #1331). R2 was approved (Hugh, LGTM), and everything in it stands, including the four rulings. The current canvas is `The 99 - Deck Printings (R3).dc.html`: R2 plus §D1 and §D2 at the top. The R2 and R1 canvases are kept for the record. Fidelity is high: geometry, tokens and component reuse are final. Card names, deck names and figures are illustrative.

**Review history.**
- **R1 → R2 (Hugh, 2026-10-10):** owned printings only. There's no reset and no new block. The R1 copy is cut to what the UI can't say for itself.
- **R2 touch-ups, applied:**
  - The heading no longer fades: the top fade draws only on a scrolled frame.
  - The Set field's dashed box is no longer clipped.
  - The desktop modal now matches the shipped app, in this order: title with the pips, rules text, Two-card combos, In this deck (proxy), the four-cell meta row, then the footer with Find a deck for it.
- **R2 → R3 (readiness audit D1, D2; Hugh's D2 rule, 2026-10-10):** see the decisions log below. The shared part `DP Picker` now draws the intro line, so the R2 canvas shows it too.
- **R3 review (Hugh, 2026-10-10):** the `other` qualifier on a fallback price is dropped as copy for an edge case. The tag reads as on `main`. The remaining R3 calls (the I got it preset on a fallback, the card details price, the intro wording, and unowned printings on import) go to engineering and `/copy-review`.

Source: `docs/superpowers/design-briefs/2026-10-09-collection-deck-printings.md` (main), Hugh's rulings 1–4 (2026-10-09), and **Hugh's R2 review (2026-10-10)**: owned printings only, no reset, and copy only where the UI is ambiguous.

## The design
**Opened from a deck, the shipped printing picker picks for that deck.** It's the card's `Set` field disclosure and `PrintingRegion role="art"` (owned source), unchanged, except that the write goes to the deck. There's no new block and no new picker.
- **Pinned line:** `For this deck · of N ▾` replaces `Your pick · of N ▾` in deck context, because otherwise a pick could read as changing the Collection's art.
- **Intro line (R3):** the shipped region's intro slot, with deck wording (D1).
- **Tiles:** shipped. `Your pick` is this deck's pick, and `Shown now` is what the deck falls back to.
- **No reset.** Picking another tile is the way back.
- **One or no owned printings:** the shipped plain `MetaField`. Nothing to pick.

**Which printing a deck shows:** the deck's pick, then the Collection's pick, then the default (today's resolver). If a deck's pick leaves the Collection, the deck moves down the chain and the stored pick is cleared. There's no dormant tile in deck scope. The same chain feeds art, the price tag, export, Shopping and the I got it preset.

**Everything else is `main`:** rows, tiles, the card view, the hover preview and the Shopping row gain nothing. Only the art changes, plus the figure on a priced tag. The commander uses the same Set field in its own details.

**Import:** a line naming a printing you own becomes the deck's pick. The arrival strip gains one clause (`…, 12 with the printing you own.`). Other lines use the chain, and are neither failures nor listed. **Export:** each line names the printing the deck shows.

**Rulings drawn:** a pick isn't a deck edit (no pending banner, no Commit, no History line); versions after the line record the printing each card showed, and older versions show today's art, with no marker; one pick per card per deck; ownership stays by card.

## Decisions log (R3)
- **D1, the region's intro line.** The shipped `PrintingRegion` always renders `regionIntro(n)`, or `regionIntroPicked` once there's a pick. R2 drew the region without either, and the picked sentence ("…wherever this card appears in your collection") is false in a deck. **Call: in deck scope the slot stays, and both strings swap.** It reads `You own N of these. Pick the one this deck uses.`, and once picked, `Your pick shows in this deck only.` The slot and type are unchanged (13.5px, `--fg-muted`, top of the region). It's a `scope === "deck"` branch on the two strings, nothing else. The wording goes through /copy-review. Drawn in §D1 and in every open A2 frame.
- **D2, a pick that isn't in stock.** It applies to spoken-for cards, the only kind that has both a pick (owned) and a buy tag. **The rule (Hugh, 2026-10-10):**
  - If the pick is in stock, the tag prices it.
  - If it isn't, the tag falls back to the cheapest in-stock printing, which is today's price.
  - If nothing is in stock, the tag is the shipped `buy · sold out`.

  **Call: no new tag style and no new copy** (Hugh, R3 review). The fallback is an edge case, and the figure is what a buyer acts on, so the tag reads exactly as on `main`.
  - The over-limit ring and the Shopping total use the figure shown.
  - The I got it preset follows the printing behind the figure, so a fallback presets the in-stock printing. It still never writes the pick.
  - The card details art-column tag is unchanged: it stays the price of the printing under the art, `no stock` here.

  Drawn on the deck row and Shopping at both widths in §D2.
- **New strings: 7**, all listed in the copy file: the pinned line, two intro lines, failed, the announcement and two import strings. D2 adds none.

## Departures from the brief
1. **Owned printings only** (R2 review). A pick is always owned, so the brief's unowned states don't occur. Its sold-out and never-stocked states do occur on spoken-for rows, and R3's D2 covers them.
2. **The art role, not the choose role.** The brief locks "choose role", but that role is the catalog source. Owned-only is the art role, which already lists owned printings.
3. **No import report of unmatched printings.** A printing you don't own falls to the chain silently, so there's nothing to report.

## Follow-up (not in this PR)
1. **Import of a printing you don't own** is silent. If it's ever wanted, the strip can add `, N not in your Collection`. That isn't drawn.
2. **Deck stats' money card** keeps today's cheapest-printing sum. Pricing picks there is a follow-up (brief, audit E5).

## Engineering
- `PrintingRegion role="art"` gains `scope: "collection" | "deck"`. With `deck`, it hides reset and the dormant tile, and `onPick` writes `(deck_id, oracle_id) → (set_code, collector_number)`. `card-modal.tsx` passes `deck` when opened from a deck.
- The resolver: deck pick → art preference → default. On a collection write that removes the picked printing, clear the deck's pick.
- `price-query.ts` prices the resolved printing when it's in stock, and otherwise the cheapest in-stock printing, as today. That needs a per-(deck, oracle) read (audit E5). The price fact exposes the printing behind the figure for the I got it preset.
- Switch: `DECK_PRINTINGS_ENABLED`. Off means deck scope isn't passed and the resolver skips step 1. Picks are kept.

| File | Holds |
|---|---|
| `… (R3).dc.html` | **Current.** §D1 the intro line, §D2 the out-of-stock pick on rows and Shopping, then R2's A1–D unchanged |
| `… (R2).dc.html` | Superseded by R3. Kept for the record |
| `… (R1) · A …`, `… (R1) · B, C, D …` | Superseded |
| `DP Picker.dc.html` | R2/R3 canvas part |
| `DP Row.dc.html` | Canvas part (R1, R3 §D2), I got it's row |
| `DP Block.dc.html` | R1 canvas part |
| `STATES-deck-printings.md`, `READINESS.md`, `deck-printings · copy strings.ts` | R3 |
| `about-entry/` | P1 `deck-printings`, chapter 03 after `export`, since 12. Ships with the launch bump (11 → 12) |
| `brand/` | The locked brand sheet, copied in. `support.js` is the canvas runtime, not production code |

**About these files.** The canvases are design references built in HTML. Open them with `support.js` beside them, then rebuild in the app's stack. Every value is an existing token, and the canvases pin Kaldheim (First Frost). **No new tokens and no new dependencies.** Strings in `deck-printings · copy strings.ts` are intent and go through `/copy-review`.

**Sequencing.** The change lands after Deck stats' money PR (PR 6), as the brief says. Phone and desktop ship in the same PR.
