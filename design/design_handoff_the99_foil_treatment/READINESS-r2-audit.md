# Readiness audit: foil treatment R2 (large views, with a tilt)

2026-10-15, audited by engineering on `foil-r2-audit` (`c74c27747`). `origin/main` is one commit ahead
(`69934523f`, a Social R1 design doc) and touches none of the files below, so the audit holds against it.
Done independently of Design's `READINESS-r2.md`. Every claim was read off `README.md` §R2,
`STATES-foil-large-views.md`, the R2 canvases (their text, extracted; no script was run) and the brief
(`docs/superpowers/design-briefs/2026-10-15-foil-large-views.md` on `origin/brief/foil-large-views`), then checked
against the code.

## Verdict: YELLOW

Every lock in the brief holds as specified, and all nine open calls are answered. No design call is open.
There are gaps, and every one of them is engineering's to resolve. Most are places where the proposed CSS
or markup meets code it did not account for: the desktop art box holds the price stack, the entry
animations own `transform`, the inline shadows win, inline custom properties beat the flip's reset, and
the phone zoom has been retired. Copy: none.

## 1. The lock: "the face never waits for the film"

**What R1 does today.** The film waits for an `<img>`, and only through sibling selectors
(`src/app/globals.css`):

```css
img:not([src]) ~ [data-foil],
img:not([data-arrival]) ~ [data-foil],
img[data-arrival="pending"] ~ [data-foil],
img[data-arrival="failed"] ~ [data-foil] { opacity: 0; }
@media (prefers-reduced-motion: no-preference) {
  img[data-arrival="in"] ~ [data-foil] { animation: art-in var(--motion-fade) var(--motion-ease); }
}
```

The art's own hold is separate, and it hides **whatever element carries the mark**, under no-preference only:

```css
[data-arrival="pending"][data-arrival] { opacity: 0 !important; }
[data-arrival="in"] { animation: art-in var(--motion-fade) var(--motion-ease); }
```

`armArtArrival(el, image, queue)` (`src/components/ui/hydrated-art.tsx`) writes that mark onto `el` and
watches `image`. It sets `done` or `failed` at once when the image is already complete
(`el.dataset.arrival = image.naturalWidth > 0 ? "done" : "failed"`), and otherwise sets `pending`, then `in`
or `failed` on `load` or `error`. It runs from a layout effect, so the mark lands before first paint.
`ArtLayer` / `ArrivingArt` (`src/components/ui/art-wash-near.tsx`) arm **the layer that draws the art**:
`return armArtArrival(el, image, queue)`, where `el` is the background div. So anything drawn through
`ArtLayer` is hidden while pending, which means the face itself waits.

**What the large views do today.** The details face has no mark at all, and nothing hides it. In
`card-modal.tsx`, a one-faced card is the host's own background (`...(twoFaced ? null : artStyle)` on
`modal-art-desktop`, `modal-art-mobile` and `card-zoom-card`). A two-faced card draws `CardFaces` divs from
`frontStyle` / `backStyle`:

```ts
const frontStyle: React.CSSProperties = resolved?.imageUri
  ? { backgroundImage: cssUrl(resolved.imageUri), backgroundSize: "cover", backgroundPosition: "center" }
  : { background: identityGradient(card.colorIdentity) };
```

**Can R1's mechanism serve the large views as built?** No. Every hold selector is `img… ~ [data-foil]`, and
no large face is an `<img>`. A film span placed there would match none of them and would paint at once
over the identity ground while the bytes travel. That breaks R1's "the film waits for the art", but not
the face lock. The other way to reuse R1, drawing the face through `ArtLayer`, would break the face lock,
because `ArrivingArt` marks the face itself.

**Is R2 consistent with the lock?** Yes, as specified. README §R2:

> "One preloaded `Image` of the face's URL, armed with `armArtArrival`, marks the film span (`pending`,
> `in`, `done`, `failed`)."

> `[data-foil][data-arrival="pending"], [data-foil][data-arrival="failed"] { opacity: 0; }`

