# Readiness — Deck import (Moxfield) · #42 · R2 (post-audit)

**Verdict: 🟢 Green — ratified eng-side 2026-08-04.** The R2 audit ratified §A, §B and §C as drawn
and closed every blocker eng-side. **No redraw.** One string changed on the audit's finding (state 9)
and the notes took two corrections. The last open item — the completion reveal — was ruled by Hugh on
2026-08-04, as recorded below.

**Build order:** ungated as of 2026-08-05. This previously read "PRs 7–9 wait on #158's PR 6";
**#158 is now fully merged** (#169–#171, #173, #175, #180, close-out #186), so `quick-add-bar.tsx`
exists and all nine PRs can run in sequence. Launch gating is separate and deliberate:
`/decks/import` ships unlinked in PR 4 and becomes reachable from `/decks` in PR 6.

**Two product calls ruled 2026-08-05** and recorded in
`docs/superpowers/plans/2026-08-05-deck-import-briefing.md`: a deck with unresolved rows carries a
count **badge on its `DeckCard`** so the state has a home outside the builder (no new `statusPill`
value), and the import route is gated by the **absence of a link**, not a flag.

## Closed at the audit

1. **The completion reveal.** Confirmed: `shouldCelebrate()` is `status === "Complete" &&
   !alreadyCelebrated`, so a clean 99-line import does fire it. **Ruled 2026-08-04 (Hugh): adopt the
   recommendation** — suppress the reveal when the first render follows an import, and let it fire the
   first time the player adds a card themselves. Drawn as-is with the collision flagged on the canvas;
   the suppression is a guard on `shouldCelebrate()`, no pixel moves.
2. **Failures 9 and 10.** Not a blocker, and R1's premise was inverted. `parsePasteList`
   (`paste.ts:38-40`) falls through to `quantity = 1` for any non-blank line, so gibberish yields
   rows that fail at **match**, not zero rows. No parser change. Rule: *zero rows after parse →
   state 10; rows parsed with zero matched → state 9.* Both buildable today.
3. **The three #158 calls are ratified** — row-scoped expander over the global bar, owned-only
   overridden off (matching runs against Scryfall, not the collection), unresolved rows outside both
   counts.
4. **Consider double-count** accepted with the drawn mitigation — none. Visible, not silent, and
   resolution or deletion clears it.
5. **Gap 11 closed** — the owned-default flip to `true` was ruled 2026-08-04, so §B stays an
   override and the caption clause keeps its point.

## Changed after the audit

- **State 9's copy.** It was written as a parse failure; every line actually parses and none match.
  Now *We couldn't find any of these cards · All 14 lines read fine — none of them matched a card we
  know.* Same container, same way out, paste still preserved. Copy key renamed `unparseable` →
  `noneMatched`, and its two body strings take a line count. This also puts 9 in the **match**-failure
  family that `/collection/replace` and the Issue Inspector already own — the same family as an
  unresolved row, one step earlier.
- **`chip-row.tsx` path corrected** to `src/components/collection/chip-row.tsx`.
- **Sequencing recorded:** states 13+ mount inside #158's PRs 4–6, so #42 cannot start building until
  PR 6 merges.

## Still open

*(None blocking. Each is a small eng call carried into the plan.)*

- **Undo window** unspecified (gap 4) — drawn as persisting until the next action on the group.
- **Owned-toggle override per row or per session** (gap 10) — drawn per row.
- **No design-table rows** for the unresolved row, the group header, the mode chip row, the failure
  banner or the resolution expander (gap 5); #158's own table diff should absorb this.
- **#59 richness collision** (gap 7) — row plate fill, group header rule, `buy` tag geometry, the
  banner's `--elevated-hover`.
- **The `Complete` block may be unreachable** (gap 2) — implement it anyway; document why both the
  arithmetic and the guard exist.

## Settled

- Nineteen states at both breakpoints. One resolution construct at both widths — #158's parity
  constraint, met structurally.
- No new tokens, no new dependencies, no new dialog, no new focus trap, no virtualisation.
- Retry appears exactly once across seven failures, and only where retrying is the advice.
- Colour identity and owned-only both off in the resolution scope, argued, captioned, and scoped so
  the global bar's setting survives.
- Every failure is programmatically associated with its field; no state is carried by colour alone.
- Two live regions across the whole flow. Phone targets clear 44px; every field is 16px on mobile.
