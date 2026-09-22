# Errata — the bracket mark assets

Engineering's notes on the drop. `ASSETS.md` is Design's document and is not edited here.

## 1 · The chip is unreadable for two of five ranks, by its own account

`ASSETS.md` states two things that cannot both hold at the ship size:

> *"The numeral … at the 22px ship size renders at ~9px and is not legible — **the silhouette
> carries the rank there, and that is the design.** Nothing should depend on it at 22."*

> *"**1 vs 2.** Rank 2's only ornament is the mid ring, and the chip is the one form that drops
> it, so 1 and 2 are **a single silhouette**."*

If the silhouette carries the rank and two ranks share a silhouette, the chip carries no rank for
those two. `3 vs 4` is the same question at a thinner margin — *"thinner than the separation
4-vs-5 got and has never been tested at size."*

**This is a Design question and `ASSETS.md` says so** — *"A Round 0 conversation."* It is recorded
here rather than resolved, and it does not block Round 2's verdict head, which draws the FULL mark
at 26/36/44 where every rank separates.

**What it does block: any surface drawing the chip at 22px.** Before one ships, either the
collisions are resolved or the chip is given a text label beside it — the rule this project
already holds is that a wordless mark whose owner cannot read it is not a signal, and its weakest
contrast is measured before the build rather than after.

## 2 · The declaration canvas contradicts this file

The declaration handoff's canvas says ranks 3, 4 and 5 stay distinct at 22px. `ASSETS.md` names
3-vs-4 as the second unresolved collision. `ASSETS.md` is the later document and the one this
folder is the home for, so it wins; the canvas sentence is stale.

Found by review on PR #817. Design's files are left as delivered — a handoff is the record of what
was handed over, and rewriting one inside an engineering PR destroys the evidence.
