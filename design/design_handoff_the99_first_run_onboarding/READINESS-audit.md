# Readiness audit: first-run onboarding (R1)

**Verdict: 🟡 Yellow.** It can be built once the engineering corrections below are applied,
and once Design's R2 places one item (below). Hugh ruled on O1 on 2026-09-28. The audit was run against the brief on
`docs/first-run-onboarding-brief` (#1091), `2026-09-28-first-run-onboarding.md`, and
`origin/main`.

## Ruled by Hugh, 2026-09-28

- **O1. Home shows the dashboard as soon as the collection is read.** There is no new Home state,
  and Ready to build stays first.
- **With no decks, Home's decks area shows the same pair as the empty state on `/decks`:** Browse
  commanders (primary) and Import a deck (ghost), with the `buildableFrom` line. It must be the
  same component as the action group in `DecksZero` (`decks-zero.tsx:56-77`), so the two cannot
  drift. That group is written inline in `DecksZero` today, so the build extracts it. The gap is
  `ResumeDecks`, which returns null when there are no decks (`resume-decks.tsx:323`).
- **New deck stays start-from-scratch** (`dashboard.tsx:96`). Import is not folded into it:
  "New deck" does not suggest import, and `/decks` already shows both.
- **Design's live step 2 (D2 / A3, frames 1c and 1d) is withdrawn.** The checklist unmounts once
  the collection is read, as it does today. The locked step 2 still names both paths (ruling 2).
- **This settles correction 3.** For an account with decks but no collection, Go to step 1 goes
  to `/collection/replace`. Checked: that page mounts `ReplaceFlow`
  (`app/collection/replace/page.tsx:7`), the same flow the checklist's step 1 mounts
  (`home/first-run.tsx:12`), and the dashboard already links there (`dashboard.tsx:87`). Its
  title reads "Replace collection" (`page.tsx:22`) even when there is no collection to replace;
  that goes to `/copy-review`.

## Returning to Design (R2)

- **Where the pair goes in Home's resume slot, at both widths.** This is the only item going back
  to Design. R2 also records the withdrawal of D2 / A3. Everything else stays with engineering.

## What checks out

- **§3.** All six rulings are honored:
  - step 1 is the collection only (README `:24`, D4);
  - step 2 names two paths (D1; the live form, D2, is withdrawn by Hugh's O1 ruling);
  - the locked nav explains itself (D5–D7);
  - import issues on the phone use the filter sheet (D8);
  - the replace confirm is calmer (D9);
  - the phone has an exit (D11).
- **§4.1–4.5 and the state list** are drawn at the widths the brief asks for (canvas `:83` onward, through frame 5b at `:571`),
  including all six themes' `--fg-locked` and the unlock moment.
- **Buildability.** Every component the handoff names exists. All 20 tokens the canvas reads
  are declared in all six themes (`--tabbar-h` is a single `html`-level value, `globals.css:495`). It needs no new token.
- **O4: out of scope.** `filter-sheet.tsx:169` draws the scrim as the literal
  `rgba(16,13,10,0.74)`. Moving it onto the themed mix is a follow-up, not this build.
- **O6.** No new About entry. `import-issues` (`about.ts:180`) and `deck-import` (`:627`)
  exist, and neither caption states anything the redraw makes false. Any edit rides the batched
  bump.

## O2: what a second replace restores (answered from the code)

**It restores everything.** Replacing with the previous file brings the account back to where it
was.

- **What a replace deletes.** `replaceCollection` (`src/lib/collection/import.ts:136-183`)
  deletes only `collection_items` and `commander_scores` (`:171-173`), then reinserts.
- **Nothing set in the app lives in `collection_items`.** Every one of its columns comes from
  the file (`schema.ts:215-230`), and nothing else in `src/` writes that table.
- **Untouched by a replace.** Deck lists and versions, assignments (`card_assignments`), pulls,
  proxies and locks are all keyed on decks. Art picks (`card_art_preferences`) have no link to
  `collection_items`; they are joined per card when read (`browse.ts:1004-1009`), so a pick goes
  dormant and comes back once that printing is owned again.
- **Recomputed live.** Owned counts and availability (`availability-query.ts:233-241`).
  Commander scores are rewritten after the confirm, and recomputed lazily as a fallback.
- **Per-upload receipts.** Each upload keeps its own arrivals receipt on its own `csv_uploads`
  row, so a second replace adds a receipt and loses none.

**Caveats for `/copy-review`:**
- The player needs the previous file. The app stores each upload's preview but offers no
  restore.
- A catalog refresh in between can match rows differently.
- A pasted collection is "your previous list", not a file.
- **The body sentence is false:** "Decks and commander recommendations rebuild from the new
  list" (`copy strings.ts:39`, and its phone form `bodyShort` at `:40`; the desktop confirm already
  ships it as "…rebuild from the new collection", `confirm-modal.tsx:111`). Decks are never
  rebuilt; what each deck needs to buy is recomputed.

## O3: focusable locked slots (engineering and accessibility)

Making the locked slots focusable is sound. Today they are `<span role="link" aria-disabled>`
with no tab stop (`nav.tsx:83-120`). D5 as drawn needs these changes, and the accessibility check
must verify each:

- **Drop `aria-disabled`.** The slot now opens a note, so a screen reader announcing it as
  unavailable is wrong. Use `aria-expanded` with `aria-controls`.
- **Keep the note's text in the document.** The handoff gives `aria-describedby=note`. If the
  build mounts the note only when it opens, the description is empty until then, so keep the
  sentence in the document at all times (screen-reader only is fine).
- **Remove `title`** (`nav.tsx:114`), or the browser's tooltip draws over the designed note.
- **Say it once.** Trim the accessible name to the label plus "locked", so it does not repeat
  the note (`lockedItemAria`, `refresh.ts:252`).
- **Hover note (WCAG 1.4.13).** It must not close when the pointer leaves the slot, because it
  holds a Go to step 1 button (STATES §B `:26`). Escape closes it and returns focus to the slot.
- **Phone note.** Do not use `role="status"` with a button inside it. Focus stays on the slot,
  and the button comes next in order.
- **Keep `aria-current`** on a locked slot whose route still renders, such as `/collection`.

## Engineering corrections

1. **Locked-slot accessibility**, as listed under O3.
2. **A header drag surface that is not hidden from screen readers.** D8 extends the `Sheet`
   handle wrapper over the header, but that wrapper is `aria-hidden` (`sheet.tsx:238-247`), which
   would hide the title and tabs. Pass pointer handlers into the header instead. The "measured
   once, then held" height is also new behavior for `Sheet`.
3. **Where Go to step 1 goes when there is no checklist. Settled by Hugh's O1 ruling:**
   `/collection/replace`. The nav locks when the collection is empty (`shell.tsx:35`), but Home
   shows the checklist only when the account also has no decks (`page.tsx:144`), so an account
   that imported a deck first sees locked chrome with no step 1. The build still has to say where
   D5's desktop page line appears for that account.
4. **The empty-filter title** (item 11 of Hugh's production walk, relayed by d9; the brief does not
   list it) is 16px today (`issue-inspector.tsx:485`) against the Issue Inspector mock's 19px
   desktop and 17px phone in Cinzel (`design_handoff_the99_issue_inspector/The 99 - Issue
   Inspector.dc.html:316`, `:334`). This handoff does not redraw that state (STATES
   §C `:39-40`, "—"). Build it at `text-[17px] md:text-[19px]` in the display face.
5. **The calmer replace banner** is drawn at 1300 only (4c). Mirror D10 for the phone.
6. **Add the phone Cancel row** to the design table, `collection.md:2062`.
7. **D9's "no `--danger` anywhere" applies to the idle and pending confirm only.** The state table
   still draws a 13px `--danger` error line (README `:121`, and the token list). Keep that error
   line; the calmer rule governs the confirm's resting content.

## For `/copy-review`

These do not affect the verdict.

- The "Decks … rebuild" sentence (O2).
- The lock is worded three ways: "open once your collection is read", "Add a collection to
  unlock", "Unlocks once a collection is read". Pick one.
- "Collection opens once your collection is read" repeats itself.
- "An imported deck arrives built" collides with the app's own meaning of "built".
- "your previous file" assumes a file, but a pasted collection has none.
- `/collection/replace` is titled "Replace collection" even for an account with no collection
  (the O1 ruling routes Go to step 1 there).
- Every string is a placeholder, `step2Title` changes meaning, and `importPrompt` is deleted
  (O5).

## Against Design's READINESS-r1

- **Agree** on O4–O6, and that O2 and O3 belong to engineering. O1 is ruled by Hugh, and the
  ruling withdraws D2 / A3.
- **O2** can close, and **O3** needs the changes above.
- **Not raised there:**
  - the header drag hidden from screen readers;
  - Go to step 1 when there is no checklist;
  - the empty-filter title size;
  - the phone banner.
