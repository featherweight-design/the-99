# Filter chassis addendum: /commanders free count on the result line

This amends `../` (decision 13, the result line) and replaces nothing. Canvas: `The 99 - Commanders Free Count.dc.html`, F1–F2 at 1300 and 390.

**Why:** a new player didn't know **Free only** existed. On **All my cards**, the result line points the way in.
Engineering is separately making the lane remember the last mode chosen.

## Placement
- **The chassis's `resultTrailing` slot**, the one Discover fills with `DiscoverChooseLink`. /commanders has
  nothing in it today, so the two never share a line.
- **Wide:** at the right end of row 3 (`ml-auto`), on the same baseline as the count.
- **Compact:** in `after`, on its own 44px line under the count, as `DiscoverChooseLink` does. The whole line is
  the press target.
- **Treatment:** `DiscoverChooseLink`'s, unchanged. The lead is sans 12.5 `--fg-muted`, then a `--border-strong`
  `·`, then **Free only** in `--accent` with a 50% accent bottom border. No arrow: it changes a mode on this page
  rather than going to another.

## Rules
- **N is Free only's own count** under the same search and colors, so pressing lands on a list whose result line
  reads N.
- **Shown only when `avail = all` and `0 < N < shown`.** At N = 0 there's nowhere to go. At N = shown, Free only
  would change nothing. The slot stays empty and row 3 keeps its height.
- **The press** sets `avail: "free"`, exactly as the segment does. The segment updates, and `sleevedAside` then
  explains what went.
- **Not in the sheet** (it holds Build from itself), not a chip, not counted by the badge or Clear.
- **One live region.** The link isn't live. The result line keeps announcing the count.

## Copy (placeholder, owed to /copy-review)
```ts
// commandersCopy.availability
freeCount: (n: number) => `${n.toLocaleString("en-US")} free to build now`,
freeCountAction: "Free only", // = freeShort
freeCountAria: (n: number) => `Free only: show the ${n.toLocaleString("en-US")} free to build now`,
```

## Tests
- Absent on Free only, at N = 0 and at N = shown.
- The count after the press equals N.
- On compact, exactly one node, in `after`. On wide, one node, in `resultTrailing`.
