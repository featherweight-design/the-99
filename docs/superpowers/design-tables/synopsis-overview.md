# Design Property Table — the Overview (synopsis) on the Analysis tab, and its full-overview modal

Source: `design/design_handoff_the99_analysis_tab/` — `SYNOPSIS-modal.md` (primary), `Synopsis Sheet.dc.html`
(the modal body; `phone`, `unrolled`, `state` = present · partial · stale · version), `HANDOFF.md` §2 (the
tab grid rows 0–3) and §3 (row 6), `STATES-analysis-tab.md` §A/§D, `Analysis Tab 1300.dc.html` :97–160,
`Analysis Tab 390.dc.html` :102–162, `analysis-fixtures.js` :271, :346–382 (state flags and notes),
`The 99 - Analysis Tab.dc.html` §6 (6a–6e, stacked frames) and §7 (7a–7h), `CREDITS-overview.md`,
`READINESS-credits-audit.md` finding 3 (ruling D), 5, 10; `design_handoff_the99_deck_analysis/STATES-synopsis.md`
(Round 0 states 2, 4, 5).

Precedence: READINESS rulings > HANDOFF.md / SYNOPSIS-modal.md / CREDITS-overview.md > frames > Round 0
`STATES-synopsis.md` (Round 0 values superseded by the tab frames are marked *superseded*).

Font tokens: canvas `'IBM Plex Mono'` = `--font-mono`; `'IBM Plex Sans'` = `--font-sans` (sheet root);
`var(--display)` = the display face token. Product word: the handoff's "Synopsis" is ruled **Overview**;
strings below are recorded structurally (which key renders), never compared as wording.

---

## 1 · Placement in the tab

### Tab body (with a reading, 2d–2i)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Padding | 18px 16px 32px | 24px 30px 40px |
| Layout | flex column | flex column |
| Gap between blocks | 22px | 28px |
| Order | banner (if any) → Overview section → bracket box → climb → findings → mix | banner (if any) → grid (left: Overview, climb · right: bracket box) → findings → mix |

### Top grid
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Grid | — (no grid; single column, Overview second after banner) | `grid-template-columns: minmax(0,2fr) minmax(0,1fr)` |
| Gap | — | 30px |
| Align items | — | start |
| Overview position | own `<section>` directly above the bracket box | left column (2fr), first child |
| Left column | — | flex column, gap 26px, `min-width: 0`; Overview section then climb section |
| Bracket box | third block, after Overview (`--surface`, 1px `--border`, radius 11, padding 15px 15px) | right column (1fr) (`--surface`, 1px `--border`, radius 12, padding 18px 20px) |
| Climb | fourth block, after the bracket box | left column, under the Overview (26px gap) |

### Pre-reading (2a–2c)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Overview | — (not drawn before a reading: no label, no paragraph, no link, no write row) | — |

> Ruled in `gap-report-synopsis-overview.md`: 2a's "Overview empty state" names the tab's own empty
> state (the ring and Analyze), neither frame draws a label there, and HANDOFF §2 forbids reserved
> space.

---|---|---|
| Grid | withheld (full width) | withheld (full width) |
| Section | flex column, gap 7px | flex column, gap 8px |
| Label | the Overview section label (see §2) | the Overview section label (see §2) |
| Paragraph / entry link / write row | — (not drawn before a reading) | — |

---

## 2 · Component: Overview block on the tab

### Section
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Element | `<section>` | `<section>` |
| Layout | flex column | flex column |
| Gap | 7px | 8px |

### Label (`h3`, section label: Overview)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Font family | `--font-mono` | `--font-mono` |
| Font size | 9.5px | 10px |
| Weight | 400 | 400 |
| Letter spacing | 0.14em | 0.16em |
| Transform | uppercase | uppercase |
| Color | `--fg-faint` | `--fg-faint` |
| Margin | 0 | 0 |
| Conditional | always drawn when the tab has a reading (present, absent, refused) | same |

