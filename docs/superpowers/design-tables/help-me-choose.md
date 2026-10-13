# Design Property Table — Help me choose (form and results)

**Source:** `design/design_handoff_the99_help_me_choose/` — `HANDOFF.md` §2–§5, `STATES-help-me-choose.md`,
`READINESS.md`, `READINESS-audit.md` (rulings override the canvas), `Help Me Choose.dc.html` (frames, `scene` /
`phone` / `screen`), `The 99 - Help Me Choose.dc.html` (canvas + §3 chip key), `help-me-choose · copy strings.ts`
(copy KEYS only; wording is out of scope).

**Scope:** `/decks/new/choose` form (§2) and results (§4, §5). Excluded: doors (§1), hand-off (§6), the Look deeper
panel (`DeeperLook`, §3 second half) — they ship later.

**Widths:** Mobile = the 390 phone frame (`phone`); Desktop = the 1300 frame. App breakpoint for these screens is
`md:` (768px).

**Global conventions**
- Mono = `'IBM Plex Mono'`; sans = `'IBM Plex Sans'` (the body face).
- **Display face:** the canvas writes `var(--display)`, a canvas-local alias. **Audit F12 override:** in `src/` use the
  `font-display` class / `var(--font-display)`; `--display` is not an app token and `check:tokens` would flag it.
  Every "display" below means that.
- Pip hues in the canvas are `--w --u --b --r --g` (canvas-local); commander art is a gradient placeholder — ship
  `CommanderThumb` (art crop).
- **Feature flag (audit F3):** with `HELP_ME_CHOOSE_ENABLED` off, the route answers not-found.
- **Motion (STATES invariant "zero net motion"):** no transition, animation, shimmer or transform-driven movement
  anywhere on either screen, including chips arriving. The only `transform` in scope is the static 45° rotation of
  the held-mark square (a shape, not motion). **Except loading** (Hugh, 2026-10-12: every loader moves): the 5c
  skeleton rows and the row's pending bar breathe (`anim-skeleton`, opacity only), and the route's loading screen
  pulses its crown. Still under reduced motion.
- **Hover:** the canvas declares only the global `a:hover { color: var(--accent-hover) }` (links default
  `--accent`). No other hover state is drawn for any element in scope.

### Overrides and conflicts recorded (audit rulings win; where HANDOFF says so, the shipped component wins)

