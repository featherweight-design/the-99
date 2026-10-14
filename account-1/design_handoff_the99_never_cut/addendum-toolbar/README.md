# Locked cards R2 · Toolbar addendum (audit F3)

Answers F3 in `design/design_handoff_the99_never_cut/READINESS-audit.md` (branch `design/never-cut-handoff`,
PR #936), under Hugh's rulings L1–L4. Only F3 and the L3 note are drawn here. **Nothing else in R2 changes.**
The lock glyph and its inks are R2's.

Canvas: `The 99 - Never Cut · Toolbar Addendum.dc.html` (§, 4a–4d). Its child is `Toolbar.dc.html`.
Traced from `main`: `group-toggle.tsx`, `clear-auto.tsx`, `ui/view-toggle.tsx`, `mark-key.tsx`, `decklist.tsx`,
`copy/recommendations.ts`. Lands at `design/design_handoff_the99_never_cut/addendum-toolbar/`.

## Answers to F3

| Question | Answer |
|---|---|
| Position | **Last child of cluster 2** ("act on the cards"): kept/draft note → Keep all → Clear all auto → **Lock cards** → hairline → cluster 3. On desktop the `flex-1` spacer pushes it just left of the hairline. It sits inside cluster 2's wrapper, so the row still wraps between clusters and never inside one. |
| Skin | `BULK_BUTTON_CLASS` verbatim, plus `gap-[7px]` for the icon and `min-w-[116px] justify-center`, so *Done* keeps the same box. Icon: R2's closed `LockMark`, `--fg-muted`. |
| Phone height | **44px** (`min-h-[44px]`), the same as Keep and Clear beside it, not the ~26px pills. Desktop is `py-[6px]`, about 30px. |
| Done | Label `Done`; text, border and icon `--accent`, with no fill (R2). **Keep all and Clear all auto stay in place, disabled** (`busy` styling, 50%), so no line appears or disappears and *Done* stays under the thumb. The kept note stays. While Keep all's question is open, Lock cards stands down with the pair. |
| 390 line budget | With auto cards: `Keep 40` 76 + `Clear auto · 38` 134 + `Lock cards` 116 + 2×8 = **342 / 358**. Counts are at most two digits, so there are 3 lines, as shipped. With no auto cards, Lock cards joins the pills' line (276 / 358), so there are 2 lines, as shipped. The view well's line is unchanged. |
| Shopping filter | **Hides it**, absent rather than disabled, for the view well's reason. At-rest marks and the desktop hover shortcut still work on Shopping rows. Switching to Shopping ends the mode; switching List ↔ Card keeps it. |
| The mode's line vs the key line | The key's wrapper (`px-[16px] pt-[12px] md:px-[26px] md:pt-[14px] empty:hidden`) holds **either** `MarkKey` **or** the mode's line, never both. It's the same position, above the sweep receipt and the groups. With no key entries, the wrapper renders for the mode only. |

## L3 · Clear all auto skips locked cards

- **Label counts what it clears:** `clearAll(n)` takes `auto − lockedAuto`. `Keep all` still counts every auto card.
  The two are different sets on purpose: a locked auto card can be kept but can't be cleared.
  This overrides `clear-auto.tsx`'s "both key on `count` alone" note, which should be updated.
- **Absent at zero:** when every remaining auto card is locked, Clear is not rendered and Keep all stays.
- **The receipt:** `SweepReceipt` gains a clause after a middot, in the same mono `--fg-locked`:
  `38 auto cards removed · 2 locked cards stayed`. No clause at zero. Undo restores the swept rows only.

Copy additions (`recommendationsCopy.auto`, for `/copy-review`):
```ts
sweptLeftLocked: (n: string) => plural(n, 'locked card stayed', 'locked cards stayed'),
clearAllAriaLocked: (n: string, locked: string) =>
  `Clear all ${n} untouched auto cards. ${plural(locked, 'locked one stays', 'locked ones stay')}.`,
sweptAnnounceLocked: (removed: string, locked: string, built: string) =>
  `${removed} auto cards removed. ${plural(locked, 'locked card stayed', 'locked cards stayed')}. ${built}.`,
```

## `group-toggle.tsx` deltas
1. Cluster 2 and the hairline gate: `filter === "all" || draftNote || autoCount > 0 || keptCount > 0`.
2. Cluster 2 wrapper: `flex` whenever Lock cards renders; `hidden md:flex` only under Shopping at a zero count.
3. New props: `lockMode: boolean`, `onLockModeChange`, `lockedAutoCount` (for the Clear label).
4. Cluster 3, the spacer and `ViewToggle`: untouched.

## Files
- `The 99 - Never Cut · Toolbar Addendum.dc.html`: the canvas.
- `Toolbar.dc.html`: the frame (props `phone`, `view`, `state`: rest / noauto / mode / shopping / receipt).
- `support.js`: runtime, for self-containment.
