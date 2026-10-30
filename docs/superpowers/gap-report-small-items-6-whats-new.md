# Gap report — Small items 6, items 6 and 6b (What's new)

Verified against `docs/superpowers/design-tables/small-items-6-whats-new.md`.

| Row | Result |
|---|---|
| Off line text and box | MATCH: `Quiet` with `on` empty draws `offLead` bold + `offRest` in the shipped box |
| Head link after a choice, and after the ✕ this visit | MATCH: `(chosen \|\| offerGone)` |
| `loadHomeFeed` gates the offer on `neverChose` | REACHABLE: `home.ts`; tests for the ✕ stamp and for declined kinds |
| Stacked offer: min-height 72/64, padding 12 64/72 12 14 | MATCH |
| ✕ top -4 right 0 (phone), top 4 right 4 (md) | MATCH: positioned by a wrapper span, since the button carries its own `relative` |
| Pick ▾ right 12 bottom 10, 32 high, nowrap | MATCH |
| Opened offer and feed rows | unchanged, as the board says |
| `closeAria` says it sticks | MATCH: draft "Hide this for good", for `/copy-review` |

VERDICT: 0 visual gaps, 0 state gaps.
