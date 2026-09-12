# Design Property Table — Deck details art wash (handoff R6)

**Source of truth:** `design/design_handoff_the99_deck_details_wash/The 99 - Deck Details Art Wash.dc.html`.
The README overrules the canvas in exactly two places, both stated in the README itself: Cancel
never disables (blocker 3), and the clamp ships as `-webkit-line-clamp` rather than `max-height`
(blocker 6). Everywhere else the canvas wins.

R6 issued four rulings against the bands this table describes, and the rows below carry them. R6's
own errata table in the README also corrects three values this table took from R5 — read the two
together, since a row here that disagrees with the errata is the errata's.

**Breakpoint: 768px (`md:`)** for the deck header — not the 640px `sm:` most of the app uses. The
commander hero keeps its existing `sm:` split, because only its mobile subtree changes.

Columns are **Mobile (<768px)** and **Desktop (≥768px)**.

---

## A. Shared constants

| Property | Value |
|---|---|
| Image source | `cards.art_crop_uri` only |
| Focal | `background-position: center top` |
| `background-repeat` | `no-repeat` |
| Divider | `1px solid var(--border)` |
| Card ground | `var(--surface)` |
| Pip ring | `box-shadow: inset 0 0 0 1px rgba(0,0,0,0.4)` |
| Bar track ring | `box-shadow: inset 0 0 0 1px rgba(0,0,0,0.4)` — inset, on the **track**, never the fill |
| Focus-visible | `outline: 2px solid var(--accent); outline-offset: 2px` (already in `globals.css @layer base`) |
| Focus override | rename field only: `outline: none` — its `1px var(--accent)` border is the indicator |
| Hover | `--accent-hover` / `--elevated-hover` |
| Bar width | `min(100, (built / 99) * 100)` % — an `Over` deck is full, not 105% |
| Bar fill | `var(${STATUS_TOKEN[status]})` — `statusBarStyle`. **No percentage thresholds.** |
| Chip | `statusPillStyle` verbatim — status colour in the fill mixed into `--bg`, one `var(--border-strong)` hairline, `Building` differs only in `border-style: dashed` |
| Text shadow | type on a wash carries one; type on flat ground does not |
| Permitted non-`var()` colour | `rgba(0,0,0,0.4)` (pip + track ring), `0 1px 4px rgba(0,0,0,0.85)` / `0 1px 3px rgba(0,0,0,0.8)` (mobile shadows), `0 1px 3px rgba(0,0,0,.6)` (`INK_SHADOW`, already shipped in `art-wash.tsx`), `#000` / `transparent` inside `mask-image`. Anything else, on these surfaces, is a defect. |

---

## B. Deck details header — Desktop (≥768px), `left-portrait`, band 168

### B1. Band
| Property | Value |
|---|---|
| position | `relative` |
| height | `168px` |
| background | `var(--bg)` |
| overflow | `hidden` |

### B2. Ambient art layer — **SUPERSEDED 2026-09-12, no longer drawn**

> Removed in PR #517 and ratified the same day: past the portrait's own width this full-bleed copy
> was a second, differently-scaled rendering of the same crop, and it read as a double image. Errata
> in `design/design_handoff_the99_deck_details_wash/README.md` and its `READINESS.md`, and in the
> shared `design-tables/art-wash.md`. With no crop, this layer still draws the identity gradient —
> decision §G. **Do not implement the rows below.**
| Property | Value |
|---|---|
| position | `absolute; inset: 0` |
| opacity | `0.20` (art) · `1` (identity gradient) |
| background-size | `cover` |
| background-position | `center top` |

### B3. Sharp portrait layer
| Property | Value |
|---|---|
| position | `absolute; left:0; top:0; bottom:0` |
| width | `230px` (= `round(168 × 1.37)`) |
| opacity | ~~`0.80`~~ **`0.92`** — this row predates the band lift; `PORTRAIT_BANDS[168].sharpOpacity` |
| background-size | `auto 100%` |
| background-position | `left center` |
| mask-image | `linear-gradient(90deg, #000 0 58%, transparent 100%)` + `-webkit-` twin |

