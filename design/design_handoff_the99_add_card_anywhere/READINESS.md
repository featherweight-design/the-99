# READINESS audit: Add a card from anywhere

R2 audit, 2026-10-31. Audited against `docs/superpowers/design-briefs/2026-10-31-add-card-from-anywhere.md` (Hugh's
ruling, the seven states, the six open calls) and against `main` at `4d1a018d1`. The handoff branch was rebased onto
that commit first. The boards were read as source (captions and frame text in `C-Search`, `D-Card`, `Dock`, `Shared`,
`Main`); nothing under `design/` is imported. Design's own readiness note, as dropped, is kept at the end.

## Verdict: ORANGE (engineering resolves every item; nothing goes back to Design)

The drop answers the brief and Hugh approved it (R2, "this LGTM, please open a PR"). Every finding below is a seam the
boards cannot see: a host that lives only under `/collection`, a sheet with no way to start pre-filled, a receipt
slot that two links want. Each has one defensible answer, recorded here for the plan. None is a layout change.
None needs a migration, an API route or a new server action.

## Directions: one combined direction, already picked

R1 offered Hugh a real choice of four, each drawn at 390 and 1300 (`Main.dc.html`, `A-Nav`, `B-Header`, `C-Search`,
`D-Card`). Hugh picked **C with D under it** on 2026-10-31. R2 added the dock's bridge (`Dock.dc.html`). So the
handoff now presents **one combined direction**. A and B are the R1 record and are not built.

What the player gets:
- **Search adds (C).** Every search result row gains a + at its end. It opens Add cards with that card on the list
  and its printing step open. The open search also gains an *Add several cards* row above Recent cards, for a pack.
  Done brings the search back as it was, with the row now reading ×1 owned.
- **Card details adds (D).** *Add to collection* (or *Edit copies*) on the card details receipt, wherever card
  details opens with the shell (own deck, a friend's deck, search, the cart). Not on the public card page.
- **The dock's bridge.** On a deck page, with Owned only on and no owned match, one extra press, *Add a card to your
  collection*, opens Add cards with the typed name carried. Back in the dock, the card shows owned, ready for the
  deck's own Add.

Still open for a pick: only C's ⌘↵ keyboard add (Design's open question 2). Engineering decides it in item O4,
because the + cannot reach assistive tech without it. Hugh can still overrule. Reach (open question 3: a friend's
deck yes, the public card page no) is settled by the approved R2 frames.

## Coverage against the brief

