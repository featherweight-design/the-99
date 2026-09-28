# Design Brief: navigation pending, the escalation to the full screen (addendum)

**Date:** 2026-09-28 · **Branch:** `design/navigation-pending` (PR #1087) · **Addendum to:**
`design/design_handoff_the99_navigation_pending/` and its `READINESS-audit.md`.

This brief reopens one decision in that handoff: whether the route loading screens are deleted.
They are not. The pip and the track stay as the handoff draws them, and the full screen comes
back as the fallback behind them. This brief asks Design to draw the handoff between the two.

## §1 Hugh's ruling (2026-09-28)

- **The full-page loader stays as a fallback.** A click shows the pip or the track first. If the
  navigation is still pending after a short delay, the route's full `LoadingScreen` takes over.
- **Our timings were taken on a very fast connection.** No loading screen is removed on those
  numbers.
- **A loader on the button alone "could feel broken".** Reaching the route confirms the click
  registered.
- **"Even a 1 second delay between initial click and re-routing can feel slow."** So the handoff
  to the full screen comes well under a second.
- `/collection` drops its fixed screen: the fallback now covers it. The 1px question folds into
  this addendum.

## §2 Measurements

**Method.** `next start` of `main`, built with every `loading.tsx` removed, so each figure is the
real wait with no screen. The database was a scratch Neon branch holding a `pull:staging` copy of
the reference account (20 decks, 3,250 collection rows). Each figure is a client navigation timed
inside the page, from `router.push` to the first frame showing the new page's content. Each cell
is the median of 3, in ms.

- **"first"** is the first navigation to a route after a reload, so its JavaScript chunks are
  downloaded too.
- **"again"** is a second navigation, with the chunks cached. This is the normal repeat.
- **The server is local**, with about 33ms to the database. These figures describe the reader's
  device and network, not a slow server.

**Fast connection** (no throttling; list cache off, as production runs):

| Route | 1300 first / again | 390 first / again |
|---|---|---|
| Home | 641 / 628 | 677 / 652 |
| `/decks/[id]` | 692 / 586 | 668 / 571 |
| `/commanders/[slug]` | 538 / 581 | 612 / 573 |
| `/decks` | 479 / 488 | 465 / 430 |
| `/collection` | 366 / 348 | 361 / 338 |
| `/decks/new` | 361 / 326 | 367 / 336 |
| `/collection/replace/summary/[id]` | 253 / 252 | 218 / 195 |
| `/about` | 151 / 99 | 155 / 90 |
| `/discover` | 124 / 117 | 111 / 109 |
| `/commanders` | 103 / 100 | 112 / 111 |
| `/collection/proxies` | 99 / 92 | 97 / 95 |
| `/collection/sets` | 90 / 74 | 88 / 70 |
| `/collection/sets/[code]` | 70 / 55 | 59 / 60 |
| `/collection/replace` | 52 / 44 | 56 / 60 |
| `/decks/new/choose` (no query) | 31 / 23 | 34 / 36 |

**Slow network** (Chrome's Slow 4G through CDP: 562.5ms latency, about 1.4 Mbps down; plus a 4×
CPU throttle). The last column is the RSC payload for one navigation.

| Route | 1300 first / again | 390 first / again | RSC KB |
|---|---|---|---|
| Home | 702 / 730 | 692 / 702 | 11 |
| `/decks` | 1506 / 665 | 1516 / 650 | 5 |
| `/decks/[id]` | 1807 / 780 | 1739 / 768 | 22 |
| `/decks/new` | 1482 / 948 | 1500 / 981 | 36 |
| `/decks/new/choose` (no query) | 656 / 656 | 659 / 651 | 2 |
| `/collection` | 2511 / 2367 | 2448 / 2332 | 289 |
| `/collection/proxies` | 610 / 612 | 609 / 612 | 3 |
| `/collection/replace` | 1237 / 601 | 1238 / 602 | 2 |
| `/collection/replace/summary/[id]` | 1199 / 608 | 1214 / 609 | 3 |
| `/collection/sets` | 1356 / 750 | 1369 / 750 | 7 |
| `/collection/sets/[code]` | 1381 / 896 | 1417 / 899 | 36 |
| `/commanders` | 1376 / 875 | 1363 / 879 | 41 |
| `/commanders/[slug]` | 1381 / 897 | 1350 / 922 | 42 |
| `/discover` | 2821 / 2644 | 2749 / 2620 | 357 |
| `/about` | 2555 / 930 | 2579 / 957 | 47 |

On the slow network, every navigation takes more than 400ms: one round trip alone is about 560ms.

- **Repeat visits:** only `/collection` and `/discover` pass 1000ms. They are held up by their
  payloads (289KB and 357KB), not by latency. That is a separate performance question.
- **First visits:** 12 of 15 routes pass 1000ms, because each route's JavaScript downloads too.

## §3 Locked

- **A mark at 120ms, then the route's `LoadingScreen` at about 400ms from the press.**
  - The pip or track appears at 120ms, as the handoff draws it.
  - At about 400ms, if the navigation is still pending, the route's `LoadingScreen` takes over as
    an overlay inside `<main>`.
  - Why 400ms: on a fast connection, 11 of the 15 routes land before then and never
    show the screen. On the slow network, every route crosses it, so the click is confirmed well
    under Hugh's one second.
- **Every route gets the fallback, and the ~700ms keep/drop list retires.**
  - The four kept `loading.tsx` files (`decks/[id]`, `decks/[id]/changes`, `decks/[id]/import`,
    `decks/new/choose`) stay until the overlay has been built and measured.
  - Nothing is deleted on fast-connection numbers.
- **The loading copy map keeps its keys.** `shellCopy.loading` keeps every entry, because the
  overlay needs each route's own words. The handoff's retire list is withdrawn.
- **The overlay blocks the old page.** It blocks pointer events on the page underneath, and sets
  `aria-busy` on `<main>`. Focus stays on the link that was pressed.

## §4 Open for Design

1. **The flash rule.** On a fast connection, four routes land just after 400ms: `/decks`
   uncached, `/commanders/[slug]`, the deck page, and Home uncached all arrive between 430 and
   690ms. (`/collection`, at 338–366ms, lands just before.) Draw what happens then. The options:
   - (i) the screen fades in over about 150ms, so a page that arrives mid-fade cuts a faint wash
     rather than a full screen;
   - (ii) once fully shown, the screen stays for at least about 250ms (React's own boundary holds
     300ms, which is the floor that started this);
   - (iii) both.

   Engineering's lean is (i) alone, because it never delays content. That is a lean, not a
   ruling.
2. **How the overlay arrives.** Draw its entry over the old page, and what the pip or track does
   when the overlay arrives: whether it stays, fades, or is covered.
3. **The line's thickness.** Draw the track at 1px and at 1.5px, judged at 1× on a device.
4. **Which navigations get the fallback** (the audit's item D). The candidates are inline text
   links, same-route query links (filters and views), and navigations started in code.
   - The wiring cost differs. Inline text links are `<Link>`s, so they report like any other once
     they carry a reporter; the cost is only what they draw. Same-route query changes and
     navigations started in code set no `<Link>` pending state at all. Each such call site would
     need a `startTransition` and a report into the same provider, and there are several (the
     filters, the commit flow, redirects after an action).
   - The alternative, for those, is the mark alone or nothing.

## §5 Engineering notes

- **How it's built.** `<Link>`'s pending state is optimistic state that the router sets at the
  press, and it clears when the navigation commits (Next 16.3.4:
  `client/app-dir/link.js:97`, `client/components/links.js:65-76`). Only the last link pressed is
  pending. `PendingPip` and `PendingTrack` (the handoff's two new components, not built yet) read
  it inside the link through `useLinkStatus`, and report it up to a shell-level provider, which times the ~400ms and draws the overlay for
  the pressed link's route. The old page stays mounted underneath, because Next keeps it until the
  new one commits.
- **(a) Navigations started in code** (`router.push` and `replace`) set no link status. They need
  `startTransition` and their own report into the provider.
- **(b) A prefetched static route** skips pending altogether and shows nothing. That is correct:
  it is instant.
- **(c) Back and forward** show nothing either way.
