# Gap report — Small items 6 (/friends desktop, two columns from 1180px)

Property table: `docs/superpowers/design-tables/small-items-friends-desktop.md`.
Implementation verified at commit `cdd022875` (branch `small-items/friends-desktop`):
`src/components/social/friends-view.tsx`, `pod-card.tsx`, and the section heads in
`waiting-on-you.tsx`, `your-requests.tsx`, `friends-list.tsx`, `pods-pane.tsx`, `open-links.tsx`.

## PASS 1 — properties

### Page container (`friends-view.tsx`)
| Property | Result |
|---|---|
| Width ≥1180 | ✅ MATCH (accepted deviation b) — design: 1160px / implementation: `min-[1180px]:max-w-[1160px]` (fills the ~1118px main at a 1180 viewport) |
| Centering | ✅ MATCH — `mx-auto` |
| Padding | ✅ MATCH (accepted deviation c) — design: `36px 0 50px` / implementation: `md:pt-[36px] md:px-0 pb-[60px]` (shipped bottom kept) |
| Display flex column | ✅ MATCH — block container whose children stack (head, then the grid); equivalent stacking, no gap involved |
| Under 1180 | ✅ MATCH — `max-w-[720px]`, the columns wrapper has no `grid` below 1180 (test asserts it) |

### Head (`FriendsHead`)
| Property | Result |
|---|---|
| Placement spans 1160, above grid | ✅ MATCH — rendered before `[data-friends-cols]`, inside the 1160 container |
| Layout / avatar / who block / h1 / privacy line / right block / Add a friend / invites line | ✅ MATCH — unchanged from shipped; the table states no change |

### Two-column grid (`[data-friends-cols]`)
| Property | Result |
|---|---|
| Display | ✅ MATCH — `min-[1180px]:grid` |
| Columns | ✅ MATCH — `min-[1180px]:grid-cols-[minmax(0,1fr)_420px]` |
| Gap | ✅ MATCH — `min-[1180px]:gap-x-[44px]`, row gap 0 (default) |
| Alignment | ✅ MATCH — `min-[1180px]:items-start` |
| Column element | ✅ MATCH — `min-w-0 min-[1180px]:flex min-[1180px]:flex-col` |
| Left order | ✅ MATCH — `waiting` (WaitingOnYou, YourRequests) then FriendsList |
| Right order | ✅ MATCH — `pods` (PodsPane) then OpenLinks |
| DOM / reading order | ✅ MATCH — head, inbox, friends, pods, links (test asserts it) |
| Tabs | ✅ MATCH — none |

### Sections and heads
| Property | Result |
|---|---|
| Section margin-top 34px | ✅ MATCH — every section `md:mt-[34px]` (waiting-on-you:80, your-requests:132, friends-list:62, pods-pane:237, open-links:29). Each column is a flex container inside a grid item at ≥1180, so the first section's margin cannot collapse out; both first sections sit 34px below the head |
| First head alignment | ❌ MISMATCH — design: both columns' first heads align (32px heads with a bottom rule) / implementation: the head TOPS align (both at 34px), but the Pods head is 41px tall, not 32px: its wrapper (`pods-pane.tsx:238`, `md:min-h-[32px] md:pb-[8px]`, border-box) holds the "New pod" button at `md:min-h-[32px]` (pods-pane.tsx:247), so content 32 + padding 8 + rule 1 = 41px. Left heads (h2, ~16px line + 8 + 1 → min 32) are 32px. The right column's bottom rule sits ~9px below the left's, and its label ~4.5px lower. Board's `.sech .r` has no height. Pre-existing in the shipped single column, newly visible side by side |
| Head min-height 32px | ✅ MATCH as declared on every head (`md:min-h-[32px]`); rendered height on Pods: see the row above |
| Head padding-bottom 8px | ✅ MATCH — `md:pb-[8px]` on all heads |
| Head border | ✅ MATCH — `[border-bottom:1px_solid_var(--border)]` |
| Head type | ✅ MATCH — mono 10.5px 500 uppercase `.14em` `--fg-faint` |
| Waiting on you head color | ✅ MATCH — `--accent-text` |
| New pod action | ✅ MATCH — sans 13.5px 500 `--accent-text`, no transform |
| Your requests right note | ✅ MATCH — unchanged shipped |

