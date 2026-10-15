# Gap report — Foil treatment

Table: `docs/superpowers/design-tables/foil-treatment.md`. Implementation: `git diff origin/main...HEAD` on branch
`foil-1` (commit `1fe531ace`). Copy wording out of scope.

## Pass 1 — properties

### Ring span: the span itself

| Property | Result |
|---|---|
| Element (existing ring span, no new element) | ✅ MATCH: `grid-view.tsx:187`, `deck-card-tile.tsx:326`, `read-only-card-tile.tsx:81` add only an attribute to the existing span |
| Markup | ✅ MATCH: `aria-hidden`, `data-foil={…}`, the unchanged `pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.25)]` on all three |
| `data-foil` values (`foil` / `etched`, absent otherwise) | ✅ MATCH: `FoilFinish = "foil" \| "etched"` (`browse.ts:107`); `undefined` otherwise, so React omits the attribute |
| `overflow: hidden` when `[data-foil]` | ✅ MATCH: `globals.css:1042` |
| Border radius inherits the art clip | ✅ MATCH: `rounded-[inherit]` kept; parent is the `overflow-hidden` art box with `TILE_ART_CLIP(_SCALED)` |
| Radius check / shell and art-foot radius quoted | ✅ MATCH: no radius changed; the span inherits the existing clip |
| No filter / backdrop-filter / blend / mask / will-change / image | ✅ MATCH: gradients only (`globals.css:1039-1089`) |
| No new tokens | ✅ MATCH: no `--x:` declaration added; reads existing `--fg-muted`, `--motion-duration`, `--motion-fade`, `--motion-ease` |
| Strings on the tile unchanged | ✅ MATCH: no copy file in the diff |
| CSS location (one block beside art-arrival rules) | ✅ MATCH: `globals.css:1039-1089`, directly after the `art-in` block |
| CSS layering: UNLAYERED (audit) | ✅ MATCH: brace depth 0 at `globals.css:1039`, outside `@layer base` (`:638`), so the reduced-transparency `box-shadow` beats Tailwind's layered `shadow-[…]` |

### `::before` (the film)

| Property | Result |
|---|---|
| `content ""`, `position absolute`, `inset 0`, `border-radius inherit` | ✅ MATCH: `globals.css:1043-1045` |
| Foil background | ✅ MATCH: `globals.css:1046-1051`, all eight stops identical |
| Etched background | ✅ MATCH: `globals.css:1052-1056`, all five stops identical |
| Motion at rest none | ✅ MATCH: no animation or transition on `::before` |
| Per-theme variation none | ✅ MATCH: no theme selector |
| Etched kept (G6) | ✅ MATCH |

### `::after` (the band)

| Property | Result |
|---|---|
| Exists only under `(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)` | ✅ MATCH: `globals.css:1072` |
| `content`, `position`, `inset`, `border-radius` | ✅ MATCH: `globals.css:1074` |
| Resting `transform: translateX(-100%)` | ✅ MATCH: `globals.css:1074` |
| Background `linear-gradient(105deg, … .42 50% …)` | ✅ MATCH: `globals.css:1075` |
| Trigger `:is(a, button):is(:hover, :focus-visible) [data-foil]::after` | ✅ MATCH: `globals.css:1077`. Every press is a `button`: `CardDetailTrigger` (`card-detail-provider.tsx:487`) on the deck and precon tiles, the tile button on the grid |
| Animation `foil-sweep calc(var(--motion-duration) * 2) var(--motion-ease)` | ✅ MATCH: `globals.css:1078` |
| Keyframes | ✅ MATCH: `globals.css:1071` |
| Duration 640ms | ✅ MATCH: `--motion-duration: 320ms` (`:536`) × 2 |
| Delay 0, curve ease-in-out | ✅ MATCH: no delay given; `--motion-ease` |
| One iteration, then rests | ✅ MATCH: default iteration count 1, no fill mode, so it returns to `translateX(-100%)` |
| Only `transform` animated | ✅ MATCH |
| Pointer leaves mid-sweep: drops back, no reverse | ✅ MATCH: the animation is removed with the selector, so it goes back to the resting transform |
| No tilt / pointer-following | ✅ MATCH |
| Scope: only the tile under the pointer | ✅ MATCH: descendant of the hovered/focused press only |
| Reduced-motion list: comment only | ✅ MATCH: `globals.css:1131-1132` |

