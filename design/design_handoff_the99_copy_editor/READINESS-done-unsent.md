# READINESS: copy editor addendum, unsent edits on Done (#3409)

**Verdict:** Yellow
**Audited:** 2026-11-27 (cold read, read-only; code on origin/main)
**Related ticket(s):** #3409 (ADDENDUM-done-unsent.md), copy editor handoff README C1 to C5
**Plan PR target:** TBD (docs/superpowers/plans/)

## Summary

The addendum is buildable as drawn. It covers phone and desktop for all three states (13a, 13b, 13c), uses real tokens, and its strings are clean (US English, no em dash). Nothing needs a Design round-trip. The engineering work is bigger than the "suggested" note admits: the edits and submission state live inside the lazy `Overlay`, which renders nothing while the mode is off, and the tray's backdrop contradicts "page stays usable". Those are eng-side decisions, resolved from the drawn patterns below.

## Per-dimension findings

### Scope clarity
- [✅] One state, options A to C weighed, non-goals clear (Done never asks, never sends; empty tray unchanged).
- [🟡] D1 "closes on the next page view" is undefined for Next client navigation. Decide: close on `usePathname()` change.

### State coverage
- [✅] 13a, 13b and 13c drawn at phone 390 and desktop 1300 (six boards plus Done-Main). D4 names Submitting and Failed.
- [🟡] Door during Submitting: edits are still held until `ok`, so the count would read "3 edits waiting" while the PR is being opened. D4 is silent. Decide: keep the count (edits are not yet sent), the tray already says "Opening pull request…".
- [🟡] Failed then Done: D4 says Failed edits count as waiting, so the notice appears with "not sent". Its Open pull request retries from `failed`; no separate Try again label needed.
- [🟡] Notice title, count, and tray all must change live when edits change in another tab (storage event, D2). The notice and tray count should follow, or the three disagree.

### Data contract
- [🟡] Count source. The addendum says to read `localStorage["the99.copyEdits"]` for length only. `readEdits()` (`src/lib/copy-editor/edits.ts:13`) filters malformed entries, so a raw length can exceed the tray's count. Use the same filter (it is a pure function; the import weight is `validate.mts`, so move `readEdits` and the key to a light module, or re-implement the 3-field filter).
- [✅] "Submission in flight" is `sub.phase === "submitting"` in `use-submission.ts`; the `sent` phase leaves edits empty, so the count clears on its own.

