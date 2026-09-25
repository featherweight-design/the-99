# Design Property Table: About launch entries (PR B: Locked cards, Change commander)

Sources: `README.md`, `READINESS-audit.md`, `about · launch entries.ts`, `The 99 - About · Launch Entries.dc.html` (lines 228–302, 394–411, 445–462, 466–518; §6 at 346–368). Where they conflict, the audit's rulings (L1–L3, C1–C5, G1, Q2, Q3) replace the drawn copy and specimen. A1, A3 and A4 are out of scope.

## Entry: locked-cards

### Slots
| Property | Mobile (390) | Desktop (760) |
|---|---|---|
| id | `locked-cards` | same |
| chapter | `'03'` (03 · Building the 99) | same |
| title | `Locked cards` | same |
| route | `/decks` | same |
| opens | `opens a deck` | same |
| width | `plate` ("plate: several parts need naming") | same |
| since | `10` in the .ts. **Superseded by G1:** no batched bump. "Seen" is recorded per reader as entry ids (a `user_prefs` migration). Entries with `since` 1–9 still read as seen for a reader at version 9 or above. | same |
| switch | `NEVER_CUT_ENABLED` (G1: the entry renders only while the switch is on) | same |
| insert position | after `decklist-marks` ("Every mark on a decklist") | same |
| page order among the five | 2nd (help-me-choose, **locked-cards**, fits-your-decks, stand-ins, change-commander) | same |
| strings from | `copy/locked-cards.ts` (`mode.*`, `mark.*`); no new copy module | same |
| entry frame | width 390, padding `18px 16px 22px`, radius 12, 1px `--border-strong`, bg `--bg` | width 760, padding `22px 24px 26px`, radius 12, 1px `--border-strong`, bg `--bg` |
| card modal | not drawn (L4: the modal shows nothing about a lock) | same |

### Key lines (structure only)
| Key | Count | Correction it must carry |
|---|---|---|
| total | 4 of 4 (limit ≤4) | — |
| Caption | — | **L3**: stand-ins are never offered for a locked card. The drawn copy says they "skip" it, which reads as a filtered list. Re-read against the swap v2 addendum. |
| 1 | 1 | **L2**: on a row the lock sits in the slot just left of the ✕, not after the name. On a tile it sits on the caption's meta line. A locked row offers no stand-ins, and on the review page Pull it shows `locked` instead. The "nothing else changes" claim goes. |
| 2 | 1 | none. The mode turns each ✕ into a lock until Done. |
| 3 | 1 | none. Clear all auto and Pull it. |
| 4 | 1 | **L1**: Undo, Put back **and a discard** all return the card locked. The lock ends only when a version is committed without the card. |
| (L4 climb ordering) | — | **Excluded** by the Q2 ruling. The climb ordering is an edit to the analysis entry that covers the climb. |

### Specimen: composition
| Property | Mobile | Desktop |
|---|---|---|
| component | `DecklistRow` ×3, drawn twice (6 row renders) | same |
| providers | `CardDetailProvider fetchCard={async () => null}` wrapping `LockCardsProvider` | same |
| LockCardsProvider value, set 1 | `{ mode: false, toggle: noop, pending: ∅, errors: ∅ }` | same |
| LockCardsProvider value, set 2 | `{ mode: true, toggle: noop, pending: ∅, errors: ∅ }` | same |
| order | set 1 "at rest" → set 2 "in the Lock cards mode" | same |
| above set 1 | label `at rest` (mono 9.5px, uppercase, tracking 0.12em, `--fg-faint`, padding-bottom 6, border-bottom 1px `--border`) | same |
| above set 2 | the mode's line (`locked-cards.ts mode.*`) with a count (`2 locked`), then the **Done** button. Row: flex-wrap, space-between, gap 8, padding-bottom 8, border-bottom 1px `--border` | same |
| Done button (drawn) | min-width 116, min-height **44px**, radius 7, 1px `--accent`, accent lock glyph + `Done` | min-width 116, min-height **30px**, same styling |
| gap between set 1 and set 2 | 14px (flex column) | 14px |
| figure container | margin-top 10, radius 8, 1px `--border`, bg `--surface-sunken`, padding `14px 16px`, overflow hidden | same |
| row min-height (drawn) | 48px | 36px |
| ✕ hit box at rest (drawn) | 44×44 | 22×22 |
| mode toggle (in the ✕ slot) | 44×44 | 26×22 |
| lock mark position | 14px mark just left of the 44px ✕ (phone note; the L2 ruling applies at both widths) | beside the ✕ (L2). The canvas draws it after the name; the shipped component and L2 govern. |
| truncation | the name truncates first | same |
| Lock cards button (toolbar, phone note) | 44px tall, beside Keep and Clear. Not in this specimen. | — |
| row CSS | shipped component (out of scope) | same |

