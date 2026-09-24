# Readiness audit: locked cards ("never cut"), R2

**Audited:** 2026-09-24, against `origin/main` at `620aecfa`. Every file:line below was read on that commit.
**Brief:** none. The ask was the Design prompt of 2026-09-24 (Hugh): a player can mark a card in a deck "never
cut" so no tool suggests removing it, after tuning cut Lotus Petal and Ornithopter from a Yuriko ninjutsu deck.
**Package:** this folder, committed as delivered. **R2 is canonical**: `READINESS.md` and `README.md` both name
`The 99 - Never Cut v2.dc.html`, with `Deck Rows v2`, `Deck Tiles` and `Tuning Panel` (states `v2*`) as its
children. R1 (`The 99 - Never Cut.dc.html`, `Deck Rows`, `Card View`) is history, except that R1 1d holds the
only drawing of the climb sheet. Design's own `READINESS.md` is answered in §5.

## Hugh's rulings (2026-09-24)

Hugh approved this audit on 2026-09-24 and ruled on H1 to H4 (§4).

- **L1 (H1, F2): Undo and Put back return a removed card LOCKED**, exactly as it left. The lock ends only if
  the removal stays.
- **L2 (H2, F5a): Pull it NEVER offers a copy from a deck where the card is locked.** The row says the spare
  copy is locked in the other deck.
- **L3 (H3, F5b): Clear all auto skips locked cards**, and its note counts how many it left.
- **L4 (H4): locks live on deck rows and tiles, through the Lock cards mode.** The card view (the card modal)
  shows nothing about a lock.

**F3, the real toolbar, goes to Design as an addendum.** The release ships behind its own switch,
`NEVER_CUT_ENABLED`.

## Verdict: Orange

Build the storage, the tuning filter, the row and tile marks and the mode now, with the engineering corrections
below. Every asked state is answered, and the three open calls are answered.

**One Design item remains (F3): the `Lock cards` button is drawn in a schematic toolbar, not the shipped one.**
The canvas draws a segmented All/Shopping pair and a List/Cards pair. The shipped `GroupToggle` wraps three
clusters and already names 390 as its limit. Where a ninth control goes, at what height, and where the mode's
line sits beside the mark key are layout calls. **Two rulings go to Hugh (§4)**: when a lock ends (F2), and
which app-offered removals a lock also binds (F5). **F1 changes the storage Design proposed**, because a
`deck_cards` column is wiped by every discard.

---

## 1 · Against the ask

### The asked states

| Asked | Drawn | Where |
|---|---|---|
| Set and clear on a decklist row, 1300 | Yes. A 22px slot left of ✕: an open lock on hover presses to lock, a closed lock presses to unlock | v2 2b, `Deck Rows v2` `rest` |
| Set and clear on a decklist row, 390 | Yes, through the mode only. At rest a locked row carries a mark, not a control | v2 2b, `rest` and `mode` phone |
| Set and clear in the card view (`card-modal.tsx`) | **Not drawn, by a ruling.** R2 records Hugh's feedback: "Nothing in the card modal: agreed". The mode on the deck page is the keyboard, screen-reader and phone path instead | v2 §, `READINESS.md` "Settled with Hugh" |
| A marked card in the list, both widths | Yes | v2 2b |
| A marked card in the card view | **Nothing drawn.** The modal shows no mark at all. Its one change is that a locked card has no *See cheaper stand-ins →* | `STATES` "Card modal"; H4 |
| Suggested changes respecting the marks, both widths | Yes, and implicitly: results as shipped, `no longer applies · You locked {card}.`, and the all-locked Ready state | v2 2d, `Tuning Panel` `v2results`, `v2after`, `v2allmarked` |
| A deck with no marks | Rows at 1300, tiles at 390. Rows at 390 and tiles at 1300 read the same from the `rest` frames' unlocked rows | v2 2e |

The no-marks state is not "nothing new drawn". Every deck gains the `Lock cards` button, and every desktop row
reserves an invisible 22px slot so a hover does not move the pips. R2 says so plainly and Hugh approved R2, so
this is recorded rather than raised. The cost is measured in F7.

