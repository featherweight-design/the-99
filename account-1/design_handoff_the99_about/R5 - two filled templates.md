# R5 — two filled §G templates

Two routes a reader can reach with nothing on the About page explaining them. Both entries are
`since: 6`. Filled on the §G artboard (`STATES-about-r3.md`), one slot per line, in artboard order.

Neither is drawn on the canvas — §G3 is explicit that a new entry is a filled template plus a
fixture, not a canvas edit. Both specimens mount shipped components with fixture props.

---

## Entry 36 — Review and commit

| Slot | Value |
|---|---|
| **Title** | Reviewing what a commit will cost |
| **Route** | `/decks/[id]/changes` |
| **Opens** | opens the review page |
| **Chapter** | 03 — Building the 99 |
| **Width** | plate |
| **since** | 6 |

**Caption**

> A draft becomes a version here, and this page is the only place that says what that will cost.
> Not what the deck holds — the deck page already shows that list — but what committing it asks of
> the rest of your collection. Cards coming in are counted into four buckets, and a card another
> deck has already sleeved carries **Pull it**: take that copy, and the deck holding it is cut a
> version. It is the one act on this page nobody can take back. Cards going out carry **Put back**,
> and the commit sheet below the columns is where the version is actually cut.

**Specimen** — `Column`, `columnKey="in"`, from `review-changes.tsx`, with its
`DecklistGroupHeader` and three `DiffRowIn`s. Real `PullControl` on row 2; row 3 renders its
`pullGuardTag`. Rendered at the desktop column width.

**Fixture props** — `fixtures.reviewIn`:

```
heading      copy.groupIn(9)            → "Coming in · 9"
note         copy.groupInBreakdown(5,3,1) → "5 free · 3 sleeved · 1 to buy"
headingTone  var(--success)
rows[0]      Beast Within · bucket "free" · no action
rows[1]      Rhystic Study · bucket "claimed" · heldBy "Atraxa Counters" · PullControl
rows[2]      Sol Ring · bucket "claimed" · pullClaim.pending → tag "deck in draft", no control
claimsKnown  true
onRestore    null          (this column has nothing to put back)
```

**Key lines** (3 of 4)

1. `Coming in` is broken down where it is headed — free, sleeved, to buy — so the page says what
   the commit costs before a single row is read.
2. `Pull it` takes a copy out of another deck and cuts that deck a version. It is the one act on
   this page that cannot be undone, which is why the deck it raids is named on the row.
3. a deck with a draft of its own cannot be raided, so the row says `deck in draft` and offers no
   control — the same shape a commander's row takes.

**Phone reduction** — one column at a time behind a segmented `Coming in · N` / `Going out · N`
pair; the figure chips and the lede are desktop-only and the caption carries the lede's sentence
instead. The breakdown note stays on the heading. Rows keep their name, availability slot and
control — the row floor is unchanged.

**Strings from** — `copy/deck-versioning.ts` (`review.*`, `restore.cta`). Every string in the
figure is that module's; nothing retyped.

---

### Why this slice

The route is ~1,100 lines and every chapter-03 figure that tried to draw a whole route was cropped.
The `Coming in` column is the slice carrying everything this route has and no other route does:
the four-bucket breakdown, `Pull it`, and the two guards. The changed strip is the deck page's own
mix strip folded over two lists — it is `shape`, documented on the deck-page entry — and the commit
sheet and discard confirm are consequences the caption names in one clause each.

`Put back` is drawn on entry `undo-removal` (chapter 03) and named here in the caption rather than
drawn twice.

---

## Entry 37 — Starting a deck

| Slot | Value |
|---|---|
| **Title** | Starting a deck |
| **Route** | `/decks/new` |
| **Opens** | opens the commander picker |
| **Chapter** | 03 — Building the 99 |
| **Width** | plate |
| **since** | 6 |

**Caption**

> Every deck starts with a commander you already own. The picker lists them all with the size of
> the pool each one opens up — how many of your cards are legal in its colours — and a name is the
> only other thing a deck needs. Commanders that partner get a second slot, filtered to the ones
> they can legally pair with. Arriving from a commander's own page skips the list: the commander is
> already chosen and the page asks for the name.

**Specimen** — `CreatePicker` with `mode="create"`, desktop two-column: three rows on the left, the
`Selected` sidebar with its name field and `Create deck →` on the right.

**Fixture props** — `fixtures.createPicker`:

```
legalCommanders[0]  Preston Garvey, Minuteman · RGW · poolCount 1615
legalCommanders[1]  Kotis, Sibsig Champion    · UBG · poolCount 1747   ← selected
legalCommanders[2]  Kinnan, Bonder Prodigy    · UG  · poolCount 1402
deckName            "" (placeholder "Deck name…")
```

Row meta is the component's own `${colorLabel} · ${poolCount} cards`. No partner in the fixture —
`PartnerSlot` is named in the caption, not drawn, because it appears only for a commander with the
ability and would need a fourth row to explain itself.

**Key lines** (3 of 4)

1. only commanders you own and could legally build are listed — the picker is your collection, not
   a catalogue.
2. the figure beside each one is how many of your cards are legal in its colours, which is the
   `Pool` part of a fit score seen from the other side.
3. a name is required and everything else has a default: the deck is created empty, and the 99 is
   filled in afterwards.

**Phone reduction** — single column. The name field moves into the scrolling flow **above** the
list (the list is every legal commander you own and scrolls, so a required field after it can
never be found), and a fixed dock at the foot carries the selection summary and the button only.
The specimen draws the desktop two-column arrangement; the phone's dock is named in key line 3's
sibling clause rather than drawn.

**Strings from** — inline in `create-picker.tsx` (`"Pick a commander"` / `"New deck"`,
`"Choose a commander from your collection."`, `"Create deck →"`) plus
`copy/decks-builder.ts` `addPanelCopy.createPicker.dockSummary`. ⚠ **The create-mode strings are
not in a copy module** — an eng issue, not a design one, but it means this entry's figure is the
one place on the About page that quotes a component's literals directly. Flag it for extraction so
a rename reaches this page.

---

### Why the picker and not the pre-filled door

`CreatePreFilled` is the same act with the list already answered — same `createDeck`, same name
field, same button. The picker is the door a reader reaches by intent (`/decks/new` from the deck
library); the pre-filled door is reached by having already chosen, from a surface chapter 02
documents. **An entry drawn on the pre-filled door would teach the shortcut and leave the front
door undocumented**; drawn on the picker, the shortcut is one caption clause.

The clause also carries the only thing the pre-filled door adds that the picker does not — that
synergy picks made on the commander page travel with you into the new deck — which is the part a
reader could not guess.

---

## What these two do not cover

`/decks/import` (documented, entry `deck-import`), and the pre-filled door above. Nothing else on
the 17-route sweep is unrepresented after these land: **37 entries, 17 routes.**
