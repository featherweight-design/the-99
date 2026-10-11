# READINESS audit: Where an added copy goes (R1 audit, 2026-10-11)

Audited against `docs/superpowers/design-briefs/2026-10-11-where-an-added-copy-goes.md` (main) and the code on
`origin/main` at `bbf0594fe`. Sources read: the four `.dc.html` canvases (data and props only), `STATES-added-copy.md`,
`design-tables/added-copy.md`, both `.ts` copy files, `README.md`, `READINESS.md`.

## Verdict: GREEN

Every deliverable the brief names is drawn, and nothing drawn needs a Design round. The findings below are
engineering's to resolve in the plan, or copy for `/copy-review`. One drawn state (KF3) contradicts Hugh's ruling 4 as
worded; the fix is a string in the same slot, decided below. The drop's README records Hugh's LGTM on 2026-10-11 for
the three items in its own `READINESS.md` (`can use it`, one summary row per card, a lone brew named); this audit
takes that as stated.

## Coverage against the brief

| Brief asks for | Drawn | Where |
|---|---|---|
| The line on Add Cards, I got it, upload summary, 900 + 390 | yes | AC1–AC7, IG1–IG5, US1–US6; every frame imports the scene at 900 and with `phone` at 390 |
| One deck · several decks · a pick made earlier · brews only · nobody | yes | L1–L9; AC1/AC2/AC3–4/AC5, IG1–IG4, US1–US4. IG6 (`claimedMany` + Change) is a STATES row with no frame; it is the shipped sentence plus the shared Change, so no frame is owed |
| Change opening the chooser from each surface | yes | AC6 inline, IG5 modal / sheet, US5 inline |
| Chooser lists every deck that needs the card, brews included (#1442) | yes | `one`, `brews`, `count` variants; senior held decks fold (G7) |
| Only one deck needs it | yes | KF1 (`single` / `singleKept`): Keep it free is the second option |
| Keep it free in the chooser, on a deck, on Shopping, in the summary | yes | KF1/KF2, KF3, KF4, US6 |
| Keep it free is a count | yes | KF2 stepper; STATES Must-nots |
| No verdict word or warning color on a kept copy | yes | every kept-free fact is `--fg-faint` mono. The only `--warning` drawn is the shipped buy tag on KF4's row, which is about the deck, not the copy |
| Select / deselect, never tick | yes | no `tick` anywhere in the drop |
| STATES + design table | yes | `design-tables/added-copy.md` is marked to be committed to `docs/superpowers/design-tables/` by the plan |
| About entry on the per-entry artboard | yes | `The 99 - About · Added Copy Entry.dc.html`, `about · added copy.ts` |
| Open questions 1–5 | answered | README "Open questions, answered" |

**Open question 1 (which deck to name for a soft share).** Design names none when two or more brews read one loose
copy (`is free for the 3 brews that need it`), and names the brew only when it is the sole claimant, still with
`is free for` rather than `goes to`. That is the only form the model can make true: `allocate` gives every brew the
same leftover without taking it (`allocate.ts:30-35`), so `goes to` a brew is false unless the brew was `granted`,
and a lone asker's soft share is genuinely its own. It also matches `receiptFacts`' rule of never naming a brew by its
soft share (`mark-bought.ts:29-32`) for every case the line says `goes to`. Accepted.

## Engineering facts checked on main

All hold as the brief and the README state them: `allocate` reservations first then seniority with brews soft
(`allocate.ts:20-35`, `allocateClaims` `:52`); `owned` returned unreduced (`availability-query.ts:590-591`);
`card_assignments.deck_id` not null with cascade (`schema.ts:1020`); `assignCopyFor` one authored reservation and
`no-supply-left` (`assign.ts:55`, `:184`, `:208`); `receiptFacts` returns `tookCopy` and `stillNeeds`
(`mark-bought.ts:10-46`); `receiptBody` returns null when `stillNeeds <= 0` (`got-it-receipt.tsx:40`), which G1's
`self` / `nobody` bodies change; `isContested` gates the chooser's only door (`summary-read.ts:86`); the summary
payload's `cleared` is per (deck, card) and the payload carries a shape version (`arrivals.ts:112`, `:149-155`);
the Add Cards saved state holds `copies`, `cards`, `entryId` only (`add-cards-sheet.tsx:92`); the availability
marker has four states (`copy/availability.ts:53`); outcome words are "three forms and no more"
(`copy/card-assignments.ts:219`). Tokens `--avail-over-fg` and `--surface-inset` both exist in `globals.css`
(`:95`, `:38`), so the two "Unverified" fallbacks in the drop's READINESS resolve to live values. `ABOUT_VERSION` is
14 on main; 15 is planned by the all-decks cart line and also recommended by Help me choose R2, so this entry batches
into whichever bump the launch makes.

## Findings

1. **eng-resolvable · KF3 contradicts ruling 4 as drawn. Decided.** Ruling 4: decks that need the card still show
   it missing. KF3 replaces the row's availability marker with `1 kept free · Change`. On Your deck the row's
   ownership dot is solid (the player owns 18), so the marker is the only thing on that row saying the deck lacks a
   copy (`none free` for a brew, `short 1` for a committed deck), and KF3 removes it. Decision: the marker keeps
   its shipped state for the deck and gains the kept clause in the same slot, same ink (working form
   `short 1 · 1 kept free`). This is consistent with the drop's own call 6, that deck outcomes are facts about the
   deck and stay as shipped. G6's worry that `none free` beside `1 kept free` contradicts the noun is a wording
   question for `/copy-review`, not a reason to drop the deck's fact. No layout change.
2. **eng-resolvable · The deck Keep it free uncovers is the queue's tail, not the deck the copy went to.** Keep it
   free lowers allocatable supply, so the claimant that loses a copy is the last one served: the most junior brew's
   soft share first, then the most junior committed deck. The fixtures hide this because Brago is both. Every
   outcome and sentence that names "who still bills it" (`row.kept(deck)`, `announcedKept(card, deck)`, the
   chooser's `buys it` after keep) must come from `previewAllocation` with the kept count (G5), never from "the deck
   the new copy went to". When only brews lose a soft share, use `row.keptNoDeck`.
3. **eng-resolvable · G4 is one direction of a two-way rule.** The README covers a deck pick after Keep it free
   (lower the count in the same transaction). The reverse also needs it: selecting Keep it free while a deck holds
   an authored reservation for that copy must drop the reservation in the same transaction, since at one copy the
   keep row and the deck options are one radiogroup.
4. **eng-resolvable · Undo after Change on the receipt.** Undo removes the copy from the collection (Must-not: Undo
   never moves a copy). If Change on the same receipt wrote a reservation, Undo should drop that reservation too;
   otherwise a capped, authored reservation survives the undone add and later takes the next copy ahead of
   seniority, which the player never chose for that copy. Decision: Undo reverts what the receipt did, both writes.
5. **eng-resolvable · G2 payload shape.** One row per card with `went: {kind, decks}` is a new `ArrivalsSummary`
   shape version; stored summaries at the old version must still render (per-(deck, card) rows, no Change). The
   plan names the version bump and the old-shape reader.
6. **eng-resolvable · G3 loader.** Change needs a loader for a card with any claimant, contested or not;
   `loadContestedCard` must not loosen `isContested`, because `countContestedCards` and the summary section count
   on it (`summary-read.ts:131-138`). A sibling loader, not a changed predicate.
7. **eng-resolvable · Keep it free reaches every reader of spoken-for supply.** Brief proposal 5's list (claim SQL,
   `assignCopyFor`'s supply, `committedShortfalls` / `newlyShort`, `shopping.ts`, `shopping-rollup.ts` and the cart,
   `receiptFacts`, `pruneOrphanAssignments`, plus `fill.ts`, `proxies.ts`, `printings.ts`) is built by grep in the
   plan. The capped count (L8, `removalCaps`) is the brief's edge 7 and needs a test that `owned` below the kept
   count lowers the count before any allocation runs.
8. **eng-resolvable · L2 `one each`.** `goesToMany` assumes every deck asked for one. A deck asking for two that
   takes both makes `one each` false; the helper needs a per-deck count form, wording via `/copy-review`.
9. **eng-resolvable · About entry shape.** The proposed entry uses `keyLines`, `specimen`, `phone` and `switch` as a
   string; the shipped `AboutEntry` takes `keys`, a required `width`, figures in `src/components/about/*-figures.tsx`
   keyed by id, and `switch` from the closed `AboutSwitch` union (add `KEEP_FREE_ENABLED`). Same mapping as the
   all-decks cart audit. The caption and keys go through `/prose-pass`; strings inside the specimen come from the
   surface's own copy file (About rule 2).
10. **copy · `/copy-review`.** Every string in `added-copy · copy strings.ts` is a placeholder. For the lane:
    `can use it` (a fourth outcome form, approved by Hugh, so the `three forms` comment at
    `card-assignments.ts:219` is updated, not the word); `bills it` in `row.kept` (a new verb for the buy state);
    `deselect`; the KF3 marker form from finding 1; `goesToMany` from finding 8.
11. **eng-resolvable · Not drawn, specified.** Card detail's `17 in use · 1 kept free` (KF5) and the cart line's
    owned fact (KF6) are specified in the copy file and not redrawn; both are a clause added to a shipped string,
    so no frame is owed. KF4's owned fact borrows `all-decks-cart.ts`' `ownedSome` form; the plan confirms the deck
    Shopping row carries that fact before adding the clause to it.

## Questions for Hugh

None. Open question 1 is answered by the only form the model can make true, and every finding above has one
defensible answer or belongs to `/copy-review`.