| Brief asks for | Drawn | Where / note |
|---|---|---|
| Ruling 1: add from anywhere | yes | C reaches every page through the shell's search; D reaches every card details with the shell; the dock bridge covers a deck page |
| Ruling 2: header crowding | yes | C adds nothing to the header or the bar (C1); B's measured crowd case is the R1 record |
| Ruling 3: 3 to 4 options, phone and desktop | yes (R1) | A, B, C, D, each at 390 and 1300; the menu-item option is A (nav slot); Design says an account-menu row was not explored because of Hugh's rule |
| State 1, at rest | yes | C1 / C-D1, D1 / D-D1, K1 / K-D1 |
| State 2, entry pressed | yes | C3 / C-D2, D3 / D-D2, K3 |
| State 3, card already known, printing required, no default | yes | C3, D3, K4: picker open, Save waits |
| State 4, saved and returned unchanged | yes | C5–C6 / C-D3, D4–D5 / D-D3, K5–K6 / K-D2, S4 |
| State 5, a pack with scan | yes | S1–S3 / S-D1–S-D2; scan is the shipped press beside the sheet's search |
| State 6, switch off | drawn, but has no trigger | C8, D6, K9. `COLLECTION_EDIT_ENABLED` is retired (`src/lib/copy/i-got-it.ts:1-2`). See O7 |
| State 7, offline | phone only | C7 (the shipped `SearchOffline`, `card-search.tsx:595`, `:618`; the desktop frame draws the same box, `search-desktop.tsx:180`). Desktop offline is not drawn; it is the shipped box with no rows, so no + and no Add several |
| Loading / error | as shipped | The search's progress and S6 failure, and the sheet's `printingsFailed` notice and save failure, are unchanged and not redrawn |
| Disabled | yes | Save waits on a printing (C3, D3, S1) |
| Mobile and desktop parity | yes, with gaps | Desktop draws 3 frames per board against 6–9 on the phone. Desktop's missing states (offline, switch off, the no-link receipt, Owned only off) are each the shipped desktop surface. Build them by the phone rule; no Design round |
| Open call 1: four options, a recommendation | yes | `Main.dc.html`: C with D |
| Open call 2: the phone header | yes | C leaves it alone; B measures it at 378px |
| Open call 3: what opens | yes | C and the shell rows open Add cards; D keeps Edit copies (`Shared` calls) |
| Open call 4: per card and per list | yes | Both: D and C's + per card, Add several and the dock bridge per list |
| Open call 5: after saving | yes | The row reads ×1 owned; a brief ring on the changed row is the only new piece |
| Open call 6: reach | yes | Every signed-in shell surface, a friend's deck included; not `/card/[slug]` |
| Copy | DRAFT | Four new strings (O8) go to `/copy-review`. Everything else is shipped copy |
| Accessibility | partly | The +'s name is given (*Add {card} to your collection*). Its place in the listbox is not workable as drawn: see O4 |
| About entry | addressed | The brief says "An About entry: Hugh decides at launch." Design's note repeats it. No label or entry is written or changed in this drop. Under the About visual rule (`docs/agents/design-pipeline.md:5-13`) that is Hugh's call at launch, so it is not an open item here |

## Engineering facts checked on main

Each holds unless the finding below says otherwise.
- `CardDetailProvider` passes `onEditCopies` only when mounted with `collectionEdit`
  (`src/components/cards/card-detail-provider.tsx:1854`). The one caller that sets it is `CollectionClient`
  (`src/components/collection/collection-client.tsx:90`), from `src/app/collection/(list)/page.tsx:166`.
- `EditCopiesHost` is lazy (`card-detail-provider.tsx:140`) and is rendered by the provider itself
  (`:1987`). So it already mounts wherever a provider is. Design's note says it "must mount wherever the provider
  does"; that is true today and costs nothing.
- `EditCopiesHost` settles the write itself (`settleCollectionWrite`, `src/components/collection/edit-copies-host.tsx:51`).
  That calls `invalidateCollectionReaders` (`src/app/collection/edit-actions.ts:44`), which covers `/decks/[id]`
  and `/friends/[publicId]/decks/[deckId]` (`src/lib/collection/invalidate.ts`). So a deck row's dot moves after a
  D save with no new invalidation.
- The receipt heading has one link slot: `onEditCopies` OR `receiptLink` (`src/components/cards/card-modal.tsx:250-271`).
  `receiptLink` is suppressed whenever the edit link is on (`card-detail-provider.tsx:1860`). The receipt draws even
  with nothing to report once either link is set (`card-modal.tsx:288`).
- There are 21 `<CardDetailProvider>` mounts. They include the search layer's own (`src/components/card-search/search-layer.tsx:72`),
  the deck page (`src/components/decks/builder-shell.tsx:1660`), a friend's deck (`src/components/social/friend-deck-view.tsx:92`)
  and the cart (`src/components/decks/cart/cart-view.tsx:564`). There is no single shell-level provider.
- The public card page `src/app/card/[slug]/page.tsx` mounts no provider. It is public in `src/proxy.ts:38`, as are
  `/commander/`, `/friend/` and `/join/`.
- The search result row is one `role="option"` with `tabIndex={-1}`, driven by `aria-activedescendant`. Its contents
  are presentational, and the bookmark is `aria-hidden` for that reason (`src/components/card-search/search-row.tsx:66-126`).
