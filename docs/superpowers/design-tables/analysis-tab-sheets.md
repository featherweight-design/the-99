# Design Property Table — Analysis tab: the sheets (PR A)

Source: `design/design_handoff_the99_analysis_tab/` — `HANDOFF.md` §2 rows 3–4, §3, §5.5–5.8; `STATES-analysis-tab.md` §D; `READINESS-r1-audit.md` (Hugh's rulings, findings 10 and 21, §1, §7, §9 row A); `The 99 - Analysis Tab.dc.html` §3 (3a/3b/3c) and the order table; `Analysis Tab 1300.dc.html` / `Analysis Tab 390.dc.html` (climb rung, findings head row); `analysis-fixtures.js` (rung, findings); `analysis-tab - copy strings.ts` (`sheets`).

Precedence: READINESS rulings > HANDOFF.md > canvas. Where the canvas hard-codes `'Cinzel'` for a title, the token is `--display` → `font-display` / `--font-display-face` on main (finding 21). Canvas fonts: `'IBM Plex Mono'` = `--font-mono`, sans = `--font-sans`.

## Component: ModalChrome (shared sheet shell)

### Sheet container
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Position | absolute, left 0 / right 0, top 52px, bottom 0 (sheet from 52px) | centred in viewport (flex center) |
| Width | full | 560 (3c) / 700 (3b, synopsis, reasoning) / **760 (3a, new)** |
| Background | `--surface-raised` | `--surface-raised` |
| Border | top 1px `--border-strong` | 1px `--border-strong` |
| Radius | 14px 14px 0 0 | 14px |
| Shadow | — | `0 24px 60px rgba(0,0,0,0.45)` |
| Overflow | hidden (3c drawn with `overflow:hidden`) | hidden |
| Layout | flex column | block |
| Backdrop | `color-mix(in oklab, var(--bg) 72%, transparent)`, inset 0 | same |

### Header row
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Height | 43px, `flex: none` | content (padding 14px 18px) |
| Padding | 0 6px 0 16px | 14px 18px |
| Gap | 9px | 10px |
| Align | center | center |
| Border | bottom 1px `--border` | bottom 1px `--border` |
| Order | mark (optional) · title · aside (optional) · close (`margin-left:auto`) | same |
| `mark` prop | optional (new, §5.5); absent → no slot drawn | same |

### Title
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Family | `--display` | `--display` |
| Weight | 700 | 700 |
| Size | 15px (3a, 3c); 14px, line-height 1.15 (3b) | 16px |
| Color | `--fg` | `--fg` |
| Wrap | 3c: `white-space: nowrap` | — |

### Aside (count)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Family | `--font-mono` | `--font-mono` |
| Size | 11.5px | 12px |
| Color | `--fg-faint` | `--fg-faint` |
| Present | 3a only; — on 3b, — on 3c | same |

### Close control (×)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Box | 44×44, flex centred | glyph only (no box drawn) |
| Glyph | × mono 14px `--fg-faint` | × mono 14px `--fg-faint` |
| Position | `margin-left:auto` | `margin-left:auto` |
| Accessible name | 3b `sheets.closeUpgradePath`; 3c `sheets.closeProvenance` | same |

## Component: Stacked state (sheet behind a CardModal)

### Sheet behind
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Position | top 52, left/right 0, bottom 0 (stays in place) | absolute, left 50% translateX(-50%), top 64 (canvas), height 640 (canvas) |
| Width | full | same width as when unstacked (760 / 700 / 560) |
| Background | `--surface-sunken` | `--surface-sunken` |
| Border | top 1px `--border` (steps down from `--border-strong`) | 1px `--border` (steps down) |
| Radius | 14px 14px 0 0 | 14px |
| Shadow | — | — |
| Header opacity | 0.55 | 0.55 |
| Header title color | `--fg-muted` | `--fg-muted` |
| Body opacity | 0.35 (body hidden under the card sheet; only the 44px strip shows) | **0.35 (new)** |
| Second backdrop | — | — (`stacked` skips it) |
| Visible part | the 43/44px header strip above the card sheet | header visible above the card |

### Card sheet (shipped CardModal, stacked)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Top | 96px | 120px (canvas); 820×620 |
| Background | `--surface-sunken` | `--surface-rail` |
| Border | top 1px `--border-strong` | 1px `--border-strong` |
| Radius | 14px 14px 0 0 | 16px |
| Shadow | `0 -10px 30px rgba(0,0,0,0.35)` | `0 -6px 40px rgba(0,0,0,0.5)` |
| Close | ✕ on the art band: absolute top 22 / right 18, 32×32 round, bg `color-mix(in oklab, var(--bg) 55%, transparent)`, 16px `--fg` — unchanged | replaced by the back pill when `backLabel` set |
| Anything added | — (no remove action, nothing opens from a card) | — except the back pill |
| Depth | max two: sheet + card; nothing in a card opens anything | same |

### Back pill (`CardModal` `backLabel?: string`, used only when `stacked` and set)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Drawn | — (phone unchanged; the sheet behind's strip is the way back) | yes, in `closeRefs[1]`'s slot |
| Position | — | absolute top 22 / right 24 |
| Height | — | 34px |
| Display | — | inline-flex, align center, gap 7px |
| Padding | — | 0 14px 0 12px |
| Radius | — | 999px (pill) |
| Background | — | `--surface-raised` |
| Border | — | 1px `--border-strong` |
| Type | — | `--font-mono` 11px, `--fg`, `white-space: nowrap` |
| Content | — | `← {backLabel}` |
| Label source | — | receipt → the finding's label; 3b → target bracket's name; synopsis → `Synopsis`; reasoning → its title |
| Name-block reserve | — | **widened when `backLabel` set, measured** (finding 10 overrides "nothing else moves"; longest labels e.g. `How we determined bracket 4`, `Two-card infinites`) |
| Unset / not stacked | — | the shipped 34px round ✕ |

### Stack interaction
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| ← / back | tapping the sheet behind's strip returns to it | pill pops one level |
| Esc | pops one level | pops one level |
| Click on page behind | closes all (both) | closes all (both) |
| Focus | returns to the opener | returns to the opener |

## Component: 3a Receipt

### Sheet
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Width | full (sheet from 52) | 760 |
| Opener | findings tile control `see the card` / `see the cards` / `see the combo` / `see the combos` | same |
| Header mark | fact mark (`fact-game-changer` etc.) 16px, `--fact`, `drop-shadow(0 0 3px color-mix(in oklab, var(--fact) 45%, transparent))` | same |
| Title | finding label (e.g. finding `label`) | same |
| Aside | count (mono) | same |

### Tile grid (card list)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Columns | 2 (`1fr 1fr`) | 4 (`repeat(4, minmax(0,1fr))`) |
| Gap | 14px row / 11px column | 18px row / 12px column |
| Padding | 14px 16px | 18px 20px 22px |
| Tile width | ~172px | ~172px (same as phone) |
| Tile layout | flex column, gap 6px | flex column, gap 7px |

### Tile art
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Aspect | 63/88 | 63/88 |
| Radius | 8px | 8px |
| Border | 1px `--border-strong` | 1px `--border-strong` |
| Fact mark on tile | — | — |

### Tile name
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Size | 11.5px | 12px |
| Line-height | 1.3 | 1.3 |
| Color | `--fg-body` | `--fg-body` |
| Family | `--font-sans` | `--font-sans` |
| Press | opens stacked CardModal, back label = finding label | same |

### Combo body
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Body | shipped combo body unchanged | unchanged, keeps its 96px pair (read for the steps) |

## Component: 3b What would have to go

### Sheet
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Width | full | 700 |
| Opener | climb lower rung only | same |
| Header mark | target bracket's chip mark (`bracket-N-…-chip`), 22px, ink `--bracket-N` | same |
| Title | `{Target name}, two things would have to go` (target = bracket directly below) | same |
| Title size | 14px, lh 1.15 | 16px |
| Aside | — | — |
| Target chips (Target/Core/Exhibition) | — | — |
| Targets up (rung above) | — (never) | — |
| `open your decklist →` | — | — (`onOpenDecklist` dropped) |
| Old body title/aside | — | — |

### Body
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Padding | 14px 16px | 16px 18px 18px |
| Layout | flex column, gap 11px | flex column, gap 13px |
| Content | rule boxes, then foot sentence; nothing else | same |

### Rule box (one per rule)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Layout | flex column, gap 7px | grid `150px minmax(0,1fr)`, align baseline, gap 4px 18px |
| Border | 1px `--border` | 1px `--border` |
| Radius | 9px | 9px |
| Background | `--surface-sunken` | `--surface-sunken` |
| Padding | 11px 12px | 12px 13px |
| Label | mono 9.5px, ls 0.14em, uppercase, `--fg-faint` (rule name) | same, column 1 |
| Sentence | 12.5px, lh 1.6, `--fg-body`; strong clause 600 `--fg` | 13px, lh 1.6, `--fg-body`; strong 600 `--fg` |

### Candidate list
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Layout | flex column, align flex-start, gap 7px, margin-top 2px | column 2 (empty cell in col 1), flex wrap, align center, gap 6px 14px, margin-top 5px |
| Item | inline-flex, align center, gap 5px: name then fact mark (16px) | same |
| Name | 12.5px `--fg`, border-bottom 1px dotted `--accent` | same |
| Press | opens stacked CardModal, back label = target bracket name (`← Upgraded`) | same |

### Foot
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Border | top 1px `--border`, padding-top 11px | same |
| Layout | flex column, gap 8px | flex, align flex-start, gap 16px; text `flex:1` |
| Text | 12px, lh 1.6, `--fg-faint`; bold 600 `--fg-body` (`Which cards go is yours…`) | same |

## Component: 3c How we make these decisions

### Sheet
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Width | full | 560 |
| Openers | findings (under them, 44px); empty state (PR B) | findings head row right end; empty state (PR B) |
| Mark | — | — |
| Aside | — | — |
| Title | `sheets.provenance` (= `provenance.toggle` verbatim; reuse `deckAnalysisCopy.provenance.toggle`) | same |
| Stacks | nothing | nothing |

### Body
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Content | shipped provenance open body, words and order unchanged | same |
| Padding | 14px 16px | 16px 18px 18px |
| Layout | flex column, gap 11px | flex column, gap 12px |
| Base type | 12.5px, lh 1.6, `--fg-muted` | same |
| Lead | `--fg-body` | same |
| Row | flex column, gap 3px, border-top 1px `--border`, padding-top 10px | same |
| Row label | 12px, 600, `--fg` | same |
| Outside link | mono 10.5px `--accent`, border-bottom 1px **solid** `--accent`, `↗`; leaves the app (not a sheet) | same |
| Checked line | (not drawn in the 390 frame) | mono 10.5px `--fg-faint` |
| Misses | inherits body | same |
| Closing "why" paragraph | (not drawn in the 390 frame) | `--fg-faint` |

## Component: Openers

### Climb lower rung — `what would have to go →`
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Rendered when | rung role `below` with a path; — on yours rung, — on `above` (`already allowed`) rung | same |
| Placement | own row in the rung body, flex, `justify-content:flex-end`, min-height 44px, align center, margin -6px 0 -8px | in the rung's right column under the body, `display:flex` (left) |
| Type | mono 11px, `--accent`, border-bottom 1px dotted `--accent` | same |
| Glyph | → (in string) | same |
| Opens | 3b | 3b |

### Findings head row — `How we make these decisions →`
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Placement | under the findings box, flex, min-height 44px, align center, gap 8px | head row right end, `margin-left:auto`, inline-flex, align center, gap 8px |
| Type | mono 10px `--fg-faint` | mono 10px `--fg-faint` |
| Underline | label span border-bottom 1px dotted `--border-dashed`; → in its own span, not underlined | same |
| Opens | 3c | 3c |
| ▾ caret / in-place disclosure | — (retired; → only) | — |

## Conflicts noted (not wording judgments)
| Item | Resolution |
|---|---|
| Copy strings `sheets.upgradePath` = "What would have to go" with aside `rungLabel` | HANDOFF §3 / canvas win: header is `{Target}, two things would have to go`, no aside |
| Back pill "nothing else in the modal moves" | Finding 10: widen the name-block reserve when `backLabel` is set |
| 3c 390 frame omits the checked line and "why" paragraph | HANDOFF: body "unchanged" — treat as frame elision; verify against shipped body |
| Retired strings | `targetLabel`, `targetsAria`, `toDecklist` go; `declaration-surface.md` / `upgrade-path.md` swept in the same PR |

## State coverage
| Sheet | States |
|---|---|
| 3a | card list (tiles) · combo body (shipped, 96px pair) · stacked card present (receipt steps down) / absent |
| 3b | open (rule boxes + candidates) · stacked card present / absent · opener only on a `below` rung with a path; `above` rung ("already allowed") opens nothing. **Blocked: not drawn by the frames, but reachable** (a [3] deck whose commander is a game changer) and carried over as the shipped body, heading in the header (gap report, Resolution). **Satisfied: unreachable** from the rung, since every target sits below the reading's floor |
| 3c | open only; never stacks |
| CardModal | stacked with `backLabel` (desktop pill) · stacked without / phone (✕ unchanged) · unstacked (shipped ✕) |
