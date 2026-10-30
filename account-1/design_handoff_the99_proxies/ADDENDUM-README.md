# ADDENDUM — Deck proxies R2

`design/design_handoff_the99_proxies/` · 2026-09-15 · read after `README.md`

**Two additions to a green package. No R1 surface is reopened.** The glyph `P`, the mark key, skin A,
the read-only proxy list and decision 6 all ship as drawn. R1's §1–§10 in the canvas are byte-for-byte
what they were; R2 adds **§11** and **§12**, and a two-item banner at the top that points at them.

The canvas is now `The 99 - Deck Proxies (R2).dc.html` — cumulative, one file, the sibling
`set_collections` convention.

---

## §11 · The same fact on the `/decks` tile

**Decision 6 put the proxy count where the marks are. The grid is where they aren't.** On the deck
page the pill has ninety-nine marked rows and a key under it; on a tile it stands alone — two
`Complete` decks, two full green bars, two `99 / 99`, and nothing saying one of them is seven cards
of printer paper.

### It takes the tile's existing detail slot

`detailFor` already owns one slot per tile, and it returns `null` for `Complete` — *all owned* was cut
as "a third way of saying finished, beside a full green bar and `99 / 99`". **A proxy count is the one
thing `Complete` has to say that the bar and the count do not carry between them**, which is the test
that cut the old figure, passed rather than failed.

**No new row, no new grid template, no new token.** The `detail` and `detail + played` templates both
ship; this state is the shipped pair reached by a status that could not reach it before.

### `7 proxies`, not R1's sentence

The deck page says *7 of these are proxies* across a wide band. The tile's slot is a truncating
10.5px cell in a column that is 189px at 640px of viewport, and its idiom is figure-plus-noun: `4
over`, `3 lines unresolved`, `3 in use elsewhere`. Same word in both, at the density of the surface
it is on.

### "Takes no colour" is structural, not a rule to remember

The slot is coloured by `DETAIL_COLOR[status]`, so a naive addition would print a proxy count in
`--danger` on an Over deck. **It cannot happen, and nothing was added to prevent it.** The line is a
fallback into the *null* branch — exactly as the `inUseElsewhere` clause is — so it never displaces a
figure; and **every status that would lend it a warning colour already has a figure in that slot**
(Over `4 over`, Unresolved `3 lines unresolved`, To buy its roll-up). The three that reach the
fallback — Complete, Building, Draft — are `--fg-faint` in the map, all of them. The constraint is
enforced by the precedence, and it holds for any status added later.

**One ordering to state:** Building keeps `3 in use elsewhere` when it has one — that clause answers
*what is holding this deck up*, and a proxy is not holding anything up. The proxy line ranks second,
which costs nothing on `Complete`, the tile the brief is about, because `Complete` cannot reach the
first clause at all.

### The accessible name needs no new work

The overlay link's name is composed by `cardAria(name, identity, status, count, detail, lastPlayed)`,
so the line arrives **in position**: *… Complete, 99 / 99, 7 proxies*. The qualifier lands directly
after the word it qualifies, which is where a sighted reader's eye goes too. That is the dividend of
using the existing slot rather than adding a row.

### The cost, named

A Complete deck with proxies grows by one row — a 9px gap plus a 10.5px line. That is precisely the
cost the `Building` + `inUseElsewhere` clause already accepted for its own tile. **Absent at zero
means absent**, so every deck without proxies draws exactly what it draws today.

---

## §12 · Gap report item 5 — the `bucketAdds` word

### It is a chip, not a bucket heading

**The bucket headings do not exist.** Deck-versioning's R2 ruled availability *a per-row treatment
rather than a grouping*; `review.bucketFree` and its siblings were deleted, a test pins their absence
(`"bucketFree" in copy.review === false`), and a comment in `decklist-row.test.tsx` records that
"the bucket heading is the accessible statement" described buckets that were withdrawn. The buckets
survive as **counts and per-row chips**.

So the word is **a fourth branch of `bucketWord`**, in `chipBuy`'s slot and skin.

### Silence was available and is wrong

`bucketWord` returns `null` at `free` and at a null bucket — silence is a shipped, legitimate state,
and a proxied add could plausibly borrow it. **It must not.** `free` means *your collection has a
spare copy for this*. Drawing a proxied add the same way makes the app assert a copy in a box, on the
one surface whose whole job is telling a player what a commit will cost them. This is R1's contract
reaching a fourth surface.

### The word: `proxied`

| | |
|---|---|
| **Chip** | `proxied` — one word, mono 10px, pill radius, `--fg-body` on `1px dashed var(--fg-locked)`, no fill |
| **Accessible** | `proxiedA11y(card)` → *"The Ozolith is a proxy in this deck, so this add asks nothing of your collection."* Never rendered; rides `describedBy`. |

The two shipped chips name *what you can do about it* — `to buy`, `can be pulled`. The proxy answer is
that there is nothing to do, so the chip names the cause, which is R1's ruling on the word and why
`covered` lost there too. It sits beside `commander` and `deck in draft`, the page's other one-fact
tags.

**The skin is the mark's, not a bucket's.** The bucket chips carry a tinted plate in the bucket's own
hue; money and pulls are what those hues mean, and this is neither. The dashed edge is already the
app's word for *not settled cardboard*, so a reader who has seen the decklist recognises it.

`describedBy` is not a new mechanism: the page already carries the availability word there "so the buy
tag's colour is not the only statement of it", and the sentence is shaped like `commanderGuardA11y` —
full sentence, names the card, offers no action.

---

## What R2 found that it was not asked for

**1 · The review row draws a buy tag on a proxied add, as shipped.** `AvailabilitySlot` opens
`if (buyable && (!card.owned || …)) return <BuyTag />`, and a proxied add is unowned. So the row
quotes a price for a card the player has decided not to buy — **R1's mutual-exclusion constraint,
arriving on a third surface nobody had drawn.** The slot must test proxied first; that is
`deckRowTag`'s ruling applied here rather than a second convention. This is a defect, not a design
call, and it is the single most important line in §12.

**2 · Three figures must exclude the proxied add.** The review footer's `buy`, the commit sheet's
total, and the pending banner's `money` sentence (*N of the M are short of spare copies*). A proxied
add is not short of anything — it asks for nothing. Billing it is exactly what "must not be billed"
means, and it is the same class of error as printing `0 to buy` over a failed claim read, which
`deck-versioning.ts` already refuses in four places.

**3 · Flagged rather than decided: `groupInBreakdown(free, sleeved, buy)`.** A proxied add is in none
of the three terms, so they stop summing to the group's count. **Recommendation: leave it
under-summing rather than add a fourth term** — each term stays true, and it is the same posture as
`footerUnknown` dropping a term rather than printing a figure nobody can stand behind. A fourth term
is a change to a shipped surface R2 was not given, which is the reason `stamp.columnHeader` was
dropped from that same file.

---

## Themes

**No new six-theme matrix, and that is a finding rather than a saving.** The tile line uses the detail
slot's own `--fg-faint`; the chip uses `--fg-body` on `--fg-locked`, both already measured in §9
against the darkest surface either sits on. **R2 introduces no value that §9 does not already cover**,
which is the dividend skin A was ratified for.

## Copy

`deck-proxies · copy strings.ts` gains `deckCard.line` (with its singular arm) and a `review` block
carrying `chip` and `a11y`. Both are annotated in place.