- The shell mounts `CardSearchRoot` at `src/components/shell/shell.tsx:151`. That is the natural home for a
  shell-level Add cards host. `onCardDismissed` reopens the search as it was (`card-search.tsx:286`).
- The search's results are read once per query (`searchAllCardsAction`, `card-search.tsx:216`). The recents'
  signals are re-read on each open (`:193`).
- `AddCardsSheet` add mode takes `onClose`, `onSaved`, `returnFocusRef`, `totalCards`, `preconPick` and `scan`
  (`src/components/collection/add-cards-sheet.tsx:64-80`). It has no initial card or initial query. `pick()` refuses
  any card that is not from the sheet's current search (`:291-293`).
- The sheet's callers are `collection-place-head.tsx:300`, `collection-empty-doors.tsx:93`,
  `home/first-run-step-one.tsx:113` and `edit-copies-host.tsx:62`. `/collection` passes `scan` and `preconPick`
  unconditionally (`src/app/collection/(list)/layout.tsx:43`).
- The Edit copies toast with Undo (`CollectionEditToast`) is drawn only by the Collection place head
  (`collection-place-head.tsx:298`).
- The dock's `noResults` empty state draws *Search all cards instead* only while `ownedOnly`
  (`src/components/decks/quick-add-bar.tsx:444`; `dropFilter`, `src/lib/copy/decks-builder.ts:290`).
- Shipped copy the boards reuse exists: `copies.addToCollection` and `sheetSubNone`
  (`src/lib/copy/collection-edit.ts:478`, `:484`), `copies.saved` (`:496`), and the way-row lead *Have a file?* (`:415`).

## Findings

**O1 · eng · D's toast has no host off `/collection`.** D4 and D-D3 draw the shipped *Saved. {card} ×1.* toast with
Undo over a deck page. `CollectionEditToast` is drawn only by the Collection place head (`collection-place-head.tsx:298`),
so on any other page `announceEditToast` would draw nothing. Decided: mount one toast host in the shell, beside
`DeckToastStackHost` (`shell.tsx:185`), and take the place head's copy out so `/collection` draws it once. Undo is
the shipped one.

**O2 · eng · Shopping already uses the receipt's one link slot.** The deck's Shopping rows register *Bought this
card?* in the slot D wants (`src/components/decks/got-it-door.tsx:1-10`, `:95`). Line 1860 drops it whenever the
edit link is on, so turning D on everywhere would delete I got it's second way in. Design names Shopping in D's reach
but draws no Shopping frame. Decided: a card opened from a Shopping row (`door`) keeps *Bought this card?*. I got it
already puts the copy in the collection and also marks it bought, so it is the better add there. Every other open
draws D's link. This is the only defensible reading, so it does not go back to Design.

**O3 · eng · D's reach is 21 provider mounts, not one prop.** Design's item 1 reads as one prop on one surface.
Decided: `collectionEdit` becomes on by default for every provider inside the shell (signed in, below `CardSearchRoot`),
the search layer's included. A provider outside the shell keeps it off, so public pages draw no link. The current
guard (`sheetsBelow === 0 && partnerOf === null`) is kept. A test pins the public card page as having no link.

**O4 · eng (Hugh may overrule) · the + cannot be a button inside the option.** A row is a `role="option"` whose
contents are presentational (`search-row.tsx:3-4`, `:117-118`), so assistive tech never sees a button inside it.
Design's "Tab reaches each row's + after its row" also contradicts the listbox model: rows are `tabIndex={-1}` and
focus stays in the field. Decided:
- The + is a pointer target that stops propagation, kept out of the accessibility tree (`aria-hidden`, `tabIndex={-1}`).
- **⌘↵ / Ctrl ↵ is kept** as the keyboard and assistive-tech way to add the active row. The row's name gains the
  add clause, and the foot line reads *↵ to open · ⌘↵ to add*.
- Dropping ⌘↵, which is Design's open question 2, would leave C unreachable without a pointer. That is why
  engineering decides it here.