### Paragraph (overview text)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Element | `<p>` | `<p>` |
| Font family | `--font-sans` (inherited) | `--font-sans` |
| Font size | 13.5px | 15px |
| Line height | 1.65 | 1.7 |
| Color | `--fg-body` | `--fg-body` |
| Text wrap | pretty | pretty |
| Max width | — | 760px |
| Margin | 0 | 0 |
| Budget | ≤ 12 lines | ≤ 6 lines (in the 2fr column) |
| Content | the stored Overview string — **the same string** the modal's Overview section draws (one string, two surfaces) | same |
| Conditional | `overviewPresent` only | same |
| Round 0 value | *superseded*: `--fg-body` 15.5px (STATES-synopsis state 1) | *superseded* |

### Card-name mark (inside paragraph; same everywhere in the tab and modal)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Element | `<b>` via `CardDetailTrigger` (opens the card; hosts the shipped hover preview) | same |
| Weight | 600 | 600 |
| Color | `--fg` | `--fg` |
| Underline | `border-bottom: 1px dotted var(--accent)` | same |
| Cursor | pointer | pointer |
| Font size | inherits the host text | inherits |
| Action | opens `CardModal`, stacked over the modal when pressed inside it | same |

### Entry link ("View full overview →")
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Wrapper | `display:flex; min-height:44px; align-items:center` | `display:flex; margin-top:2px` |
| Link | inline-flex, align center, gap 8px | inline-flex, align center, gap 8px |
| Font family | `--font-mono` | `--font-mono` |
| Font size | 11px | 11px |
| Color | `--accent` | `--accent` |
| Hover color | `--accent-hover` (sheet `a:hover`) | `--accent-hover` |
| Underline | label span only: `border-bottom:1px dotted var(--accent)`; arrow `→` not underlined | same |
| Cursor | pointer | pointer |
| Hit target | 44px min height | — (not specified) |
| Opens | the modal (§5), width 700 / phone sheet from 52 | same |
| Conditional | drawn when `overviewPresent`; also kept under the refused slot when the Overview section alone is refused (SYNOPSIS-modal §4.3); absent when every section is refused or none was ever written | same |

> Note on conditional: frames draw the link under `overviewPresent` only; SYNOPSIS-modal.md §4.3 adds "If the Overview alone fails, the tab draws the refused line in the Overview slot and keeps the entry point." That combination is undrawn.

---

## 3 · Component: write row (Round 0 state 2, "absent")

### Absent line
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Element | `<p>` | `<p>` |
| Font size | 13px | 13.5px |
| Line height | 1.55 | 1.55 |
| Color | `--fg-faint` | `--fg-faint` |
| Margin | 0 | 0 |
| Content | key: overview never-written line | same |
| Conditional | `overviewAbsent` | same |

### Row container
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Margin top | 4px | 6px |
| Layout | flex column | flex row |
| Align | stretch | center |
| Gap | 9px | 16px |
| Wrap | — | wrap |
| Order | button, then note under it | button, then note after it |

### Write one button (enabled)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Display | inline-flex, center/center | inline-flex, center/center |
| Min height | 44px | 36px |
| Width | full (stretch) | content |
| Padding | 0 16px | 0 16px |
| Radius | 8px | 8px |
| Border | 1px `--border-strong` | 1px `--border-strong` |
| Background | — (outlined) | — |
| Color | `--fg` | `--fg` |
| Weight | 500 | 500 |
| Font size | 13px | 13px |

### Write one button (disabled — credits used up, 7g)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Attribute | `aria-disabled="true"` | same |
| Color | `--fg-disabled` | `--fg-disabled` |
| Border | 1px `--border-strong` | 1px `--border-strong` |
| Other | as enabled | as enabled |

