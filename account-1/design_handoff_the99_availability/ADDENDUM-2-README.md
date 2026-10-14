# Addendum 2 — Collection page + deck-detail roll-up (#43)

Extends the #43 marker to the two surfaces the original brief left out of scope. **Nothing in
that pass is reopened** — the four states, their copy, their colour logic and all seven original
calls stand, as do the R2 rulings and corrections. The deck index stays untouched per locked
decision 2.

Canvas: `The 99 - Card Availability Addendum 2.dc.html`. Copy appended to
`availability · copy strings.ts` as the `collection` and `deckRollup` blocks — no key renamed, no
existing string edited.

**The one-line summary:** *same diamond, one thing dropped.* Collection runs the marker
**count-only** — no claiming deck name — because neither of its two views has a cell that can hold
a proper noun without moving a shipped grid. Deck detail gains a **soft-claim roll-up** for the
pre-99 window, stacked under the over-committed line when both fire.

## States delivered

| # | State | Phone | Desktop |
|---|---|---|---|
| 1 | Collection rows — all four states in one list | ✓ | ✓ |
| 2 | Collection tiles — all four states | ✓ 2-up | ✓ 5-up |
| 3 | Card detail — the full clause + status pill | — (same construct, one column) | ✓ |
| 4 | `Availability ▾` filter menu, open, with counts | ✓ (trigger + chips) | ✓ |
| 5 | Active filter chips + `Showing N of 1,418` | ✓ | ✓ |
| 6 | Deck detail — soft roll-up alone (pre-99) | ✓ | ✓ |
| 7 | Deck detail — **both lines**, severity order | ✓ | ✓ |
| 8 | Deck detail — silent deck, no region at all | — | ✓ |
| 9 | **Deck detail — a finished deck's own list** (R3) | ✓ | — (same construct; the ledger beside it carries the cross-surface comparison) |

---

## 1. Collection row view → **inline in the name cell, count-only**

**The row-density rule doesn't transfer, and the reason is instructive.** On the decklist the
marker appends to `×1 owned` — a *sentence* about ownership with room to grow. Here the quantity
is `×1` in a 38px (phone) / 52px (desktop) column: a fixed-width numeral, not a string. **A count
cannot annotate a count**, and widening that column would move a shipped grid for a state most
rows never show.

So it goes in the `1fr` cell, **inline after the name** — the only cell in either grid with slack.
Inline rather than a second line, so **row height stays constant** and a 1,418-row scroll keeps
its rhythm. The name yields first: it already truncates, and a truncated name beside a legible
marker beats a full name and a clipped one. The chip is `flex: none`; the name is the flexible
half.

Over-committed keeps its border tint and nothing else — still the only state that touches its
container, still never a dim or a stripe. On an inventory list every row is equally real and none
of them is unavailable.

## 2. Collection tile view → **top-left chip, caption untouched**

The tile rule transfers; only its caption half doesn't. The chip sits top-left because top-right
is the brass quantity badge — the same corner, free for the same reason as on Consider (where it
was the ownership dot). Same glyph, same scrim, same 8.5px label.

**The caption line is already spoken for.** `C21 · uncommon` is set and rarity — the two facts a
player scans a collection grid for. Consider's tile could spare a line for `in use — Atraxa`; this
one can't, and displacing set/rarity to name a deck would trade an inventory fact for a deck fact
on the inventory surface.

## 3. The deck name → **dropped on `/collection`, full in card detail**

Both views land in the same place from two different constraints, which is worth more than either
fix alone: **one collection-wide reduction**, one sentence in the copy file, and a player flipping
between views sees the same marker say the same thing.

`0 free — in Atraxa` needs roughly 120px that neither view has on phone, and gap §2 already flags
that deck names have no length budget. Rather than invent a truncation rule on the widest list in
the app, collection uses `marker.hard` (`0 free`) and never `hardIn` or `hardMulti` — which also
means **collection never needs `hardMulti`**, closing that drawn/undrawn gap on this surface.

Card detail carries the full form: `0 free — in Atraxa` with the claiming deck's status pill
beside it, plus the one sentence that describes a *list* rather than a location. It is the
commander-detail disclosure at card scale — no new construct.

## 4. Open call → **yes, `/collection` earns a filter. As `Availability ▾`, not a checkbox.**

**§5 ruled against a second control because of a collision, and the collision isn't here.** In the
builder, `Owned only` and a hypothetical `Free only` are two checkboxes about the same noun, four
millimetres apart, differing on a word the player has known for minutes. On `/collection` **there
is no ownership control at all** — everything here is owned by definition. Nothing to collide
with.

And the question genuinely changes. The builder asks "what should go in this deck", where a filter
that hides a card is a block wearing a filter's clothes. Collection asks "what do I have" — a
question filters are the native answer to, on a surface that already ships four of them and a chip
row for exactly this.

**A filter, not a mode**, which is also what keeps it clear of the `Score against` toggle: that
ranks and never hides, this hides and never ranks. Different surfaces, different verbs, and
neither ever appears beside the other.

Shape — **decision 2 reused wholesale**:

- Fifth dropdown in the existing filter row, four checkboxes (not two exclusive states):
  `Free` / `Wanted by a brew` / `In use` / `Over-committed`. Availability is a property with four
  values, so "free only" is one selection among four. It sits beside `Type` / `Set` / `Sort` —
  **fourth on desktop**, where colour is an inline pip row, and **fifth on phone**, where colour is
  its own panel.
- **Counts in the menu** — `1,186 / 168 / 61 / 3`, summing to the 1,418 total. That is the
  inventory answer *before* you apply anything; a player who reads only this menu has learned the
  shape of their own collection.
- Removable chips with the marker glyph as the leading dot, live `Showing N of 1,418`, `Clear all`,
  and a 1:1 param — `?avail=inuse,over`.
- **Nothing defaults on.** Arriving shows all 1,418, as today.
- **Silence survives it.** A player with no commitments opens the menu to `1,418 / 0 / 0 / 0` with
  three `aria-disabled` rows — the one place in this pass where the concept is visible to someone
  it doesn't apply to, and it costs a menu they chose to open.

## 6. A deck never claims a card against itself (R3)

**On a deck's own decklist, the marker scores against every deck except that one** — one rule,
both severities, no special case. This was already implicit in the soft case (`1 in a brew` inside
Kykar was always *another* brew, and the copy says "other brews"); R3 states it and extends it to
the hard case.

**Why.** The marker answers "can I still build with this?" — and inside a list, the card *is* built
with. `0 free — in Atraxa` rendered inside Atraxa tells the player something the surrounding 98
rows already say, and it would invert "silence is most of the app" on the surface where a finished
deck is the *success* state. Commander being singleton, without this rule opening any Complete deck
would light up nearly every nonland row.

**`0 free` does not earn its place as a cut warning.** A cut *releases* a card — it is the one
action that makes a copy freer. Warning on it would be the only place in this system where the
marker discourages a move, and locked rule 1 is that we never block; a marker that argues against
an action is a soft block. If cut-time guidance is ever wanted it belongs on the cut, not on all 99
rows in advance.

**Consequence: inside a finished deck the hard state is unreachable.** If another finished list also
claims your only copy, two hard claims on one card *is* over-commitment — so it presents as
`short 1`, never as `0 free`. A deck's own list therefore shows exactly three things: silence, a
brew wanting a spare, or a genuine shortfall. **The loud state survives self-exclusion**, which is
the proof the rule drops noise rather than signal.

**One copy variant:** `marker.overAlsoIn` — `short 1 — also in Kykar` — because "2 decks want it"
would count the deck the player is standing in. Decklist-of-the-holder only; the collection and
commander forms are untouched.

**No exclusion off-decklist.** `/collection` and the commander surfaces have no current deck, so
they compute against everything, exactly as in #43. The marker is relative to where you stand, and
only a decklist is somewhere to stand.

## 5. Deck detail soft roll-up → **one region, max two lines, fixed severity order**

**Why deck-level at all:** twelve hollow glyphs scattered down a 62-row list is a pattern nobody
perceives — the same argument that put the over-committed summary at the top in §3. One line makes
twelve markers legible as a fact about the deck.

**Stacked, not merged**, when both fire. The two lines describe different problems with different
resolutions — one is a shopping decision, the other resolves itself the moment you sleeve
something. Merging into "13 cards are contested" would average a real problem with a non-problem.

**Red above muted, always** — fixed order, never sorted by count. A deck with 1 over-committed and
40 soft still leads red. The severity ladder is the marker's own hollow → solid → doubled
progression, read vertically.

**The counts are disjoint and the copy proves it.** A card is either over-committed or softly
claimed, never both, so `1` and `12` sum to 13 contested cards. When the soft line follows the red
one it reads "12 **more** are in other brews too" — one word doing the arithmetic so the player
doesn't have to (`softHeadingAfterOver`).

**Pre-99 only, and it exits quietly.** Once the deck hits 99 and turns `Playable`, its own claims
go hard: the soft line disappears and any genuine conflict has already promoted itself to the red
line. No announcement needed — the player just finished a deck, which is the good outcome.

Visually the soft line is a **note, and looks like one**: hollow glyph, `#C6B79A` heading, muted
`#4A4033` left border, no tint. The red line keeps its `#211C15` / `#C6533F` treatment from §3.
Neither is an error — no icon-in-a-circle, no dismiss, no retry.

**Still not on the deck index.** Locked decision 2 holds: no roll-up, no badge, and the status pill
keeps meaning card count and nothing else.

---

## Implementation notes

- **No new tokens, no new hues, no new dependency, no motion.** Every value is one of #43's four
  availability tokens or an existing brand token.
- **No grid changes.** `38px 40px 1fr auto` and `52px 54px 1fr 150px 92px 18px` ship as-is. The
  marker borrows slack from `1fr`; nothing is added, widened or reordered.
- **One new query param** — `?avail=inuse,over` on `/collection`, comma-separated like the existing
  multi-value filters. Distinct from `/commanders`'s single-value `?avail=free`; same name because
  it's the same concept, and neither page reads the other's.