### Left column rows
| Property | Result |
|---|---|
| Inbox card / row width / item 4 ✕ / friend row | ✅ MATCH — unchanged shipped; column is 696px at a full 1160 container (654px at a 1180 viewport, per deviation b) |

### Pod card (`pod-card.tsx`)
| Property | Result |
|---|---|
| Margin-top 12px | ✅ MATCH — `mt-[12px]` |
| Width fills 420 | ✅ MATCH — block in the 420px column |
| Padding / radius / border / background / gap / overflow / blurred art | ✅ MATCH (accepted deviation a) — shipped values kept: padding `md:pt-6 pr-6 pb-8 pl-18`, `rounded-[12px]`, `--border-strong`, `--surface-rail`, wash opacity .30 `blur(34px) saturate(1.25)` |
| Pod head | ✅ MATCH (a) — shipped (meta 11px vs board 10.5px is shipped) |
| Seat grid columns | ✅ MATCH — `min-[1180px]:grid-cols-[repeat(3,116px)]`; fits: 420 − 2 border − 24 padding − 12 `mr` = 382 ≥ 372 |
| Seat grid gap | ✅ MATCH — `md:gap-x-[12px]`, `min-[1180px]:gap-y-[12px]` |
| Seat / seat art / own seat / seat ✕ | ✅ MATCH (a) — shipped (art `md:h-[84px]` radius 10, ✕ 28×28) |
| Wrap 5 + tile → two rows of three | ✅ MATCH — 3-column grid, tile is the last `li` |
| Add friends tile | ✅ MATCH (a) — shipped (h 74, radius 10, 1.5px dashed) |
| Share-spares line / Rule 0 row | ✅ MATCH (a) — shipped |

### Open links
| Property | Result |
|---|---|
| Placement right column after Pods | ✅ MATCH |
| Visual | ✅ MATCH — unchanged shipped (not drawn) |

### Nothing waiting
| Property | Result |
|---|---|
| Waiting / Your requests absent | ✅ MATCH — both render only their (fixed-position) toasts with no rows |
| Friends first, 34px | ✅ MATCH — FriendsList section `md:mt-[34px]` is the column's first block |
| Right column unchanged / no layout jump | ✅ MATCH — same grid in both states |

## PASS 2 — states
| State | Result |
|---|---|
| Inbox populated, Friends 4, 1 pod | REACHABLE — ordinary account with asks in and out |
| Nothing waiting | REACHABLE — no open asks; WaitingOnYou and YourRequests render no section |
| Open links present | REACHABLE — an unspent invite link; OpenLinks renders after Pods |
| 1180–1300px window | REACHABLE — viewport width; container is the main width (<1160) |
| Below 1180px | REACHABLE — no grid classes apply |
| Several pods / dozen-plus friends | REACHABLE (data), out of scope — no tabs, columns grow |

Note (not a table row): with no friends and no pods, PodsPane returns null and, with no open links, the right column is empty while the grid still reserves 420px. The table claims neither column is empty only for its drawn states.

## Gaps
1. First-head alignment: the Pods head renders 41px (its 32px "New pod" button plus 8px padding and rule) against 32px heads on the left, so the right column's head rule sits ~9px lower at ≥1180. Fix: drop the button's `md:min-h-[32px]` inside the head at `min-[1180px]` (or let the button overflow the content box, e.g. `md:-my-…`), keeping the coarse-pointer hit target.

## Accepted deviations
- (a) Pod card keeps shipped padding, radius, border, wash, seat art, ✕ and tile sizes; the board's `.f6pod` approximates "as shipped".
- (b) Container `max-w-[1160px]`, so it fills the ~1118px main area at a 1180 viewport (left column ~654px there).
- (c) Shipped bottom padding (`pb-[60px]`) kept instead of the board's 50px.

## Verdict
One MISMATCH (Pods head height breaks the first-head rule alignment). Everything else matches or is an accepted deviation. Not ready until the Pods head is 32px at ≥1180.
