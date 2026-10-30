# STATES — /about, R4 additions

`STATES-about.md`, `-r2.md` and `-r3.md` still govern. This file records what R4 changes and
**supersedes them where they disagree** — specifically §E2's import doors, §E5's hexes, and the
`Put back` row of R3's entry table.

## §J The three corrected figures

| # | Surface | Draws | Must not |
|---|---|---|---|
| J1 | Deck import (`/decks/import`) | Two doors: `Paste a list` (active) and `Upload a file`, over a pasted-list field; phone line `Paste it or drop a file` | Draw a third door. Show a URL field. Say "Moxfield link" anywhere — that mode does not exist and is not being built (#282) |
| J2 | Undo a removal (`/decks`, deck page) | `Rhystic Study removed` + `Undo` | Wear the review screen's `Put back` button. Strike through the card name. Invent a count line |
| J3 | Export dialog | Tabs `Decklist` / `Shopping list`; primary `Copy to clipboard`; secondary `Download .txt`; `Buy these at Mana Pool ↗` | Draw "The list", "Shopping", "Copy shopping list", or a bare `.txt` |

**J2's second door** is named in the caption, not drawn: the review screen carries the same undo on
a cut row where it reads `Put back`. One entry, one specimen, both doors stated.

## §K Entry 33 — the post-import summary

| # | State | Draws | Must not |
|---|---|---|---|
| K1 | The entry | Chapter 01, immediately after `Import a collection`. Plate, three key lines, `since: 1` | Sit in chapter 03. It is the consequence of an import, not a deck feature |
| K2 | The figure | Before/after collection counts, the no-longer-owned figure, one row per affected deck carrying the mark it gained or lost, and a count of unaffected decks | List unaffected decks. Use a mark that is not the app's own availability mark. **Put any diamond on a `freed up` row** — free carries nothing anywhere in the app, so a mark there would be `none free` on a row saying the opposite |
| K3 | The claim | "No deck is edited" — a deck keeps every card; what changes is whether you own it | Imply an import rewrote a decklist |
| K4 | Phone | Header figures wrap to two lines; deck rows keep their mark and their clause | Drop the unaffected count |

## §L The hexes, closed

Per-theme, from `globals.css`. `--avail-soft: var(--fg-muted)` and `--avail-hard: var(--accent)`
in every block; `--avail-over-border: #752619` is the one constant.

| Theme | `--avail-hard-fg` | `--avail-over-fg` |
|---|---|---|
| amonkhet | `#D9975C` | `#C46857` |
| kamigawa | `#DF8AA7` | `#C26755` |
| ixalan | `#ABCB5B` | `#C56A58` |
| phyrexia | `#77A9A0` | `#BE6453` |
| eldraine | `#B795EA` | `#C56A58` |
| kaldheim | `#80ABEF` | `#C86D5B` |

R3 applied Amonkhet's pair to all six. **No structural change** — every diamond already read the
token; only five themes' values moved.

## §M What R4 does not touch

The grammar (§A–§B), the mark, the dismiss, the menu row, the gate, the index, the template
artboard's fields, the phone reductions in `-r3.md` §I, and the 32 entries R3 drew apart from the
three figures above. **The rule (§5 of the audit) is still Product's and still open.**
