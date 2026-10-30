# Gap report — Small items 6, item 4 (Critical chip)

Verified against `docs/superpowers/design-tables/small-items-6-critical.md`.

| Row | Result |
|---|---|
| Pill shape, type, padding, radius (shared with shipped chips) | MATCH: unchanged shipped classes |
| Critical ink `#E07A65` | MATCH: `text-[#E07A65]` |
| Critical edge `--danger` 60% | MATCH: `border-[color-mix(in_oklab,var(--danger)_60%,transparent)]` (`--danger` is `#C6533F` in every theme) |
| Moderate, Minor | MATCH: unchanged |
| Phone over the line / desktop chip column | MATCH: shipped grid unchanged |
| Critical line reachable | REACHABLE: `splitSeverity` takes `Critical`; `TIER_WORD` writes it |
| Order | REACHABLE: `bySeverity` in the stages Weaknesses section, stable within a tier |

VERDICT: 0 visual gaps, 0 state gaps.
