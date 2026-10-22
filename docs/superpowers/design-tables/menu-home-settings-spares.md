# Design Property Table — Settings · Spares (menu+Home R1)

Source: `design/design_handoff_the99_menu_home/Settings.dc.html` (frames "Settings · 390" and "Settings · 1300", CSS block `/* Settings (NEW) */` lines 451–488 plus shared `.sec`/`.sech` lines 389–394, `.lnk` line 104, `.new` line 38), with README call 10, READINESS eng 7 and 10, STATES row "Settings".
Scope: page frame plus the Spares section. "What's new on Home" is recorded only for order and the shared section rules it sets. Copy is a slot, not a property (every string is a placeholder for `/copy-review`).
Theme tokens below are the board's dark (`--bg:#14110E` etc.) values. Build with the token names, never the hex.

## Page frame

### Route and entry
| Property | Mobile | Desktop |
|---|---|---|
| Route | `/settings` | `/settings` |
| Entry | Account menu row "Settings" (replaces the Friends row) | same |
| Tab bar / rail lit slot | Caption: "No tab slot is lit: Settings is reached from the avatar." (Note: the drawn phone bar has `t on` on Home, which contradicts the caption; the caption is the stated rule) | Drawn rail has `sl on` on Home; no caption. Follow the phone caption: no slot lit |
| Shell | Shipped phone header (79px) + tab bar (74px), 5 slots Home, Collection, Commanders, Decks, Friends | Shipped rail 62px (fine pointer) |
| Save model | Saves as each control changes; no Save button; shipped toast on a failed write (board header) | same |
| New-surface marker | `.new` dashed orange outline on the whole `.stp` (annotation only, not shipped) | same |

### Page column (`.stp`)
| Property | Mobile | Desktop |
|---|---|---|
| display | flex, column | flex, column |
| width | full (390 frame) | 720px |
| margin | — | 0 auto (centered in main) |
| padding | 22px 16px 40px | 36px 0 50px |
| Caption | — | "The 720 column, as /friends." (same column as /friends) |

### Title (`.stp h1`)
| Property | Mobile | Desktop |
|---|---|---|
| String slot | page title | page title |
| font-family | 'Cinzel', serif (display face var) | same |
| font-weight | 700 | 700 |
| font-size | 22px | 28px |
| line-height | normal (unset) | normal (unset) |
| margin | 0 | 0 |
| color | inherits `--fg` | inherits `--fg` |

### Subline (`.stp .sub`)
| Property | Mobile | Desktop |
|---|---|---|
| String slot | save-model line | same |
| font-family | 'IBM Plex Mono' (mono var) | same |
| font-size | 11px | 11px |
| font-weight | 400 | 400 |
| color | `--fg-faint` | `--fg-faint` |
| margin-top | 4px | 4px |

### Section order
| Order | Mobile | Desktop |
|---|---|---|
| 1 | h1 | h1 |
| 2 | `.sub` | `.sub` |
| 3 | section "What's new on Home" (six checkboxes + foot line) — OUT OF SCOPE, later PR | same |
| 4 | section "Spares" | same |
| — | No Theme section (theme stays in the account menu); no pod-sharing switch (Settings points to Friends) | same |

### Section wrapper (`.sec`)
| Property | Mobile | Desktop |
|---|---|---|
| margin-top | 26px | 34px |

### Section head (`.sech`) — Spares head
| Property | Mobile | Desktop |
|---|---|---|
| String slot | section name | same |
| display | flex; align-items center; justify-content space-between | same |
| min-height | 44px | 32px |
| padding-bottom | — | 8px |
| border-bottom | 1px solid `--border` | 1px solid `--border` |
| font-family | 'IBM Plex Mono' | same |
| font-weight | 500 | 500 |
| font-size | 10.5px | 10.5px |
| letter-spacing | .14em | .14em |
| text-transform | uppercase | uppercase |
| color | `--fg-faint` | `--fg-faint` |
| trailing `.r` link | — (none drawn on Spares) | — |

## Spares section

### Definition line (`.stp .sec p.ex`)
| Property | Mobile | Desktop |
|---|---|---|
| String slot | what a spare is | same |
| margin-top | 10px | 10px |
| font-family | 'IBM Plex Sans' (body, inherited) | same |
| font-size | 13px | 13px |
| line-height | 1.55 | 1.55 |
| color | `--fg-muted` | `--fg-muted` |
| `b` inside | color `--fg` (none in this string) | same |

### Threshold line (`.thr`)
| Property | Mobile | Desktop |
|---|---|---|
| Structure | text slot · stepper inline · text slot (sentence wraps the stepper) | same |
| margin-top | 12px | 12px |
| display | flex; align-items center; flex-wrap wrap | same |
| gap | 10px | 10px |
| font-size | 14px | 14px |
| line-height | 1.5 | 1.5 |
| color | `--fg` | `--fg` |

