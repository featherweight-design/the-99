# Gap report · Discovery R2·5 · About's tabs, ToolCard (option C), Tools tab, Written for you

Property table: `docs/superpowers/design-tables/discovery-r2-5-tools.md` (157 rows + State Coverage).
Implementation: `src/components/about/tools/{about-tabs,tools-tab,tool-card}.tsx`, `src/lib/discovery/{showcase,tools}.ts`, `src/lib/copy/discovery.ts`, `fits.ts` at `HEAD~1`.

Rules applied: copy wording out of scope (only the key/element); no fixed card height (gap 13); option C governs (gap 14); Mobile judged on unprefixed classes, Desktop on `md:`/`xl:` (two columns md to xl, three at xl, an engineering choice). Where the table and the boards disagreed or were silent, the `.dc.html` boards in `design/design_handoff_the99_discovery_onboarding/r2/` were consulted (cited per row).

## Pass 1 · Visual properties

### 1. Page head

| # | Result |
|---|---|
| 1 | ⚪ N/A: `main` and its padding belong to the page shell, which R2·6b mounts. Not in these files. |
| 2 | ⚪ N/A: same. |
| 3 | ✅ `px-[16px] md:px-0` (about-tabs.tsx:44) |
| 4 | ✅ equivalent: a block holding one child renders the same as the drawn single-child flex, end-aligned. |
| 5 | ✅ `aboutShapeCopy.title` |
| 6 | ❌ MISMATCH (mobile): design 27/600, no letter-spacing (ShowcasePhone `<h1>` carries none) / implementation `tracking-[0.01em]` unprefixed, so .01em applies at 390 too (about-tabs.tsx:45). Desktop 34/600 .01em ✅. |
| 7 | ✅ |
| 8 | ✅ `m-0` |
| 9 | ✅ `toolsSub` (the Reference tab swaps in `referenceSub`) |
| 10 | ❌ MISMATCH (desktop): design body 15, normal line-height / implementation `leading-[1.5]` unprefixed, kept at md+ (about-tabs.tsx:48). Mobile 14.5/1.5 ✅. |
| 11 | ✅ |
| 12 | ✅ `mt-[6px] md:mt-[8px]` |

### 2. Tabs row

| # | Result |
|---|---|
| 13 | ✅ `mt-[10px] md:mt-[26px]` (about-tabs.tsx:52) |
| 14 | ✅ flex, items-center, justify-between; mobile `px-[16px]`, md `px-0` |
| 15 | ✅ `border-b border-b-[color:var(--border)]` |
| 16 | ✅ `role="tablist"`, `aria-label` = `tabs.label` ("About") |
| 17 | ✅ `gap-[26px] md:gap-[28px]` |
| 18 | ✅ `button type="button" role="tab"`, `bg-transparent`; cursor pointer comes from globals.css:709 |
| 19 | ✅ `px-[2px] pb-[12px] pt-[10px] md:pt-0` |
| 20 | ✅ `text-[16px]` |
| 21 | ✅ `font-semibold text-[color:var(--fg)]` |
| 22 | ✅ `-mb-px border-b-2 border-b-[color:var(--accent)]` |
| 23 | ✅ `aria-selected={on}` |
| 24 | ✅ `font-medium text-[color:var(--fg-muted)]` (hover to `--fg` is an addition) |
| 25 | ✅ `border-b-transparent` |
| 26 | ✅ |
| 27 | ✅ `ABOUT_TABS = ["tools","reference"]`; `aboutTabOf` defaults to tools |
| 28 | ✅ `counts[t]` |
| 29 | ✅ `font-mono text-[12px] font-medium`, after `{" "}` |
| 30 | ✅ accent when selected |
| 31 | ✅ fg-faint when unselected |
| 32 | ✅ `hidden … md:inline`, and only with `helpHint` |
| 33 | ✅ `pb-[12px] font-mono text-[12px] text-[color:var(--fg-faint)]` |
| 34 | ✅ `helpHint.before` / `.after` around the glyph |
| 35 | ✅ `inline-flex h-[20px] w-[20px] … rounded-[6px] border border-[color:var(--border-strong)] text-[color:var(--fg-muted)]`, `aria-hidden` |
| 36 | ✅ `select()` deletes `tab` for Tools, sets `reference`, through `mirrorUrl` |

### 3. Group

