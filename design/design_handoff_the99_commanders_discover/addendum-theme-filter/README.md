# ADDENDUM — Themes ▾ on Discover's filter rack (#159)

Addendum to `design/design_handoff_the99_commanders_discover` (the rack: `STATES-filter-rack.md`) and the filter
chassis (`design_handoff_the99_filter_chassis`, decision 9 / 23 for `Printed in`). Account 2, round R1, 2026-11-21.

Canvas (Design type): https://claude.ai/artifact/3U4N6SKyEZpjuLCmzZmKVc — boards Main, Copy, Picking, Combining, Edges.
Every frame is the shipped Discover page SSR'd from its own components with shipped CSS (kaldheim), with
`scratch-gen/proposal.diff` applied. Chrome above the page header is the shipped capture. Counts are illustrative.

Hugh's ask (staging walk): "Need more ways to narrow commanders (color, mechanic, popular, obscure)." Color and
popular/new already exist; this adds mechanic/theme.

## Decisions

1. **One new control, built from the two shipped multi-select shapes.** `Themes ▾` (`rack/theme-control.tsx`)
   mounts the shipped `FilterPanel` on desktop exactly as `Printed in` does (searchable, 44px rows, 34px trigger),
   and in the phone filter sheet it is a section plus the shared `SetListSheet` second layer (decision 23's nesting).
   No new primitive. `FilterPanel` gains one optional prop, `headExtra`, a slot under its note.
2. **Placement.** Desktop rack: search · color · **Themes** · Printed in · (Order past the hairline). Phone sheet:
   Color identity · Color match · **Themes** · Theme match · Printed in. Themes comes before Printed in because it
   is the more common question. Discover only this round (the rack is lane-blind; For you can follow with no new design).
3. **What a theme is.** EDHREC's theme tags for the commander (`MECHANIC_LABELS` + `CREATURE_TYPE_LABELS`, formats
   excluded via `FORMAT_LABELS`), the same vocabulary the row's play-style sentence prints. A commander has a theme
   when its EDHREC page lists the tag at or above the index's own floor (`THEME_MIN_DECKS`, 50 decks). Engineering
   decides where the per-commander tag list rides (the discover payload carries only the top three today).
4. **Picking one or several.** Desktop: checkbox rows; picks pin to the shipped `Selected · N` group on open.
   Phone: the six most-played themes (under the other controls) as 44px pills, picked ones first, then
   `All N themes ›` opening the whole searchable list.
   R1b (Hugh, 2026-11-21): the pills sit on a fixed two-column grid, each filling its cell, label left (truncates)
   and count pinned right in tabular figures, so a count changing under another filter never resizes a pill. Taps apply at once, as everywhere in the rack.
5. **Several combine with Any (default) or All.** `Theme match` mirrors Color match: two segments, greyed in place
   with fewer than two themes and saying why ("Pick two to combine" / "Pick two themes to choose how they
   combine."). Any is the default, matching `Printed in`. All keeps only commanders listed under every pick.
   Desktop: in the panel head (`headExtra`). Phone: under the Themes section.
6. **Listing.** Most commanders first, counted under the other controls (search, colors, Printed in), ties
   alphabetical; search uses the panel's shipped ranking. One list, not grouped: creature-type themes carry
   `typal` in the row's hint slot (where Printed in shows a set code). Group label: `Most commanders first`.
7. **With color.** Themes AND colors, like every other pair of controls. While any pip is lit the panel head (and
   the phone section) adds `Counted within the colors you picked.`; a theme the other controls leave at 0 stays in
   place at the panel's shipped `.42`, shows `0`, and can't be picked (the 0 is the reason). Phone pills follow the
   same rule.
8. **How a pick reads.** One chip for the pick (`Tokens` · `Aristocrats, Tokens` · `3 themes`, spoken form names
   all), plus an `All themes` chip only when All is on with two or more, as `Exactly` follows the color chip. The
   badge (`activeControlCount`) counts themes +1 and All +1. Trigger `Themes` → `Themes N`. On each row, picked
   themes the commander has **lead the play-style sentence in `--accent-text`**, then its own top themes fill to
   three, with the lead `This commander’s play styles include` (never "top three", since the order is the pick's).
9. **URL.** `t=` EDHREC slugs, lower-cased, de-duplicated, sorted; `tm=all` written only with two or more themes.
   Both join `LANE_KEYS`. Unknown slugs are kept (match nothing), as set codes are.
10. **Empty and very few.** Shipped `ZeroState` on Discover, secondary stays `Your commanders`.
    - All emptied it: `No commander plays all of those` · `{themes} together leave nothing in the {n} you don’t own.`
      · primary **Match any theme** (keeps every pick; sets `themeMatch: any`).
    - Theme alone (every commander with it is owned): `No commander for that theme here` · `{theme} leaves nothing in
      the {n} you don’t own. The ones you own are on your commanders.` · `Clear the theme filter`.
    - Colors + themes: shipped `No commander fits both` · `None of the {n} you don’t own is {colors} and plays
      {themes}.` · primary clears whichever control returns more rows alone (`Clear the color filter` /
      `Clear the theme filter`), both when neither does (shipped `Clear both filters`). Triggered by a shared link
      (`?c=w&t=rad-counters`) or lighting a pip after picking.
    - Very few: nothing added. `1 of 2,948 commanders match`, the rows, the list ends (no reveal control).

## States (frames on the canvas)

| State | Desktop | Phone |
|---|---|---|
| No theme picked | D1 (Main) | unchanged persistent row |
| Picking, none yet | D2 (Picking) | P2 sheet |
| One picked | D3 (Main) | P3 (Main) |
| Several, Any | D4 (Picking) | P4 sheet |
| Searching / whole list | D10 (Picking) | P10 layer |
| Several, All | D5 (Combining) | P5 |
| With color (counts, 0 greyed) | D6, D6b (Combining) | P6 sheet |
| No matches, All | D7 (Edges) | P7 |
| No matches, color + theme | D8 (Edges) | P8 |
| Very few | D9 (Edges) | P9 |

## Copy (final)

All strings are in `scratch-gen/proposal.diff` (`filterCopy.themes`, `themesPanelCopy` in `lib/copy/lanes.ts`,
`discoveryCopy.empty.filteredThemes*` / `filteredColorsThemesBody`, `commanderRowCopy.pickedStylesParts`) and on the
Copy board. `All N themes` uses the real list length.

## Files

- `art/` — the 21 rendered frames (2x webp).
- `project/` — the canvas boards and `canvas.json`.
- `scratch-gen/` — `proposal.diff` (the proposal as code), `render-hook.diff` (render-only: opens the panel for SSR;
  not part of the build), `render.tsx` (fixtures and frames), `shoot.mjs`, `page.mjs`, `css.mjs`. Recipe: the
  friends_link SSR recipe (scratch copy of main, drop `@fwd-stack/*`, `npm install --ignore-scripts`, scratch
  tsconfig with clerk/nav stubs), `node css.mjs`, `DATABASE_URL=… npx tsx dz/render.tsx`, serve `out/` on :8765,
  `node dz/shoot.mjs`.
