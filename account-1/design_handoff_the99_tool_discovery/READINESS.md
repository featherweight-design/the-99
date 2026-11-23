# READINESS · Finding the tools R1

**Verdict: Amber, for Hugh's review.** Three open questions (README). Every gap below has an answer proposed.

## Gaps for engineering
- **G1 · One filter state.** The switch writes the Availability filter (`filters.availability`), so the URL (`avail=free`),
  the chip, the menu and the switch agree. No second state; not a new param.
- **G2 · The count.** The call-out's N is `availabilityOptions` free count, already read for the menu. Hidden while it is
  unknown (`availabilityOk` false).
- **G3 · The press opens the view.** `CardDetailProvider` gains an open-with-view entry (`openCard(id, { view: "fits" })`)
  so the window mounts on `FitsView` with `onBack` to the card; focus returns to the press on close.
- **G4 · Row view.** Not drawn: the rows view gets the same press as the row's trailing control (44px) while narrowed.
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

## Checks
- Every board renders, no broken images, no clipped frame (measured with support.js stripped).
- Frames rendered from main 7563036 with the shipped components; new parts in `scratch-gen/find.tsx` and the hub
  patch described in `scratch-gen/HOW.md`. Figures, set codes and art are illustrative.
