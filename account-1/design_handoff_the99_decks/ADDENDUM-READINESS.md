# READINESS — price on the buy tag (#291), R1

**Verdict: 🟢 Green.** All four ingest states are drawn at both densities, the four open questions
are ruled, and nothing here waits on anyone. One product call is raised and it is not a blocker:
everything in this pass ships whether or not the store link-out is ever wanted.

The shipped Decks handoff is unedited. This addendum adds one segment to one component and one
figure to one header; it redraws nothing.

## What the brief asked, and what R1 answers

| Ask | Ruling |
|---|---|
| **Four marks or fewer?** | **Zero new marks.** One tag, four tails — figure / figure + `foil` / `sold out` / nothing. State 4 is today's tag byte for byte. |
| **1 · Where does the number live?** | **Inside the tag, at both densities.** Price is the consequence of unownedness and the tag is where unownedness is declared; both meta lines are already spoken for. The row's figure right-aligns into a 58px slot under Shopping, hugs under `All`. |
| **2 · Does the tag become a link?** | **No.** `pointer-events: none` over card art, 9px at both densities, and the app's first link-out should not be an accident of density. Its home is the **export dialog**, as a deck-level action — named, not drawn. |
| **3 · Deck-level total?** | **Yes — one figure, Shopping header only, carrying its own denominator.** `$85.95 · 6 of 8 priced`; the clause drops when all are priced; the figure disappears when none are. Never on `/decks`, never on the `All` header. |
| **4 · How honest about staleness?** | **Three levels, one date.** `sold out` on the tag with no date; `prices from ManaPool · updated Monday` once on the header; `priced Monday` in every price's accessible name. |

## Verified against the locked semantics

Each of the ingest's four facts has exactly one presentation, and none of them is a lie:

- **Absent ≠ free, ≠ unknown.** State 4 renders nothing after the word `buy` — no dash, no zero, no
  placeholder — and its accessible name is the shipped ownership string with nothing appended.
- **Foil-only is buyable, and says so.** `buy · $2.10 foil`. Not a warning, not an absence; a price
  and a form.
- **A stale row is sold out, not priced.** Its figure is dropped entirely rather than shown dim,
  so no surface can sum it and no reader can quote it.
- **Whole cents, one store, never rounded.** The total is summed server-side over states 1 and 2
  and printed as-is; the store is named once per surface.

## The one product call

**Does a store link-out get its own ticket?** §2 rules it out of the tag and names the export
dialog as the place it belongs. That is a recommendation with a drawn slot and no design behind it —
if Product wants it, it is a ticket with a copy pass, a new-tab decision and whatever disclosure the
ManaPool relationship needs. If Product does not, nothing in this addendum changes.

## Open, non-blocking

- **Gap §2 — `sold out` is an inference.** A stale row means sold out *or* a missed ingest run, and
  the copy asserts the first. The honest fix is a run-health signal the ingest does not expose;
  worth a line in #291's follow-up rather than a hedge in the tag.
- **Gap §1 — the last known price on a sold-out card** is the strongest road not taken. Two
  decisions if it returns, not one.
- **Gap §3 — the 58px slot is sized to eight real names.** A four-figure price bends the column
  rather than truncating. Right failure, undrawn.
- **Gap §8 — `buy` beside a figure can read as a verb.** Ruling 2 says the tag is never pressable;
  the tile is where a mis-tap would land, and it is the one thing in this pass worth watching in a
  beta session rather than arguing about now.
- **The reviewer note on price visibility is now half-spent.** R2 said price could come later and
  should be called out when shown. It is here, deliberately, in two places and no more — and the
  exports still copy names only. If the third place ever gets proposed, that note is the thing to
  re-read.

## Unchanged and still verified

Nothing blocked · one status vocabulary · exports copy names only · no new token, hue, dependency or
motion · colour never the sole signal · the tag is never a target at either density · missing data
omitted, never zeroed · silence where we have nothing to say.