### Scope beyond the ask

- **Card tiles** (`Deck Tiles.dc.html`, v2 2c). The ask named `card-modal.tsx` as "the card view". R2 reads the
  deck's Card view, the tile grid, as a second place to show and set the lock. It follows from moving locking
  onto the deck page: a lock the list shows and the tiles hide would make the two views disagree about one card.
  Accepted, and Hugh confirms (H4).
- **The `Lock cards` mode**, a new toolbar state in both views. It replaces the modal switch as the full
  control, so it is the mechanism rather than an addition.
- **The word.** The player reads *locked*. `neverCut` survives only in engineering names.

### The three open calls

| Call | Design's answer | Where |
|---|---|---|
| The climb's *What would have to go* | **Listed, never hidden.** A locked candidate sorts last with its lock and still counts. If the locks make the lower bracket unreachable, one sentence says so | README R1 call 5b, v2 2e, R1 1d |
| Cheaper stand-ins (swap tools) | **Protected.** A locked Shopping row has no ⇄, and the modal has no *See cheaper stand-ins →*, with nothing in its place. It still counts as over the limit | README R2, v2 2e |
| A cap on marks | **No cap** (Hugh's call). The one limit is logical: if every card but the commander is locked, Ready says there is nothing to cut, the primary action is disabled and no credit is used | README R1 call 6, v2 2d |

All three are answered and none conflicts with the constraints. The lock is only the player's choice, and
nothing infers, suggests or seeds it. There is no score. No About entry is drawn, correctly: the deck-analysis
line batches its entries at launch (AGENTS.md). **The plan must name the batched *Locked cards* entry.**

---

## 2 · Against the code

### Storage and lifetime

| Question | Answer | Evidence |
|---|---|---|
| Does `deck_cards` hold a lock today? | No. `deck_id`, `oracle_id`, `quantity`, `auto` | `schema.ts:380-388` |
| Does a column survive a discard? | **No.** `restoreDraftFromVersion` deletes every `deck_cards` row and reinserts `quantity` and `auto` only | `versions.ts:268`, `:301`, `:309-313`; F1 |
| The precedent for per-slot state outside versioning | `deck_proxies`, a side table, for two reasons: commanders are not rows, and versioning | `schema.ts:390-416` |
| What does removal do to that state? | Prunes it in the removal's transaction | `actions.ts:650-655`; `prune-proxies.ts:48` |
| What does the row's Undo do? | A plain re-add through `addCardToDeck`, carrying no state | `decklist-row.tsx:641-660`; `actions.ts:484`; F2 |
| Migration number | `0058_deck_notices` is on main. **0059 is reserved** by the swap-tools lane's plan (local branch `swap-tools`, `docs/superpowers/plans/2026-09-24-swap-tools.md:104`, not yet on origin). This one takes the next free number at generation, 0060 today | `drizzle/0058_deck_notices.sql` |

### How each tool honors a lock

| Tool | Deterministic filter | Evidence |
|---|---|---|
| Suggested changes | A `neverCut` rule in `firstFailure` straight after `cutInDeck`. This is the enforcement, and it satisfies foundation spec §2.4 ("a query satisfies it absolutely"). The prompt tag and rule follow the commander precedent exactly, and exist only so fewer slots are wasted. They are never the enforcement | `validate.ts:99-100`; `prompt.ts:36`, `:97-98`; spec `2026-09-19-deck-analysis-foundation-design.md:220-231` |
| A stale open suggestion | `applies` gains a third reason in its SQL. `applyItem` must refuse a locked cut itself, since it re-checks the cut's membership but reads no lock | `tuning-read.ts:244-252`; `verdicts.ts:84-117`; `state.ts:39-41`; F4 |
| The prompt version | `PROMPT_VERSION = 2`; a bump reopens every gate under its own reason, as designed | `prompt-version.ts:6`; `fingerprint.ts` header |
| Cheaper stand-ins | Not on main. The lane is at its plan. `takeStandIn` must refuse a locked original, not only hide the ⇄ | swap-tools plan (local); F4 |
| The climb | `upgradePath` is pure over the stored `DeckProfile`, and already excludes commanders as `cuttable` | `upgrade.ts:53-58`, `:64-74`, `:97-101`; F6 |

### Surfaces

| Surface | As described? | Evidence |
|---|---|---|
| The row opens its card on a press, except on a control | Yes, so the hover button needs no special case | `decklist-row.tsx:339-356` |
| The row's ✕: 44px on the phone, a 13px glyph on desktop | Yes. On the phone the mode's toggle takes the ✕'s 44px and costs nothing. On desktop it is 26px where the glyph is 13, so a row in the mode gives up 13px more | `decklist-row.tsx:614-633` |
| Row padding and gap | `pl-8 pr-4` / `md:px-9`, gap 9 / 10 | `decklist-row.tsx:54-58`; `row-shell.ts` `ROW_GAP` |
| The desktop list is 2-up from `md:` | Yes, 20px column gap, inside `md:px-26`, beside the 62px rail | `decklist.tsx:675`, `:719-722`; `nav.tsx:148` |
| The tile's ✕ column: 44px phone, 32px desktop, width reserved while hidden | Yes, so the mode's toggle costs no width there either | `deck-card-tile.tsx:416-433` |
| The tile's meta line: dot, slot, count, facts | Yes. It has no overflow handling | `deck-card-tile.tsx:303-395`; `card-tile-caption.tsx:176`; F8 |
| The mark key takes marks as data, one conditional entry per mark | Yes. `locked` is conditional, like `buy` and `proxy` | `mark-key.tsx:16-45`; `decklist.tsx:148-156` |
| The toolbar | **No.** The canvas's toolbar is not the shipped one | `group-toggle.tsx:122-126`, `:225-228`; F3 |
| The card modal's deck block reads per-deck state from the payload | Yes (`proxiedBy`). The stand-ins gate needs the lock the same way | `card-modal.tsx:151`, `:1732-1740`; F13 |
| `ProxyControl`'s optimistic, serialised toggle | Yes, as the mode's model: a `pending` flag holds the optimistic value and refuses a second press until the first settles | `proxy-control.tsx:61-84`, mounted `card-modal.tsx:1732-1740` |

### Width

**Phone, 390.** The list is 358px (`px-16`), the row interior 346. A bare row gives the name
346 − 7 (dot) − 9 − 9 − 44 (✕) = **277px**. A locked row gives up the 14px mark and a 9px gap, **23px**, so 254.
The worst row today also carries the availability marker (about 50px) and the buy tag, which leaves about 189,
or about 166 when locked. Only locked rows pay.

**Desktop, the narrowest 2-up (768).** 768 − 62 − 52 = 654, so each column is 317 and its interior 299. A costed
row gives the name 299 − 18 (dot) − 82 (the 72px pip track, `cost-pips.tsx:49`) − 23 (✕) = **about 176**. The
reserved slot takes **32px (22 + the gap) from every row of every deck**, so 144. The worst row, with a marker
and a `$` tag, drops from about 84 to about 52. F7.

### Tokens and contrast

Every token the R2 canvases use is declared in all six themes in `src/app/globals.css`: `--accent`,
`--accent-hover`, `--accent-shadow`, `--bg`, `--border`, `--border-dashed`, `--border-strong`, `--elevated`,
`--fg`, `--fg-body`, `--fg-faint`, `--fg-locked`, `--fg-muted`, `--success`, `--surface`, `--surface-raised`,
`--surface-rail`, `--surface-sunken`, `--warning`. `--display` is the canvas's own. No new token and no new hex.

The glyph is a graphic, so its bar is 3:1 (WCAG 1.4.11). Each ink is measured on the ground it is drawn on, in
all six themes. The hover lock, `--fg-faint`, appears only on a hovered desktop row, whose ground is
`--elevated-hover` (`decklist-row.tsx:373`): 3.74 (kamigawa) to 4.73. The mode's open lock, `--fg-muted`, is
6.14 to 7.05 on the row at rest or hovered. The at-rest lock, `--fg-body`, is 9.03 to 9.74 on `--surface-rail`.
The mode's closed lock, `--accent`, sits on its own 14% accent fill: 3.82 (phyrexia) to 6.92, and 3.59
(kaldheim) when that row is also hovered. All clear 3:1, and the accent lock is the thinnest margin.

**Neither `--fg-locked` nor `--fg-disabled` is the lock's ink.** `--fg-locked` is a text step
(`globals.css:35-40`) whose name will tempt. `--fg-disabled` (`globals.css:41-49`) is one step below it and
deliberately under 3:1, and it already inks the padlock glyph beside a locked nav item, which makes it the
likelier wrong pick. A nav padlock repeats a word beside it; this lock is the only visible sign of the state,
so it takes the four inks above.

---

## 3 · Findings

| # | Sev | Evidence (origin/main) | Finding and correction | Owner |
|---|---|---|---|---|
| F1 | **High** | `versions.ts:301-313`; `schema.ts:380-416` | **A `deck_cards.never_cut` column is wiped by every discard.** `restoreDraftFromVersion` deletes the draft and reinserts `quantity` and `auto` only, so discarding any edit would silently unlock every card in the deck, including cards the discard never touched. The column also cannot express a lock on a commander, though no tool cuts one. **Correction:** a side table, `deck_locks (deck_id, oracle_id, created_at)`, with a primary key on the pair and `on delete cascade` from `decks`, mirroring `deck_proxies` and its reasons. Every read is membership-scoped. It is not versioned, as Design says. The migration takes the next free number after 0059 | eng |
| F2 | Medium | `decklist-row.tsx:641-660`; `actions.ts:484`, `:650-655`, `:857`; `review-changes.tsx:687-705`; `top-off-list.tsx:1115`; `schema.ts:403-406`; STATES "Removed with ✕" | **The package contradicts itself on when a lock ends.** It says the lock is "removed with the card", and that `Put back` restores both. No undo in the app carries state. The row's `Undo`, the review screen's `Put back`, the top-off list's restore and `restoreAutoCards` are all plain re-adds, so a lock deleted at removal cannot come back through any of them. A discard that restores a removed card has the same gap. Keeping the lock row until a commit is not the answer. That brings back what `schema.ts:403-406` prunes proxies to prevent: any re-add before a commit (the add panel, the fill, a tuning apply, a pull) would return the card silently locked, and a brew never commits, so its orphans would never be pruned. **Correction:** the lock ends at removal, as a proxy does. The two controls that undo a named removal, the row's `Undo` and the review screen's `Put back`, know the card was locked, so they pass that to the re-add and restore the lock with the card. Every other return, the top-off restore, `restoreAutoCards` and a discard included, brings it back unlocked, and STATES says so. Hugh confirms (H1) | eng (Hugh rules) |
| F3 | Medium | `Deck Rows v2.dc.html:40-60`, `:217-223`; `group-toggle.tsx:122-126`, `:225-228` | **The `Lock cards` button is drawn in a toolbar the app does not have.** The canvas draws segmented All/Shopping and List/Cards pairs. The shipped toolbar is filter pills, the auto cluster, a hairline, and the grouping, sort and view cluster. It already wraps at 390, and its own comment says an eighth control put the view well alone on a fourth line. The canvas's button is 44px tall on the phone, beside 26px pills. The canvas hides it under the Shopping filter, and no written spec says so. **Correction:** Design places the button in the shipped cluster order at 390 and 1300 in both views, and gives its phone height. Design says whether the Shopping filter hides it, and whether the mode's line takes the mark key's line (the key hides in the mode) | Design |
| F4 | Medium | `verdicts.ts:84-117`; `state.ts:39-41`; `tuning-read.ts:244-252`; `validate.ts:99-100` | **Every filter must hold on the server, not only in the panel.** `applyItem` re-checks the cut and the add but reads no lock, so a stale panel could apply a locked cut. `state.ts` itself says apply refuses what does not apply, "whatever the panel drew". **Correction:** the `neverCut` rule after `cutInDeck`, counted in `drops` with its own key so the lead can exclude it. `applies` in `tuning-read`'s SQL gains the lock. `applyItem` refuses a locked cut under the deck row lock it already takes. The swap lane's `takeStandIn` refuses a locked original, as its own server check. The pack takes the lock set as an input, as it takes `owned` (`evidence.ts:97-105`), never through the stored profile | eng |
| F5 | Medium | `actions.ts:1791`, `:2005-2009`; `actions.ts:816`, `:1096`; `schema.ts:384-387` | **Two removals the app offers are not covered.** (a) `Pull it` on the review screen takes a copy out of *another* deck and commits a version there. That deck may have the card locked. (b) `Clear all auto` and the fill's undo sweep rows still flagged `auto`. A player can lock a card the fill added without pressing Keep, and the sweep then removes it. **Correction:** Hugh rules (H2, H3). Recommended: locking an `auto` card clears `auto` in the same write, since a lock is a stronger keep. `Pull it` does not offer a copy from a deck that has it locked, and says which deck holds it, as the pull already refuses a deck with pending changes (`actions.ts:1987`) | eng (Hugh rules) |
| F6 | Low | `upgrade.ts:53-74`, `:97-101`; `upgrade-path.tsx:41`, `:170-176`, `:338-383`; R1 1d | **The climb needs the lock at the view, and three cases are unsaid.** (a) The lock must not enter the stored `DeckProfile`, or a toggle would dirty the analysis. Sort and sentences belong in the sheet, and `UpgradePathSheet` takes the lock set as a prop. (b) `unreachable` is "the unlocked cuttable candidates are fewer than `removeCount`". That is "locked > allowance" only when no commander counts, and `upgradePath` already drops commanders. (c) In the `Forced` state (candidates equal the count), one locked card is enough to trigger `unreachable`. A combo whose every non-commander piece is locked has no sentence, and should take `unreachable` with the combo's piece count. The climb is drawn only in R1 1d, at 1300, with R1's 9×11 glyph and a `never cut` label. **Correction:** R2's glyph and word. The phone sheet is traced from the shipped sheet. The sentence goes "under the rule", as 1d says. `blocked` (commanders) stays distinct: it is a fact, while `unreachable` is a choice the player can undo | eng |
| F7 | Low | §2 Width; `decklist-row.tsx:54-58`, `:614-633`; `cost-pips.tsx:49` | **The reserved slot costs every desktop row 32px of name.** At 768 a worst-case row falls from about 84px to about 52. Hugh approved the reserved slot, so this is a measurement to take, not a reversal. In Shopping, the swap lane's ⇄ adds its own 22px slot. **Correction:** a probe reads the name's `scrollWidth` against `clientWidth` at 390, 768 and 1300 over the longest staging names, with the marker and buy tag present. If 768 cuts names to nothing, the slot becomes an overlay on the ✕'s left edge rather than a flex item | eng |
| F8 | Low | `card-tile-caption.tsx:176`; `deck-card-tile.tsx:303-395` | **The tile's meta line has no overflow rule, and the lock adds 17px to it.** At 390 the grid is `grid-cols-2 gap-[12px]` in a 358px list (`decklist-group.tsx:96`), so a tile is 173px and its line has about 120px after the 44px ✕ column and the 9px inset. Design's 178px is the desktop `minmax` floor. A dot, an availability chip, a count and two fact marks already reach that. **Correction:** probe the fullest meta line at 390. Set a truncation order in which the lock never drops, because it is the only place a tile says it is locked | eng |
| F9 | Low | `fingerprint.ts:1-12`, `:37-55`; `gate.ts` | **A lock does not reopen tuning's gate.** The fingerprint hashes "only the player's own changes", and a lock is one. Without it, a player who locks Ornithopter after a run is told nothing changed. The gate is soft (`Suggest again anyway`), so this is friction, not a dead end. **Correction:** hash the sorted locked ids beside the list | eng |
| F10 | Low | `tuning-actions.ts:141-142`; `deck-tuning.ts:184-189` | **A run whose every suggestion cut a locked card lands on `ungrounded`**, whose body names three causes, none of them a lock. Locked drops are uncounted by design, so nothing else explains the empty result. It should be rare, since the model is told. **Correction:** when every drop is `neverCut`, the body takes one lock-aware sentence, through `/copy-review` | eng |
| F11 | Low | `never-cut · copy strings.ts`; README R2 | **Copy drift and three copy bugs.** (a) `climb.unreachable` reads "1 of these are locked" at n = 1 and "All 1 are locked" at a total of 1. (b) `mode.refused` uses a straight apostrophe, and the house uses ’ (`deck-tuning.ts` writes it as `\u2019`, 10 times). (c) In the mode the button's visible label is `Done`, but `mode.buttonAria` is "Lock cards: …", so the accessible name does not contain the visible label (WCAG 2.5.3). (d) README R2 names `tuning.cutMarked`, `tuning.allMarked` and `mode.line(n)`, and the copy file has `cutLocked`, `allLocked`, and `line` plus `count`. **Correction:** the copy file is the source. (a) to (c) are fixed at `/copy-review`, and the button carries `aria-pressed` with one stable name | eng |
| F12 | Low | `actions.ts:612-619` | **The mode invites a run of toggles, and each one revalidates synchronously.** `setCardProxied` calls `revalidateClaims` inline, which re-renders the caller's page into the action's response. On the deck page that means one page payload per press. A lock moves nothing on another deck. **Correction:** revalidate only this deck and its tuning set, deferred with `after()`. No `touchDeck`, because a lock edits no list | eng |
| F13 | Low | `card-modal.tsx:151`, `:1732-1740`; `collection/card-detail.ts:291`, `:339` | **The modal cannot see a lock yet.** It reads per-deck proxy state from the payload's `proxiedBy`. The stand-ins link, which the swap lane adds, needs the same read. **Correction:** add the deck's lock to the detail payload the way `proxiedBy` is added, and hand the swap lane the gate | eng |

### Engineering notes, not findings

- **The action.** `setCardLocked(deckId, oracleId, on)` copies `setCardProxied`'s wire checks (`typeof on`,
  `isUuid`) and its deck-row lock before the membership test (`actions.ts:570-590`). Membership is `deck_cards`
  only: a commander is never a row and never a cut.
