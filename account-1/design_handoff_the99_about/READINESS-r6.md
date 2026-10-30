# READINESS — about page (R6): how a returning reader learns what's new

**Self-assessed: 🟢 green.** It is one open measurement away from final, and that measurement is
engineering's (§7), not Design's.

Brief: `docs/superpowers/design-briefs/2026-09-25-about-rethink.md` (branch `docs/about-rethink`, PR #957).
Canvas: `The 99 - About Page (R6).dc.html`. Contract: `STATES-about-r6.md`.

## About the design files

The canvas is a **design reference in HTML**, not code to ship. Rebuild it in the app's stack
(Next.js, Tailwind utilities, the `ui/` primitives) using the components named below. Fidelity is
**high** for the sheet, the index, the jump mark, the contents and the search: exact tokens, sizes and
copy. The deck tiles under the sheet and the figures on the page are **scaffolding**: the tiles
stand in for `/decks`, and the figures are as drawn in R4 §3 and as built.

## What ships

| Piece | Where | Built from |
|---|---|---|
| **Sheet**: a non-modal notice card | Shell, over any route except `/about` and the gate's exempt routes | New component. It shares `Sheet`'s box vocabulary but **not** `Sheet`, which is modal (N4–N5 explain why) |
| **Index** | `about-page.tsx`, after the lede | New `nav`, which replaces the eyebrow |
| **Jump mark** | `about-page.tsx` `Entry`, client state | Observer band from `useCurrentChapter` |
| **Entry-level contents** | `contents-rail.tsx` `ContentsRail` / `ContentsList` | Extends both. `aria-current` moves to the entry |
| **Search** | Both contents placements | `SearchField` (`ui/text-field.tsx`) |
| **New entry marks** | `Entry` title line | Pill moves before the title, and a 2px accent top rule is added (§P0) |

**Retires:** `dismissAbout`, the rail's dismiss form, the phone's pinned bar and its 67px spacer,
the eyebrow, `safeNext` on this page, and the `next` handling. **Kept:** the NEW pill (moved), the
chapter `N new`, and every entry, figure and anchor.

## Measurements

**Sheet, wide.** 340px wide, `left: 62px rail + 20px`, `bottom: 20px`. `--surface-rail`, 1px
`--border-strong`, radius 14, `0 20px 50px rgba(0,0,0,.5)`, padding 16/18/14.
- Head row: a 28px tile (radius 8, `--accent` at 16% fill and 45% hairline) holding a 9px solid
  `--accent` diamond, then a 10px gap, then `h2` Cinzel 17/700 `--fg`.
- Titles: Plex Sans 13.5/1.4 `--fg-body`, padding 8px 0, 1px `--border` above each.
- Buttons: `PrimaryButton` `Show me` and `GhostButton` `Later`, 36px tall, 18px side padding, 13px
  text, 8px gap.
- Foot: Plex Mono 10.5 `--fg-faint`, 10px above.

**Sheet, phone.** `left/right: 12px`, `bottom: calc(var(--tabbar-h) + 10px)`. Title text is 14px.
The buttons split the row at 44px. While the card is open the page reserves its height at the foot.

**Index.**
- Box: `--surface`, 1px `--border-strong`, radius 10, padding 14/16/4 (12/14/2 on a phone), 22px
  under the lede.
- Heading: `h2` Plex Mono 11/500, tracking .08em, `--accent`.
- Rows: 40px on desktop, with the title (14.5/500 `--fg`) and route (mono 11.5 `--accent`) on one
  baseline, 12px apart. On a phone they stack at 48px or more. A `--border` hairline sits above each
  row. The whole row is one link.

**Jump mark.**
- Fill: the title line only takes `--elevated`, radius 6, spilling 10px into the gutter (8px on a
  phone).
- Landing: the entry lands 20px from the top, and focus moves to the `h3` (`tabindex=-1`).

**New entry.** The pill goes before the title: mono 10/600, tracking .08em, padding 2px 7px,
radius 4, `--accent` on `--bg`, 8px gap. The entry's top rule is 2px `--accent`. On a phone that rule
is drawn on new entries only, with 12px under it.

**Rail.** 216px, sticky at 24px, and fills the viewport height.
- `Contents` label: mono 10.5, tracking .12em.
- Search field: 34px, 10px under the label, and never scrolls.
- List: 10px under the field, scrolls on its own (`overflow-y:auto`, thin scrollbar), 8px between
  chapters.
- Chapter rows: 13px, padding 7/10, radius 6.
- Entry rows: 12.5/1.35, padding 4/10/4/30, radius 6, **wrapping**.
- Current row: `--elevated` fill and `--fg` text.
- Marks: `new` is mono 10 `--accent`.

**Phone list.** Search field 44px. Chapter rows are 44px, with the title as a link (`--accent` 14px)
and a trailing 44px disclosure button (mono 11, with ▾ or ▴). Entry rows are 44px minimum, 13.5
`--fg-body`, indented 26px.

**Search.** `SearchField` in its focused state: `--accent` border plus a 3px accent ring at 16%.
- Trailing slot: `m of 39` (mono 10) and a 22px ✕ (32px on a phone) on `--surface-raised`.
- Results: the non-matching part of a title is `--fg-faint`, and the matched run is `--fg`/600.
- Empty state: 13px `--fg-muted`, then a mono 10.5 note, then `Clear search` in accent.

Tokens are per theme, from `globals.css`. The canvas carries all six blocks, switchable with the
`theme` prop.

## Behaviour

Everything is in `STATES-about-r6.md`, with state tables §N (sheet), §O (index), §P (jump), §Q
(contents) and §R (search). The key moves:
1. **Sheet appears once** per browser per version. It persists through client navigation until
   answered.
   - **Show me** goes to `/about`.
   - **Later** and **Escape** close it and write nothing.
2. **`/about`** builds the index from the pre-visit `seen`, then calls `markAboutSeen`.
3. **Pressing an index or search row** does a hash navigation. The wash holds while the entry is in
   the upper 30% band, and Back returns with any query intact.
4. **Search** filters the list only. Enter jumps to the first match, ↓ enters the list, Escape clears.
   The count is a polite live region.

## Copy

`STATES-about-r6.md` §R8 lists every string: new ones, moved ones and retired ones. It goes into
`src/lib/copy/about.ts`. The index heading reuses `newSinceEyebrow`.

## State

- **Server:** `seen`, read before the write. It gives `behind`, the new list and the index.
- **Shell:** "behind and not shown for N", from the proxy's existing read. It adds no new DB read
  per navigation (§7).
- **Client:** `query`, `openChapters` (phone), `jumpedId`, and `currentId` (observer).

## Open

1. **Rail length.** 39 wrapping rows are drawn from the brief's projection. If the measurement shows
   less than about 60% of the list visible at 1300×820, the rail opens only the current chapter.
   That collapses the list, not the page, and is still inside ruling 4.
2. **Analysis launch.** Its two entries are titled in that round. On version 9 the sheet lists both.
3. **About entry for this change.** Per §8 this is Hugh's call. The brief argues for editing an
   existing entry rather than adding one.