### Fixture
| Item | State |
|---|---|
| Lotus Petal | `locked: true`, owned (success dot) |
| Ornithopter | `locked: true`, owned |
| Brainstorm | unlocked (`locked: false`); shows the open-lock toggle in the mode |
| provider count | 2 locked |
| pending / errors | ∅ / ∅ |

## State Coverage: locked-cards
| State | Triggering condition | Component rendered | Key props required |
|---|---|---|---|
| At rest, locked row | `mode: false`, `card.locked: true` | `DecklistRow` | lock mark in the slot left of the ✕, and the ✕ present |
| At rest, unlocked row | `mode: false`, `card.locked: false` | `DecklistRow` | ✕ only, no mark |
| Mode, locked row | `mode: true`, `card.locked: true` | `DecklistRow` | ✕ slot becomes the toggle, pressed (accent border, 14% accent fill, closed lock) |
| Mode, unlocked row | `mode: true`, `card.locked: false` | `DecklistRow` | toggle unpressed (`--border-strong`, open lock, `--fg-muted`) |
| Mode header | set 2 only | mode line + `Done` (strings from `locked-cards.ts mode.*`) | count = 2 locked |
| Tile / card modal | — | — (not drawn) | — |

## Entry: change-commander

### Slots
| Property | Mobile (390) | Desktop (760) |
|---|---|---|
| id | `change-commander` | same |
| chapter | `'03'` (03 · Building the 99) | same |
| title | `Change commander` | same |
| route | `/decks` | same |
| opens | `opens a deck` | same |
| width | `plate` | same |
| since | `10` in the .ts. **Superseded by G1** (per-entry seen, no batched bump). | same |
| switch | `CHANGE_COMMANDER_ENABLED` | same |
| insert position | after `new-deck` ("Starting a deck") | same |
| page order among the five | 5th (last) | same |
| strings from | `copy/change-commander.ts` (`sheet.*`) | same |
| entry frame | 390, padding `18px 16px 22px`, radius 12 | 760, padding `22px 24px 26px`, radius 12 |

### Key lines (structure only)
| Key | Count | Correction it must carry |
|---|---|---|
| total | 4 of 4 (≤4) | — |
| Caption | — | **C1**: only commanders with enough decks to measure are listed, not every commander in the colors. **C4**: Discard puts the old commander back only on a committed deck. **Q3**: pairs may be named only if #1002 has merged; otherwise say singles only. |
| 1 | 1 | Carries the same colors/pairs claim, so the **C1** and **Q3** conditions apply. |
| 2 | 1 | none. |
| 3 | 1 | **C2**: owned candidates are marked free or held, the rest carry a buy tag rather than a price (a tag may have no price), and mana value never orders the list. |
| 4 | 1 | **C3**: prefix with "For a single commander, …" until the half-trade ships. `addendum-half-trade/` is not on main. |

### Specimen: composition
| Property | Mobile | Desktop |
|---|---|---|
| components, in order | 1. `ChangeCommanderDoor` on the art band; 2. `GroupHeading` + `CandidateRow` (Yours); 3. `GroupHeading` + `CandidateRow` (To buy) | same |
| candidate rows drawn | 2 (one per group) | 2 |
| providers | `CardDetailProvider fetchCard={async () => null}` (required: the door calls `useCardDetail()`, and the row renders `CardDetailTrigger`), `ChangeCommanderProvider` around the door | same |
| row handlers | `onToggle`, `onChoose` as no-ops (C5) | same |
| extraction | **E2 accepted (C5):** export the sheet's `Row` and `GroupHeading` unchanged as `CandidateRow`, because a second local `Row` exists in `change-commander-review.tsx` | same |
| fallback (only if E2 is declined) | door + `CommanderSection`, whose fixture needs a `DraftState` where the commander moved (it returns null otherwise). This loses the figure, which is the entry's subject. | same |
| art band height | 150px | 120px |
| art band | radius 8, 1px `--border`, overflow hidden, Gishath art crop `center 20% / cover` | same |
| door (drawn) | vertical pair at right 10 / bottom 10: ⇄ above ⛶, each 44×44, 1px divider, radius 8 | horizontal pill at left 12 / bottom 10, height 26, radius 7: `⛶ Card details` \| `⇄ Change commander` |
| gap between band and groups | 14px (flex column) | 14px |
| group heading | label (mono 10.5, uppercase, tracking 0.16em) + `by figure` right-aligned; padding-bottom 8, border-bottom 1px `--elevated` | same |
| row | art thumbnail 56×41, then name + free/buy tag, pips + relative MV, figure (▾, min-height 36) + Choose; padding 11px 0, gap 12 | same |
| Choose height (drawn) | 44px | 36px |
| sheet (phone note) | full height; each row stacks name, pips, figure and Choose. The sheet itself is not mounted. | — |
| row/heading CSS | shipped component (out of scope) | same |

