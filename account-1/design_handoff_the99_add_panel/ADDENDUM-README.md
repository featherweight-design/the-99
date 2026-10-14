# The 99 — Decks · Add panel **addendum** (design handoff, R3)

Six follow-ups from the #158 run: **#183 · #177 · #179 · #185 · #184 · #176**. This is an
addendum to the shipped Add-panel handoff, not a replacement — `The 99 - Decks · Add Panel.dc.html`
(R2) and `add-panel · copy strings.ts` are **locked and unedited**. Everything new lives beside
them, prefixed `ADDENDUM-`.

File: `The 99 - Decks · Add Panel Addendum.dc.html` (canvas — pan/zoom). Every state leads with
the phone, desktop beside it. Read `design_handoff_the99_richness/README.md` for the locked voice
before auditing the copy.

**The one-line summary:** *one dock, one bar, and content pays rent* — plus one row's full
lifecycle, one control per coverage cell, and a tile for the suggestions we do not own.

## States delivered

| # | State | Phone | Desktop |
|---|---|---|---|
| 1 | The bottom-of-viewport rule (three-layer diagram + reserve arithmetic) | — | ✓ |
| 2 | #183 empty builder — shipped (clipped) and ruled | ✓ ✓ | ✓ |
| 3 | #177 `/decks/new` — shipped (occluded) and Create-as-dock | ✓ ✓ | (unaffected; stated) |
| 4 | #179 decklist row with remove — idle, pressed, multi-copy | ✓ | ✓ |
| 5 | #185 removed / undo-available row, and a refused undo | ✓ | ✓ |
| 6 | #184 strip cells — idle, hover, pressed, at-target; rationale disclosure open | ✓ | ✓ |
| 7 | #176 unowned tile beside the owned tile; the trailing shelf in context | (tile 2-up identical) | ✓ |
| 8 | The **nine** copy calls, before/after, with the two figure labels drawn | — | ✓ |

Plus the token + a11y contract card.

---

## Decisions log

### 1. The bottom of a phone viewport → **three layers, one dock, and a reserve**
#183 and #177 are the same defect on two routes, so they get one rule instead of two paddings.

```
Layer 3  content        reserves the stack below it; centres INSIDE the reserve, never through it
Layer 2  route dock     one per route. sticky, bottom: 80px (phone) / 0 (md)
Layer 1  shell tab bar  fixed, 80px, phone only. owns the true bottom edge on every route
```

```
phone    padding-bottom: dock + 80px + 12px
md:      padding-bottom: dock + 12px
centred  min-height: 100% − reserve
```

No new token. `80px` is the shipped tab-bar height already hard-coded in `builder-shell.tsx`
(`bottom-[80px]`, with the comment explaining why a sticky element does not see the main's
`pb-[80px]`); the dock's own height is measured, because it is one element in one place per route.

The rule also **forbids the cheap fix**: hiding the quick-add bar on the empty builder would clear
#183 in one line and delete one of the two entrances the empty caption points at. The dock is not
conditional; the reserve is.

### 2. #183 → **pad the scroll region; if it is tight, the mark shrinks, not the copy**
Three fixes were available. Moving the caption above the tabs breaks the empty screen's reading
order. Hiding the bar costs an entrance. Padding costs nothing and generalises.

The empty section stops being `flex-1` against the scrollport and becomes `min-height: 100% −
reserve`. Where that leaves the composition tight, the illustration pays: crab `72 → 64px`, card
fan `96 → 88px`. The caption is the only line on that screen telling a first-time builder what to
do next, and the role hint is the only one telling them what to fill first — neither is droppable.

### 3. #177 → **the Create button becomes the route's dock**
Padding `/decks/new` would make the button reachable at the end of a scroll through the whole
commander catalogue. The rule says a route's primary action is either the dock or in flow; this
one has no business being in flow.

The dock carries a summary line above the button, because a pinned bar covers the rows it acts on:
`Kykar, Wind's Fury · Jeskai`, or `Pick a commander to start` with the button disabled. **The dock
is present from first paint** so the screen never reflows under a thumb. Desktop is untouched — no
tab bar, no occlusion, and the picker's Selected sidebar keeps the button where it is.

### 4. #179 → **the same ✕, at a 44×44 hit box. Not swipe, not a mode.**
Swipe-to-remove is invisible and unreachable by keyboard. An edit mode is a mode for a one-tap
action. A row overflow menu is two taps and a new pattern. The control already exists in
`decklist-row.tsx` and is drawn `hidden md:block` — it loses the class and gains padding. Glyph
stays 13px; the target is the padding.

