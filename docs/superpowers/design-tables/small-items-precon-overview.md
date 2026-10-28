# Design table: small items item 5, a precon's Overview carried into the deck

Source: `design/design_handoff_the99_small_items/README.md` §5, board `Precon-Overview.dc.html`,
`READINESS.md` item 5. Enumerated from the handoff ONLY, before reading the implementation.
Columns M = mobile 390, D = desktop 1300. "Verified" is filled in by the verify pass
(`docs/superpowers/gap-report-small-items-precon-overview.md`).

## 1 · Precon page (`/decks/precons/[file]`), the Overview block (`.pov`)

| # | Element | Property | M (390) | D (1300) | Source | Verified |
|---|---|---|---|---|---|---|
| P1 | Block placement | position in header | under the "You own" box, above the list-note line (`.ln`) | same; header has Start button in title row | README §5, board §1 || ✅ walk: between You own box and list-note line, both widths |
| P2 | Block | layout | flex column, gap 6px | same | `.pov` || ✅ gap 6px |
| P3 | Block | conditional | rendered only when the precon has an Overview; none = no block, no placeholder | same | README §5, board §1 sp || ✅ count 0 on WitherbloomWitchcraft_C21 |
| P4 | Block | controls | no credit, no write press | same | README §5 || ✅ |
| P5 | Label row (`.lh`) | layout | flex, align baseline, gap 10px, wrap | same | `.pov .lh` || ✅ aside dx 10px |
| P6 | Label | text / type | `Overview`; 500 10.5px IBM Plex Mono, letter-spacing .16em, uppercase, `--fg-faint` | same | `.lbl` || ✅ 10.5px/500/1.68px/uppercase, fg-faint |
| P7 | Aside | text | `written for this precon’s list` (curly apostrophe) | same | README §5, board || ✅ |
| P8 | Aside | type / color | 10.5px IBM Plex Mono, `--fg-faint`, not uppercase | same | `.pov .lh small` || ✅ |
| P9 | Paragraph (`.ovp`) | type | 14px, line-height 1.7, `--fg-body` | same | `.pov .ovp` || ✅ 14px/23.8px, fg-body |
| P10 | Paragraph | spacing | margin-top 2px | same | `.pov .ovp` || ✅ 2px |
| P11 | Paragraph | max width | none (column width) | 760px | `.dkm .pov .ovp` || ✅ none / 760px measured |
| P12 | Paragraph | content | the Overview's lead paragraph (same read the Analysis tab draws) | same | board header || ✅ |
| P13 | Link `View full overview →` | type / color | 500 13px IBM Plex Sans, `--accent-text`, inline-flex, center | same | `.pov .lk` || ✅ 13px/500 Plex Sans, accent-text |
| P14 | Link | hit height | min-height 44px | min-height 32px | `.ph .pov .lk`, `.pov .lk` || ✅ 44 / 32 measured |
| P15 | Link | behavior | opens the shipped Overview modal (Overview, Primer, Key cards, Weaknesses) | same | README §5 || ✅ dialog with Overview, Primer, Key cards, Weaknesses |
| P16 | Modal | aside line | `<precon name> · written for the precon list` | same | board frame 2 `.osh .as` || ✅ `Wretched Ranks · written for the precon list` (phone in body, desktop in header) |
| P17 | Modal | chrome | shipped `synopsis-body.tsx` in ModalChrome (sheet on phone) | shipped modal | board note "Unchanged" || ✅ ModalChrome (PreconSynopsisModal) |
| P18 | Rest of page | unchanged | tiles, list page, dock unchanged | same | board note "Unchanged" || ✅ |

## 2 · Deck started from a precon, Analysis tab

