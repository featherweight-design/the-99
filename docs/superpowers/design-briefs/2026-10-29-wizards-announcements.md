# Brief: Wizards Announcements (Home rows, Settings switches, early decklists)

**For:** Claude Design. **Prompt:** to be written by the orchestrator from this brief.
**Existing handoffs to extend:** `design/design_handoff_the99_menu_home/` (What's new, the lead story, Settings' news
section), `design/design_handoff_the99_push/` (the push column), `design/design_handoff_the99_upcoming_precons/` (the
Announced group, R2 over R1), `design/design_handoff_the99_precons/` (the open precon page). Where a shipped component
and a handoff disagree, the component wins.

## Hugh's rulings, which bind every screen here

1. Every post in the magic.wizards.com Announcements category comes in, sorted by rules (no model call) into three
   kinds: **Secret Lair**, **Commander decklists**, **Other**.
2. Every kind is **on for every player by default**, and each can be switched off in Settings.
3. A notification links **out** to the post: title, summary, hero image.
4. A Commander decklists post also gives an **early, view-only decklist** on Precons, owned cards marked. No deck can
   be started from it; that waits for the MTGJSON release list, which **replaces** it.
5. An early list gets **no Overview and no power reading**. Both are still built once, from the release list.
6. A post may promise N lists and publish fewer at first (the Star Trek post promised 4 and had 3). Lists fill in later.

## Engineering fit (fixed)

- Each kind is a new **stored** feed kind beside `price-drop`, `trade-match`, `spare-request` and `combo`
  (`STORED_KINDS`, `src/lib/feed/kinds.ts`), written by the ingest job and pushed through the existing flush
  (`src/lib/push/flush.ts`). It joins `DEFAULT_ON_KINDS`, which today holds only `spare-request`, and takes a place
  in `LEAD_PRIORITY`. Items keep the feed's 14-day window (`FEED_WINDOW_DAYS`).
- Early lists sit under `UPCOMING_PRECONS_ENABLED`, in the Announced group (`src/components/decks/precons/announced-group.tsx`),
  and are acknowledged with a `lists:<code>` seen key, the key the arrivals banner already writes for a set's listed
  decklists (`seenKeysFor`, `src/lib/precons/arrivals.ts`).

## Surface 1: the Home announcement row (390 and desktop)

**Today.** What's new (`src/components/home/whats-new.tsx`) draws five rows, then "Show all N", Today and Earlier
labels when both hold rows. Each row is `FeedItemRow` (`src/components/feed/feed-item.tsx`): a 46x64 card-shaped
picture (`CommanderThumb size="feed"`), a mono kicker with the unseen diamond and the age ("Trade match · 6h ago"),
a 14px semibold title that wraps without a clamp, a 12.5px line, then the press and the ✕ (`DismissButton`), under
the text on a phone and in a third column from `md`. A row that leaves the app already exists: a price drop's press
opens Mana Pool in a new tab and ends in ↗ (`FeedPress`, the `item.outbound` branch). The first unseen item by
`LEAD_PRIORITY` leads Home instead, drawn big with the card tilted over its blurred art (`src/components/home/lead-story.tsx`).

**New.** A row per post: kicker naming the kind ("Secret Lair", "Commander decklists", "Announcement" or Design's
word), title, a summary line, the hero image, and an outbound press with ↗. A Commander decklists row may carry a
second, in-app press to the early list on Precons.

**States to draw.**
1. One row of each kind, seen and unseen, among existing kinds.
2. Long title and long summary (a Wizards post title can run to two lines at 390).
3. Missing or failed hero image.
4. The post as the lead story.
5. A Commander decklists row whose lists are partly out ("3 of 4 lists so far"), and once all are out.
6. A kind switched off: its rows are gone, and the quiet line ("Nothing new right now. You hear about ...", `Quiet`)
   names only the kinds still on.
7. Dismissed (✕), the same as every row.

Loading and error need nothing new: the feed is one server read (`loadHomeFeed`, `src/lib/feed/home.ts`).

## Surface 2: the per-kind Settings control (390 and desktop)

**Today.** Settings' "What's new on Home" (`src/components/settings/news-section.tsx`): one checkbox row per kind
available to the reader, in `FEED_KINDS` order, name over a one-line description (`feedCopy.news.kinds`,
`src/lib/copy/feed.ts`), at least 44px tall, one column at both widths. Each box saves as it changes; a failed save
puts the set back and says so in the shared social toast. With push available, a 44px Push column sits at the right,
each kind with its own push box, and a device row leads the list. A kind whose switch is off is absent, never
disabled.

**New.** Three rows, one per kind, each with its Home box and its Push box, both ticked by default.

**States to draw.** All three on (the default); one off; push unavailable on this device (the column leaves); a
failed save. Loading and empty are not new.

## Surface 3: the early decklist on Precons (390 and desktop)

**Today.** An announced set is a dashed block in the Announced group, never a precon: no figure, no link, no Start
(`AnnouncedSet`, `src/components/decks/precons/announced-parts.tsx`; rows view `announced-row.tsx`). It holds the
revealed commanders, or the "none revealed yet" plate (`NonePlate`). A released precon opens at
`/decks/precons/[fileName]` (`src/components/decks/precons/open-precon-view.tsx`): eyebrow "Precon decklist ·
read-only", the "You own N of M" band and bar, `DecklistGroup` in its read-only form with the owned dot, List or Card
view (`ViewToggle`), `StartPrecon`, and the stored Overview (`PreconOverview`).

**New.** Each early list in the set block, and its own view-only page: the list grouped by type, owned cards marked
with the same owned dot, the owned count. **No** Start, no Link deck, no Overview, no power reading.

**States to draw.**
1. Early list: a clear "early list, replaced at release" state on the list and on its entry in the set block.
2. Partly published: "3 of 4 lists so far" on the set block, and the missing list's slot.
3. Release day: the release list has replaced the early one; Start and the Overview appear as today.
4. A post that named a list whose cards the catalog cannot yet match (unmatched lines).
5. No collection uploaded (`EmptyCollectionBand`, as today).
6. Loading (`src/components/decks/precons/precons-loading.tsx` pattern); the Commander decklists kind switched off
   (open call 6).

## Open calls for Design

1. **The hero image's shape.** Wizards heroes are landscape; the row's picture is a 46x64 card. Crop to card shape,
   a wider slot, or no picture in the row and the hero only on the lead story.
2. **The lead story.** Whether an announcement can lead Home at all, and its place in `LEAD_PRIORITY`.
3. **Default-on and the opt-in.** What's new shows its inline opt-in while every kind is off. With three kinds on by
   default, a new reader almost never sees it. Whether the opt-in still offers the other kinds, and how.
4. **The decklists row's two presses** (out to the post, in to the early list): both, or one.
5. **The early state's mark.** Words, a tag like the Announced group's `new`, the dashed treatment, or a mix.
6. **A kind switched off.** Whether turning off Commander decklists also hides early lists on Precons, or only the
   Home rows and pushes. Eng's preference: Precons is unaffected.
7. **Kind names** for Settings and the kicker. `/copy-review` settles the wording.

## Not in scope

A model call or credit; an Overview or power reading on an early list; starting a deck from one; any post category
other than Announcements; an About label (Hugh's discretion).
