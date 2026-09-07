# Design Property Table — Decks

Breakpoint: 640px (`sm:` in Tailwind). Everything below ≤639 px is "mobile"; ≥640 px is "desktop". The canvas shows a 392 px phone frame (inner 368 px) and a 1300 px browser frame.

---

## Component: AppShell Rail (Desktop)

### Rail container
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — (hidden) | flex |
| flex-direction | — | column |
| width | — | 236px |
| background | — | #1A160F |
| border-right | — | 1px solid #3A3229 |

### Rail — logo area
| Property | Mobile | Desktop |
|----------|--------|---------|
| padding | — | 22px 20px 20px |
| border-bottom | — | 1px solid #2A241D |
| display | — | flex |
| align-items | — | flex-end |
| gap | — | 7px |

### Rail — wordmark "THE"
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | 'IBM Plex Mono', monospace |
| font-size | — | 10px |
| letter-spacing | — | 0.42em |
| color | — | #C9A24B |
| padding-bottom | — | 5px |

### Rail — "99" numeral
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | 'Cinzel', serif |
| font-weight | — | 800 |
| font-size | — | 30px |
| line-height | — | 0.8 |
| color | — | #EDE6D8 |

### Rail — diamond marks (logo glyph, 3 diamonds)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | flex |
| gap | — | 4px |
| small diamond width | — | 6px |
| small diamond height | — | 6px |
| large diamond width | — | 8px |
| large diamond height | — | 8px |
| background | — | #C9A24B |
| transform | — | rotate(45deg) |

### Rail — section label ("Play")
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | 'IBM Plex Mono', monospace |
| font-size | — | 10px |
| letter-spacing | — | 0.18em |
| text-transform | — | uppercase |
| color | — | #8E8269 |
| padding | — | 6px 12px 8px |

### Rail — nav item (idle)
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

### Rail — nav item diamond icon (idle)
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | — | 6px |
| height | — | 6px |
| background | — | #3A3229 |
| transform | — | rotate(45deg) |

### Rail — nav item (active — Decks)
| Property | Mobile | Desktop |
|----------|--------|---------|
| background | — | #2A241D |
| color | — | #EDE6D8 |
| font-weight | — | 600 |

### Rail — nav item diamond icon (active)
| Property | Mobile | Desktop |
|----------|--------|---------|
| background | — | #C9A24B |

### Rail — account trigger
| Property | Mobile | Desktop |
|----------|--------|---------|
| margin-top | — | auto |
| padding | — | 14px 12px |
| background | — | #221D16 |
| border | — | 1px solid #3A3229 |
| border-radius | — | 14px |
| padding-right | — | 12px |
| display | — | flex |
| align-items | — | center |
| gap | — | 12px |

### Rail — account avatar
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | — | 38px |
| height | — | 38px |
| border-radius | — | 12px |
| background | — | #14110E |
| border | — | 1px solid #C9A24B |
| font-family | — | 'IBM Plex Mono', monospace |
| font-size | — | 13px |
| color | — | #C9A24B |

### Rail — account name
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | — | 13px |
| color | — | #EDE6D8 |
| font-weight | — | 600 |

### Rail — account role label
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | 'IBM Plex Mono', monospace |
| font-size | — | 10px |
| color | — | #8E8269 |

---

## Component: Bottom Tab Bar (Mobile)

### Tab bar container
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | — (rail replaces) |
| border-top | 1px solid #3A3229 | — |
| background | #1A160F | — |
| padding | 10px 6px 22px | — |

### Tab bar — tab item (idle)
| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | 1 | — |
| display | flex | — |
| flex-direction | column | — |
| align-items | center | — |
| gap | 5px | — |

### Tab bar — diamond icon (idle)
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 8px | — |
| height | 8px | — |
| background | #4A4033 | — |
| transform | rotate(45deg) | — |

### Tab bar — label (idle)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 10px | — |
| color | #8E8269 | — |

### Tab bar — active item (Decks)
| Property | Mobile | Desktop |
|----------|--------|---------|
| color | #C9A24B | — |
| font-weight | 600 | — |

### Tab bar — diamond icon (active)
| Property | Mobile | Desktop |
|----------|--------|---------|
| background | #C9A24B | — |

---

## Component: Deck List (/decks)

### Page header container
| Property | Mobile | Desktop |
|----------|--------|---------|
| padding | 20px 18px 14px | 30px 34px (content area) |
| border-bottom | 1px solid #2A241D | — |
| display | flex | flex |
| align-items | center | flex-end |
| justify-content | space-between | space-between |
| margin-bottom | 12px (inner) | 22px |

### Page header — title "Your decks"
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'Cinzel', serif | 'Cinzel', serif |
| font-weight | 700 | 700 |
| font-size | 22px | 28px |
| color | #EDE6D8 | #EDE6D8 |
| margin | 0 | 0 |

### Page header — subtitle
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 11px | 12px |
| color | #8E8269 | #8E8269 |
| margin-top | 2px | 5px |

### Page header — avatar (mobile only)
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 34px | — |
| height | 34px | — |
| border-radius | 10px | — |
| background | #221D16 | — |
| border | 1px solid #C9A24B | — |
| font-family | 'IBM Plex Mono', monospace | — |
| font-size | 11px | — |
| color | #C9A24B | — |

### New Deck button
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Sans', sans-serif | 'IBM Plex Sans', sans-serif |
| font-weight | 600 | 600 |
| font-size | 14px | 14px |
| color | #14110E | #14110E |
| background | #C9A24B | #C9A24B |
| border | none | none |
| border-radius | 8px | 8px |
| padding | 11px 0 (full-width) | 11px 20px |
| width | 100% | auto |

### Deck grid
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | grid |
| flex-direction | column | — |
| grid-template-columns | — | 1fr 1fr |
| gap | 11px | 16px |
| padding | 14px | — |

### Deck card
| Property | Mobile | Desktop |
|----------|--------|---------|
| border-radius | 12px | 12px |
| background | #1E1A15 | #1E1A15 |
| border | 1px solid #2A241D | 1px solid #2A241D |
| padding | 13px | 22px (v2: was 18px) |
| display | flex | flex |
| flex-direction | column | column |
| gap | 11px | 18px (v2: was 14px) |

> **v2 density delta.** Surfaces v2 §Decks: "deck-list cards padding 16→22,
> gap +4". The mock's stated "before" (16) is not what shipped (18); the delta
> is authoritative and `18 + 4 = 22` also lands on the mock's stated target, so
> both readings agree at 22px. Gap takes the same +4 (14 → 18). Mobile is
> untouched — the loosening is a desktop browse gesture. The working surfaces
> named in the handoff (decklist ledger, Add panel, search, export) stay tight
> and are not edited by this pass.

### Deck card — art thumb
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 42px | 52px |
| height | 59px | 73px |
| aspect-ratio | 63/88 (approx) | 63/88 (approx) |
| border-radius | 6px | 8px |
| background | identity gradient | identity gradient |
| box-shadow | inset 0 0 0 1px rgba(0,0,0,0.35) | inset 0 0 0 1px rgba(0,0,0,0.35) |
| flex | none | none |

### Deck card — name
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'Cinzel', serif | 'Cinzel', serif |
| font-weight | 600 | 600 |
| font-size | 15px | 18px |
| color | #EDE6D8 | #EDE6D8 |
| line-height | 1.3 | 1.3 |
| white-space | nowrap | nowrap |
| overflow | hidden | hidden |
| text-overflow | ellipsis | ellipsis |

