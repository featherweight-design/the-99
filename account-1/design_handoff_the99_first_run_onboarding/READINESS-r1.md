# Readiness: First-run onboarding (R2)

## R2 · after Hugh's O1 ruling (2026-09-28)

**D2 / A3 (frames 1c, 1d) are withdrawn.** Home goes to the dashboard as soon as the collection is read. The checklist's locked step 2 still names both paths (1a, 1b are unchanged).

**The call, drawn in 6a (1300), 6b and 6c (390):** with a read collection and no decks, the resume slot becomes a peer section called **No decks yet**.

**Structure**
- `dashboard.tsx` mounts `<HomeDecksZero buildable cards />` in place of `<ResumeDecks />` when `props.decks.length === 0`.
- `ResumeDecks`' early `return null` stays, as a guard.
- `HomeDecksZero` (new, in `home/`) draws:
  - §SectionLabel `zero.decksHeading`, with `mt-[6px]`, the resume label's margin;
  - one card, in Commitments' card classes: `rounded-[14px] border --border bg --surface-inset`, `p-[16px] sm:p-[16px_18px]`, `gap-[14px]`;
  - in the card, `zero.decksBodyShort` / `zero.decksBody` with the same two-paragraph breakpoint swap as `DecksZero`, at 13.5 / 14, lh 1.65, `--fg-muted`, `sm:max-w-[520px]`;
  - then `<DecksZeroActions buildable cards />`.
- **`DecksZeroActions`** (extracted from `decks-zero.tsx:56-77`, classes unchanged) is the button row plus the `buildableFrom` line, returned as a fragment. `DecksZero` renders it in its centred column. `HomeDecksZero` wraps it in `flex flex-col gap-[15px] sm:gap-[16px]`, the gaps DecksZero's column gives it.

**What is dropped, and what is kept**
- The **card fan** is dropped, because it marks a whole empty surface and would sit under Ready to build's two portraits.
- The **body** is kept, because it is the only sentence on Home that says what a deck is here.
- The **"Pick up where you left off" label** is not drawn.
- The block is **left-aligned**, like every Home section.

**Phone:** the order is the dashboard's own (CTAs, then Ready to build, then the block, then Commitments). The block sits one scroll below the fold. The stacked 44px pair comes from the shared component's own `sm` classes.

**Edge cases**
- `buildable === 0`: the line is omitted (the shared rule). `ReadyToBuild` also returns null, so the block becomes the first section.
- The first deck, from either path: the block unmounts and `ResumeDecks` renders.

**Supersedes** the comment at `resume-decks.tsx:320` ("at 0 decks the two CTAs above carry the empty case").

### O7 · Two filled buttons at zero decks (Hugh)

Ruling 14 makes New deck Home's one bone fill. The locked pair makes Browse commanders the primary, in the same component as `/decks`, so Home at zero decks shows **two filled buttons**. R2 draws it as locked and does not fork a variant. The exception exists only while `decks.length === 0`.

Options:
- **A:** accept it, because the zero state is the one moment Browse outranks New deck.
- **B:** give `DecksZeroActions` a `tone` prop that draws both as ghosts on Home. That is still one component, but the two surfaces would diverge.

Design leans A.

---

## R1

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
