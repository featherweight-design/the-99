# READINESS — combo awareness (R1)

**Verdict: 🟡 Yellow.** The drawings are complete and buildable against three shipped hosts with
no new token, no new hex and no new geometry. **One data dependency gates two of the three
states**, and one upstream ranking question is eng's to answer.

## What is ready to build today

- The `ComboClause` atom for the **decision hosts**: Round 2's lemniscate at 12px + one mono
  string, two densities, inert.
- The **`/collection` marker**: the lemniscate as a member of the shipped `CardFactMark` family —
  16×16, `--fact`, its own hover tooltip, no clause, no yield, no layout change on the row or the
  tile.
- The placement rule (browse hosts get the marker, decision hosts get the sentence) and its one
  consequence for `CardFactMark`.
- All seven host treatments, both widths, in `STATES-combo-awareness.md`.
- Both strings, final, in `combo-awareness · copy strings.ts`.
- The modal block, including the detection bound — and, per `ADDENDUM-modal-block.md`, its
  placement (second in the stack), its **closed 52px default row with counts by state**, its scope
  line, its ordering rule and the pressable partner name.

## Dependencies

| # | Dependency | Blocks | Owner |
|---|---|---|---|
| **1** | **Round 2 ships the lemniscate.** This round draws with it and does not define it. If Round 2's geometry moves, every drawing here follows automatically — same path, same ink, same glow. | everything | Round 2 |
| **2** | **The §4.3 combo join, applying all three §4.3b rules.** Template-gated variants excluded, `mustBeCommander` matched against the deck's actual commander, and the commander read from `decks.commander_oracle_id` / `partner_oracle_id` rather than `deck_cards`. | states 2 and 3 | Eng, spec §4.3b |
| **3** | **`{state, partnerName, partnerOracleId}` on three payloads** — the browse list (`/collection`), the Add panel's suggestion + search payloads, and `planLastSlots`'s candidates. Tier B, the same widening Round 1 asked for on the browse list. | states 2 and 3 on their hosts | Eng |
| **4** | **A deterministic "most popular partner" tiebreak.** `spellbook_variants.popularity` is nullable and was verified null on a real bulk record (§4.2). Design's only requirement is that the choice is **stable across reloads**; the rule itself is eng's. | the clause, everywhere | Eng |

| **5** | **The modal takes an optional deck scope.** With one, `in this deck` is sayable, the scope line renders and in-deck partners sort first; without one, none of the three. Routes that open the modal today do not all carry a deck id. | the modal block's deck reading (not the block itself) | Eng |
| **6** | **A resolvable Commander Spellbook URL for the card.** The tooltip's `Commander Spellbook ↗` is the link; without a URL the sentence renders as plain text and nothing shifts. Per-variant links were withdrawn. | the link out only | Eng |
| **7** | **An answer to Hugh's question** (`ADDENDUM-modal-block.md`): do `you don't own it` lines belong in the modal block at all? The closed row answers the height objection, so the cut is cheaper later than now — one filter on the tail, and the closed row's counts change by themselves. | the block's final line set | Eng, then Hugh |
| **8** | **A per-reader flag for the block's open state** — remembered across modals, not per card. Closing it turns it back off. Without it the closed default costs an interested reader a tap per card instead of a tap ever. | the open-state memory only | Eng |

**State 1 depends on none of 2–5 that are deck-scoped** — it is a collection-scoped query over
`spellbook_variant_cards` and the collection, and it can ship alone. **If the deck states slip,
the slip is clean:** `/collection` ships with `with {partner} — you own both` and the two candidate
surfaces gain their clause later at call sites that already exist.

## Open items Design is carrying

1. **The mark's column position is no longer stable on the decision hosts** (README gap 1). It no
   longer affects `/collection`, where the marker sits in the shipped cluster.
2. **On `/collection` at 390 the partner name is two taps away** — no hover, so the tooltip is
   unreachable and the modal is the route. Consistent with Game Changer, and the biggest thing this
   round gives up.
3. **State 1 was measured on one collection** — 77 of 2,805. A smaller collection may see the
   state never, and nothing is drawn in its absence, by design.
4. **The two-away state is severable, not refused** — *you own both halves and neither is in this
   deck*, on the candidate surfaces. Not designed here.
5. **The modal block is closed on first open.** A player who cares pays one tap ever (the state is
   remembered); a player who does not pays nothing. But the feature is invisible until asked for,
   which is a real cost for a fact nothing in the app has ever stated — the closed row's counts are
   what carry it, and they are the thing to watch in review.
6. **The partner link replaces the modal rather than stacking**, so the back gesture returns to the
   card and not to the row. That is the shipped modal's behaviour, not made worse here — but the
   link is the first thing that makes it a common path.

## What this round did not touch

- **Round 2's lemniscate**: not redrawn, not re-argued, not resized.
- **Round 1's `--fact` ink, its 16×16 geometry and its size ladder**: adopted verbatim — and on
  `/collection` the marker now follows the shipped Game Changer rendering exactly.
- **The shipped `BuyTag`**: unchanged in ink, box, slot and per-host collapse rules.
- **The shipped `OwnershipDot`** and the availability slot's one-occupant rule.
- **Ranking, sorting and filtering** on all three hosts.
- **Any list.** Hugh's ruling; 962 raw near-misses across 20 decks is the reason.

## Contrast

No new ink was introduced, so Round 1's measurement stands. The two values this round newly
places on a `--surface` row:

| Pair | Ratio | Verdict |
|---|---|---|
| clause text `--fg-body` `#C0B8A6` on `--surface` `#1E1A15` | ~9.3:1 | AA / AAA |
| lemniscate `--fact` `#8FA6BE` on `--surface` `#1E1A15` | ~6.7:1 | Round 1's measured weakest pair, unchanged |
| tooltip text `--fg` `#EDE6D8` on `--elevated` `#29241F` | ~11.6:1 | AAA — Game Changer's shipped tooltip pair |

