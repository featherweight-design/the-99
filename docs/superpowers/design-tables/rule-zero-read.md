# Design Property Table — Rule 0 read (T1–T10, D1–D10, L4/H3)

Source: `design/design_handoff_the99_rule_zero/` — `R1 - Read-Phone.dc.html` (T1–T10, 390), `R2 - Read-Desktop.dc.html`
(D1–D10, 1300), `R1 - Log-Phone.dc.html` (L4 only), `R2 - Log-Desktop.dc.html` (H3 only). All four boards share ONE
stylesheet (byte-identical `<style>` blocks); the frames are static markup, not JSX (the `x-dc` script is an empty
`renderVals`). Values below are the stylesheet's class rules plus each element's inline `style`, quoted as written.
No `:hover`, `:focus`, `transition`, `animation` or `@media` rule exists anywhere in the sheet: every hover/focus/
transition row is **—** (not drawn), and the phone/desktop split is two different markups, not a breakpoint.

Fonts as written: `'IBM Plex Sans'` (body), `'IBM Plex Mono'` (mono), `'Chakra Petch'` (display), `'Cinzel'` (bracket
numeral). Tokens as written on `:root`: `--bg #0E0F14`, `--surface #16181F`, `--surface-rail #12141B`,
`--surface-sunken #101219`, `--elevated #20222A`, `--border #181C26`, `--border-strong #262A35`, `--border-dashed
#343843`, `--fg #E6E8F0`, `--fg-body #B1B6C7`, `--fg-muted #959AAD`, `--fg-faint #6F7486`, `--fg-locked #606476`,
`--accent #FF4D9A`, `--success #6FA368`, `--warning #E0913C`, `--fact #8FA6BE`.

Flag ink is a scoped custom property set by a modifier class: `.hi{--flag:#E0913C}` (high), `.lo{--flag:#8FA6BE}` (low),
`.sp{--flag:#B9A0D6}` (split). Every flag rule below reads `var(--flag)`.

---

## Component: Page head

### Back link (phone `.back`; desktop `.dph .bk`)
| Property | Mobile | Desktop |
|----------|--------|---------|
| element | `<div class="back">` above `.pg`, outside the padded page column; a `<b>‹</b>` glyph then the word | `<div class="bk">` inside the head block, above the h1; `‹ Friends` as one text run |
| display | flex; align-items center; gap 4px | flex; align-items center; gap 6px |
| height | 44px | — |
| padding | 0 8px | — |
| margin | — | margin-bottom 6px |
| font | 14px 'IBM Plex Sans' | 13px 'IBM Plex Sans' |
| color | var(--fg-muted) | var(--fg-muted) |
| glyph `<b>` | font-weight 400; font-size 20px; line-height 1; margin-top -2px | — (no separate glyph element) |
| flex | none | — |

### Head container
| Property | Mobile | Desktop |
|----------|--------|---------|
| element | `.pgh` (first child of `.pg`) | `.dph` (full-width band above `.dbody`) |
| display | block; title row is `.pgh .row`: flex; align-items flex-start; justify-content space-between; gap 10px | flex; align-items flex-end; justify-content space-between; gap 20px |
| padding | — (inherits `.pg` padding 0 16px 22px) | 22px 34px 16px |
| border | — | border-bottom 1px solid var(--border) |
| children | `.row` [h1, Seats?] then `.meta` | `<div>` [`.bk`, h1, `.meta`] then Seats? as a sibling at the right |

### h1 "Rule 0 check"
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'Chakra Petch' | 'Chakra Petch' |
| font-weight | 700 | 700 |
| font-size | 24px | 30px |
| line-height | 1.2 | 1.2 |
| margin | 0 | 0 |
| color | inherits var(--fg) | inherits var(--fg) |

### Meta line
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono' | 'IBM Plex Mono' |
| font-size | 11.5px | 12px |
| line-height | 1.55 | — (not set) |
| color | var(--fg-faint) | var(--fg-faint) |
| margin-top | 6px | 6px |
| pod name `<b>` | color var(--fg-body); font-weight 500 | color var(--fg-body); font-weight 500 |
| structure | `<b>pod</b> · set by … · N seated` `<br>` `open until …` (two lines, forced break) | one line: `<b>pod</b> · set by … · N seated · open until …` |
| setter wording | "set by you" on T5/T10 | "set by you" on D5/D10 |

