# The 99 — Combo awareness (design handoff, R1)

**Source of truth:** §4.3 and §4.3b of `docs/superpowers/specs/2026-09-19-deck-analysis-foundation-design.md`,
read on `main` — the three combo tables, and the three join rules that decide when a pair is real.

`design_handoff_the99_card_mark/` is the structural sibling and the closest fit: same problem
shape, marks on surfaces that already ship. Round 1's `--fact` ink and its size ladder govern here
and are not re-argued. **Round 2's lemniscate is not redrawn** — it is the combo-piece mark, it
belongs to Round 2's build, and this round only says what these three states look like using it.

**The shipped answer: `1b` — one mark, one sentence, and the mark moves down to lead it.**

**Files.** `The 99 - Combo Awareness.dc.html` (canvas — Turn 2 `2a` is the modal addendum, newest
at top; Turn 1 is the naming question `1a`/`1b`/`1c` and every state on every host at both widths).
`ADDENDUM-modal-block.md` is the modal block in full, `STATES-combo-awareness.md` the state matrix,
`combo-awareness · copy strings.ts` the strings, `READINESS.md` the dependencies.

**The one-line summary:** *the mark says a loop is in reach; the sentence says who with; the row's
own dot and tag say what it would cost you.*

## What Design read

The spec's §4.3 (`spellbook_variants`, `spellbook_variant_cards`, `card_bracket_flags`) and §4.3b
(template-gated variants excluded, `mustBeCommander`, the commander not being in `deck_cards`).
Round 1 (`design_handoff_the99_card_mark/`) in full for the mark family, its sizes and its
containment rule. Round 2's lemniscate geometry from `design_handoff_the99_verdict/`. The three
hosts' shipped geometry from `design_handoff_the99_collection/`, `design_handoff_the99_add_panel/`
and `design_handoff_the99_top_off/`. **Where a component and this handoff disagree, the component
wins** and these tables are what to correct.

## The four calls

| # | Question | Called |
|---|---|---|
| **A** | One mark with three readings, or distinct marks | **One mark.** Round 2's lemniscate, `--fact`, unchanged. The states differ by ownership, which every host already draws twice. |
| **B** | How the partner is named | **Inline on the decision hosts, in the tooltip on `/collection`.** One mono clause on the Add panel and Last-31 rows; on the shipped one-line collection row and tile, the marker's hover tooltip and the modal. |
| **C** | Where the mark sits | **Browse hosts get the marker, decision hosts get the sentence.** On `/collection` the marker joins the shipped Game Changer cluster with a hover tooltip. On the candidate surfaces a mark with a sentence leaves the name line to lead it. |
| **D** | State 3 beside the shipped `BuyTag` | **Untouched, and they cannot be confused.** Boxed/`--warning`/right slot versus bare/`--fg-body`/left secondary line. No combined atom, no brighter tag. |
| **E** | *(addendum)* The card modal | **A pair fact between the card facts and the copy facts** — second in the stack, naming its own scope, the partner name pressable. **Closed by default as a 52px row with counts by state**; open means all lines. See `ADDENDUM-modal-block.md`. |

---

## A · One mark, three readings

The three states are **the same fact seen from three positions**: two cards make a loop, and one of
them is not where it needs to be. What differs between them is not the combo — it is *whose
shelf the missing card is on*, and every host already says that:

| State | What differs | Who already draws it |
|---|---|---|
| 1 · both halves owned, unassembled | no deck in scope | the host — `/collection` has no deck |
| 2 · one away, you own the missing card | you own it | `OwnershipDot` filled `--success`; availability slot silent |
| 3 · one away, you'd buy it | you don't | `OwnershipDot` dashed; `BuyTag` in the availability slot |

So a second ink or a second glyph would be **re-drawing a distinction the row already carries** —
and it would break the one thing Round 1 bought: `--fact` means *a fact about the card is present*,
and never encodes a degree.

**Rejected: a filled lemniscate for state 2, stroked for state 3.** The solid/stroked split is
already load-bearing — Round 2 fixed it as *solid for a card on a list, stroked for a behaviour
that loops* — and spending it on ownership would make the same glyph mean two different kinds of
thing.

**Rejected: `--success` for state 2 and `--warning` for state 3.** That paints the combo with the
money's ink and makes the mark a price signal. The combo is not a spending fact.

