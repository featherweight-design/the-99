# READINESS · Finding the tools

**Verdict: Green.** Approved by Hugh 2026-11-24 through R13; every question settled (README, Decisions). Every gap below has an answer.

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
