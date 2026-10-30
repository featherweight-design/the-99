# Readiness · Wizards announcements

**Verdict: Green.** R1 and R1b approved by Hugh 2026-10-29 ("This all LGTM, let's open a PR"), every recommended
option taken. Nothing below blocks the build; each open item has a drawn default. Checked against main at `c6909b9`.

## For Hugh

1. **Copy** is placeholder throughout, for `/copy-review`: the three kind names, their Settings lines and kickers,
   the column heads "In app" and "Push", the section name "Notifications", the offer line, the early band's words,
   "early list", "Not in our catalog yet".
2. **About.** Hugh decides whether the announcements, the Settings rework or the early lists owe an About entry.

## For engineering

1. **Kinds.** `secret-lair`, `commander-decklists`, `wizards-other` join `src/lib/feed/kinds.ts` as catalog-family
   kinds and join `DEFAULT_ON_KINDS`. `LEAD_PRIORITY` becomes spare-request, trade-match, combo, price-drop,
   commander-decklists, new-precon, new-set, secret-lair; `wizards-other` never leads (update `kinds.test.ts`).
2. **Home row.** Shipped `FeedItemRow` with the hero cropped into the 46x64 slot (radius 4, `object-fit: cover`,
   no card shadow); the post-glyph plate on a missing or failed hero. Decklists rows carry two presses: one action
   line on a phone, stacked and right-aligned from `md`. Lead story hero per call 2.
3. **The offer** (`src/lib/feed/home.ts`): shown while the reader has never chosen, as the last line of What's
   new. ✕ saves an empty choice. With nothing in the window, see `ERRATUM-offer-empty.md` (small items 5,
   `Offer-Empty`): the quiet line, then the offer line, and the full opt-in panel retires.
4. **Settings (R1b-1).** Rework `news-section.tsx`: section "Notifications", column heads In app and Push over two
   52px cells per row, each the shared `Checkbox` in its own 44px press with an `ariaLabel`; the row text no longer
   toggles; the device row moves to its own band above the heads. Applies to every kind. Update
   `news-section.test.tsx` and `news-section.push.test.tsx`.
5. **The `new` mark (R1b-2).** Retire `NEW_TAG` in the Announced group: "new" in `--accent-text` leads the mono meta
   line in `announced-parts.tsx` and `announced-row.tsx`, and reads "· new" after the count in
   `announced-group.tsx`'s head. Update `announced-group.test.tsx`.
6. **Link-out icon (R1b-3).** One `LinkOutIcon` in `src/components/ui/`, `aria-hidden`, replacing every ↗: in
   `ExternalLink`, `FeedPress`, credits, public pages, the Fan Content notice, and the copy strings that embed it
   (`deck-analysis` source, `decks-builder` detailHint, `mana-balance` buyLink, the brackets sheet). The spoken
   "(opens in a new tab)" stays. Tests matching "↗" in text update. Purely visual: no switch.
7. **Early lists** under `UPCOMING_PRECONS_ENABLED`: tiles in the set block, their own page and route (G4), the
   `early:<code>` seen key (G2), unmatched lines (G3), replaced when MTGJSON lists the box.
8. **Kind switched off** leaves Precons unaffected.
9. **Quiet line** (G1): an inline name per kind instead of lowercasing.
10. **Mobile and desktop** ship together in each PR.

### Engineering audit of item 6, the link-out icon (2026-10-30, UI PR 1, against origin/main)

**Verdict: Green.** Item 6's claims hold, with two corrections to its list:

- Every ↗ named is real and replaced: `ExternalLink`, the feed press, credits (history, plan card, return band), the
  public printings and top bar, the Fan Content notice, and the copy strings in `deck-analysis` (`provenance.source`,
  used by the all-brackets sheet, provenance panel, lean line and combo receipt), and `mana-balance` (`buyLink`).
- `decks-builder` `detailHint` had no consumer on main: it is deleted, not given an icon.
- Not in the list: Mana Balance's TCGplayer citation drew its own arrow-only SVG (`mana-evidence.tsx` `LinkOut`, no
  glyph, so a search for ↗ misses it). It now draws `LinkOutIcon` too.
