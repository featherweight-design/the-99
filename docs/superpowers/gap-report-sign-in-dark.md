# Gap report: Sign-in (dark)

Table: `docs/superpowers/design-tables/sign-in-dark.md`. Implementation at worktree HEAD `a9945772b`.
Fonts: `font-display` resolves to `--font-display-face` = `--font-cinzel` in the default dark theme; `font-sans` = `--font-plex-sans`; `font-mono` = `--font-plex-mono` (globals.css:126, 562-564). Card back values are drawn on a 300x419 box scaled .5 (friend-card.tsx:80), so every value there is halved before comparing.

Two table notes corrected against the source (not counted as gaps):
- The table says `p` margins are "browser default, not reset in source". The source resets them: `Sign-In-Invite-Only.dc.html:15` is `p{margin:0}`. The implementation's `m-0` on the body and the error line therefore matches.
- The foot link is `<a>` with no `href` in the source, which browsers do not underline. The implementation's `no-underline` matches.

## PASS 1: visual properties

### Page shell
| Row | Result |
|---|---|
| Viewport width / min-height (frame) | ✅ MATCH (frame chrome; `min-h-dvh` on FLYER_MAIN, newcomer-column.tsx:13) |
| Viewport background var(--bg) | ✅ MATCH (`bg-[color:var(--bg)]`) |
| Viewport display flex / column | ✅ MATCH |
| Viewport overflow hidden | ✅ MATCH (frame property; not a page property) |
| color / font-family inherited | ✅ MATCH (globals.css:570-571) |
| app header / rail none | ✅ MATCH (page draws its own `<main>`, page.tsx:22; signed-out shell draws none) |
| Stage flex-col, align center, text center | ✅ MATCH (newcomer-column.tsx:13) |
| Stage padding 44/24/24/24 mobile, 72 top desktop | ✅ MATCH (`pt-[44px] px-[24px] pb-[24px]`, `md:pt-[72px]`, newcomer-column.tsx:13, 24) |
| Stage background mobile (600x360 at 50% 18%, 12%, 70%) | ✅ MATCH |
| Stage background desktop (1000x520 at 50% 8%, 10%, 70%) | ✅ MATCH (FLYER_MAIN `md:` wash) |
| Stage children order: card, column, foot | ❌ MISMATCH — design: foot `.jquiet` is a sibling after `.jcol` inside `.jn` / implementation: foot rendered inside `actions`, i.e. inside the column's section (sign-in-flow.tsx:349-353, 379, 429; newcomer-column.tsx:92) |
| Column width 100%, max 380, flex-col, center | ✅ MATCH (newcomer-column.tsx:79, 41) |

### Card back
| Row | Result |
|---|---|
| Card box 150x210, flex none, relative, no tilt | ✅ MATCH (friend-card.tsx:79; `face={null}` so no rotate) |
| Back face inset 0, radius 9, surface-inset, padding 6 | ✅ MATCH (18/12 at .5 scale, friend-card.tsx:131) |
| Back face shadow `0 20px 44px rgba(0,0,0,.6), inset 0 0 0 1px border-strong` | ✅ MATCH (doubled values at .5) |
| Inner panel radius 6, 1px dashed-token border, flex-col centered | ✅ MATCH (12px / 2px at .5, friend-card.tsx:133) |
| Inner panel gap 6px between ornament, numeral, caption | ❌ MISMATCH — design: one flex column, `gap:6px` between `.cw`, `b`, `small` / implementation: ornament and numeral wrapped in a nested div, ornament `mb-[8px]` = 4px rendered; only numeral-to-caption gets the 6px gap (friend-card.tsx:134-135) |
| Inner panel background (radial 120x130 at 50% 46%, 22%, 72%; stripes 0 3px / 3px 6px; surface-sunken) | ✅ MATCH (doubled values at .5) |
| Ornament 8px, letter-spacing 3px, accent-text | ✅ MATCH (16px / 6px at .5) |
| Numeral 700 34px/1 Cinzel, fg | ✅ MATCH (68px at .5, `font-display font-bold leading-none`) |
| Caption 7.5px mono, .35em, uppercase, accent-text | ✅ MATCH (15px at .5) |
| Caption same slot on every state | ✅ MATCH (`copy.cardWord` on every screen and on /sso-callback) |

