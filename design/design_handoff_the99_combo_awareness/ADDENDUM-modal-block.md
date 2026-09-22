# ADDENDUM — the card modal's combo block

**Revised by the closed-by-default pass (canvas `3a`).** The block's placement, scope line, three
states, ordering rule, pressable partner name and `*` bound are unchanged from the first pass
(`2a`). **What changed: the block is a closed 52px row by default, and the six/four-line cap and
both inner disclosure atoms are withdrawn.**

**Supersedes** the modal treatment drawn in R1 Turn 1. Everything else in R1 stands.

**The one-line summary:** *a combo is a pair fact, so it sits between the card facts and the copy
facts — and it stays shut until the reader asks, because six lines pushed the price and the pager
below the fold on the card they actually opened.*

## The block is closed by default

Six lines is ~230px in the oracle column. Closed it is **52px**, and the three blocks that were
pushed down are back where they were before this feature existed.

### Closed

```
∞  TWO-CARD COMBOS   1 in this deck · 1 you own · 4 you don't        ▾
```

| Part | Spec |
|---|---|
| height | **52px**, one row, at both widths |
| target | **the whole row** is one `<button>` — not the chevron |
| glyph | the lemniscate at 16px, `--fact`, 3px glow |
| label | Plex Mono 10px `0.1em` uppercase `--fg-faint` — the heading's own chrome |
| counts | Plex Mono **10.5px** `--fg-muted`; **`N in this deck` in `--success`** and always first |
| chevron | `▾` mono 12px `--fg-faint`, right |
| 390px | label and counts **stack** inside the same 52px row; counts at 10px |
| `*` | **not drawn while closed** — a closed block is not making a claim yet |

**The closed row is a count, and this is the one place a count is legal.** Everywhere else a number
would claim completeness; here it describes *this list* — the same licence `+8 more` had. It is a
tally of what the block holds, not of what exists, and the `*` still carries the bound once open.

**The breakdown is why this works.** A bare `Two-card combos ▾` makes every reader open it to find
out whether they care. Counts by state let them decide while it is shut — and `in this deck` is the
only part that is ever urgent, so it leads and is the only part in colour.

**A state with a count of zero is not drawn.** `4 you don't` alone, or
`1 in this deck · 4 you don't` — never `0 you own`.

### Open

The row keeps its place; **the scope line takes over from the counts** on the header itself, so the
block gains no chrome by opening. `*` appears. All lines render, in the same order — in this deck,
owned, unowned, popularity inside each band.

**The six/four-line cap is withdrawn, and `+N more` / `Show all N` leave this block.** The cap
existed to stop a fourteen-line block; a closed block already does. A reader who explicitly asked
for the list is not served by a second disclosure inside it.

### The rules that come with a closed block

- **Closed at every count, including one.** A block that is sometimes a row and sometimes a list is
  a block whose position the reader cannot learn. One rule, one height, always — and at 49% of
  pieces having exactly one partner, that single line is also the cheapest thing to open.
- **The open state is remembered per reader, not per card.** A player who opens it once is telling
  us they care about combos; the next modal opens with the block already open. Closing it once
  turns it back off. One flag — it is why the closed default costs an interested reader a single
  tap ever, rather than one per card.
- **It is a disclosure, not an accordion.** No sibling closes when this opens; the other three
  blocks are not collapsible. It grows in place, downward, and the scroll position does not move.
- **Absent when nothing is detected.** No closed row saying `0`, no reserved 52px. The closed row
  *is* the count, so it is only drawn when there is something in it.
- **A11y:** a real `<button>` with `aria-expanded` and `aria-controls`; accessible name is the label
  plus the counts as words — *"two-card combos, one in this deck, one you own, four you don't"*.
  Focus stays on the button. The `*` is a separate target inside it and not part of that name.
- **No motion.** No slide, fade or ease. The chevron flips and the content is there.

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
**It holds that position closed or open.**

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

## Density — superseded

Measured: **median 2 partners, 49% have exactly one**, and **21 of 249 owned pieces exceed ten**.

The first pass capped the list at 6 desktop / 4 phone with the shipped `+N more` / `Show all N`
atoms. **Both are withdrawn.** The block is closed by default at every count, and open means all
lines. The distribution now only matters to the closed row's counts, which read the same at one
partner as at fourteen.

**Ordering: `in this deck`, then owned, then unowned; popularity inside each band.**

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
- **A six-line cap with an inner `+N more`.** Withdrawn: the closed row does the job the cap was
  invented for, and a reader who opened the list does not want a second disclosure inside it.
- **Collapsing the sibling blocks too.** They are short and unconditional; only this one is long,
  optional and route-dependent.
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
| 13 | **The closed row** — 52px `<button>`, counts by state, `aria-expanded`, and a per-reader remembered open flag. **Replaces** the 6/4 cap and the `+N more` / `Show all N` atoms in this block | additive |
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

**Design's position, revised by the closed-by-default pass: keep them.** The concern was fourteen
combos blowing up a modal — and closed, they do not occupy a pixel until a reader asks. The closed
row also puts the decision in the reader's hands with the facts needed to make it:
`1 in this deck · 1 you own · 4 you don't` says what is behind the row before they spend the space
on it.

**If eng still agrees with Hugh, the cut is cheaper than it was:** keep `in this deck` and
`you own it`, drop `you don't own it`. The ordering already puts owned lines first, so it is one
filter on the tail — and **the closed row's counts change by themselves**. The marker's sentence
grows one clause (*combos needing a card you don't own are not listed*).

**What it would cost.** The one case where an unowned partner earns its line is a cheap card: a $2
piece that closes a loop with something already in the deck is the best recommendation the app
could make — and that is exactly what *state 3* on the candidate surfaces exists to say.

**Design's read: still eng's call, still worth measuring on a real 14-partner card — but the height
objection is now answered by the closed row rather than by cutting lines.**

## Gap report (additions)

7. **The scope line names a deck the modal does not otherwise mention.** On the deck route the
   heading chrome above already implies it, so the line is mildly redundant there — and it is
   load-bearing only by contrast with the collection route, where it is absent. Watch whether
   readers notice the absence at all.
8. **The closed default is measured against one reader's complaint, not a population.** A player
   who cares about combos pays one tap ever (the open state is remembered), and a player who does
   not pays nothing — but the feature is now invisible on first open, which is a real cost for a
   fact nothing in the app has ever stated. The closed row's counts are what carry it.
9. **Replacing the modal loses the reader's place in the list behind it.** The back gesture
   returns to the card, not to the row — which is the shipped modal's behaviour and not made worse
   here, but the partner link is the first thing that makes it a common path.
