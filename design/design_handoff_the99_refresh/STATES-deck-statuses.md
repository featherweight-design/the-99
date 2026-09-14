# Deck statuses — the six, and what each tile shows

`design/design_handoff_the99_refresh/` · 2026-09-07

The six values and their thresholds are the shipped set. This document adds only the **token per
value** and the **card composition**. If the shipped thresholds and this table disagree, the
shipped code wins and this table is the thing to correct.

**Corrected 2026-09-14 to the shipped component, and sent for ratification.** The pill column below
described a `50%` / `80`-alpha border of the status colour. That edge was retired by the art-wash
readability amendment on 2026-09-11 and ratified on 2026-09-12: every status now takes **one opaque
`1px solid var(--border-strong)` hairline**, because a 50% fade of the status colour was the
worst-reading edge in that report. Building keeps a **dashed** line of the same colour and weight —
a line style is not an alpha fade, so the readability rule never reached it, and with colour living
only in fill and label it is the one status signal that survives greyscale and colour blindness.
`--border-dashed` is a token this pill does not use; the dash is a `border-style`, not a colour.

The fills are also stated per value here rather than left to the flat rule, because two of them are
exceptions: Draft and Building are the statuses whose own token IS a text colour, so they take a
lighter plate and a quieter label than the four that key off a signal colour.

| Value | When | Token | Pill fill | Pill label | Pill border | Bar | Keyline (list rows) |
|---|---|---|---|---|---|---|---|
| Draft | 0 matched | `--fg-faint` | token at **16%** | `--fg-muted` | solid `--border-strong` | empty track | `--fg-faint` |
| Building | 1–98 matched | `--fg-body` | token at **14%** | `--fg-body` | **dashed** `--border-strong` | `--fg-body`, proportional | `--fg-body` |
| Over | 100+ matched | `--danger` | token at 18% | `--danger` | solid `--border-strong` | `--danger`, full | `--danger` |
| Unresolved | 99 matched, some line unresolved | `--warning` | token at 18% | `--warning` | solid `--border-strong` | `--warning`, full | `--warning` |
| To buy | 99 matched, resolved, some unowned | `--accent` | token at 18% | `--accent` | solid `--border-strong` | `--accent`, full | `--accent` |
| Complete | 99 matched, resolved, all owned | `--success` | token at 18% | `--success` | solid `--border-strong` | `--success`, full | `--success` |

The fill mixes into `--bg` rather than into transparency — `color-mix(in srgb, var(--token) N%,
var(--bg))` — so the plate is opaque at every alpha and a bright pixel of art behind it cannot reach
the label. The alpha rides on the token, so the six themes each get their own value of one rule and
no component names a colour. `src/lib/decks/status-style.ts` is where all of it is written, once.

## Card composition — one grid, one order, every status

1. **Art header**, 118px, scrim `--bg` 10% → `--surface-inset` 96%.
2. **Status pill**, top-left, 22px.
3. **`…`**, top-right, 26px — the only action on the tile. Items: Update from a list · Rename ·
   Delete.
4. **Deck name** over the scrim, display face, 15px, one line with ellipsis.
5. **Meta row**: colour pips (9px, each with a `--border-strong` hairline so `--b` `#98748F`
   survives a light ground) · colour label · count with denominator, right-aligned, tabular.
6. **Progress**, 3px.
7. **Detail row**: the one figure that explains the status (`3 unowned · $18.40`,
   `2 lines unresolved`, `5 over`, `all owned`) · last played, right-aligned.

**No button.** The pill is the message, the tile is the target. `decks.commander_oracle_id` is
NOT NULL, so **every tile has a commander and every tile shows commander art** — a Draft tile is a
named commander with nothing built yet: art, name, pips, `0 / 99`, an empty track, `created today`.
There is no placeholder art block and no *no commander yet* state.

## What the list rows show instead

Home's deck rail and the resume rows drop the art header and the progress bar, keep the 3px status
keyline on the left, the name, the status word in its own colour, and the count. Same six colours,
same six words.

## Filtering

All six statuses render as rows whether or not any deck holds that value — a filter list that
changes length between players is worse than one with quiet rows. **No counts** on filter rows.
The header carries the only count (`6 of 6`), and it must always agree with the number of cards
rendered.

## Zero decks is a different surface

An empty deck list is not a Draft tile and not the filtered empty. It is the card-fan mark,
**No decks yet**, and two routes in — **Browse commanders** (bone fill, primary; it is primary
because the buildable count under it is non-zero) and **Import a deck** (hairline). The header
keeps New deck and Import at zero, unchanged in shape. The filtered empty keeps its own copy and
offers **Clear filters** only. Both are drawn in `The 99 - Refresh · Home and Decks.dc.html`.
