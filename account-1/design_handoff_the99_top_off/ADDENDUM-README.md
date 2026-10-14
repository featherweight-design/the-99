# The 99 — Top off the last 31 **addendum** (design handoff, Addendum R1)

Five gaps the shipped build and its cold-eyes review surfaced, plus one ratification: **#478** ·
**S25** · **the door note at 390px** · **`commit.slotsStayOpen` at 390px** · **`list.cap`
placement** · and **Keep all 99's inline confirm**. This is an addendum to the shipped handoff, not
a replacement — `The 99 - Top Off.dc.html`, `README.md`, `STATES-top-off.md`,
`LONG-LIST-thirty-one-rows.md` and `top-off · copy strings.ts` are **locked and unedited**.
Everything new lives beside them, prefixed `ADDENDUM-`.

**Counts, once, so they can be checked:** **eleven new keys** — seven for the five gaps
(`decline`, `restoreAll`, `restoreAllAria`, `doorNoteMobile`, `doorNoteAgainMobile`,
`nothingTickedAllDeclined`, `restoredAll`) and four for the ratified keep-all confirm
(`keepAllConfirm`, `keepAllConfirmMobile`, `keepAllConfirmYes`, `keepAllConfirmNo`) — plus **two
edits** and **three ratifications**. One of the five gaps needed no string at all.

File: `The 99 - Top Off Addendum.dc.html` (canvas — pan/zoom). Every gap leads with the phone,
desktop beside it.

**The one-line summary:** *four of the five gaps are the phone, and the fifth is a control the
handoff forgot to draw.*

**Numbering.** The brief calls the shipped handoff R1; the folder's own files say R3, because its
three review rounds shipped as one. This is the first round of the addendum either way.

**Colour.** Every value in the addendum canvas is `var(--*)`, transcribed from `src/app/globals.css`
with all six theme blocks and a `theme` prop to check them. **The locked canvas predates the
rebrand and still carries the retired `#C9A24B` brass** — so read the addendum for hues and the
locked file for geometry. Rebasing the locked canvas is not this addendum's job; it is in the gap
report.

## States delivered

| # | State | Phone | Desktop |
|---|---|---|---|
| 1 | #478 the decline — the collision drawn, then the called treatment | ✓ | ✓ |
| 2 | S25 all-declined, with the bulk restore in the head | ✓ | ✓ |
| 3 | The door note at 390px — shipped, then all three variants | ✓ ✓ | (unchanged; stated) |
| 4 | `slotsStayOpen` at 390px — ladder rung 2 | ✓ | ✓ |
| 5 | `list.cap` — ladder rung 1 at phone, selection head at desktop | ✓ | ✓ |
| 6 | Keep all 99 — at rest and confirming | ✓ | ✓ |

Plus the token / a11y / not-added contract cards.

---

## The rule that decides four of the five

> **At 390px the pinned bar has *one* mono status line, and its tenant is whichever of three facts
> the player most needs right now: the cap, the slots that stay open, or the retired dock — in that
> order.**

Gaps 4 and 5 are both *"this line has nowhere to go at 390px"*, and the bar already carries a line
of exactly that register on the dock notice. **The three are mutually exclusive in practice** — at
the cap no slots stay open, and below it some do — so the ladder costs no height, the bar does not
grow, and `onBarHeight`'s reservation is unchanged.

It is also the only arrangement where the cap is explained **beside the button** rather than 167
rows above it.

**The consequence, stated plainly: the dock notice is rung 3, so at phone it is visible only when a
pass is exactly full.** That is close to retiring it, and it is deliberate. The notice is the only
one of the three that is about a control the player is not currently using; the swap is already
announced on open (`dock.retiredAnnounce`), and **`Cancel` and `Close` are both on screen and are
both the answer to "how do I get quick-add back"**. The assurance and the cap line are stated
nowhere else at 390px.

---

## Decisions log

### 1. #478 → **a worded control in the restore's own register. `Set aside`, never a glyph.**

The handoff drew the declined row in full and never drew the way into it. **A state with no trigger
is a state that does not exist** — eng was right to invent one and right to flag it.

**The collision, precisely.** `decklist-row.tsx`'s remove is a 13px `×` at the row's right edge in
`--border-dashed`, 44×44 at phone. Eng's decline is a 13px `×` at the row's right edge in
`--fg-locked`, 36×44 at phone. Same glyph, same corner, same size class, one surface apart — and
one of them is the only irreversible act in the builder that does not ask. **The fix cannot be a
nicer `×`.**

