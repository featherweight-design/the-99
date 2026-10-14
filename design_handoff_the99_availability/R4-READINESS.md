# READINESS — Card availability (#43), R4 ratification

**Verdict: 🟡 Yellow, on a missing input — not on a design question.** Ten of the sixteen things
asked for are answered and drawn. Six are held because the document that states them is not in this
tree. **Nothing here blocks a build; #43's code is done.**

R1/R2/R3 canvases are unchanged. This pass redraws nothing and edits no copy file.

## Blocking — needs a file, not a decision

### `ADDENDUM-2-READINESS.md` is not in this project
No file by that name, and no section called *Resolved engineering-side — Design to ratify, not to
redraw* anywhere in the tree. Present: `README.md`, `READINESS.md`, `ADDENDUM-README.md`,
`ADDENDUM-READINESS.md`, `ADDENDUM-2-README.md`.

**Held: items 1, 3, 4, 5, 6, 10.** The brief names them by number and states what was taken for
only a subset. Ratifying a number I can't read is a rubber stamp.

*Needs: the file pasted or dropped into this folder. All six then land in one pass — none of them
looks likely to disturb what is answered, so this is a Yellow of provenance, the same shape as R1's
item 1.*

## Answered and drawn

| Ask | Answer |
|---|---|
| **Item 8** — `0 free` → `none free`, over clause on `also in` | **Ratified, both halves.** Five strings sweep together; `hard` deliberately keeps plain `in` — `also` is only true when you're standing in a deck. |
| **Item 9** — `cards scanned` as the header noun | **Ratified as taken.** No sweep needed. |
| **Item 2's shape**, restated | The count-only variant is **part of the state**, not a fallback: every state that names a deck ships a sibling that doesn't. |
| **The missing `overAria` key** | **`overAriaCountOnly(shortBy)`** — new, named to match item 2's suffix. Degraded-read matrix in the README says which key fires for each read. |
| **Item 11** — five pips overrun the row track | **Drawn: the track holds, the pips shingle.** 45% overlap from 4 pips up (`margin-left: -5px`, both widths), z descending, ring in the row's own background token. 1–3 pips ship pixel-identical. |
| **Placement — §3.1 vs. the shipped row** | **Build accepted; §3.1 is the stale half.** Amend the placement sentence, keep its hard constraints. Marker `flex: none`, name truncates, marker before the buy tag. |
| **#242 — table 15.10** | **Amend to `listbox` + `aria-multiselectable`.** The table's "checkbox" was shorthand for multi-select; name the behaviour, not the widget. Nothing on screen changes. |

## Non-blocking, but worth a look

- **The hard glyph is `--accent` in all six themes** — `#FF4D9A` on Neon Rain. The marker inherits
  each theme's loudest colour, which is correct on Gilded Stone and worth eyeballing on Kamigawa
  and Duskmourn, where accent is also the primary-action colour. Check on a real row before beta.
- **Item 11's shingle is drawn, not implemented against source.** `src/` in this project still
  holds only `components/shell/nav.tsx`, so the pip element's current markup is inferred from the
  collection handoff's row spec. The arithmetic is width-only and holds regardless, but somebody
  should confirm the pips are a flex row of fixed-size spans and not a background sprite.
- **`hardMulti` is still specified and undrawn** — unchanged from R1, and the sweep now touches its
  string (`none free — across 3 decks`) without any state exercising it.
- **Gap §2 is still open.** Deck names have no length budget; `none free — in Atraxa` fits, a
  38-character deck name doesn't. Item 11 solves the *pip* overflow permanently because five is a
  ceiling — deck names have no ceiling, which is exactly why that one is still a product call.
- **The frozen record can't enforce the vocabulary rule.** The "swap every string at once"
  paragraph lives only in this folder's copy file. If the shipped file doesn't carry it, the next
  sweep will be four edits again.

## Unchanged and still verified

Silence end to end · nothing blocked · nothing asserting physical location · one status vocabulary ·
AA without colour · zero net motion · no new dependency · no new tokens, no new hues · no grid
changes (item 11 included — the shingle takes no width the row didn't already have).

R2's decision 5 and R3's self-exclusion rule stand as written; neither is reopened here.

## What would make this green

The file. Items 1, 3, 4, 5, 6 and 10 read and ratified — then #43 closes.