### Fixture
| Item | State |
|---|---|
| Deck | `HD - Gishath`, Naya, 64 counted cards; commander Gishath, Sun's Avatar, mv 8 |
| Marisi, Breaker of the Coil | group `Yours · 1`, owned/**free**, figure 23 of 64, cost `{2}{R}{G}{W}` (mv 5, "3 less than Gishath") |
| Mayael the Anima | group `To buy · 1`, **buy $2.40**, figure 38 of 64, cost `{R}{G}{W}` (mv 3, "5 less than Gishath") |
| Group order | Yours before To buy, even though Mayael's figure is higher (ownership leads, per key 3) |

## State Coverage: change-commander
| State | Triggering condition | Component rendered | Key props required |
|---|---|---|---|
| Door at rest, desktop | ≥ md width | `ChangeCommanderDoor` | inside `ChangeCommanderProvider` + `CardDetailProvider`; horizontal pill |
| Door at rest, phone | 390 | `ChangeCommanderDoor` | vertical 44px ⇄/⛶ pair |
| Owned candidate | group "Yours" | `GroupHeading` + `CandidateRow` | free (or held) mark, figure 23 of 64, pips, relative MV, no-op `onToggle`/`onChoose` |
| To-buy candidate | group "To buy" | `GroupHeading` + `CandidateRow` | buy tag $2.40, figure 38 of 64, no-op handlers |
| Figure expanded (▾) | — | — (not drawn) | — |
| Sheet open / confirm / review | — | — (not mounted; the sheet reads on open) | — |
| Fallback | E2 declined | door + `CommanderSection` | `DraftState` where the commander moved |

---

## Verification (design-review Agent 2 and Agent 3), 2026-09-25

The figures mount shipped components, so every row about a row's, door's or heading's own CSS
is the component's and was not re-measured here. What the figure composes was checked row by row
against `src/components/about/ch01-figures.tsx` (`LockedCardsFigureBody`,
`ChangeCommanderFigureBody`), `src/lib/about/fixtures.ts` (`LOCKED_ROWS`, `CHANGE_COMMANDER`) and
`src/lib/copy/about.ts`, and in a browser by `pnpm probe:about --flip` at 390 and 1300.

### Gaps found, all fixed

1. Locked cards: the mode header row (mode line + Done) had no bottom rule. Now
   `border-bottom 1px var(--border)`, `padding-bottom 8px`, `gap 8px`, flex-wrap, space-between.
2. Locked cards: the gap between the two sets was 18px. Now 14px.
3. Change commander: the art band was 120px at both widths with radius 10 and no border. Now
   150px below `md`, 120px from `md`, radius 8, `1px var(--border)`.
4. Change commander: the gap between the band and the groups was 16px. Now 14px.

Agent 3 (confirm): all four read correctly in the code after the fix. 0 gaps remain.

### Deviations, by ruling rather than by gap

- **`since` is 9, not 10.** Superseded by G1: an entry tied to a switch is announced by its switch
  and nothing bumps `ABOUT_VERSION`; 10 would fail `about.test.ts`'s "claims no entry from a
  future version".
- **No `at rest` label above the first set.** It is canvas annotation with no string in any
  surface's copy file, and the README's rule is that a figure's strings come from its surface.
  The mode header's rule marks where the second set begins.
- **The art band carries the route's placeholder (`identityGradient`), not Gishath's art.** A
  reference page does not fetch commander art (the rule every About fixture follows).
- **Key 4 of Change commander is not prefixed "For a single commander".** C3's condition has been
  met: the half-trade shipped in #1008, so key 4 names the pair case that works, and claims no
  more (two rarer partner cases are held by Hugh's ruling).
- **Locked key 1 no longer carries "Pull it shows locked".** Copy review: key 3 already says it,
  and the caption carries the stand-ins clause. Wording is `/copy-review`'s, not this table's.

### State reachability

Every state in both coverage tables is drawn: at rest locked and unlocked, the mode's pressed and
unpressed toggles (`probe:about --flip` counts three toggles in the mode set), the mode header
with `2 locked`, the desktop pill door and the phone's vertical pair (by `useIsDesktop`), and one
candidate in each group with its free mark and its buy tag. Expanded figure, the sheet and the
fallback are not drawn, as the table says.

---

# PR D: Help me choose (A1)

## Entry: help-me-choose

**Sources:** README.md, READINESS-audit.md (A1: H1–H6, G1, and the /copy-review table), `about · launch entries.ts`, and the canvas `.dc.html` (lines 116–340 and 379–392, plus `chooseRows` at about line 505). Where the audit and the drawn copy conflict, the audit wins.

| # | Property | Mobile (390) | Desktop (760) | Source |
|---|---|---|---|---|
| **1. Entry slots** | | | | |
| 1.1 | id | `help-me-choose` | same | .ts |
| 1.2 | chapter | `'02'` (02 · Finding a commander) | same | .ts, canvas `chapterShort` |
| 1.3 | title | `Help me choose` | same | .ts |
| 1.4 | route | `/decks/new/choose` | same | .ts |
| 1.5 | opens | none. The .ts has no `opens`, the canvas has `opens: ""`, and the Route slot shows no `· …` suffix | same | .ts, canvas |
| 1.6 | width | `'plate'`. The canvas slot reads "plate: several parts need naming" | same | .ts, canvas `slotsOf` |
| 1.7 | since | `10` as drawn. **Superseded by G1:** there is no batched bump, and seen is recorded per reader as entry ids | same | .ts, audit G1 |
| 1.8 | switch | `HELP_ME_CHOOSE_ENABLED`. The entry renders only while it is on | same | audit G1 |
| 1.9 | insert position | Chapter 02, immediately after `discover` ("Commanders worth acquiring, and what each order means"). It is first of the five in page order | same | .ts `// after`, README table, canvas `after`, audit Structure |
| 1.10 | build gate | **Hold (H1, H2):** do not build until HMC PR 6 (the pick fills the deck) and #1000 (PR 6a, the deeper-read UI) merge. Re-check both then | same | audit H1, H2 |
| 1.11 | strings from | `copy/help-me-choose.ts (results.*)`. No new copy module | same | canvas `strings`, README |
| **2. Key lines (structure only)** | | | | |
| 2.1 | count | 4 of 4 (the `about.test.ts` limit) | same | .ts, canvas slot label |
| 2.2 | caption | H1 (hold: the hand-off is not on main) and H3, replaced by the /copy-review TIGHTEN that absorbs H3 | same | audit |
| 2.3 | key 1 | H4. SETS RANK only when there is more than one figure (TIGHTEN) | same | audit H4, copy-review |
| 2.4 | key 2 | H5, replaced by the /copy-review TIGHTEN (ownership orders the list only when there is no theme or card) | same | audit H5, copy-review |
| 2.5 | key 3 | No correction (KEEP). Accurate once #1000 ships (H2) | same | audit H2, copy-review |
| 2.6 | key 4 | H6 (answers to loosen, each with a count) | same | audit H6, copy-review |
| 2.7 | key line render | Numbered `ol`, gap 5px. Badge 14×14, radius 50%, 1px `--accent` border, Plex Mono 8.5px. Text Plex Mono 10.5px, line-height 1.5, `--fg-faint`. margin-top 8px | same | canvas l.331–335 |
| **3. Specimen composition** | | | | |
| 3.1 | component | `ChooseRow` (`choose-row.tsx`) ×2. Mounts as shipped and takes row, figures and trial as props | same | README, canvas `specimen`/`need`, audit |
| 3.2 | provider | `CardDetailProvider fetchCard={async () => null}`, as `ch01-figures.tsx` does | same | canvas §6 |
| 3.3 | extraction needed | None ("mounts as shipped") | same | canvas `needHead` |
| 3.4 | order | Row 1 Pantlaza, row 2 Gishath | same | canvas `chooseRows` |
| 3.5 | ordering basis | Ordered by a theme and a card | same | canvas `specimen` |
| 3.6 | trial state | `ready` on each row | same | canvas `specimen` |
| 3.7 | figure wrapper | `<figure>` margin 10px 0 0, radius 8px, 1px `--border`, background `--surface-sunken`, padding 14px 16px, overflow hidden | same | canvas l.166 |
| 3.8 | row stack | flex column, gap 8px, between the two rows | same | canvas l.305 |
| 3.9 | position in entry | head (title, route) → caption (margin 6px 0 0) → figure → key lines | same | canvas l.160–335 |
| 3.10 | entry frame (canvas only) | width 390, padding 18px 16px 22px | width 760, padding 22px 24px 26px | canvas `view()` |
| 3.11 | phone reduction | Each row stacks: name and pips, then the figures, then the ownership line. The 44px thumb and the whole-row press stay. The ownership line wraps between its segments, never inside one | desktop layout is ChooseRow's own; the canvas draws the same markup at both widths | canvas `phone` |
| **4. Fixture data** | | | | |
| 4.1 | params | themes `[Dinosaurs]`, card `Regisaur Alpha`, budget `150`, bracket `2` | same | canvas `fixture` |
| 4.2 | row 1 name | `Pantlaza, Sun-Favored`. Identity pips r, g, w. Art from Scryfall art_crop | same | canvas `chooseRows` |
| 4.3 | row 1 mark | buy · `$1.10` | same | canvas |
| 4.4 | row 1 figures | `74%` "of its decks are Dinosaurs" (rank: false). `41%` "of its decks run Regisaur Alpha" (rank: true, **SETS RANK**) | same | canvas |
| 4.5 | row 1 trial | owned 38 ("you own 38 of its 99"). Buy "about $112 to buy, inside $150" | same | canvas |
| 4.6 | row 2 name | `Gishath, Sun's Avatar`. Identity pips r, g, w | same | canvas |
| 4.7 | row 2 mark | `owned · free` (buy: false, price "") | same | canvas |
| 4.8 | row 2 figures | `81%` "of its decks are Dinosaurs" (rank: false). `34%` "of its decks run Regisaur Alpha" (rank: true, **SETS RANK**) | same | canvas |
| 4.9 | row 2 trial | owned 52 ("you own 52 of its 99"). Buy "about $64 to buy, inside $150" | same | canvas |
| 4.10 | rank consistency | Each row's weakest figure sets its rank. Pantlaza's 41% beats Gishath's 34%, so Pantlaza leads | same | canvas |
| **5. State coverage** | | | | |
| 5.1 | two figures, SETS RANK on the weaker | drawn (both rows) | drawn | canvas |
| 5.2 | buy mark with price | drawn (Pantlaza) | drawn | canvas |
| 5.3 | owned · free mark | drawn (Gishath) | drawn | canvas |
| 5.4 | trial ready, under budget | drawn (both rows) | drawn | canvas |
| 5.5 | single figure (no SETS RANK) | not drawn. Described by key 1 per H4 | not drawn | audit H4 |
| 5.6 | no theme or card (ordered by ownership) | not drawn. Described by the caption/key 2 per H3/H5 | not drawn | audit H3, H5 |
| 5.7 | too few fit, answers to loosen | not drawn. Key 4 per H6 | not drawn | audit H6 |
| 5.8 | deeper read (one credit) | not drawn. Key 3, gated on #1000 | not drawn | audit H2 |
| 5.9 | held mark, trial loading or failed, over budget, buy with no price | not specified | not specified | — |
| 5.10 | About sheet (N2) | **Superseded by G1.** Each entry is announced by its own switch's flip, so the sheet names Help me choose alone when its switch turns on (`probe:about --flip` F4b), never as one of a batch of three | — | README, audit G1 |
| 5.11 | About index (O1) | Listed by title only, in page order | same | README, audit Structure |

## Verification (Agent 2 and Agent 3), 2026-09-25

Checked row by row against `HelpMeChooseFigureBody` (`src/components/about/ch01-figures.tsx`),
`CHOOSE` (`src/lib/about/fixtures.ts`) and the `help-me-choose` entry in `src/lib/copy/about.ts`,
and in a browser by `pnpm probe:about --flip` (F4b, F5) and the contact sheet at 390 and 1300.

### Gaps found, both fixed

1. The two rows sat with no gap between them. Now `gap 8px` on the list.
2. Pantlaza's buy price was a $3.49 stand-in. Now `$1.10`, the canvas's figure.

Agent 3 (confirm): both read correctly after the fix. 0 gaps remain.

### Deviations, by ruling rather than by gap

- **`since` is 9, and the build gate is lifted.** G1 as for the other two entries. H1 and H2 were
  confirmed met on main at 41de0326 by the Help me choose lane: the hand-off shipped in #1011 and
  the Look deeper panel in #1000.
- **Key 3 is corrected, not kept.** The drawn line says the FORM names the credit before it is
  spent; the form never mentions a credit (HMC handoff §8.1). The cost is on the results screen, in
  the Look deeper panel. Wording is `/copy-review`'s.
- **Key 2 drops "never orders it" rather than adding H5's exception.** The caption already states
  the exception (H3), and saying it twice is copy-review's rule 7.
- **The rows' art is the component's empty thumb**, not a Scryfall crop: a reference page fetches
  no art.
- **The figures are computed by the shipped `figures()`**, not written down, so SETS RANK is lit by
  the rule the results screen uses.

---

# PR C: Find a deck for it (A3) and Cheaper stand-ins (A4), r2

## Entry: fits-your-decks

### 1. Entry slots

| Slot | Value | Source |
|---|---|---|
| id | `fits-your-decks` | r2.ts |
| chapter | `'03'` (03 · Building the 99) | r2.ts, canvas `chapterShort` |
| title | `Find a deck for it` | r2.ts |
| route | `/collection` | r2.ts |
| opens | `opens the card detail` | r2.ts |
| width | `plate` ("plate: several parts need naming") | r2.ts, canvas slot |
| since | `10` | r2.ts. Under G1 this is kept, but nothing is batched into a version and "seen" is recorded per entry id |
| switch | `SWAP_TOOLS_ENABLED`. The entry renders only while the switch is on | audit G1. G1 names four switches for five entries, so assigning this one to A3 is an inference from "swap tools v2 … combos and themes in Find a deck" |
| insert position | Chapter 03, after `add-cards` ("after 'Adding cards'"). Page order is help-me-choose, locked-cards, fits-your-decks, stand-ins, change-commander | README table, audit Structure, r2.ts comment |
| NEW badge | Drawn on the h3 in both views | canvas |
| Strings from | `copy/swap-tools.ts (fits.*)` | canvas |

### 2. Key lines

4 of 4 (the limit is 4).

| Key | r2 drawn | Audit correction |
|---|---|---|
| 1 | Colors-allow / not-already-run gate | None |
| 2 | Synergy order, no figure quoted | KEEP (matches the ruling: synergy orders the list and is never shown) |
| 3 | Strongest reason: combo, then theme, then staple | **R2-A3-1 (STALE by ruling).** Replace the clause "With neither, the deck shows the two shares" with "With neither, the deck shows only what it needs." The audit gives the replacement wording |
| 4 | The need, then Add's copy source | **R2-A3-1.** Reworded so it reads true with or without a reason: it opens "The need is this deck's count…" instead of "After the reason comes…" |

Open for the build: what a row shows with no combo, no theme and no role. The entry must not promise a line the row doesn't draw.

Caption: r2.ts as drawn. The audit makes no caption correction for A3.

### 3. Specimen composition

- **Components:** the picker's body, via **E1**. Export `FitsPlate` and `FitsRows` unchanged, and have `FitsPicker` render them. `FitsPicker` itself is not mounted, because it loads on open (`loadFitsAction`) inside `ModalChrome`.
  - E1 status: the README says engineering accepts or declines it. The audit's A3/A4 section says "not ruled on; re-read with the revision". The r2 section says "E3 accepted … as E1 and E2 were".
- **Providers:** per §6 "mounts as shipped", every specimen sits in `CardDetailProvider fetchCard={async () => null}`, as `ch01-figures.tsx` does. No other provider is named for A3.
- **Order:**
  1. Card plate.
  2. The "could take it" group heading, with a right-aligned note "by each commander's synergy".
  3. Two rows: the combo row, then the theme row.
  4. The "already holds it" group heading.
  5. One holds row.
- **Wrappers:**
  - Entry frame:

    | Width | Frame width | Padding |
    |---|---|---|
    | desktop | 760 | `22px 24px 26px` |
    | phone | 390 | `18px 16px 22px` |

    Both: `border:1px solid var(--border-strong)`, radius 12, `bg var(--bg)`, IBM Plex Sans.
  - Entry head: `border-top:2px solid var(--accent)`, `padding-top:13px`.
  - Caption `<p>`: `margin:6px 0 0`.
  - Figure: `margin:10px 0 0`, radius 8, `1px solid var(--border)`, `bg var(--surface-sunken)`, `padding:14px 16px`, `overflow:hidden`.
  - Specimen stack: flex column, `gap:14px`.
- **Size values by view:**

  | Value | 760 | 390 |
  |---|---|---|
  | `addH` (Add height) | 32px | 44px |
  | `addW` (Add min-width) | 0px | 64px |
  | `holdH` (holds row min-height) | 34px | 44px |

- **Phone reduction:** the picker is a sheet over the card, from 96px. The deck name and Add share a line, with Add at 44px. The reason line wraps underneath, between its segments.

### 4. Fixture data (as drawn)

- **Card:** Basalt Monolith.
  - Rarity C.
  - Plate sub: `colorless · legal in Commander`.
  - Plate count: `×1 · 1 free` (owned 1, 1 free).
  - `staple false`.
  - Art: Scryfall `art_crop` for Basalt Monolith, 22×31.
- **Fits rows:**
  1. `deck: "HD - Kinnan"`, `combo: "Kinnan, Bonder Prodigy"`, `theme: null`, `need: "ramp 11 of 10"`, `hasNeed: true`. Drawn as "Completes a combo with Kinnan, Bonder Prodigy · this deck ramp 11 of 10".
  2. `deck: "HD - Gishath"`, `combo: null`, `theme: "Joins 11 other artifact cards"`, `need: "ramp 7 of 10"`, `hasNeed: true`.
- **Holds:** `HD - Tymna + Thrasios`, `holds 1`.

### 5. State coverage

| State | Drawn | Note |
|---|---|---|
| Combo reason row | Yes (Kinnan) | |
| Theme reason row | Yes (Gishath) | |
| Need segment present | Yes (both rows) | |
| Need absent (no role) | No | Key 4 covers it |
| No combo, no theme ("only what it needs") | No | Open for the build (R2-A3-1) |
| Staple reason | No | `staple false` |
| Already-holds group | Yes (1 row) | |
| Add with a free copy | Implied (1 free) | |
| Add as buy | No | |
| 760 / 390 | Both | |

---

## Entry: stand-ins

### 1. Entry slots

| Slot | Value | Source |
|---|---|---|
| id | `stand-ins` | r2.ts |
| chapter | `'03'` (03 · Building the 99) | r2.ts |
| title | `Cheaper stand-ins` | r2.ts |
| route | `/decks` | r2.ts |
| opens | `opens the shopping roll-up` | r2.ts |
| width | `plate` | r2.ts |
| since | `10` (same G1 caveat as above) | r2.ts |
| switch | `SWAP_TOOLS_ENABLED` | audit G1 |
| insert position | Chapter 03, after `shopping` ("after 'What you would need to buy'"). 4th of the five new entries | README, r2.ts comment |
| Strings from | `copy/swap-tools.ts (limit.*, row.over, sheet.group.*, sheet.mana.*)` | canvas |

### 2. Key lines

4 of 4.

| Key | r2 drawn | Audit correction |
|---|---|---|
| 1 | The limit line, with the default note | None |
| 2 | The over-limit mark and ⇄, plus the link from card details | None |
| 3 | Every job, type groups, commander-favored lead, a few shown | **R2-A4-1 (TIGHTEN).** Gains "each says what it gives up". Proposed: "…led by the cards this commander's decks favor, each says what it gives up, and a few show until you ask for all." |
| 4 | Land mana line and the ladder: untapped, then tapped, then once-only | KEEP the order. **R2-A4-1:** remove "Each says what it gives up." so the line ends at the ladder |

Also from the audit:
- Do not restore "your free copies first" unless the built ranking does it.
- No row shows a percentage.
- The locked-card rule stays in A2.
- Caption: r2.ts as drawn. The audit makes no caption correction.

### 3. Specimen composition

- **Components, in order:**
  1. `StandInLimit`. Mounts as shipped.
  2. One Shopping `DecklistRow` (Plateau), over the limit, with ⇄ and ✕. Mounts as shipped.
  3. One `StandInGroup` from the sheet, via **E3 (accepted)**. Export it unchanged (heading, order note, rows, Show all), and have the sheet render it. The sheet itself is not mounted, because it reads its list on open. Take is not drawn.
- **Providers:** `SwapToolsProvider` (fixture props) and `CardDetailProvider fetchCard={async () => null}`.
- **Layout:**
  - Entry frame, head, caption margin and figure box are identical to A3.
  - Specimen stack: flex column, `gap:6px`.
  - Limit line: flex wrap, `gap:8px`, `min-height:30px`. The ⇄ hint `<p>` comes under it.
  - Shopping row list: `margin-top:6px`, `border-top:1px solid var(--border)`. Row: `gap:9px`, `min-height: rowH`, `border-bottom`.
  - Group box: `margin-top:10px`, radius 8, `1px solid var(--border-strong)`, `bg var(--bg)`, `padding:10px 12px 0`.
    - Title "⇄ Plateau's stand-ins", `margin-bottom:8px`.
    - Heading row: `same type · lands` on the left, `best mana first` on the right. `padding-bottom:6px`, `border-bottom`.
    - Rows: `gap:9px`, `min-height: rowH`, `padding:6px 0`, `border-bottom`.
    - "Show all 8 lands ▾": `min-height: holdH`, `padding-left:16px`, `gap:8px`.
- **Size values by view:**

  | Value | 760 | 390 |
  |---|---|---|
  | `rowH` | 36px | 48px |
  | `hit` (⇄ and ✕ box) | 22px | 44px |
  | `holdH` | 34px | 44px |

- **Phone reduction:**
  - Shopping rows are one column.
  - The limit line wraps before its count, never inside it.
  - ⇄ and ✕ keep 44px, and the name truncates first.
  - Stand-in rows wrap the mana line between segments.
  - Show all is a 44px row.

### 4. Fixture data (as drawn)

- **Provider:** deck `HD - Gishath`, `storedLimitCents null`.
- **Limit:** `shoppingCount 6`, `overCount 1`. Drawn as "Marking cards over $10", a `default` pill, and "· 1 over".
- **Hint:** "⇄ on a marked row opens its cheaper stand-ins. Any card's stand-ins are also in its details."
- **Shopping row:** Plateau, a land.
  - Sub-line: `over $10`.
  - Tag: `buy · $293.84`.
  - Dot: dashed (not owned).
  - Over-limit, with ⇄ and ✕.
- **Group:** lands, 8 total, 3 shown.

| # | name | mana | facts | free | price |
|---|---|---|---|---|---|
| 1 | Sacred Foundry | makes white and red, untapped if you pay 2 life | "" | true | "" |
| 2 | Battlefield Forge | makes white and red, untapped | 1 damage for either | true | "" |
| 3 | Sunbaked Canyon | makes white and red, untapped | 1 life for either | false | $1.12 |

- Row dots: a free row gets a 7×7 solid `var(--success)` dot. A buy row gets a 7×7 dashed `var(--fg-faint)` dot.
- Show all label: `Show all 8 lands`.

### 5. State coverage

| State | Drawn | Note |
|---|---|---|
| Limit at default (`storedLimitCents null`) | Yes | |
| Limit set by the user | No | |
| Over-limit Shopping row | Yes (Plateau) | |
| Under-limit row | No | |
| Same-type group | Yes (lands) | |
| Other-types group | No | |
| Free stand-in | Yes (×2) | |
| Buy stand-in | Yes (×1) | |
| Untapped conditionally (pay life) | Yes (Sacred Foundry) | |
| Tapped land | No | |
| Makes a color only once | No | |
| Gives-up facts present / empty | Yes / Yes | |
| Show all (collapsed) | Yes | |
| Group expanded | No | |
| Take / Undo | No | By design: nothing on /about edits a deck |
| 760 / 390 | Both | |

## Verification (Agent 2 and Agent 3), 2026-09-25

Checked against `FitsYourDecksFigureBody` and `StandInsFigureBody` (`src/components/about/ch01-figures.tsx`),
`FITS` and `STAND_INS` (`src/lib/about/fixtures.ts`), the two entries in `src/lib/copy/about.ts`, and in a
browser by `pnpm probe:about --flip` (F4c, F5) and the contact sheet at 390 and 1300. Both entries are
gated on `SWAP_TOOLS_ENABLED` (confirmed by the orchestrator, not inferred).

### Gaps found, all fixed

1. The stand-ins figure drew Take on every row. Now none: nothing on /about edits a deck.
2. The Shopping row had no rule above it. Now `margin-top 6px` and a top border in `--border`.
3. The sheet's group sat loose. Now in the canvas's box: `margin-top 10px`, radius 8, `1px --border-strong`,
   `--bg`, padding `10px 12px 0`.
4. The specimen stack's gap was 14px. Now 6px.

Agent 3 (confirm): all four read correctly after the fix. 0 gaps remain.

### Deviations, by the shipped build rather than by gap

The r2 drop was drawn before the ranking rebuild existed. The audit asked for both entries to be re-checked
against the built ranking, and where the two disagree the SURFACE wins.

- **Find a deck's order is not "by synergy".** `shapeFits` orders a combo first, then a theme (most cards
  first), then the commander's synergy, then the name, and the picker's order note reads
  `combos first, then themes`, not the canvas's "by each commander's synergy". Key 2 and the caption say
  what ships.
- **Not Design's card.** Basalt Monolith joins no shipped theme, and "artifacts" is not one
  (`src/lib/recs/themes.ts`). The figure uses Ashnod's Altar: a combo with Nim Deathmantle, and the
  sacrifice theme, so both reasons are real.
- **Five stand-ins show, not three.** `STAND_IN_GROUP_SHOWN` is 5. The group holds six lands in ladder
  order, so `Show all 6 lands` is drawn.
- **Key 4's ladder follows `landRung`.** r2 said a once-only color "doesn't count as making it"; the shipped
  ladder counts it, on the last rung, and it has four rungs, not three.
- **No "⇄ Plateau's stand-ins" title over the group.** It is not a shipped string; the sheet's own title is
  "Cheaper stand-ins", the entry's title one line up.
- **`since` is 9, as for the other launch entries** (G1: an entry tied to a switch is announced by the switch).
- **The open question (a row with no combo, theme or role)** is answered in key 3: the row shows only what the
  deck needs, if anything. `ReasonLine` returns null with neither.

