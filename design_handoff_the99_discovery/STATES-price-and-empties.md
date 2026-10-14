# §7.4 and §7.6 — the price slot, and the three empty sentences

Read with `README.md` decisions 6 and 7. The canvas draws every state below; this file is the
matrix and the reasoning that does not fit in a frame.

---

## Part 1 — the price slot

#288 (ManaPool ingest) is in flight. The list ships without it, so the slot has to be correct in
four conditions and invisible in two of them.

### The matrix

| # | `price` | `stocked` | Commander owned | Drawn |
|---|---|---|---|---|
| 1 | `4.12`–`99.99` | true | no | filled `--success` dot · figure `--fg-body` · `manapool` `--fg-locked` |
| 2 | `≥100` | true | no | same, figure `--fg` |
| 3 | any | false | no | hollow `1.5px --fg-locked` dot · `not stocked` `--fg-faint` · `manapool` |
| 4 | `null` | — | no | **slot absent** — no dot, no dash, no hairline, no reserved height |
| 5 | any | any | **yes** | **slot absent** — same treatment as 4, different reason |
| 6 | `null` | true | no | treated as 4. A stocked row with no figure is not a fact worth a line. |

### Rules

**Never ranked on, and never dressed like the ranking.** No bar, no chip, no brass, no large
numeral. Brass belongs to the sort key (README decision 1); a brass price would make the row look
like it is ordered by cost, which is exactly what ruling 7 forbids.

**Colour is never keyed to magnitude.** `$219.00` is not a warning. A price in `--warning` is the
product having an opinion about the player's money, and it is one step from a price that sorts.
The only concession to size is brightness — at three figures the figure takes `--fg` so a big
number is not *quieter* than a small one. Same hue family, one step of emphasis, no semantics.

**Absence is absence.** State 4 renders nothing at all: no em dash, no skeleton, no ghost row. A
dash asserts something about the card; #288 not having landed is a fact about us. This is the
locked rule — missing data is omitted, never zeroed — applied to a signal that does not exist yet
rather than one that failed.

**State 5 is by design, not by accident.** An owned commander has no buy decision, so it has no
price line. This is also what makes the whole list read correctly for a player whose top rows are
all in the binder: the column simply ends after the ranking figure.

**The hairline belongs to the slot.** The `1px --border` rule above the price is drawn by the
price, not by the column, so states 4 and 5 leave no orphaned divider. The same applies at 390px,
where the rule sits above the price line inside the tile.

**No degraded banner for a missing price.** The shipped rule from `availability.ts` holds: a banner
is owed only where the failure changes what a control means. No control ranks, filters or sorts on
price, so its absence changes nothing the player can act on. Fail quiet.

**Provenance is named once per row, quietly.** `manapool` in mono 10px `--fg-locked`, right-aligned
in the slot. It is there because a price with no source is a claim the product cannot stand behind,
and the accessible name says it in words: *"$18.40, in stock at ManaPool."*

### What is deliberately not drawn

- **No "price rose / fell" indicator.** #288 is an ingest, not a history.
- **No as-of timestamp.** Gap report item 7: if the ingest can lag by days, this slot needs a word,
  and nothing in the brief says whether it can.
- **No total-cost-to-build figure.** That is a per-deck claim, and this row is one card.
- **No buy link.** The row's ending is `/commanders/[slug]` or `Build this deck`; a third ending
  that leaves the product belongs to a different ticket.

---

## Part 2 — the three empty sentences

Ruling 4 and ruling 8 create two of these; the colour filter creates the third, and discovery
gives it a new reason. They must not converge on one apologetic paragraph.

### 1. No decks built — ruling 8

**Where:** the sort menu option, plus a first-run banner above the list.
**The list underneath is full** — 3,342 candidates ranked by fit, since nothing has been built to
exclude. This is not an empty state at all; it is a disabled control with the list working.

Menu option:

> **Something new** — `needs a finished deck to compare against — build one and this turns on`

Banner (`GuidedBanner` shape, `border-left 3px --accent`):

> **Something new needs something old first**
> We rank "new" by how far a commander sits from the archetypes your finished decks already play —
> and you have not finished one yet. **Best fit works from day one**: it only needs your
> collection, and you have 2,805 cards in it.

Two signals, one fact, no third sentence. The banner is not dismissible and not an error: it
appears exactly while the condition holds, and building one deck removes both signals at once.

**Why a banner as well as the menu line.** Ruling 8 says *not silently empty, with a stated
reason* — and a reason inside a closed menu is not stated to a player who never opens it. This is
every new account's first visit, so the reason is on the page.

### 2. The novelty floor excludes everything — ruling 4

**Where:** the list region, replacing the rows. Sort stays on `Something new`; the control is not
flipped for the player.

> **Nothing clears the bar for "new" yet**
> Something new only shows commanders you could actually build — **at least 30% of their support
> list already in your collection**. None of the 3,342 clears that against 2,805 cards, and the
> closest sits at 22%. Nothing is broken; the collection is just early.
>
> `[ Rank by best fit instead ]`  `3,342 commanders, no floor`

**Naming the nearest miss is what stops 30% reading as arbitrary.** It also tells the player how
far off they are, which is the only actionable thing in the state.

**One affordance, and it is the other sort — never a looser floor.** Ruling 4 fixes the constant.
A "show me anyway" control is the aspirational half returning through the side door, and the brief
is explicit that the aspirational half is not hidden forever, just not what "something new I can
build" means.

**Built from `EndOfRanking`'s furniture** — hairline, 6px diamond, centred — rather than a new
empty-state component. It is the end of a ranking that had nothing in it.

**Voice check:** *"the collection is just early"* is the one expressive clause. It is the same
register as the shipped `fill.provenanceShort` (*you own what you own, EDHREC knows what it
knows*) and it does not apologise, because nothing went wrong.

### 3. Filtered to zero inside discovery

**Where:** the shipped `FilteredEmpty`, kept, one clause added.

> **No unbuilt commander matches those colours**
> White and Black together leave nothing in the 3,100 you have not built. **Two of your eight
> decks are Orzhov** — that is where those commanders went.
>
> `[ Clear the colour filter ]`  `or switch to Commanders I own`

**The added clause is the only genuinely new reason this state has** under discovery: a colour can
come up empty *because the player already built those decks*, which is ruling 2 working and worth
saying out loud. It renders only when at least one built deck matches the filtered identity;
otherwise the shipped sentence stands alone.

**The second affordance is scope, not a filter,** because scope is the control holding the missing
rows. It is a text link, not a second button — one primary action per state.

Under the owned scope this component renders byte-identically to today.

### The three, side by side

| | What is missing | Where the reason lives | The way forward | List beneath |
|---|---|---|---|---|
| 1 | a finished deck (machinery) | menu option **and** banner | build a deck; use Best fit | **full** |
| 2 | cards (collection) | the list region | the other sort | empty |
| 3 | candidates in those colours | the list region | clear the filter; or scope | empty |

Different subject, different home, different action. If two of these ever start sounding alike,
the one to change is whichever stopped naming its own cause.
