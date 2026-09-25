# Gap report — Help me choose (PR 5b) against `design-tables/help-me-choose.md`

Match counts (rows checked with no mismatch): ChooseHeader 14 · IntakeForm 78 · ResultsScreen 8 · ReadAsBar 62 ·
OrderLine 14 · BestFits 44 · ChooseRow 46 · OwnershipLine 22 · ShowMore 10 · NarrowNote 18 · NarrowState 14 ·
NarrowOption 14 · SearchFailed 22 · ResultsSkeleton 14 (thumb 44×62/r6 treated as following the shipped
`CommanderThumb`, not a gap; row grid's 44px thumb column likewise).

## Visual gaps
1. src/app/decks/new/choose/page.tsx:170 — ChooseHeader/Back label — shown on mobile — design: mono 11px `--fg-faint` at both widths → implementation: `hidden md:inline` (not drawn on the phone)
2. src/app/decks/new/choose/page.tsx:89 — ResultsScreen/Results column — mobile padding — design: 16px 18px 24px → implementation: 14px 16px 24px
3. src/components/intake/intake-form.tsx:208 — Budget caption — line-height — design: 1.5 → implementation: unset (Field applies `leading-[1.5]` only to the mono words caption)
4. src/components/intake/intake-form.tsx:145 — Budget value — mobile font-size — design: mono 14px → implementation: 16px (`text-[16px] md:text-[14px]`)
5. src/components/intake/intake-form.tsx:90 — Find commanders — white-space — design: nowrap → implementation: not set
6. src/components/commanders/rack/colour-control.tsx:108 + src/components/ui/colour-pips.tsx:32-33,78 — Color pip — size / group gap — design: 36px mobile, 28px desktop, pip gap 8px → implementation: 44px / 22px, gap 10px / 6px
7. src/components/ui/colour-pips.tsx:137 — Color pip — lit/unlit treatment — design: unlit opacity 0.34, lit `0 0 0 2px var(--bg), 0 0 0 3.5px var(--fg)` → implementation: no unlit opacity, lit `0 0 0 2px var(--accent)`
8. src/components/commanders/rack/colour-control.tsx:86-93,135 — Any/Exactly segmented control box — design: flex, gap 2px, padding 2px, radius 8px, 1px `--border-strong` at both widths → implementation: phone no box (gap 8px, separate pills, plus two extra legend captions); desktop no own box, segments sit inside the pip wrapper (h 34, radius 9, bg `--bg`, border `--border`/`--accent`) behind a hairline
9. src/components/commanders/rack/colour-control.tsx:163-185 — Any/Exactly segment — design: h 36/28, padding 0 11px, radius 6px, 12.5px, selected weight 600, selected bg `--elevated`, no-pip color `--fg-disabled` → implementation: phone h 44, px 16, `rounded-full`, 13.5px, selected bg accent 16% mix + accent border; desktop h 22, px 8, mono 10.5px; no weight change; greyed color `--fg-locked` on `--surface-sunken`
10. src/components/intake/theme-picker.tsx:58-66 — Theme chip — gap / padding — design: gap 6px, padding 0 7px 0 9px → implementation: no gap, padding-right 0 (✕ centred in a 20px button)
11. src/components/intake/theme-picker.tsx:110 — Theme input — padding — design: 0 4px → implementation: none
12. src/components/intake/theme-picker.tsx:135 — Theme picker option — background — design: selected `--elevated` · else transparent (no hover state) → implementation: also `--elevated` on the active (pointer-moved / keyboard) option
13. src/components/intake/read-as-bar.tsx:44 — ReadAsBar/Answers column — gap — design: 9px → implementation: 10px
14. src/components/intake/read-as-bar.tsx:48-49 — ReadAsBar/No answers line — shown / type — design: shown when no chips AND no Not used line; 13px `--fg-muted` → implementation: shown whenever chips are empty (also beside a Not used line); mono 11px `--fg-faint`
15. src/lib/intake/present.ts:131 (rendered read-as-bar.tsx:58) — Chip kind label — value for Exactly — design: kind `exactly` → implementation: `colors · exactly`
16. src/components/intake/read-as-bar.tsx:70 — Not used label — letter-spacing — design: 0.1em → implementation: not set
17. src/components/intake/read-as-bar.tsx:85 — Change answers — mobile padding — design: 0 16px → implementation: 0 14px
18. src/components/intake/read-as-bar.tsx:91 — Start over — desktop padding — design: 0 14px → implementation: 0 16px (`md:px-[16px]`)
19. src/components/intake/choose-row.tsx:115 — BestFits/Art — mobile height — design: 88px → implementation: no height (stretches to the card body)
20. src/components/intake/choose-row.tsx:160 — BestFits/Figures list — gap — design: 4px → implementation: 5px
21. src/components/intake/choose-row.tsx:166 — BestFits/Figure row — gap — design: 7px → implementation: 8px
22. src/components/intake/choose-row.tsx:181 — BestFits/SETS RANK — desktop font-size — design: 8.5px → implementation: 9px (`md:text-[9px]` shared with rows)
23. src/components/intake/choose-row.tsx:160 — ChooseRow/Figures (phone) — list gap — design: 2px → implementation: 5px
24. src/components/intake/choose-row.tsx:196,203 — OwnershipLine/Mark (free, held) — mark-to-text gap — design: 6px → implementation: 5px
25. src/components/intake/choose-row.tsx:282 — OwnershipLine/Row loading — gap — design: 9px → implementation: 7px
26. src/components/intake/choose-results.tsx:148 — ShowMore/Row — layout — design: flex, align center, gap 14px, wrap at both widths → implementation: phone flex-col gap 8px; desktop row gap 12px, no wrap
27. src/components/intake/choose-results.tsx:154 — ShowMore/Button — white-space — design: nowrap → implementation: not set
28. src/components/intake/narrow-note.tsx:48 — NarrowNote/Text column — gap — design: 6px → implementation: 4px
29. src/components/intake/narrow-note.tsx:104 — NarrowOption/Label column — gap — design: 2px → implementation: none
30. src/components/intake/narrow-note.tsx:105 — NarrowOption/Label — white-space — design: nowrap → implementation: not set
31. src/components/intake/narrow-note.tsx:108 — NarrowOption/Count — color — design: first `--fg-body` · else `--fg-faint` → implementation: `--fg-muted` for all
32. src/components/intake/narrow-note.tsx:109 — NarrowOption/Arrow — font-size / color / flex — design: 13px, first `--accent` · else `--fg-faint`, flex none → implementation: size unset, `--fg-muted` for all, no flex-none
33. src/components/intake/search-failed.tsx:32 — SearchFailed/Change answers — white-space — design: nowrap → implementation: not set

## State reachability gaps
1. 4d themecard — own line's `, inside {cap}` is passed only when the row's buy figure is at or under the cap, where the table says it prints whenever a budget was given; a row whose fill could not get under the cap drops the clause — src/components/intake/choose-row.tsx:263 (PARTIALLY REACHABLE)

All other states REACHABLE: 2a blank, 2b matched, 2a submitted (byOwned + subOwned, `subOwnedColors` with colors), 3a leftover (`n` from `submitTarget`), best fits, 4a, 4b, 4c, 4e (unpriced line after the row's trial is ready), 4f (owned order, min-width 34), 5a, 5b, 5c (Suspense fallback under the bar, after the route's LoadingScreen per ruling), 5d, 5e, flag off (page and both actions).

VERDICT: 33 visual gaps, 1 state gap

## Confirmation

Visual gaps:
1. FIXED — Back label drawn at both widths (`self-start`, mono 11px `--fg-faint`).
2. FIXED — results column `p-[16px_18px_24px]` on the phone.
3. FIXED — non-mono caption now `leading-[1.5]`.
4. ACCEPTED — iOS zooms any input under 16px; the same rule sizes the theme input.
5. FIXED — Find commanders `whitespace-nowrap`.
6. ACCEPTED — the form uses the shared commanders-rack ColourControl/ColourPips; shipped components win over the canvas.
7. ACCEPTED — same ruling as 6.
8. ACCEPTED — same ruling as 6.
9. ACCEPTED — same ruling as 6.
10. FIXED — theme chip `gap-[6px] pl-[9px] pr-[7px]`.
11. FIXED — theme input `px-[4px]`.
12. ACCEPTED — keyboard/hover highlight kept for accessibility; the selected option still reads as selected.
13. FIXED — answers column `gap-[9px]`.
14. FIXED — No answers line drawn only when no chips and no Not used line; 13px `--fg-muted`.
15. FIXED — Exactly chip kind is `exactly`.
16. FIXED — Not used label `tracking-[.1em]`.
17. FIXED — Change answers `px-[16px]` at both widths.
18. FIXED — Start over `px-[14px]` at both widths.
19. ACCEPTED — the handoff's "88px of art at left" is the width, which the phone draws; the canvas gives no width.
20. FIXED — best-fit figures list `gap-[4px]`.
21. FIXED — best-fit figure row `gap-[7px]`.
22. FIXED — best-fit SETS RANK stays 8.5px on desktop (`md:text-[9px]` rows only).
23. FIXED — row figures list `gap-[2px]` on the phone.
24. FIXED — free/held mark `gap-[6px]`.
25. FIXED — row loading `gap-[9px]`.
26. FIXED — ShowMore row `flex flex-wrap items-center gap-[14px]` at both widths.
27. FIXED — ShowMore button `whitespace-nowrap`.
28. FIXED — NarrowNote text column `gap-[6px]`.
29. FIXED — NarrowOption label column `gap-[2px]`.
30. FIXED — NarrowOption label `whitespace-nowrap`.
31. FIXED — count `--fg-body` on the first option, `--fg-faint` on the rest.
32. FIXED — arrow 13px, `--accent` first / `--fg-faint` rest, `flex-none`.
33. FIXED — SearchFailed Change answers `whitespace-nowrap`.

State reachability gaps:
1. ACCEPTED — deliberate: `, inside {cap}` prints only when the buy figure is at or under the cap; saying "inside $150" over a $180 figure would be false.

VERDICT: 0 gaps remain
