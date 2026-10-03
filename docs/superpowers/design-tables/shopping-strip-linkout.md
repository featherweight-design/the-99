# Design Property Table — Shopping Strip Link-Out (R4)

Sources: `design/design_handoff_the99_linkout/` — `The 99 - Decks · Shopping Strip Link-Out (R4).dc.html`
(canvas), `LINKOUT-R4-README.md`, `LINKOUT-R4-READINESS.md`, `shopping-strip-linkout · copy strings.ts`,
`LINKOUT-R3-README.md` (the primitive), and `ENG-AUDIT-R4.md` (which overrides the canvas where the two
disagree).

Breakpoint: Tailwind `md:` = 768px. Token names are normative; the hex values are the amonkhet theme
only, and are given for contrast reasoning, never to be hardcoded.

R4 changes **where the deck-level buy action lives**, not what the link looks like. The `ExternalLink`
primitive ships unchanged from R3, so its rows below are reference for the verify pass, not work.

**Addendum, Hugh's ruling (#1222 follow-up, no Design round):** the Strip container's desktop
column below is superseded. The total sat at the far top-right under `row-reverse` +
`space-between`, easily missed, with the provenance line and the buy link on the left. Desktop
now reuses the mobile column exactly — no `flex-direction`, `align-items` or `justify-content`
override, and no separate padding. The table's Desktop column is corrected in place rather than
struck through, since nothing here needs a second "as shipped" row: mobile and desktop are now
the same value on every line.

---

## Component: PriceStrip

### Strip container

| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| flex-direction | column | column |
| align-items | stretch | stretch |
| justify-content | flex-start | flex-start |
| gap | 5px | 5px |
| background | `var(--surface-sunken)` | `var(--surface-sunken)` |
| border-width | 1px | 1px |
| border-style | solid | solid |
| border-color | `var(--border)` | `var(--border)` |
| border-radius | 9px | 9px |
| padding-top | 10px | 10px |
| padding-right | 13px | 15px |
| padding-bottom | **0** | **0** |
| padding-left | 13px | 15px |
| margin-top | 10px | 10px |
| margin (other sides) | — | — |

Corrections applied, per `ENG-AUDIT-R4.md`:

- **§1 — `background`.** The canvas labels its state table "on `--surface-inset`" and draws `#14110E`.
  Neither is right: in this repo `#14110E` is `--bg` and `--surface-inset` is `#1B1712`. Shipped
  renders `var(--surface-sunken)` (`#18140F`), which is what the canvas's own in-context frames draw.
  The canvas is right where it renders the colour and wrong where it names it.
- **§3 — horizontal padding.** The canvas draws `11px 15px` in the ruled placement and the desktop
  in-context frame but `11px 14px` in all four price variants. 15px wins: it matches shipped and it is
  the value the ruled placement and the README both carry.
- **§4 — mobile `padding-bottom: 0`.** This is the one shipped value inside the strip that moves. The
  44px link row supplies the bottom padding below `md:`.

### Figure line (`$84.25 · 6 of 8 priced`) — unchanged by R4

| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| align-items | baseline | baseline |
| gap | 7px | 7px |
| margin | 0 | 0 |
| font-family | `var(--font-mono)` | `var(--font-mono)` |

### Total figure

| Property | Mobile | Desktop |
|---|---|---|
| font-size | 14px | 14px |
| font-weight | 600 | 600 |
| color | `var(--fg)` | `var(--fg)` |

### Priced clause

| Property | Mobile | Desktop |
|---|---|---|
| font-size | 10.5px | 10.5px |
| font-weight | 400 | 400 |
| color | `var(--fg-faint)` | `var(--fg-faint)` |
| separator | `· ` in an `aria-hidden` span, only when the figure renders | same |
| copy key | `priceCopy.strip.pricedClause(priced, total)` | same |

### Provenance line

| Property | Mobile | Desktop |
|---|---|---|
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | 9.5px | 9.5px |
| line-height | 1.5 | 1.5 |
| color | `var(--fg-locked)` | `var(--fg-locked)` |
| margin | 0 | 0 |
| composition | clauses joined with ` · ` | same |
| clause 1, ≥1 priced row | `priceCopy.strip.provenance` | same |
| clause 1, 0 priced rows | `priceCopy.strip.provenanceUnpriced` **(new key)** | same |
| clause 2 | `priceCopy.strip.lastChecked(when)` | same |
| clause 3, only when behind | `priceCopy.strip.behind` | same |

The canvas names `--fg-faint` for the clause and `--fg-dim`/`--fg-faint` for the provenance line. The
shipped strip renders the clause at `--fg-faint` and the provenance at `--fg-locked`, and R4's own rule
is that nothing shipped inside the strip moves except the mobile bottom padding. **Shipped tokens win**;
the canvas's ink names for these two lines are a drawing slip, not a ruling.

The copy contract file writes `provenanceUnpriced` as one fused template with `{day}` inside it. Shipped
copy composes the line from three separate clauses, so the new key replaces **only the first clause** and
`lastChecked` stays its own function. Structure is eng's; the wording goes to `/copy-review`.

### Link row — the strip's last line

Also superseded by the addendum above: the row kept its own `md:block md:min-h-0` override even
after R4, collapsing to the inline link's own box at desktop. That override is gone too — the row
is now the same flex shape at both widths, which is what "held at both widths now" in the code
means: a pointer loses nothing from the extra height, and it is one definition rather than two.

| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| align-items | center | center |
| justify-content | flex-start | flex-start |
| min-height | **44px** | **44px** |
| margin-top | **9px** | **9px** |
| padding | — | — |
| background | — | — |
| border | — | — |
| order in the box | last, below the provenance | last, below the provenance |

