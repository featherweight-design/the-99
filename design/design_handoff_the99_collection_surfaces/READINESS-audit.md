# Readiness audit: collection surfaces (H11, H18)

**Verdict: 🟠 Orange, on two questions.** The 3-up grid is buildable as drawn once its
prerequisites land, and so is the sheet portal. The pinned head and the tab strip each have one
layout state that is not drawn, and each needs a Design answer before it is built:

- **B1.** The tab strip on `/collection/sets` and `/collection/proxies` at desktop width.
- **B2.** Row 2 of the phone head, and the 600–999 one-row head, when the sort label is long.

Two Product questions are open for Hugh (P1, P2). The other gaps Design raised are resolved below
from the code.

This audit was run against `origin/main` at `018f7cb59` (#1159). It also read the in-flight work on
`/collection`:

- PR #1163, `collection-first-window` at `a6029f3bc`.
- d8's `fix/collection-view-ssr` at `0916679e3` and `fix/collection-colour-match` at `d8c247e95`.
- fa's `fix/collection-walk` (PR #1167, open) and `fix/proxies-walk` (merged as #1159).

The canvas was read from disk as text. It was not rendered.

## Does it answer the brief

| Brief asks | Where the handoff answers | Status |
|---|---|---|
| A compact sticky head, always reachable; collapse or pin; pinned height against 844 | Call 1, §1, §2: pins at 102px, 12.1% | Answered |
| Its contents and heights at 390 and at the `md` boundary | §1 (390, 360), §5 (768, one 60px row from 600) | Answered, but see B2 |
| Where the active chips go | Call 2: a 38px shelf below the head, in the scroll, only while a filter is on | Answered; departs from chassis decision 2 (P2) |
| The search field's height and width; full width or not | Call 2: 44px, 262/232px at rest, full width while focused | Answered; type size corrected (E3) |
| The 3-up tile: what drops or shrinks, and whether the marks fit | Call 3, §3: marks stay 16px, the chip loses its word, `+N` past three glyphs | Answered |
| The key must still read at 3-up, with H7 | Call 3, §3: two equal columns, eight entries | Answered; built on fa's H7 (E7) |
| Collection, Sets and Proxies as one place; the empty collection still gets a way in | Call 4, §4: `Cards · Sets · Proxies`, `Cards · Proxies` when empty | Answered on the phone and on desktop `/collection`. Desktop Sets and Proxies are not drawn (B1) |
| How the phone and the desktop each reach Proxies | §4 "Getting there and back", §5 | Phone answered; desktop as B1 |
| Whether 3-up changes the rows default; the head is the same in both views | Call 5, §6 | Answered: rows stays (P1) |
| Compatible with the first window (a tile state for missing art) | T4, the pending plate | Answered against a mechanism #1163 does not use; remapped (E5) |
| Compatible with d8's server-drawn view: no client measurement before the cards paint | Call 1: sticky with fixed heights, CSS breakpoints only | Answered; one cookieless-visit gap (E6) |
| The desktop track stays out of scope | §5: the 178px floor is untouched | Answered |

## What checks out

- **The sticky rule and its stacking defect.** `filter-bar.tsx:217-228` makes the bar `sticky` only
  from 1000px. Its comment records why: `z-[2]` opens a stacking context that trapped the compact
  sheet under the rail. The sheet is `fixed inset-0 z-50` (`filter-sheet.tsx:168`), rendered
  through the chassis's `after` slot inside that box (`filter-bar.tsx:529`), and nothing in
  `src/components/collection` or `src/components/ui` calls `createPortal`. Decision 9 is real and
  required. It is also incomplete (E1).
- **What Sets does.** `use-head-collapse.ts` is a measured state machine: five `ResizeObserver`
  references, a spacer (`:63`), and `getBoundingClientRect` thresholds. A fixed-height `sticky` box
  needs none of it. The mobile header is not sticky (`nav.tsx:606`), so `top: 0` is correct.
- **The pills, the breadcrumbs and the empty-state button.** These are the five things the strip
  replaces:
  - `By set`, gated on `hasCollection` (`filter-bar.tsx:278`);
  - `Proxies`, ungated (`:305`);
  - the empty-state `GhostButton` (`page.tsx:117`);
  - the two breadcrumbs (`sets/page.tsx:31-37` and `proxy-list-view.tsx:101-106`). Both became
    links in #1159.
- **The result count is shipped copy.** `collectionChassisCopy.resultCompact` (`collection.ts:47`)
  already reads `2,926 results` on the phone. The Sort trigger is `Sort: {order}` (`triggerOne`,
  `collection.ts:363`), and its label is capped at 170px in the compact form
  (`filter-panel.tsx:992`).
- **The window reset.** A filter or sort change resets `shown` to `PAGE_SIZE` (200;
  `browser.tsx:61, 419, 426`). Decision 6 describes it correctly.
- **The key's labels.** "Wanted by a draft", "In use" and "Over-committed" are
  `availabilityCopy.collection.filterSoft/Hard/Over` (`availability.ts:252-254`). The four facts
  are `CARD_FACTS` (`card-mark.ts:28`).
- **The marks.** `CARD_FACT_MARK_PX = 16` (`card-fact-mark.tsx:72`) and
  `COMBO_GLYPH_PX = CARD_FACT_MARK_PX` (`combo-glyph.tsx:44`). The slot box is `px-[5px]` with an
  outline, not a border (`card-tile-caption.tsx:77`), so a glyph-only box is 5 + glyph + 5. That
  gives 16px for a 6px diamond and 21px for the 11px over glyph.
- **The caption is fixed at 70px on the phone.** `8 + 17 + 3 + 20 + 3 + 11 + 8`
  (`card-tile-caption.tsx:57`). The `spoken` prop exists (`availability-marker.tsx:291`), and the
  chip already swaps its word for the sentence.
- **Gap 1's one-liner.** On main the default is `isDesktop ? "grid" : "rows"`
  (`browser.tsx:287`). On d8's branch it is the same rule, plus the cookieless `hidden md:block` /
  `md:hidden` pair. Flipping it is one line plus one class pair, as stated.
- **`/collection/sets/[code]` keeps its breadcrumb**, and `COLLECTION_ROUTES` already invalidates
  all three strip routes (`invalidate.ts:34, 43, 44`). The proxies page already reads
  `getCollectionStats`, so it can gate the Sets tab without a new read.

## Arithmetic, recomputed

**The phone head (§2).** `8 + 44 + 6 + 36 + 7 + 1 = 102`, which is 12.1% of 844. ✓
Row 2's 44px target holds too: 36 + 4 + 4, reaching 4px into the 6px gap and 4px into the 7px
padding, which leaves 2px clear of row 1. ✓

**The search field.** 390 − 32 = 358; 358 − 88 (the view well, two 44px segments) − 8 = **262**.
At 360 it is **232**. Focused, it is 358 / 328. ✓
The handoff quotes the shipped field two ways: "roughly 178" (README) and "163, measured"
(canvas). I did not measure it.

**Row 2 at the default sort.** At 12.5px Plex Sans:

- `Filters` is about 68px, or 93px with its badge.
- The hairline and its two gaps are 17px.
- `Sort: Name · A–Z ▼` is about 144px.
- A gap of 8px.
- The count is about 86px for `2,926 results`, 73px for `212 results`, and about 20px for a bare
  `212`.

That makes 323px at rest and 335px with filters on, against 358 at 390. ✓ At 360 it is 350px
against 328, which is why decision 12 drops the noun; without it, about 297px. ✓

**Row 2 at a long sort: it does not fit (B2).** The sort labels are in `sort-options.ts:20-36`.
Three of them:

- `Sort: Color · Colorless first`: about 210px with the 170px label cap.
- `Sort: Rarity · Mythic first`: about 205px.
- `Sort: Quantity · Fewest`: about 187px.

With filters on, row 2 needs about 403px against 358 at 390, and about 350 against 328 at 360 even
with the noun hidden. Nothing in the contract says what gives.

**The 600–999 one-row head (B2).** §5 draws the 768 frame with a bare `Sort ▾`. That is not the
shipped compact trigger, and the "search at 301px or more" figure depends on it. With the shipped
trigger, the controls are 93 + 17 + 144 + 8 + 73 + 8 + 88 + 8 ≈ 439px. Search then gets:

| Width | Default sort | Longest sort |
|---|---|---|
| 600 (no rail) | ~129px | ~63px |
| 768 (with the 62px rail) | ~235px | ~169px |

**The tile (§3).** At 390: (362 − 16) / 3 = **115.3**, and the art is 115.3 × 88/63 = **161.1**.
At 360: (332 − 16) / 3 = **105.3**, with art **147.1**. ✓ The caption content is 101.3 / 91.3. ✓
The 9px radius is 7.8% of 115, above the 3.1% matte rule. ✓

The meta line uses gap 6:

| Occupants | Width | Fits? |
|---|---|---|
| over + 2 facts + combo | 21 + 3 × 22 = **87** | ✓ at both widths |
| over + 3 facts | **87** | ✓ at both widths |
| over + 3 facts + combo | **109** | Over both, so `+N` applies |
| over + 2 facts + `+2` | ~82 | ✓ at 360 |

The rule is `facts.length + combo > 3`. Since the chip is at most 21px, it holds at both widths.

**At 1× and 2×.** A 115px tile is 230 device pixels at 2×. The tile keeps Scryfall's `normal`
(488px wide), so there is no softening at either density.

**The key.** Two columns are right at both widths: `auto-fill, minmax(150px, 1fr)` with a 12px gap
fits two in 362 and two in 332. Two of the figures behind that are off:

- The contract says "three columns would need 378px against a 360px track". The key's track at 360
  is 332 (360 − 28), and three 150px columns need 474. The conclusion stands.
- The key is 92px by the canvas's own markup (10 top padding + 4 × 16 + 3 × 6), not 90.

**The first tile.** 70 + 48 + 102 + 90 + 10 = 320 as stated. Read through `grid-view.tsx`, which
puts the key inside the grid with `pt-[4px]` and then a row gap, it is about 70 + 48 + 102 + 4 + 92
+ 8 ≈ **324**. With the shelf on, it is about 362. "339 shipped" is a measurement I did not repeat.

**The strip at 360.** 8 + `Cards` (~60) + 2 + `Sets` (~50) + 2 + `Proxies` (~74) + `↻ Replace`
(~91) + 4 ≈ 291px. It fits. ✓

## Blocking (needs Design)

**B1. The strip at desktop on `/collection/sets` and `/collection/proxies`.** §4 draws both routes
at 390 only, and §5 draws only `/collection` at 1300. The three routes do not share a frame on
desktop:

- `/collection` is a full-width `section` with a title block about 90px tall (h1, stats line,
  Replace) and `p-[28px_34px_0]` (`page.tsx:126-170`). The strip is drawn under that block.
- `/collection/sets` and `/collection/proxies` are centred `max-w-[900px]` columns whose own h1 is
  the section's name, "Your sets" and "What you're printing" (`sets/page.tsx:31`,
  `proxy-list-view.tsx:98`).

