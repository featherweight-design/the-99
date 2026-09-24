# Gap report: Deck Tuning D2 (header intent line, Games pointer)

The design-review pass for PR D2, run against `docs/superpowers/design-tables/deck-tuning-d2.md`
(Agent 1 enumerated it from the handoff alone). Agent 2 verified the table and Agent 3 confirmed the fixes.

**Verdict: 0 gaps remain.** Four were fixed and three were decided. All seven are listed below.

## Visual

| # | Gap | Resolution |
|---|---|---|
| 1 | Phone: the gap from the name to the intent line was 11px, not 5px. The header column already spaces its rows 6px apart, and the line added its own `mt-[5px]`. | FIXED. The line and its edit form take `-mt-px` on the phone. `probe:intent-line` now asserts 4px at 1300 and 5px at 390 (±1). Restoring `mt-[5px]` reads 10px and fails. |
| 2 | Desktop: the commander line sits 3px under the intent, not V2's 6px. | DECIDED, not changed. The 3px is the shipped header's own `marginTop`, from before this PR, and it applies to every deck, with or without a line. V2 marks it "(unchanged)", so the canvas assumed 6px where the code has 3px. Changing it would respace every deck header for a cosmetic difference D2 did not introduce. |
| 3 | The seeded row's gap is 8px, where OC's pre-r3 frame drew 10px. | DECIDED: 8px. By the precedence rule r3 governs this line's geometry, and V2 puts the seeded state "on this same line" (V2:165), whose gap is 8px. |
| 4 | The seeded disc was a local copy of OC's disc, not "the shipped 18px provenance disc". | FIXED. The fill ledger's disc is extracted as `ProvenanceDisc` (`src/components/ui/provenance-disc.tsx`) and both uses render it. The ledger's values are unchanged. The seeded use carries `seededAria`. |

## State reachability

| # | Gap | Resolution |
|---|---|---|
| 1 | Games pointer, "no reading": the pointer keys on the header chip's stored permits (`tuned = headerBracket !== null`), not on whether a readable reading exists. The two differ only for an older `PROFILE_VERSION` row on a dirty or illegal deck. There, permits still read but `readStoredReading` returns null. | DECIDED. That row is transient: the next Analyze replaces it. The pointer then lands on the Analysis tab's own Analyze state, which is where the reader has to go anyway. Reading the whole stored reading on every deck page load, just to tell those two apart, costs more than the case. |
| 2 | The header line held its first props, so a save through the Suggested changes ask left the header blank until a reload. Likewise the panel held its first intent, so a header save left the ask showing. | FIXED. Both adopt a changed prop during render. Tests cover both, and removing either sync fails its test. |
| 3 | The header's own save announced nothing. | FIXED. An `sr-only` `role="status"` region announces `announce.intentSaved`, and stays mounted when a save empties the line. Removing the announcement fails two tests. |

## Undrawn: implementation choices

- **Where the header's `edit` opens:** in place, replacing the line. It is a sunken field with a dashed `--border-strong` border, 44px on a phone and 36px from `md`, with 16px text on a phone so iOS Safari does not zoom. It has Save and Cancel. Escape also cancels; Cancel exists because a phone has no Escape key.
- **`edit` tap target:** a `-inset-[14px]` pseudo-element around the 10px label. Hover moves the label to `--fg-muted`.
- **`flex-wrap`:** set on the intent row at both widths, so a long line wraps and is never truncated.
- **On the phone the line sits on the deck's art** and takes `COVER_INK_SHADOW`, like the name above it.
- **The Games link** underlines on hover.
- **`readBackTuned`:** it keeps the shipped read-back's desktop-only placement.

## Copy, for /copy-review

The following are routed to `/copy-review` and are not gaps:
- `announce.intentSaved` differs from the canvas wording.
- `intent.seededAria`.
- `intent.seededBrief` and `intent.seededBriefShort`.
- `intent.cancel`, a control no frame draws.
- `note.readBackTuned`.