- **The mode is page state.** It is not persisted, and it does not survive leaving the deck.
- **The desktop hover button** is `tabIndex -1` and `aria-hidden`, as the suggestion card's thumbnails are. The
  mode is the keyboard path, so nothing is lost.
- **Probes.** A `probe:locks` against `local-dev`: lock, discard a draft, read the lock back (F1); remove and undo
  (F2); a tuning apply against a locked cut (F4). Mutations: the removal's prune dropped, the Undo's lock restore dropped, the `applyItem` check
  dropped, the validator rule dropped.

---

## 4 · For Hugh

- **H1 (F2).** When you remove a locked card and then press Undo or Put back, should it come back locked?
  Recommended: yes, for those two controls only. A card that returns any other way, including discarding the
  draft, comes back unlocked, because keeping the lock around would make a card re-added weeks later arrive
  locked without you asking.
- **H2 (F5a).** When another deck is short a copy, should `Pull it` offer to take it from a deck where you
  locked it? Recommended: no. The row names the deck that holds it.
- **H3 (F5b).** If you lock a card the fill added, should `Clear all auto` still sweep it? Recommended: no,
  locking it also keeps it.
- **H4 (confirm).** The card view shows nothing about a lock, no mark and no control, and the Card view's tiles
  carry the lock though the ask did not name them. Is that what "nothing in the card modal" meant?

