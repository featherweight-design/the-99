# Readiness: First-run onboarding (R1)

## Open, needs a ruling

**O1 · A3 is a new Home state (Hugh).** For step 2 to be live, the checklist has to survive the
collection being read. Today `page.tsx:194` mounts it only while the collection is unread.
- Design's call is that it stays until the first deck exists, with step 1 shown done.
- If Hugh prefers Home's normal state at that point, step 2's two paths need a home there instead, and
  1c/1d are withdrawn.

**O2 · "To go back, replace it again with your previous file" must be true (engineering).** Ruling 5
rests on reversibility. Before /copy-review, engineering should confirm what a second replace restores:
- owned counts, certainly;
- deck lists: are they untouched by a replace?
- claims and availability: are they recomputed?

If anything is lost for good, the sentence has to name it, and the calm treatment still holds.

**O3 · Locked slots become focusable (engineering, a11y).** `nav.tsx:87-97` keeps them out of the tab
order on purpose. D5 reverses that so the reason is reachable by keyboard. The a11y review should sign it
off.

**O4 · Scrim ink.** `filter-sheet.tsx` uses a literal `rgba(16,13,10,.74)`, which is Amonkhet's `--bg`.
The issues sheet is drawn with the themed mix. Design recommends the filter sheet adopt the mix too, but
that is out of this brief's scope.

## Open, copy (/copy-review)

**O5 · Every new string is a placeholder.** The list is in `first-run-onboarding · copy strings.ts`. Two
keys change meaning:
- `firstRun.step2Title` now names both paths.
- `firstRun.importPrompt` is deleted.

`lockedItemAria` is kept for the slot's name. The note's sentence becomes its `aria-describedby`.

**O6 · About (Hugh).**
- No new entry is owed.
- `deck-import` may need "once your collection is read".
- `import-issues` may say "full-screen" on a phone.

Both ride the next batched `ABOUT_VERSION` bump.

## Measured

- **1b at 390:** the stack ends at 756, above the 88px bar. It fits the 390×800 budget.
- **5a at 390:** the card foot ends at 748 once scrolled by the heading (≈ 96px).
- **The rail well at 820:**
  - the well's foot sits at 323px;
  - the note's top is 146, and it stays clear of the account trigger at every desktop height ≥ 560.
- **Issues sheet:**
  - header block ≈ 86px, tabs 42, filter row 56 (with 12 above);
  - the list gets 726 − 234 ≈ 492px at 844, which is about 10.7 rows at 46.
- **Contrast:** `--fg-locked` on `--surface-rail` and on `--surface-sunken` is ≥ 3:1 in all six themes.
  It is used for 9px mono labels, which follows `nav.tsx`'s existing reasoning for the tab label. The
  a11y review should confirm it at 8.5px on the rail.

## Not drawn, by brief §5

- top alignment;
- the filled fan;
- the first import without a confirm;
- left-aligned issue headings;
- the full-width paste box.
