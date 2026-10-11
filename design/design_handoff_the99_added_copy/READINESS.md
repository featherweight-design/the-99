# READINESS: Where an added copy goes (R1)

**Ready to audit:** the line's wording and placement on all three surfaces, Change's open behaviour per surface, Keep it free in the chooser, on a deck and on Shopping, and the five open questions. Each is drawn at 900 and 390.

**Approved as drawn (LGTM, 2026-10-11)**
1. `can use it`. This is the fourth chooser outcome, and it breaks card-assignments' "three forms and no more" rule on purpose (README call 7).
2. Summary grouping. `No longer to buy` becomes one row per card. That changes a frozen-payload shape (G2).
3. A one-brew line names the brew (AC4). Engineering leaned toward naming nothing for any soft share. Design names it only when it's the only claimant, because only then is the name true.

**Needs engineering:** G1–G8 in the README. The load-bearing ones are G3 (`isContested` gating the only door) and G4 (Keep it free and a pick in one transaction).

**Unverified**
- `--avail-over-fg` is drawn with a `--fg-muted` fallback. The live value wasn't read.
- `--surface-inset` falls back to `--elevated`.
- Version stamps and dates are illustrative.
