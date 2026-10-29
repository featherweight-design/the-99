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
