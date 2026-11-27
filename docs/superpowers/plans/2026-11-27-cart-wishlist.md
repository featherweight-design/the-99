# Cart on your wishlist: plan

Handoff: `design/design_handoff_the99_cart_wishlist/` (R1c, approved by Hugh 2026-11-27; README calls 1 to 6, Quiet Q1 to Q5, Decided A to C, gaps G1 to G6). Readiness: Yellow (orchestrator board `readiness-cart-wishlist-3399.md`, findings F2 to F14, H1 to H3). Brief: orchestrator GO 2026-11-27. No model call, no spend, no About entry (About is image pages).

## What ships

An opt-in switch in Settings › Wishlist puts every card Shopping lists for the reader's decks on their wishlist, one line per card, each following its decks and leaving once the reader owns it. The owner's tab splits into Added by you and one box per deck; friends see one list. A deck can be left out (Settings picker, or the deck's ⋯ menu). The switch is offered once on the Wishlist tab. Trade matches roll up to one What's new row per friend per day with at most one trade-match push a day.

## Rulings

- **H1 (decided by the orchestrator, adopted).** A friend never sees a synced line whose only sources are decks that friend cannot see: decks with `hidden_from_friends`, every deck when `friends_see_decks` is off, and unfinished decks (New, Draft, Building) when `friends_see_unfinished` is off. The rule is `friendCanSeeDeck`'s, applied per source. The owner's own tab shows every deck. The friend's `wants N` counts only visible decks' copies (below), so a hidden deck's need never leaks through a larger number either. This also covers every friend-facing reader of wants: You have it (`friendWantedGapQuery`), the Friends chip pairs (`loadFriendsWantedPairs`), spare offers.
- **H2 (OPEN, Hugh's).** Switch off. Recommended default: delete the reader's synced lines (their per-deck sources go with them), keep hand-added and converted lines, write no collected receipt (nothing was collected). Kept so switching back on restores the same picture: each deck's Keep off my wishlist choice and the Remove skips.
- **H3 (OPEN, Hugh's).** The one-push-a-day cap. Recommended default: a later match that day is DROPPED from push (its rolled row still lands in What's new, so nothing is lost), never deferred to tomorrow (a deferred push would announce yesterday's news). The day is the reader's own zone (`judgedZone` of the push subscription's zone, UTC fallback), midnight to midnight; the overnight hold (`hold.ts`, 21:00 to 09:00) applies unchanged to the day's one push.
- **Feature switch (OPEN).** The wishlist switch is retired and a new switch needs Hugh first. This plan assumes none: the per-reader preference defaults off, and nothing reaches a reader until PR 4 draws the Settings section. If Hugh wants a switch, it gates PR 4 and PR 5's surfaces and the sync job's work, and slots in without a schema change.

## Storage (G1, F3)

Synced lines live apart from `wishlist_items`, so a hand line is never touched by the sync and every existing writer keeps its meaning. Migration `0274` adds:

| Object | Shape | Notes |
| --- | --- | --- |
| `wishlist_synced` | `user_id`, `oracle_id` (FK cards), `quantity` int 1..99, `quiet` bool default false, `created_at`; PK (user, oracle) | One line per card. `quantity` = copies held (any printing, `heldCopies` with a null printing) + the sum of included decks' deficits, capped at 99. No price columns: a synced line never gets a price baseline (Q4), and the price-drop job reads `wishlist_items` alone, so it needs no change (G5 holds by construction; a test pins it). `user_data_touch` trigger. |
| `wishlist_synced_decks` | `user_id`, `oracle_id`, `deck_id` (FK decks, on delete cascade), `quantity` int >= 1 (that deck's deficit), `unfinished` bool; PK (user, oracle, deck); FK (user, oracle) to `wishlist_synced` on delete cascade; index on `deck_id` | The per-line deck sources: the owner tab's boxes and the friend filter. `unfinished` is the deck's pill class at sync time (`unfinishedPill`), so the friend read stays one SQL statement. `user_data_touch` trigger. |
| `wishlist_sync_skips` | `user_id`, `oracle_id` (FK cards), `created_at`; PK | Cards the reader removed or converted (call 5): the sync never re-adds them. Cleared only by an explicit add of that card from an add control. No trigger (it changes nothing a page draws until the sync acts). |
| `wishlist_sync_state` | `user_id` PK, `synced_stamp` bigint, `synced_at` | The reconcile ledger (below). No trigger. |
| `user_prefs.wishlist_sync` | bool not null default false | The switch. Written only when it changes (the table's stamp trigger). |
| `user_prefs.wishlist_offer_dismissed_at` | timestamptz null | The offer's ✕ (call 2), as `welcome_strip_dismissed_at`. |
| `decks.off_wishlist` | bool not null default false | Keep off my wishlist (G3), beside `hidden_from_friends`. Not an edit: leaves `last_edited_at` alone. The picker's tick and the ⋯ row write this one column. |

Why apart and not a `source` column on `wishlist_items`: that table is keyed one line per card, and a card both hand-added and deck-needed is one drawn line (call 4) whose hand want must survive the sync untouched; a source column would make every existing writer (stepper, printing pick, Remove, sweep, price baseline) decide which row it means.

**The union (one reader, two views).** `src/lib/wishlist/lines.ts` exports the SQL fragment every consumer reads instead of `wishlist_items` alone: hand lines full-joined to synced lines on `(user, oracle)`, one row per card, `quantity = greatest(hand, synced)`, `source = 'hand'` when a hand line exists (call 4: drawn in Added by you) else `'deck'`, the printing from the hand line, plus the deck ids for the owner. Held is tested per component: the hand side by its printing (`heldCopies` with the line's `scryfall_id`, as today), the synced side any printing. A union row stands when either component is still wanted, and its `quantity` is the larger of the still-wanted components, so a pinned hand line never inherits the synced side's any-printing count or the reverse. The friend view lives in `src/lib/social/wishlist.ts` (cross-user, `check:social-reads`): the same join, with the synced side cut to visible sources in the same statement, joined on the viewer's grant:

```
visible synced want = s.quantity - coalesce(sum of the deficits of sources the friend cannot see, 0)
a synced-only line is drawn only when at least one source is visible
visible(source) = not d.hidden_from_friends and coalesce(up.friends_see_decks, true)
                  and (coalesce(up.friends_see_unfinished, false) or not src.unfinished)
```

Correlated subqueries alias and qualify (code rules), pinned by `.toSQL()` tests.

## Sync (G2, F4, F5)

- **Switch off returns early.** `syncWishlistIfDue` reads `user_prefs.wishlist_sync` first and returns with no other read when it is off, so the `after()` hooks cost one primary-key read for every reader who never switched on.
- **Input.** `loadDeckBuyRows(userId)` over every deck (Shopping's own source, brews from their live list: Decided C), minus decks with `off_wishlist`, minus skipped cards, grouped per card. Never the cart's selection (a view). A deck kept off the wishlist still holds its copies under seniority (`loadDeckBuyRows` is user-wide by design), so an included deck junior to it still needs its own copy: held 1 used by an excluded senior deck plus an included junior deck short 1 is a line wanting 2. That is correct (the reader owns one copy and two decks use it), and a PR 2 test pins it.
- **Pill per source.** `unfinished` is computed through `statusPill` and `unfinishedPill`, the builders `/decks` and `visibleDecks` use, never a second rule; a PR 2 test pins `unfinished = unfinishedPill(statusPill(...))`.
- **The dirty mark is the data stamp.** It is coarse: about 20 other per-user tables (deck games, art picks, friend links, hand wishlist lines) move it too, so a due reader is not always a changed one. Accepted for PR 2 with a measured budget (one `loadDeckBuyRows` per due switched-on reader, about 280 ms, measured on staging in PR 2); a narrower input hash beside the stamp is the fallback if the measure says so. `user_data_touch` already fires once per user per transaction on every per-user table the sync reads (`collection_items`, `deck_cards` through `deck_id`, `decks`, `user_prefs`), deferred to commit. A user is due when `user_data_stamps.stamp > wishlist_sync_state.synced_stamp`. No app path can forget to mark, and no new write is added to any chokepoint.
- **Recompute.** The sync transaction reads the stamp S0 first, then recomputes and diff-writes, then sets `synced_stamp = S0`. A write that commits after S0 moves the stamp past it and leaves the user due. Correct under read committed because the stamp moves in the same commit as the data it covers.
- **Idempotency.** `pg_advisory_xact_lock(hashtext('wishlist-sync'), hashtext(user_id))` serializes a user's syncs. Writes are diff-only: insert what is new, delete what is gone, update only where `quantity` or `unfinished` is distinct. A no-op recompute writes no row, so the touch trigger never fires and the stamp does not move. The sync's own real writes move it once, so the next pass finds the user due and settles with a no-op (one extra read, never a loop).
- **When.** `after()` at the actions that change a deck list, a deck's status or `off_wishlist`, the collection, or the switch (the `src/app/decks/actions.ts` pattern), calling `syncWishlistIfDue(userId)`. A reconcile sweep (cron) takes every user with the switch on who is due, as the backstop for a failed or skipped `after()`, and also every user with the switch on whose `synced_at` is over 24 hours old: `pnpm list-stamp:triggers disable` (the cache kill switch) freezes the stamp, and the daily pass keeps the sync right while it is off.
- **Leaving.** The collected sweep (`sweepCollectedIn`) deletes a synced line whose held copies reach its quantity in the collection write's own transaction and writes the collected receipt, as it does for hand lines (call 4). A line whose decks stop needing it (cut, unticked, deck deleted) is deleted by the sync with no receipt.
- **Quiet arrivals (Q2).** Every line the first pass after switching on adds is `quiet`, whatever the count (Q2: switching on sends no push). Any later pass that adds more than 10 lines (a large deck import) marks them `quiet` too. The trade-match job writes a quiet line's matches without a push and then clears `quiet`, so a spare a friend gets later still pushes.
- **Switch-on writes no push and no feed rows to friends (Q5).**

## Owner rules (calls 3 to 5, F6 to F8)

- **Convert (call 5).** The stepper in card details on a deck line writes a hand line at the chosen quantity and a skip row in one transaction; the synced line leaves at that write. Remove on a deck line writes a skip row and deletes the synced line.
- **Counts (F7).** The offer's and Settings' count is the sync set itself: distinct cards with a deficit in any deck not kept off the wishlist, not skipped. One definition, so Add them adds exactly the counted lines. It includes a card the reader owns but a senior deck holds, so the offer's words cannot say "you don't own"; PR 4's copy pass words it for what Shopping lists (reported to the orchestrator). `16 wanted` on the tab counts each union line once.
- **Box order and sort.** Added by you first, then decks in the `/decks` default order; sort applies within each box. A card two decks need is drawn in both boxes (call 3) and counted once in the meta line.

## Feed and push (Q1, Q3, F9 to F11)

- **Roll-up.** One What's new row per friend per reader-day: the trade-match writer keeps its per-card dedupe key (told once) and the read folds the day's rows for a friend into one item (`Colin has spares of 4 cards you want`). The badge counts folded items; dismiss on the folded item dismisses its rows.
- **Cap.** At most one trade-match push per reader-day (H3). State: the `push_outbox` rows of kind `trade-match` for the reader inside the reader's day, counted in the enqueue's own transaction under a per-reader advisory lock, so a restart or a second worker cannot double-push. No new table. scoped to `trade-match` only, shipped words `tradeMatchOne` / `tradeMatchMany`, shipped overnight hold. Rows from `quiet` lines never push.
- **Overlap (F14).** #3401 friend trades (R2, in Design) also edits `feed-item.tsx` and `copy/feed.ts`. Whichever merges second rebases; nothing here touches other kinds.

## PR boundaries (no stacked PRs; each branched from fresh main after the previous merges; under 20 files and about 800 runtime lines each)

| PR | Scope | Risk | Files (est.) |
| --- | --- | --- | --- |
| 1 | This plan; migration `0274` and schema; `lines.ts` union (owner) and the friend view in `social/wishlist.ts` (H1 filter, the three friend reads moved onto it); owner `wishlistLinesQuery` onto the union; purge list and fictional-fixture purge (all four tables in both); fixture export reads the union; rendered-SQL tests. The union and the H1 view were run on a scratch branch of local-dev with seeded lines (a hidden-only card, an unfinished-deck card and a card split across a hidden and a shown deck all read as H1 says). Tables stay empty, so nothing a reader sees changes. | Risky | about 14 |
| 2 | Sync job: `syncWishlistIfDue`, the stamp ledger, diff writes, skips, `after()` hooks, reconcile cron, the collected sweep over synced lines, card search, `spares.ts` and `spare-offers.ts` (the asker's own `want`) onto the owner union, price-drop pin test, a guard test that no `src/` reader of `wishlist_items` sits outside `lines.ts`, the owner and friend wishlist modules, card details' `loadWishlistLine` (the Wishlist section reads a deck line too) and the price-drop job. | Risky | about 16 |
| 3 | Trade-match onto the union, roll-up read, quiet arrivals, one-push-a-day cap. Lands before any reader can switch on, so switching on can never flood. | Risky | about 12 |
| 4 | Settings › Wishlist section, deck picker (`FilterPanel`), ⋯ menu Keep off my wishlist row, set/clear actions, copy leaves, privacy text. | UI | about 12 |
| 5 | Tab split by source (`DeckBox` boxes), offer strip and its dismissal, convert and Remove on deck lines. | UI | about 12 |
| 6 | Roll-up row UI in What's new (fanned picture, `See Colin's spares ›`). | UI | about 6 |

Over 20 files in any PR: split before building, boundary named here.

## Risk and review

PR 1 to 3 are risky (migration, DB layer, cron, push): `/code-review medium`, then the risk checklist pass, `## Copilot off`, `## Claude review` with a `Checklist pass:` line. PR 4 to 6 are UI: design-review table, contact sheet, feature-acceptance route x viewport inventory (`/wishlist`, `/settings`, `/decks`, a deck page, a friend's wishlist, `/`), probes that press the controls. Migration and probes run on a scratch branch made from local-dev at 0.25 CU, deleted at the end. Costs: one `loadDeckBuyRows` per due user per sync, measured on staging in PR 2; no model calls.

## Review log

Plan review, 2026-11-27: general-purpose subagent (Sonnet), read-only, 11 findings. Each verified against the tree.

| # | Sev | Finding | Outcome |
| --- | --- | --- | --- |
| 1 | M | Stamp moves for ~20 unrelated tables; no early return when the switch is off | Fixed: early return stated; coarse stamp accepted with a PR 2 measured budget, input hash as fallback |
| 2 | M | Union mixes printing-pinned and any-printing held tests | Fixed: held tested per component, quantity is the larger still-wanted component |
| 3 | M | Excluded senior deck holding the only copy makes an included junior deck's line want 2 | Decided: correct behavior, pinned by a PR 2 test |
| 4 | M | Offer count (cards held none of) differs from the sync set | Fixed: one definition, the sync set; offer wording goes to PR 4's copy pass |
| 5 | M | ">10 lines" contradicts Q2 for small switch-ons; `quiet` never clears | Fixed: switch-on pass always quiet; cleared once the match job processes the line |
| 6 | M | Cap has no named state; double-push risk | Fixed: count `push_outbox` trade-match rows in the reader's day under a per-reader advisory lock |
| 7 | M | `spare-offers.ts:246` and fixture `export.ts:49` unplaced | Fixed: spare-offers in PR 2, export in PR 1, plus a reader guard test in PR 2 |
| 8 | L | `loadFriendsWantedPairs` must apply "at least one visible source" | Fixed: the friend view applies it to all three reads; PR 1 adds a hidden-only-deck test per read |
| 9 | L | `unfinished` needs one rule, not a second `statusPill` site | Fixed: computed through `statusPill`/`unfinishedPill`, pinned by a PR 2 test |
| 10 | L | All four tables in both purge lists | Already done in PR 1's tree |
| 11 | L | `check:social-reads` needs the new tables registered | Declined: the guard keys on grant tables (`friend_links`, `social_profiles`, ...), not wishlist tables; the friend view joins `friend_links` and lives in `src/lib/social/`, so the guard covers it unchanged |

