# About The 99 — feature close-out

**Walked:** 2026-09-15, against `main` at `fa0397f8`, in a real browser at 390×844 and 1300×900.
**PRs:** #653 (copy, table, guard) · #658 (page, gate, menu row) · #666 (figures, compact layout).
**Contact sheet:** `docs/superpowers/inventories/about-page.json` →
`node scripts/contact-sheet.mjs docs/superpowers/inventories/about-page.json`.

## The inventory

| Surface | 390px | 1300px | Notes |
|---|---|---|---|
| `/about` — reader at version 0 | ✅ | ✅ | Every entry, nothing marked, dismiss present |
| `/about` — the figures | ✅ | ✅ | Five specimens, all drawing |
| `/about` — arriving with a destination (`?next=`) | ✅ | ✅ | Destination printed and carried |
| Account menu — `About The 99`, first, no badge | — | — | Not in the sheet; see below |

The account-menu row is deliberately absent from the contact sheet. Every verb in that script
reaches page content through `onPage`, which scopes to `<main>`, and the shell's account trigger
sits outside it by construction — a row for it could only be written by defeating the scope that
exists because two probes once measured the shell while naming a page. It is covered by
`account-menu.test.tsx` instead: the row's position, its link, the roving wrap past it, and its
busy state.

## What the walk found

**A caption stutter in the availability plate.** Each cell drew the marker and then repeated it:
`◆ none free` sitting directly above the words `none free`, `◇ 1 in a brew` above `in a brew`.
Both halves were individually correct, which is why four review rounds and every assertion in the
file passed over it — the marker was right, the caption was right, and together they read as a
fault. Captions annotate rather than echo now — **in all three plates that had it**. The pre-open pass
caught that the first fix was the instance rather than the class: the marks row drew
`1 in a brew` over the note `a brew wants it`, and the buy tag drew `buy·$6.40 foil` over
`foil only`.

`about-page.test.tsx` pins the rule for the **availability plate only**, and that scope is the
honest part. There the mark is the whole label, so "does the caption repeat it" is a containment
test. On the other two it is not: the marks row reads `Rhystic Study 2 1 in a brew` and the buy
tag `buy·$6.40 foil`, so the mark carries a card name and a price and neither string contains the
other. A loop written across all five plates ran green over the defect in two of them — it was
written, mutation-tested, found to measure nothing, and narrowed rather than shipped. Those two
are held by the fix and by the sheet.

That is the whole argument for this artifact, twice over. No assertion catches the stutter,
because there is nothing wrong with either string — and the assertion written to catch it
afterwards could only reach a third of it.

## What the walk could not answer

**The three rows are one reader state, not three.** The inventory's note called them three
states reached by URL; that is wrong and the note is corrected. `?next=` sets only the dismiss
destination. The page renders differently for a
reader at version 0, a reader who is behind, and a reader who is current — but the acknowledged
version lives in `user_prefs`, so the fixture account is in exactly one of them at a time. The
sheet's three rows all photographed the same state. The other two are covered by
`about-page.test.tsx`, which renders `seen={0}`, `seen={ABOUT_VERSION}` and a version-2 page with
one entry marked; a future walk wanting the real thing would have to write the row and put it
back, in the shape `probe:review` uses for its collection edits.

## Still designed and not built

The composition plates — the deck page header, the Discover row, the Recommended mix, and the log
form. `FIGURES` is a partial map and those entries carry their words, which is a finished answer
per the copy file's rule 3.

They are held back deliberately rather than forgotten. Every figure that mounts an app component
has cost review rounds in proportion to how much of a surface it reproduces: the marks plate alone
drew findings in three consecutive rounds and ended as a legend rather than a replica, because
following that class to its end is a second `DecklistRow` living on a reference page. The four
plates above are the largest instances of exactly that, and each needs page-level fixture data the
page has no business inventing. They want their own round with that lesson applied from the start.
