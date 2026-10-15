# Foil treatment R2 (large views and the tilt): build plan

Handoff: `design/design_handoff_the99_foil_treatment/` §R2 (README §R2, `STATES-foil-large-views.md`, the R2 boards),
audited **YELLOW** in `READINESS-r2-audit.md`. All 17 gaps are engineering-resolvable, there are no copy items, and no
Design call is open. Brief: `docs/superpowers/design-briefs/2026-10-15-foil-large-views.md`. R1 shipped as #1784. The plan
was approved by d9 as Hugh's proxy, under the standing ruling for this addendum. It is built after segmented PR 2.

No feature switch, as in R1: the change is cosmetic, and it is gated by data (only a foil copy over its own art).

## The lock this build is held to

**The face never waits for the film.** In details and the zoom the face is a CSS background (`artStyle`, and
`frontStyle`/`backStyle` in `CardFaces`), not an `<img>`. So:

- **Not R1's hold.** R1's hold rules (`img… ~ [data-foil]`) cannot apply here and are not reused.
- **Mark the film span only.** One preloaded `Image` of the face's own URL, armed with `armArtArrival(…, null)` (null:
  outside the list's arrival queue, G8), marks the film span alone. The new rules hide only the film:
  `[data-foil][data-arrival="pending"|"failed"] { opacity: 0 }`.
- **Never on the host.** The mark never goes on the host, and the face is never drawn through `ArtLayer`. Its global
  `[data-arrival="pending"]` rule (under `prefers-reduced-motion: no-preference`) would hide the face for every reader
  without reduced motion.
- **Client only.** The modal stays client-mounted. The span is marked in a layout effect, before its first paint.
- **Pinned by tests.** A component test asserts that the face's element carries no `data-arrival` in every arrival state.
  `probe:foil-film` grows a background-face fixture that reads the face's computed opacity as 1 while the film is pending,
  done, failed and unmarked, under both motion preferences (G17).
- **If cached art reports as not yet loaded** (`new Image().complete` false at once), only the film fades in. That is
  acceptable, and the probe records which happened.

## Route × viewport inventory

| Surface | 390 | 1300 | Notes |
|---|---|---|---|
| Card details face, one-faced | ☐ | ☐ | film, tilt |
| Card details face, two-faced, both faces through the flip | ☐ | ☐ | film on each face; tilt eases flat while turning |
| Zoom | ☐ (no phone zoom exists; G5) | ☐ | film, tilt on any press and move |
| Hover preview | — | ☐ | tile film, still (G10) |
| Phone peek / desktop neighbor plate | ☐ | ☐ | tile film, still (G10) |
| Mixed holding, unowned, oracle-level art | ☐ | ☐ | no film |
| Reduced motion, reduced transparency, forced colors | ☐ | ☐ | static film, ring, no light |

Contact-sheet inventory: `docs/superpowers/inventories/foil-large-views.json`, written in PR 1 and extended in PR 2.

## PR boundaries (no stacking; each under 20 files and 800 lines)

**PR 1: the film on the large and mid views (no tilt).**
- R2's film CSS: 80% strength, 1.5× spread, the same stops; the film-span arrival rules; reduced transparency and forced
  colors follow R1's rules.
- Details reads the film from the resolved printing (`hasOwnArt && soleFoilFinish(finishes)`), never from
  `preview.foil`, which a pick does not update. The back face needs its own `hasOwnBack` (G9). Each face carries its own
  film span, and its backface is hidden, so the film turns with the card.
- The preloaded-`Image` arrival mark on the film span (the lock, above; G8).
- The hover preview (`usePreviewRow`, drawn in `hover-preview.tsx`) and both peeks (`PhonePeek` and `NeighborPlate`, which
  take the `SiblingCard` data type) carry the finish and draw R1's still tile film (G10). None of them draws an `<img>`: the
  preview is a `div` with the art as `background`, and the peeks draw through `ArtLayer`. So R1's `img ~ [data-foil]` hold
  cannot reach them either. The peeks' film follows their own `ArtLayer` mark, which sits in the modal's `ArrivalOrder`
  queue: the film is hidden while that layer is pending or failed, so a neighbor whose bytes landed but is still queued
  shows no film over its bare plate. The hover preview, which has no queue, takes the details face's independent preload
  mark.
- Tests: the film's presence across the "Where details reads foil" table, and the face never marked.
  `probe:foil-film` gets the background-face fixture (G17). Contact sheet at both widths. Check the 80% strength on real
  pale full-art and borderless faces there (G15, R2-G1).

**PR 2: the tilt.**
- Three registered custom properties (`--tilt-x`, `--tilt-y`, `--tilt-lift`, `@property`) written on pointer events
  onto one element, on an INNER wrapper around the art only. On the desktop host that wrapper excludes the price, hint
  and flip stack, and avoids the paging animation's `transform` (G1). On the phone it avoids
  `anim-phone-card-enter`'s (G2). `--tilt-ease` is local.
- Every motion rule sits under `prefers-reduced-motion: no-preference`. The base `box-shadow: var(--card-shadow)` stays
  outside the query, and the inline shadows are removed so the stylesheet wins (G3).
- The flip: a turn removes the inline tilt values, so the reset wins. `data-turning` is set only under no-preference,
  because `onTurnSettled` never fires under reduced motion (G4).
- **Desktop:** hover, gated on `pointerType` mouse or pen (G12). Keyboard focus plays R1's one 640ms sweep through a
  `:has(> button:focus-visible)` rule on the tilt host (G6). The zoom trigger moves inside the inner wrapper for that rule to
  match, since today it is a sibling of the art in `modal-art-desktop`. The tilt angle is one constant (G11).
- **Phone:** a 300ms hold inside the 10px swipe slop, then the swipe stands down. Armed on the card only, not on the
  peeks or the turn plate, and not at the full snap. Its release swallows the tap-to-teaser (G13). It is not armed under
  reduced motion (G7). The Details-Phone caption "No hover, no tilt." is not built; the spec is (G14).
- **Zoom:** desktop only, since the phone zoom no longer exists (G5). It tilts on any press and move; a tap still closes.
- Tests per rule above, mutation-checked. `probe:foil-film` adds the G17 checks this PR owns: `[data-turning]` against the
  inline tilt values (G4), and the card's shadow under reduced motion (G3).
- **Performance** (G16): the follow repaints the shadow, the glare and the film on each frame. A Chrome Performance trace
  of a 5-second hover goes in the PR body, with `measure:load` (deployed staging, slow profile) before and after, the
  card-details press included.

## About

None owed and no bump. The change is cosmetic under AGENTS.md's rule, and the brief and the audit agree. Hugh may overrule
this, since the phone hold is the app's first press-and-hold gesture.

## Proof per PR

- Unit and component tests, mutation-checked.
- `probe:foil-film` extended.
- The contact sheet at both widths.
- `feature-acceptance` per PR and at close, with `design-review` against R2's property table at close.
- `measure:load` before and after on PR 2. PR 1 adds no image request: the mark reuses the face's URL, which the browser
  already fetched. The PR 1 body confirms that from the network panel.
