# R1 — the Mana Pool link-out (#330)

`design/design_handoff_the99_decks/` · 2026-09-06 · **new files only**

Two link-out affordances, drawn as one primitive. Nothing shipped is restyled; the price
addendum's rulings are inherited and not reopened.

Canvas: `The 99 - Decks · Mana Pool Link-Out (R1).dc.html`.

**Verdict: 🟡 Amber — one gap, and it is not a design gap.** Every visual and behavioural decision
is made and defended. The brief's source of truth is not in this project, so three mechanical
facts that document owns are carried rather than restated. §6.

**The one-line summary:** *this is the app's first outbound link, so it is drawn once and placed
twice under one structural rule — the link-out is the last thing in its container, below a
hairline.*

---

## 0. What this pass does not cite

`docs/superpowers/specs/2026-09-05-manapool-checkout-design.md` **is not in this project.**
`docs/superpowers/` contains exactly one file, `design-tables/appshell.md`. Nor is
`src/components/cards/card-modal.tsx` — `src/` here holds `components/shell/nav.tsx` alone.

So **no claim below is sourced to §4 or §7**, and no endpoint-probed fact is repeated as if I had
read it. R1 and R2 of the price addendum both went amber for citing a string I had not verified;
inventing a URL contract would be that failure in a worse place, because a wrong link is a wrong
destination rather than a wrong word.

What I used instead: the shipped Decks handoff's export dialog markup, `ADDENDUM-README.md` §2
(which already carried "one deck-level action beside `Copy shopping list` and `Download .txt`" as
the right home for a store action, and drew the empty slot), `PARITY-lightbox-to-modal.md` and the
Full Card canvas for the modal's anatomy, and `TOKEN-TABLE.md` for the six themes' accent ramps.
**Everything the missing spec owns is in §6, is mechanical, and none of it changes a pixel here.**

## 1. The primitive — `<StoreLink>`

One component, `href` + children, one size, two placements. The parts:

```
ink        = var(--accent-hover)          ← not --accent; §5
underline  = 1px, offset 3px, color-mix(--accent-hover 45%, transparent)
glyph      = ↗ U+2197, 0.85em, --fg-muted, aria-hidden, nbsp-bound to the last word
hover      = ink + underline + glyph → var(--fg), underline at full opacity
focus      = 2px var(--accent) ring, 2px offset, radius 6px
active     = var(--accent-strong)
visited    = identical to rest
target     = the link's row is min-height 44px at ≤640px
markup     = <a target="_blank" rel="noopener"> + sr-only " (opens in a new tab)"
```

### 1a. The underline is the whole signal, not decoration

Brass tint in this app already means five other things: the price tail, `buy`, `6 printings you
own ▾`, `Rare`, `×1`. **Tinted text is the app's ambient state, so tint cannot also mean "this
navigates."** The underline is the only mark not already spent — nothing in the shipped surfaces
carries one.

The convention therefore reads: *tint alone is a fact; tint plus an underline leaves the app.* One
sentence, enforceable in review, and it generalises to every link-out after this one.

### 1b. Glyph yes, destination named always

- **The glyph stays.** A new tab that opens without warning is the one navigation a player cannot
  undo with Back. `↗` costs six pixels. It is `aria-hidden` with real hidden text behind it,
  because a glyph is not an announcement.
- **"Mana Pool" is named, always.** This is the only control that hands the player to another
  company; a label that hid that (*Buy these cards*) would spend trust the app has not asked for.
  Naming it also makes the price strip's `prices from ManaPool` provenance line and this link
  visibly the same relationship.
- **Label grammar: `Buy … on Mana Pool ↗`**, where the middle names the scope and nothing else.
  Deck: `Buy these on Mana Pool ↗`. Card: `Buy on Mana Pool ↗`. **No count in either** — R3's
  lesson: the export dialog already says `8` on the tab pill and in `8 cards you don't own`.

### 1c. `:visited` is not styled — ruled, not skipped

A visited state on a store link renders the browser's purchase history on the player's own screen —
on a shared screen, on a stream, in a screenshot of a decklist. **The app does not own that fact
and should not draw it.** It would also be wrong on its face: the state is per-URL, so one visited
card in a list of eight reads as *done* when the player only looked.

## 2. Surface 1 → the export dialog's Shopping tab: **quieter than both, on its own row**