**So the rule this addendum adds: no glyph-only control on the candidate list.** Removal is a glyph
everywhere in this app; a glyph on a list of cards you have *not* bought is one surface from the
glyph that deletes one you have.

**The declined row already ships the register.** `Show it again` is mono 10.5px `--fg-faint` on a
`1px dashed --border-dashed` underline, and the decline is its exact inverse — so it wears the same
clothes and **the pair reads as one toggle** rather than as an action and its apology.

**Four carriers separate it from removal:** a word not a glyph; a dashed underline, which is this
app's *reversible / unsettled* vocabulary and which removal never wears; the mono figure register
rather than the row's chrome; and at phone a different **position** — line 2, not the right edge.

**Geometry.**

- **Phone:** line 2, right-aligned, the word in a 44px-tall box. Line 2's right end was empty (the
  figures are left-grouped), so the control **costs no height** and **the name line gets 45px
  back** — the 36px box plus its gap, on the row's tightest measure.
- **Desktop:** the slot grows **18 → 60px**, so it needs **42px**, and that comes from **Synergy
  (88 → 56, −32) and Decks (52 → 40, −12)** — both sized for a three-character figure and a header
  word (`+47`, `31%`). 44px recovered against 42px spent, so **2px goes back to the name column**,
  which pays nothing: it is the one measure the parity floor protects. **Slot count is unchanged at
  three**, so the row's gaps do not move, and the column header spacers follow the two figures.

**One lifecycle, three words that never overlap:** the control says `Set aside` (a verb), the state
says `not this one` (a preference), the way back says `Show it again` (a verb). **Never *Remove*,
*Delete*, *Dismiss*, *Hide*, or `×`.**

**`list.declineAria` is ratified verbatim.** Eng's `Set {name} aside` was the right inverse of
`restoreAria`, and the visible label is now the same verb — so the `ENG-INVENTED` marker comes off
rather than the string.

**Rejected: a bordered plate like the game-log delete.** That box is a confirm trigger for a
destructive act, which is the association being severed.
**Rejected: hover-only at desktop.** Unreachable by touch, invisible until found, and it would make
the two widths' affordances differ in kind — the parity defect one surface over.
**Rejected: swipe.** Invisible, keyboard-hostile, and 38 rows of small decisions is where an
accidental swipe costs a candidate.

### 2. S25 → **emptied by choosing is not empty. One honest line, and a bulk restore.**

Today this state renders **38 dashed rows, a disabled button, and a sentence that is false**:
`nothing ticked — the list arrives with what you own already ticked`. It *arrived* that way; the
player has since set every row aside, and the copy describes a moment that has passed.

**It is emphatically not state 13.** The pool is not exhausted — 38 candidates are right there,
each wearing its own way back. **`lastSlots.short` must never print here**: *your collection ran
out* would blame the collection for the player's own preferences, which the locked handoff names as
the worst sentence this surface could say.

- **The line** names the state and points at the exit, in the slot the zero-ticked line already
  owns: a third variant on `declinedHere === pool.length`. No new slot, no plate, **no error** —
  nothing has gone wrong.
- **The bulk restore is not a convenience, it is the exit.** Declines are strip state and survive
  every close, so a player who set 38 aside has poisoned their own list *persistently*, and the
  only route back was 38 individual taps. `Show all 38 again` is the mirror of `Clear all ticks`
  and belongs where the bulk controls already live.
- **It appears at one decline, not at 38.** Gating it on the all-declined case would hide the
  general control to serve the extreme one; a player with six declines wants it just as much.
- **The two fixtures stay in place, disabled** on their own shipped rules (`tickable === 0`,
  `tickedCount === 0`). The head does not change shape because the player declined things.
- **At phone the restore wraps to its own full-width row.** A conditional control appearing should
  not squeeze the two fixtures into 116px.
- **The strip and the door do not change.** Still `Choose the last 31`, and the reopen note already
  promises *declines and all* — which is now a promise with a way out of it.

### 3. The door note at 390px → **the promise outranks the provenance; three strings become two.**

The desktop sentence carries three clauses and runs three mono lines at 390px. **A shorter one that
is still two lines buys nothing**, so the test is which clause survives alone.

- **The promise survives.** *Nothing is added until you say so* is the entire reason the review step
  exists and is carried **nowhere else on the surface** — not in the caption, not on the door, not
  in the head.