### Opacity hold and fade-in

| Property | Result |
|---|---|
| `img:not([src]) ~ [data-foil] { opacity: 0 }` | ✅ MATCH: `globals.css:1062`, unscoped |
| `pending` hold, under either motion preference (audit's scope reversed at build, after this verify ran) | ✅ MATCH after the change: `globals.css`, the unconditional hold block |
| `failed` hold (G2), and `armArtArrival` marks an error `failed` | ✅ MATCH: `globals.css:1063`; `hydrated-art.tsx:87-108` (error sets `broke`, release writes `failed`; a complete image with `naturalWidth` 0 is `failed` too) |
| Fade-in on `in` under no-preference | ✅ MATCH: `globals.css:1066` |
| 300ms, ease-in-out, delay 0, `art-in` | ✅ MATCH: `--motion-fade: 300ms` (`:539`) |
| `done`: film at once; no mark: held until armed (rule added after this verify ran, from review round 1) | ✅ MATCH after the change: `img:not([data-arrival]) ~ [data-foil]` holds it |
| Reduced motion: no fade | ✅ MATCH: the fade lives only under no-preference |
| Sibling order (img precedes span) on every surface | ✅ MATCH: `deck-card-tile.tsx:307-329`, `grid-view.tsx:172-191`, `read-only-card-tile.tsx:69-85`. `data-arrival` is written on the img itself (`useArtFade` arms `img, img`) |

### Reduced transparency / forced colors

| Property | Result |
|---|---|
| Reduced transparency: pseudos `display: none` | ✅ MATCH: `globals.css:1083` |
| Reduced transparency: `box-shadow: inset 0 0 0 2px var(--fg-muted)` | ✅ MATCH: `globals.css:1084` |
| Forced colors: pseudos `display: none` | ✅ MATCH: `globals.css:1087-1089` |

### Surfaces that set `data-foil`

| Surface | Result |
|---|---|
| Deck Card view (drawn printing: pick → Collection pick → default, owned, all one finish) | ✅ MATCH: `readDeckPrintings` sets `foil: soleFoilFinish(p.finishes)` on the drawn printing `p = held ?? resolvedPrinting(card)` (`printings.ts:166-179`); `getDeckDetail` forwards it for owned rows only (`read.ts:578`); tile sets it only over art (`deck-card-tile.tsx:328`) |
| Collection grid (drawn printing, only foil or only etched) | ✅ MATCH: `cardArt` sets `foil` off the same printing as `imageUri` (`browse.ts:778-784`), used for the primary printing (`:732`) and a pick (`:1038`); `foil` survives the list wire (`toListCards` keeps it, not a draw key) and the withheld art fields (`list-wire.ts:187`); `grid-view.tsx:189` |
| Precon open view (`printedFoil`, `foil > 0 && foil === quantity`) | ✅ MATCH: `open-precon-view.tsx:57`; `read-only-card-tile.tsx:83` |
| Precon basic land tile | ✅ MATCH: basics render through the same `ReadOnlyCardTile` (`open-precon-view.tsx:319`); `printedFoil` is computed from the merged copies (`byCard` sums `foil` and `quantity`), so it is foil when every art's copies are foil |
| Tokens never | ✅ MATCH: `token-tile.tsx:67` span untouched, file not in the diff |
| Suggestions never | ✅ MATCH: `suggestion-tile.tsx:279` untouched, file not in the diff |
| Precon box tiles never | ✅ MATCH: `data-foil` is set in three files only |
| Card details, zoom, hover preview out of scope | ✅ MATCH: not set there |

### Shared rules

| Rule | Result |
|---|---|
| Only real copies (owned finishes) | ✅ MATCH: deck reads `selectCollectionRows`, owned rows only; collection is owned by construction; precon uses the box's finish, as the table's precon row specifies |
| Owned at least one | ✅ MATCH: `soleFoilFinish` needs one finish above zero |
| All-foil / all-etched | ✅ MATCH: `browse.ts:114-117` |
| Mixed gives no film | ✅ MATCH: more than one held finish returns `undefined` |
| Grid cue for mixed: none (G8) | ✅ MATCH |
| Only over art | ✅ MATCH: every surface guards on `imageUri` |
| Deck finish read beside `selectCollectionRows`, no schema change | ✅ MATCH: no migration in the diff |

### Copy / About

| Property | Result |
|---|---|
| `foilTreatmentCopy` empty, no strings touched | ✅ MATCH |
| No About entry, no `ABOUT_VERSION` bump | ✅ MATCH |

## Pass 2 — state coverage

| State | Result |
|---|---|
| 1 Foil at rest | ✅ REACHABLE on all three surfaces (deck `DeckPrinting.foil` → `DeckDetailCard.foil`; grid `BrowseCard.foil`; precon `printedFoil`) |
| 2 Foil hovered/focused | ✅ REACHABLE: every press is a `button` ancestor of the span |
| 3 Etched at rest | ✅ REACHABLE on deck and grid. Precon draws foil only, which the precon row specifies |
| 4 Etched hovered/focused | ✅ REACHABLE (deck, grid) |
| 5 Mixed | ✅ REACHABLE: `soleFoilFinish` returns `undefined`; a pick clears it (`cardArt` always writes the key) |
| 6 Art arriving | ✅ REACHABLE: `HydratedImg` withholds `src` (grid, precon); `pending` from `armArtArrival` (all three) |
| 7 Art landing | ✅ REACHABLE: `pending` → `in` on load |
| 8 Cached / painted before hydration | ✅ REACHABLE: `done` when `complete && naturalWidth > 0`; no mark before hydration |
| 9 No art | ✅ REACHABLE: `imageUri` guard on all three |
| 10 Art failed | ✅ REACHABLE: `error` → `failed`; already-broken at arm → `failed` |
| 11 No longer foil-only | ✅ REACHABLE: derived on every read from the current finishes and drawn printing; unowned rows never carry it |
| 12 Reduced motion | ✅ REACHABLE: fade and band defined only under no-preference |
| 13 Reduced transparency | ✅ REACHABLE: unlayered block overrides the Tailwind shadow |
| 14 Forced colors | ✅ REACHABLE |
| 15 Token tile | ✅ REACHABLE (plain; untouched) |
| 16 Suggestion / precon box tile | ✅ REACHABLE (plain; no `data-foil`) |
| 17 Card details, zoom, hover preview | ✅ REACHABLE (unchanged) |
| Themes | ✅ REACHABLE: no theme-scoped rule |

## Notes (not gaps)

- `scripts/probe-foil-film.mjs` builds its span without the Tailwind `shadow-[…]` class, so its reduced-transparency
  check does not exercise the layering win the audit asked for. The implementation is unlayered, so it wins; only
  the probe's proof is weaker than the claim.
- The deck tile's `FadingImg` is `loading="lazy"` with `src` set, so `armArtArrival` reads `img.complete` on a lazy
  image that may not have started fetching. Under the spec that is `false` (→ `pending`). A browser that reported
  `true` with `naturalWidth` 0 would now mark it `failed` and hide the film until the src changed, where it used to
  mark it `done`. Worth one look in a real browser on an off-screen deck tile. Not counted as a gap.

## Gap list

None.

VERDICT: 0 visual gaps, 0 state gaps