- Left as they are: `short-deck-warning`, `cost-strip`, `precon-pick-view` and `receipt-link` open new tabs but drew no
  arrow before, so the icon's "replaces every ↗" does not reach them.
- After the change `grep -rn '↗' src scripts` matches only the three scraped announcement fixtures.

### Engineering audit of item 4, Settings' Notifications (2026-10-30, UI PR 2, against origin/main)

**Verdict: Green.** Item 4's claims hold, with four notes on how it reads against the code:

- Every claim is real and built: the section is "Notifications"; mono heads In app and Push sit over two 52px cells
  per row, each the shared 18px `Checkbox` in its own press at least 44px tall, named "In app: <kind>" and
  "Push: <kind>" (`Push:` was already shipped); the name and line sit outside every label, so the row's text
  toggles nothing; the device row is a sunken band above the heads, its box at the band's right over the Push
  column. It applies to every kind through one row, so any `FEED_KINDS` entry draws the same way.
- "Applies to every kind" draws six rows today, not nine: the three announcement kinds join `FEED_KINDS` and
  `DEFAULT_ON_KINDS` in their own PR, and their names and lines join `feedCopy.news.kinds` then. The boards draw
  them with the same name-and-line shape as the shipped kinds (no kicker in Settings), so the row needed no new shape.
- "Push unavailable" is two cases in the code, and the boards draw one. A device that cannot push
  (`deviceState` "cant") is drawn: the band says so with no box, In app keeps its head, the foot loses its push
  clause. Push switched off for the reader (`PUSH_ENABLED`, no `push` prop) is not drawn: it takes the same
  column, head and foot, and no band, since the band is about push on this device.
- The foot's old split (a Home clause, a push clause, a separate can't-push foot) becomes one foot: bold In app, its
  clause, then bold Push and its clause while the column stands, then "No email, ever." The retired keys
  (`feedCopy.news.foot` as a string, `pushSettingsCopy.footCant`) had no other reader.
- No switch: the rework is layout only and ships unswitched, as item 4 implies (it names none).

Ruled 2026-10-30 (Hugh, through the orchestrator): the rework ships with the app's shared toast and shared `Checkbox`,
unchanged. The board's failed-save toast (danger dot, close ✕, its own radius, gap, padding and shadow) and its checkbox
`line-height: 1` differ from those shared components; whether that look should apply app-wide is a Design note, not
this PR.

### Engineering audit: UI 3a (Home)

2026-10-30, against origin/main. Home's rows, the lead and the quiet line, behind
`ANNOUNCEMENTS_ENABLED` per reader. Push (3b) and the offer (3c) are not in this PR.

- **Kind key.** `wizards-news` stands (migration 0193); the boards' `wizards-other` is the same kind. Its reader-facing
  words come from `feedCopy` ("Wizards news" kicker and quiet name, "Other Wizards news" in Settings).
- **Switch.** All three kinds are available exactly when `ANNOUNCEMENTS_ENABLED` is on for the reader
  (`feedKindAvailable`); `UPCOMING_PRECONS_ENABLED` is read nowhere new.
- **Default on reaches readers who never chose.** The catalog branches' feed gate is `kindEnabledAt`, not the stamp
  alone, so a reader with no prefs row reads posts (probed on the scratch branch).
- **Lead.** `LEAD_PRIORITY` per call 2; `NEVER_LEADS` holds `wizards-news`; a kind missing from the priority sorts
  last, never first. A post leading with no hero, or one that fails, drops the hero band (the boards draw no such lead).
- **"See the lists ›" is omitted** until the early lists (UI 6). A decklists row and lead carry "Read the post" alone,
  as the primary press; the mono lists line stands.
- **Press target.** The post's stored address, only when it is an https page on `magic.wizards.com`; otherwise no
  press. 3b moves every post press onto its own redirect route.
- **Push D4 stands.** The Lead-Story board's caption "a push tap marks the row seen" contradicts push D4 ("a landing
  never marks anything seen"): a push landing never visits Home, so marking the row seen would hide news the reader was
  never shown. 3b follows D4.