### Stepper (`.stepper`)
| Property | Mobile | Desktop |
|---|---|---|
| Range | 1 to 9, default 1 (= today's behaviour, `spare_min`) | same |
| Drawn value | 2 | 2 |
| display | inline-flex; align-items center | same |
| height | 44px | 36px |
| border | 1px solid `--border-strong` | same |
| border-radius | 10px | 10px |
| overflow | hidden | hidden |
| background | — (transparent, page `--bg`) | same |

### Stepper buttons (`.stepper span`, − and +)
| Property | Mobile | Desktop |
|---|---|---|
| Glyphs | "−" (U+2212) left, "+" right, text glyphs, no SVG | same |
| width | 44px | 44px |
| height | 100% (44px) | 100% (36px) |
| display | flex; center/center | same |
| font-family | 'IBM Plex Sans' | same |
| font-weight | 400 | 400 |
| font-size | 18px | 18px |
| color | `--fg-body` | `--fg-body` |
| hover | not drawn | not drawn |
| focus | not drawn | not drawn |
| disabled (− at 1, + at 9) | not drawn; board states range 1–9 only, so ends must not step past; visual disabled treatment unspecified | same |

### Stepper value (`.stepper b`)
| Property | Mobile | Desktop |
|---|---|---|
| min-width | 40px | 40px |
| height | 100% | 100% |
| display | flex; center/center | same |
| font-family | 'IBM Plex Mono' | same |
| font-weight | 600 | 600 |
| font-size | 15px | 15px |
| color | inherits `--fg` | inherits `--fg` |
| border-left / border-right | 1px solid `--border-strong` | same |

### Who-sees-them row (`.who2`)
| Property | Mobile | Desktop |
|---|---|---|
| Structure | text span (pod names in `b`) · link span "Friends ›" | same |
| margin-top | 12px | 12px |
| display | flex; align-items center; justify-content space-between | same |
| gap | 10px | 10px |
| min-height | 44px | 44px |
| padding | 0 4px 0 14px | 0 4px 0 14px |
| border | 1px solid `--border` | same |
| border-radius | 10px | 10px |
| background | `--surface-rail` | same |
| font-size | 13px | 13px |
| color | `--fg-body` | `--fg-body` |
| `b` (pod names) | color `--fg`; weight 600 | same |
| Data | pods with sharing on; pod sharing is decided on each pod, not here | same |

### Who-sees-them link (`.who2 span.lnk`)
| Property | Mobile | Desktop |
|---|---|---|
| Target | /friends (pods) | same |
| display | flex; align-items center | same |
| min-height | 44px | 44px |
| padding | 0 10px | 0 10px |
| font-family | 'IBM Plex Sans' | same |
| font-weight | 500 | 500 |
| font-size | 13.5px | 13.5px |
| color | `--accent-text` | `--accent-text` |
| white-space | nowrap | nowrap |
| Chevron | "›" text glyph in string | same |

### Kept back head (`.sech` with inline overrides)
| Property | Mobile | Desktop |
|---|---|---|
| String slot | label + " · " + count of kept cards | same |
| margin-top | 22px | 22px |
| border-bottom | 0 | 0 |
| min-height | 0 | 0 |
| padding | 0 (overrides desktop padding-bottom 8px) | 0 |
| font | Mono 500 10.5px, .14em, uppercase | same |
| color | `--fg-faint` | `--fg-faint` |

### Kept back line (`p.ex`, inline margin)
| Property | Mobile | Desktop |
|---|---|---|
| String slot | what kept back means | same |
| margin-top | 6px | 6px |
| font-size / line-height | 13px / 1.55 | same |
| color | `--fg-muted` | `--fg-muted` |

### Keep-a-card-back search (`.kpf`)
| Property | Mobile | Desktop |
|---|---|---|
| Behaviour | search over the reader's SPARE cards; picking one adds it to Kept back (`spare_keep`) | same |
| String slot | placeholder | same |
| margin-top | 12px | 12px |
| height | 44px | 40px |
| display | flex; align-items center | same |
| gap | 10px | 10px |
| padding | 0 12px | 0 12px |
| border | 1px solid `--border-strong` | same |
| border-radius | 10px | 10px |
| background | — (transparent) | same |
| color (icon + placeholder) | `--fg-faint` | `--fg-faint` |
| font-size | 14.5px | 14.5px |
| focus / typed / results list | not drawn | not drawn |

### Search icon (SVG in `.kpf`)
| Property | Mobile | Desktop |
|---|---|---|
| width × height | 18 × 18 | 18 × 18 |
| viewBox | 0 0 20 20 | same |
| fill | none | none |
| stroke | currentColor (`--fg-faint`) | same |
| stroke-width | 1.5 | 1.5 |
| linecap / linejoin | round / round | same |
| paths | `circle cx=8.6 cy=8.6 r=5.6`; `path d="M12.8 12.8 17 17"` | same |
| aria-hidden | true | true |

### Kept rows list (`.crows`)
| Property | Mobile | Desktop |
|---|---|---|
| Component | the SHIPPED collection row (READINESS eng 10), each with a ✕ | same |
| margin-top | 10px | 10px |
| display | flex column | same |
| gap | 6px | 6px |
| Drawn rows | 3 | 3 |

### Kept row (`.crow`)
| Property | Mobile | Desktop |
|---|---|---|
| display | grid | grid |
| grid-template-columns | 38px · minmax(0,1fr) · 76px · auto · 26px (qty, name, cost, set, ✕; type column hidden) | 52px · minmax(0,1fr) · 90px · 150px · 92px · 26px (qty, name, cost, type, set, ✕) |
| align-items | center | center |
| gap | 10px | 16px |
| padding | 10px 0 10px 12px | 12px 0 12px 18px |
| border | 1px solid `--border` | same |
| border-radius | 10px | 10px |
| background | `--surface` | `--surface` |

### Quantity (`.crow .q`)
| Property | Mobile | Desktop |
|---|---|---|
| String slot | "×N" copies held | same |
| font-family | 'IBM Plex Mono' | same |
| font-weight | 500 | 500 |
| font-size | 13px | 14px |
| color | `--accent-text` | `--accent-text` |

### Name block (`.crow .nm`)
| Property | Mobile | Desktop |
|---|---|---|
| layout | flex column; gap 2px; min-width 0 | same |
| name `b` font | 'IBM Plex Sans' 600 14px | 'IBM Plex Sans' 600 15px |
| name color | inherits `--fg` | same |
| name overflow | hidden; nowrap; ellipsis | same |
| type sub-line `span` | 11.5px; `--fg-faint`; ellipsis nowrap | display: none |

### Cost pips (`.crow .cp` / `.cpip`)
| Property | Mobile | Desktop |
|---|---|---|
| container | flex; justify-content flex-end; gap 3px | same |
| pip size | 15 × 15px, border-radius 50% | same |
| pip font | Mono 600 9px, color #14110E | same |
| generic pip bg | #C9C1B0 (drawn stand-in) | same |
| color pip bg | mana token, e.g. `--r` | same |
| Note | stand-in for the shipped mana sprite pip; build uses the shipped row's cost rendering | same |

### Type column (`.crow .tl`)
| Property | Mobile | Desktop |
|---|---|---|
| display | none | block |
| font-size | — | 12.5px |
| color | — | `--fg-muted` |
| overflow | — | hidden; nowrap; ellipsis |

### Set (`.crow .st`)
| Property | Mobile | Desktop |
|---|---|---|
| String slot | set code | same |
| font | Mono 10.5px (400) | same |
| color | `--fg-faint` | same |
| display | flex; align-items center; gap 8px | same |
| rarity dot `i` | display: none | 7 × 7px, border-radius 50%, bg = rarity color (drawn #C9AC62 mythic, #A59C89 common) |

### Remove ✕ (`.crow .x`)
| Property | Mobile | Desktop |
|---|---|---|
| Action | lets the card go again (removes from Kept back) | same |
| Glyph | "✕" text glyph, no SVG | same |
| display | flex; center/center | same |
| height | 100% of row | same |
| column width | 26px | 26px |
| font-size | 13px | 13px |
| color | `--fg-muted` | `--fg-muted` |
| hover / focus | not drawn | not drawn |

## Responsive variants (summary)
| Element | Mobile (390) | Desktop (1300) |
|---|---|---|
| Column | full width, 16px side padding | 720px centered |
| h1 | 22px | 28px |
| `.sec` gap | 26px | 34px |
| `.sech` | min-height 44px | min-height 32px + 8px padding-bottom |
| Stepper | 44px tall | 36px tall |
| Search | 44px tall | 40px tall |
| Row | 5 columns, type under name | 6 columns, type as its own column, rarity dot shown |

## State Coverage
| State | Trigger | What renders |
|---|---|---|
| Default threshold | `spare_min` unset | stepper shows 1 (today's behaviour) |
| Threshold drawn | value 2 | the drawn frame |
| Stepper at 1 | value = 1 | − must not step below 1; disabled styling NOT drawn |
| Stepper at 9 | value = 9 | + must not step above 9; disabled styling NOT drawn |
| Who sees them, pods sharing | ≥1 pod has spares sharing on | "Offered to" line naming pods in bold + "Friends ›" link (drawn) |
| Who sees them, no pods sharing | no pod shares | NOT drawn |
| Kept back with rows | `spare_keep` non-empty | head with count, line, search, shipped rows with ✕ (drawn, 3 rows) |
| Kept back empty | `spare_keep` empty | NOT drawn (head count presumably 0, search shown, no rows) |
| Search idle | no input | placeholder + icon (drawn) |
| Search with results | typing matches spare cards | NOT drawn |
| Search, no results | typing matches nothing | NOT drawn |
| Save failure | a write fails | shipped toast (board header) |
| Hover / focus on any control | pointer / keyboard | NOT drawn |
