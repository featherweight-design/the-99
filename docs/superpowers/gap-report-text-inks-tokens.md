# Gap report — text inks, tokens PR

Handoff: `design/design_handoff_the99_text_inks/` (R1, readiness Green). The property table for a token-values PR is the
handoff's ledger: ten changed values and the `--accent-text` alias in the five themes that alias it. Verified by reading
each theme block of `src/app/globals.css`.

| Theme | Token | Design | Implementation | |
|---|---|---|---|---|
| phyrexia | `--accent` | `#52827A` (unchanged) | `#52827A` | ✅ |
| phyrexia | `--accent-text` | `#5D8E85` | `#5D8E85` | ✅ |
| phyrexia | `--accent-hover` | `#6E9D95` | `#6E9D95` | ✅ |
| phyrexia | `--fg-faint` | `#87838D` | `#87838D` | ✅ |
| kaldheim | `--accent` | `#6C97DB` | `#6C97DB` | ✅ |
| kaldheim | `--accent-hover` | `#7CA6EA` | `#7CA6EA` | ✅ |
| kaldheim | `--fg-faint` | `#8A999B` | `#8A999B` | ✅ |
| amonkhet | `--fg-faint` | `#948B78` | `#948B78` | ✅ |
| kamigawa | `--fg-faint` | `#84899B` | `#84899B` | ✅ |
| ixalan | `--fg-faint` | `#879383` | `#879383` | ✅ |
| eldraine | `--fg-faint` | `#8F899B` | `#8F899B` | ✅ |
| amonkhet, kamigawa, ixalan, eldraine, kaldheim | `--accent-text` | `var(--accent)` | `var(--accent)` | ✅ |

`--color-accent-text` is wired through `@theme`, so `text-accent-text` exists for the sweeps.

**Verdict: 0 gaps.** The contrast of every value on all six grounds is pinned by `contract.test.ts` ("clears every
contrast floor"), mutation-checked by restoring each of the four kinds of shipped value (a faint ink, the Phyrexia text
ink, the Kaldheim accent, the Kaldheim hover): each fails it.

The text sites themselves move in the sweep PRs S1 to S11 named in the handoff's `READINESS.md`.
