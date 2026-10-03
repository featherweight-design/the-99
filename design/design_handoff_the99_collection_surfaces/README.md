# The 99 — Collection surfaces (design handoff, R1)

`design/design_handoff_the99_collection_surfaces/` · 2026-10-02 · H11 + H18

**Status: R1, approved (LGTM, 2026-10-03).** Fidelity: **high**. Sizes, heights, mark paths and token
names are final. Card names and their marks are illustrative.

**About these files.** The `.dc.html` canvas is a design reference built in HTML, not production code.
Open it in a browser with `support.js` beside it. Rebuild it in the app's existing stack: Next.js
server components, Tailwind, and the existing `filter-chassis`, `card-tile-caption`,
`availability-marker` and `mark-key` components. The engineering contract (canvas §7) and
`STATES-collection-head.md` are the spec; the frames illustrate them.

**Tokens.** The design uses the app's existing semantic tokens only: `--bg`, `--surface*`,
`--elevated`, `--border*`, `--fg*`, `--accent`, `--danger`, `--fact`, `--avail-*`, and the WUBRG
colours. No new tokens are introduced. The canvas pins the Kaldheim theme values to match the
shipped screens, so engineering should keep reading the themes' tokens, not those hex values.

**Assets.** None new. The fact marks and combo glyph are the shipped paths from
`src/components/cards/{card-fact-mark,combo-glyph}.tsx`. The keyboard in the frames is a stand-in.

Source of truth: **`docs/superpowers/design-briefs/2026-10-02-collection-surfaces.md`**, read in full.
It was read at `main`: the `docs/brief-collection-surfaces` branch is merged and no longer exists.
Structural sibling: `design_handoff_the99_set_collections/`, whose collapsing head is the reference.
This package answers the same problem with the opposite mechanism and explains why.

Read at `main` this round: `collection/{browser,filter-bar,grid-view,collection-mark-key}.tsx`,
`ui/{filter-chassis,card-tile-caption,availability-marker}.tsx`, `sets/use-head-collapse.ts`,
`decks/{mark-key,proxy-list-view}.tsx`, `app/collection/{page,proxies/page}.tsx`,
`lib/copy/{availability,collection,proxies,card-mark}.ts`.

| File | What it holds |
|---|---|
| `The 99 - Collection Surfaces (R1).dc.html` | The canvas. §1 has the phone head at 390 and 360 in five states, each at full 844 height, plus rows at 390. §2 has the height arithmetic. §3 has the 3-up tile anatomy at both widths at 1× and 2×, with its budget. §4 has the Proxies tabs on three routes, with how you get there and back. §5 has desktop where it changes (1300 and 768). §6 covers the rows default. §7 is the engineering contract. |
| `STATES-collection-head.md` | Every head and tile state, with Must-nots. |
| `READINESS.md` | Self-assessed readiness and the gap report. |
| `collection-surfaces · copy strings.ts` | The four new strings, all for the tab strip. |