### Deck card — pip row
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center |
| gap | 7px | 8px |
| margin-top | 4px | 6px |

### Deck card — WUBRG pip
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 11px | 12px |
| height | 11px | 12px |
| border-radius | 999px | 999px |
| background | colour hex | colour hex |

### Deck card — guild/type label
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 11px | 12px |
| color | #A89B84 | #A89B84 |
| margin-left | 2px | 2px |

### Deck card — status pill
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 10px | 10px |
| letter-spacing | 0.06em | 0.06em |
| border-radius | 999px | 999px |
| padding | 4px 9px | 5px 10px |
| flex | none | none |

#### Status pill — Building
| Property | Mobile | Desktop |
|----------|--------|---------|
| color | #E0913C | #E0913C |
| background | rgba(224,145,60,0.13) | rgba(224,145,60,0.13) |

#### Status pill — Playable / Complete
| Property | Mobile | Desktop |
|----------|--------|---------|
| color | #6FA368 | #6FA368 |
| background | rgba(111,163,104,0.13) | rgba(111,163,104,0.13) |

#### Status pill — Draft
| Property | Mobile | Desktop |
|----------|--------|---------|
| color | #A89B84 | #A89B84 |
| background | rgba(168,155,132,0.12) | rgba(168,155,132,0.12) |

### Deck card — progress figure row
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| justify-content | space-between | space-between |
| align-items | baseline | baseline |
| margin-bottom | 5px | 6px |

### Deck card — built figure
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 13px | 15px |
| color | #EDE6D8 | #EDE6D8 |
| font-weight | 600 | 600 |

### Deck card — "/ 99" suffix (desktop)
| Property | Mobile | Desktop |
|----------|--------|---------|
| color | — | #8E8269 |
| font-weight | — | 400 |

### Deck card — owned · to-buy caption
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 11px | 12px |
| color | #A89B84 | #A89B84 |

### Deck card — progress bar track
| Property | Mobile | Desktop |
|----------|--------|---------|
| height | 6px | 7px |
| border-radius | 999px | 999px |
| background | #2A241D | #2A241D |
| overflow | hidden | hidden |

### Deck card — progress bar fill
| Property | Mobile | Desktop |
|----------|--------|---------|
| height | 100% | 100% |
| border-radius | 999px | 999px |
| background — built ≥ 99 | #6FA368 | #6FA368 |
| background — built ≥ 55 | #E0913C | #E0913C |
| background — built < 55 | #C6533F | #C6533F |

### Deck card — action buttons (desktop only)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | flex |
| gap | — | 9px |

### Deck card — "Open builder" button
| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | — | 1 |
| font-family | — | 'IBM Plex Sans', sans-serif |
| font-weight | — | 600 |
| font-size | — | 13px |
| color | — | #EDE6D8 |
| background | — | transparent |
| border | — | 1px solid #3A3229 |
| border-radius | — | 8px |
| padding | — | 9px 0 |

### Deck card — "⋯" overflow button
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | 'IBM Plex Sans', sans-serif |
| font-weight | — | 500 |
| font-size | — | 13px |
| color | — | #A89B84 |
| background | — | transparent |
| border | — | 1px solid #2A241D |
| border-radius | — | 8px |
| padding | — | 9px 13px |

---

## Component: Create — Pre-filled (/decks/new?commander=…)

### Page header
| Property | Mobile | Desktop |
|----------|--------|---------|
| padding | 20px 18px 14px | 34px 40px |
| border-bottom | 1px solid #2A241D | — |
| display | flex | block |
| align-items | center | — |
| gap | 10px | — |

### Back chevron
| Property | Mobile | Desktop |
|----------|--------|---------|
| color | #8E8269 | — (link text "‹ Commanders · Korvold") |
| font-size | 18px | 11px |

### Back link (desktop)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | 'IBM Plex Mono', monospace |
| font-size | — | 11px |
| color | — | #8E8269 |
| margin-bottom | — | 6px |

### Page title "New deck"
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'Cinzel', serif | 'Cinzel', serif |
| font-weight | 700 | 700 |
| font-size | 20px | 28px |
| color | #EDE6D8 | #EDE6D8 |
| margin | 0 | 2px 0 4px |

### Subtitle
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono', monospace | — (IBM Plex Sans) |
| font-size | 10px | 14px |
| color | #8E8269 | #A89B84 |
| margin-top | 1px | — |
| margin-bottom | — | 26px |

### Commander card thumbnail (mobile)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | — (full card on desktop) |
| gap | 14px | — |
| background | #1E1A15 | — |
| border | 1px solid #2A241D | — |
| border-radius | 12px | — |
| padding | 14px | — |

### Commander art thumb (mobile)
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 58px | — |
| height | 81px | — |
| border-radius | 8px | — |
| box-shadow | inset 0 0 0 1px rgba(0,0,0,0.35) | inset 0 0 0 1px rgba(0,0,0,0.3) |

### Commander full card (desktop)
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | — | 220px |
| aspect-ratio | — | 63/88 |
| border-radius | — | 12px |
| box-shadow | — | 0 24px 50px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.3) |

### Commander card — pip inset (desktop, absolute position)
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | — | absolute |
| left | — | 10px |
| bottom | — | 10px |
| display | — | flex |
| gap | — | 5px |

### Commander card — pip chip (desktop)
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | — | 16px |
| height | — | 16px |
| border-radius | — | 999px |
| box-shadow | — | 0 1px 3px rgba(0,0,0,0.5) |

### Commander name (below card, desktop)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'Cinzel', serif | 'Cinzel', serif |
| font-weight | 600 | 600 |
| font-size | 16px | 17px |
| color | #EDE6D8 | #EDE6D8 |
| line-height | 1.2 | 1.2 |
| margin-top | — | 14px |

### Commander type line
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 11.5px | 12.5px |
| color | #A89B84 | #A89B84 |
| margin-top | 3px | 4px |

### Legal-validated strip
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center |
| gap | 9px | 11px |
| background | rgba(111,163,104,0.1) | rgba(111,163,104,0.1) |
| border | 1px solid #33402F | 1px solid #33402F |
| border-radius | 8px | 10px |
| padding | 10px 13px | 13px 16px |

### Legal-validated strip — checkmark icon
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 20px | 24px |
| height | 20px | 24px |
| border-radius | 999px | 999px |
| background | rgba(111,163,104,0.2) | rgba(111,163,104,0.2) |
| color | #6FA368 | #6FA368 |
| font-size | 12px | 14px |
| flex | none | none |

### Legal-validated strip — text
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 12.5px | 13.5px |
| color | #C6B79A | #C6B79A |

### Deck name field label
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 10px | 10px |
| letter-spacing | 0.14em | 0.14em |
| text-transform | uppercase | uppercase |
| color | #8E8269 | #8E8269 |
| margin-bottom | 8px | 9px |

### Deck name input (active state shown)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center |
| background | #181410 | #181410 |
| border | 1px solid #C9A24B | 1px solid #C9A24B |
| border-radius | 8px | 9px |
| padding | 12px 14px | 14px 16px |
| font-size | 15px | 16px |
| color | #EDE6D8 | #EDE6D8 |

### Deck name input — cursor
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 1px | 1.5px |
| height | 16px | 18px |
| background | #C9A24B | #C9A24B |
| margin-left | 1px | 2px |

