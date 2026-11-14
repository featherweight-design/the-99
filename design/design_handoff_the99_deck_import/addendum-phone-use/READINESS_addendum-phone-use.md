# Readiness Review: Deck import addendum, a visible Use on phone search results (R1)

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-13, against `origin/main` at `986475833` (branch already based on it; rebase was a no-op)
**Related ticket(s):** PR #2922 (this addendum); parent handoff `design_handoff_the99_deck_import` (state 16, state 17,
design table §15/§16); pattern source `design_handoff_the99_add_panel/addendum-phone-add/` (#2919), built in PR #2921
**Plan PR target:** TBD (one small UI PR: `src/components/decks/resolution-expander.tsx` plus its tests)

## Summary

The addendum answers the brief: on a phone every result row, the active one included, draws the shipped ghost `Use this`;
the `↵ use this` caption and the visible keyboard hint survive only at md with a fine pointer; a touch tablet gets the
ghost `Use this card` on every row. It answers the question it was asked: the ghost is a picture of the option's press,
not its own target, which is the only answer a `role="option"` row allows. No copy, token or data change, every state the
brief named is drawn or reasoned, and every code claim checked out against main. Nothing needs Design. Four eng-side
clarifications go into the build PR as decisions. `scratch-gen/pu.diff` applies cleanly (`git apply -p0 --check`) and is
a good reference for the class changes; it must not ship as is.

## Per-dimension findings

### 🗺️ Scope clarity

- [✅] Boundary stated: the expander's result rows on phone, plus the touch-tablet case under the Add panel ruling. Desktop
  (md, fine pointer) unchanged; the README reports the 1100 render byte-identical to main.
- [✅] Non-goal logged: a refused resolve returning the line collapsed with no message ("Seen while drawing, not drawn").
  Verified from the code: the expander mounts only while expanded (`src/components/decks/unresolved-row.tsx:129`), the
  optimistic callback collapses it (`unresolved-group.tsx:216-219` via `resolution-expander.tsx:119-121`), and its
  `MutationError` lives inside it (`resolution-expander.tsx:440-442`). A real gap, correctly out of scope.

### 🎭 State coverage

- [✅] Default, active (S1), pressed on the active row and on another row (S2, S3), pending (S4), nothing found (17), long
  name at 375 (`Long-Name`). Every state names its trigger.
- [✅] Pending reasoning verified: `useDeckMutation.run` calls the optimistic callback inside the same transition that sets
  `isPending` (`src/components/decks/use-deck-mutation.ts:56-65`), and that callback calls `onResolved`, which collapses
  the expander. The shipped `opacity: 0.5` (`resolution-expander.tsx:510`, `:520`) never paints. No separate look needed.
- [✅] Phone (390, 375), desktop (1100 fine) and touch tablet (1024 coarse) drawn on the `Desktop` board.
- [✅] Tap target: the whole option row (`li`, `onClick={onUse}`, `resolution-expander.tsx:490`), 63 tall at phone and 60
  at md as rendered (class floor `min-h-[56px] md:min-h-[52px]`, `:491`). Clears both the 44px phone floor and the 36px
  tablet ruling, so the md ghost's shorter visual (`md:h-auto md:py-[6px]`) is not a target-size problem here.

### 🔌 Data contract

- [✅] No data change. `resolvePending` and `resolve()` already feed every row (`resolution-expander.tsx:112`, `:349-351`).

### 🧱 Codebase fit

- [✅] Tokens exist: `--elevated`, `--border-strong`, `--accent`, `--accent-text` (`src/app/globals.css:41,44,72,77`, and
  in every theme block).
- [✅] Copy keys exist unchanged: `keyboardHint`, `activeRowHint`, `use`, `useShort` (`src/lib/copy/deck-import.ts:432-436`).
  No new strings, so no `copy-review` pass.
- [✅] The `[@media(pointer:fine)]:md:` variant form already ships in this file (`resolution-expander.tsx:242`).
- [✅] Plain `group` on the `li` is safe: the only group inside `CardSearchRowBody` is the named `group/name`
  (`src/components/decks/card-search-row.tsx:185`), which no plain `group-active:` collides with.
- [🟡] The shipped ghost sets border, background and colour inline (`resolution-expander.tsx:519-524`). A `group-active:`
  utility cannot beat an inline style, so they must move to classes, as `pu.diff` does. See clarification 1.
- [🟡] Consistency with PR #2921 (`quick-add-bar.tsx`): the caption/ghost gating is the same (`hidden
  [@media(pointer:fine)]:md:inline` on the caption, `[@media(pointer:fine)]:md:hidden` on the active row's ghost). Three
  intended differences, all correct for this surface: the press is `group-active:` on the `li` (one target per row) where
  #2921 uses `active:` on its own Add cell (two targets); the hint stays `sr-only` and becomes visible only at md + fine,
  where #2921 hides its always-visible hint with `[@media(pointer:coarse)]:hidden` (this hint was already `sr-only` below
  md, `resolution-expander.tsx:272`); the box is 96 x 40, theirs 56 x 44. Two incidental differences to align: #2921 writes
  the border as `[border:1px_solid_var(--border-strong)]` with `active:[border-color:var(--accent)]` and adds
  `transition-colors`. See clarification 2.

### ♿ Cross-cutting

- [✅] Screen-reader behaviour unchanged and sound: the field stays the combobox with `aria-activedescendant`
  (`resolution-expander.tsx:246`), each option keeps its `aria-label` and `aria-selected` (`:472-489`), both visible spans
  stay `aria-hidden`, and the hint stays in the tree as the field's `aria-describedby` (`:250`, `:271`) at every width.
  No nested interactive control enters the listbox.
- [🟡] `:active` on iOS Safari needs a touch listener on the element or an ancestor. PR #2921 proved React's root
  `touchstart` listener is present (CDP `getEventListeners` at 390) and showed the pressed state with a held pointer,
  because CDP touch events do not set `:active` headless. Same proof applies here. See clarification 4.
- [✅] On touch, the emulated `mouseenter` (`:489`) makes the tapped row active before its click. With the change the phone
  ghost is identical on active and inactive rows, so nothing shifts under the finger.
- [✅] No performance, analytics or telemetry impact.

### ⏰ Drift from reality

- [✅] Every file, line and class the README names exists as described on main: `ResultRow` (`resolution-expander.tsx:459`),
  the active caption with phone `↵` and md `↵ use this` (`:502-514`), the ghost with `useShort`/`use` (`:516-528`), the
  shipped comment on nested controls (`:503-505`), the hint span `sr-only md:not-sr-only` (`:270-276`),
  `useResolveOptimisticRow` (`:25`, `:102`).
- [✅] The parent handoff's §16 component note ("Right slot: `↵ use this` on the active row, a `Use this card` ghost button
  otherwise", `design_handoff_the99_deck_import/README.md:317`) is superseded by this addendum on phone and touch tablet
  only; desktop still matches it.
- [✅] `pu.diff` applies cleanly to `origin/main` with `-p0` (headers are `../resolution-expander.orig.tsx` →
  `src/components/decks/...`, so `-p1` fails). It touches `resolution-expander.tsx` and `unresolved-group.tsx`.

### 📝 Decision log

- [✅] Calls stated on the `Main` board and in the README: ghost on every phone row; active row marked only by its `1px
  --accent` edge; the ghost is a picture of the press, not a target, with reasons; pending is the optimistic drop; desktop
  unchanged; touch tablet follows the Add panel ruling.

## Eng-side clarifications (Yellow only)

1. **Build from `pu.diff`'s `v === "p1"` branch only.** Keep: `group` on the `li`; the active caption as `hidden
   [@media(pointer:fine)]:md:inline … w-[96px]` with `copy.activeRowHint` only (the phone `↵` span goes); the ghost on
   every row, plus `[@media(pointer:fine)]:md:hidden` on the active row's; border, background and colour as classes with
   `group-active:bg-[color:var(--elevated)]` and a `group-active:` accent border; only `opacity` stays inline; the hint's
   `sr-only [@media(pointer:fine)]:md:not-sr-only`. **Do not ship:** the `Fx` type, `fxOf()` and the `Object.assign` over
   `useCardSearch`'s result; the `fx?.query` seed; the `v`/`press` props and the `!bg`/`!border` press overrides; the
   ternary on the hint class (the p1 string becomes the only one); the `shipped` branch (p1 becomes the only branch); the
   whole `unresolved-group.tsx` hunk (`__expand`, `__note` fixtures). Rewrite the caption comment at
   `resolution-expander.tsx:503-505` to describe the ghost as the picture of the option's press. Never import from `design/`.
2. **Share the pattern with #2921 at the class level, not a helper.** Write the ghost border the way #2921 does
   (`[border:1px_solid_var(--border-strong)]`, pressed `group-active:[border-color:var(--accent)]`) and add its
   `transition-colors`, so both ghosts read the same in code and on screen. Keep the three intended differences above
   (`group-active:` not `active:`, `sr-only` hint gating, 96 x 40 box). A shared constant is not worth it: two call sites
   that differ in size, press variant and copy.
3. **Keyboard likelihood stays in CSS** (md AND fine pointer), not `useKeyboardLikely()`: its query is an OR and it says no
   on the first server render, as the Add panel READINESS records.
4. **Proof.** No existing test asserts the caption (`resolution-expander.test.tsx` has no `activeRowHint`/`useShort`
   assertion), so add one: the active row renders both the caption and the ghost in jsdom (CSS picks). Then a browser probe:
   at 390 touch-emulated, every row shows `Use this`, no `↵` visible, the hint is `sr-only`, a held press on the active row
   and on row 2 paints `--elevated` / `--accent`, and a tap resolves the line; at 1100 fine pointer, the active row shows
   `↵ use this`, no ghost, hint visible; at 1024 coarse, every row shows `Use this card`, hint `sr-only`.

## Decisions inherited

- The whole row is the one target (`role="option"`, acts on click). The ghost is `aria-hidden` and never a `<button>`.
- Active row marked by its `1px --accent` border only; its ghost is identical to the other rows'.
- Pending has no look of its own: the optimistic resolve collapses the expander.
- No new copy, no new token. `activeRowHint` is desktop-with-fine-pointer only.
- Touch tablets keep the shipped md sizes (orchestrator ruling on the Add panel); here the 60px row is the target.
- The silent refused resolve is out of scope (its own ticket if wanted).
- `scratch-gen/` is reference only, never shipped code.
