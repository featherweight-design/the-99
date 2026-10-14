# R2 — the Mana Pool link-out (#330), the §2.2 amendment

`design/design_handoff_the99_decks/` · 2026-09-06 · **new files only**

One ruling changed: the card link lands on Mana Pool's **all-printings grid**, not on a printing.
It affects the card link's *meaning*, and therefore its label — nothing else.

Canvas: `The 99 - Decks · Mana Pool Link-Out (R2).dc.html`. R1's canvas and documents are
untouched; its two stale strings and one withdrawn claim are recorded in §6.

**Verdict: 🟡 Amber, one item lighter.** Every design decision is made and defended. The amber is
still the same non-design gap: the spec named in the brief is not in this project, so two mechanical
facts are carried. §2.2 settles the third.

**The one-line summary:** *the app recommends an oracle card, so the destination is a shelf — and a
label that promises a checkout would be the app surprising the player at the one moment it has
promised not to.*

---

## 1. What changed: two words in one label

| | R1 | R2 |
|---|---|---|
| Card modal | ~~`Buy on Mana Pool ↗`~~ | **`Buy any printing at Mana Pool ↗`** |
| Export dialog | ~~`Buy these on Mana Pool ↗`~~ | **`Buy these at Mana Pool ↗`** |

**The card label says the shelf out loud, and that is a call I am making rather than inheriting.**
A bare `Buy at Mana Pool` is not wrong and it is not enough: it is silent about the one thing that
makes this destination unlike a checkout. A player who expects one listing and lands on a grid of
twelve **has been surprised by us** — precisely the cost the `↗` and the named destination exist to
avoid. Spending six pixels on the glyph and then leaving the surprise in the label would be
incoherent.

`any printing` is two words that promise a plural, name no price, pre-select nothing, and keep
`Buy`, which is still the player's intent. **`See all printings` was the alternative** and it is
worse here: more literal, but it demotes the link to a lookup on a surface that already has a
printing picker two rows above it. The verb stays.

**The deck label moves preposition only**, so one grammar covers both: `Buy … at Mana Pool ↗`,
where the middle names what the player will find there. Deck: *these*, a basket. Card: *any
printing*, a shelf. `at` is also the truer word for both — you buy *at* a store, *on* a listing.

## 2. What the amendment does not change

Placement, weight, states, the hairline rule, both drawings, the empty state, the buy tag, the
Decklist tab. **The export-dialog surface is untouched but for the preposition.** Item 5's ink
derivation is untouched entirely: it is a question about 14px text on six backgrounds and has
nothing to do with what the link points at.

## 3. One state, now for two reasons

R1 drew one state because the brief said so. §2.2 gives the same drawing a second, simpler
foundation:

- **No price appears on or beside the link**, so a card we have a price for and one we don't render
  identically. Nothing to branch on.
- **Nothing about the destination varies by card** — not ownership, not price, not printing. A
  conditional would be a branch with one arm.

The unconditional ruling was already right for a player-facing reason (someone who owns one copy is
the person most likely to want a second, a foil, or a different printing; branching hides the link
from exactly them). It is now **over-determined**, which is the comfortable place for a rule to be.

## 4. The hairline stopped being merely tidy

In R1 the hairline above the card-modal link was a hierarchy device. Under §2.2 it is
**load-bearing**: a link sitting directly under `6 printings you own ▾` would read as *buy this
printing*, which is the one thing it does not mean. The two constructs are two rows apart and mean
opposite things — a disclosure that stays here, a link that leaves — and the hairline is what says
so.

This also retires a question R1 left implicit: the printing picker and the link are never combined,
and no printing state is passed to the link.

## 5. The route claim gets stronger

R1: *the link takes the printing on screen and nothing about the caller.* R2: **the link takes the
oracle card and nothing else** — not the printing on screen, not the caller, not the collection.
Deck builder, `/collection` and the commander detail page therefore produce a byte-identical link,
which is the strongest form the parity table's "one card surface" claim could take. **There is one
link per card in the whole app.**

## 6. Carried — now two, not three

1. **The URL shape for both mechanisms.** The deck link's payload (query, path, or POST) and the
   card link's grid URL. **What the card link is keyed by is no longer open:** the oracle card.
2. **`rel` beyond `noopener`.** Specified as `noopener` only, the safe floor. If a referral
   arrangement needs the referrer, `noreferrer` must not be added and a parameter needs a home.
   Commercial, not visual; not guessed at.

R1's third carried item is closed, and the claim inside it is **withdrawn**: R1 §6.1 said *"the card
link should resolve to the printing on screen."* That was exactly backwards, for a reason I did not
have — the printing on screen is the *picker's* state, not the recommendation's.

`docs/superpowers/specs/2026-09-05-manapool-checkout-design.md` is still not in this project
(`docs/superpowers/` holds `design-tables/appshell.md` alone), and neither is
`src/components/cards/card-modal.tsx`. **§2.2 reached me in the brief, not in the file**, and this
document records it as relayed rather than as read.

## 7. Open, non-blocking

- **The card label is now the longest string in either footer** — 29 characters plus the glyph. It
  fits both drawn widths on one line at 14px in Plex Sans. If a theme's body metrics push it to
  two, it wraps before *at Mana Pool* and the glyph stays bound to *Pool*; worth one look at 390px
  in Rune Frost.
- **`any printing` is a plural promise the destination must keep.** If the grid ever lands filtered
  — to in-stock, or to one condition — the label overpromises and this is the string to revisit.
- Everything else carried forward from R1 §7: the new footer row on a shipped dialog, 44px applied
  to the row rather than the text, and `--accent-hover` now holding two jobs.

## Files

- `The 99 - Decks · Mana Pool Link-Out (R2).dc.html` — R1's canvas with the new labels, the §2.2
  panel, the strengthened hairline and route arguments, and item 6's stale ledger.
- `LINKOUT-R2-README.md` — this file.
- `LINKOUT-R2-READINESS.md` — the verdict.
- `manapool-linkout · copy strings.ts` — **updated in place.** R1's labels are recorded there as
  stale rather than kept, because a stale string in the eng contract is the one place staleness is
  dangerous.

R1's canvas and documents, the price addendum's rounds, and the shipped Decks handoff: **untouched.**
