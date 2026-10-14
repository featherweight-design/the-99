# Readiness — addendum 2 (desktop head), R1

**🟢 Green. Three files, no new copy string, no token, no test fixture — and one gap that wants a
decision before the PR rather than during it.**

Every ruling is against source read at `main` this round: `set-grid-view.tsx`, the extracted
`use-head-collapse.ts`, `cost-strip.tsx`, `delta-strip.tsx`, `set-icon.tsx`. The reversal is small in
code because R3 finding 6 already built the mechanism generally: the reserve is measured, the offsets
are derived, and `isDesktop` is already a parameter of the hook. **What this round mostly does is
delete a guard.**

## Ready to build now

| Call | State | Notes |
|---|---|---|
| 1 · what the bar carries | **Ready** | Row 1 of the rack, kept mounted, with a 22px identity prefix. No new control, no badge, no second field. |
| 2 · the height | **Ready** | 56px = `pt-[10px]` + 34 + `pb-[12px]`. Measured, not declared; the threshold reads the measurement as it already does. |
| 3 · the threshold | **Ready** | Shipped rule unchanged. One constant becomes a function of `isDesktop`; two gates added. |
| 4 · the money | **Ready — nothing to build** | `cost-strip.tsx` untouched; the bar carries no figure. |

## The gap report

1. **The 276px rest figure is derived, not probed.** Every member is a source-read type size or
   padding, summed with 1.2/1.45/1.4 line heights — but the app's `probe:sets` measures the phone
   head (288px on its own fixture) and has **no desktop pass**. The arithmetic is only as good as
   those line heights, and a ±2px error per text line is ±8px on the identity block. It does not
   change any ruling (the offsets are measured at runtime, not from this table) but it does change
   the table in the handoff. **Ask: add a desktop width to `probe:sets` in this PR.**
2. **The rarity-panel gate needs a signal the hook cannot see.** `deltaFiring` and `sheetOpen` are
   already lifted into `set-grid-view.tsx`; the panel's open state currently lives inside
   `filter-panel.tsx`. Either it lifts (a fourth `useHeadCollapse` argument) or the hook reads a
   `data-` attribute, which is worse. **Small, but it is the one new wire in this round.**
3. **The focus gate is specified by intent, not by mechanism.** "Must not collapse while focus is
   inside the members the collapse hides" is the right rule; whether it is a `focusin`/`focusout`
   pair on the hidden wrapper or a `contains(document.activeElement)` check at decision time is an
   engineering call I have not made. The hook has no focus term today.
4. **The wheel-notch figure is cited, not measured in this app.** 100–120px is the platform norm;
   120 has headroom over it either way, and the failure mode of a too-wide band is benign (the head
   stays open slightly longer). Worth one manual check on a real wheel before merge.
5. **No test names a desktop collapse.** `set-grid-view.test.tsx` gates on `md:hidden` / bare
   `hidden` tokens and stubs the breakpoint; the `shy` branch's tests all assume phone. Two of them
   assert *that desktop does not collapse* — **those two invert with this ruling** and must be
   rewritten rather than deleted, or the reversal lands with a test still guarding the old rule.

## Tests worth writing with this

- At `md`, `shy` renders the rack's row-1 node **once** in the document: one element with the
  field's accessible name at every scroll offset. This is the round's load-bearing claim.
- The grid's computed track count is identical at scroll 0 and scroll 400 **at 1180 and 1440**, not
  only at 390.
- Reopen and collapse offsets are read from the measured reserve: force a two-line title and assert
  both offsets move by the same delta.
- No collapse while the rarity panel is open, while a delta is firing, or while focus is inside the
  hidden members — three assertions, one gate each.
- The `md` crossing does not animate: cross with the bar drawn and assert no `Animation` on the head.
- The result line is `sr-only` and still `role="status"` while collapsed at `md`; a filter change
  from the bar still announces.

## What I would cut if the round has to shrink

**The band retune (80 → 120) is the last thing I would cut**, not the first — it is the only item
here about an input the phone does not have, and flutter is the defect readers report as "the header
is fighting me". **First cut: the focus gate**, which is a real but narrow case (keyboard focus in
the cost strip while the page scrolls) and severable. **Second: the rarity-panel gate**, if and only
if the panel is changed to close on scroll instead — that is a smaller wire and an acceptable
behaviour, though it costs a reader who opened the panel and nudged the wheel. **I would not cut the
`sr-only` result line**: it is one token and it is the whole reason rows 2 and 3 may go.