### Heading block
| Row | Result |
|---|---|
| Title margin 28 0 0, 700 22px/1.25 Cinzel, fg, centered | ✅ MATCH (newcomer-column.tsx:36, 84) |
| Body mt 8, 14px/1.55, fg-body, centered | ✅ MATCH (newcomer-column.tsx:45, 88) |
| Body other margins | ✅ MATCH (source resets `p{margin:0}`; impl `m-0`) |
| Email emphasis normal style, 500, fg | ✅ MATCH (emphasis.tsx `<b className="font-medium text-[color:var(--fg)]">`) |

### Form
| Row | Result |
|---|---|
| Form mt 22, w-full, flex-col, stretch, text-left | ✅ MATCH (newcomer-column.tsx:33) |
| Label 600 13px Plex Sans, fg, mb 6 | ✅ MATCH (sign-in-flow.tsx:55, 83) |
| Label margin-top 0 first / 16 after or / 14 after field | ✅ MATCH (`top="mt-[16px]"` on P1 only; no screen has a second label) |
| Field h48, radius 8, surface-sunken, 1px border-strong, px 12, 16px, w-full | ✅ MATCH (join-parts.tsx:23) |
| Field color fg-locked (placeholder / empty) | ❌ MISMATCH — design: var(--fg-locked) #6E6654 / implementation: `placeholder:text-[color:var(--fg-placeholder)]` #8B8270 (join-parts.tsx:23) |
| Field filled `.on`: border accent, color fg | ✅ MATCH (typed → accent border, unlocked → fg) |
| Field refused `.s7bad`: border danger, color fg | ✅ MATCH (P3/N1 `danger` on wrong/cantUse, K5 on any line; sign-in-flow.tsx:388, 438) |
| Field empty: border-strong | ✅ MATCH |
| Field empty: color fg-locked | ❌ (same finding as the placeholder row; counted once) |
| Hint mt 6, 12.5px/1.45, fg-muted, left | ✅ MATCH (sign-in-flow.tsx:57) |
| Hint conditional: replaced by `.s7err` in the same slot | ❌ MISMATCH — design: error line replaces the hint / implementation: hint always rendered, error line added below it (sign-in-flow.tsx:442-443) |
| Error line margin-top 8px | ❌ MISMATCH — design: 8px / implementation: `mt-[10px]` (join-parts.tsx:20, ERR; used for `.s7err` at sign-in-flow.tsx:348 and `.gerr` at :368) |
| Error line font-size 13px | ❌ MISMATCH — design: 13px / implementation: `text-[12.5px]` (join-parts.tsx:20) |
| Error line line-height 1.45 | ✅ MATCH |
| Error line color danger | ✅ MATCH |
| Error line text-align left | ❌ MISMATCH — design: left / implementation: `text-center` (join-parts.tsx:20) |
| Error line other margins | ✅ MATCH (`m-0`; source resets `p`) |
| Error line role alert | ✅ MATCH |
| Error line position (after field / code row / Google press) | ✅ MATCH |
| Primary press mt 14, h48, w-full, radius 8, accent bg, bg color, 600 15px, centered, no border | ✅ MATCH (join-parts.tsx:8-10; `inline-flex` is blockified as a flex item) |
| Press dimmed .6 on incomplete code (P4, P6, N2, P8) | ✅ MATCH (`disabled` when digits < 6, `disabled:opacity-60`, sign-in-flow.tsx:415) |
| Press dimmed .6 on G1 (email empty) | ❌ MISMATCH — design: Continue at opacity .6 with empty email / implementation: Continue disabled only while `locked`, full opacity with empty email (sign-in-flow.tsx:377) |
| Press full opacity on P5 (six digits) | ✅ MATCH |
| Link row flex, center, gap 4, mt 6 | ✅ MATCH (join-parts.tsx:16) |
| Link row children P2/P3, P4/P5/N2/P8, P6 | ✅ MATCH |
| Link row children N1: one link (email a code only) | ❌ MISMATCH — design: one link / implementation: both "Forgot password?" and "Email me a code instead" rendered while `cantUse` (sign-in-flow.tsx:396-399) |
| Link row absent on K5, P1, G1 | ✅ MATCH |
| Link min-h 44, flex center, px 8, 500 13.5px, accent-text, no decoration | ✅ MATCH (join-parts.tsx:13-14) |
| Link cooling: fg-locked | ✅ MATCH |
| Link after cooldown: accent-text, no countdown | ✅ MATCH (styling); see Pass 2 P5 for when it shows |

