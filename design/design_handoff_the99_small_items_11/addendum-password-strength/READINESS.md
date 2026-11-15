# Readiness Review: Live password strength (small items 11 addendum, R1c)

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-14, against `origin/main` at `5a13f4073` (the design branch rebased onto it first)
**Related ticket(s):** PR #2969; brief `docs/superpowers/design-briefs/2026-11-15-password-strength.md` (branch `brief/password-strength`); parent handoff `design/design_handoff_the99_small_items_11/` (A2, Q1 and K5)
**Plan PR target:** TBD

## Summary

Buildable on today's code with eng-side clarifications. Both surfaces the handoff names exist as named: Q1's Password field and hint (`src/components/sign-up/sign-up-flow.tsx:323-332`) and K5's New password field and hint (`src/components/sign-in/sign-in-flow.tsx:444-452`), sharing `Field`, `HINT`, `SIGN_ERR`, `LINE_ID`, `MIN_PASSWORD` and `passwordLine` from `src/components/sign-in/auth-parts.tsx`. Every token the boards use exists in all six themes, phone and desktop are drawn for both surfaces, and all brief states (empty, under 8, weak, good, strong, Q2 to Q4) are drawn. The open items are engineering's: the estimator is a new dependency, the third guide's rule as written contradicts the drawn Strong frame (resolved below in favor of the frames), K5's network-failure line and an estimator that has not loaded yet are undrawn but settle from drawn patterns, and two screen-reader strings are missing from the copy file. Nothing needs a Design round. The README still reads "R1c drawn and awaiting Hugh's review": the plan PR should cite Hugh's go on R1c.

## Per-dimension findings

### 🗺️ Scope clarity

- ✅ Boundary stated: Q1 and K5 only; K2 (*Enter your password*) gets nothing (README call 10), matching the brief's out-of-scope list.
- 🟡 The brief put "password rules lists" out of scope; R1c draws three guides because Hugh asked for visible guidance (README call 10, Spec "For Hugh"). Recorded, but the status line says R1c awaits Hugh's review. The plan PR records his approval.
- ✅ Gaps for engineering logged (G1 estimator, G2 `Field` description, G3 agreement tests).

### 🎭 State coverage

- ✅ Q1 at 390: E, U, W, G, S, W·c, W·d, W·all, Q2, Q3, Q4, shipped (`Main.dc.html`). K5 at 390: the same minus the W variants (`K5.dc.html`). Desktop 1280 draws E through Q4 for both (`Desktop.dc.html`). Six themes: empty, weak, good, strong, Q4 (`Themes.dc.html`).
- ✅ Busy: Q1 hides the hint while `making` (`busy || leaving`, sign-up-flow.tsx:309, :332), so the panel hides with it, as README call 9 says. K5 keeps its hint while busy (sign-in-flow.tsx:451 has no busy check), as drawn.
- ✅ Refusal clears on the next keystroke today (`setLine(null)` in `onChange`, sign-up-flow.tsx:327, sign-in-flow.tsx:448), so the meter's return after Q2 to Q4 is reachable as drawn.
- ✅ K5's press is enabled on an empty field (`disabled={locked}`, sign-in-flow.tsx:452), so a press from E lands on Q2 (`savePassword`, :289-291): drawn. Q1's press is disabled until the password is non-empty (`ready`, sign-up-flow.tsx:306, :335): "the press never locks" holds, since it only waits for one character, as today.
- 🟡 **K5 network failure is undrawn.** On K5 any line, including `joinCopy.failed`, takes the hint's slot (sign-in-flow.tsx:297, :451) with the danger edge (`danger={!!line}`, :446). On Q1 the same failure goes under the press (J3, sign-up-flow.tsx:339), so Q1's panel is untouched. See clarification 3.
- 🟡 **Estimator not loaded yet, or its chunk failed** (it loads lazily on first focus, G1): undrawn. See clarification 2.
- 🟡 **Q1 with `googleMissing`** (a Google sign-up still short of a password, sign-up-flow.tsx:70, :305) draws the same Password field with a different body. Not drawn separately; same panel, same slot.

### 🔌 Data contract

- ✅ No server or schema change. Clerk stays the judge; refusals arrive as today through `passwordLine` (auth-parts.tsx:77-82): `form_password_pwned`, `form_password_not_strong_enough`, `form_password_length_too_short`.
- 🟡 **The estimator is new.** No zxcvbn package is in `package.json` or `src/` today. Clerk's own scorer is server-side and its dictionaries are not ours, so the agreement in G3 can only be shown against a fixed list of passwords with recorded Clerk answers (CI never calls Clerk). The meter must err weak on disagreement.
- 🟡 **Third guide rule vs the drawn Strong frame.** Call 2, Spec G1 and the reference `guidesOf` (`scratch-gen/proposal/password-strength.tsx`) tick *Not a common word, name or date* only when the estimator matched **no** dictionary word, name, date, run or repeat. The S frame (`art/ps-q1-strong-p.webp`, *copper fox casts ninety*) shows it ticked. A zxcvbn match sequence for a passphrase of English words is made of dictionary matches, so under the written rule that guide would stay open on every passphrase, including Strong ones. The frames are the intent (README call 7: "A strong passphrase needs no symbol"). See clarification 1.
- 🟡 W·d (*colin1994*) reads the name as common only if the estimator is given the player's inputs. Q1 has `name` and `email`; K5 has only the address (`body = copy.forEmail(address)`, sign-in-flow.tsx:442). See clarification 4.
- 🟡 `MIN_PASSWORD = 8` is hard-coded (auth-parts.tsx:12) and the new guide *8 or more characters* repeats it. The parent READINESS (small_items_11/READINESS.md:108) already noted the min should come from the instance's password settings. Keep the guide and the check reading one constant.

