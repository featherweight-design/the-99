# The 99 — Commanders detail, "Full card" (design handoff, R1)

**Amendment 4 of four.** No new brief: this amends `design/design_handoff_the99_commanders/`
(decision 4 — the detail page and its full-card affordance) and inherits the printing-picker
handoff's modal geometry.

File: `The 99 - Commanders Full Card.dc.html` (canvas — pan/zoom). Read
`PARITY-lightbox-to-modal.md` for the element-by-element mapping of every piece of the
lightbox and where it goes, `full-card · copy strings.ts` for the copy diff.

**The one-line summary:** *the rich modal wins, the lightbox does not survive, and the label
changes with the destination.* `CommanderLightbox` is deleted (282 lines + a test file);
`FullCardTrigger` becomes a `CardDetailTrigger` around the same chip; `Full card` becomes
`Card details`.

**Amendment 1 and this one meet in one file.** `PIP_TEXT` lives in `lightbox.tsx`. They are
independent and land in either order.

---

## The call

| | Lightbox | Card modal |
|---|---|---|
| Sharp art | 262px | 180px, over a full-bleed blurred wash of the same art |
| Type line + oracle text | image pixels + an `sr-only` transcript | **real text**, keywords bolded, reminder text italic |
| Mana cost | 16px, fallback frame only, `PIP_TEXT` hack | 22/26px `ManaCost`, always |
| Set · Rarity · Identity · You own | **none** | all four |
| Printing picker | **no** | yes |
| Availability ("none free — in Gonti Theft") | **no** | yes, when claimed |
| Desktop | **does not exist** | 820×620, shipped on four routes |
| Bespoke code | 282 lines + test | **0** — one prop on an existing trigger |

The lightbox wins exactly one column, art size, by 82px. What it pays is every fact about the
card, on the one screen where a player decides whether to commit ninety-nine cards to this
commander.

## States delivered

| # | Frame | Desktop | Phone |
|---|---|---|---|
| A | The two candidates, element by element | ✓ | ✓ |
| B | The affordance before/after, and the rejected labels | — (no chip at desktop) | ✓ |
| C1 | The modal, 2+ printings — promoted Set row, `You own` spanning two | — | ✓ |
| C2 | The modal, single printing — full 2×2 grid + availability block | — | ✓ |
| C3 | The three things the lightbox did that must not be lost | ✓ | ✓ |
| D1 | 820×620 desktop modal opened from the commander art | ✓ | — |
| D2 | The desktop trigger — the one thing beyond the brief | ✓ | — |
| D3 | Prev/Next at `1 of 1`, and the rejected sibling list | ✓ | — |
| E1 | The deletion list, and the payload it removes | ✓ | ✓ |
| E2 | The a11y ledger — kept / gained / changed / lost | ✓ | ✓ |

---

## Decisions log

### 1. The rich modal, and the lightbox is **deleted**
Three outcomes were possible: keep both (lightbox on mobile, nothing on desktop, as today),
enrich the lightbox until it has the four meta fields, or replace it.

**Enriching it is the trap.** Adding Set, Rarity, Identity, You own and a printing picker to
the lightbox produces `CardModal`, badly, on one route — and `CardModal` is already mounted on
this page. The provider is at `detail.tsx:240`; every coverage chip and every synergy row opens
through it. The commander is the only card on its own page that opens something else.

**Keeping both** leaves a route where the same gesture on the same page gives you a spec sheet
for a support card and a poster for the commander, and leaves desktop with no way to reach the
printing picker for the card players most want to pick art for.

So: replace, and delete. The half-measure — leaving `lightbox.tsx` in the tree unused — is how
a codebase acquires two ways to show a card and a future bug report about the wrong one.

### 2. `Full card` → **`Card details`**
This is the honest cost of decision 1 and the only place the change is visible to a player.
A control labelled `Full card` that opens a details panel has lied about its destination.

- **Keep `Full card`** — cheapest, and it is the lie. A player who tapped for a big picture
  gets a 180px thumbnail and four meta fields.
- **`Details`** — true and weightless. On a page that is already three breakdown sections and
  forty named cards, "Details" does not say *whose*.
- **`Card details`** — **chosen.** Names the subject and the surface, and it is the app's own
  phrase: the close button on the thing it opens reads *Close card details*.

**The `⛶` glyph stays.** It is not a promise about size — it is the app's "open this bigger"
mark, and it is what makes the chip findable on an art band.

**The accessible name stops being bespoke.** `View full card` becomes the shared
`cardDetailCopy.triggerAria(name)` — *"View details for Kykar, Wind's Fury"* — so the
commander is no longer the one trigger on the page with its own convention.

