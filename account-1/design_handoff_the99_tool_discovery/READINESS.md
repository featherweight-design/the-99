# READINESS · Finding the tools R7

**Verdict: Amber, for Hugh's review.** Five open questions (README, Q8 to Q12). Every gap below has an answer proposed.

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
- **G12 · Copy review.** Every new string is in `copy strings.ts`; none has been through /copy-review.

## Checks
- Every board renders, no broken images, no clipped frame (measured with support.js stripped).
- Frames rendered from main 7563036 with the shipped components; new parts in `scratch-gen/find.tsx` (R2: `FindCallout` `on`, `FitButton`; R3: `FitRowButton`, and `ask.tsx` for Ask) and the hub
  patch described in `scratch-gen/HOW.md`. Figures, set codes and art are illustrative.
