# Suggested changes: the count mechanism

Flows: two-call asks for N additions, then shows them as coming in and asks for N cuts; one-call asks one reply for both.
Arms (per stage, or per reply): A asks 1.5N and keeps the first N that pass; B asks N and refills a shortfall once; C asks 1.5N and refills only if still short.

Requests: each deck ran with no request and with this one:

- HD Tune - Mutant Menace: "Tighten the mutant and +1/+1 counters plan, and cut the clone pile."
- HD Tune - Mutant Menace (original): "Tighten the mutant and +1/+1 counters plan, and cut the clone pile."
- HD - Goblins: "More ways to win once the board is wide, fewer do-nothing Goblins."
- HD - Avatar Aang: "Make the commander flip more reliably, and cut cards that don't help bend."
- HD - Gishath: "More Dinosaurs that hit hard when Gishath reveals them, fewer cards that don't."

A failed call that returned no usage meter is held at its worst case on the ledger, and its run's $ includes that hold. So `Mean $` is over the runs with no failed call only (measured spend), and `Failed` counts the runs left out of it.

| Count | Flow | Arm | Runs | Hit (both lists full) | Mean adds / cuts kept | Mean $ / run (measured) | Failed | p50 s | p90 s | Calls / run | Top drop reasons |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 20 | two-call | A | 8 | 5 of 8 | 17.8 / 17.5 | $0.105 | 1 | 54 | 109 | 2.00 | cut noResultClaim ×14, add colourIdentity ×3, add noResultClaim ×2 |
| 20 | two-call | B | 8 | 6 of 8 | 20.0 / 19.8 | $0.104 | 0 | 46 | 56 | 3.25 | cut noResultClaim ×7, add colourIdentity ×2, add denominator ×1 |
| 20 | two-call | C | 8 | 8 of 8 | 20.0 / 20.0 | $0.104 | 1 | 56 | 114 | 2.13 | cut noResultClaim ×8, add noResultClaim ×3, add colourIdentity ×2 |
| 20 | one-call | A | 8 | 7 of 8 | 19.1 / 19.4 | $0.092 | 0 | 55 | 63 | 1.00 | cut noResultClaim ×6, add colourIdentity ×2, add noResultClaim ×1 |
| 20 | one-call | B | 8 | 5 of 8 | 17.8 / 17.4 | $0.092 | 1 | 66 | 80 | 1.88 | cut noResultClaim ×8, add denominator ×4, add cardExists ×1 |
| 20 | one-call | C | 8 | 7 of 8 | 19.9 / 20.0 | $0.101 | 1 | 58 | 158 | 1.25 | add noResultClaim ×2, add colourIdentity ×1, add denominator ×1 |
| 10 | two-call | A | 8 | 8 of 8 | 10.0 / 10.0 | $0.070 | 0 | 36 | 62 | 2.00 | add colourIdentity ×4, add denominator ×3, cut noResultClaim ×3 |
| 10 | two-call | B | 8 | 6 of 8 | 10.0 / 9.8 | $0.076 | 0 | 31 | 44 | 3.25 | cut noResultClaim ×8, add colourIdentity ×3, add denominator ×2 |
| 10 | two-call | C | 8 | 8 of 8 | 10.0 / 10.0 | $0.074 | 2 | 40 | 83 | 2.38 | add noResultClaim ×1, add colourIdentity ×1, add noNet ×1 |
| 10 | one-call | A | 8 | 5 of 8 | 7.3 / 7.5 | $0.054 | 2 | 31 | 79 | 1.00 | add colourIdentity ×2, add denominator ×1 |
| 10 | one-call | B | 8 | 7 of 8 | 9.9 / 10.0 | $0.053 | 0 | 23 | 57 | 1.75 | add colourIdentity ×3, add cardExists ×2, add denominator ×1 |
| 10 | one-call | C | 8 | 7 of 8 | 9.8 / 10.0 | $0.058 | 1 | 57 | 102 | 1.38 | cut noResultClaim ×3, add colourIdentity ×2, add denominator ×2 |
| 3 | two-call | A | 8 | 8 of 8 | 3.0 / 3.0 | $0.041 | 0 | 13 | 21 | 2.00 | add colourIdentity ×4, add denominator ×3, cut noResultClaim ×1 |
| 3 | two-call | B | 8 | 8 of 8 | 3.0 / 3.0 | $0.043 | 0 | 12 | 16 | 2.50 | add colourIdentity ×2, cut cardExists ×1, cut noResultClaim ×1 |
| 3 | two-call | C | 8 | 8 of 8 | 3.0 / 3.0 | $0.042 | 0 | 14 | 38 | 2.00 | add colourIdentity ×1, add denominator ×1, cut noResultClaim ×1 |
| 3 | one-call | A | 7 | 5 of 7 | 2.7 / 3.0 | $0.026 | 0 | 9 | 15 | 1.00 | add denominator ×1, add colourIdentity ×1 |
| 3 | one-call | B | 7 | 6 of 7 | 3.0 / 2.9 | $0.026 | 0 | 11 | 15 | 1.29 | add colourIdentity ×1, cut noResultClaim ×1, cut denominator ×1 |
| 3 | one-call | C | 7 | 7 of 7 | 3.0 / 3.0 | $0.027 | 0 | 9 | 33 | 1.00 | add colourIdentity ×1 |