| # | Canvas / copy file | Ruling | Source |
|---|---|---|---|
| O1 | `var(--display)` | use `font-display` / `var(--font-display)` | audit F12 |
| O2 | copy `intake.wordsCaption` says matched as you type | take the caption from HANDOFF §2 (nothing matched while typing), key kept | audit F6 |
| O3 | copy `intake.dock`, `intake.dockZero` | dropped (R1's live-count dock) | audit F6 |
| O4 | copy `results.head(n, by)` and `results.moreLine(n)` print a total | no total printed; order line uses `results.all` / `byOwned` / "Ordered by {x}"; show-more line per HANDOFF §4 | audit F6, HANDOFF §4 |
| O5 | READINESS reading 4 "too narrow < 3" | too narrow = **fewer than 4** results (same point best fits stop) | audit F7 |
| O6 | copy `results.unpriced` | line must also say the buy figure leaves the card out (wording at /copy-review) | audit F8 |
| O7 | canvas draws ownership marks as raw dot / rotated square / inline buy tag | render `OwnershipDot` (owned · free), `AvailabilityGlyph hard` (none free — in {deck}), `BuyTag variant="row"` | HANDOFF §4 ("component wins") |
| O8 | canvas card chip draws inline dot / buy span | `OwnershipDot` · `BuyTag variant="row"` · `buy · no price` | HANDOFF §3 table |
| O9 | README: "the note explains a blank submit" | **no note** beside the submit (`submitNote` style exists in canvas, never mounted) | HANDOFF §2 |
| O10 | copy file has key `results.more` twice ("More commanders" and "Show 12 more") | the second silently overwrites the first; the two need distinct keys | copy file, lines 58/79 |

---

## Component: ChooseHeader (both screens)

### Container
| Property | Mobile | Desktop |
|---|---|---|
| display / flex-direction | flex / column | flex / column |
| gap | 3px | 6px |
| padding | 20px 18px 14px | form: 34px 0 26px · results: 34px 40px 26px |
| width | full | form: 680px, `margin: 0 auto` (centered) · results: full (not centered) |
| border-bottom | 1px solid `--border` | — |

### Back label
| Property | Mobile | Desktop |
|---|---|---|
| font-family | mono | mono |
| font-size | 11px | 11px |
| color | `--fg-faint` | `--fg-faint` |
| content (no copy key) | form `‹ New deck` · results `‹ Your answers` | same |

### Title (h1)
| Property | Mobile | Desktop |
|---|---|---|
| font-family | display | display |
| font-weight | 700 | 700 |
| font-size | 20px | 28px |
| color | `--fg` | `--fg` |
| margin | 0 | 0 |
| copy key | form `intake.title` · results: no key ("Commanders for you") | same |

### Sub
| Property | Mobile | Desktop |
|---|---|---|
| font-family | mono | sans |
| font-size | 10px | 14px |
| color | `--fg-faint` | `--fg-muted` |
| max-width | — | 640px |
| margin | 0 | 0 |
| copy key | form `intake.subPhone` · results: no key (phone reads a shortened sub) | form `intake.sub` · results: no key |

---

## Component: IntakeForm (screen="form")

### Page body
| Property | Mobile | Desktop |
|---|---|---|
| display / flex-direction | flex / column | flex / column |
| align-items | — | center |
| padding | — | 0 40px 48px |
| flex | 1 | — |

### Form panel
| Property | Mobile | Desktop |
|---|---|---|
| display / flex-direction | flex / column | flex / column |
| gap | 20px | 22px |
| padding | 18px 18px | 24px 26px |
| width | full | 680px |
| background | — (page `--bg`) | `--surface-rail` |
| border | — | 1px solid `--border` |
| border-radius | — | 12px |
| flex | 1 | — |

### Field group (each of the five inputs)
| Property | Mobile | Desktop |
|---|---|---|
| display / flex-direction | flex / column | flex / column |
| gap | 9px | 9px |

### Field label (In your own words / Colors / Theme / Budget / Bracket)
| Property | Mobile | Desktop |
|---|---|---|
| font-family | mono | mono |
| font-size | 10px | 10px |
| letter-spacing | 0.14em | 0.14em |
| text-transform | uppercase | uppercase |
| color | `--fg-faint` | `--fg-faint` |
| copy key | `intake.words` for the first; the other four have no key | same |

### Caption (colors, theme, budget, bracket)
| Property | Mobile | Desktop |
|---|---|---|
| font-size | 12px | 12px |
| line-height | budget: 1.5 · others unset | same |
| color | `--fg-faint` | `--fg-faint` |

### Words textarea
| Property | Mobile | Desktop |
|---|---|---|
| min-height | 96px | 84px |
| padding | 12px 13px | 12px 14px |
| border-radius | 9px | 9px |
| background | `--surface-sunken` | `--surface-sunken` |
| border | 1px solid; `--accent` when it holds text, else `--border-strong` | same |
| font-size | 16px | 14px |
| line-height | 1.55 | 1.55 |
| value color | `--fg` | `--fg` |
| placeholder color | `--fg-faint` | `--fg-faint` |
| copy key | `intake.wordsPlaceholder` | same |
| interpretation | none while typing (no chips, no counts) | same |

### Words caption
| Property | Mobile | Desktop |
|---|---|---|
| font-family | mono | mono |
| font-size | 10.5px | 10.5px |
| line-height | 1.5 | 1.5 |
| color | `--fg-faint` | `--fg-faint` |
| copy key | `intake.wordsCaption` (wording from HANDOFF §2, O2) | same |

### Divider (after the words group)
| Property | Mobile | Desktop |
|---|---|---|
| height | 1px | 1px |
| background | `--border` | `--border` |

### Colors row
| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| align-items | center | center |
| gap | 10px | 10px |
| flex-wrap | wrap | wrap |
| pip group gap | 8px | 8px |

### Color pip (×5, W U B R G, `role="checkbox"`, aria-label = color name)
| Property | Mobile | Desktop |
|---|---|---|
| width / height | 36px | 28px |
| border-radius | 50% | 50% |
| background | the color's pip hue | same |
| opacity | lit 1 · unlit 0.34 | same |
| box-shadow | lit `0 0 0 2px var(--bg), 0 0 0 3.5px var(--fg)` · unlit none | same |
| encoding | `lane-params` `c` / `m` (Discover URL parses as-is) | same |

### Any / Exactly segmented control
| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| gap | 2px | 2px |
| padding | 2px | 2px |
| border-radius | 8px | 8px |
| border | 1px solid `--border-strong` | same |

### Any / Exactly segment
| Property | Mobile | Desktop |
|---|---|---|
| display / align-items | flex / center | flex / center |
| height | 36px | 28px |
| padding | 0 11px | 0 11px |
| border-radius | 6px | 6px |
| font-size | 12.5px | 12.5px |
| font-weight | selected 600 · else 400 | same |
| background | selected and a pip lit: `--elevated` · else transparent | same |
| color | no pip lit: `--fg-disabled` · selected: `--fg` · else `--fg-muted` | same |
| value while no pip lit | kept (greyed, not reset) | same |

### Colors caption
| Property | Mobile | Desktop |
|---|---|---|
| copy key | none lit `intake.colorsNone` · Any `intake.colorsAny(names)` · Exactly `intake.colorsExactly(names)`; names joined " and " | same |

### Theme field
| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| align-items | center | center |
| flex-wrap | wrap | wrap |
| gap | 6px | 6px |
| min-height | 44px | 40px |
| padding | 6px 10px | 6px 10px |
| border-radius | 9px | 9px |
| background | `--surface-sunken` | `--surface-sunken` |
| border | 1px solid `--border-strong` | same |

### Theme chip (picked tag)
| Property | Mobile | Desktop |
|---|---|---|
| display / align-items | inline-flex / center | inline-flex / center |
| gap | 6px | 6px |
| height | 26px | 26px |
| padding | 0 7px 0 9px | 0 7px 0 9px |
| border-radius | 6px | 6px |
| background | `--elevated` | `--elevated` |
| font-size | 12.5px | 12.5px |
| color | `--fg` | `--fg` |
| ✕ | 11px `--fg-faint` | same |

### Theme input
| Property | Mobile | Desktop |
|---|---|---|
| font-size | 16px | 13.5px |
| padding | 0 4px | 0 4px |
| color | picker open: `--fg` · else `--fg-faint` (placeholder) | same |
| border-left (caret) | picker open: 1.5px solid `--accent` · else — | same |
| copy key | no themes `intake.themePlaceholder` · with themes "Add another…" (no key) | same |

### Theme picker list (open)
| Property | Mobile | Desktop |
|---|---|---|
| drawn | yes, as on desktop | a POPOVER under the field, `absolute`, `top-full`, 6px below, `z-30`: it opens over the caption and the fields below and pushes nothing (Hugh, 2026-09-27; ruling Q2). The canvas drew it in flow |
| display / flex-direction | — | flex / column |
| padding | — | 5px |
| border-radius | — | 10px |
| background | — | `--surface-raised` |
| border | — | 1px solid `--border-strong` |
| box-shadow | — | 0 14px 30px rgba(0,0,0,0.45) |
| content | — | tags clearing the vocabulary floor, multi-select, each with commander count |
| behaviour | same | a pick clears the typed text and keeps the list open for the next; Escape or a press outside clears the text and closes the list (DECK INPUT UX, Hugh 2026-10-12; `useSearchDismiss`). Removing a chip leaves the text alone |

### Theme picker option
| Property | Mobile | Desktop |
|---|---|---|
| display / align-items | — | flex / center |
| gap | — | 10px |
| height | — | 36px |
| padding | — | 0 10px |
| border-radius | — | 7px |
| background | — | selected `--elevated` · else transparent |
| label | — | flex 1, 13px, `--fg` |
| count | — | mono 10.5px `--fg-faint` |

### Theme picker check mark
| Property | Mobile | Desktop |
|---|---|---|
| width / height | — | 14px |
| border-radius | — | 4px |
| background | — | selected `--accent` · else transparent |
| border | — | selected none · else 1.5px solid `--border-dashed` |
| flex | — | none |

### Theme caption
| Property | Mobile | Desktop |
|---|---|---|
| copy key | `intake.themeCaption` | same |

### Budget field
| Property | Mobile | Desktop |
|---|---|---|
| box | same as Theme field (min-height 44 / 40, padding 6px 10px, radius 9, `--surface-sunken`, 1px `--border-strong`) | same |
| `$` | mono 14px `--fg-faint` | same |
| value | mono 14px; `--fg` when set, else `--fg-faint` placeholder | same |
| copy key | placeholder `intake.budgetPlaceholder`, caption `intake.budgetCaption` | same |

### Bracket segments (Any · 1 · 2 · 3 · 4 · 5, `role="radio"`)
| Property | Mobile | Desktop |
|---|---|---|
| row display / gap | flex / 6px | flex / 6px |
| flex | Any `1.6 1 0` · digits `1 1 0` | same |
| height | 44px | 34px |
| display / align / justify | flex / center / center | same |
| border-radius | 7px | 7px |
| font-family | Any inherit (sans) · digits mono | same |
| font-size | 13px | 13px |
| font-weight | selected 600 · else 400 | same |
| color | selected `--fg` · else `--fg-muted` | same |
| background | selected `--elevated` · else `--surface-sunken` | same |
| border | 1px solid; selected `--accent` · else `--border` | same |

### Bracket caption
| Property | Mobile | Desktop |
|---|---|---|
| copy key | Any `intake.bracketNone` · else `{n} · {name}` (no key) | same |

### Submit wrap
| Property | Mobile (dock) | Desktop |
|---|---|---|
| display | flex | flex |
| flex-direction | column-reverse | row |
| align-items | stretch | center |
| gap | 7px | 16px |
| margin | 4px -18px -18px | — |
| padding | 10px 16px 12px | padding-top 20px |
| border-top | 1px solid `--border` | 1px solid `--border` |
| background | `--bg` | — |
| note beside button | — (O9) | — (O9) |

### Find commanders (bone)
| Property | Mobile | Desktop |
|---|---|---|
| height | 48px | 44px |
| width | full (stretched) | intrinsic (flex none) |
| display / align / justify | flex / center / center | same |
| padding | 0 24px | 0 24px |
| border-radius | 10px | 10px |
| background | `--fg` | `--fg` |
| color | `--bg` | `--bg` |
| border | none | none |
| font-size / weight | 15px / 600 | 15px / 600 |
| white-space | nowrap | nowrap |
| disabled | never (blank submit allowed) | same |
| copy key | none ("Find commanders") | same |

---

## Component: ResultsScreen (screen="results")

### Page body
| Property | Mobile | Desktop |
|---|---|---|
| display / flex-direction | flex / column | flex / column |
| align-items | — | stretch |
| padding | — | 0 40px 48px |

### Results column
| Property | Mobile | Desktop |
|---|---|---|
| display / flex-direction | flex / column | flex / column |
| gap | 14px | 18px |
| padding | 16px 18px 24px | — |
| max-width | — | 1080px (the 1160 box less its 40px sides) |
| margin | — | `0 auto`: centered under the form's 680 column (Hugh, 2026-09-27; ruling Q2b (a)). The results header shares the same centered 1160 box, so the title starts on the column's content edge. `RESULTS_COLUMN`, drawn by the page and its loading screen |
| order of children | ReadAsBar → order line → narrow note → skeletons / failure → Best fits → More commanders label → rows → show more | same |

---

## Component: ReadAsBar ("We read this as")

### Bar container
| Property | Mobile | Desktop |
|---|---|---|
| display / flex-direction | flex / column | flex / column |
| gap | 14px | 14px |
| padding | 14px | 16px 18px |
| border-radius | 12px | 12px |
| background | `--surface-rail` | `--surface-rail` |
| border | 1px solid `--border` | same |
| shown | every results state, loading and failed included | same |

### Bar top (answers | buttons)
| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| flex-direction | column | row |
| align-items | stretch | flex-start |
| gap | 12px | 24px |

### Answers column
| Property | Mobile | Desktop |
|---|---|---|
| display / flex-direction | flex / column | flex / column |
| gap | 9px | 9px |
| flex / min-width | 1 / 0 | 1 / 0 |

### Label
| Property | Mobile | Desktop |
|---|---|---|
| font-family | mono | mono |
| font-size | 10px | 10px |
| letter-spacing | 0.14em | 0.14em |
| text-transform | uppercase | uppercase |
| color | `--fg-faint` | `--fg-faint` |
| copy key | `readAs.label` | same |

### No answers line
| Property | Mobile | Desktop |
|---|---|---|
| shown | no chips and no Not used line | same |
| font-size | 13px | 13px |
| color | `--fg-muted` | `--fg-muted` |
| copy key | `readAs.none` | same |

### Chip list
| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| flex-wrap | wrap | wrap |
| gap | 6px | 6px |
| order | colors (kind `colors` or `exactly`) → themes → word matches → bracket control | same |

### Answer chip (read-only, no ✕)
| Property | Mobile | Desktop |
|---|---|---|
| display / align-items | inline-flex / center | inline-flex / center |
| gap | 6px | 6px |
| white-space | nowrap | nowrap |
| height | 32px | 28px |
| padding | 0 8px 0 9px | 0 8px 0 9px |
| border-radius | 6px | 6px |
| background | `--surface` | `--surface` |
| border | 1px solid `--border-strong` (matched and card); 1px dashed `--accent` (from the deeper look — ships with Look deeper) | same |

### Chip kind label
| Property | Mobile | Desktop |
|---|---|---|
| font-family | mono | mono |
| font-size | 9px | 9px |
| letter-spacing | 0.1em | 0.1em |
| text-transform | uppercase | uppercase |
| color | `--fg-locked` | `--fg-locked` |
| values | colors · exactly · theme · card · budget · bracket | same |

### Chip value — matched (theme, colors, budget, bracket)
| Property | Mobile | Desktop |
|---|---|---|
| font-size | 12.5px | 12.5px |
| font-weight | 400 | 400 |
| color | `--fg-body` | `--fg-body` |

### Chip value — card
| Property | Mobile | Desktop |
|---|---|---|
| font-size | 12.5px | 12.5px |
| font-weight | 600 | 600 |
| color | `--fg` | `--fg` |
| border-bottom | 1px dotted `--accent` | same |
| press | opens `CardModal` | same |
| trailing | owned: `OwnershipDot` (canvas: 6px circle `--success`, aria-label "Owned") · unowned priced: `BuyTag variant="row"` · unpriced: `buy · no price` (O8) | same |

### Canvas buy tag (reference for the trailing tag; ship `BuyTag variant="row"`)
| Property | Mobile | Desktop |
|---|---|---|
| font-family / size | mono 9.5px | mono 9.5px |
| white-space | nowrap | nowrap |
| border-radius | 4px | 4px |
| padding | 1px 5px | 1px 5px |
| color | `--warning` | `--warning` |
| background | `color-mix(in oklab, var(--warning) 13%, transparent)` | same |
| `·` separator | `--border-strong`, padding 0 3px | same |
| price | `--fg-body` · "no price" `--fg-faint` | same |

### Not used line
| Property | Mobile | Desktop |
|---|---|---|
| shown | the words left phrases unmatched | same |
| display | flex | flex |
| flex-wrap | wrap | wrap |
| align-items | baseline | baseline |
| gap | 4px 10px | 4px 10px |
| label font | mono 9.5px, letter-spacing 0.1em, uppercase, `--fg-locked` | same |
| label copy key | `readAs.notUsed` (`readAs.stillNotUsed` after a deeper look) | same |
| phrase | 13px `--fg-muted`, in curly quotes, not a chip (no edge, no ✕) | same |
| phrase border-bottom | 1px dotted `--border-dashed` | same |

### Buttons group
| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| gap | 8px | 8px |
| flex | none | none |

### Change answers
| Property | Mobile | Desktop |
|---|---|---|
| height | 44px | 36px |
| flex | 1 1 0 | none |
| display / align / justify | flex / center / center | same |
| padding | 0 16px | 0 16px |
| border-radius | 8px | 8px |
| border | 1px solid `--accent` | same |
| color | `--accent` | `--accent` |
| background | transparent | transparent |
| font-size / weight | 13.5px / 600 | 13.5px / 600 |
| white-space | nowrap | nowrap |
| behavior | back to the form with its state kept | same |
| copy key | none in `readAs` (`searchFailed.change` holds the same label) | same |

### Start over
| Property | Mobile | Desktop |
|---|---|---|
| height | 44px | 36px |
| flex | 1 1 0 | none |
| padding | 0 14px | 0 14px |
| border-radius | 8px | 8px |
| border | 1px solid `--border-strong` | same |
| color | `--fg-body` | `--fg-body` |
| font-size / weight | 13.5px / 400 | 13.5px / 400 |
| white-space | nowrap | nowrap |
| behavior | clears the form | same |
| copy key | none | same |

### Look deeper panel (out of scope)
| Property | Mobile | Desktop |
|---|---|---|
| shown | submit had words — ships in a later PR; this PR renders no offer and no credit line | same |

---

## Component: OrderLine

### Container
| Property | Mobile | Desktop |
|---|---|---|
| display / flex-direction | flex / column | flex / column |
| gap | 5px | 5px |
| shown | every state but none-fit (5b) and search failed (5e) | same |

### Head (h2)
| Property | Mobile | Desktop |
|---|---|---|
| font-family | display | display |
| font-weight | 600 | 600 |
| font-size | 15px | 18px |
| color | `--fg` | `--fg` |
| margin | 0 | 0 |
| total printed | never (O4) | never |
| copy key | several `results.all` · no theme/card `results.byOwned` · one theme or card "Ordered by {x}" (no key; `results.head` dropped) · loading `results.loadingHead` | same |

### Sub
| Property | Mobile | Desktop |
|---|---|---|
| font-size | 12px | 13px |
| line-height | 1.55 | 1.55 |
| color | `--fg-muted` | `--fg-muted` |
| max-width | 640px | 640px |
| margin | 0 | 0 |
| copy key | `results.subTheme(t)` · `results.subCard(c)` · `results.subSeveral(lead, other)` · `results.subOwned` · loading `results.loadingSub(by)` | same |

---

## Component: BestFits

### Section
| Property | Mobile | Desktop |
|---|---|---|
| shown | ≥ 4 results and no narrow note | same |
| display / flex-direction | flex / column | flex / column |
| gap | 10px | 10px |

### "Best fits" label
| Property | Mobile | Desktop |
|---|---|---|
| font-family | mono | mono |
| font-size | 10px | 10px |
| letter-spacing | 0.14em | 0.14em |
| text-transform | uppercase | uppercase |
| color | `--accent` | `--accent` |
| copy key | `results.bestFits` | same |

### Grid
| Property | Mobile | Desktop |
|---|---|---|
| display | grid | grid |
| grid-template-columns | minmax(0,1fr) | repeat(3, minmax(0,1fr)) |
| gap | 10px | 14px |
| content | results 1–3 | same |

### Card
| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| flex-direction | row (art at left) | column |
| border-radius | 12px | 12px |
| overflow | hidden | hidden |
| background | `--surface-rail` | `--surface-rail` |
| border | 1px solid `color-mix(in oklab, var(--accent) 30%, var(--border))` | same |
| press | opens the hand-off | same |

### Art
| Property | Mobile | Desktop |
|---|---|---|
| source | `CommanderThumb` art crop | same |
| position | relative | relative |
| height | 88px | 132px |
| width | 88px at left per HANDOFF §4 (canvas sets no width) | full card width |
| border-bottom | 1px solid `--border` (canvas) | 1px solid `--border` |

### Rank disc
| Property | Mobile | Desktop |
|---|---|---|
| position | absolute, left 10px, top 10px | same |
| width / height | 26px | 26px |
| border-radius | 50% | 50% |
| display / align / justify | flex / center / center | same |
| font | mono 600 12px | mono 600 12px |
| background | `--bg` | `--bg` |
| color | `--accent` | `--accent` |
| border | 1px solid `color-mix(in oklab, var(--accent) 50%, transparent)` | same |

### Card body
| Property | Mobile | Desktop |
|---|---|---|
| display / flex-direction | flex / column | flex / column |
| gap | 9px | 9px |
| padding | 11px 12px | 14px 15px 15px |
| flex / min-width | 1 / 0 | 1 / 0 |

### Name row
| Property | Mobile | Desktop |
|---|---|---|
| display / align-items | flex / center | flex / center |
| gap | 8px | 8px |
| min-width | 0 | 0 |

### Name
| Property | Mobile | Desktop |
|---|---|---|
| font-family | display | display |
| font-weight | 600 | 600 |
| font-size | 14.5px | 17px |
| color | `--fg` | `--fg` |
| border-bottom | 1px dotted `--accent` | same |
| overflow | nowrap, hidden, ellipsis, min-width 0 | same |
| press | opens the card | same |

### Pips (color identity)
| Property | Mobile | Desktop |
|---|---|---|
| group | flex, gap 4px, flex none | same |
| size | 9px circle | 11px circle |

### Figures list
| Property | Mobile | Desktop |
|---|---|---|
| display / flex-direction | flex / column | flex / column |
| gap | 4px | 4px |
| figure row | flex, align baseline, gap 7px, wrap | same |

### Figure percent
| Property | Mobile | Desktop |
|---|---|---|
| font | mono 600 13px | mono 600 15px |
| color | lit (the lowest, or the only figure) `--fg` · dimmed `--fg-muted` | same |

### Figure sentence
| Property | Mobile | Desktop |
|---|---|---|
| font-size | 12px | 12.5px |
| color | lit `--fg-body` · dimmed `--fg-faint` | same |
| copy key | `results.figTheme(pct, t)` · `results.figCard(pct, c)` · `results.figOwned(owned, total)` | same |

### SETS RANK tag
| Property | Mobile | Desktop |
|---|---|---|
| shown | only with ≥ 2 figures, on the lowest | same |
| font | mono 8.5px | mono 8.5px |
| letter-spacing | 0.12em | 0.12em |
| color | `--accent` | `--accent` |
| copy key | `results.setsRank` | same |

### Rule
| Property | Mobile | Desktop |
|---|---|---|
| height | 1px | 1px |
| background | `--border` | `--border` |

### Ownership line / loading / failed
| Property | Mobile | Desktop |
|---|---|---|
| — | as Component OwnershipLine; loading bar 90px wide | same |
| separator `·` between mark and text | drawn, as on rows (see OwnershipLine; orchestrator ruling 2026-09-25) | same |

---

## Component: ChooseRow (the rest, under "More commanders")

### "More commanders" label
| Property | Mobile | Desktop |
|---|---|---|
| shown | only when Best fits shows | same |
| font | mono 10px, letter-spacing 0.14em, uppercase | same |
| color | `--fg-faint` | `--fg-faint` |
| margin-top | 6px | 6px |
| copy key | `results.moreCommanders` (O10: the first `more`, given its own key) | same |

### Row list
| Property | Mobile | Desktop |
|---|---|---|
| display / flex-direction | flex / column | flex / column |
| gap | 10px | 10px |
| content | results 4+ with Best fits, else every result; first 12 | same |

### Row
| Property | Mobile | Desktop |
|---|---|---|
| display | flex | grid |
| grid-template-columns | — | 40px minmax(0,1fr) 340px 14px |
| align-items | center | center |
| gap | 11px | 16px |
| padding | 10px 12px | 12px 15px |
| border-radius | 10px | 11px |
| background | `--surface-rail` | `--surface-rail` |
| border | 1px solid `--border` | same |
| min-height | 44px | — |
| opacity | 1 (0.45 only while a deeper look runs — out of scope) | same |
| press | opens the hand-off | same |
| moves on load/fail | never | never |

### Thumb
| Property | Mobile | Desktop |
|---|---|---|
| source | `CommanderThumb` | same |
| width × height | 40 × 56px | 40 × 56px |
| border-radius | 5px | 5px |
| flex | none | none |
| canvas box-shadow | inset 0 0 0 1px rgba(255,255,255,0.08) (placeholder) | same |

### Main column
| Property | Mobile | Desktop |
|---|---|---|
| display / flex-direction | flex / column | flex / column |
| gap | 5px | 7px |
| flex / min-width | 1 / 0 | 1 / 0 |

### Name row / name
| Property | Mobile | Desktop |
|---|---|---|
| name row | flex, center, gap 8px, min-width 0 | same |
| font | display 600 14px | display 600 16px |
| color | `--fg` | `--fg` |
| border-bottom | 1px dotted `--accent` | same |
| overflow | nowrap, hidden, ellipsis, min-width 0 | same |
| press | opens the card | same |
| pips | 9px circles, gap 4px | 11px circles, gap 4px |

### Figures — phone (under the name)
| Property | Mobile | Desktop |
|---|---|---|
| shown | yes | — |
| list | flex column, gap 2px | — |
| line | mono 10.5px, line-height 1.45 | — |
| percent | weight 600, lit `--fg` · dim `--fg-muted`, left-aligned | — |
| sentence | mono 10.5px, lit `--fg-body` · dim `--fg-faint` | — |
| SETS RANK | margin-left 6px, 8.5px, letter-spacing 0.12em, `--accent` | — |

### Figures column — desktop (3rd grid column, 340px)
| Property | Mobile | Desktop |
|---|---|---|
| shown | — | yes |
| list | — | flex column, gap 5px |
| figure row | — | flex, align baseline, gap 8px |
| percent | — | mono 600 14px, min-width 38px (34px in the ownership order), text-align right; lit `--fg` · dim `--fg-muted` |
| sentence | — | sans 12.5px; lit `--fg-body` · dim `--fg-faint` |
| SETS RANK | — | mono 9px, letter-spacing 0.12em, `--accent` |

### Chevron `›`
| Property | Mobile | Desktop |
|---|---|---|
| font-size | 18px | 18px |
| color | `--fg-faint` | `--fg-faint` |
| aria-hidden | true | true |

---

## Component: OwnershipLine (rows and best-fit cards)

### Line (ready)
| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| flex-wrap | wrap | wrap |
| align-items | center | center |
| gap | 3px row gap; no column gap (each segment's 14px separator slot spaces it) | same |
| font | mono 10px | mono 11px |
| color | `--fg-muted` | `--fg-muted` |
| order | unbreakable segments: mark, count, buy figure, each led by its own `·` (`--border-strong`) in a 14px slot, inside a clipped gutter so the separator of a segment that starts a line is never drawn (orchestrator ruling 2026-09-25: no separator first or last on a line; this supersedes the canvas's rows-only separator, on cards too) | same |
| copy key | `results.ownCount(owned)` and `results.ownBuy(buy, cap?)`; `, inside {cap}` only when a budget was given and the figure is inside it | same |

### Mark (O7: ship the components)
| Property | Mobile | Desktop |
|---|---|---|
| owned, a free copy | `OwnershipDot` + `results.free` (canvas: 6px circle `--success`, text `--fg-body`, gap 6) | same |
| owned, none free | `AvailabilityGlyph hard` + "none free — in {deck}" (canvas: 6px square rotated 45° `--accent`, text `--avail-hard-fg`, gap 6) | same |
| not owned | `BuyTag variant="row"` | same |
| flex | none | none |

### Unpriced build-around line
| Property | Mobile | Desktop |
|---|---|---|
| shown | the words named a card with no price on record; every row | same |
| font | mono 10.5px | mono 10.5px |
| color | `--fg-faint` | `--fg-faint` |
| copy key | `results.unpriced(card)` (+ O6) | same |

### Row loading ("Counting what you own…")
| Property | Mobile | Desktop |
|---|---|---|
| replaces | the ownership line only | same |
| layout | flex, center, gap 9px | same |
| bar | 120px (row) / 90px (best card) × 8px, radius 4px, `--elevated`; breathes (`anim-skeleton`, Hugh 2026-10-12, superseding "static") | same |
| text | mono 10.5px `--fg-faint` | same |
| copy key | `results.rowPending` | same |

### Row failed
| Property | Mobile | Desktop |
|---|---|---|
| replaces | the ownership line only | same |
| text | mono 10.5px `--fg-muted` | same |
| Retry | `--accent`, border-bottom 1px solid `--accent` | same |
| copy key | `results.rowFailed`, `results.retry` | same |

---

## Component: ShowMore

### Row
| Property | Mobile | Desktop |
|---|---|---|
| shown | more than 12 results | same |
| display / align-items | flex / center | flex / center |
| gap | 14px | 14px |
| flex-wrap | wrap | wrap |

### Button
| Property | Mobile | Desktop |
|---|---|---|
| height | 44px | 36px |
| display / align / justify | inline-flex / center / center | same |
| flex | 1 1 100% | none |
| padding | 0 16px | 0 16px |
| border-radius | 8px | 8px |
| border | 1px solid `--border-strong` | same |
| color | `--fg-body` | `--fg-body` |
| font-size | 13.5px | 13.5px |
| white-space | nowrap | nowrap |
| copy key | `results.more` (the second definition; O10) | same |

### Line
| Property | Mobile | Desktop |
|---|---|---|
| font | mono 11px | mono 11px |
| color | `--fg-faint` | `--fg-faint` |
| content | no total (O4) | same |
| copy key | `results.moreNote` (wording per HANDOFF §4, no count; O4 retired `moreLine`); `results.moreFailed` when the next slice fails to load | same |

---

## Component: NarrowNote — a few fit (< 4, O5)

### Bar
| Property | Mobile | Desktop |
|---|---|---|
| position | after the order line, above the rows | same |
| display | flex | flex |
| flex-direction | column | row |
| align-items | stretch | center |
| gap | 12px | 22px |
| padding | 13px 14px | 14px 16px |
| border-radius | 11px | 11px |
| background | `--surface-sunken` | `--surface-sunken` |
| border | 1px solid `--border-strong` | same |
| text column | flex column, gap 6px | same |
| best fits | not drawn | not drawn |

### Head
| Property | Mobile | Desktop |
|---|---|---|
| font | display 600 16px | display 600 19px |
| color | `--fg` | `--fg` |
| copy key | `narrow.few(n)` | same |

### Body
| Property | Mobile | Desktop |
|---|---|---|
| font-size | 13px | 13.5px |
| line-height | 1.6 | 1.6 |
| color | `--fg-body` | `--fg-body` |
| max-width | 460px | 460px |
| copy key | `narrow.fewLead` | same |

### Options list
| Property | Mobile | Desktop |
|---|---|---|
| display / flex-direction | flex / column | flex / row |
| gap | 8px | 8px |
| margin-left | 0 | auto |
| count | 2–3 options max | same |

---

## Component: NarrowState — none fit (5b)

### Frame
| Property | Mobile | Desktop |
|---|---|---|
| replaces | order line, best fits, rows | same |
| display / flex-direction | flex / column | flex / column |
| align-items | center | center |
| text-align | center | center |
| gap | 18px | 18px |
| padding | 36px 18px | 52px 40px |
| border-radius | 14px | 14px |
| border | 1px dashed `--border-strong` | same |

### Head / body
| Property | Mobile | Desktop |
|---|---|---|
| head | display 600 16px `--fg` · `narrow.none` | display 600 19px `--fg` · `narrow.none` |
| body | 13px, lh 1.6, `--fg-body`, max 460 · `narrow.noneLead` | 13.5px, lh 1.6, `--fg-body`, max 460 · `narrow.noneLead` |

### Options list
| Property | Mobile | Desktop |
|---|---|---|
| display / flex-direction | flex / column | flex / column |
| gap | 8px | 8px |
| width | 100% | 100% |
| max-width | 440px | 440px |

### "Or change your answers yourself."
| Property | Mobile | Desktop |
|---|---|---|
| font-size | 12.5px | 12.5px |
| color | `--fg-faint` | `--fg-faint` |
| link | `--accent`, border-bottom 1px solid `color-mix(in oklab, var(--accent) 50%, transparent)`; goes to the form | same |
| copy key | `narrow.yourself` | same |

---

## Component: NarrowOption (both narrow variants)

### Option row
| Property | Mobile | Desktop |
|---|---|---|
| display / align-items | flex / center | flex / center |
| gap | 12px | 12px |
| min-height | 48px | 44px |
| padding | 8px 12px 8px 14px | 8px 12px 8px 14px |
| border-radius | 9px | 9px |
| text-align | left | left |
| background | first (brings back most) `--elevated` · else transparent | same |
| border | 1px solid; first `color-mix(in oklab, var(--accent) 55%, transparent)` · else `--border-strong` | same |
| press | drops/widens one answer and searches again | same |

### Label column
| Property | Mobile | Desktop |
|---|---|---|
| layout | flex column, gap 2px, flex 1, min-width 0 | same |
| label | 13.5px / 600, `--fg`, nowrap | same |
| label copy key | `narrow.drop(answer)` · `narrow.widenColors(names)` | same |
| reason (optional) | 11.5px, lh 1.45, `--fg-faint` · `narrow.gameChanger(card, bracket)` | same |

### Count
| Property | Mobile | Desktop |
|---|---|---|
| font | mono 11px | mono 11px |
| color | first `--fg-body` · else `--fg-faint` | same |
| white-space / flex | nowrap / none | same |
| copy key | `narrow.count(n)` | same |

### Arrow `→`
| Property | Mobile | Desktop |
|---|---|---|
| font-size | 13px | 13px |
| color | first `--accent` · else `--fg-faint` | same |
| flex | none | none |
| aria-hidden | true | true |

---

## Component: SearchFailed (5e)

### Frame
| Property | Mobile | Desktop |
|---|---|---|
| replaces | order line, best fits, rows | same |
| display / flex-direction | flex / column | flex / column |
| align-items / text-align | center / center | center / center |
| gap | 10px | 10px |
| padding | 36px 18px | 56px 40px (HANDOFF says "the same frame", 52) |
| border-radius | 14px | 14px |
| border | 1px dashed `--border-strong` | same |

### `!` disc
| Property | Mobile | Desktop |
|---|---|---|
| width / height | 36px | 36px |
| border-radius | 50% | 50% |
| display / align / justify | flex / center / center | same |
| font | mono 600 15px | mono 600 15px |
| color | `--warning` | `--warning` |
| border | 1.5px solid `color-mix(in oklab, var(--warning) 55%, transparent)` | same |

### Head / body
| Property | Mobile | Desktop |
|---|---|---|
| head | display 600 16px `--fg` · `searchFailed.head` | display 600 19px `--fg` · `searchFailed.head` |
| body | 13px lh 1.6 `--fg-body` max 460 · `searchFailed.body` | 13.5px lh 1.6 `--fg-body` max 460 · `searchFailed.body` |

### Buttons
| Property | Mobile | Desktop |
|---|---|---|
| group | flex column, gap 8px, width 100%, margin-top 4px | flex row, gap 8px, width auto, margin-top 4px |
| Try again (bone) | h 44, padding 0 16, radius 8, bg `--fg`, color `--bg`, 13.5 / 600 · `searchFailed.retry` | h 36, same otherwise |
| Change answers (hairline) | h 44, padding 0 16, radius 8, 1px `--border-strong`, `--fg-body`, 13.5, nowrap · `searchFailed.change` | h 36, same otherwise |

---

## Component: ResultsSkeleton (5c, searching)

### List
| Property | Mobile | Desktop |
|---|---|---|
| shown | the search is running; screen opens at once with the bar and order line | same |
| display / flex-direction | flex / column | flex / column |
| gap | 10px | 10px |
| aria-busy | true | true |
| rows | 5 | 5 |
| motion | `anim-skeleton`: the rows breathe, opacity 1 to 0.55 over 1.4s, in-out, looping; still under reduced motion (Hugh, 2026-10-12, superseding "none") | same |

### Skeleton row
| Property | Mobile | Desktop |
|---|---|---|
| display / align-items | flex / center | flex / center |
| gap | 14px | 14px |
| padding | 10px 12px | 12px 15px |
| border-radius | 11px | 11px |
| background | `--surface-rail` | `--surface-rail` |
| border | 1px solid `--border` | same |
| thumb | 40 × 56px, radius 5, `--elevated`, flex none | same |
| lines column | flex 1, column, gap 9px | same |
| line a | width 58% − 5% per row (58, 53, 48, 43, 38), h 11px, radius 5, `--elevated` | same |
| line b | width 40% / 52% alternating, h 8px, radius 4, `--surface-raised` | same |

---

## State Coverage

(Look deeper states 3b–3g and the doors / hand-off are out of scope and listed only for completeness.)

| State | Triggering condition | Component rendered | Key props required |
|---|---|---|---|
| 2a blank | form, nothing entered | IntakeForm, every control at no preference; Find commanders enabled | answers all empty |
| 2b matched | form, words and/or controls set | IntakeForm; no chips, counts or commanders | words, colors, mode, themes, budget, bracket |
| 2a submitted | blank submit | ResultsScreen: ReadAsBar "No answers given", OrderLine `byOwned` + `subOwned`, rows, ShowMore | order = owned |
| 3a leftover | submit with words, some phrases unmatched | ReadAsBar chips + Not used (+ offer, later), results | chips, notUsed[] |
| 3b–3g | deeper look states | out of scope (DeeperLook) | — |
| best fits | ≥ 4 results and no narrow note | BestFits (top 3) + "More commanders" + ChooseRow | rows ≥ 4, note null |
| 4a theme | one theme | OrderLine "Ordered by {t}" + `subTheme`, one figure per row, no SETS RANK | order = theme |
| 4b themes | two themes | OrderLine `all` + `subSeveral`; lowest figure lit + SETS RANK, others dimmed | figures[], lowest |
| 4c card | words match one card | card chip (opens CardModal, buy tag/dot); OrderLine "Ordered by {c}" + `subCard` | order = card, card ownership |
| 4d themecard | theme + card (+ budget, bracket) | 4 chips; OrderLine `all`; own line `, inside {cap}` | budget cap |
| 4e unpriced | build-around card has no price | chip `buy · no price`; every row adds unpriced line | unpricedCard |
| 4f ownership | colors only, no theme/card | OrderLine `byOwned`; figures `figOwned`; pct min-width 34 | order = owned, colors |
| 5a narrow | 1–3 results (< 4, O5) | NarrowNote bar above rows, no best fits | note.options (2–3), counts |
| 5b zero | no results | NarrowState frame; no order line; options (+ reason line), "change your answers yourself" link | note.none, options, why |
| 5c loading | search in flight | ReadAsBar + OrderLine `loadingHead` / `loadingSub` + 5 ResultsSkeleton rows | loading |
| 5d rowloading | per-row trial fill pending / failed | OwnershipLine replaced by "Counting…" bar or "Couldn't count… Retry"; row never moves | row.loading, row.failed |
| 5e listfailed | search request failed | SearchFailed frame (Try again, Change answers); answers kept | failed |
| flag off | `HELP_ME_CHOOSE_ENABLED` false | route not-found (F3) | — |
