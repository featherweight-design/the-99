# ADDENDUM READINESS — Top off the last 31 (Addendum R1)

**Self-assessed: 🟢 Green.** Five gaps called, one eng fix ratified with two amendments, three
shipped eng calls adopted unchanged. **No new token, no new dependency, no new motion, no new glyph,
and nothing in the locked handoff reopened.** **Eleven new keys** — seven for the five gaps, four
for the ratified keep-all confirm — plus two edits and three ratifications. One of the five gaps
turned out to need no string at all.

---

## The five, and what each cost

| # | Gap | Call | Cost |
|---|---|---|---|
| 1 | **#478** the decline has no drawn trigger | **A worded control in the restore's register — `Set aside`, never a glyph.** Phone: line 2, 44px. Desktop: a 60px slot where the 18px glyph was. | **1 key** (`decline`); two figure columns narrow |
| 2 | **S25** all declined | **Emptied by choosing is not empty.** One honest line, plus a **bulk restore** in the selection head at one decline. | **4 keys** (`restoreAll`, `restoreAllAria`, `nothingTickedAllDeclined`, `restoredAll`); one ghost button |
| 3 | **The door note at 390px** | **The promise outranks the provenance.** Three desktop strings collapse to two at phone. | 2 keys |
| 4 | **`slotsStayOpen` never reaches a phone** | **It belongs, and it needs no new string** — measured at ~281px inside the bar's 366px. Rung 2 of the ladder. | one class deleted |
| 5 | **`list.cap` placement** | **Rung 1 at phone, the selection head at desktop.** | nothing; the string is verbatim |

1 + 4 + 2 + 0 + 0 = **seven keys for the gaps**, then **four more for the ratified keep-all confirm** (`keepAllConfirm`,
`keepAllConfirmMobile`, `keepAllConfirmYes`, `keepAllConfirmNo`) — eleven in all.

**One rule decides 4 and 5, and it is the addendum's spine:** at 390px the pinned bar has *one* mono
status line, and its tenant is the cap, then the slots that stay open, then the retired dock. Rungs
1 and 2 are mutually exclusive by arithmetic, so the ladder costs no height and `onBarHeight`'s
reservation is unchanged.

## Called, not asked — flagged for the record