Mounted as described, the strip would move vertically and horizontally every time a reader pressed
one of its own tabs. On the phone this does not happen, because all three put the strip first under
the same mobile header.

**B2. Row 2 and the one-row head at a long sort.** Above. Two parts:

- What gives in row 2 at 390 and 360 when the sort label is long and a filter is on.
- Where the one-row form starts once it is drawn with the shipped `Sort: {order}` trigger.

## Product questions for Hugh

**P1. Should the phone open on art?** The phone defaults to rows for anyone who has never touched
the toggle. Rows show the whole card name and its cost; the new 3-up grid shows about 7 to 8 cards
by art per screen, with names cut at about 13 characters.

- **Keep rows** (Design's recommendation): nobody's screen changes under them, and the grid is
  judged first by the readers who chose it.
- **Flip to the grid**: Collection browses the way ManaBox does from the first visit, at the cost of
  changing the page for every phone reader who never chose.

Either is one line plus one CSS rule. I'd keep rows for this round and revisit once the grid has
shipped.

**P2. May `/collection` hide the filter-chip row while no filter is on?** The shared filter frame
has a rule (decision 2): the chip row is always there, reading "No filters on" at rest, and its
"Clear all" link is always present. That way, turning a filter on never moves the list. Design
breaks the rule on `/collection` alone: the chips leave the pinned head and appear in a 38px shelf
only while a filter is on. Turning on the first filter therefore moves the list down 38px.

- **Allow it** (Design's choice): the first card sits 38px higher at rest. The list moves only when
  its contents change anyway, and the page returns to the top of the results on every change
  (decision 6).
- **Keep the rule**: the shelf stays in the scroll at rest, reading "No filters on" with "Clear all"
  inert. Nothing ever moves, and the first card starts 38px lower (about 362 rather than 324).

If allowed, I'd make it an option the shared frame owns rather than a `/collection` copy of the
frame, and leave the other routes as they are until one of them pins a compact head.

## Design's gap report, resolved

1. **The phone default:** P1.
2. **Decision 2:** P2.
3. **The Cards tab is a bare `/collection`.** Resolved by ruling 15: no filter state crosses a route
   boundary, and Browser Back restores the URL's filters. Nothing is remembered per session.
4. **Measured against derived figures:** see the arithmetic. The derived first tile is about 324,
   not 320. The head PR's probe measures it.
5. **The pending tile.** Answered from #1163. `COLLECTION_DRAW_KEYS` is `imageUri`, `facts`,
   `comboPartner` and `comboOtherPartners` (`list-wire.ts:51` on `collection-first-window`), so
   availability ships with every row and the chip is never late. The facts are never late on a
   drawn tile either; see E5.
6. **The phone loses the h1 and the stats line.** Accepted as drawn. The h1 stays in the document
   as `sr-only`. The README and the gap report disagree about Replace; see E12.
7. **The tab labels are new copy:** see Copy.

## Engineering-resolvable

- **E1. Portal both sheets, not one.** The compact Sort trigger is a `FilterPanel`, and its sheet
  is also an inline `fixed z-50` (`filter-panel.tsx:1037, 1047`) mounted inside the head. Pinned, it
  is trapped under the phone tab bar (`z-40`) exactly as the filter sheet is. Decision: both portal
  to `body`. `FilterPanel` is shared, so the portal is opt-in, and `probe:scroll-lock` runs against
  every surface that mounts it.
- **E2. `:focus-within` would lose keyboard focus.** The well is hidden under row 1's
  `:focus-within`, and the well is inside row 1. Two failures follow:
  - Tab forward from the field skips the well.
  - Shift+Tab from `Filters` focuses the well, which makes row 1 `:focus-within`, which hides the
    focused well, which drops focus.

  Decision: hide the well under `:has(input:focus)` on the row. Focusing the well then never hides
  it, and it stays reachable with Shift+Tab from `Filters`.
- **E3. The field's type is 16px, not 15.** Below 16px, iOS Safari zooms the page on focus (#101;
  the rack's search draws `text-[16px]` for that reason, `search-control.tsx:65`). A zoom under a
  pinned head is the motion the brief rules out. Today's 14px (`filter-bar.tsx:354`) has the same
  defect, and the head PR fixes both.
- **E4. The clear ✕ is new on this field.** `/collection`'s `SearchField` has no clear control
  today. Decision: reuse the rack's clear button and its copy key (`search-control.tsx:68-82`), with
  the 44px overlay.
- **E5. T4 maps onto the art's own wait.** #1163 never draws a tile without its drawn fields. The
  list keeps the rows it drew under `aria-busy` until a batch lands ("No drawn waiting state",
  `grid-view.tsx` on `collection-first-window`). What a reader can see is `HydratedImg` withholding
  `src` for a tile past the first 12 until hydration and the viewport. During that wait the art box
  shows the shell's `--surface`.

  Decision: T4's plate (`--surface-sunken` under the inner edge, no gradient, no shimmer) becomes
  the art box's background whenever `imageUri` is present. The clause "facts land later without
  reflow" is dropped, because it never happens.
- **E6. The lit segment on a cookieless first visit.** On d8's branch the server draws both views
  but passes `effectiveView = resolvedView ?? "grid"` to the toggle (`browser.tsx:315, 635` on
  `fix/collection-view-ssr`). A phone's first paint therefore shows rows under a lit Grid segment.
  The canvas asks for the segment to follow the CSS width rule until hydration. Decision: when
  `resolvedView` is null, the toggle takes a CSS-chosen lit segment (`md:` split), in the head PR.
- **E7. The key is built on fa's H7, not on a new `MarkKey` grid.** #1167 adds an opt-in
  `phoneColumns={2}` (two equal columns below `md`, wrapping from `md`) and `py-[10px]` around the
  collection key. That draws the same 2 × 4 the contract asks for. The contract's version rewrites
  the shared `MarkKey` for every surface.

  The glyph-only chip and the key's three availability entries are both **below `md` only**. The
  desktop tile keeps the chip's word, and §6's own rule is that a key does not gloss a mark that
  prints its word. Rows get no availability entries, as drawn.
- **E8. Scroll on change.** The canvas (frame 5) and STATES H5 return to the head's rest offset,
  with the shelf, the key and result 1 in view. READINESS says result 1 lands "directly under the
  head". Decision: the rest offset, as drawn. The scroll is instant, never smooth, and runs only
  when `scrollY` is past the offset.
- **E9. Focus under the pinned head.** Below 1000px, `scroll-padding-top` equals the pinned height
  (102 or 60), so a tile reached by keyboard is never hidden under the head.
- **E10. The strip is a nav of links, not ARIA tabs.** Each tab navigates, so it uses
  `<nav aria-label>` + `aria-current="page"`, with no `role="tab"` and no arrow-key roving. Each
  link carries `PendingReporter`, as the pills do now. One case is not drawn: a reader with an empty
  collection who lands on `/collection/sets`. Decision: the strip keeps the current route's tab, so
  no page is absent from its own strip.
- **E11. The Proxies page keeps its h1.** §4 says its title "becomes an h2 under the strip". The
  strip is a nav landmark, not a heading, so the page would be left with no h1. Decision: visually
  as drawn, but kept an h1.
- **E12. Replace on the phone stays `↻ Replace`.** That matches the canvas and README Call 4. Gap 6
  says icon-only, which would need a new label. The canvas wins.
- **E13. The count keeps its live region.** Row 3's `ResultLine` is the chassis's only live region
  (`filter-chassis.tsx:332`). It moves into row 2 as that component. Hiding the noun below 375px
  needs `resultCompact` split into a count and a noun; that change goes through /copy-review.
- **E14. `GRID_EAGER_TILES`.** It stays 12, which covers the 3-up first screen (about 6 to 9 tiles).
  Its comment's "two columns, about 4 tiles" is updated.
- **E15. `+N`.** It is `aria-hidden` and has no tooltip. The tile's spoken clause already names
  every fact.
- **E16. About.** The collection entry's second key line reads "By set takes you to your sets…"
  (`about.ts:144`), and `browse-figure.tsx` draws the `By set` pill with a numeral anchored near it.
  Both go stale when the pill does. This is an ordinary edit with a deliberate re-pin of the
  `about.test.ts` hash, not a bump. `probe:about-numerals` re-checks the anchor.

## Collisions with work in flight

- **#1163 (2b).** Both touch `grid-view.tsx`: the grid class on line 54, `HydratedImg`, `busy`, and
  the eager count. The grid PR lands after it. T4 is remapped (E5). Gap 5 is answered.
- **d8, `fix/collection-view-ssr`.** Both touch `browser.tsx` and the view toggle. The head is CSS
  over a compact form the server already renders: `useMinWidth`'s server snapshot is `false`, so a
  phone's first paint is compact. This holds. The lit segment is E6.
- **d8, H10 (`fix/collection-colour-match`).** At `d8c247e95` the branch carries `m=exact` (URL and
  matching) and does not yet touch `filter-bar.tsx`. The `ColourControl` swap was assessed from its
  description.
  - On the phone, colour lives in the sheet, which this handoff does not change, so the two do not
    collide.
  - The canvas draws desktop colour as five bare 28px pips (§5), and its shelf chip reads "2
    colours". Both illustrate the shipped surface as it was. The build keeps whatever H10 ships,
    and the chip's shipped label ("2 colors", `collection.ts:150`).
  - The shelf scrolls, so a longer chip under `m=exact` fits.
  - H10's wider colour control is H10's to measure against the 987px wide row; this handoff leaves
    the wide row alone.
- **fa, H19 and H20 (merged, #1159).** The strip supersedes H19's breadcrumb links on both routes.
  H20 (the whole row opens) is untouched. #1159's breadcrumb assertions in
  `proxy-list-view.test.tsx` change with the tabs PR.
- **fa, H7 and H8 (#1167, open).** H7 is compatible and is the base for E7. H8 (the Type chips in a
  fixed two-column grid) is inside the sheet, which this handoff leaves alone. The portal (E1) moves
  where the sheet mounts and does not change its contents.

## Copy

These go to /copy-review, never to Design.

- The four new strings: `Cards`, `Sets`, `Proxies` (reused) and `Collection sections`. All are US
  English and none has an em-dash. Worth asking whether "Cards" is the right name for the tab that
  is `/collection`, and whether "Sets" should keep the pill's "By set".
- The count's noun split (E13).
- The About collection entry's second key line (E16).
- No new string for Replace (E12) or the clear button (E4).

## Notes

- Rows at 360, and Sets and Proxies at 360, are not drawn. The head and the strip are the same
  markup, so nothing is missing there.
- The phone loses the copies total ("4,492 cards") as drawn. Desktop keeps it.
- Probes the build moves:
  - `probe:grid-art` holds the 390 grid under half its window, and 3-up asks for more tiles' art.
  - `probe:nav-pending` presses the pills.
  - `probe:about-numerals` reads the browse figure.
  - `docs/superpowers/inventories/proxies.json` names the breadcrumb.
- READINESS's "What a green looks like" is the head PR's probe, with E1's Sort sheet and E2's
  Shift+Tab added. Run it in WebKit as well as Chromium, because a sticky head over the iOS
  keyboard plus a programmatic scroll is where WebKit differs.

## About entry

My read is that none is owed. The brief calls this a rework of existing surfaces. Nothing here lets
a reader do something they could not do before, and Proxies was already reachable. That makes it
cosmetic under the rule, and the existing collection entry takes an ordinary edit (E16), with no
version bump. This is Hugh's call.

## How the build splits

This follows #1163, d8's view and colour PRs, and #1167, in that order. All of them touch
`browser.tsx`, `grid-view.tsx` or `mark-key.tsx`. None of the PRs below stacks on another.

1. **The sheet portal (E1).** Ready now. `filter-sheet.tsx`, `filter-panel.tsx` (opt-in) and
   tests. It is mechanical, it unblocks the 768–999 pin, and `probe:scroll-lock` runs over every
   surface.
2. **The 3-up grid.** Ready after #1163 and #1167. It covers:
   - `grid-view.tsx`: `grid-cols-3 gap-[8px]` below `md`, caption `pl/pr` 7, `+N`, and the pending
     plate (E5);
   - the glyph-only `AvailabilityMarker` below `md`;
   - `CollectionMarkKey({ withAvailability })` (E7);
   - tests and the contact sheet.
3. **The tabs.** Blocked on B1 (phone and desktop ship together). It covers:
   - `CollectionTabs` mounted on three pages, including the empty branch;
   - removing the two pills, the two breadcrumbs and the `GhostButton`;
   - the phone h1 as `sr-only`, and Replace in the strip;
   - E10 to E12, and E16's About edit.
4. **The pinned head.** Blocked on B2, and lands after d8. It covers:
   - the sticky compact head and the chassis option (P2);
   - row 2 with the count (E13);
   - `:has(input:focus)` (E2), 16px type (E3) and the clear ✕ (E4);
   - the scroll reset (E8), `scroll-padding` (E9) and the lit segment (E6);
   - the new head probe.

   If it passes 800 lines with the probe, the 600–999 one-row form splits off.

## Prompt for Design

**Context.** Collection surfaces R1 is audited
(`design/design_handoff_the99_collection_surfaces/READINESS-audit.md` on branch
`design/collection-surfaces` (PR #1169)). The 3-up grid and the sheet portal are buildable as
drawn. Two layout states are not drawn, one for the tabs and one for the head. Everything else in
R1 stands.

**What to change.**

- **The tabs at desktop.** §4 draws `/collection/sets` and `/collection/proxies` at 390 only. On
  desktop, `/collection` (`src/app/collection/page.tsx`) is full width with a title block of about
  90px above the strip. Sets (`src/app/collection/sets/page.tsx`) and Proxies
  (`src/components/decks/proxy-list-view.tsx`) are centred 900px columns whose h1 is the section
  name. Mounted as described, the strip jumps across and down whenever a reader presses one of its
  own tabs.
- **Row 2 at a long sort.** §2 budgets row 2 with `Sort: Name · A–Z`. The trigger reads
  `Sort: {order}` (`src/lib/collection/sort-options.ts`), and `Sort: Color · Colorless first` is
  about 210px. With a filter on, row 2 then needs about 403px against 358 at 390, and about 350
  against 328 at 360. The 768 frame in §5 draws a bare `Sort ▾`. With the shipped trigger, the
  one-row form leaves search about 129px at 600 and about 63px at 600 with the longest sort.

**Constraints.** The strip stays place navigation of plain links. The head stays fixed-height CSS,
with no measurement, and row 2 never wraps. Marks and type sizes are unchanged. No new copy.

**Questions.**

1. At desktop, where does the strip sit on all three routes so that it does not move between its
   own tabs, and what heading sits above it on Sets and Proxies?
2. At 390 and 360 with a filter on and the longest sort, what gives in row 2: the sort label
   truncates, the `Sort:` prefix drops, the count drops its noun, or something else?
3. Where does the one-row head start, with the shipped trigger?

**Deliverables.**

- Desktop frames at 1300 of `/collection`, `/collection/sets` and `/collection/proxies`, with the
  strip in the same place on all three.
- Row 2 at 390 and 360 with the longest sort and a filter on.
- The 768 frame redrawn with the shipped trigger, and the one-row breakpoint stated.

**Out of scope.** The 3-up tile, the key, the shelf and the scroll reset. The engineering decisions
in the audit. Hugh's two open questions (the rows default, and the chip row's rule).
