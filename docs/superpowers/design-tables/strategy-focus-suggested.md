# Design Property Table — Strategy focus: Suggested changes

Source: `design/design_handoff_the99_strategy_focus/` (R2g, Green): README.md, READINESS.md, STATES-strategy-focus.md,
Focus-Flow.dc.html (sections 2 to 4, frames 390 and 1300) and Main.dc.html (calls 2 and 3). The board has no `@media` rules: the phone
is the `.ph` frame (390) and the desktop is the `.dk` frame (1300); a value with no `.ph` override applies at both widths.
Copy wording is not recorded as a property (copy-review owns it); only which string sits where. Fixture strings: focus `Tokens`, counts `11 → 12`.

Ruled scope (README call 2, READINESS ruled 5): the panel gains ONE manifest row, ONE lead sentence and the `focus` citation chip,
nothing else. "Nothing else in the panel moves" (Focus-Flow §2 caption).

## Component: Suggested changes panel (`.scp`) — context

### Panel container `.scp`
| Property | Mobile | Desktop |
|---|---|---|
| Layout | flex, column | flex, column |
| Gap | 14px | 14px |
| Child order (ready) | h3 · `p.lead` · `.mfr` · `.sact` | h3 · `p.lead` · `.mfr` · `.sact` |
| Child order (swaps / applied) | h3 · `span.scl` (read-from) · `.lhd` · `.lst` Additions · `.lst` Cuts | same |

### Heading `.scp h3`
| Property | Mobile | Desktop |
|---|---|---|
| Font | Cinzel 400, 17px, small-caps | Cinzel 400, 19px, small-caps |
| Color | `var(--fg)` | `var(--fg)` |
| Margin | 0 | 0 |

## Component: Manifest focus row (`.mfr div.new`)

### Manifest list `.mfr`
| Property | Mobile | Desktop |
|---|---|---|
| Layout | flex, column | flex, column |
| Gap | 6px | 6px |
| Rows, in order | Your games · Notes on your games · This list, against the recommended mix · **This deck’s focus** · What you own, and what a card costs | same |
| Position of focus row | 4th of 5: after "This list, against the recommended mix", before "What you own, and what a card costs" | same |
| Conditional rendering | Focus row present when the deck has a focus (only the with-focus state is drawn; README call 2) | same |

### Focus row `.mfr div.new`
| Property | Mobile | Desktop |
|---|---|---|
| Layout | flex, align-items center | flex, align-items center |
| Gap | 10px | 10px |
| Min height | 40px | 40px |
| Padding | 0 12px | 0 12px |
| Background | `var(--surface)` | `var(--surface)` |
| Border | 1px dashed `var(--accent)` (replaces the shipped rows’ 1px solid `var(--border)`) | 1px dashed `var(--accent)` |
| Border radius | 8px | 8px |
| Font | IBM Plex Sans, 13px | IBM Plex Sans, 13px |
| Label color ("This deck’s focus") | `var(--fg-body)` | `var(--fg-body)` |
| Board annotation (not product) | global `.new` also draws outline 1.5px dashed rgba(207,135,69,.75), offset 3px, radius 6px: the board’s "new" marker, also on `.fb new` | same |
| Hover | — (none specified) | — |

### Focus row leading square `.mfr div i`
| Property | Mobile | Desktop |
|---|---|---|
| Size | 14 × 14px | 14 × 14px |
| Border | 1px solid `var(--border-strong)` | 1px solid `var(--border-strong)` |
| Border radius | 4px | 4px |
| Flex | none | none |
| Focus-specific change | — (same as shipped rows) | — |

### Focus row value `.mfr div.new span` ("Tokens")
| Property | Mobile | Desktop |
|---|---|---|
| Placement | margin-left auto (right-aligned) | margin-left auto |
| Font | IBM Plex Mono, 10.5px | IBM Plex Mono, 10.5px |
| Color | `var(--accent)` (shipped rows’ value: `var(--fg-faint)`) | `var(--accent)` |
| Content | the focus axis name | same |

## Component: Lead sentence (never-run / ready lead)

### `.scp p.lead`
| Property | Mobile | Desktop |
|---|---|---|
| Font size | 13px | 13px |
| Line height | 1.6 | 1.6 |
| Color | `var(--fg-body)` | `var(--fg-body)` |
| Max width | 760px | 760px |
| Focus sentence placement | Appended as the LAST sentence of the same `<p>`, after "…suggest up to five cards to add and five to cut." No line break, no separate element | same |
| Focus sentence styling | — (plain text, no `<b>`, no accent) | — |
| Conditional rendering | Sentence present only with a focus (drawn only in the with-focus state) | same |

## Component: Read-from line (results states)

### `.scp span.scl`
| Property | Mobile | Desktop |
|---|---|---|
| Font | IBM Plex Mono, 10.5px, line-height 1.6 | IBM Plex Mono, 10.5px, line-height 1.6 |
| Color | `var(--fg-faint)` | `var(--fg-faint)` |
| Text align | left (inline style overrides `.ph .scl{text-align:center}`) | left |
| Position | directly under h3, above `.lhd` | same |
| Focus part placement | LAST segment: `… · your collection · focus Tokens`, joined by ` · ` | same |
| Focus part styling | — (same span, same color; no accent) | — |
| Present in | Swaps (§3) and Applied (§4) | same |

