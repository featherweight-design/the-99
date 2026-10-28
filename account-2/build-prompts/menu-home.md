# Build prompt · Menu and Home (R1)

Paste into Claude Code on your machine. PR #2174 is merged.

---

Build the menu and Home redesign. Start with `design/design_handoff_the99_menu_home/README.md`, then read `READINESS.md` and `STATES-menu-home.md`. Open each `.dc.html` with `support.js` beside it. Work in a worktree under `.worktrees/`, as AGENTS.md says. Home is **direction B** (the lead story), by Hugh's ruling; the A board on `Home-Directions` is reference only. Every string is a placeholder for /copy-review.

This is several features. Plan it as separate PRs in this order, each behind its own switch (add each one to `src/lib/switches/registry.ts`; you choose the names):

1. **Nav and account menu (Menu board).**
   - `ITEMS` in `src/components/shell/nav.tsx` becomes Home, Collection, Commanders, Decks, Friends. Friends uses the new glyph, whose path is on the board.
   - Friends never locks. The first-run lock covers Commanders and Decks only: the phone bracket spans slots 3 and 4, and the rail's well holds two.
   - When `SOCIAL_FRIENDS_ENABLED` is off, the bar has four slots.
   - In the account menu, the Friends row becomes Settings (`/settings`). The theme picker, the avatar and the credit chip are unchanged.
2. **The Commanders place (Commanders board).**
   - Reuse the Collection place strip from `src/app/collection/sets`: links, not ARIA tabs, mounted in a route-group layout.
   - The three pages are `/commanders` (For you), `/commanders/discover` and `/commanders/choose`.
   - Redirect `/discover` and `/decks/new/choose` to the new paths, keeping their query strings. Discover's window and its fields endpoint must keep working (see `lib/discovery/window` and the list-payloads notes in AGENTS.md).
   - Retire the Discover door "Not sure what you want? Help me choose" and its moment. New deck's "Not sure what to build?" card now lands on the Help me choose tab.
3. **Settings and spares (Settings board, G3).**
   - Build `/settings` with two sections: What's new on Home (six checkboxes) and Spares.
   - Spares holds the threshold stepper, a line on who sees spares that links to Friends, and Kept back: a search, plus shipped collection rows with a ✕ on each.
   - Store `spare_min` (default 1, which is today's behaviour) and the `spare_keep` rows. Filter them once, in `lib/social/spares.ts`, so the stand-ins modal, a friend's page and the feed all agree.
   - Pod sharing stays on each pod; Settings only links there.
   - These are new per-user tables, so the purge test and `check:list-cache` will ask for them.
4. **The feed (Feed-Kinds and Home-States boards, G1, G2, G6).**
   - Add a `feed_items` table per account. The jobs that already see each event write to it: set import, precon import, the price job, the spares read, and the collection write (for combos).
   - Read the feed per request, never inside Home's cached payload; otherwise add its generation to the `cachePageForUser` key.
   - A kind that is off is never written for that account, and turning it on does not backfill. Keep items for 14 days.
   - The G2 price-drop rule is a placeholder.
   - The precon half of the arrivals banner retires into the feed.
5. **Home B (Home-Directions and Home-States boards).**
   - Order: the lead story, where you left off, What's new, Friends, Commitments. The welcome strip stays as shipped. Ready to build leaves Home.
   - **The lead story:** the first unseen item, picked in this order: waiting on you, trade match, combo, price drop, precon, set.
   - **What's new:** show five items, grouped Today and Earlier this week, then Show all N.
   - **When nothing has been chosen** (every kind off), the inline opt-in appears in place of the feed.
   - **First run:** add the Choose your news row.
   - **Badges:** the Home badge counts unseen items and clears when Home is seen. The Friends badge counts items waiting on the reader's answer. Both are in-app only: no push, no email.
6. **Friends (Friends board, G4).**
   - `/friends` leads with Waiting on you, drawn as the same feed rows.
   - `/friends/[publicId]` takes the place strip: Spares, Wishlist, Decks.
   - The Decks tab needs a new friends-only read in `src/lib/social/`: name, commander, status and count, never the list.
   - The spare-request flow (Ask, Yes / No, 14-day expiry) is a later round. Build only the row slots shown in blue outlines.

Cards everywhere show at card shape (46×64), never the art crop, and open the shipped card detail where the kind says so. Ship phone and desktop parity in the same PR. Run the design-review skill before each `gh pr create`. Hugh decides which About entries this owes (READINESS, For Hugh 2).
