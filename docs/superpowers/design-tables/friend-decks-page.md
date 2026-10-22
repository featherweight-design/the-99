# Design Property Table — Friend decks: a friend's deck, read-only (PR 2)

Source: `design/design_handoff_the99_friend_decks/Friend-Deck.dc.html` and `States.dc.html` (R2). Copy is structure only
here; the words are `/copy-review`'s. New against the shipped precon page (orange dashed on the board): the eyebrow,
the own band, the key line, the empty box.

## Component: FriendDeckView

### Header block
| Property | Mobile | Desktop |
|---|---|---|
| display / direction | flex column | flex column |
| gap | 12 | 12 |
| padding | 12 16 14 | 16 26 18 |
| border-bottom | 1px var(--border) | 1px var(--border) |

### Back link
| Property | Mobile | Desktop |
|---|---|---|
| font | var(--font-mono) 11 | same |
| color | var(--fg-faint) | same |
| text key | back(friend name) → `/friends/{publicId}/decks` | same |

### Head row
| Property | Mobile | Desktop |
|---|---|---|
| display | flex, align start, gap 12 | same |
| thumb | 46×64 r6 1px --border-strong (CommanderThumb open) | 56×78 (openWide) |

### Eyebrow (new)
| Property | Mobile | Desktop |
|---|---|---|
| layout | flex, gap 6 | same |
| font | mono 9.5, tracking .08em, uppercase | same |
| color | var(--fg-faint) | same |
| face | 16×16, r5, 1px --border-strong (owner's face; initials fallback) | same |
| text key | eyebrow(friend name) | same |

### Title
| Property | Mobile | Desktop |
|---|---|---|
| font | display (Cinzel) 400, 22/1.15 | 26 |
| color | var(--fg) | same |

### Commander line
| Property | Mobile | Desktop |
|---|---|---|
| font | 13.5 | same |
| color | var(--fg-body) | same |
| condition | absent when the deck name repeats the commander (whole, or before the comma) | same |

### Meta
| Property | Mobile | Desktop |
|---|---|---|
| layout | flex, gap 8, wraps | same |
| font / color | mono 11, var(--fg-faint) | same |
| order | "N cards", identity dots (10px, gap 3), colour name | same |

### Own band (new)
| Property | Mobile | Desktop |
|---|---|---|
| border / radius / bg | 1px --border, r10, --surface-sunken | same |
| padding / gap | 11 13 / 8 | 12 16 / 8 |
| line | "You own" + figure (mono 600 15 --fg) + "of its cards", 14 --fg-body | same |
| bar | 3px, r2, track --border-strong, fill --fg-muted at the owned share | same |
| shared-deck line | 12.5/1.55 --fg-body, the viewer's deck sharing it (precon's builtSame / builtAny) | same |
| condition | absent on an empty deck | same |

### List note row
| Property | Mobile | Desktop |
|---|---|---|
| layout | space-between, gap 12 | same |
| note | mono 10.5 --fg-faint, phone note key | desktop note key |
| toggle | List / Cards (ViewToggle), List on | same |
| condition | absent on an empty deck | same |

### Key line (new)
| Property | Mobile | Desktop |
|---|---|---|
| padding | 10 16 0 | 10 26 0 |
| font / color | mono 10.5 --fg-faint, gap 6/14 | same |
| lead | "Your collection", 9.5, tracking .12em | same |
| entries | filled 9px --success dot "you own it"; dashed 9px --fg-locked dot "you don't" | same |
| condition | absent on an empty deck | same |

### List
| Property | Mobile | Desktop |
|---|---|---|
| wrapper padding | 12 16 | 14 26 |
| groups | DecklistGroup readOnly, owner's grouping (type, A–Z), Commander first | same |
| group header note | — (phone draws none) | "you own N of M", mono 11 --fg-muted, right |
| rows | DecklistRow readOnly: dot, name, pips; 44 tall | 34 tall, + printing column 66 mono 10 |
| basics | dashed line at foot of Lands, "{Basic} ×n" + "basic · not counted" | same |
| card view | ReadOnlyCardTile, as the precon (not drawn, G6) | same |

### Card details
| Property | Mobile | Desktop |
|---|---|---|
| surface | the shipped sheet, unchanged; Add to wishlist in the full sheet | the shipped modal; Wishlist box |
| printing | the owner's | same |

### Absent (both widths)
Status pill, bar, to-buy figure, prices, buy tags, ✕, stepper, auto tag, proxy, lock, to-do card, tabs, notes, Update,
Export, ⋯.

## State Coverage — FriendDeckView

| State | Triggering condition | Component rendered | Key props required |
|---|---|---|---|
| Deck | loadFriendDeck returns a page with cards | full anatomy | deck, friend |
| Long list | 99 cards | every card, no paging | — |
| Empty deck | page.cards = [] (owner includes drafts) | meta "0 cards", Commander group, dashed box (r12, 1px --border-dashed, 22/20 phone, 30/32 desktop, gap 6; title display 700 18; body 14/1.6 --fg-muted max-w 600); no own band, note row or key | commander name, friend name |
| Gone | loadFriendDeck null (hidden, deleted, unfinished, decks off, not friends) | the app's 404, unchanged | — |
