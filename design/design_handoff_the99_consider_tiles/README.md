# The 99 — Consider tiles and tab (design handoff, R1, H30)

**Source of truth:** `docs/superpowers/design-briefs/2026-10-02-consider-tiles-and-tab.md` (main).
Read with it: `suggestion-tile.tsx`, `card-tile-caption.tsx`, `consider-panel.tsx`,
`combo-clause.tsx`, `ownership-dot.tsx`, `add-surface-mark-key.tsx`, the theme hexes in
`globals.css`, `STATES-push-line.md` §C2, and the captions brief's rulings 1 and 2.

Files: `The 99 - Consider Tiles and Tab.dc.html` (canvas; Tweaks switch the six themes and the lift
ink), `ConsiderTile.dc.html` (the tile, both widths), `FactMark.dc.html` (the five shipped mark paths), `STATES-consider-tiles.md`,
`consider-tiles · copy strings.ts`, `READINESS.md` (parts, gaps, and what a green looks like).

**Status: LGTM (Hugh, 2026-10-03).**

**One line:** *the Consider tile becomes a caption tile with a body, and every shelf folds.*

## The calls

| # | Open item | Called |
|---|---|---|
| 1 | Caption | `CardTileCaption` **as is**. Meta line: dot, slot, marks. Name on one line (the two-line clamp goes). Body (Consider-only): secondary line, in-use line, evidence, lift, note, Add. |
| 2 | `$` tag | **Kept, as the figure alone.** The heading says "not owned"; it can't say the price, which is what a reader compares on that shelf. No live price: the collapsed `$`. |
| 3 | Marks + combo | **§C2 confirmed.** `∞` joins the fact marks on the meta line. The partner stays under the name as `+ {partner}`, in the type line's place. A bolt-and-combo card draws the bolt then the lemniscate on one line (shipped `CardFactMark` + `ComboGlyph` paths, 16px, `--fact`, drawn verbatim in `FactMark.dc.html`). |
| 4 | Lift ink | **`--fg-muted`, mono 10px**, every sign: 5.94–6.65:1. Quieter than the `--fg-body` figure by one ink step. |
| 5 | Shelf header | Plex Sans 17/600 (phone 16), `--fg`, sentence case, under a full-width rule. Count clause and `Show all N` stay on the line. |
| 6 | Collapse | Chevron + label + count = one disclosure. Folded: header alone, `Show all` hidden. Default all open. Fold persists per deck (reload, tab change); `Show all` does not. |
| 7 | Phone | **Keeps 2-up.** 173px is the caption's design width (ruling 3). |
| 8 | About entry | **Not drawn.** Cosmetic under the captions precedent. Hugh decides. |

## §C2 amendment (one line)

§C2 stands as written. What changes is `ComboClause`'s host rule ("a mark with a sentence leads
that sentence") **for the Consider tile only**: here the mark stays on the marks line and the
partner name rides the secondary line alone. The quick-add and top-off rows are unchanged.

## Ledger

1. `AddSurfaceMarkKey`'s combo sample is 12px because the clause led a mono line. On Consider the
   lemniscate is now 16px on the marks line. The key is shared with top-off (still 12px). Either
   a `size` prop on the key, or accept the 12px sample on Consider. Recommend the prop.
2. The `edhrec` label (9px `--fg-locked`) also fails 4.5:1. It is `aria-hidden` and out of this
   brief's scope; flagged, not changed.
3. Desktop grid stays `md:grid-cols-6`. The captions brief's `minmax(178px, 1fr)` floor would fix
   the 90px tiles at 768px, but it breaks the 6-tile cap's row. Not drawn; worth its own call.
4. Header's count clause moves `--fg-faint` → `--fg-muted` (faint is 3.81 on kamigawa), and
   `Show all` moves `--accent` → `--fg-body` (accent is 4.25–4.46 on phyrexia and kaldheim).

## Out of scope

Shelf contents and ranking, quick-add rows, top-off, the card note's content, all copy wording.