This is also the locked parity constraint doing its job: #158 forbade width-only constructs, and a
remove affordance that exists at one width is that same defect one surface over.

### 5. #185 → **undo lives where the row was. No toast, no timer.**
**No toast.** This app has no toast pattern, and after decision 1 the bottom of a phone is spoken
for — a toast would fight the dock or float over the tab bar. Instead the removed row **holds its
slot as a spent slot**, which is exactly what an accepted suggestion tile already does in Consider
(#158 decision 8). Same principle, one design language, and the user's eye is already there.

**No timer.** #185 exists because the optimistic path makes the row vanish faster than a mis-click
is noticed; a 5-second toast that also vanishes fixes half of it. The undo row persists until
Undo is pressed, another card is removed (one at a time — the older one settles), or the builder
is left.

**Only a last copy gets one.** A stack of basics decrements and keeps its row, so the row is its
own receipt. `decklist-row.tsx` already branches on `quantity <= 1`; the undo row hangs off that
same branch. A refused undo states itself in the row via the existing `MutationError`.

**Lifetime, precisely** (the R2 audit was right that "until you leave the builder" was under-specified):
the undo row is **decklist state, not row state**, so it **survives a tab switch** to Consider and
back — the likeliest interaction, and the one where a vanishing undo would be worst — and survives
any re-sort. It is cleared by exactly three things: Undo pressed, the next removal, or leaving the
builder route. **The counts do not wait:** the group count above a spent slot decrements immediately
(`Artifacts 6 → 5`) along with the 99 count, because the card is out of the deck the moment the row
is spent. The slot is a receipt, not a pending state — if the counts held, the deck would be lying
about its own size for as long as the row lived.

### 6. #184 → **the cell is the link; rationale becomes one strip-level disclosure**
The build drew the link *beneath* the cell because an anchor cannot nest inside the button that
owns the rationale. That constraint is real; the answer is to move the rationale, not to add a
second control. **Ten targets become six.**

A short cell **is** a control (switch to Consider, scroll to the shelf, move focus to the shelf
heading). A met cell is a figure with no action. The `consider →` caption stays as a *label inside
the cell*, so it can stay at 9–10px — it is no longer a target. 44px arrives for free: the desktop
cell is 72px tall, the phone cell 62px.

Rationale gets better, not worse: five separate expansions each pushing the strip taller become
one panel that answers the whole strip at once, which is how a player reads it anyway. The desktop
worked-example callout is unchanged.

### 7. #176 → **keep them, mark them `buy`, shelve them last** (Product to ratify)
R1 decision 5 said *"`suggestDeck()` iterates `ownedPool` only, so every suggestion is already
owned."* True of `suggestDeck()`, false of `getDeckSuggestions()`, which has appended up to five
unowned EDHREC staples since #25. **The error is Design's, and three things inherited it:** the
tile has no unowned variant (those five signal themselves only by the absence of an `aria-hidden`
dot), the provenance line claims ownership of cards the shelves do not own, and decision 5's
reasoning for keeping the owned axis out of Consider assumed that axis had one value.

Design's call is **A — keep, marked**: the deck already carries a buy list, #42 ships the
import that fills it, and #132 is the backlog ticket for exactly this direction. **B — drop the
append** at `actions.ts:149-163` makes the premise true again and none of the drawing ships. It is
a product call either way and it sits in READINESS.

Under A:
- **Tile:** the ownership dot's slot takes the decklist row's shipped `buy` tag (same hex, same
  word) and Add goes **secondary** per the §404 CTA contract — adding a card you do not own is a
  real action, just not the deck's default one. **No note line under the type line** (R1 drew one;
  the R2 audit cut it — see §8).
- **Shelf:** the unowned five never mix into a coverage shelf, because a shelf that says *you have
  2 of 10* is about cards you can play tonight. They take the **existing `edhrec` label** (`Top
  picks for Kykar`) with the clause `not in your collection`, and sort last — after the targetless
  shelf. No new role, no new taxonomy.
- **Provenance:** `59 owned · 5 you don't own`, used **only** when the append has actually put
  something on the shelves. It deliberately does not reuse the app's `N to buy`, which counts a
  different set one tap away (see §8). The locked string is unchanged when every suggestion is owned.