The mark goes on the film span, so the global `[data-arrival="pending"][data-arrival]` rule hides only the
film. The R2 rule holds the film under both motion preferences, which matches the reversed R1 ruling. The
face keeps its background and gets no mark. Under reduced motion nothing is faded at all. The Motion board
says the same ("Face is already drawn here; only the film fades, 300ms"), and so does the Details-Desktop
cold-open caption ("The ground shows; the film is held. When the art paints, the film fades in"). The peek's
rule, `[data-arrival="pending"] ~ [data-foil]`, holds the film behind an `ArtLayer` that already fades in
today, so it adds no wait to the peek's art.

The build must keep three things true, or the lock breaks:

- the mark goes on the film span, and never on the host, which also carries the zoom trigger, the turn
  plate and the under-card stack;
- the face is never moved into `ArtLayer`;
- the unmarked case stays unreachable. The R2 CSS has no `:not([data-arrival])` hold, which is safe only
  because the modal mounts on the client (`useState<BrowseCard | null>(null)` in `card-detail-provider.tsx`)
  and the layout effect marks the span before first paint.

Add an `img:not([data-arrival])`-style hold for the film span if the modal ever server-renders.

The claim "Cached art … is marked done" holds only when `new Image()` reports `complete` synchronously,
which is true for memory-cache hits and not guaranteed from disk. A miss gives the film a 300ms fade and
leaves the face untouched. This is benign, and not verified in a browser here.

## 2. The tilt

| Aspect | Handoff | Finding |
|---|---|---|
| Trigger | Desktop: hover with a fine pointer (`pointerenter` / `pointermove` / `pointerleave`). Phone: a hold of 300ms inside `SWIPE.lockPx` (10px), then move. Zoom: press and move. "Device tilt stays out (permission prompt)." | No gyroscope. The JS must also gate on `pointerType` (G12). |
| Range | ±6° (`(… - .5) * 12deg`), perspective 1000px, a hairline edge up to 1.5px, film travel ±25% | Clear. G10 asks for it as one constant. |
| Reduced motion | Every tilt rule sits under `prefers-reduced-motion: no-preference` | The CSS holds. The phone hold does not (G7), and the moved shadow is lost (G3). |
| Touch | Desktop gets no tilt from touch. The phone hold exists only in `card-sheet-gesture` | The hold needs scoping (G13). |
| vs swipe / sheet | A press that moves first stays a swipe. A hold marks the drag `dead` | It fits `useCardSheetGestures`: `axis` stays `null` until `lockAxis` passes 10px, so a timer can claim the press inside that window. |
| vs flip | `data-turning` on the host pins the vars to centre | The inline variables win over that rule (G4). The host must sit outside the turning box. |
| vs zoom | The desktop trigger is stretched over the art, and the listeners sit on the host | Fine on desktop. The phone zoom does not exist (G5). |
| vs scroll | The band is `touch-none`, so nothing in it scrolls | No conflict on the phone card. |

## 3. Data reachability