### "Seats" control (setter only)
| Property | Mobile | Desktop |
|----------|--------|---------|
| element | `<button class="btn gho sm">` inside `.pgh .row`, right of the h1 | `<button class="btn gho sm">` last child of `.dph` (bottom-aligned by flex-end) |
| display | inline-flex; align-items center; justify-content center; gap 8px | same |
| min-height | 36px | 36px |
| padding | 0 13px | 0 13px |
| border-radius | 8px | 8px |
| font | 600 13px 'IBM Plex Sans' (`.btn` 600 14.5px, `.sm` overrides size to 13px) | same |
| background | transparent | transparent |
| color | var(--fg) | var(--fg) |
| border | 1px solid var(--border-strong) | same |
| white-space | nowrap | nowrap |
| cursor | pointer | pointer |
| conditional | T5, T10 only (frames whose meta says "set by you") | D5, D10 only |

---

## Component: Page layout

### Page column / two-column body
| Property | Mobile | Desktop |
|----------|--------|---------|
| container | `.pg`: display flex; flex-direction column; gap 14px; padding 0 16px 22px | `.dbody`: display grid; grid-template-columns `minmax(0,1fr) 392px`; gap 28px; padding 22px 34px 28px; align-items start (markup also carries a `rows` class with no rule) |
| order | head → read card → seats → Log this game | left: seat rows (`.drows`); right: `.dside` = read card → Log this game |
| right column | — | `.dside`: display flex; flex-direction column; gap 14px; width 392px (from the grid track) |
| seat list | `.seats`: display flex; flex-direction column; gap 10px | `.drows`: display flex; flex-direction column; gap 10px |

---

## Component: Read card

### Card (`section.read`, aria-label "The read")
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | relative | relative |
| border-radius | 14px | 14px |
| border | 1px solid var(--border-strong) | same |
| background | var(--surface) | var(--surface) |
| padding | 14px 14px 12px | 14px 14px 12px |
| display | flex; flex-direction column; gap 12px | same |
| overflow | hidden | hidden |
| child order | kicker row → h2 → p → rail (if any) → counts key → honesty block | same |

### Kicker row (`.kk`)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex; align-items center; justify-content space-between | same |
| left: kicker `.k` ("The read") | 'IBM Plex Mono'; 10.5px; weight 500; letter-spacing .14em; text-transform uppercase; color var(--fg-faint) | same |
| right: updated `.upd` | 10.5px 'IBM Plex Mono'; color var(--fg-faint) | same |
| conditional | present T1–T10 (always "updated just now" in these frames) | present D1–D10 |

### Headline (`h2`)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font | 700 19px/1.3 'Chakra Petch' | same |
| margin | 0 | 0 |
| text-wrap | pretty | pretty |
| color | inherits var(--fg) | same |
| inked phrase, high `.hiw` | color #E0913C (literal) | same |
| inked phrase, low `.low` | color #8FA6BE (literal) | same |
| inked phrase, split `.spw` | color #B9A0D6 (literal) | same |
| inked phrase structure | `<span>` around the flag words inside the sentence (T2, T3, T5, T7); T4/T6 two-way headline has no inked span; T1, T8, T9, T10 none | same (D2, D3, D5, D7) |

### Body sentence (`p`)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 13.5px | 13.5px |
| line-height | 1.6 | 1.6 |
| color | var(--fg-body) | same |
| margin | 0 | 0 |
| text-wrap | pretty | pretty |
| `<b>` (bracket names) | color var(--fg); font-weight 600 | same |

### Rail (`.rail5`, role img, aria-label "Each seat placed on the five brackets")
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | relative | relative |
| display | grid; grid-template-columns repeat(5,1fr) | same |
| border-radius | 10px | 10px |
| background | var(--surface-sunken) | same |
| border | 1px solid var(--border) | same |
| padding | 10px 4px 6px | 10px 4px 6px |
| conditional | present T1–T9; ABSENT T10 | present D1–D9; ABSENT D10 |

### Rail column (`.col`)
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | relative; z-index 1 | same |
| display | flex; flex-direction column; align-items center; justify-content flex-end; gap 6px | same |
| min-height | 92px | 92px |
| order | Exhibition, Core, Upgraded, Optimized, cEDH | same |
| children | face stack `.fc` (always present, may be empty) then label `.lab` | same |

### Face stack (`.fc`)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex; flex-direction column-reverse; align-items center; gap 3px | same |
| margin-top | 16px | 16px |

### Rail face (`.face`)
| Property | Mobile | Desktop |
|----------|--------|---------|
| size | 30 × 30px | 30 × 30px |
| border-radius | 50% | 50% |
| border | 1.5px solid var(--bg) | same |
| box-shadow (default) | 0 0 0 1px rgba(255,255,255,.12) | same |
| box-shadow `.you` | 0 0 0 1.5px var(--accent) | same |
| box-shadow `.flag` (+ `.hi`/`.lo`/`.sp`) | 0 0 0 2px var(--flag) | same |
| you + flagged (T5/D5 `face you flag sp`) | `.face.flag` declared after `.face.you` → flag ring wins | same |
| background | var(--elevated) | same |
| fallback text | 600 10px 'IBM Plex Mono'; color var(--fg-muted) | same |
| overflow | hidden; display flex; align/justify center; position relative; flex none | same |
| img | 100% × 100%; object-fit cover; display block | same |

