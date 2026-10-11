# Design Property Table — I got it (sub-project 4), §A row + §B confirm

Source: `design/design_handoff_the99_i_got_it/` — `The 99 - I Got It (R2) · A Row and B Confirm.dc.html`,
`IGI Row.dc.html`, `IGI Confirm.dc.html`, README.md, STATES-i-got-it.md (§A, §B, E1), READINESS-audit.md.
R1 files ignored. Mobile = below `lg` (the canvas's 390 frames, `ph: true`); Desktop = `lg` and up.
Copy wording is out of scope: rows name the copy *key/slot*, not the text (wording → `/copy-review`).

**Audit overrides applied (READINESS-audit.md errata/findings win over the canvas):**
- Tag accessible name = `gotItCopy.row.tagAria` (the canvas's `Bought <card>? Add it to your collection`), NOT README's `I got it: <card>` (erratum 1). The tag's existing sentence becomes its description.
- R2 truth is modal (desktop) / bottom sheet (phone); details link and title are the same key (`Bought this card?`) — not the README "Notes for engineering" popover / `I got it` link (erratum 3).
- The phone-stack flip (`buy` over `over $X`) and the shortened ⇄ key text are gated on `SHOPPING_MARK_BOUGHT_ENABLED && COLLECTION_EDIT_ENABLED`; with either off the row and key are `main`'s (finding 5, erratum 4).
- Finish preset/rules: options always derive from the selected printing's `finishes`; keep current finish if still offered, else nonfoil, else first offered. A sold-out row presets no printing and no finish (plan, "How the preset is chosen"; B1/B7/A5), unless the card has exactly one printing, which is selected with nonfoil when offered, else its first offered finish (finding 1, closed rulings).

---

## Component: BuyTag (row variant, Shopping, as a button)

### Tag wrapper (the button / hit target)
| Property | Mobile | Desktop |
|----------|--------|---------|
| element | `<button>` (role=button) when live | `<button>` (role=button) when live |
| element, either switch off | plain span, no role (`main`'s) | plain span, no role (`main`'s) |
| flex | none | none |
| display | flex | flex |
| flex-direction | column | column |
| align-items | flex-end | flex-end |
| gap (tag → `over $X`) | 2px | 2px |
| hit-area extension | an invisible 44px box centred on the stack (`::before`), in every state; the canvas's 8px padding and -8px margin reach 44px only with `over $X` stacked, so a plain plate would be ~32px | — |
| hit area height | 44px, whatever the stack's height, moving nothing on the 52px row | — (tag's own box) |
| hit target | whole stack (`buy` + `over $X`) is one target, ~70×44 | the tag |
| must not overlap | ⇄'s 44×44 area | ⇄'s area |
| cursor | pointer when live, default when inert | pointer when live, default when inert |
| aria-label | `gotItCopy.row.tagAria(card)` | `gotItCopy.row.tagAria(card)` |
| aria-description | the tag's existing sentence (e.g. spoken-for `a second copy to buy`) | same |
| aria-expanded | "true" when open, else "false" | same |
| aria-busy | "true" when pending, else "false" | same |

### Tag plate (`buy` chip) — at rest
| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | none | none |
| font-family | var(--font-mono) (IBM Plex Mono) | var(--font-mono) (IBM Plex Mono) |
| font-size | 9px | 9.5px |
| border-radius | 4px | 4px |
| padding | 1px 5px | 1px 5px |
| color | var(--warning) | var(--warning) |
| background | color-mix(in oklab, var(--warning) 13%, transparent) | color-mix(in oklab, var(--warning) 13%, transparent) |
| white-space | nowrap | nowrap |
| box-shadow (row over the limit) | inset 0 0 0 1px color-mix(in oklab, var(--warning) 60%, transparent) | inset 0 0 0 1px color-mix(in oklab, var(--warning) 60%, transparent) |
| opacity | 1 | 1 |
| width | identical to `main` in every state (no width change) | identical to `main` in every state |

### Tag plate — inner parts
| Property | Mobile | Desktop |
|----------|--------|---------|
| word | `buy` (always first) | `buy` (always first) |
| separator `·` color | var(--border-strong) | var(--border-strong) |
| separator padding | 0 3px | 0 3px |
| separator aria-hidden | true | true |
| separator + figure slot render when | not bare, or pending | not bare, or pending |
| figure slot content | price / `sold out` / `adding…` (pending) | price / `sold out` / `adding…` (pending) |
| figure slot display | inline (inline-block min-width 0 when pending) | inline-block |
| figure slot min-width | 0 | 46px |
| figure slot text-align | — (right when pending) | right |
| figure slot color | var(--fg-body) | var(--fg-body) |
| qualifier (e.g. `foil`) color | var(--fg-faint) | var(--fg-faint) |
| qualifier renders when | qual set AND not sold out AND not pending | qual set AND not sold out AND not pending |

### Tag plate — hover (desktop only; no phone hover)
| Property | Mobile | Desktop |
|----------|--------|---------|
| background | — | color-mix(in oklab, var(--warning) 24%, transparent) |
| everything else (ink, word, figure, ring, width) | — | unchanged |

### Tag plate — focus
| Property | Mobile | Desktop |
|----------|--------|---------|
| outline | 2px solid var(--accent) | 2px solid var(--accent) |
| outline-offset | 2px | 2px |
| background | 13% wash (unchanged) | 13% wash (unchanged) |

### Tag plate — press (active)
| Property | Mobile | Desktop |
|----------|--------|---------|
| background | color-mix(in oklab, var(--warning) 30%, transparent) | color-mix(in oklab, var(--warning) 30%, transparent) |

### Tag plate — open (confirm up)
| Property | Mobile | Desktop |
|----------|--------|---------|
| background | color-mix(in oklab, var(--warning) 24%, transparent) | color-mix(in oklab, var(--warning) 24%, transparent) |
| aria-expanded | true | true |
| row shell background | var(--elevated-hover) (row hover ground held) | var(--elevated-hover) (row hover ground held) |
| held under the scrim | yes | yes |

### Tag plate — pending
| Property | Mobile | Desktop |
|----------|--------|---------|
| figure slot text | `adding…` key | `adding…` key |
| figure slot color | var(--fg-muted) | var(--fg-muted) |
| figure slot display | inline-block | inline-block, min-width 46px, right |
| opacity (tag) | 0.75 | 0.75 |
| row opacity | 0.6 | 0.6 |
| aria-busy | true | true |
| background | 13% wash | 13% wash |
| second press | ignored (no second write) | ignored |
| width | follows `adding…` (the phone slot reserves no width) | unchanged (the 46px slot) |

### Tag plate — disabled (another write for this card in flight)
| Property | Mobile | Desktop |
|----------|--------|---------|
| opacity | 0.45 | 0.45 |
| figure slot | still reads its price | still reads its price |
| press | no write sent | no write sent |

### `over $X` (row over the limit)
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | inside the tag stack, UNDER `buy` (flipped from main; switches on only) | inline in the name block after the figure (main's, unchanged) |
| font-family | var(--font-mono) | var(--font-mono) |
| font-size | 10px | 10px |
| line-height | 1 | — |
| white-space | nowrap | nowrap |
| color | var(--warning) | var(--warning) |
| leading `·` separator | — | yes, var(--border-strong), aria-hidden |
| wrapper display | — | inline-flex, align-items center, gap 5px, margin-left -1px |
| either switch off | main's order (`over $X` above the tag) | unchanged |

### Neighbours (unchanged; context for A2/A4)
| Property | Mobile | Desktop |
|----------|--------|---------|
| ⇄ size | 44×44, margin-right -9px | 22×20 |
| ⇄ font | mono 13px, line-height 1, var(--warning) | mono 13px, line-height 1, var(--warning) |
| ⇄ renders when | tools AND over AND not commander | tools AND over AND not commander |
| ⇄ reserve slot when no ⇄ | — | 22px empty, aria-hidden |
| ✕ size | 44×44 | auto |
| ✕ color | var(--border-dashed) | var(--border-dashed) |
| ✕ on commander row | visibility hidden | visibility hidden |
| row shell min-height | 52px | 34px |
| row shell padding | 0 4px 0 8px | 7px 9px |
| row shell gap | 9px | 10px |
| row shell radius | 7px | 7px |
| row shell background (rest) | var(--surface-rail) | var(--surface-rail) |

### All tab collapsed `$` tag
| Property | Mobile | Desktop |
|----------|--------|---------|
| interactive | no (inert, not a button) | no (inert, not a button) |

---

## Component: ShoppingHead key

### Key container
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | grid | flex |
| grid-template-columns | repeat(2, minmax(0, 1fr)) | — |
| flex-wrap | — | wrap |
| align-items | center | center |
| gap | 6px 12px | 6px 22px |
| padding | 0 0 10px | 0 4px |
| border-bottom | 1px solid var(--border) | — |
| margin-top | — (sibling gap 10px in head) | 6px |
| position | after the `Marking cards over` line | after the `Marking cards over` line, before the `N cards this deck wants…` line |
| item count | 2 (⇄ item, then buy item) | 2 in one row (never stacked) |
| buy item renders when | both switches on | both switches on |

### Key item (both items)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center |
| gap | 7px | 7px |
| font-family | var(--font-mono) | var(--font-mono) |
| font-size | 10.5px | 10.5px |
| line-height | 1.5 | 1.5 |
| color | var(--fg-faint) | var(--fg-faint) |
| label | copy key (⇄ item replaces shipped `swapToolsCopy` text; buy item new key) | same |

### Key ⇄ glyph
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 18px | 18px |
| text-align | center | center |
| font-size | 15px | 15px |
| line-height | 1 | 1 |
| color | var(--warning) | var(--warning) |

### Key `buy` chip
| Property | Mobile | Desktop |
|----------|--------|---------|
| color | var(--warning) | var(--warning) |
| background | color-mix(in oklab, var(--warning) 13%, transparent) | color-mix(in oklab, var(--warning) 13%, transparent) |
| border-radius | 3px | 3px |
| padding | 0 4px | 0 4px |

---

## Component: Details link (second way in, A11)

### `Bought this card?` link on the In your collection receipt label line
| Property | Mobile | Desktop |
|----------|--------|---------|
| renders when | modal opened from a Shopping row (`door` context), both switches on | same |
| never | beside `Edit copies`; from /collection, decks' All tab or search | same |
| role | button | button |
| margin-left | auto (right-aligned on the label line) | auto |
| min-height | 44px | — |
| display | inline-flex, align-items center | — |
| padding | 0 2px | — |
| font-size | 14px | 14px |
| color | var(--accent) | var(--accent) |
| text-decoration | underline, offset 4px | underline, offset 4px |
| label line | flex, align center, gap 10px, min-height 44px, margin -10px 0 -6px | flex, align baseline, gap 12px |
| label text style | mono 11px, ls 0.14em, uppercase, var(--fg-faint) | mono 11px, ls 0.14em, uppercase, var(--fg-faint) |
| confirm opens as | bottom sheet stacked over the card sheet | dialog stacked over the card modal |
| after write | receipt re-reads in place (`none` → `×1`) | same |

---

## Component: GotItConfirm

### Overlay / container
| Property | Mobile | Desktop |
|----------|--------|---------|
| form | bottom sheet | centred modal dialog |
| scrim | color-mix(in oklab, var(--bg) 70%, transparent), the shared scrim of `collection/confirm-modal.tsx`, which tracks the theme (the canvas drew a fixed rgba(5,5,8,0.62)) | color-mix(in oklab, var(--bg) 74%, transparent), same |
| position | left 0, right 0, bottom 0 | centred |
| role | dialog | dialog |
| aria-modal | true | true |
| aria-labelledby | title id | title id |
| focus trap | yes | yes |
| initial focus | the selected printing | the selected printing |
| on close | focus returns to the tag | focus returns to the tag |
| instances | one confirm open at a time across the list | same |

### Shell
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | relative | relative |
| width | 100% | 520px |
| border-radius | 16px 16px 0 0 | 14px |
| background | var(--surface) | var(--surface) |
| border | border-top 1px solid var(--border-strong) | 1px solid var(--border-strong) |
| box-shadow | — | 0 40px 100px rgba(0,0,0,0.7) (canvas note: `--modal-shadow`) |
| padding | 10px 18px 18px | 24px 24px 20px |
| display | flex | flex |
| flex-direction | column | column |
| gap | 18px | 18px |

### Grabber
| Property | Mobile | Desktop |
|----------|--------|---------|
| renders | yes | — |
| width × height | 36px × 4px | — |
| border-radius | 2px | — |
| background | var(--border-dashed) | — |
| align-self | center | — |
| margin-bottom | 2px | — |
| aria-hidden | true | — |

### Close ✕
| Property | Mobile | Desktop |
|----------|--------|---------|
| renders | — | yes |
| position | — | absolute, top 18px, right 18px |
| width × height | — | 36px × 36px |
| border-radius | — | 50% |
| border | — | 1px solid var(--border-strong) |
| display | — | flex, center/center |
| font-size | — | 13px |
| color | — | var(--fg-muted) |
| aria-label | — | Close |

### Title block
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex column | flex column |
| gap | 6px | 6px |
| padding-right | 0 | 44px |

### Title (h3)
| Property | Mobile | Desktop |
|----------|--------|---------|
| element | h3 with id (dialog label) | h3 with id |
| copy | title key (`Bought this card?`), same key as the details link | same |
| margin | 0 | 0 |
| font-family | var(--font-display) (Cinzel) | var(--font-display) (Cinzel) |
| font-weight | 700 | 700 |
| font-size | 19px | 21px |
| line-height | 1.25 | 1.25 |
| color | var(--fg) | var(--fg) |

### Card name (under title)
| Property | Mobile | Desktop |
|----------|--------|---------|
| content | card name | card name |
| font-size | 15px | 15px |
| line-height | 1.4 | 1.4 |
| color | var(--fg-body) | var(--fg-body) |

### Fields wrapper (printing + finish + quantity)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex column | flex column |
| gap | 18px | 18px |
| opacity | 1 (0.6 when pending) | 1 (0.6 when pending) |

### Section labels (Printing / Finish / How many)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | var(--font-mono) | var(--font-mono) |
| font-size | 9.5px | 9.5px |
| letter-spacing | 0.14em | 0.14em |
| text-transform | uppercase | uppercase |
| color | var(--fg-faint) | var(--fg-faint) |

### Printing block
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex column | flex column |
| gap | 10px | 10px |
| header row | flex, align baseline, justify space-between, gap 10px | same |
| printing count | mono 10px, var(--fg-faint); `N printings` / `the only printing` key | same |

### Printing tile row (radiogroup)
| Property | Mobile | Desktop |
|----------|--------|---------|
| role | radiogroup, aria-label Printing | radiogroup, aria-label Printing |
| renders when | more than one printing | more than one printing |
| display | flex | flex |
| gap | 12px | 14px |
| overflow | scrolls sideways (B4m; ~3 tiles visible) | scrolls sideways, overriding the canvas's hidden: a card has up to 57 printings and the 520px modal fits about four 104px tiles |
| padding | 4px 4px 2px | 4px 4px 2px |
| margin | 0 -4px | 0 -4px |
| component | `PrintingRegion role="choose" layout="row"` | same |

### Printing tile
| Property | Mobile | Desktop |
|----------|--------|---------|
| role | radio, aria-checked | radio, aria-checked |
| flex | none | none |
| width | 100px | 104px |
| display | flex column | flex column |
| cursor | pointer | pointer |
| art width | 100px | 104px |
| art height | 140px (100 × 88/63) | 145px (104 × 88/63) |
| art border-radius | 9px | 9px |
| art box-shadow | inset 0 0 0 1px rgba(0,0,0,0.35) | inset 0 0 0 1px rgba(0,0,0,0.35) |
| first line (shipped) | the picker's own: set name 12px, var(--fg), margin-top 7px, with the set code in mono 10.5px var(--fg-faint) after it (the canvas drew a mono code line over the set name; the confirm reuses `PrintingRegion`'s tile text instead) | set name 13px, otherwise the same |
| second line (shipped) | mono 10.5px, `#N · you own ×N`, var(--fg-faint), margin-top 2px | mono 11px, otherwise the same |
| price on tile | none | none |
| preset badge | none | none |

### Printing tile — selected
| Property | Mobile | Desktop |
|----------|--------|---------|
| aria-checked | true | true |
| art outline | 2px solid var(--accent) | 2px solid var(--accent) |
| art outline-offset | 3px | 3px |
| first line font-weight | 600 (400 unselected) | 600 (400 unselected) |

### Single printing line (one printing; replaces tile row)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex, align center | flex, align center |
| gap | 12px | 12px |
| border-radius | 9px | 9px |
| background | var(--surface-sunken) | var(--surface-sunken) |
| border | 1px solid var(--border) | 1px solid var(--border) |
| padding | 8px 10px | 8px 10px |
| thumb | 40×56, radius 5px, inset 0 0 0 1px rgba(0,0,0,0.35) | same |
| text column | flex column, gap 2px, min-width 0 | same |
| set name | 13px, var(--fg) | 13px, var(--fg) |
| meta (code #) | mono 10.5px, var(--fg-faint) | mono 10.5px, var(--fg-faint) |

### After-printing wrapper (finish + quantity)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex column | flex column |
| gap | 18px | 18px |
| opacity | 1 (0.4 when no printing chosen) | 1 (0.4 when no printing chosen) |

### Finish block
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex column, gap 8px | flex column, gap 8px |
| chip row | flex, wrap, align center, gap 6px | same |
| options | the selected printing's `finishes` | same |
| finish note | 12px, var(--fg-muted) (foil-only / etched-only key) | same |

### Finish chip (rest)
| Property | Mobile | Desktop |
|----------|--------|---------|
| role | radio, aria-checked | radio, aria-checked |
| display | inline-flex, align center | inline-flex, align center |
| height | 44px | 32px |
| padding | 0 13px | 0 13px |
| border-radius | 999px | 999px |
| font-size | 12.5px | 12.5px |
| font-weight | 400 | 400 |
| border | 1px solid var(--border-strong) | 1px solid var(--border-strong) |
| color | var(--fg) | var(--fg) |
| background | var(--elevated) | var(--elevated) |

### Finish chip — selected
| Property | Mobile | Desktop |
|----------|--------|---------|
| background | var(--accent) | var(--accent) |
| color | var(--bg) | var(--bg) |
| font-weight | 600 | 600 |

### Finish chip — not offered by the printing
| Property | Mobile | Desktop |
|----------|--------|---------|
| border | 1px dashed var(--border-strong) | 1px dashed var(--border-strong) |
| color | var(--fg-locked) | var(--fg-locked) |
| background | transparent | transparent |
| selectable | no | no |

### Quantity block
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex column, gap 8px | flex column, gap 8px |
| row | flex, align center, gap 12px, wrap | same |
| stepper group | flex, align center, gap 6px | same |
| preset | the row's need (shortfall for spoken-for) | same |
| range | 1–20 | 1–20 |

### Stepper buttons (− / +)
| Property | Mobile | Desktop |
|----------|--------|---------|
| width × height | 44px × 44px | 32px × 32px |
| display | inline-flex, center/center | inline-flex, center/center |
| border-radius | 8px | 8px |
| border | 1px solid var(--border-strong) | 1px solid var(--border-strong) |
| font-size | 16px | 16px |
| background | var(--surface-sunken) | var(--surface-sunken) |
| color | var(--fg) | var(--fg) |
| color, disabled | var(--fg-disabled) | var(--fg-disabled) |
| − disabled when | qty ≤ 1 or no printing chosen | same |
| + disabled when | qty = 20 or no printing chosen | same |
| aria-label | `One fewer` / `One more` keys | same |

### Quantity value box
| Property | Mobile | Desktop |
|----------|--------|---------|
| min-width | 48px | 44px |
| height | 44px | 32px |
| display | inline-flex, center/center | inline-flex, center/center |
| border-radius | 8px | 8px |
| border | 1px solid var(--border-strong) | 1px solid var(--border-strong) |
| background | var(--bg) | var(--bg) |
| font-family | var(--font-mono) | var(--font-mono) |
| font-size | 15px | 15px |
| color | var(--fg) | var(--fg) |

### Need / spare line
| Property | Mobile | Desktop |
|----------|--------|---------|
| need part | need key (n), 12.5px, var(--fg-body) | same |
| spare clause renders when | qty > need | qty > need |
| spare clause | ` · ` + spare key (n, singular/plural), var(--fg-muted) | same |
| expected count | not printed (sent with the write) | not printed |

### Stale banner (role=status)
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | between title block and fields (pushes form down; sheet grows) | between title block and fields |
| role | status (takes focus) | status (takes focus) |
| display | flex | flex |
| gap | 10px | 10px |
| border-radius | 8px | 8px |
| background | var(--elevated-hover) | var(--elevated-hover) |
| border | 1px solid var(--border-strong) | 1px solid var(--border-strong) |
| border-left | 3px solid var(--warning) | 3px solid var(--warning) |
| padding | 10px 12px | 10px 12px |
| icon | ⚠, var(--warning) | ⚠, var(--warning) |
| text | 12.5px, line-height 1.5, var(--fg-body) | same |
| lead (bold) | var(--fg), weight 600 | var(--fg), weight 600 |
| copy | stale title + body key (`staleBodyDone` when need is now 0) | same |

### Failed alert (role=alert)
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | after fields, before footer | after fields, before footer |
| role | alert | alert |
| display / gap | flex / 10px | flex / 10px |
| border-radius | 8px | 8px |
| background | var(--elevated-hover) | var(--elevated-hover) |
| border | 1px solid var(--border-strong) | 1px solid var(--border-strong) |
| border-left | 3px solid var(--warning) | 3px solid var(--warning) |
| padding | 10px 12px | 10px 12px |
| font-size / line-height | 12.5px / 1.5 | 12.5px / 1.5 |
| color | var(--fg-body); lead bold var(--fg) 600 | same |
| icon | ⚠, var(--warning) | ⚠, var(--warning) |
| choices | kept | kept |

### Footer
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| justify-content | — (buttons fill) | flex-end |
| gap | 10px | 10px |
| margin-top | 2px | — |
| padding-top | — | 16px |
| border-top | — | 1px solid var(--border) |
| order | Cancel, then primary | Cancel, then primary |

### Cancel button
| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | 1 | — |
| height | 46px | 40px |
| padding | — | 0 18px |
| display | inline-flex, center/center | inline-flex, center/center |
| border-radius | 10px | 8px |
| border | 1px solid var(--border-strong) | 1px solid var(--border-strong) |
| font-size | 14px | 14px |
| color | var(--fg) | var(--fg) |
| pending | color var(--fg-locked), opacity 0.6, disabled | same |

### Primary (Add) button
| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | 1 | — |
| height | 46px | 40px |
| padding | — | 0 20px |
| display | inline-flex, center/center | inline-flex, center/center |
| border-radius | 10px | 8px |
| font-size | 14px | 14px |
| font-weight | 600 | 600 |
| white-space | nowrap | nowrap |
| background | var(--accent) | var(--accent) |
| color | var(--bg) | var(--bg) |
| label | add key (qty: `1 copy` / `N copies`) | same |
| no printing chosen | background var(--elevated), color var(--fg-locked), aria-disabled, label = choose-a-printing key | same |
| pending | opacity 0.7, aria-disabled, label = adding key (`Adding…`) | same |

---

## State Coverage — BuyTag / ShoppingHead (§A)

| State | Triggering condition | Component rendered | Key props required |
|-------|---------------------|-------------------|-------------------|
| A1 At rest, plain row | Shopping tab, `density="full"`, both switches on, `onPress` given, `state="rest"` | DecklistRow → BuyTag as `<button>` | onPress, state=rest, price; geometry = main's (exception: phone stack flip) |
| A2 Every neighbour | row over limit (ring + `over $X`), has figure, tools on, not commander | BuyTag button + ⇄ + ✕ | over=true (ring), limit; ⇄ hit area untouched |
| A3 Spoken-for row | owned but every copy claimed (owned dot, `◆ short`) | BuyTag button | confirm need preset = shortfall, not the deck's ask; description = existing sentence |
| A4 Commander row | row is the commander | BuyTag button (pressable), no ⇄, hidden ✕ | commander=true |
| A5 `sold out` / bare `buy` | price fact sold out (printing still behind it) / never stocked (no price fact) | BuyTag button, pressable in both | both open the confirm with no printing preset (B7): a sold-out row's printing is stale, and the plan's "How the preset is chosen" presets only behind a LIVE figure; a card with one printing is the exception, selected either way |
| A6 Hover / focus / press | pointer hover (desktop), keyboard focus, active | BuyTag | wash 24% / 2px accent ring offset 2 / wash 30%; nothing else changes |
| A7 Open | its confirm is open | BuyTag state=open + row hover ground | aria-expanded=true, wash 24%, row bg var(--elevated-hover) |
| A8 Pending | write in flight from this tag | BuyTag state=pending | `adding…` in figure slot, opacity .75, row .6, aria-busy, second press ignored, width unchanged on desktop (the 46px slot holds `adding…`); on the phone the slot has no reserved width, so the tag takes `adding…`'s width |
| A9 Disabled | another write for the same card in flight (Undo from its toast) | BuyTag state=disabled | opacity .45, keeps price, no write |
| A10 The key | Shopping head, both switches on | ShoppingHead key: 1 row desktop / 2-col grid phone | buy item only with switches on |
| A11 Details link | card details opened from a Shopping row (`door` context), both switches on | `Bought this card?` link on the In your collection label line | not from /collection, All tab, search; never beside Edit copies |
| A12 All tab's collapsed `$` | decks' All tab | inert `$` tag (span) | no onPress |

## State Coverage — GotItConfirm (§B)

| State | Triggering condition | Component rendered | Key props required |
|-------|---------------------|-------------------|-------------------|
| B1 Preset | the row's figure is live (`priced` or `foilOnly`) and its price fact carries a printing (scryfall id); a sold-out or absent row presets nothing (B7) | GotItConfirm: tile selected, finish preset, qty = need | presetPrinting from price fact; finish from priceOf (priced → nonfoil; foilOnly → foil else etched); no badge, no price |
| B2 Changed printing | player selects another tile | GotItConfirm, selection moves | finish chips re-derived from new printing's finishes; first tile is the way back (no reset link) |
| B3 Foil-only printing | selected printing's finishes exclude nonfoil | Finish chips: Foil selected, Nonfoil dashed + note | finishes from printing; finish note key |
| B4 One printing | card has exactly one printing | Single printing line, no tile row | count key `the only printing` |
| B5 Quantity above 1 | need > 1 | Stepper preset to need | one holding, one history entry on write |
| B6 Above need | qty > need (≤ 20) | Need line + spare clause | no warning; cap 20 |
| B7 No printing behind the price | no live figure: `sold out` (its printing is stale), no price fact (bare `buy`), or no printing on the fact | Tiles none selected, finish+qty at .4, primary disabled `Choose a printing` | sel=none, primary locked until a tile is chosen |
| B8 Stale | write returns `status: "stale"` with `current` | Same form + stale banner (role=status, focused), count re-based on new need | staleEdits/expected sent; need 0 → count kept + `staleBodyDone`; nothing written |
| B9 Failed | write error | role=alert block above footer | choices kept; row unchanged |
| B10 Pending | write in flight | fields .6, Cancel disabled, primary `Adding…` .7 | no reflow; tag under reads `adding…` |
| B11 Cancel / Escape / outside / another row | Cancel, ✕, Escape, or a scrim click. "Another row's tag" was R1's popover; R2's confirm is a modal, so a press on another row lands on the scrim and closes it, and that row's tag is pressed next | Confirm closes | nothing written, no "discard?", focus returns to the tag (or the Shopping filter when the row has left); reopening reads presets fresh |

## State Coverage — Switch off (§E)

| State | Triggering condition | Component rendered | Key props required |
|-------|---------------------|-------------------|-------------------|
| E1 Either switch off | `!SHOPPING_MARK_BOUGHT_ENABLED \|\| !COLLECTION_EDIT_ENABLED` | BuyTag as plain span (main's); key without buy item and with main's ⇄ text; no details link; phone stack in main's order (`over $X` above tag) | no onPress; no slot reserved |

---

## §C — Receipt, undo and the held slot (PR 3)

Source: `The 99 - I Got It (R1) · C Receipt, D History and E Switch off.dc.html` §C1–C4 (and the `IGI Row`
held-slot branch it imports), `IGI Toast.dc.html`, README calls 5, 6 and 8 plus "Other decisions",
STATES §C, READINESS-audit.md. Mobile = the 390 frames (`ph: true`); Desktop = the desktop frames.
Copy wording is out of scope: rows name the `gotItCopy.*` key (proposed `src/lib/copy/i-got-it.ts`), not its text.

**Audit overrides applied:**
- Toast live region: `role="status"` for every receipt/undo form, `role="alert"` for the failed form, and **no explicit `aria-live`** (erratum 2; the canvas's hard-coded `aria-live="polite"` is not built).
- Undo answering `alreadyReverted` renders the `undone` form; `notFound` renders the `failed` form (finding 2).
- The held slot must survive the revalidation the write triggers; the decklist's existing `spent` slot (`spent-slot-undo`) is the model (finding 3).
- The undo's short-deck check excludes the source deck (`shopping:<deck id>`) (gap 3, call 6).
- `claimedMany` is a receipt form named by READINESS.md item 8 and the copy file; the canvas draws only the single-deck `claimed` form, so `claimedMany` takes `claimed`'s structure.
- **No `commander` receipt form exists in the handoff.** No canvas, STATES row, README call or copy key draws one; a commander row (A4) is pressable and its receipt takes whichever of clean / claimed / partial its write produces. Record as not-designed rather than infer a shape.

**Built as shared components, not as redrawn (PR 3):**
- The undo warning's chrome (scrim, phone sheet, desktop dialog, grabber) and its content are the app's shared `ShortDeckWarning` inside the confirm-dialog chrome `RevertConfirm` already uses, reused per README "Reused: `ShortDeckWarning` (gains `undo`)". So the canvas's redraw values (the 480px dialog, the 16px sheet radius, the phone button row, the h3 title, and the like) are not applied, and the revert, replace, save, remove and undo warnings stay one component. The rows under "ShortDeckWarning — undo verb" below record the canvas, not the build.
- The held slot's text size follows the decklist's spent-slot shape (`UndoRow`: 11.5px phone, 12px from md), per README call 8's "by construction", not the canvas's flat 11.5px.

## Component: Receipt toast (the app's 1+2 toast, R2 §D)

### Toast slot / placement
| Property | Mobile | Desktop |
|----------|--------|---------|
| slot | the app's toast slot, not on the row | the app's toast slot, not on the row |
| position | fixed (`ToastFrame`); left 16px; right 16px; bottom = tab bar + 10px (84px with the 74px bar) | fixed (`ToastFrame`); left = rail + 16px; bottom 16px: the deck pane's bottom left |
| width | 100% of the slot (390 − 32) | 440px |
| clearance | above the tab bar (tab bar: 74px, border-top 1px var(--border), bg var(--surface-rail)) | clear of the 2-column grid's right column |
| survives the row leaving | yes (not a child of the row) | yes |

### Toast shell
| Property | Mobile | Desktop |
|----------|--------|---------|
| role | `status` (failed form: `alert`) | `status` (failed form: `alert`) |
| aria-live | — (not set; audit erratum 2) | — |
| display | flex | flex |
| align-items | flex-start | flex-start |
| gap | 10px | 10px |
| padding | 0 6px 0 14px | 0 6px 0 14px |
| min-height | 52px | 52px |
| border-radius | 10px | 10px |
| background | var(--elevated) | var(--elevated) |
| border | 1px solid var(--border-strong) | 1px solid var(--border-strong) |
| box-shadow | 0 12px 30px rgba(0,0,0,0.45) | 0 12px 30px rgba(0,0,0,0.45) |

### Text column
| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | 1 | 1 |
| min-width | 0 | 0 |
| display / direction | flex / column | flex / column |
| gap | 3px | 3px |
| padding | 10px 0 | 10px 0 |

### Line 1 (headline)
| Property | Mobile | Desktop |
|----------|--------|---------|
| key (clean, claimed, claimedMany, partial, checking, undoing) | `receipt.added(card, q)` | same |
| key (undone) | `receipt.undoneElsewhere(card, q)` (`Undone. <card> ×N removed from your collection.`, N the copies this write added), every done undo (the canvas's `receipt.undone`, "back on the list", is not built; see the PR's Settled) | same |
| key (failed) | `receipt.undoFailed` | same |
| font-size | 13.5px | 13.5px |
| line-height | 1.35 | 1.35 |
| color | var(--fg) | var(--fg) |
| font-family | sans (inherited) | sans (inherited) |

### Line 2 (printing · finish)
| Property | Mobile | Desktop |
|----------|--------|---------|
| key | `receipt.detail(printing, finish)` (set code + #collector · finish) | same |
| renders in | clean, claimed, claimedMany, partial, checking, undoing | same |
| absent in | undone, failed | same |
| font-family | 'IBM Plex Mono', monospace (var(--font-plex-mono)) | same |
| font-size | 11px | 11px |
| color | var(--fg-muted) | var(--fg-muted) |

### Line 3 (sentence)
| Property | Mobile | Desktop |
|----------|--------|---------|
| key (claimed) | `receipt.claimed(deck, need)` | same |
| key (claimedMany) | `receipt.claimedMany(decks, need)` | same |
| key (partial) | `receipt.partial(need)` | same |
| key (failed) | `receipt.undoFailedBody` | same |
| absent in | clean, checking, undoing, undone | same |
| font-size | 12.5px | 12.5px |
| line-height | 1.45 | 1.45 |
| color | var(--fg-body) | var(--fg-body) |
| text-wrap | pretty | pretty |

### Actions group
| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | none | none |
| display | flex | flex |
| align-items | center | center |
| align-self | center | center |
| gap | 2px | 2px |
| order | History, then Undo | History, then Undo |
| renders | every form except `undone` | same |

### Action button (History / Undo) — base
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | inline-flex | inline-flex |
| align-items | center | center |
| height | 44px | 44px |
| padding | 0 10px | 0 10px |
| font-size | 13.5px | 13.5px |
| white-space | nowrap | nowrap |
| color | var(--accent) | var(--accent) |

### History link (a `Link`, styled as the action buttons)
| Property | Mobile | Desktop |
|----------|--------|---------|
| key | `receipt.history`; failed form: `receipt.openHistory` | same |
| font-weight | 400 | 400 |
| renders | clean, claimed, claimedMany, partial, failed | same |
| absent | checking, undoing ("History steps aside"), undone | same |
| target | /collection/history scrolled to this entry, expanded | same |

### Undo button
| Property | Mobile | Desktop |
|----------|--------|---------|
| key (rest) | `receipt.undo` | same |
| accessible name | `receipt.undoAria(card)` | same |
| font-weight | 600 | 600 |
| renders | clean, claimed, claimedMany, partial, checking, undoing | same |
| absent | undone, failed (withdrawn, no retry; UndoRow rule) | same |

### Undo button — busy (checking / undoing)
| Property | Mobile | Desktop |
|----------|--------|---------|
| key | `receipt.checking` (from the first frame) / `receipt.undoing` | same |
| aria-busy | true | true |
| color | var(--fg-muted) | var(--fg-muted) |
| opacity | 0.8 | 0.8 |
| enabled | no (second press ignored) | no |

### Toast hold (timer)
| Property | Mobile | Desktop |
|----------|--------|---------|
| duration | 8s (the 1+2 value) | 8s |
| held while | hovered, focused, an undo in flight (checking, warning open, undoing) | same |
| ended early by | the next write (replaced) | same |
| undone form | shows, then goes after 8s | same |
| claimed fallback (Open 3, unratified) | 12s for the claimed form only, if Hugh rules | same |

## Component: Shopping list during and after the write (C1, C2)

### Row while the write is in flight
| Property | Mobile | Desktop |
|----------|--------|---------|
| row opacity | 0.6 | 0.6 |
| BuyTag state | pending (`row.pending` in figure slot) | pending |
| anything else on the page | unchanged | unchanged |

### Clean: list figures on the write
| Property | Mobile | Desktop |
|----------|--------|---------|
| tab count (`Shopping N`) | drops at once | drops at once |
| group count | drops at once | drops at once |
| price-strip total | drops at once | drops at once |
| Mana Pool link | loses the card at once | same |
| height change of any of these | none | none |
| row's slot | becomes the held slot (below) | same |

### Stayed row: claimed / claimedMany (C2)
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | redraws in place | in place |
| tab count / total | unchanged | unchanged |
| owned dot | 7×7, radius 50%, var(--success) | 8×8, var(--success) |
| short marker | `◆ short`, mono 11px, var(--avail-over-fg) | mono 11.5px, var(--avail-over-fg) |
| joins `Spoken for` | only at the next read | same |
| BuyTag | rest (ready) | rest |

### Stayed row: partial (C3)
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | stays put | stays put |
| total | drops by one copy's price × q | same |
| short marker | `◆ short N` (remaining need), var(--avail-over-fg) | same |
| owned dot | var(--success) | var(--success) |
| BuyTag | rest, ready for the next copy | rest |

## Component: Held slot (DecklistRow held-slot state, beside `spent`)

### Slot shell
| Property | Mobile | Desktop |
|----------|--------|---------|
| shell | the row's own `rowShell` (H29), `data-decklist-row` | same |
| display | flex | flex |
| align-items | center | center |
| gap | 9px | 10px |
| border-radius | 7px | 7px |
| padding | 0 4px 0 8px | 7px 9px |
| min-height | 52px | 34px |
| background | var(--surface-sunken) | var(--surface-sunken) |
| border | 1px dashed var(--border-strong) | 1px dashed var(--border-strong) |
| controls | none (no Undo, no tag, no ⇄, no ✕) | none |
| tab order | out of it | out of it |
| decklist live region | does not re-read it | same |

### Slot leading spacer
| Property | Mobile | Desktop |
|----------|--------|---------|
| aria-hidden | true | true |
| flex | none | none |
| size | 7×7 | 8×8 |

### Slot text
| Property | Mobile | Desktop |
|----------|--------|---------|
| key | `slot.held(card)` | same |
| font-family | 'IBM Plex Mono', monospace | same |
| font-size | 11.5px | 11.5px |
| color | var(--fg-locked) (canvas; README prose says "muted") | var(--fg-locked) |
| flex / min-width | 1 / 0 | 1 / 0 |
| overflow | white-space nowrap; overflow hidden; text-overflow ellipsis | same |

### Slot lifetime
| Property | Mobile | Desktop |
|----------|--------|---------|
| holds until | the next read of the list (tab switch, return to the deck) | same |
| survives | the action's revalidation (audit finding 3) | same |
| next read | slot gone, list shorter, group count already dropped | same |
| undo done while held | slot swaps back to the live row in place | same |
| undo failed while held | slot stays held | same |

## Component: Leave transition (C4, C9)

### Crossfade
| Property | Mobile | Desktop |
|----------|--------|---------|
| property animated | opacity only | opacity only |
| duration | 150ms | 150ms |
| start | when the write answers (0ms) | same |
| easing | ease-out (`anim-slot-in`: the `backdrop-in` keyframes, 0 to 1) | same |
| end (150ms) | held slot at opacity 1 | same |
| height animated | never (same shell, same height by construction) | never |
| neighbours | do not move | do not move |
| reduced motion | swap in one frame, no fade | same |
| reverse (undo done) | same 150ms fade, slot → live row | same |

## Component: ShortDeckWarning — undo verb (C3 / C5)

### Phone: scrim
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | absolute; inset 0 | — |
| background | rgba(5,5,8,0.62) | — |

### Phone: sheet
| Property | Mobile | Desktop |
|----------|--------|---------|
| role | dialog | — |
| position | absolute; left 0; right 0; bottom 0 | — |
| border-radius | 16px 16px 0 0 | — |
| background | var(--surface) | — |
| border-top | 1px solid var(--border-strong) | — |
| padding | 10px 18px 18px | — |
| display / direction | flex / column | — |
| gap | 12px | — |

### Phone: grabber
| Property | Mobile | Desktop |
|----------|--------|---------|
| align-self | center | — |
| size | 36×4 | — |
| border-radius | 2px | — |
| background | var(--border-dashed) | — |

### Desktop: dialog
| Property | Mobile | Desktop |
|----------|--------|---------|
| role | — | dialog |
| width | — | 480px |
| border-radius | — | 14px |
| background | — | var(--surface) |
| border | — | 1px solid var(--border-strong) |
| box-shadow | — | 0 24px 60px rgba(0,0,0,0.55) |
| padding | — | 24px 24px 20px |
| display / direction | — | flex / column |
| gap | — | 14px |

### Title (h3)
| Property | Mobile | Desktop |
|----------|--------|---------|
| key | `shortWarning.titleUndo(k)` | same |
| font-family | 'Cinzel', serif | 'Cinzel', serif |
| font-weight | 700 | 700 |
| font-size | 18px | 20px |
| line-height | 1.3 | 1.3 |
| margin | 4px 0 0 | 0 |

### Body
| Property | Mobile | Desktop |
|----------|--------|---------|
| key | shipped `shortWarning` body (collection-edit.ts), unchanged | same |
| font-size | 13px | 13.5px |
| line-height | 1.55 | 1.55 |
| color | var(--fg-body) | var(--fg-body) |
| margin | 0 | 0 |

### Deck list box + deck row
| Property | Mobile | Desktop |
|----------|--------|---------|
| box border-radius | 10px | 10px |
| box background | var(--bg) | var(--bg) |
| box border | 1px solid var(--border) | 1px solid var(--border) |
| row display / align | flex / center | flex / center |
| row gap | 12px | 12px |
| row padding | 0 14px | 0 14px |
| row min-height | 48px | 44px |
| deck name | 14px, flex 1, no underline | 14px, flex 1, underline (decoration var(--border-strong), offset 2px) |
| short mark | `◆ short N`, mono 12px, var(--danger) | same |
| decks listed | committed decks that would go short, **source deck excluded** | same |

### Buttons row
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| justify-content | — (buttons flex 1) | flex-end |
| gap | 10px | 10px |
| margin-top | 4px | 4px |
| order | Cancel, then Undo anyway | Cancel, then Undo anyway |

### Cancel button (focused on open)
| Property | Mobile | Desktop |
|----------|--------|---------|
| key | shipped `shortWarning` cancel | same |
| size | flex 1; height 46px | padding 10px 18px |
| border-radius | 10px | 8px |
| border | 1px solid var(--accent) | 1px solid var(--accent) |
| box-shadow (focus ring) | 0 0 0 2px var(--accent) | 0 0 0 2px var(--accent) |
| font-size | 14px | 14px |
| initial focus | yes | yes |
| on press | closes the warning and the toast's pending state; copy stays | same |

### Undo anyway button
| Property | Mobile | Desktop |
|----------|--------|---------|
| key | `shortWarning.confirmUndo` | same |
| size | flex 1; height 46px | padding 10px 18px |
| border-radius | 10px | 8px |
| background | var(--elevated) | var(--elevated) |
| border | 1px solid var(--border-strong) | 1px solid var(--border-strong) |
| font-size / weight | 14px / 600 | 14px / 600 |
| destructive styling | none (no --danger) | none |
| on press | writes the revert (toast → undoing) | same |

### While the warning is open
| Property | Mobile | Desktop |
|----------|--------|---------|
| toast timer | held | held |
| row's BuyTag | disabled (dashed border, tag opacity .45) | disabled |

## State Coverage — Receipt, undo and the held slot (§C)

| State | Triggering condition | Component rendered | Key props required |
|-------|---------------------|-------------------|-------------------|
| C1 Clean | write applied and the deck's need for the card reaches 0 | Toast (status): L1 `receipt.added`, L2 `receipt.detail`, History + Undo; row → held slot via 150ms crossfade; tab/group count, total, Mana Pool link drop at once | card, q, printing, finish; slot 52px phone / 34px desktop; toast bottom 84 phone / bottom-left 16 desktop, 440 wide |
| C2 Claimed by an older deck | write applied, `allocateClaims` gives the copy to an older committed deck that was short | Toast: L1 + L2 + L3 `receipt.claimed` (one deck) or `receipt.claimedMany` (several), History + Undo; row redraws in place with owned dot + `◆ short`; counts/total unchanged | deck name (or deck count), remaining need; never says the deck is done; joins Spoken for at next read |
| C3 Partial | write applied, need still > 0 for this deck | Toast: L1 + L2 + L3 `receipt.partial`; row stays, `◆ short N`; total drops by the copies' price | remaining need; row not moved; tag back to rest |
| C4 Undo checking | Undo pressed | Toast: Undo → `receipt.checking`, aria-busy, muted .8; History hidden; row tag disabled; timer held | check excludes source deck; Undo not pressable |
| C5 Undo raises §E | a committed deck other than the source would go short | ShortDeckWarning `titleUndo` / `confirmUndo`: sheet (phone, scrim .62) or 480px dialog (desktop); Cancel focused | deck list excludes the source deck; Undo anyway not destructive-styled; Cancel → copy stays, toast leaves its pending state |
| C6 Undo in flight | no deck would go short, or Undo anyway pressed | Toast: Undo → `receipt.undoing`, aria-busy, History hidden; slot still held | timer held |
| C7 Undo done | revert applied, or answered `alreadyReverted` | Toast: L1 `receipt.undoneElsewhere(card, q)`, every case, no L2/L3, no actions; the held slot steps aside once a list billing the card arrives, and the row fades back in place (150ms), derived at render; counts/total return | no held slot left behind; toast goes after 8s |
| C8 Undo failed | revert errors, or answered `notFound` | Toast role=alert: L1 `receipt.undoFailed`, L3 `receipt.undoFailedBody`, `receipt.openHistory` link (a `Link` to the entry in History); Undo withdrawn | nothing changes: copy still owned, slot still held; no retry offered |
| C9 Leave transition | write answers for a row that leaves | live row → held slot, 150ms ease-out opacity fade; reduced motion: one-frame swap | no height animation; neighbours do not move; slot holds until the next read and survives revalidation |
| — Commander receipt | (requested in scope) | **not designed**: no distinct form in the handoff; a commander row's receipt follows C1/C2/C3 by outcome | — |