- **The provenance does not need to.** *all from your collection* is carried three more ways the
  moment the list opens: 31 filled `--success` dots, the head's `Tick the 31 I own`, and every
  unticked row's buy tag. The count stays, because it is what the sentence is about.
- **Three desktop strings collapse to two at phone** — the part worth auditing. The two reopen
  variants differ only in an ownership figure, and **the closed caption directly above already
  states the candidate count**, so the phone reopen note drops the figure and keeps the clause that
  matters: the selection survived. One string, both cases.

Measured at mono 10px inside the strip's 366px: the longest form is 56 characters ≈ 336px. **Every
count fits one line.**

**Rejected: truncation or a "more" disclosure.** A safety promise behind a tap is not a promise.
**Rejected: dropping the note at phone.** It is the only thing on the closed strip that says a tap
is safe, and phone is where the door is most likely to be tapped by someone who never saw the
desktop version.

### 4. `commit.slotsStayOpen` → **yes it belongs at 390px, and it needs no new string.**

The brief's instinct is right: **this is the one line a hesitant player most needs, and mobile is
where hesitation is highest** — the phone reader has 38 rows below the fold and a bar telling them
they are about to add 27 cards.

**Measured** at mono 10.5px: the longest form is `31 slots stay open — you can come back to them`,
45 characters ≈ 281px, inside the bar's 366px. The singular already exists. So **one class comes
off** (`hidden md:block`) and the line joins the ladder at rung 2. Desktop is untouched — it keeps
the line at `md:ml-auto` in the commit row, where it has its own end of a wide row.

### 5. `list.cap` → **the bar at phone (rung 1), the selection head at desktop.**

**Eng's own copy note already found half of this** and it is ratified: the count was cut because it
repeated `head` word for word at desktop and `headMobile` word for word in the bar directly below,
so the one thing the line was for arrived third. The other half is that the surviving instruction
sits **below all 38 rows**, so a player who taps an inert box at row 3 gets no answer at all.

- **Phone: the pinned bar.** Pinned means always visible the instant the cap is hit.
- **Desktop: the selection head**, after the counts, behind a `1px --border-strong` divider (not a
  middot — it is a different kind of statement from the figures beside it). Desktop has no pinned
  bar, and the head is the one element always directly above the rows.
- **At the cap the assurance is absent by arithmetic**, so the head's new clause and the commit
  row's old one can never both be present.
- **The residual, stated rather than papered over:** a desktop player 30 rows down a 1,700px list
  still cannot see the head. Three carriers already reach them — the row dims, the tick does
  nothing, and `announce.capped` speaks on the settle — and the `aria-describedby` on every inert
  box is unchanged. **That is a real improvement on *explained 167 rows below*, and it is not a
  fix.**

**Rejected: repeating the line on every inert row.** Up to thirty copies of one sentence.
**Rejected: a sticky selection head at desktop.** A second pinned element, which the locked
LONG-LIST refuses at any width, to solve a case three carriers already cover.

### 6. Keep all 99 → **the inline confirm ratified, with two amendments.**

**The pattern is right and the diagnosis is right.** `game-history-row.tsx`'s inline confirm is this
app's only confirm vocabulary, and its own header comment states the case it was built for: the row
is the only correction path, so the question lives in the row rather than in a dialog. **Keep all is
that case exactly** — a bulk act, in a toolbar, with no undo.

**Amendment 1 — the confirming button must not take `--danger`.** In the game log it is a delete.
**Keeping is a graduation, not a deletion** — the ruling the ledger rests on — and it destroys no
cards. Danger ink would say *this loses cards*, which is the one thing it does not do; what it loses
is the record. So both answers take `BULK_BUTTON_CLASS`'s own treatment (`1px --border-strong`,
`--fg-body`), and the toolbar goes on recommending neither answer — **which is that constant's own
stated reason for existing.**

**Amendment 2 — the question must name what is lost, in the words the surface uses.** Not *the
ledger*, an internal noun that appears nowhere on screen: the same trap eng caught in
`seedReversal`, where *the sweep* pointed at a control labelled `Clear all auto`. The ledger's
header says *Where these 99 cards came from*, so the question says **the record of where they came
from**.

**The asymmetry is the rule, not an inconsistency.** `Clear all auto` gets **no** confirm, because
it already ships `SweepReceipt` with an undo. *Confirm where there is no undo; receipt where there
is.* Two destructive-looking neighbours, two treatments, for a reason a player can feel.

