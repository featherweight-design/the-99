# Gate 2 — forced-state runtime exercise, #43 Task 9 (`/collection`)

Driven, not read. `scripts/probe-collection-avail.mjs` signs in as the audit
user, opens `/collection` at 390×844 and 1300×900, and drives **both** views at
both widths, because the default differs by width (rows on the phone, grid on
the desktop) and reading only the default would leave half the surface
unexercised.

## How each state was forced

Real figures on a dev account cannot reach `hard` or `over`: that needs a second
*finished* deck competing for a single copy, and seeding one would mutate a
shared branch to prove a rendering claim. So the states were forced at the seam,
the same stub `probe-availability-ui.mjs` and `probe-rollup-ui.mjs` already
document — a temporary branch in `loadAvailability`, gated on `AVAIL_FORCE`,
that buckets every oracle id across the four states. **The stub was reverted
before this PR opened**; `git diff` on `availability-query.ts` is empty.

| Force | What it produces |
|---|---|
| `AVAIL_FORCE=1`, bucket 0 | untouched real data — the free/bare control |
| `AVAIL_FORCE=1`, bucket 1 | `owned 2, soft 1, free 2` → soft |
| `AVAIL_FORCE=1`, bucket 2 | `owned 1, hard 1, free 0` → hard, one deck name |
| `AVAIL_FORCE=1`, bucket 3 | `owned 1, hard 2, free -1` → over, two deck names |
| `AVAIL_FORCE=fail` | `loadAvailability` throws → the page's `.catch(() => null)` |

## What was seen

### Rows — 390×844 and 1300×900

| Check | Phone | Desktop |
|---|---|---|
| Bare rows render nothing | 12 of 200, no marker node | same 12 |
| **Row height, bare vs marked** | **60 / 60** | **49 / 49** |
| Marker type (table 13.3) | IBM Plex Mono, 8.5px, 600, 0.17px ≈ 0.02em | same |
| Over row border | `rgb(107,50,38)` = `#6B3226` | same |
| Free/soft/hard row border | `rgb(42,36,29)` = `#2A241D` | same |
| Row background, all states | `rgb(30,26,21)` = `--surface` | same |
| Long name truncates, marker whole | `nameClipped: true` on `_____ _____ _____ Trespasser` and `Abdel Adrian, Gorion's Ward`, marker width unchanged at 37px | names fit at this width |
| `title` carries the full name (13.2) | present on every row | present |

Row height being identical bare-vs-marked is the load-bearing one: the marker
shares the existing `1fr` name cell, so if it had pushed the line it would have
reflowed the whole list.

Over-committed rows carry the border tint **and nothing else** — the background
is the same `--surface` as every other row (table 13.5).

Accessible names, read off the live DOM, with the availability clause landing
last and count-only:

- `_____ _____ _____ Trespasser, Creature — Human Rogue Guest, 1 copy, UNF, uncommon, you own 1 too few`
- `Aang, the Last Airbender, Legendary Creature — Human Avatar Ally, 1 copy, TLA, uncommon, no free copies`
- `Abrade, Instant, 3 copies, BLC, uncommon, 1 copy is on an unfinished deck`
- bare rows keep today's exact four-part string, unchanged.

No deck name appears in any of them.

### Tiles — both widths

| Check | Seen |
|---|---|
| Chip position (table 2.1) | `left: 6, top: 6` relative to the art region |
| Quantity badge still owns top-right | `left: 142` (phone) / `145` (desktop), `top: 6 / 8` |
| Chip label type (2.3) | IBM Plex Mono, 8.5px, 600 |
| Chip scrim per state | over `rgba(11,9,7,0.92)` · hard `0.90` · soft `0.86` |
| Chip stays inside the art | `overflowsArt: false` on every tile |
| Over tile border | `#6B3226`; other states `#2A241D` |
| Chip is count-only | drawn text `short 1` / `0 free` / `1 in a brew`; no deck name |
| `spoken` prose reaches the accessible name | sr-only `you own 1 too few` / `no free copies` present alongside the aria-hidden drawn label |

### Card detail — both widths

```
In your collection                          10px  rgb(142,130,105)
×1 · 0 free — in Atraxa, Praetors' Voice    13px  rgb(198,183,154)
You can still build with it — you'd be      12.5px rgb(168,155,132)
taking it out of something.
```

The only place on `/collection` that names the claiming deck, as designed. No
status pill (table 14.5).

### Degraded read — `AVAIL_FORCE=fail`

The page renders. 200 rows, **0 markers, 0 chips**, no detail block, and the row
height is unchanged at 60 (phone) / 49 (desktop). No banner and no error: the
quiet failure Addendum 2 asks for.

## Not forced here

Nothing. All five states were forced and observed at both widths.
