# Gap report — Art Wash Readability

Verified against `docs/superpowers/design-tables/art-wash.md`, which enumerates
`design/design_handoff_the99_art_wash/` (README, READINESS, `… v2.dc.html` — the deliverable).

## Scope

The plan is the wash and nothing around it: "The phone layout keeps its two-band content
arrangement; **only the art behind it changes**"
(`docs/superpowers/plans/2026-09-08-art-wash-readability.md`). The v2 canvas also redraws the
chrome on all four surfaces — label blocks, status-chip placement, pip sizes and rings, deck-grid
columns, the commander row's whole data zone, resume-row radii and type. That chrome shipped in
#437 / #438 and is not what this amendment was asked to change. Those differences are recorded
below as **out of scope**, not as gaps.

## Visual gaps — found and fixed

All four were transcription drift between the canvas and the plan's code block; the canvas is
authoritative and the code now matches it.

1. `src/components/ui/art-wash.tsx` — `left-portrait` @ 148 — **Layer D was missing entirely.**
   The canvas commander row draws a fourth layer, `linear-gradient(180deg, .62 0%, .16 42%,
   .74 100%)`. The row prints its rank, name and fit over the full height of the art, so the art
   needs damping vertically as well as horizontally. Added, and only at 148 — the resume row's
   type starts clear of the portrait, and the canvas draws no vertical scrim there.
2. `src/components/ui/art-wash.tsx` — `left-portrait` @ 72 — horizontal scrim alphas were the
   148-band's (`.30 / .26 / .78`); design is `.22 / .18 / .80`. Stop positions were already right.
3. `src/components/ui/art-wash.tsx` — `left-portrait` @ 72 — every stop, and the L1 plate,
   resolved to `var(--bg)`. The canvas resolves them to the row's **own** ground (`#181410`, the
   resume row's background), so the art fades into the row rather than into a darker patch of its
   own. Now derived from `band` — `--surface-inset` at 72, `--bg` at 148 — so no call site can
   invent a ground (READINESS eng clarification 8).
4. `src/components/ui/art-wash.tsx` — sharp portrait `background-position` was `left top`; design
   is `left center`. Visually inert at `background-size: auto 100%`, corrected anyway. Also added
   the constants table's `background-repeat: no-repeat` to the cover and ambient art layers, and
   the mask's explicit `transparent 100%`.

## Accessibility gaps — found and fixed

5. `src/app/globals.css` — the reduced-transparency rule set **every** art layer to a flat
   `opacity: 0.3`. That raises a `left-portrait` ambient copy from `0.14`/`0.20`, answering a
   request for less transparency with more art. The component now publishes
   `--art-wash-reduced-opacity` per layer as `min(layer, 0.3)` — a ceiling, never a floor — and
   the media query reads it.
6. `src/app/globals.css` — the rule replaced `.art-wash-scrim`'s background on **every** strategy
   with the handoff's 180deg ramp. On both `left-portrait` surfaces that deleted the 90deg,
   px-keyed fade the strategy exists for. The override is now scoped to
   `.art-wash-scrim-cover`; a portrait row carries the preference through its art layers alone.

## Found in Copilot review round 1 — fixed

7. `src/app/globals.css` — the reduced-transparency cover scrim collapsed to three stops. READINESS
   eng clarification 7 restates three alphas, but the base gradient has four; the design table
   (`design-tables/art-wash.md:741-746`) keeps the `0 / 40 / 74 / 100%` positions and retains stop
   four at `.86`. Now `95 / 60 / 85 / 86` across the original four positions.
8. `src/components/ui/art-wash.tsx` — `--art-wash-reduced-opacity` was a ceiling on *every* layer,
   including the no-crop identity gradient at `1`, so a reduced-transparency reader saw that
   gradient at `0.3` — the preference muting the one identity signal the row has. `reducible` now
   takes whether the layer is art; a gradient publishes its own opacity.

## Deliberate deviations from the handoff

Not defects. Sorted with Hugh on 2026-09-08: the first two are settled eng-side and ask Design
nothing, the last two are visible and go back as one prompt. Both of those ship live while Design
rules — each is the more readable of the two readings, and reverting mid-review would redraw the
same surface twice.

**Settled eng-side, no round-trip.**

- **`!important` in both media queries.** `<ArtWash>` sets opacity and gradients inline because
  both are computed from the band, and an inline declaration outranks any plain selector. A
  mechanism, invisible in the drawing.
- **`forced-colors: active` drops the art rather than re-tuning it** — READINESS eng
  clarification 7, already flagged there as extending the handoff's intent, and audited as such.

**Open with Design, shipped live.**

- **The status chip's fill mixes into `var(--bg)`, not into `transparent`**, giving an opaque
  plate at every alpha behind one uniform `1px solid var(--border-strong)`. README §3 asks for an
  opaque fill plus a hairline. **Side effect: `Building` loses the `--border-dashed` border
  ratified earlier**, and the four signal statuses lose their colour-faded edges. All six now
  carry the same hairline, because a 50% fade of the status colour was the worst-reading edge in
  the report and the wash rules ink over art to full opacity.
- **The no-art identity gradient renders at full opacity**, not at the art layer's. README says
  "the existing colour-identity gradient at the same opacity"; the plan shipped `1`, on the
  reading that a gradient is ground rather than photography and at `0.14` would leave a
  `left-portrait` row with no identity signal at all. Same layer, same scrim, no layout shift, and
  it holds under `prefers-reduced-transparency` too (gap 8).

## Out of scope — canvas chrome this amendment does not touch

Deck tile label block and status-chip corner; Home hero label, chip and footer; the commander
row's rank/name/subtitle type scale, fit chip and data zone; identity-pip size and ring; deck grid
columns; resume-row radius, gaps and type scale. All redrawn in the v2 canvas, all shipped chrome
from #437 / #438, none of them the art behind the type.

## State reachability

All eight states in the table's State Coverage section are reachable. `art_crop_uri` runs
unstubbed from `src/lib/scryfall/transform.ts` through the schema column and every read path to
all four surfaces; the modal-DFC front face is asserted in the transform's tests; the no-crop
fallback renders the identity gradient with the band's layer count and root class unchanged, so
there is no layout shift.

VERDICT: 8 gaps found, 8 fixed, 0 remaining.