### Codebase fit
- [🟡] Edits state (`overlay.tsx:57`), `useSubmission` (`overlay.tsx:66`) and `trayOpen` (`overlay.tsx:58`) are inside `Overlay`, which is mounted only after the first start (`provider.tsx:55`) and returns null when `!on` (`overlay.tsx:157`). Done's `stop()` is in the provider and cannot see `sub`. Decide: lift edits, `sub` and tray open into the provider (or one store with `useSyncExternalStore`), and render notice and tray from it outside the `on` gate. The addendum's "outside its `on` gate" note is right but understates this.
- [🟡] Rows load only while `on` (`overlay.tsx:92`). A mode-off tray needs rows for `Edit`, the stale and unknown reasons (`tray.tsx:97`). The module cache `loaded` is warm after a visit that turned the mode on, so the notice path works; also load rows when the tray opens mode-off to be safe.
- [🟡] Tray backdrop `fixed inset-0 z-[62]` with `onClick={onClose}` (`tray.tsx:75`) sits over the whole page on desktop (transparent) and dims it on phone. D3 says the page stays usable beside the panel on desktop. Decide: mode-off tray gets `pointer-events-none` on the desktop backdrop (panel stays interactive); phone keeps its sheet and dim as C4 draws it. Closing by clicking outside is then desktop-lost; Esc and ✕ remain.
- [🟡] Phone notice "8px under the header" needs the same measure as the bar (`headerBottom()`, `overlay.tsx:44`, `data-shell-nav` slide), which only runs while `on` (`overlay.tsx:98`). Reuse the function and an rAF scroll listener while the notice is up, or the notice detaches when the header scrolls away.
- [🟡] Door changes (`provider.tsx:57`, `provider.tsx:75`): add the chip to the pill (the pill's text already feeds the accessible name, so `doorLabel` is needed only on the phone pencil, which uses a fixed `aria-label` today at line 76), move the phone staging dot from top-right to the foot, add the badge. Accessible name on the phone pencil must also keep `aria-pressed`.
- [🟡] Esc. The overlay's key handler (`overlay.tsx:131`) calls `stop()` when no target; the notice must then open after that, and a second Esc closes the notice. The notice's own Esc must not also reach the overlay (the overlay is off, so its listener is gone). The tray's Esc (`tray.tsx:44`) is `defaultPrevented`-aware; the notice should follow it.
- [🟡] Focus. `stop()` focuses the door in a rAF (`provider.tsx:36`); the notice must not steal it (D1, no focus move). The mode-off tray does take focus (`tray.tsx:38`), as C4 does today, and returns it to the opener, which for the notice's buttons is a node about to unmount. Decide: fall back to the door.
- [✅] Strings are new keys in `src/lib/copy/copy-editor.ts`; add via copy-review. `waiting.send` repeats `tray.submit` and may alias it.

### Cross-cutting
- [✅] `role="status"`, polite, no focus move, never blocks (D1).
- [🟡] The notice body says "or clear them" but the notice has no Clear control; Clear all lives in the tray via Review. Acceptable, say so in the plan.
- [✅] No analytics, no server work. Gate unchanged (`copyEditorOpen`); nothing reaches a player.

### Drift from reality
- [✅] Files named exist as named: `provider.tsx`, `overlay.tsx`, `tray.tsx`, `use-submission.ts`, `copy-editor.ts`. README Q2 to Q4 and C5 match the shipped behavior.
- [🟡] STATES.md rows 13a to 13c and the Addendum line are added in the PR. README line 39 ("Done gives the page back") and C2 (door) do not point at the addendum; add a pointer in the build PR.

### Decision log
- [✅] Pick and rejected options recorded with reasons; "Approved by Hugh 2026-11-27 (R1)" is stated. Locked versus suggested is clear ("For engineering (suggested)").

## Gaps requiring a Design round-trip

None.

## Eng-side clarifications

1. Lift edits, `sub` and tray-open into the provider (or a shared store). Notice and tray render outside the `on` gate.
2. Count uses the filtered `readEdits` logic (same count as the tray), listens to the `storage` event, and updates on `stop()`.
3. Notice closes on pathname change, ✕, Esc, either button.
4. Mode-off desktop tray: backdrop does not intercept clicks; phone keeps the sheet and dim.
5. Phone notice pins under the live header bottom, as the bar does.
6. Door keeps the count while Submitting; Failed counts as waiting.
7. Restore focus to the door when the notice's buttons unmount.
8. Load rows when the tray opens mode-off.
9. Copy goes through copy-review; no em dash and US English already hold.
10. Probe: `scripts/probe-copy-editor.mjs` gains Done-with-edits, door count at both widths, and Open pull request from the notice (submit mocked).

## Notes on the PR

- `scratch-gen/gen_done.py`: the folder already ships `gen.py`, `gen_ins.py` and `HOW.md` on main, so the file follows precedent and does not conflict. It is a scratch generator, not shipped code, and `design/` is reference only. Either keep it for parity or drop it; dropping loses nothing the boards and addendum do not carry. Recommendation: drop it from the PR (the addendum references it only in the last "for engineering" line, which should go with it), or keep it if the generator is the only way Design regenerates the boards.
- No em dashes in the addendum, `copy strings.ts` additions, or the six boards.

## Decisions inherited

- Done never asks and never sends; Done with an empty tray is unchanged.
- The notice never takes focus or blocks the page; the door carries the count on every page.
- `Open pull request` from the notice goes straight to C5 Submitting with the mode off; Review opens C4 mode-off; closing the tray leaves the mode off.
- README C1 to C5 and Q2 to Q4 stand.