### Credit note (beside the write control)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Font family | `--font-mono` | `--font-mono` |
| Font size | 9.5px | 11px |
| Line height | 1.55 | 1.55 |
| Color | `--fg-faint` | `--fg-faint` |
| Text align | center | left (default) |
| Flex | — (column child, under the full-width button) | `flex: 1 1 280px; min-width: 0` (wraps at ~300–340px) |
| Content (credits left) | key: `credits.left` with lead "uses a credit" (7f) | same |
| Content (used up) | key: `credits.usedUp` alone (7g) | same |
| Content (full credits) | `{n} of {total} left` only, no next time | same |
| Conditional | drawn exactly when the press would write (stored overview fingerprint ≠ `listFingerprint(deck)`, fingerprint alone per ruling B); never a new mark/colour/`--danger` | same |
| a11y | tied to its button by `aria-describedby` (audit finding 10d) | same |
| In flight | note stays as drawn; the button disables in place (finding 10c) | same |

---

## 4 · Component: refused slot (Round 0 state 4, Overview refused)

### Tag ("not written")
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Wrapper | `display:flex` (tag hugs its content) | same |
| Font family | `--font-mono` | `--font-mono` |
| Font size | 9.5px | 9.5px |
| Letter spacing | 0.1em | 0.1em |
| Transform | uppercase | uppercase |
| Color | `--danger` | `--danger` |
| Border | 1px `--danger` | 1px `--danger` |
| Radius | 999px | 999px |
| Padding | 2px 8px | 2px 8px |
| Note | the only `--danger` ink on the tab; not on border, button or text | same |

### Sentence
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Font size | 13px | 13.5px |
| Line height | 1.6 | 1.6 |
| Color | `--fg-muted` | `--fg-muted` |
| Text wrap | pretty | pretty |
| Margin | 0 | 0 |
| Content | key: overview refused sentence (tab form, "an overview") | same |

### Count
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Font family | `--font-mono` | `--font-mono` |
| Font size | 10.5px | 10.5px |
| Color | `--fg-faint` | `--fg-faint` |
| Content | key: failed-cards count (`{n} of {m} cards failed checking`): the validator counts the card names it checked (`SectionVerdict.failed` / `total`) | same |

### Try again row
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Row | margin-top 4px; flex column; stretch; gap 9px | margin-top 6px; flex row; align center; gap 16px; wrap |
| Button | outlined, identical to Write one (min-h 44, full width, padding 0 16, radius 8, 1px `--border-strong`, `--fg`, 500, 13px) | outlined (min-h 36, padding 0 16, radius 8, 1px `--border-strong`, `--fg`, 500, 13px) |
| Used up | takes 7g's disabled form (`--fg-disabled` on `--border-strong`) | same |
| Credit note | same as §3 credit note (7h: same strings as Write one) | same |
| Behaviour | never automatic; one press rewrites in one call | same |

### Slot gaps
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Between tag, sentence, count, row | the section's gap: 7px | 8px |

---

## 5 · Component: stale / older-overview line (ruling D)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Drawn | **not drawn by Design**; composition fixed by Hugh's ruling D (READINESS-credits-audit finding 3), no Design round | same |
| Trigger | stored overview's fingerprint ≠ live list, and the banner is gone (bracket current), e.g. after a used-up Re-analyze | same |
| Composition | the old Overview paragraph stays **whole** (§2 paragraph, un-demoted, no tag, no dimming), followed by the Write one line in **state-2 chrome** (§3: line + outlined button + credit note) | same |
| Lead | its own lead string (not the never-written line, which would be false), via `/copy-review` | same |
| Used up | the reset (used-up) line in place of the credit note; button disabled as 7g | same |
| Entry link | — (not specified) | — |

---

## 6 · Component: the modal (ModalChrome, fourth body)

### Backdrop
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Fill | `color-mix(in oklab, var(--bg) 72%, transparent)`, inset 0 | same |
| Click | closes all levels | same |

