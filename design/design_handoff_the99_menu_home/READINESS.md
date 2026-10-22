# Readiness — menu and Home

**Verdict: Green.** R1 approved by Hugh 2026-10-22. Nothing below blocks the build; each open item has a drawn default.

## For Hugh

1. **Home direction B is the build.** Hugh approved R1 without naming A or B; B (lead story on top, then where you
   left off, What's new, Friends, Commitments) was the recommendation and is what this handoff specifies. Say "A" and
   the lead goes; the feed sits under the decks as drawn on `Home-Directions`.
2. **About entries.** The feed, the Settings page and Friends in the bar are new features; the Commanders tabs rework
   shipped pages. Hugh decides which owe an entry (or one entry for the line).
3. **Copy** is placeholder throughout, for `/copy-review`, including the six kind names and their Settings lines,
   the G2 price-drop rule and the G4 privacy line.

## For engineering

1. **Nav.** `ITEMS` in `src/components/shell/nav.tsx` becomes Home, Collection, Commanders, Decks, Friends (new glyph,
   drawn on the shipped 20-unit box, 1.5 stroke; path on `Menu`). Friends never locks; the first-run lock holds
   Commanders and Decks. With `SOCIAL_FRIENDS_ENABLED` off: four slots, and the account menu keeps no Friends row.
2. **Account menu.** The Friends row becomes Settings (`/settings`). Theme picker, avatar and credit chip unchanged.
3. **Commanders place.** Reuse the Collection place strip (links, not ARIA tabs, in a route-group layout):
   `/commanders` (For you), `/commanders/discover`, `/commanders/choose`. Redirect `/discover` and
   `/decks/new/choose` (query strings kept). The Discover door "Not sure what you want? Help me choose" and its
   moment retire; New deck's "Not sure what to build?" card links to the tab. `/discover`'s window and field
   endpoint keep working at the new path (`lib/discovery/window`).
4. **Feed store (G1)** is new backend: `feed_items` per account, written by the jobs that already know each event,
   read on Home per request and NEVER inside the cached Home payload (or add its generation to the
   `cachePageForUser` key). New per-user table: purge coverage and `check:list-cache` will both ask for it.
5. **Kinds start off.** A kind that is off is not written for that account (no backfill). The inline opt-in on Home
   shows only while every kind is off; after Show these the switches live in Settings alone.
6. **Badges.** Home slot = unseen feed items, cleared by a Home visit; Friends slot = items waiting on the reader's
   answer, cleared when answered. Both are in-app only. No push, no email.
7. **Spares (G3).** `spare_min` (default 1, today's behaviour) and `spare_keep` filter `lib/social/spares.ts` in one
   place so the stand-ins modal, a friend's page and the feed agree. Pod sharing stays on each pod.
8. **Friend's page.** `/friends/[publicId]` takes the place strip: Spares, Wishlist, Decks. Decks needs a new
   friends-only read in `src/lib/social/` (G4): name, commander, status, count, never the list.
9. **Arrivals banner (G6).** Its precon half retires into the feed; announced precons stay on `/precons`.
10. **Card rows.** Kept back in Settings uses the shipped collection row; feed and Waiting-on-you cards show at card
    shape (46×64), never the art crop, and open the shipped card detail where the kind says so.

## Later round

The spare-request flow (Ask, Yes / No, 14-day expiry) is drawn only where its items land (blue outlines). Build the
row slots; the flow ships with its own handoff.
