# Readiness audit: evidence benchmarks (`addendum_evidence_benchmarks/`)

**Verdict: 🟢 Green.** I audited this on 2026-10-10 against `origin/main` at `367c86fdd`. The drop
(Design's R4) implements `docs/superpowers/design-briefs/2026-10-10-evidence-benchmarks.md`,
including the Dependencies ruling. It draws every fixture the brief asked for at both widths,
keeps every locked point, and answers each of Design's eight calls. The gaps below are
engineering's and are resolved here as build rules, so nothing goes back to Design. Every string
goes to `/copy-review`, and two of them make a claim that is not always true (copy items 1 and 2).

## Scope

- **In scope:** `README.md`, `READINESS.md`, `STATES-evidence-benchmarks.md`,
  `evidence-benchmarks · copy strings.ts`, `benchmark-fixtures.js`, the canvas
  `Evidence Benchmarks Addendum.dc.html`, and the two new child canvases `Benchmarks Block.dc.html`
  and `Benchmark Ledger.dc.html`.
- **What changed in files that already existed.** The two `Analysis Tab` canvases and
  `analysis-fixtures.js` are copies of `../addendum_method_notice/`'s:
  - **Fixtures:** additions only. The `S.b*` states and their decks, summaries, findings, climbs
    and mixes (`analysis-fixtures.js:424-545`), plus `hasBench`, `benchDeck` and `benchStale` on
    the mapped-props line (`:553`). Nothing that was there was edited.
  - **Canvases, the block:** one `dc-import` of `Benchmarks Block`, placed under the findings
    (`Analysis Tab 1300.dc.html:329`, `Analysis Tab 390.dc.html:327`). The ten `b*` states join the
    `state` enum, and the default state moves from `rangeAsk` to `bGishath`.
  - **Canvases, Recommended mix moved.** The mix section left the reading body, where the parent
    canvases had it inside `notFetching`, and now sits above the tabs under the commander art
    (`1300:89-109`, `390:94-111`). At 1300 its caption drops `for {{ deck.commander }}`. This
    matches what ships: `builder-shell.tsx:1506-1517` mounts `RoleCounterStrip` once, above the
    tabs, whether or not Analysis is on. So the parent canvases were stale, and this corrects them.
    It is not a change to the app.
  - **Canvases, the 1300 stale banner.** The credit note now stacks under the banner's line,
    left-aligned, with the button at the right (`1300:122`). The shipped banner puts the note
    beside the line, right-aligned (`analysis-banner.tsx:98`, `md:text-right`). This one is a real
    change to a shipped surface. Design names it in the README's "For engineering", and it is
    accepted as build rule 9.
  - `support.js` and all 15 files in `assets/` are byte-identical to the parent handoff's.
- **Outside the new folder: nothing.** The export deleted the rest of the tracked `analysis_tab/`
  folder in the main checkout. This branch was cut from `origin/main` and adds the subfolder only,
  byte-identical to the backup of the drop.
- **Stale fixture field.** `benchmark-fixtures.js:21` still carries `kicker: "Risks, not scores"`.
  R3 removed that chip, nothing draws it, and the copy file has no `kicker` (`:40`). The copy file
  is what ships.

## Locked points, against the drawing

| Locked (brief, "What eng locks") | Drawn | Holds |
|---|---|---|
| 1. Inside the reading, in the Analysis tab | Last in the tab, under *What is in this deck*, full width at both widths (1a to 1i) | Yes |
| 2. Belongs to the reading: stale with it, none before a first Analyze | 1i draws the block whole under the shipped banner, with only its caption changed to `captionStale(date)`. 1j is the shipped empty state with no block. STATES §A adds the loading, failed, fetching and failed-re-read rows | Yes |
| 3. Three grades, one risk list, win speed only with a combo | Velocity, flow and interaction always grade. Win speed grades on Gishath, Counter Intelligence and Wizards, and draws *No combo line* elsewhere | Yes. See copy item 1 |
| 4. Five ordered steps per grade; Dependencies light or heavy | Step word over a five-segment meter in one hue (`--fact`, `STEP_INK`). Dependencies rows carry a Heavy or Light word tag, never a meter | Yes |
| 5. Dependencies is a risk, never a score | No total and no row count anywhere (STATES §C). The tag is a word on a fixed-width chip, so nothing is shared with the grades. The fixed hate list is in code, per row (`copy strings.ts` `deps.hate`). No commander row | Yes |
| 6. Every grade and every row has a ledger of cards | Seven ledgers drawn (2a to 2g). Two places draw no opener: win speed with no combo (the brief's own state), and Combat Heavy, which has no route out of combat and so no card to list | Yes, with build rule 3 |
| 6. Players never see "label" | No string, group, note or state mentions labels or unlabeled cards. The copy file and the fixtures both state the rule. A search of the drop finds the word only in code identifiers (`aria-label`, `data-screen-label`, `ledgerTitle`) and in the two code comments that state the rule | Yes |
| 6. Counterspells are interaction, never removal | The interaction reading says so outright, and the ledger's why for one is `counterspell, instant, {mv} mana` (`copy strings.ts:132`) | Yes |
| 7. One reader per figure | Not visible in a drawing | Engineering's (build rule 1) |
| 8. Deterministic | The win-speed odds are drawn as fixed figures. No surface shows randomness | Yes. Engineering's for the computation |
| 9. `DECK_BENCHMARKS_ENABLED` | STATES §A: off means not computed and not drawn | Yes |
| 10. Constants are the plan's | The README calls the cut points and card lists illustrative, and the tiny-list floor (60) a plan constant | Yes |

**Dependencies never reads as a clean bill of health.** The none state (1h, Wizards) is a dashed
panel with `noneHead`, then `noneLine`, which opens with "That isn't protection", then the six
rows checked. About key 3 repeats that an empty list does not mean the deck is safe.

**No combo never reads as a failing grade.** The meter is dropped, because five empty segments
would read as zero. The tile becomes a dashed panel at full height, and About key 2 says outright
that it is not a low grade.

## Requested fixtures, both widths

Each 1x row is a `dc-import` of the `Analysis Tab` child canvas at 1300 and at 390. The 3a row draws the `Benchmarks Block` alone, at both widths.

| | Fixture | Brief's reason | Drawn rows | 1300 | 390 |
|---|---|---|---|---|---|
| 1a | Gishath | populated, 0 cheap instant interaction, a combo line | Creatures Light. Figure line `0 cheap and instant`. Win speed 4 lines | ✓ | ✓ |
| 1b | Elves | no combo, top velocity, low flow; activated heavy with the commander | Creatures, Activated (commander), Combat, all Heavy. Velocity Top, flow Modest | ✓ | ✓ |
| 1c | Sultai Arisen | graveyard heavy, commander-driven | Graveyard Heavy, "your commander among them" | ✓ | ✓ |
| 1d | Counter Intelligence | artifacts heavy | Artifacts Heavy: 37, 15 payoffs, 21 with abilities | ✓ | ✓ |
| 1e | Scrappy Survivors | enchantments heavy, the four-row maximum | Graveyard, Enchantments, Combat Heavy, then Creatures Light | ✓ | ✓ |
| 1f | Thorin | creatures heavy | Creatures Heavy, Artifacts and Combat Light | ✓ | ✓ |
| 1g | Soldiers | combat reliance heavy | Combat Heavy, Creatures Light | ✓ | ✓ |
| 1h | Wizards | no dependency row | the none panel | ✓ | ✓ |
| 1i | the stale reading | under the banner | Gishath's block, stale caption | ✓ | ✓ |
| 1j | before a first Analyze | unchanged | the shipped empty state | ✓ | ✓ |
| 3a | thin states | tiny list; every grade at the lowest step | 41 cards; all step 1 | ✓ | ✓ |

Every row set matches the brief's draft-cut list for that deck, heavy before light. Every combo
count matches the staging table: Gishath 4, Counter Intelligence 17, Wizards 2, and none for the
other five.

## One ledger per benchmark, both widths

Each one is a `Benchmark Ledger` import at 760 and at 390 (canvas §2a, lines 88 and 89). §2 also
shows a ledger opening in context at both widths: the opener, the sheet over the tab, then a name
opening its card.

| | Ledger | 1300 (760) | 390 |
|---|---|---|---|
| 2a | Mana velocity (Gishath) | ✓ | ✓ |
| 2b | Card flow (Elves) | ✓ | ✓ |
| 2c | Interaction (Gishath) | ✓ | ✓ |
| 2d | Win speed (Gishath) | ✓ | ✓ |
| 2e | Dependencies · Graveyard (Sultai Arisen) | ✓ | ✓ |
| 2f | Dependencies · Artifacts (Counter Intelligence) | ✓ | ✓ |
| 2g | Dependencies · Combat, Light (Thorin) | ✓ | ✓ |

Enchantments, Creatures and Activated abilities are not drawn. They use the same body, and their
groups are specified in STATES §D. That is enough to build from.

## The other deliverables

- **STATES table:** `STATES-evidence-benchmarks.md`, in the format of `../STATES-analysis-tab.md`,
  with §A (the page per state) to §F (the sheets added to §D of the parent table). It changes no
  row of the parent table.
- **Copy file:** `evidence-benchmarks · copy strings.ts`. Every string is marked PLACEHOLDER,
  including the four benchmark names, the five step words (Low, Modest, Typical, High, Top) and the
  six hate lists. Its proposed module is `src/lib/copy/deck-benchmarks.ts`. No em dashes.
- **About frame:** canvas §4a, drawn at 760 and at 390. The entry is `deck-benchmarks`, *How it
  plays*, in chapter 03 after `deck-analysis` (`about.ts:500`), with its specimen being the block
  at phone layout for Scrappy Survivors. It ships with the claim tap-through at the evidence line's
  close, under one `ABOUT_VERSION` bump. Until then the block has no About link.

## Design's open calls, as answered

1. **Placement:** last in the tab, under the findings, full width. Verdict, climb and findings stay
   together as the bracket story, so no benchmark reads as a bracket input.
2. **A grade:** a step word (display 18, or 15 at 390) over a five-segment meter in one blue,
   each segment more saturated. No success or warning color. One figure line gives what decided
   the grade. The headline is never a count, so no tile repeats the Jobs card.
3. **A dependency:** its own full-width box on `--surface-sunken`, under the grades. Each row has
   a Heavy or Light tag first (50px, so the names align), then the name, the deciding figure,
   *Broken by* with the hate list, and the opener. The meaning sits in an InfoTip beside the box's
   name. There is no chip and no sub-line.
4. **The ledger:** `ModalChrome` at 760, unchanged. It opens from each tile's or row's only
   control, the findings' own `see the N cards` opener. The body is the app's shared card row,
   because a receipt tile holds a name only and a ledger line has to carry the card, why it
   counts, and what it adds. Win speed keeps `ReceiptTile` plates. This differs from the brief's
   recommendation to reuse the receipt body, and the reason given is sound.
5. **States:** no combo and no dependencies are both dashed panels at full height. Combat Heavy
   has no opener. A tiny list holds the grades back below a floor. All-lowest is drawn as it is.
6. **Links to Stats:** yes, from the ledger summary only. Velocity links to Curve, and flow and
   interaction link to Jobs. Velocity's ledger also shows the commander's `expectedCastTurn`.
7. **About:** drawn now, shipped at the line's close.
8. **Open in the README:** graveyard lands (build rule 7); stand-in commanders for Elves (Lathril),
   Soldiers (Myrel) and Wizards (Inalla), which are fixtures only and need nothing from eng; copy
   review (below).

## Verified against the code

- **`FindingsBlock`** (`findings-block.tsx:30`): a count opens its receipt, and a zero draws no
  control at all (`:23`). That is the zero rule Combat Heavy and no combo follow.
- **`ReceiptModal`** (`receipt-modal.tsx:51`), **`ModalChrome`** (`:108`) and **`ReceiptTile`**
  (`:294`) are exported. `ModalChrome` takes `mark`, `title` and `aside`, and its width union
  includes 760, so the strength tag can be the `mark` and the step word the `aside`. **`ComboBody`
  is not exported** (`:339`, file-local). See build rule 4.
- **The card-detail opener:** `CardDetailTrigger` (`card-detail-provider.tsx:306`) takes
  `siblings`, so Prev and Next walk the ledger as the README asks.
- **The shared row:** `ROW_SHELL` and the gap and radius constants (`ui/row-shell.ts:19-32`),
  `CostTrack` at 72px (`cost-pips.tsx:49, 61`) and `CostPips` (`:115`) all exist as named.
  `HoverPreviewProvider` is exported (`hover-preview.tsx:166`).
- **The InfoTip is file-local:** `function InfoTip` in `deck-stats-view.tsx:212` is not exported.
  See build rule 5.
- **Tokens:** `--fact`, `--border-dashed`, `--surface-sunken`, `--elevated-hover`, `--surface-rail`,
  `--border-strong`, `--fg-disabled`, `--fg-locked` and `--accent-shadow` are all declared in
  `globals.css`.
- **About:** `AboutEntry` (`about.ts:78`) takes `width: 'plate'` (used at `:191`) and chapter
  `'03'`. The drop's entry has no `switch`. See build rule 8.
- **No benchmark code exists yet:** nothing in `src/` names `deck-benchmarks` or
  `DECK_BENCHMARKS_ENABLED`.

## Build rules (engineering gaps, resolved)

1. **One shared interaction reader.** It replaces `interactionCounts` (`facts-extra.ts`), as lock 7
   says, and it is the only reader of "counter target" text that treats a counterspell as
   interaction. `classifyRoles` keeps counterspells in removal for its own callers and is left
   alone.
2. **No surface tells a text-read card from a labeled one.** The ledger's "Read, not counted" group
   (velocity) means cards weighed and scored 0, such as cost reducers and late ramp. It never
   groups cards by how they were read, and a text-read card sits in the same groups as the rest.
3. **Combat Heavy has no ledger.** A heavy combat row means no route out of combat, so there is no
   card to list, and the findings' zero rule draws no control. This is the one exception to lock
   6's "every row has a ledger". Combat Light lists its routes (2g).
4. **Win speed's ledger reuses the receipt's combo parts.** Export `ComboBody`, or the plate row
   inside it, from `receipt-modal.tsx` rather than redrawing it. The ledger's other bodies use the
   shared card row.
5. **Lift the Deck stats `InfoTip` into a shared component** (`deck-stats-view.tsx:212`) and use it
   from both places. At 390 its 18px ring takes a 44px hit area (README, "For engineering").
6. **The ledger's Stats link** switches the deck page to Deck stats, closes the sheet, and scrolls
   to the named Stats card (Curve or Jobs). That scroll target is new wiring in the builder shell.
   Win speed and Dependencies have no Stats link.
7. **Graveyard lands stay out**, as drawn, until the plan measures them. The ledger note names them
   (`landsLeftOut`). If the plan counts them, the note goes and no layout changes.
8. **The About entry follows the switch.** Give `deck-benchmarks` `switch: 'DECK_BENCHMARKS_ENABLED'`
   (with the switch added to `AboutSwitch`), so the page never describes a block nobody can see.
   It ships at the evidence line's close, under the one bump.
9. **The 1300 stale banner stacks its note** under its line, left-aligned, with the button at the
   right. It replaces `analysis-banner.tsx:98`'s right-aligned note. This is cosmetic and needs
   no About edit. The 390 banner is unchanged.
10. **Add `layout="rows"` on the block** (E1), so the About specimen can mount the phone layout in
    the 760 column.
11. **The Artifacts ledger lists each card once**, under its first group: payoffs, then with
    abilities, then the rest. The enchantments ledger follows the same rule.
12. **The constants are the plan's:** the grade cut points, the light and heavy cuts per row, and
    the tiny-list floor (60 is drawn). They are derived from the commander index and printed by a
    measure script, never from the 21 staging decks.

## Gaps returning to Design

None.

## Copy (owed to `/copy-review`)

All of `evidence-benchmarks · copy strings.ts` is placeholder. Two strings make a claim that the
data does not always support:

1. **`noComboLine`:** "This deck wins through combat. Timing that takes a test game, which we
   don't run yet." No combo does not mean combat only. On staging, Thorin (2 routes: Revel in
   Riches, Mechanized Production) and Sultai Arisen (5) have no combo and still win outside combat.
   Reword it so it says only that there is no combo line, or branch on the combat row.
2. **About key 4:** "Every grade and every dependency opens the cards behind it." Win speed with
   no combo and Combat Heavy have no opener (build rule 3). Reword it, for example to "the cards
   behind it, where there are any".

The fixtures type apostrophes straight in places. Ship the typographic `’`, as the rest of the
copy modules do.
