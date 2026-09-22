# ADDENDUM — the card modal's combo block

**Supersedes** the modal treatment drawn in R1 Turn 1 (the block existed; the scope line, the cap,
the disclosure and the pressable partner name are new here). Everything else in R1 stands.

**The one-line summary:** *a combo is a pair fact, so it sits between the card facts and the copy
facts — and it is the only block in the modal whose contents depend on where you opened from.*

## Why it is not just a fourth block

| Block | Kind of fact | Route-dependent? |
|---|---|---|
| `In the bracket rules` | about **the card** — Game Changer, mass land denial, extra turns | no |
| **`Two-card combos`** | about **a pair** — half of it is elsewhere | **yes** |
| `In your collection` | about **your copies** | no |
| `In your decks` | about **your copies** | no |

Every other block says the same words on every route. This one cannot: opened from a deck, a
partner can be `in this deck`; opened from `/collection` that sentence has no referent. **Same
card, same data, different words** — and with nothing on screen to explain it, that reads as
inconsistency rather than as scope.

### The fix is one mono line

> **When the modal is deck-scoped, the block names the deck under its heading:
> `against Kykar, Wind's Fury`, Plex Mono 10px `--fg-locked`. When it is not, the line is absent.**

Cheaper than a reader deciding the app contradicts itself, and it is the same move the app already
makes wherever a figure is conditioned on something the reader cannot see.

### Placement

**Second in the oracle column's stack** — directly after `In the bracket rules`, before
`In your collection`. Card fact → pair fact → copy facts. The combo block is the hinge where the
reader crosses from *what this card is* to *what you have*, which is exactly what a pair fact is.

Chrome is `AvailabilityDetail`'s verbatim: radius 10, `--bg` on 1px `--border`, mono 10px `0.1em`
uppercase `--fg-faint` heading. **Absent entirely when nothing is detected** — no heading, no empty
state, no reserved height.

## The line

```
∞  with {partner}                              {state}
```

| Part | Spec |
|---|---|
| glyph | the lemniscate at **16px**, `--fact`, 3px glow — the modal register, per Round 1 |
| `with {partner}` | 13px `--fg-body`, the name 600 `--fg` — **a link**, see below |
| `{state}` | Plex Mono **10px**, right-aligned: `in this deck` `--success` · `you own it` `--fg-muted` · `you don't own it` `--fg-locked` |
| 390px | the state **wraps under the name** rather than truncating it — the app's words move before the card's name does |

**No second target on a line.** The partner name is the only one.

### The link out lives in the tooltip

The caveat sentence already names its source, so **the source is the link**: `Commander Spellbook`
on a `1px --accent-shadow` underline with a trailing `↗`, inside the tooltip. New tab,
`rel="noopener"`, accessible name *"This card on Commander Spellbook, opens in a new tab"*.

- **One link in the block, not one per partner.** No new glyph, no new column, no second target on
  a line.
- **Drawn only when eng can build the URL.** Without one the sentence reads exactly as it does
  today, in plain text, and nothing shifts.
- **The tooltip must therefore be dismissible.** On pointer-fine it stays open while the pointer is
  inside it, so the link is reachable rather than a target that disappears on the way; on touch it
  is already a tap-to-disclose panel.
- It makes the caveat an **onward route** rather than an apology: the sentence says a three-piece
  combo is not listed here, and the words before it are where to find it.

**Withdrawn:** a per-variant `↗` on every line — drawn in the first pass of this addendum, and a
second target per line for a question most readers are not asking.

### The bound is a marker, not a line under every block

> **A brass `*` on the heading. The sentence lives behind it.**

It was drawn under six blocks and would have appeared under every combo modal in the app. A caveat
that repeats that often stops being read, which is the opposite of what a caveat is for.

- **Pointer-fine:** Round 1's tooltip chrome verbatim — `--elevated` plate, 1px `--border-strong`,
  radius 6, 12px `--fg-body`, 400ms in, instant out — **wrapping to two lines**, because this is a
  sentence rather than a label.
- **Touch:** the marker is a real **44px** target and the same sentence opens **in place** under
  the heading, pushing the lines down; tapping again closes it. Round 1 could refuse a tap route
  because the key and the modal carried the words; here the modal *is* the last surface, so it
  cannot.
- **On the heading, not on a line.** The bound is a property of the whole list — what is missing
  from it — not of any partner in it. `aria-describedby` ties the sentence to the block, so a
  screen reader hears it with the heading.
- The link out is the source's own name inside that tooltip — see above.

**The three states, and nothing else.** No price, no copy count, no availability marker. Those are
facts about *your copies of the card you opened*, and the modal already has two blocks for them.

### The partner name is pressable, and it is the only thing in the block that is

A mark the reader can reach has to explain itself, and a pair fact read from one end wants the
other end. The name opens **the partner's modal, replacing the current one** — brass underline
`1px --accent-shadow`, 44px hit area on phone, and the back gesture returns to the card you started
from. **Never a stack of modals two combos deep.**

Everything else stays inert: the glyph takes no target here either, the state words are not
filters, and there is no `add to deck` — this block is a receipt, and the surfaces that add cards
are the ones already carrying R1's clause.

## Density, chosen against the distribution

Measured: **median 2 partners, 49% have exactly one**, and **21 of 249 owned pieces exceed ten**.

