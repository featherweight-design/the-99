# READINESS · Finding the tools

**Verdict: Yellow** (engineering readiness audit of R12, 2026-11-24, amending Design's Green). Approved by Hugh 2026-11-24 through R13 (R13: the search panel's fan, G30, desktop only); every question settled (README, Decisions) and nothing returns to Design. Four eng-side clarifications (R12-C1 to C4) and one sequencing dependency on #3266 (R12-C5) are settled below from the nearest drawn pattern. Earlier rounds' gaps G1 to G25 stand as written; their Errata table (dropped by the R12 commit) is restored at the end.

## Gaps for engineering
- **G1 · One filter (R2).** No new control: `Show them` writes `filters.availability = ["free"]` as the menu does, so URL
  (`avail=free`), chip, menu and call-out agree.
- **G2 · The count.** The call-out's N is the `availabilityOptions` free count, already read for the menu. Hidden while it
  is unknown (`availabilityOk` false).
- **G3 · The button opens the view.** `CardDetailProvider` gains an open-with-view entry (`openCard(id, { view: "fits" })`)
  so the window mounts on `FitsView` with `onBack` to the card; focus returns to the button on close.
- **G4 · Row view (R4).** `RowsView` wraps each row with its control as the row button's sibling, never nested: a flex
  column below md (the row's bottom corners squared, the strip under it), a flex row from md (the button beside it). The
  control's name is `Find a deck for <card>` at every width. Every cell of `CollectionRowCells` draws as shipped.
- **G5 · Consider's desktop toolbar.** Today it rides the deck tabs' row; inside Tuning it rides the hub's underline row
  at its right end (not drawn). Phone: the panel's own toolbar row, as drawn.
- **G6 · Retargets.** `builder-view.ts` gains `tuning`, loses `consider`; `?view=consider` and stored last-views map to
  Tuning with Consider open. `tools.ts`: the three tune tools land `{ kind: "deck", tab: "tuning" }`; `TILE_TARGETS`
  unchanged. Moments anchored on the Analysis tab for a tool (M3, M4) move to the Tuning tab; M2 (the reading) stays.
- **G7 · About.** The `decks/analysis/{suggested,mana,cuts}` labels move under a Tuning section; an About entry only at
  Hugh's discretion.
- **G8 · Startup cost.** The hub stays in the startup chunk as today (#1639's on-demand split was measured and reverted;
  a tab changes no chunking).
- **G9 · Welcome sheet.** `ROW_TOOL` gains `overview` (deck Analysis) and `find-a-deck-read` (`/collection?avail=free`);
  `welcomeSheet` returns a `free` list drawn under the rows by shape. The tour's Credits stop lists the spenders only.

- **G10 · Ask matching.** `TOOLS` entries gain `ask: string[]` phrases; a pure `matchTools(query, flags)` returns up to three
  ids, best first (phrase hits, then word hits), unit tested against the starters and a miss list. Runs client side in
  the search's own chunk beside the card read; no new request. Withdrawn R2 G10/G11 (What you can do).
- **G11 · Ask numbers and misses.** An answer's own number comes from data the page already has (the Free count the
  collection reads, a deck's open slots); one that is not loaded is left out, never fetched for the row. A miss is one
  PostHog count with no query text (`ph-no-capture` stays on the field).
- **G13 · Ranking in one field (R4).** The search merges two lists: card hits whose name equals or starts with the
  query rank first; then tool answers; then the rest of the card hits. One listbox, two `role="group"` children with
  labels. Tool phrases never match a single word other than a tool's own name.
- **G14 · Home's panel (R5, R6).** Lives in `Dashboard` after the Rule 0 cards (`data-home-tables`) and before `props.signature` and `props.welcome`, in the main column at every width (Q10 A). One search state:
  the panel's field and the rail's search share the search provider's query and results; the panel renders the same
  listbox component in its own anchored popover from md (Q9 A), and on a phone calls `openSearch` (`?q=` for a starter).
  Only one is open at a time: opening the rail's search closes the panel's list. The fan reads the three most recent adds
  the Recent cards list already loads; no new query.
- **G15 · Credits in the panel (R7, Q11 A).** `WelcomeStrip` gains a `place: "panel"` that drops its edge and fill;
  the page hands it to the panel as `foot` rather than to `props.welcome`. Its ✕ and dismiss action are unchanged.
- **G16 · What's new under the lead (R7, Q11 A).** In `Dashboard`, `WhatsNew` renders right after `LeadSlot` and before
  the resume block; below 1180 its `order-3` becomes `order-1` with the decks at `order-2`. No data change.
- **G17 · What's new in the rail (R8, Q13 A).** From 1180 `WhatsNew` renders first in the right column; below 1180 it
  keeps its main-column order. `FeedItemRow` gains a `compact` layout (the phone grid at any width) used in the rail, and
  `feedCopy.choose` becomes `Choose notifications` everywhere, and stays in the heading.
- **G18 · Home section headings (R8, Q14 A).** One shared `HomeSectionHead` for What's new, resume decks, Friends and
  Commitments: display 17px, `--fg`, the accent diamond, counts mono `--accent-text`; ids and `aria-labelledby` unchanged.
  The resume caption is `hidden sm:inline`.
- **G19 · Game to log's ✕ (R9).** `HomeLogCard`'s single-game `Hide` is `absolute right-[4px] top-[4px]` at every width
  (`xl:right-[6px] xl:top-[6px] xl:h-[32px] xl:w-[32px]`), no longer `xl:static xl:order-last`; Log this game keeps its
  shipped classes and sits where Open the table does. The many-games card's row ✕ is unchanged.
- **G20 · Show all sheet (R10, Q15 A).** `ShowAllFooter`'s press on Home opens a `FeedSheet` dialog (`role="dialog"`,
  `aria-modal`, focus trapped, Esc closes, focus returns to the press) instead of `useShowAll`'s in-place expand; `/friends`'
  Waiting on you keeps the in-place expand. The sheet reads the feed the page already holds (no fetch). Rows are
  `FeedItemRow` with the compact layout (G17). Kind chips filter client side; Clear all sends the shown keys to
  `clearFeedItemsAction` (capped by `CLEAR_ALL_MAX` as today). Day groups: Today (24h), This week (7 days), Earlier.
