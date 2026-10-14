# READINESS — Collection · Per-printing art selection (#105)

**Rating: 🟡 Yellow** — the design is complete and buildable; three rulings are outstanding, and two
of them are places where R3 disagrees with the R2 audit on purpose.

Date: 2026-07-31 · Branch: `feat/printings-and-sets` · R3

## Why not Green

R3 was rebuilt against the repo rather than revised from R2 — the spec and `card-modal.tsx` became
readable after the GitHub connection landed, and R1/R2 had inherited two factual errors from the
paraphrase. It therefore lands after the R2 audit and contradicts parts of it. Nothing here is a
drawing problem; all three are decisions someone other than me has to sign.

| # | Ruling needed | R3's position |
|---|---|---|
| 1 | **Does the modal keep its shipped 620px height?** | **Yes.** R2 grew it to 980px/92vh and the audit approved it as a property-table update. But the fixed height is a bug fix with a source comment — `h-auto` made the dialog resize under the cursor while paging Prev/Next. Growing it 360px on expand rebuilds that. R3 puts the region in the content column, which already scrolls. |
| 2 | **Does the dormant-pin tile survive decision 5's "silently"?** | Drawn **as ruled** (kept), and flagged on the canvas. If it stays, decision 5's text needs amending so the next audit reads it as intentional rather than drift. |
| 3 | **Is a permanent printing caption acceptable at one printing?** | **No** — decision 6 says the modal renders "exactly as it does today". R1/R2's always-on caption is withdrawn; the existing `Set` MetaField is the trigger. Confirm this is the reading you want, since the R2 audit confirmed the caption without flagging decision 6. |

## Closed since R2

| Finding | Status |
|---|---|
| Mobile art header missing | **Fixed.** All phone states drawn on the shipped 180px header (`card-modal.tsx:146-177`, table `:761`/`:785`). My "the Collection handoff is stale" call was wrong. |
| What happens to the art header on expand | **Called.** Collapses to a 72px thumbnail + title, only past the overflow threshold. |
| Set row's job on mobile | **Confirmed and unchanged.** It identifies the printing beside art that's already showing it, rather than substituting for it. |
| `no number` label | **Removed.** On a bare `Name,Qty` import every entry has an empty collector number; the field and its separator are omitted, per the spec. |
| Live region premise | **Design unchanged** — one region, added by eng. |
| Pin identity | **Closed.** `(user_id, oracle_id)` → `(set_code, collector_number)`, per `card_art_preferences`. |
| Deck scope | **Closed.** Collection surfaces only (decision 2); per-deck is #42. |

## Ready to build
- Presentation, placement, both widths, three-up grid maths — final.
- Tile states and the SC 1.4.1 argument — final. Frame verified against `grid-view.tsx:41`
  (`aspectRatio: "63/88"`, `rounded-[9px] md:rounded-[10px]`), read directly.
- Overflow: grid, search scope, chips, set grouping, threshold — final.
- Finish detail and the empty-collector-number case — final.
- Radiogroup, keyboard, focus, single live region — final.
- Copy — final and externalised.
- `chip-row.tsx`, `text-field.tsx`, art column, Prev/Next, focus trap — reused unchanged.

## Not in this ticket
- Any change to the collection list, grid, filter bar or replace flow.
- Per-finish selection (rejected, decision 3).
- Per-deck art (#42). Bulk art selection.
- #59's richness restyle.

## Risk notes
- **States 2–4 are drawn at a scroll offset.** At `620px` the content column gives `547px`, and a
  tile row with caption and badge does not fit under title + oracle + meta unscrolled. The frames
  show what the player sees while choosing — oracle clipped behind a top fade. If you would rather
  the region fit without scrolling, the lever is tile size or caption lines, not modal height.
- **The mobile meta-row reorder** (Rarity/Identity above the Set row while expanded) and the
  **mobile art collapse** are both new behaviours with no property-table row.
- **Threshold of 12 is a judgement**, sitting just below Sol Ring's 13. Tweakable on the canvas.
- **#59 collision surface:** tile ring weights, badge plate opacity, the Set field's `--elevated`
  fill, the compact art header.
- **`reversible_card` holdings** render as state 1 with no explanation — correct, but someone will
  ask why one card in the collection can't be picked.