Drawn on the Low Sun token block (identical to set-collections' canvas). Inside the frames, every
value is a `var(--token)`.

---

## The five calls

### Call 1 · The head pins from the start; it does not collapse → **102px phone, 60px at 600–999**

The brief asks whether Collection collapses like Sets or is compact enough to pin. **It pins.**

Two rows, at fixed heights: `8 + 44 + 6 + 36 + 7 + 1 = 102px`, **12.1% of 844**. Sets collapses
because its open head is 288px (34%; #623). Collection's open head can be made short enough that
there is no second height to collapse to.

That choice is what keeps the head compatible with the in-flight work, and the brief makes that
binding. `use-head-collapse.ts` is a measured state machine: a `ResizeObserver`, a spacer that
reserves the rest height, thresholds read off `getBoundingClientRect`, and twelve review rounds of
lifecycle defects. Applied to `/collection`, it would:

- Lay a client measurement over a container that d8 now draws on the server. The brief forbids this.
- Measure a head whose height would depend on a first window still arriving.

A `position: sticky` box with fixed heights needs none of that. It is server markup, it paints with
the cards, and it cannot flash.

**So "collapsed" is drawn as "scrolled."** The tab strip (48px) and the mark key scroll away above
the head, and the head stays 102px. §1 columns 1–2.

### Call 2 · The search field → **row 1 to itself except the view well; the full width while focused**

- Row 1 is `SearchField` (flex-1, 44px tall, 15px type) plus `ViewToggle` (88px). The field is
  **262px at 390 and 232px at 360**, against roughly 178 and 148 today, where it shared its row with
  `Filters`, the hairline and `Sort`.
- On focus, `ViewToggle` hides under `:focus-within`, which is CSS, not a measurement. The field then
  runs the full **358 / 328px** while the keyboard is up. The shipped field is 163px at 390.
- Row 2 holds `Filters` (with the dimension badge), the hairline, the shipped `Sort: Name · A–Z`
  trigger, and the result count, right-aligned (decision 12). The
  count stays visible in the pinned head; Sets' collapsed bar dropped it, which was an accepted cost.
- **Chips leave the pinned head.** While at least one filter is on, a 38px shelf sits directly below
  the head, in the scroll: one line that scrolls sideways, with `Clear all` at its trailing edge.
  The query chip (`"tutor" ×`, as shipped) rides the same shelf. Once you scroll, the badge carries the
  state, as Sets' collapsed bar does. At rest, with no filters,
  there is no shelf. This yields chassis decision 2 on this route; the reasoning is under gap 2.

The view well stays in the pinned head rather than going to the tab strip. At 360 the strip has no
room for it beside three tabs and Replace, and row 2 has no room beside a result count.

### Call 3 · The 3-up tile → **marks stay at 16px; the chip loses its word**

The tile is 115.3px at 390 and 105.3px at 360: the track (362 / 332) less two 8px gaps, divided by 3.
It is the whole card at 63:88 (art 161 / 147) over the shipped three-line caption at a fixed 70px.

The constraint asked what drops if the markers cannot all stay legible. Here is the answer:

- **Kept:** the four fact marks and the combo glyph, all at the shipped 16px with the `--fact` glow
  (`CARD_FACT_MARK_PX`, `COMBO_GLYPH_PX`). The canvas draws the shipped paths from
  `card-fact-mark.tsx` and `combo-glyph.tsx`. A fact mark is one size on every surface, so a smaller
  one would read as a second mark.
- **Kept:** `×N` on the name line, `SET · rarity` (Hugh, 2026-09-23), the over tile's danger border,
  and the 9px radius (≥ 3.1% of 115, so the matte rule holds).
- **Dropped: the availability chip's word.** "1 in a draft" is about 81px of a 101px caption. The
  glyph stays in the same outlined slot box (16px, or 21px for over). The word moves to two places:
  the tile's spoken name (`spoken` already carries the sentence) and **the key, which gains three
  availability entries** using the Availability filter's own labels ("Wanted by a draft", "In use",
  "Over-committed").
- **Dropped: a fourth glyph.** Past three glyphs (facts plus combo), the line draws the first two
  facts and then `+N`. It is decided by count on the server, never by measurement. No current card
  reaches four.
- **Shrunk:** caption side padding goes 9 → 7. The name gets about 13 visible characters at 390 and
  12 at 360.

Budget: the caption content is 101 / 91px. The worst realistic line, over + two facts + combo, is
87px, so it fits at both widths. Over + three facts is also 87, which fits. Over + three facts + combo
is 109, so the `+N` rule applies.

**Pending state (first window):** the art plate is a flat `--surface-sunken` with the inner edge, no
shimmer, and deliberately **not** the identity gradient, which already means "no art exists". The
caption draws the name, `×N`, the sub-line and the chip glyph, because those ship with the row. Facts
and combo fill the fixed meta line when the drawn fields land, without reflow.

**The key (H7):** `repeat(auto-fill, minmax(150px, 1fr))` with gap 6/12 and padding 10/14. That gives
2 equal-width columns × 4 rows at both 390 and 360. Each row is 16px tall, the sample's height, so
the key is 90px. Three columns would need 378px against a
360px track, and the longest entry, "Wanted by a draft", needs about 121px, so a third column isn't
reachable on the phone. Rows don't get the availability
entries, because a row prints the word beside its glyph.

### Call 4 · Proxies → **a tab: `Cards · Sets · Proxies`**

A shared `CollectionTabs` strip is the first row of `/collection`, `/collection/sets` and
`/collection/proxies`, at both widths.

- **It replaces** the `By set` and `Proxies` pills in row 3, both breadcrumbs (`Collection / Sets`,
  `Collection / Proxies`), and the empty state's own `Proxies` button.
- **The way there and back is the tab you left by.** Every tab is a bare link, and ruling 15 holds:
  no filters cross the boundary, and Back is a route change. Browser Back still restores
  `/collection`'s filters, because they are mirrored to the URL.
- **Empty collection:** the strip shows `Cards · Proxies`. Sets is *absent, not disabled* (the pill's
  `hasCollection` gate). Proxies stays ungated (the pill's ruling). The page mounts the strip in its
  empty branch too, so the early return no longer loses the entry point. That loss is what
  `page.tsx`'s comment records.
- **`/collection/sets/[code]` keeps its breadcrumb** and does not take the strip. It already has a
  two-height head, and stacking place navigation on top of it reopens that work.
- **On the phone, the strip scrolls away.** It is place navigation, one scroll-to-top from anywhere,
  and it does not cost pinned height.
- **On the phone, the `h1` "Collection" becomes `sr-only`.** The strip's current tab and the tab bar's
  current pillar both say where you are. The shipped mobile header (`THE 99` + avatar, 70px, not
  sticky) is unchanged above it. The stats line (`4,492 cards · 2,926 unique`) drops on the phone. At
  rest, the result count says `2,926 results`; the copies total is the one figure lost. The shipped
  `↻ Replace` link moves to the strip's trailing edge, unchanged.
  **Desktop keeps the h1, the stats and the Replace button**, with the strip under them.

**This is not the view-mode segment set-collections R3 rejected (1c).** That segment sat in the
Rows/Grid well, where the other two options keep the URL path and the filters, so a third option that
navigates is the /commanders defect. This strip sits above the filter frame, belongs to none of it,
and changes the path on every tap. Rejected alternatives (§4): a "Proxied" filter (an inverted
population), keeping the pills and adding a back link (fixes H19 only), and `layout.tsx` (would wrap
`/replace` and the set page).

### Call 5 · Rows → **the phone default stays rows**

The head is identical in rows, in every state. R1 does not flip the default:

- Readers who never chose would find their surface changed under them, and the stored choice exists
  to stop that.
- Rows carry the cost track and the whole name.
- The 3-up grid can be judged first on the readers who opted into it.

If Product wants art-first browsing as the default, it is one line in `browser.tsx` plus the matching
CSS rule for the cookieless first visit. **Gap 1.**

---

## Other decisions

**6 · A change made below the head's rest position returns the list to its first result.** A query,
filter or sort change made while `scrollY` is past the head's rest offset scrolls back to that
offset, so results start under the pinned head. Today the window resets to 200 and the page shortens
under an arbitrary offset. Typing at the top of the page does nothing.

**7 · Row 2 draws at 36px and targets at 44.** It uses the same `after:` overlay the chip × uses. The
overlay reaches 4px into the 6px gap and the 7px padding, so it never overlaps row 1. Drawing row 2 at
44px would make the head 110px.

**8 · 768–999 pins too, as one 60px row.** This band already uses the compact chassis and the sheet,
because the wide row needs 987px. At `min-[600px]` (CSS), rows 1 and 2 share a line. **This depends on
decision 9.**

**9 · The sheet must portal out of the sticky box.** `filter-bar.tsx` records why `sticky` begins at
1000: `z-[2]` opens a stacking context, so the sheet's `z-50` was ranked inside it, and the rail
(`z-30`) painted over an open modal. The same thing would happen to the phone tab bar.
`CollectionFilterSheet` renders via a portal to `body`. This is not optional.

**10 · Desktop changes in exactly one place.** The strip arrives under the title, and row 3's trailing
slot keeps only the view well. The wide chassis, its sticky rule and the 178px tile floor are
untouched.

**11 · The canvas follows the shipped screens.** That covers the Kaldheim palette, the mobile header,
`Sort: Name · A–Z` behind its hairline, the query chip (`"tutor" ×`), the row cards, the tab bar, and
the mark SVGs lifted from source. Card names are illustrative, and their marks are approximately right.

**12 · Below 375px the result count drops its noun visually.** Row 2 holds `Filters` (with badge), the
hairline, the shipped Sort trigger (about 144px) and the count: 350px against 328 at 360. A CSS
breakpoint hides "results", and the accessible name keeps it.

## Notes for engineering

The contract table is in the canvas, §7. The order follows the brief: this build comes after PR 4 and
d8, since all three touch `browser.tsx`. Within it, the work splits into three independent PRs.

1. **The head**: the sticky box, the chassis split, the shelf, the scroll reset and the sheet portal.
2. **The grid**: `grid-cols-3`, the glyph-only chip, `+N`, the pending plate, and the key grid with
   `withAvailability`.
3. **The tabs**: `CollectionTabs`, pill and breadcrumb removal, and the empty branch.

The grid and the tabs are severable from the head and from each other.