### 8. Copy inside the lock — **nine calls: five dashes, one doubled numeral, two unlabelled figures, three orphans**
These sit in `add-panel · copy strings.ts`, which eng cannot touch, so Design states them:

| Key | Was | Now |
|---|---|---|
| `shelf.noTarget` | `no target — this is the deck's plan` | `no target · this is the deck's plan` |
| `degraded.body` | `…decks run — so the shelves are honest…` | `…decks run. The shelves are honest and the percentages are missing.` |
| `quickAdd.ownedFilterOffNote` | `filter off — N results you don't own` | `filter off · N results you don't own` |
| `builderEmpty.caption` | `…take the ninety-nine we've already picked out — ${c} eats everything anyway.` | `…take the ones we've already picked out. ${c} eats everything anyway.` |

**Three more, found by the R2 audit — #184 orphans them and the addendum had not said so:**

| Key | Was | Now |
|---|---|---|
| `strip.hint` | `Click a cell for rationale · a cell under target links its shelf below` | `A cell under target opens its shelf below` |
| `strip.shelfLink` | `consider` | **deleted** — superseded by `strip.cellLink` (`consider →`) |
| `strip.shelfLinkAria` | `See ${role} cards to consider` | **deleted** — superseded by `strip.cellLinkAria` |

`strip.hint` goes false in **both** clauses once the cell is the control: clicking a cell no longer
opens rationale, and a cell does not *link* a shelf, it *is* the link. It is the **same key at a new
value**, not a second key — the addendum's `strip.hint` overwrites the locked one and eng ships one
live value. Do not merge the two objects and leave both. (R2 kept a second clause glossing the
rationale trigger; **R3 cut it** — a question mark mid-sentence explaining a control that sits in the
same strip saying the same words.)

The arrow moves *into* `cellLink` because the label is no longer a link and cannot borrow the
affordance from one. And **`shelfLinkAria` was the only consumer of `RECOMMENDED_MIX.land`'s singular
label** (`'land'`) — the cell face and `cellLinkAria` both use the display label (`'Land'`), so the
singular becomes dead data. Delete it with the string unless something else claims it first.

**Two more copy calls, also from the audit:**

- **`strip.cellLinkAria`** carried an em dash inside an aria-label, which is in scope for the same
  rule. Now two sentences: `Ramp, 4 of 10. See ramp cards to consider.`
- **`unowned.note` is cut.** `not owned · goes on your shopping list` restated what the `buy` tag and
  the shelf heading already say, in a noun this app does not have. The shipped vocabulary is
  **`to buy`** — `builder-spine.tsx:202` and `deck-card.tsx:162` both print `N owned · N to buy`.
  The tile keeps the tag, its aria, and the shelf heading; that is three independent carriers of
  ownership without a fourth line.
- **`provenanceWithUnowned` states the axis, and does *not* borrow `N to buy`** (R3). The shipped
  phrase counts *cards in this deck you don't own* (`builder-spine.tsx:202`, `deck-card.tsx:162`);
  in Consider the same words would count *suggestions you haven't added* — different denominator,
  one tap apart. So: **`59 owned · 5 you don't own`**, not `59 owned · 5 to buy` and not R1's
  `59 cards you already own · 5 worth buying`.

The two mono meta lines take a middot because their own rows already separate with one. The two
prose lines take a full stop, because in both the dash was doing a sentence break's job in a
register that has no jokes in it. The empty caption's second *"ninety-nine"* was the sentence
counting itself twice; the first one means something. **"A king with no army." and "eats everything
anyway" are locked and verbatim — only the joint between the clauses moved.**

**The two figures need a drawn label, not a reword.** `10%` and `+31 pts vs. average` both state a
rate against a comparison that lives in `inclusionAria` only: a screen reader hears the baseline,
an eye does not.

- Inclusion gains a 9px `--fg-locked` `edhrec` label in front of the bar. The aria sentence is
  unchanged.
- Lift becomes `+31 pts vs. all decks`. "Average" named a number the player has never seen; the
  baseline is the card's inclusion rate across every deck EDHREC knows. Four characters more, one
  line on a 168px tile.

---

## Component notes

Hexes live only in `globals.css`; everything below is `var(--*)`. **No new token, no new
dependency, no new motion.**

