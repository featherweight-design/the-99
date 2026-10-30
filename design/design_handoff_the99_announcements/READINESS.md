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
3. **The offer** (`alsoOn`, `src/lib/feed/home.ts`): shown while the reader has never chosen, as the last line of What's
   new, whatever is in the window. ✕ saves an empty choice.
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
