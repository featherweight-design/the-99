# Readiness Review — Branded user menu

**Verdict:** 🟡 Yellow
**Audited:** 2026-07-25
**Related ticket(s):** #35 (design), #13 (eng)
**Plan PR target:** `docs/superpowers/plans/` — plan PR for #13

## Summary

All eight locked decisions from `docs/superpowers/specs/2026-07-25-branded-user-menu-design.md` are
honoured, including the three that supersede `appshell.md`. The handoff is unusually well-grounded:
every one of the eleven tokens it cites exists in `src/app/globals.css` with the exact hex claimed, no
new token is introduced, and the token map removes the guesswork the spec was worried about. One real
defect: the popover's email line measures **4.42:1**, below the 4.5:1 AA floor the spec locks, though
the README reports it as 4.6:1 and passing. The existing token scale supplies the fix, so this closes
eng-side rather than returning to Design. Three smaller items below are a citation slip, an untokenized
hex, and a specified state that no trigger site can reach.

## Per-dimension findings

### 🗺️ Scope clarity
- [✅] Boundary is explicit and correct. The superseded-rows table names all three `appshell.md`
  locations by line and states what replaces each. Non-goals inherited from the spec's Out of scope.
- [✅] Four open questions logged in the gap report, each with a disposition rather than a shrug.
  Gap 1 (`<UserProfile/>` footer branding) is correctly routed as an eng/legal confirmation, not a
  design call — Design distinguished the mandated development-instance badge from modal footer
  branding, which is the right distinction.

### 🎭 State coverage
- [✅] Five states delivered. Trigger covers idle / hover-pressed / focus-visible / open — the four
  interaction states the prior spec never drew, which was the actual gap in #35.
- [✅] Viewport coverage is complete rather than mechanical. The popover is drawn at 1060px and the
  sheet at 392px because each *is* its viewport's pattern; drawing a desktop popover at 392px would
  specify something that never renders. `<UserProfile/>` is the one surface that genuinely differs
  across viewports and is correctly drawn at both — Clerk goes full-bleed under ~640px, so the 16px
  `modalContent` radius drops and the left nav collapses to `navbarMobileMenuButton`.
- [🟡] One specified state is unreachable — see eng-side item 3.

### 🔌 Data contract
- [✅] No backend surface. Session actions stay behind Clerk (`<UserProfile/>`, sign-out), per the
  spec's "no new auth surface".
- [✅] Copy externalizes to `src/lib/copy/shell.ts`, which exists and already holds the shell strings.

### 🧱 Codebase fit
- [✅] All eleven referenced tokens verified against `src/app/globals.css`: `--bg` `#14110E`,
  `--surface-raised` `#221D16`, `--surface-rail` `#1A160F`, `--elevated` `#2A241D`, `--brass`
  `#C9A24B`, `--brass-hover` `#D8B25E`, `--border-strong` `#3A3229`, `--border` `#2A241D`, `--fg`
  `#EDE6D8`, `--fg-faint` `#8E8269`, `--danger` `#C6533F`. Every hex matches. No new token introduced,
  as claimed.
- [✅] 216px popover is genuinely narrower than the 236px rail (`nav.tsx:83` is `w-[236px]`), so
  decision 3's "reads as attached to the avatar, not as a rail drawer" holds geometrically.
- [✅] The trigger-unification call is well argued and factually checked: two of three sites already
  ship 38px/`br 12px` (`nav.tsx:234`, `:348`) and only `page-header.tsx:48` moves. Design's sharper
  observation also verifies — that trigger sits inside the **mobile** header block (`page-header.tsx:46-55`;
  the desktop header starts at `:58` and has no trigger), so the 34-vs-38 divergence is mobile-vs-mobile.
- [✅] Correctly identifies that `AccountTrigger`'s #31 click-forwarding (`nav.tsx:206-244`) gets
  deleted rather than ported, and gives the right reason: the workaround exists only because the pill
  is wider than its interactive child.
- [🟡] One hex bypasses its own token — see eng-side item 2.

### ♿ Cross-cutting
- [🟠→🟡] **Email contrast fails AA in the popover.** `--fg-faint` `#8E8269` on `--surface-raised`
  `#221D16` computes to **4.42:1**. The README reports 4.6:1 and concludes "All AA or better". At
  Plex Mono 11px this is normal text, so WCAG 2.1 SC 1.4.3 requires 4.5:1 and it misses. The mobile
  sheet is unaffected — on the sheet's `#1E1A15` the same pair reaches 4.57:1 and passes, so this is
  desktop-popover-only. Closes eng-side (item 1) because the fix is determinate.
- [✅] The other three measurements are conservative, not optimistic — brass initials on `--bg` is
  7.84:1 (claimed 7.4), item label on `--surface-raised` is 13.47:1 (claimed 11.9), focus ring vs
  `--surface-rail` is 7.51:1 (claimed 6.6). Only the email figure errs in the direction that matters.
- [✅] A11y contract is thorough and mostly beyond the spec's baseline: focus trap for the open
  lifetime, Escape closing with focus returned to the trigger, outside-click / backdrop-tap / Android
  hardware-back all on the same path, and the trap explicitly handed to Clerk's modal with focus
  returning to the *trigger* rather than the dismissed menu — the case that usually gets missed.
- [✅] Accessible name is the person ("Account — Ana Ruiz") with initials `aria-hidden`, so the name
  isn't a glyph pair. Sign-out is not signalled by colour alone: the danger diamond sits beside the
  literal words and the label stays `--fg`. That satisfies SC 1.4.1.
- [✅] Decorative drag handle is `aria-hidden` with no pointer handlers, and decision 6 is honest that
  a half-working handle is worse than one that only signals.
