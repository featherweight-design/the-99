# Readiness Review: Add panel addendum, a visible Add on phone search results (R1 + R1b)

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-13, against `origin/main` at `aae879a44` (branch rebased onto it first)
**Related ticket(s):** PR #2919 (this addendum); parent handoff `design_handoff_the99_add_panel` (Result row) and small items 2, item 6b
**Plan PR target:** TBD (one small UI PR: `src/components/decks/quick-add-bar.tsx` plus its tests)

## Summary

The addendum answers the brief: every phone row, the active one included, draws the shipped ghost `Add` in the existing
56 x 44 trailing cell; the `↵ add` caption survives only at md with a fine pointer; the keyboard hint hides on a coarse
pointer; R1b keeps `✓ In deck` on one line on desktop. Every state the brief asked for is drawn or reasoned (default,
active, pressed, pending, refused, in deck, long name at 375), no copy or token is new, and every code claim checked out
against main. Nothing needs Design. Four eng-side clarifications below go into the build PR as decisions. `scratch-gen/pa.diff`
applies cleanly to main (`git apply -p0 --check`) and is a good reference for the two class changes. It must not be
shipped as is, because it carries the generator's fixture scaffolding.

## Per-dimension findings

### 🗺️ Scope clarity

- [✅] Boundary stated: quick-add bar only, phone plus the touch-tablet case, plus R1b on desktop. The `resolution-expander.tsx`
  bare `↵` is named as out of scope (verified: `src/components/decks/resolution-expander.tsx:512`, same `md:hidden` glyph
  pattern). It needs its own ticket if wanted.
- [✅] The phone return key keeps adding the top match, and the README says so. It just isn't advertised any more.

### 🎭 State coverage

- [✅] Default, active (S1), pressed on the active row and on another row (S2, S3), pending/in deck (S4), refused (stated:
  back to ghost plus the shipped `MutationError`, `quick-add-bar.tsx:905`), in deck, long name at 375 (`Long-Name`).
- [✅] Pending reasoning verified: `useDeckMutation` sets `applied` inside the same `startTransition` that makes `isPending`
  true (`src/components/decks/use-deck-mutation.ts:56-57`). The `applied` branch comes first (`quick-add-bar.tsx:846`), so
  the shipped `opacity: 0.5` (`:861`, `:877`) never paints. No separate pending look is needed.
- [✅] Desktop drawn (`Desktop` board, main vs R1b at 1300). Phone and desktop parity are covered by the same component.
- [🟡] The md + coarse-pointer tablet gets the ghost `Add`, but at the shipped md height of 36px (`md:h-[36px]`,
  `quick-add-bar.tsx:876`; cell `md:min-h-[36px]`, `:844`), which is below 44. The brief's 44px rule is a phone rule and the
  tablet was never drawn. See clarification 3.

### 🔌 Data contract

- [✅] No data change. `applied`, `isPending` and `error` come from `useDeckMutation` (`quick-add-bar.tsx:657`) and are already
  wired to this cell.

### 🧱 Codebase fit

- [✅] Tokens all exist: `--elevated`, `--border-strong`, `--accent`, `--accent-text`, `--success`, `--fg-locked`
  (`src/app/globals.css:41,44,72,77,84,60`, and in every theme block).
- [✅] Pressed look reuses existing patterns: `pressFill` is `active:bg-[color:var(--elevated)]`
  (`src/components/ui/segmented-switch.tsx:131`). The ghost hover border is `hover:[border-color:var(--accent)]`
  (`src/components/ui/button.tsx:44`).
- [✅] The `[@media(pointer:fine)]:md:` variant form already ships in this file (`quick-add-bar.tsx:360`).
- [✅] Copy keys exist unchanged: `rowAdd`, `rowAddActive`, `rowInDeck`, `keyboardHint*`
  (`src/lib/copy/decks-builder.ts:236-252`). No `copy-review` pass is needed for strings.
- [🟡] The shipped ghost sets its border and background inline (`quick-add-bar.tsx:876-883`). An `active:` utility cannot
  override an inline style, so the pressed state requires moving them to classes, as `pa.diff` does. See clarification 1.
- [🟡] The README says `useKeyboardLikely()` is "the same idea in JS". It is not the same condition: its query is
  `(pointer: fine), (min-width: 768px)`, an OR (`src/components/card-search/search-desktop.tsx:38`), while the addendum
  draws md AND fine. Use the CSS as drawn. See clarification 2.

