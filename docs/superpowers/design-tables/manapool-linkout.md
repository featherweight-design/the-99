# Design Property Table — Mana Pool link-out (#330)

Sources: R3 canvas (authoritative) · R2 canvas (for what R3 does not redraw) · `LINKOUT-R3-README/READINESS` · `LINKOUT-R2-README/READINESS` · `README.md` · `PARITY-lightbox-to-modal.md` · `manapool-linkout · copy strings.ts` · `ENG-AUDIT-R3.md`.

Breakpoint: Tailwind `md:` = **768px**. "Mobile" = below `md:` (drawn at 390px); "Desktop" = `md:` and up.

The canvases resolve to the **amonkhet** theme and state explicitly *"no hex here is normative."* Token mapping used below: `#DE9757` → `var(--accent-hover)` · `#EDE6D8` → `var(--fg)` · `#CF8745` → `var(--accent)` · `#A59C89` → `var(--fg-muted)` · `#A89B84` → `var(--fg-dim)` · `#2A241D` / `#2B241B` → `var(--border)`.

---

## Component: StoreLink (the shared outbound-link primitive)

### Anchor element `<a>` — rest

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | inherited from body — `'IBM Plex Sans', sans-serif` (handoff names no CSS variable; link declares none) | inherited from body — `'IBM Plex Sans', sans-serif` |
| font-size | `14px` | `14px` |
| font-weight | `500` | `500` |
| line-height | `1.45` | `1.45` |
| letter-spacing | `0` (inherits body) | `0` (inherits body) |
| color | `var(--accent-hover)` | `var(--accent-hover)` |
| text-decoration | `underline` | `underline` |
| text-decoration-thickness | `1px` | `1px` |
| text-underline-offset | `3px` | `3px` |
| text-decoration-color | `color-mix(in srgb, var(--accent-hover) 45%, transparent)` (drawn `rgba(222,151,87,0.45)`) | same |
| background | — (no background) | — |
| border | — (no border) | — |
| border-radius | — at rest; `6px` applies only to the focus ring's corners | — at rest; `6px` on the focus ring |
| display | `inline` | `inline` |
| padding (all sides) | — (no padding) | — (no padding) |
| margin (all sides) | — (no margin of its own; ENG-AUDIT 7: spacing comes from the container) | — (same) |
| min-width | — (none) | — (none) |
| min-height | — (the 44px target is on the ROW, not the link) | — (no 44px requirement above `md:`) |
| box / hit area | no box of its own — this is why `outline` is used, since it takes no layout space | same |
| transition | not specified anywhere in the handoff | not specified |
| markup | `<a href={href} target="_blank" rel="noopener">` | same |
| accessible name | label + sr-only `" (opens in a new tab)"`, in that order | same |
| wrap behaviour | wraps before *at Mana Pool*; glyph stays bound to *Pool* | wraps before *at Mana Pool* rather than compressing the nav counter (R3 open item) |

### Glyph `↗` (aria-hidden sibling span) — rest

| Property | Mobile | Desktop |
|----------|--------|---------|
| character | `↗` U+2197 (text glyph, not SVG) | `↗` U+2197 |
| font-size | `0.85em` (of the 14px parent) | `0.85em` |
| color | `var(--fg-muted)` | `var(--fg-muted)` |
| binding | `&nbsp;` between the last word and the glyph, so it can never wrap alone; the `&nbsp;` lives in the component, not in the copy string (ENG-AUDIT 4) | same |
| aria | `aria-hidden="true"` | `aria-hidden="true"` |
| markup | `<span aria-hidden="true">&nbsp;↗</span>` | same |
| own margin / padding | — | — |
| contrast verification | measured by the repo's existing theme-contrast tests, not asserted from the canvas (ENG-AUDIT 6) | same |

### State: `:hover`

| Property | Mobile | Desktop |
|----------|--------|---------|
| color | `var(--fg)` | `var(--fg)` |
| text-decoration-color | `var(--fg)` (full opacity) | `var(--fg)` |
| text-decoration-thickness | `1px` (unchanged) | `1px` |
| text-underline-offset | `3px` (unchanged) | `3px` |
| glyph color | `var(--fg)` | `var(--fg)` |
| background / border | — | — |

### State: `:focus-visible`