## The original Mutant Menace list against what Hugh changed

Hugh's production list adds 47 cards to the original and cuts 47 (by name). Each arm's picks on the original list, matched by name:

| Count | Request | Flow | Arm | Adds matching Hugh's adds | Cuts matching Hugh's cuts |
|---|---|---|---|---|---|
| 20 | none | two-call | A | 6 of 20 | 0 of 0 |
| 20 | none | two-call | B | 7 of 20 | 10 of 20 |
| 20 | none | two-call | C | 7 of 20 | 10 of 20 |
| 20 | none | one-call | A | 7 of 20 | 8 of 20 |
| 20 | none | one-call | B | 8 of 20 | 9 of 20 |
| 20 | none | one-call | C | 8 of 20 | 9 of 20 |
| 20 | asked | two-call | A | 7 of 20 | 16 of 20 |
| 20 | asked | two-call | B | 11 of 20 | 14 of 20 |
| 20 | asked | two-call | C | 6 of 20 | 15 of 20 |
| 20 | asked | one-call | A | 5 of 13 | 13 of 15 |
| 20 | asked | one-call | B | 3 of 5 | 0 of 0 |
| 20 | asked | one-call | C | 6 of 20 | 14 of 20 |
| 10 | none | two-call | A | 3 of 10 | 6 of 10 |
| 10 | none | two-call | B | 3 of 10 | 6 of 10 |
| 10 | none | two-call | C | 4 of 10 | 6 of 10 |
| 10 | none | one-call | A | 3 of 8 | 7 of 10 |
| 10 | none | one-call | B | 4 of 9 | 6 of 10 |
| 10 | none | one-call | C | 4 of 10 | 6 of 10 |
| 10 | asked | two-call | A | 4 of 10 | 7 of 10 |
| 10 | asked | two-call | B | 5 of 10 | 6 of 10 |
| 10 | asked | two-call | C | 6 of 10 | 6 of 10 |
| 10 | asked | one-call | A | 5 of 10 | 10 of 10 |
| 10 | asked | one-call | B | 4 of 10 | 7 of 10 |
| 10 | asked | one-call | C | 6 of 10 | 9 of 10 |
| 3 | none | two-call | A | 2 of 3 | 1 of 3 |
| 3 | none | two-call | B | 1 of 3 | 1 of 3 |
| 3 | none | two-call | C | 2 of 3 | 1 of 3 |
| 3 | none | one-call | A | 1 of 3 | 2 of 3 |
| 3 | none | one-call | B | 1 of 3 | 1 of 3 |
| 3 | none | one-call | C | 2 of 3 | 2 of 3 |
| 3 | asked | two-call | A | 2 of 3 | 3 of 3 |
| 3 | asked | two-call | B | 1 of 3 | 3 of 3 |
| 3 | asked | two-call | C | 1 of 3 | 3 of 3 |
| 3 | asked | one-call | A | 1 of 2 | 3 of 3 |
| 3 | asked | one-call | B | 2 of 3 | 3 of 3 |
| 3 | asked | one-call | C | 1 of 3 | 3 of 3 |

141 runs, $12.87 in all, of which $4.18 is the 9 runs with a failed call (each failed call held at its worst case).