| View | What the film needs | Where it comes from | Status |
|---|---|---|---|
| Details face, owned (any door: deck, Collection, precon) | the shown printing's `finishes` and `hasOwnArt` | `getCardDetail`, then `loadCardDetail`, then `aggregateCollection` (`browse.ts`: `finishes: { [r.finish]: r.quantity }`, `hasOwnArt: r.exactImageUri !== null`, merged `seen.hasOwnArt \|\|= printing.hasOwnArt`). In the modal, `const resolved = resolvedPrinting(preview)`. A deck's pick goes through the provider's `withDeckPick` / `deckPrintingPicks` | **Reachable.** Derive the film from `resolved` with `cardArt`'s own rule, `printing.hasOwnArt ? soleFoilFinish(printing.finishes) : undefined`. Never read `card.foil`, because `preview` is `{ ...card, printings, preferredPrinting: at, printedName }` and does not recompute `foil` on a pick (G9). |
| Details back face | the same, for the back | `resolved.backImageUri` and `resolved.hasOwnBack` | Reachable. Gate the back's film on `hasOwnBack`: `backImage = resolved?.backImageUri ?? card.backImageUri` can be the oracle's (G9). |
| Details, unowned | none | `catalogCard`: `finishes: {}` | Plain by construction. |
| Details, token | none | `tokens/detail.ts`: `finishes: {}` | Plain by construction (state 18). |
| Zoom | the same as the details face | the same `resolved`, `frontStyle` / `backStyle` | Reachable. |
| Hover preview | a finish beside the art | `usePreviewRow(imageUri)` takes only a URL, and the box draws `background: … ${cssUrl(target.imageUri)}` | **Missing.** Add an optional finish to `usePreviewRow` and `PreviewButton`. The callers that know it: `collection/rows-view.tsx` (a `BrowseCard`, with `.foil`) and `decks/decklist-row.tsx` (a `DeckDetailCard`, with `.foil` since #1784). Every other caller passes none (R2-G8). |
| Phone peek, desktop neighbour plate | a finish beside the art | `SiblingCard = { oracleId; name?; imageUri?; colorIdentity? }`, drawn through `plate()` in the provider | **Missing.** Add `foil?` to `SiblingCard`. `plate()` can take it from `withDeckPick(readCard, …)`, which already runs `cardArt`. A `viewPrintings` override names no finish, so it draws none (the safe direction). List siblings need the list's own `.foil` passed through. |

No schema change is needed anywhere.

## 4. States: triggers and widths

| # | Trigger reachable | Desktop drawn | Phone drawn |
|---|---|---|---|
| 1 | yes | Details-Desktop | Details-Phone |
| 1b | yes | Details-Desktop and the R2 board | Details-Phone ("Press and hold, then move") |
| 1c | yes (a swipe before 300ms) | n/a | described, not drawn; no visual change |
| 1d | yes | Zoom, Motion | Details-Phone (two-faced), Motion |
| 2 | **no, as built** (G6) | Details-Desktop | n/a |
| 3 | yes (staging held 0 etched rows at R1; one CSS rule) | yes | yes |
| 4 | yes | yes | yes |
| 5 | yes (a picker pick) | yes | not drawn (the rule does not depend on width) |
| 6 | yes (a held printing with no `exactImageUri`) | yes | not drawn (the rule does not depend on width) |
| 7 | yes | not drawn (today's plain card) | not drawn |
| 8 | yes | Preview | not drawn |
| 9 | yes | yes | yes |
| 10 | yes (an image `error`, marked `failed`) | table only | table only |
| 11 | yes | the zoom only (Zoom board); the details face is not drawn two-faced | Details-Phone |
| 12 | desktop yes; **phone no** (G5) | Zoom | Zoom (unreachable) |
| 13 | yes | Preview | n/a |
| 14 | yes | Preview (neighbour plate) | Details-Phone (foil peek) |
| 15 to 17 | yes | Details-Desktop, Zoom | Details-Phone, Zoom |
| 18 | yes | table only | table only |

The cells that are not drawn are rules that do not change with width, or today's plain card. None needs
Design.

## 5. About entry

None is owed. AGENTS.md: "A COSMETIC CHANGE IS NOT A FEATURE, and does not owe an entry … Restyling a
surface they already know." The brief rules "**None.** This restyles views the reader already knows", and
README §R2 says "No About entry, no bump, no strings. Cosmetic". This audit agrees. The tilt and the hold
add no capability: R2-G9 calls the hold "a quiet reward rather than a feature", and it opens and changes
nothing. Hugh may overrule, since the hold is the app's first press-and-hold gesture.

## 6. Performance

- **Named in the handoff:** no new downloads ("The film's arrival mark reuses the face's own URL"), no
  per-frame JavaScript, and nothing running while idle. Neither the R2 handoff nor the brief names a
  `measure:load` expectation. The brief: "Only one card is open, so a per-element transform is
  affordable."
- **Not compositor-only (G16).** The follow transitions three registered custom properties. Several things
  are computed from them:
  - the host's `transform`;
  - a `box-shadow` that includes the 24px/50px drop shadow;
  - the glare's `radial-gradient` background;
  - the film's `transform`.

  So every frame of the 300ms and 600ms transitions restyles and repaints the card, its large blurred
  shadow and a 150%-wide gradient on the main thread. It is JavaScript-free but not paint-free. The only
  cost is during motion, on one element. Prove it with a Performance trace of a hover sweep on desktop and
  a hold on a throttled phone.
- **`measure:load`:** the film adds a second `new Image()` for the face URL on every details open with a
  foil face. It should share the request with the background. Check that the card-press rows'
  images-asked-for figure does not rise, and that the dialog and art timings hold, before and after.
- **Large-image film:** a 372×520 zoom with a `::before` at `inset: 0 -25%`, clipped by
  `[data-foil] { overflow: hidden; }`. It is gradients only, with no filter. The zoom layer's
  `backdrop-blur-[10px]` sits behind the card and is not recomputed by the card's transform.

## Gaps

| Id | Gap | Evidence | Who, and the resolution |
|---|---|---|---|
| G1 | The desktop tilt host would tilt the price stack, and the paging animation would freeze it | README: "the desktop art box (`modal-art-desktop`, whose child `turningArt` turns)". Code: `modal-under-card` (hint, turn, price, door) is a child of `modal-art-desktop`. That box also carries `anim-carousel-prev/next`, defined as `animation: carousel-art-enter-prev … both` with `to { … transform: translateX(0) }`, and a filled animation overrides the tilt's `transform` after every Prev/Next. Details-Desktop: "Nothing else on the sheet moves." | **Eng.** Give the tilt to a new wrapper around the art alone. It takes the one-faced background, the film, the glare, the zoom trigger and `perspective: 1400px` for `turningArt`. The under-card stack stays outside it, and the carousel class stays on the outer box. |
| G2 | The phone tilt host's `transform` is owned by its entry animation | `modal-art-mobile` carries `anim-phone-card-enter`, defined as `phone-card-enter … both` with `to { transform: none }`. README: "or an inner wrapper if its entry animation already owns `transform`". | **Eng.** Use an inner wrapper, as for G1, holding the face background and the turn's perspective. |
| G3 | The moved shadow disappears under reduced motion | README: "The host's existing drop shadow moves into `--card-shadow`". In the CSS, `box-shadow: …, var(--card-shadow)` sits inside `@media (prefers-reduced-motion: no-preference)`. Today the shadow is an inline `boxShadow` (which would also beat the stylesheet if it stayed), and it includes the one-faced `inset 0 0 0 1px` seam. | **Eng.** Declare `box-shadow: var(--card-shadow)` outside the media query, put the edge and rim layers inside it, keep the seam in `--card-shadow`, and remove the inline shadow. The zoom card's inline `0 24px 60px …` too. |
| G4 | The flip's reset loses to inline variables, and can stick under reduced motion | `[data-tilt][data-turning] { --tilt-x: .5; … }` is a stylesheet rule, while `pointermove` "writes `--tilt-x` and `--tilt-y`" on the host, and an inline custom property wins. `onTurnSettled` and `onArtTurnSettled` wait for a `transform` transition, and there is none under reduced motion (`onFlip` already branches on `prefers-reduced-motion: reduce`). | **Eng.** On a turn press, remove the inline vars (or mark the turning rule `!important`). Set `data-turning` only under no-preference, or clear it on the reduced path. |
| G5 | The phone zoom does not exist | `openZoom` is called only from the desktop trigger (`zoomTriggerRefs.current[1]`, inside `hidden md:flex`). `card-modal.tsx`: "The 180px art header, its 72px compact form and the phone zoom all retire: a 320px card is already the zoom's 318." The handoff draws it anyway: STATES 12 phone "as 1, at 318 × 444; one band on open; press and move tilts with no hold; a tap closes", plus README "Phone zoom", the Zoom board's phone row, and the Sizes table "Zoom, phone 318 × 444". | **Eng.** Build the zoom tilt for desktop alone. The phone half of row 12, "press and move" and the band on zoom open have no trigger and are not built. R2 does not ask for a phone zoom, and adding one is out of scope. |
| G6 | The keyboard-focus band (state 2) cannot match the markup | R1: `:is(a, button):is(:hover, :focus-visible) [data-foil]::after`, which needs the film to sit inside the button. In details, the zoom trigger is a sibling placed after `turningArt`. | **Eng.** `[data-tilt]:has(> button:focus-visible) [data-foil-size="large"]::after { animation: foil-sweep … }` under the same media query. The proposed hover-suppression rule is moot for the same reason. |
| G7 | The phone hold would block paging under reduced motion | Reduced motion means "no tilt" (STATES 15), yet the hold "captures the pointer, marks itself `dead` for paging and the sheet" with nothing visible. | **Eng.** Do not arm the hold under `prefers-reduced-motion: reduce`. |
| G8 | The film's fade waits on the list's queue | `CardModal` renders inside `<ArrivalOrder>`, and `armArtArrival(el, image, queue)` releases a queued element in reading order. | **Eng.** Arm the film span with `null`, so it plays on landing, as a lone face should. |
| G9 | Which value the film reads | `preview = { ...card, printings, preferredPrinting: at, printedName: renamed }`, so `preview.foil` is stale after a pick. `backImage = resolved?.backImageUri ?? card.backImageUri ?? null` can be the oracle's back. | **Eng.** Front film: `resolved?.hasOwnArt ? soleFoilFinish(resolved.finishes) : undefined`. Back film: the same, and only when `resolved.hasOwnBack`. |
| G10 | The preview and the peeks carry no finish | `usePreviewRow(imageUri: string \| null \| undefined)`, and `SiblingCard` has no finish field (R2-G8). | **Eng.** Plumb it as in §3. |
| G11 | The tilt's constant | R2-G10: "Engineering can expose it as one constant (`12deg` is the full swing)". | **Eng.** One custom property or TS constant. |
| G12 | Touch at desktop widths | Desktop tilt is for "a fine pointer". At `md` and up a touch device draws the desktop column, and touch fires `pointerenter` too. | **Eng.** Act on `pointerType` `mouse` or `pen` only, under `(hover: hover) and (pointer: fine)`. |
| G13 | What the hold's release swallows, and where the hold starts | README: "The release removes them and swallows the click, so the zoom does not open." On the phone no zoom opens. What a release does fire is `end()`'s tap: `if (d.source === "band" && full) onSnap("teaser"); else if (min) onSnap("teaser");`. The band also holds the peeks and the turn plate (`onControl`), and the card is `inert={full}`. | **Eng.** Arm the hold only on the card's own box, never on a control, and never at `full`. A hold's release suppresses the snap tap. |
| G14 | A canvas caption contradicts the spec | Details-Phone: "Card first, with its neighbours peeking at the edges. No hover, no tilt." Its own next specimen reads "Hold 300ms without moving: the card lifts and follows your finger, up to 6°". | **Eng.** The README, STATES and the specimen agree that the phone tilts after a hold. Build that. A documentation slip, not a design question. |
| G15 | Strength on pale art | R2-G1: "Check the 80% strength on real pale full-art and borderless faces in the build's contact sheet." | **Eng**, at build: a contact sheet against Hugh's staging CE deck. |
| G16 | Paint cost of the follow | §6 | **Eng**, at build: a Performance trace and `measure:load` before and after. |
| G17 | Probe coverage | `scripts/probe-foil-film.mjs` builds tiles only (`<img>` then the ring span). | **Eng.** Extend it with a background-face fixture: pending, failed, done and unmarked, the face's computed opacity asserted at 1 in every state and under both motion preferences, `[data-turning]` against inline vars (G4), and the shadow under reduced motion (G3). |

Accepted as drawn: R2-G3 (the precon asymmetry), R2-G4 (tilt on every card; Hugh approved R2 with it),
R2-G5 (the band replays on a remount), R2-G6 (a late cold face hides the band), R2-G7 (there are no light
themes), R2-G11 (`@property` falls back to stepped values; `--tilt-ease` stays local).

## Copy for /copy-review

None. `foil-treatment · copy strings.ts` exports `{}`, R2 adds no string, and no aria label changes. The
zoom trigger keeps `cardZoomCopy.zoomAria`.