| Component | Spec |
|---|---|
| **Route dock** | `--bg` fill, `1px --border` top, sticky `bottom: 80px` phone / `0` md. Padding `10px 16px 12px` phone, `11px 30px` md. One per route. |
| **Dock summary line** | Plex Mono `10.5px --fg-faint`, `mb 7px`. Only on a dock whose button acts on a selection the dock covers. |
| **Dock primary button** | Full width, `--brass` fill, `--bg` label, `15/600`, radius `8px`, height `48px`. Disabled `opacity .5` with the empty summary line. |
| **Row remove ✕** | Glyph `13px --border-dashed`, hover/pressed `--fg-body`. Hit box `44×44` phone (pressed: `--elevated` plate, radius `6px`), unchanged inline target on desktop. Never on a meta row. |
| **Undo row** | Replaces the removed row in place, same min-height. `--surface-sunken` fill, `1px dashed --border-strong`, radius `6px` / `7px`. Label Plex Mono `11.5px` / `12px --fg-locked`, no strikethrough. |
| **— Undo control** | Phone `44px` tall, `12px` side padding, `13/600 --brass`. Desktop text button, `12.5/600 --brass` with a `1px --brass-shadow` rule; `--brass-hover` on hover. |
| **Strip cell (short)** | The whole cell is the control. Idle `--surface-sunken` / `1px --border`; hover `--elevated-hover` / `1px --border-strong`, caption → `--brass-hover`; pressed `--bg` / `1px --brass-shadow`, caption → `--brass-mid`. Desktop `72px` tall, phone `62px`. |
| **— cell caption** | `consider →`, Plex Mono `10px` md / `9px` phone, `--brass`. A label, not a target. A met cell prints `—` in `--border-dashed`. |
| **Rationale disclosure** | One per strip. Trigger Plex Mono `11px --brass` with a `1px --brass-shadow` rule; panel `--surface-sunken`, `1px --border`, `border-left 3px --brass`, radius `9px`, `11×13`, four lines at `12px --fg-body` with the role in `--fg`. |
| **Unowned tile** | The owned tile, two deltas: dot → `buy` tag (Plex Mono `9px --warning` on `rgba(20,17,14,.82)` with `inset 0 0 0 1px rgba(224,145,60,.5)`, radius `4px`, top-right on the art); Add → secondary (`1px --border-strong`, `--fg` label). **No note line** — cut by the R2 audit as a restatement. |
| **Unowned shelf** | Existing `shelf.labels.edhrec` heading; coverage clause `not in your collection` in `--warning`, then `· N to consider` in `--fg-faint`. Sorts last, after the targetless shelf. |
| **Tile evidence label** | Plex Mono `9px --fg-locked`, before the bar, `gap 6px`. Present on every tile that prints a percentage. |

## Notes for engineering

- **`decklist-row.tsx`**: drop `hidden md:block` from the ✕ and give it a `44×44` phone hit box;
  keep `disabled={isPending}`. The `quantity <= 1` branch that returns `null` today returns the
  undo row instead.
- **Undo is a re-add, not a rollback.** `addCardToDeck(deckId, oracleId)` with the row's own
  optimistic add — the same call the tile makes. No new action, no new state on the server.
- **One undo row at a time**, held on the decklist (not the row, which unmounts). A second removal
  settles the first.
- **`builder-shell.tsx`**: the empty `<section>` takes `min-height: calc(100% − reserve)` instead
  of `flex-1`; the scroll region takes the reserve as `padding-bottom`. The `bottom-[80px]`
  comment stays — it is the other half of the same rule.
- **`create-picker.tsx`**: the mobile sticky footer already exists as a slot; `Create deck →` moves
  into it with the summary line above. Desktop unchanged.
- **`role-counter-cell.tsx`**: the cell's `onClick` becomes `onSeeShelf` when the role is short;
  the nested `<a>` goes, and so does the per-cell `aria-expanded` disclosure. New
  `strip-rationale.tsx` (or a `<details>` in `role-counter-strip.tsx`) carries all five rationales,
  which `RECOMMENDED_MIX` already holds.
- **Focus on arrival:** the shelf link should move focus to the `#shelf-<role>` heading (give it
  `tabIndex={-1}`), not only scroll. `scrollToShelf` already exists.
- **`suggestion-tile.tsx`**: `suggestion.owned === false` is the only new branch — `buy` tag and a
  secondary Add. No note line. The `#176` comment in the file comes out with it.
- **`consider-panel.tsx`**: unowned suggestions filter out of the coverage shelves and into a
  trailing shelf keyed `edhrec`. `SHELF_CAP` does not apply — the append is already capped at 5.