| # | Element | Property | M (390) | D (1300) | Source | Verified |
|---|---|---|---|---|---|---|
| S1 | Carry trigger | which starts carry | Start with this precon, with or without I own this precon; either edition (Collector's is the same list) | same | README §5, board note || ✅ code (`?from=precon` landing, I own path covered by same action); walk: plain start only |
| S2 | Carry exclusion | import matching a precon list | carries nothing | same | README §5 || ✅ code (carry keyed on `built_from_precon`) |
| S3 | Header bracket chip | timing | shows the bracket at once (first render), no press | same | README §5 || ✅ chip in the same frame as the deck page's tabs, both widths |
| S4 | Overview label row (`.ovx .lh`) | layout | flex baseline gap 10 wrap | same | `.ovx .lh` || ✅ |
| S5 | Overview aside | text | `from the precon list` | same | README §5 || ✅ |
| S6 | Overview aside | type | 10.5px IBM Plex Mono, `--fg-faint` | same | `.ovx .lh small` || ✅ 10.5px fg-faint |
| S7 | Overview | controls | no write control, nothing to press, nothing spent | same | README §5 || ✅ only `View full overview →` |
| S8 | Verdict date line (`.va2`) | text | `Analysis from the precon list · 27 Oct` (date = the precon read's date) | same | README §5 || ✅ `Analysis from the precon list · 28 Oct`; date = Overview created_at (d9 ruling) |
| S9 | Verdict date line | type | 10px IBM Plex Mono, `--fg-faint`, margin-top 2px | same | `.va2` || ✅ 10px Mono fg-faint |
| S10 | Verdict | content | the precon's bracket reading (copied) | same | README §5 || ✅ |

## 3 · First edit (stale) and after Re-analyze

| # | Element | Property | M (390) | D (1300) | Source | Verified |
|---|---|---|---|---|---|---|
| E1 | Staleness | rule | stale exactly as any deck's, by the same list key; no new rule | same | README §5 eng || ✅ code: same list key |
| E2 | Banner | component | shipped staleness banner with Re-analyze leads the tab | same (grid layout) | README §5, `.abn` || ✅ shipped banner + Re-analyze (whole deck); 98/99 shows shipped "needs a full deck" banner |
| E3 | Date line | text | `Analysis from the precon list · 27 Oct, before your changes` | same | README §5, board §3 || ✅ |
| E4 | Overview aside | text | `from the precon list, before your changes` | same | board §3 || ✅ |
| E5 | Overview | write control | none while stale; stays whole | same | README §5 || ✅ no write control seen |
| E6 | After Re-analyze, date line | text | shipped `analyzed 28 Oct`, precon wording gone | same | README §5 || ✅ code only (`analyzedLine`, versionNumber ≠ 0) |
| E7 | After Re-analyze, Overview | aside | none (precon wording gone) | same | board §3 frame 3 || ✅ code only (`carriedAside` null when stale && readingFresh) |
| E8 | After Re-analyze, Overview | notice | shipped `This overview was written before your latest changes.` + `Write a new overview` | same | README §5 || ⚠️ code only; shipped Re-analyze also writes the overview when a credit is free |
| E9 | Re-analyze | cost | costs what it costs today | same | README §5 || ✅ shipped (`1 credit` sub-line) |

## State coverage

| State | Expected | Reachable |
|---|---|---|
| Precon page with an Overview | `.pov` block: label, aside, paragraph, link → modal | REACHABLE (walked) |
| Precon page without one | no block, no placeholder | REACHABLE (walked) |
| Started deck, Overview carried | chip at once; aside `from the precon list`; date line `Analysis from the precon list · <date>` | REACHABLE (walked) |
| Started deck, no Overview | bracket reading still carried if stored; no Overview block (shipped empty state) | PARTIAL (code: reading-only carry when no current row; not walked) |
| First edit / stale | shipped banner; date line and aside gain `, before your changes`; no write control | REACHABLE (walked) |
| After Re-analyze | `analyzed <date>`; aside gone; shipped "written before your latest changes" + Write a new overview | PARTIAL (code; not pressed in walk) |

NOT A ROW: the Analysis tab's own Overview label (9.5px mobile / 10px desktop, .14em/.16em) and its `View full overview →` link (11px Mono, underlined) are the shipped `synopsis-overview.tsx` styles; the board redraws them as `.lbl` 10.5px and `.ovx .lk` 13px Sans. Recorded as SHIPPED in the gap report.
