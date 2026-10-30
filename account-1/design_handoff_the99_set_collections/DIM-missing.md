# The dim — what "missing" looks like, and why it survives six themes

The dimmed-missing cell is the feature. This file is the treatment, its three carriers, and the
measurements.

## The rule, in one sentence

**The dim is on the art, never on the type.**

That is the whole separation from *disabled*. A disabled control in this app dims its **label** to
`--fg-locked`, flattens to `--surface-sunken`, and stops responding. A missing cell dims its
**picture** and nothing else: the name stays at `--fg-body`, the price is live, the rarity and number
are unchanged, and the cell opens the same card-detail modal an owned cell does. It is *absent*, not
*inert*.

## The three carriers

A state carried by one signal fails someone. This one is carried by three, in different channels:

| | Owned | Missing | Channel |
|---|---|---|---|
| **Art** | `opacity: 1` | `opacity: .28; filter: saturate(.55)` | tone |
| **Edge** | `1px solid var(--border)` | `1px dashed var(--fg-locked)` | structure |
| **Caption** | number · rarity | number · rarity · **price tag** | content |

Greyscale alone fails the reader scrolling fast past a dark-arted card. The edge alone is a hairline.
The tag alone is 40px of a 196px cell. Together they survive a colour-blind reader, a dimmed phone in
sunlight, and a screenshot posted at half size.

**The owned cell has no positive frame of its own.** `--border` solid is nearly invisible on purpose —
the full-strength art is the signal, and a bright frame around 62 cells would out-shout the 214 the
page exists to show.

## Why it survives six themes: the dim is not a colour

Nothing in the treatment is a chosen value. The missing plate is *the art itself*, at `.28` over
`var(--surface-sunken)`. The theme supplies the floor, so the composite self-corrects: on a warmer
ground it lands warmer, on a cooler ground cooler, and the **step** between owned and missing stays
constant because it is a ratio of the same image against itself.

Measured against a mid-luminance art sample (`#8A7F6E`, chosen as a neutral stand-in for real card
art), the owned-to-missing step:

| Theme | Step | Missing composite |
|---|---|---|
| Low Sun | 3.22:1 | `#38322A` |
| Neon Rain | 3.30:1 | `#323131` |
| Oil Haze | 3.42:1 | `#322E2C` |
| First Frost | 3.15:1 | `#363434` |
| Canopy | 3.25:1 | `#32332C` |
| Witching Hour | 3.35:1 | `#342F30` |

**Spread 0.29 across the set**, always above the 3:1 non-text floor, never so large the art stops
being art. Note the caveat honestly: real art varies in luminance far more than the sample does, so
the figure is a property of the treatment, not a guarantee per card. What is guaranteed is that the
step is the same *operation* everywhere.

## The finding that changed the design

The first draft edged the missing cell in **`--border-dashed`** — dashed is already this app's *not
settled* vocabulary (the empty partner plate, the import proposal, `Building`'s pill). Measured
against the sunken plate:

| Theme | `--border-dashed` | `--fg-locked` |
|---|---|---|
| Low Sun | 1.81:1 | 3.22:1 |
| Neon Rain | 1.60:1 | 3.19:1 |
| Oil Haze | **1.46:1** | 3.16:1 |
| First Frost | 1.93:1 | 3.32:1 |
| Canopy | 1.97:1 | 3.44:1 |
| Witching Hour | 1.81:1 | 3.31:1 |

`--border-dashed` fails the 3:1 non-text floor in all six. It is correct as a whisper *beside* a filled
shape — every other dashed line in the app decorates something the reader has already found. This one
has to be found.

**The style stays and the token changes:** `1px dashed var(--fg-locked)`. Generalisable, and worth
recording: *a dashed line that carries state takes a foreground token, not a border token.*

## Text that sits on or beside a missing cell

| String | Token | Range across six |
|---|---|---|
| Card name | `--fg-body` | 9.18 – 9.98:1 |
| Price | `--accent` | 4.42 – 9.26:1 |
| Collector number | `--fg-muted` | ≥ 6:1 |
| Rarity letter | `--fg-locked` | 3.16 – 3.44:1 (label, ≥3:1 floor — it is a redundant restatement of a filter) |

**No string on a missing cell is dimmed.** The name in particular must never take `--fg-faint` or
`--fg-locked`: the game-log package already ruled that `--fg-locked` at ~2.8:1 is the one string that
cannot afford to be hard to read, and the name is the only thing in a dimmed cell a reader can match
against memory.

## What must never share this treatment

- **Loading cells** — `--surface-inset` plate, **solid** `--border` edge. A pending cell that wears the
  missing dim tells the reader they do not own a card they might.
- **Disabled controls** — they dim the label; this dims the picture. The two must not converge.
- **Extras cells** — an extra you do not own is missing in exactly the same way. No third treatment.