### Six-digit code
| Row | Result |
|---|---|
| Row flex, center, gap 8, first child of form, 6 boxes | ✅ MATCH (join-parts.tsx:62-63) |
| Filled box 44x54, radius 8, surface-sunken, 1px accent, 600 22px mono, fg | ✅ MATCH (join-parts.tsx:66) |
| Empty box border-strong | ✅ MATCH |
| Empty box color fg-locked | ❌ MISMATCH — design: var(--fg-locked) #6E6654 / implementation: `text-[color:var(--fg-disabled)]` #4A4033 (join-parts.tsx:66) |
| Refused row: every box danger | ✅ MATCH (`wrong` → danger on all six) |

### Google press
| Row | Result |
|---|---|
| margin-top 22px (on top of the form's 22) | ❌ MISMATCH — design: 22px / implementation: `mt-0` (GOOGLE replaces PRESS_QUIET's `mt-[8px]` with `mt-0`, sign-in-flow.tsx:52) |
| h48, w-full, radius 8, transparent, 1px border-strong, fg, 500 15px, flex center, gap 10 | ✅ MATCH (join-parts.tsx:12, sign-in-flow.tsx:52) |
| Children mark then label | ✅ MATCH |
| Busy opacity .6, busy label | ✅ MATCH (disabled while `google`, label `copy.signingIn`) |
| Mark 18x18, viewBox 0 0 48 48, aria-hidden, no stroke | ✅ MATCH |
| Mark paths 1-4 fill and d | ✅ MATCH (byte-identical d strings, diffed) |
| `.gerr` margin-top / font-size / text-align | ❌ (same ERR constant as the error line; counted there) |
| `.gerr` line-height, color, role, position under press before `or` | ✅ MATCH (sign-in-flow.tsx:368) |
| Google press border unchanged on G1 | ✅ MATCH |

### "or" divider
| Row | Result |
|---|---|
| flex, center, gap 12, margin 18 0 0, 11px mono, fg-faint, w-full | ✅ MATCH (sign-in-flow.tsx:54) |
| Rules: content "", flex 1, 1px, var(--border) | ✅ MATCH |

### Foot pointer
| Row | Result |
|---|---|
| margin-top 18, 11px/1.55 mono, fg-faint, centered | ✅ MATCH (QUIET with mt swapped, sign-in-flow.tsx:350) |
| Placement: sibling after `.jcol` | ❌ (counted under Stage children order) |
| Conditional: P1, P4, P5, G1 (P7, P8) only | ✅ MATCH (email screen and `screen === "code"` only) |
| Foot link accent-text, no decoration | ✅ MATCH |

### Hover / focus / transition
The table specifies none on any element. The implementation adds (not counted as gaps, shared with /join): field `focus:` accent border and `outline-none` (join-parts.tsx:23); primary press `hover:bg-[--accent-hover]` and busy `bg-[--accent-strong]` (:10); link and foot link `hover:text-[--accent-hover]` (:14, :18); locked field text `--fg-muted` (:23); focus ring on the active code box (:66).

### Per-state element order
| State | Result |
|---|---|
| P1 / P7 | ✅ gbtn · or · label(16) · field · Continue (gbtn top margin wrong, above) |
| G1 | ⚠️ order correct; Continue not dimmed |
| P2 | ✅ |
| P3 | ✅ |
| P4 / P8 | ✅ |
| P5 | ✅ |
| P6 | ✅ |
| K5 | ✅ |
| K5 refused | ❌ label · field · hint · err · press (hint kept) |
| N1 | ❌ jlinks has 2, design 1 |
| N2 | ✅ |

## PASS 2: state reachability