1. **The candidate list has no glyph-only controls.** A new rule, and the whole of #478's fix.
   Removal is a glyph everywhere in this app, so a glyph here is the collision — the answer cannot
   be a nicer `×`. Four carriers now separate the decline from removal: a word not a glyph, a dashed
   underline (this app's reversible/unsettled vocabulary, which removal never wears), the mono
   figure register, and at phone a different position entirely.
2. **The decline slot grows 18 → 60px, and the 42px it needs comes from Synergy (88 → 56, −32) and
   Decks (52 → 40, −12).** That is 44px recovered against 42px spent, so **2px goes back to the
   name column** — which is the point: the name is the one measure the parity floor protects, and it
   pays nothing. Slot count is unchanged at three, so the row's gaps do not move.
3. **The dock notice becomes rung 3, so at phone it is visible only when a pass is exactly full.**
   Close to retiring it, deliberately: it is the only one of the three tenants about a control the
   player is not using, the swap is already announced on open, and `Cancel` and `Close` are both on
   screen and are both the answer to *how do I get quick-add back*.
4. **The bulk restore appears at one decline, not at 38.** Gating it on the all-declined case would
   hide the general control to serve the extreme one.
5. **Restoring a declined row returns it unticked.** The player's tick was replaced by a decline;
   re-seeding would put cards back in a pass they took them out of. Flagged as gap 6.
6. **`lastSlots.short` must never print in S25.** *Your collection ran out* would blame the
   collection for the player's own preferences — the locked handoff's own worst-sentence test.
7. **The keep-all confirm takes no `--danger`.** Keeping is a graduation, not a deletion; danger ink
   would say *this loses cards*, which is the one thing it does not do. `--danger`'s single
   occupancy on this surface — a refused write — is preserved.
8. **`Clear all auto` gets no confirm.** It ships `SweepReceipt` with an undo. The rule: **confirm
   where there is no undo, receipt where there is.**
9. **The confirm question names the record, not the ledger.** *Ledger* is an internal noun appearing
   nowhere on screen — the same trap eng caught in `seedReversal`, where *the sweep* pointed at a
   control labelled `Clear all auto`.

## Ratified from the shipped build

- **`list.declineAria`** — the `ENG-INVENTED` marker comes off, **the string stays**. Eng was right
  to invent a trigger and right to flag it; only the *form* was Design's to fix.
- **`list.cap`'s missing count** — ratified, and the reasoning is better than the handoff's own
  denominator rule: the count repeated `head` word for word at desktop and `headMobile` in the bar
  directly below, so the instruction arrived third.
- **`plural`** — ratified. *Add 1 cards* is exactly the defect a handoff writes by pluralising
  unconditionally.
- **The inline-confirm pattern itself**, plus its focus behaviour and its rule that the question
  replaces **both** bulk controls.
- Also adopted unchanged, without re-speccing: `captionMobileOpen`, `closeShort`, `colCost`,
  `markOne`, `markedRow`, and the `unownedClause` / `toBuy` null branches.

## Not blocking

- **Every value is `var(--*)`** from `globals.css`, transcribed with all six theme blocks and a
  `theme` prop on the addendum canvas so each can be checked.
- **Targets:** decline 44px phone / inline desktop; bulk restore 44/30px; confirm answers 44/30px,
  matching `game-history-row.tsx` exactly. **The decline is never adjacent to the commit**, and the
  confirm answers are never adjacent to the sweep.
- **Two tab stops per candidate row**, in reading order: tick, then decline. The decline is a real
  `<button>` **outside** the row's `<label>` — inside it, every tap on the word would toggle the
  tick as well.
- **One new announcement**, for the bulk restore only: up to 38 rows changing shape at once is the
  largest visual change on the surface. The single decline already announces and is unchanged.
- **The cap line keeps `capLineId` at both widths** — it is the `aria-describedby` target of every
  inert tick box.
- **Contrast:** every figure and label is full-opacity ink; the only dimmed treatment is the shipped
  at-cap row, whose meaning is also carried by an inert glyph and a sentence.
- **Colour is never the only carrier:** the decline is a word and an underline; a declined row is an
  eyebrow, a word and an announcement; the cap is a sentence and an inert glyph.

## Open items

1. **The locked canvas still carries the retired `#C9A24B` brass** and this addendum does not rebase
   it — read the addendum for hues, the locked file for geometry. `design_handoff_the99_appshell/`
   carries the same debt and is already filed; **this folder should join that pass rather than get
   its own.** The only item here that touches shipped design outside the five gaps.
2. **`commit.consequence` prints at zero ticks** — in S25 the bar reads `68 of 99 when added` while
   nothing will be added. Pre-existing at every zero-tick state and out of scope, but S25 is where
   it reads worst.
3. **The narrowed figure columns are unmeasured against a four-character figure.** `+47`/`31%` fit
   56/40px comfortably; **`+147` is the thing to check before merging.**
4. **`Set aside` is a judgement about register, not a tested string.** It is the inverse verb of
   `Show it again` and avoids every removal word, which is the requirement — but *set aside*, *not
   now* and *skip* are all defensible and only one has been drawn.
5. **The keep-all confirm is the second-best fix.** The best is making keep-all undoable — restore
   the auto flags and the pass membership — after which the confirm goes away. Server-side inverse
   mutation, bigger than an addendum, and the thing to want if the confirm proves annoying.
6. **A restored row comes back unticked** (called above). If players report re-ticking everything
   they restore, seeding a restored *owned* row as ticked is the fallback.
7. **The desktop cap residual is stated, not fixed.** A player 30 rows down a 1,700px list still
   cannot see the head. Three carriers reach them — the row dims, the tick does nothing,
   `announce.capped` speaks — and a sticky head is refused as a second pinned element. This is an
   improvement on *explained 167 rows below*, not a solution.
8. **The bulk restore has no confirm and needs none**, but it is the one control here that changes
   38 rows at once. If it proves easy to hit by accident on its full-width phone row, the answer is
   position, not a confirm.
