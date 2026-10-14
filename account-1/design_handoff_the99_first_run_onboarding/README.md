# Handoff: First-run onboarding fixes (R2)

**R2 (2026-09-28), after Hugh's O1 ruling.**
- **New frames:**
  - 6a: Home with a read collection and no decks, at 1300;
  - 6b and 6c: the same at 390, at the fold and scrolled.
- **Placement:** the resume slot becomes the "No decks yet" section. It is decks-zero's body plus a shared
  `DecksZeroActions` (extracted from `decks-zero.tsx:56-77`), with no card fan.
- **Withdrawn:** 1c and 1d (D2 / A3).
- **Open:** O7, two filled buttons at zero decks.

The spec is in READINESS-r1.md §R2. The file names keep "R1".

Repo path: `design/design_handoff_the99_first_run_onboarding/`. It is a stateful addendum to
`design/design_handoff_the99_refresh/`, which drew first run and the locked chrome.

Brief: `docs/superpowers/design-briefs/2026-09-28-first-run-onboarding.md` on branch
`docs/first-run-onboarding-brief`, verified against `origin/main` at `962e9ad6`.

## About the design files

`The 99 - First Run Onboarding (R1).dc.html` is a design canvas made in HTML (pan and zoom), not code to
ship. Rebuild it in the app's stack in the files named in brief §2. The `theme` prop switches all
frames between the six `globals.css` blocks; the default is `amonkhet`, the app's `:root`. Frame `2c`
renders all six at once.

**Fidelity:**
- **High** for the step cards, the rail well, the tab-bar bracket, both locked-item notes, the issues
  sheet chrome, the calm confirm, the replace note and the review foot.
- **Scaffolding** for the review page under scrims, nav glyphs (they are simple shapes; production
  keeps `NavIcon`) and the card fan (fixed by engineering, §5).

## Rulings honoured (§3)

1. The foot is gone: step 1 is the collection only.
2. Step 2 is "Pick a commander **or** import a deck".
3. The locked nav says why, at both widths.
4. Import issues on a phone open in the collection filter sheet.
5. The replace confirm is calm.
6. The phone review has a Cancel.

Two rulings deliberately reverse earlier decisions, as the brief states:
- Ruling 1 reverses refresh decision 6 (`README.md:52-57`) and the `refresh.ts:247-249` comment.
- Ruling 4 reverses issue-inspector decision 2 (`README.md:52-56`).

## Decisions (§4)

### D1 · Step 2, locked: one card that names both paths (frames 1a, 1b)
- **Title:** "Pick a commander or import a deck". **Reason:** "Unlocks once a collection is read".
- Now that the foot is gone, this card is the only place a first-run player learns import exists. So it
  names import *before* it unlocks, instead of hiding it behind a single title.

### D2 · Step 2, live: primary and secondary, not peers (1c, 1d)
- **Pick a commander** is the bone fill and goes to `/commanders`. **Import a deck** is the hairline and
  goes to `/decks/import`. This is refresh decision 2's one-fill rule.
- `zero.buildableFrom` sits beside the buttons on desktop and under them on a phone, and is omitted at 0.
  It is the figure that justifies the primary.
- The live card takes the step-1 live treatment: `--accent` border, `--surface-inset` and an accent
  numeral box.
- **Step 1 becomes a done row:** ✓ in `--success`, "Collection read", mono `1,284 cards · file`, and a
  hairline **Replace** to `/collection/replace`.
- **New state.** The checklist stays on Home while `uniqueCards > 0 && deckCount === 0`. Today it
  unmounts once the collection is read. See READINESS O1.

### D3 · Step 3 on the import path: it never appears
- An import creates a deck, so the checklist's condition is false and Home renders normally. Step 3 is
  never ticked or skipped.
- While step 2 is live, step 3's reason warns ahead of time: "Unlocks with a commander. An imported deck
  arrives built." The words are a placeholder.

### D4 · The column closes up
The `mt-auto` foot is deleted, not replaced. Step 1 keeps its intrinsic height, and the space below the
stack stays page.

### D5 · Locked rail: a well, a word and a note (1a, 2a, 2c)
- **The well:**
  - The four locked slots sit in one well: 48px wide, `--surface-sunken`, 1px `--border`, radius 12,
    padding 4/0/9, gap 4.
  - The padlock (now `--fg-locked`, up from `--fg-disabled`) and `LOCKED` (mono 8.5, .1em, `--fg-locked`)
    sit at its foot.
  - This replaces the 34px divider and the lone glyph.
- **The sentence** lives in the page: a 12.5 `--fg-muted` line under the H1, with a padlock: "Collection,
  Commanders, Discover and Decks open once your collection is read." This is desktop only; the phone has
  the bracket instead.
- **The note:**
  - Hover, focus or click on a locked slot opens it: 268px, `--surface-raised`, 1px `--border-strong`,
    radius 10, anchored 12px right of the rail with a caret.
  - Content: mono `LOCKED`, then a sentence naming the slot first, then a hairline **Go to step 1**.
- **Locked slots become focusable:** `button[aria-disabled=true][aria-describedby=note]`. Today they are
  out of the tab order.

### D6 · Locked tab bar: a bracket, and a tap that answers (1b, 2b)
- **The bracket:**
  - A bracket spans slots 2–5: a 1px `--border-strong`, 6px-tall open box with the label centred on it.
  - Label: `ADD A COLLECTION TO UNLOCK`, mono 9, .08em, `--fg-locked`, with a 9×11 padlock.
  - The bar grows from 74 to **88px** while locked (`--tabbar-h` in first run only).
