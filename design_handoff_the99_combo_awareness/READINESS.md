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
