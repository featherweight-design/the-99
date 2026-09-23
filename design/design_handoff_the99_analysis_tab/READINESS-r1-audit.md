# Readiness audit: the Analysis tab, consolidated (R1)

**Verdict: 🟡 Yellow.** Audited 2026-09-23 against `origin/main` at `67f29274` (#877), which is
what this branch sits on. The tab itself (sections 1 to 3 and 5 of `HANDOFF.md`) is buildable,
and nothing in it has to be redrawn. Two things stopped it being Green:

- **Three rulings belonged to Hugh (now SETTLED 2026-09-23, see the next section):**
  - The stored read on `main` never returns a stale reading, so 2i is unreachable until the
    read changes, and the handoff says nothing about the two other reasons a stored reading
    lapses: a catalog refresh (weekly) and the 7-day cap.
  - The handoff draws the header chip holding the old bracket while stale. #877 shipped the
    opposite rule a day earlier.
  - The synopsis has no way to be written for a reading that already exists.
- **The synopsis (canvas section 6, `SYNOPSIS-modal.md`) cannot ship yet.** Its backend is
  sub-project 6 and does not exist. The Overview paragraph, `View full synopsis →`, the modal and
  the Versions-tab link all wait for it. Until then the tab's only reachable Overview state is
  "no synopsis", which is **undrawn**. Finding 6 gives the engineering answer.

Design read an earlier `main` (their `READINESS.md:7-14` lists the files read, not a commit). Six PRs touching this surface merged since the files it names were last read. The only
conflict among them is #877, and it is finding 3. #874 is the premise of finding 1. #876's
"Bracket facts" heading is inside `CardModal` (`card-mark.ts:61`), which the handoff stacks
unchanged, so there is no conflict there. #875, #878 and #881 touch nothing drawn here.

## Hugh's rulings, 2026-09-23 (they settle findings 1, 2 and 5, and reshape PR C)

**A deck carries one standing analysis: the last one the player ran. It describes the deck in
its current state until the player runs another.**

1. **v0 (no version yet).** Analysis needs a legal deck, never under or over. It belongs to the
   deck, not to a version.
2. **Commit.** Analysis runs alongside the commit. If the list is unchanged since the last
   analysis, nothing is recomputed: the existing analysis is pinned to the new version. This
   gives finding 7's "analyzed with version n" its data.
3. **Edit, then re-analyze.** The new result and the player's declaration become the deck's
   bracket everywhere: the tab, the header and the tile.
4. **Edit without re-analyzing.** The deck KEEPS its last bracket everywhere, header chip
   included, and the Re-analyze prompt shows. **Finding 2 is settled for the handoff:** the chip
   holds, which reverses #877's hide-on-edit rule (`use-header-bracket.ts:17-18`).
5. **Drift is an isDirty flag, not a diff.** Any edit sets it; any analysis clears it. After a
   revert to the analyzed list the prompt still shows, and the press finds the same fingerprint,
   answers almost instantly from the stored analysis, and clears the flag.
6. **Only the player's edits cause drift.** A catalog refresh, a new set or a price update never
   does. **Finding 1 is settled:** the stored analysis stops lapsing on the catalog generation and
   the 7-day cap, and the banner's "your deck has changes" is then always true. Telling a player
   that bracket-relevant DATA moved under their deck (a new Game Changer, a new flag, a new combo
   touching their cards, a rules change) is a separate feature, scoped on its own and never an
   automatic re-analysis.
7. **The synopsis (finding 5).** Re-analyze rewrites it when the list has changed, charged
   against a daily per-player allowance shared with #10 deck tuning. The bracket, findings, climb
   and lean cost nothing and are never limited. An unchanged list returns the stored synopsis. An
   exhausted allowance leaves the synopsis in its stale state with a reset line. The number is set
   in sub-project 6 once a call is measured. A commit does not write a synopsis.

## Findings

| # | Sev | What | Handoff | `main` | Resolves |
|---|---|---|---|---|---|
| 1 | High | **2i (stale) is unreachable, and staleness has three causes the handoff treats as one.** The stored read returns a row only when fingerprint, catalog and a 7-day age all match; any other row reads as `none`, which is 2a. The banner's sentence ("Your deck has changes…") is false when the cause is a catalog refresh or age, and the catalog refreshes every Monday. | `HANDOFF.md:96-97`, `STATES:17`, copy `:52` | `stored.ts:33`, `stored.ts:86-102`, `stored-sql.ts:20`, `profile-actions.ts:72-75` | **Settled 2026-09-23:** no lapse on catalog or age; eng builds (PR C) |
| 2 | High | **What the header chip shows during 2d and 2i.** The handoff draws the held bracket. #877 retires the chip the moment the list changes, on the header and on the tile, because it would otherwise draw a bracket "for cards the analysis never read" (`use-header-bracket.ts:18`). Round 0 says one chip, one meaning, so the two rules cannot both ship. | `STATES:12,17` | `use-header-bracket.ts:17-18`, `stored-sql.ts:40-42` | **Settled 2026-09-23:** the chip holds |
| 3 | Med | **The header chip is redrawn, and #877 shipped it yesterday.** Handoff: radius 6, a filled plate, mono 11/10, 22px marks, 24px tall on desktop, and a range reads `Optimized or cEDH` with no slash. Shipped: `rounded-full`, no plate, sans 11 medium, 20px mark, 22px tall, `Split` with a slash. The tile draws the same `BracketChip`. | `HANDOFF.md:29-31`, `analysis-fixtures.js:196-204` | `bracket-chip.tsx:43-44,67-93`, `deck-analysis.ts:159`, `gap-report-bracket-chip.md:11-13,26-29` | eng (below) |
| 4 | Low | **Two phone header orders.** The canvas's order table puts the phone chip on "its own line above the title". `HANDOFF.md` and the 390 frame put the chips row under the commander line. This redraw also settles #877's deferred band-order item. | canvas `:452` vs `HANDOFF.md:27-28`, `Analysis Tab 390:48-56` | `gap-report-bracket-chip.md:34-37`, `spine-mobile.tsx:100-107`, `spine-desktop.tsx:445-449` | eng: HANDOFF wins (its `:15`) |
| 5 | High | **The synopsis has no write path for an existing reading.** Analyze and Re-analyze write it. A current reading has no re-analyze control. So a reading without a synopsis cannot get one until the list changes: that is every reading stored before sub-project 6, and any reading whose generation failed. Tying the write to Analyze also adds a model call (Round 0: "about five seconds") to the 630ms press every time. Brief §2.5 draws `Write one` / `Write it again`. | `SYNOPSIS-modal.md:62-64`, `HANDOFF.md:57` | brief `:66-67`, `deck-analysis.ts:124-125` | **Settled 2026-09-23:** re-analyze rewrites on a changed list, against a daily allowance |
| 6 | Med | **The tab has no "no synopsis yet" state.** Every analyzed frame draws the Overview paragraph and its entry point, but until sub-project 6 the only reachable state is "none". `main` fills that slot with a placeholder sentence, which §6.2 of the handoff forbids. The state where the reading lands before the synopsis finishes is undrawn too. | `Analysis Tab 1300:131-133`, `HANDOFF.md:111`, `SYNOPSIS-modal.md:60` | `analysis-panel.tsx:211-219`, `builder-shell.tsx:1129`, `deck-analysis.ts:121-122` | eng: drop the Overview section entirely; the climb leads the left column; delete `SynopsisSlot` |
| 7 | Med | **A "committed reading" has no source.** `deck_profiles` carries no version. A version stores its `permits` and `declared_bracket` (`schema.ts:453`), and no reading. A commit computes a profile only when the deck carries a declaration, and it does not store one. | `HANDOFF.md:97`, `STATES:32`, `copy strings:42-43,59` | `schema.ts:1469-1481`, `schema.ts:462`, `actions.ts:1453-1456` | eng (below) |
| 8 | Med | **The hook cannot hold a reading while it re-reads.** `loading` replaces `ready`, and `failed` carries no profile. Both 2d and "loading over a held reading" need that. | `STATES:12,19` | `use-deck-profile.ts:13-23,110,127` | eng |
| 9 | Med | **`CardDetailTrigger` does not host the hover preview.** The preview is `HoverPreviewProvider` / `usePreviewRow`, mounted only by the decklist and the top-off list. Names in the Overview and the synopsis need a provider, and it has to draw above a `z-50` sheet. | `HANDOFF.md:51`, `SYNOPSIS-modal.md:20-21` | `card-detail-provider.tsx:113-118`, `hover-preview.tsx:131,244`, `decklist.tsx:675,812`, `top-off-list.tsx:1004` | eng |
| 10 | Med | **The `← {backLabel}` pill does not fit the ✕'s slot.** The name block reserves 46px for a 34px ✕. The labels include `How we determined bracket 4` and `Two-card infinites`. "Nothing else in the modal moves" cannot hold. | `HANDOFF.md:78-81` | `card-modal.tsx:1559-1563,1589`, `deck-analysis.ts:464` | eng: widen the reserve when `backLabel` is set; measure it |
| 11 | Med | **6c promises "the rest are unchanged".** One call that rewrites the whole synopsis can change the sections that passed. | canvas `:388` note, `SYNOPSIS-modal.md:45-46` | (sub-project 6) | eng: regenerate only the refused section, or drop the claim |
| 12 | Low | **A declaration during a stale range (HANDOFF §4.2).** `declareBracket` recomputes the *current* profile. A chip pressed on a stale range is checked against a list the reader has not seen, and it pays for an analysis they never asked for. | `HANDOFF.md:91` | `declaration-actions.ts:69-78` | eng: withhold the chips (only defensible option) |
| 13 | Low | **Reachable shapes that are carried over but not fixtured:** the drifted declaration, `[1,2]`, a single `[2]`, and a draw-only lean on `[3]`. §B's "ask · answer · version row" leaves out drifted, which the shipped code draws next to an ask. | `STATES:24-25`, fixtures `:275-316` | `rules.ts:98-101`, `declaration-ask.ts:32-51`, `declaration.tsx:118-135` | eng: shipped components carry them; the probe walks each one |
| 14 | Low | **Date format.** The handoff writes `18 Sept`. `main` writes `18 Sep` (en-US) on purpose. The package's own synopsis sheet already writes `14 Sep 2026`. | `STATES:32-33`, fixtures `:285-337` | `format.ts:99-101,108-109` | eng conforms |
| 15 | Low | **Copy coverage.** See the Copy section below. | `analysis-tab - copy strings.ts` | `deck-analysis.ts`, `upgrade-path.ts` | eng via `/copy-review` |
| 16 | Low | **The lean conform is partial.** It gives 1 of the 5 variants it names. It changes "this deck can find" to "your tutors can find". "Two-card infinite combo" also lands on game-ending pairs, though the findings label has made the same claim since before this handoff. | `copy strings:88-99` | `deck-analysis.ts:433-435,363` | eng via `/copy-review` |
| 17 | Low | **The empty ring's marks run at 0.3 (failed) and 0.22 (loading trough),** below `DIM_OPACITY` (0.65, #871). | fixtures `:237` | `bracket-mark.tsx:51` | eng: the ring is decorative (`aria-hidden`; the heading carries the state), so it is exempt, with the exemption recorded in the code |
| 18 | Low | **The About entry.** See the About entry section below. | `ABOUT-entry.md` | `about.ts:34,331-337,363-389` | **Hugh** + Design |
| 19 | Low | **The deck-stats ledger is dropped,** and the home the canvas names for it does not exist. | `HANDOFF.md:92`, canvas `:286-302` | no `design_handoff_the99_deck_stats/` on main or in history; `design-pipeline-status.md:270` | **Settled 2026-09-22:** Hugh leaves the four figures out until deck stats is scoped on its own |
| 20 | Low | **Items that close.** `READINESS.md` items 3 to 5 close against `main`, and so does the owed `[3,4]` split. | `READINESS.md:20-28` | `deck-analysis.ts:18-20,71`; `rules.ts:98-101` | closed |
| 21 | Low | **Canvas conventions that need mapping.** `--display` is `font-display` / `--font-display-face` on main. The `at-wave` keyframes are not in `globals.css` yet. | frames `:27-28` | `globals.css:93`, `globals.css:615-667` | eng |

**Finding 3, eng's call.** Build the handoff's chip inside `BracketChip`, so the tile and the header
still draw one chip. This is the same "newest instruction wins" rule #877 applied when it chose the
named chip. `splitChip` then retires, and so does the `Split` label, which the new bracket box no
longer uses either. `probe:bracket-chip` has to be re-run at 700: `Optimized or cEDH` is about
twice the width of `Split`, the tile's chip cell already wraps at that width, and the bar's 40px
floor has to hold.

**Finding 7, eng's call.** The date line reads `analyzed with version n` only when the stored
fingerprint matches the current list **and** the deck is clean at version n. "Never goes stale"
belongs to the version's own `permits` snapshot, which is what the version row and the rail read.
The tab's reading of a draft edited past v3 is stale like any other.

## 1 · What the handoff says is shipped

| Handoff claim | `main` | Holds? |
|---|---|---|
| `ModalChrome`: title, aside, close; `mark` to become optional | `mark: React.ReactNode` is required (`receipt-modal.tsx:107`) | yes, it is a change the handoff lists (§5.5) |
| Widths 560 / 700, adding 760 | `md:w-[560px]` / `md:w-[700px]` via `wide` (`:112,146`) | yes; 760 is new |
| Phone sheet from 52px, 43px header | `h-[calc(100%-52px)]` (`:144`), `h-[43px]` (`:156`) | yes |
| The sheet behind steps down to `--surface-sunken`, header at 0.55 | `:151`, `:157` | yes; **body at 0.35 is new** |
| Receipt: 5 tiles across in 560 | `md:grid-cols-5` (`:75`), name 11 / 10.5 (`:222`) | yes; the handoff changes it to 4 across in 760, name 12 |
| CardModal desktop ✕ = `closeRefs[1]`, top 22 / right 24, 34px, `--surface-raised`, `--border-strong` | `card-modal.tsx:1557-1563` | yes |
| Provenance is a disclosure | `useState` open / `aria-expanded` (`provenance-panel.tsx:28,53`) | yes; it becomes a sheet |
| Upgrade path has target chips and `open your decklist` | `upgrade-path.tsx:55,85,92`; `upgrade-path.ts:32,34,76` | yes; all three are removed |
| `RoleCounterStrip` carries its own gutters | `px-[16px] … md:px-[30px]` (`role-counter-strip.tsx:68`) | yes; needs an inset mode |
| The strip moves into the tab behind the flag | `builder-shell.tsx:1046-1055,1136-1143` | yes |
| The tab has no URL; the chip opens it | `builder-view.ts:1-12`; `SpineBracketChip` calls `setView` (gap report `:18`) | yes |
| `CardDetailTrigger` hosts the hover preview | no (finding 9) | **no** |
| `{MLD_DETECTION.methods}` / `{COMBO_DETECTION.basis}` are slots | already interpolated (`deck-analysis.ts:18-20,71`) | closed |
| Tokens: `--surface-rail`, `--border-strong`, `--surface-sunken`, `--surface-raised`, `--elevated`, `--fact`, `--bracket-1…5`, `--danger`, `--accent`, `--fg-*` | declared in all six themes in `globals.css` | yes (`--display` is finding 21) |

## 2 · States

**Verdict shapes.** `permitsFor` returns exactly `[1,2]`, `[2]`, `[3]`, `[4]` or `[4,5]`
(`rules.ts:98-101`). A lean is possible only on `[3]` or `[4]` (`slot.ts:180`). A declaration can
be asked, answered, drifted or none (`declaration-ask.ts:19-54`).

- The frames draw `[4,5]` asked (2e), `[4,5]` answered (2f), `[3]` with a version row (2g), `[4]`
  with a reachable-commander lean (2h), and `[3]` stale (2i).
- The rest are the shipped components, carried over (finding 13).
- There is **no "violation" shape**: `[4,5]` is the deck past all three limited brackets, drawn
  with the same ink as any other (`deck-analysis.ts:147-154`).
- `[3,4]` is unreachable, which closes the owed item: the lean is how the design shows that
  uncertainty.

**Profile states.**

| State | Drawn | Reachable on `main` today |
|---|---|---|
| Never analyzed (2a) | yes | yes (`idle`) |
| Loading, nothing held (2b) | yes | yes |
| Failed, nothing held (2c) | yes | yes |
| Fresh (2e–2h) | yes | yes (`ready`, peeked or pressed) |
| Stale (2i) | yes | **no**: refused at the read (finding 1) |
| Loading over a held reading | described | **no**: `loading` replaces `ready` (finding 8) |
| Failed re-read over a held reading (2d) | yes | **no** (finding 8) |
| Stored but the catalog moved, or older than 7 days | **no** | yes: reads as 2a (finding 1) |
| Flag off / deck not found | not drawn; correct | `disabled` / `missing` render nothing (`analysis-panel.tsx:134,139`) |

## 3 · The synopsis against the brief (§2 and §5)

| Brief rule | Handoff | Holds? |
|---|---|---|
| A fourth body in `ModalChrome`, not a new modal (§3.2) | the chrome is unchanged; `mark` optional (`SYNOPSIS-modal.md:11-15`) | yes |
| Phone header rule: 43px, card sheet from 96, `--surface-sunken` step-down (§3.2) | `SYNOPSIS-modal.md:13-15` | yes |
| No bracket, strength or score in the generated prose; status counts allowed (§2.2, §5) | `SYNOPSIS-modal.md:70-73`; the fixture's one number is a game fact ("deals 16"), not a strength figure | yes; the prompt contract should allow game facts and forbid strength figures, not ban "numbers" |
| Weaknesses untiered, at most 3 (§2.3, §5) | 1–3, diamond bullets, no numerals | yes |
| Key tips name only cards in the deck (§2.3, §5) | "each naming ≥ 2 cards in the list" | yes |
| No "may state details incorrectly" disclaimer (§5) | none | yes |
| `--danger` on the refused tag only; retry is a button (§5) | `SYNOPSIS-modal.md:43,73` | yes |
| Per-section refused and stale states (§3.3) | 6c drawn; stale is a banner, not the brief's "demoted and tagged" | Hugh signed off 6d, which overrides §3.3 (not a §2/§5 rule) |
| A committed version keeps only the synopsis written for its exact list (§2.4) | "only for a version committed with a synopsis" | yes; the fingerprint check at commit is backend |
| Every card name opens the card (§3.2) | yes | yes; the hover half is finding 9 |
| Written only on press (§2.5) | on Analyze / Re-analyze | on press, **but** finding 5 |

**What waits for sub-project 6.** All of these need the generator, the per-section accept
contract, storage, the copy at commit (brief §2.4) and a fingerprint of their own:

- the Overview paragraph in the tab;
- `View full synopsis →`;
- the modal and all four of its states;
- `Synopsis for this version →` in the Versions tab.

**An honest "no synopsis yet".** The modal half has one: no modal and no entry point
(`SYNOPSIS-modal.md:60`). The tab half does not (finding 6).

## 4 · The deck-stats ledger

**Dropped from the tab**, not moved within it. Round 0 reserved it (`README.md:88,211` of
`design_handoff_the99_deck_analysis/`). This handoff rules it out (canvas §4) and says it "stays
at the foot of the Deck panel" per `design_handoff_the99_deck_stats/ §1`.

That package is not on `main` and has no git history. The tracker records deck stats as paused
with no handoff produced (`design-pipeline-status.md:270`). `stats.ts` / `stats-query.ts` are
real, and are imported only by `profile/`.

So the four figures currently have **no drawn home anywhere**. That is Hugh's call to accept
(open call 3).

## 5 · The deck header and #877

Findings 2, 3 and 4. The handoff redraws two things #877 just shipped:

- **The chip.** Finding 3: eng resolves it, one component for both mounts.
- **The band order.** This one is welcome. It is exactly the item #877 deferred
  (`gap-report-bracket-chip.md:34-37`). It moves the status pill off the commander line at 1300
  (`spine-desktop.tsx:445-449`) and off the front of the meta row at 390
  (`spine-mobile.tsx:100-107`).

The chip's behaviour stays as #877 built it: 44px hit area, lands on the Analysis tab, absent
before a reading. What stays open is its meaning when the reading is stale (finding 2).

`probe:bracket-chip` and `probe:commit-offer` both measure this header, and both need
re-running.

## 6 · The About entry

The eleven §G slots are present (`STATES-about-r3.md:44-50`), and there are 3 of 4 key lines.
Four problems:

- **Route and opens.** `/decks/[id]` with "opens the deck on its Analysis tab" is not something
  About can link to. Every deck entry uses `/decks` with `opens a deck` (`about.ts:331-332`), and
  the tab is addressed only by a hand-written `?tab=` (`builder-view.ts:7-12`). Eng conforms.
- **Em dash.** The caption has one (`ABOUT-entry.md:20`). About's own prose uses them
  (`about.ts:56`), so this goes to `/copy-review`, as the entry itself says.
- **Coverage.** It covers the verdict, the declaration, the climb, the findings, the upgrade path
  and persistence. It misses:
  - the lean and its reasoning, which the free fourth key line could carry;
  - the version comparison;
  - the header and tile chip;
  - the card marks, which live on other surfaces. `decklist-marks` is at the four-key cap
    (`about.ts:371-387`), so they need their own entry or a ruling that they owe none.
- **Stale entry.** `deck-page` says "Four tabs" (`about.ts:335`) and owes an ordinary edit.

`since` becomes `ABOUT_VERSION` 10 (`about.ts:34`), one bump for the launch batch. Which of the
missing features owe an entry is **Hugh's** call; Design draws whatever he rules.

## 7 · Copy

**Clean.** There is no British spelling in any shipping string. "analyse" appears only in a
comment in the strings file, and "colour" only in handoff prose. There is no em dash in any new
string. The strings file's dashes are all in comments.

**Missing from the strings file**, and owed before build:

- the synopsis strings: `View full synopsis`, `Synopsis for this version`, the record line, the
  stale banner, the refused-section sentence, the tag and the count, the four section labels,
  the three subsection labels, and `Keep` / `Send back`;
- the `Overview` label, which replaces `synopsis.heading` "What this deck is";
- the settle announcement `Analysis ready. Your cards permit {range}.`.

**Should not ship**, because nothing draws them:

- `analysisTabCopy.provenance.asked/committed`: the bracket box has "no provenance sentence"
  (`HANDOFF.md:52`);
- the superseded `stale` block;
- `empty.provenance` and `sheets.provenance`, which duplicate `deckAnalysisCopy.provenance.toggle`
  (`deck-analysis.ts:492`). Reuse that one instead.

**Renamed.** The refused count's noun changes from "claims" to "cards"
(`deck-analysis.ts:138-139`).

**Voice.** "We couldn't re-analyze" sits beside the shipped "We could not finish". This goes to
`/copy-review`.

**Retired by this build.** These strings, and the tables that quote them, go together:

- `panel.analyze`, `panel.analyzeCost` and `panel.again` (`deck-analysis.ts:98-102`);
- `splitChip`;
- `targetLabel`, `targetsAria` and `toDecklist`.

The design tables `declaration-surface.md` and `upgrade-path.md` quote them and must be swept
in the same PR, or `check:copy-drift` goes red.

## 8 · The open calls

1. **The climb in the left column** (§4.1). **Eng decides: as drawn.** Hugh signed off 2a–2i,
   which draw it there. Until sub-project 6 the Overview is absent (finding 6), so the climb *is*
   the top of the left column. The fallback is not needed.
2. **A stale range withholds its chips** (§4.2). **Eng decides: withhold, and keep any existing
   answer.** It is the only defensible option (finding 12).
3. **The ledger out of the tab** (§4.3). **Hugh.** The question for him: *"The deck's curve and
   color counts were going to sit under the mix. This round moves them out, and nothing is drawn
   for them anywhere else yet, since deck stats is paused. Are you happy for them to wait for
   that round?"*

**Findings 1, 2 and 5 were settled by Hugh on 2026-09-23** (the rulings section at the top).
**Still his: the About coverage in finding 18:**

- **Finding 18:** which of the lean, the version comparison, the chip and the card marks owe an
  About entry.

`READINESS.md`'s own items:

| Item | Outcome |
|---|---|
| 1, 2 | As above |
| 3 | Closed |
| 4 | Closed: the shipped phone `CardModal` values stand |
| 5 | Closed: the fixtures are illustrative |
| 6 | Finding 14 |

## 9 · PR split

No stacking. Each PR merges before the next opens. Sizes are estimates.

| PR | Scope | Shared files | Needs |
|---|---|---|---|
| **A: sheets** | `ModalChrome` optional `mark` and 760; receipt at 760 / 4 across / 12px names; 3b sheet (lower rung only, no targets, no decklist link); 3c sheet; `CardModal` `backLabel` (finding 10); retired strings and the two design tables; probes `verdict-findings` and `verdict-lean` re-run, plus a `backLabel` check | `receipt-modal.tsx`, `card-modal.tsx`, `upgrade-path.tsx`, `bracket-climb.tsx`, `provenance-panel.tsx`, `findings-block.tsx`, `upgrade-path.ts`, `deck-analysis.ts`, `builder-shell.tsx` (drops `onOpenDecklist`). About 16 files. | nothing |
| **B: the tab, fresh** | The empty state (ring, `at-wave`), the 2fr / 1fr grid, the bracket box redrawn (no label, no pill, display-face name, `analyzed {when}`), the strip's inset mode, the Overview omitted (finding 6), the settle announcement, `SynopsisSlot` deleted; `probe:verdict-block` updated | `analysis-panel.tsx`, `verdict-block.tsx`, `role-counter-strip.tsx`, `deck-analysis.ts`, `globals.css`, `builder-shell.tsx`. About 14 files. | A merged |
| **C: the analysis lifecycle** | Per Hugh's rulings above: the stored analysis stops lapsing on catalog or age; an isDirty flag set by every edit and cleared by every analysis; the same-fingerprint re-analyze answers from the store; the hook's held, re-read and failed-over-held states; the banner; 2d; the chips withheld on a dirty range; the header and tile chip HOLD the last bracket (reverses #877); analysis on a legal deck only; analysis run and pinned at commit; `probe:profile-store` extended | `stored.ts`, `stored-sql.ts`, `profile-actions.ts`, `use-deck-profile.ts`, `analysis-panel.tsx`, `declaration.tsx`, `use-header-bracket.ts`, the commit action, `db/schema.ts` + one migration. Likely over 20 files: split data (schema, flag, store, commit pin) from surface (hook, banner, chips). | ruled 2026-09-23 |
| **D: header** | The chips row at both widths, `BracketChip` restyled for both mounts (finding 3), `probe:bracket-chip` at 390 / 700 / 1300, `probe:commit-offer` re-run | `spine-desktop.tsx`, `spine-mobile.tsx`, `bracket-chip.tsx`, `deck-card.tsx`, `deck-analysis.ts`. About 10 files. | can run in parallel with B and C |
| **E: synopsis** | The Overview paragraph, the entry point, the fourth body, the Versions link, the hover provider on names (finding 9) | `analysis-panel.tsx`, `receipt-modal.tsx`, `version-history.tsx`, a synopsis copy module | **sub-project 6's backend** (finding 5 is settled). Likely more than one PR |
| **F: About** | The launch batch: the entry, the `deck-page` edit, `ABOUT_VERSION` 10, fixtures, re-pinned hash | `about.ts`, `about/fixtures.ts` | the last PR of the line; Hugh on 18 |

`builder-shell.tsx` (1,457 lines) and `deck-analysis.ts` are touched by A, B and D. Sequencing
the PRs rather than stacking them is what keeps that safe.

## `check:copy-drift`

Run in this worktree on 2026-09-23:
`18549 strings in 38 copy modules and 212 components vs 43 design tables`. No design table
quotes a form the code stopped emitting.

It reads only `docs/superpowers/design-tables/`, so it says nothing about this package's own
strings. It will go red in PR A unless `declaration-surface.md` and `upgrade-path.md` are swept
with the retired strings.

## Clear to build

- **PRs A, B and D can start now.**
- **C is ruled (2026-09-23) and follows D.**
- **E waits for sub-project 6.**
- **F closes the line.**

Nothing here goes back to Design except the About entry's coverage (finding 18), before PR F.