### 3. The art-size regression is answered by the wash, not argued away
262px → 180px is a real loss and the frames draw it. Three things make it the right trade:

- **The wash is the lightbox's own device, taken further.** The lightbox put the art
  full-bleed behind the overlay at `opacity 0.28` / `blur(3px)`; the modal's phone header does
  `0.45` / `blur(22px)` / `scale(1.2)`. The atmosphere the lightbox was built for is intact.
- **The card modal's own source explains why the sharp copy is small**: the band and the tile
  drew the same picture, and at full sharpness the card's text was legible twice over at two
  sizes. One sharp copy is a deliberate fix, not a limitation.
- **The text is text.** At 180px nobody reads oracle text off the art anyway; at 13.5px in a
  bordered block, with keywords bolded, everybody can — including anyone zooming, selecting,
  or using a screen reader on something other than an `sr-only` transcript.

### 4. `Tap anywhere to close` goes; the gesture stays
The modal's backdrop closes on click, exactly as the lightbox's overlay did. The *sentence*
goes, because at 390px the modal is a full-screen sheet with no visible backdrop for the
sentence to be about. The close control is the shipped 32px `✕` at the top right, at a 44px hit
box — where a sheet's close control belongs.

### 5. The no-art fallback is kept by **not drawing a card**
The lightbox drew a card frame — name, pips, an oracle glass panel over an identity gradient —
because the picture *was* the surface, so it had to invent one when there was no image.

The modal already puts every one of those elements on screen, at larger sizes, as its own
content. So the art slot takes `identityGradient` and nothing is missing. **282 lines of
hand-drawn card frame go with the file**, and that is most of what is being deleted.

### 6. Desktop gets the same trigger — the one thing beyond the brief
The brief asks about mobile, because that is where the lightbox lives. But the desktop
commander page shows the art and the oracle text and **has no route to the printing picker at
all** — and the commander is the single card a player is most likely to want alternate art for.
So the desktop art panel becomes the same `CardDetailTrigger`, which is exactly what
`builder-spine.tsx` already does with the commander thumb on `/decks/[id]`.

**No visible affordance is added at desktop** — no chip, no `⛶`. The art becomes a button with
the shared accessible name and the shared pointer cursor, matching the spine. A chip over a
320px art panel, on a page that already has a primary *Build this deck*, would be a third
competing target.

**Reject this and nothing else changes.** The mobile call, the deletion and the label all stand
on their own.

### 7. `1 of 1`, and no sibling list
The provider renders `1 of 1` with both arrows disabled when no siblings are passed, and that
is the correct reading: a commander has no peers on its own page.

**Rejected: passing the ranked commander list as siblings** so Next pages to the next
recommendation. It sounds free and it is wrong — the modal would silently disagree with the
page behind it, which is still the commander you opened. `/commanders` is the surface for
comparing commanders and it is one back-navigation away.

### 8. No `Add` control in the modal on this route
The derived constraint the recommendations and synergy handoffs both carried, unchanged: the
modal must not assume a deck. The commander page's own *Build this deck* is the entry point.

### 9. The payload gets smaller, and the wait gets a name
`LightboxCommander` shipped `name`, `manaCost`, `typeLine`, `oracleText`,
`colorIdentity` and `imageUri` to the client on **every** commander-detail render, to draw a surface most players
never open. The modal fetches on click — the pattern the provider's own comment says it exists
for.

The trade is honest and worth stating: the lightbox opened instantly. The modal has a fetch,
and the provider's live region already announces *"Loading card details…"* for it. Same
round-trip every coverage chip on the page already makes.

---

## Component notes

Hexes live only in `globals.css`. **No new token, no new component, no new geometry.** Every
frame in the canvas is a shipped component at its shipped values.