- **Push in 3a.** Nothing queues a post (`PUSH_CATALOG_KINDS`), and Settings draws no push box on the three rows
  (`pushableFeedKinds`); 3b lifts both.
- **The ✕ on a post.** `feed_dismissals_key_check` admitted only `item:`, `ask:`, `set:` and `precon:` keys, so a
  `post:` dismissal was refused (probed). Migration 0195 widens the check to `post:`, and `parseDismissKey` admits it, so
  post rows and leads draw their ✕ like every other row.

### Engineering audit: UI 3b (push + redirect)

2026-10-29, against origin/main after UI 3a (#2407). Pushes of Wizards' posts and the route every post press goes
through, behind `ANNOUNCEMENTS_ENABLED` (and `PUSH_ENABLED`) per reader. No migration: `push_outbox_kind_check` already
admits the three kinds (migration 0193).

- **Pushed.** `PUSH_CATALOG_KINDS` is every catalog kind and `pushableFeedKinds` every available kind, so the three
  rows get their Push box in Settings and the cron queues posts. A post is queued exactly as a new set is: the feed's own
  branch (not the baseline, not dismissed), at the moment the ingest first saw it, newer than the kind's PUSH stamp,
  inside the 24-hour stale window. The three kinds are default on, so their push is on for a reader with a device until
  they untick it, as the README's "On from the start" reads.
- **The message.** One post: its title, its summary (with none, "Read it on Wizards."), its hero when https, tagged by
  its kind, landing on its out route. Several of one kind from one day, or one night's held release: "<kicker>: N new
  posts", the titles, landing on Home. A post with no press (an address off magic.wizards.com) is not pushed.
- **The out route.** Every post press, Home's row, Home's lead and a push, goes to `/out/wizards/<contentful id>`
  (signed in, not public), which re-checks the reader's switch, reads the post's address from the database and
  redirects (307, `private, no-store`) only to an https page on `magic.wizards.com`; anything else goes to Home. A
  push's landing therefore stays on the app's origin, as the service worker requires, and no payload or cached page
  carries the off-site address.
- **Every path under `/out/` leaves the app.** The service worker opens a window for such a landing and never navigates
  the app's own window there: `navigate()` to a page that redirects off-origin resolves null, and the fallback opened a
  second window.
- **Push D4 stands.** The route and the landing mark nothing seen; Home's own visit does.

### Engineering audit: the shared feed row's press, lead button and ✕ ring (2026-10-30, against origin/main)

The design review of UI 3a found three places where every feed row on main, not only Wizards' posts, differed from the
newest drawing of the row (Home-Rows, Lead-Story, Row-States). Fixed for every kind:

- **Row press:** one line (`whitespace-nowrap`) for every fixed label. A trade match's "See ‹name›’s spares" still
  wraps (`pressWraps`): a name may run 30 characters (`DISPLAY_NAME_MAX`), and on one line that is about 290px against
  the 260px a 390 row leaves beside the ✕. Ruled 2026-10-30 (option b): never hide a friend's name.
- **Lead button:** a fixed 40px (36 from `md`) on one line for a fixed label from 390 up (below 390, beside the ✕, it
  may wrap: at 320 the button has about 96px); a friend's name keeps the wrapping,
  `min-h` button.
- **The ✕:** radius 8 and a 2px accent ring (`box-shadow`) over a transparent outline, which forced-colors mode repaints in a system color, in place of the global square outline. The ✕ that takes
  focus after a dismiss carries a `data-ring` marker (cleared on blur), so the ring shows after a pointer press too, in
  every browser (`focus({ focusVisible })` is not supported everywhere); a fallback
  (the section's head) is focused plainly and draws no outline after a pointer press.

### Engineering audit: UI 6 (early lists)

**Shipped.** An early decklist's own page: the open precon view (`open-precon-view.tsx`) in a view-only mode driven by
its `early` prop. Head with the eyebrow "Early decklist · view-only", the dashed `--fact` band with "Read the post"
(the shared `LinkOutIcon`; linked only when the stored url is https on magic.wizards.com), the own band, List or Cards,
read-only rows with the owned dot and no SET number, and a last group "Not in our catalog yet" (G3: dashed rows, no
dot, pips or press; they count toward M, never toward owned). No Start, Link a deck, dock, Overview or power reading.
The shipped `EmptyCollectionBand` sits under the early band with no collection (3.7). Frame 7's skeleton (3.8) is not
built: segments own no `loading.tsx` (`route-loading.test.ts`), so the shell draws the wait, as on the open precon. Each Announced set block carries `id="announced-<code>"`.

**Route (G4).** `/decks/precons/early/<contentfulId>/<position>`: the post's Contentful id and the list's position in
it. The board's `<code>/<slug>` was an example; a list has no slug. An unknown id or position, or a position that is
not a plain integer, is a 404.

**Set resolver and redirect (3.4).** Read at request time, no migration. Every list in the post votes with its
commander's printings in paper Commander sets (`sets`, type `commander`, not digital) released from 60 days before to
180 days after the post's day; the set with the most lists wins (a tie goes to the earlier release, then the lower
code). The early address redirects to `/decks/precons/<fileName>` once a plain-edition precon names the same
commander, preferring the resolved set: first a precon in that set (unless the catalog first showed it, by
`catalog_first_seen`, more than three days before the post), then, only when the resolved set has none, a precon in any
set whatever its release date that the catalog first showed no earlier than three days before the post (a new Secret
Lair deck matches; a later product elsewhere cannot take over a resolved set's release; an older precon never matches). "Released, still waiting" (3.5) is the resolved set's
release day on or before today with no such precon.

**Switch.** `ANNOUNCEMENTS_ENABLED` (off: 404). `UPCOMING_PRECONS_ENABLED` was retired in #2399, so item 7's wording
is superseded.

**Deviations.**
- The head thumb is the board's 64x89 (84x117 from `md`) and the back link its 24px press on the early page only;
  the shipped precon page keeps its 46x64 / 56x78 thumb and back link unchanged.
- The own band keeps the catalog line but drops "so K are listed": the early page lists those cards, in its last
  group. It reads "2 cards in this precon aren't in our catalog yet."

**Copy review.** The released-but-waiting band was tightened from three sentences to one: "**Out Nov 13, but this is
still Wizards' early list:** you can start a deck from this precon once the release list is in." Every other early
string ships as drawn.

**Follow-up.** The "See the lists" presses on Home and in the lead story ship in UI 6b.

### Engineering audit: UI 4 (the offer)

2026-10-29, against `feat/announcements-ui3a` (PR #2407; rebased onto main after it merges). Call 3, board `Offer`
(1.10), behind `HOME_FEED_ENABLED` as What's new is.

- **Built.** While the reader has never chosen, What's new ends with the offer line, under the rows or, with nothing
  in the window, under the quiet line: the bold
  "Pick what else you want to hear about." and "New sets, price drops, trade matches and more.", **Pick ▾** and a ✕
  (`.ofr`, 390 and 1300). Pick opens the shipped boxes in place (`.ofo`): the shipped boxes, extracted to `KindBoxes`
  from the retired opt-in, never a copy, with Show these through `saveFeedKinds`, and focus moves to the first box.
  The ✕, closed or opened, saves an empty choice: the line leaves at once, focus goes to the section's head, and a
  failed write puts it back with the reason. Copy in `feedCopy.home.offer`, placeholders for `/copy-review`.
- **The `alsoOn` rule is retired.** It ended the opt-in at the first item, so with the Wizards kinds on for everyone at
  the first post. `loadHomeFeed` answers `{ chosen: false, offer, on }` for an empty window (`on`, the kinds already
  on, for the quiet line; empty with every kind off) and the items view with `offer` (the kinds still off) once the
  window holds items, while `neverChose` holds.
- **"Never chosen" has one rule.** `neverChose` (`lib/feed/prefs.ts`): nothing in `feed_kinds`, nothing in
  `feed_kinds_declined`, and `feed_offer_closed_at` null. Its only reader was `loadHomeFeed`'s `choseNothing`, now
  replaced. Every other reader of the prefs (`isKindOn`, `effectiveKinds`, `kindEnabledAt` in SQL, the push catalog,
  Settings) decides what is ON, which the ✕ leaves alone: a reader who closed the offer keeps the default-on kinds,
  exactly as one who never chose.
- **The ✕'s marker.** An empty choice through `nextFeedPrefs` writes nothing, so the ✕ stamps its own column:
  `closeFeedOfferAction` stamps the caller's row (`closeFeedOffer`, an upsert guarded on the column being null, so a
  repeat moves no stamp trigger). **Migration 0198** (`drizzle/0198_user_prefs_feed_offer_closed.sql`) adds the nullable
  `user_prefs.feed_offer_closed_at timestamptz`.
- **The empty window (small items 5, Offer-Empty; ERRATUM-offer-empty.md).** A never-chosen reader with nothing in the
  window sees the quiet line and, under it, the same offer line; with no kinds on, the offer line alone. `OptIn` and
  `feedCopy.home.optIn` retire.
- **Fork: the ✕ with no kinds on.** Neither the board nor the README draws it. After the ✕ What's new would be its head
  over an empty box, so it draws the quiet line's lead alone ("Nothing new right now."), with nothing to name.
- **No line with nothing to offer.** A reader who never chose but has every available kind on draws no line.
- **Undrawn: nothing on, after the ✕.** With no kind on, the quiet line has nothing to name, so What's new draws
  "Nothing new right now." alone (the shipped `quietLead`), and the offer line comes back next visit, as the opt-in did
  (ruled 2026-10-30, option a, pending Hugh and a Design note; Settings is the other way back). The ✕'s spoken label is
  "Hide this" (copy review: "for good" overclaimed for that reader).
- **The closed line names only what the reader can pick.** The board's "New sets, price drops, trade matches and more."
  promised kinds a reader without the wishlist or friends could not get. `offer.rest` now lists the kinds still offered,
  by their quiet names: the first three, then "and more" (copy review, 2026-10-30).
- **The shared Checkbox stays** (Hugh's ruling, recorded in #2408's erratum): the Offer board's 20×20 dashed box and CSS
  check are not built; the boxes draw the shipped `Checkbox`.

## Engineering audit: UI 6b (See the lists)

**Scope.** STATES 1.9 and the decklists lead: a Commander decklists row (board Home-Rows `.fi .ac .two`) carries "See
the lists ›" as its main, stretched, in-app press and "Read the post" as the quiet `.lnk.out` (`--fg-muted`) out to
`/out/wizards/<id>`; one line 16px apart on a phone, stacked and right-aligned from `md`, 28px each. The decklists lead
(board Lead-Story `.yg2`) draws "See the lists" filled (`.ba`, 40/36px, no ›) and "Read the post" as the ghost `.gh`.
Secret Lair, Wizards news and a decklists post with no list declaring a commander are unchanged.

**Target.** Read per request on Home, in ONE statement for every decklists post on the page (`postListRowsQuery`), by
the early page's own set rule (`resolvePostSet`, same window and set types):
- the resolved set is released (on or before today, UTC) and `precons` holds it: `/decks/precons?q=<CODE>`. The list
  has no set filter or set anchor, so this searches by the set code, with the code as the removable search chip. The
  search (`filterPrecons`) is a substring match over name, twin name, set code and commanders, so it can also match
  other precons whose names contain the code;
- otherwise, while the Announced group draws the set (`drawnInAnnounced`, the group's own rule: a Commander set
  releasing later, or released within `RELEASED_GRACE_DAYS` with no precon yet), its block:
  `/decks/precons#announced-<code>`;
- otherwise, or when no set resolves: `/decks/precons#announced`.

**Anchors.** The Announced group opens on `#announced-<code>` as on `#announced`, over a stored close, and scrolls to
that set's block once open (the server draws the group closed, so the browser's own jump found no height). The rows
view's set row carries the same id as the tiles view's block.

**Off-host post (ruling).** See the lists is in-app, so it draws whenever a list qualifies; only Read the post depends
on the stored address being https on magic.wizards.com. Off-host, See the lists is the one press (the row's stretched
link, the lead's filled button).

**Deviation.** The row's picture links where the stretched press goes (See the lists), not out to the post.

**Copy review.** "See the lists" ships as drawn.

### Engineering audit: UI 5 (Announced)

2026-10-29, against origin/main after UI 6a (#2412); UI 6b (the set rows' `#announced-<code>` ids and hash-open) is
not on main yet. Behind `ANNOUNCEMENTS_ENABLED` per reader: the precons page's cached load decides it from the key's
env, and with it off no early list or early seen key is read. No migration: `upcoming_seen_codes` has no CHECK
constraint, only the `SEEN_KEY` pattern in code, which now admits the third form.

**Shipped.**
- **R1b-2, the `new` mark.** The boxed `NEW_TAG` is gone from all three surfaces. `new` in `--accent-text`, in the
  line's own font, leads the set block's meta ("new · Nov 13, 2026 · in 15 days" on a phone, "new · FDC · Nov 13, 2026 ·
  in 15 days · 3 of 5 lists so far" from `md`), leads the set row's third line after the dots ("new · FDC · Nov 13,
  2026"), and follows the group head's count ("1 set · new"). One component, `NewMark`.
- **Early lists (3.1, 3.2, call 5).** A set whose Commander decklists post has lists draws each as a precon tile in the
  block's own grid (the shipped `PreconTile`, `early`): the commander's card, "you own N of M", the list's name, and on
  the sub-line its dots and "early list" in `--fact`, no box; solid edge; no foot; linked with `earlyListHref`. Then the
  revealed commanders no list stands for, then the none plate's note "N more lists to come" when the post promised more
  lists than are posted or stood for by a waiting commander. The fold (addendum A1) counts lists and commanders together.
  In rows, the set row opens to the lists as rows (line 2: dots, "early list", "you own N of M"), then each waiting
  commander as a dashed row ("revealed · list to come", its thumb opens card details), then the note; the row's line 2
  counts lists before the names ("3 of 5 lists so far · Ghalta and 3 more"). The meta's count half becomes the lists'
  ("3 of 5 lists so far", "All 5 lists", "3 lists so far" with no number promised), in `--fg-body`.
- **The data.** `loadEarlyListsBySet` (`lib/announcements/early-tiles-read.ts`) reads every Commander decklists post of
  the last 210 days (180 of the set window, 30 of grace), resolves each post's set exactly as the early page does
  (`commanderPrintingsQuery` + `resolvePostSet`), keeps those resolving to a set in the group, and builds each tile's
  figures with the early page's own `assembleEarlyList`, so a tile's "you own N of M" is the page's. It rides in the
  cached precons payload; `wizards_announcements` is already a catalog table to the list cache.
- **G2, the early seen key.** `early:<code>:<count>` in `upcoming_seen_codes`, apart from `lists:<code>`. A set is new
  while the reader holds no `early:<code>:<k>` with k at least its posted count, so a further list (3 → 5) lights the
  block and head again. A Precons visit writes the keys for the lists it could show, beside the arrivals' keys, in the
  same `after()`. Neither key says anything about the other, nor about the set's own key.

**Forks resolved.**
- **Key shape.** The brief's "an early seen key carrying the list count" read as `early:<code>:<count>`; a reader holding
  a larger count is not re-lit when a list is withdrawn.
- **Early news opens the group.** An unseen early list is news, so it opens the group by itself as an unseen set does
  (rule 9 holds: the visit acknowledges it, so the group does not stay open on its own). No arrival window: every early
  list in the group is pre-release by construction.
- **A list whose release list is in.** A list whose commander already heads a plain-edition precon in the resolved set
  is left out of the block (STATES 3.4), so the block never offers an early page that would only redirect.
- **Filters.** Early lists filter with the list as revealed commanders do (colours by containment; a search by the set,
  the list's name or a commander's name), and a matching list keeps its set. The meta and the note count unfiltered.
- **Two posts resolving to one set** (a post re-published under a new id) read as one: lists in post order, the larger
  promise.

**Undrawn.**
- The rows view's sub-rows (an early list, a waiting commander) are drawn at one size on the board (390 only); the same
  classes serve `md`.
- A tile for a list whose commander the catalog cannot match yet draws the shipped no-art plate with no name (the precon
  tile's rule), and its name only in the caption.
