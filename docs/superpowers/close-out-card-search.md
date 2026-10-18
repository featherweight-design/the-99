# Close-out: Card search

**Walked:** 2026-10-18, on `main` with the four plan PRs merged (#1922 A, #1928 B, #1943 C, #1948 D) and their
follow-ups (#1957, #1992), then again after the close-out's own fixes (#2080).

**Where.** A scratch branch made from local-dev, migrated to `main`'s schema. `next start` ran with `CARD_SEARCH_ENABLED`,
`SWAP_TOOLS_ENABLED` and `FIND_A_DECK_READ_ENABLED` on, signed in as local-dev's audit account (`CARD_SEARCH_DECK` names
its `HD - Zombies`). Chromium ran at 360, 375 and 390 (phone) and 1300 (desktop).

Plan: `docs/superpowers/plans/2026-10-16-card-search.md`. Handoff: `design/design_handoff_the99_card_search/`, with the
two property tables `docs/superpowers/design-tables/card-search-phone.md` and `card-search-desktop.md`.

## Route inventory

| Plan row | Seen |
|---|---|
| Header at top, away and returned (quick return, PR B) | `quick-return.json`, 18 of 18 cells at 360, 375 and 390: the header in the page, gone on the way down, back on a 30px climb with the filter head riding under it, and the dock and tab bar on `/decks/[id]` |
| `/collection` filter head under the returned header | ✓, same sheet |
| `/decks/[id]` header over the dock, typing in Add a card | ✓, same sheet |
| Header icon, offline | `hp1-icon` and `hp3-offline` at all three phone widths |
| Sheet S1 to S7 | S1, S2, S3 first and later, S4, S4b, S5 and S7 at all three widths |
| Card from a result and back | `h2` (the card's teaser, "1 of 20") and `h3` (the ring on the row that opened it) |
| `/decks/[id]`, both searches | `dp1` and `dp4` at all three widths; `dd1` and `dd2` at 1300 |
| Rail slot, D1 to D8 | `d1`, `d1h`, `d2`, `d2k`, `d4`, `d5`, `d7`, `d8` at 1300 |

**Photographed by** `scripts/contact-sheet.mjs` over `card-search-phone.json` (42 of 42 cells), `card-search-desktop.json`
(10 of 10) and `quick-return.json` (18 of 18). Each needed `"clearAbout": true` (#2081): without it, an account with
an unseen About entry photographed `/about` in the first row.

## Design review against the whole brief

Every row of both tables matches, except two, fixed in #2080:
- **The clear ✕** is now bare, as the boards draw it: 13px in `--fg-faint`, 32×32 on the phone and 28px wide on desktop.
  It goes through `SearchField`'s existing `clearClassName` hook, so the shared field is unchanged elsewhere.
- **The wishlist bookmark** is announced once. The row's name ends with the copy key `row.wishlistAria` and the box is
  `aria-hidden`. The desktop board's literal `aria-label` on the box would have said it twice inside the listbox option;
  the desktop table now records that choice, matching the phone table.

Checked and not counted as gaps:
- The desktop field sits at top 73, not 69, but lines up with the slot as designed, because the shipped mark is 4px
  taller (`search-desktop.tsx`).
- While offline, the install slot steps aside below 429px on the phone when the help ? is also in the header (below
  390px with only one of them), as measured and written down in `src/components/pwa/install-slot.tsx`; online it stays.

## States not photographed

- **S6 / D6, a failed search:** no browser can force it without breaking the server. `search-layer.test.tsx` asserts the
  alert, the sentence and that Try again retries.
- **HP2, the offline pill with the install slot:** headless Chromium never offers the install prompt. For Hugh on a
  phone.
- **D3, typing on desktop:** not in the desktop inventory; it shares the phone's code path.
- **DD2 with a query typed, and the rows board's rarer cases** (the bookmark on, a two-line name, a Secret Lair flavor
  line, the 20-result foot line): each is held by a test or reachable in code.

## About entry

**Owed, and now scheduled.** The plan deferred it on Hugh's ruling that new entries waited for the About redesign. On
2026-10-18 the orchestrator added `card-search` to the launch-end About batch, reusing the entry and artboard its handoff
already carries (`about · card search.ts`, `The 99 - About · Card Search Entry.dc.html`): the brief is
`2026-10-18-about-launch-entries.md`, entries 4 and 5 (#2079). It ships with that batch's single `ABOUT_VERSION` bump, at
`since: 16`.
