# Gap report: Help me choose, the deeper look (PR 6a)

Table: `docs/superpowers/design-tables/help-me-choose-deeper.md`. Match counts: DeeperLook panel 7/10, text column 5/5, title row 4/5, title 5/6, state tag 3/10, lead 2/6, action column 5/5, button row 4/5, button 9/15, button live 3/3, button looking 3/5, button disabled 1/4, cost pill 6/13, Stop 6/13, line 7/13; deeper chip 11/11, kind label 5/5, value 2/2, `deeper` tag 5/6; Not used row 5/5, label 6/6, phrase 6/6; results dim 4/5.

## Visual gaps
1. src/components/intake/deeper-look.tsx:183 — panel — desktop gap — design 24px → impl md:gap-[20px]
2. src/components/intake/deeper-look.tsx:183 — panel — mobile padding — design 13px 14px → impl p-[12px_14px]
3. src/components/intake/deeper-look.tsx:183 — panel — border color — design color-mix(accent 28%, var(--border)) → impl color-mix(accent 28%, transparent)
4. src/components/intake/deeper-look.tsx:186 — title row — flex-wrap — design wrap → impl not set (nowrap)
5. src/components/intake/deeper-look.tsx:186 — title — mobile font-size — design 14.5px → impl text-[15.5px] at all widths
6. src/components/intake/deeper-look.tsx:189 — state tag — font-size — design 9.5px → impl text-[9px]
7. src/components/intake/deeper-look.tsx:189 — state tag — border-radius — design 999px → impl not set
8. src/components/intake/deeper-look.tsx:189 — state tag — padding — design 2px 8px → impl not set
9. src/components/intake/deeper-look.tsx:189 — state tag, 3c — background — design color-mix(accent 12%, transparent) → impl none
10. src/components/intake/deeper-look.tsx:189 — state tag, 3d — color — design --danger → impl --accent (one class for both tags)
11. src/components/intake/deeper-look.tsx:189 — state tag, 3d — background — design color-mix(danger 12%, transparent) → impl none
12. src/components/intake/deeper-look.tsx:192 — lead — mobile font-size — design 12.5px → impl text-[13px] at all widths
13. src/components/intake/deeper-look.tsx:192 — lead — line-height — design 1.55 → impl 1.5
14. src/components/intake/deeper-look.tsx:192 — lead — text-wrap — design pretty → impl not set
15. src/components/intake/deeper-look.tsx:192 — lead — max-width — design 520px → impl not set
16. src/components/intake/deeper-look.tsx:196 — button row (3b) — gap — design 8px → impl gap-[10px]
17. src/components/intake/deeper-look.tsx:215 — button — desktop justify-content — design flex-start → impl justify-center at all widths
18. src/components/intake/deeper-look.tsx:215 — button — gap — design 9px → impl gap-[8px]
19. src/components/intake/deeper-look.tsx:215 — button — padding — design 0 14px 0 6px → impl 0 16px 0 6px (px-[6px] pr-[16px])
20. src/components/intake/deeper-look.tsx:215 — button — white-space — design nowrap → impl not set
21. src/components/intake/deeper-look.tsx:214 — button, disabled (3f/3g/owner share) — accessible name — design `{stub}. {label}` → impl aria-label undefined (name from content, no period)
22. src/components/intake/deeper-look.tsx:197 — button, looking (3b) — role — design button → impl `<span>`
23. src/components/intake/deeper-look.tsx:197 — button, looking (3b) — child order — design cost pill (`deeper.cost`) then label → impl label only, no pill
24. src/components/intake/deeper-look.tsx:197 — button, looking (3b) — padding — design 0 14px 0 6px → impl px-[16px]
25. src/components/intake/deeper-look.tsx:215 — button, disabled — background — design transparent → impl --accent (with opacity 0.45)
26. src/components/intake/deeper-look.tsx:215 — button, disabled — border — design 1px solid --border-strong → impl border-0
27. src/components/intake/deeper-look.tsx:215 — button, disabled — color — design --fg-disabled → impl --bg (with opacity 0.45)
28. src/components/intake/deeper-look.tsx:217 — cost pill — mobile height — design 30px → impl h-[26px] at all widths
29. src/components/intake/deeper-look.tsx:217 — cost pill — padding — design 0 10px → impl px-[9px]
30. src/components/intake/deeper-look.tsx:217 — cost pill, disabled — font-weight — design 500 → impl 600 (font-semibold)
31. src/components/intake/deeper-look.tsx:217 — cost pill, disabled — background — design --surface → impl color-mix(bg 22%, transparent)
32. src/components/intake/deeper-look.tsx:217 — cost pill, disabled — color — design --fg-disabled → impl inherits --bg
33. src/components/intake/deeper-look.tsx:204 — Stop — desktop height — design 36px → impl md:h-[38px]
34. src/components/intake/deeper-look.tsx:204 — Stop — padding — design 0 12px → impl px-[14px]
35. src/components/intake/deeper-look.tsx:204 — Stop — border-radius — design 8px → impl rounded-full (999px)
36. src/components/intake/deeper-look.tsx:204 — Stop — font-size — design 13px → impl text-[13.5px]
37. src/components/intake/deeper-look.tsx:204 — Stop — color — design --fg-muted → impl --fg-body
38. src/components/intake/deeper-look.tsx:204 — Stop — display — design inline-flex, align-items center → impl not set
39. src/components/intake/deeper-look.tsx:223 — line — mobile font-size — design 10px → impl text-[10.5px] at all widths
40. src/components/intake/deeper-look.tsx:223 — line — mobile text-align — design center → impl not set (start)
41. src/components/intake/deeper-look.tsx:223 — line — text-wrap — design pretty → impl not set
42. src/components/intake/deeper-look.tsx:72 — line, 3a/3d/3e — copy key — design `creditsCopy.standing` → impl `creditsCopy.first`
43. src/components/intake/read-as-bar.tsx:71 — `deeper` tag — letter-spacing — design 0.06em (R7) → impl tracking-[.1em]
44. src/app/decks/new/choose/page.tsx:124 (DimWhileLooking, deeper-look.tsx:53) — results dim, 3b — unaffected elements — design order line and Best fits / More commanders labels stay at 1 → impl opacity 0.45 on the whole results block, including both

