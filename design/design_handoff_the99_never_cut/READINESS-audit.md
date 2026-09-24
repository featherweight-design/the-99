# Readiness audit: locked cards ("never cut"), R2

**Audited:** 2026-09-24, against `origin/main` at `620aecfa`. Every file:line below was read on that commit.
**Brief:** none. The ask was the Design prompt of 2026-09-24 (Hugh): a player can mark a card in a deck "never
cut" so no tool suggests removing it, after tuning cut Lotus Petal and Ornithopter from a Yuriko ninjutsu deck.
**Package:** this folder, committed as delivered. **R2 is canonical**: `READINESS.md` and `README.md` both name
`The 99 - Never Cut v2.dc.html`, with `Deck Rows v2`, `Deck Tiles` and `Tuning Panel` (states `v2*`) as its
children. R1 (`The 99 - Never Cut.dc.html`, `Deck Rows`, `Card View`) is history, except that R1 1d holds the
only drawing of the climb sheet. Design's own `READINESS.md` is answered in §5.

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
| `ProxyControl`'s optimistic, serialised toggle | Yes, as the mode's model | `card-modal.tsx:1732-1740` |

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

The glyph is a graphic, so its bar is 3:1 (WCAG 1.4.11). Measured against the row's `--surface-rail` in all six
themes: `--fg-faint` (the hover lock) 3.96 to 5.11, `--fg-muted` (the mode's open lock) 6.42 to 7.05,
`--fg-body` (at rest) 9.03 to 9.74, `--accent` (the mode's closed lock) 4.39 to 9.04. `--fg-faint` on
`--elevated` is 3.41 at its lowest (kamigawa). All clear.

**`--fg-locked` is not the lock's ink.** It is the text ramp's dimmest step (`globals.css:35-40`), and the
name will tempt. The lock's inks are the four above.

---

## 3 · Findings

| # | Sev | Evidence (origin/main) | Finding and correction | Owner |
|---|---|---|---|---|
| F1 | **High** | `versions.ts:301-313`; `schema.ts:380-416` | **A `deck_cards.never_cut` column is wiped by every discard.** `restoreDraftFromVersion` deletes the draft and reinserts `quantity` and `auto` only, so discarding any edit would silently unlock every card in the deck, including cards the discard never touched. The column also cannot express a lock on a commander, though no tool cuts one. **Correction:** a side table, `deck_locks (deck_id, oracle_id, created_at)`, with a primary key on the pair and `on delete cascade` from `decks`, mirroring `deck_proxies` and its reasons. Every read is membership-scoped. It is not versioned, as Design says. The migration takes the next free number after 0059 | eng |
| F2 | Medium | `decklist-row.tsx:641-660`; `actions.ts:484`, `:650-655`; `versions.ts:319`; STATES "Removed with ✕" | **The package contradicts itself on when a lock ends.** It says the lock is "removed with the card", and that `Put back` restores both. The row's undo reads `Undo` and is a plain re-add. It carries no state, so a lock deleted at removal cannot come back. A discard that restores a removed card has the same gap. **Correction:** Hugh rules (H1). (a) The lock ends at removal, as a proxy does: Undo and Discard bring the card back unlocked, and STATES is corrected. (b) The lock row stays while the card is out of the draft. It is inert, because every read is membership-scoped, and it is pruned only when a commit makes the removal final. Undo and Discard then bring the card back locked. **Recommended: (b).** A player who undoes a mis-press expects the card they had, and a lock prunes nothing about claims, which is the reason proxies prune at once | eng (Hugh rules) |
| F3 | Medium | `Deck Rows v2.dc.html:40-60`, `:217-223`; `group-toggle.tsx:122-126`, `:225-228` | **The `Lock cards` button is drawn in a toolbar the app does not have.** The canvas draws segmented All/Shopping and List/Cards pairs. The shipped toolbar is filter pills, the auto cluster, a hairline, and the grouping, sort and view cluster. It already wraps at 390, and its own comment says an eighth control put the view well alone on a fourth line. The canvas's button is 44px tall on the phone, beside 26px pills. The canvas hides it under the Shopping filter, and no written spec says so. **Correction:** Design places the button in the shipped cluster order at 390 and 1300 in both views, and gives its phone height. Design says whether the Shopping filter hides it, and whether the mode's line takes the mark key's line (the key hides in the mode) | Design |
| F4 | Medium | `verdicts.ts:84-117`; `state.ts:39-41`; `tuning-read.ts:244-252`; `validate.ts:99-100` | **Every filter must hold on the server, not only in the panel.** `applyItem` re-checks the cut and the add but reads no lock, so a stale panel could apply a locked cut. `state.ts` itself says apply refuses what does not apply, "whatever the panel drew". **Correction:** the `neverCut` rule after `cutInDeck`, counted in `drops` with its own key so the lead can exclude it. `applies` in `tuning-read`'s SQL gains the lock. `applyItem` refuses a locked cut under the deck row lock it already takes. The swap lane's `takeStandIn` refuses a locked original, as its own server check. The pack takes the lock set as an input, as it takes `owned` (`evidence.ts:97-105`), never through the stored profile | eng |
| F5 | Medium | `actions.ts:1791`, `:2005-2009`; `actions.ts:816`, `:1096`; `schema.ts:384-387` | **Two removals the app offers are not covered.** (a) `Pull it` on the review screen takes a copy out of *another* deck and commits a version there. That deck may have the card locked. (b) `Clear all auto` and the fill's undo sweep rows still flagged `auto`. A player can lock a card the fill added without pressing Keep, and the sweep then removes it. **Correction:** Hugh rules (H2, H3). Recommended: locking an `auto` card clears `auto` in the same write, since a lock is a stronger keep. `Pull it` does not offer a copy from a deck that has it locked, and says which deck holds it, as the pull already refuses a deck with pending changes (`actions.ts:1987`) | eng (Hugh rules) |
| F6 | Low | `upgrade.ts:53-74`, `:97-101`; `upgrade-path.tsx:41`, `:170-176`, `:338-383`; R1 1d | **The climb needs the lock at the view, and three cases are unsaid.** (a) The lock must not enter the stored `DeckProfile`, or a toggle would dirty the analysis. Sort and sentences belong in the sheet, and `UpgradePathSheet` takes the lock set as a prop. (b) `unreachable` is "the unlocked cuttable candidates are fewer than `removeCount`". That is "locked > allowance" only when no commander counts, and `upgradePath` already drops commanders. (c) In the `Forced` state (candidates equal the count), one locked card is enough to trigger `unreachable`. A combo whose every non-commander piece is locked has no sentence, and should take `unreachable` with the combo's piece count. The climb is drawn only in R1 1d, at 1300, with R1's 9×11 glyph and a `never cut` label. **Correction:** R2's glyph and word. The phone sheet is traced from the shipped sheet. The sentence goes "under the rule", as 1d says. `blocked` (commanders) stays distinct: it is a fact, while `unreachable` is a choice the player can undo | eng |
| F7 | Low | §2 Width; `decklist-row.tsx:54-58`, `:614-633`; `cost-pips.tsx:49` | **The reserved slot costs every desktop row 32px of name.** At 768 a worst-case row falls from about 84px to about 52. Hugh approved the reserved slot, so this is a measurement to take, not a reversal. In Shopping, the swap lane's ⇄ adds its own 22px slot. **Correction:** a probe reads the name's `scrollWidth` against `clientWidth` at 390, 768 and 1300 over the longest staging names, with the marker and buy tag present. If 768 cuts names to nothing, the slot becomes an overlay on the ✕'s left edge rather than a flex item | eng |
| F8 | Low | `card-tile-caption.tsx:176`; `deck-card-tile.tsx:303-395` | **The tile's meta line has no overflow rule, and the lock adds 17px to it.** At a 178px phone tile the line has about 125px after the 44px ✕ column and the 9px inset. A dot, an availability chip, a count and two fact marks already reach that. **Correction:** probe the fullest meta line at 390. Set a truncation order in which the lock never drops, because it is the only place a tile says it is locked | eng |
| F9 | Low | `fingerprint.ts:1-12`, `:37-55`; `gate.ts` | **A lock does not reopen tuning's gate.** The fingerprint hashes "only the player's own changes", and a lock is one. Without it, a player who locks Ornithopter after a run is told nothing changed. The gate is soft (`Suggest again anyway`), so this is friction, not a dead end. **Correction:** hash the sorted locked ids beside the list | eng |
| F10 | Low | `tuning-actions.ts:141-142`; `deck-tuning.ts:184-189` | **A run whose every suggestion cut a locked card lands on `ungrounded`**, whose body names three causes, none of them a lock. Locked drops are uncounted by design, so nothing else explains the empty result. It should be rare, since the model is told. **Correction:** when every drop is `neverCut`, the body takes one lock-aware sentence, through `/copy-review` | eng |
| F11 | Low | `never-cut · copy strings.ts`; README R2 | **Copy drift and three copy bugs.** (a) `climb.unreachable` reads "1 of these are locked" at n = 1 and "All 1 are locked" at a total of 1. (b) `mode.refused` uses a straight apostrophe, and the house uses ’ (`deck-tuning.ts` has 17). (c) In the mode the button's visible label is `Done`, but `mode.buttonAria` is "Lock cards: …", so the accessible name does not contain the visible label (WCAG 2.5.3). (d) README R2 names `tuning.cutMarked`, `tuning.allMarked` and `mode.line(n)`, and the copy file has `cutLocked`, `allLocked`, and `line` plus `count`. **Correction:** the copy file is the source. (a) to (c) are fixed at `/copy-review`, and the button carries `aria-pressed` with one stable name | eng |
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
  (F2); a tuning apply against a locked cut (F4). Mutations: the prune moved to removal, the `applyItem` check
  dropped, the validator rule dropped.

---

## 4 · For Hugh

- **H1 (F2).** When you remove a locked card and then press Undo, or discard the draft, should it come back
  locked? Recommended: yes, and the lock ends only when the removal is committed.
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
