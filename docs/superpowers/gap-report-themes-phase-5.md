# Gap report — Theme system, Phase 5 (picker and persistence)

**Scope:** the inline theme picker in the account menu, the cookie that remembers the choice,
and the server read that paints the right theme on the first frame. Verified against
`docs/superpowers/design-tables/theme-picker.md`, enumerated from §C of
`design/design_handoff_the99_themes/The 99 - Six-Theme Visual System.dc.html` plus README
decisions 4, 5 and 12.

**Verdict: 0 gaps. Ready to ship.**

## The design table did not exist

Phases 0 through 4 changed tokens, faces and existing surfaces, so they were verified against
the handoff directly. Phase 5 is the first phase to draw a new component, and the themes
handoff shipped without a property table. Rather than self-certify the picker against prose,
the table was enumerated first — from the canvas alone, before the implementation was read —
and then an independent verify pass checked the built component against it row by row.

That table is committed at `docs/superpowers/design-tables/theme-picker.md` and is now the
artefact a later change is checked against. It was authored by engineering rather than by
design, which is worth flagging: design should ratify it.

## Gaps found and fixed

**Arrow keys moved focus but did not select.** The canvas's picker rule 3 asks for a
roving-tabindex radiogroup where "arrow keys move and select in one step" — there is no Save
button, so movement *is* commitment. The shipped handler moved focus only, which left a
keyboard user able to walk the whole group without the app ever following. Fixed by routing
the arrow handler through the same `choose()` path a click uses, so one press swaps
`data-theme`, writes the cookie and fires the live-region announcement.

The existing arrow-key test asserted focus movement only, which is why it passed over the bug.
A second test now asserts all four effects of a single press.

**Roving tabindex keyed to selection rather than focus.** Reported as a separate gap; it
resolves with the first, because once every focus move also selects, the focused chip *is* the
selected chip and so is the one carrying `tabIndex=0`.

**Popover block gap.** The divider above the menu items shipped at `mt-[10px]`; the canvas
draws 12px. That edge is the picker's own — it did not exist before this phase — so the canvas
value was taken.

## Deliberate deviations

**Host-panel geometry is left as shipped.** The canvas redraws the account popover and the
mobile sheet only schematically, to give the picker somewhere to sit. Its padding, radii and
sheet insets belong to the earlier app-shell handoff, which specified them properly and which
this handoff does not claim to supersede. Three rows therefore differ from the table by design
— popover `padding` (8px shipped, 14px drawn), sheet `border-radius` (20px shipped, 18px
drawn) and sheet `padding` — and the table says so in its host-geometry note, so a later
verify pass does not re-flag them.

**The popover widens from 216px to 300px.** The one host value this phase does change. The
canvas draws the picker's 3-up grid inside a 300px popover; at the shipped 216px the three
chips fall to 61px, which no theme name survives. The picker genuinely forces this width, so
it is the picker's to change.

**The plane subtitle sits on `--fg-muted`, not `--fg-locked`.** The canvas paints it
`#6E6654`, which is the 3:1 token intended for struck-through chrome. At 8.5px that is not
readable body text. `--fg-muted` is held at ≥4.5:1 on `--surface` in all six themes by the
token contract. This is the same correction the shipped account menu already makes for its
email line, and it is recorded as RD§1 in the property table.

**The picker sits outside `role="menu"` in both panels.** A radiogroup cannot legally be a
child of a menu. Both panels now place the picker as a sibling of the menu, mirroring the
split the sheet already makes between its dialog wrapper and its menu.

**Focus order changed in the account menu.** Opening the panel now lands on the chip for the
theme in force rather than on Manage account, because the dialog helper focuses the first
visible control and the picker precedes the menu items in reading order. Tabbing on from
there reaches Manage account, so nothing is stranded; forcing focus past the picker would put
the caret in the middle of the panel and leave the picker reachable only backwards.

## Verification

- Every row of the property table checked against the implementation, at both the 390px sheet
  and the 300px popover.
- State coverage — Default, Selected, Hover, Focus, Applied — checked for reachability, not
  only for styling.
- A confirmation pass re-checked only the flagged items and returned 0 remaining.
- `pnpm typecheck && pnpm lint && pnpm test` green (1800 tests); stub-DB production build
  green, with every route still `ƒ (Dynamic)` — the cookie read costs no static rendering,
  because Clerk middleware had already marked every route dynamic.
