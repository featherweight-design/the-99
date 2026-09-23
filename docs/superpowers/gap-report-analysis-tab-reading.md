# Gap report: Analysis tab with a current reading (PR B)

Table: `docs/superpowers/design-tables/analysis-tab-reading.md`. Verified row by row against
`analysis-panel.tsx`, `analysis-empty.tsx`, `verdict-block.tsx`, `provenance-panel.tsx`,
`role-counter-strip.tsx`, `lean-line.tsx`, `declaration.tsx`, `globals.css` (`at-wave`),
`deck-analysis.ts` (`panel`), `builder-shell.tsx`, `use-deck-profile.ts`.

## Pass 1 summary

MATCH: tab body container (padding 18/24, 16/30, 32/40; gap 22/28); block order with and without a
reading (no Overview section, `SynopsisSlot` and `analyzeCost` gone, grid withheld in 2a–2c); top
grid (`minmax(0,2fr) minmax(0,1fr)`, gap 30, start; left column climb, gap 26; box in the right
column, first in DOM); empty-state section, Overview h3, composition row, ring (150px box, formula,
44px marks, aria-hidden, 0.3 failed, exemption recorded in the header comment), `at-wave` keyframes /
1.6s ease-in-out infinite / 0.16s stagger / reduced-motion full ink, text column, heading (sizes,
margins, aria-live + role=alert on failure), body paragraphs and margins, actions row, CTA (bone,
disabled `--elevated`/`--fg-faint`, aria-disabled, stretched on phone), accent opener (11px accent,
dotted accent underline on the words, 8px gap, 44px); bracket box chrome (surface, border, 11/12
radius, 15 / 18x20 padding, no label/control/pill); head row (gap 11/13, marks gap 6, 26/36, upper at
DIM_OPACITY 0.65, `/` mono 12 opacity 0.7 in lower ink); name (display 19/21, 700, 1.15, lower-rank
ink, gap 3 block); `analyzed {when}` (mono 10 faint, `18 Sep` en-US UTC); 2f answered reason margin
10/11; section hairlines for lean (13/11), ask/answer/version row (12/11, 13/12) and population
foot (12/10, 14/11); section order; lean label/body/names; ask prompt, chip name, desktop chip
padding/radius/22px mark; answer; version row (items-end gap 10, 24px marks, 8px captions gap 3,
arrow mono 13 pb 13, sentence); population foot; findings placement and its quiet opener (under the
box on the phone via `order`); mix inset (px-0, top rule, pt 14/20, head gap 8/12, last, all states);
settle announcement (once, loading → ready, sr-only `role=status`).

## Visual gaps

1. src/components/decks/verdict-block.tsx:169,187 — Reason (SubLine, 2e/2g/2h) — margin-top — design 12px / md 14px → impl 10px / md 12px (`mt-[10px] md:mt-3`).
2. src/components/decks/verdict-block.tsx:127,169,187 — Reason (all forms) — text-wrap — design `pretty` → impl none.
3. src/components/decks/lean-line.tsx:67 — Lean body — text-wrap — design `pretty` → impl none.
4. src/components/decks/lean-line.tsx:90 (copy `lean.open`, deck-analysis.ts:440) — `see the reasoning` opener, phone — trailing arrow — design `see the reasoning →` at 390 (conflict 5; HANDOFF §2 "every opener uses →") → impl no arrow at either width.
5. src/components/decks/declaration.tsx:270 — Ask chip mark, phone — size — design 26px → impl 24px (`px={24}`).
6. src/components/decks/declaration.tsx:268 — Ask chip, desktop — height — design 36px → impl 38px (`md:h-[38px]`).
7. src/components/decks/declaration.tsx:268 — Ask chip, phone — bordered outer radius — design 9px outer border around a 10px inner fill → impl a single element, border and fill at 10px (`rounded-[10px]`).

## State reachability gaps

- 2a idle — REACHABLE: `useDeckProfile` starts `{kind:"idle"}`; panel renders `AnalysisEmpty phase="idle"`.
- 2b loading, nothing held — REACHABLE: `request()` sets `loading` from idle/failed; ring animates, CTA aria-disabled.
- 2c failed, nothing held — REACHABLE: fetch error sets `failed`; ring 0.3, `Try again`, opener kept.
- 2e range, asked — REACHABLE: `ready` + two-member `permits` + no declaration → `declarationAsk` = ask; chips drawn.
- 2f range, answered — REACHABLE: `declaration.declared` inside the range → one mark, declared face, `permitsBelow` reason, answer line.
- 2g single + version row — REACHABLE: builder-shell passes `previous` from `previousVersion`; `versionComparison(...).changed` draws `VersionRow`.
- 2h single + lean — REACHABLE: `verdict.lean` on a single 3 or 4 → `LeanLine` slot.

None.

VERDICT: 7 visual gaps, 0 state gaps

## Resolution (author, after verify)

**Fixed:** visual gaps 1 to 6.

- The reason line is now 12 / 14px (the answered form stays 10 / 11), with `text-wrap: pretty` on every form of it and on the lean body.
- The lean's opener carries its `→` at both widths, since every opener on the tab carries one (HANDOFF §2).
- The ask chip is 36px tall on desktop.
- The phone chip's mark is 26px. A 26px full mark and a 22px chip mark cannot share one element, so each width mounts its own, the same pattern the climb's neighbour rungs use.

**Declined:** gap 7, the phone chip drawn as two nested boxes (a 9px-radius border around a 10px-radius fill). That is the canvas's way of drawing one chip. The shipped single bordered element renders the same chip, and a second box would only add an element for tests and probes to find.

**Deferred to `/copy-review`, not built here:** the handoff's lean conform, "a {A} + {B} two-card infinite combo". Written as drawn it reads "a Isochron Scepter + …" for any card whose name starts with a vowel. The handoff's "your tutors can find" would also undo Hugh's 2026-09-22 ruling that a land-only search is not a tutor, which the shipped "this deck can find" encodes. The audit sends both of these to `/copy-review` (findings 15 and 16).
