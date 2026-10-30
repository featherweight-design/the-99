# Gap report: Small items 6, item 3 (Suggested changes v2 About errata)

Design-review against `docs/superpowers/design-tables/small-items-6-about-errata.md`, read from the code on branch `small-items-6-d` (`src/lib/copy/about-pages.ts`, `src/components/about/pages/rule-diagrams.tsx`, `src/lib/copy/discovery.ts`, `src/lib/discovery/showcase.ts`).

| Row | Result |
|---|---|
| T1 card first in Good to know | MATCH: analysis rules `["pick", "intent", "credits"]` |
| T1 one column, 250 wide, gap 5 | MATCH |
| T1 captions | MATCH: `caption` part, mono 10 uppercase `--fg-faint` |
| T1 compact rows 22px / 0 8px / 11.5px | MATCH: `compact` |
| T1 picked rows: accent edge, `picked` in `--accent-text` | MATCH: `edge`, tone `accent` |
| T1 left rows: dashed, `pick` in `--fg-body` | MATCH: `dim`, tone `muted` (drawn in `--fg-body`) |
| T1 foot `↓` 16px and its mono label, `--fg-faint` | MATCH: `between` part |
| T1 nothing translucent | MATCH |
| T1 text | MATCH (draft for /copy-review) |
| T2 rows 1 to 3 as shipped | MATCH |
| T2 v2 rows, dashed, tags and tones | MATCH |
| T2 nothing translucent | MATCH |
| T3 Try it line with v2 on | MATCH: `lineWhen` resolved in `toolCopyFor`, so the Tools tab card follows too |
| States: pick card, credits rows, Try it line per switch | MATCH |
| States: Tuning tile purpose | MATCH (already shipped) |
| About rules: every row in one column at least 250 wide | MATCH: pinned by `about-pages.test.ts` |

**Verdict: 0 gaps.** Every row matches.