- **The collection query is the expensive part.** Availability for 1,418 unique cards is the same
  cross-deck aggregate as #43, joined **once for the page**, not per row.
- **`/collection` fails quiet** on a failed availability read — markers absent, `Availability`
  trigger disabled with `degraded.collectionFilterDisabledAria`. **No banner**, unlike
  `/commanders`: this surface has no ranking to mislead, so silence tells no lie here. That is R2's
  rule applied, not a new one — a banner is owed only where the failure changes what a control
  means, and a disabled trigger already says it.
- **The `owned > 0` guard still applies**, though it bites less here: every card in the collection
  is owned by definition, so the unowned-card bug from R1 §note can't occur on this surface.

## Accessibility

- **Collection rows extend the shipped row label**, they don't replace it — the same rule as R2's
  `rowAria`. `"Smothering Tithe, Enchantment, 1 copy, Ravnica Remastered, rare, no free copies"`;
  the clause lands last and a free card produces today's string exactly.
- **Count-only in the label too** — collection never speaks the deck name, matching what it shows.
  Card detail speaks the full clause with the status pill.
- **The filter is a checkbox group** in a labelled menu, each option carrying its count in its
  accessible name ("In use, 61 cards"). Chips are buttons ("Remove filter: in use"). Zero-count
  options are `aria-disabled`, not removed.
- **The roll-up is a `<section>`** labelled "Card commitments" holding one or two static lines —
  not a live region, not an alert. It's there on arrival; nothing interrupts.
- **Contrast** against `--surface #1E1A15`, unchanged from R2: `#E8CE93` 11.8:1 · `#E9917A` 7.6:1 ·
  `#C6B79A` 9.2:1 · brass 7.5:1 — all AAA for normal text. `#C6533F` stays glyph-and-border only.
- **Targets:** filter-menu rows are 40px (pointer-driven menu); the 44px minimum applies to the
  `Availability` trigger and each chip's `✕`, which are the phone targets.

## Gap report

1. **Collection row view has no over-committed *aggregate*.** A player with three over-committed
   cards across 1,418 rows finds them via the filter or not at all — there is no count at the top
   of `/collection`. Deliberate: the collection page is an inventory, not a to-do list, and the
   deck that actually has the problem shows it. But it is the one place a player could miss the
   loudest state in the system.
2. **The filter menu's counts need the aggregate before first paint.** All four counts come from
   the same page-level join, so a slow availability read means either a menu with no counts or a
   delayed trigger. Drawn as if resolved; the loading shape is unspecified.
3. **Card detail's soft and over notes are written but only the hard one is drawn.**
   `detailSoftNote` and `detailOverNote` follow the same rules; no state in the canvas exercises
   them.
4. **`?avail=` now means two different things** — single-value ranking mode on `/commanders`,
   multi-value filter on `/collection`. Defensible (same concept, no shared reader) but it is the
   kind of thing that bites during a future "share this view" feature.
5. **Gap §2 from R1 is now half-closed and half-worse.** Collection sidesteps deck-name length by
   dropping the name, but card detail, the decklist row and the commander-detail disclosure all
   still render it with no truncation rule. The budget question is unchanged; there are just fewer
   places that need the answer.
6. **The soft roll-up's threshold inherits the 98th-card cliff** (R1 gap §5). A 98-card list is
   soft, a 99-card list of pure theory is hard — so the soft line can vanish and the red line
   appear on a single add. That transition isn't drawn.
7. **Self-exclusion means the same card reads differently on two decklists**, by design — silent
   inside Atraxa, `0 free — in Atraxa` inside Kykar. Correct, and drawn side by side in the R3
   ledger, but it is the one place in the system where two surfaces disagree about one card and a
   support conversation could start there.
8. **`softHeadingAfterOver` assumes the two counts never overlap**, which self-exclusion preserves
   (a card is over-committed or softly claimed from a given vantage point, never both). If the
   exclusion rule is ever relaxed, that "more" becomes wrong before anything else does.

## Corrections landed in R3

| Item | Was | Now |
|---|---|---|
| Filter counts | `1,187 + 168 + 61 + 3 = 1,419` against a 1,418 total | Free `1,186`; the four sum to 1,418. Fixed in the menu, the reasoning panel and the desktop caption. |
| Phone chip count | `Showing 63 of 1,418` with only `In use` active | `Showing 61 of 1,418`, matching the menu's own count and desktop's 64 for two chips. |
| Dropdown position | "Fifth dropdown in the existing filter row" | Fourth on desktop (colour is an inline pip row), fifth on phone (colour is a panel). Reworded, not redrawn. |
| Desktop pip row | shipped `COLOR` label missing | Label restored beside the pips. |

## Files
- `The 99 - Card Availability Addendum 2.dc.html` — this addendum's canvas.
- `ADDENDUM-2-README.md` — this file.
- `availability · copy strings.ts` — extended with `collection` + `deckRollup`; nothing edited.
- R1/R2 documents unchanged: `README.md`, `ADDENDUM-README.md`, `ADDENDUM-READINESS.md`,
  `READINESS.md`, and both earlier canvases.