## State reachability gaps
1. 3a offer (and 3a words all matched) — PARTIALLY — branch reached (`allowance` read only when `p.words.trim()`, phase `offer`), but the line is `creditsCopy.first`, not `creditsCopy.standing` (deeper-look.tsx:72 via `standingLine`).
2. 3b looking — PARTIALLY — branch exists (`phase === "looking"`, Stop, `pendingLine`, dim), but the button is a span carrying `deeper.actionPending` only; the `deeper.cost` stub is not rendered (deeper-look.tsx:197).
3. 3d failed — PARTIALLY — branch exists (`failTag`, `failedLead`, `retry`), but the line is `creditsCopy.first`, not `creditsCopy.standing`.
4. 3e nothing to add — PARTIALLY — branch exists (`settled === "nothing"`, `doneTitle`, `emptyLead`, no button, `stillNotUsed`), but the line is `creditsCopy.first`, not `creditsCopy.standing`.

REACHABLE with no gap: 3c done, 3f no credits, 3g paused, owner share, no offer.

VERDICT: 44 visual gaps, 4 state gaps

## Confirmation

Checked against the current deeper-look.tsx, read-as-bar.tsx, choose-results.tsx and choose/page.tsx.

Visual gaps:
1. FIXED — panel `md:gap-[24px]`.
2. FIXED — panel `p-[13px_14px]`.
3. FIXED — border `color-mix(accent 28%, var(--border))`.
4. FIXED — title row `flex-wrap`.
5. FIXED — title `text-[14.5px] md:text-[15.5px]`.
6. FIXED — state tag `text-[9.5px]`.
7. FIXED — state tag `rounded-full`.
8. FIXED — state tag `px-[8px] py-[2px]`.
9. FIXED — 3c tag background `color-mix(accent 12%, transparent)`.
10. FIXED — 3d tag `--danger`.
11. FIXED — 3d tag background `color-mix(danger 12%, transparent)`.
12. FIXED — lead `text-[12.5px] md:text-[13px]`.
13. FIXED — lead `leading-[1.55]`.
14. FIXED — lead `[text-wrap:pretty]`.
15. FIXED — lead `max-w-[520px]`.
16. FIXED — looking button row `gap-[8px]`.
17. FIXED — button `justify-center md:justify-start`.
18. FIXED — button `gap-[9px]`.
19. FIXED — button `pl-[6px] pr-[14px]`.
20. FIXED — button `whitespace-nowrap`.
21. FIXED — `aria-label={`${pill}. ${label}.`}` on every offered state, disabled included; matches `deeper.aria` ("1 credit. Look deeper.") in format.
22. FIXED — looking press is a disabled `<button>`.
23. FIXED — looking press renders the `deeper.cost` pill, then `deeper.actionPending`.
24. FIXED — looking press shares `buttonBase` (`pl-[6px] pr-[14px]`).
25. FIXED — disabled `bg-transparent`.
26. FIXED — disabled `border border-solid --border-strong`.
27. FIXED — disabled `--fg-disabled`.
28. FIXED — pill `h-[30px] md:h-[26px]`.
29. FIXED — pill `px-[10px]`.
30. FIXED — disabled pill `font-medium`.
31. FIXED — disabled pill `--surface`.
32. FIXED — disabled pill `--fg-disabled`.
33. FIXED — Stop `md:h-[36px]`.
34. FIXED — Stop `px-[12px]`.
35. FIXED — Stop `rounded-[8px]`.
36. FIXED — Stop `text-[13px]`.
37. FIXED — Stop `--fg-muted`.
38. FIXED — Stop `inline-flex items-center`.
39. FIXED — line `text-[10px] md:text-[10.5px]`.
40. FIXED — line `text-center md:text-right`.
41. FIXED — line `[text-wrap:pretty]`.
42. ACCEPTED — ruled: 3a and 3d use `creditsCopy.first` (STATES "Credit line, by allowance" gives its worked examples in `first`'s format, and a press follows in both). 3e uses `bare()` = `creditsCopy.standing`, as now required.
43. FIXED — `deeper` tag `tracking-[.06em]`.
44. ACCEPTED — ruled: `DimWhileLooking` now only marks `data-looking`; choose-results.tsx applies `opacity-[0.45]` to the two row `<ol>`s alone via `useDeeperLooking`. The order line (`order-line`), Best fits and More commanders labels sit outside those lists and stay at 1.

State reachability gaps:
1. ACCEPTED — ruled (3a line is `creditsCopy.first`).
2. FIXED — 3b press is a button carrying the `deeper.cost` stub, then `deeper.actionPending`.
3. ACCEPTED — ruled (3d line is `creditsCopy.first`).
4. FIXED — 3e line is `creditsCopy.standing` (via `bare(standing)`), no press.

VERDICT: 0 gaps remain