**Also ratified from the shipped confirm:** the question replaces **both** bulk controls rather than
only the one tapped — the shipped `busy` rule already disables the pair, for the reason its own
comment gives (they read the same count and act on the same rows). Focus moves to `Keep them` on
open and back to `Keep all 40` on cancel, because the trigger unmounts.

---

## Component notes

Hexes live only in `globals.css`; everything below is `var(--*)`. **No new token, no new
dependency, no new motion, no new glyph.**

| Component | Spec |
|---|---|
| **Decline control** | A real `<button>` **outside** the row's `<label>` (inside it, every tap on the word would toggle the tick too). Mono 10.5px `--fg-faint`, `1px dashed --border-dashed` bottom, transparent, no border, no plate. Hover `--fg-body`. Label `Set aside`; name `list.declineAria`, unchanged. |
| **— phone** | Line 2, `margin-left:auto`, `min-height:44px` on the word's own box. **The right-edge box is deleted**; the row's `pr` returns to `10px` and the name line gains 45px. |
| **— desktop** | A `60px` right-aligned slot inside the 34px row, replacing the 18px glyph slot. Column header spacer widens to match. |
| **Row columns (desktop)** | Synergy `88 → 56px`, Decks `52 → 40px`. Tick 18 / dot 7 / name `flex-auto` / cost 40 / availability 84 are **unchanged**. |
| **Bulk restore** | A third `GhostButton` in the selection head, right of `Clear all ticks`. Mono 11px `--fg-body`, `1px --border-strong`, radius 8px. `44px` phone on its own full-width row (`flex-wrap`), `30px` desktop inline. Present when `declined.size >= 1`. |
| **S25 line** | The zero-ticked slot's third variant, mono 10.5px `--fg-locked`, `mt-[9px]`. No plate, no border, **no `--danger`**. |
| **Door note (phone)** | Unchanged geometry — mono 10px `--fg-locked`, `mt-[9px]`, `leading-[1.55]`. Two strings instead of three; one line at every count. |
| **The bar's status line** | Mono 10px `--fg-locked`, `order-1`, one line, one height. Tenant by priority: `atCap` → `list.cap`; `openSlots - tickedCount > 0` → `commit.slotsStayOpen`; else → `dock.retired`. |
| **Cap line (desktop)** | In the selection head after the counts, mono 10.5px `--fg-locked`, `border-left 1px --border-strong` with `padding-left 12px`. **Keeps the `capLineId`** — it is an `aria-describedby` target at both widths. |
| **Keep-all confirm** | `game-history-row.tsx`'s inline confirm verbatim, **minus the danger ink**: question 11.5px `--fg-body`, then two buttons — `Keep them` (`1px --border-strong`) and `Cancel` (`1px --border`) — both `min-h-44px` / `md:min-h-30px`, `px-14px` / `md:px-10px`, radius 7px. Replaces both bulk controls. `MutationError` beneath on refusal. |

## Notes for engineering

- **`top-off-list.tsx`:** the decline button loses its glyph, its `w-[36px]` box and its
  `self-stretch`; it becomes the worded control at line 2 (phone) / a 60px slot (desktop). The
  `md:order-*` chain is unchanged — only the last slot's width and content move.
- **`onDeclinedChange(new Set())`** is the whole bulk restore; no new action, no server call.
  Ticks are **not** restored with it — a restored row returns unticked, because the player's tick
  was replaced by a decline and re-seeding would put cards back in a pass they removed them from.
- **The cap line must render at both widths** (`capLineId` is an `aria-describedby` target). It
  moves from after the rows to two responsive homes; do **not** make it `md:hidden` in one of them
  and drop the id.
- **`slotsStayOpen`:** delete `hidden md:block`, move to the status-line slot, and gate the three
  tenants in one ternary rather than three sibling conditionals — otherwise two can print.
- **`clear-auto.tsx`:** `ClearAutoButton` gains a `confirming` state and swaps **both** bulk buttons
  for the question. `busy` already covers the in-flight disable of the pair.
- **Copy** lives in `src/lib/copy/top-off.ts` and `recommendations.ts` — see
  `addendum · copy strings.ts` for the eleven new keys (seven for the five gaps, four for the
  ratified keep-all confirm), the two edits and the three ratifications.
  Nothing in the locked copy file is deleted.
- **Untouched:** the ledger and every `ledger.*` string, `AutoTag`, `SweepReceipt`, `commitTopOff`,
  the frozen-pool rule, the illegal row, the refusal plate, `onBarHeight`, `builder-spine.tsx`, and
  the whole of `/commanders`.

