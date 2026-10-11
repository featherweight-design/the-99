# Design Property Table: Analysis tab §8 (opening the tab, 8a)

Sources are in `design/design_handoff_the99_analysis_tab/`. Abbreviations: **H** = `HANDOFF.md`, **S** = `STATES-analysis-tab.md`, **C** = `The 99 - Analysis Tab.dc.html`, **F13** = `Analysis Tab 1300.dc.html`, **F39** = `Analysis Tab 390.dc.html`, **FX** = `analysis-fixtures.js`, **RA** = `READINESS-credits-audit.md`. Where the canvas and the audit disagree, the audit's engineering corrections (RA:171-189) win, and the table marks those cells with **(RA corr. N)**.

## Loader block (the wrapper `div`)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Role | `role="status"` on the loader (F39:114; RA:183-184) | `role="status"` on the loader (F13:109; RA:183-184) |
| `aria-busy` | On the **tabpanel**, not the loader. The frames put it on the loader `div` (F39:114); **(RA corr. 4)** RA:183 moves it; the canvas agrees (C:481) | Same (F13:109 frame; RA:183 corr.; C:481) |
| Sr-only announcer | The panel's existing announcer stays and says nothing when a peek lands (RA:184-185) | Same |
| display / direction | `flex`, `column` (F39:114) | `flex`, `column` (F13:109) |
| align / justify | `align-items:center; justify-content:center` (F39:114) | Same (F13:109) |
| Gap between the ring and the word | `12px` (F39:114) | `14px` (F13:109) |
| Min height | `320px` (F39:114; H:120; C:481 "420 / 320px block so the tab row does not jump") | `420px` (F13:109; H:120; C:481) |
| Host container (context) | Tab body `padding:18px 16px 32px; gap:22px` (F39:102) | Tab body `padding:24px 30px 40px; gap:28px` (F13:97) |

## Opening ring (`AnalysisRing`, the same element at both widths; originally the straight mark row `fetchRow`, superseded 2026-10-11)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Element | `span`, `aria-hidden="true"` (FX:374) | Same |
| Layout | **Superseded 2026-10-11 (Hugh): the loader draws `AnalysisRing`, the reading ring: a 150px box, `position:relative`, marks absolutely placed.** Originally `display:flex; align-items:center; gap:10px` (FX:374) | Same |
| Marks | The five bracket marks, 1 at twelve o'clock and running clockwise on a 50px radius. Originally 1→5 left to right (FX:375; C:479) | Same |
| Mark size | `44` px square, as the reading ring. Originally `22` (FX:375 `mark(b, 22)`; H:120; C:479; the `-chip` art variant is no longer used here) | Same |
| Mark ink | `color: ink(b)`, each rank in its own ink (FX:39) | Same |
| Base opacity | A waiting mark holds the wave's `0.22` through its stagger delay: `.anim-at-wave` has `animation-fill-mode: backwards` (was `.at-wave-rest`, FX:375) | Same |
| Animation | `at-wave 1.6s ease-in-out ${i*0.16}s infinite`, stagger `0.16s` per mark (FX:375; C:479 "1.6s") | Same |
| Keyframe | `@keyframes at-wave { 0%,100% {opacity:0.22} 35% {opacity:1} 60% {opacity:1} }` (F39:27) | Same (F13:28) |
| Direction of the light | Clockwise round the ring, mark 1 first. Originally left to right (C:479) | Same |
| Reduced motion | **Superseded 2026-10-11 (Hugh): the loader is the reading ring, so under reduced motion its marks are static at the ring's own `opacity:1`, and only the word reads as the signal.** Originally static at `0.5` (H:120; C:481) by a modifier class that left the ring's rule alone (RA corr. 2) | Same |

## "Loading…" word (for identification only)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| String | `Loading…` (F39:116) | `Loading…` (F13:111) |
| Font family | `'IBM Plex Mono', monospace` (F39:116) | Same (F13:111) |
| Size | `10.5px` (F39:116; H:120) | `11px` (F13:111; H:120) |
| Letter-spacing | `0.06em` (F39:116) | `0.06em` (F13:111) |
| Color | `var(--fg-faint)` (F39:116; H:120) | `var(--fg-faint)` (F13:111; H:120) |
| Weight / transform | — (not specified) | — |

## Timing