- **G21 · Engagement metrics (Hugh, 2026-11-23).** The events in README § Engagement metrics ship in the same PRs as the
  surfaces they measure, through the existing `<Analytics />` client (production hostnames only; no query text, no typed
  card names, no third-party names). The `Finding the tools` PostHog dashboard and its six insights are built before
  launch, with a two-week baseline. A unit test per event asserts its properties carry no free text.
- **G22 · Asks lead (R11, Q16 A).** `leadStory` (`src/lib/feed/kinds.ts`) ranks a `spare-request` item that is unanswered
  and still answerable (an incoming ask or an offer made to the reader) above every other kind, newest first; the rest of
  the rank is unchanged. `withLeadAsk` (`src/lib/feed/home.ts`) already attaches its `LeadAsk`, offer or not.
- **G23 · The lead's ✕ (R11, Q17 A).** `LeadStory`'s `DismissButton` leaves `data-lead-actions` and sits absolute at
  `right-[6px] top-[6px] md:right-[10px] md:top-[10px]` on the section; the text column gains `pr-[26px] md:pr-[30px]`.
  Every lead kind, not only asks. Hidden on the receipt and while an answer is out, as shipped.
- **G24 · Answer in the row (R11, Q18 A).** `toViews` carries an `ask` (the `LeadAsk` shape) on every unanswered,
  answerable `spare-request` row, from the same `loadIncomingAsks` / `loadIncomingOffers` read the lead uses (one query,
  not one per row). `FeedItemRow` then draws the detail line (`spareCopy.request.offer.detail` or `incomingDetail`), the
  shipped `AnswerPresses size="row"` under the text, and its ✕ absolute at the row's top right (`right-[4px] top-[4px]
  md:right-[8px] md:top-[8px]`, text `pr-[30px]`). Answering runs the lead's own action and lands its receipt in the row.
  A row whose ask ran out keeps `Answer in Friends.` until the next read drops it. The rail's compact layout (G17) applies.
- **G25 · Friends badge and the offerer's sheet (R11).** No change: the badge (#3221) and `OfferAnswerSheet` (#3242) as
  shipped. The badge falls by one as a row or the lead is answered (the existing `announceAnswerSeen`).
- **G26 · Tool marks (R12, Q19 A).** `ask-results.tsx` `Mark`: tile `h-12 w-12 rounded-[12px] md:h-10 md:w-10
  md:rounded-[10px]`, glyph 28px (`md:` 24px). Row heights unchanged (72px, 58px).
- **G27 · Opening state (R12, Q20 A).** `pressTool` no longer closes before `router.push`: it marks the row pending
  (`data-ask-pending`: inset 1.5px `--accent` ring on `--elevated`, a 22px spinner in the tile, the foot `Opening {name}…`
  in `--accent-text`, the other rows at 45% and inert), shows the shipped `SearchProgress`, and closes when the pathname
  changes (the existing `PendingReporter`/navigation-commit signal), keeping `leaveDialogsForNavigation`. Esc and ✕ cancel
  (close, no push afterwards). A push that errors restores the row and raises the shipped toast. Phone and dropdown alike.
- **G28 · Deck picker (R12, Q21 A).** `CardState` `deck` with `more > 0` gains the fitting decks (id, name, commander,
  art crop, last edited), from the same `loadToolFits` read. Its foot reads `Pick a deck · {n} can use it`; a press swaps
  the listbox for the picker in the same host: `‹ Answers`, the tool's name and cost chip, `Which deck? {n} of yours can
  use it.`, then one option per deck, last touched first (64px phone, 54px dropdown). Enter or a press opens
  `tryHref(/decks/{id}, tool)` with G27's state on that row; Backspace on an empty field or ‹ Answers returns. One deck:
  straight there, as shipped. The event `ask_tool_pressed` gains `picked: "1" | "2" | "3+"` (deck rank, never a name).
- **G29 · Landing halo (R12, Q22 A).** `useToolLanding` haloes only targets on a busier screen: the Tuning tiles,
  Top off, Cheaper stand-ins, Friends' spares, Matchups, Find a deck's Free chip. Precons, Wishlist, Collection Sync,
  Stats for your decks and Friends land at the top with no halo and spend no moment. Help me choose's target moves from
  the form's first answer to the intro panel (`ChooseIntro`, #3266) while it is open; folded (after the first run), no halo.
- **G30 · Search panel fan (R13, Q23 A).** `home-search-panel.tsx`: from `md`, `Fan` renders outside the title row,
  `absolute right-[28px] top-1/2 -translate-y-1/2` on the section (`relative`), and the field-and-starters block gains
  `md:pr-[240px]` so neither runs under it; the title row's bottom padding drops to 12px. Below `md`, the fan stays in the
  title row exactly as shipped. No fan art (no recent cards): no padding, as today.
- **G12 · Copy review.** Every new string is in `copy strings.ts`; none has been through /copy-review.

## Checks
- Every board renders, no broken images, no clipped frame (measured with support.js stripped).
- R11 frames rendered from main bb4832f8 (`scratch-gen/r-offers.tsx`, `sp-of.json`, `src-patches/` for the ✕ and row toggles).
- Frames rendered from main 7563036 with the shipped components; new parts in `scratch-gen/find.tsx` (R2: `FindCallout` `on`, `FitButton`; R3: `FitRowButton`, and `ask.tsx` for Ask) and the hub
  patch described in `scratch-gen/HOW.md`. Figures, set codes and art are illustrative.

## R12 engineering audit (2026-11-24, against origin/main cc89ad770)

**Verdict: Yellow.** Audited cold against current main, which already holds #3259 (Ask in the card search), #3261 (Home's
search panel), #3263 and #3264 (search fixes: tool rows land, printings focus). The handoff's frames were rendered from this
same main (cc89ad77), so the surface has not drifted: `ToolRow`, `Mark`, `toolWhere`, `pressTool`, `SearchProgress`, `LANDINGS`
and `useToolLanding` all exist as G26 to G29 name them. Phone (390) and dropdown/popover (1300) are drawn for every change.
Nothing is missing that needs Design. Items below are decisions the plan PR records.

### Dimensions
- **Scope.** Clear: four changes (Q19 to Q22), each with its frames; non-goals implicit (card rows, ranking, matcher untouched). Green.
- **State coverage.** Rest, pending, commit, cancel, fail, one deck, several decks, picker, landing halo/no halo all drawn (STATES.md:105-118). Undrawn: picker with many decks (R12-C3), typing during Opening (R12-C2), picker offline (R12-C4). Yellow.
- **Data contract.** G28's fields exist without a new read: `DeckListItem` (`src/lib/decks/read.ts`) carries `commanderName`, `commanderArtCropUri` and the sort key `byTouched` uses; `deckFacts` (`src/lib/discovery/fits.ts:109`) drops them, so `ToolFit.decks` (`fits.ts:63`, `{id, name}`) and `CardState` deck (`showcase.ts:19`) widen. Both cross the `askToolsAction` boundary (`src/app/ask-actions.ts:33`), so the widened state serializes. `loadToolFits` is read once per typed query already; no extra query. Green with the widening.
- **Codebase fit.** Tokens used (`--accent`, `--elevated`, `--accent-text`, `--fg-faint`) all exist and are already in `ask-results.tsx`. `Mark` is the only tile (`ask-results.tsx:30-42`; one consumer, `search-layer.tsx:250`), so G26 is one component, both widths. Copy goes in `src/lib/copy/card-search.ts` beside `askCopy`; `askR12Copy` there, not a new file. Green.
- **Cross-cutting.** Analytics: `ask_tool_pressed` gains `picked` (`src/lib/analytics/tool-events.ts` and its test); a deck rank, never a name. A11y and motion: R12-C2. Yellow.
- **Drift.** None on the surface. One dependency drift: G29 and the README name `ChooseIntro` (#3266) as the Help me choose landing target; #3266 is an OPEN design-only PR (branch design/help-me-choose-intro, handoff approved READY, no code), `ChooseIntro` does not exist on main. R12-C5. Yellow.
- **Decision log.** README Decisions Q19 to Q22 (README.md:205-209) lock A for each. Green.

### Eng-side clarifications
- **R12-C1 · A same-path press never commits (the real one).** G27 closes the search "when the pathname changes (the existing `PendingReporter`/navigation-commit signal)". `PendingReporter` (`src/components/shell/pending-reporter.tsx`) feeds the stall report, not the search; the only close-on-navigation the search has is `shownOn !== pathname` (`src/components/card-search/card-search.tsx:478-487`). Tool answers that land on the SAME pathname never change it: Find a deck from `/collection` (`/collection?avail=free`, `tools.ts:60`), Wishlist from the wishlist, and any deck tool from that deck (`/decks/{id}?tool=`). The row would sit in Opening forever. Decision: the commit signal is pathname plus search (`useSearchParams`), compared with the value at press; a same-address press (nothing to navigate) closes at once as today. Also add the shipped 8s stall as the upper bound (R12-C2 fail).
- **R12-C2 · Cancel and fail cannot be literal.** STATES.md:111 says Esc or ✕ while opening "drops" the navigation, and G27 says "close, no push afterwards", but G27 also pushes before closing, and `router.push` cannot be aborted or reported failed (it resolves nothing, rejects nothing; a failed RSC load lands on `error.tsx`). Decision: Esc and ✕ close the search and supersede the pending push with `router.replace(<the address at press>)` only if a probe proves it cancels (`probe:search-fixes` pattern); otherwise the page that was already requested still arrives and the search is simply closed, and STATES.md's "dropped" reads as "no longer waited on". "A push that errors restores the row and raises the toast" is built as: the 8s stall (`nav-stall.tsx`) or a thrown action restores the row and raises the shipped toast. While Opening: the field is read-only (typing is ignored, not queued), the other rows `inert` and dimmed to 45%, the open row keeps `aria-selected`, `aria-busy` on the listbox, one polite live announcement of `Opening {name}…`, the spinner static under `prefers-reduced-motion`. Phone and dropdown alike (drawn).
- **R12-C3 · Picker with many decks.** Drawn with 4 decks. Decision: the picker body uses the listbox's own max-height and scroll (the dropdown's and the sheet's), rows 64px phone and 54px dropdown, no cap on count; the active row follows arrows as in the answers list. `‹ Answers` is a button reachable by Tab; Backspace on an empty field returns (nothing is typed in the picker).
- **R12-C4 · Offline picker and the first-deck fallback.** `offlineModel` (`src/components/card-search/ask-engine.ts:13-17`) builds deck tools with `fits: {}`, landing on `/decks`; it has no deck list, so no picker (the foot stays `Decks`, as shipped). The picker exists only for a server-read answer with `more > 0`. A deck that vanished between read and press lands on its own not-found as today.
- **R12-C5 · Help me choose's halo waits on #3266.** Until `ChooseIntro` is built, Help me choose keeps its shipped target (the form's first answer) UNCHANGED; moving the halo to the intro is a step of the #3266 build, not of R12's. After #3266: halo `ChooseIntro` while open; folded, none (`pageLanding` for `help-me-choose` returns the landing with no target, spends no moment). Nothing else in G29 depends on it.
- **R12-C6 · G29 list vs the board.** The board's halo list names Consider (Tuning tile, `LANDINGS` `consider`) and G29 omits it: it keeps its halo. `overview` (deck Analysis, `LANDINGS`) is on neither list: it keeps its halo as shipped. Precons, Wishlist, Collection Sync, Stats for your decks and Friends return no target and spend no moment, at the top of the page; `?tool=` is still stripped through `mirrorUrl`.

### What R12 draws, for the build
1. **Marks (Q19 A, G26).** `Mark` only: phone tile 48px/12px radius, wrench 28px; from md tile 40px/10px radius, wrench 24px. Row min-heights stay 72 and 58 (tile + padding 64 and 54 fit). Home panel's popover and the rail's dropdown share it.
2. **Opening state (Q20 A, G27).** Pressed row: 1.5px accent inset ring on `--elevated`, tile glyph becomes a 22px spinner, foot becomes `Opening {name}…` in `--accent-text`; other rows 45% and inert; `SearchProgress` runs across the top; the search closes on commit (R12-C1). Esc and ✕ close (R12-C2); failure restores the row plus the shipped toast. Phone sheet and dropdown/Home popover identical.
3. **Deck picker (Q21 A, G28).** A deck tool with `more > 0` has foot `Pick a deck · {n} can use it` (n = decks that fit); a press (or Enter) swaps the listbox for: `‹ Answers`, tool name plus cost chip, `Which deck? {n} of yours can use it.`, then one row per fitting deck (commander art crop, name, commander, last edited), last touched first, 64px phone and 54px dropdown. A deck press opens `tryHref(/decks/{id}, tool)` with the Opening state on that row; arrows, Enter, Backspace and ‹ Answers work. One deck fitting still goes straight there. `ask_tool_pressed` gains `picked: "1"|"2"|"3+"`.
4. **Landing halo (Q22 A, G29).** Halo kept: Tuning tiles (Suggested changes, Proposed cuts, Mana Balance, Consider), Top off, Cheaper stand-ins, Friends' spares, Matchups, Find a deck's Free chip. Removed: Precons, Wishlist, Collection Sync, Stats for your decks, Friends. Help me choose: the intro panel while open, after #3266 builds.

### Copy
`askR12Copy` (`copy strings.ts`) is unreviewed; `/copy-review` before build (G12). `pickHeading` has no drawn use (aria only); decide in review.


## Errata (engineering audit, 2026-11-23)

| Item | As written | In the code | Resolution |
|---|---|---|---|
| G6, moments | M3 and M4 move to Tuning; M2 (the reading) stays | M2 is `suggested-changes`; M2, M3 and M4 all anchor on the Analysis tab button | All three move to the Tuning tab; the to-do card (M3) and land cell (M4) shortcut anchors stay |
| G6, URL | `?view=consider` | The parameter is `?tab=consider` (`builder-view.ts`) | `?tab=consider` reads as Tuning with Consider open |
| G9, landings | `ROW_TOOL` gains `overview` and `find-a-deck-read` | `TOOLS` has no entry for either, nor for Consider, and `TOOLS` drives About's showcase | `LANDINGS` = `TOOLS` plus `consider` and `overview`, outside the showcase; `find-a-deck-read` maps to `find-a-deck` |
| G22 | Proposes ranking an answerable ask above every kind | `LEAD_PRIORITY` already ranks `spare-request` first; the frame's offer lost because it was seen | A seen, still-answerable ask or offer leads (Q16 A "always"); the unseen rule stays for news |
| STATES R8 row | `Choose your notifications` | R9 renamed it | `Choose notifications` (G17) |
| `copy strings.ts` `freeLine` | `Free, no credit needed` | Each row under it carries a `free` pill | `No credit needed` (copy review, rule 7) |

## R13 engineering audit (2026-11-24, addendum: Search panel board, G30, Q23 A)

**Verdict: Yellow.** Audited cold against `src/components/home/home-search-panel.tsx` on current main. Design's Green is amended: the call is buildable as drawn and nothing returns to Design, but five eng-side clarifications are settled below from the drawn pattern.

- Scope: desktop only, phone as shipped, no new strings (`copy strings.ts` unchanged); Q23 settled A. Green.
- Conflicts: none with R12. R12 touches the Opening state, tool marks and landing halo, not the fan's place. Green.
- Delta vs shipped: the title row (`flex items-start gap-4 px-4 pt-4 pb-4 md:px-5`) holds title and `Fan` (`md:h-[120px] md:w-[180px]`). G30 moves `Fan` out of that row from `md`, so the row shrinks to the one-line title.
- Phone: G30 changes nothing below `md`; the fan stays in the row. Green, if every new class is `md:`-prefixed (C1).
- Tokens: G30 adds only px offsets and padding; no colour. The board's hex values are a rendering surface under `design/`, not shipped. Green.
- Scratch-gen: `scratch-gen/r12.tsx` is modified by +4 lines and already exists on main. `tsconfig.json` has `exclude: ["node_modules","design"]` and `eslint.config.mjs` ignores `design/**`, so typecheck and lint do not read it. No finding.

### Eng-side clarifications
- **R13-C1 · Breakpoint.** The split is Tailwind `md` (768), the same as the fan's own `md:` sizes. Every new class is `md:`-prefixed: `md:absolute md:right-[28px] md:top-1/2 md:-translate-y-1/2` on the fan, `md:pr-[240px]` on the field block, `md:pb-3` on the title row. Below 768 the fan renders in the row exactly as shipped, which a single `Fan` placed by CSS alone cannot do (it must live in one DOM spot). Plan: render `Fan` once, in the section, and keep the row's slot with a phone-only wrapper, or render it twice with `md:hidden` and `hidden md:block` and keep `aria-hidden` plus `data-home-fan` unique (the existing test and probes count it). Decide in the plan; do not leave two `data-home-fan` nodes.
- **R13-C2 · In-between widths (768 to 1179, iPad 820x1180 and 1180x820).** The board draws only 1300 and 390. The field is full width below 1180 (`min-[1180px]:max-w-[720px]`), so from 768 it is the panel width minus 40 and minus the 240 reserve; at 820 that leaves about 500px for the field and starters, and the starters wrap (`md:flex-wrap`). Settled: apply G30 from `md` as written; at 1180 and up the 720px field plus 240 fits inside the panel. 820x1180 and 1180x820 both take the desktop layout (fan right). Probe both before merge.
- **R13-C3 · Centring.** G30 says "centred on the field and starters" but specifies `top-1/2` of the whole section, which also includes the title row and, when the reader has welcome credits, the foot (the board hides it). Settled: follow the code spec (`top-1/2` of the section) as drawn in the A frame; the offset from true field-and-starters centre is about half the title row and is the drawn result. If the welcome foot makes the fan sit visibly low, the fan stays at `top-1/2` of the section; do not add a second anchor.
- **R13-C4 · Fan counts and overlays.** The shipped `Fan` draws 1, 2 or 3 cards (`TILTS[art.length]`) at a fixed 180px width, so the 240px reserve holds for each; none gives no fan and no padding (STATES row). While the search is hosted (field `z-40`, answers open, Opening state) the fan stays put, `pointer-events-none`, under the `fixed inset-0 z-[39]` scrim; it is not hidden or moved. Focus, hover and the `⌘K` hint are untouched (the fan is `aria-hidden`).
- **R13-C5 · Existing test.** `home-search-panel.test.tsx` may assert the fan's place inside the title row; the build PR updates it with a marker check for the new position (route x viewport inventory per feature-acceptance: Home at 390, 820, 1180, 1300).

### Gaps requiring a Design round-trip
None.

### Decisions inherited
Q23 A, desktop only, Hugh 2026-11-24; phone as shipped; no new strings; panel about 100px shorter on desktop.