- **A tap:**
  - The tapped slot takes an inset 1px `--border-strong` outline (never a fill).
  - A note rises 10px above the bar: `--surface-raised`, radius 12, with the caret on the slot.
    It holds the sentence (slot name first) and a 44px hairline **Go to step 1**.
  - It closes on a tap outside, a second tap on the slot, or the button. There is no timeout. It is
    `role="status"`.

### D7 · The unlock moment: things come alive
The well, the bracket, the page line and the notes all unmount. There is no animation and no toast. The
ticked step 1 is the only mark of the change.

### D8 · Issues sheet: the collection filter sheet's vocabulary, with a held height (3a, 3b)
- **Vocabulary:** 22px top radius, `--surface-inset`, and a 38×4 handle at radius 2 under 12px of top
  padding, as `filter-sheet.tsx`. Ruling 4 names that sheet, and it is the collection route family.
- **Scrim:** `color-mix(in oklab, var(--bg) 74%, transparent)`. The filter sheet's literal
  `rgba(16,13,10,.74)` is Amonkhet-only; see READINESS O4.
- **Height:**
  - Measured once on open, from the longer tab's content, then held. Filtering and tab switches never
    resize it.
  - The cap is 86vh (726px at 844).
- **Drag:**
  - Only the handle and the title block start a drag. That is the `Sheet` handle wrapper extended over
    the header, with `touch-none` on both.
  - The tabs, filter and list never move the sheet.
  - The list is the single scroll body, with `overscroll-behavior: contain`.
  - This resolves the nested-scroll objection in the old decision 2.
- **Kept:** the ✕, which is the inspector's accessible dismiss (the handle stays `aria-hidden`).
- **Dismiss:** the scrim, Escape and an 80px drag are one action.
- **Also:** `z-50` over the tab bar, and virtualisation above 150 rows. The count's `min-w-[150px]` is
  desktop only; the phone uses 72px.
- **Desktop:** the 660×640 modal is unchanged.

### D9 · The calm replace confirm (4a, 4b)
- **Typing REPLACE is removed.** Continue on the review screen and this dialog's button are two
  deliberate presses. A typed third was justified only by "can't be undone", which Hugh has ruled untrue.
- **No icon.** No `--danger` or `--warning` anywhere, and the input is gone.
- **Content:** title, then a now → after figure pair (`--surface-sunken`, mono 21/600), then one body
  sentence that names how to go back.
- **Buttons:** **Keep current** (hairline) and **Replace with N cards** (bone fill). N is the
  *matched* count, what the player gets; today the button counts what they lose.
- **Focus:** initial focus is on Keep current. Escape and backdrop are refused while pending, as today.
- **Phone:** the same content in the existing sheet. Keep current becomes a 44px hairline instead of
  faint text.

### D10 · The replace banner comes down to match (4c)
- `upload-entry.tsx:194` becomes a plain note: `--surface-sunken`, 1px `--border`, radius 10, and
  `--fg-body` 14 with the count in `--fg` 600.
- No ⚠, no left rule and no `--elevated-hover`.
- It renders only when `currentCardCount > 0`.

### D11 · The phone exit (5a, 5b)
- **The ‹ chevron is removed.** A **Cancel** hairline (46px) sits left of Continue in the confirm bar
  and does exactly what the chevron did (`onCancel`).
- **Embedded (first run):**
  - The review renders no phone header.
  - The step-1 card keeps its title and gains a mono `REVIEWING · file · rows` line. The fan hides and
    the card goes left-aligned.
  - The confirm bar becomes the card's foot, in flow and not sticky.
  - Cancel returns step 1 to its two buttons.
- **`/collection/replace`:**
  - The header row is "Review import" plus the filename, with no chevron.
  - The bar is sticky on the phone too, at `bottom: var(--tabbar-h)`, and the content reserves 104px.

## About entry

- **The explained lock owes none.** It is chrome explaining itself on screen, which is not a capability.
- **The step 2 import path owes no new entry.** Deck import already has one (`about.ts:627`,
  `id: 'deck-import'`). Check its body: if it says import is available at any time, it needs one clause,
  "once your collection is read". That is a copy edit that rides the next batched `ABOUT_VERSION` bump.
- **`import-issues` (`about.ts:180`):** if it says the phone list is full-screen, it now opens as a sheet.
  Same treatment.
- Hugh's call either way. See READINESS O6.

## Files

| File | What it is |
|---|---|
| `The 99 - First Run Onboarding (R1).dc.html` | The canvas. `support.js` is its runtime |
| `STATES-first-run-onboarding-r1.md` | The §4 state list, frame by frame, with tokens |
| `READINESS-r1.md` | Open items, measurements and what blocks a green |
| `first-run-onboarding · copy strings.ts` | Placeholder strings, for /copy-review |

Source it was aligned with, on `main`:
- `src/components/home/first-run.tsx`;
- `shell/nav.tsx`;
- `ui/sheet.tsx`;
- `collection/filter-sheet.tsx`;
- `collection/issue-inspector.tsx`;
- `issue-inspector-list.tsx`;
- `review-screen.tsx`;
- `replace-flow.tsx`;
- `confirm-modal.tsx`;
- `upload-entry.tsx`;
- `src/lib/copy/refresh.ts`;
- `src/app/globals.css`;
- `design/design_handoff_the99_issue_inspector/README.md`.
