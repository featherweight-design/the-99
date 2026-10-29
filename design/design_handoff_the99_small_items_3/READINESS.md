# Small items 3 · READINESS

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
