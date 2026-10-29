# Small items 3 · READINESS

Approved by Hugh, 2026-10-29 ("open a pr"). This file holds engineering's audits, item by item, as each is built.

## Engineering audit of items 1, 3 and 4 (2026-10-29, against origin/main 9996b0ae3)

**Verdict: Green for items 1, 3 and 4, every gap resolved in engineering.** Items 2, 5, 6, 7 and 8 are not audited
here.

The handoff's code claims hold:

- Five diagrams put rows in side-by-side columns (`about-pages.ts`: one-copy `w: 96` and `w: 150`, hidden-deck
  `w: 104`, commit and own-it unsized, Replace `w: 78`/`84`), and a row's tag is `flex-none`, so the name gave way.
- `RuleDiagram` drew `head` and `foot` as a bare parts list in one centred stack (`rule-diagrams.tsx`); a full column
  needed the new `{ w, gap, parts }` form, which `diagramColumn` now reads and `resolveDiagram` keeps.
- The row drew `opacity-55` (gone) and `opacity-75` (dim), its edge in `--border`, and a muted tag and caption in
  `--fg-muted`. The prices slot was `justify-center` at `min-w-[96px]`.
- Discover's orders rank as the draft says (`novelty.ts` `byFit`: owned cards on the commander's EDHREC list;
  `byNovelty`: its themes no deck of yours plays; `window.ts` `ordered`: deck count, A to Z, newest printing).

Resolved in engineering:

- **The pin (item 1, call 4).** `about-pages.test.ts` fails a row in a column under 250px, an unsized one, or one of two
  or more `columns`, with a narrow-column case of each kind; `rule-card.test.tsx` checks the rendered column width and
  that no part carries an opacity class.
- **Replace with Collection editing off.** The diagram's head named Replace, which is a choice only while
  `COLLECTION_EDIT_ENABLED` is on; the shipped diagram swapped "Replace" for "After". The new head keeps that pair:
  "Your Collection, then Replace" on, "Your Collection, then an upload" off (through /copy-review).
- **Sub-lines naming a switched feature (item 4).** A section's `sub` had no switch, and the drafts name Ready to build,
  scanning, Suggested changes, Proposed cuts, Mana Balance, Matchups, Stats' charts, stand-ins and friends. A section now
  takes `subSentences`, cut by `visibleSections` as a label's sentences are (never announced). Each sub-line's first
  sentence is unswitched and pinned so. The Home draft paired What's new with Ready to build, which never show together
  (`HOME_FEED_ENABLED` on and off), so Ready to build's sentence follows `!HOME_FEED_ENABLED`.
- **68ch.** The section sub-line takes `max-w-[68ch]` at every width (the phone never reaches it).
- **Kept as shipped, not in the boards:** the row's gap is `ROW_SHELL`'s (9px phone, 10px desktop; the boards draw 8px),
  the short tag is the availability token, and the buy slot is `min-w-[96px]` (no shipped chip passes 96px).

Copy through `/copy-review` (UI strings) and `/prose-pass` (the sub-lines): the Discover Order label, the diagram tags
and captions, the theme-deck caption and legacy entry, and all sixteen sub-lines; the final strings are in the build's
commit. No About entry and no version bump: the content hash re-pins at 16.

## Engineering audit (item 5)

**Built: Help me choose, the form locks while it reads.**

- `src/components/intake/intake-form.tsx`: while `submitting` (the press to the read landing, or a refusal returning the form) the `form` carries `aria-busy="true"` and `data-intake-locked`, and every `Field` (Colors, Theme with All/Any, Sets, Cards for the 99, Budget, Bracket, Anything else?) is `inert` through a context the form provides. The press sits outside the fields, so it keeps its shipped busy look and its focus. A press by Enter from a field moves focus to the press first, since `inert` would otherwise drop it to the page body.
- `src/app/globals.css`: one block keyed on `[data-intake-locked]` draws the lock with tokens only (no literals). Values and chips `--fg-muted`; the selected pip, segment and bracket drop to a `--border-strong` ring with no fill; unselected go to `--fg-locked` on a `--border` edge; the request box keeps its text on `--surface-sunken` with a `--border` edge. Colour and edge only, so no size changes and nothing jumps on unlock. No overlay, no motion.
- `data-lock-hide` on the chips' ✕ (`theme-picker.tsx`, `sets-field.tsx`), the Add another… input, the Sets trigger (`sets-field.tsx`) and the [[ ]] button: `visibility:hidden`, so their boxes keep their space.
- One markup for phone and desktop, so parity is by construction.

**How the lock is verified** (`src/components/intake/intake-form-locked.test.tsx`): seven `inert` field wrappers and `aria-busy` while a submit is pending, none of either when idle; the hidden controls are still mounted, not `hidden`, not `display:none`, and the CSS rule is `visibility: hidden`; a refusal unlocks with the values kept. Removing `inert` fails 3 of the 4 tests and removing `aria-busy` fails 2.