## 5 · Design's READINESS, answered

| Item | Answer |
|---|---|
| Eng 1 (schema + action) | **Changed:** a side table, not a column (F1). Lifetime waits on H1 (F2). Action as noted |
| Eng 2 (`LockMark`) | Accepted. A CSS shape, `aria-hidden`, R2's 11×13 geometry |
| Eng 3 (row) | Accepted; width probed (F7) |
| Eng 4 (tile) | Accepted; meta line probed (F8) |
| Eng 5 (mode) | Accepted; placement waits on Design (F3), revalidation deferred (F12) |
| Eng 6 (tuning) | Accepted, with the server refusals (F4), the gate (F9) and the empty run (F10) |
| Eng 7 (swap tools) | Accepted; enforced in `takeStandIn` (F4), gated through the payload (F13) |
| Eng 8 (climb 3b) | Accepted, in the view and with the unsaid cases (F6) |
| Eng 9 (copy) | Accepted; `/copy-review` fixes (F11) |
| Open: cap | None, Hugh's call. Nothing to build |
| Open: climb geometry | Agreed: trace the shipped sheet (F6) |
| Open: keyhole ink `--bg` | Accepted |
| Held | Confirmed: player-only, no score, no About entry in this sub-project, colour never alone, 44px phone targets in the mode |