| # | Result |
|---|---|
| 37 | ✅ `section aria-label={label}` (tools-tab.tsx:19) |
| 38 | ✅ `mt-[30px] md:mt-[40px]` |
| 39 | ✅ `GROUP_ORDER` start, tune, buy, own, play; cards in registry order |
| 40 | ✅ mobile flex baseline between gap 10 px 16; md `justify-start gap-[12px] px-0` |
| 41 | ✅ `mb-[12px] md:mb-[16px]` |
| 42 | ✅ `showcaseCopy.groups[g].label` |
| 43 | ✅ `font-display text-[19px] font-semibold md:text-[21px]` |
| 44 | ✅ `m-0 text-[color:var(--fg)]` |
| 45 | ✅ sub `hidden md:inline`; `swipe(n)` `md:hidden` |
| 46 | ✅ mono 12 fg-faint; right via justify-between at 390, inline at md |
| 47 | ✅ `swipe(group.cards.length)`, cards already filtered by switch |
| 48 | ✅ `.filter((g) => g.cards.length > 0)` (showcase.ts:94) |
| 49 | ✅ mobile `flex gap-[12px] px-[16px] overflow-x-auto` (snap added); md `grid grid-cols-2 gap-[22px]`, `xl:grid-cols-3` |
| 50 | ✅ `li` `w-[300px] flex-none`, `md:w-auto` |
| 51 | ✅ no height; `li` stretches (flex and grid default), article `h-full` |
| 52 | ✅ no wrap on mobile; grid wraps at md+ |

### 4a. ToolCard frame, picture, halo