**Not drawn, decided here:**
- The Sets control is a Printed in trigger button, not an "Add a set…" input; it is the control hidden.
- Unselected colour pips have no edge today; they get a `--border` ring (box-shadow, no layout change) to match the drawn unselected pip.
- Chips draw as `--elevated` pills today; locked, they go transparent with a `--border-strong` hairline, as drawn.
- The drawing locks the whole form block including labels; the build locks the fields. Labels and captions are text and read the same either way.
- Not exercised in a browser here: the contact sheet is the close-out walk's.
- Browser check (1300 and 390): geometry identical locked vs unlocked, fields inert, `aria-busy` set, unlock keeps values and returns focus to the press. Two gaps found and fixed: the Colors strip wrapper (`colour-control.tsx`) now takes the locked edge, and the colour pips (symbol art, drawn as letters on the board) are dimmed to 0.55 opacity while locked, the ring still showing which are selected. The dimming is an engineering reading of "values `--fg-muted`" for art the board does not draw.

## Engineering audit: items 2 and 6, and the Try it beat

Audited against `README.md` §2 and §6 and the boards `Try-It-Halo.html` and `Dock-Low-Region.html`, on the tree at
`origin/main` c6909b921. Built on branch `about-tryit-scroll`. Verdict: **buildable as drawn**. Two cases the boards do
not draw are listed under Open, and neither blocks.

### Item 2: the Try it halo stays inside its frame

- **Where.** `ToolCard`'s `Picture` (`src/components/about/tools/tool-card.tsx`) drew the halo straight from the crop's
  percentages. Both importers of `ToolCard` get the fix with no change of their own: About's Try it (`try-it.tsx`) and
  Show me's landing (`discovery/label-landing.tsx`).
- **How.** `haloAt`'s clamp is written in CSS, so it needs no measuring and holds at every rendered card width:
  - left and top are `clamp(8px, x%, calc(100% - 8px))`;
  - right and bottom are `max(8px, …%)`;
  - an auto size under two insets never goes below 0, which matches `haloAt` when a box is squeezed past its own edge.
  - The helper is `haloInsets` in `src/lib/about/halo.ts`.
- **Bundle.** `HALO_REACH` moved into that manifest-free module, and `pins.ts` re-exports it. The client card then does
  not bundle the page-shot manifest.
- **Proof.**
  - `halo.test.ts` evaluates the CSS at four card sizes against `haloAt`, for six boxes: Top off's, the full frame,
    one inside, one low, and two outside it.
  - `tool-card.test.tsx` pins the server markup.
  - In the browser at 1300, Top off's halo ends 8px inside the frame's padding box.

### Item 6: the phone dock for a low region (resolves R4 ruling 6)

- **Rule.** `dockPlace` in `src/lib/about/dock-place.ts` follows the board's threshold exactly.
  - The dock goes to the top when the lit region's bottom edge is below the dock's top edge as placed at the foot.
  - At the top it sits 12px under the lowest bottom edge on screen of the quick-return header and the sticky back bar.
  - With the header away and no back bar, that is 12px from the screen's top.
  - A region the top dock would also cover keeps the foot.
- **Once, on the tap.** `PinDock` measures itself at the foot in a layout effect and decides before its first paint.
  - The screen keys the dock on its label, so each tap mounts a new dock that decides again.
  - Scrolling never moves it.
  - Look, gutters, ✕, z-order and motion are as shipped. Desktop has no dock.
- **Measured at 390×844 on a scratch branch.** A low region gave these dock tops:
  - header away, no back bar: 12;
  - back bar stuck at 0–47: 59;
  - header shown at 0–79: 91.
  - A higher region kept the foot (669–758).
  - The page's scrollY did not change on any tap.
- **Safe area (engineering decision, ruled by the orchestrator 2026-10-29; resolves Open 2).** The top dock sits 12px under `max(bar edge, env(safe-area-inset-top))`, measured on the tap by a hidden `env()` probe (`safeTopNow`) and passed to `dockPlace` as `safeTop`: 59 under a 47px inset with nothing on screen, 91 under the header at 79.

### The Try it beat (Hugh's ruling, 2026-10-29)

- **Change.** `reveal` takes `{ beat }`, default true. `scrollToTarget` passes it through, and only `useToolLanding`
  asks for `beat: false`.
- **Unchanged.** Every other scroll keeps the 100ms `MOTION.delayMs`. Reduced motion still jumps.
- **Measured at 390, five landings each.** Top off's halo landing to the first scroll event went from 126–133ms to
  6–12ms.

### Open: cases the boards do not draw

1. **The header returning over a top dock.** The dock was placed while the header was away (top 12). The reader then
   scrolls up and the header slides back.
   - The shipped dock is `z-[34]`, over the header's `z-30`, so it covers the header's lower edge.
   - The board stacks the dock under the header (z 5 vs 6), which would instead hide the dock's top.
   - Rule 3 says the dock doesn't move, so it was built as shipped (over).
   - This is a Design call if either behavior is wrong.
2. **Safe area.** With nothing at the top, the dock sits 12px from the viewport's top edge, with no
   `env(safe-area-inset-top)`. The phone header covers that inset whenever it shows. This case arises only while the
   header is away.