### Sheet container
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Position | top 52px, left 0, right 0 (sheet from 52) | centred (flex center) |
| Width | 390 (full) | 700 (`wide`) |
| Height | 792 (to the viewport foot); auto when unrolled | max-height 731 |
| Background | `--surface-raised` | `--surface-raised` |
| Border | top 1px `--border-strong` | 1px `--border-strong` |
| Radius | 14px 14px 0 0 | 14px |
| Shadow | — | `0 24px 60px rgba(0,0,0,0.45)` |
| Layout | flex column, overflow hidden | flex column, overflow hidden |
| Font | `--font-sans`, color `--fg` | same |

### Header
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Height | 43px, `flex:none` (pinned) | content, `flex:none` |
| Padding | 0 6px 0 16px | 14px 18px |
| Gap | 9px | 10px |
| Align | center | center |
| Border | bottom 1px `--border` | bottom 1px `--border` |
| Mark slot | — (no glyph; `mark` optional) | — |

### Header title (key: modal title, Overview)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Font family | `--display` | `--display` |
| Weight | 700 | 700 |
| Font size | 15px | 16px |
| Line height | 1.2 | 1.2 |
| Color | `--fg` | `--fg` |
| White space | nowrap | nowrap |

### Header aside
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Font family | `--font-mono` | `--font-mono` |
| Font size | 11.5px | 11.5px |
| Color | `--fg-faint` | `--fg-faint` |
| Flex | `flex:1; min-width:0` | same |
| Overflow | hidden, ellipsis, nowrap | same |
| Content (current deck) | `{deck} · written {when}` | same |
| Content (version) | `version {n} · committed {date}` | same |

### Close control
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Size | 44×44 | 44×44 |
| Margin right | -10px | -10px |
| Glyph | ×, `--font-mono` 14px `--fg-faint` | same |
| Label | `aria-label` key: close overview | same |
| Layout | flex none, centred | same |

### Body
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Flex | 1, `min-height:0` | same |
| Overflow | `overflow-y: auto` | same |
| Padding | 16px 16px 28px | 20px 22px 26px |
| Layout | flex column | flex column |
| Gap | 18px | 20px |

### Stale banner (6d; `role="status"`)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Position | first child of the body | same |
| Layout | flex column, align stretch | flex row, align center |
| Gap | 11px | 16px |
| Padding | 13px 14px | 12px 14px 12px 16px |
| Radius | 10px | 10px |
| Background | `--surface-rail` | `--surface-rail` |
| Border | 1px `--border-strong` | 1px `--border-strong` |
| Sentence | `<p>` 13px / 1.5, `--fg-body`, margin 0, `flex:1; min-width:0` | same |
| Button (Re-analyze, bone) | inline-flex centred; min-h 44px; padding 0 16px; radius 8; bg `--fg`; color `--bg`; weight 600; 13px; nowrap; flex none | same with min-h 34px |
| Credit note | owed (finding 5): the tab banner's note (7c) under/beside this control, both forms; not drawn in the sheet | same |
| Tag / demotion | — (no tag, no dimming; old overview whole below) | — |
| Conditional | `stale` only; never on a version | same |

### Version record line (6e)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Element | `<p>`, first in body | same |
| Font size | 12.5px | 12.5px |
| Line height | 1.55 | 1.55 |
| Color | `--fg-muted` | `--fg-muted` |
| Padding bottom | 14px | 14px |
| Border | bottom 1px `--border` | same |
| Margin | 0 | 0 |
| Conditional | `version` only; no write control, never stale | same |

### Section (each of four peers: Overview, Primer, Key cards, Weaknesses)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Layout | flex column | flex column |
| Gap | 11px | 12px |
| Divider (2nd onward) | top 1px `--border` | same |
| Padding top (2nd onward) | 18px | 20px |
| First section | no divider, no padding | same |
| Order | Overview → Primer → Key cards → Weaknesses | same |

### Section label (`h3`)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Font family | `--font-mono` | `--font-mono` |
| Weight | 400 | 400 |
| Font size | 10px | 10px |
| Letter spacing | 0.16em | 0.16em |
| Transform | uppercase | uppercase |
| Color | `--fg-faint` | `--fg-faint` |
| Margin | 0 | 0 |
| Refused section | label stays | same |

