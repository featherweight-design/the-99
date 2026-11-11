# Gap Report — Sign-up by invitation (dark)

Table: `docs/superpowers/design-tables/sign-up-dark.md`. Checked against `src/components/sign-up/sign-up-flow.tsx`, `src/app/sign-up/new/page.tsx`, `src/components/sign-in/auth-parts.tsx`, `src/components/join/join-parts.tsx`, `src/components/join/newcomer-column.tsx` (Tailwind 4px base; vars from `src/app/globals.css`). Diff scope: `git diff sign-in-page...HEAD`.

## Visual

| Row | Board | Implementation | Result |
|---|---|---|---|
| Stage padding, wash (mobile) | 44/24/24, 600×360 at 50% 18%, 12% | `FLYER_MAIN` = `NEWCOMER_MAIN` (newcomer-column.tsx:13) | ✅ |
| Stage padding, wash (desktop) | 72 top, 1000×520 at 50% 8%, 10% | `FLYER_MAIN` `md:` (newcomer-column.tsx:22-24) | ✅ |
| Column max-width / align | 380 / center | `NewcomerColumn` join (newcomer-column.tsx:79, 41) | ✅ |
| Card Q (face up, tilted, 150×210) | `.cc.tilt .fc` | `FriendCard face={FACE} up compact` (sign-up-flow.tsx), tilt when face (friend-card.tsx:79) | ✅ |
| Card face slots | name, art, type + ◆, rules, footer | `FACE` name/type/rules/crown credit + mark | ✅ |
| Card R3 (back, straight, word) | `.bk`, word slot | `FriendCard face={null} word={backWord}` | ✅ |
| Title font, margin, color | Cinzel 700 22/1.25, mt 28, fg | `H1.join` + `font-display` | ✅ |
| Body font, margin, color, em | 14/1.55, mt 8, fg-body; em fg 500 | `BODY.join`; `Emphasis` `font-medium` fg | ✅ |
| Form margin / alignment | 22, left | `FORM` | ✅ |
| Label | 600 13 fg, mb 6 | `LABEL` + `mb-[6px]` | ✅ |
| Password label margin | 14 | `top="mt-[14px]"` | ✅ |
| Field box | 48, r 8, sunken, 1px strong, px 12, 16px | `field()` | ✅ |
| Field `.on` | accent edge, fg ink | `field(typed)` | ✅ |
| Field `.s7bad` | danger edge, fg ink | `field(.., danger)` | ✅ |
| Field locked in Q5 | plain `.jfld`: strong edge, fg-locked ink | `field(typed, locked)`: accent edge when typed, fg-muted ink | ❌ gap V1 |
| Field in R2 | `.on`: accent edge, fg ink | locked → fg-muted ink | ❌ gap V2 |
| Hint `.s7hint` | mt 6, 12.5/1.45, fg-muted, left | `HINT` | ✅ |
| Error `.s7err` | mt 8, 13/1.45, danger, left, in hint slot | `SIGN_ERR`, `passwordRefused ? errLine : hint` | ✅ |
| Press `.jbtn` | mt 14, 48, r 8, accent, bg ink, 600 15 | `press()` | ✅ |
| Press dimmed (Q6, R2) | opacity .6 | `disabled:opacity-60` | ✅ |
| Press busy (Q5) | J2 (shipped) | `press("busy")`: accent-strong | ✅ (J2 as shipped) |
| R3 Sign in `.jbtn.q` | outline: transparent, 1px strong, fg, 500, mt 14 | `press()`: filled accent, 600 | ❌ gap V3 |
| Rule `.or9` | mt 18, mono 11 fg-faint, 1px border lines, gap 12 | `OR` | ✅ |
| Google `.gbtn` | mt 22, 48, r 8, outline, 500 15, gap 10 | `GOOGLE` | ✅ |
| Google busy (R2) | opacity .6 | `disabled:opacity-60` | ✅ |
| Google hint `.ghint` | mt 6, 12.5/1.45, fg-muted, **left** | `HINT.replace("text-left","text-center")` | ❌ gap V4 |
| Legal `.s7legal` position | after `.jcol`, mt 14 | inside the form, mt 18 | ❌ gap V5 |
| Legal type | mono 11.5, gap 16, fg-muted, centered | `LegalLinks` | ✅ |
| Legal underline | offset 3px, link color | `LegalLinks`: offset 2px, decoration fg-faint | ❌ gap V6 (shared style) |
| Desktop parity (Q7, Q8, R5) | same column at 1300 | same tree, only `md:` stage changes | ✅ |

## State

| State | Board | Implementation | Result |
|---|---|---|---|
| Q1 | name + hint, password + hint, press, or, Google, hint, legal | ✅ REACHABLE — landing `start()` → `next(false)` → `make` | ✅ |
| Q2 | short password, before Clerk | ✅ `MIN_PASSWORD` check in `make()` | ✅ |
| Q3 | `form_password_not_strong_enough` | ✅ `passwordLine` | ✅ |
| Q4 | `form_password_pwned` | ✅ `passwordLine` (breach first) | ✅ |
| Q5 | fields locked, no password hint, no or/Google | password hint and or/Google/hint still drawn (Google disabled) | ❌ gap S1 |
| Q6 | only asked fields, Google body, no Google | ✅ `googleMissing` → `next(true)`; Google block hidden | ✅ |
| R2 | busy Google, checking label, press dimmed, **no Google hint** | Google hint still drawn under the busy press | ❌ gap S2 |
| R3 | one page for every refusal; Sign in to `/sign-in`; no legal | ✅ `setScreen("refused")` from landing, make and Google | ✅ |

## Confirm

Re-checked the flagged rows only.

- V1 Q5 fields locked: FIXED. `FIELD_LOCKED` (`field(false, "held")`: the strong edge with `--fg-locked` ink) through Field's new `look` prop while making (sign-up-flow.tsx `look`; auth-parts.tsx `Field.look`). Sign-in passes no `look`, so it is unchanged.
- V2 R2 fields `.on`: FIXED. `look` draws `field(typed, false, danger)` while Google is busy; the input stays read-only.
- V3 R3 outline Sign in: FIXED. `PRESS_SIGN_IN` = `PRESS_QUIET` at mt 14, sign-up only; `PRESS_QUIET` itself is untouched.
- V4 Google hint left: FIXED. Plain `HINT`.
- V5 Legal row: FIXED. `LegalLinks` moved out of the form to follow the column, `mt-[14px]`; drawn on the make screen only (not the landing's check, not R3).
- V6 Legal underline offset 3px and link-colored underline: DEFERRED, shared style kept as shipped (`LegalLinks` serves /credits, sign-in and checkout).
- S1 Q5: FIXED. While making, the password hint and the or/Google/hint block are not rendered; the Q5 test asserts it.
- S2 R2: FIXED. The Google hint is hidden while `google` is busy.

VERDICT: 0 gaps remain (1 deferred, shared style).
