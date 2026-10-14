# About page — R3 audit

**Audited:** 2026-09-15, against `main` at `5b2ccd0a`.
**Verdict: 🟡 Yellow.** Every finding from the R2 audit is answered. Three figures are wrong — the
same three Design flagged as drawn without a screenshot — one shipped feature that landed during
the round has no entry, and the per-theme hexes need one paste.

None of it is a design call. R4 is corrections and one addition.

---

## 1 · The R2 audit, closed

| Finding | R3 |
|---|---|
| 2.1 `41/65` impossible | Closed — `27/40`, with the 40/100 rule stated in the caption |
| 2.2 Status plate's JSDoc column | Closed — badge, bar, one figure; the sentences are key lines and the caption says whose words they are |
| 2.3 `soft` missing | Closed — four states, `1 in a brew` second, both widths |
| 2.4 Two tokens wrong | Structure closed, hues outstanding — see §4 |
| 2.5 Wrong four roles | Closed — Ramp / Card draw / Removal / Board wipes at 10 / 10 / 8 / 3 |
| 3 · Eight missing entries | Closed — 32 entries, chapters 7 / 6 / 10 / 9 |
| 3 · Proxies and reservations deferred | Closed — both `since: 1`. Both have since shipped (#632, #640, #644), so the call was right |
| 4 · Copy file contradicts canvas | Closed — regenerated with `caption`, `keys[]`, `width`, `chapter`, `since` |
| 5 · No add-one-entry path | Closed — the template artboard, plus a worked example |
| 6 · The rule | Open, and correctly not Design's — see §5 |

Spot-checked and correct in R3: the six theme names (`Low Sun`, `Neon Rain`, `Canopy`, `Oil Haze`,
`Witching Hour`, `First Frost` — `lib/theme/themes.ts:19-24`), `consider →` and
`Why these numbers?` (`copy/decks-builder.ts:76,95`), `Recommended mix`
(`role-counter-strip.tsx:65`), `Send 46 to ManaPool` (`copy/set-collections.ts:333`),
`Bring a deck over` and `Update from a list` (`copy/deck-import.ts:23,437`).

## 2 · The three unscreenshotted figures are all wrong

Design's own note: "assume these are wrong too until someone checks them." Three for three.

**2.1 — Deck import draws a door that does not exist.**
The figure reads "A Moxfield link, a pasted list or a file." There is no link mode.
`copy/deck-import.ts:26-30` states it outright: "That mode does not exist and is not being built
(#282) — a decklist arrives here by paste or by file." The shipped doors are `Paste a list` and
`Upload a file` (`:37-40`), and the phone's orienting line is "Paste it or drop a file."

**The caption must not promise a Moxfield link.** Import *reads* a Moxfield CSV export, which is a
different claim and is the one the collection entry already makes correctly.

**2.2 — The Put back figure mixes two surfaces.**
There are two undo affordances and they are not the same control:

| Surface | Line | Button | Source |
|---|---|---|---|
| Deck page, after a removal | `Rhystic Study removed` | `Undo` | `copy/decks-builder.ts` — `undo.removed`, `undo.action` |
| Review screen, on a cut row | — | `Put back` | `copy/deck-versioning.ts:249` |

The figure draws the deck-page tile, labels it with the review screen's button, and invents the
line "Removed from the draft. 62 of 99." Either draw the deck tile as `Rhystic Study removed` +
`Undo`, or draw the review row with `Put back` — not one wearing the other's control.

The entry's caption is right about the behaviour: a put-back does restore the count, the shopping
total and the claim together. Only the specimen is wrong.

**2.3 — The export dialog's tabs and button are invented.**
Real: two tabs **Decklist** and **Shopping list** (`export-dialog.tsx:2,52`), and one primary
button reading **Copy to clipboard**, swapping to **Copied ✓** for 1.5s
(`export-copy-button.tsx:72`). The figure draws tabs "The list" / "Shopping" and a button
"Copy shopping list".

`Buy these at Mana Pool` is correct (`copy/decks-builder.ts:472`), as is `.txt` — the desktop form
is `Download .txt` (`export-dialog.tsx:561`).

## 3 · One entry missing, and it landed during the round

**The post-import summary** — what a collection replace did to your decks — shipped as #639 and
#643 on 2026-09-14/15, after R3 was drawn. It has no entry.

This is not a Design miss; it is the first live demonstration of why §5 exists. A feature reached
`main` during a design round and the page that documents the app does not know about it.

It belongs in chapter 01 beside "Import a collection", because it is the consequence of an import
rather than a deck feature.

## 4 · The hexes, resolved

Design applied Amonkhet's three values to all six themes for want of the other blocks. All six,
from `src/app/globals.css`:

| Theme | `--avail-hard-fg` | `--avail-over-fg` | `--avail-over-border` |
|---|---|---|---|
| amonkhet (`:root`) | `#D9975C` | `#C46857` | `#752619` |
| kamigawa | `#DF8AA7` | `#C26755` | `#752619` |
| ixalan | `#ABCB5B` | `#C56A58` | `#752619` |
| phyrexia | `#77A9A0` | `#BE6453` | `#752619` |
| eldraine | `#B795EA` | `#C56A58` | `#752619` |
| kaldheim | `#80ABEF` | `#C86D5B` | `#752619` |

`--avail-soft` is `var(--fg-muted)` and `--avail-hard` is `var(--accent)` in every block, as
applied. The over border is the one value that genuinely does not vary.

## 5 · The rule is Product's, and it is still open

Design named it on the artboard and correctly declined to close it. It is not implemented
anywhere yet. Three places, and the §3 gap is the argument for all three:

1. **`AGENTS.md`, design pipeline** — no UI feature is designed without its About entry in the
   same handoff, drawn on the template artboard.
2. **The plan** — the `ABOUT_VERSION` bump and the entry as a named task, beside the PR
   boundaries.
3. **`feature-acceptance` close-out** — the entry exists and the version moved.

## 6 · How the three corrections should be spent

The specimen grammar makes this cheaper than it looks. A specimen **is** the real component fed
fixture props, so in build the export figure mounts the real `ExportDialog` and is right whatever
the canvas drew. What ships from the canvas is the **caption and the key lines**, and those are
copy.

So two of the three are errata against `about · copy strings.ts` and need no redraw:

- **2.1** is a caption edit — drop the Moxfield link, name paste and file.
- **2.3** is a key-line edit — the tab and button names, if the keys name them at all.

**2.2 is not errata.** It is a choice between two surfaces, and whichever is chosen changes which
component the figure mounts and which fixture it takes. That one is Design's.

## 7 · Not raised

- **Length.** Five and a half screens at desktop for 32 entries. The audit that asked for eight
  more entries does not get to complain about height, and compressing captions would trade the
  working thing for the measurable one.
- **The sticky index.** Still cuttable, still not worth a round either way.
- **Card markers mid-revision.** The by-column annotation is the right hedge; re-check that one
  entry when the revision lands.