| # | Result |
|---|---|
| 53 | ❌ MISMATCH: design `article aria-label=<tool name>` (ToolCard.dc.html `<article aria-label="{{ name }}">`) / implementation `<article>` with no `aria-label` (tool-card.tsx:63-66) |
| 54 | ✅ from container |
| 55 | ✅ no fixed height |
| 56 | ✅ `relative flex flex-col` (border-box is Tailwind's default) |
| 57 | ✅ `bg-[color:var(--surface)]` |
| 58 | ✅ `rounded-[14px] border border-[color:var(--border)]` (`focus-within:border-strong` is an addition) |
| 59 | ✅ `overflow-hidden` |
| 60 | ✅ every child sets its own color; base font inherited |
| 61 | ✅ `relative aspect-[3/2] overflow-hidden` |
| 62 | ✅ `bg-[color:var(--bg)]` |
| 63 | ✅ `border-b border-b-[color:var(--border)]` |
| 64 | ✅ `absolute inset-0 block h-full w-full object-cover` |
| 65 | ✅ `shotFor(theme, toolShotId(card.id))` |
| 66 | ❌ MISMATCH: design alt = picture-alt copy element `<tool name>, on a real screen of the app` (ToolCard.dc.html:147) / implementation `alt=""` (tool-card.tsx:28); no picture-alt key in `src/lib/copy/discovery.ts` |
| 67 | ✅ `span aria-hidden … pointer-events-none absolute` |
| 68 | ✅ `left/top/width/height` from `shot.halo` as % |
| 69 | ✅ `rounded-[9px]` |
| 70 | ✅ `0 0 0 2px` accent 75%, `0 0 0 6px` accent 20% |
| 71 | ✅ `0 0 0 2000px` bg 28% |
| 72 | ✅ no chip |

### 4b. Body, head, line

| # | Result |
|---|---|
| 73 | ✅ `px-[14px] pb-[12px] pt-[14px] md:px-[18px] md:pb-[14px] md:pt-[16px]` |
| 74 | ✅ `flex flex-1 flex-col gap-[8px]` |
| 75 | ✅ `flex items-baseline justify-between gap-[10px]` |
| 76 | ✅ `copy.name` |
| 77 | ✅ `text-[16px] font-semibold leading-[1.3]` |
| 78 | ✅ `m-0 text-[color:var(--fg)]` |
| 79 | ✅ `card.credit &&` (registry null where no chip) |
| 80 | ✅ `card.credit` (the hub tile's cost, verbatim) |
| 81 | ✅ `font-mono text-[11px] text-[color:var(--fg-muted)]` |
| 82 | ✅ `rounded-full border border-[color:var(--border-strong)] px-[9px] py-[2px]` |
| 83 | ✅ `flex-none whitespace-nowrap` |
| 84 | ✅ `copy.line` |
| 85 | ✅ `text-[14px] leading-[1.5]` |
| 86 | ✅ `m-0 text-[color:var(--fg-body)]` |

### 4c. Footer, deck fits and needs-no-deck

| # | Result |
|---|---|
| 87 | ✅ `mt-auto` |
| 88 | ✅ `border-t border-t-[color:var(--border)] pt-[8px]` |
| 89 | ✅ `flex flex-col gap-[6px]` |
| 90 | ✅ `Link absolute inset-0 z-[1] rounded-[14px]`, no content |
| 91 | ✅ `tryOn(deck)` for deck, `state.label` (`copy.press`) for page |
| 92 | ✅ first of `fits[id].decks` (loader orders most recently touched first, R2 gap 1); `tryHref` writes `?tool=` |
| 93 | ✅ `flex min-h-[40px] items-center gap-[10px]` |
| 94 | ✅ `showcaseCopy.howItWorks` |
| 95 | ✅ first child, `relative z-[2]`, own `Link` |
| 96 | ✅ `font-mono text-[12px] text-[color:var(--fg-faint)]`, no underline |
| 97 | ✅ `flex-none whitespace-nowrap py-[10px]` |
| 98 | ✅ href `/about?tab=reference#<entry>` (but see state gap S1: the tab does not switch on arrival) |
| 99 | ✅ `opens(deck, more)` or the page label |
| 100 | ✅ `text-[13.5px] text-[color:var(--fg-muted)]` |
| 101 | ✅ `ml-auto min-w-0` |
| 102 | ✅ `overflow-hidden text-ellipsis whitespace-nowrap` |
| 103 | ✅ `h-[30px] w-[30px] flex-none … rounded-full border border-[color:var(--accent)]` |
| 104 | ✅ `→` `text-[15px] text-[color:var(--accent)]` |
| 105 | ✅ `aria-hidden` |
| 106 | ✅ none |
| 107 | ✅ `focus-visible:outline … rounded-[14px]` on the link |

### 4d. Footer, no deck fits

| # | Result |
|---|---|
| 108 | ✅ `press` false for `none` |
| 109 | ✅ same footer |
| 110 | ✅ `state.line` (`copy.none`, or `needsADeck` with no decks) |
| 111 | ✅ `font-mono text-[12px] leading-[1.5] text-[color:var(--fg-muted)]` |
| 112 | ✅ `pt-[4px]`, no box |
| 113 | ✅ |
| 114 | ✅ |
| 115 | ✅ `copy.door` only on Friends' spares; Top off none |
| 116 | ✅ `copy.door` |
| 117 | ✅ `text-[14px] font-semibold text-[color:var(--accent)]` |
| 118 | ✅ `ml-auto py-[10px]` (`relative z-[2]` harmless) |
| 119 | ✅ `footerLabel` null for none |

### 5. Written for you

| # | Result |
|---|---|
| 120 | ✅ `section aria-label={writtenForYouCopy.title}`, after the groups |
| 121 | ✅ `mx-[16px] mt-[30px] md:mx-0 md:mt-[40px]` |
| 122 | ✅ |
| 123 | ✅ `GROUP_HEAD` |
| 124 | ✅ `writtenForYouCopy.sub`, right at 390 (justify-between), inline at md |
| 125 | ✅ `rounded-[14px] border border-[color:var(--accent-dim)]` |
| 126 | ✅ |
| 127 | ✅ `px-[16px] pb-[4px] pt-[16px] md:px-[24px] md:pb-[8px] md:pt-[20px]` |
| 128 | ✅ `flex flex-col` |
| 129 | ✅ `intro(allowance)` |
| 130 | ✅ `text-[14px] leading-[1.55] md:text-[14.5px]` |
| 131 | ✅ `mb-[12px] md:mb-[14px]` |
| 132 | ✅ five rows in order, each filtered by its caption line surviving |
| 133 | ✅ `border-t border-t-[color:var(--border)]` |
| 134 | ❌ MISMATCH (desktop): design grid `300px minmax(0,1fr) 170px`, items-center, gap 18, `min-height:52px`, **no padding** (ShowcaseDesk.dc.html) / implementation adds `md:py-[8px]` (tools-tab.tsx:57), making each row about 57px instead of 52. Mobile stacked layout via grid areas `name chip / what what / where where`, gap 10/4, `py-[12px]` ✅ equivalent. |
| 135 | ✅ `text-[14.5px] font-semibold md:text-[15px]` |
| 136 | ✅ `r.where` |
| 137 | ✅ `font-mono text-[11px] text-[color:var(--fg-faint)]` |
| 138 | ✅ mobile last row; desktop under the name in column 1, `gap-y-[2px]` stands in for `margin-top:2px` |
| 139 | ✅ `r.what` |
| 140 | ✅ `text-[13.5px] leading-[1.5] md:text-[14px]` |
| 141 | ✅ `r.short` `md:hidden`; `r.cost` `sr-only md:not-sr-only` |
| 142 | ✅ |
| 143 | ✅ border accent-dim pill `px-[9px] py-[2px]` nowrap, `justify-self-end` |
| 144 | ✅ `border-t pt-[12px] flex flex-wrap items-center justify-between gap-x-[20px] gap-y-[8px]` |
| 145 | ✅ `free`, `text-[13.5px] text-[color:var(--fg-muted)]` |
| 146 | ✅ `writtenForYouCopy.how`, `py-[10px] font-mono text-[12.5px] text-[color:var(--accent)]` |
| 147 | ✅ `entryHref("credits")` (see state gap S1) |
| 148 | ✅ not drawn |

### 6. To the Reference

| # | Result |
|---|---|
| 149 | ❌ MISMATCH (mobile): design `margin:34px 16px 0` (ShowcasePhone.dc.html) / implementation `mt-[40px]` unprefixed (tools-tab.tsx:100). Desktop `md:mt-[48px] md:pt-[22px]` ✅; mobile `pt-[18px]` ✅. |
| 150 | ✅ |
| 151 | ❌ MISMATCH (mobile): design `flex-direction:column; gap:4px` / implementation `flex flex-wrap items-center justify-between gap-y-[4px]` at every width (tools-tab.tsx:100). At 390 the current sentence is too long to share a line, so it wraps into a column, but that depends on the copy's length rather than on the layout. A shorter sentence would put the link beside it, center-aligned. Desktop ✅. |
| 152 | ✅ `aboutShapeCopy.toReference`, 14, fg-muted (line-height inherits 1.5) |
| 153 | ✅ `toReferencePress` |
| 154 | ✅ `py-[10px] text-[14.5px] font-semibold text-[color:var(--accent)]` |
| 155 | ✅ under the sentence (wrap) at 390, right at md |
| 156 | ❌ MISMATCH: design: switches to the Reference tab / implementation: a `next/link` to `/about?tab=reference` (tools-tab.tsx:102-107). That is a navigation, not `select("reference")`, and `AboutTabs` keeps `useState(initial)` (about-tabs.tsx:33), so a same-route soft navigation does not move the tab. See S1. |

### 7. Chrome

| # | Result |
|---|---|
| 157 | ⚪ N/A: page shell, R2·6b |

## Pass 2 · State coverage (judged through `showcaseGroups`' inputs)

| State | Result |
|---|---|
| One deck fits | ✅ REACHABLE: `deckCount > 0`, `fits[id].decks` length 1 gives `{kind:"deck", more:0}`: label `Opens <deck>`, `tryOn` name, ring. |
| Several fit | ✅ REACHABLE: length ≥ 2 gives `more = n−1`: `Opens <deck> · +N`, ellipsis. |
| None fits, no door | ✅ REACHABLE: Top off (also Proposed cuts, Suggested changes, Mana Balance, Cheaper stand-ins, Matchups) with decks and empty fits gives `none` with `door: null`: no link, mono line, How it works. |
| None fits, a door | ✅ REACHABLE: Friends' spares with decks and empty fits gives `door {href:"/friends", label: copy.door}`. With `deckCount 0` the door is dropped (`needsADeck`, door null), a consistent reading. |
| Needs no deck | ⚠️ PARTIALLY: Help me choose, Precons, Wishlist, Sync and Friends always reach `page`. Find a deck and Stats for your decks (Lineup) are `needsDeck: true` in the registry (tools.ts:53,58), so a reader with **zero decks** gets the `none` state (`needsADeck`, not a press) where the table lists them as needs-no-deck. This is deliberate in the registry and copy (`NEEDS_A_DECK`), but it is a state the table does not draw. Sync with no base adds the G14 `note` line, which the table also does not draw. |
| Switch off | ✅ REACHABLE: filtered by `t.switch === null \|\| isOn(t.switch)` (showcase.ts:82), so it is absent by omission; an empty group is dropped; the swipe count is `cards.length`. The extra `visibleEntryIds` gate (R2 gap 8) also omits. |
| Moment dismissed | ✅ REACHABLE: nothing in showcase.ts, tools-tab.tsx or tool-card.tsx reads moments, so the card renders as its fit state. |
| Written for you per spender | ✅ REACHABLE: `writtenForYou` keeps a row only while its caption line survives; returns null when none survive. |
| Help hint desktop only | ✅ `hidden md:inline` and the `helpHint` prop |
| Group trailing text | ✅ sub at md+, swipe at 390 |

**State gap S1 (behavioral, every link into the Reference):** `How it works ›` (tool-card.tsx:83), `How credits work ›` (tools-tab.tsx:71) and `Open the Reference →` (tools-tab.tsx:102) are all `next/link` hrefs to `/about?tab=reference[#entry]`, on the same route as the Tools tab. `AboutTabs` takes `initial` only as `useState`'s initial value (about-tabs.tsx:33), with no `key` and no prop sync. A soft navigation re-renders the server page with `initial="reference"`, but the client state stays `tools`, so the Reference panel stays `hidden` and the `#entry` anchor targets a hidden element. Rows 98, 147 and 156 are not reachable as designed once mounted, unless R2·6b keys `AboutTabs` on the tab or these become in-place tab switches. They also navigate, where row 36 and readiness gap 12 have the tab change mirror the address without navigating.

## Gap list

Visual:
1. tool-card.tsx:63-66 (row 53): the `article` has no `aria-label` / design `aria-label=<tool name>`.
2. tool-card.tsx:28 (row 66): picture `alt=""` / design alt `<tool name>, on a real screen of the app`; no copy key exists.
3. about-tabs.tsx:45 (row 6): `tracking-[0.01em]` at 390 / design has no letter-spacing on mobile (desktop only).
4. about-tabs.tsx:48 (row 10): `leading-[1.5]` kept at md+ / design desktop normal line-height.
5. tools-tab.tsx:57 (row 134): `md:py-[8px]` on spender rows / design desktop has no padding (min-height 52).
6. tools-tab.tsx:100 (row 149): mobile `mt-[40px]` / design 34px.
7. tools-tab.tsx:100 (row 151): mobile `flex-wrap items-center justify-between` / design flex column gap 4. The column holds only because of the copy's length.

State:
1. about-tabs.tsx:33 together with tool-card.tsx:83, tools-tab.tsx:71 and tools-tab.tsx:102 (rows 98/147/156, S1): links into the Reference navigate on the same route, and `useState(initial)` ignores the new `initial`, so the tab never switches and `#entry` lands in a hidden panel. Design: switches to the Reference tab, mirrored without navigation.
2. tools.ts:53,58 / showcase.ts:61 (Needs no deck): Find a deck and Lineup fall to `none` for a reader with zero decks / table lists them as always needs-no-deck. Deliberate in the registry and copy; a state the table does not draw.

VERDICT: 🟡 7 visual gaps (2 accessibility: article name, picture alt) and 2 state gaps (1 behavioral defect: Reference links don't switch the tab). Everything else matches, including all five card states, switch-off by omission, and moments read by nothing.

## Confirm

Re-checked against the current `src/components/about/tools/*.tsx` and `src/lib/copy/discovery.ts`, for the listed gaps only.

Visual:
1. FIXED: the article carries `aria-label={copy.name}` (tool-card.tsx:64).
2. FIXED: `alt={showcaseCopy.pictureAlt(name)}` (tool-card.tsx:28), with `Picture` given `name={copy.name}` (:69). The key is at discovery.ts:84.
3. FIXED: tracking is now `md:tracking-[0.01em]` only (about-tabs.tsx:53).
4. FIXED: `md:leading-normal` (about-tabs.tsx:56).
5. FIXED: spender rows use `md:py-0` (tools-tab.tsx:57).
6. FIXED: mobile `mt-[34px]` (tools-tab.tsx:100).
7. FIXED: mobile `flex flex-col items-start gap-[4px]`, and from `md` `flex-row items-center justify-between gap-[20px]` (tools-tab.tsx:100).

State:
1. FIXED: `AboutTabs` follows a changed `initial` during render (`asked` state, about-tabs.tsx:33-41). A same-route soft navigation to `?tab=reference[#entry]` therefore switches the tab before the anchor scroll. The links still navigate instead of calling `select()`, which is the coordinator's accepted answer.
2. ACCEPTED: on Find a deck and Lineup, a reader with zero decks gets the `none` state. This is an accepted divergence, following the registry's `needsDeck` and the rule the lanes agreed.

VERDICT: ✅ PASS. 7 of 7 visual gaps FIXED, state 1 FIXED, state 2 ACCEPTED.