The 16×16 `/collection` marker is Round 1's own size, so nothing new is measured there. The tile's
`SET · rarity` is untouched now that the yield is withdrawn.

---

# ENG ERRATA — R2/R3 build, 2026-09-22

Recorded rather than edited into the drawings: those are Design's, and this section is eng's.
Four items, two of them decisions Hugh took that depart from the package.

## 1 · Dependency 8 is DECLINED — the block stays closed on every card

The addendum asks for the open state to be remembered **per reader**: a player who opens the
block once has told us they care, so the next modal opens with it already open. Hugh ruled
against it on 2026-09-22 and the block is closed on every card.

What that costs is stated in the addendum itself and stands: an interested reader pays a tap
per card rather than a tap ever. Nothing else in the block changes — the closed row, its
counts and its ordering are all as drawn.

## 2 · One mark size, 16px, which supersedes the 12/16 split

`READINESS.md` above still specifies *"Round 2's lemniscate at 12px"* for the decision hosts
and 16px for the modal. **Built at 16 everywhere**, which is not a deviation but an older
ruling this package had not caught up with: `card-fact-mark.tsx` records Hugh's 2026-09-21
decision that the fact marks shipped at 12, 13, 14 and 16 across six mounts — the same fact
reading as a different mark depending on which list a player was looking at — and says in as
many words that it supersedes this handoff's floor. Restated directly on 2026-09-22.

Worth recording how it was nearly missed: a reviewer raised exactly this on #840, and eng
declined it citing this package, which is how a ruling already in the tree was overridden by
a document it had already superseded.

## 3 · `markerTooltip.ownBothMore` emitted `and 1 others`

The copy file's string is `and ${others} others` unconditionally, so a card with exactly two
partners read ungrammatically — and two is the MEDIAN shape on the reference collection, not
an edge. Corrected in code to a singular at one. No other string moved.

## 4 · The partner link does not return to the card it was followed from — RESOLVED

The addendum says the name opens the partner **replacing** the current modal, and that the
back gesture returns to the card you started from. The first half ships; the second does not.
`load` replaces the provider's card and keeps no history, so closing from a partner closes
the modal.

Giving it a return means deciding what CLOSE means while a partner is open — back, or shut —
which is a design call rather than an omission, so it was flagged here rather than invented.
**That call has since been made, and the two paragraphs above are the state before it. The
shipped behaviour is correct; nothing below is an open deviation.**

**RESOLVED 2026-09-22, by a later Design package rather than by this one, which
SUPERSEDES the addendum's expectation that the back gesture returns to the originating
card.**
`design_handoff_the99_verdict_addendum`, drawn for the verdict receipt, rules on modal depth
from the other side: *"Depth stops at two, and this is a hard rule. Nothing inside the card
modal opens a third sheet — no related-card link, no jump to another combo,"* and
*"back-navigation must pop one level, not the stack."*

The shipped behaviour satisfies both packages. That rule is about receipt to card, where the
card modal DOES stack; this one is about partner to partner inside the card modal, where the
link replaces in place and opens nothing. A replacement is not a third sheet, so the partner
link is admitted by the hard rule rather than excepted from it — and there is no level between
two partners for a back gesture to pop. Closing from a partner closing the modal is the one
level popping, correctly.

The two documents agree and neither says so, which is why this is recorded. Read alone, this
item reads as an open behaviour someone may change, and that rule reads as forbidding a link
this package ships. Both readings are wrong, and either would cost a round. That package was
uncommitted on `main` when this was written, so it is cited by name and the quotations are
what it said at that moment.

## Also outstanding, and not a deviation

**The feature has no browser probe.** Several of its rules are facts about a laid-out page —
whether the clause shortens rather than clipping, whether the state sits under the partner's
name at 390px, whether four 16px marks fit a 157px tile — and jsdom produces no layout, so
they are asserted by class list alone. Hugh ruled on 2026-09-22 to ship without one.

**Matrix 4, the quick-add result row, is not built.** Its results come from a per-keystroke
search action, and the combo read measures **~305ms against a real staging deck**, flat
regardless of result count — the cost is the deck-side prune rather than the candidates. That
is hundreds of milliseconds on every keystroke, so it was measured and returned rather than
shipped.