## Accessibility contract

```
div.row
  label
    input[type=checkbox][aria-label="Five generic and one blue. Shark Typhoon.
      Not in your collection, $6.10. Synergy plus 34 points. In 29% of decks."]
  button[aria-label="Set Shark Typhoon aside"]        44px tall phone / inline desktop

div.row[declined]
  span (mono, "not this one")
  button[aria-label="Put Cyclonic Rift back on the list"]

div.head
  button[aria-label="Tick all 24 candidates you already own"]
  button "Clear all ticks"
  button[aria-label="Put all 38 declined candidates back on the list"]
  p#top-off-cap  "Untick one to swap another in"        ← aria-describedby target

span.toolbar[confirming]
  span (11.5px, "Keep all 40? You'll lose the record of where they came from.")
  button "Keep them"    ← receives focus on open
  button "Cancel"       ← returns focus to `Keep all 40`
```

- **Two tab stops per candidate row**, in reading order: tick, then decline.
- **The bulk restore announces** — 38 rows changing shape at once is the largest visual change on
  the surface: *"38 candidates back on the list. 0 of 31 ticked."* A single decline already
  announces (`announce.declined`) and is unchanged.
- **The ladder changes nothing spoken.** `announce.capped` still fires on the settle; the inert
  box's `aria-describedby` still resolves.
- **Targets:** decline 44px phone / inline desktop; bulk restore 44/30px; confirm answers 44/30px.
- **The decline is never adjacent to the commit** at either width, and the confirm answers are never
  adjacent to the sweep — the question replaces both bulk controls.
- **Colour is never the only carrier:** the decline is a word and an underline; a declined row is an
  eyebrow, a word and an announcement; the cap is a sentence and an inert glyph.
- **Focus** is the global `:focus-visible` from `@layer base` — 2px `--accent` at +2px, not
  overridden anywhere here.

## Gap report

1. **The locked canvas still carries the retired `#C9A24B` brass**, and this addendum does not
   rebase it. Read the addendum for hues and the locked file for geometry. `design_handoff_the99_appshell/`
   has the same debt and is already filed; **this folder should join that pass rather than get its
   own.**
2. **`commit.consequence` prints at zero ticks.** In S25 the bar reads `68 of 99 when added` while
   nothing will be added. Pre-existing at every zero-tick state, not S25-specific, and out of scope
   here — but S25 is where it reads worst, because it sits under a line saying everything is set
   aside.
3. **The decline slot's 42px is paid for by two figure columns**, and I have not seen the shipped
   list at 940px with a three-digit synergy (`+147`) or a two-digit-plus-percent inclusion in the
   narrowed widths. `+47`/`31%` fit 56/40px comfortably; **a four-character figure is the thing to
   measure before merging.**
4. **`Set aside` is a judgement about register, not a tested string.** It is the inverse verb of
   `Show it again` and it avoids every removal word, which is the requirement — but *set aside*,
   *not now*, and *skip* are all defensible and only one of them has been drawn.
5. **The keep-all confirm is the second-best fix.** The best is making keep-all undoable — restore
   the auto flags and the pass membership — after which the confirm goes away. That is a server-side
   inverse mutation and a bigger change than an addendum; **it is the thing to want if the confirm
   proves annoying.**
6. **Restoring a declined row returns it unticked**, which is a call rather than an obvious truth.
   If players report re-ticking everything they restore, seeding a restored owned row as ticked is
   the fallback — but it puts cards back in a pass the player removed them from, which is why it is
   not the default.
7. **The bulk restore has no confirm and needs none** (it adds rows to a list; it commits nothing),
   but it is the one control here that can change 38 rows at once. If it proves easy to hit by
   accident at 390px on its full-width row, the answer is position, not a confirm.
8. **#361's scope is still a one-line summary** in the original brief and the audit has now
   confirmed it clean — recorded here so the last open provenance question in this folder is closed
   rather than merely quiet.

## Files
- `The 99 - Top Off Addendum.dc.html` — the canvas (this addendum's deliverable).
- `ADDENDUM-README.md` — this file.
- `addendum · copy strings.ts` — eleven new keys (7 + 4), two edits, three ratifications.
- `ADDENDUM-READINESS.md` — readiness rating and open items.
- `The 99 - Top Off.dc.html`, `README.md`, `STATES-top-off.md`,
  `LONG-LIST-thirty-one-rows.md`, `top-off · copy strings.ts`, `READINESS.md`
  — the shipped handoff, **locked and unedited**.
