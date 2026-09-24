# Design Property Table — Swap tools: Shopping limit and marks

**Sources, in order of authority:**
1. `READINESS-audit.md`: rulings H1–H3 and findings F1–F15. F5 (unpriced never over), F12 (the width probe) and the "Empty Shopping" engineering note apply here.
2. `README.md` §R2, which overrides its own R1 "Components" text.
3. `Shopping View.dc.html` (the JSX `renderVals` and the markup), for exact values.
4. `swap-tools · copy strings.ts`, for which key each element renders.

**Widths:** Mobile is the `phone` prop (390, below `md`). Desktop is `wide` (drawn at 1300, applies from `md`, 768px, up).
"same" means the value is identical at both widths. Copy is recorded as the **key rendered**, never as its words.

**R1 → R2 overrides applied in this table:**
- The README R1 Components text puts an under-limit ⇄ in `--border-dashed`. R2 removes it: **only over-limit rows carry ⇄**. An under-limit row gets an empty 22px slot on desktop and nothing on the phone.
- R1 put the count at the far right on desktop. R2 puts it **inline after the figure**, following a `·` separator.
- R1 drew the key's `⇄` in `--fg-muted`. The R2 child and the copy file's comment both draw it in **`--warning`**.

---

## Component: Limit line (new; sibling of `PriceStrip` inside `GroupToggle`, Shopping only)

### Container (line and key stack)
| Property | Mobile | Desktop |
|---|---|---|
| Relationship | Sibling after `PriceStrip`, not a child. It renders when the strip returns null for no provenance | same |
| Plate / background | None (no plate) | same |
| display | flex | flex |
| flex-direction | column | column |
| gap (line → key) | 0 | 4px |
| margin-top (below strip) | 4px | 10px |
| padding | 0 2px 2px (top 0, right 2, bottom 2, left 2) | 0 4px (top 0, right 4, bottom 0, left 4) |
| Mounted when | The Shopping filter is active and the Shopping list is non-empty | same |

### Line row
| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| flex-wrap | wrap | wrap |
| align-items | center | center |
| gap | 8px | 8px |
| min-height | 44px | 30px |
| Child order (not editing) | lead · figure button · (default chip \| reset) · separator · count | same |
| Child order (editing) | lead · `$` field · Save · cancel · separator · count | same |

### Lead text
| Property | Mobile | Desktop |
|---|---|---|
| Copy key | `swapToolsCopy.limit.lead` | same |
| font-family | Sans, inherited (IBM Plex Sans) | same |
| font-size | 12.5px | 12.5px |
| color | `--fg-body` | `--fg-body` |

### Figure button (not editing)
| Property | Mobile | Desktop |
|---|---|---|
| Element role | Button that enters editing | same |
| Content | `formatCents(limitCents)`, whole dollars with no decimals | same |
| aria-label key | `swapToolsCopy.limit.editAria(figure)` | same |
| display | inline-flex | inline-flex |
| align-items | center | center |
| font-family | mono (IBM Plex Mono) | mono (IBM Plex Mono) |
| font-size | 13.5px | 13.5px |
| font-weight | 600 | 600 |
| color | `--fg` | `--fg` |
| line-height | 44px | 1.4 |
| min-height | 44px | 0 |
| Underline mechanism | `text-decoration: underline dotted var(--accent)`, no border-bottom | `border-bottom: 1px dotted var(--accent)` |
| text-underline-offset | 3px | — |

### `default` chip (limit is null)
| Property | Mobile | Desktop |
|---|---|---|
| Copy key | `swapToolsCopy.limit.defaultChip` | same |
| Rendered when | `shopping_limit_cents` is null and the line is not editing | same |
| font-family | mono | mono |
| font-size | 9px | 9px |
| letter-spacing | 0.1em | 0.1em |
| text-transform | uppercase | uppercase |
| color | `--fg-faint` | `--fg-faint` |
| border | 1px solid `--border-strong` | 1px solid `--border-strong` |
| border-radius | 999px | 999px |
| padding | 2px 7px (top/bottom 2, left/right 7) | 2px 7px |
| Interactive | No | No |

