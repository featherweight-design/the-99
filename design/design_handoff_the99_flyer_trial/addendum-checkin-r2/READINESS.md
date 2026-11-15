# Readiness Review · Check-in R2 ("How's it going?")

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-14, against main at `9d244e236` (the addendum branch rebased onto it cleanly)
**Related ticket(s):** design PR #2954; addendum to the flyer trial handoff (boards 9 and 10, `Survey-Phone`, `Survey-Desktop`)
**Plan PR target:** TBD (one UI PR: `src/components/feedback/check-in-form.tsx`, `src/lib/copy/report.ts`, `src/app/globals.css`, a small `FriendCard` prop)

## Summary

Buildable as drawn. Every state (A1 to A5, E1 on the phone; D1 to D6 on the desktop) is drawn at both widths, all six
themes are drawn, the motion is specified beat by beat with a reduced-motion path, and Hugh approved it on 2026-11-15
with every recommendation taken. Nothing new is collected: the rating, uses, pod and note go to the unchanged
`sendCheckIn`, and the two thanks are chosen from the rating already in state. Four eng-side clarifications remain, all
settled by the handoff's own patterns: the shipped Send never read "Sending…" (the board calls it shipped), the
face-up card's accessible name needs a small `FriendCard` override, every new animation needs its reduced-motion entry,
and the "Instant — Thanks" type line carries an em dash for /copy-review. Next: /copy-review on the drafts, then the
plan PR.

## Per-dimension findings

### 🗺️ Scope clarity

- [✅] Boundary stated twice (`README.md` "Locked", `Checkin-Spec` lede): reskin `CheckInForm` and rewrite `checkInCopy`;
  `CheckInPrompt`, the due rule (14 days, 5 Home days), the snooze (3 days, fourth Not now ends, matching
  `MAX_SNOOZES = 3` in `src/lib/feedback/check-in-rule.ts:10`), the actions and the stored answers do not change.
- [✅] Hugh's three questions (one or two thanks, the card joke, the five words) are logged and settled.

### 🎭 State coverage

- [✅] Ask, answering, sending, thanks rated 3 to 5, thanks rated 1 or 2, failed: phone (`Checkin-Phone`) and desktop
  (`Checkin-Desktop`, including the pointer hover on card 5). `Checkin-Play` is a working prototype with reduced-motion
  and fail toggles.
- [✅] Signed out and loading do not apply: the prompt only mounts for a signed-in reader and draws nothing until due.
- [✅] All six themes on `Checkin-Themes` (ask and high thanks). The low thanks differs only in words and the missing
  burst, so its theme coverage follows.
- [🟡] Sending: the board (`Checkin-Phone.dc.html` A3 caption) says "As shipped: Send reads Sending…". The shipped
  button always reads `copy.send` (`check-in-form.tsx:205`); only its opacity changes. See clarification 1.

### 🔌 Data contract

- [✅] No new data. The payload stays `{ rating, uses, pod, note }`; rating words map by index and the stored value stays
  1 to 5. The thanks variant reads `rating <= 2` from local state. No new analytics event.
- [✅] Uses and pod chips keep `CHECK_IN_USES` / `CHECK_IN_PODS` order and labels.

### 🧱 Codebase fit

- [✅] Every color in the boards is an existing token (`--surface-raised`, `--accent`, `--accent-text`, `--fg-muted`,
  `--elevated`, `--surface-inset`, `--border-dashed`, `--fg-placeholder` all exist in all six theme blocks of
  `src/app/globals.css`). Card numbers use the display face already on the shipped back.
- [✅] Reuses `FriendCard` `compact` with `face.crown` and `word` (`src/components/social/friend-card.tsx:41`), the same
  crowned face `/join` and `/sign-up` already draw, and the shipped `.friend-card` turn and its reduced-motion
  cross-fade (`globals.css:1659-1683`). Chips stay the shipped pills; the failed toast stays `SocialToast`.
- [🟡] The face-up card's name: Spec says "named 'Thank you, a card from The 99', as the shipped card does". The shipped
  `CardFront` always builds its label from `socialCopy.landing.cardAria(name, commander, type)`
  (`friend-card.tsx:161-164`), which would read "Thank you. Instant — Thanks". See clarification 2.
- [🟡] The 44×62 back beside the intro is a new drawing; `CardBack` is module-private in `friend-card.tsx`. See
  clarification 4.
- [✅] Copy keys follow `checkInCopy` in `src/lib/copy/report.ts:43-61`; `ratingEnds` goes, `ratingWords`,
  `ratingAria`, `sentTitleLow`, `sentBodyLow` and `card` are new. Tests asserting today's strings
  (`check-in-form.test.tsx:30,56`) move to the new keys.

### ♿ Cross-cutting

