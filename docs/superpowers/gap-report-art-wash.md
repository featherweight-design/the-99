# Gap report — Art Wash Readability

Two rounds, one table. Round 1 verified the wash's own layers. Round 2 re-enumerated
`docs/superpowers/design-tables/art-wash.md` **across the whole surface** — in place, replacing the
layer-only table rather than sitting beside it, because the first table's scope was the defect and
keeping it would leave a second document saying the surface was out of scope. It enumerates
`design/design_handoff_the99_art_wash/` (README, READINESS, `… v2.dc.html` — the deliverable).

## Why there is a round 2

Round 1's scope section ruled everything but the gradient stack out of scope, on the plan's line
that "only the art behind it changes". That reading was wrong, and it is the reason round 1
returned a clean verdict on a surface that had not been built. The README's decision 4 — *data
lives on flat ground* — is not a statement about gradients. It says the wash owns one band and
everything below a `1px var(--border)` divider sits on `var(--surface-inset)`. No surface had that
split. Decision 3 (ink over art at full opacity, chips on an opaque plate), decision 6
(`center top` focal, which only pays off with labels top-anchored) and decision 8 (the portrait's
extent derives from band height in px) were likewise structural asks that a layer-only table could
not see.

A table that enumerates only what the implementation already does cannot find a missing structure.
Round 2's table enumerates every element of all five surfaces — deck tile, Home ready-to-build
hero, commander rec row, Home resume row, and the discovery row — at both breakpoints.

## Round 1 — the wash's layers

### Visual gaps — found and fixed

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

### Accessibility gaps — found and fixed

5. `src/app/globals.css` — the reduced-transparency rule set **every** art layer to a flat
   `opacity: 0.3`. That raises a `left-portrait` ambient copy from `0.14`/`0.20`, answering a
   request for less transparency with more art. The component now publishes
   `--art-wash-reduced-opacity` per layer as `min(layer, 0.3)` — a ceiling, never a floor — and
   the media query reads it.
6. `src/app/globals.css` — the rule replaced `.art-wash-scrim`'s background on **every** strategy
   with the handoff's 180deg ramp. On both `left-portrait` surfaces that deleted the 90deg,
   px-keyed fade the strategy exists for. The override is now scoped to
   `.art-wash-scrim-cover`; a portrait row carries the preference through its art layers alone.

### Found in Copilot review round 1 — fixed

7. `src/app/globals.css` — the reduced-transparency cover scrim collapsed to three stops. READINESS
   eng clarification 7 restates three alphas, but the base gradient has four; the design table
   (`design-tables/art-wash.md:741-746`) keeps the `0 / 40 / 74 / 100%` positions and retains stop
   four at `.86`. Now `95 / 60 / 85 / 86` across the original four positions.
8. `src/components/ui/art-wash.tsx` — `--art-wash-reduced-opacity` was a ceiling on *every* layer,
   including the no-crop identity gradient at `1`, so a reduced-transparency reader saw that
   gradient at `0.3` — the preference muting the one identity signal the row has. `reducible` now
   takes whether the layer is art; a gradient publishes its own opacity.

### Deliberate deviations from the handoff

Not defects. Sorted with Hugh on 2026-09-08: the first two are settled eng-side and ask Design
nothing, the last two were visible and went back as one prompt. Design ratified both the same
day — one of them with a single exception, since built.

**Settled eng-side, no round-trip.**

- **`!important` in both media queries.** `<ArtWash>` sets opacity and gradients inline because
  both are computed from the band, and an inline declaration outranks any plain selector. A
  mechanism, invisible in the drawing.
- **`forced-colors: active` drops the art rather than re-tuning it** — READINESS eng
  clarification 7, already flagged there as extending the handoff's intent, and audited as such.

**Ratified by Design, 2026-09-08.**

- **The status chip's fill mixes into `var(--bg)`, not into `transparent`**, giving an opaque
  plate at every alpha behind a uniform `var(--border-strong)` hairline. README §3 asks for an
  opaque fill plus a hairline. Side effect: the four signal statuses lost their colour-faded
  edges, and `Building` lost the `--border-dashed` border ratified earlier, because a 50% fade of
  the status colour was the worst-reading edge in the report and the wash rules ink over art to
  full opacity. **Design ratified the uniform colour and weight and restored the dash on
  `Building` only** — a line style is not an alpha fade, so the readability rule that retires the
  other four never reached it, and it costs no colour, weight or opacity on art. It buys back the
  one status signal that survives greyscale and colour blindness now that colour lives only in
  fill and label, and lets the one status that differs in kind (incomplete, rather than a data
  condition) read as different in kind. Shipped as five statuses at `1px solid
  var(--border-strong)`, `Building` at `1px dashed var(--border-strong)`.
- **The no-art identity gradient renders at full opacity**, not at the art layer's. README says
  "the existing colour-identity gradient at the same opacity"; the plan shipped `1`, on the
  reading that a gradient is ground rather than photography and at `0.14` would leave a
  `left-portrait` row with no identity signal at all. Same layer, same scrim, no layout shift, and
  it holds under `prefers-reduced-transparency` too (gap 8). **Design ratified as shipped** —
  "at the same opacity" meant no layout shift and the same layer, and gap 8's generalisation
  (art-ness decides reducibility; a gradient publishes its own opacity) stands. Design is
  correcting the README wording rather than the code.

## Round 2 — the full surface

