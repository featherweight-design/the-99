# Navigation cost — history

The first row is the baseline, taken before any behavior changed; every row after it is a PR that
changed rendering or payload. `pnpm probe:nav-cost` produces the figures;
`nav-cost-baseline.json` holds the budgets it asserts against.

**Conditions are fixed, and a figure taken under different ones does not belong here:** production
build (`pnpm build && pnpm start`), every route — **including the deck page** — loaded twice by
document navigation before recording, the `E2E_AUDIT_USER_EMAIL` fixture account, widths 1300x900
and 390x844. A figure from
`next dev` or a cold server is not comparable — dev disables `<Link>` prefetch and compiles on
demand, which is the slowness under measurement rather than a measurement of it.

Each cell is `<RSC fetches on revisit> · <decoded payload>`. Response time is in the JSON as
`responseMs`, not here: it is wall clock from fetch start to response end, so it includes browser
scheduling and transfer rather than being server compute, and it swings run to run — `/collection`
read 309ms and 738ms on two runs of the same build. Treat a change of tens of ms as noise.

**Payloads do not differ by width.** The server renders one tree and the responsive work is CSS, so
the phone downloads the same bytes over a worse connection. Where a row's two widths agree, one
figure is given.

| Date | PR | What changed | `/collection` | `/discover` | `/decks/[id]` | `/commanders` | `/` | `/decks` |
|---|---|---|---|---|---|---|---|---|
| 2026-09-16 | #692 | baseline — probe added, no behavior change | 1 · 1595.8 KB | 1 · 951.3 KB | 1 · 553.7 KB | 1 · 158.0 KB | 1 · 29.5 KB | 1 · 28.3 KB |

## Notes on the baseline row

- **Every forward navigation costs one fetch, including third visits to an unchanged route.** The
  deck page returned a byte-identical 553.7 KB payload on every visit. Browser back/forward costs
  zero, which is a separate history cache and is why the app feels inconsistently rather than
  uniformly slow.
- **The fixture is not a worst case.** It holds 2,733 `collection_items` rows against Hugh's 3,239,
  so these figures are if anything *smaller* than his account produces. An earlier version of this
  file called them conservative, which is backwards for a performance benchmark: read them as tied
  to the fixture, not as an upper bound.
- **The deck is part of the conditions.** `/decks/[id]`'s payload is one deck's cards and
  suggestions, and `/decks` is ordered by mutable data, so a later run can measure a different deck
  and read the difference as a regression. The measured deck is recorded in each run's report, and
  `PROBE_DECK` pins it.
- **`/commanders` measured 158.0 KB, not the 174.7 KB quoted in the spec.** The spec's figure was
  taken before #683 and #684 merged. Both runs measured it twice with identical values, so the
  difference is those commits rather than noise, and the baseline records what is true now. The
  commit the measurement ran against is in the JSON as `mainCommit` — the **main** commit rather
  than a branch head, because a rebase rewrites branch SHAs and an earlier version of that field
  named a commit the branch no longer carried.
- **The warm-up was wrong when this row was first written**, and the row was re-measured before it
  shipped. The walk loaded each route once and never document-loaded a deck page at all, while the
  conditions claimed two passes — so `/decks/[id]` was partly cold. With the warm-up corrected its
  RESPONSE time fell — the committed run records 658ms desktop and 682ms phone, against 695–727ms
  before — and every payload was unchanged, so the finding stands: a warm revisit still costs a full fetch. (Response time, not server time — see the note
  above on what `responseMs` measures.)
- **`/` and `/decks` are slow behind tiny payloads.** Both ship under 30 KB and still take
  hundreds of milliseconds, which points at server work rather than transport — but `responseMs`
  cannot prove that on its own, since it also counts scheduling and transfer. PR 8 instruments the
  queries directly rather than inferring compute from this figure.
