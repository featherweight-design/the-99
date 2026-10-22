# The 99 — push notifications (design handoff · R1)

Account 2, 2026-10-22. Brief: Hugh's prompt in the project chat. States: `STATES-push.md`. About entry: `about · push.ts`.
Canvas: https://claude.ai/artifact/G8WTrx3aMQmUCYqpD2aaxo

**Status: R1 approved by Hugh 2026-10-22** ("Agreed with A. This LGTM"), delivery **A** by his ruling. Readiness: `READINESS.md`. Builds on Settings' "What's new on Home" and the feed
(`design/design_handoff_the99_menu_home/`, shipped in `src/components/settings/news-section.tsx`), the spare request
(`design/design_handoff_the99_spare_requests/`) and the combo kind. Every string is a placeholder for `/copy-review`.
Orange dashed outlines mark what is new against the shipped page. System UI (browser and OS prompts, lock screen,
Android shade, macOS banner) is drawn approximately and labelled so.

## Hugh's rulings (closed)

- Push carries the feed's six kinds: new set, new precon, wishlist price drop, combo, trade match, a friend wants your spare.
- Each kind has its own push toggle, separate from its feed toggle. All off by default except "a friend wants your spare".
- Web push only. On iPhone only once The 99 is on the Home Screen (iOS 16.4+). No native app.

## Calls