## B · The partner is named inline, every time

> **A mark alone cannot say *with Demonic Consultation*, and that name is the whole value. So the
> name is drawn wherever the state is drawn — and where the name cannot be drawn, the state is not
> drawn either and only Round 2's bare fact remains.**

That is the rule that makes the round coherent, and it is what `1a` and `1c` fail.

- **`1a` — mark only, name on hover.** On a phone this is Round 2's shipped fact and nothing more:
  three new states rendered as zero new information on half the app's surfaces.
- **`1c` — mark on the row, names in the modal only.** A state whose value is *act on this now*
  cannot live one tap away from the list where the acting happens. Kept as the **fuller** route,
  refused as the only one.
- **`1b` — the mark moves down and leads a sentence.** Adopted.

### B · addendum — where the clause is not drawn

> **`1b` governs the decision hosts. On `/collection` the clause is withdrawn entirely** (canvas
> `4a`): the shipped row is one line with a marker cluster, so the marker carries the fact and the
> tooltip carries the name. `1a`'s objection — *a marker alone says nothing new* — is answered
> there by the tooltip, which `1a` had no equivalent of on a two-line row.

### The clause

| | Value |
|---|---|
| glyph | Round 2's lemniscate, **12px**, `--fact`, 2px glow at 45%, bare |
| type | IBM Plex Mono **10.5px desktop / 9.5–10px phone**, `--fg-body` |
| line | the host's **secondary line**, never the name line |
| truncation | the clause ellipses; **the partner's name is the last thing to go** |
| target | **none.** Inert, `aria-hidden` glyph, the state in the row's accessible name |

### Two strings, and only two

```
with {partner} — you own both        state 1
completes with {partner}             states 2 and 3, identically
```

*Completes* presupposes the partner is in the deck, which is exactly what makes the row's card the
missing one. *Both* is the word doing state 1's work: the app has never once told a player they
already hold two cards that do something together.

**Two partners:** the row names the **most popular detected partner** and says nothing about the
rest; the modal lists them all. Never `with Isochron Scepter +1` — a residual count is a
completeness claim wearing a plus sign.

### Bounded by construction

Detection excludes template-gated variants **by design** (§4.3b rule 1), so a row may be one away
from something the app cannot see. Both strings survive that: naming one partner is true whether or
not there are others. What would not survive is a count, a definite article, or a deck-level total —
all three are refused below.

**The qualifier is said once, in the modal, where the list is complete:**
`from Commander Spellbook. combos needing a third piece are not listed.`
A caveat repeated on 38 rows is noise; a caveat beside the full list is a footnote.

## C · Browse hosts get the marker; decision hosts get the sentence

*(Revised — canvas `4a`, corrected against the shipped `/collection` row.)*

The shipped collection row is **one line**: `×N` · name · **marker cluster** · availability · pips ·
type · set · `›`. It already renders a fact marker with a hover tooltip — the Game Changer bolt —
so the combo mark **joins that family** rather than inventing a second pattern beside it.

> **On `/collection` (row and tile): the marker only, rendered exactly as Game Changer is, with
> the partner name in the tooltip. On the Add panel and the Last-31 list: the clause, leading the
> host's secondary line.**

The division is not arbitrary. On a browse surface the state is a gloss on a row you are scanning;
on a candidate surface it is **the reason to pick this card out of 38 near-identical ones, at the
moment of picking** — and a candidate row has no marker family to join.

### On `/collection`, the marker is Game Changer's marker

| | Value |
|---|---|
| size | **16×16**, `--fact`, 3px glow — identical to the bolt |
| position | the marker cluster after the name (row) or the caption's marker row (tile), Round 1's fixed order |
| target | **none.** `aria-hidden` glyph; the state is in the accessible name |
| tooltip | on hover, pointer-fine only — the bolt's chrome and register verbatim |
| touch | **no tooltip.** The row's own tap opens the modal — same as Game Changer today |
| yields | **nothing.** Round 1's rule restored whole. |

**Tooltip copy:** *"Two-card combo with Demonic Consultation. You own both."* Several partners:
*"Two-card combo with Demonic Consultation, and 3 others."* Sentence case, full stop, not mono —
matching *"This card is on the Game Changer list."* **The key needs no change**: the shipped legend
already reads `⚡ game changer` … `∞ Two-card combo`.

