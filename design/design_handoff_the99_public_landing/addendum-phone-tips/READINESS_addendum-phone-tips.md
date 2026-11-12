# Readiness Review — Landing tips on phones (addendum A4)

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-12 (cold read against origin/main at aae879a44; the PR branch already contains it)
**Related ticket(s):** PR #2895 (this addendum); parent handoff `design_handoff_the99_public_landing/` (R4, A1 to A3)
**Plan PR target:** TBD (one small PR in `src/components/landing/credit-tips.tsx` and `credit-tips.test.tsx`)

## Summary

A4 is buildable on today's code with no Design round. The component it names (`CreditTips` in `src/components/landing/credit-tips.tsx`), its caller (`credits.tsx:128`), the `.anim-menu-in` class (`src/app/globals.css:862`, keyframes `:789`, dropped under reduced motion at `:1430`), the `--elevated`/`--border-strong` tokens and the export guides precedent (`bring.tsx:77-78`, no outside-press close) all exist as named. The 768 split is Tailwind's `md`, which is where the shipped tip already changes from row width to its 330px float. No data, flag, copy or token change. Six clarifications remain, all engineering's: the largest are that the drawn class list adds `.anim-menu-in` at every width (which changes the desktop tip that call 2 says stays as shipped), and that the semantics switch (call 7) cannot be done in CSS and needs the shared `useMinWidth` hook. The plan PR records each item below as a decision.

## Per-dimension findings

### 🗺️ Scope clarity

- [✅] Brief, build target (calls 1 to 8), what does not change and what is not drawn are stated (`README.md:7-9`, `:35-37`). Must-nots are in `STATES-phone-tips.md:15-20`.
- [✅] The non-goal "never change the desktop or tablet tip, or any copy" is explicit (`STATES-phone-tips.md:19`).

### 🎭 State coverage

- [✅] Closed, open in the flow, long tip (390 and 320), last row, switch, into view, closed again, press elsewhere and floating are all in `STATES-phone-tips.md:3-13`, drawn on A4 · Phone, A4 · Behaviour and A4 · Desktop, plus all six themes (A4 · Themes).
- [✅] Loading, error, empty and signed-out do not apply: the list is static copy (`landingCopy.tools`) on a public page, and every tip is closed on load.
- [🟡] **A mouse below 768** (a narrow desktop window) is not drawn. README says hover stays mouse-only "as shipped" (`README.md:37`), so a hover opens the in-flow tip and pushes rows. See clarification 4.
- [🟡] **Keyboard focus below 768** opens an unpinned tip (`credit-tips.tsx:79-81`) that would now push rows and trigger the into-view scroll. Not drawn. See clarification 5.

### 🔌 Data contract

- [✅] No data. Every tip, preview and label comes from `src/lib/copy/landing.ts` (`tools`, `tip.open` at `:263`), unchanged.

### 🧱 Codebase fit

- [✅] No new token, string or component. The card is the shipped tip body (`credit-tips.tsx:96-109`) moved into the row's flow with `max-md:flex-wrap` + `max-md:basis-full` (`scratch-gen/tips-variants.diff:19,29`).
- [🟡] **`.anim-menu-in` at every width.** The drawn class list puts `anim-menu-in` unprefixed on the tip (`tips-variants.diff:29`), so the desktop float would gain a fade and 4px rise (`globals.css:789-791`) it does not have today, against call 2 (`README.md:27`) and the Must-not at `STATES-phone-tips.md:19`. A still screenshot cannot show this, so the "pixel-identical at 768 and 1300" proof does not cover it. `.anim-menu-in` is plain CSS, not a Tailwind utility, so `max-md:anim-menu-in` does not exist. See clarification 1.
- [🟡] **`pointer-events-none` dropped in the drawn diff.** `READINESS.md:5` says today's hover-only `pointer-events-none` is kept, but the flow branch of the diff omits it (`tips-variants.diff:29`), and `credit-tips.test.tsx:67-75` asserts it. Keep it, as `READINESS.md` says.
- [🟡] **Width switch in JS.** Call 4's outside press (`README.md:29`), call 5/6's scrolls and call 7's semantics need the width in script. The repo's one subscriber is `useMinWidth` (`src/components/ui/use-min-width.ts:17`); `READINESS.md:6` proposes a raw `matchMedia`. See clarification 2.

### ♿ Cross-cutting

