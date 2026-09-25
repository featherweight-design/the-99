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