### Bracket label (`.lab`)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex; flex-direction column; align-items center; gap 1px | same |
| font | 9px 'IBM Plex Mono' | same |
| color | var(--fg-faint) | same |
| mark svg | width 22, height 22, viewBox 0 0 40 40, `style="color:<bracket ink>"` | same |
| name | `<span>` under the mark | same |

### Bracket marks (shared by rail labels and chips; viewBox 0 0 40 40, fill none, stroke currentColor)
| Bracket | Ink (color) | Paths | Numeral |
|---------|-------------|-------|---------|
| 1 Exhibition | #8A857C | `M20 8.5 L31.5 20 L20 31.5 L8.5 20 Z` stroke-width 1.8 | `<text x=20 y=20 text-anchor=middle dominant-baseline=central font-family=Cinzel,serif font-weight=700 font-size=17 fill=currentColor dy=0.5>` "1" |
| 2 Core | #A89A74 | `M20 3.5 L36.5 20 L20 36.5 L3.5 20 Z` stroke-width 1.8 | same, "2" |
| 3 Upgraded | #C9AC62 | inner diamond (as 1) sw 1.8 + ticks `M20 8.5 L20 3.2`, `M31.5 20 L36.8 20`, `M20 31.5 L20 36.8`, `M8.5 20 L3.2 20` sw 1.5 round caps | "3" |
| 4 Optimized | #E6D08A | inner diamond sw 1.8 + four pips `M20 1.2 L21.6 2.8 L20 4.4 L18.4 2.8 Z`, `M37.2 18.4 L38.8 20 L37.2 21.6 L35.6 20 Z`, `M20 35.6 L21.6 37.2 L20 38.8 L18.4 37.2 Z`, `M2.8 18.4 L4.4 20 L2.8 21.6 L1.2 20 Z` sw 1.4 | "4" |
| 5 cEDH | #FBEFC6 | inner diamond sw 1.8 + outer `M20 1.2 L38.8 20 L20 38.8 L1.2 20 Z` sw 1.4 | "5" |

### TABLE band (`.band`)
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | absolute; top 4px; bottom 4px; z-index 0 | same |
| left / width (inline) | `left:calc(40% + 6px);width:calc(20% - 4px)` — over the Upgraded column in every frame drawn | same |
| border-radius | 8px | 8px |
| background | rgba(255,77,154,.07) | same |
| border | 1px dashed rgba(255,77,154,.45) | same |
| label `<span>` "TABLE" | position absolute; top 5px; left 0; right 0; text-align center; font 500 8.5px 'IBM Plex Mono'; letter-spacing .14em; color var(--accent) | same |
| conditional | T1–T4, T6–T9; ABSENT T5 (split) and T10 (no rail) | D1–D4, D6–D9; absent D5, D10 |

### Range span (`.span`)
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | absolute; bottom 34px; z-index 0 | same |
| height | 30px | 30px |
| border-radius | 15px | 15px |
| border | 1px dashed var(--fg-faint) | same |
| background | — (none set) | — |
| left / width (inline) | Exhibition–Core: `left:calc(4% + 4px);width:calc(32% )` (T6, Peter); Optimized–cEDH: `left:calc(64% + 4px);width:calc(32% )` (T7, Colin) | same (D6, D7) |
| face placement | the seat's face sits in the column it is measured from (T6 Peter in Core; T7 Colin in Optimized) | same |
| conditional | T6, T7 only (one span each) | D6, D7 only |

### Counts key (`.rkey`, aria-label "What the counts on each seat are")
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex; flex-wrap wrap; gap 4px 12px | same |
| font | 10px 'IBM Plex Mono' | same |
| color | var(--fg-faint) on the container; each item `<span style="color:var(--fg-muted)">` overrides | same |
| item | `span`: display inline-flex; align-items center; gap 5px | same |
| item icon | svg width 12 height 12 viewBox 0 0 16 16 `style="color:var(--fact)"` | same |
| order | Game changers, Mass land denial, Extra turns, Two-card infinites, Tutors | same |
| conditional | present T1–T10 (including T10, which has no rail) | present D1–D10 (including D10) |

### Honesty block (`.honest`)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex; flex-direction column; gap 2px | same |
| padding-top | 10px | 10px |
| border-top | 1px solid var(--border) | same |
| font-size | 12.5px | 12.5px |
| line-height | 1.55 | 1.55 |
| color | var(--fg-muted) | same |
| children | detection sentence `<span>` then provenance opener `button.lnk` | same |
| conditional | every frame T1–T10 | every frame D1–D10 |

