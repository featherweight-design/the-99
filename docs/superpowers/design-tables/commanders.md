# Design Property Table — Commanders

> Source: `design/design_handoff_the99_commanders/The 99 - Commanders.dc.html` + README.md  
> Breakpoint: 768 px (mobile = phone frame at 392 px outer / 368 px inner; desktop = 1300 px frame)  
> All hex values are exact from the mockup; token names come from Brand README.

---

## Component: App Shell — Desktop Rail

### Rail container
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | flex |
| flex-direction | — | column |
| width | — | 236px |
| background | — | #1A160F |
| border-right | — | 1px solid #3A3229 |

### Rail — Wordmark block
| Property | Mobile | Desktop |
|----------|--------|---------|
| padding | — | 22px 20px 20px |
| border-bottom | — | 1px solid #2A241D |
| display (inner row) | — | flex |
| align-items | — | flex-end |
| gap | — | 7px |

### Rail — "THE" label
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | IBM Plex Mono, monospace |
| font-size | — | 10px |
| letter-spacing | — | 0.42em |
| color | — | #C9A24B |
| padding-bottom | — | 5px |

### Rail — Diamond crown (3 diamonds)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | flex |
| gap | — | 4px |
| Diamond 1 & 3: width | — | 6px |
| Diamond 1 & 3: height | — | 6px |
| Diamond 2 (center): width | — | 8px |
| Diamond 2 (center): height | — | 8px |
| background (all) | — | #C9A24B |
| transform (all) | — | rotate(45deg) |

### Rail — "99" numeral
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | Cinzel, serif |
| font-weight | — | 800 |
| font-size | — | 30px |
| line-height | — | 0.8 |
| color | — | #EDE6D8 |

### Rail — Nav section label ("Play")
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | IBM Plex Mono, monospace |
| font-size | — | 10px |
| letter-spacing | — | 0.18em |
| text-transform | — | uppercase |
| color | — | #8E8269 |
| padding | — | 6px 12px 8px |

### Rail — Nav item (inactive)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | flex |
| align-items | — | center |
| gap | — | 11px |
| padding | — | 10px 12px |
| border-radius | — | 8px |
| color | — | #A89B84 |
| font-size | — | 14px |
| font-weight | — | 500 |
| Diamond pip: width | — | 6px |
| Diamond pip: height | — | 6px |
| Diamond pip: background (inactive) | — | #3A3229 |
| Diamond pip: transform | — | rotate(45deg) |

### Rail — Nav item (active / Commanders)
| Property | Mobile | Desktop |
|----------|--------|---------|
| background | — | #2A241D |
| color | — | #EDE6D8 |
| font-weight | — | 600 |
| Diamond pip: background (active) | — | #C9A24B |

### Rail — Account trigger
| Property | Mobile | Desktop |
|----------|--------|---------|
| margin-top | — | auto |
| padding | — | 14px 12px |
| Container background | — | #221D16 |
| Container border | — | 1px solid #3A3229 |
| Container border-radius | — | 14px |
| Container padding | — | 2px 12px 2px 2px |
| Avatar width | — | 38px |
| Avatar height | — | 38px |
| Avatar border-radius | — | 12px |
| Avatar background | — | #14110E |
| Avatar border | — | 1px solid #C9A24B |
| Avatar font-family | — | IBM Plex Mono, monospace |
| Avatar font-size | — | 13px |
| Avatar color | — | #C9A24B |
| Name font-size | — | 13px |
| Name color | — | #EDE6D8 |
| Name font-weight | — | 600 |
| Role font-family | — | IBM Plex Mono, monospace |
| Role font-size | — | 10px |
| Role color | — | #8E8269 |

---

## Component: App Shell — Mobile Bottom Tabs

### Tab bar container
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | — |
| border-top | 1px solid #3A3229 | — |
| background | #1A160F | — |
| padding | 10px 6px 22px | — |

### Tab item (inactive)
| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | 1 | — |
| display | flex | — |
| flex-direction | column | — |
| align-items | center | — |
| gap | 5px | — |
| Diamond pip: width | 8px | — |
| Diamond pip: height | 8px | — |
| Diamond pip: background | #4A4033 | — |
| Diamond pip: transform | rotate(45deg) | — |
| Label font-size | 10px | — |
| Label color | #8E8269 | — |

### Tab item (active / Commanders)
| Property | Mobile | Desktop |
|----------|--------|---------|
| Diamond pip: background | #C9A24B | — |
| Label color | #C9A24B | — |
| Label font-weight | 600 | — |

---

## Component: Page Header — /commanders list

### Mobile page header
| Property | Mobile | Desktop |
|----------|--------|---------|
| padding | 20px 18px 12px | 28px 34px 0 |
| border-bottom | 1px solid #2A241D | — |
| display (inner row) | flex | flex |
| align-items | center | flex-end |
| justify-content | space-between | space-between |
| margin-bottom | 12px | — |

### Page title "Commanders"
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | Cinzel, serif | Cinzel, serif |
| font-weight | 700 | 700 |
| font-size | 22px | 30px |
| margin | 0 | 0 |
| color | #EDE6D8 | #EDE6D8 |

### Page subtitle / card count
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | IBM Plex Mono, monospace | IBM Plex Mono, monospace |
| font-size | 11px | 12px |
| color | #8E8269 | #8E8269 |
| margin-top | 2px | 4px |

### Mobile — account avatar trigger (header)
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 34px | — |
| height | 34px | — |
| border-radius | 10px | — |
| background | #221D16 | — |
| border | 1px solid #C9A24B | — |
| font-family | IBM Plex Mono, monospace | — |
| font-size | 11px | — |
| color | #C9A24B | — |

---

## Component: Color-Identity Filter

### Filter container (desktop — sticky bar)
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | — | sticky |
| top | — | 0 |
| background | — | #14110E |
| padding | — | 18px 34px 14px |
| border-bottom | — | 1px solid #2A241D |
| z-index | — | 2 |

### Filter pip row wrapper
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center |
| gap | 8px | 8px |
| background | #181410 | #181410 |
| border | 1px solid #3A3229 | 1px solid #3A3229 |
| border-radius | 8px | 8px |
| padding | 8px 11px | 8px 12px |

### Filter label ("COLORS" / "COLOR IDENTITY")
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | IBM Plex Mono, monospace | IBM Plex Mono, monospace |
| font-size | 10px | 10px |
| letter-spacing | 0.1em | 0.12em |
| color | #8E8269 | #8E8269 |

### Color pip (inactive)
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 14px | 16px |
| height | 14px | 16px |
| border-radius | 999px | 999px |
| opacity | 0.35 | 0.35 |
| cursor | — | pointer |
| W hex | #E8E4D6 | #E8E4D6 |
| U hex | #4A7FB5 | #4A7FB5 |
| B hex | #5B5566 | #5B5566 |
| R hex | #C05A48 | #C05A48 |
| G hex | #6B9E63 | #6B9E63 |

### Color pip (selected / active)
| Property | Mobile | Desktop |
|----------|--------|---------|
| opacity | 1 (full) | 1 (full) |
| box-shadow | 0 0 0 2px #C9A24B | 0 0 0 2px #C9A24B |