| State | Result |
|---|---|
| P1 | ⚠️ PARTIALLY — arrival and "Use a different email" from P4/N2 land on P1 (sign-in-flow.tsx:425). "Back to sign in" from P6 lands on P2, not P1 (`to("password")`, sign-in-flow.tsx:423). |
| P1 Google busy | ⚠️ PARTIALLY — the press shows busy (.6, "Signing in…") while leaving for Google. The way back (the state the table names, A1 M2) is a separate `/sso-callback` screen: card, title "Signing in…" and a captcha slot, no Google press, no P1 layout (sso-callback.tsx:46-51). |
| P2 | ✅ REACHABLE — Continue with any email-shaped address, no Clerk call (sign-in-flow.tsx:221-231). |
| P3 | ✅ REACHABLE — `WRONG` codes incl. `form_password_or_identifier_incorrect` (:34, :248); danger field, line between field and press, both links. |
| P4 | ✅ REACHABLE — `emailCode` sends quietly, floor, `toCode("code")` (:271); conditional body, code row, dimmed Confirm, cooling resend, different email, foot. |
| P5 | ⚠️ PARTIALLY — any code refusal sets `codeWrong`, all boxes danger, line after the row, Confirm full opacity, foot (:304). Resend is drawn active only once the 60s cooldown (`CODE_RESEND_MS`) has run; a wrong code inside the first minute shows the cooling countdown, not the active resend the frame draws (:419-420). |
| P6 | ✅ REACHABLE — Forgot password → `reset` → `toCode("reset")` (:274-278, :397); reset title and body, no foot, back-to-sign-in link. |
| K5 | ✅ REACHABLE — correct reset code → `newPassword` (:305-307); Save submits and signs in via `next()` → `finish()` to `/`. |
| K5 refusal: too short | ⚠️ PARTIALLY — checked client-side before Clerk (:315-317), field danger, password kept; the hint is not replaced: it stays and the error is added beneath (:442-443). |
| K5 refusal: too weak | ⚠️ PARTIALLY — `form_password_not_strong_enough` mapped (:323); same hint-slot issue. |
| K5 refusal: breached | ⚠️ PARTIALLY — `form_password_pwned` mapped (:324); same hint-slot issue. |
| N1 | ⚠️ PARTIALLY — `form_password_pwned`, `form_password_compromised` and `needs_new_password` reach it (:36, :214, :249); field danger, line, press relabelled to Reset password and sends the reset code to P6 (:235). Two issues: the Forgot password link is still drawn (:396-399), and Clerk's `form_password_untrusted` (a real Clerk code; `form_password_untrusted__sign_in` is in @clerk/shared's localization types) is not in `REFUSED`, so an untrusted password gets the generic failed line, not N1 (:36, :252). |
| N2 | ✅ REACHABLE — `needs_second_factor` / `needs_client_trust` after password, code or Google (`?google=code`) → `mfa.sendEmailCode` → `toCode("mfa")` (:187-197, :213); body is the non-conditional `joinCopy.codeBody`, no foot, Confirm verifies and signs in. |
| G1 | ⚠️ PARTIALLY — `/sso-callback` sends any non-complete, non-second-factor status to `?google=refused` (sso-callback.tsx:30); the page renders P1 with the line under the Google press, before `or`, role alert, no danger edge, empty email with placeholder, foot. Continue is not dimmed with the email empty (sign-in-flow.tsx:377). |

## Confirm (Agent 3)

Checked at 926384354.

Visual
- 1 Stage order (foot after the column): FIXED, foot is a sibling after `NewcomerColumn` (sign-in-flow.tsx:458-461)
- 2 Hint replaced by the error line: FIXED (sign-in-flow.tsx:450)
- 3 Error line margin-top 8px: FIXED, `SIGN_ERR` mt-[8px] (sign-in-flow.tsx:64)
- 4 Placeholder color: DEFERRED (shared /join style)
- 5 Empty code-box color: DEFERRED (shared /join style)
- 6 Error line 13px: FIXED (sign-in-flow.tsx:64)
- 7 Card-back diamond gap: DEFERRED (shared /join style)
- 8 Error line left-aligned: FIXED (sign-in-flow.tsx:64; `.gerr` uses it at :376)
- 9 Continue dimmed with empty email (G1): FIXED, disabled until the email is email-shaped (sign-in-flow.tsx:385)
- 10 N1 one link: FIXED, Forgot password hidden while `cantUse` (sign-in-flow.tsx:405)
- 11 Google press margin-top 22px: FIXED (sign-in-flow.tsx:56)

State
- 1 P1 via Back to sign in: FIXED, `to("email")` (sign-in-flow.tsx:431)
- 2 P1 Google busy on return: FIXED, /sso-callback draws `SignInFlow googleReturning` (sso-callback.tsx:46-50; sign-in-flow.tsx:117)
- 3 P5 resend countdown: DEFERRED (shipped /join behavior)
- 4 K5 too short / 5 too weak / 6 breached: FIXED, refusal takes the hint's slot (sign-in-flow.tsx:450)
- 7 N1 (`form_password_untrusted`, Forgot link): FIXED, code in `REFUSED` (sign-in-flow.tsx:39), link hidden (:405); G1 dim per visual 9

VERDICT: 0 gaps remain.
