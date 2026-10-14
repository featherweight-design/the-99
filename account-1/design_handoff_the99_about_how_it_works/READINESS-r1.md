# READINESS — About, how it works (R1)

**Self-assessed: 🟡 amber.** The layout and the system are ready for audit. One locked rule cannot be met
as written (open 1), and it needs a ruling before build.

Canvas: `The 99 - About How It Works (R1).dc.html`. Strings: `how-it-works · copy strings.ts`.
States: `STATES-how-it-works-r1.md`.

## About the design files

The canvas is a design reference in HTML, not code to ship. Rebuild it in `about-page.tsx` with the app's
primitives. Fidelity is **high** for the appendix, the key, the tag, the rows, the link line and the
contents group. The page chrome, the rail, the index and the figures are R6's, drawn as scaffolding.

## What ships

| Piece | Where | Built from |
|---|---|---|
| Appendix `section#how-it-works` | `about-page.tsx`, after the `CHAPTERS` map | Chapter `section` classes, `h2` with no numeral |
| Method key | Inside the appendix, under `sub` | R6 index box vocabulary, `--fg-faint` heading |
| `MethodTag` | New, in `ui/` | It is reused later in `provenance-panel.tsx`'s `dt` |
| `HowRow` | New, in `components/about/` | `ProvenanceSheet`'s `dl` row, with labels added |
| Entry link line | `Entry`, after the keys `ol` | `ProvenanceOpener` in its quiet tone, `↓` for `→` |
| Contents group | `ContentsRailR6` / `ContentsListR6` | Entry-row type, after a hairline |
| Search | Same field | Matches row titles too, so the denominator grows by 8 |

## Measurements

- **Appendix.** `mt-28`, 1px `--border` top, `pt-18`. `h2` is `font-display` 21/700 (16 on a phone), the theme's display face (Amonkhet, the default, is Cinzel) with **no
  numeral**. The sub is 13 `--fg-muted`, 4px under the heading.
- **Key.** `--surface`, 1px `--border-strong`, radius 10, padding 12/16/14 (12/14 on a phone), 14px under
  the sub.
  - Heading: mono 11/500, tracking .08em, `--fg-faint`.
  - Items: a 2-column grid with 8/24 gaps, one column on a phone. Each item has a `--border` hairline
    above it, then the tag in a fixed 100px column (the width of `model-written`), then the short
    definition, so every definition starts on the same line in both columns.
- **MethodTag.** Plex Mono 10 (10.5 in the long-form key), line-height 1, padding 3/6, radius 4, 1px
  `--border-strong`, `--fg-muted`, no fill, nowrap, 5px apart. All four are identical.
- **Row, closed.**
  - Container: a `--border` hairline above, 16px under the key.
  - Head: one `button[aria-expanded]` of at least 44px (52px or more on a phone), padding 6/10, radius 6,
    spilling 10px into the gutter (8px on a phone).
  - Content: an `h3` in Plex Sans 14/600 `--fg` (14.5 on a phone), then the tags. On desktop the verdict
    is right-aligned in mono 10.5 `--fg-faint` with a ▾/▴ at mono 10. On a phone the verdict follows the
    tags.
- **Row, open.**
  - Desktop: a `dl` grid `128px minmax(0,1fr)`, gaps 9/16, 14px padding at the foot.
  - Labels: `dt` in mono 10.5 `--fg-faint`, padding-top 2.
  - Values: `dd` at 13/1.55 `--fg-body`.
  - Phone: each label sits over its sentence, 3px apart and 12px between fields, and the sentence is
    13.5.
  - Brackets' sub-rows: a `--border` hairline, the label 12.5/600 `--fg`, then its sentence.
  - `explained in` links: 13 accent, wrapping 4/14. On a phone they are 44px rows.
- **Entry link line.** 10px under the keys. Mono 10.5 `--fg-faint`, a dotted `--border-dashed` underline
  on the words, then `↓`. It is at least 44px tall on a phone and 0 from `md`, as `ProvenanceOpener`.
- **Contents group.** In the rail: 8px under 04, a 1px `--border` top, then the group row (13px, with no
  numeral and no count), then eight rows in entry-row type. On a phone it is a fifth row at 44px:
  `How the app reaches its answers`, `8 rows`, then the disclosure.

## Behaviour

1. **Rows start closed.** A press toggles the row. There is no single-open rule, and a row stays open for
   the visit.
2. **The hash opens the row.** `#how-roles` opens the row **before** the scroll, so the landing measures
   the open height. The landing is R6 §P1's: 20px from the top, the head row washed `--elevated`, and
   focus on the `h3` (`tabindex=-1`). The wash clears when the row leaves the upper 30% band. Back
   returns to the entry.
3. **Entry link.** `href="#how-{row}"` from `entryRow`. It is a plain hash link, and an entry with no key
   draws nothing.
4. **Search** matches row titles. A match opens the appendix group on a phone, as a chapter match does.

## Copy

All of it is in `how-it-works · copy strings.ts`. Figures that live in code are templated from their
constants, never typed (the same rule as `deckAnalysisCopy.detection`). `pageIntro` gains one clause. The
strings go through /copy-review, and ride the next batched `ABOUT_VERSION` bump (brief §3).

## Open

1. **Two answers fit none of the four methods. This needs a ruling.**
   - The brief locks four methods and says every row names one or more. **Game Changers**, whose source is
     Wizards' list read through Scryfall, and **Prices**, from ManaPool's feed, are neither rules text,
     other players' decks, model-written, nor your input. Each is someone else's published list.
   - R1 draws both untagged, with the gap marked in canvas ink.
   - Option A: a fifth method, `published list`, which adds a tag in two places and changes nothing else.
   - Option B: they stay untagged, and the `comes from` line names the list.
   - Design leans A. B makes absence a signal, and an absent mark reads as an unknown source.
2. **Tutors' line waits on engineering** (brief §5.5). The sub-row is drawn as `Not measured yet.`, which
   is a placeholder and not a string to ship.
3. **The Game Changer sentence in the sheet** (`deck-analysis.ts:539`, brief §5.1) is untouched in §1b.
   The appendix's own `comes from` line already names Scryfall.
4. **Written text has no `explained in` entry.** The Analysis launch entries (R6 open 2) should key to
   `how-written`.
5. **Whether the batched bump's sheet mentions the appendix.** The rows are not entries, so by R6's rules
   the sheet does not list them. Announcing it once would need an entry, and that is Hugh's call.