### B4. Horizontal scrim (px-keyed)
| Stop | Position | Value |
|---|---|---|
| 1 | `0px` | `color-mix(in oklab, var(--bg) 30%, transparent)` |
| 2 | `134px` | `color-mix(in oklab, var(--bg) 26%, transparent)` |
| 3 | `230px` | `color-mix(in oklab, var(--bg) 78%, transparent)` |
| 4 | `240px` | `var(--bg)` |

### B5. Vertical scrim
| Stop | Position | Value |
|---|---|---|
| 1 | `0%` | `color-mix(in oklab, var(--bg) 30%, transparent)` |
| 2 | `46%` | `color-mix(in oklab, var(--bg) 10%, transparent)` |
| 3 | `100%` | `color-mix(in oklab, var(--bg) 42%, transparent)` |

### B6. Content row
| Property | Value |
|---|---|
| position | `relative` |
| height | `100%` |
| display / align-items / gap | `flex` / `center` / `18px` |
| padding | `0 24px 0 254px` |
| label column | `flex: 1; min-width: 0` |

### B7. Deck title (rest)
| Property | Value |
|---|---|
| font-family | `var(--font-display)` |
| font-weight | `700` |
| font-size | `21px` |
| line-height | `1.2` |
| color | `var(--fg)` |
| text-shadow | **—** (past the flat 240px stop) |
| clamp | `display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden` |
| clamped height | `51px` — two 25.2px line boxes. The canvas's `max-height`; it ships as the clamp above, never as a `max-height` declaration. |
| min-height | **—** forbidden |

### B8. Meta row
| Property | Value |
|---|---|
| row | `flex; align-items:center; gap:10px; flex-wrap:wrap; margin-top:3px` |
| pips | `IdentityPips` verbatim at `size={10}` — `rounded-[2px]`, `gap:3px`, ring per §A |
| subtitle | mono `11px`, `var(--fg-body)`, no shadow |
| chip | mono `11px`, `border-radius:6px`, `padding:3px 8px`, `statusPillStyle` |

### B9. Count row
| Property | Value |
|---|---|
| row | `flex; align-items:baseline; gap:4px; margin-top:5px` |
| built | mono `600` `20px` `var(--fg)` |
| `/ 99` | mono `13px` `var(--fg-faint)` |

### B10. Progress bar
| Property | Value |
|---|---|
| track | `width:170px; height:6px; border-radius:999px; background:var(--elevated); box-shadow: inset 0 0 0 1px rgba(0,0,0,0.4); overflow:hidden; margin-top:6px` |
| fill | `statusBarStyle(status, built)` |

### B11. Owned line
| Property | Value |
|---|---|
| | mono `11px` `var(--fg-faint)` `margin-top:6px` |