| Partners | Desktop | 390px |
|---|---|---|
| 0 | block absent | block absent |
| 1 | one line, no disclosure — **the common case** | same |
| 2–4 | all lines, no disclosure | all lines, no disclosure |
| 5–6 | all lines, no disclosure | **4 + `Show all N`** |
| 7+ | **6 + `+N more`** | 4 + `Show all N` |

**The disclosure is the shipped one**, from the recommendations pass: desktop a dashed
`--border-strong` chip, `+N more` mono 11px in `--accent` because it is expandable; phone a
full-width 44px dashed row, `Show all N` mono 12px `--accent`. Expanded, **the block grows in
place** — it does not scroll inside itself and it does not open a second surface. `aria-expanded`,
focus stays on the control.

**Ordering: `in this deck`, then owned, then unowned; popularity inside each band.** So the cap
never hides a partner already on the table in favour of one you would have to buy — the one
truncation that would actually mislead.

## The bound, unchanged in words

`From Commander Spellbook ↗. Combos needing a third piece are not listed.` — now **behind the
heading's `*`** rather than printed under every block. Still the only place in the feature the
bound is stated, and still why the block may not carry a count in its heading: `+8 more` is a fact
about what is hidden, where `Two-card combos · 14` would be a claim about what exists.

## Refused

- **A price on an unowned partner.** The modal already carries a money receipt for the card you
  opened; a second figure about a card you are not looking at reads as a basket.
- **A per-variant `↗` on every line.** Withdrawn after review: a second target per line for a
  question most readers are not asking. The link is in the tooltip.
- **A count in the heading.** See above.
- **Merging this into `In the bracket rules`.** One is a card fact, one is a pair fact — merging
  them would make the bracket block route-dependent, which it has never been.
- **An `add to deck` control on a line.** This is a receipt.
- **A stack of modals.** The partner replaces; it does not push.
- **Naming the deck in the heading** (`Two-card combos in Kykar, Wind's Fury`). The heading is the
  block's name and must be stable across routes; the scope is a subordinate line because the scope
  is what varies.

## Engineering ledger (additions to R1's)

| # | Change | Kind |
|---|---|---|
| 11 | `card-modal.tsx` — `Two-card combos` block, second in the stack, `null` when empty | additive |
| 12 | The modal takes an **optional deck scope**. With one: `in this deck` is sayable, the scope line renders, in-deck partners sort first. Without one: neither. | additive |
| 13 | Cap + disclosure at 6 / 4, reusing the shipped `+N more` / `Show all N` atoms | additive |
| 14 | Partner name → `onSelectCard(partnerOracleId)`, **replacing** the modal's card | additive |
| 15 | Payload per partner: `{oracleId, name, state, popularity}`. `state` is derived at read time from the deck scope and the collection — **never stored** | data |
| 15b | An optional **card-level** Spellbook URL for the tooltip link; absent it renders as plain text | data |
| 16 | The heading `*` — tooltip on pointer-fine (**dismissible / hover-into**, because it holds a link), 44px tap-to-disclose on touch, `aria-describedby` | additive |

## An open question for engineering — Hugh's, carried verbatim

> *"I have concerns about showing every two-card combo in a list — this could blow up a card
> details modal. Originally I thought we would just show what's in a deck and what you own. We
> could technically link out to Spellbook for the ones you don't own, but it is nice to have this
> utility in the app. I just wonder if showing 14 possible card combos is too much information.
> What's your take?"*

**Design's position, offered and not asserted.** The cap already answers the height worry — six
lines, four at 390, and 49% of pieces have exactly one partner — so the modal never opens taller
than seven lines. **What the cap does not answer is whether the unowned partners belong at all.**

**If eng agrees with Hugh, the cut is clean and already drawn:** keep `in this deck` and
`you own it`, drop `you don't own it`, and the block becomes a receipt about things you have rather
than a catalogue. The ordering rule already puts owned lines first, so the cut is a filter on the
tail — no relayout, no new copy, and the marker's sentence grows one clause (*combos needing a card
you don't own are not listed*). **The disclosure and the cap survive either way**, because 21 of
249 owned pieces exceed ten partners *before* any ownership filter.

**What it would cost.** The one case where an unowned partner earns its line is a cheap card: a $2
piece that closes a loop with something already in the deck is the best recommendation the app
could make — and that is exactly what *state 3* on the candidate surfaces exists to say. Dropping
unowned partners from the modal does not remove that; the modal just stops repeating it.

**Design's honest read: Hugh is probably right, and this should be measured on a real 14-partner
card in a real modal before either of us is sure.** Eng's answer decides it; this handoff draws
both and prefers neither hard enough to block.

## Gap report (additions)

7. **The scope line names a deck the modal does not otherwise mention.** On the deck route the
   heading chrome above already implies it, so the line is mildly redundant there — and it is
   load-bearing only by contrast with the collection route, where it is absent. Watch whether
   readers notice the absence at all.
8. **Six and four are chosen against one collection's distribution.** 21 of 249 is 8%; a player
   whose collection is heavier in artifact combo pieces will hit the cap far more often, and the
   cap is a one-line change.
9. **Replacing the modal loses the reader's place in the list behind it.** The back gesture
   returns to the card, not to the row — which is the shipped modal's behaviour and not made worse
   here, but the partner link is the first thing that makes it a common path.