**Withdrawn with the clause:** the collection row's type-line yield, the collection tile's
`SET · rarity` yield, and `ownBothShort`. **Net effect on the shipped row: one 16px glyph, and
nothing else moves.**

**The honest cost:** at 390 the partner name is two taps away rather than on screen. That is the
price of the marker family being *the* family — the bolt has always worked this way, and a combo
mark that behaved differently would teach the reader that some markers talk and some do not.

### On the decision hosts, the mark moves down

Round 1 put every fact mark on the **name line** in a fixed order. On the Add panel and the
Last-31 list this round adds one clause to that rule and changes nothing else:

> **A mark with a sentence leaves the name line and leads that sentence on the secondary line. A
> mark without one stays where it is. One glyph is never drawn twice on one row.**

So a card carrying a Round 1 fact **and** a combo state reads *facts above, relations below*.

**Rejected: repeating the mark on both lines.** Two lemniscates on one row reads as two combos.
**Rejected: leaving the mark upstairs and starting the clause with a dash.** The sentence then has
nothing tying it to the glyph.

### Host by host

| Host | Where the state goes | What yields |
|---|---|---|
| **Collection row**, both widths | **the marker cluster** — marker + tooltip, no clause | **nothing** |
| **Collection tile**, both widths | **the caption's marker row** — marker only | **nothing** |
| **Consider tile** (Add panel) | the **type line** | the ellipsed type line |
| **Quick-add result row** | the meta line | the meta line |
| **Last-31 row, desktop 34px** | the **tail of the name cell** (no secondary line exists) | nothing — name `flex:none`, clause `flex:1;min-width:0` |
| **Last-31 row, 390px 52px** | **line 2**, leading it | **the pip track**, on marked rows only |
| **Card modal** | its own block under `In the bracket rules` | nothing |

**No host grows a line and no host grows in height.** `CARD_TILE_CAPTION_H` (56/50) is untouched,
the 34px and 52px candidate rows keep their heights, and the Last-31 row's four fixed columns —
cost 40, availability 84, synergy 88, inclusion 52 — do not move, so they still land on one
vertical line down 38 rows.

### The two yields — both withdrawn on `/collection`

1. ~~**The collection tile's `SET · rarity`.**~~ **Withdrawn** (canvas `4a`). It was invented to
   make room for a ~100px partner name; a 16px glyph needs no room. The caption's marker row
   already holds a chip, a bolt and a printing today. **Round 1's rule is restored whole: nothing
   yields.**
2. **The Last-31 phone row's pip track.** Stands — that host keeps its clause. Line 2 holds pips,
   synergy and inclusion; a clause does not fit beside all three. On the ~4 rows that complete
   something the mana cost steps aside — a player choosing between 38 near-identical candidates
   does not break the tie on cost when one of them closes a loop. The other 34 rows are untouched,
   pips and all.

## D · State 3 beside the shipped BuyTag

**They do not compete, because Round 1 already separated them:** *boxed means about your copies,
bare means about the card.*

| | `BuyTag` | the combo clause |
|---|---|---|
| container | boxed, `1px --accent-shadow`, radius 4 | **bare** |
| ink | `--warning` | `--fg-body`, glyph `--fact` |
| position | the fixed availability slot, right | the secondary line, left |
| says | what your copy costs | which card this one loops with |