---

## Addendum: toolbar (2026-09-24)

**Audited:** `addendum-toolbar/` against `origin/main` at `45c40360`. It answers F3 under L1 to L4 and changes
nothing else in R2.

**Verdict for the handoff: Green**, replacing the Orange above. F3 was its only Design item, and every question it
asked is answered. What remains is engineering (T1 to T6).

### The asked items

| Asked (F3) | Answered | Checked against |
|---|---|---|
| Position | Yes. The last child of cluster 2, left of the hairline | `group-toggle.tsx:176-222`, `:240-245`. The cluster is one flex child, so the row still wraps between clusters |
| Phone height | Yes. 44px, from `BULK_BUTTON_CLASS` verbatim. It matches Keep and Clear beside it (already 44px), not the 27px pills | `clear-auto.tsx:33-34`; pills 27px, `design_handoff_the99_decklist_sort/README.md:208` |
| Done | Yes. `min-w-[116px]` holds the box; Keep and Clear stay in place, disabled at 50% | `clear-auto.tsx:34` (`disabled:opacity-50`), `:104` |
| Shopping hides it | Yes. Absent, and switching to Shopping ends the mode | `group-toggle.tsx:331-346` is the same rule for the view well |
| The mode's line vs the key | Yes. It takes the key's wrapper, above the receipt and the groups | `decklist.tsx:807-809` (the wrapper, `empty:hidden`), `:825-829` (the receipt) |
| L3 note | Yes. `38 auto cards removed · 2 locked cards stayed`; no clause at zero; Clear counts only what it clears, and is absent when that is 0 | `clear-auto.tsx:237-239`; `recommendations.ts:116-118`, `:163` |

