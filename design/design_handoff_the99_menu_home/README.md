# The 99 — menu and Home (design handoff · R1)

Account 2, 2026-10-22. Brief: Hugh's prompt in the project chat (three changes drawn together). Readiness: `READINESS.md`. States: `STATES-menu-home.md`.
Canvas: https://claude.ai/artifact/MhvPe5ucbxVLZ15jDCobpS

**Status: R1 approved by Hugh 2026-10-22.** Home ships as direction **B** (the lead story): Hugh's ruling, 2026-10-22. A stays drawn for reference only. Every string is a placeholder for `/copy-review`. The spare-request flow
(Ask, Yes / No, 14-day expiry) is a later round and is drawn only where its items land (blue "later round" outlines).
Orange dashed outlines mark what is new against the shipped page.

## The three changes

1. **Commanders becomes one place** with three tabs on the Collection strip: For you (today's ranked page), Discover, Help me choose.
2. **Friends moves into the main menu** (fifth slot); Settings takes its row in the account menu. Theme and avatar stay there.
3. **Home is redrawn**: a lead story, where you left off, What's new (the news feed), Friends, Commitments, and the welcome-credits strip with Where credits work. Ready to build leaves Home.

## Calls

1. **Five slots, Friends last.** Home, Collection, Commanders, Decks, **Friends**. Discover leaves the bar for Commanders’ strip; Friends takes the fifth slot with a new glyph drawn on the same 20-unit box and 1.5 stroke. Decks keeps its place beside Commanders; Friends sits at the edge as the social door. Switch off (`SOCIAL_FRIENDS_ENABLED`): four slots.
2. **Friends never locks.** Friends needs no cards (“Any time, cards or not”), so the first-run lock holds **Commanders and Decks** only; Collection stays open as today. The phone bracket spans slots 3–4; the rail’s well holds two.
3. **Settings replaces the Friends row.** The account menu keeps the avatar, the credit chip and the theme picker. **Friends** leaves it (now in the bar) and **Settings** takes its place, so the menu has the same number of rows.
4. **Commanders = one place, three tabs.** The Collection strip, reused: **For you · Discover · Help me choose**. Routes `/commanders`, `/commanders/discover`, `/commanders/choose`; the old `/discover` and `/decks/new/choose` redirect. Each tab keeps its own title and line under the strip, as Sets does. The Discover door “Not sure what you want? Help me choose” and the M12 moment retire: the tab is the door. New deck’s “Not sure what to build?” card stays and lands on the tab.
5. **Home: a lead story, then the day.** Recommended **B**: the newest thing that needs you is drawn big at the top (card art, a tilt, the friend’s face), then where you left off, then **What’s new**, then Friends and Commitments. Ready to build leaves Home (its job is For you’s). A is drawn beside it: no lead, the feed sits under the decks.
6. **One feed item, six kinds.** Every kind is the same row: card image at card shape (46×64), a mono kicker naming the kind, one title, one line, one press. Combos show the shipped two-card-combo mark (the collection key’s ∞) because no single card is the news. Unseen items carry the accent diamond; a visit to Home marks them seen.
7. **Opt-in, inline once.** Every kind starts off. Until one is on, What’s new **is** the opt-in: the six checkboxes inline on Home, one Show these. After that the switches live in Settings only, and the feed head’s “Choose what shows ›” goes there.
8. **The badge.** In-app only: a count on the **Home** slot (unseen feed items) and on **Friends** (things waiting on your answer). The Home count clears when Home is seen; the Friends count clears when you answer. Accent pill, top-right of the glyph, clear of the pending pip at the slot’s foot.
9. **Friends leads with you.** **Waiting on you** heads /friends (spare requests, new trade matches) as the same feed rows, then Tonight’s table, Friends and Pods as shipped. A friend’s page takes the Collection strip: **Spares · Wishlist · Decks**.
10. **Settings: one page.** `/settings`, under the account menu: **What’s new on Home** (six checkboxes) and **Spares** (the threshold stepper, who sees them, and Kept back: search to keep a card back, shipped collection rows with ✕ to let it go again). Pod sharing stays on each pod; Settings points there and does not copy the switch.

## Gaps for engineering

- **G1 · Feed store.** A per-account `feed_items` table (kind, subject ids, created, seen_at) written by the jobs that already know each event: set import, precon import, the price job, the spares read, the collection write (combos). Read on Home per request, never in the cached payload.
- **G2 · Price-drop rule.** Placeholder: the cheapest printing falls 20% or $2 below the price when you wishlisted it, at most once a week per card.
- **G3 · Spare threshold.** `spare_min` (default 1 = today’s behaviour) and `spare_keep` rows filter the spares read in one place (`lib/social/spares.ts`), so the stand-ins modal, a friend’s page and the feed agree.
- **G4 · Friends see decks.** A friend’s Decks tab needs a friends-only read of your deck list (name, commander, status, count; never the list). New privacy line on Friends: placeholder copy.
- **G5 · Spare request.** Ask, Yes / No and the 14-day expiry are the next round. Drawn here only where they land (the blue **later round** outlines).
- **G6 · Arrivals banner.** New precons move into the feed, so the arrivals banner’s precon half retires; About’s line stays on Home as shipped. Announced (not yet out) precons stay on /precons.

## Boards

| File | What |
|---|---|
| `Main.dc.html` | R1 · the three changes, calls, gaps |
| `Menu.dc.html` | Menu · bar, rail, glyph, account menu |
| `Commanders.dc.html` | Commanders · the sub-page strip |
| `Home-Directions.dc.html` | Home · direction B (lead story) or A |
| `Home-States.dc.html` | Home · first run, normal, busy, empty |
| `Feed-Kinds.dc.html` | What’s new · the six kinds |
| `Friends.dc.html` | Friends · waiting on you, a friend’s page |
| `Settings.dc.html` | Settings · news opt-ins and spares |

Open the `.dc.html` files next to `support.js` and `art/`. The generator lives on `design-assets` under `account-2/design_handoff_the99_menu_home/scratch-gen/`.