## Component: Citation chips (`.ln .cts` / `.ln .ct`)

### Chip row `.ln .cts`
| Property | Mobile | Desktop |
|---|---|---|
| Layout | flex, wrap | flex, wrap |
| Gap | 5px | 5px |
| Position in line | after `p` (reason), before `.bt` buttons | after `p` (reason); last child of `.ln` (buttons sit in `.l1`) |

### Base chip `.ln .ct` (shipped)
| Property | Mobile | Desktop |
|---|---|---|
| Layout | flex, align-items baseline | flex, align-items baseline |
| Gap | 5px | 5px |
| Padding | 3px 7px | 3px 7px |
| Border radius | 5px | 5px |
| Font | IBM Plex Mono, 9.5px | IBM Plex Mono, 9.5px |
| Background | `var(--surface-sunken)` | `var(--surface-sunken)` |
| Border | 1px solid `var(--border)` | 1px solid `var(--border)` |
| Kind label (`span:first-child`) | uppercase, letter-spacing .1em, `var(--fg-locked)` | same |
| Value (`span+span`) | `var(--fg-muted)` | `var(--fg-muted)` |

### Focus chip `.ln .ct.fo`
| Property | Mobile | Desktop |
|---|---|---|
| Shape / padding / radius / font / background | inherits base chip (3px 7px, 5px, Mono 9.5px, `var(--surface-sunken)`) | same |
| Border | 1px dashed `var(--accent)` | 1px dashed `var(--accent)` |
| Kind label "focus" | uppercase, letter-spacing .1em, color `var(--accent)` | same |
| Value ("Tokens 11 → 12") | color `var(--fg)` | `var(--fg)` |
| Value shape | `<axis> <before> → <after>`, one addition’s move (READINESS eng 3) | same |
| Order among chips | FIRST chip in `.cts`, before any shipped chip (`list`, `games`) | same |
| Can be sole chip | Yes (Brudiclad: focus chip only) | same |
| Sequential figures | Each addition’s figure continues from the previous (11→12, 12→13, 13→14) | same |
| Conditional rendering | Only on additions toward the focus; never on cuts | same |
| Hover | — | — |

### Cut chip "list · on none of the top 5"
| Property | Mobile | Desktop |
|---|---|---|
| Class | base `.ct` (no `.fo`); "Cuts cite as shipped" | same |
| Border / background | 1px solid `var(--border)` / `var(--surface-sunken)` | same |
| Kind label | "list", `var(--fg-locked)`, uppercase .1em | same |
| Value | "on none of the top 5", `var(--fg-muted)` | same |
| Order among chips | sole chip in its cut’s `.cts` | same |
| Conditional rendering | On cuts of cards on none of the top strategies (Main call 2); a cut cited otherwise keeps its own chip (Flickering Hound: `note` chip only) | same |

## Component: Suggestion line `.ln` (shipped; layout context for the chips)
| Property | Mobile | Desktop |
|---|---|---|
| Layout | flex, column | flex, column |
| Gap | 10px | 7px |
| Padding | 12px | 10px 12px |
| Border radius | 10px | 9px |
| Background / border | `var(--surface)` / 1px solid `var(--border)` | same |
| Child order | `.l1` · `p` · `.cts` · `.bt` | `.l1` (contains `.bt`) · `p` · `.cts` |
| Buttons `.bt` | margin 0, width 100%; `.ya`/`.no` height 44px, flex 1, radius 8px, 13px | in `.l1`, margin-left auto, gap 7px; height 32px, radius 7px, 12.5px |
| Ownership dot `.od` (additions) | between thumb and name; 7px circle, `var(--success)` | same |
| Focus-specific change | — | — |

## Component: Applied state (§4)
| Property | Mobile | Desktop |
|---|---|---|
| Answered rows `.ans2` | shipped: label ✓ added / ✓ cut, name, Undo; border 1px solid `var(--success)`; NO chips (focus chip not carried) | same |
| Remaining unanswered addition | keeps its focus chip with its original figure (`Tokens 13 → 14`), not recomputed | same |
| Read-from line | unchanged, still ends `· focus Tokens` | same |
| `.lhd` | shipped: "Apply the rest", tally updated | same |
| Focus-specific change | — beyond the above | — |

## State Coverage
| State | Trigger | Focus row | Lead sentence | Read-from `focus …` | Focus chip | Cut chip | Board |
|---|---|---|---|---|---|---|---|
| Ready, with focus (never run) | Open tool, deck has focus | shown, 4th row | shown, end of lead | n/a (not drawn) | n/a | n/a | Focus-Flow §2, 390 + 1300 |
| Ready, no focus | Open tool, no focus | not drawn (implied absent) | not drawn (implied absent) | n/a | n/a | n/a | not drawn |
| Focus changed since last run | Focus change | — | — | — | — | — | Not drawn; Main call 2: counts as new input, "Suggest again" is offered |
| Swaps | Run returns | n/a | n/a | shown, last segment | on each addition toward focus, first | on cuts off the top 5, sole chip | Focus-Flow §3, 390 + 1300 |
| Applied (partial) | Add / Cut | n/a | n/a | shown | on remaining addition only | answered cut rows carry none | Focus-Flow §4, 390 + 1300 |
| Addition not toward focus | — | — | — | — | absent | — | Not drawn |