### Provenance opener (`.honest .lnk`, "How we make these decisions →")
| Property | Mobile | Desktop |
|----------|--------|---------|
| element | `<button class="lnk">` | same |
| font | 500 'IBM Plex Sans'; font-size 12.5px (override of `.lnk` 13.5px) | same |
| color | var(--accent) | same |
| text-decoration | underline; text-decoration-color rgba(255,77,154,.5); text-underline-offset 4px | same |
| background / border / padding | none / 0 / 0 | same |
| min-height | 36px (override of `.lnk` 44px) | same |
| display | inline-flex; align-items center; gap 6px; align-self flex-start | same |

---

## Component: Seat (phone `article.seat`; desktop `article.srw`)

### Seat container
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | relative | relative |
| border-radius | 12px | 12px |
| border | 1px solid var(--border-strong) | same |
| background | var(--surface-rail) | var(--surface-rail) |
| overflow | hidden | hidden |
| `.you` | border-color var(--accent); box-shadow 0 0 0 1px var(--accent) | same |
| `.flag` | border-color color-mix(in oklab,var(--flag) 70%,transparent); background unchanged | border-color color-mix(in oklab,var(--flag) 70%,transparent); background color-mix(in srgb,var(--flag) 7%,var(--surface-rail)) |
| `.you.flag` | border-color var(--accent) (accent wins; flag ink stays on tag, chips, face) | same; tint background still applies |
| aria-label | "<Name>’s seat" | same |
| inner structure | `.wash` → `.top` (art + who) → `.ln` chip row → [`.ln` sub/stale line] → `.ln` counts row → [`.why`] → [`.ln` Change deck]; a seat not in the read: `.top` → `.wait` | `.wash` → `.main` grid (art │ who incl. `.br` chip row │ `.rt` tag + counts) → [`.more` (why / wait)] → [`.ctl` Change deck] |

### Background art blur (`.wash`)
| Property | Mobile | Desktop |
|----------|--------|---------|
| container | position absolute; inset 0; overflow hidden; pointer-events none | same |
| img position | absolute; inset -30px; width calc(100% + 60px); height calc(100% + 60px); object-fit cover | same |
| filter | blur(30px) saturate(1.2) | blur(28px) saturate(1.25) |
| opacity | .22 | .26 |
| conditional | every seat with a deck; ABSENT on the waiting seat (T10 Max) | ABSENT on D10 Max |

### Top block / main grid
| Property | Mobile | Desktop |
|----------|--------|---------|
| element | `.top` | `.main` |
| position | relative | relative |
| display | flex; gap 12px | grid; grid-template-columns `132px minmax(0,1fr) auto`; align-items center; gap 18px |
| padding | 12px 12px 10px | 12px 16px 12px 12px |
| padding, flagged | unchanged | `.srw.flag .main`: padding-top 16px; padding-bottom 14px |