The footer gains a hairline and a second row. Above it, the two local actions and
`export.pricingNote`, byte-identical to shipped. Below it, the link.

**Both louder options are drawn in the canvas and both are rejected:**

| Weight | Why not |
|---|---|
| **Primary** | Promoting it demotes the thing the player opened the dialog to do. It also makes The 99 a funnel — a commercial posture, not a layout, and not a design pass's to adopt quietly. Fail-quiet rests on *nothing in the app ranks, filters or sorts on price*; a filled store button is the loudest possible violation of that spirit while technically obeying it. |
| **Peer** (third outline button) | **Every button in this app acts locally and returns you where you were** — copy, download, add, remove. A third identical box that opens a storefront teaches the player that the row's shapes mean nothing. Three equal boxes also erase which action is the dialog's own, and to fit at 560px the label sheds `Buy`, the word that made it honest. |

**Why a second row rather than a third slot in the existing one.** The footer already carries two
buttons and `export.pricingNote` at 560px; a fourth item either wraps or forces the note off the
line — and that note is a live string the price addendum has just ratified across two call sites.
**A row costs 45px; editing a ratified layout costs an argument.** It is also the placement that
lets the phone sheet be *identical rather than analogous*: there the local action is one full-width
button, so a trailing slot does not exist and a second row does.

**The hairline is where the app ends.** Above it, two actions that keep the player here and one
note about them; below it, one link that does not. The hierarchy is read off the structure rather
than off a colour — the only version of "quieter" that survives six themes and a reviewer who
disagrees about brass.

**Phone:** same two rows, link centred (the button above it is full-width; left-aligning under a
centred label reads as a mistake), row 48px tall so 14px text clears 44px without becoming a
button. `Download .txt` is not on the phone sheet today and this pass does not add it.

## 3. Surface 2 → the card modal: **last position, below the same hairline**

The modal has no actions row. It gets one, containing exactly one action — which is why no row had
to be designed. The link follows the meta grid (phone) / the field row (desktop), after a hairline,
left-aligned, 14px, **the same size at both widths**.

- **Not in the meta grid.** Those four cells are facts about the card, each a label over a value.
  An action there has no label that fits and no cell that means *do this*.
- **Not inside the printing region.** The picker is a disclosure that stays here; the link is the
  one thing that does not. The hairline is the boundary between those two facts.
- **One state, as briefed.** Owned and unowned render identically. A player who owns one copy is
  the player most likely to want a second, a foil, or a different printing — branching on ownership
  hides the link from exactly them, and makes the modal's content depend on the collection, which
  the availability block already reports and does not gate.
- **Three routes, one modal.** Deck builder, `/collection` and the commander detail page get the
  same link in the same place. It takes the printing on screen and nothing about the caller: no deck
  context, no `from=` in the label. If a route ever needed a different link, that would be a
  different component — the parity table's whole point is that this modal is the one card surface.

## 4. Where it does not render

1. **Empty Shopping list — absent, not disabled.** Same rule the price strip ships under: no
   basket, no destination. A disabled link says *you may not* when the truth is *there is nothing
   to*. **The hairline goes with it** — a divider with nothing under it is a drawn mistake.
2. **The buy tag — still never a link.** The shipped ruling stands, and this pass is the reason it
   was right: the primitive requires a 2px ring at 2px offset, and on a 9px tag inset 6px into card
   art there is nowhere for one to sit — over the 92% scrim it would ring the scrim, not the text.
   Which gives the convention its first negative rule, and a useful one: **a link-out goes only
   where its focus ring fits.** A measurable test the next ticket can apply without relitigating
   the tag.
3. **The Decklist tab — rejected, not deferred, and no slot held.** A 62-card basket including the
   54 the player already owns is not a thing anyone wants bought, and a link that silently means
   *the 8* while the tab says *62* is a mislabel. The Shopping tab is the only tab where a basket is
   the unit — the same reason the tab exists.

Also rejected, and drawn as such: a link on each Shopping list **row** (eight links at 13px, each
with a ring, is a list that reads as a menu — the row opens the modal, the modal has the link); an
interstitial *"you are leaving The 99"* confirm (the label names the destination and the glyph names
the tab; a dialog to confirm a link is a dialog to confirm reading); a Mana Pool **logo** (not ours
to place, and the label already names them).

