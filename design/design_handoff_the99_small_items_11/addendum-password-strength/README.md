# Small items 11 · addendum: live password strength (R1c)

**Account 2, 2026-11-15. Status: R1c drawn and awaiting Hugh's review.** R1c adds guidance that shows from the empty field, after Hugh's notes asking for more instruction than "8 characters" and something visual from the start.
Brief: `docs/superpowers/design-briefs/2026-11-15-password-strength.md` (branch `brief/password-strength`).
This extends A2's Q1 (sign-up by invitation) and K5 (choose a new password). See `Sign-In.dc.html`, `Sign-In-Methods.dc.html` and `Sign-In-Invite-Only.dc.html` in the parent folder.

## Boards

| Board | What it shows |
|---|---|
| `Main.dc.html` | Q1 at 390: empty, under 8, weak, good, strong; weak by which guide is open (W·c, W·d, W·all); Q2, Q3 and Q4 after the press; what ships today |
| `K5.dc.html` | K5 at 390, with the same states |
| `Desktop.dc.html` | Q1 and K5 at 1280×800, all eight states |
| `Themes.dc.html` | The panel in all six themes: empty, weak, good, strong, and Q4 |
| `Spec.dc.html` | Calls, the states table, gaps for engineering, and the new words |

Every frame is the shipped components (FriendCard, NewcomerColumn, Field, SIGN_ERR, press, OR, GOOGLE, LegalLinks) rendered with the shipped CSS. The proposal sits where the hint is now. Its code is in `scratch-gen/proposal/password-strength.tsx` (`StrengthPanel`), for reference only.

## Calls

1. **Guides from the empty field.** Three rows show before any typing and tick live: *8 or more characters*, *A number or symbol*, *Not a common word, name or date*. They replace *At least 8 characters.* Each row has a 14px round mark: a ring in `--fg-faint`, then `--accent` with the checkbox's ✓ in `--bg`. The marks are round so they never read as boxes to press.
2. **The third guide keeps the ticks honest.** Clerk scores how guessable a password is; it doesn't check character types. *Summer2024!* and *password1* would tick length and number, and Clerk still refuses them. The third guide comes from the estimator: it ticks only at 8+ characters, and only when no dictionary word, name, date, run or repeat matched.
3. **The meter is the judge.** Three segments (the landing demo's 4px segment from `demo.tsx`) with the word at the end. Under 8 there's no word. Below Clerk's level 2 is *Weak* (1 segment, `--fg-muted`). Level 2 or 3 is *Good* (2 segments, `--accent`). Level 4 is *Strong* (3 segments). The guides don't add up to Good: only the estimator moves the meter, and it errs weak.
4. **Weak is quiet ink before any press.** Red is only for Clerk's answer.
5. **All ticked, still weak.** In that case only, one more line shows under the guides: *Still easy to guess. Try a longer one, or a few words together.*
6. **Hand-off to a refusal.** On the press, Q2 to Q4 show Clerk's line under the meter (the hint's slot, shipped `role="alert"`, danger edge). The meter empties and the guides stay below it. The next keystroke clears the refusal, as today.
7. **The press never locks.** It stays pressable whatever is ticked. A strong passphrase needs no symbol, and Clerk judges.
8. **Screen readers.** The guides are a real list, and each row is read as "done" or "not yet". One polite sr-only line says *Weak. 1 of 3 done.* only when the word or the count changes, once typing pauses for 1s.
9. **Busy.** Q5's sign-up hides the hint while it's busy, and the panel hides with it. K5 keeps it.
10. **Out of scope.** K2 (*Enter your password*) gets nothing. Note that the brief put a rules list out of scope; Hugh asked for visible guidance, so it's drawn here.

## Gaps for engineering

- **G1 Estimator.** A client estimator that agrees with Clerk's level 2 (recommended: `@zxcvbn-ts/core` with the common and English packs, loaded lazily on first focus). Its match sequence drives the third guide. Confirm the level 2 mapping against Clerk with a fixed list.
- **G2 `Field`.** Today `aria-describedby` points only at a refusal. It needs to name the guides list as well.
- **G3 Agreement tests.** One test per step boundary. One asserting that a password Clerk refuses as weak never shows Good or Strong. One asserting the third guide stays open for each common pattern.

## Copy (DRAFT for /copy-review)

The strings are in `password-strength · copy strings.ts`: the three guides, the words Weak, Good and Strong, `stillWeak`, and the sr-only announce line. `newPasswordHint` is retired on Q1 and K5.

## Regenerating

In `scratch-gen/`, copy `render.tsx`, `run.cjs`, `page.mjs`, `css.mjs`, `shoot.mjs` and `crop.mjs` into `gen/` in a scratch copy of main. Drop the `@fwd-stack/*` deps, use a plain tsconfig, run `pnpm install --ignore-scripts` and symlink postcss. Copy `proposal/` into `src/components/sign-in/` and `src/lib/copy/`.

Then run, in order:
1. `tsx gen/run.cjs`
2. `node gen/css.mjs`
3. `node gen/shoot.mjs amonkhet <name@p|d>…`
4. `node gen/crop.mjs`

Convert the shots to webp in `art/`. Finally, `python3 ps.py <out>` writes the boards.