### Structural work the round-1 scope hid

Not numbered as gaps because they are the build, not a correction to it. Each is a README decision
no surface implemented.

- **Decision 4 — the band/divider split.** Every surface now draws the wash inside a box of stated
  height, then a `1px solid var(--border)` divider, then `var(--surface-inset)` ground carrying all
  data. Shipped on the deck tile, the hero, the rec row and the discovery row. The rec and
  discovery rows previously ran the wash under the whole row via `absolute inset-0`, which is also
  what caused the over-scaled crop: the sharp layer's `background-size: auto 100%` resolved against
  the *rendered* row height, so a row grown by a long note stretched the wash. `<ArtWash>` now
  states `height: ${band}px` on its own root, and the band is a stated box rather than a floor, so
  neither can happen again.
- **Decision 6 — labels top-anchored.** The `center top` focal only pays off if the type sits above
  the art's recognisable features. Deck tile and hero label blocks moved from the band's bottom to
  its top; the status chip took the bottom-left corner the scrim's fourth stop was drawn for.
- **Decision 8 — band-derived portrait geometry.** The portrait's width is `band × 1.37`, computed
  from the band height rather than passed in, so no call site can disagree with the mask.
- **Decision 3 — ink over art.** Full opacity plus `INK_SHADOW` on every string over art; every
  chip over art on an opaque `var(--bg)` plate with a `var(--border-strong)` hairline. The resume
  row is the stated exception and carries no shadow, because its type starts at the 116px inset,
  clear of the portrait.
- **The rec and discovery rows gained the type-line subtitle** the canvas draws in the band. That
  required `typeLine` on `CommanderListItem`.

### Visual gaps — found and fixed

Thirteen, all values rather than structure, all fixed in one commit.

9. Deck-tile title and hero commander name — `line-height: 1.15`.
10. Resume-row deck name — `line-height: 1.2`.
11. Status pill — `letter-spacing: 0.06em`.
12. Hero fit-chip denominator — `letter-spacing: 0.1em`.
13. Hero pool-size clause — `var(--fg-faint)`, was `var(--fg-body)`.
14. Deck-tile commander subtitle — `margin-top: 4px`, was 3px.
15. Deck-tile completion bar, track and fill — fully rounded, was `2px`.
16. Fit/support chip radius — 7 on the hero, 9 on the rec and discovery rows.
17. Resume-row content line `gap: 14px`, row `padding-right: 18px`.
18. Rec-row receipt line — `line-height: 1.5` at both widths.
19. Deck-card overflow "⋯" button — the last translucent chip on art. Now the opaque `var(--bg)`
    plate and `var(--border-strong)` hairline decision 3 gives every other chip. The redundant
    `border-0` came out rather than being overridden: preflight already zeroes the width, and
    leaving it in fought `sm:border` for source order.

### Structural gaps — found and fixed

20. **Resume row stated its height as a floor** (`min-h-[72px]`) while the wash root is a hard
    `72px`. Any row that grew — a long deck name, a long commander name — showed an unwashed strip
    under the portrait. Now `h-[72px]`.
21. **`min-w-0` absent on the deck-tile and hero roots.** Both survived only via `overflow-hidden`,
    so a long name pushed its grid track wider instead of truncating. Added.

### Open with Design

Neither is eng-resolvable; both ship as-is pending a ruling, and both are in the PR body.

- **The `left-portrait` L1 plate** resolves to the row's own ground (`--surface-inset` at 72,
  `--bg` at 148) rather than the darker `color-mix(… 86%, black)` the `cover` strategy uses. This
  is deliberate and documented in `art-wash.tsx` — a row's art should fade into the row, not into a
  darker patch of its own — and it is what round 1's gap 3 established. Asking Design to ratify the
  divergence between the two strategies.
- **Band vertical alignment.** The canvas centres the rank and top-aligns the fit chip; the
  implementation bottom-aligns all three band children, which is what the README's "labels at band
  baseline" asks for. Table conflict 10, unresolved.

### Superseded, not gaps

Values the round-2 table carries from the v2 canvas that later shipped tables overrule:
`ui-refresh-decks.md`, `STATES-deck-statuses.md`, `ui-refresh-home.md` and `commanders-discover.md`
own the type scale, font weights and families, pip sizing and rings, the synergy fill, the Build
button's fill, Home's section headings, the rec row's lack of a card frame, and the deck grid's
columns. The commander name truncating where the canvas wraps is #435 behaviour this amendment does
not override.

### Known, left alone

`hero-commander.tsx`'s `GhostButton` carries
`bg-[color-mix(in srgb, var(--bg) 50%, transparent)]` — a translucency designed to sit over art.
After the band/divider split it sits on flat `--surface-inset` ground, where it does nothing.
Buttons are held for Design, so it stays.

## State reachability

All eight states in the table's State Coverage section are reachable. `art_crop_uri` runs
unstubbed from `src/lib/scryfall/transform.ts` through the schema column and every read path to
all five surfaces; the modal-DFC front face is asserted in the transform's tests; the no-crop
fallback renders the identity gradient with the band's layer count and root class unchanged, so
there is no layout shift.

VERDICT: round 1 — 8 gaps found, 8 fixed. Round 2 — 13 visual and 4 structural gaps found; 13
visual and 2 structural fixed, 1 superseded, 1 open with Design. Confirm pass: 0 items still wrong.