### Colour identity locked row label
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | 'IBM Plex Mono', monospace |
| font-size | — | 10px |
| letter-spacing | — | 0.14em |
| text-transform | — | uppercase |
| color | — | #8E8269 |
| margin-bottom | — | 9px |

### Colour identity locked row — pip chips
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | — | 22px |
| height | — | 22px |
| border-radius | — | 999px |
| gap | — | 8px |

### Colour identity caption
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | 'IBM Plex Mono', monospace |
| font-size | — | 12px |
| color | — | #A89B84 |
| margin-left | — | 4px |

### Helper text (below form, desktop)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 12.5px | 13px |
| color | #8E8269 | #8E8269 |
| line-height | 1.55 | 1.6 |
| border-top | — | 1px solid #2A241D |
| padding-top | — | 16px |

### "Create deck →" primary button
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Sans', sans-serif | 'IBM Plex Sans', sans-serif |
| font-weight | 600 | 600 |
| font-size | 15px | 15px |
| color | #14110E | #14110E |
| background | #C9A24B | #C9A24B |
| border | none | none |
| border-radius | 8px | 8px |
| padding | 13px 0 (full-width) | 13px 26px |

### "Change commander" secondary button
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Sans', sans-serif | 'IBM Plex Sans', sans-serif |
| font-weight | 500 (mobile) / 600 (desktop) | 600 |
| font-size | 13px | 14px |
| color | #A89B84 | #EDE6D8 |
| background | transparent | transparent |
| border | 1px solid #2A241D | 1px solid #3A3229 |
| border-radius | 8px | 8px |
| padding | 11px 0 (full-width) | 13px 20px |

---

## Component: Create — Picker (/decks/new)

### Page header — "Pick a general" / "New deck"
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'Cinzel', serif | 'Cinzel', serif |
| font-weight | 700 | 700 |
| font-size | 20px | 28px |
| color | #EDE6D8 | #EDE6D8 |

### Search input (idle)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center |
| gap | 8px | 10px |
| background | #181410 | #181410 |
| border | 1px solid #3A3229 | 1px solid #C9A24B (active shown) |
| border-radius | 8px | 9px |
| padding | 9px 12px | 12px 15px |

### Search input — icon
| Property | Mobile | Desktop |
|----------|--------|---------|
| color | #8E8269 | #8E8269 |
| font-size | 14px | 16px |

### Search input — text (query shown)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 14px | 15px |
| color | #EDE6D8 | #EDE6D8 |

### Search input — results count (desktop)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | 'IBM Plex Mono', monospace |
| font-size | — | 11px |
| color | — | #8E8269 |
| margin-left | — | auto |

### Commander picker row (idle)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center |
| gap | 11px | 14px |
| border-radius | 10px | 11px |
| background | #1A160F | #1A160F |
| border | 1px solid #2A241D | 1px solid #2A241D |
| padding | 10px 12px | 12px 15px |

### Commander picker row (selected)
| Property | Mobile | Desktop |
|----------|--------|---------|
| background | #211C15 | #211C15 |
| border | 1px solid #C9A24B | 1px solid #C9A24B |

### Commander picker row — art thumb
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 34px | 40px |
| height | 48px | 56px |
| border-radius | 6px | 6px |
| box-shadow | inset 0 0 0 1px rgba(0,0,0,0.35) | inset 0 0 0 1px rgba(0,0,0,0.35) |
| flex | none | none |

### Commander picker row — name
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'Cinzel', serif | 'Cinzel', serif |
| font-weight | 600 | 600 |
| font-size | 14px | 16px |
| color | #EDE6D8 | #EDE6D8 |
| line-height | 1.3 | — |
| white-space | nowrap | — |
| overflow | hidden | — |
| text-overflow | ellipsis | — |

### Commander picker row — pip + pool caption
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center |
| gap | 5px | 6px |
| margin-top | 4px | 5px |
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 10px | 11px |
| color | #A89B84 | #A89B84 |

### Commander picker row — pip chip
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 9px | 11px |
| height | 9px | 11px |
| border-radius | 999px | 999px |

### Commander picker row — radio control (idle)
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 20px | 22px |
| height | 20px | 22px |
| border-radius | 999px | 999px |
| border | 2px solid #4A4033 | 2px solid #4A4033 |
| background | transparent | transparent |
| flex | none | none |

### Commander picker row — radio control (selected)
| Property | Mobile | Desktop |
|----------|--------|---------|
| border | 2px solid #C9A24B | 2px solid #C9A24B |
| background | #C9A24B | #C9A24B |

### Selected summary sidebar (desktop)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — (sticky bottom bar) | block |
| width | — | 300px |
| position | — | sticky |
| top | — | 0 |
| background | #1A160F | #1A160F |
| border | 1px solid #2A241D | 1px solid #2A241D |
| border-radius | 12px | 12px |
| padding | — | 20px |

### Selected summary — "Selected" label
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | 'IBM Plex Mono', monospace |
| font-size | — | 10px |
| letter-spacing | — | 0.14em |
| text-transform | — | uppercase |
| color | — | #8E8269 |
| margin-bottom | — | 14px |

### Selected summary — card art
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | — | 44px |
| height | — | 62px |
| border-radius | — | 7px |
| flex | — | none |
| box-shadow | — | inset 0 0 0 1px rgba(0,0,0,0.35) |

### Selected summary — commander name
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | 'Cinzel', serif |
| font-weight | — | 600 |
| font-size | — | 15px |
| color | — | #EDE6D8 |
| line-height | — | 1.2 |

### Selected summary — guild · pool caption
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | 'IBM Plex Mono', monospace |
| font-size | — | 11px |
| color | — | #A89B84 |
| margin-top | — | 3px |

### Selected summary — deck name input (idle)
| Property | Mobile | Desktop |
|----------|--------|---------|
| background | — | #181410 |
| border | — | 1px solid #3A3229 |
| border-radius | — | 8px |
| padding | — | 11px 13px |
| font-size | — | 14px |
| color | — | #8E8269 (placeholder shown) |
| margin-bottom | — | 16px |

### Mobile sticky footer (picker)