### Commander art (`.art`)
| Property | Mobile | Desktop |
|----------|--------|---------|
| size | 84 × 60px | 132 × 92px |
| border-radius | 9px | 10px |
| overflow | hidden; flex none | hidden |
| box-shadow | 0 8px 18px rgba(0,0,0,.45) | 0 10px 22px rgba(0,0,0,.5) |
| border | 1px solid rgba(255,255,255,.08) | same |
| background | var(--surface-sunken) | same |
| img | 100% × 100%; object-fit cover; display block | same |
| initials variant `.art.ini` (waiting seat) | flex center; font 700 22px 'Chakra Petch'; color var(--fg-muted); background radial-gradient(120px 80px at 50% 40%,#262A35,var(--surface)); text e.g. "MA" | same but font-size 26px |

### Who column (`.who`)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex; flex-direction column; gap 3px; flex 1; min-width 0 | flex; flex-direction column; gap 4px; min-width 0 |
| children | `.nm`, `.dkn`, `.cm` | `.nm`, `.dkn`, `.cm`, `.br` (chip row) |

### Name line (`.nm`) and tags
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex; align-items baseline; gap 7px; min-width 0 | flex; align-items baseline; gap 8px |
| font | 600 15px 'IBM Plex Sans' | 600 16px 'IBM Plex Sans' |
| YOU tag `.yt` | 500 9.5px 'IBM Plex Mono'; letter-spacing .12em; color var(--accent) | same |
| owner / not a friend `<small>` | 10px 'IBM Plex Mono'; font-weight 400; color var(--fg-muted); white-space nowrap | 10px 'IBM Plex Mono'; font-weight 400; color var(--fg-muted) (no nowrap) |
| which tag where | You → `.yt` "YOU"; Colin → `<small>` "owner"; Max → `<small>` "not a friend"; Peter → none | same |

### Deck name (`.dkn`)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 13.5px | 14px |
| color | var(--fg-body); waiting seat inline `color:var(--fg-muted)` | same |
| overflow | white-space nowrap; overflow hidden; text-overflow ellipsis | same |

### Commander line (`.cm`)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font | 10.5px 'IBM Plex Mono' | same |
| color | var(--fg-faint) | same |
| overflow | nowrap; hidden; ellipsis | same |

### Phone row (`.seat .ln`) / desktop chip row (`.srw .br`)
| Property | Mobile | Desktop |
|----------|--------|---------|
| element | `.ln` | `.br` (inside `.who`) |
| position | relative | — |
| display | flex; align-items center; justify-content space-between; gap 8px | flex; align-items center; flex-wrap wrap; gap 4px 10px |
| padding / margin | padding 0 12px 12px | margin-top 4px |
| content | chip (left) + flag tag (right, via space-between) | chip, then sub line or stale mark inline; flag tag is NOT here (it is in `.rt`) |

### Bracket chip (`.chip`)
| Property | Mobile | Desktop |
|----------|--------|---------|
| class | `chip` | `chip lg` |
| display | inline-flex; align-items center; gap 5px | same |
| height | 22px | 24px |
| padding | 0 8px 0 2px | same |
| border-radius | 6px | 6px |
| border | 1px solid; border-color inline `color-mix(in oklab,<ink> 55%,transparent)` | same |
| background (inline) | `color-mix(in srgb,<ink> 12%,#0E0F14)` | same |
| mark svg | width 22 height 22 viewBox 0 0 40 40, `color:<ink>`; display block | same (svg stays 22) |
| name `.f` | 10px 'IBM Plex Mono'; inline `color:<ink>` | 11px 'IBM Plex Mono'; inline `color:<ink>` |
| white-space / flex | nowrap / none | same |
| range chip | two mark svgs side by side (lower then upper), `.f` reads "A or B"; background, border and `.f` color take the LOWER bracket's ink (T6 Peter #8A857C; T7 Colin #E6D08A) | same (D6, D7) |
| answered range | one mark, the answer's ink (T6 Colin Optimized) | same |
| conditional | every seat with a reading (incl. stale T8 Colin); ABSENT on short (T8/T10 Peter), over (T8 Max), reading (T9 Peter), waiting (T10 Max) | same on D8/D9/D10 |

### Range / declaration sub line
| Property | Mobile | Desktop |
|----------|--------|---------|
| element | its own row: `<div class="ln" style="margin-top:-4px;justify-content:flex-start;flex-wrap:wrap;gap:4px 10px">` containing `<span class="mono" style="font-size:10.5px;color:var(--fg-faint)">` | `<span class="sub">` inside `.br`, after the chip |
| font | 'IBM Plex Mono' 10.5px | 10px 'IBM Plex Mono' |
| color | var(--fg-faint) | var(--fg-faint) |
| conditional | T6 Colin (declared, answered), T6 Peter (not declared), T7 Colin (drifted) | D6 Colin, D6 Peter, D7 Colin |

### Stale mark (`.stale`)
| Property | Mobile | Desktop |
|----------|--------|---------|
| placement | its own `.ln` row with the same inline style as the sub line, between chip row and counts | inside `.br`, after the chip |
| display | inline-flex; align-items center; gap 5px | same |
| font | 10.5px 'IBM Plex Mono' | same |
| color | var(--warning) | same |
| dot `<i>` | 6 × 6px; border-radius 50%; background var(--warning); display block | same |
| conditional | T8 Colin only (chip and counts kept) | D8 Colin only |

### Flag tag (`.flagtag`)
| Property | Mobile | Desktop |
|----------|--------|---------|
| placement | right end of the chip row `.ln` | top of `.rt` (right column), above the counts |
| display | inline-flex; align-items center; gap 5px | same |
| height | 22px | 22px |
| padding | 0 8px | 0 8px |
| border-radius | 6px | 6px |
| font | 600 10.5px 'IBM Plex Mono'; letter-spacing .04em | same |
| color | #0E0F14 | same |
| background | var(--flag) | same |
| white-space | nowrap | nowrap |
| icon svg | width 10px height 10px (CSS), viewBox 0 0 10 10, path fill currentColor | same |
| icon path, high (▲) | `M5 1.5 9 8.5H1z` | same |
| icon path, low (▼) | `M5 8.5 1 1.5h8z` | same |
| icon path, split (◀▶) | `M1 5l3-3v6zM9 5 6 2v6z` | same |
| words | Above the table / Below the table / Split | same |
| conditional | T2 Colin (hi); T3 Peter (lo); T4 Colin (hi) + Peter (lo); T5 You + Colin (sp); T6 Colin (hi) + Peter (lo); T7 Colin (hi) | D2–D7 identically |

### Right column (desktop only, `.srw .rt`)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — (no equivalent; counts are their own `.ln` row) | flex; flex-direction column; align-items flex-end; gap 8px |
| conditional | — | present on every read or stale seat; ABSENT on short/over/reading/waiting seats (grid's third column empty) |

### Five count chips (`.facts` / `.fx`)
| Property | Mobile | Desktop |
|----------|--------|---------|
| placement | own `.ln` row (left-aligned) | inside `.rt`, under the flag tag |
| `.facts` | display flex; align-items center; gap 4px; flex-wrap nowrap | same |
| `.fx` display | inline-flex; align-items center; gap 4px | same |
| `.fx` height | 26px | 26px |
| `.fx` padding | 0 7px | 0 7px |
| `.fx` border-radius | 7px | 7px |
| `.fx` background | var(--surface-sunken) | same |
| `.fx` border | 1px solid var(--border) | same |
| `.fx` color | var(--fact) | same |
| `.fx` font | 600 12px 'IBM Plex Mono' | same |
| `.fx` icon | svg width/height 13px, viewBox 0 0 16 16, `style="color:currentColor"` | same |
| zero `.fx.z` | color var(--fg-locked); font-weight 400; background transparent (border kept: 1px solid var(--border)) | same |
| lifted `.fx.drv` | border-color color-mix(in oklab,var(--flag) 60%,transparent); color var(--fg); background color-mix(in srgb,var(--flag) 12%,var(--surface-sunken)); svg color var(--flag) | same |
| order | Game changers, Mass land denial, Extra turns, Two-card infinites, Tutors | same |
| aria-label | "<Name>: <n>" e.g. "Tutors: 5" | same |
| lifted where | Colin's Two-card infinites + Tutors on T2, T4, T5, T6, T7; no `.drv` on any low seat (T3, T4 Peter, T6 Peter) nor on the split You seat (T5) | D2, D4, D5, D6, D7 identically |
| conditional | every seat with a reading (incl. stale T8 Colin); absent on short/over/reading/waiting | same |

### Count icons (viewBox 0 0 16 16, currentColor)
| Count | Paths |
|-------|-------|
| Game changers | `M9.4 1.5 L4.1 8.8 H7.3 L6.6 14.5 L11.9 7.0 H8.7 Z` fill |
| Mass land denial | `M1.4 13.4 L6.2 5.2 L9.4 10.6 L11.2 7.8 L14.6 13.4 Z` fill; `M4.4 2.6 L5.6 2.6 M8.0 1.6 L8.0 3.0 M11.0 2.8 L12.2 2.2` stroke 1.5 round, opacity 0.6 |
| Extra turns | `M10.98 3.74 A 5.2 5.2 0 1 1 6.65 2.98` fill none stroke 2 round; `M9.0 2.4 L7.1 4.6 L6.2 1.3 Z` fill |
| Two-card infinites | `M5.2 4.9 A 3.1 3.1 0 1 0 5.2 11.1 C 8.3 11.1 7.7 4.9 10.8 4.9 A 3.1 3.1 0 1 1 10.8 11.1 C 7.7 11.1 8.3 4.9 5.2 4.9 Z` fill none stroke 1.8 round |
| Tutors | `M1.8 12.2 H14.2 V14.4 H1.8 Z` fill; `M8 1.3 L11.7 5.7 H9.2 V10.3 H6.8 V5.7 H4.3 Z` fill |

### Desktop "more" strip (`.srw .more`)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — (phone boxes sit directly in the seat) | position relative; flex; flex-direction column; gap 10px |
| padding | — | 0 16px 14px 162px (aligns under the who column: 12 + 132 + 18) |
| children | — | `.why` (flagged with reason) or `.wait` (not in the read) |
| boxes inside | — | `.srw .sug, .srw .wait { margin:0 }` |

### "What puts it here" box (`.why`)
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | relative | — |
| margin | 0 12px 12px | — (inside `.more`) |
| padding | 10px 12px | 10px 12px |
| border-radius | 9px | 9px |
| background | color-mix(in srgb,var(--flag) 9%,var(--surface-sunken)) | color-mix(in srgb,var(--flag) 10%,var(--surface-sunken)) |
| border | 1px solid color-mix(in oklab,var(--flag) 35%,transparent) | same |
| font-size | 13px | 13px |
| line-height | 1.55 | 1.55 |
| color | var(--fg-body) | same |
| lead-in `<b>` | color var(--fg); font-weight 600; text "What puts it here:" then the sentence | same |
| conditional | T2 Colin; T3 Peter; T4 Colin + Peter; T5 Colin only (NOT the split You seat); T6 Colin + Peter; T7 Colin | D2–D7 identically |

### Wait box (`.wait`) — short / over / reading / waiting
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | relative | relative |
| margin | 0 12px 12px | 0 (inside `.more`) |
| padding | 10px 12px | 10px 12px |
| border-radius | 9px | 9px |
| border | 1.5px dashed var(--border-dashed) | same |
| font-size | 13px | 13px |
| line-height | 1.55 | 1.55 |
| color | var(--fg-muted) | same |
| lead `<b>` | color var(--fg-body); font-weight 600 | same |
| short (T8/T10 Peter, D8/D10) | `<b>87 of 100 cards.</b>` + sentence + `.bar` | same |
| over (T8 Max, D8) | `<b>101 cards, over 100.</b>` + sentence; no bar | same |
| reading (T9 Peter, D9) | inline `style="display:flex;align-items:center;gap:10px"`; `.spin` then `<span>` [`<b>Reading this deck.</b>` + sentence] | same |
| waiting (T10 Max, D10) | sentence only, no `<b>`, no bar | same |

### Short progress bar (`.bar`)
| Property | Mobile | Desktop |
|----------|--------|---------|
| height | 4px | 4px |
| border-radius | 2px | 2px |
| background | var(--elevated) | same |
| overflow | hidden | hidden |
| margin-top | 8px | 8px |
| fill `<i>` | display block; height 100%; background var(--warning); inline `width:87%` | same |
| `.bar.ok` variant | fill var(--success) (defined; not used in these frames) | same |

### Spinner (`.spin`)
| Property | Mobile | Desktop |
|----------|--------|---------|
| size | 14 × 14px | 14 × 14px |
| border-radius | 50% | 50% |
| border | 2px solid var(--border-strong); border-top-color var(--accent) | same |
| display | inline-block; flex none | same |
| animation | — (none in the sheet; drawn static) | — |

### Change deck control
| Property | Mobile | Desktop |
|----------|--------|---------|
| row | `<div class="ln" style="padding-top:0;margin-top:-6px">` with an empty `<span>` first, so space-between pushes the button right | `.ctl`: position relative; flex; justify-content flex-end; align-items center; gap 10px; padding 0 16px 8px 162px; margin-top -8px |
| button | `<button class="lnk" style="min-height:36px;font-size:13px">` | same |
| font | 500 13px 'IBM Plex Sans' | same |
| color | var(--accent) | same |
| decoration | underline; color rgba(255,77,154,.5); offset 4px | same |
| background / border / padding | none / 0 / 0 | same |
| display | inline-flex; align-items center; gap 6px | same |
| placement | last child of the viewer's seat (after counts; on a flagged own seat it would follow the why — T5's own seat has none) | after `.main` (and after `.more` if present) |
| conditional | the viewer's own seat only, every frame T1–T10 | the viewer's own seat only, D1–D10 |

### Changed mark (`.chg`) — defined in the sheet, not drawn on T/D frames
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | inline-flex; align-items center; gap 6px; 10.5px 'IBM Plex Mono'; color var(--accent) | same |
| dot `<i>` | 7 × 7px; radius 50%; background var(--accent) | same |
| conditional | not present in any T frame (Swap boards S2/S5 own it) | not present in any D frame |

---

## Component: Log this game

### Button (`.btn.gho.full`)
| Property | Mobile | Desktop |
|----------|--------|---------|
| placement | last child of `.pg`, after `.seats` | last child of `.dside`, after the read card |
| display | inline-flex; align-items center; justify-content center; gap 8px | same |
| width | 100% | 100% (of the 392px column) |
| min-height | 44px | 44px |
| padding | 0 18px | 0 18px |
| border-radius | 10px | 10px |
| font | 600 14.5px 'IBM Plex Sans' | same |
| background | transparent | transparent |
| color | var(--fg) | var(--fg) |
| border | 1px solid var(--border-strong) | same |
| white-space / cursor | nowrap / pointer | same |
| conditional | every T1–T10 (including T10) | every D1–D10 |

---

## Component: Expired page (L4 phone, H3 desktop)

### Container (`.closed`)
| Property | Mobile | Desktop |
|----------|--------|---------|
| placement | inside the page body after the `.back` link (`‹ Friends` row kept) | directly in `.dmain`; no page head, no back link |
| margin | auto (centers in the flex column) | auto |
| max-width | 440px | 440px |
| display | flex; flex-direction column; align-items center | same |
| text-align | center | center |
| gap | 12px | 12px |
| padding | 30px 20px | 30px 20px |
| order | oval of faces → h2 → p → Back to Friends | same |

### Oval of faces (`.ttable`)
| Property | Mobile | Desktop |
|----------|--------|---------|
| box | position relative; width 200px; height 120px; margin-bottom 8px | same |
| oval `.tb` | position absolute; left 30px; top 30px; 140 × 62px; border-radius 31px; border 1.5px dashed var(--border-dashed) | same |
| face `.ttable .face` | position absolute; 34 × 34px; opacity .55; filter grayscale(.6); base `.face` rules (radius 50%, border 1.5px solid var(--bg), ring 0 0 0 1px rgba(255,255,255,.12)) | same |
| face positions (inline) | `left:83px;top:0px`, `left:166px;top:44px`, `left:83px;top:88px`, `left:0px;top:44px` (four seats) | same |

### Title (`.closed h2`)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font | 700 22px 'Chakra Petch' | same |
| margin | 0 | 0 |

### Body (`.closed p`)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 14.5px | 14.5px |
| line-height | 1.6 | 1.6 |
| color | var(--fg-muted) | same |
| margin | 0 | 0 |
| text-wrap | pretty | pretty |

### Back to Friends (`.btn.gho`)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | inline-flex; align/justify center; gap 8px | same |
| width | auto (no `.full`) | auto |
| min-height | 44px | 44px |
| padding | 0 18px | 0 18px |
| border-radius | 10px | 10px |
| font | 600 14.5px 'IBM Plex Sans' | same |
| background / color / border | transparent / var(--fg) / 1px solid var(--border-strong) | same |

---

## State Coverage

Fixture: you, Colin (owner), Peter, Max (not your friend). "Middle" = the TABLE band, always Upgraded where drawn.

| Frame | State | Triggering condition | What renders |
|-------|-------|----------------------|--------------|
| T1 / D1 | Balanced | Every read seat within a bracket of the middle | Plain headline (no ink); band on Upgraded; all four faces in Upgraded, yours accent-ringed; no flag tags, no why boxes; own seat has Change deck; Log button |
| T2 / D2 | One outlier, high | One seat (Colin) a bracket above the middle | Headline names the deck with `.hiw` amber phrase; band; Colin's face in Optimized with hi ring; Colin seat `.flag.hi`: Above tag, Two-card infinites + Tutors lifted, why box; desktop row tinted and taller |
| T3 / D3 | One outlier, low | One seat (Peter) a bracket below the middle | Headline `.low` steel-blue phrase; band; Peter's face in Core lo ring; Peter `.flag.lo`: Below tag, NO lifted counts, why box (says counts can miss cards) |
| T4 / D4 | Two outliers (2,3,3,4) | One seat above and one below the middle | Two-way headline, no inked span; band; Colin hi in Optimized, Peter lo in Core; both seats flagged in their own ink, each with tag and why; Colin's two counts lifted |
| T5 / D5 | Two-seat split | Only two seats, a bracket apart | Setter frame: Seats button, meta "set by you · 2 seated"; headline `.spw` violet "split"; rail with NO band; your face `you flag sp`, Colin's `flag sp`; both seats `.flag.sp` with Split tag; your seat (accent border wins) has no why, Colin's has why + lifted counts; Change deck on yours |
| T6 / D6 | Range seats, declared and not | Colin's range answered by his declaration; Peter's range undeclared | Two-way headline; band; dashed span over Exhibition–Core with Peter's face at Core (lo); Colin hi in Optimized; Colin: single Optimized chip + sub line (declared · reads range) + Above tag + why; Peter: two-mark range chip + sub line (not declared · measured from) + Below tag + why |
| T7 / D7 | Drifted declaration | Colin's retained declaration falls outside his new range reading | Headline `.hiw`; band; span over Optimized–cEDH with Colin's face at Optimized (hi); Colin: two-mark range chip (not the declared bracket), sub line "declared …, outside this reading · measured from …", Above tag, why |
| T8 / D8 | Seats not ready | Peter short of 100; Max over 100; Colin's reading predates an edit | Headline says two seats are out; band; faces for you and Colin only; Colin keeps chip + counts with warning stale mark; Peter: no chip/counts, wait box with "87 of 100" lead and 87% warning bar; Max: no chip/counts, wait box "101 cards, over 100" (no bar) |
| T9 / D9 | Legal, never read | Peter's deck is at 100 with no reading yet | Headline "Reading …"; band; three faces in Upgraded (Peter absent); Peter: no chip/counts, flex wait box with spinner + bold lead |
| T10 / D10 | Not enough to compare | Fewer than two read seats (you read; Peter short; Max hasn't picked) | Setter frame (Seats, "set by you · 3 seated"); headline "Nothing to compare yet."; NO rail, NO band; counts key and honesty block still present; Peter short wait box + bar; Max: initials art (`.art.ini` "MA"), no wash, muted deck line "Picking their deck", commander line, wait box sentence only; Log button still present |
| L4 | Expired (phone) | The table's link opened after it closed (24h) | `‹ Friends` back row, then centered `.closed`: dashed oval with four greyed faces, h2, p, `Back to Friends` ghost button; no head, no read, no seats, no Log button |
| H3 | Expired (desktop) | Same | `.closed` centered in the main area with no page head or back link; same oval, title, body and button |
