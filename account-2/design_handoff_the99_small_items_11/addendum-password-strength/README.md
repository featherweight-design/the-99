# Small items 11 · addendum: live password strength (R1)

**Account 2, 2026-11-15. Status: R1 drawn and awaiting Hugh's review.**
Brief: `docs/superpowers/design-briefs/2026-11-15-password-strength.md` (branch `brief/password-strength`).
Extends A2's Q1 (sign-up by invitation) and K5 (choose a new password). See `Sign-In.dc.html`, `Sign-In-Methods.dc.html` and `Sign-In-Invite-Only.dc.html` in the parent folder.

## Boards

| Board | What it shows |
|---|---|
| `Main.dc.html` | Q1 at 390: empty, under 8, weak, good, strong, then Q2, Q3 and Q4 after the press, plus what ships today |
| `K5.dc.html` | K5 at 390, with the same states |
| `Desktop.dc.html` | Q1 and K5 at 1280×800, all eight states |
| `Themes.dc.html` | The part in all six themes: empty, weak, good, strong, and Q4 |
| `Spec.dc.html` | Calls, the states table, gaps for engineering, and the new words |

Every frame renders the shipped components (FriendCard, NewcomerColumn, Field, HINT, SIGN_ERR, press, OR, GOOGLE, LegalLinks) with the shipped CSS. The proposal sits in the hint's slot; its code is `scratch-gen/proposal/password-strength.tsx`, for reference only.

## Calls

1. **Form.** A three-segment meter and a live line. The meter reuses the landing demo's segment (`demo.tsx`: 4px tall, 2px radius, `--border-strong` until lit) and is `aria-hidden`. The line carries the meaning, and each line starts with its word.
2. **Placement.** The meter goes in the hint's slot, 8px under the field, and the line goes 6px under the meter. Below 8 characters the line stays the shipped hint, *At least 8 characters.*, with no count. The meter is drawn from the empty state on, so nothing shifts when typing starts.
3. **Steps.** Under 8 gives no estimate and lights 0 segments. Below Clerk's level 2 is **Weak** (1 segment, `--fg-muted`). Level 2 or 3 is **Good** (2 segments, `--accent`). Level 4 is **Strong** (3 segments, `--accent`). Where the estimator and Clerk could disagree, it errs weak.
4. **Colour.** Weak never uses `--danger` before a press. Red is only for Clerk's answer.
5. **Hand-off.** After the press, Q2 to Q4 replace the line in the same slot, as shipped (`role="alert"`, danger edge, typed password kept), and the meter empties. The next keystroke clears the refusal, as today, and the live line returns at the current step.
6. **The press never locks.** Make my account and Save and sign in stay pressable at every step. Clerk is the judge.
7. **Screen readers.** The line is `aria-live="polite"` and named in the field's `aria-describedby`. Its text changes only when the step changes, and it updates once typing pauses for 1s.
8. **Busy.** Q5's sign-up hides the hint while pressed, and the meter and line hide with it. K5 keeps them, as it keeps its hint today.
9. **Out of scope.** K2 (Enter your password) gets no meter.

## Gaps for engineering

- **G1 Estimator.** A client estimator that agrees with Clerk's level 2 (recommended: `@zxcvbn-ts/core` with the common and English packs, loaded lazily on first focus). Confirm Clerk's level 2 mapping against Clerk with a fixed list.
- **G2 `Field`.** `aria-describedby` currently points only at a refusal. It also needs to point at `password-strength`.
- **G3 Agreement test.** One test per step boundary, plus one asserting that a password Clerk refuses as weak never shows Good or Strong.

## Copy (DRAFT for /copy-review)

See `password-strength · copy strings.ts`: `weak` "Weak. Try a longer one, or a few words together.", `good` "Good. Longer is stronger.", `strong` "Strong.". `short` reuses the shipped hint.

## Regenerating

`scratch-gen/`: copy `render.tsx`, `run.cjs`, `page.mjs`, `css.mjs`, `shoot.mjs` and `crop.mjs` into `gen/` in a scratch copy of main (drop the `@fwd-stack/*` deps, use a plain tsconfig, run `pnpm install --ignore-scripts`, symlink postcss), and copy `proposal/` into `src/components/sign-in/` and `src/lib/copy/`. Then run `tsx gen/run.cjs`, `node gen/css.mjs`, `node gen/shoot.mjs amonkhet <name@p|d>…` and `node gen/crop.mjs`. Convert the shots to webp in `art/`. `python3 ps.py <out>` writes the boards (`blob` for the canvas's `/_blob` urls).