### B12. `Card details` pill — desktop placement
| Property | Value |
|---|---|
| position | `absolute; left:16px; bottom:14px` (portrait's bottom-left) |
| everything else | as shipped in `FullCardTrigger` |
| tap target | the full-band overlay must be **scoped to the pill** |

### B13. Actions slot — rest
| Property | Value |
|---|---|
| slot | `flex:none; display:flex; gap:9px; align-items:center` |
| `Update from a list` | ghost outline, unchanged from shipped |
| `Export` | filled, unchanged from shipped |

### B14. Actions slot — editing (**replaces** B13; zero reflow)
| Property | Value |
|---|---|
| slot | `flex:none; display:flex; flex-direction:column; align-items:flex-end; gap:7px` |
| button row | `flex; gap:9px; align-items:center` |
| hint line | mono `10px`, `letter-spacing:0.08em`, `var(--fg-faint)`, `min-height:16px` |
| invariant | meta row, count, bar and owned line stay at the pixel they hold at rest |

### B15. Rename pencil (desktop)
| Property | Rest | Row hover | Focus-visible |
|---|---|---|---|
| width / height | `28px` / `28px` | same | same |
| border | `1px solid var(--border-strong)` | same | same |
| background | `transparent` | `var(--elevated-hover)` | `transparent` |
| border-radius | `6px` | same | same |
| color | `var(--fg-muted)` | same | same |
| font-size | `13px` | same | same |
| opacity | `0` | `1` | `1` |
| outline | none | none | `2px solid var(--accent)`, offset `2px` |
| margin-left | `6px` from the title | | |

The pencil is the trigger. **The title is not** — a deck name is selectable text.

### B16. Rename field (desktop)
| Property | Value |
|---|---|
| width / height | `352px` / `29px` — identical in all four editing states |
| box-sizing | `border-box` |
| background | `var(--surface-sunken)` |
| border | `1px solid var(--accent)` (state-dependent, §F) |
| border-radius | `8px` |
| padding | `1px 10px` |
| margin | `-2px 0 -2px -11px` |
| white-space / overflow | `nowrap` / `hidden` |
| text | display font, `700`, `21px`, `line-height:1.2`, `var(--fg)` — full strength in every state |
| keys | `Enter` commits · `Esc` reverts · blur commits |

---

## C. Deck details header — Mobile (<768px), `cover`

### C1. Card + band
| Property | Value |
|---|---|
| card | `var(--surface)` ground, `overflow:hidden` |
| band | `position:relative; aspect-ratio: 2.2/1; overflow:hidden` |
| band height | derived; **cannot grow** |

### C2. Art layer
| Property | Value |
|---|---|
| | `absolute; inset:0; opacity:0.58; background-size:cover; background-position:center top` |

### C3. Scrim — the corrected ramp
| Stop | Position | Value |
|---|---|---|
| 1 | `0%` | `color-mix(in oklab, var(--bg) 66%, transparent)` |
| 2 | `26%` | `color-mix(in oklab, var(--bg) 22%, transparent)` |
| 3 | `50%` | `color-mix(in oklab, var(--bg) 62%, transparent)` |
| 4 | `100%` | `color-mix(in oklab, var(--bg) 90%, transparent)` |

Applies to **every bottom-labelled `cover` surface** — one ramp, derived from the label edge.

### C4. `Card details` pill — mobile deck header
| Property | Value |
|---|---|
| position | `absolute; top:13px; right:16px` |

### C5. Label block
| Property | Rest | Editing |
|---|---|---|
| position | `absolute; left:18px; right:18px; bottom:12px` | same |
| layout | `flex column; align-items:center` | same |
| gap | `6px` | `8px` |

### C6. Title row (rest)
| Property | Value |
|---|---|
| row | `flex; align-items:flex-start; gap:8px; max-width:100%` |
| font | display, `700`, `20px`, `line-height:1.25`, `var(--fg)`, `text-align:center` |
| clamp | `-webkit-line-clamp:2`, clamped height `50px` (the canvas's `max-height`, never shipped as one); no `min-height` |
| text-shadow | `0 1px 4px rgba(0,0,0,0.85)` |

### C7. Rename pencil (mobile)
| Property | Value |
|---|---|
| width / height | `44px` / `44px` |
| background | `var(--surface-sunken)` (opaque — decision 13) |
| border | `1px solid var(--border-strong)` |
| border-radius | `8px` |
| color / font-size | `var(--fg)` / `15px` |
| opacity | `1` — always visible; there is no hover on a phone |

### C8. Meta row (rest, inside the wash)
| Property | Value |
|---|---|
| row | `flex; align-items:center; gap:8px; flex-wrap:wrap; justify-content:center` |
| pips | `IdentityPips` at `size={10}` |
| subtitle | mono `10px`, `var(--fg-body)`, `text-shadow: 0 1px 4px rgba(0,0,0,0.85)` |
| chip | mono `10px`, `border-radius:6px`, `padding:3px 7px`, `statusPillStyle`, **no shadow** |

### C9. Rename field + actions (mobile, inside the band)
| Element | Value |
|---|---|
| field | `width:100%; box-sizing:border-box; flex; align-items:center; justify-content:center; background:var(--surface-sunken); border:1px solid var(--accent); border-radius:8px; padding:8px 12px` |
| field text | display, `700`, `20px`, `var(--fg)`, no shadow |
| button row | `flex; gap:8px` |
| `Save` | mono `11px` `500`, `var(--bg)` on `var(--accent)`, `border-radius:7px`, `padding:0 18px`, `min-height:44px` |
| `Cancel` | mono `11px`, `var(--fg-body)`, `var(--surface-sunken)`, `1px solid var(--border-strong)`, `border-radius:7px`, `padding:0 18px`, `min-height:44px` |
| reflow | the meta row **moves below the divider** while editing — one row of shift, explicitly accepted. Zero reflow is a desktop-only claim. |

### C10. Below-divider block
| Property | Rest | Editing |
|---|---|---|
| container | `border-top:1px solid var(--border); padding:14px 16px 12px; flex column; align-items:center; gap:8px` | same |
| order | count → bar | meta → count → bar |
| built | mono `600` `14px` `var(--fg)` | same |
| `/ 99` | mono `14px` `var(--fg-faint)` | same |
| track | `width:100%; height:6px; border-radius:999px; var(--elevated)`; ring per §A | same |
| fill | `statusBarStyle(status, built)` | same |
| meta row (editing) | — | as C8, subtitle `var(--fg-muted)`, **no shadow** (flat ground) |
| owned line | **—** not drawn on mobile at any state | — |

### C11. Mobile actions row
| Property | Value |
|---|---|
| container | `padding:4px 16px 14px; flex; gap:8px; justify-content:center` |
| both buttons | unchanged from shipped |

---

## D. Commander details hero — Mobile (<640px, `sm:`) only

The one section that is **not** on the 768px column split above: this page keeps its shipped
`sm:` breakpoint, and its mobile subtree is `sm:hidden`.

Desktop hero is explicitly out of scope and untouched.

| Element | Property | Value |
|---|---|---|
| band | | `position:relative; aspect-ratio: 1.6/1; overflow:hidden` |
| art | | `absolute; inset:0; opacity:0.58; background-size:cover; background-position:center top` |
| art source | | **`artCropUri`**, not `imageUri` |
| scrim | | identical to C3 |
| pips | position | `absolute; right:16px; top:14px` |
| | each | `IdentityPips` at `size={12}` |
| `Card details` pill | position | `absolute; top:56px; right:16px` — stacked **below** the pips, not beside |
| label block | | `absolute; left:16px; right:16px; bottom:15px` |
| rank eyebrow | | mono `11px`, `letter-spacing:0.14em`, **`var(--fg-body)`** (was `var(--accent)`), `text-shadow: 0 1px 3px rgba(0,0,0,0.8)` |
| name | | display, `700`, `25px`, `line-height:1.15`, `var(--fg)`, `margin-top:4px`, `text-shadow: 0 1px 4px rgba(0,0,0,0.85)` |
| type line | | sans `12.5px`, `var(--fg-body)`, `margin-top:4px`, `text-shadow: 0 1px 4px rgba(0,0,0,0.85)` |

Stated contrast targets on the corrected ramp: eyebrow 5.06:1 at its top edge, 5.23:1 at its
midline; name 6.7:1; type line 6.8:1.

---

## E. Hover / focus / active

| Element | Property | Value |
|---|---|---|
| header row (desktop) | | reveals the pencil, `opacity 0 → 1` |
| pencil (desktop) | background | `transparent → var(--elevated-hover)` |
| accent buttons | background | `var(--accent) → var(--accent-hover)` |
| every control | focus-visible | base ring, no on-art override needed |
| rename field | focus-visible | `outline: none` |
| mobile | | no hover anywhere; the pencil is always visible |
| `:active` | | not specified in either file |

---

## F. Rename — the five states

Desktop field box is `352 × 29` in all four editing states.

| Property | Rest | Editing | Saving | Error | Disabled-Save |
|---|---|---|---|---|---|
| field rendered | no | yes | yes | yes | yes |
| pencil rendered | yes | no | no | no | no |
| field border | — | `1px solid var(--accent)` | `1px solid var(--border-strong)` | `1px solid var(--danger)` | `1px solid var(--accent)` |
| field background | — | `var(--surface-sunken)` | same | same | same |
| field opacity | — | `1` | `1` | `1` | `1` |
| field ink | — | `var(--fg)` | `var(--fg)` at full strength | `var(--fg)` | `var(--fg)` |
| field interactivity | — | editable | **read-only, not disabled** | editable | editable |
| Save label | — | Save | Saving… | Retry | Save |
| Save background | — | `var(--accent)` | `var(--accent)` | `var(--accent)` | `var(--elevated)` |
| Save colour | — | `var(--bg)` | `var(--bg)` | `var(--bg)` | `var(--fg-disabled)` |
| Save opacity | — | `1` | `0.6` | `1` | `1` |
| Save a11y | — | — | — | — | `aria-disabled`, Enter inert |
| Cancel enabled | — | yes | **yes — never disables** | yes | yes |
| hint / error line | — | hint | "saving…" | the error message | hint |
| hint ink | — | `var(--fg-faint)` | `var(--fg-faint)` | `var(--danger)` | `var(--fg-disabled)` |
| hint row present | — | yes | yes | yes | yes — so no row is ever added |

The error row is one row for every cause: an invalid name (control characters, over length), a
duplicate, a server failure. An empty or unchanged name never reaches it — that is the
disabled-Save state, where the field stays open and Enter is inert.

---

## G. State coverage

| State | Trigger | Renders | Absent |
|---|---|---|---|
| **Null `art_crop`** | `commander.artCropUri === null` | identity gradient in both layers at `opacity: 1`; both scrims; desktop keeps the 254px inset | `Card details` pill (no printing to open). **No layout shift.** |
| **Building, 40/99** | `status === "Building"` | dashed chip, bar fill `var(--fg-body)` at 40% | — |
| **Long name** | name exceeds two line boxes | two-line clamp, ellipsis; the band never grows | `min-height` |
| **Rename · rest** | idle | title + pencil | field, Save, Cancel, hint |
| **Rename · editing** | pencil clicked | field, Save, Cancel, hint | `Update`, `Export` (replaced, not pushed); pencil |
| **Rename · saving** | submit in flight | read-only field, no caret, `Saving…` at `.6`, live Cancel | any disabled Cancel |
| **Rename · error** | invalid name / duplicate / server failure | `var(--danger)` border, message in the existing hint row, Save reads `Retry` | any added row |
| **Rename · disabled Save** | name empty or unchanged | full-width empty field, Save on `var(--elevated)` + `aria-disabled` | any box resize; a working Enter |
| **Reduced transparency** | `prefers-reduced-transparency` | art `opacity: min(layer, .3)`; identity gradient uncapped | — |
| **No commander** | — | **UNREACHABLE.** `decks.commander_oracle_id` is `NOT NULL` (`src/db/schema.ts:185`) and `getDeckDetail` returns `null` when the commander row is missing (`src/lib/decks/read.ts:142`). Blocker 7's state has no trigger and is not built. | the whole state |

---

## H. Carried into the build

1. `art_crop` does not reach the deck detail page. `getDeckDetail`'s commander select
   (`src/lib/decks/read.ts:129-142`) has no `artCropUri`.
2. `<ArtWash>` needs `band: 168` and the corrected `cover` ramp. `band` is typed `148 | 72`;
   `portrait()` branches on `band === 148` in six places.
3. `FullCardTrigger` renders a hard-coded pill at `top:56 right:16` **plus** a full-band
   `absolute inset-0` overlay. Three placements, one component, and the overlay must be scoped.
4. The clamp ships as `-webkit-line-clamp`, not `max-height`. No `min-height`.
5. The shipped bar is a percentage tri-state (`builder-spine.tsx:417`) with a second amber segment
   past 99. Both are retired by `statusBarStyle`.
6. The shipped desktop pips are `rounded-full` at 10px (`builder-spine.tsx:362-377`) and
   desktop-only. `IdentityPips` replaces them at both widths.