### Overview paragraph (modal)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Font size | 13.5px | 14.5px |
| Line height | 1.65 | 1.7 |
| Color | `--fg-body` | `--fg-body` |
| Text wrap | pretty | pretty |
| Margin | 0 | 0 |
| Budget | ≤ 12 lines | ≤ 6 lines (~656px measure) |
| Card names | card-name mark (§2) | same |

### Primer container
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Layout | flex column | flex column |
| Gap (between sub-blocks) | 18px | 18px |
| Sub-block | flex column, gap 9px (sub-head then content) | same |
| Sub-blocks | Core strategy · Mulligan · Key tips | same |

### Primer sub-head (`h4`)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Font family | `--font-sans` | `--font-sans` |
| Font size | 13.5px | 13.5px |
| Weight | 600 | 600 |
| Color | `--fg` | `--fg` |
| Margin | 0 | 0 |

### Core strategy list (`ol`)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| List | margin 0, padding 0, `list-style:none`, flex column, gap 8px | same |
| Item (`li`) | grid `22px minmax(0,1fr)`, align baseline | same |
| Numeral | `--font-mono` 11px `--fg-faint` | same |
| Step text | 13px / 1.6, `--fg-body` | 13.5px / 1.6, `--fg-body` |
| Count | 3–5 steps; ≤ 3 lines each | 3–5; ≤ 2 lines each |

### Mulligan grid
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Grid | `minmax(0,1fr)` (stacked) | `repeat(2, minmax(0,1fr))` (side by side) |
| Gap | 8px | 12px |
| Order | Keep, then Send back | same |

### Mulligan panel (Keep / Send back, two peers)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Layout | flex column, gap 8px, `min-width:0` | same |
| Background | `--surface-sunken` | same |
| Border | 1px `--border` | same |
| Radius | 9px | 9px |
| Padding | 12px 14px | 12px 14px |
| Label | `--font-mono` 9.5px, letter-spacing 0.14em, uppercase, `--fg-body` | same |
| Item | grid `14px minmax(0,1fr)`, baseline; 13px / 1.55 `--fg-body` | same |
| Glyph | `+` (Keep) / `−` (Send back), `--font-mono` 11px `--fg-faint` | same |
| Status ink | — (no success/warning colour) | — |
| Count | 2–3 each; ≤ 2 lines | 2–3 each; ≤ 2 lines (half column) |

### Key tips
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Container | flex column, gap 10px | same |
| Tip (`p`) | margin 0; padding-left 12px; border-left 1px `--border-strong`; 13px / 1.6 `--fg-body` | same with 13.5px |
| Count | 2–4, each naming ≥ 2 listed cards; ≤ 4 lines | ≤ 2 lines |

### Key cards table
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Container | flex column, border 1px `--border`, radius 10px, overflow hidden | same |
| Row layout | flex column, gap 3px | grid `210px minmax(0,1fr)`, align baseline, gap 16px |
| Row padding | 10px 13px | 10px 14px |
| Row divider | bottom 1px `--border` | same |
| Name | card-name mark, 13px, 600, `--fg`, dotted `--accent`, `justify-self:start` | same |
| Job | 13px / 1.5 `--fg-muted` | same |
| Count | 5–8 rows; job ≤ 2 lines | job ≤ 1 line |

### Weaknesses
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Container | flex column, gap 10px | same |
| Item (`p`) | margin 0; grid `14px minmax(0,1fr)`, baseline; 13px / 1.6 `--fg-body` | same with 13.5px |
| Bullet | diamond: 5×5, `rotate(45deg)`, bg `--fg-faint`, block, margin-top 2px | same |
| Numerals / severity | — (untiered, no numerals) | — |
| Count | 1–3; ≤ 4 lines each | ≤ 2 lines each |

