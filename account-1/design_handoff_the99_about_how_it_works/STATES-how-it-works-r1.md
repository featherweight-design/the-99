# STATES — About, how it works (R1)

These extend `STATES-about-r6.md` §N–§R. Nothing there changes.

## §S — the row

| State | Head | Body | a11y |
|---|---|---|---|
| Closed | title · tags · verdict · ▾ | none | `button[aria-expanded=false][aria-controls=how-x-body]` |
| Open | same · ▴ | four `dt/dd` pairs, then `explained in` when it has entries | `aria-expanded=true` |
| Landed | same, with the head washed `--elevated` | open | focus on the `h3`, `tabindex=-1` |
| No method (open 1) | the tag slot is empty | as open | — until ruled |
| No entries | as open | no `explained in` pair | — |

## §T — entry link line

| Condition | Drawn |
|---|---|
| `entryRow[entry.id]` exists | `How this is decided ↓` after the keys (after the caption when there are no keys) |
| none | nothing, and no placeholder |
| its switch is off | the entry is absent, so the row's `explained in` omits it too |

## §U — contents

| Where | Drawn |
|---|---|
| Rail | a hairline after 04, the group row, then 8 row titles. The current row moves onto a row once it reaches the band |
| Phone list | a fifth row: link + `8 rows` + disclosure. It opens to 8 rows of 44px |
| Search | matches row titles. The count is `m of N+8`, and a match opens the group |

## §V — state

**Client:** `openRows: Set<string>`, seeded from `location.hash` when it names a row. Nothing is
persisted. **Server:** none new.
