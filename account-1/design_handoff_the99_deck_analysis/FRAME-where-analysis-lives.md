# Where deck analysis lives (Round 0, call 1 and 2)

> **Analysis is the second tab. The Recommended mix strip moves into it. The art band and the
> version line do not move.**

---

## Why a tab

**The deck page has four rooms and analysis is a fifth room, not a fifth notice.** A verdict, its
receipts, a synopsis, the mix, and — soon — four more figures is a screenful. Anything that is a
screenful and is not the deck itself has to be somewhere a player chooses to go.

**Why second.** The tab row is a reading order, not a shelf:

```
your deck  →  analysis  →  consider  →  games  →  versions
the list      what it       what to      how it     what it
              adds up to    add          played     was
```

Analysis answers the question that sits between reading the list and going shopping: *what is this
thing, and what table can I take it to?* Fifth position would put the newest and least-known tab
behind the phone row's scroll, and behind three tabs a player already knows what to expect from.

**Why it is affordable.** Because the mix strip leaves the page header. Net vertical above the tabs
goes **down** by roughly 150px on desktop; the decklist rises by that much on every visit. A tab that
makes the page shorter is not a tax.

## Why not a section (option `1b`)

Drawn on the canvas rather than argued in prose, because the cost is a measurement.

- A player who came to fix one card reads a verdict, a synopsis, five receipts and five mix cells
  **before reaching the decklist**, on every deck, every visit.
- It leaves **two unlabelled strips of small figures stacked** above the tab row — exactly the
  problem the September 12 brief flagged and left open — and no room for the four figures still to
  come.
- Collapsing it does not save it: a collapsed section is a tab with worse ergonomics and no address.

## Why not a route

Ruled out by the user, and independently wrong: it is the only builder destination that would take
the deck off screen, which is precisely what `builder-tabs.tsx` undid when Versions stopped being a
route.

## What moves, and what does not

| | |
|---|---|
| **Moves** | `RoleCounterStrip` — whole, unmodified, to a new mount inside the analysis panel. |
| **Stays** | The commander art band. The `v1 · committed 6 Sep 2026` line. The tab row's existing four cells, their order, their counts. |
| **Adds** | One tab cell at index 1. One bracket chip in the band's badge row. One bracket chip in the deck tile's meta line. |

## The fold: by comparator, not by feature

Three strips of small figures on one page are told apart by **one line each**, on the block, naming
what the figures are measured against:

- **the bracket rules** — the verdict and its receipts
- **EDHREC averages** — the mix
- **nothing** — the four figures, which are description and not judgement

One line per block, not one word per cell: the cells stay as dense as they already are. A future
claim costs a block with its own comparator line, which is why this frame does not need revisiting
when the fifth one arrives.

**Drawn, not just argued:** section F of the canvas puts both tabs of one deck — a deck with a pending draft, nine games, a synopsis and a verdict — one above the other, so all four claimants are visible together with their comparator lines. It also shows the intended overlap: Ramp reads `6 / 10` in Analysis and `5 → 6` in Versions, the same fold answering two questions one tab apart.

**The what-changed strip is deliberately not here.** It measures a draft against a committed version
— Versions' question — and it is the one strip that can legitimately vanish. A drawer that comes and
goes inside a tab that is otherwise constant is a worse reading than leaving it where versioning
puts it.

## Analysis reads the live list

Considered and dropped, on the user's own reasoning: tying analysis to a committed version is
tempting — a commit is a natural moment to ask what a deck is — but **reading a pile mid-build is
exactly when the answer is most useful**, and a deck at 62 cards has a real, sayable shape.

So: every figure reads the live deck, and **every denominator is the live count** — `of 62` on a
62-card pile, never a hard 99. Nothing on this tab is gated on a commit, and nothing on it is gated
on being finished.

## Rejected outright

- **A summary score, a grade, a gauge, a threat index.** §2.2 forbids blending, and the reason is
  practical rather than doctrinal: a blended figure is easier to read and impossible to check, and
  every figure on this tab exists so it can be checked.
- **A badge or dot on the Analysis tab.** Nothing here is countable, nothing here is unread-able, and
  a dot on a tab is how an app asks to be visited rather than earning it.
- **Auto-generation on tab open.** It costs money, and a surface that spends while you read it is the
  thing manual-only exists to prevent.
- **An empty state for the whole tab.** There is always the mix, and there is always a denominator.