### Refused section slot (6c, inside the modal)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Container | flex column, gap 8px, align flex-start | same |
| Tag | as §4 tag (mono 9.5, 0.1em, uppercase, `--danger`, 1px `--danger`, radius 999, padding 2px 8px) | same |
| Sentence | 13px / 1.6 `--fg-muted`, margin 0; key: section refused sentence ("this section … The rest did.") | same |
| Count | `--font-mono` 10.5px `--fg-faint`; key: `{n} of {m} cards failed checking` | same |
| Try again | outlined: min-h 44px; padding 0 16px; radius 8; 1px `--border-strong`; `--fg`; 500; 13px | same with min-h 34px |
| Reserved height | — | — |

### Stacked card (a card name pressed inside the modal)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Sheet behind | `--surface-sunken`, border-top 1px `--border`, top 52 | `--surface-sunken`, 1px `--border`, 700 wide, stays in place |
| Header behind | opacity 0.55; title `--fg-muted` | opacity 0.55 (body 0.35) |
| Card | shipped `CardModal`, sheet from 96px, border-top 1px `--border-strong`, radius 14 14 0 0, shadow `0 -10px 30px rgba(0,0,0,0.35)`; ✕ on the art band | shipped `CardModal`, ✕ replaced by `← {backLabel}` pill (key: modal title) |
| Back pill | — (the 44px strip of the sheet behind is the way back) | absolute top 22 / right 24; height 34; inline-flex, gap 7; padding 0 14px 0 12px; radius 999; `--surface-raised`; 1px `--border-strong`; `--font-mono` 11px `--fg`; nowrap |
| Depth | stops at two | same |
| Escape / ← | pops one level; focus returns to opener | same |

---

## 7 · Versions-tab entry ("Overview for this version →", 6e)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Position | directly under the note in the expanded version panel | same |
| Display | inline-flex, align center, gap 8px, min-height 44px | inline-flex, align center, gap 8px, margin-top 10px |
| Font | `--font-mono` 11px `--accent` | same |
| Underline | label span `border-bottom:1px dotted var(--accent)`; `→` not underlined | same |
| Conditional | only for a version committed with an overview; otherwise no link, no placeholder; never on the collapsed row | same |

---

## 8 · Method-changed notice (`design_handoff_the99_analysis_tab/addendum_method_notice/`, PR 5)
Built from `Method Notice Addendum.dc.html` (1a to 1f) and the two child canvases' `methodNotice` block. `OVERVIEW_V2_ENABLED` only.

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Position | inside the Overview section, under the label row (and the legality warning line), above the held paragraph | same |
| Box | `display:grid`; padding 13px 14px; margin 2px 0 8px; radius 9; 1px dashed `--border-dashed`; `--surface-sunken` | same |
| Rows | grid areas: mark + line; button (full width); note | grid areas: mark, line over note, button across both rows |
| Gaps | 10px both ways | 11px between columns, 4px between line and note; button 9px further right |
| Mark | 18px ring, 1px `--fg-faint`, `--font-mono` 10.5px 600 `--fg-muted`; `i` informing, `!` after a failure; `aria-hidden`; never recolors | same, margin-top 1px |
| Line | 13px / 1.5 `--fg-body`, `text-wrap:pretty`; `role="status"`, `role="alert"` for lines B and C | 13.5px |
| Note | `--font-mono` 9.5px / 1.55 `--fg-faint`, centered | `--font-mono` 11px, left |
| Button | outlined: 44px, full width, 1px `--border-strong`, radius 8, padding 0 16px, 13.5px 500 `--fg`; `aria-disabled` + `--fg-disabled` when it cannot press | 36px, auto width, 13px, nowrap, centered on both rows |
| Dismiss | none; gone when the shown overview is the new method's | same |
| Copy | line A / note / B / `1 free try left. No credit used.` / C and its no-credit form / `Re-analyze above writes it the new way, free.` (`synopsisCopy.method`) | same |

---

## State Coverage

