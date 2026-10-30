# READINESS — about page (R4)

**Self-assessed: 🟢 green.** Three corrections made, the hexes pasted, entry 33 drawn on §8's own
template. Nothing on the page is now unverified except two fixture vocabularies, named below.

Canvas: `The 99 - About Page (R4).dc.html`. R1–R3 kept as the record.

## The three corrections

**Both errata are caption and key-line fixes, as the audit predicted.** The specimen mounts the
real component in build, so the figure is right whatever the canvas drew — what shipped wrong was
the words.

- **Deck import.** Two doors, `Paste a list` and `Upload a file`, over a pasted-list field. The
  caption now says outright that **there is no link mode, from Moxfield or anywhere else** — the
  strongest available form, because a reader who half-remembers a link mode is the failure this
  entry exists to prevent. Import still *reads* a Moxfield CSV export; that claim lives in the
  collection entry, where it is correct.
- **Export.** `Decklist` / `Shopping list`, `Copy to clipboard`, `Download .txt`. The `Copied ✓`
  swap and its second and a half are now key line 3 rather than invisible.

**The Put back figure — I chose the deck page.** `Rhystic Study removed` + `Undo`.

Three reasons. It is where a removal *happens*, so it is the undo a reader meets first and the only
one they meet without committing anything. It needs no explanation of what a review screen is,
which the review row's version would have to carry before it could carry its own point. And the
entry is an inset, so it has no key lines to spend on a second surface — whereas a caption clause
names `Put back` in one sentence, which it now does. The entry is retitled **Undoing a removal**,
because titling it with a button name from a surface it does not draw is how the original error
happened.

## Entry 33, and what it cost

**The post-import summary**, chapter 01, immediately after `Import a collection`. Plate, three key
lines, `since: 1`. Drawn from the template artboard's fields in order, and §8's worked example is
now this entry rather than Put back — so the template's demonstration is a real first use.

It took about fifteen minutes and touched two places: the entry itself and chapter 01's count. **No
other entry moved, and the grammar needed nothing.** That is the template working, and it is worth
saying plainly because the argument for §5 rests on it.

## The hexes

All six blocks pasted. Structure did not change — every diamond already read the token — so this
was five value swaps. `--avail-over-border: #752619` confirmed constant.

## Still unverified, both fixtures

- **`ImportSummary`'s strings.** I have not read the component or its copy file — #639/#643 landed
  after my last read of `main` and the audit names the feature, not its vocabulary. **Every string
  in that figure is a plausible fixture:** `Collection replaced`, `4,910 → 5,132 cards`,
  `61 no longer owned`, `2 cards now short 1`, `3 cards freed up`, `11 other decks unaffected`. The
  *structure* is the entry's subject and I stand behind it; the words want one pass against
  whatever `collection-replace.ts` actually says. This is the one thing in R4 I would hold a
  re-audit open for.
- **Role names and baselines**, unchanged from R3: `Ramp / Card draw / Removal / Board wipes` at
  10 / 10 / 8 / 3, from the audit rather than from source.

## Not carried

Length (five and a half screens, and the audit that asked for eight more entries agreed not to
raise it), the sticky index, and the mid-revision card markers — the by-column annotation remains
the hedge, and that one entry wants a re-check when the revision lands.

**The rule is still Product's.** Entry 33 is the second live demonstration inside two rounds: a
feature reached `main` while the page that documents the app was being drawn. The template makes
the omission cheap to fix; only the process change stops it happening.

## Copy delta

`about · copy strings.ts` gains one entry and three edits:

- `postImportSummary` — new, chapter 01, plate, `since: 1`, three keys.
- `deckImport.caption` — no link mode; `Paste a list` / `Upload a file`.
- `export.keys[3]` — `Copy to clipboard` / `Copied ✓` / `Download .txt`.
- `putBack` → `undoRemoval` — retitled, caption names the review screen's `Put back`.