### Width

**390.** The box is 358 (`group-toggle.tsx:121`). Cluster 2 with auto cards: `Keep 40` 76 + `Clear auto · 38` 134
+ `Lock cards` 116 + two 8px gaps (`clear-auto.tsx:118`) = **342 of 358**. That is reproduced from IBM Plex Mono's
0.6em advance at 12px. A fill adds at most 99 cards, so both counts stay two digits. There are 3 lines: the lane
pills, cluster 2, and the arrangement cluster, at 345 of 358 (decklist-sort `README.md:204`). **No fourth line**,
because the arrangement cluster is untouched and still one child (`group-toggle.tsx:224-228`, `:258-267`). With no
auto cards, Lock cards joins the pills' line and the count stays at 2 lines. Design's 276 is a sans figure that was
not reproduced, but it leaves 82px to spare.

**1300.** The box is 1300 − 62 (the rail, `nav.tsx:148`) − 52 (`group-toggle.tsx:121`) = **1186**. The builder
is one column (`builder-shell.tsx:887-895`). The decklist-sort figure of record, 1006 of 1008, was measured in a
frame with a 240px sidebar the app does not have (decklist-sort `README.md:203`). The same widest state plus
Lock cards and its 8px gap is **1130 of 1186**. With the draft note in place of the kept note (26 or 27 characters
at 11.5px, by version, against 22 at 11px: +34 to +41) it is **1164 to 1171, 15 to 22 spare**. The row is one line
at 1300. It wraps between clusters below about 1244 wide (1278 to 1285 with a draft note), where today it wraps
below about 1120. That is a
second desktop line, which Design accepts ("wraps whole clusters, as it does today"), not the phone's fourth. The
canvas's desktop frame is 1300 wide with no rail, so its bar's content box is 1248, 62 more than the app's
(`Toolbar.dc.html:220-221`). Design gives no desktop figure. These are computed, not measured (T1).

