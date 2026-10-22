# Brief: deck details, one message system (deck messages audit, 2026-10-21)

Read-only. Written by the-99-58 for d9, from Hugh's ask: deck details stacks several notices, each drawn differently,
between landing on a deck and seeing its cards. The goal is one message system that is consistent, actionable and
unobtrusive. This audit names what is there and how often it shows. It decides no cuts.

The code was read at `origin/main` 237bcf1cb, by import from `src/app/decks/[id]/page.tsx` through `builder-shell.tsx`.
The counts are from **staging** (`br-polished-pond-a6e63y0b`), read-only, for Hugh's account (21 decks). Hugh's screenshots (phone, 13.png and 14.png) show four blocks above the tabs on one deck: the overcommitted band, the
provenance ledger, the pending-changes card and the mix strip.

## 1. The elements, in one table

There are 18 elements above the tabs (A1 to A18) and 7 groups inside Your deck before the first card group (B1 to B7).
The full per-element detail (file:line, condition, copy keys, actions, tokens, dismissal, co-occurrence, origin) is in
the appendix.

| # | Element | Treatment family | Dismiss | Action | Handoff |
|---|---|---|---|---|---|
| A1 | Remove-failure line | bare `--warning` text, above the header | no | none | recommendations |
| A2 | Header notice tag | pill (`--fact` / `--danger`) | no (reads quiet) | opens notices sheet | deck_notices |
| A3 | Header proxy line | mono `--fg-muted` text | no | none | proxies |
| A4 | Header over line + Proposed cuts → | body text + mono link | no | Analysis › cuts | amendments, tuning_hub |
| A5 | Header Commit as v1 | primary button | no | `/changes?commit=1` | deck_statuses_pending, deck_versioning |
| A6 | Spoken for twice / in other drafts too | band, 3px `--danger` or dashed left rule, glyph | no | See them in Shopping | availability |
| A7 | Where these N cards came from | card, 3px `--accent` left rule, ⓘ disc, nested pass cards | no | Show these / Undo these | top_off |
| A8 | The last N (and the ran-out plate) | card, no rule (plate: `--accent` rule, "i") | no | Choose the last N | top_off, synergy_discovery |
| A9 | The deck is here, the cards aren't | card, 3px `--warning` rule, ⚠ | no | Try filling again | recommendations |
| A10 | Started from the X precon | full-bleed band, ✓ `--success` | ✕ (localStorage) | History | precons |
| A11 | Looks like this started as X | same band, no ✓ | ✕ (localStorage) | Link it | precons |
| A12 | All N lines came over clean | same band, ✓ | ✕ (shares A10's key) | History | deck_import, no_collection_entry |
| A13 | Updated from your list | same band | ✕ (state only) | none | amendments |
| A14 | Pending changes: not yet a version (quiet: "vN · committed") | card, 3px `--accent` rule, eyebrow; quiet full-bleed strip | no | Review / Commit / Discard | deck_versioning, deck_statuses_pending, change_commander |
| A15 | Unresolved lines | card, 3px `--warning` rule, ⚠ | no | Take a look → | deck_import |
| A16 | Recommended mix + Why these numbers? | labelled section, 5 cells | no | cell links, disclosure | recommendations, add_panel |
| A17 | Build your first deck | `.guided-banner` (phone rule; desktop gradient) | no | none | appshell |
| A18 | Moments M1 to M4 | bubble with nib | ✕ (server, per account) | spends on press | discovery_onboarding |

Five visual families are in use above the tabs: bare text, the left-rule card (in three colours, with three different
marks), the full-bleed arrival band, the labelled section, and the bubble. The left-rule colour carries three meanings:
`--accent` for provenance, pending and the ran-out plate; `--warning` for the fill failure and unresolved lines; `--danger` for
the overcommitted band. Only the arrival bands (A10 to A13) and the moments can be dismissed, and they use three different
memories: localStorage, component state, and `user_prefs`.

## 2. Frequency on staging (Hugh's 21 decks)

| Element | Decks showing it | Which / how counted |
|---|---|---|
| A16 Recommended mix | **21 / 21** | always mounted |
| A14 quiet strip "vN · committed" | **11** | a version and no diff from it |
| A14 pending card | **7** | Elves, Goblins, Soldiers, Wizards, Yuriko, Zombies, Mutant Menace (the cards differ from the newest version; commander changes not counted) |
| A4 over line | **3** | Kratos 102, Thorin 102, Mutant Menace 100 |
| A6 spoken for twice | **about 3 (estimate)** | Prismari Artistry (15 cards), Gods (1), Counter Intelligence (1). This is an estimate: newest-version claims compared with collection copies, basics excluded. The shipped rule (`claimModel`, seniority by `since`) needs the loader, and can differ |
| A5 Commit as v1 | **1** | Gishath (99/99, no version, nothing unresolved) |
| A3 proxy line | **1** | Gods (1 proxy) |
| A18 M3 Proposed cuts moment | **up to 3** | unspent for Hugh (`moments_spent` holds suggested-changes and mana-balance, not top-off or proposed-cuts); it anchors on the over decks |
| A2 notice tag | **0 unread or not legal; read tags unmeasured** | `noticeSummarySql` (the tile's) is null on all 21, so no deck holds an unread notice or an illegal card. The header also draws a quiet READ tag while `dataCount > 0` (`headerNotice`, notice-tag.tsx:60-68), which that SQL does not count: those need `loadDeckNotices` |
| A7 provenance ledger | **0** | no `deck_cards.auto` rows on staging (Wizards and Thorin keep `fill_passes` rows, but nothing auto is left) |
| A8 top-off strip, A9 fill failed, A15 unresolved, A17 guided banner | **0** | no deck is short of its body, unfilled or unresolved, and Hugh has more than one deck |
| A10 to A13 arrivals | not countable | URL-driven and client-dismissed |
| A1 remove failure | not countable | transient |

**Worst case today:** Mutant Menace shows 4 at once (the over line, the M3 moment beside Proposed cuts, the pending
card, the mix strip), plus inside Your deck the desktop draft note, the "brass rule" caption and the per-group change notes.
Hugh's screenshot 13 (a deck with auto cards, not on staging) shows the other common stack: overcommitted + provenance + mix.
The heaviest combination the code allows, on a deck just built from a precon with a top-off, is roughly: arrival band +
overcommitted + provenance + top-off strip + pending card + mix + a moment, seven blocks before the tabs.

## 3. Who sees each, when, and what they do next

Evidence for every row is in the appendix's **Who/when** and **Duplicates** lines.

- **Acted on as a next step:** A14 pending (Review / Commit, the one real call to action on a committed deck), A5 Commit
  as v1, A8 the last N, A9 Try filling again, A15 Take a look, A4 Proposed cuts. Each is a decision the deck is waiting on.
- **Status, rarely acted on:** A14's quiet strip (11 of 21 decks, says the deck matches its version; the Versions tab and the
  status pill say the same), A3 the proxy line (the rows' P tag and the key line say it too), A16 the mix strip (on every
  deck; its cells link out when a role is short, and the Land cell offers Mana Balance even when its target is met,
  role-counter-cell.tsx:67).
- **Duplicates another surface:**
  - A6 overcommitted: the Shopping list draws the same spoken-for cards, and every affected row carries the `short` marker. Its only action is to go to Shopping.
  - A7 provenance: the toolbar's Clear all auto / Keep all and Shopping's intro line.
  - A11 precon suggestion: the Versions tab's "Link a precon" row.
  - A14 pending: the toolbar note, the list caption and the group notes inside Your deck, plus the review page and the Versions tab.
  - A2 notice tag: the `/decks` tile mark and the Analysis tab's press note.
- **Arrivals (A10 to A13):** one-time receipts after an action the player just took. They are dismissible, but each uses a
  different memory, and A10 and A12 share one key.

## 4. Other findings (reported, not fixed)

1. The phone gets neither toolbar note: the draft note "N of these differ from vN" (group-toggle.tsx:334) and the kept note (clear-auto.tsx:155-158) are both `hidden md:inline`. On desktop a draft note blanks the kept note (group-toggle.tsx:346).
2. The mix strip's draft note and source line are desktop-only (role-counter-strip.tsx:73-92).
3. A10 and A12 share one localStorage key (`arrivalDismissKey`), so dismissing one hides the other on that deck.
4. Partner decks: "0/99" (the guided banner), "N of 99" (the ran-out line) and "over the ninety-nine" all say 99 where the body is 98.
5. The unresolved banner says "either tab below", but there are up to five tabs now (deck-import.ts:387-393).
6. Copy outside `src/lib/copy`: the guided banner's text (hardcoded) and the mix source line (`src/lib/decks/mix.ts`).
7. Em dashes open all four Why these numbers? lines. This is deliberate: the rationale is quoted copy and must not be "fixed" (decks-builder.ts:110-114). It is listed only because it is a sixth treatment Design should know about.
8. Dead copy: `topOffCopy.ledger.passRecountedAllKept` (top-off.ts:436).
9. Placement: A1 sits above the header, away from the row that failed. A17 sits below the mix strip, unlike every other status message.
10. On first run, three "start here" messages stack: the top-off strip, the guided banner and the empty state.

---

## Appendix: the full inventory

## Mount tree, by import (route to the tab boundary)

- `src/app/decks/[id]/page.tsx` (no `src/app/decks/layout.tsx` or `[id]/layout.tsx` exists; the root shell adds nothing above `<main>` on this route except the moments provider, `src/components/shell/shell.tsx`). The page renders `DeckTokensProvider > LandingKeyed > ChangeCommanderProvider > SwapToolsProvider > GotItProvider > DeckPageSwitches > BuilderShell` (page.tsx:674-835). None of those providers draws a message.
- `src/components/decks/builder-shell.tsx` `return` at :1562. Its column, in DOM order:
  1. sr-only live region `announcement` (:1598)
  2. `MutationError` stack (:1604-1612)
  3. `BuilderSpine` (:1617), which renders `SpineDesktop` (`hidden md:block`) and `SpineMobile` (`md:hidden`) BOTH, then `RollupBands` (builder-spine.tsx:285, :298, :321)
  4. `ProvenanceLedger` (:1708)
  5. `LastSlotsStrip` (:1737)
  6. `FillFailedBannerConnected` (:1774)
  7. `PreconArrivalBand` (:1786), `StripAddedParam` (:1788, draws nothing), `PreconSuggestion` (:1790)
  8. `ArrivalStrip` (:1805)
  9. `UpdateStrip` (:1817)
  10. `PendingBanner` (:1823)
  11. `UnresolvedBanner` (:1830)
  12. `RoleCounterStrip` (:1835), which contains `StripRationale`
  13. `GuidedBanner` (:1869)
  14. `BuilderTabs` (:1873), the tab boundary
  15. Your deck panel (:2041): `EmptyDeckNotes` (:2044) when empty, else `Decklist` (:2205)
  - Below the column, outside the flow: `NoticesBody` sheet (:2329) and `ExportDialog`.

Everything in the column is mounted ONCE and is responsive by class, except the header: the two spines are separate subtrees and both are in the DOM at every width (one is `display: none`).

---

## A. Above the tabs

### A1. Remove failure line ("Sol Ring: We couldn't remove that. It's still in the deck.")

- **Component:** `MutationError`, `src/components/decks/mutation-error.tsx:8`. Mounted by `builder-shell.tsx:1604-1612`, one per failed card, ABOVE the header.
- **Condition:** `removeFailure` state (builder-shell.tsx:1144) non-empty. Set at :1258 when a row's remove refuses; cleared per card on retry (:1158) and wholesale at :1276. Client-only, no switch.
- **Copy:** `${cardName}: ${DECK_REMOVE_FALLBACK_MESSAGE}`; the constant is `src/lib/decks/mutation-result.ts:15` "We couldn’t remove that. It’s still in the deck." (Not in `src/lib/copy`.)
- **Actions:** none.
- **Treatment:** bare `<p role="alert">`, `--warning` ink, 11px/11.5px, no border, no mark, no background.
- **Dismissible:** no; it leaves when the card's next remove attempt starts or the list resets. Not remembered.
- **Co-occurrence / order:** anything. It sits first, above the header, at both widths.
- **Who/when:** a player whose ✕ on a row failed. Next: press ✕ again.
- **Duplicates:** the row itself stays in the list; no other surface.
- **Origin:** H29 (comment at :1606); `MutationError` cites "§Degraded Suggestions Banner" (`design/design_handoff_the99_recommendations`).
- **Count:** not countable (transient client state).

### A2. Header: the notice tag ("● 3 notices" / "● Not legal")

- **Component:** `HeaderNoticeTag`, `src/components/decks/notice-tag.tsx:77`. Mounted in the chips row at `spine-desktop.tsx:547` and `spine-mobile.tsx:146` (both subtrees).
- **Condition:** `notice && onOpenNotices`. `headerNoticeTag = notices ? headerNotice(notices) : null` (builder-shell.tsx:823); `headerNotice` (notice-tag.tsx:60): `violationCount > 0` gives `notLegalUnread|notLegalRead`, else `dataCount > 0` gives `unread|read`, else null. `notices` starts from `initialNotices`, loaded by `loadDeckNotices` (`src/lib/notices/read.ts:86`) only when `showNotices = analysisTabEnabled(env) && noticesEnabled(env)` (page.tsx:310), i.e. `ANALYSIS_TAB_ENABLED` and `NOTICES_ENABLED`. Re-read after mount if the first read failed.
- **Copy:** `src/lib/copy/notices.ts:16-29`: `tag.notLegal` "Not legal"; `tag.count` "1 notice" / "N notices"; aria "N notices since this deck was analyzed. Open notices", "N notices, read. Open notices", "N cards not legal in this deck. Open notices".
- **Actions:** press opens the notices sheet (`openNoticesSheet`, builder-shell.tsx:806, which also marks them read via `openNotices`). `?notices=` opens it on arrival (page.tsx:766).
- **Treatment:** 22/24px pill, mono 10/11px. Unread: `--fact` ink, `--fact` 55% border, a 6px dot. Read: quiet, `--border`, `--fg-locked`. Not legal: `--danger` 70% border, `--danger` 14% wash, `--fg` text, dot when unread.
- **Dismissible:** no; reading it turns it quiet (`read`) and it stays until the notices change. Legality stays until the cards change.
- **Co-occurrence / order:** after the status pill and the bracket chip, same row at both widths.
- **Who/when:** an analyzed deck whose data changed since (Spellbook, catalog) or holding an illegal or off-color card. Next: open the sheet, re-analyze.
- **Duplicates:** the `/decks` tile's `!` mark (`NoticeMark`, notice-tag.tsx:16, `noticeSentence` tooltip); the sheet (`NoticesBody`, builder-shell.tsx:2329); the Analysis tab's press note "see which" (`pressSee`, builder-shell.tsx:1897).
- **Origin:** `design/design_handoff_the99_deck_notices` (HANDOFF §1 cited at spine-desktop.tsx:106); plan `docs/superpowers/plans/2026-09-24-deck-notices.md`.
- **Count:** `noticeSummarySql()` in `src/lib/notices/summary-sql.ts` counts the UNREAD and not-legal states per deck (what the tile uses): `select id, (noticeSummarySql) from decks`. It returns null once data notices are read, while the header still draws a quiet read tag for `dataCount > 0`, so the read state needs `loadDeckNotices` + `headerNotice`. Inputs: `deck_profiles` (`seen_seq`, `notices_read_seq`, `analyzed_oracle_ids`, `rules_version`), `deck_data_changes`, `deck_cards`, `cards.commander_legal`/`color_identity`, `decks.notices_legal_seen`.

### A3. Header: the proxy line ("3 of these are proxies")

- **Component:** inline `<p>` in `spine-desktop.tsx:615-624` and `spine-mobile.tsx:~606-611`.
- **Condition:** `counts.proxiedCount > 0`; `proxiedCount = proxiedCardCount(cards, commander, partner)` (builder-shell.tsx:838). No switch.
- **Copy:** `src/lib/copy/proxies.ts:148-151` `deckHeader.line`: "1 of these is a proxy" / "N of these are proxies".
- **Actions:** none.
- **Treatment:** mono 11.5px, `--fg-muted`, no border, no mark.
- **Dismissible:** no.
- **Co-occurrence / order:** under the progress bar, above the over line.
- **Duplicates:** the rows' `P` tag and the key line's proxy entry (decklist.tsx:295); the `/decks` tile's line (proxies.ts:154).
- **Origin:** `design/design_handoff_the99_proxies`; plan `2026-09-15-deck-proxies-plan.md`.
- **Count:** `deck_proxies` rows per `deck_id` (plus a proxied commander, which `proxiedCardCount` also counts): `select deck_id, count(*) from deck_proxies group by deck_id`.

### A4. Header: the over line ("Two over the ninety-nine. Cut two and it is legal. Proposed cuts →")

- **Component:** inline `<p>` at `spine-desktop.tsx:627-650`; `spine-mobile.tsx:~615-640` (the cuts button is its own centered row there, :625-633).
- **Condition:** `over = built > bodySize` (spine-desktop.tsx:158). The `Proposed cuts →` button needs `onProposedCuts` (builder-shell.tsx:1631-1635), i.e. `PROPOSED_CUTS_ENABLED` and `ANALYSIS_TAB_ENABLED` (`src/lib/tuning/flag.ts:26`).
- **Copy:** `src/lib/copy/decks-builder.ts:434-460` `overCopy.trim.lead` "${words} over the ninety-nine.", `trim.body` "Cut ${words} and it is legal."; `overCopy.figure.delta` "+N" beside the count; `src/lib/copy/tuning-hub-shortcuts.ts:6` "Proposed cuts →".
- **Actions:** Proposed cuts → switches to Analysis and opens the hub's cuts tool (or the panel with the hub off).
- **Treatment:** 11.5px, `--fg-body`, lead bold; delta in the status token (`STATUS_TOKEN[status]`); button mono `--accent-text`, `--accent-dim` underline.
- **Dismissible:** no.
- **Co-occurrence:** status pill reads `Over`; moment M3 anchors to the button (A18).
- **Duplicates:** the status pill and the `+N` delta; the Analysis hub's Proposed cuts tile.
- **Origin:** `design/design_handoff_the99_amendments` and `design/design_handoff_the99_tuning_hub` (both quote "over the ninety-nine").
- **Count:** decks where `sum(deck_cards.quantity) > (99, or 98 when decks.partner_oracle_id is not null)`.

### A5. Header: Commit as v1 (first-commit offer)

- **Component:** `FirstCommitOffer`, `src/components/decks/first-commit-offer.tsx:14`; `spine-desktop.tsx:778` (right action column; Export drops to ghost, :759) and `spine-mobile.tsx:680` (actions row).
- **Condition:** `offerFirstCommit` (builder-shell.tsx:1685-1690): `draft.version === null && deck.built === bodySize && built === bodySize && unresolvedCount === 0`.
- **Copy:** `src/lib/copy/deck-versioning.ts:160` `pending.firstCommitCta` "Commit as v1".
- **Actions:** link to `/decks/[id]/changes?commit=1`.
- **Treatment:** the row's one primary button.
- **Dismissible:** no. Leaves at the first commit.
- **Co-occurrence:** never with A10 (needs no version; A10 needs one).
- **Origin:** `design/design_handoff_the99_deck_statuses_pending`, `design/design_handoff_the99_deck_versioning`.
- **Count:** decks with no `deck_versions` row, no `deck_unresolved_rows`, and `sum(deck_cards.quantity) = bodySize`.

(The rename error hint, `spine-desktop.tsx:723-731` / `spine-mobile.tsx:366`, `--danger`, `role="alert"`, shows only during a failed header rename. Transient.)

### A6. The commitment bands ("N cards here are spoken for twice", "N cards here are in other drafts too")

- **Component:** `RollupBands`, `src/components/decks/builder-spine.tsx:84`, mounted at builder-spine.tsx:319-327, below both spines.
- **Condition:** region only when `overCommitted > 0 || softClaimed > 0`. Computed in `commitments` (builder-shell.tsx:981-1022) over `deck.cards[].availability` with `availabilityState(a, { selfExcluded: true })` (`src/lib/decks/availability.ts:267`): `over` when `a.free < 0`; `soft` when `a.soft > 0`. The soft band is zeroed unless `countStatus(...) === "Building"` (short of the body size). Availability comes from `getDeckDetail` (`src/lib/decks/read.ts`, `loadAvailability` at `src/lib/decks/availability-query.ts:359` with `excludeDeckId`). No switch.
- **Copy:** `src/lib/copy/availability.ts`: `deckRollup.overHeading` = `spokenForTwice` (:37) "1 card here is spoken for twice" / "N cards here are spoken for twice"; `deckSummary.body` (:205) "${card} is on N committed decks and you own N." (one card), `bodyMany` "N of these are on more committed decks than you have copies."; `softHeading` (:409) "N cards here are in other drafts too", `softHeadingAfterOver` "N more are in other drafts too"; `softBody` "Nothing to sort out yet. None of those is past a draft either. Whichever you sleeve first gets them." (phone with an over band uses `softBodyShort`); region aria "Card commitments". Link: `src/lib/copy/recommendations.ts:332` "See them in Shopping".
- **Actions:** See them in Shopping: `setView("deck"); changeFilter("shopping")` (builder-shell.tsx:1693-1700); absent while Shopping is already showing.
- **Treatment:** over band: `--elevated-hover` wash, 3px `--danger` left rule, `AvailabilityGlyph state="over"`, heading `--avail-over-fg`, body `--fg-muted`. Soft band: `--surface`, 3px `--border-dashed` left rule, soft glyph, heading `--fg-body`. Phone: full-bleed, stacked, link on its own line. Desktop: rounded 10px cards with `--border-strong`/`--border`, heading and body on one line, link trailing.
- **Dismissible:** no.
- **Co-occurrence / order:** directly under the header, above everything else.
- **Who/when:** a player whose committed decks claim more copies than they own. Next: Shopping.
- **Duplicates:** the Shopping list draws the same spoken-for cards (`isSpokenFor`, `commanderShoppingRows`, decklist.tsx:33; `introSplit`/`introOnlySpokenFor`, recommendations.ts:307-315); every affected row carries the `short` marker and the card-assignments moment M7 (`decklist-row.tsx:464`).
- **Origin:** `design/design_handoff_the99_availability` (rows 12.9, 12.15, 17.10 cited inline); plan `docs/superpowers/plans/2026-08-13-card-availability-plan.md`.
- **Count:** needs the claim model (`claimModel()` in availability-query.ts, seniority by `deck_version_cards.since`). Not a one-line SQL: run `loadAvailability(userId, { excludeDeckId: deckId, env })` per deck and count `availabilityState(a, {selfExcluded:true}) === "over"` (and `"soft"` for decks short of the body size).

### A7. "Where these 99 cards came from" (the provenance ledger)

- **Component:** `ProvenanceLedger`, `src/components/decks/provenance-line.tsx:53` (`LedgerLine` :173, `LegacyLine` :139). Mounted at builder-shell.tsx:1707-1718.
- **Condition:** `autoCount > 0 && !firstRun` (autoCount = sum of `quantity` over auto rows, :1291), and inside, `cards.some(c => c.auto)`. Lines from `fillPasses` = `readFillPasses` (`src/lib/decks/fill-passes.ts:208`, page.tsx:257). No passes = the legacy line. No switch.
- **Copy:** `src/lib/copy/top-off.ts:380-456` (`ledger`): header "Where this 1 card came from" / "Where these N cards came from"; desktop meta "one pass · N to buy" / "N passes · N to buy"; labels "the seed" / "1st top-off"; seed line "N cards: the roles and the mana base, N to buy." (or no-buy form); top-off line "N cards you chose from the last N, N of them to buy."; recount forms "N cards · N removed since", "· N now yours", "· N now yours, N removed since"; seed reversal "Clear all auto reverses it"; legacy "This deck was built before we started keeping this record. Anything we place from here on is listed below."; controls "Show these N" / "Show this 1", "Undo these N" / "Undo this 1", "Putting N back…"; failure "We couldn’t put those back. The deck is unchanged."
- **Actions:** Show these N toggles a mark on that pass's rows in the list (`onMarkChange`); Undo these N runs `undoFillPass` (top-offs only; the seed names Clear all auto instead) and announces.
- **Treatment:** card 9px radius, `--surface-sunken`, 1px `--border`, 3px `--accent` left rule, `ProvenanceDisc` ⓘ, header `--fg-body`, meta `--fg-locked` (desktop only). Newest line `--elevated-hover` with `--accent-shadow` border and `--accent-text` label; others `--surface`/`--border`/`--fg-faint`. Legacy line dashed `--border-strong`. Phone stacks each line in three rows; desktop flattens with `md:contents`.
- **Dismissible:** no; leaves when the last auto card does (kept or removed).
- **Co-occurrence / order:** after the bands, before the top-off strip. Exclusive with A9 (needs zero cards) and A17 (its gate is `!firstRun`, and first run means zero cards).
- **Who/when:** every deck the fill or a top-off built. Next: mark, undo, or keep in the toolbar.
- **Duplicates:** the toolbar's Clear all auto / Keep all and "N cards are yours now" (`ClearAutoButton`, clear-auto.tsx:66); Shopping's intro "N cards we reached past your collection for" (recommendations.ts:235); the per-row mark "from the seed" (`ledger.markedRow`).
- **Origin:** `design/design_handoff_the99_top_off` (ledger strings in `top-off · copy strings.ts` and `The 99 - Top Off Addendum.dc.html`); plan `docs/superpowers/plans/2026-09-08-top-off-the-last-31.md`.
- **Count:** decks with any `deck_cards.auto = true`, excluding a user's only deck with zero cards. Passes: `fill_passes` (kind `seed|top_off`) + `fill_pass_cards`; legacy: auto rows and no `fill_passes` row.

### A8. "The last N" (the top-off strip) and its exhausted plate

- **Component:** `LastSlotsStrip`, `src/components/decks/last-slots-strip.tsx:146` (inner :154, `ExhaustedLine` :93). Mounted at builder-shell.tsx:1737-1751.
- **Condition:** `openSlots = bodySize - counts.total > 0` (total = cards + unresolved quantities, `deckCounts`, `src/lib/decks/grouping.ts:221`). Exhausted plate when `candidates.length === 0`. Candidates: page.tsx:595 (from `loadDeckSuggestions` / candidate cards). No switch.
- **Copy:** `src/lib/copy/top-off.ts:31-152`: heading "The last N"; caption "N slots open · N candidates ranked by synergy for this commander" (phone "… ranked"; open phone "N candidates · ranked by synergy"); button "Choose the last N ↓"; door notes "N you can sleeve. Nothing is added until you say so.", "You own none of these, so the list arrives untouched. …", "Every copy you own is in another deck, so …" (`doorNoteNoneFree`), reopen "You own N of the N left. The list reopens where you left it, declines and all." (phone "Reopens where you left it, declines and all."); close "Close the list"/"Close". Exhausted: `src/lib/copy/synergy-discovery.ts:191` "N of 99. Your collection ran out N short: there was nothing left in it that EDHREC ranks for this commander." or `top-off.ts` `exhaustedAllNegative` "Everything left that EDHREC ranks for this commander is played less here than in decks generally, so there is nothing worth suggesting."
- **Actions:** Choose the last N opens the inline `TopOffList` (pre-ticks via `chooseBulkTicks`) with its own commit bar, which hides the quick-add dock on phone.
- **Treatment:** 10px card, `--surface-rail`, 1px `--border-strong`, no left rule; eyebrow mono uppercase `--accent-text`; caption `--fg-faint`; button outlined `--accent`; note `--fg-locked`. Exhausted plate: `--surface-sunken`, 3px `--accent` left rule, a hand-drawn "i" disc.
- **Dismissible:** no.
- **Co-occurrence / order:** after the ledger. Moment M1 anchors to the door (A18).
- **Who/when:** any deck short of its body size. Next: open the list, tick, commit.
- **Duplicates:** the mix strip's `consider →` cells and the Consider tab both offer cards for short roles; A9's retry fills the same slots.
- **Origin:** `design/design_handoff_the99_top_off`, `design/design_handoff_the99_synergy_discovery`.
- **Count:** decks where `sum(deck_cards.quantity) + sum(deck_unresolved_rows.quantity) < bodySize`. The exhausted state needs the candidate pool (EDHREC + collection) and cannot be counted by SQL alone.

### A9. "The deck is here, the cards aren't." (fill failed)

- **Component:** `FillFailedBanner`, `src/components/decks/provenance-line.tsx:394`, via `FillFailedBannerConnected` (:461). Mounted at builder-shell.tsx:1773-1779.
- **Condition:** `!firstRun && unresolvedRows.length === 0`, and inside `!filled && !hasCards` (`decks.filled = false`, zero cards). No switch.
- **Copy:** `src/lib/copy/recommendations.ts:226-230`: "The deck is here, the cards aren’t." / "We made the deck but couldn’t fill it. Nothing is lost." / "Try filling again".
- **Actions:** Try filling again runs `fillDeck(deckId)`.
- **Treatment:** 8/9px card, `--surface-sunken`, 1px `--border`, 3px `--warning` left rule, bare ⚠ `--warning`, text `--fg-body`, link `--accent-text`.
- **Dismissible:** no.
- **Co-occurrence:** with A8 (an empty deck has 99 open slots), A6 never (no cards). Exclusive with A7 and A11. Not with A14: a committed deck emptied by hand and never filled shows both.
- **Who/when:** a second-or-later deck that is empty and never filled, which includes every deck a player made by hand and has not added to yet (the comment at :1755-1772 owns this).
- **Duplicates:** A8 offers to fill the same slots; the empty-deck state in Your deck (B6).
- **Origin:** `design/design_handoff_the99_recommendations` (State 15).
- **Count:** decks with `filled = false`, no `deck_cards`, no `deck_unresolved_rows`, whose user has more than one deck (or whose only deck has cards, which contradicts the rest, so: users with ≥ 2 decks).

### A10. "Started from the X precon" (precon arrival)

- **Component:** `PreconArrivalBand`, `src/components/decks/arrival-strip.tsx:150` (renders `ArrivalBand` :72). Mounted at builder-shell.tsx:1785-1787.
- **Condition:** `preconArrival` non-null: `PRECONS_ENABLED` and `?from=precon` on the URL, read by `readPreconArrival` (`src/lib/precons/arrival-read.ts`, page.tsx:323). `added` from `?added=<entry>` and `readPreconAddReceipt` (page.tsx:329). `StripAddedParam` then strips `added` from the URL.
- **Copy:** `src/lib/copy/precons.ts:178-190`: head "Started from the ${name} precon"; body "You own N of its N. The N you don’t are in Shopping." / "You own every card." / with an add "All N cards added to your collection." (plus a catalog-gap clause); meta "${set} · printings: this precon’s copies"; link "History".
- **Actions:** History links to `/collection/history?entry=<id>`; ✕ dismisses.
- **Treatment:** full-bleed band, `--surface-rail`, bottom `--border`, ✓ `--success`, head `--fg` semibold, body `--fg-body`, meta mono `--fg-faint`.
- **Dismissible:** ✕, remembered in localStorage under `arrivalDismissKey(deckId)` (`src/lib/decks/arrival.ts:24`, `useLocalFlag`).
- **Co-occurrence:** usually alone with A8/A7 on a fresh start.
- **Duplicates:** Shopping (the cards to buy); the Versions tab's v0 row.
- **Origin:** `design/design_handoff_the99_precons` (`precons · copy strings.ts`, `Precons R2.dc.html`); plan `2026-10-11-commander-precons.md`.
- **Count:** URL-driven, so not countable as "shown". Decks that could show it: `decks.built_from_precon is not null` (plus `decks.precon_add_entry_id` for the add form).

### A11. "Looks like this started as X." (precon link suggestion)

- **Component:** `PreconSuggestion`, `src/components/decks/precons/precon-suggestion.tsx:24`. Mounted at builder-shell.tsx:1789-1791.
- **Condition:** `PRECONS_ENABLED`, `readDeckPreconLink` (`src/lib/precons/link-read.ts:16`, page.tsx:340) returns `linked === null` and `suggestions.length > 0` (page.tsx:722-724; `pickSuggestions` in `src/lib/precons/link.ts`), and each suggestion not dismissed.
- **Copy:** `src/lib/copy/precons.ts:195-213`: "Looks like this started as ${precon}." / "…, with a different commander."; meta "N of its N cards are in this deck · same commander" / "· led by X"; two: "Looks like this started as one of two precons" / "link the one it came from" + per-row meta; buttons "Link it" / "Link".
- **Actions:** Link it opens `ConfirmLinkDialog`; ✕ dismisses both.
- **Treatment:** `ArrivalBandShell` (same band as A10), no ✓, button outlined `--accent`, ✕ `--fg-muted`.
- **Dismissible:** ✕, localStorage per suggestion (`suggestionDismissKey(deckId, fileName)`).
- **Duplicates:** the Versions tab's foot row "Built from a precon? … Link a precon" (`LinkPreconRow`, builder-shell.tsx:2018; precons.ts:215-219).
- **Origin:** `design/design_handoff_the99_precons` (R3, "the precon link's doors").
- **Count:** decks with `built_from_precon is null` whose `deck_cards` + commanders overlap a precon's distinct non-basics past `pickSuggestions`'s threshold; needs the loader, not plain SQL.

### A12. "All N lines came over clean." (import arrival, plain and owned)

- **Component:** `ArrivalStrip`, `src/components/decks/arrival-strip.tsx:36`. Mounted at builder-shell.tsx:1794-1812.
- **Condition:** `?imported=1` (`arrivedFromImport`, page.tsx:713) and (`unresolvedRows.length === 0` or an add receipt). The owned form needs `NO_COLLECTION_ENTRY_ENABLED` (+ `COLLECTION_EDIT_ENABLED`) and `?added=<entry>` resolved by `readImportAddReceipt` (`src/lib/decks/import-add-receipt.ts:33`). Printing clauses from `?printings=` with `DECK_PRINTINGS_ENABLED`.
- **Copy:** `src/lib/copy/deck-import.ts:344-376`: desktop "All N lines came over clean. Imported from your list a moment ago." (phone "All N came over · from your list, just now"), printing variants; owned: head "All N lines came over clean." or "N cards added to your collection.", body "All N cards added to your collection." / "The lines we couldn’t put a card to added nothing.", meta "Imported from your list a moment ago", link "History".
- **Actions:** History (owned form); ✕.
- **Treatment:** as A10 (band, ✓ `--success`). Plain form: phone mono 10.5px, desktop 13.5px.
- **Dismissible:** ✕, localStorage, the SAME key as A10 (`arrivalDismissKey(deckId)`).
- **Co-occurrence:** exclusive with A15 by construction (an import that came up short gets the unresolved banner instead), unless the owned receipt exists, which draws with A15. A13 is driven separately by `?updated=`.
- **Origin:** `design/design_handoff_the99_deck_import`; owned form `design/design_handoff_the99_no_collection_entry`.
- **Count:** URL-driven. Decks that came from an import with an add: the collection history entry whose source is the deck.

### A13. "Updated from your list: N in, N out." (update arrival)

- **Component:** `UpdateStrip`, `src/components/decks/update-strip.tsx:19`. Mounted at builder-shell.tsx:1817.
- **Condition:** `?updated=` parsed by `readUpdateArrival` (`src/lib/decks/arrival.ts:50`). No switch.
- **Copy:** `src/lib/copy/deck-import.ts:676-688`: "Updated from your list: N in, N out." / "…, N you kept." / phone "Updated: N in, N out" / "Updated from your list.".
- **Actions:** ✕.
- **Treatment:** same band as A10 (inline classes, not the shell).
- **Dismissible:** ✕, component state only (deliberately, page.tsx:727-729); a new update re-shows it.
- **Origin:** `design/design_handoff_the99_amendments` (`STATES-reimport.md`, `deck-reimport · copy strings.ts`).
- **Count:** URL-driven, not countable.

### A14. "Pending changes: not yet a version" (and its quiet form "v3 · committed Oct 2")

- **Component:** `PendingBanner`, `src/components/decks/pending-banner.tsx:267`. Mounted at builder-shell.tsx:1822-1824.
- **Condition:** `draft` (always present: `loadDraftState`, `src/lib/decks/draft-state.ts:445`, page.tsx:261). Returns null when `state.version === null` (a brew). With no changes (`hasChanges`, `src/lib/decks/draft-shape.ts:170`): the one-line version strip. With changes: the card, inline names at `n <= INLINE_CHANGE_MAX` (6, deck-versioning.ts:29), else counts and a money sentence. Discard confirm replaces the card. No switch (change-commander lines need `CHANGE_COMMANDER_ENABLED` to have been used).
- **Copy:** `src/lib/copy/deck-versioning.ts:40-160` (`pending`): label "Pending changes: not yet a version"; counts "+N / −N"; since "N changes since vN"; money "N of the N are short of spare copies, so this commit will ask for N to buy · $X." (+ "N of those are sleeved in other decks and can be pulled instead."), "Every card coming in has enough spare copies, so this commit asks for nothing.", proxy variants; per-line hints "or pull from X", "back in the pool on commit"; CTAs "Commit as vN", "Review N changes", "review changes", "Discard"; quiet strip "vN · committed <date>". Commander line: `deckVersioningCopy.history.commanderChange` via `change-commander-banner.tsx:51/70`.
- **Actions:** Commit as vN → `/decks/[id]/changes?commit=1`; Review → `/decks/[id]/changes`; Discard opens `DiscardConfirm` inline. The version strip takes focus after a commit or discard (`#committed` / `#discarded` hash, :246-262).
- **Treatment:** card 10px, `--surface-rail`, 1px `--border-strong`, 3px `--accent` left rule; eyebrow mono uppercase `--accent-text`; adds `--success`, removes `--warning`; price tiles `--warning` on `--accent-shadow`; primary CTA `--fg` fill with `--bg` text. Quiet strip: full-bleed `--surface-rail`, bottom `--border`, mono `--fg-faint`. Phone: stacked, full-width CTA; desktop: one wrapping row.
- **Dismissible:** no (commit or discard).
- **Co-occurrence / order:** after the arrival bands, before A15.
- **Who/when:** any committed deck. The card when the list differs from the newest version; the quiet strip otherwise.
- **Duplicates:** the review page `/decks/[id]/changes`; the Versions tab; inside Your deck the toolbar note (B1), the list caption and group notes (B4); the mix strip's `was N` and "· reading pending changes" (A16).
- **Origin:** `design/design_handoff_the99_deck_versioning` (Surface 1, #389), `design/design_handoff_the99_deck_statuses_pending`, `design/design_handoff_the99_change_commander` (§4); plan `2026-09-09-deck-versioning.md`.
- **Count:** quiet strip or card: decks with ≥ 1 `deck_versions` row. Card: those whose `deck_cards` (oracle_id, quantity) differ from the newest version's `deck_version_cards`, or whose `decks.commander_oracle_id`/`partner_oracle_id` differ from the version's (`readDraft`, draft-state.ts). There is no "draft" status column.

### A15. Unresolved lines banner ("N lines came over that we couldn't put a card to.")

- **Component:** `UnresolvedBanner`, `src/components/decks/unresolved-banner.tsx:42`. Mounted at builder-shell.tsx:1830.
- **Condition:** `unresolvedRows.length > 0` (optimistic list from `deck.unresolvedRows`). Not gated on arrival. No switch.
- **Copy:** `src/lib/copy/deck-import.ts:378-395`: desktop "N lines came over that we couldn’t put a card to. They’re sitting at the bottom of the list, they aren’t counted in the mix or in either tab below, and they’ll keep the deck off **Complete** until you sort them out."; phone short form; action "Take a look →".
- **Actions:** Take a look → (`seeUnresolved`) scrolls/opens the unresolved group at the list's foot. Phone: text link under the sentence; desktop: ghost button.
- **Treatment:** 8/10px card, `--elevated-hover`, 1px `--border-strong`, 3px `--warning` left rule, ⚠ `--warning`, `--fg-body`, "Complete" bold `--fg`.
- **Dismissible:** no; leaves when every line is resolved or deleted.
- **Co-occurrence:** suppresses A9 and (without an add receipt) A12; blocks A5.
- **Duplicates:** `UnresolvedGroup` at the list's foot (decklist.tsx:1451).
- **Origin:** `design/design_handoff_the99_deck_import`; plan `2026-08-04-deck-import-plan.md`.
- **Count:** `select deck_id, count(*) from deck_unresolved_rows group by deck_id`.

### A16. Recommended mix strip, with "Why these numbers?"

- **Component:** `RoleCounterStrip`, `src/components/decks/role-counter-strip.tsx:63`; cells `role-counter-cell.tsx`; disclosure `StripRationale`, `strip-rationale.tsx:32`. Mounted at builder-shell.tsx:1835-1862.
- **Condition:** always mounted, every deck, both widths. Targets: `mix` (page.tsx ~632, from `loadDeckSuggestions`; `loadDeckMix`, `src/lib/decks/deck-mix.ts:28`, when `LABEL_ROLE_COUNTS_ENABLED` falls back). Cell links: `consider →` when short and a shelf exists; `balance mana →` on Land with `MANA_BALANCE_ENABLED`+`ANALYSIS_TAB_ENABLED` and a colored pip; `suggest swaps →` with `TUNING_ENABLED`+`ANALYSIS_TAB_ENABLED` at the body size; `was N` when a draft moved the count.
- **Copy:** `src/lib/copy/decks-builder.ts:560` "Recommended mix"; source line `mixSourceLine` (`src/lib/decks/mix.ts:169`, NOT in lib/copy) "EDHREC averages" / "A common starting point" (desktop only); draft note `deck-versioning.ts:148` "· reading pending changes" (desktop only); cells `decks-builder.ts:80-95` "consider →", "suggest swaps →"/"suggest →"; `tuning-hub-shortcuts.ts:7-8` "balance mana →"/"balance →"; `deck-versioning.ts:151` "was N"; disclosure `decks-builder.ts:104-121` "Why these numbers?", "Hide", four bodies ("— you want your commander out a turn early, every game." etc.).
- **Actions:** cell links switch to Consider's shelf, the Mana Balance tool, or Suggested changes; Why these numbers? expands inline.
- **Treatment:** section with bottom `--border`; label mono uppercase `--fg-faint` (phone) / `--fg-body` (desktop); source `--fg-faint`; draft note `--accent-text`. Disclosure panel `--surface-sunken`, `--border`.
- **Dismissible:** no; the disclosure closes (state only).
- **Co-occurrence / order:** last before A17 and the tabs. Moment M4 can anchor to the Land cell.
- **Duplicates:** Consider's shelf headers quote the same numbers (comment at decks-builder.ts:124); the Analysis tab's role readings; the Add panel shelf.
- **Origin:** `design/design_handoff_the99_recommendations` and `design/design_handoff_the99_add_panel` (+ addendum for the rationale); plan `2026-10-10-labels-everywhere.md` for label counts.
- **Count:** every deck. Per-cell shortfalls need `mix` (EDHREC `edhrec_cache` payload per commander) against `deck_cards` role tallies.

### A17. "Build your first deck" (guided first run)

- **Component:** `GuidedBanner`, `src/components/decks/guided-banner.tsx:9`. Mounted at builder-shell.tsx:1869.
- **Condition:** `firstRun = allDecks.length === 1 && detail.built === 0` (page.tsx:590).
- **Copy:** HARDCODED in the component, not in lib/copy: "Step 3 of 3", "Build your first deck", "Search cards or pick from your suggestions below.", "0/99", "+ ${commanderName}".
- **Actions:** none.
- **Treatment:** `.guided-banner` (globals.css): phone `--surface`, `--border`, 3px `--accent` left rule; desktop gradient `--surface-raised`→`--surface-rail`, `--border-strong`, card fan + "0/99" figure. Three diamond crumbs (`--success` ×2, `--accent`).
- **Dismissible:** no; leaves at the first card.
- **Co-occurrence:** sits AFTER the mix strip, just above the tabs, while the top-off strip (A8) sits above it; the Your deck tab shows the first-run empty state (B6).
- **Origin:** `design/design_handoff_the99_appshell`; plan `2026-07-18-appshell-ui.md`.
- **Count:** users with exactly one deck, whose deck has no `deck_cards`.

### A18. Moments (one-time bubbles)

- **Component:** `MomentBubble`, `src/components/moments/moment-bubble.tsx:80`, placed by `MomentsProvider` (shell) for anchors registered with `useMomentAnchor`.
- **Condition:** `MOMENTS_ENABLED` and each moment's tool switch (`src/lib/moments/registry.ts:13-28`); one per visit, in registry order; never while a surface is open over the page; not already in `user_prefs.moments_spent`. Anchors on this page, above the tabs:
  - M1 `top-off`: the Choose the last N door (`last-slots-strip.tsx:173`), eligible `openSlots > 0`, no tool switch.
  - M3 `proposed-cuts`: the over line's button in BOTH spines (`spine-desktop.tsx:161`, `spine-mobile.tsx:98`, `target: false`), and the Analysis tab as fallback (builder-shell.tsx:1526).
  - M2 `suggested-changes`: the Analysis tab (builder-shell.tsx:1521), at the body size, off Analysis.
  - M4 `mana-balance`: the Land cell's balance link (`role-counter-cell.tsx:69`) and the Analysis tab as fallback (builder-shell.tsx:1532).
  - Below the tabs: M7 `card-assignments` on a short row (`decklist-row.tsx:464`); M5/M6 stand-ins and friend spares on Shopping rows (`spare-markers.tsx:182-183`).
- **Copy:** `src/lib/copy/moments.ts:19-44`: "**Top off** ranks your own cards for the last N slots. Nothing is added until you say so."; "**Proposed cuts** counts where this deck runs long, free. A deeper look can name the N."; "**Suggested changes** is in Analysis now the deck is full. …"; "**Mana Balance** counts every source of each color against what your spells ask for. Free."; dismiss "Dismiss".
- **Actions:** ✕ (Esc) or pressing the control spends it.
- **Treatment:** 10px bubble, `--elevated`, `--border-strong`, nib, 6px `--accent` diamond, tool `--fg` semibold, line `--fg-body`, 3-line clamp.
- **Dismissible:** yes, remembered server-side in `user_prefs.moments_spent` (append-only).
- **Origin:** `design/design_handoff_the99_discovery_onboarding`; plan `2026-10-16-moments.md`.
- **Count:** per user, not per deck: `user_prefs.moments_spent` does not contain the id; eligibility per deck follows the anchor conditions above.

---

## B. Inside "Your deck", before the first card group

### B1. Toolbar notes (in `GroupToggle`, `src/components/decks/group-toggle.tsx`, mounted at decklist.tsx:1336)

- **Draft note** "N of these differ from vN" (`deck-versioning.ts:142`), group-toggle.tsx:334-338. Condition: `pendingChanges.size > 0 && pendingVersion !== null` (decklist.tsx:644). **Desktop only** (`hidden md:inline`). `--fg-locked` mono.
- **Kept note** "N cards are yours now" (`recommendations.ts:181`) inside `ClearAutoButton` (`clear-auto.tsx:66`, note :155). Zeroed while the draft note exists (group-toggle.tsx:346), at both widths.
- **Keep all confirm** "Keep all N? You’ll lose the record of where they came from." (`recommendations.ts:169`) replaces the auto pair on Keep all.
- **Stats / Notes provenance** (`deckStatsCopy.segment.provenance`, `deckNotesCopy.head.provenance`) only when those panels are open (they replace the list).
- Count: draft note = A14's card condition; kept note = decks with non-auto `deck_cards` and an auto cluster drawn.

### B2. Key line / Lock mode line

- `MarkKey` (`mark-key.tsx:35`) via `keyLine` (decklist.tsx:594-614), at decklist.tsx:1364-1371: the decoder for the marks the list draws (buy, proxy, locked, foil, card facts, combo), words from each mark's copy file (decklist.tsx:290-341). With `NEVER_CUT_ENABLED` and Lock mode on, `LockModeLine` (decklist.tsx:99): "Locked cards are never suggested as cuts. N locked" (`src/lib/copy/locked-cards.ts:17-19`). Not dismissible; mono, `--fg-muted`.

### B3. Auto lifecycle receipts

- **autoError** `role="alert"` mono `--fg-locked` (decklist.tsx:1379-1385): `recommendationsCopy.auto.sweepFailed` / `keepAllFailed` (set at builder-shell.tsx:1316, :1341, :1364). Transient.
- **SweepReceipt** (`clear-auto.tsx:281`), decklist.tsx:1387: "N auto cards removed", "N locked cards stayed", Undo (`recommendations.ts:184-189`). Dashed `--border-strong` on `--surface-sunken`. Stays until undone or the visit ends (state `sweptRows`).

### B4. Draft captions

- "the brass rule marks the N rows you have changed" (`deck-versioning.ts:135`), decklist.tsx:1407-1411, when `markedPendingCount > 0`. Plus per-group "N changed, not yet committed" (`deck-versioning.ts:138`) on each group heading.

### B5. Empty list line

- "No cards in this deck." (`decks-builder.ts:198`), decklist.tsx:1393-1400, when no groups and no unresolved rows (a filter left nothing).

### B6. Empty deck states (the `EmptyDeckNotes` branch, builder-shell.tsx:2042-2196)

- Condition `isEmpty` (builder-shell.tsx:1058): built 0, no unresolved, no spent slots, no swept rows. `deck.filled` picks "Back to just the commander" + body + Consider CTA (`recommendations.ts:343`, `sweptEmpty`) or the first-run empty state (`addPanelCopy.builderEmpty.heading/caption/roleHint`). Phone and desktop marks are drawn twice (`md:hidden` / `hidden md:flex`).

### B7. Shopping filter head (still inside Your deck)

- `PriceStrip`, `StandInLimit`, `ShoppingKey` (group-toggle.tsx:502-510); the intro line (`recommendations.ts:235-315`: "N cards we reached past your collection for, to get each role to its baseline." and the unfilled/split/spoken-for variants); `changeListCaption` for the shown subset; empty states "Nothing to buy…" (`emptyCoveredHeading/Body`, `emptyUncovered`).

---

## (a) Vertical stacking order when everything shows

Not every element can co-exist (A5 vs A14, A7 vs A9 vs A17, A12 vs A15 except the owned import receipt, which draws with A15). The order below is DOM order, which is the same at both widths because every block is one mount with responsive classes, except inside the header.

**390 (phone)**

1. Remove failure lines (A1)
2. Phone header (`SpineMobile`): name, commander line, chips row [status pill · bracket chip · notice tag (A2)], bar + count, proxy line (A3), over line (A4), centered `Proposed cuts →` row (+ M3 bubble), actions row [Update from a list · Export (icon only under 480) · Commit as v1 (A5) · ⋯]
3. Commitment bands (A6): full-bleed over band, then soft band
4. Provenance ledger (A7), lines stacked in three rows each, no deck-wide meta
5. The last N (A8) (+ M1 bubble on the door)
6. Fill failed (A9)
7. Precon arrival (A10), precon suggestion (A11)
8. Import arrival (A12), phone mono variant
9. Update strip (A13), phone variant without the kept count
10. Pending changes card or version strip (A14), stacked, full-width CTA
11. Unresolved banner (A15), short sentence + text link
12. Recommended mix (A16): label only (no source line, no draft note), five cells, Why these numbers? (+ M4 bubble on Land)
13. Build your first deck (A17), phone form without the fan or 0/99
14. Tabs (+ M2/M3/M4 fallback on Analysis)
15. Your deck: toolbar (NO kept note and NO draft note at this width: both are `hidden md:inline`), key or lock line, auto error, sweep receipt, empty-list line, brass-rule caption, then groups

**1300 (desktop)**

1. Remove failure lines (A1)
2. Desktop header (`SpineDesktop`): left column [name, commander line, chips row (A2), bar + count, proxy line (A3), over line with inline `Proposed cuts →` (A4)]; right column [Update from a list · Export (ghost when the offer stands) · Commit as v1 (A5) · ⋯]
3. Commitment bands (A6) as rounded cards, link trailing
4. Provenance ledger (A7), one row per pass, header meta "N passes · N to buy"
5. The last N (A8), caption on the heading row
6. Fill failed (A9)
7. Precon arrival (A10), precon suggestion (A11)
8. Import arrival (A12)
9. Update strip (A13)
10. Pending changes (A14) on one wrapping row
11. Unresolved banner (A15) with a ghost button
12. Recommended mix (A16) with source line and "· reading pending changes"
13. Build your first deck (A17) with card fan, 0/99 and the commander
14. Tabs
15. Your deck: toolbar (draft note "N of these differ from vN", or kept note), key/lock line, auto error, sweep receipt, empty-list line, caption, groups

Realistic maximal stacks: a committed deck mid-edit with spoken-for cards, a top-off ledger and open slots shows A2, A6 (both bands), A7, A8, A14, A15, A16 above the tabs: up to eight message blocks before the first card. A fresh first deck shows A8, A16, A17 and B6 (three "start here" messages plus the mix).

## (b) Odd things noticed (no fixes)

1. **The remove-failure line renders ABOVE the header** (builder-shell.tsx:1604), far from the row the player pressed, at both widths.
2. **Both toolbar notes are desktop-only** (the draft note, group-toggle.tsx:334, and the kept note, clear-auto.tsx:155-158, are `hidden md:inline`), and on desktop a draft note zeroes the kept note (:346 `keptCount={draftNote ? 0 : keptCount}`). On a phone the toolbar slot never carries either note.
3. **The mix strip's draft note and source line are desktop-only** too (role-counter-strip.tsx:73-92); the phone never learns whether the targets are EDHREC averages or a default, except behind Why these numbers?.
4. **Partner decks read "99" in three strings**: `GuidedBanner`'s hardcoded "0/99" (guided-banner.tsx:94), the exhausted plate "N of 99" (synergy-discovery.ts:192), and the over line "over the ninety-nine" (decks-builder.ts:454). The body size for a pair is 98.
5. **`GuidedBanner`'s copy is hardcoded in the component** rather than in `src/lib/copy` ("Step 3 of 3", "Build your first deck", "Search cards or pick from your suggestions below."), as is `mixSourceLine` in `src/lib/decks/mix.ts:169-171`.
6. **Em dashes in shipped copy**: `addPanelCopy.strip.rationaleBodies` all begin "— " (decks-builder.ts:116-120). Deliberate, not a defect: the code exempts them as quoted rationale copy (decks-builder.ts:110-114).
7. **Stale count in the unresolved banner**: "not counted in the mix or in either tab below" (deck-import.ts:387-393) predates Games, Versions and Analysis; there are up to five tabs.
8. **Shared dismissal key**: the import arrival (A12) and the precon arrival (A10) share `arrivalDismissKey(deckId)` in localStorage, so dismissing one silences the other on that deck permanently. The update strip (A13) uses component state instead.
9. **Dead copy**: `topOffCopy.ledger.passRecountedAllKept` (top-off.ts:436) has no caller under `src/`.
10. **Two different "i" marks** for the same voice: the ledger uses `ProvenanceDisc` (ⓘ), the top-off exhausted plate hand-draws an "i" disc (last-slots-strip.tsx:115-121).
11. **Left-rule and wash tokens vary across sibling blocks**: accent rule on `--surface-sunken` (ledger, exhausted), on `--surface-rail` (pending), on `--surface` (guided, phone); warning rule on `--surface-sunken` (fill failed) vs `--elevated-hover` (unresolved); danger rule on `--elevated-hover` (over band); dashed rule on `--surface` (soft band). The arrival, suggestion, update and version strips are full-bleed bands with no rule; the top-off strip is a card with no rule.
12. **One moment, three anchors**: M3 `proposed-cuts` registers in both `SpineDesktop` and `SpineMobile` (one of which is `display: none` at any width) and again as the Analysis tab's fallback. Worth confirming the provider never places it on the hidden spine's anchor.
13. **The version strip shows on every committed deck with no changes** ("vN · committed <date>"), so a quiet deck always carries one message band above the mix.
14. **Fill failed shows on every hand-made empty second deck** (acknowledged in the comment at builder-shell.tsx:1755-1766); it says a fill broke that never ran.
15. **The first-run screen stacks three "start here" messages**: the top-off strip, the guided banner (below the mix strip, so not adjacent to it), and the empty state in Your deck.
16. **The guided banner sits below the mix strip** while every other arrival or status message sits above it.
17. `StripAddedParam` (precon-added-receipt.tsx:18) is mounted in the message column but draws nothing; it only strips `?added=` from the URL.