### Active-filter chip (desktop)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | inline-flex |
| align-items | — | center |
| gap | — | 7px |
| font-size | — | 12.5px |
| color | — | #EDE6D8 |
| background | — | #2A241D |
| border | — | 1px solid #3A3229 |
| border-radius | — | 999px |
| padding | — | 5px 8px 5px 11px |

### Active-filter chip color dot
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | — | 9px |
| height | — | 9px |
| border-radius | — | 999px |

### Active-filter chip dismiss "✕"
| Property | Mobile | Desktop |
|----------|--------|---------|
| color | #8E8269 | #8E8269 |
| cursor | — | pointer |

### Active-filter chip (mobile)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | inline-flex | — |
| align-items | center | — |
| gap | 6px | — |
| font-size | 12px | — |
| color | #EDE6D8 | — |
| background | #2A241D | — |
| border | 1px solid #3A3229 | — |
| border-radius | 999px | — |
| padding | 4px 8px 4px 10px | — |

### Filter clear link
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 11.5px | 12px |
| color | #C9A24B | #C9A24B |

### Showing count / order label
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | IBM Plex Mono, monospace | IBM Plex Mono, monospace |
| font-size | 10.5px | 11px |
| color | #8E8269 | #8E8269 |
| margin-left | auto | auto |

### "Includes ▾" dropdown button (desktop only)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | IBM Plex Sans, sans-serif |
| font-size | — | 13px |
| font-weight | — | 500 |
| color | — | #8E8269 |
| background | — | #181410 |
| border | — | 1px solid #3A3229 |
| border-radius | — | 8px |
| padding | — | 9px 14px |

### "Order: Fit ↓ · fixed" label (desktop only)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | IBM Plex Mono, monospace |
| font-size | — | 11px |
| color | — | #8E8269 |
| margin-left | — | auto |

---

## Component: Recommendation Card (List)

### Card container — desktop
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | grid |
| grid-template-columns | — | 40px 100px 1fr 236px |
| gap | — | 20px |
| align-items | — | stretch |
| padding | — | 24px 26px (v2: 18→24, browse loosening) |
| border-radius | — | 12px |
| background | — | #1E1A15 |
| border | — | 1px solid #2A241D |

#### Hover state (desktop card)
| Property | Mobile | Desktop |
|----------|--------|---------|
| border-color | — | #3A3229 |
| background | — | #211C15 |

### Card container — mobile
| Property | Mobile | Desktop |
|----------|--------|---------|
| border-radius | 11px | — |
| background | #1E1A15 | — |
| border | 1px solid #2A241D | — |
| padding | 12px 13px | — |
| display | flex | — |
| flex-direction | column | — |
| gap | 9px | — |

### Rank column (desktop)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | flex |
| flex-direction | — | column |
| align-items | — | center |
| justify-content | — | center |
| gap | — | 7px |

### Rank numeral
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | Cinzel, serif | Cinzel, serif |
| font-weight | 800 | 800 |
| font-size | 17px | 26px |
| color | #8E8269 | #8E8269 |
| line-height | — | 1 |
| width (mobile) | 16px | — |
| text-align (mobile) | center | — |

### Rank diamond pip (below numeral, desktop only)
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | — | 6px |
| height | — | 6px |
| background | — | #3A3229 |
| transform | — | rotate(45deg) |

### Commander art thumbnail
| Property | Mobile | Desktop |
|----------|--------|---------|
| aspect-ratio | — | 63/88 |
| width (mobile) | 36px | — |
| height (mobile) | 50px | — |
| border-radius | 6px | 8px |
| background | identity gradient | identity gradient |
| box-shadow | inset 0 0 0 1px rgba(0,0,0,0.35) | inset 0 -30px 34px -26px rgba(0,0,0,0.65), inset 0 0 0 1px rgba(0,0,0,0.28) |
| flex | none | — |
| position | — | relative |

### Art gradient formula
| Identity count | Gradient |
|---|---|
| 0 colors (colorless) | `linear-gradient(150deg, #b3a488, #726755 58%, #453e31)` |
| 1 color | `linear-gradient(150deg, <light>, <mid> 58%, <dark>)` |
| 2+ colors | `linear-gradient(130deg, <id0-mid>, <id0-light> 34%, <id1-light> 55%, <idN-mid> 82%, <idN-dark>)` |

### Identity color stops (art gradients)
| Identity | Light | Mid | Dark |
|---|---|---|---|
| W | #efe9d8 | #cbbf9c | #9d8f6b |
| U | #6a9bcb | #305c88 | #1c3a57 |
| B | #5a5464 | #2c2833 | #17151d |
| R | #cf7157 | #8c3627 | #571f16 |
| G | #84b277 | #406f3b | #264823 |
| C | #b3a488 | #726755 | #453e31 |

### WUBRG identity pips (on art, bottom-left)
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | — | absolute |
| left | — | 6px |
| right | — | 6px |
| bottom | — | 6px |
| display | — | flex |
| gap | — | 3px |
| Pip width | — | 11px |
| Pip height | — | 11px |
| Pip border-radius | — | 999px |
| Pip box-shadow | — | inset 0 0 0 1px rgba(0,0,0,0.4) |

### Evidence column (desktop)
| Property | Mobile | Desktop |
|----------|--------|---------|
| min-width | — | 0 |
| display | — | flex |
| flex-direction | — | column |
| gap | — | 13px (v2: 9 + 4, browse loosening) |

> **v2 density delta (Surfaces v2 §Commanders).** The mock states "rec cards
> padding 18→24, evidence row-gap +4". The "before" matches shipped desktop
> code, so the absolute target is authoritative for padding. Mobile stays at v1
> (`12px 13px`, `gap 9px`): the loosening is browse comfort, which desktop
> dominates. The list gap between cards, the fit bar, the receipts and the sort
> order are all unchanged — the mock's line ends "Fit bar, receipts, order
> unchanged."

### Commander name (list card)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | Cinzel, serif | Cinzel, serif |
| font-weight | 600 | 600 |
| font-size | 14.5px | 20px |
| color | #EDE6D8 | #EDE6D8 |
| line-height | — | 1.1 |
| white-space (mobile) | nowrap | — |
| overflow (mobile) | hidden | — |
| text-overflow (mobile) | ellipsis | — |

### Commander type / pool line
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 11px | 12.5px |
| color | #A89B84 | #A89B84 |
| margin-top | — | 2px |

---

## Component: Role Chips (on list card)

### Role chip row wrapper
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| flex-wrap | wrap | wrap |
| gap | 5px | 6px |

### Role chip (normal — met)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | inline-flex |
| align-items | — | center |
| gap | — | 6px |
| font-family | IBM Plex Mono, monospace | IBM Plex Mono, monospace |
| font-size | 10px | 11px |
| background | #2A241D | #2A241D |
| border | 1px solid #3A3229 | 1px solid #3A3229 |
| border-radius | 999px | 999px |
| padding | 3px 8px | 4px 10px |

### Role chip label (key)
| Property | Mobile | Desktop |
|----------|--------|---------|
| text-transform | uppercase | uppercase |
| letter-spacing | — | 0.05em |
| color | #8E8269 | #8E8269 |

### Role chip count (met)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-weight | 600 | 600 |
| color | #EDE6D8 | #EDE6D8 |

