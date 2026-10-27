# Design Property Table — Signature card picker (handoff 20, Picker.dc.html P1–P8, D1–D2)

Source: `design/design_handoff_the99_avatar/Picker.dc.html` and README calls 1, 2, 3 and 7. Phone 390, desktop 1300.
Chrome (sheet, dialog, ✕, title, sub) is the shipped `SocialModal` and is unchanged. Copy text goes to `/copy-review`;
the rows below record the copy KEY, not its wording.

## Screen 1 — search (P1–P4, D1)

### Title / sub / search field
| Property | Mobile | Desktop |
|---|---|---|
| title key | signature.title | signature.title |
| sub key | signature.sub | signature.sub |
| field height | 46px | 44px |
| field placeholder key | signature.search | signature.search |

### From your decks (P1)
| Property | Mobile | Desktop |
|---|---|---|
| grid columns | 2 | 4 |
| gap | 12px | 10px |
| tile art height | 95px | 78px |
| tile art radius | 8px | 8px |
| tile art border | 1px solid var(--border-strong) | same |
| current tile outline | 2px solid var(--accent), offset 2 | same |
| art source | the deck's own printing's crop | same |

### Result row (P2, D1)
| Property | Mobile | Desktop |
|---|---|---|
| height | 56px | 52px |
| gap | 12px | 12px |
| padding | 0 4px | 0 4px |
| rule | 1px solid var(--elevated) bottom | same |
| highlighted | bg var(--elevated), radius 8px, transparent rule | same |
| art thumb | 56×40, radius 6px, cover | same |
| name | sans 400 14.5px var(--fg), ellipsis | 14px |
| type line | mono 11px var(--fg-faint), under the name, 1px gap, ellipsis | same |
| trailing (>1 printing) | `N printings ›`: mono 11px var(--fg-faint), gap 6, padding-left 8; chevron sans 15px | same |
| trailing (1 printing) | — | — |

### Empty (P3)
| Property | Mobile | Desktop |
|---|---|---|
| key | signature.noResults(q) | same |
| style | 13.5px var(--fg-muted), margin-top 16px | same |

### Saving row (P4)
| Property | Mobile | Desktop |
|---|---|---|
| pressed row | bg var(--elevated), radius 8; trailing "Saving" + spinner 18×18, 2px var(--border-strong), top var(--accent) | same |
| other rows | opacity .45 | same |
| sheet | stays open until the write lands | same |

### Footer
| Property | Mobile | Desktop |
|---|---|---|
| note key | signature.anyNote (searching or no decks) / commander.savedNote | same |
| clear | commander.clear, only with a face | same |

## Screen 2 — printings (P5, P6, P8, D2)

### Header
| Property | Mobile | Desktop |
|---|---|---|
| back | the shipped SocialModal ‹ (as Add a friend's chooser): 44×44 | 36×44 |
| title | the card's name | same |
| sub key | signature.printingsSub(n) | same |
| footer | none | none |

### Preview box
| Property | Mobile | Desktop |
|---|---|---|
| box | flex, gap 14, padding 12, radius 12, 1px var(--border), bg var(--bg) | same |
| face | 64×64, radius 14, 1px var(--border-strong), bg var(--surface-raised), art crop | same |
| name | sans 600 14px var(--fg) | same |
| printing line | mono 11px var(--fg-faint): "{set} · {CODE}", usual "Usual art · {CODE}" | same |
| status | 12.5px var(--fg-muted): previewNote / previewSaving / previewNow | same |
| hover/focus | — | preview swaps to the hovered tile |

### Gone note (P8)
| Property | Mobile | Desktop |
|---|---|---|
| box | flex, gap 10, padding 11 13, radius 10, 1px var(--border), bg var(--surface-sunken), 13/1.5 var(--fg-body), margin-top 12 | same |
| glyph | "i", mono 600 12px var(--fg-faint), margin-top 1 | same |

### Set search
| Property | Mobile | Desktop |
|---|---|---|
| shown | over 12 tiles (OVERFLOW_THRESHOLD) | same |
| margin-top | 12px | 12px |
| placeholder key | signature.setSearch | same |

### Tile grid
| Property | Mobile | Desktop |
|---|---|---|
| columns | 3 | 4 |
| row gap | 14px | 14px |
| column gap | 10px | 12px |
| order | Usual art first, then newest set | same |

### Tile
| Property | Mobile | Desktop |
|---|---|---|
| card | 63/88, radius 9, inset 1px rgba(255,255,255,.06) | same |
| caption | column, gap 6 under the card, inner gap 1 | same |
| set name | sans 12/1.3 var(--fg-body) | same |
| set code | mono 10.5px var(--fg-faint), own line | same |
| current | 2px var(--accent) outline, offset 3; badge 22×22 radius 5 at 7/7, accent bg, ✓ | same |
| hover | — | 1px dashed var(--border-dashed) outline, offset 3 |
| shown now (P8) | 1px dashed var(--fg-faint) outline offset 3; badge ◇ rgba(10,8,6,.72), 1px dashed var(--fg-faint); caption mono 500 10.5px var(--fg-muted) | same |
| saving (P6) | 2px accent outline offset 3; overlay rgba(10,8,6,.45); spinner 26px, 2.5px border; others opacity .45 | same |

## State coverage

| State | Triggering condition | Rendered | Key props |
|---|---|---|---|
| P1 empty | no query | deck row | `listDeckFacesAction` tiles with printingId |
| P2 results | query ≥ 2 | result rows | `searchFaceCardsAction` hits with typeLine, printings |
| P3 no match | fresh, 0 hits | empty line | — |
| P4 saving row | press of a 1-printing hit or deck tile | row Saving, rest .45 | onSave pending |
| P5 printings | press of a >1-printing hit | screen 2 | `listFacePrintingsAction` card |
| P6 saving tile | press of a tile | tile spinner, rest .45 | onSave pending |
| P7 saved | onSave true | sheet closes, head draws new face | friends-view saveFace |
| P8 gone | current.oracleId = card and current.printingGone | note + Usual art Shown now | OwnCommander.printingGone from ensureProfile |