- [✅] Reduced motion: `.anim-menu-in` is already dropped (`globals.css:1430`) and call 6 scrolls with `behavior: "auto"` under it (`README.md:31`). 44px phone target unchanged (`credit-tips.tsx:84`).
- [🟡] **Disclosure semantics and an unmounted panel.** Call 7 (`README.md:32`) puts `aria-controls` on the ⓘ. The tip is unmounted while closed (`credit-tips.tsx:95`), so a closed ⓘ would point at an id that is not in the document. The export guides list avoids this by keeping panels mounted with `hidden` (`bring.tsx:93`, pinned by `bring.test.tsx:31`). See clarification 3.
- [🟡] **Two scrolls in one effect.** The anchor `scrollBy` (call 5) and the into-view scroll (call 6) run in the same layout effect (`READINESS.md:7-8`). The anchor correction must be instant, or the pressed row visibly jumps and slides back. See clarification 6.
- [✅] Analytics: none today on the tips, none asked for.

### ⏰ Drift from reality

- [✅] `credit-tips.tsx` on origin/main matches the "shipped" side of the drawn diff line for line (`tips-variants.diff:19,29` against `credit-tips.tsx:65,99`). `credits.tsx` and `landing.tsx` changes in the diff are render-harness only (`force`, `v`, exporting `Close`) and are not to be built.
- [✅] The export guides precedent holds: `bring.tsx` opens steps under the row and has no outside-press close.

### 📝 Decision log

- [✅] Calls 1 to 8 are numbered and Hugh's approval is dated (`README.md:5`). The addendum's own self-assessed `READINESS.md` lists the build.
- [🟡] The self-assessment and the drawn diff disagree on `pointer-events-none` and do not scope the animation. Settled by clarifications 1 and the codebase-fit line above.

## Gaps requiring a Design round-trip (Orange/Red only)

None.

## Eng-side clarifications (Yellow only)

1. **Animation phone only.** Scope the entrance to below 768 with a rule in `globals.css` (e.g. `@media (max-width: 767.98px) { .anim-menu-in-phone { animation: menu-in … } }`, listed in the reduced-motion block beside `.anim-menu-in`), or apply `anim-menu-in` only when `useMinWidth` reads narrow. The desktop float stays without animation, per call 2.
2. **One width subscriber.** Use `useMinWidth("(min-width: 768px)")`. Its server snapshot is `false` (narrow), which is safe: every tip is closed on the server render. Tests mock `matchMedia` for each branch; the existing desktop suite runs under the wide mock unchanged.
3. **`aria-controls` only while open.** Below 768 set `aria-controls` and `aria-expanded` on the ⓘ, drop `role="tooltip"` and `aria-describedby`, and emit `aria-controls` only while the tip is mounted. This keeps the shipped "out of the document while closed" behavior and the desktop DOM unchanged. (Keeping it mounted with `hidden`, as `bring.tsx` does, is the alternative; it changes the desktop DOM, so it is not taken.)
4. **Mouse below 768.** Hover keeps opening an unpinned in-flow tip, with `pointer-events-none`, closing on leave, as shipped. The ⓘ sits above its tip, so opening it never moves the hovered ⓘ (no open/close loop). Only a press runs the call 5/6 scrolls.
5. **Keyboard focus below 768.** Focus opens the in-flow tip as today. The into-view scroll (call 6) runs for it too, so a keyboard reader sees the whole tip; the anchor scroll (call 5) runs only when another tip closed above it.
6. **Scroll order.** In the layout effect: first `scrollBy` the anchor difference with `behavior: "instant"` (`"auto"`), then measure the tip and run the into-view scroll smooth (or `"auto"` under reduced motion). Closing never scrolls. Both run only when `useMinWidth` reads narrow.

## Decisions inherited

- Hugh approved A4 R1 on 2026-11-12: below 768 the tip opens in the flow, rows below move at once, no drop shadow, no height animation (`README.md:26-28`).
- 768 and up stay exactly as shipped, including outside-press close (`README.md:27,29`).
- Below 768 a press elsewhere no longer closes the tip; Escape and the same ⓘ do (`README.md:29`).
- One tip open at a time; no ✕ or extra control; no bottom sheet (`README.md:33`, `STATES-phone-tips.md:20`).
- No copy, token or data change. Wording, if it ever moves, goes to `/copy-review`.