| # | State | Triggering condition | Tab Overview slot | Modal |
|---|---|---|---|---|
| S1 | **Present** (6a/6b) | reading exists; stored overview written for this list, all sections passed | label + paragraph + entry link | all four sections |
| S2 | **Overview section refused** (tab) | the Overview section alone failed the accept contract | refused slot (§4) in the Overview slot; entry point kept | Overview section as refused slot (6c form); other sections drawn |
| S3 | **One non-Overview section refused** (6c) | one of Primer / Key cards / Weaknesses failed | paragraph + entry link as present | that section's label + refused slot; the rest drawn; no reserved height |
| S4 | **All refused** | every section failed | Round 0 refused state (§4); **no entry point** | no modal |
| S5 | **Absent, Write one** (Round 0 state 2, 7f) | reading exists, no overview ever stored (or never generated) | never-written line + Write one + credit note | no modal, no entry point |
| S6 | **Failed, Try again** (Round 0 state 4, 7h; ruling A upstream failure) | a write press returned a refusal / upstream failure | refused slot + outlined Try again + credit note | no modal (tab-level refusal) |
| S7 | **Older overview beside a fresh reading** (ruling D) | stored overview fingerprint ≠ live list while the reading is current (banner gone), e.g. after a used-up Re-analyze or a failed write | old paragraph whole + state-2 write line with its own lead + credit note (or reset line when spent) | — (not specified) |
| S8 | **Stale reading** (2i / 6d) | deck changed since analysis (`dirty` or list fingerprint moved) | tab banner carries staleness; Overview paragraph unchanged, no tag/dimming | stale banner first in body + Re-analyze (bone); old overview whole |
| S9 | **In flight** | Write one / Try again / Re-analyze pressed and pending | button disables in place; note stays as drawn; no placeholder or shimmer (Round 0 state 5 "not yet read" is the verdict's in-flight form, not the prose's) | banner button disables in place |
| S10 | **Credits spent** (7g; 7b/7e for Analyze/Re-analyze) | allowance at 0 and the press would write | Write one / Try again disabled (`--fg-disabled` on `--border-strong`) + used-up string; Analyze / Re-analyze stay enabled with the "bracket only" lead | modal banner's note takes the used-up form (finding 5) |
| S11 | **No-write press** (7d) | stored overview fingerprint equals the live list | no credit note on any press | no note |
| S12 | **Version** (6e) | a committed version with a stored overview, opened from the Versions panel | — | aside = version; record line; no write control; never stale |
| S13 | **Pre-reading** (2a–2c) | no reading yet | nothing: no Overview section until a reading exists (ruled, see §1) | — |
| S14 | **Method-changed, free (1a)** | `OVERVIEW_V2_ENABLED`; the shown overview is below contract 8; no free run has produced one; 2 tries left | line A + outlined **Write a new overview** + the free note, above the held paragraph; the note never carries the standing, so it reads the same at 0 credits or paused | no notice; the modal's write keeps its credit note unless a free try is left, when it draws none |
| S15 | **Method rewrite running (1b)** | a free (`system`) write is pending | notice gone; the label row says `writing a new one with the new method`; the held paragraph stays; focus moves to that status | — |
| S16 | **Method rewrite landed (1c)** | the free write produced an overview | notice gone, `Overview ready.` said once | — |
| S17 | **Free try failed, one left (1d)** | one `system` call exists, none produced an overview | line B (`role="alert"`, mark `!`) + **Try again** + `1 free try left. No credit used.`; the slot draws no failure row, rejection or refusal of its own | — |
| S18 | **Both free tries used (1e)** | two `system` calls, none produced an overview | line C (`role="alert"`) + the shipped paid **Write a new overview** with `Uses a credit. {standing}.`; paused, owner share or no credit: the line drops its clause and the press is disabled under the shipped note | normal rules |
| S19 | **Method-changed with the stale banner (1f)** | S14 and a stale reading whose Re-analyze would write the overview | the banner leads; the notice keeps line A and loses its button; note `Re-analyze above writes it the new way, free.`; Re-analyze's note is `Also writes the overview, free this once because we changed how overviews are written.` | stale banner as S8 |