The 9px gap is kept at **both** breakpoints and is load-bearing: `outline` takes no layout space, so the
link's 2px focus ring at 2px offset overlaps that gap rather than displacing the provenance line.

The 44px target is on the **row**, never on the link. The link keeps `display: inline` with no box.

---

## Component: ExternalLink (R3 primitive — ships as-is, R4 adds no code)

### Anchor — rest

| Property | Mobile | Desktop |
|---|---|---|
| element | `<a target="_blank" rel="noopener">` | same |
| display | inline | inline |
| font-size | 14px | 14px |
| font-weight | 500 | 500 |
| line-height | 1.45 | 1.45 |
| color | `var(--accent-hover)` | `var(--accent-hover)` |
| text-decoration-line | underline | underline |
| text-decoration-thickness | 1px | 1px |
| text-underline-offset | 3px | 3px |
| text-decoration-color | `color-mix(in srgb, var(--accent-hover) 45%, transparent)` | same |
| padding / margin | — | — |

### Anchor — hover

| Property | Mobile | Desktop |
|---|---|---|
| color | `var(--fg)` | `var(--fg)` |
| text-decoration-color | `var(--fg)` | `var(--fg)` |
| glyph color | `var(--fg)` | `var(--fg)` |

### Anchor — active

| Property | Mobile | Desktop |
|---|---|---|
| color | `var(--fg)` | `var(--fg)` |
| text-decoration-thickness | 2px | 2px |
| text-decoration-color | `var(--fg)` | `var(--fg)` |

### Anchor — focus-visible

| Property | Mobile | Desktop |
|---|---|---|
| outline-width | 2px | 2px |
| outline-style | solid | solid |
| outline-color | `var(--accent)` | `var(--accent)` |
| outline-offset | 2px | 2px |
| layout effect | none — overlaps the 9px gap by 2px | same |

### Anchor — `:visited`

Identical to rest, unstyled. The canvas's state table has four rows where its intro says five;
`:visited` is not drawn. Inherited from R3 unchanged — nothing to build.

### Glyph

| Property | Mobile | Desktop |
|---|---|---|
| element | `<span aria-hidden="true">` inside the `<a>` | same |
| character | `↗` (U+2197), a text glyph, not an SVG | same |
| font-size | 0.85em | 0.85em |
| color, rest | `var(--fg-muted)` | `var(--fg-muted)` |
| color, hover / active | `var(--fg)` | `var(--fg)` |
| binding | a leading space inside the same span, so the glyph never wraps alone | same |

### New-tab promise

| Property | Mobile | Desktop |
|---|---|---|
| element | `<span className="sr-only">` after the glyph | same |
| text | `" (opens in a new tab)"` — owned by the component, not a copy file | same |

### `href` contract

| Property | Value |
|---|---|
| href | `https://manapool.com/add-deck?deck=<url-encoded standard base64 of the list text>` |
| list text | one `"<quantity> <name>"` per line |
| target / rel | `_blank` / `noopener` |
| derivation | at click — computed from the current list on every render, never memoized against a stale one |
| copy key | `exportLinkOutCopy.shopping` — the same string the export dialog renders |

---

## Conditional rendering

| Element | Condition |
|---|---|
| Strip | `provenance != null && summary.totalCopies > 0` |
| Figure | `summary.pricedCopies > 0` |
| Priced clause | `0 < summary.pricedCopies < summary.totalCopies` — **the `0 of N` case is excluded after R4** |
| Provenance line | whenever the strip renders |
| Link row | whenever the strip renders — **no second condition** |

The link inherits the strip's suppression rather than carrying its own. That is what makes "absent, not
disabled" structural instead of a rule to remember: it cannot render where it would be wrong.

---

## State Coverage

| State | Triggering condition | Rendered | Data required |
|---|---|---|---|
| **Partially priced** | `totalCopies > 0 && 0 < pricedCopies < totalCopies` | Figure + clause / provenance / link row. The link buys **all** copies, not only the priced ones — no count in the label. | `totalCents`, `pricedCopies`, `totalCopies`, `provenance.when`, `provenance.behind`, the shopping list |
| **All priced** | `totalCopies > 0 && pricedCopies === totalCopies` | Figure, **no clause** / provenance / link row. | same |
| **None priced** | `totalCopies > 0 && pricedCopies === 0` | **No figure, no clause.** Provenance line on `provenanceUnpriced` / link row. No error tone. | `pricedCopies === 0`, `totalCopies`, `provenance.when`, the shopping list |
| **Nothing to buy** | `provenance == null \|\| totalCopies === 0` | Nothing — no strip, so no link. | — |

`ENG-AUDIT-R4.md §2` corrects both R4 documents on the **None priced** row. They bill it as a state that
"previously rendered nothing". It renders today: `showFigure` is false but `showClause` is `0 < N`, so the
strip shows `0 of N priced` above the provenance. The real delta is narrower — the clause is dropped and
the first provenance clause swaps key. QA should look for a clause disappearing and a string changing,
never for a strip appearing where none was.

---

## Structure eng owns

| Item | Value |
|---|---|
| `isShoppingCard` | ONE exported selector with THREE consumers: the rows the Shopping filter renders, the strip's total and denominator, and both `href`s. |
| In the basket | unowned cards · spoken-for cards (owned but committed elsewhere) · sold-out rows · unpriced rows |
| Out of the basket | basic lands · a row the player just `✕`'d |
| The bug this closes | the export dialog composes its own list from a plain `!c.owned`, which includes unowned basics and drops spoken-for cards, so the shipped export link buys a basket the player never saw. |
| Tab order | the strip holds no other focusable; the link is reached after the filter pills and before the first card row. DOM order = reading order = visual order. |