### Role chip (gap — below baseline)
| Property | Mobile | Desktop |
|----------|--------|---------|
| border | 1px solid #4A3A24 | 1px solid #4A3A24 |
| Count color | #E0913C | #E0913C |
| " gap" suffix color | #E0913C | #E0913C |

---

## Component: Synergy Line (list card, desktop)

### Synergy row
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | flex |
| align-items | — | center |
| gap | — | 10px |

### "Synergy" label
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | IBM Plex Mono, monospace |
| font-size | — | 10px |
| letter-spacing | — | 0.12em |
| text-transform | — | uppercase |
| color | — | #8E8269 |

### Synergy overlap bar track
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | — | 120px |
| height | — | 6px |
| border-radius | — | 999px |
| background | — | #2A241D |
| overflow | — | hidden |

### Synergy overlap bar fill
| Property | Mobile | Desktop |
|----------|--------|---------|
| height | — | 100% |
| background | — | #C9A24B |
| width | — | dynamic (edW %) |

### Synergy "own N of top M" text
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | IBM Plex Mono, monospace |
| font-size | — | 12px |
| color | — | #C6B79A |
| "N" bold color | — | #EDE6D8 |
| font-weight of N | — | 600 |

---

## Component: Receipts Preview (list card)

### Receipts line (desktop)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | IBM Plex Mono, monospace | IBM Plex Mono, monospace |
| font-size | 10.5px | 11px |
| color | #6E6353 | #6E6353 |
| line-height | — | 1.4 |
| white-space | — | nowrap |
| overflow | — | hidden |
| text-overflow | — | ellipsis |

### "receipts:" label within line
| Property | Mobile | Desktop |
|----------|--------|---------|
| color | #8E8269 | #8E8269 |

### Receipts / synergy short (mobile)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | IBM Plex Mono, monospace | — |
| font-size | 10.5px | — |
| color | #8E8269 | — |
| "N" bold color | #C6B79A | — |
| font-weight of N | 600 | — |

---

## Component: Fit Column (list card)

### Fit column container (desktop)
| Property | Mobile | Desktop |
|----------|--------|---------|
| border-left | — | 1px solid #2A241D |
| padding-left | — | 20px |
| display | — | flex |
| flex-direction | — | column |
| justify-content | — | center |
| gap | — | 10px |

### Fit score + "/100" row
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | flex |
| align-items | — | baseline |
| gap | — | 6px |

### Fit score number
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | IBM Plex Mono, monospace | IBM Plex Mono, monospace |
| font-weight | 600 | 600 |
| font-size | 20px | 34px |
| color | #EDE6D8 | #EDE6D8 |
| line-height | — | 1 |

### "FIT" label (mobile, below number)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | IBM Plex Mono, monospace | — |
| font-size | 9px | — |
| letter-spacing | 0.12em | — |
| color | #8E8269 | — |

### "/100" suffix (desktop)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | IBM Plex Mono, monospace |
| font-size | — | 13px |
| color | — | #8E8269 |

### "Fit" uppercase label (desktop, after /100)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | IBM Plex Mono, monospace |
| font-size | — | 10px |
| letter-spacing | — | 0.16em |
| text-transform | — | uppercase |
| color | — | #8E8269 |
| margin-left | — | 2px |

---

## Component: Fit Bar (3-segment brass ramp)

### Bar track
| Property | Mobile | Desktop |
|----------|--------|---------|
| height | 6px | 8px |
| border-radius | 999px | 999px |
| background | #2A241D | #2A241D |
| overflow | hidden | hidden |
| display | flex | flex |

### Bar filled region (outer wrapper)
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | dynamic (fit%) | dynamic (fit%) |
| display | flex | flex |
| height | 100% | 100% |

### Segment 1 — Pool
| Property | Mobile | Desktop |
|----------|--------|---------|
| flex-grow | dynamic (grow[0]) | dynamic (grow[0]) |
| background | #6E5B33 | #6E5B33 |
| height | 100% | 100% |

### Segment 2 — Roles
| Property | Mobile | Desktop |
|----------|--------|---------|
| flex-grow | dynamic (grow[1]) | dynamic (grow[1]) |
| background | #A9863E | #A9863E |
| height | 100% | 100% |

### Segment 3 — Synergy
| Property | Mobile | Desktop |
|----------|--------|---------|
| flex-grow | dynamic (grow[2]) | dynamic (grow[2]) |
| background | #C9A24B | #C9A24B |
| height | 100% | 100% |

### Fit bar legend dots (desktop, below bar)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | flex |
| gap | — | 12px |
| Dot width | — | 7px |
| Dot height | — | 7px |
| Dot border-radius | — | 2px |
| Dot color: Pool | — | #6E5B33 |
| Dot color: Roles | — | #A9863E |
| Dot color: Synergy | — | #C9A24B |
| Label font-family | — | IBM Plex Mono, monospace |
| Label font-size | — | 9.5px |
| Label color | — | #8E8269 |

### "View breakdown →" link
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | IBM Plex Sans, sans-serif |
| font-size | — | 12.5px |
| font-weight | — | 600 |
| color | — | #C9A24B |

---

## Component: Fit Bar — Degraded (2-segment)

### Segment 1 — Pool (degraded)
| Property | Mobile | Desktop |
|----------|--------|---------|
| flex-grow | dynamic (growNS[0]) | dynamic (growNS[0]) |
| background | #6E5B33 | #6E5B33 |

### Segment 2 — Roles (degraded)
| Property | Mobile | Desktop |
|----------|--------|---------|
| flex-grow | dynamic (growNS[1]) | dynamic (growNS[1]) |
| background | #C9A24B | #C9A24B |

### "Synergy —" placeholder in legend
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | IBM Plex Mono, monospace | IBM Plex Mono, monospace |
| font-size | — | 9.5px |
| color | #5E5647 | #5E5647 |

---

## Component: Per-Commander Degraded Note (inline)

### Note container
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center |
| gap | — | 9px |
| background | #211C15 | #211C15 |
| border | 1px solid #3A3229 | 1px solid #3A3229 |
| border-left | 2px solid #8E8269 | 2px solid #8E8269 |
| border-radius | 7px (list card) / 8px (per-cmd close-up) | 7px (list) / 8px (close-up) |
| padding | 7px 11px | 9px 13px |

### Note warning icon
| Property | Mobile | Desktop |
|----------|--------|---------|
| color | #8E8269 | #8E8269 |
| font-size | 12px | 13px |

### Note text
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 12px | 12.5px |
| color | #A89B84 | #A89B84 |
| line-height | — | 1.45 |

### Note — bold emphasis
| Property | Mobile | Desktop |
|----------|--------|---------|
| color | — | #C6B79A |
| font-weight | — | 600 |

### Note — Retry link
| Property | Mobile | Desktop |
|----------|--------|---------|
| color | #C9A24B | #C9A24B |

---

## Component: Synergy Receipts Hidden Note (global degraded, list card)

### Container
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center |
| gap | — | 9px |
| background | #211C15 | #211C15 |
| border | 1px solid #33302A | 1px solid #33302A |
| border-radius | — | 7px |
| padding | — | 7px 11px |
| width | — | fit-content |

### Text
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | IBM Plex Mono, monospace | IBM Plex Mono, monospace |
| font-size | 10px (mobile inline) | 11px |
| color | #6E6353 | #8E8269 |

