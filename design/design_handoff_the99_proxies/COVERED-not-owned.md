# COVERED IS NOT OWNED — the contract, and its measurements

The one rule this feature can break, and the pixels that hold it.

`src/lib/copy/availability.ts` states the governing constraint in its own header:

> Nothing here may assert where a physical card is: we describe LISTS, never boxes, binders or
> sleeves.

A proxy is the first feature that can break it, because it is the first thing that fills a slot with
no card behind it. Everything below is that rule applied.

---

## 1 · The three facts, and which pixel owns each

| Fact | Owner | Never says |
|---|---|---|
| Is this card in your collection? | **The ownership dot.** Hollow dashed on a proxied row, always. | Anything about decks. |
| Is this deck's slot filled? | **The proxy tag**, and the absence of a buy tag. | Anything about the collection. |
| Does this card claim a copy? | **The availability marker**, which renders nothing, because it does not. | Anything at all — silence is the state. |

The three are independent, and a proxied row is the only place in the app where they disagree in this
particular combination: *not owned · slot filled · claims nothing*. **Every drawing in the handoff is
built so all three can be read separately.** Collapsing any two of them is how the app would come to
say the player owns something they printed.

---

## 2 · What must not change when a card is proxied

- **The ownership dot.** Not filled, not half-filled, not a third state.
- **`owned`, anywhere in the model.** The spec is explicit: `owned` stays a fact about the
  collection and a second figure says the slot is covered.
- **`Availability.claims`.** The proxying decks ride alongside on their own field. Folding them in
  makes `hardDecks`, `pullSources`, the markers and the pull authorization subtract cardboard that
  does not exist.
- **The receipt's split line.** `in use + free === owned` holds unchanged, because a proxying deck
  was never a term in it. The hairline above the proxy list is the boundary of the arithmetic.
- **The collection's own counts, filters and figures.** Nothing on `/collection` moves when a proxy
  is marked. The list route is the only new collection surface, and it counts proxies, not cards.

---

## 3 · The words

| Ships | Refused | Why |
|---|---|---|
| `P` (the mark), decoded as *proxy* by the key, the `title` and the accessible name | `have it`, `sorted` | Ownership in a shorter word. |
| | `covered` | States the effect and hides the cause; the cause is the only thing a player can act on. |
| | `printed` | One letter from *printing*, on a surface that ships a printing picker. |
| *This deck's slot is filled. Nothing is claimed from your collection.* | *You're covered* alone | True and incomplete. The second clause is what stops a reader inferring a purchase. |
| `Running a proxy` (receipt heading), no figures | `prints 1`, `holds a proxy` | Both print a quantity of an object that does not exist. Ruling 5. |
| `Complete` + *7 of these are proxies* | `Complete*`, a sixth pill | A proxied deck is finished. Inventing a lesser word for it is a judgment the app has no business making. |
| *What you're printing* (page title) | *Cards you don't own* | Describes half the collection, not this list, and turns a decision into a deficiency. |

**The glyph is never the only carrier.** Three of them, always: the key on the surface, a `title` for
a pointer, and the full word in the accessible name. That is `BuyTag`'s own arrangement at collapsed
density, not a new one — and it is what makes a one-character mark safe to use for a fact the app must
not be vague about.

**`covered` is legal in prose and illegal as a label.** It is the right word in a sentence that also
names what did not happen; it is the wrong word alone, on a tag, where it reads as a state the app
has granted rather than a choice the player made.

---

## 4 · Contrast, measured

The feature's only new colour decision is the dashed edge. Measured against `--surface-rail`, the
decklist row's ground and the darkest surface the tag ever sits on. The 3:1 floor applies: this is a
non-text boundary carrying state.

| Theme | `--fg-locked` | `--surface-rail` | Ratio |
|---|---|---|---|
| Low Sun (amonkhet) | `#6E6654` | `#1A1611` | **3.16:1** |
| Neon Rain (kamigawa) | `#606476` | `#12141B` | **3.14:1** |
| Canopy (ixalan) | `#626E5E` | `#121814` | **3.35:1** |
| Oil Haze (phyrexia) | `#64616A` | `#110F13` | **3.14:1** |
| Witching Hour (eldraine) | `#6A6475` | `#15121B` | **3.26:1** |
| First Frost (kaldheim) | `#5F6D6E` | `#181920` | **3.25:1** |

`--border-dashed`, the obvious first choice, fails in all six — `set_collections` measured it at
1.46–1.97:1 against a comparable plate. The general rule stands and is restated here: **a dashed line
that carries state takes a foreground token, not a border token.**

The glyph itself takes **`--fg` at weight 600**, which is text and owes 4.5:1, and measures **11.3:1
(First Frost) to 14.4:1 (Low Sun)** against `--surface-rail`. That is a step above the `--fg-body` the
five-character word used to take, and the lift is where the eye-catching quality comes from without
spending a hue.

**The mark and the card name are now the same token**, which reads as a defect and is not one: no
theme can tell them apart by ink and none has to, because the box says *mark* and the ink is only
there to be read. It is also why the narrowest ink ramp of the six — First Frost, `--fg #C6D2D3`
against `--fg-body #B3C0C2` — costs this feature nothing.

### The one exception
The commander caption sits on an art crop, where no ratio is guaranteed. The `band` variant restores
it with `color-mix(in oklab, var(--bg) 92%, transparent)` behind the tag — `BuyTag`'s own tile scrim,
at its own opacity, applied unconditionally. **Unconditional matters:** a scrim that varied with what
was behind it would be a primitive deciding how to look from its own content, which is the defect
`BuyTag`'s comment already warns about.

**Unverified:** nobody has rendered a 9px dashed hairline over a real bright art crop at this scrim.
It is the same class of risk `set_collections` filed against real art luminance, and it is the one
measurement in this package taken from a precedent rather than from the thing itself.

---

## 5 · Why the feature spends no colour

Every hue in this app is booked. `--accent` is *in use / to buy*. `--warning` is money. `--success` is
complete. `--danger` is over-committed. A proxy is none of those, and the one thing it must never say
is *owned* — which rules out the two tokens (`--success`, `--accent`) that would otherwise be the
obvious reach.

What is left is the text ramp and the chrome, and that turns out to be enough — and the glyph makes it
more than enough. **One bright character in a 20px box is a higher-contrast, more distinctly-shaped
object than five 9.5px characters were**, so collapsing the word to `P` and lifting it to `--fg` at
weight 600 bought the eye-catching quality colour was being asked for, without spending a hue.

**And a hue would not have scaled.** Marks are becoming a family, and there are 26 letters against
four hue families, all booked. Assigning a colour per mark runs out by the third one; assigning a
glyph per mark does not. So the system is: one shared skin, the glyph identifies, the key decodes.
§1b of the canvas draws the alternatives, including the one that spends `--accent` — which is a
legitimate choice, and a deliberate change to what accent means rather than a free win.

The dividend is that the six-theme matrix is free: every value in the feature is a text-ramp or
chrome token, so no per-theme variant exists anywhere, no geometry changes, no state is drawn
differently, and a seventh theme costs nothing. Greyscale and `forced-colors: active` survive for the
same reason — nothing here is distinguished by hue in the first place. Compare the buy tag, whose
whole signal is a warning-coloured plate.