**O5 · eng · the sheet cannot start with a card or a query.** C's + needs the sheet to open "with that card on the
list, printing step open". The dock bridge needs it to open with a query typed. `AddMode` has neither prop, and
`pick()` refuses a card from outside its own search (`add-cards-sheet.tsx:291-293`). Decided: add `initialCard` (an
oracle id plus name, run through the same printing load that `pick` uses) and `initialQuery`. The sheet's steps,
copy and save rule are unchanged, as the brief requires.

**O6 · eng · "rows read ownership live" holds only for recents.** Results are read once per query
(`card-search.tsx:216`), so a saved card's row would still read *not owned* until the query changes. Decided: on
return from a sheet that saved, the search re-runs its read (the existing `attempt` re-run) and re-reads the recents'
signals. The dock does the same on return (K6). It must, or the deck's Add would not see the new copy.

**O7 · eng · no switch.** The brief's "switch off" state has no trigger, because `COLLECTION_EDIT_ENABLED` is
retired (`i-got-it.ts:1-2`). Adding a new switch needs Hugh first, and an improvement rides its line's switch or
none. This line has none, so the build ships without one. C8, D6 and K9 are what main shows today, so they are the
before state for the probes.

**O8 · eng via `/copy-review` · four DRAFT strings.** *Add {card} to your collection* (the +'s name), *Add several
cards* · *search or scan*, *↵ to open · ⌘↵ to add*, and *Add a card to your collection* (the dock bridge). Each lands
in its own copy module (`lib/copy/card-search.ts`, `lib/copy/decks-builder.ts`). None goes to Hugh.

**O9 · eng · the changed-row ring.** It is drawn on the search row (C6, which reuses the shipped H3 return ring) and
on the deck row (D5, K7, S4). Design marks the deck-row ring optional. It is small, so the plan builds it in PR 4
rather than leaving it out.

**O10 · eng · desktop's undrawn states.** Desktop offline, switch off (O7), the no-link receipt and Owned only off
are each the shipped desktop surface plus the phone rule. Build them that way; `feature-acceptance` names them in
the route × viewport inventory.

No Red items.

## Build PR split

None of these PRs is risky in the review-policy sense: no DB, no migration, no API route, no payments, no auth. The
server actions `addToCollection` and `settleCollectionWrite` are reused unchanged. Each PR gets a Claude review, runs
the design-review skill before `gh pr create`, and runs `feature-acceptance` at both widths. The PRs are sequential,
each branched from `main` after the one before merges, so nothing is stacked.

1. **D: card details adds everywhere (O1, O2, O3).** `card-detail-provider.tsx` (the default and the door rule),
   `card-modal.tsx` if the heading needs it, `edit-toast.tsx`, `shell.tsx` (the toast host),
   `collection-place-head.tsx` (drop its toast copy), `collection-client.tsx`, and tests (provider, modal, the
   public card page, the Shopping door). About 8–10 files, about 350 lines.
2. **A shell Add cards host and Add several cards (O5, O8 part).** `add-cards-sheet.tsx` (`initialCard`,
   `initialQuery`), a new shell host component (mounted from `shell.tsx` / `card-search.tsx`), `search-layer.tsx`
   (the Add several row above Recent cards, hidden offline), `search-desktop.tsx`, `card-search.tsx` (closing the
   layer under the sheet and reopening it after), `lib/copy/card-search.ts`, and tests. About 10–12 files, about
   500 lines.
3. **Search adds: the + on every row (O4, O6, O8 part).** `search-row.tsx` (the + at 44px, 34px from `md`),
   `search-layer.tsx` and `card-search.tsx` (⌘↵, the foot line, re-reading on return, the ring), `search-desktop.tsx`
   (the foot line), copy, and tests. About 8 files, about 400 lines.
4. **The dock bridge and the deck-row ring (O6 dock part, O8 part, O9).** `quick-add-bar.tsx` (the press above
   `dropFilter`, opening the PR 2 host with the query, re-running on return), the deck row's brief ring
   (`decklist.tsx` or its row), `lib/copy/decks-builder.ts`, and tests. About 6 files, about 300 lines.

## Context for the builder

- Handoff boards: `C-Search.dc.html`, `D-Card.dc.html`, `Dock.dc.html` and `Shared.dc.html`. `A-Nav` and `B-Header`
  are not built.
- The code these PRs build on: `src/components/cards/card-detail-provider.tsx`, `src/components/cards/card-modal.tsx`,
  `src/components/collection/add-cards-sheet.tsx`, `src/components/collection/edit-copies-host.tsx`,
  `src/components/collection/edit-toast.tsx`, `src/components/card-search/{card-search,search-layer,search-row,search-desktop}.tsx`,
  `src/components/decks/quick-add-bar.tsx`, `src/components/decks/got-it-door.tsx`, `src/components/shell/shell.tsx`,
  `src/lib/collection/invalidate.ts`.
- Prior handoffs whose rules still bind: `design_handoff_the99_card_search` (H3 ring, one row = one press),
  `design_handoff_the99_collection_edit` (§B sheet, §C Edit copies), `design_handoff_the99_card_scan`.

## Errata from the PR 1 build (orchestrator rulings, 2026-11-01)

The PR 1 design review (direction D) found the boards' redraws of shipped parts differing from the shipped code. The
boards are Design's and stay as dropped; these rulings govern the build.

- **E1 · the toast keeps the shipped look.** D4 and D-D3 draw a ✓ in `--success`, `--surface-raised`, `0 6px 0 14px`
  padding, a 12px gap, a 48px minimum height, a `0 14px 34px` shadow, z 40 and an Undo with no underline. The shipped
  `CollectionEditToast` (`edit-toast.tsx`) is kept as it is: no glyph, `--elevated`, its own padding, gap, shadow,
  z-index and underlined Undo. Off a deck page it keeps the shipped centre slot, not the boards' bottom-right desktop
  (left 900, width 376) or 12px phone gutters. The captions call it the shipped toast.
- **E2 · the receipt link and padding stay shipped.** The boards draw the link at weight 500, underline offset 3,
  inline-flex and a 32px minimum on both widths, and the receipt at 14px 16px on desktop. Shipped `RECEIPT_LINK_CLASS`
  (default weight, offset 2, 44px on the phone and 32px from `md`) and the receipt's 18px 20px desktop padding are kept,
  so the link reads the same as on /collection.
- **E3 · Remove from collection stays, disabled.** D3 and D-D2 draw the sheet's foot with Save alone. For a card owned
  in no copy the shipped Edit copies sheet draws `Remove from collection` disabled (`edit-copies-sheet.tsx`, `!owned`);
  that is kept.
- **E4 · the details reopen after a save at both widths.** D-D3 draws the deck page with no card details after the
  save. The shipped flow reopens card details re-read (`EditCopiesHost` → `onReopen`) at both widths, as D4 draws on the
  phone; that is kept.
- **E5 · on a deck page the toast stands in the deck toast stack.** The shipped centre slot would cover the quick-add
  dock on a phone deck page, a case the boards do not draw (D4 draws the toast over card details). On a deck's own
  pages (`/decks/<id>` and below, `onDeckPage`) `CollectionEditToast` draws the toast in the deck toast stack as its
  receipt (`placement="deck"`, `kind="receipt"`): the shipped dock-safe placement, 10px above the dock. The route
  decides, not the provider, so a save from any card details on that page (the deck's, the search layer's, a review
  screen's) lands there. Everywhere else it keeps the centre slot (E1).
  - **The floor keeps one receipt, the newest.** The Add to collection toast and I got it's receipt each claim the
    floor with `DECK_TOAST_CLAIM`, carrying who sent it, and the older one leaves. A toast mid-undo (its revert or
    deck warning open, or I got it's Change chooser) or reporting a failed undo stays.
  - **A sheet over the page holds it still.** The toast's wrapper in the shell and the deck stack are siblings of the
    column `<main>` sits in, so a side sheet's `useInertPage` makes them inert: Undo cannot be pressed and the window
    does not run, as under /collection's head before.
- **E6 · not on the public card page, signed in either.** O3's "not `/card/[slug]`" holds for a signed-in reader too,
  who gets the shell there: `CollectionEditScope` is off on `/card` and below.

## Errata from the PR 2 build (copy-review, 2026-11-01)

- **E7 · Add several cards reads the same at both widths.** C2 draws *Add several cards* · *search or scan* on the
  phone, and C-D1 draws the aside as *search or scan, save once* on desktop. /copy-review settled one wording for both,
  O8's: lead *Add several cards* (KEEP: three words, and *several* is what tells this row from the per-card + that
  opens the same sheet), aside *search or scan* (KEEP: it says Scan is in the sheet, a reason to take this row over
  typing a name). *save once* is CUT: it describes the sheet's one Save, which the sheet's own foot already says, and the
  row only needs to say what the reader can do there. The middle dot is drawn and hidden from screen readers.
  Strings: `cardSearchCopy.addSeveral.lead` and `.aside` (`src/lib/copy/card-search.ts`).

## Errata from the PR 3 build (copy-review, 2026-11-01)

- **E8 · the +'s name and the foot line.** O4 keeps the + out of the accessibility tree, so the +'s name, drawn as
  *Add {card} to your collection*, becomes the last clause of the row's own name, with the keys: *add to your
  collection with Command Enter* (*Control Enter* off a Mac), and the option carries `aria-keyshortcuts`. Both only
  where a keyboard is likely (a fine pointer, or `md` and up): a phone's screen reader cannot press ⌘↵, and its add path
  is the row's own press, card details' *Add to collection* (PR 1), so there the name stays as shipped. /copy-review
  TIGHTENED it: the card's name is dropped, because the row's name already opens with it and a reader arrowing
  through twenty rows would hear each name twice. The desktop foot line reads *↑ ↓ to move · ↵ to open · ⌘↵ to add*
  (*Ctrl ↵* off a Mac) beside the shipped *⌘K opens this from anywhere*: O4's reading. C-D2 and C-D3 still draw the
  shipped *↑ ↓ to move · ↵ to open · esc to close*; a fourth segment does not fit the 540px dropdown beside the
  shortcut line, so *esc to close* is CUT while the + is on (Escape and a press outside still close it). Strings:
  `cardSearchCopy.keysHintAdd`, `.addShortcutMac`, `.addShortcutOther`, `.row.addAria`, `.row.addKeysMac`,
  `.row.addKeysOther`.
- **E9 · the ×1 after a save reads in `--success`.** C6 and C-D3 draw the saved row's count in `--success` beside the
  return ring. It is built so, on the ringed row only, while the ring stands; any other row keeps `--fg-body`.

## Errata from the PR 4 build (2026-11-01)

- **E10 · the dock's bridge.** *Add a card to your collection* is drawn as K2 and K-D1 draw it, at both widths: 44px,
  10px radius, `--border-strong` edge, the 16px plus, 14px above the empty state's body. The plus is drawn in
  `--accent-text`, not the board's `--accent`: it is ink in currentColor, and accent ink reads `--accent-text` (text
  inks addendum R1; `accent-text-sites` guards it), the same ink in five themes. /copy-review
  KEPT the wording: it is the reader's way out of an Owned-only miss, *collection* is what tells it from the dock's own
  Add, and *a card* says nothing is picked yet. Under it the shipped *Search all cards instead* sits 8px below in a 36px
  box, as K2 draws (`.qe` gap and `.lk`), and keeps its shipped weight, color and underline. String:
  `addPanelCopy.quickAddEmpty.addToCollection`. The sheet opens with the dock's trimmed query. While it is up, a press
  in it does not clear the dock's query. Closing it puts focus back in the field with the query and Owned only kept. A
  sheet that saved has the search run again.
- **E11 · the two rings (O9).** The dock row that the re-run brings back owned is ringed `inset 0 0 0 1.5px --success`
  (K6, `.qrow.lit`), and its `×1 owned` reads in `--success` (`.up`), until the reader changes the search in any way
  (types, clears it, flips the filter), as the search's ring lasts until the query changes. A re-run that fails keeps
  the wait for Try again. The deck row rings with the same edge (`.drow.lit`) when its card turns owned under it
  (D5, D-D3, S4), and when it is drawn owned for a card the bridge just saved and the dock then added, once the deck
  has accepted the add and on that deck only (K7); that hand-off lapses after 10s.
  "Briefly" is not drawn: the deck row holds it for 2s, as an edge with no animation, so reduced motion draws it the
  same. A proxied row draws no ring, and clearing or setting a proxy tag (no save) rings nothing.

## Errata from the close-out walk (2026-11-01)

- **E12 · the accent on the + and the ×N.** *Add several cards*' plus is drawn in the board's `--accent`, as a stroke:
  it is a glyph, not text, so it needs 3:1 on the row's `--bg`, which `--accent` holds in all six themes
  (`contract.test.ts` pins it; Phyrexia's `#52827A` reads 4.51). The receipt's `×N` (`card-modal.tsx`, both receipts)
  stays in `--accent-text`, not the board's `--accent`: it is text, and `accent-text-sites.test.ts` fails every accent
  text site, absolutely, because Phyrexia's `--accent` reads under 4.5:1 on its raised grounds (3.89 on `--elevated`).
  The receipt sits on `--bg`, where it would read 4.51, so it is the guard, not this site's contrast, that keeps it.
  In the other five themes the two are one ink, so the receipt reads as the board draws it there.
- **E13 · the phone +'s radius is 10px.** Item 2 of Design's note says an 8px radius; the board's `.addp` draws the 44px
  phone press at 10px, and 8px only at 34px from `md`. The board is the specimen: `search-row.tsx` ships 10px, 8px from `md`.
- **E14 · a card with one printing skips the printing step.** Against brief state 3 (the + opens Add cards with the
  card on the list, "printing step open, no default", C4 and C-D2): the shipped sheet takes a card's only printing as
  the answer, as a pick in its own search does (`add-cards-sheet.tsx`, `choices.length === 1`). With one printing there
  is no choice to make, so the step is not drawn.
- **E15 · the dock's bridge only for a card the dock can list.** K2 offers *Add a card to your collection* on every
  owned-only miss. It is offered only when the same query with the filter off finds a card the dock would list (the
  commander's identity, Commander-legal, a game card: the dock's own search). The answer is kept per query, identity
  and deck, so a miss gone back to reads nothing again. A card the dock can never list (*Abstract Iguanart* on the
  walk) would save and leave the dock reading the same miss with the bridge offered again. A read that fails, or is
  unanswered after the search's own 8s timeout, offers no bridge; *Search all cards instead* stands as shipped. It asks
  whether any match is listable, not whether the card the sheet saves is: the bridge carries the query, not a card.
- **E16 · a Shopping-row open keeps the slot.** O2's "a card opened from a Shopping row keeps *Bought this card?*"
  holds whatever I got it answers for the card: a card a Shopping row opened never draws Add to collection while I got
  it's link is registered, so a card the list no longer bills (a purchase took it off) draws neither link. The open
  stays a Shopping open while paging, so a paged-to card the list does not bill draws neither link either: an edge,
  accepted.

---

## Design's readiness note (as dropped, kept for the record)

### Readiness: add a card from anywhere

**Verdict: Green from Design.** Hugh approved R2 on 2026-10-31 ("this LGTM, please open a PR"): direction **C (search adds) with D (card details) under it**, plus the deck dock's bridge. Boards A and B are kept as the record of R1 and are **not** to be built. Checked against `origin/main` @7bf3c89. No migration, no backend change: the add path, the search layer and the Edit copies sheet all exist. The DRAFT strings go through `/copy-review`.

**The collection edit switch is retired** (`COLLECTION_EDIT_ENABLED`, see `lib/copy/i-got-it.ts:1`). The brief's "switch off" state has no trigger on main, so the switch-off frames (C8, D6, K9) only show what is shipped today. Whether this ships behind a new switch is engineering's call under the feature-switch rule (only where a regression is plausible).

#### For engineering, by item

Sizes: S under 150 lines, M 150 to 500, L over 500, tests included.

1. **D · card details' Add to collection everywhere (S to M, lane cards/collection).**
   - `components/cards/card-detail-provider.tsx:1854` passes `onEditCopies` only when the provider was mounted with `collectionEdit` (only `app/collection/(list)/page.tsx:166`). Pass it on every shell surface: deck pages (own and a friend's), search, Shopping, the cart. Keep `sheetsBelow === 0 && partnerOf === null`.
   - `EditCopiesHost` (lazy, `:140`) must mount wherever the provider does, not only under /collection. Saving refreshes the surface underneath (deck row ownership dot, `$` marker) as `/collection` refreshes its grid.
   - The receipt draws even when it has nothing to report, as on /collection (`card-modal.tsx`, `AvailabilityDetail`), so the link always has a heading line.
   - Not on the public card page (no shell, reader may be signed out).
2. **C · a + on every search row (M, lane card search).**
   - `components/card-search/search-row.tsx`: a 44px press (34px from `md`, 8px radius, `--border-strong` edge, 18/16px plus) at the row's end, after the bookmark box. The row stays one option and one press for card details; the + is its own button and stops propagation. Its name: *Add {card} to your collection* (DRAFT).
   - The + opens the shipped Add cards sheet with that card on the list and its printing step open (the same state as picking it in the sheet's search: `pick(r)`), no default printing. The search layer closes under it; closing the sheet (✕, Done, Escape, save) reopens the layer as it was (query, scroll, the returned-row ring H3), as card details already does.
   - After a save the row reads `×1 owned` (rows read ownership live; refetch on the sheet's save).
   - Keyboard (proposal, Hugh did not rule): ⌘↵ / Ctrl ↵ adds the active row; the foot line reads *↵ to open · ⌘↵ to add* (DRAFT). Drop it if engineering or `/copy-review` prefers.
   - Offline: the layer's shipped offline box; no rows, so no +.
3. **C · Add several cards (S, lane card search).** `search-layer.tsx`: one row above Recent cards (and above the empty state when there are none), the Add cards way-row shape (52px phone, 44px desktop dropdown): plus glyph, *Add several cards* · *search or scan* (DRAFT), chevron. Opens the shipped Add cards sheet empty. Not drawn offline.
4. **Mount the Add cards sheet from the shell (S to M).** Today it is mounted by the Collection head, the empty doors, first run and `EditCopiesHost`. Items 2 and 3 need a shell-level host (beside the search layer) so it opens on any page. Its steps, copy, scan and save rule are unchanged.
5. **The dock's bridge (S, lane decks).** `components/decks/quick-add-bar.tsx:444`: in the `noResults` empty state, only while `ownedOnly`, add a ghost press *Add a card to your collection* (DRAFT) above the shipped *Search all cards instead*. It opens Add cards (item 4) with the dock's query carried into the sheet's search. Closing the sheet returns focus to the dock with its query and Owned only kept, and the search runs again, so the card now shows owned with the deck's Add. **The placeholder stays as shipped** (Hugh, R2 review). No collection control on dock rows; with Owned only off, the row's name opens card details, where item 1's link is.

#### Not built

- Directions A (nav slot) and B (header +): not picked.
- The ring on a deck row after a save (S4, D5, K7) is drawn as a brief highlight; it is optional and can ship later.
- About entry: Hugh decides at launch.