---

## Component: Global Degraded Banner

### Banner container (desktop)
| Property | Mobile | Desktop |
|----------|--------|---------|
| margin | — | 20px 34px 0 |
| background | — | #211C15 |
| border | — | 1px solid #3A3229 |
| border-left | — | 3px solid #E0913C |
| border-radius | — | 12px |
| padding | — | 16px 20px |
| display | — | flex |
| align-items | — | center |
| gap | — | 16px |

### Banner container (mobile)
| Property | Mobile | Desktop |
|----------|--------|---------|
| background | #211C15 | — |
| border | 1px solid #3A3229 | — |
| border-left | 3px solid #E0913C | — |
| border-radius | 10px | — |
| padding | 11px 13px | — |
| display | flex | — |
| gap | 10px | — |

### Warning icon ring (desktop)
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | — | 40px |
| height | — | 40px |
| flex | — | none |
| border-radius | — | 999px |
| background | — | rgba(224,145,60,0.13) |
| border | — | 1px solid #4A3A24 |
| color | — | #E0913C |
| font-size | — | 18px |

### Warning icon (mobile, inline)
| Property | Mobile | Desktop |
|----------|--------|---------|
| color | #E0913C | — |
| font-size | 14px | — |
| line-height | 1.3 | — |

### Banner headline
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 12.5px | 15px |
| color | #EDE6D8 | #EDE6D8 |
| font-weight | 500 | 600 |

### Banner body text
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 11.5px | 13px |
| color | #A89B84 | #C6B79A |
| line-height | 1.5 | 1.55 |
| margin-top | 2px | 3px |

### "Retry now" / "Retry" button
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | IBM Plex Sans, sans-serif | IBM Plex Sans, sans-serif |
| font-weight | — | 600 |
| font-size | — | 13px |
| color | — | #EDE6D8 |
| background | — | transparent |
| border | — | 1px solid #3A3229 |
| border-radius | — | 8px |
| padding | — | 10px 18px |
| flex | — | none |

---

## Component: Guided First-Run Banner

### Banner container (desktop)
| Property | Mobile | Desktop |
|----------|--------|---------|
| margin | — | 28px 34px 0 |
| background | — | linear-gradient(120deg, #221D14, #1A160F 60%) |
| border | — | 1px solid #3A3229 |
| border-radius | — | 14px |
| padding | — | 22px 26px |
| display | — | flex |
| align-items | — | center |
| gap | — | 26px |

### Banner container (mobile — ribbon style)
| Property | Mobile | Desktop |
|----------|--------|---------|
| background | #1E1A15 | — |
| border | 1px solid #2A241D | — |
| border-left | 3px solid #C9A24B | — |
| border-radius | 10px | — |
| padding | 12px 14px | — |

### XCIX seal ring
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | — | 52px |
| height | — | 52px |
| flex | — | none |
| border-radius | — | 999px |
| border | — | 2px solid #C9A24B |
| font-family | — | Cinzel, serif |
| font-weight | — | 700 |
| font-size | — | 13px |
| color | — | #C9A24B |
| letter-spacing | — | 0.06em |

### Step label ("Guided setup · step 2 of 3" / "Step 2 of 3")
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | IBM Plex Mono, monospace | IBM Plex Mono, monospace |
| font-size | 10px | 10px |
| letter-spacing | 0.14em | 0.16em |
| text-transform | uppercase | uppercase |
| color | #C9A24B | #C9A24B |

### Progress diamonds (3-step crumb)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| gap | 5px | 6px |
| align-items | center | center |
| margin-left | auto | — |
| Step 1 (done): width | 6px | 7px |
| Step 1 (done): height | 6px | 7px |
| Step 1 (done): background | #6FA368 | #6FA368 |
| Step 2 (active): width | 8px | 9px |
| Step 2 (active): height | 8px | 9px |
| Step 2 (active): background | #C9A24B | #C9A24B |
| Step 3 (locked): width | 6px | 7px |
| Step 3 (locked): height | 6px | 7px |
| Step 3 (locked): background | #3A3229 | #3A3229 |
| transform (all) | rotate(45deg) | rotate(45deg) |

### Banner heading ("Review your commanders" / "Meet your generals")
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | Cinzel, serif | Cinzel, serif |
| font-weight | 600 | 700 |
| font-size | 15px | 23px |
| color | #EDE6D8 | #EDE6D8 |
| margin-top | 7px | 6px |

### Banner body row (v2 — mobile only; crab inline with the copy)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | — (desktop crab is a sibling of the content block) |
| align-items | center | — |
| gap | 10px | — |
| margin-top | 3px | — |

### Banner body
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 12.5px | 14px |
| color | #C6B79A | #C6B79A |
| line-height | 1.5 | 1.55 |
| margin-top | — (v2: moved to the body row) | 4px |
| max-width | — | 640px |

### Crab Mark (v2 — first-run banner)
| Property | Mobile | Desktop |
|----------|--------|---------|
| component | `<Crab size={52}>` inline with the body copy | `<Crab size={88}>` at the far end of the banner row |
| width × height | 52 × 35.75px | 88 × 60.5px |
| flex | none | none |
| stroke | var(--brass) #C9A24B | var(--brass) #C9A24B |
| fill | var(--surface) #1E1A15 | var(--surface) #1E1A15 |
| animation | `anim-bob`, 4.5s | `anim-bob`, 4.5s |
| reduced motion | `animation: none` (globals.css) | `animation: none` (globals.css) |
| aria | `aria-hidden` | `aria-hidden` |

> **v2 copy delta.** Surfaces v2 §Commanders: "crab joins the XCIX crumb row,
> copy: *1,418 cards read. 24 can lead. I ranked them. You're welcome.*" That
> line **replaces** the v1 banner body (`{n} cards → {m} legal commanders…`)
> rather than joining it; both state the same fact, and shipping both would put
> two redundant strings on one surface. Numbers are live counts formatted with
> `toLocaleString("en-US")`.
>
> The desktop crab sits at the end of the flex row rather than beside the 52px
> XCIX seal, so the seal keeps its leading position; the mobile ribbon is too
> tight for that, so the crab goes inline with the body copy at 52px.

### Degraded / EDHREC-unavailable states — **no character** (v2)
| Property | Mobile | Desktop |
|----------|--------|---------|
| crab | absent — deliberately | absent — deliberately |
| copy register | straight, amber, retry | straight, amber, retry |

> Surfaces v2 ships the degraded banner as the **counter-example**: "Degraded
> states — unchanged. Data-outage copy is utility: straight, amber, retry. The
> discipline is the system." This covers both `degraded-banner.tsx` (EDHREC
> offline) and the separate "EDHREC doesn't track this commander" note on the
> rec card and detail page. Neither may take character copy or the crab.

---

## Component: Commander Detail Page

### Detail page layout (desktop)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | grid |
| grid-template-columns | — | 344px 1fr |
| gap | — | 36px |
| margin-top | — | 20px |
| align-items | — | start |
| padding | — | 26px 36px 40px |

### Detail page layout (mobile)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | — |
| flex-direction | column | — |
| flex | 1 | — |
| overflow | hidden | — |