| Property | Mobile | Desktop |
|----------|--------|---------|
| trigger | `:focus-visible`, **not** `:focus` — ENG-AUDIT 5 (canvas drew the ring under plain focus) | same |
| outline | `2px solid var(--accent)` | `2px solid var(--accent)` |
| outline-offset | `2px` | `2px` |
| border-radius (of the ring) | `6px` | `6px` |
| color | unchanged from rest — `var(--accent-hover)` | same |
| text-decoration-color | unchanged from rest | same |
| glyph color | unchanged from rest — `var(--fg-muted)` | same |
| padding added | — (none; R2's asymmetric `box-shadow` + padding is withdrawn as a drawing artifact) | — |
| layout impact | none — `outline` takes no layout space and follows the text box across a line wrap | same |

### State: `:active`

| Property | Mobile | Desktop |
|----------|--------|---------|
| color | `var(--fg)` — does not darken (R2's `#AB6E37` withdrawn) | `var(--fg)` |
| text-decoration-thickness | `2px` (1px → 2px) | `2px` |
| text-decoration-color | `var(--fg)` | `var(--fg)` |
| text-underline-offset | `3px` (unchanged) | `3px` |
| glyph color | `var(--fg)` | `var(--fg)` |
| new token introduced | — (no seventh value enters the table) | — |

### State: `:visited`

| Property | Mobile | Desktop |
|----------|--------|---------|
| styling | — **not styled at all**; identical to rest in every property (ruled, §1c) | — identical to rest |
| color | `var(--accent-hover)` | `var(--accent-hover)` |
| text-decoration-color | `color-mix(in srgb, var(--accent-hover) 45%, transparent)` | same |

### Six-theme rest ink (R3 item 5 — the derivation, unrevisited)

| Theme | `--accent-hover` (rest ink) | contrast on `--surface` | `--accent` (rejected) | contrast |
|-------|---------------------------|------------------------|----------------------|----------|
| amonkhet · Gilded Stone | `#DE9757` | 7.0 | `#CF8745` | 5.9 |
| kamigawa · Neon Rain | `#FF62A9` | 6.5 | `#FF4D9A` | 5.8 |
| innistrad · Moonlit | `#9ABEB0` | 8.7 | `#8AAFA1` | 7.3 |
| phyrexia · Oil and Iron | `#629189` | 5.2 | `#52827A` | 4.3 ✗ fails AA |
| duskmourn · Screen Glow | `#5DB9EB` | 8.0 | `#49A9DC` | 6.6 |
| kaldheim · Rune Frost | `#6C95D8` | 5.5 | `#5C86C9` | 4.5 ✗ fails AA |

Ratios are to be recomputed in CI; the ranking is load-bearing, not the second decimal. The focus ring keeps `var(--accent)` (a 2px outline is a graphic — 3:1 bar, all six clear).

### Copy strings

| Slot | Value |
|------|-------|
| Export dialog · Shopping tab | `Buy these at Mana Pool` (`linkOut.deck`) |
| Card modal | `Buy any printing at Mana Pool` (`linkOut.card`) |
| sr-only suffix | `" (opens in a new tab)"` (`linkOut.newTab`) |
| Glyph in string | — the `↗` is **not** in the strings |
| Deck href | `${MANAPOOL}/add-deck?deck=${base64(list)}` |
| Card href | `${MANAPOOL}/cards?q=${encodeURIComponent(card.name)}` — keyed by the **oracle card**, never the printing on screen |
| rel | `noopener` — and nothing more |

---

## Component: Export dialog · Shopping tab

### Footer — link row

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| exists | yes (Shopping tab only; never the Decklist tab) | yes (Shopping tab only) |
| position | second footer row, below the button row | second footer row, below the button row |
| display | `flex` | `flex` |
| align-items | `center` | `center` |
| justify-content | flex-start (left-aligned — R2's centring withdrawn) | flex-start (left-aligned) |
| flex-direction | row (default) | row (default) |
| flex-wrap | not specified | not specified |
| min-height | `44px` | — (not specified; the drawn row has no `min-height`) |
| flex | `none` | not specified |
| padding | `2px 18px 10px` | `13px 24px 18px` |
| margin | — (none of the link's own; ENG-AUDIT 7: the container's existing spacing) | — (same) |
| gap | — (single child) | — (single child) |
| background | — (inherits the dialog surface) | — |
| border | — | — |
| divider above the link row | — **none**; the link sits below the footer's *existing* top hairline | — **none** (ENG-AUDIT 1; canvas drew a second divider `margin: 0 24px; height: 1px; background: var(--border)` — the rule that the convention adds no dividers wins) |

### Footer — the existing top hairline (shipped, not modified)

| Property | Mobile | Desktop |
|----------|--------|---------|
| height | `1px` | `1px` |
| background | `var(--border)` (drawn `#2A241D`) | `var(--border)` (drawn `#2A241D`) |
| margin | `14px 18px 0` | `0 24px` |
| flex | `none` | not specified |
| relationship to the link | link row is **below** it; the buttons row is also below it — one hairline serves the whole footer | same, and no second hairline is introduced |
| when the list is empty | absent — the hairline goes with the link | absent |

### Footer — button row (shipped, unchanged; recorded for adjacency)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `flex` | `flex` |
| align-items | `center` | `center` |
| gap | `10px` | `12px` |
| padding | `12px 18px 0` | `18px 24px 14px` |
| contents | `Copy shopping list` (`flex: 1`, centred text, `padding: 12px 0`) + `.txt` (`flex: none`, `padding: 12px 16px`) | `Copy shopping list` (`padding: 11px 22px`) + `Download .txt` (`padding: 11px 18px`) + `export.pricingNote` at `margin-left: auto` |

### Sheet / dialog container (context, unmodified)

| Property | Mobile | Desktop |
|----------|--------|---------|
| height | `590px` **fixed** | not fixed (content height) |
| width | 390px viewport, full-bleed sheet | dialog `560px` |
| display / flex-direction | `flex` / `column` | `flex` / `column` |
| list block | `flex: 1; min-height: 0; margin: 0 18px` — 8 rows fit with the link's row in place; a 9th starts the scroll | `margin: 0 24px; height: 190px` |
| border-radius | `16px` | `16px` |

---

## Component: Shared card modal

### Desktop — the pinned `‹ Prev · N of M · Next ›` row (link joins it)

| Property | Mobile | Desktop |
|----------|--------|---------|
| renders | — (row is `hidden md:flex`; mobile has no equivalent row) | yes |
| display | — | `flex` |
| flex | — | `none` (sibling of the scrolling column) |
| align-items | — | `center` |
| gap | — | `16px` |
| min-height | — | `56px` |
| padding | — | `0 28px` |
| border-top | — | `1px solid var(--border)` (drawn `#2A241D`) — **shipped**, not added by this ticket |
| divider between link and nav | — | — **none**, ever (a divider inside a row under a rule is two rules doing one job) |
| spacer | — | flex spacer: `margin-left: auto` on the nav cluster |
| DOM / tab order | — | link **first**, then Prev/Next (ENG-AUDIT 3: the trap follows DOM order, so the link goes first as drawn) |
| link position | — | leading (left) edge |
| nav cluster | — | trailing (right) edge: `display: flex; align-items: center; gap: 14px; flex: none` |
| nav item type | — | `Prev` / `Next`: Plex Sans `500` / `13.5px` / `var(--fg-dim)`, no underline; counter: Plex Mono `12px` / `#6E6353` |

### Mobile — the link's own in-flow row

| Property | Mobile | Desktop |
|----------|--------|---------|
| renders | yes | — (the link lives in the pinned nav row instead) |
| container | inside the scrolling column's `padding: 20px` | — |
| position | in-flow, below the meta grid (and below the printing/availability block when present) — not pinned | — |
| display | `flex` | — |
| align-items | `center` | — |
| justify-content | flex-start (left-aligned) | — |
| min-height | `44px` | — |
| padding | — (none; the column's 20px padding provides the inset) | — |
| margin | — (none of its own) | — |
| gap | — (single child) | — |

### Mobile — hairline above the link row

| Property | Mobile | Desktop |
|----------|--------|---------|
| height | `1px` | — (no hairline added; the shipped nav row's `border-top` serves) |
| background | `var(--border)` (drawn `#2B241B`) | — |
| margin-top | `14px` | — |
| margin left/right | — (full width of the 20px-padded column) | — |
| purpose | load-bearing: separates the link from `6 printings you own ▾`, so it never reads as *buy this printing* | — (the scroll column / pinned row split does the same job) |

### Card modal — link content and conditions

| Property | Mobile | Desktop |
|----------|--------|---------|
| label | `Buy any printing at Mana Pool ↗` | `Buy any printing at Mana Pool ↗` |
| href | `/cards?q=<oracle card name>` | same |
| conditionality | none — one state for every card, owned or not, priced or not | same |
| route dependence | none — deck builder, `/collection`, commander page all produce a byte-identical link | same |
| printing state passed | — (never) | — (never) |

---

## Where the link never renders

| Surface | Ruling |
|---------|--------|
| Export dialog · Shopping tab when the list is empty | **Absent, not disabled** — no link, no hairline, no row. |
| Export dialog · Decklist tab | Rejected, not deferred; no slot held. |
| The buy tag on card art | Never a link (9px text, 92% scrim, `pointer-events: none`) — *a link-out goes only where its focus ring fits.* |
| Shopping-list rows | Rejected — the row's card opens the modal; the modal has the link. |
| Interstitial "you are leaving The 99" confirm | Rejected. |
| Mana Pool logo / wordmark | Absent. |

---

## State Coverage

| State | Triggering condition | What renders |
|-------|---------------------|--------------|
| **Rest** | Default; also the state after visiting | `var(--accent-hover)` text, 14px/500, underline `1px` at `3px` offset in `color-mix(--accent-hover 45%, transparent)`, `↗` at `0.85em` in `var(--fg-muted)`, nbsp-bound, aria-hidden. |
| **Hover** | Pointer over the link | Text, underline and glyph all → `var(--fg)`; underline at full opacity, thickness stays `1px`. |
| **Focus-visible** | Keyboard focus (`:focus-visible` only — a mouse click paints no ring) | Rest ink and underline, plus `outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 6px`. No layout shift. |
| **Active** | Press / `:active` | Ink `var(--fg)`, underline thickens `1px → 2px` in `var(--fg)`, glyph `var(--fg)`. No darkening. |
| **Visited** | URL previously visited | Identical to rest — `:visited` is deliberately unstyled. |
| **Export · Shopping list non-empty** | Shopping tab with ≥1 card | Second footer row renders below the footer's existing hairline: mobile `min-height: 44px`, `padding: 2px 18px 10px`; desktop `padding: 13px 24px 18px`. Left-aligned at both. |
| **Export · Shopping list empty** | Shopping tab count = 0 | Link **absent**, its row absent, and the hairline that would sit above it absent. Not a disabled control. |
| **Export · Decklist tab** | Decklist tab active | Nothing renders; no reserved slot. |
| **Card modal · desktop** | Viewport ≥ `md:` (768px) | Link at the leading edge of the pinned nav row (`gap: 16px`, `min-height: 56px`, `padding: 0 28px`, existing `border-top`), nav cluster pushed right by `margin-left: auto`. No divider. |
| **Card modal · mobile** | Viewport < `md:` | Link in its own in-flow row inside the scrolling column's `padding: 20px`, under a `1px` `var(--border)` hairline with `margin-top: 14px`; row `min-height: 44px`. The nav row does not exist at this width. |
| **Card modal · card owned** | `You own ×N` ≥ 1, printing/availability block present | Same link, same place — the hairline separates it from `6 printings you own ▾`. |
| **Card modal · card not owned** | `You own: none` | Same link, same place — identical rendering. |
| **Card modal · priced / unpriced** | Price known or unknown | Identical — the link reads no price. |

---

## Notes on ENG-AUDIT overrides recorded above

1. **Desktop export footer divider** — recorded as *no divider*; the canvas drew `margin: 0 24px; height: 1px; background: var(--border)` between the button row and the link row (ENG-AUDIT 1).
2. **Focus trigger** — recorded as `:focus-visible`; the canvas drew the ring on plain focus (ENG-AUDIT 5).
3. **Row margin** — recorded as the container's existing spacing at both breakpoints, not a value of the link's own (ENG-AUDIT 7).
4. **`&nbsp;` binding** — recorded as living in the component, not in the copy string (ENG-AUDIT 4).
5. **Tab order** — link before Prev/Next in DOM order, as drawn (ENG-AUDIT 3).
6. **Glyph contrast** — verified by the repo's theme-contrast tests, not asserted from the canvas (ENG-AUDIT 6).
7. **Mobile card-modal row stays in-flow** — correct as drawn, not an inconsistency, because the nav row is `hidden md:flex` (ENG-AUDIT 2).

**Not specified anywhere in the handoff** (do not invent): `transition` on any state, `flex-wrap` on either link row, and a CSS variable name for the link's `font-family` (it inherits the body's `'IBM Plex Sans', sans-serif`).