| Component | Spec |
|---|---|
| **Affordance chip** | Unchanged: absolute `top 56 / right 16`, radius 999px, padding `6px 11px`, gap 6px, `backdrop-filter: blur(4px)`, `color-mix(in oklab, var(--bg) 55%, transparent)` on `1px color-mix(--fg 18%)`. Glyph `⛶` 12px `--fg`; label mono 10px `letter-spacing .08em` `--fg`. **Only the label text changes.** |
| **Full-band tap target** | Unchanged: `aria-hidden` absolute-inset div, never focusable, chip is the accessible control. |
| **Phone modal** | Shipped `CardModal`: full-screen sheet on `--surface-sunken`; art header `44px 20px 20px` with the wash at `0.45 / blur(22px) / scale(1.2)`; sharp art 180px at 63/88, radius 10px; `✕` 32px at `top 22 / right 18`. |
| **Meta, 2+ printings** | `Rarity` + `Identity` in the 2×2 grid, `You own` spanning both columns, `Set` promoted to the 62px `MobileSetRow` with its 40×56 thumb and `N printings you own ▾`. |
| **Meta, 1 printing** | Full 2×2: `Set`, `Rarity`, `Identity`, `You own`. |
| **Desktop modal** | Shipped: 820×620, `max-height 85vh`, 320px art column on `--bg` with 28px padding, content column `30px 32px`, `✕` 34px, Prev/Next row above the bottom border. |
| **Desktop trigger** | The art panel wrapped in `CardDetailTrigger`. No chip, no glyph, no visual change beyond the pointer cursor and the focus ring. |
| **Availability block** | Shipped `AvailabilityDetail`, which renders only when the card is claimed. On a commander it is frequently the most useful thing in the modal. |

## Notes for engineering

- **Delete `src/components/commanders/lightbox.tsx`** (282 lines: `CommanderLightbox`,
  `LightboxCommander`, `PIP_TEXT`, the drawn card frame, the oracle glass panel) **and
  `lightbox.test.tsx`.**
- **`full-card-trigger.tsx`:** keeps the chip and the full-band target; loses `useState`, the
  lightbox import and the `LightboxCommander` prop. Becomes a `CardDetailTrigger` wrapping its
  own chip — or two, since the full-band div and the chip both open it. Props become
  `{ oracleId, name }`.
- **`detail.tsx:299`:** pass `oracleId` + `name` instead of the six-field commander object.
  `detail.tsx:240` already mounts the provider — nothing to add there.
- **`detail.tsx` desktop art panel:** wrap in the same trigger (decision 6). Skip this and
  everything else still holds.
- **Copy:** `Full card` → `Card details`; the bespoke `aria-label` is deleted so the trigger
  falls back to `cardDetailCopy.triggerAria(name)`. The lightbox's `aria-label`
  `Full card — {name}`, its `Close full card view` and its `Tap anywhere to close` are deleted
  with the file. See `full-card · copy strings.ts`.
- **`getCardDetail` works for a commander** — it is route-agnostic by design and takes an
  oracle id, owned or not. A commander on this surface is owned by definition (the route is
  "buildable from cards you own"), so `You own ×1 copy` is the normal case.
- **Nothing in `cards/` changes.** `CardModal`, `CardDetailProvider`, `PrintingRegion` and
  `ManaCost` are all untouched.
- **`useIsDesktop` is not needed.** Both widths open the same component; the modal handles its
  own breakpoints.

## Gap report

1. **A commander whose art the catalog is missing now shows a gradient instead of a drawn
   card.** Strictly less pretty than the lightbox's frame, and strictly more informative,
   because every element the frame drew is in the modal at a larger size. Worth an eyes-on
   check against a real commander with no `imageUri`.
2. **The fetch is a new wait on this route.** ~150–400ms with a live-region announcement,
   where the lightbox was instant off already-shipped props. Accepted (decision 9); if it reads
   badly, the fix is the provider's, not this route's.
3. **`quantity` on a commander is nearly always `×1`.** `You own ×1 copy` is true and dull. It
   earns its slot only in the case that matters — the player with two copies, or the one whose
   only copy is claimed by a finished deck, which is what the availability block says.
4. **Nothing replaces the lightbox's poster feel.** Some players opened it to look at the art,
   full stop. There is no "view art large" gesture anywhere in the app after this, and the
   printing picker's tiles are the closest thing. If that turns out to matter, the answer is a
   zoom on the modal's own art, in `cards/`, for every card — not a second surface for one.
5. **The desktop art becomes a button with no visible affordance.** Consistent with the
   builder spine, which has the same silence, but neither surface tells you the art is
   clickable until you hover. Pre-existing; this amendment doubles the number of places it
   applies.
6. **Two `Escape` stages may surprise a player who came from the lightbox**, where one Escape
   always closed. Correct behaviour (the printing region is a disclosure inside a dialog) and
   shipped everywhere else.

## Files
- `The 99 - Commanders Full Card.dc.html` — the canvas (this handoff's deliverable).
- `README.md` — this file.
- `PARITY-lightbox-to-modal.md` — every element of the lightbox and where it goes.
- `full-card · copy strings.ts` — the copy diff: one replacement, three deletions.
- `READINESS.md` — self-assessed readiness and what blocks a green.
- `brand/` — the locked brand sheet + brand README, copied in for self-containment.
- `support.js` — runtime for the HTML reference; not production code.