### "‹ Back to rankings" link (desktop)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | IBM Plex Sans, sans-serif |
| font-size | — | 13px |
| color | — | #8E8269 |
| display | — | inline-flex |
| align-items | — | center |
| gap | — | 7px |

---

## Component: Detail — Art Header (mobile)

### Art header container
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | relative | — |
| height | 236px | — |
| background | identity gradient | — |
| box-shadow | inset 0 -60px 60px -30px rgba(10,7,4,0.9) | — |
| flex | none | — |
| cursor | pointer | — |

### Back chevron button
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | absolute | — |
| top | 16px | — |
| left | 16px | — |
| width | 30px | — |
| height | 30px | — |
| border-radius | 999px | — |
| background | rgba(10,7,4,0.55) | — |
| backdrop-filter | blur(4px) | — |
| color | #EDE6D8 | — |
| font-size | 15px | — |

### Mana pips (top-right of art header)
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | absolute | — |
| top | 16px | — |
| right | 16px | — |
| display | flex | — |
| gap | 5px | — |

### "⛶ Full card" affordance chip — the handoff's heading; the shipped label is `Card details`

> **Errata (2026-09-11, ratified 2026-09-12):** this chip is drawn on the desktop commander
> detail page as well, inside the 63/88 card frame at `left: 12px; bottom: 12px`, with the frame
> as its tap target. The table below specifies mobile only, on the reasoning that desktop already
> shows the whole card — which was true when this control opened a full-card lightbox and is not
> true of the card modal it opens now (printings, rulings, and a two-faced commander's flip). See
> the errata at the foot of `design/design_handoff_the99_commanders/README.md`. Its label is also
> `Card details` rather than `Full card`, which this table already reflects elsewhere.
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | absolute | — |
| top | 56px | — |
| right | 16px | — |
| display | inline-flex | — |
| align-items | center | — |
| gap | 6px | — |
| background | rgba(10,7,4,0.55) | — |
| backdrop-filter | blur(4px) | — |
| border | 1px solid rgba(237,230,216,0.18) | — |
| border-radius | 999px | — |
| padding | 6px 11px | — |
| Icon color | #EDE6D8 | — |
| Icon font-size | 12px | — |
| Label font-family | IBM Plex Mono, monospace | — |
| Label font-size | 10px | — |
| Label letter-spacing | 0.08em | — |
| Label color | #EDE6D8 | — |

### Art header text overlay (bottom)
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | absolute | — |
| left | 16px | — |
| right | 16px | — |
| bottom | 14px | — |

### "Rank 1 · your best fit" label
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | IBM Plex Mono, monospace | — |
| font-size | 10px | — |
| letter-spacing | 0.14em | — |
| color | #C9A24B | — |
| text-transform | uppercase | — |

### Commander name (art overlay)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | Cinzel, serif | — |
| font-weight | 700 | — |
| font-size | 23px | — |
| color | #EDE6D8 | — |
| line-height | 1.1 | — |
| margin-top | 3px | — |

### Type line (art overlay)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 12px | — |
| color | #C6B79A | — |
| margin-top | 2px | — |

---

## Component: Detail — Left Column Card (desktop)

### Card frame
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | sticky | — |
| top | — | 20px |
| display | — | flex |
| flex-direction | — | column |
| gap | — | 16px |
| aspect-ratio | — | 63/88 |
| border-radius | — | 14px |
| background | — | identity gradient |
| box-shadow | — | inset 0 -70px 70px -40px rgba(10,7,4,0.85), inset 0 0 0 1px rgba(0,0,0,0.3), 0 20px 50px rgba(0,0,0,0.5) |
| padding | — | 16px |

### Card name (desktop card frame)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | Cinzel, serif |
| font-weight | — | 700 |
| font-size | — | 19px |
| color | — | #F4EEE0 |
| text-shadow | — | 0 1px 6px rgba(0,0,0,0.6) |
| line-height | — | 1.1 |

### Mana cost pips (desktop card, top-right)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | flex |
| gap | — | 4px |
| flex | — | none |

### Mana pip
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 22px | 24px |
| height | 22px | 24px |
| border-radius | 999px | 999px |
| font-family | IBM Plex Mono, monospace | IBM Plex Mono, monospace |
| font-weight | 600 | 600 |
| font-size | 12px | 13px |
| box-shadow | — | 0 1px 3px rgba(0,0,0,0.4) |
| Generic {2}: background | #3A322A | #3A322A |
| Generic {2}: color | #C6B79A | #C6B79A |
| B: background | #5B5566 | #5B5566 |
| B: color | #0E0C10 | #0E0C10 |
| R: background | #C05A48 | #C05A48 |
| R: color | #1a0b08 | #1a0b08 |
| G: background | #6B9E63 | #6B9E63 |
| G: color | #0c1608 | #0c1608 |

> **Retired: the oracle panel, these four tables.** Nothing draws the panel any more. The desktop copy was
> removed in #93 (`22d1529f`), because the card scan already prints the name, cost, type line and oracle
> text. The mobile copy went with the bespoke lightbox in #297 (`620e1a75`), which replaced it with the shared
> card modal, opened from *Card details*. #20, which asked for the P/T line because the schema had no
> power/toughness, was closed as obsolete on 2026-09-25. The tables are kept as the record. Do not build from
> them.

### Oracle text glass panel · RETIRED
| Property | Mobile | Desktop |
|----------|--------|---------|
| background | rgba(10,7,4,0.5) | rgba(10,7,4,0.5) |
| backdrop-filter | blur(3px) | blur(3px) |
| border-radius | 9px | 8px |
| padding | 11px 13px | 10px 12px |
| margin-top | auto | — (margin-top:auto on parent) |

### Type line (oracle panel) · RETIRED
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 12px | 12px |
| color | #EDE6D8 | #EDE6D8 |
| font-weight | 500 | 500 |
| text-shadow | 0 1px 4px rgba(0,0,0,0.6) | 0 1px 4px rgba(0,0,0,0.6) |

### Oracle text lines · RETIRED
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 11px | 11px |
| color | #E4DCCB | #E4DCCB |
| line-height | 1.45 | 1.4 |
| margin-top | 6px | 5px |
| text-shadow | 0 1px 3px rgba(0,0,0,0.7) | 0 1px 3px rgba(0,0,0,0.7) |

### P/T line (oracle panel) · RETIRED

| Property | Mobile | Desktop |
|----------|--------|---------|
| text-align | right | right |
| font-family | IBM Plex Mono, monospace | IBM Plex Mono, monospace |
| font-weight | 600 | 600 |
| font-size | 15px | 14px |
| color | #F4EEE0 | #F4EEE0 |
| margin-top | 8px | 6px |
| text-shadow | 0 1px 4px rgba(0,0,0,0.7) | 0 1px 4px rgba(0,0,0,0.7) |

### Identity pip row (below card, desktop)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | flex |
| gap | — | 5px |
| align-items | — | center |
| Pip width | — | 16px |
| Pip height | — | 16px |
| Pip border-radius | — | 999px |
| Pip box-shadow | — | inset 0 0 0 1px rgba(0,0,0,0.4) |
| Identity label font-family | — | IBM Plex Mono, monospace |
| Identity label font-size | — | 12px |
| Identity label color | — | #8E8269 |
| Identity label margin-left | — | 4px |

---

## Component: Build This Deck Button

### Desktop (left column, full-width)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | IBM Plex Sans, sans-serif | IBM Plex Sans, sans-serif |
| font-weight | 600 | 600 |
| font-size | 14px | 15px |
| color | #14110E | #14110E |
| background | #C9A24B | #C9A24B |
| border | none | none |
| border-radius | 8px | 8px |
| padding | 12px 20px | 14px 0 |
| width | 100% (sticky bar) | 100% |
| cursor | — | pointer |

### Mobile sticky bar
| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | none | — |
| border-top | 1px solid #3A3229 | — |
| background | #1A160F | — |
| padding | 12px 16px 24px | — |
| display | flex | — |
| align-items | center | — |
| gap | 12px | — |

### Sticky bar "READY TO BUILD" label
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | IBM Plex Mono, monospace | — |
| font-size | 10px | — |
| color | #8E8269 | — |

### Sticky bar pool count
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 12px | — |
| color | #C6B79A | — |

### "Compare with another general" button (desktop)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | IBM Plex Sans, sans-serif |
| font-weight | — | 600 |
| font-size | — | 13px |
| color | — | #EDE6D8 |
| background | — | transparent |
| border | — | 1px solid #3A3229 |
| border-radius | — | 8px |
| padding | — | 11px 0 |
| width | — | 100% |

### Seed note (below Compare button)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | IBM Plex Mono, monospace |
| font-size | — | 10.5px |
| color | — | #6E6353 |
| text-align | — | center |
| line-height | — | 1.5 |

---

## Component: Fit Hero (detail right column)

### Hero container
| Property | Mobile | Desktop |
|----------|--------|---------|
| background | — | #1A160F |
| border | — | 1px solid #2A241D |
| border-radius | — | 14px |
| padding | — | 22px 24px |

### Score display
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | IBM Plex Mono, monospace | IBM Plex Mono, monospace |
| font-weight | 600 | 600 |
| font-size | 30px | 52px |
| color | #EDE6D8 | #EDE6D8 |
| line-height | — | 0.9 |

### "/100" suffix (detail hero)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | IBM Plex Mono, monospace | IBM Plex Mono, monospace |
| font-size | 12px | 16px |
| color | #8E8269 | #8E8269 |

### "Best in your pool" badge
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | IBM Plex Sans, sans-serif |
| font-size | — | 13px |
| color | — | #6FA368 |
| font-weight | — | 600 |
| margin-left | — | 6px |

### Fit bar (detail hero)
| Property | Mobile | Desktop |
|----------|--------|---------|
| height | 8px | 12px |
| border-radius | 999px | 999px |
| background | #2A241D | #2A241D |
| overflow | hidden | hidden |
| margin-top | — | 18px |

### Legend row (detail hero, desktop)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | flex |
| gap | — | 24px |
| margin-top | — | 12px |
| Dot width | — | 10px |
| Dot height | — | 10px |
| Dot border-radius | — | 3px |
| Label font-family | — | IBM Plex Sans, sans-serif |
| Label font-size | — | 13px |
| Label color | — | #C6B79A |
| Pct font-family | — | IBM Plex Mono, monospace |
| Pct font-size | — | 12px |
| Pct color | — | #8E8269 |

### "Fit for your collection" label
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | IBM Plex Mono, monospace |
| font-size | — | 11px |
| letter-spacing | — | 0.14em |
| text-transform | — | uppercase |
| color | — | #8E8269 |

---

## Component: Detail Section Headings (Pool / Role Coverage / EDHREC Synergy)

### Section heading
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | Cinzel, serif |
| font-weight | — | 600 |
| font-size | — | 20px |
| margin | — | 0 |
| color | — | #EDE6D8 |

### Section heading sub-label
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | IBM Plex Mono, monospace |
| font-size | — | 12px |
| color | — | #8E8269 |

### Pool description paragraph
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | — | 13.5px |
| color | — | #C6B79A |
| line-height | — | 1.6 |
| margin | — | 8px 0 0 |
| max-width | — | 640px |

---

## Component: Role Panel (detail, desktop)

### Panel container
| Property | Mobile | Desktop |
|----------|--------|---------|
| background | — | #1A160F |
| border | — | 1px solid #2A241D |
| border-radius | — | 10px |
| padding | — | 15px 18px |

### Role panels gap
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | flex |
| flex-direction | — | column |
| gap | — | 12px |

### Role panel header row
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | flex |
| align-items | — | center |
| gap | — | 12px |
| margin-bottom | — | 10px |

### Role name
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | IBM Plex Sans, sans-serif |
| font-weight | — | 600 |
| font-size | — | 15px |
| color | — | #EDE6D8 |

### Owned · baseline count
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | IBM Plex Mono, monospace |
| font-size | — | 12px |
| color | — | #6FA368 |

### Role note (e.g. "Well past the 10 its decks run", or "Well past the 10-source baseline" on the fallback)
| Property | Mobile | Desktop |
|----------|--------|---------|
| margin-left | — | auto |
| font-size | — | 12px |
| color | — | #8E8269 |

---

## Component: Owned Card Chip

### Chip container
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | IBM Plex Mono, monospace | IBM Plex Mono, monospace |
| font-size | 10.5px | 11.5px – 12px |
| background | #221D16 | #221D16 |
| border | 1px solid #33402F | 1px solid #33402F |
| border-radius | 999px | 999px |
| padding | 3px 8px | 4px 10px – 5px 11px |
| color | #C6B79A | #C6B79A |
| display | inline-flex | inline-flex |
| align-items | center | center |
| gap | 5px | 6px – 7px |

### Owned dot
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 5px | 6px |
| height | 5px | 6px |
| border-radius | 999px | 999px |
| background | #6FA368 | #6FA368 |

---

## Component: Missing Card Chip

### Chip container
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | IBM Plex Mono, monospace | IBM Plex Mono, monospace |
| font-size | — | 12px |
| background | transparent | transparent |
| border | 1px dashed #3A3229 | 1px dashed #3A3229 |
| border-radius | 999px | 999px |
| padding | — | 5px 11px |
| color | #8E8269 | #8E8269 |
| display | inline-flex | inline-flex |
| align-items | center | center |
| gap | — | 7px |

### Missing dot (hollow)
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | — | 6px |
| height | — | 6px |
| border-radius | — | 999px |
| border | — | 1px solid #6E6353 |
| background | — | transparent |

---

## Component: EDHREC Synergy Panel (detail)

### Panel container
| Property | Mobile | Desktop |
|----------|--------|---------|
| background | #1A160F | #1A160F |
| border | 1px solid #2A241D | 1px solid #2A241D |
| border-radius | 10px | 12px |
| padding | 13px 14px | 18px 20px |

### Score row (29 of top 40)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center |
| gap | — | 14px |

### Score number
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | IBM Plex Mono, monospace | IBM Plex Mono, monospace |
| font-weight | 600 | 600 |
| font-size | — | 30px |
| color | — | #EDE6D8 |

### "of top N" label
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | IBM Plex Mono, monospace |
| font-size | — | 14px |
| color | — | #8E8269 |

### Overlap bar (EDHREC panel)
| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | — | 1 |
| height | 6px | 10px |
| border-radius | 999px | 999px |
| background (track) | #2A241D | #2A241D |
| overflow | hidden | hidden |
| margin | 9px 0 11px | — |

### Overlap bar fill
| Property | Mobile | Desktop |
|----------|--------|---------|
| height | 100% | 100% |
| background | #C9A24B | #C9A24B |

### "N% owned" label
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | IBM Plex Mono, monospace |
| font-size | — | 12px |
| color | — | #6FA368 |

### "Owned — 29" / "Not in your collection — 11" sub-labels
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | IBM Plex Mono, monospace | IBM Plex Mono, monospace |
| font-size | — | 10px |
| letter-spacing | — | 0.12em |
| text-transform | — | uppercase |
| color | — | #8E8269 |
| margin | — | 18px 0 10px / 20px 0 10px |

### "the gap to close" hint in sub-label
| Property | Mobile | Desktop |
|----------|--------|---------|
| color | — | #6E6353 |

### Chip cloud (owned)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| flex-wrap | wrap | wrap |
| gap | 5px | 7px |

### "+N more owned" overflow label (mobile detail)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | IBM Plex Mono, monospace | — |
| font-size | 10.5px | — |
| color | #8E8269 | — |
| padding | 3px 4px | — |

### Header row (mobile detail panel)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | — |
| align-items | center | — |
| justify-content | space-between | — |

### "EDHREC synergy" label (mobile panel header)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | IBM Plex Mono, monospace | — |
| font-size | 10px | — |
| letter-spacing | 0.12em | — |
| text-transform | uppercase | — |
| color | #8E8269 | — |

### "29 / 40 owned" figure (mobile panel header)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | IBM Plex Mono, monospace | — |
| font-size | 12px | — |
| color | #EDE6D8 | — |

---

## Component: Full-Card Lightbox (mobile only) — **SUPERSEDED 2026-09-12: nothing implements this**

> Every section in this component — the overlay, the blurred art layer, the `"Full card"` label, the
> close button, the 63/88 card frame and the tap-to-close hint — describes a surface that no longer
> exists. The control that opened it now opens the **shared card modal**, which is why its label is
> `Card details`. Element by element, what became of this surface is recorded in
> `design/design_handoff_the99_amendments/PARITY-lightbox-to-modal.md` — each row kept, kept
> differently, absorbed or cut, with reasons — and the modal's own properties live in the
> card-surfaces table. The state is `detail-card-modal` in State Coverage below. Kept whole for the
> handoff's numbering and for the record of what was drawn. **Do not implement from this block.**

### Lightbox overlay
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | absolute | — |
| inset | 0 | — |
| background | rgba(8,6,4,0.86) | — |
| backdrop-filter | blur(6px) | — |
| display | flex | — |
| flex-direction | column | — |
| align-items | center | — |
| justify-content | center | — |
| padding | 34px 30px | — |

### Blurred art layer (behind overlay)
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | absolute | — |
| inset | 0 | — |
| background | identity gradient | — |
| opacity | 0.28 | — |
| filter | blur(3px) | — |

### "Full card" label (top center)
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | absolute | — |
| top | 24px | — |
| text-align | center | — |
| font-family | IBM Plex Mono, monospace | — |
| font-size | 10px | — |
| letter-spacing | 0.16em | — |
| text-transform | uppercase | — |
| color | #8E8269 | — |

### Close "✕" button
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | absolute | — |
| top | 20px | — |
| right | 18px | — |
| width | 34px | — |
| height | 34px | — |
| border-radius | 999px | — |
| background | rgba(237,230,216,0.1) | — |
| border | 1px solid rgba(237,230,216,0.18) | — |
| color | #EDE6D8 | — |
| font-size | 16px | — |

### Card frame (lightbox)
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 262px | — |
| aspect-ratio | 63/88 | — |
| border-radius | 16px | — |
| background | identity gradient | — |
| box-shadow | inset 0 -80px 80px -46px rgba(10,7,4,0.85), inset 0 0 0 1px rgba(0,0,0,0.3), 0 24px 60px rgba(0,0,0,0.6) | — |
| padding | 16px | — |
| display | flex | — |
| flex-direction | column | — |

### "Tap anywhere to close" hint
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | IBM Plex Mono, monospace | — |
| font-size | 10.5px | — |
| color | #8E8269 | — |
| margin-top | 18px | — |
| letter-spacing | 0.04em | — |

---

## Component: Empty State — No Candidates

### XCIX seal badge
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 96px | 110px |
| height | 96px | 110px |
| border-radius | 999px | 999px |
| border | 2px solid #C9A24B | 2px solid #C9A24B |
| font-family | Cinzel, serif | Cinzel, serif |
| font-weight | 700 | 700 |
| font-size | 26px | 30px |
| color | #C9A24B | #C9A24B |
| letter-spacing | 0.04em | 0.04em |
| box-shadow | 0 0 0 8px rgba(201,162,75,0.05) | 0 0 0 10px rgba(201,162,75,0.05) |

### Empty state container
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| flex-direction | column | column |
| align-items | center | center |
| justify-content | center | center |
| text-align | center | center |
| padding | 24px 30px | 60px 40px |
| min-height | — | 520px |

### Heading "No generals in the ranks — yet"
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | Cinzel, serif | Cinzel, serif |
| font-weight | 700 | 700 |
| font-size | 22px | 30px |
| color | #EDE6D8 | #EDE6D8 |
| margin | 26px 0 0 | 28px 0 0 |
| line-height | 1.2 | — |

### Body paragraph
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 13.5px | 15px |
| color | #C6B79A | #C6B79A |
| line-height | 1.6 | 1.65 |
| margin | 10px 0 0 | 12px 0 0 |
| max-width | — | 480px |

### "Add more cards" button (primary)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | IBM Plex Sans, sans-serif | IBM Plex Sans, sans-serif |
| font-weight | 600 | 600 |
| font-size | 14px | 14px |
| color | #14110E | #14110E |
| background | #C9A24B | #C9A24B |
| border | none | none |
| border-radius | 8px | 8px |
| padding | 12px 0 | 12px 22px |
| width (mobile) | 100% | — |
| cursor | — | pointer |

### "View collection" button (secondary)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | IBM Plex Sans, sans-serif | IBM Plex Sans, sans-serif |
| font-weight | 600 | 600 |
| font-size | 14px | 14px |
| color | #EDE6D8 | #EDE6D8 |
| background | transparent | transparent |
| border | 1px solid #3A3229 | 1px solid #3A3229 |
| border-radius | 8px | 8px |
| padding | 12px 0 | 12px 22px |
| width (mobile) | 100% | — |
| cursor | — | pointer |

### Button row gap (mobile: column, desktop: row)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| flex-direction | column | — |
| gap | 10px | 12px |
| margin-top | 24px | 26px |
| width (mobile) | 100% | — |

---

## Component: Empty State — Filtered to Zero

### Container
| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | 1 | 1 |
| display | flex | flex |
| flex-direction | column | column |
| align-items | center | center |
| justify-content | center | center |
| text-align | center | center |
| padding | 24px 30px | 40px |
| background-image (v2) | `radial-gradient(420px 240px at 50% 76%, rgba(201,162,75,0.07), transparent 70%)` | same |

### Mark row (v2 — pips + crab, side by side)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center |
| gap | 16px | 16px |

> **v2 delta (Surfaces v2 §Commanders).** The mock composes the dimmed pips and
> the crab as one centred row rather than stacking the crab above them. The v1
> pip row's `margin-bottom` moves onto the heading's `margin-top`.

### Active-filter pip row (dimmed, beside the crab)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| gap | 6px | 6px |
| margin-bottom | — (v2: moved to heading margin-top) | — |
| Pip width | 16px (v2: was 20px) | 16px (v2: was 20px) |
| Pip height | 16px (v2: was 20px) | 16px (v2: was 20px) |
| Pip border-radius | 999px | 999px |
| Pip opacity | 0.5 | 0.5 |
| Pip box-shadow (v2) | 0 0 0 2px var(--brass) | 0 0 0 2px var(--brass) |

### Crab Mark (v2)
| Property | Mobile | Desktop |
|----------|--------|---------|
| component | `<Crab size={72}>` | `<Crab size={88}>` |
| width × height | 72 × 49.5px | 88 × 60.5px |
| stroke | var(--brass) #C9A24B | var(--brass) #C9A24B |
| fill | var(--surface) #1E1A15 | var(--surface) #1E1A15 |
| animation | `anim-bob`, 4.5s | `anim-bob`, 4.5s |
| reduced motion | `animation: none` (globals.css) | `animation: none` (globals.css) |
| aria | `aria-hidden` | `aria-hidden` |

### Heading "No generals in {guild}."
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | Cinzel, serif | Cinzel, serif |
| font-weight | 700 | 700 |
| font-size | 20px | 24px |
| color | var(--fg) #EDE6D8 | var(--fg) #EDE6D8 |
| margin | 16px 0 0 (v2: was 0) | 16px 0 0 (v2: was 0) |

### Body paragraph
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 13px | 14px |
| color | var(--fg-body) #C6B79A | var(--fg-body) #C6B79A |
| line-height | 1.6 | 1.6 |
| margin | 8px 0 0 (v2: was 10px) | 8px 0 0 (v2: was 10px) |
| max-width | — | 380px (v2: was 420px) |

### "Showing 0 of 24" count (v2 — demoted below the body copy)
| Property | Mobile | Desktop |
|----------|--------|---------|
| order | after the body paragraph (v2: was above the heading) | same |
| font-family | IBM Plex Mono, monospace | IBM Plex Mono, monospace |
| font-size | 10.5px | 11px |
| color | var(--warning) #E0913C | var(--warning) #E0913C |
| margin | 12px 0 0 (v2: was margin-bottom 12px) | 12px 0 0 |

> The count is **retained**, not deleted: it is the only signal distinguishing
> "your filter matched nothing" from "the list is empty". The v2 order puts the
> character first and the diagnostic after, which is the point of the pass.

### "Clear color filter" button
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | IBM Plex Sans, sans-serif | IBM Plex Sans, sans-serif |
| font-weight | 600 | 600 |
| font-size | 13px | 13px |
| color | #EDE6D8 | #EDE6D8 |
| background | transparent | transparent |
| border | 1px solid #3A3229 | 1px solid #3A3229 |
| border-radius | 8px | 8px |
| padding | 11px 20px | 10px 20px |
| margin-top | 16px (v2: was 20px) | 16px (v2: was 20px) |
| cursor | — | pointer |

---

## Component: List page — Cards list container

### Cards column (desktop)
| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | 1 | — |
| padding | — | 14px 34px 34px (filtered) / 8px 34px 34px (first-run) |
| display | flex | flex |
| flex-direction | column | column |
| gap | 10px | 12px |

### Cards column (mobile)
| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | 1 | — |
| overflow | hidden | — |
| padding | 12px 14px | — |
| display | flex | — |
| flex-direction | column | — |
| gap | 10px | — |

### "Ranked for your collection" bar label
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | IBM Plex Mono, monospace |
| font-size | — | 11px |
| letter-spacing | — | 0.12em |
| text-transform | — | uppercase |
| color | — | #8E8269 |

### "+ 20 more generals ↓" hint (mobile first-run)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | IBM Plex Mono, monospace | — |
| font-size | 11px | — |
| color | #8E8269 | — |
| text-align | center | — |
| padding | 2px 0 | — |

---

## State Coverage — Commanders

| State | Triggering condition | Component rendered | Key props required |
|-------|---------------------|-------------------|-------------------|
| **first-run** | User lands on `/commanders` immediately after first card upload; guided-flow step 2 has not been dismissed | Guided banner + full ranked list below it | `isFirstRun: true`, `cardCount: number`, `commanderCount: number`; banner shows step 2 progress crumb |
| **populated** | Collection has ≥1 legal commander; no active color filter | Ranked list (no banner); color filter pips all inactive | `commanders: Commander[]`, `totalCount: number` |
| **filtered** | One or more WUBRG color pips are selected | Active pip(s) highlighted with gold ring; removable chip(s) shown; `Showing N of 24` count; list narrows | `filter: string` (e.g. `"B"`); `filteredCommanders: Commander[]`; `totalCount: number` |
| **degraded-global** | EDHREC API unavailable for all commanders | Amber banner at top of list; every card shows 2-part Fit bar + "Synergy receipts hidden" note; Retry button | `edhrec: { available: false }`; each commander: `fitNS: number`, `segmentsNS: [Pool, Roles]`; synergy data null |
| **degraded-per-commander** | One specific commander has no EDHREC page (not a global outage) | Neutral inline note in that card's row only; 2-part Fit bar for that card; rest of list unaffected | Per-commander flag: `degraded: true`; that entry's `fitNS`, `segmentsNS`; no `edOwn`/`edTop`/`receipts` |
| **empty-no-candidates** | Collection has zero legendary creatures legal in Commander | XCIX seal centered; Cinzel heading; scanned card count; "Add more cards" + "View collection" actions | `commanders: []`, `cardCount: number` (scanned), no filter active |
| **empty-filtered-to-zero** | Active color filter matches no commanders in the ranked list | Filter bar visible with active chips; dimmed WUBRG pips; "Showing 0 of 24" in amber; guild-name heading; "Clear color filter" only action | `filteredCommanders: []`, `filter: string`, `totalCount: number` (>0) |
| **detail-normal** | User navigates to `/commanders/:slug`; commander has full synergy data | Left column sticky card + right column: Fit hero, pool, role panels, EDHREC chip cloud | `commander: Commander` with `roles`, `ed.owned[]`, `ed.missing[]`, `fit`, `segments` |
| **detail-card-modal** (was **detail-lightbox** until 2026-09-12) | User taps the art header or the `⛶ Card details` chip, on mobile **or desktop** — the desktop card frame carries the chip too since PR #517 | The shared card modal: printings, rulings, availability, and a flip control for a two-faced commander. It replaced the handoff's 63/88 full-card lightbox, which is why the control's label is `Card details` rather than `Full card` | Fetched card detail, not the `commander` object; modal open state; tap-outside closes |
| **detail-build-entry** | User taps "Build this deck →" from detail page | Navigates to Decks / deck-builder (ticket #8), seeded with owned pool; triggers guided step 3 if in first-run flow | `commander.slug`, `commander.poolLabel`, `commander.pool` (owned card count) |