### ♿ Cross-cutting

- [✅] Spoken labels unchanged: the gridcell keeps `aria-label` `Add` / `✓ In deck` and `aria-describedby` (`:837-842`). Both
  visible spans stay `aria-hidden`.
- [🟡] `:active` on a non-focusable span in iOS Safari only fires when a touch listener is present. React 19 attaches
  `touchstart` at the root, so it should work, but the pressed state is unproven until it is checked on a real iPhone or in
  a touch-emulated probe. The li's `onMouseDown` `preventDefault` (`:777`) fires after touchend on touch, so it does not block
  `:active`. See clarification 4.
- [✅] No performance, analytics or telemetry impact.

### ⏰ Drift from reality

- [✅] Every file, line and class the README names exists as described on main: the phone `↵` / md `↵ add` caption
  (`quick-add-bar.tsx:856-867`), the name cell's `stopPropagation` to details (`:811-818`), the row's add on `onClick`
  (`:778`), the 56 x 44 trailing cell (`:844`), the hint `<p>` with no pointer gating (`:513-537`), the `✓ In deck` span at
  `md:w-[56px]` with no `whitespace-nowrap` (`:848-853`, R1b's cause).
- [✅] `pa.diff` applies cleanly to rebased main with `-p0`. Its header paths are `../quick-add-bar.orig.tsx` →
  `src/components/decks/quick-add-bar.tsx`, so `git apply` without `-p0` fails.

### 📝 Decision log

- [✅] Calls are stated on the `Main` board and in the README: the same ghost on every phone row, the active row marked only by
  its edge, two targets as 6b shipped, pressed tokens, pending = optimistic In deck, desktop unchanged apart from R1b. R1b is
  recorded as Hugh's call-out (2026-11-14).

## Eng-side clarifications (Yellow only)

1. **Build from `pa.diff`'s two class changes only.** Keep: the caption's `hidden [@media(pointer:fine)]:md:inline`; one ghost
   on every non-applied row with `[@media(pointer:fine)]:md:hidden` added on the active row; border and background moved to
   classes (`[border:1px_solid_var(--border-strong)]`, `active:bg-[color:var(--elevated)]`,
   `active:[border-color:var(--accent)]`); the hint's `[@media(pointer:coarse)]:hidden`; R1b's
   `whitespace-nowrap md:flex md:justify-end`. **Do not ship:** the `fx` prop and its `Object.assign` over `useCardSearch`'s
   result (`pa.diff` hunk at old line 158), the `v` / `press` props and the `data-press` / `data-[press]:` classes, the
   `export` on `QuickAddRow`, the `v === "p1"` branching (the proposal becomes the only branch), or the `PROPOSAL` comment.
   Replace the stale comment at `quick-add-bar.tsx:855-857` (the "caption rather than a control" reasoning) with one that
   matches the new behavior. Never import from `design/`.
2. **Keyboard likelihood stays in CSS** as drawn (md AND fine pointer). Do not substitute `useKeyboardLikely()`: its OR query
   would show `↵ add` on a fine-pointer phone-width window and on a coarse-pointer tablet, and it says no on the server's
   first render, which causes a flash.
3. **Touch tablet target height:** keep 36px at md, as every non-active desktop row already ships it. The brief's 44px rule
   is scoped to phones, and the coarse-tablet case is an extension Design added. Record this. Raising it to 44 on
   `[@media(pointer:coarse)]:md:` is a one-class follow-up if Hugh wants it.
4. **Proof:** update `src/components/decks/quick-add-bar.test.tsx` (`:293-300`, the active-cell text assertions: in jsdom, both
   the caption and the ghost are in the DOM). Then confirm the pressed state, the caption and hint gating at 390 under touch
   emulation, and R1b at 1300, in a browser probe. A jsdom test cannot see media-query visibility.

## Decisions inherited

- Two targets as 6b shipped: name cell → card details; Add cell and the rest of the row → add.
- The active row is marked by its `1px --accent` border only. The Add inside it is identical to the other rows'.
- No new copy, no new token. `rowAddActive` (`↵ add`) is desktop-with-fine-pointer only.
- Pending has no separate look: the optimistic `✓ In deck` is the pending state.
- `resolution-expander.tsx`'s bare `↵` is out of scope (its own round if wanted).
- `scratch-gen/` is reference only, never shipped code.