### 🧱 Codebase fit

- ✅ Tokens: `--border-strong`, `--fg-muted`, `--fg-faint`, `--accent`, `--accent-text`, `--fg-body`, `--bg`, `--danger` are each defined in all six theme blocks of `src/app/globals.css` (`[data-theme]` at :23, :130, :234, :302, :372, :440). No new token.
- ✅ The meter's segment is the landing demo's (`h-[4px] flex-1 rounded-[2px]` over `--border-strong`, lit `--accent`, `src/components/landing/demo/demo.tsx:73`). Reuse the class, do not copy a new one.
- ✅ The round mark borrows the checkbox's ring and tick (`--fg-faint` ring, `--accent` fill, `✓` in `--bg`, `src/components/ui/checkbox.tsx:35-36`) but is not a checkbox: no `type="checkbox"` or `role="checkbox"`, so `checkbox-usage.test.ts` is not tripped.
- ✅ Refusal line reuses shipped `SIGN_ERR` and `role="alert"` (sign-up-flow.tsx:271, sign-in-flow.tsx:357).
- 🟡 Copy: the draft strings have no em dash and are US English. Two strings the reference code hard-codes (`", done"`, `", not yet"`) are not in the copy file, and `announce` has no form for under 8, where there is no word. All go to `/copy-review` with the rest.
- 🟡 Retiring `newPasswordHint` (`src/lib/copy/join.ts:143`) touches tests that assert it: `sign-up-flow.test.tsx:103, :239, :267`, `sign-in-flow.test.tsx:498, :501, :503, :517`. Those move to the panel.

### ♿ Cross-cutting

- 🟡 G2 is accurate: `Field` sets `aria-describedby` only while a line shows (`aria-describedby={line ? LINE_ID : undefined}`, auth-parts.tsx:59). It needs to name the guides list always, and both ids while a refusal shows.
- 🟡 Live region: the reference code draws the list's sr-only states but no polite region and no 1s pause. Both are build work. When Q2 to Q4's `role="alert"` fires, the polite line should not speak in the same moment.
- ✅ Reduced motion: nothing animates in the boards or the reference code (no transition on segments or marks). If the build adds a fill transition, it goes under `motion-safe` like the existing `prefers-reduced-motion: no-preference` blocks (globals.css:1062).
- 🟡 Performance: zxcvbn's English and common packs are large; load them only on first focus (G1) and keep them out of the `/sign-in` and `/sign-up` first load.
- ✅ Analytics: none asked. A password never reaches PostHog or Sentry; keep the estimator's input out of any breadcrumb.

### ⏰ Drift from reality

- ✅ Rebased onto `origin/main` before the audit. Every file, component and constant named in the brief and README exists as named (above).
- 🟡 `K5.dc.html`'s header still reads "R1" while its frames are R1c (guides drawn, `art/ps-k5-q3-p.webp`). No build effect.

### 📝 Decision log

- ✅ Ten numbered calls in the README and Spec, with the states table.
- 🟡 Status line "awaiting Hugh's review": Hugh's go on R1c is what locks the calls.

## Gaps requiring a Design round-trip (Orange/Red only)

None.

## Eng-side clarifications (Yellow only)

1. **The third guide's rule (decided, following the drawn frames).** *Not a common word, name or date* ticks at 8+ characters when the estimator raises no warning for the password (the estimator's feedback warning is empty), not when it matched no pattern at all. That keeps every drawn frame true: S ticked, W·c (*password1*) and W·d (*colin1994*) open, W·all (*Kq#7mzpa*) ticked yet weak. G3 pins each drawn example. If the chosen estimator cannot reproduce them, that is the one point to raise with Design.
2. **Estimator not ready, or failed to load.** Follow U (under 8): length and number-or-symbol tick live, the meter shows 0 with no word, the third guide stays open. The press is never blocked; Clerk still judges. When the estimator arrives, the panel updates without the field losing focus.
3. **K5 network failure.** `joinCopy.failed` keeps today's place (the hint's slot under the meter, guides below, danger edge), as Q2 to Q4 draw it, but the meter keeps its reading: a failure is not a verdict on strength.
4. **Player inputs to the estimator.** Q1 passes the typed first name and the invited email (local part and whole). K5 passes the address. Nothing leaves the browser.
5. **Screen reader strings.** Add `done` and `not yet` to `strengthCopy`, and an under-8 announce (the count alone). All DRAFT for `/copy-review`.
6. **`Field` description (G2).** Extend `Field` to take extra description ids rather than adding a second password field component.
7. **Agreement tests (G3).** A fixed list with recorded Clerk answers. A password Clerk refused as weak never shows Good or Strong.
8. **`googleMissing` Q1** draws the same panel in the same slot. No separate frame needed.

## Decisions inherited

- Clerk stays the judge: Q2 to Q4 after the press win, in the hint's slot, with the danger edge. Breach is only known after the press; nothing claims breach safety, and the meter empties on a refusal.
- Weak uses `--fg-muted`, never `--danger`, before a press. Good and Strong use `--accent`.
- Three segments; no word under 8; Weak below Clerk's level 2, Good at 2 or 3, Strong at 4. Only the estimator moves the meter; the guides never add up to Good.
- Guides show from the empty field and replace *At least 8 characters.* on Q1 and K5.
- The press never locks on strength.
- Q1's panel hides while busy; K5's stays.
- K2 gets nothing. Phone and desktop ship together, in all six themes.
- `design/` is reference only: the build writes its own `StrengthPanel`; it never imports `scratch-gen/proposal/`.