### Tokens, target, copy

- **Tokens.** All 18 the addendum reads are declared in all six themes in `globals.css`. `--display` is the
  canvas's own. No new token and no hex.
- **Target.** 44 × 116 at 390, from `min-h-[44px]` (`clear-auto.tsx:33-34`), 8px from Clear.
- **Done ink.** The label is `--accent` text on `--bg`, so its bar is 4.5:1: **4.51** (phyrexia) to 9.42
  (ixalan), 5.08 kaldheim. It passes, by 0.01 in phyrexia. With no fill it keeps `group-toggle.tsx:127-132`
  (no accent ground; accent tints a border). `view-toggle.tsx:71-73` says the bar "spends accent on nothing",
  which the Shopping pill's ring already contradicts (`group-toggle.tsx:154`); `Done` is a second exception.
- **Copy.** The mode's line and count match `mode.line` and `mode.count` in the copy file. The three L3 strings
  use `recommendations.ts:25`'s `plural` shape. They contain no em dash and no apostrophe. The receipt counts the
  locked cards the sweep left, as L3 asks.

### Findings

| # | Sev | Evidence | Finding and correction | Owner |
|---|---|---|---|---|
| T1 | Low | §Width; `scripts/probe-deck-sort.mjs:16-21` | **The 1300 budget is computed**, and decklist-sort's first computed figure was 53px wrong. `probe:deck-sort` cannot settle it as it stands: its fixture copies whatever deck the account has, and its own header says the auto cluster is narrower than the worst case, so it reports one line either way. **Correction:** a fixture built to the worst case (two-digit auto and kept counts, a draft note at v10 or later), measured with Lock cards at 1300, asserting one line. 1280 is recorded, not asserted: the worst case there is about 5px over, and the row wraps between clusters by design. If 1300 wraps, spend the fallbacks readiness-decklist-sort already names | eng |
| T2 | Low | `clear-auto.tsx:237-239` | **The receipt wraps at 390 with two-digit counts.** The text slot is about 290 (358 − 26 − 2 − 10 − the ~30px `Undo`), and the two-clause string is about 296 at 11px mono. Only `stayed` crosses, so the line breaks as `2 locked cards / stayed`. **Correction:** make each clause `whitespace-nowrap`, with the separator inside the second clause, so the line breaks at the middot (the `probe:commander-row` rule) | eng |
| T3 | Low | `builder-shell.tsx:699`; `decklist.tsx:369`; F1 | **The addendum does not state the unit of `lockedAutoCount`.** `autoCount` and the swept count are copies, and a lock is one per oracle id. **Correction:** `lockedAutoCount` and the receipt clause count copies, so `auto − lockedAuto` subtracts like from like. `mode.count` counts locked cards. Say so in the copy comments | eng |
| T4 | Low | F5; `actions.ts:816-830`, `:1096-1115` | **L3 replaces F5's "locking clears `auto`".** Keep all counts locked auto cards and the receipt names them, so a lock leaves `auto` alone. **Correction:** the sweep skips locks with a `not exists` inside its delete, after the deck row lock `clearAutoCards` already takes, so a lock committed first is seen. `undoFillPass` is the other `auto` sweep and takes the same skip. It already reports a card as staying | eng |
| T5 | Low | `clear-auto.tsx:84-88`, `:99`, `:104`, `:186-187` | **`ClearAutoButton` has one count and no mode.** **Correction:** Keep keys on `autoCount`, and Clear on the clearable count. The confirm's reset stays on `autoCount`. `busy` takes the mode, and the `:186-187` note is rewritten, as Design asks | eng |
| T6 | Low | F11(c); `builder-shell.tsx:898-900` | **F11(c)'s fix fails 2.5.3 once the visible label reads `Done`.** One stable name with `aria-pressed` does not contain the visible label. **Correction:** no `aria-label`. The name is the visible label, with no `aria-pressed`. Entering and leaving the mode are announced in the builder's live region | eng |

Nothing goes back to Design.
