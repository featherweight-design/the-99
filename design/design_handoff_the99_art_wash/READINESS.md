# Readiness Review — Commander art wash · scrim recovery

**Verdict:** 🟢 Green on everything except one value pair, which is 🟡 **pending
re-ratification (2026-09-11): the `.28` / `.22` ambient half of the band lift is no longer
drawn.** See the errata at the foot of this file; nothing else in this review is affected.
**Audited:** 2026-09-09 (R1 Orange, same day; R2 Green after Design took all three corrections)
**Related ticket(s):** none filed — the handoff arrived as a direct design drop.
**Deliverable:** `The 99 - Scrim Recovery.dc.html`. The R6 amendment
(`The 99 - Art Wash Readability v2.dc.html`) remains current for geometry and is superseded
only on opacity and ramp values.

## Summary

The readability amendment fixed legibility and overcorrected. At art `.58` under the shipped
ramps only 33–45% of the picture survives mid-band, which reads as a dimmed screen rather
than a design. This round lifts art to `.80` on cover bands and `.92/.28` on rows, and pays
for it by holding each ramp's dark value across its whole label block instead of ramping
through it.

The round also fixes a live accessibility defect that predates it: on Home's ready-to-build
card and every deck card, the top ramp reaches its dark value at the title and then lightens
through the subtitle, landing that line at **3.16:1** against a white pixel — under the
4.5:1 floor. **3.16:1 is the canonical figure** for that defect everywhere in this handoff:
Design's measurement, reproduced independently against `globals.css` and the shipped
`COVER_SCRIM_STOPS`. My own recompute lands at 3.17:1 and one card in the canvas cites
3.15:1; those are rounding of the same theme token, not three measurements, and neither is
near enough the 4.5:1 floor for the difference to matter.

R1 of this canvas was returned Orange for three mismatches against the code. R2 corrected all
three and adopted the measured figures verbatim. What remains is eng-side work, ratified
below rather than sent back — Design's context budget on this handoff is spent, and none of
the open points needed a drawing.

## Per-dimension findings

### 🗺️ Scope clarity

- [✅] Nine washed surfaces enumerated, each drawn ships-today against proposed, with the
  binding ink named per surface.
- [✅] The one change the round declines to make is stated and reasoned: moving the phone
  row's type off the portrait is a layout change, so it is left as a separate proposal.
- [✅] R2 records its own three corrections inline so they are not reintroduced by a later
  export.

### 🎭 State coverage

- [✅] `prefers-reduced-transparency` is untouched: `REDUCED_ART_OPACITY` stays a ceiling
  applied through `min()`, so the lift cannot raise art under that preference.
- [✅] `forced-colors: active` is untouched — art drops entirely, and no ramp value reaches it.
- [✅] The no-art fallback is untouched: `commanderGradient()` is identity, not photography,
  and keeps its opacity.

### 🔌 Data contract

- [✅] No schema, query or payload change. Every value in this round is a constant in
  `src/components/ui/art-wash.tsx`.

### ♿ Accessibility

- [✅] Every proposed value verified independently across all six themes, worst case being a
  pure white pixel directly behind the glyph.
- [✅] Hero pips: Design measured 4.01–4.09:1 for the lightest pip (`--w`) at art `.80` under
  a `.50` stop. Measured here at **4.01–4.24:1**; the floor matches exactly and a pip is a
  non-text component at 3:1. The deliberate omission of a hairline stands.
- [🟡] **The 148 row's rank glyph cannot be fixed by this round.** See ratification 3.

## Ratifications

Settled here, on the evidence below, rather than returned to Design.

### 1. The phone hold is `.70`, not `.78`

Design proposed holding the 148 band's vertical scrim flat at `.78` at phone width. Body ink
needs only `.65` to clear the floor, and the hold is the only thing standing between the
reader and the art on that surface:

| hold | art visible mid-band | worst-case title | worst-case body |
| --- | --- | --- | --- |
| `.66` | 31% | 5.97:1 | 4.66:1 |
| **`.70`** | **28%** | **6.56:1** | **5.12:1** |
| `.74` | 24% | 7.20:1 | 5.61:1 |
| `.78` | 20% | 7.89:1 | 6.21:1 |

`.78` buys margin at the cost of the thing this round exists to recover — Design's own
README calls the result "darker than what this document exists to fix." `.70` keeps a
0.62 margin over the floor and shows 40% more of the picture. Ratified with Hugh 2026-09-09.

### 2. The hold is breakpoint-switched, not band-wide

`BANDS[148].vertical` is one gradient across the whole band, and phone and desktop share it.
A band-wide flat hold would take the **desktop** portrait from 67% visible to 20% — the exact
inversion of the brief:

| 148 portrait, mid-band | today | with lift | flat hold band-wide |
| --- | --- | --- | --- |
| desktop | 67% | 77% | 20% |

So band 148's vertical scrim resolves to the flat `.70` below `sm` and to today's
`[62, 16, 42, 74]` above it. Bands 168 and 72 are unaffected: 168 prints its type past the
240px flat stop at every width it is rendered at, and 72 has no vertical ramp at all.

### 3. The rank glyph is out of scope, and no scrim value could fix it

The 148 row's rank number is text — `--fg-faint`, or `--accent` at rank 1 — and at phone
width it sits at x=13px, on the portrait. It reads 2.06–2.64:1 today, 1.87–2.39:1 under the
lift alone, and 2.75–3.53:1 even under the hold. But `--fg-faint` measures **4.12:1
(kamigawa)** and **4.29:1 (phyrexia)** against flat `--bg` with no art present at all. The
token is under the floor app-wide, on every surface that uses it, and no value of any scrim
can raise ink above its own contrast on bare ground.

This round therefore improves the glyph without repairing it. The repair is a token change
with an app-wide blast radius and belongs to its own piece of work.

### 4. Decision 8's flat stop is a model, not the shipped value

The canvas models the horizontal scrim's fourth stop as `w + 10`. Shipped: 168 → 240 ✓,
148 → **264** (not 213), 72 → **138** (not 109). Drawing fidelity only — the code's stops are
the specification, and no ruling in this round depends on the difference. Recorded so a
future reader does not "correct" the code toward the model.

## Implementation

Four PRs. The first two are independent of the lift and fix existing failures.

1. **Top ramp** — `COVER_SCRIM_STOPS.top` → `[[78,0],[73,31],[14,62],[50,100]]`. Fixes the
   3.16:1 subtitle on Home and every deck card. `wash-contrast.test.ts` samples only 0% and
   100% today, which is why this shipped; it gains a mid-band assertion.
2. **Bottom ramp** — derived from the label position rather than a shared constant:
   `[[44,0],[14,round(labelAt*0.48)],[73,labelAt],[88,100]]`, with `labelAt` 68.1 for the
   commander detail hero and 66 for the deck spine. Retires the test's `BOTTOM_AT_LABEL = 54`
   estimate, which is the same overshoot this canvas was written to correct.
3. **Art lift** — `COVER_ART_OPACITY` `.58` → `.80`.
4. **Band lift and the phone hold** — 168 and 148 to `.92/.28`, 72 to `.95/.22`, plus
   ratification 2. `wash-contrast.test.ts` covers the cover strategy only, which is precisely
   why the phone row went unmeasured through two drafts; it is extended to all three
   `left-portrait` bands at their real ink positions.

## Open items

- **The phone row's layout.** Design's standing recommendation is to move the type off the
  portrait at phone width, as desktop already does, which would remove the need for any hold
  and let that surface take the full lift. Not in this round: the portrait is 203px of a
  390px screen, so it is a redesign of the row rather than a value change.
- **`--fg-faint` below 4.5:1 in kamigawa and phyrexia.** See ratification 3. App-wide, not
  art-wash-owned.

---

## Errata — the ambient half of the band lift is no longer drawn (2026-09-11)

**What changed.** The band lift this review ratified has two halves per `left-portrait` band:
a sharp masked portrait, and under it the same `art_crop` drawn `cover` across the whole band —
`.92/.28` on the 168 and 148 bands, `.95/.22` on the 72. The second half is gone as of PR #517.
The first is untouched, and so is every ramp and hold this round ratified.

**Why.** Past the portrait's own width, that ambient layer is a second rendering of the same
picture at a different scale, sitting behind the first. It reads as a double image — reported
with a DevTools capture showing both layers inside one band, and most visible while a window
resizes and the two scalings move against each other. The horizontal scrim already closes the
portrait out into the row's ground, so nothing else rested on it.

**What survives it.** Decision §G of `design_handoff_the99_deck_details_wash` — *identity
gradient in the ambient layer only* — is preserved exactly: with no crop, the full-bleed layer
is still what draws that gradient, for the reason §G gives. And the contrast floors this review
turns on still hold, in the safe direction: removing a lightening layer can only darken the
ground ink stands on. `wash-contrast.test.ts` passes with its composition model updated to match
what the component now stacks, and `scripts/probe-art-wash.mjs` fails if any band draws the crop
twice again.

**Status: pending ratification.** This was taken as the defect exactly as reported, without a
Design round-trip, so the verdict above is Green on everything except this one value pair. If the
ambient atmosphere is wanted back, it needs a treatment that does not restate the crop — a blur
past the mask edge, or a flat tint sampled from the art are the two candidates. Ratify or overturn.
