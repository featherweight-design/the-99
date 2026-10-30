# STATES — every render of a commander's image

The settled geometry for all fifteen, after six rounds of review. Read with `README.md` for the
reasoning and `READINESS.md` for what blocks a green.

**`labelAt` is pixels from the foot, and it is the block's MEASURED height** — not its intended one.
Every value below was read off the drawn block at its reference width, and each was checked so the
block's top edge sits at or below its own ramp start. Deriving `labelAt` from an intended height is
what reintroduced the round's own failure in R5; see README's R6 note.

---

## The four bands

| band | px | renders | governs |
|---|---|---|---|
| Header | **288** | 01, 04, 09, 10 | a page header — one per screen, nothing competing below the fold |
| Cell | **248** | 08 | a grid cell telling you which of several things this is |
| Row | **208** | 06, 07 | a full-width result row you scan down — the one class priced by scroll |
| Resume | **168** | 02 | a secondary cell on a page about something else |

`art_crop` is 1.37:1, so portrait width = height × 1.37 → **230 / 285 / 340**. The 288 desktop band
**inverts that rule and is the only one that does**: its portrait width is chosen at **560** and the
height follows, because the shape was picked first.

---

## The fifteen

| # | render | class | height | strategy | labelAt | ref width | notes |
|---|---|---|---|---|---|---|---|
| 01 | `hero-commander.tsx:58` | header | 288 | cover | **38** | 390, three-up | block is one row: name · pips · type · fit chip |
| 02 | `resume-decks.tsx:99` | resume | 168 | cover | **40** | 390 | the one strategy flip — was 72 `left-portrait` |
| 03 | `deck-rail.tsx:131` | thumb | 44×62 | — | — | — | **expiring** — §5 removes the rail |
| 04 | `detail.tsx:249` | header | 288 | cover | **57 †** | 390 | † measured at 248; see Open 2 |
| 05 | `detail.tsx:469` | card face | 344 | — | — | — | geometry untouched |
| 06 | `discovery-row.tsx:349` | row | 208 | left-portrait 285 | **46** | 390 + 760 | the inset frame retires |
| 07 | `rec-card.tsx:147` | row | 208 | left-portrait 285 | **46** | 760 | the literal `148` retires |
| 08 | `deck-card.tsx:153` | cell | 248 | cover | **46** | 445 | needs a ≥330px column |
| 09 | `spine-mobile.tsx:128` | header | 288 | cover | **83** | 390 | title wraps to three lines in a 302px column |
| 10 | `spine-desktop.tsx:116` | header | 288 | left-portrait 560 | **flat** | 1376 | **≥1200px of row**; below that, 340 at a 364 inset |
| 11 | `create-picker.tsx:524` | thumb | 44×62 | — | — | — | one size at both widths |
| 12 | `create-picker.tsx:644` | thumb | 64×89 | — | — | — | a summary, not a row |
| 13 | `create-pre-filled.tsx:138` | thumb | 64×89 | — | — | — | same job as 12 |
| 14 | `create-pre-filled.tsx:167` | card face | 220 | — | — | — | geometry untouched |
| 15 | `partner-slot.tsx:96` | thumb | 44×62 | — | — | — | dashed empty plate keeps its border |

---

## The ramp

```
bottomScrimStops(labelAtPx, band) =
  [[0, 0],
   [0,  (band − 1.48·at) / band × 100],
   [73, (band − at)      / band × 100],
   [73, 100]]
```

One function, both strategies. `0.48` and `73` are the shipped constants (`1.48` is `at + 0.48·at`
folded together). **The second argument is required:** the stops are gradient position percentages, so
a px `labelAt` through the old one-arg signature holds the scrim at 46% of the band instead of 81%.

| | ramp | hold | unveiled |
|---|---|---|---|
| 288 / 38 | 80% | 87% | 80% |
| 288 / 57 | 71% | 80% | 71% |
| 288 / 83 | 57% | 71% | 57% |
| 248 / 46 | 73% | 81% | 73% |
| 208 / 46 | 67% | 78% | 67% |
| 168 / 40 | 65% | 76% | 65% |

**Retired:** `COVER_SCRIM_STOPS.top`, `labelEdge`, `art-wash-scrim-cover-top` and its
reduced-transparency override, `PORTRAIT_BANDS.vertical`, `PORTRAIT_BANDS.clearTo`, `OVER_ART_PLATE`,
the 104px floor, and every aspect-ratio band.

**Never re-spec:** the full-bleed `cover` copy at ambient 0.28. It was deleted from `art-wash.tsx`
because past the portrait's own width it was a second, differently-scaled print of the same picture
behind the first — it read as a double image. With art, the masked sharp portrait is the only art layer.

| | portrait | maskEnd | clearTo | flatStop |
|---|---|---|---|---|
| 208 | 285 | 58% | 165 | **300** (new) |
| 248 | 340 | 58% | 197 | **356** (new) |
| 288 | 560 | 58% | 325 | **584** (new, ≥1200px only) |
| *168* | *230* | *58%* | *133* | ***240** (shipped, unchanged)* |

`clearTo` derives (`maskEnd% × width`). `flatStop` does **not** — `PORTRAIT_BANDS` says so in its own
comment, each was drawn against its own surface.

---

## Chrome

**THE PLATE** — every control that sits over art:

```
background:      var(--bg)          ← opaque; no per-theme measurement needed
border:          1px solid var(--border-strong)
border-radius:   7
drawn box:       26–32px, centred in a 44px target
icon only        ← no label on any render, any frame
aria-label       ← REQUIRED, not optional
backdrop-filter: — (retired)
```

**Block chrome takes no plate.** The ramp protects the label block; plates protect what is above it.
So the rename pencil is an inline unplated glyph in the title's own text run (`--fg-muted`,
zero-width container, `padding:15px; margin:-15px` for its 44px hit area) — on **both** frames. The
expand icon keeps its plate on the same surface because it acts on the art and sits over art.

**Result: all fifteen renders have an empty top edge.** That is what makes deleting the top scrim free.

**The thumb plate** — the five renders that each invented one:

```
63/88 · radius 6 · center top/cover
ground var(--elevated) under the art
ring   inset 0 0 0 1px rgba(0,0,0,.4)
```

`.4` replaces three shipped alphas (`.35` partner slot, `.35` pre-filled thumb, `.3` both card faces).

**Image source:** `art_crop` where we print type over it, the card face where we do not.

---

## The six deck statuses

Verbatim from `src/lib/decks/status-style.ts`. Fill is
`color-mix(in srgb, var(TOKEN) ALPHA, var(--bg))` — into `--bg`, never transparency, so the plate is
opaque at every alpha. `statusBarStyle` takes the **same token**, so chip and bar are one decision.

| status | token | fill | label | border |
|---|---|---|---|---|
| Draft | `--fg-faint` | 16% | `--fg-muted` | solid |
| Building | `--fg-body` | 14% | `--fg-body` | **dashed** |
| Over | `--danger` | 18% | `--danger` | solid |
| Unresolved | `--warning` | 18% | `--warning` | solid |
| To buy | `--accent` | 18% | `--accent` | solid |
| Complete | `--success` | 18% | `--success` | solid |

Geometry: 22px tall, 6px radius, 8px padding, mono 10.5px, tracking .06em (the shipped `sm:` tile
class). Building's dash is the one status signal that survives greyscale and colour blindness.

**On the deck tile the chip sits on the progress-bar row, not in the block** — `[chip] [bar] [count]`,
reading left to right as one sentence about progress. That is what drops the tile's `labelAt` from 78
to 46 and unveils 73% instead of 54%.