## 5. The ink: **`--accent-hover`, because `--accent` fails AA in two themes**

Measured from `TOKEN-TABLE.md`'s own hexes, 14px link text on each theme's `--surface`:

| Theme | `--accent` | | `--accent-hover` | |
|---|---|---|---|---|
| amonkhet · Gilded Stone | `#CF8745` | 5.9 | `#DE9757` | **7.0** |
| kamigawa · Neon Rain | `#FF4D9A` | 5.8 | `#FF62A9` | **6.5** |
| innistrad · Moonlit | `#8AAFA1` | 7.3 | `#9ABEB0` | **8.7** |
| phyrexia · Oil and Iron | `#52827A` | **4.3 ✗** | `#629189` | **5.2** |
| duskmourn · Screen Glow | `#49A9DC` | 6.6 | `#5DB9EB` | **8.0** |
| kaldheim · Rune Frost | `#5C86C9` | **4.5 ✗** | `#6C95D8` | **5.5** |

`--accent` is the obvious ink and the wrong one. The tempting fix is a per-theme override for the
two that fail — the shape this handoff has rejected twice. **A primitive that looks different in
some themes is six primitives.** So the rest ink is the lighter step that already exists in every
theme: one token, six themes, AA clear in all six, no new value in the table.

**Then hover goes to `--fg`, which is better anyway.** Spending `--accent-hover` on rest leaves
hover nowhere inside the accent ramp, so hover leaves the ramp: the palette's brightest ink, with
the underline at full opacity. It brightens in all six, it is the strongest contrast available, and
it makes hover the one moment the link stops being brass — exactly the moment the player is about
to leave.

**The ring keeps `--accent`.** A 2px ring is a graphic, not text: 3:1 is the bar, all six clear it,
and the link's focus state stays the app's rather than its own.

## 6. Carried — the three facts the missing spec owns

None of these change anything drawn; all are mechanical and eng-resolvable against that document.

1. **The URL contract, both mechanisms.** The deck link's payload shape (query, path, or POST) and
   the per-card link's identifier (oracle id, printing/collector number, or set+number). The
   drawing is identical either way: **the card link should resolve to the printing on screen**, not
   the card in the abstract, because the modal's Set row states which printing that is.
2. **`rel` beyond `noopener`.** If a referral or affiliate arrangement needs the referrer or a
   parameter, `noreferrer` must not be added and the parameter needs a home. I have specified
   `rel="noopener"` only, which is the safe floor; **the affiliate question is commercial, not
   visual, and I have not guessed at it.**
3. **New tab, confirmed.** The glyph and the hidden "(opens in a new tab)" text both promise
   `target="_blank"`. If that document rules same-tab, **the glyph and the hidden text come out
   together** — they are one decision, and a same-tab link wearing an outbound glyph is a lie the
   convention would inherit.

## 7. Open, non-blocking

- **The second footer row is a new construct**, small as it is, on a dialog that has shipped. Worth
  one look in place before beta — specifically whether the hairline reads as *the app ends here* or
  merely as a divider that grew.
- **`Buy these on Mana Pool ↗` at 390px** is 26 characters plus a glyph on one line. It fits at
  14px in Plex Sans at that width with room; it is not measured in Rune Frost, whose display face
  is not used here but whose body metrics I have not checked against the centred row.
- **The 44px rule is applied to the row, not the text.** That is deliberate — the link must not
  acquire a button's box — but it means the tappable area is wider than the underline. Standard for
  text links; flagged because this is the first one.
- **`--accent-hover` now has two jobs** (accent hover state, link rest ink). No collision exists
  today because no accent-filled control sits beside a link-out in either placement, and item 4's
  absences keep it that way. If a future surface puts them adjacent, that surface is the ticket.

## Files

- `The 99 - Decks · Mana Pool Link-Out (R1).dc.html` — the primitive and its five states, the three
  weights with two rejected, both surfaces at both widths, the empty state, the six-theme ink ledger.
- `LINKOUT-R1-README.md` — this file.
- `LINKOUT-R1-READINESS.md` — the verdict.
- `manapool-linkout · copy strings.ts` — the four strings.

The price addendum's R1/R2/R3 documents and canvases, the shipped Decks handoff, and every other
folder in `design/`: **untouched.**
