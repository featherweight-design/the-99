# Motion — with no motion token set

The app has no duration or easing tokens. Durations are literals in `globals.css:524-536`. This
file is what that constraint forces, and every static state it obliges.

## The rule this handoff adopts

**Quote an existing literal, or justify a new one against the two that ship.** The two known motion
facts in this project's record are the filter sheet's `0.18s ease-out` and the printing region's
disclosure at `160ms`. Everything below sits in that family or says why it does not.

> ⚠ `globals.css:524-536` was **not readable** from this project, and review has carried this into
> the spec as errata. If the literals there disagree with the four below, **prefer them** — the axis,
> the swap point and the static states do not move.

## The two animations

### 1 · The zoom layer

| | value | why |
|---|---|---|
| **open duration** | `200ms` | One step above the sheet's 180. A 520px card arriving instantly reads as a jump cut; arriving over 200ms reads as being picked up. |
| **open easing** | `ease-out` | The sheet's curve. No new easing enters the app for an opening. |
| **open transform** | `opacity 0→1`, `scale(.94)→1` | Scale from **.94, not .8** — it is the same card getting closer, not a new object appearing. |
| **close duration** | `160ms` | Deliberately shorter than open: arriving is a reveal, leaving should be gone before the hand is. 160 is the disclosure's literal, reused. |
| **close easing** | `ease-in` | |
| **scrim** | fades with the layer, same timings | One element, one transition. |

### 2 · The flip

| | value | why |
|---|---|---|
| **axis** | `rotateY` | How a hand turns a card. `rotateX` tumbles it end-over-end and reads as a page turning — the wrong metaphor for an object you are holding. |
| **duration** | `320ms` | **The one new literal.** Above 160 (an object moving, not a box opening — at 160 a 520px card glitches); below 500 (a second press must never queue, and comparing faces is a repeated press). |
| **easing** | `cubic-bezier(.2,.7,.2,1)` | Fast out of rest, settles long. A linear turn reads mechanical; `ease-in-out` reads slow at this size. |
| **perspective** | `1400px`, on the layer | Shallow enough to be a turn rather than a lens. |
| **face swap** | at `160ms`, the midpoint | Behind the edge, so neither face is ever seen mirrored. |
| **backface** | `backface-visibility: hidden` on both | |
| **re-press mid-turn** | reverses from the current angle | Never queues, never double-turns. One boolean, read at the press. |

## The static states — one per animation, named

There is no global switch to inherit, so each animation carries its own `prefers-reduced-motion`
block. **Neither is a disabled feature.** The zoom still opens; the card still turns over.

```css
@media (prefers-reduced-motion: reduce) {
  /* 1 — the zoom layer: present or gone, at full opacity, no scale, no fade.
     A fading scrim is the same vestibular problem at lower contrast. */
  .card-zoom, .card-zoom__scrim { transition: none; transform: none; }

  /* 2 — the flip: face replaces face. This is not a fallback invented for
     reduced motion — it is the swap card surfaces already ratified for this
     control, so the static path IS the shipped path and the animated one is
     the amendment. */
  .card-zoom__face { transition: none; transform: none; }
}
```

**Do not write a global `transition: none`.** The modal has shipped transitions of its own and they
are not this handoff's to switch off.

## What is deliberately not animated

- **The header's collapse to the compact row.** The tag moving out of the art and into the name
  block is instant, and so is the `⤢`'s withdrawal. The collapse is a layout response to the
  picker, not an event of its own.
- **The price tag.** It appears and disappears with a pick. A figure that animates invites reading
  the animation as *the price changed*, which it did not — a different printing did.
- **The art column's height change** on absent → priced. 30px, instant.
- **The un-zoomed flip.** Card surfaces ratified a swap and this handoff keeps it. **Zero net motion
  survives everywhere except inside the zoom** — which is the whole scope of Amendment 3.
- **The scrim's blur.** `backdrop-filter` is set at its final value on the first frame. Animating a
  blur is expensive and, at 10px, invisible.

## Net

**One animation added to the app** (the flip) and **one transition on a new element** (the layer).
Three of the four durations are already in the codebase. The fourth, 320ms, is argued above and is
the only number here worth an opinion.