- **`consider-toolbar.tsx`**: pick the provenance string on `unownedCount > 0`.
- **Copy** lives in `src/lib/copy/decks-builder.ts` — see `add-panel addendum · copy strings.ts`,
  keyed and ready to paste. The **nine** calls inside the locked block are listed at the top of that
  file under `REPLACES`; they are edits to `addPanelCopy`, not new keys. Three of them (7–9) are
  strings #184 orphans: `strip.hint` is overwritten, `strip.shelfLink` and `strip.shelfLinkAria` are
  deleted — **do not leave two live `strip.hint` values.**
- **No new dependency, no new motion, no new token.** Nothing joins the `prefers-reduced-motion`
  block: the undo row appears in place because it *is* the row that was already there.

## Accessibility contract

```
li.row
  button[aria-label="Remove Sol Ring"]                  44×44 phone, inline desktop
li.row[data-removed]
  span (mono, "Sol Ring removed")
  button[aria-label="Undo removing Sol Ring"]           44px tall phone

button.cell[aria-label="Ramp, 4 of 10. See ramp cards to consider."]      short cell
div.cell[aria-label="Wipes, 3 of 3"]                                   met cell, not focusable
button[aria-expanded][aria-controls=strip-rationale]  "Why these numbers?"

li.tile  span.tag[aria-label="Smothering Tithe is not in your collection"]
```

- **Removal and undo announce on the builder's existing live region** —
  `Sol Ring removed · 46 of 99 · undo available`, then `Sol Ring back in the deck · 47 of 99`. One
  region, not a new one, and the same region the adds already use so five fast edits read in order.
- **Colour is never the sole signal.** Unowned is a tag word and an aria label plus a shelf heading;
  removed is a dashed rule, a word and an announcement; a met cell loses its caption as well as its
  colour.
- **Tap targets:** row ✕ `44×44`, Undo `44px` tall, strip cell `62px` phone / `72px` desktop, dock
  button `48px`. #184 exists because something shipped under this line; nothing here does.
- **Contrast:** `buy` `--warning` on `--surface` ≈ 7.1:1; undo label `--fg-locked` on
  `--surface-sunken` ≈ 4.6:1 and supplementary to the Undo control beside it.
- **Focus** is the global `:focus-visible` — `2px var(--brass)` at `+2px` — not overridden
  anywhere in this addendum.

## Gap report

1. **#176 needs a product ruling before any of section 7 ships.** A (keep, marked) is drawn and
   recommended; B (drop the append) is one deletion and no design. Everything else in this
   addendum is independent of it.
2. **The `Owned only` axis in Consider comes back if A is ruled.** Decision 5 kept the toggle out
   of Consider because the axis had one value. Under A it has two — with five unowned cards in one
   labelled shelf, a filter is still the wrong control, but that reasoning has changed and should
   be re-read rather than inherited.
3. **The undo row's persistence is a judgement, not a measurement.** "Until the next removal or
   until you leave" is defensible and testable; nobody has tested it. If a long-lived spent slot
   reads as clutter in a 99-row list, the fallback is dismissal on the next successful *add*.
4. **`/decks/new` desktop is asserted, not redrawn.** The route has no tab bar and the picker's
   Selected sidebar already holds the button; I have not re-audited that layout in this pass.
5. **The reserve is stated as arithmetic, not as a token.** Two routes implement it today. A third
   surface pinning a CTA low (import, export) should be the moment it becomes a shared layout
   component rather than a third copy of the same `calc()`.
6. **Rationale copy is quoted, not rewritten.** The four lines in the disclosure are
   `RECOMMENDED_MIX[role].rationale` as shipped, shown together for the first time. Read as a set
   they may want an editing pass; that is not this addendum's call to make.
7. **#172 (no drawn state for a failed `searchCards`) is untouched** and still open. It shares the
   dock with everything here — a one-line failure state inside the quick-add bar will have to obey
   decision 1 — but it is its own ticket and its own drawing.

## Files
- `The 99 - Decks · Add Panel Addendum.dc.html` — the canvas (this addendum's deliverable).
- `add-panel addendum · copy strings.ts` — new keys, plus the nine `REPLACES` edits to the locked block.
- `ADDENDUM-READINESS.md` — readiness rating and what is blocking a green.
- `The 99 - Decks · Add Panel.dc.html`, `add-panel · copy strings.ts`, `README.md`, `READINESS.md`
  — the shipped R2 handoff, **locked and unedited**.