**The clause never enters the availability slot, never turns `--warning`, and never carries a
price.** The tag is unchanged in every respect — same atom, same ink, same slot, same per-host
collapse rules (full form on the Last-31 list, per that handoff's call).

**Rejected: a combined atom** (`completes a combo · $3.60`) — it reads as a price *for the combo*,
which is false: you already own the other half.
**Rejected: brightening the tag on a combo row** — that is the app leaning on a purchase, which is
the one thing a shopping surface must never do.

## Coverage — three cells are ruled empty

| State | /collection | Add panel | Last-31 |
|---|---|---|---|
| 1 · both owned, unassembled | ✓ row + tile | — two away, not one | — two away, not one |
| 2 · one away, you own it | — no deck in scope | ✓ tile + row | ✓ both widths |
| 3 · one away, you'd buy it | — no deck in scope | ✓ tile + row | ✓ both widths |

**A dash is a ruling, not a gap.** `/collection` has no deck, so *completes* has nothing to
complete; inventing a deck picker on a browse surface to say it is a feature, not a mark. The
candidate surfaces *do* have a deck, so state 1 could in principle be drawn there as *you own both
halves and neither is in this deck* — but that is a two-card add, and this round is about being one
away. **Named as severable, not refused.**

## Engineering ledger

| # | Change | Kind |
|---|---|---|
| 1 | **New `ComboClause`** — lemniscate at 12px + one mono string, two densities, inert, `aria-hidden` glyph | new |
| 2 | **`CardFactMark` gains the lemniscate as a member of the marker family** — 16×16, `--fact`, its own tooltip, in Round 1's fixed order. On the decision hosts it also gains a `suppress` prop (or the caller omits it) so the mark is not drawn twice when a clause is present | additive |
| 3 | `collection/rows-view.tsx` — **marker in the shipped cluster + hover tooltip. No clause, no yield, no layout change**; one clause added to the row's `aria-label` | additive |
| 4 | `collection/grid-view.tsx` — **marker in the caption's marker row. `SET · rarity` unchanged**; caption height unchanged | additive |
| 5 | `suggestion-tile.tsx` — clause replaces the type line | additive |
| 6 | `quick-add-bar.tsx` result row — clause on the meta line | additive |
| 7 | Last-31 candidate row — desktop: name `flex:none`, clause `flex:1;min-width:0`; phone: clause leads line 2, pip track suppressed on clause rows only | additive |
| 8 | `card-modal.tsx` — `Two-card combos` block, **second in the stack**, after `In the bracket rules`, `null` when empty, **closed by default** — see `ADDENDUM-modal-block.md` for the closed row, scope, ordering, the tooltip bound and the pressable partner name | additive |
| 9 | **Payload:** the browse list and both candidate payloads need, per card, `{state, partnerName, partnerOracleId}` from the §4.3 join — **and the join must apply all three of §4.3b's rules** | data, Tier B |
| 10 | No new token, no new hex, no new motion class, no new empty state | — |

**The state is computed, never stored.** State 1 is a collection-scoped query; states 2 and 3 are
deck-scoped. The same card is state 1 on `/collection` and state 2 in a deck's Add panel on the
same afternoon, and nothing caches the difference.

## Refused

- **A list.** Hugh's ruling, and the volume is the reason: 962 raw near-misses across 20 decks.
- **A second ink, a second glyph, a filled/stroked split by ownership.**
- **Any count, badge or deck-level total** — `4 combos`, `+1`, a number on a deck tile. The modal's
  **closed row** is the one exception: its counts describe the list the reader has not opened yet,
  not what exists.
- **Sorting, filtering or promoting combo rows.** A mark states a fact; moving a row makes a
  recommendation, and nobody has asked for that.
- **A mark on the partner.** The half already in the deck is the sentence's object, not its subject.
- **A tap target, a tooltip-only gloss, and motion.** Round 1's rules carry over whole.
- **Anything on the art.**

## Gap report

1. **The mark's column position is no longer stable** *on the decision hosts* — name line for a
   bare fact, secondary line for a state. Deliberate, and it no longer affects `/collection`, where
   the marker sits in the shipped cluster like every other fact marker.
2. **On `/collection` at 390 the partner name is two taps away** — no hover, so the tooltip is
   unreachable and the modal is the route. Correct for consistency with Game Changer, and still the
   single biggest thing this round gives up.
3. **"Most popular partner" is a ranking Design did not derive.** `spellbook_variants.popularity`
   is nullable (§4.2 verified it null on a real record). Eng needs a deterministic tiebreak; Design
   has no opinion beyond *stable across reloads*.
4. **Detection's bound is stated once, in the modal.** A player who never opens a modal never reads
   it. Accepted — the strings claim nothing exhaustive — but it means the caveat's reach is smaller
   than the mark's.
5. **State 1's population was measured once, on one collection.** 77 of 2,805 is 2.7%; a smaller or
   newer collection may see none at all, and the state then never appears. No empty state is drawn
   for it, by design (absence is not drawn), so the feature is invisible until it is true.
6. **The two states the candidate surfaces decline are real.** *You own both halves and neither is
   in this deck* is a two-card add worth surfacing eventually. Severable, and this handoff does not
   design it.
