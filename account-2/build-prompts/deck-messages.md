# Build prompt · Deck page messages

Paste into Claude Code on your machine. PR #2170 is merged.

---

Build the deck page message system. Read `design/design_handoff_the99_deck_messages/README.md` first, then `READINESS.md` (including its Errata) and `STATES-deck-messages.md`.

- **Build from:** `To-do Card`, the LEFT column of `Next Steps` ("as a row"), and `Pass Sheet`.
- **Also from R1:** the receipt band, the A1 deck toast, the mix's phone parity and dismissal come from the `R1 *` boards. Where R1 and the to-do card differ, the to-do card wins.
- **Ignore:** the right column of `Next Steps` (the next step in the head was rejected), and `Explored A` and `Explored B`, which are a record only.

Open each `.dc.html` with `support.js` beside it. Work in a worktree under `.worktrees/`, as AGENTS.md says. The brief is `docs/superpowers/design-briefs/2026-10-21-deck-messages.md`. The A1 to A18 numbers are the brief's.

1. **The page order is header · receipt band · to-do card · recommended mix · tabs**, at both widths.

2. **Header.**
   - The proxy line (A3) and the over line with Proposed cuts → (A4) leave the header for the card.
   - The notice tag (A2) and Commit as v1 (A5) stay.
   - Erratum: Commit as v1 CAN show beside the red spoken-for-twice row. When it does, the card has no filled press.

3. **Receipt band** (A10, A12, A13, A11).
   - Use `ArrivalBandShell`, above the card, one receipt at a time. A11 shows only when no other receipt does.
   - The precon receipt is shorter: the precon's name, `You own {n} of its 99`, and `History`.
   - Each receipt lasts the visit. Read `?from=precon`, `?imported=1` and `?updated=` once and strip them, as `StripAddedParam` does. The ✕ hides the receipt for the visit. Retire `arrivalDismissKey`. Check that nothing else reads those flags later (G1).
   - A11's ✕ is remembered on the account in a new `user_prefs` field, per deck and precon, append-only. Purge covers it.

4. **The to-do card.** It replaces these as containers: `RollupBands`, `PendingBanner` CARD, `LastSlotsStrip`, `ExhaustedLine`, `FillFailedBanner`, `UnresolvedBanner`, `GuidedBanner`, and the spines' A3 and A4 lines.
   - **Head:** `Before {deck} is {complete|legal|ready|built}` and `{n} to do`. On first run it reads `Step 3 of 3 · Build your first deck` with the crumbs.
   - **Rows:**
     - Each row has a 30px mark tile, a title, one line of body and ONE outlined press: the verb and `›`, 96px wide at 390 and 132px at 1300, in one column.
     - Warnings get a `--danger` tile and an `--avail-over-fg` title.
     - Each press's accessible name is the full shipped string (see the table in the README).
   - **Next step:** the first present of fill failed › unresolved › over the 99 › the last N › pending changes.
     - It is the first row, with a `Next step` label, an accent tint and a 3px inset accent edge.
     - Its press is the ONLY filled one.
     - Spoken for twice is never the next step.
     - The other rows follow in this order: warnings, then actions.
     - Write the precedence as one pure function, with a test for each pair.
   - **Commit and Discard live in Review.** The pending row's press is `Review`.
   - **Ran out** (A8's plate) gets a `Consider` press. That is the drawn default; READINESS asks Hugh.
   - **Foot:** version · proxies · `Where these N cards came from ▾` · `N in other drafts too`.
     - Provenance opens the shipped ledger lines inside the card, under the foot. One disclosure is open at a time, for the visit only.
     - When nothing is left to do, the card is absent and the foot stands alone as the quiet version strip.
   - **Moments:** M1 anchors to the last N's press. M3 anchors once, to the over row's press (G2). M4 stays on the Land cell.

5. **The pass sheet** (`Pass Sheet` board).
   - `Show these N` and `N in other drafts too` open the shipped `ModalChrome` sheet at 390 and the modal at 1300.
   - **Contents:** the pass as the eyebrow, `{n} cards`, the pass's sentence, the rows, then `Undo these N` (pass sheet only) and `Done`. For other drafts, group the rows under each draft with the list's own group heading.
   - **The rows ARE `DecklistRow` in the All view, mounted unchanged** inside the deck page's providers. Never a copy or a trimmed row.
   - A row press opens the card detail stacked through `registerSheet("{pass label}")`, so its close reads `← 1st top-off` and returns to the sheet.
   - The ✕ removes the card from the deck, as it does in the list.
   - Retire the PassMark highlight (`pass-mark.tsx`).
   - **Guard:** add `docs/superpowers/inventories/pass-sheet.json` with `shares.module: DecklistRow` for the list and the sheet, so `pnpm check:shared` holds it. Photograph it at 390 and 1300.

6. **The remove failure (A1)** becomes the deck toast: `ToastFrame placement="deck"`, as `TokenRefusalToast`. The shipped sentence is the title, the card name is the detail, with `role="alert"` and no press.

7. **The mix (A16)** is unchanged, except that on the phone `mixSourceLine` and the draft note join the label row.

8. **Copy:** everything in READINESS's copy-review list goes into `src/lib/copy` and to `/copy-review`.

9. **About entry:** Hugh decides whether this owes one (READINESS, item 3).

10. **Before the PR:** run the design-review skill. Run `pnpm check:copy-drift`, `check:tokens` and `check:shared`. Run the contrast gate on `--danger` tile ink in all six themes. Mobile and desktop ship in the same PR.