| Property | Both widths |
|---|---|
| Delay before showing | 150ms. A fetch that settles sooner goes straight to the answer with no loader (C:481; H:120; S:9) |
| Minimum hold once drawn | 400ms (C:481; H:120; S:9). **(RA corr. 5)** This needs a new timer. The reading is held back until the 400ms have passed, and a press's reply is never held (RA:186-187). The build holds one reply: a press left in flight across a deck change and a return (`gap-report-analysis-tab-opening.md`, state 1, decided) |

## What is drawn and what is withheld during 8a

| Element | Mobile (390) | Desktop (1300) |
|---|---|---|
| Analysis tab row / active tab | Drawn (F39:96) | Drawn (F13:91) |
| Loader (opening ring + Loading…) | Drawn (F39:113-118) | Drawn (F13:108-113) |
| "Overview" label | Withheld (C:479; H:120) | Withheld |
| Empty-state ring (2a/2b `preAnalysis`) | The empty state's own ring instance stays withheld (mounted behind the loader, not drawn), because the empty state means "not analyzed" and would reproduce the flash (C:479-480; H:120; FX `base` has `invite:false`). The loader draws its OWN ring, `AnalysisRing` with testid `opening-ring`, in place of the original mark row (2026-10-11, Hugh) | Withheld |
| Bracket box / climb / findings (`ready`) | Withheld (C:479; H:120; FX:219 `ready:false`) | Withheld |
| Stale banner | Withheld (C:479; H:120; FX:219 `staleBanner:false`) | Withheld |
| Recommended mix | Withheld: `notFetching` gate (F39:297; FX:380; C:479). **(RA corr. 3)** This is the first state to withhold the panel's `children`; build it as drawn (RA:180-182) | Withheld (F13:297) |
| Header bracket chip | Canvas withholds it (C:479; S:9 "none"; FX:219 `band:null`). **(RA corr. 1)** **Keep it.** It is server-rendered from the permits and already known (RA:172-176) | Same, keep it (RA corr. 1) |
| Skeleton of the answer | — explicitly none. A skeleton would guess one outcome and be wrong for the rest (C:480) | — |
| Suggested changes | — (not specified in any 8a source) | — |

## State coverage

| State | Triggering condition (data terms) | What renders |
|---|---|---|
| 8a pending, first 150ms | Tab shown; profile `idle`; stored permits **present**; stored-reading fetch **pending**; elapsed < 150ms | Nothing new in the tab body. Loader not yet drawn (C:481). Header chip drawn (RA corr. 1) |
| 8a loader | Tab shown; profile `idle`; permits **present**; fetch **pending**; elapsed ≥ 150ms | Loader only (opening ring + Loading…); every other element withheld, per the table above. Header chip kept |
| 8a hold | Loader drawn; fetch **settled**; less than 400ms since the loader appeared | Loader stays until 400ms; reading held back (RA:186-187) |
| Resolved to a reading | Permits present; fetch settled with a reading; hold satisfied (or loader never drawn) | The analyzed state (2d/2e etc.) |
| Resolved to empty (fail-soft) | Permits present; fetch settled with no usable reading (e.g. an old version over an edited list) | 8a, then 2a (RA:132-134) |
| 2a immediate | Tab shown; profile `idle`; stored permits **null** | 2a empty state at once: no loader, no flash (RA:131-132, the "cheaper route" gate) |
| 2b | Profile `loading` (an Analyze press) | 2b ring animating, never 8a (RA:138-139; S:11) |
| Tab re-switch / repeat visit | The answer is already held by the shell (peeked) | No 8a (RA:118-119, :139) |
| Deck change | Profile resets to `idle`; new permits re-seed the gate | Gate re-evaluated by permits (RA:139-140) |

## Gating condition (engineering decision, the audit's "cheaper route")

The stored reading is **not** loaded server-side. The gate is the stored bracket permits the page already ships (RA:130-134):

- **Permits null:** the tab draws 2a at once.
- **Permits present:** the tab draws the 8a loader, subject to the 150/400ms timing, until the stored-reading fetch settles.

This supersedes the canvas's preferred fix of server-loading the reading (C:481; H:120). RA:136-137 also says 8a would be unreachable under that fix.

## Notes

- **ARIA conflict:** the frames put `role="status"` and `aria-busy` together on the loader `div` (F13:109; F39:114). The canvas prose (C:481) and RA corr. 4 put `aria-busy` on the tabpanel and `role="status"` on the loader. The table follows RA.
- **Probe:** RA:188-190 specifies one. Delay the fetch on an analyzed deck and assert:
  - `analysis-empty` is never drawn;
  - 8a appears after 150ms and stays 400ms;
  - an unanalyzed deck draws 2a with no 8a.

  The mutation is dropping the permits gate.