> Superseded on phone by `add-panel-addendum.md` §2 (#177): the footer became the
> route's dock — pinned above the tab bar, carrying a summary line and the button
> alone, with the name field moved into the scrolling flow. Desktop is unchanged.

| Property | Mobile | Desktop |
|----------|--------|---------|
| padding | 14px 16px 20px | — |
| border-top | 1px solid #2A241D | — |
| background | #1A160F | — |

### "Name & create →" / "Create deck →" button
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Sans', sans-serif | 'IBM Plex Sans', sans-serif |
| font-weight | 600 | 600 |
| font-size | 15px | 15px |
| color | #14110E | #14110E |
| background | #C9A24B | #C9A24B |
| border | none | none |
| border-radius | 8px | 8px |
| padding | 13px 0 (full-width) | 13px 0 (full-width in sidebar) |

---

## Component: Builder Spine (header, /decks/[id])

### Spine container
| Property | Mobile | Desktop |
|----------|--------|---------|
| padding | 40px 16px 12px (with notch) | 20px–22px 30px |
| border-bottom | 1px solid #2A241D | 1px solid #2A241D |
| display | flex / column | flex |
| align-items | center | center |
| gap | — | 18px |

### Spine — commander art thumb
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 30px (mid-build) / 34px (empty) | 40px–44px |
| height | 42px (mid-build) / 48px (empty) | 56px–62px |
| border-radius | 5px | 6px–7px |
| box-shadow | inset 0 0 0 1px rgba(0,0,0,0.35) | inset 0 0 0 1px rgba(0,0,0,0.35) |
| flex | none | none |

### Spine — deck name
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'Cinzel', serif | 'Cinzel', serif |
| font-weight | 700 | 700 |
| font-size | 15.5px–17px | 21px–22px |
| color | #EDE6D8 | #EDE6D8 |
| line-height | 1.15–1.3 | — |
| white-space | nowrap | — |
| overflow | hidden | — |
| text-overflow | ellipsis | — |

### Spine — deck meta caption (mobile)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 10px–10.5px | 11px |
| color | #8E8269 | #8E8269 |
| margin-top | 1px–2px | — |

### Spine — pip chips (desktop)
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | — | 10px–11px |
| height | — | 10px–11px |
| border-radius | — | 999px |
| gap | — | 8px |
| margin-left | — | 2px |

### Spine — progress figure
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-weight | 600 | 600 |
| font-size | 14px | 20px–22px |
| color | #EDE6D8 | #EDE6D8 |

### Spine — "/ 99" suffix
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | (same) | 13px–14px |
| color | #8E8269 | #8E8269 |
| font-weight | 400 | 400 |

### Spine — progress bar track
| Property | Mobile | Desktop |
|----------|--------|---------|
| height | 5px–6px | 6px |
| border-radius | 999px | 999px |
| background | #2A241D | #2A241D |
| overflow | hidden | hidden |
| width | 100% | 170px (desktop) |
| margin-top | — | 6px |

### Spine — progress bar fill (mid-build amber)
| Property | Mobile | Desktop |
|----------|--------|---------|
| height | 100% | 100% |
| background | #E0913C | #E0913C |
| border-radius | 999px | 999px |

### Spine — "54 owned · 8 to buy" caption (desktop)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | 'IBM Plex Mono', monospace |
| font-size | — | 10px |
| color | — | #8E8269 |
| margin-top | — | 5px |

### Spine — Export button (active)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Sans', sans-serif |
| font-weight | — | 600 |
| font-size | 11px | 13px |
| color | #C9A24B (mobile active) | #14110E |
| background | transparent | #C9A24B |
| border | 1px solid #3A3229 | none |
| border-radius | 7px | 8px |
| padding | 6px 9px | 11px 18px |

### Spine — Export button (disabled, empty deck)
| Property | Mobile | Desktop |
|----------|--------|---------|
| color | — | #8E8269 |
| background | — | transparent |
| border | — | 1px solid #2A241D |
| cursor | — | not-allowed |

### Spine — export link icon (mobile)
| Property | Mobile | Desktop |
|----------|--------|---------|
| color | #8E8269 | — |
| font-size | 16px | — |

---

## Component: Role Counter Strip

### Strip container (desktop)
| Property | Mobile | Desktop |
|----------|--------|---------|
| padding | (within spine, compressed) | 14px 30px |
| border-bottom | — | 1px solid #2A241D |

### Strip header row
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | baseline | baseline |
| gap | — | 10px |
| margin-bottom | 6px | 10px |
| justify-content | space-between | — |

### Strip header — "Recommended mix" label
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 9px | 11px |
| letter-spacing | 0.1em | 0.12em |
| text-transform | uppercase | uppercase |
| color | #8E8269 | #C6B79A |

### Strip header — "a guide, not a gate" label
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 9px | — |
| color | #6E6353 | — |

### Strip header — source copy (desktop, interpolated)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | 'IBM Plex Mono', monospace |
| font-size | — | 10.5px |
| color | — | #8E8269 |

### Strip header — hover hint (desktop)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | 'IBM Plex Mono', monospace |
| font-size | — | 10.5px |
| color | — | #6E6353 |
| margin-left | — | auto |

### Role counter cell container
| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | 1 | 1 |
| min-width | 0 | — |
| background | #181410 | #181410 |
| border | 1px solid #2A241D | 1px solid #2A241D |
| border-radius | 7px | 9px |
| padding | 6px 5px | 11px 14px |
| text-align | center | — |
| cursor | — | help |
| title (hover) | — | rationale text |

### Role counter cell — label
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 8.5px | 10px |
| letter-spacing | 0.04em | 0.1em |
| text-transform | uppercase | uppercase |
| color | #8E8269 | #8E8269 |
| white-space | nowrap | — |
| overflow | hidden | — |
| text-overflow | ellipsis | — |

### Role counter cell — current-count figure (below-rec, neutral)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-weight | 600 | 600 |
| font-size | 13px | 16px |
| color | #C6B79A | #C6B79A |
| margin-top | 2px | — |

### Role counter cell — current-count figure (met rec, green)
| Property | Mobile | Desktop |
|----------|--------|---------|
| color | #6FA368 | #6FA368 |

### Role counter cell — fill bar track
| Property | Mobile | Desktop |
|----------|--------|---------|
| height | — (not shown mobile) | 5px |
| border-radius | — | 999px |
| background | — | #2A241D |
| overflow | — | hidden |
| margin-top | — | 8px |

### Role counter cell — fill bar (below-rec)
| Property | Mobile | Desktop |
|----------|--------|---------|
| height | — | 100% |
| background | — | #C9A24B |
| border-radius | — | 999px |

### Role counter cell — fill bar (met rec)
| Property | Mobile | Desktop |
|----------|--------|---------|
| background | — | #6FA368 |

### Role counter cell — "rec N" caption
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 8px | 9px–9.5px |
| color | #6E6353 | #8E8269 |
| margin-top | — | 6px |

### Worked-example callout (desktop mid-build)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | flex |
| align-items | — | flex-start |
| gap | — | 11px |
| margin-top | — | 12px |
| background | — | #181410 |
| border | — | 1px solid #2A241D |
| border-left | — | 3px solid #C9A24B |
| border-radius | — | 9px |
| padding | — | 11px 15px |

### Worked-example callout — "i" icon
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | — | 20px |
| height | — | 20px |
| border-radius | — | 999px |
| border | — | 1.5px solid #C9A24B |
| color | — | #C9A24B |
| font-family | — | 'Cinzel', serif |
| font-weight | — | 700 |
| font-size | — | 12px |
| flex | — | none |

### Worked-example callout — text
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | — | 12.5px |
| color | — | #C6B79A |
| line-height | — | 1.55 |

---

## Component: Decklist Group Toggle

### Toggle bar container
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| padding | 9px 16px | 14px 26px 10px |
| border-bottom | 1px solid #2A241D | — |
| gap | 7px | 10px |
| align-items | center | center |

### "All N" filter pill (active)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Sans', sans-serif | 'IBM Plex Sans', sans-serif |
| font-weight | 600 | 600 |
| font-size | 12px | 13px |
| color | #14110E | #14110E |
| background | #C9A24B | #C9A24B |
| border-radius | 999px | 999px |
| padding | 4px 11px | 5px 14px |

### "Shopping N" filter pill (idle)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-weight | 500 | 500 |
| font-size | 12px | 13px |
| color | #E0913C | #E0913C |
| background | transparent | transparent |
| border | 1px solid #4A3A24 | 1px solid #4A3A24 |
| border-radius | 999px | 999px |
| padding | 4px 11px | 5px 14px |

### "Group" label
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | 'IBM Plex Mono', monospace |
| font-size | — | 10px |
| letter-spacing | — | 0.1em |
| text-transform | — | uppercase |
| color | — | #8E8269 |
| margin-left | auto | auto |

### Group toggle pills — "By type" (active)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Sans', sans-serif | 'IBM Plex Sans', sans-serif |
| font-weight | 600 | 600 |
| font-size | 11.5px | 12.5px |
| color | #EDE6D8 | #EDE6D8 |
| background | #2A241D | #2A241D |
| border | 1px solid #3A3229 | 1px solid #3A3229 |
| border-radius | 999px | 999px |
| padding | 4px 10px | 5px 13px |

### Group toggle pills — "By role" (idle)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-weight | 500 | 500 |
| color | #8E8269 | #8E8269 |
| background | transparent | transparent |
| border | none (mobile) | 1px solid #2A241D |
| padding | 4px 6px | 5px 13px |

---

## Component: Decklist Group

### Group header row
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | baseline | baseline |
| gap | — | 10px |
| margin-bottom | 6px | 8px |
| border-bottom | — | 1px solid #2A241D |
| padding-bottom | — | 7px |
| justify-content | space-between | — |

### Group label
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Sans', sans-serif | 'Cinzel', serif |
| font-weight | 600 | 600 |
| font-size | 12.5px | 15px |
| color | #EDE6D8 | #EDE6D8 |

### Group count
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 10px | 11px |
| color | #8E8269 | #8E8269 |

### Group note (right-aligned, desktop)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | 'IBM Plex Mono', monospace |
| font-size | — | 10.5px |
| color | — | #6E6353 |
| margin-left | — | auto |

### Card rows grid
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex / column | grid |
| flex-direction | column | — |
| grid-template-columns | — | 1fr 1fr |
| gap | 3px | 4px 20px |

---

## Component: Decklist Row

### Row container
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center |
| gap | 9px | 10px |
| padding | 6px 8px | 7px 9px |
| border-radius | 6px | 7px |
| background | #1A160F | #1A160F |

### Row — ownership dot (owned)
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 7px | 8px |
| height | 7px | 8px |
| border-radius | 999px | 999px |
| background | #6FA368 | #6FA368 |
| border | 1px solid #6FA368 | 1px solid #6FA368 |
| border-style | solid | solid |
| flex | none | none |

### Row — ownership dot (unowned)
| Property | Mobile | Desktop |
|----------|--------|---------|
| background | transparent | transparent |
| border | 1px dashed #6E6353 | 1px dashed #6E6353 |

### Row — card name
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 12.5px | 13.5px |
| color | #EDE6D8 | #EDE6D8 |
| flex | 1 1 auto | 1 1 auto |
| min-width | 0 | 0 |
| white-space | nowrap | nowrap |
| overflow | hidden | hidden |
| text-overflow | ellipsis | ellipsis |

`flex: 1 1 auto` rather than the `1 1 0` this table carried before the availability marker
joined the row. With a basis of zero the name gets only the space the marker has not
already claimed as intrinsic width, so an over-committed 390px row draws the marker in
full with a single character of card name beside it. Basing the name on its own text, and
giving the marker `flex-shrink: 4`, makes the marker yield first and the name yield last —
Design's ruling that the name is the most useful half, expressed as an order of yielding
rather than as a fixed minimum that cannot itself yield.

### Row — "+N more" meta row name
| Property | Mobile | Desktop |
|----------|--------|---------|
| color | #8E8269 | #8E8269 |

### Row — buy tag (unowned)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 9px | 9.5px |
| color | #E0913C | #E0913C |
| background | rgba(224,145,60,0.13) | rgba(224,145,60,0.13) |
| border-radius | 4px | 4px |
| padding | 1px 5px | 1px 5px |
| content | "buy" | "buy" |

### Row — buy tag (owned / absent)
| Property | Mobile | Desktop |
|----------|--------|---------|
| background | transparent | transparent |

### Row — remove "✕" button (desktop only)
| Property | Mobile | Desktop |
|----------|--------|---------|
| color | — | #4A4033 |
| font-size | — | 13px |
| flex | — | none |

---

## Component: Add Panel · Suggestion Card · Search (retired)

> **Superseded by the #158 Add panel overhaul (shipped 2026-08-05).** The three
> sections that stood here described the 340px desktop suggestions column, the
> cards inside it, and the search field scoped to that panel. All three were
> deleted from the build. Suggestions now live in the full-width Consider view,
> whose shelves are ordered by what the deck lacks, and search moved to a sticky
> quick-add bar. The replacement tables are in
> `design/design_handoff_the99_add_panel/` — the design canvas (`.dc.html`) is the
> authority where it and that handoff's README disagree.

---

## Component: Degraded Suggestions Banner (retired)

> **Superseded by the #158 Add panel overhaul (shipped 2026-08-05).** The banner
> spec that stood here, its "Synergy data offline" heading and its separate mobile
> and desktop retry affordances all belonged to the Add Panel. The decks build has
> no banner component of its own any more; `builder-shell.tsx:217` carries a
> comment where it used to be mounted. (`DegradedBanner` still resolves under
> `src/components/commanders/`, which is a different surface and untouched here.) The degraded message now renders inside the Consider view
> (`consider-panel.tsx:191`) from `addPanelCopy.degraded`, and the shelves stay
> ordered by what the deck lacks — they lose the EDHREC percentages, not their
> order. The drawn replacement is in `design/design_handoff_the99_add_panel/`.

---

## Component: Export Dialog / Sheet

### Overlay dim
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | absolute | absolute |
| inset | 0 | 0 |
| background | rgba(8,6,4,0.60) | rgba(8,6,4,0.68) |

### Export bottom sheet (mobile)
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | absolute | — |
| left | 0 | — |
| right | 0 | — |
| bottom | 0 | — |
| height | 590px | — |
| background | #1A160F | — |
| border-top | 1px solid #3A3229 | — |
| border-radius | 22px 22px 0 0 | — |
| box-shadow | 0 -20px 50px rgba(0,0,0,0.5) | — |

### Export modal (desktop)
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | — | absolute |
| top | — | 50% |
| left | — | 50% |
| transform | — | translate(-50%,-50%) |
| width | — | 560px |
| background | — | #1A160F |
| border | — | 1px solid #3A3229 |
| border-radius | — | 16px |
| box-shadow | — | 0 40px 100px rgba(0,0,0,0.7) |
| overflow | — | hidden |
| max-height | — | min(85vh, 760px) (deviation) |

Authorised deviation, 2026-09-07: the drawing gave the modal no height bound, so
it grew to its content. The centring wrapper does not clip, so a long shopping
list pushed the modal past both edges of the viewport with no way to reach the
footer. The bottom sheet was never exposed to this — its 590px is fixed.

### Export dialog — header
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center |
| justify-content | space-between | space-between |
| padding | 8px 18px 14px | 20px 24px 16px |
| border-bottom | 1px solid #2A241D | — |

### Export dialog — title "Export deck"
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'Cinzel', serif | 'Cinzel', serif |
| font-weight | 700 | 700 |
| font-size | 19px | 22px |
| color | #EDE6D8 | #EDE6D8 |
| margin | 0 | 0 |

### Export dialog — subtitle (desktop)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | 'IBM Plex Mono', monospace |
| font-size | — | 11px |
| color | — | #8E8269 |
| margin-top | — | 3px |

### Export dialog — dismiss "✕"
| Property | Mobile | Desktop |
|----------|--------|---------|
| color (mobile) | #8E8269 | — |
| font-size (mobile) | 17px | — |
| width (desktop) | — | 32px |
| height (desktop) | — | 32px |
| border-radius (desktop) | — | 999px |
| background (desktop) | — | #221D16 |
| border (desktop) | — | 1px solid #3A3229 |
| color (desktop) | — | #A89B84 |
| font-size (desktop) | — | 14px |

### Export dialog — tab pills (mobile)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| gap | 8px | 8px |
| padding | 14px 18px 0 | 0 24px 16px |

### Export dialog — tab "Decklist" (active)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Sans', sans-serif | 'IBM Plex Sans', sans-serif |
| font-weight | 600 | 600 |
| font-size | 13px | 13px |
| color | #14110E | #14110E |
| background | #C9A24B | #C9A24B |
| border-radius | 999px (mobile) | 8px (desktop) |
| padding | 6px 15px | 8px 16px |

### Export dialog — tab "Shopping list" (active)
| Property | Mobile | Desktop |
|----------|--------|---------|
| color | #14110E | #14110E |
| background | #E0913C | #E0913C |

### Export dialog — tab (idle)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-weight | 500 | 500 |
| color | #A89B84 (idle decklist) | #A89B84 |
| background | transparent | transparent |
| border | 1px solid #3A3229 | 1px solid #3A3229 (desktop idle) |
| color (idle shopping) | #E0913C | — |
| border (idle shopping) | 1px solid #4A3A24 | — |

### Export text block (decklist)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 11.5px | 12.5px |
| line-height | 1.85 | 1.8 |
| color | #C6B79A | #C6B79A |
| background | #14110E | #100D0A |
| border | 1px solid #2A241D | 1px solid #2A241D |
| border-radius | 10px | 10px |
| padding | 14px 16px | 16px 18px |
| height | — | 250px → not set (deviation) |
| overflow | hidden | hidden |
| margin | 14px 18px | 0 24px |

Authorised deviation, 2026-09-07: the desktop `height: 250px` clipped a real
decklist — 99 lines in two columns run to roughly 600px — and the block had no
scrollbar of its own. `overflow: auto` does not rescue it either, because a
multi-column box with a constrained height overflows in the inline direction,
so it would have scrolled sideways. The block now sizes to its content and the
dialog body scrolls, which is where the shopping tab's scroll already was.

### Export text — comment line
| Property | Mobile | Desktop |
|----------|--------|---------|
| color | #8E8269 | #8E8269 |

### Export text — commander line
| Property | Mobile | Desktop |
|----------|--------|---------|
| color | #C9A24B | #C9A24B |

### Export text — separator line
| Property | Mobile | Desktop |
|----------|--------|---------|
| color | #3A3229 | #3A3229 |

### Export text — body lines (desktop two-column)
| Property | Mobile | Desktop |
|----------|--------|---------|
| columns | — | 2 |
| column-gap | — | 36px |

### Shopping export — info callout
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | flex |
| align-items | — | center |
| gap | — | 9px |
| margin | 0 24px 10px | 0 24px 10px |
| background | — | #181410 |
| border | — | 1px solid #2A241D |
| border-radius | — | 8px |
| padding | — | 9px 12px |

### Shopping export — "i" info icon
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | — | 18px |
| height | — | 18px |
| border-radius | — | 999px |
| border | — | 1.5px solid #8E8269 |
| color | — | #8E8269 |
| font-size | — | 10px |
| flex | — | none |

### Shopping export — count meta
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 11px | 11px |
| color | #8E8269 | #8E8269 |
| padding | 0 20px (mobile) | 0 26px 8px |

### Shopping export — estimated total
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 12px (mobile) | 13px |
| color | #8E8269 | #8E8269 |

### Shopping export — total figure
| Property | Mobile | Desktop |
|----------|--------|---------|
| color | #A89B84 | #A89B84 |
| font-weight | 600 | 600 |

### Shopping export — "names only · pricing planned" note (mobile)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono', monospace | — |
| font-size | 9.5px | — |
| color | #6E6353 | — |
| padding | 0 20px 2px | — |

### Shopping export — item row (mobile)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center |
| gap | 10px | 12px |
| padding | 8px 10px | 9px 16px |
| border-bottom | 1px solid #1E1A15 | 1px solid #1A160F |

### Shopping item — quantity
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 12px | 12px |
| color | #8E8269 | #8E8269 |

### Shopping item — unowned dot (desktop)
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | — | 7px |
| height | — | 7px |
| border-radius | — | 999px |
| background | — | transparent |
| border | — | 1px dashed #6E6353 |
| flex | — | none |

### Shopping item — card name
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 13px | 14px |
| color | #EDE6D8 | #EDE6D8 |
| flex | 1 | 1 |
| white-space | nowrap | nowrap |
| overflow | hidden | hidden |
| text-overflow | ellipsis | ellipsis |

### Shopping item — role chip (desktop)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | 'IBM Plex Mono', monospace |
| font-size | — | 10px |
| color | — | #8E8269 |
| background | — | #221D16 |
| border-radius | — | 5px |
| padding | — | 2px 8px |

### Shopping item — price (de-emphasised, reference)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 11.5px | 12.5px |
| color | #A89B84 | #A89B84 |
| width | — | 56px |
| text-align | — | right |

### Export dialog — "Copy to clipboard" primary button
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Sans', sans-serif | 'IBM Plex Sans', sans-serif |
| font-weight | 600 | 600 |
| font-size | 14px | 14px |
| color | #14110E | #14110E |
| background | #C9A24B | #C9A24B |
| border | none | none |
| border-radius | 8px | 8px |
| padding | 12px 0 (full-width) | 11px 22px |

### Export dialog — "Download .txt" secondary button
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Sans', sans-serif | 'IBM Plex Sans', sans-serif |
| font-weight | 600 | 600 |
| font-size | 14px | 14px |
| color | #EDE6D8 | #EDE6D8 |
| background | transparent | transparent |
| border | 1px solid #3A3229 | 1px solid #3A3229 |
| border-radius | 8px | 8px |
| padding | 12px 16px | 11px 18px |
| label (mobile) | ".txt" | "Download .txt" |

### Export dialog — "Moxfield · Archidekt ready" note (desktop)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | 'IBM Plex Mono', monospace |
| font-size | — | 11px |
| color | — | #8E8269 |
| margin-left | — | auto |

---

## Component: Guided Banner (First-Run)

### Banner container
| Property | Mobile | Desktop |
|----------|--------|---------|
| background | #1E1A15 (mobile) | linear-gradient(120deg,#221D14,#1A160F 60%) |
| border | 1px solid #2A241D (mobile) | 1px solid #3A3229 |
| border-left | 3px solid #C9A24B | — |
| border-radius | 10px | 14px |
| padding | 12px 14px | 22px 26px |
| display | block | flex |
| align-items | — | center |
| gap | — | 24px |
| margin | 20px 16px 0 | 26px 32px 0 |

### Banner — step label
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 10px | 10px |
| letter-spacing | 0.14em | 0.16em |
| text-transform | uppercase | uppercase |
| color | #C9A24B | #C9A24B |

### Banner — diamond crumb (3 diamonds)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| gap | 5px | 6px |
| align-items | center | center |

#### Diamond crumb — done steps (1 & 2)
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 6px | 7px |
| height | 6px | 7px |
| background | #6FA368 | #6FA368 |
| transform | rotate(45deg) | rotate(45deg) |

#### Diamond crumb — active step (3)
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 8px | 9px |
| height | 8px | 9px |
| background | #C9A24B | #C9A24B |
| transform | rotate(45deg) | rotate(45deg) |

### Banner — card-fan glyph
| Property | Mobile | Desktop |
|----------|--------|---------|
| width | — | 52px |
| height | — | 52px |
| flex | — | none |

#### Card-fan — back card
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | absolute | absolute |
| width | 22px | 22px |
| height | 32px | 32px |
| border-radius | 4px | 4px |
| background | #2A241D | #2A241D |
| border | 1px solid #4A4033 | 1px solid #4A4033 |
| transform | rotate(-16deg) translateX(-8px) | rotate(-16deg) translateX(-8px) |

#### Card-fan — front card (brass-outlined "99")
| Property | Mobile | Desktop |
|----------|--------|---------|
| background | #3E3020 | #3E3020 |
| border | 1px solid #C9A24B | 1px solid #C9A24B |
| transform | rotate(16deg) translateX(8px) | rotate(16deg) translateX(8px) |

#### Card-fan — "99" numeral on front
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'Cinzel', serif | 'Cinzel', serif |
| font-weight | 800 | 800 |
| font-size | 11px | 11px |
| color | #C9A24B | #C9A24B |

### Banner — title "Build your first deck"
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'Cinzel', serif | 'Cinzel', serif |
| font-weight | 600 (mobile) | 700 |
| font-size | 15px | 23px |
| color | #EDE6D8 | #EDE6D8 |
| margin-top | 7px | 6px |

### Banner — body copy
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 12.5px | 14px |
| color | #C6B79A | #C6B79A |
| line-height | 1.5 | 1.55 |
| margin-top | 3px | 4px |
| max-width | — | 640px |

### Banner — 0/99 figure
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-weight | 600 | 600 |
| font-size | — | 30px |
| color | #EDE6D8 | #EDE6D8 |
| text-align | — | center |

### Banner — "+ Korvold" sub-label
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | 'IBM Plex Mono', monospace |
| font-size | — | 10px |
| color | — | #8E8269 |
| margin-top | — | 2px |

---

## Component: Empty Builder Mark

### Empty state section (v2 vignette)
| Property | Mobile | Desktop |
|----------|--------|---------|
| background-image | radial-gradient(400px 220px at 50% 80%, rgba(201,162,75,0.07), transparent 70%) | same |

### Mark row (v2 — crab + card mark)
| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | flex-end | flex-end |
| justify-content | center | center |
| gap | 16px | 16px |
| order | crab, then card mark | crab, then card mark |
| margin-bottom | 20px | 22px |

### Crab Mark (v2 — builder empty)
| Property | Mobile | Desktop |
|----------|--------|---------|
| component | `<Crab size={72}>` | `<Crab size={88}>` |
| width × height | 72 × 49.5px | 88 × 60.5px |
| flex | none | none |
| stroke | var(--brass) #C9A24B | var(--brass) #C9A24B |
| fill | var(--surface) #1E1A15 | var(--surface) #1E1A15 |
| animation | `anim-bob`, 4.5s | `anim-bob`, 4.5s |
| reduced motion | `animation: none` (globals.css) | `animation: none` (globals.css) |
| aria | `aria-hidden` | `aria-hidden` |

> The two breakpoints keep their **separate** marks. Mobile renders three
> absolutely-positioned card rects at 96 × 104; desktop renders
> `<CardFan variant="decks-desktop">` scaled 0.867 into a fixed 104 × 112 box.
> They are distinct pixel geometries, so each gets its own crab rather than one
> responsive pair.

### Mark container (3 stacked card rects)
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | relative | relative |
| width | 96px | 100px–110px |
| height | 104px | 110px–120px |
| margin-bottom | — (v2: moved to the mark row) | — (v2: moved to the mark row) |

### Back card (tilted left)
| Property | Mobile | Desktop |
|----------|--------|---------|
| position | absolute | absolute |
| left | 50% | 50% |
| top | 50% | 50% |
| width | 48px | 52px–56px |
| height | 68px | 72px–78px |
| border-radius | 8px | 8px–9px |
| background | #221D16 | #221D16 |
| border | 1.5px solid #3A3229 | 1.5px solid #3A3229 |
| transform | translate(-50%,-50%) rotate(-15deg) translateX(-17px to -20px) | |

### Middle card (upright)
| Property | Mobile | Desktop |
|----------|--------|---------|
| background | #2A241D | #2A241D |
| border | 1.5px solid #4A4033 | 1.5px solid #4A4033 |
| transform | translate(-50%,-50%) | translate(-50%,-50%) |

### Front card (tilted right, brass-outlined)
| Property | Mobile | Desktop |
|----------|--------|---------|
| background | #3E3020 | #3E3020 |
| border | 1.5px solid #C9A24B | 1.5px solid #C9A24B |
| transform | translate(-50%,-50%) rotate(15deg) translateX(17px to 20px) | |
| display | flex | flex |
| align-items | center | center |
| justify-content | center | center |

### Front card — "99" numeral
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'Cinzel', serif | 'Cinzel', serif |
| font-weight | 800 | 800 |
| font-size | 18px | 20px–22px |
| color | #C9A24B | #C9A24B |

### Empty state heading
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'Cinzel', serif | 'Cinzel', serif |
| font-weight | 700 | 700 |
| font-size | 21px | 24px–26px |
| color | #EDE6D8 | #EDE6D8 |
| margin | 0 | 0 |

### Empty state body
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 13.5px | 14px–14.5px |
| color | #C6B79A | #C6B79A |
| line-height | 1.6 | 1.65 |
| margin | 10px 0 0 | 12px 0 0 |
| max-width | — | 440px |

### Empty state role hint (desktop)
| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | 'IBM Plex Mono', monospace |
| font-size | — | 11px |
| color | — | #8E8269 |
| margin-top | — | 20px |

> **Superseded by the #158 Add panel overhaul (shipped 2026-08-05).** The v2 copy
> delta that stood here, its two ratification amendments, and the `Open
> suggestions` / `+ Add cards` button tables that followed all described a build
> with a 340px suggestions column on desktop and a bottom sheet on mobile.
> Neither exists. The empty-builder strings and the sticky quick-add bar that
> replaced the CTA are drawn in `design/design_handoff_the99_add_panel/`, whose
> copy strings file is the lock. The heading, body, hint and numeral tables above
> still hold.

---

## Component: Completion Reveal — REMOVED (#362)

The 99/99 band ("Ninety-nine.") no longer exists. `completion-reveal.tsx`, the
`the99:celebrated:<deckId>` and `the99:filled-by-fill:<deckId>` flags that gated
it, and the `loud` crown tone drawn only inside it were all removed with it.

Its property tables are dropped rather than kept as history: this file is the
statement of what the deck surface *is*, and a table for a band that cannot
render is a second source of truth. The drawings remain in
`design/design_handoff_the99_richness/`.

**Export survives the removal.** "Export decklist" was one of the band's two
CTAs but never its only route — `BuilderSpine` carries the same action, and that
is now the single entry to the export dialog.

The three interpretive calls this section recorded (band rather than full
surface, dismissible-only rather than a ~4s timer, and a derived mobile
composition) are moot; they were the open half of **#148**, which still stands
for its other items.

---

## Global Tokens (from inline styles throughout)

| Token name (role) | Value |
|---|---|
| Surface / page background | #100D0A |
| Surface / canvas overlay | #14110E |
| Surface / card | #1E1A15 |
| Surface / sidebar / rail | #1A160F |
| Surface / add panel | #181410 |
| Surface / input | #14110E (search) / #181410 (form) |
| Surface / selected row | #211C15 |
| Border / default | #2A241D |
| Border / strong | #3A3229 |
| Border / subtle | #4A4033 |
| Brass / primary | #C9A24B |
| Brass / amber mid-build | #E0913C |
| Text / primary | #EDE6D8 |
| Text / secondary | #C6B79A |
| Text / tertiary | #A89B84 |
| Text / muted | #8E8269 |
| Text / faintest | #6E6353 |
| Green / success | #6FA368 |
| Red / error / low progress | #C6533F |
| White pip | #E8E4D6 |
| Blue pip | #4A7FB5 |
| Black pip | #5B5566 |
| Red pip | #C05A48 |
| Green pip | #6B9E63 |

---

## State Coverage

| State | Triggering condition | Component rendered | Key props required |
|-------|---------------------|-------------------|-------------------|
| Deck list — populated | User has ≥1 deck; navigates to /decks | DeckList with DeckCard grid | `decks[]` each with `{name, ids, guild, type, built, owned, status}` |
| Deck list — empty | User has 0 decks | (not shown in handoff — implied redirect to /decks/new) | — |
| Create · pre-filled | Arriving from commander recommendation with `?commander=` query param | CreatePreFilled: commander card + validated strip + name field | `commander {name, ids, art, type}`, `validated: true` |
| Create · pre-filled · legal strip | Commander passed server validation | LegalStrip (green background, checkmark) | `legal: true` |
| Create · picker | Arriving at /decks/new standalone | CreatePicker: search input + commander list + sticky selected summary | `legalCommanders[]` each `{name, ids, art, guild, pool}` |
| Create · picker · none selected | Page load, no general chosen | PickerRow idle, selected sidebar empty / "Create deck →" disabled | `selected: null` |
| Create · picker · one selected | User taps a commander row | PickerRow selected state; Selected sidebar populated | `selected: Commander` |
| Builder · empty | Deck just created (0 cards) | EmptyBuilderMark + sticky quick-add bar + Spine (0/99, Export disabled) | `deck.size === 0`, `commander` |
| Builder · mid-build | Deck has ≥1 card, <99 | Full builder: Spine, RoleStrip, Decklist (by type default), sticky quick-add bar | `deck.cards[]` with `{name, role, owned, quantity}`, `roleCounts` |
| Builder · mid-build · filter All | "All" pill active over decklist | Full decklist shown | `filter: 'all'` |
| Builder · mid-build · filter Shopping | "Shopping" pill active | Decklist filtered to unowned cards only | `filter: 'shopping'` |
| Builder · mid-build · group By type | "By type" pill active (default) | Decklist grouped by card type (Creatures / Instants / Sorceries / Artifacts / Enchantments / Lands) | `grouping: 'type'` |
| Builder · mid-build · group By role | "By role" pill active | Decklist grouped by role (Ramp / Card draw / Removal / Board wipes / Payoffs / Lands) | `grouping: 'role'` |
| Builder · complete | Deck reads `Complete` (99 built, all owned) | No band and no one-shot: the builder renders as it does mid-build, with the Spine at 99/99. The completion reveal was removed in #362 | `deck.built`, `deck.ownedCount` |
| Builder · quick-add open | User focuses the sticky quick-add bar | Bar expands to a results list beneath the input | `searchQ: string`, `search.results[]` |
| Builder · search · min 2 chars | Query length ≥ 2 | Results list populated | `searchQ.length >= 2` |
| Builder · search · owned-only off | Toggle turned off by the user | All results (owned + unowned) shown | `ownedOnly: false` |
| Builder · search · owned-only on | Default since #158 | Only owned results shown | `ownedOnly: true` |
| Search result — "+ Add" | `!inDeck` | Add button #C9A24B | `inDeck: false` |
| Search result — "✓ In deck" | `inDeck === true` | In-deck label #6FA368 | `inDeck: true` |
| Consider · shelves | User opens the Consider view | Five shelves ordered by what the deck lacks, each a grid of suggestion tiles | `suggestions[]`, `roleCounts` |
| Consider · tile in deck | `inDeck.has(oracleId)` | In-deck label #6FA368 in place of the Add button | in-deck membership as a `Set<string>` |
| Suggestion — synergy reason | `reasonType === 'edhrec'` | Brass chip rgba(201,162,75,0.14) | `reasonLabel: "EDHREC · N% of decks"`, `reasonType: 'edhrec'` |
| Suggestion — role-fill reason | `reasonType === 'role'` | Neutral chip #2A241D | `reasonLabel: "Fills <role> · rec N"`, `reasonType: 'role'` |
| Builder · suggestions degraded | EDHREC offline / error | Degraded notice inside the Consider view (amber left-border); shelves keep their gap ordering and lose the EDHREC percentages | `degraded: true` |
| Role counter — below rec (neutral) | `have < rec` (non-advisory) | Figure #C6B79A, bar #C9A24B | `have < rec` |
| Role counter — met rec (green) | `have >= rec` | Figure #6FA368, bar #6FA368 | `have >= rec` |
| Role counter — Lands advisory | Always (advisory role) | Bar #C9A24B regardless of count; label "rec ~37" | `advisory: true` |
| Builder · complete | `built >= 99`, all owned | Progress bar #6FA368, status pill "Complete" | `built: 99`, `owned === built` |
| Builder · playable | `built >= 99`, some unowned | Status pill "Playable" #6FA368 | `built: 99`, `owned < built` |
| Builder · building | `built >= 1 && built <= 98` | Status pill "Building" #E0913C | `1 <= built <= 98` |
| Builder · draft | `built === 0` | Status pill "Draft" #A89B84 | `built: 0` |
| Export · decklist tab | User opens Export dialog / sheet; Decklist tab active | ExportDialog with text block (commander first, N Card Name lines) + Copy + Download | `deck.cards[]`, `commander` |
| Export · shopping tab | User taps Shopping tab | Shopping list view: unowned card names only (prices omitted — planned feature) + Copy + Download | `shoppingItems[]` = `cards.filter(!owned)` |
| Export · disabled | `deck.size === 0` | Export button greyed (#8E8269, cursor: not-allowed) | `deck.size === 0` |
| First-run · step 3 live | User is completing guided setup; arrived from Commanders "Build this deck" | GuidedBanner (brass left-border, 3-diamond crumb) + normal empty builder below | `guidedSetup: true`, `stepsDone: [1,2]` |
| First-run · setup complete | Deck receives its first card | GuidedBanner dissolves; dashboard checklist dissolves | `deck.size >= 1 && wasFirstDeck` |
| Ownership dot — owned | `card.owned === true` | Solid green dot (#6FA368, solid border) | `owned: true` |
| Ownership dot — unowned | `card.owned === false` | Dashed hollow dot (transparent bg, dashed #6E6353 border) | `owned: false` |
| Buy tag — unowned card in list | `!owned && !isMore` | Amber "buy" tag rgba(224,145,60,0.13) | `owned: false` |
| Buy tag — owned / meta row | `owned || isMore` | No tag (transparent background) | — |