- [✅] Reduced motion follows the existing explicit-fallback pattern at `globals.css:166-173` (verified)
  rather than a blanket rule, so the next animation still forces a decision.

### ⏰ Drift from reality
- [✅] Written against current `main` (`1bfa5d3`) and cites the richness pass correctly — the account
  menu is not covered by `design_handoff_the99_richness/`, so this surface inherits #58's character
  layer instead of being restyled later.
- [🟡] One line citation has drifted — see eng-side item 4.

### 📝 Decision log
- [✅] Ten numbered decisions, each with its reasoning rather than just its outcome. Decision 1 (38px
  over 34px) and decision 6 (decorative handle) both argue from constraints already in the repo.
- [✅] Locked-vs-open is unambiguous: the decisions log is settled, the gap report is explicitly the
  not-answered list.

## Gaps requiring Design round-trip (Orange/Red only)

None. Every finding below has a determinate answer that preserves Design's stated intent, so none
requires a Design decision.

## Eng-side clarifications (Yellow only)

### 1. Fix the popover email contrast with `--fg-muted`

`--fg-faint` on `--surface-raised` is 4.42:1 and fails SC 1.4.3 for 11px text. Use `--fg-muted`
(`#A89B84`), which reaches **8.48:1** on the same background. It is the next step up the existing
scale — literally "muted labels" at `globals.css:26` — so it preserves the name-prominent /
email-secondary hierarchy decision 4 relies on without inventing a value or widening the popover.

Leave the mobile sheet as specified: on `#1E1A15` the email already passes at 4.57:1. If you prefer one
value across both panels, `--fg-muted` is safe on both. Do **not** "fix" this by enlarging the email —
that fights the compact intent.

Also correct the README's contrast table when this lands: the 4.6:1 figure is wrong, and three of the
other four are understated (actuals 7.84 / 13.47 / 7.51). Recompute rather than copy.

### 2. The sheet background has a token — use it

The component notes give the sheet container as `bg #1E1A15` with no token name, unlike every other row
in that table. `#1E1A15` is `--surface` at `globals.css:10`, commented "card / panel". Use
`var(--surface)`. This is consistent with the handoff's own constraint that theme-aware values come from
`var(--*)`, and with its claim that no new token is introduced — the token already exists, it just
wasn't named.

### 3. Do not implement the top-anchored popover flip — no site can reach it

Decision 3 specifies that from a top-anchored trigger "the commanders mobile header" the popover flips
to `top:calc(100% + 8px)`, right-aligned, diamond above the panel. No trigger site resolves to that
combination:

- Desktop (`md:` and up) → the rail trigger → popover, bottom-anchored. The `/commanders` desktop
  header has no trigger at all (`page-header.tsx:58` onward), as the handoff itself notes.
- Mobile (below `md:`) → both mobile triggers (`nav.tsx:348`, `page-header.tsx:48`) → **bottom sheet**,
  per the unchanged mobile-pattern decision.

So a top-anchored *popover* has no viewport. Build the bottom-anchored popover and the sheet only. Skip
the flip branch rather than writing an unreachable code path — and if a future surface does add a
top-anchored desktop trigger, the flip geometry is already specified and waiting.

### 4. Focus-ring citation is off by three lines

The handoff cites `globals.css:130` for the global focus ring. The `:focus-visible` selector is at
`:133`, with `outline: 2px solid var(--brass)` and `outline-offset: 2px` at `:134-135`; `:130` lands
inside the preceding comment block. The substance of decision 7 is correct — the global ring is
`2px` brass at `2px` offset and needs no override, and the offset does leave a band of `--bg` between
ring and the trigger's brass border. Only the line number is wrong.

## Decisions inherited

The plan PR for #13 must respect all of these:

1. **No `SECURED BY CLERK` caption anywhere** — deleted, not restyled, and its 14px top margin goes
   with it. Verified absent from both mocks; the three occurrences in the canvas are prose annotations
   describing the deletion. Clerk's mandated development-instance badge is separate and untouched.
2. **Manage account opens Clerk's `<UserProfile/>`, themed** via the `appearance` API — not a bespoke
   `/account` page.
3. **Compact avatar-only desktop trigger** at 38px / `br 12px`, hit area padded to 44×44. No ellipsis;
   the `appshell.md:157-184` "ellipsis color" row no longer applies.
4. **Popover 216px, left-aligned to the trigger, 8px above it** — narrower than the 236px rail.
   Supersedes `left:12px; right:12px` at `appshell.md:1584`. No backdrop and no blur on desktop.
5. **One trigger component, one size, all three sites** — only `page-header.tsx:48` changes.
6. **Bottom sheet stays the mobile pattern**, unchanged from the existing spec.
7. **Nothing replaces the removed caption** — the footer slot closes up, last item flush, container's
   own 8px pad provides the bottom spacing.
8. **4px brass diamond marks the open trigger**, desktop only — it appears only where the panel is
   adjacent, so the mobile sheet has no diamond.
9. **A11y baseline**: focus trap while open, Escape closes, focus returns to the trigger, WCAG AA.
10. **Motion**: `.anim-menu-in` (120ms ease-out, opacity + 4px rise) and `.anim-sheet-up` (180ms
    `cubic-bezier(.22,1,.36,1)`, `translateY(100%→0)`); both names join the reduced-motion list at
    `globals.css:166-173` following its explicit-fallback pattern. Closing is instant in both modes.
11. **No new dependencies** — no focus-trap library, no gesture library, no popover positioning
    library.
12. **`profileSection*` is specified once and every panel takes it** — profile / email / password /
    sessions / MFA do not differ. If an element renders unstyled, apply its group's recipe rather than
    inventing a value, and tell Design (gap 3).
13. **`env(safe-area-inset-bottom)`** is additive to the sheet's 26px bottom pad, not a replacement.
