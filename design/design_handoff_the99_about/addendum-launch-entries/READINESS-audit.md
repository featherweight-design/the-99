# READINESS audit — About · launch entries addendum

Audited 2026-09-25 against `origin/main` at `402faef3` (after Locked PR 6, #992). Each claim was checked
against the shipped code, the handoffs, and `boards/overnight-decisions-2026-09-25.md`.

## Verdict: Green on structure. Copy corrections are owed on all three live entries. Two entries are superseded.

| Entry | Verdict |
|---|---|
| A1 Help me choose | **Hold.** It describes the finished feature, and main is not there yet (H1, H2). Four key-line corrections (H3–H6) |
| A2 Locked cards | **Copy fixes.** Key 4 is wrong about discard (L1), and key 1 misplaces the lock on a row (L2) |
| A3 Find a deck for it | **Superseded by the swap v2 addendum.** Not audited. Do not build from this version |
| A4 Cheaper stand-ins | **Superseded by the swap v2 addendum.** Not audited. Do not build from this version |
| A5 Change commander | **Copy fixes.** Four claims overclaim (C1–C4). E2 accepted with conditions (C5) |

Every correction below is to caption or key-line wording. None changes a layout, a specimen or a
placement, so none needs a Design round (per the round-trip threshold). The proposed wording goes
through `/copy-review` with pictures, at build time.

## Structure: all five entries

- **Template (R3 §8, STATES-about-r3 §G).** Every entry fills the §G slots: title, route, `opens`
  where the link lands elsewhere, `width`, caption, and at most 4 key lines (the `about.test.ts`
  limit). The canvas draws a 760 column and a 390 reduction for each. G3 holds: every specimen names
  a shipped component, and E1/E2 are extractions, not forks.
- **Chapters (R6 H3).** Every insert anchor exists: `discover` in 02, and `decklist-marks`,
  `add-cards`, `shopping` and `new-deck` in 03. Page order becomes help-me-choose, locked-cards,
  fits-your-decks, stand-ins, change-commander. So the sheet reads three titles and then
  `and 2 more` (N2), as the README says, and the index lists all five by title only (O1).
- **Counts.** 39 entries become 44. R6 §R9.1's rail fallback (current chapter only) still applies,
  and more so at 44. `about.test.ts:202` pins the entry and figure count in a doc; the build updates it.
- **Copy rule 2.** The specimen strings come from each surface's copy file. `help-me-choose.ts`,
  `locked-cards.ts` and `change-commander.ts` all exist on main.

## Engineering findings

### Every entry: gating
**G1. Resolved by Hugh's ruling on Q4 (2026-09-25): each entry is tied to its feature's switch.**
An entry names its switch and renders only while that switch is on: `HELP_ME_CHOOSE_ENABLED`,
`NEVER_CUT_ENABLED`, `CHANGE_COMMANDER_ENABLED` and `SWAP_TOOLS_ENABLED` (`ABOUT_SHEET_ENABLED` for
the rethink). Staging shows all five. Production shows each one when its switch flips, and that flip
announces it: the "new in About" sheet fires for any visible entry the reader hasn't seen. There is
no batched version bump. **This replaces the single seen-version model.** Switches can flip out of
order, so seen is recorded per reader as entry ids (a `user_prefs` migration). Entries `since` 1–9
keep reading as seen for a reader at version 9 or above. The per-browser sheet dismissal follows the
same model, and the `about.test.ts` hash still forces a deliberate re-pin. The build is replanned on
this model once Q1–Q3 are answered.

### A1 Help me choose
- **H1. The caption's hand-off is not on main.** "Picking one creates the deck and fills it under the
  same answers" is PR 6. Today a pick links to `/decks/new?commander=…&b=&k=&a=&t=`
  (`choose-row.tsx:32-38`), and `/decks/new` reads only `commander` and `select`, so nothing fills.
  No door links to `/decks/new/choose` either, so the "Discover is its other door" line in the
  README is PR 6 too.
- **H2. Key 3 has no UI to point at.** `lookDeeper` and `stopDeeperRead` exist server-side only, and
  #1000 (PR 6a) is still open. Re-check both H1 and H2 when HMC PR 6 merges. The entry must not be
  built before then.
- **H3. "Not by what you own" is false in one shipped state.** With no theme and no card, the list
  IS ordered by ownership: "Ordered by cards you already have" (`present.ts:21-25`). Proposed:
  *"…ordered by how well each fits what you asked, not by what you own. With no theme or card to
  fit, they are ordered by how many of their cards you already have."*
- **H4. Key 1 overstates SETS RANK.** The mark appears only when a row has more than one figure
  (`present.ts:59-62`). Proposed: *"…The weakest figure orders the row, and when there is more than
  one it is marked SETS RANK."*
- **H5. Key 2 has the same exception as H3.** Proposed: add *"unless you gave no theme or card"* to
  "never orders it".
- **H6. Key 4 undersells what ships.** The page offers up to three answers to loosen, each with a
  count, ordered by how many commanders it brings back (`present.ts:97-100`). Proposed: *"When too
  few commanders fit, the page offers answers to loosen, each with how many commanders it would bring
  back, or you can change the answers yourself."*
- The specimen holds: `ChooseRow` takes props and needs only a `CardDetailProvider`.

### A2 Locked cards
- **L1. Key 4 is wrong about discard.** A discard brings a removed locked card back LOCKED (Hugh,
  2026-09-25; `versions.ts:305-308`). What ends a removed card's lock is a commit (`versions.ts:236`).
  Proposed: *"Remove a locked card and bring it back with Undo, Put back or a discard, and it is still
  locked. Once a version is committed without it, the lock is gone."*
- **L2. Key 1 misplaces the lock on a row.** On a row it sits in a slot just left of the ✕
  (STATES:12), not after the name. On a tile it sits on the caption's meta line. "Nothing else about
  the row changes" is also false twice: a locked Shopping row loses its ⇄, and on the review page
  Pull it becomes a `locked` tag. Proposed: *"A locked card shows a closed lock beside its ✕ in the
  list, and on its tile's caption. A locked row offers no stand-ins, and Pull it shows locked
  instead."*
- **L3. "Cheaper stand-ins skip it"** reads as a filtered list. In fact no stand-ins are offered at
  all: no ⇄, no modal door, and Take refuses it. Proposed: *"…a locked card is never offered cheaper
  stand-ins…"*. Re-read this clause against the swap v2 addendum when it lands.
- **L4. An omission, not an error.** The Upgraded climb lists a locked card last, still counts it,
  and says when the locks put the lower bracket out of reach (#974). See Q2.
- Minor: the Lock cards button shows only under the `All` filter (`group-toggle.tsx:139`). The
  caption doesn't have to say so.
- The specimen holds: `LockCardsProvider` takes a fixture value and fetches nothing. The fixture card
  needs `locked: true`.

### A5 Change commander
- **C1. "Every commander in exactly this deck's colors"** overclaims. Candidates also need at least
  20 indexed decks (`MIN_CANDIDATE_DECKS`, Hugh's H2 ruling), an ok synergy state and commander
  legality. Proposed: *"…lists the commanders in exactly this deck's colors that have enough decks to
  measure…"*
- **C2. Key 3's marks are not "free or held".**
  - An owned candidate is marked `free`, or shows the held marker.
  - A candidate already in the 99 reads "in this deck · trades places".
  - A buy tag may have no price.

  Proposed: *"Candidates you own come first, marked free or held, and the rest carry a buy tag. Mana
  value is shown beside each but never sets the order."*
- **C3. Key 4 is true for a single commander only.** A pair with a half in the 98 is never offered,
  and the write refuses it (`write.ts:88-92`). The README says key 4 "stays true once the half-trade
  ships", but `design_handoff_the99_change_commander/addendum-half-trade/` is **not on main**, so
  that can't be checked. Proposed: prefix key 4 with *"For a single commander, …"* until the
  half-trade ships.
- **C4. "Discard puts the old commander back"** fails on a deck with no version. The confirm there
  reads "This deck has no version yet, so there is nothing to discard back to." Proposed: *"…and on
  a committed deck, Discard puts the old commander back."*
- **C5. E2 is accepted, with three conditions.**
  - `Row` in `change-commander-sheet.tsx` takes callbacks (`onToggle`, `onChoose`) and renders a
    `CardDetailTrigger`, so the specimen needs a `CardDetailProvider` and no-op handlers.
  - A second local `Row` lives in `change-commander-review.tsx`, so name the export `CandidateRow`
    as the README says.
  - `ChangeCommanderDoor` calls `useCardDetail()`, which throws outside a provider. The fallback
    `CommanderSection` returns null unless the commander moved, so its fixture needs a `DraftState`
    where it did.

### A3, A4: superseded
Hugh approved swap tools v2 (a land quality ladder, same type first, synergy, and combos and themes
in Find a deck), and a Design addendum revising these two entries is coming. **Nothing is built
from A3 or A4 as drawn here.** E1 (`FitsPlate` / `FitsRows`) is not ruled on; it is re-read with
the revision.

## Product questions for Hugh

1. **Does the page's promise still hold?** The page intro says *"Everything here is scored against
   the cards you actually own"*, and chapter 02's sub says *"Two lanes: what your collection
   already supports…"*. Help me choose orders by fit, not by ownership. Options:
   - keep both lines and treat Help me choose as a door into the lanes (the README's reading);
   - add a clause to the intro;
   - add a clause to chapter 02's sub.
2. **Locked cards and the Upgraded climb (L4).** Should the entry mention that the climb lists a
   locked card last? That uses one of its four key lines, or it stays out and the analysis entries
   carry it.
3. **Change commander on partner decks.** Staging indexes one pair with 20 or more decks, so a
   partner deck almost always sees no candidates. Should the entry mention pairs before the pair
   index is widened, or say singles only for now?
4. ~~What goes out at version 10?~~ **Answered (Hugh): each entry follows its own switch.** See G1.

---

## Revision r2 and the rulings (2026-09-25)

Design's r2 (`about-launch-entries-r2.ts`, `The 99 - About · Launch Entries r2.dc.html`, and the
README's "Revision r2" section) rewrites A3 and A4 for the swap-tools ranking rebuild. Ids,
positions, routes and `since` are unchanged, and the other three entries are untouched. The r2
drop is checked against the orchestrator's rulings rather than against code, because the rebuild
is not built: `design_handoff_the99_swap_tools/addendum_ranking_rebuild/` is not on main yet.
**Re-check both entries against the built ranking before they ship.**

### A3 Find a deck for it (r2)
- **R2-A3-1 (STALE by ruling). Key 3's last clause is false once built.** Find a deck never shows
  the two shares; with no combo and no theme, a row shows the need alone (Hugh). Proposed key 3:
  *"Each deck gives its strongest reason: a combo the card completes with that deck's own cards,
  then the theme it would join. With neither, the deck shows only what it needs. A staple that
  every deck runs says staple instead."* Proposed key 4, so it reads true with or without a
  reason: *"The need is this deck's count for the card's role against its target, left out when
  there's no role. Add uses a free copy if you have one. Otherwise the card joins as one to buy."*
- Key 2 describes the synergy order without quoting a figure, which matches the ruling (synergy
  orders the list and is never shown). KEEP.
- **Open for the build:** what does a row show when it has no combo, no theme and no role? The
  entry must not promise a line the row doesn't draw.

### A4 Cheaper stand-ins (r2)
- Key 4's order (untapped, then tapped, then lands that make a color only once, last) matches the
  ruling, which accepted Design's reading. KEEP.
- **R2-A4-1 (TIGHTEN).** "Each says what it gives up" sits at the end of the LAND key line, so it
  reads as a land-only fact. Every stand-in row shows its jobs, its extra benefits and what it
  gives up (Hugh), and no row shows a percentage. Proposed: move the clause to key 3,
  *"…Each group is led by the cards this commander's decks favor, each says what it gives up,
  and a few show until you ask for all."*, and end key 4 at the ladder.
- r2 dropped "your free copies first", because price is now a tiebreak. Whether owned copies still
  lead is a fact about the rebuilt ranking. Confirm it at build time, and do not restore the claim
  unless the ranking does it.
- **E3 accepted** (export `StandInGroup` unchanged), as E1 and E2 were.
- **The README's open question (does a rewrite need a bump?) is moot.** Under the per-switch
  model (G1) nothing is batched into a version, seen is recorded per entry id, and neither entry
  has been shown to any reader. Once one has, a rewrite keeps its id and is not re-announced.

### Q1–Q3, resolved
- **Q2 (Locked and the climb):** the Locked entry stays about the lock. The climb ordering is an
  ordinary edit to the analysis entry that covers the climb. L4 closes.
- **Q3 (pairs):** #1002 widens the pair index before any production flip, so key 1 and the
  caption may name pairs. **Condition:** #1002 was still OPEN at this writing. The build checks
  that it has merged, and if not, it says singles only.
- **Q1 (the intro against Help me choose):** settled by `/copy-review`, with no finding for Hugh.
  See below.

### /copy-review: the page intro, chapter 02's sub, and A1 (propose mode)

| File | String | Class | Verdict | Replacement / reason |
|---|---|---|---|---|
| `about.ts` pageIntro | "Everything here is scored against the cards you actually own." | Teaching | KEEP | Still true: every surface measures against your collection, including Help me choose, whose every row shows what you own. The line is also **frozen**, quoted verbatim in the merged R6 handoff, so a change would go through Design and not this pass. |
| `about.ts` chapter 02 sub | "Two lanes: what your collection already supports, and what it would support if you bought one card." | Teaching | KEEP | It describes the chapter's lanes, not every entry. The chapter already holds non-lane entries (role coverage, commander availability, partners), so Help me choose joining them breaks nothing. Frozen as above. |
| A1 caption | "…ordered by how well each fits what you asked, not by what you own, and picking one…" | Teaching | TIGHTEN | *"The results are commanders ordered by how well each fits what you asked, and every row shows how much of it you already own. Picking one creates the deck and fills it under the same answers."* This removes the one clause that reads against the intro sitting directly above it, and it absorbs H3. |
| A1 key 2 | "What you own is shown on the row but never orders it: …" | Teaching | TIGHTEN | *"Every row shows what you own: the commander's own mark, how much of its 99 you own, and roughly what the rest would cost. It orders the list only when you give no theme or card."* Absorbs H5. |
| A1 keys 1, 4 | as proposed at H4 and H6 | Teaching | TIGHTEN | Already in this audit. |
| A1 key 3 | "Your sentence is matched for free. A closer read of what's left costs one credit…" | Teaching | KEEP | Accurate once #1000 ships (H2). |

The self-check passes: no cut literals, no two replacements open the same way, and no frozen string
is changed. The intro and the sub stay as they are, and the contradiction is removed inside the
entry. **Nothing here needs Hugh.** The replacements still go through /copy-review with pictures
at build time.