1. **One column beside the kinds.** The section keeps its six shipped rows; each gains a second box on the right under a
   **Push** head (the section head's right slot). Left box = Home (as shipped), right box = push. Independent: push can
   be on with Home off. The shipped `Checkbox` (18px) in both; the row's text stays the Home box's press, the push cell
   is its own 44px press. Ticks are the account's (every device).
2. **The device switch heads the column.** First row: **Push on this phone** (*this browser* on a computer, *this iPhone*
   installed), bell glyph in the box slot, one box in the push column. This device only; never changes the ticks.
   States: not on yet, on, off here, blocked (box disabled, line says where to undo it), needs the Home Screen (iPhone in
   Safari), can't (no box, no column; Home as shipped).
3. **The ask comes from a tick, never a load.** Never on first load, never on Home, never in Home's inline opt-in. A tick
   on any push box (device row or kind) while push isn't allowed calls the browser's own prompt in that press (the user
   gesture). No pre-prompt of ours. Allow: device row ticks. Block: blocked state, kind ticks kept. Closed without a
   choice: still not on yet; the next tick asks again.
4. **iPhone in Safari: Home Screen first.** The device row reads *On iPhone, push works once The 99 is on your Home
   Screen. How ›*. How, the device box, or any push tick opens one sheet (the shipped sheet box, ✕): Share, Add to Home
   Screen, open it from there. The tick is saved. iOS before 16.4: no box, one line.
5. **The notification is the feed item.** Title and body are the feed item's words; reworded only where a push stands
   alone (price drop spells was/now, combo names its kind, spare request says where to answer). App icon; the feed
   item's card at card shape where the system shows an image (Android, desktop), never an art crop. No action buttons.
   A tap lands where the feed press lands and marks that item seen.
6. **Delivery: A (Hugh’s ruling, 2026-10-22):** send each as it happens; several of one kind from one job are one push
   landing on Home's What's new; **nothing 9pm to 9am** in the device's time zone, what waited goes at 9am one per kind.
   No quiet-hours setting (the OS's Focus / Do Not Disturb cover the rest). B (one digest a day) drawn on Delivery.
7. **Quiet when you're looking.** No push while The 99 is open and focused. Installed apps carry the Home slot's count on
   the app icon.
8. **Foot line:** *Home: in the app, a count on Home and the list. Push: only to devices you turn on, and never 9pm to
   9am. No email, ever.* The push clause leaves on a device that can't push.

## Every kind

| Kind | Title · body | A tap lands on | Several at once |
|---|---|---|---|
| new-set | *Edge of Eternities is out* · *281 cards. See the set.* | the set's page (feed item's link) | one set is one push |
| new-precon | *Counter Intelligence precon is out* · *You own 31 of its 100 cards.* | the precon (feed item's link) | *2 new precons are out* → `/decks/precons` |
| price-drop | *Jace, Multiverse Architect is cheaper* · *Was $8.40, now $5.10 at the cheapest printing.* | Home with the card's details open | *3 cards on your wishlist got cheaper* · *Jace, Dina and 1 more.* → Home |
| trade-match | *Colin has a spare Ghoulcaller Gisa* · *It's on your wishlist.* | `/friends/{publicId}` (Spares) | *Colin has 3 spares you want* |
| spare-request | *Peter asks for your spare Lathliss, Dragon Queen* · *Peter wants 1 for Dragons of Tarkir. Answer in Friends.* | `/friends`, Waiting on you, the request in view | never collapsed |
| combo | *You can make a combo* · *Thassa's Oracle + Demonic Consultation. You added Demonic Consultation.* | Home with the first piece's details open | *You can make 4 new combos* · *From the cards you just added.* → Home |

## Gaps for engineering

- **G1 · Subscriptions.** `push_subscriptions`: user_id, endpoint (unique), p256dh, auth, user_agent label, time_zone
  (IANA, from the browser), created_at, last_ok_at. The device row adds or deletes this device's row. 404/410 deletes it;
  a visit with permission still granted re-subscribes silently.
- **G2 · Push prefs.** `user_prefs.push_kinds` beside `feed_kinds`, same closed set. Unset reads `["spare-request"]`. A
  kind whose switch is off is absent, as on Home.
- **G3 · Sending.** The writers that record feed items (`recordFeedItem`, the catalog read) enqueue per subscribed device
  when the kind is in `push_kinds`. Catalog kinds fan out at the ingest job's end, never under the `catalog-ingest` lock.
  VAPID keys in env.
- **G4 · Collapse and hold.** One push per (user, kind, job run); `tag` = kind. 21:00–09:00 in the row's `time_zone` a
  push waits; at 09:00 the waiting ones go, one per kind. Spare requests never collapse; they still wait for 09:00.
- **G5 · Landing and seen.** Payload carries route and feed item key; the worker focuses or opens a window at the route;
  the page marks that key seen. Opening Home closes delivered notifications for items it marks seen.
- **G6 · Foreground and badge.** Skip `showNotification` with a focused client. Installed apps `setAppBadge(unseen)`.
- **G7 · Sign out** deletes this device's subscription.
- **G8 · Switch** `PUSH_ENABLED`. Off: no column, no device row, no sends, today's foot.
- About gaps A1–A5 are on the About board and in `about · push.ts` (A1: a new `settings` About screen).

## Boards

| File | What |
|---|---|
| `Main.dc.html` | R1 · the flow, calls, gaps |
| `Settings.dc.html` | Settings · the push column, 390 (not on yet, on) and 1300 |
| `Device-States.dc.html` | the device row's six states at 390 |
| `The-Ask.dc.html` | tick → the browser's prompt → allow or block; Android, Chrome desktop, installed iPhone |
| `iPhone.dc.html` | Safari: the row, the Add to Home Screen sheet, installed, allowed |
| `Notifications.dc.html` | lock screen, Android shade, macOS banner, the spare request's landing, every kind's table |
| `Delivery.dc.html` | the open call: A each/bursts/nights held (recommended), B digest, quiet hours |
| `About.dc.html` | the entry in the Reference at 1300 and 390, six themes, line switches, gaps |

Images are canvas assets (`/_blob/…`) in the exports; local copies in `art/`. `scratch-gen/` holds the generators
(kit/parts from menu-home, sr from spare requests, fdk from friend decks, push.py, boards.py, aboutgen.py over the
launch-end batch's la/akit, aframes.py for the About picture). Local build: `cp -r ../art scratch-gen/art`, then
`python3 build.py local` and `python3 render.py $PWD/out <names>`.