### `reset` control (limit is set)
| Property | Mobile | Desktop |
|---|---|---|
| Copy key | `swapToolsCopy.limit.reset(figure)`; the figure is always the $10 default | same |
| Rendered when | `shopping_limit_cents` is non-null and the line is not editing. It takes the chip's slot | same |
| Action | Sets the column back to null | same |
| display | inline-flex | inline-flex |
| align-items | center | center |
| min-height | 44px | 0 |
| padding | 0 4px (left/right 4) | 0 |
| font-family | mono | mono |
| font-size | 10.5px | 10.5px |
| color | `--fg-faint` | `--fg-faint` |
| text-decoration | underline | underline |
| text-decoration-color | `--border-strong` | `--border-strong` |
| text-underline-offset | 2px | 2px |

### Separator (before the count)
| Property | Mobile | Desktop |
|---|---|---|
| Glyph | `·` (middle dot) | same |
| aria-hidden | true | true |
| color | `--border-strong` | `--border-strong` |
| Rendered | Always, editing included | same |

### Over count
| Property | Mobile | Desktop |
|---|---|---|
| Copy key, over > 0 | `swapToolsCopy.limit.overCount(n)` | same |
| Copy key, over = 0 | `swapToolsCopy.limit.noneOver(figure)` | same |
| Position | Inline after the separator, following the figure (R2). Not pushed right | same |
| font-family | mono | mono |
| font-size | 11px | 11px |
| color | `--fg-muted` | `--fg-muted` |
| white-space | nowrap | nowrap |
| Rendered while editing | Yes, at the saved limit's count | same |

