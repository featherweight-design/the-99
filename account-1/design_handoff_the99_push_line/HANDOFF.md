# Handoff — the card note and the verdict (Round 4 of 5, R1)

**§4.1's premise is withdrawn** (Hugh, 2026-09-21): standing is determined only on **ask** or
**commit**. The round is two features. §5 stands unchanged.

## Locked

1. **The card note is a claim about a card**, never about the deck's standing. It draws on both add
   surfaces, always, with no analysis run.
2. **It needs no profile.** Declaration + card facts + a count of a kind in the current list. Never
   `buildDeckProfile`, never `bracketDelta`.
3. **Two registers.** Game Changer is stated flat (list membership); mass land denial and extra
   turns are **attributed** — *we read this as* — with the rules clause left flat.
4. **The bracket clause cites the DECLARED bracket.** Undeclared → no deck clause at all. **It
   never falls back to the last determined verdict.**
5. **No `--warning`, no `--danger`, no confidence figure** on a note that is *likely* by
   construction. `--fact` ink and body text.
6. **The note does not persist after the add.** Round 1's marks carry the card's facts on the
   decklist row.
7. **The verdict fires on analyse or commit, and nowhere else.** No per-add, no per-edit, no
   auto-run on tab open.
8. **One trigger, three weights, one position** — filled when there is no current answer, outlined
   when there is.
9. **The tab-label dot is the only cross-page signal.** No number, not a warning, clears on
   determination rather than on visit.
10. **Asked and committed read identically.** Only the provenance line and the staleness behaviour
    differ; a committed verdict never goes stale.
11. **The stale verdict stays on screen** — past tense, `out of date` tag, its own denominator, the
    changed cards listed, the control at filled accent. **Stale is not disabled.**
12. **Card notes and counted figures are never tagged stale.** Only determined things can be.
13. **Mobile and desktop ship together.** Marks 16px; controls 44px at 390.

## Geometry

| Part | Spec |
|---|---|
| **Note, desktop** | Inside the row's box, above a `1px --border` rule, `margin-top:9px; padding-top:9px`. Label mono 9px `--fg-muted` uppercase `.14em` — **never `--fg-disabled`**, which fails the text floor at this size. Body 12.5px `--fg-body`, line-height 1.6. |
| **Note, 390** | Identical type; the host row becomes the shipped 52px meta variant, note indented to the name column (`padding-left:27px`). |
| **Note, tile** | Tile foot above a `1px --border` rule. Label mono 9px, body 11.5px/1.45, two sentences max. |
| **Fact marks** | Five glyphs, **16×16**, bare, `--fact`, `filter: drop-shadow`. Row and prose: inline after the name. Tile: own line above the name, ownership dot leading. |
| **Bracket marks** | **From `design_handoff_the99_deck_analysis/assets/bracket-marks.html`, lifted verbatim — never redrawn.** Construction is **additive** (1 inner diamond · 2 adds the mid ring · 3 adds four cardinal ticks · 4 adds four studs · 5 joins the studs into a closed outer ring). Sanctioned sizes only: **full mark at 26 / 36 / 44, chip form at 22, numeral alone below 20**. The chip keeps **only the newest ornament** and is not cumulative. This round uses the **full mark at 26** in the verdict head. |
| **Trigger** | 36px filled `--accent` / 32px outlined `1px --border-strong`. Same position in every state, right end of the verdict block's head row. 44px at 390. |
| **Tab dot** | 6px `--accent`, `gap:7px` after the label. No ring, no count. |
| **Stale head** | Sentence and bracket mark at `opacity .55`; `out of date` tag mono 9.5px uppercase `--warning` on `1px --warning`, radius 999px (Round 0's tag, unchanged). Provenance mono 10px `--fg-faint`. |
| **Changed-cards list** | Below a `1px --border` rule. Mono 11px `--success` `+` / `--danger` `−`, name 12.5px, added names on the dotted card-open underline. |

## No new anything

No new token, no new hex, no new glyph, no modal, no toast, no confirm step. The note reuses the
push line's slot; the tag is Round 0's; the fact marks are Round 1's; **the bracket marks come
from Round 0's asset sheet verbatim**; the dot is the app's existing unseen-content dot.

## What a reviewer should push on first

- **The declared-bracket ruling.** It makes the note's most useful clause depend on Round 3
  shipping. The fallback is drawn (no deck clause) and is deliberately plain.
- **Auto-analyse on tab open.** If the run is genuinely free, it removes the stale state entirely —
  and removes the player's ability to compare a verdict against the edits made since.
- **Past tense on the stale verdict.** *Permitted* is the cheapest honest signal available; if it
  reads as too final, the tag alone has to carry the state.
