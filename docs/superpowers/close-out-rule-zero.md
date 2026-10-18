# Close-out: Rule 0 table check

**Walked:** 2026-10-17 to 2026-10-18, on the PR 8 branch with every plan PR merged or under it:
- the plan PRs: #1979, #1987, #1997, #2005, #2009, #2015, #2029, #2039, #2045, #2050 (PR 2 split into 2a and 2b, PR 7 into 7a and 7b);
- a mid-line fix: #2008;
- the close-out's own fixes: #2056 and #2060.

The modal-height rule Hugh set from a staging bug in this feature's setup sheet shipped alongside, in #2060, #2063, #2064 and #2077.

**Where.** A scratch branch made from local-dev (`a2-rule-zero-pr5-setup`, `br-jolly-star-a6nld12h`, deleted once
this was recorded), migrated to the branch's schema. `next start` ran against it with these switches on:
`RULE_ZERO_ENABLED`, `SOCIAL_FRIENDS_ENABLED`, `SOCIAL_GAMES_ENABLED` and `SOCIAL_INVITES_ENABLED`. Chromium ran at
390×2300 and 1300×1350, the inventory's widths.

**Not on staging,** by the orchestrator's ruling: seating three real accounts writes to staging. The real-account walk
is Hugh's, as a checklist on his board (`boards/hugh-todos.md`, "Staging walk checklist").

**Fixtures:** `scripts/seed-rule-zero-fixture.mts`, which refuses production, staging and local-dev by
`neon.branch_id`. It seeds Colin's pod "Thursday night" with the audit account, Colin (owner, a friend), Peter (a
friend), Max (Colin's friend, not the account's) and Chris (no decks). Every seated deck carries a real analysis of a
cloned list, and the tables have fixed ids `7a0e0000-0000-4000-8000-0000000000NN`. `RZ_FIXTURE_ENTRY=1` seeds the
entry surfaces: it seeds the same, then closes every table but T1 (the pod rows and Home's card), so reseed without it before photographing the table pages again.

Plan: `docs/superpowers/plans/2026-10-16-rule-zero.md`. Brief: `docs/superpowers/design-briefs/2026-10-16-rule-zero-table-check.md`.
Handoff: `design/design_handoff_the99_rule_zero/` (R2: the Read, Live, Setup, Entry, Swap and Log boards, phone and desktop).

## Route inventory

| Surface | 390 | 1300 | Seen |
|---|---|---|---|
| Pod row on `/friends`: Rule 0 check / Tonight's table (E1, E2) | ✓ | ✓ | The table glyph, title, faces and closing time. On the phone the closing time ellipsizes, as the board's row does |
| Home's table card (E3) | ✓ | ✓ | Kicker, faces, the sentence with its bold slot, Open the table |
| Setup: who's playing, decks per seat, a friend's decks, too few (U1 to U4, V1 to V3) | ✓ | ✓ | Chris dimmed with no decks yet, Max picks their own, Next held at one seat |
| The table, read states T1 to T10 / D1 to D10 | ✓ | ✓ | Flags with their reasons, Split with no band, range chips, a drifted declaration, the short and over-100 bars, "from before its last change", nothing to compare |
| A deck still waiting for its first read | ✓ | ✓ | |
| Expired (L4, H3) | ✓ | ✓ | |
| Live: another seat changed, the next look (S4, S5, W5) | ✓ | ✓ | The changed dot and Since you looked |
| Closer to the table, Swap in, after a swap (S1, S2, S6, W1, W2) | ✓ | ✓ | The offer, nearest first; the toast with Undo; changed just now |
| Change deck (S3, W3) | ✓ | ✓ | The sheet on the phone; on desktop the panel hangs from its link and scrolls, since #2060 |
| Log this game (L1, H1) | ✓ | ✓ | Under the seats on the phone, closing the read column on desktop |
| The prefilled log (L2, H2) | ✓ | ✓ | The from line with the pod's phrase in bold, pod size 4, three seats filled, Max marked from the table |

**Photographed by** `scripts/contact-sheet.mjs`, in a production build of the PR 8 head:
- `docs/superpowers/inventories/rule-zero.json`: 44 cells;
- `rule-zero-entry.json`: 4 cells.

The sheets are not committed.

## Structural checks

`pnpm check:shared` over both inventories: neither declares a shared binding, by design.

What the feature shares, it imports:
- the seat art (`social/seat-art.tsx`) and the table glyph (`rule-zero/table-glyph.tsx`);
- `GameLogForm` for the prefilled log;
- the shipped `Sheet`, `SocialModal` and `useAnchoredPanel`.

## Design review against the whole brief

Each UI PR (3 to 8) carried a design review before it opened; PR 4's is the table `docs/superpowers/design-tables/rule-zero-pr4-live.md`. The close-out walk then looked at every photograph against its board frame.

**Fixed after the walk:**
- **W3 overlap.** Change deck's desktop panel, with 20+ decks, was pinned to the top over its own link. In #2060, every anchored panel now hangs from its trigger and scrolls inside.
- **Missing stamp.** After a swap, W1, W2 and S2 had no `updated` stamp. In #2060, a swap's answer stamps it as a check does.

**Fixed during the line,** inside their PRs:
- the offer's 22px chip;
- a range chip overflowing the phone's offer row;
- the from line's alignment in the Games tab's empty state.

**Fixed after the line:** the table page's "?", which now offers Friends' entries (#2064).

**Left as shipped, deliberately:**
- **U2 copy.** U2 says "Seat one more player." without the board's "A game seats 2 to 8.": `/copy-review` cut it because the sheet's subtitle already says it.
- **Phone truncation.** On the phone, long deck and commander names ellipsize in the offer, the pod row and T6, as the boards' rows do.
- **Expired back link.** The expired page's `‹ Friends` back link shows on the phone only, as in the shipped page shell.

Copy wording was not reviewed here; that is `/copy-review`'s, run in each PR.

## States not photographed

All are reachable in code; the walk named each branch.

- **E4 and L3, the switch-off states:** held by component tests (`table-body.test.tsx`, the entry tests).
- **D9 at 1300, a deck being read on the spot:** the fixture's read finishes before the desktop shot.
- **Setup opened fresh from a pod's Rule 0 check:** every U and V shot is the setter's Seats on an existing table.
- **W4 as its own shot:** S4 and W5 carry the other seat's change.
- **For Hugh, on staging:** three real accounts at one table (a friend, a non-friend, the setter), a live change seen from a second device, and the phone keyboard over a sheet with a field. His checklist lists them.

## About entry

**Owed, and scheduled.** The plan deferred it under lock 13 (the About pause). On 2026-10-18 Hugh lifted that, and the
entry joined the launch-end batch:
- entry 3 of `docs/superpowers/design-briefs/2026-10-18-about-launch-entries.md`, "Checking tonight's table", `rule-zero`;
- drafted with prose-pass on the orchestrator's board (`about-drafts-rule-zero-2026-10-18.md`);
- it ships with that batch's single `ABOUT_VERSION` bump, at `since: 16`, and `AboutSwitch` gains `RULE_ZERO_ENABLED` in the same PR.