### Key line (under the line row)
| Property | Mobile | Desktop |
|---|---|---|
| Copy key | Glyph `⇄` + `swapToolsCopy.limit.key` | same |
| font-family | mono | mono |
| font-size | 10px | 10px |
| line-height | 1.5 | 1.5 |
| color (text) | `--fg-faint` | `--fg-faint` |
| color (`⇄` glyph span) | `--warning` (R2; R1's `--fg-muted` is superseded) | `--warning` |
| Rendered | Always, whenever the line renders. It shows at zero over and in editing too | same |

### `$` field (editing)
| Property | Mobile | Desktop |
|---|---|---|
| Replaces | The figure button and the chip or reset | same |
| aria-label key | `swapToolsCopy.limit.fieldAria` | same |
| Input rule | Whole dollars, 1 or more | same |
| Validation copy key | `swapToolsCopy.limit.invalid`: not drawn in the handoff; built as a `role="alert"` line under the limit line, mono 10px, `--warning`, the field `aria-invalid` and described by it | same |
| display | inline-flex | inline-flex |
| align-items | center | center |
| gap | 4px | 4px |
| height | 40px | 30px |
| padding | 0 9px (left/right 9) | 0 9px |
| border | 1px solid `--accent` | 1px solid `--accent` |
| border-radius | 7px | 7px |
| background | `--bg` | `--bg` |
| font-family | mono | mono |
| font-size | 13px | 13px |
| color (value) | `--fg` | `--fg` |
| `$` prefix color | `--fg-faint` | `--fg-faint` |
| Drawn caret | 1px × 15px, `--accent` | same |

### Save (editing)
| Property | Mobile | Desktop |
|---|---|---|
| Copy key | `swapToolsCopy.limit.save` | same |
| Skin | Apply's quiet skin | same |
| display | inline-flex | inline-flex |
| align-items | center | center |
| height | 40px | 28px |
| padding | 0 12px (left/right 12) | 0 12px |
| border | 1px solid `--accent` | 1px solid `--accent` |
| border-radius | 8px | 7px |
| font-family | Sans, inherited | same |
| font-size | 13px | 12.5px |
| font-weight | 600 | 600 |
| color | `--accent` | `--accent` |
| On save announce key | `swapToolsCopy.announce.limitSaved(figure)` | same |

### cancel (editing)
| Property | Mobile | Desktop |
|---|---|---|
| Copy key | `swapToolsCopy.limit.cancel` | same |
| display | inline-flex | inline-flex |
| align-items | center | center |
| min-height | 44px | 0 |
| padding | 0 6px (left/right 6) | 0 6px |
| font-family | Sans, inherited | same |
| font-size | 13px | 12.5px |
| color | `--fg-muted` | `--fg-muted` |

### Context: PriceStrip above (unchanged, for placement only)
| Property | Mobile | Desktop |
|---|---|---|
| Strip margin-top | 10px | 10px |
| Strip layout | Column, gap 5 | row-reverse, space-between, gap 14 |
| Bar padding (container of pills, strip, limit) | 9px 16px 10px | 14px 26px 10px |
| Bar border-bottom | 1px solid `--border` | 0 |

---

## Component: DecklistRow (Shopping only)

### Row shell (unchanged by the limit)
| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| align-items | center | center |
| gap | 9px | 10px |
| border-radius | 7px | 7px |
| padding | 0 4px 0 8px (top 0, right 4, bottom 0, left 8) | 7px 9px (top/bottom 7, left/right 9) |
| min-height | 52px | 34px |
| background | `--surface-rail` | `--surface-rail` |
| Over-limit change | None. The shell, dot and name never change, and it never borrows `--avail-over-border` | same |
| Child order, over | dot · name block · buy tag · ⇄ · ✕ | dot · name block · pips (70px) · buy tag · ⇄ · ✕ |
| Child order, under | dot · name block · buy tag · ✕ | dot · name block · pips (70px) · buy tag · 22px empty slot · ✕ |
| List grid | 1 column, `minmax(0,1fr)`, gap 6px | 2 columns, `repeat(2,minmax(0,1fr))`, gap 6px 10px |

### Name block and meta line
| Property | Mobile | Desktop |
|---|---|---|
| Name block layout | Column, justify center, gap 3px, `flex: 1 1 auto`, min-width 0 | Row, align center, gap 6px, `flex: 1 1 auto`, min-width 0 |
| Meta placement | Second line under the name | Inline on the name's line |
| Meta container | flex, align center, gap 5px, min-width 0, `flex: none` | same |
| Meta items, under | pips · `·` · figure | figure |
| Meta items, over | pips · `·` · figure · `·` · over | figure · `·` · over |
| Figure item | mono 10px `--fg-faint`, nowrap | same |
| Name | 12.5px `--fg`, nowrap, ellipsis | 13.5px `--fg`, nowrap, ellipsis |

### "over $X" meta item
| Property | Mobile | Desktop |
|---|---|---|
| Copy key | `swapToolsCopy.row.over(figure)`; figure is the formatted limit | same |
| Rendered when | The row's drawn price is greater than the limit | same |
| Preceding separator | `·` in `--border-strong` | same |
| font-family | mono | mono |
| font-size | 10px | 10px |
| color | `--warning` | `--warning` |
| white-space | nowrap | nowrap |
| Rule amended | The meta line gains a third item beyond the cost and the figure | same |

### BuyTag (over-limit ring)
| Property | Mobile | Desktop |
|---|---|---|
| Base: flex | none | none |
| Base: font-family | mono | mono |
| Base: font-size | 9px | 9.5px |
| Base: border-radius | 4px | 4px |
| Base: padding | 1px 5px (top/bottom 1, left/right 5) | 1px 5px |
| Base: color | `--warning` | `--warning` |
| Base: background | `color-mix(in oklab, var(--warning) 13%, transparent)` | same |
| Base: price slot | min-width 46px, right-aligned, `--fg-body` | same |
| Base: inner separator | `·` `--border-strong`, padding 0 3px | same |
| Over: box-shadow | `inset 0 0 0 1px color-mix(in oklab, var(--warning) 60%, transparent)` | same |
| Under: box-shadow | none | none |
| New token | None | None |

### ⇄ trigger (over the limit)
| Property | Mobile | Desktop |
|---|---|---|
| Rendered when | Over the limit only (R2) | same |
| Position | Between the buy tag and ✕ | same |
| Glyph | `⇄` | same |
| aria-label key | `swapToolsCopy.row.swapOverAria(name, figure)` | same |
| Action | Opens the stand-ins sheet (out of scope here) | same |
| display | flex, centred on both axes | same |
| flex | none | none |
| width | 44px | 22px |
| height | 44px | 20px |
| margin-right | -9px (so the pair keeps ✕'s right edge) | 0 |
| border-radius | 6px | 6px |
| font-family | mono | mono |
| font-size | 13px | 13px |
| line-height | 1 | 1 |
| color | `--warning` | `--warning` |

### ⇄ under the limit
| Property | Mobile | Desktop |
|---|---|---|
| Rendered | No ⇄ (R2). `swapToolsCopy.row.swapAria` has no row mount | No ⇄ |
| Reserved slot | None. The 44px goes back to the name | Empty span, `flex: none`, width 22px, `aria-hidden="true"` |
| Purpose | — | Keeps buy tags in one column across over and under rows |
| Way in | The card modal's `swapToolsCopy.modal.seeStandIns` (out of scope here) | same |

### ✕ (unchanged, for the pair's geometry)
| Property | Mobile | Desktop |
|---|---|---|
| width × height | 44 × 44 | auto |
| font-size | 13px | 13px |
| line-height | 1 | 1 |
| color | `--border-dashed` | `--border-dashed` |

---

## State Coverage

| State | Trigger | Limit line | Rows |
|---|---|---|---|
| Limit null (default) | `decks.shopping_limit_cents` is null, which reads as 1000 | Figure `$10` + `default` chip | Marked at > $10 |
| Limit set | Column is non-null (whole dollars, ≥ 1) | Figure at the set value + `reset` control, no chip | Marked at > the set value |
| Editing | The figure button is pressed | Figure and chip/reset are replaced by the `$` field, Save and cancel. Separator, count and key stay | Unchanged until save |
| Validation refused | The field holds < 1, > 100,000 or a non-whole value | `limit.invalid`, as the `role="alert"` line above (the handoff draws no placement; engineering's) | — |
| Zero over | No row's drawn price exceeds the limit | Count renders `limit.noneOver(figure)` | No ⇄ or ring on any row. Desktop has a 22px slot on every row |
| Some over | ≥ 1 row over | Count renders `limit.overCount(n)` | Over rows: ring + `over` meta + ⇄ |
| No price feed | No provenance, so `PriceStrip` returns null | Still renders, as the strip's sibling. The count reads `noneOver` | No row is over. Desktop: 22px slot on every row |
| Empty Shopping | The Shopping list has 0 rows | Not rendered (audit eng note, matching the strip) | — |
| Not the Shopping filter | All 99 or another filter | Not mounted | No ⇄, ring, over meta or 22px slot (Shopping only) |
| Row over | The row's drawn price (`priceOf`) > limit | — | BuyTag ring; `row.over` meta in `--warning`; ⇄ 22×20 desktop / 44×44 phone, `--warning` |
| Row under | The row's drawn price ≤ limit | — | No ring, no over meta, no ⇄. Desktop: empty 22px slot. Phone: nothing |
| Row with no price (sold out / unpriced) | `priceOf` is null | Not counted as over | Never over (F5): treated as under, with a 22px slot on desktop and nothing on the phone |

### States the design does not draw (recorded, not invented)
- **Hover, focus, pressed on the over-limit ⇄.** The child draws a rest state only. R1's "lifts on hover like the ✕" applied to the under-limit `--border-dashed` ink, which R2 removed.
- **Hover, focus, pressed** on the figure button, reset, Save and cancel.
- **Placement of `limit.invalid`** (named `tooLow` in the handoff; renamed when the field gained its $100,000 ceiling, the wording owed to /copy-review).
- **A Save pending state.**
- **The width cost (F12).** At 390 an over row spends a net 35px (44 − 9) of name width, and on desktop every row spends 22px. Design says Plateau keeps "about 131px" of name at 390. The audit requires a probe of the name's width at 390 and at the narrowest 2-up desktop width, with the `over` meta inline.
