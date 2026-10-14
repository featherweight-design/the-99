# Deck printings — readiness (R3)

**Green: approved to ship (Hugh, 2026-10-10).** R3 answers audit findings D1 and D2. It reuses shipped components and adds 7 new strings and one new prop (`PrintingRegion` `scope`). There are no new tokens, no new tag style and no new dependencies.

| Area | Rating |
|---|---|
| D1 intro line in deck scope | Green |
| D2 out-of-stock pick on rows and Shopping (falls back to the cheapest in-stock figure, as on `main`) | Green |
| Everything else (R2) | Green |

Handed to engineering: audit E1–E11, the I got it preset on a fallback (it follows the printing behind the figure), and the import of an unowned printing (silent). Strings go through `/copy-review`, including the intro wording and the import-strip composition (E3).
