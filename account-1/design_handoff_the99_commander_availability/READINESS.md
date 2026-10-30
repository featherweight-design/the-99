# READINESS — commander availability (R1)

What R1 depends on, what it could not verify, and what it is asking the audit to rule on.

## The three dependencies

| # | Dependency | State |
|---|---|---|
| 1 | **The availability read on this page.** One `loadAvailability(userId, { oracleIds })` call, off-decklist vantage, narrowed to the role cards' and synergy cards' oracle ids, never cached. | Planned in the brief's §7. Not built. Every cell in the matrix assumes it, and `RoleCard` has no `availability` field today — see README gap 3. |
| 2 | **The price join.** `SynergyCard` carries no price, so the priced tag adds a `printing_prices` join to this page. | Planned in §7. The tag itself needs no change. A printing absent from the table has never been stocked; a null `price_cents` is foil-only. Neither is "free" and neither is "unknown" — and `BuyTag` already draws both correctly. |
| 3 | **The Canopy `--success` fix.** Six themed values, ΔE-checked against each theme's `--accent`, `--g` and `--bg`. | Separable and ships **first** (brief §5). It lands on every ownership dot in the app at once, which is why it needs no handoff surface. **Design owes six values, not a drawing** — and R1 did not supply them, because §5 is explicitly not part of this round. |

## What R1 could not verify

1. **The key's pip geometry.** `LegendPip` carried inline baseline offsets this handoff did not
   read. The key is specified as `OwnershipDot` at 6px with those offsets restored; if the two atoms
   sit on different baselines the key needs a correction. One line, but it is unread.
2. **The desktop synergy panel's responsive bounds.** The 88px slot is specified against the five
   shipped columns and their gaps (~382px of fixed width in total), but the panel's own min-width
   was not read. Which column gives way first at the narrowest desktop is unruled — README gap 2.
3. **`buy · sold out` in the 88px slot.** The slot was measured against `buy · $4.50`. `BuyTag`'s
   reserved figure column is 46px and `sold out` fills it, so the wider form is close to the bound
   and was not measured.
4. **`copy/recommendations.ts` was cited, not read.** `chipAria`'s three shipped branches are quoted
   from `coverage-chip.tsx`, which composes them, rather than from the module that declares them.
   The suffix rule — clause lands last, all three branches keep their affordance — holds either way,
   but the exact shipped strings are second-hand.

## What the audit is asked to rule on

1. **§4.1 — that the aria item needed no ruling.** R1's answer is that the coupled contract is not
   engaged on this page, because the marker never speaks here: the chip and both rows carry a
   computed accessible name on their own control, which is the case the marker's `spoken` prop
   already documents. If the audit disagrees and holds that the *surface* rather than the
   *component* is what the contract binds, then the fallback is the third option, and the README says
   why it is the worst of the three.
2. **§4.2 — a two-form conditional key.** One key, picked by `anyMarker`. The audit may reasonably
   hold that data-dependent copy is worse than a one-word change to a free player's page; if so,
   `dotOwned` ships unconditionally, `dotFree` deletes with `dotCommitted`, and the round loses its
   byte-identical free state. **R1 would not make that trade**, and it is the only place in the
   handoff where the unusual constraint cost a string.
3. **The count-only extension to the synergy row.** The brief rules Role Coverage count-only and
   leaves the synergy row unstated. R1 extended it, for the slot-width reason in §1 of the canvas. A
   name-bearing synergy marker is a coherent alternative and would make this the one page in the app
   where the marker's two label forms appear side by side.
4. **The correction to ruling 3's cost figure.** Measured growth is 69–89px, not ~40px. The
   decision stands; the figure in the brief should not.

## What R1 deliberately did not do

- **Draw the degraded state.** It is a real question — the page has a degraded note and a Retry for
  EDHREC, and an availability failure is a different outage — and R1 would put it on the next brief
  rather than answer it inside a round whose §3 did not mention it. README gap 6.
- **Touch the hero, the receipt, the score, or "Why this commander."** Brief §6. `committedSupport`
  answers which deck holds the most of a commander's support, which is not whether a copy is free.
- **Touch `/commanders` or `/discover`.** Ruling 8.
- **Supply the six `--success` values.** Brief §5 ships ahead of and separately from this round.
