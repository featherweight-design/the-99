# Deck statuses — the six, and what each tile shows

`design/design_handoff_the99_refresh/` · 2026-09-07

The six values and their thresholds are the shipped set. This document adds only the **token per
value** and the **card composition**. If the shipped thresholds and this table disagree, the
shipped code wins and this table is the thing to correct.

| Value | When | Token | Pill | Bar | Keyline (list rows) |
|---|---|---|---|---|---|
| Draft | 0 matched | `--fg-faint` | faint text, `--border-strong` hairline | empty track | `--fg-faint` |
| Building | 1–98 matched | `--fg-body` | body text, `--border-dashed` hairline | `--fg-body`, proportional | `--fg-body` |
| Over | 100+ matched | `--danger` | danger at 18% fill, 50% border | `--danger`, full | `--danger` |
| Unresolved | 99 matched, some line unresolved | `--warning` | warning at 18% / 50% | `--warning`, full | `--warning` |
| To buy | 99 matched, resolved, some unowned | `--accent` | accent at 18% / 50% | `--accent`, full | `--accent` |
| Complete | 99 matched, resolved, all owned | `--success` | success at 18% / 50% | `--success`, full | `--success` |

Pill fills are the status colour at `2E` alpha with an `80` alpha border and the status colour as
label — one rule, six instances, no per-theme hex.

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