- [✅] Contrast, measured from the theme tokens: card words `--fg-muted` on `--surface-raised` are 5.82:1 (Eldraine) to
  6.38:1 (Ixalan); the crown and diamonds in `--accent-text` are 4.86:1 (Phyrexia) to 8.17:1, and decorative
  (`aria-hidden`). The picked card's word goes to `--fg`.
- [✅] Hit boxes: phone cards about 67×93 (still about 54 wide at 320px), desktop 70×98, chips 40, buttons 44. The tilt
  rotates the button itself, so the hit box is the card.
- [🟡] Radiogroup gains arrow keys with a roving tabindex; the handoff does not say whether an arrow also checks. See
  clarification 3.
- [🟡] Thanks: focus moves to the heading (`tabindex=-1`) inside a polite live region. A live region mounted together
  with its text often announces nothing; the focus move is what carries it. See clarification 3.
- [🟡] Motion: six new animations (card lift with overshoot, chip pop, card rise, form fade-out, words fade-in, the
  diamond burst) and a desktop hover rise. None exists in `globals.css` yet. See clarification 4.
- [✅] Performance: CSS keyframes only, no library, burst nodes removed after 1.5s, nothing loops.

### ⏰ Drift from reality

- [✅] Every file named exists as named: `check-in-form.tsx`, `check-in-prompt.tsx`, `report.ts`, `friend-card.tsx`,
  `check-in-form.test.tsx`, `ModalChrome` (`src/components/decks/receipt-modal.tsx`).
- [✅] The `art/` Home captures are copies of `public/about/pages/amonkhet/{desktop,phone}/*-home.webp`, used only as
  board backdrops. Nothing in the diff touches `public/` or `src/`. No `scratch-gen/` folder.
- [🟡] `canvas.json` names its boards `Main`, `Play`, `Desktop`, `Themes`, `Spec`.dc.html while the files are
  `Checkin-*.dc.html`. The README maps them; no build impact.

### 📝 Decision log

- [✅] Design's five calls, the motion timeline, accessibility and engineering notes are recorded in `README.md` and
  `Checkin-Spec`; Hugh's rulings are dated; engineering notes are marked "not design calls".

## Eng-side clarifications (Yellow only)

1. **Sending label.** Adopt the drawn A3/D3: Send reads `reportCopy.sending` ("Sending…", already in
   `src/lib/copy/report.ts:23`) while sending, and the hand, chips and note dim to .6. This is a change from shipped,
   not "as shipped"; the board's caption is the source.
2. **The thank-you card's accessible name.** Add an optional `aria` string to `CardFace` (or to its `crown`) that, when
   present, replaces `cardAria(...)` in `CardFront`; the check-in passes `checkInCopy.card.aria`. `/join`, `/sign-up`
   and the friend landing pass nothing and keep their labels. The crown face stays a plain string, so no
   `ThirdPartyName` rules apply.
3. **Keyboard and announcement.** Follow the WAI-ARIA radio pattern: arrows move focus and check, wrapping, with one tab
   stop (the checked card, or the first when none). On thanks, move focus to the heading on mount; keep the polite
   live region on a wrapper that exists before the swap (the sheet body), not on the newly mounted thanks node.
4. **Motion classes.** Each new animation is a named `.anim-*` class (or transition) in `globals.css`, and each one
   is listed in the `@media (prefers-reduced-motion: reduce)` block at `globals.css:1440`, per the Spec: no rise, turn,
   burst, pop or lift transition; the picked card is simply drawn lifted; the burst is not rendered. The desktop hover
   rise sits under `(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)`, as the existing
   hover rules do. The small intro back is a new `aria-hidden` element drawn from the same tokens as `CardBack`
   (export a size variant of `CardBack` rather than copying its markup). A UI probe at 320 and 390 confirms the fanned
   outer cards and the burst cause no horizontal overflow inside `ModalChrome`'s `overflow-y-auto` body.

## For /copy-review

Drafts in `check-in r2 · copy strings.ts` and the `Checkin-Spec` table. One rule hit: `card.type` "Instant — Thanks"
uses an em dash (the Magic type-line convention). Hugh kept the joke (Q2), so only the separator is in question; the
shipped precedent is the middle dot in `typeFriend` ("Friend · since …", `src/lib/copy/social.ts:321`). Everything
else is US English with no em dashes. `rating` also changes ("How is" to "How's"), which the README's kept-keys list
does not mention but the Spec table does.

## Decisions inherited

- Same trigger, same three questions and note, nothing new collected; Not now snoozes and ✕ ends as shipped.
- About › Report a problem named in both thanks.
- Two thanks split at rating ≤ 2; the high one alone bursts.
- The five words Rough, Meh, Okay, Good, Love it; the end labels go.
- The card joke stays (wording to /copy-review).
- All six themes; phone and desktop ship in the same PR.
- No About label is drawn or owed; that is Hugh's call.
