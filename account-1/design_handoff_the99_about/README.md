# About The 99 — R6 (current)

**R6 replaces the redirect.** A reader who is behind gets a one-time, non-modal sheet over the route
they opened. `/about` opens on a what's-new index. The contents lists all 39 entries under a title
search that filters the list and never the page.

| File | What it is |
|---|---|
| `The 99 - About Page (R6).dc.html` | **The deliverable.** §1 the sheet (one new, many, first run), §2 the index and the page without it, §3 the jumped-to entry, §4 the contents and search (matches, none, pressed). Frames are 1300×820 and 390×844, with a `theme` prop. |
| `READINESS-r6.md` | **Start here.** What ships, measurements, behaviour, state, and what is still open. |
| `STATES-about-r6.md` | The state tables §N–§R, the rulings it overturns and keeps (§R7), and the copy (§R8). Supersedes earlier STATES files where they disagree. |

Everything below is R4, kept as the record. The figures and the entry grammar still govern.

---

# About The 99 — R4

R3's three unscreenshotted figures were all wrong, as R3 predicted. **R4 corrects them, pastes the
six per-theme `--avail-*` blocks, and adds entry 33 — the post-import summary — drawn on §8's own
template.** The specimen grammar is unchanged and every locked decision from R1 and R2 holds.

**Deliverable:** `The 99 - About Page (R4).dc.html` (canvas, six-theme `theme` prop).
R1–R3 are kept for the audit trail and are superseded.

| File | What it is |
|---|---|
| `The 99 - About Page (R4).dc.html` | **The deliverable.** Grammar and annotation key (§1), the mark (§2), **the page at desktop — four chapters, thirty-three figures (§3)**, the behind and current readers (§4), phone (§5), account menu (§6), the contract (§7), the blank per-entry template (§8). |
| `about · copy strings.ts` | 33 entries in canvas order. R4 adds `post-import`, corrects `deck-import` and `export` against source, retitles `put-back` → `undo-removal`. Source citations are inline comments. |
| `READINESS-r4.md` | This round: the three corrections, why the deck page won the Put back call, and the one thing still unverified. |
| `STATES-about-r4.md` | The states R4 changes. Supersedes the earlier STATES files where they disagree. |
| `READINESS-r4-audit.md` | The audit this round answers. |
| Earlier rounds | `The 99 - About Page (R1/R2/R3).dc.html`, `READINESS.md`, `READINESS-r2.md`, `READINESS-r3.md`, `READINESS-r3-audit.md`, `STATES-about.md`, `STATES-about-r2.md`, `STATES-about-r3.md`. |

---

## R4's three corrections

**Deck import — no link mode.** The figure promised "A Moxfield link, a pasted list or a file".
`copy/deck-import.ts:26-30` says that mode "does not exist and is not being built (#282)". The
doors are **Paste a list** and **Upload a file**; the caption now says there is no link mode
outright. Import still *reads* a Moxfield CSV export — that claim belongs to the collection entry,
where it was already correct.

**Export — real tabs, real button.** **Decklist** / **Shopping list**, primary **Copy to
clipboard** swapping to **Copied ✓** for 1.5s, secondary **Download .txt**. `Buy these at Mana
Pool` was right.

**Undoing a removal — one surface, chosen.** R3 drew the deck page's tile wearing the review
screen's button over an invented line. **The deck page wins:** it is where a removal happens, it
needs no explanation of what a review screen is, and as an inset it has no key lines to spend on a
second surface. `Rhystic Study removed` + `Undo`, retitled from `Put back` — titling an entry with
a button from a surface it does not draw is how the error happened. The review screen's `Put back`
is named in the caption.

## Entry 33 — and the template's first real use

The **post-import summary** (#639, #643) shipped while R3 was being drawn. It is now chapter 01's
eighth entry, immediately after `Import a collection`, because it is the consequence of an import
rather than a deck feature. Plate, three key lines, `since: 1`.

It was drawn from the template artboard's fields in order and §8's worked example is now this
entry. **It touched two places: the entry and chapter 01's count.** That is the template working —
and the second demonstration in two rounds of why the rule matters.

⚠ **Its strings are fixtures.** `ImportSummary`'s vocabulary has not been read from source; the
structure is the entry's subject and holds. One pass against `copy/collection-replace.ts` closes
it. See `READINESS-r4.md`.

## The hexes, closed

All six per-theme blocks pasted from `globals.css`. No structural change — every diamond already
read the token, so this was five value swaps. `--avail-over-border: #752619` is the one constant.

---

## R3's five corrections, for the record

**Fit denominator.** `41/65` was impossible — `measurableTotalFor` returns 40 or 100 and nothing
between. The degraded specimen now reads `27/40`, and the lane caption says the denominator drops
to 40 rather than "says so".

**Status plate.** The fourth column was a JSDoc table written for engineers, and `Nothing in it
yet` is not in the tree. The specimen now draws what the app draws — badge, bar, **one figure, no
sentence** (`created today`, `87 of 99`, `5 over`, `2 lines unresolved`, `3 to buy · $12.40`,
`99 of 99`). The explanations moved into four key lines, which say in the caption that they are
this page's prose and not the product's.

**Availability has four states.** `soft` — `1 in a brew` — is drawn, and it is numeral 2 of 4,
between free and committed. The not-owned row keeps its place and loses its numeral, so the figure
stays inside the four-annotation ceiling. Desktop and phone both.

**Tokens.** `--avail-soft: var(--fg-muted)` ✓, `--avail-hard: var(--accent)` with
`--avail-hard-fg`, and a per-theme over pair — applied everywhere a diamond is drawn, including
the §2 legend and the decklist tiles.

**Roles.** `Ramp / Card draw / Removal / Board wipes` at `10 / 10 / 8 / 3`. `Lands` is gone from
both role figures; `Draw` is now `Card draw`.

## The eight new entries

Thirty-two total — **16 insets, 16 plates** — across chapters of 7 / 6 / 10 / 9.

**01** Browse what you own (plate) — search, filters, grid-or-rows, and that the view is remembered.
**03** The deck page (plate), first in its chapter, so the marks entry has something to be about ·
Bring a deck over, or update one (inset) · Put back (inset) · Take the list somewhere else (plate),
covering export and the Mana Pool link-out.
**04** Which deck gets a shared copy (inset) · Cards you are proxying (inset) · Themes (plate).

Reservations and proxies ship as `since: 1` per Product's overrule, so **the version-2 artboard in
§4 now uses an illustrative `since: 2`** on Put back, and says so. No real entry is deferred.

## The template (§8)

Blank on the left, the Put back entry filled in beside it: title, route, opens, chapter, width,
caption, specimen component, fixture props, up to four key lines, phone reduction, `since`, and
which copy file the strings come from. A future feature's design round produces **one filled-in
page**, not an edit to a 260KB canvas. The audit's process hooks — `AGENTS.md`, the plan, and
acceptance close-out — are named on the artboard as Product's to make; a template nobody is
required to fill in is decoration.
