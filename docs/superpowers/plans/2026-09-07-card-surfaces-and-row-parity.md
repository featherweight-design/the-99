# Card surfaces and card-row parity · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship #349 (card view / list view on the deck builder), #350 (mana cost on the decklist row), #351 (hover card preview) and #363 (double-faced flip control), and in the same sweep bring all six card rows onto one shell — one ownership dot, one radius, one availability slot that is never empty.

**Architecture:** Eight PRs in dependency order. (1) Shared atoms first: the ownership dot gains a third state and absorbs `LegendPip`, `CostPips` promotes out of `suggestion-tile.tsx` and gains a track and a cap. (2) The five parity rows swap onto those atoms and onto the canonical metrics. (3) One data widening — the deck-detail read has neither `manaCost` nor `imageUri`, and three of the four features need both. (4) The decklist row gains the pip track, the phone meta line and the collapsed `$` buy tag. (5) The view toggle lands on the deck bar and `/collection` together. (6) The card-view tile. (7) The hover preview. (8) #363's catalog work, then the `//` mark and the modal flip together.

**Tech Stack:** Next.js 16 (App Router, server actions), React 19, Tailwind 4, Drizzle ORM on Neon Postgres, Clerk auth, Vitest, pnpm.

**Design handoffs:**

- `design/design_handoff_the99_card_surfaces/` (R2, 🟢 Green) — `README.md` (nine calls, the two R2 amendments, the rejected list, the engineering ledger), `STATES-card-surfaces.md` (six rows × two widths × four states, plus the tile matrix), `DENSITY-four-hundred-pixels.md` (the measured width budget), `card-surfaces · copy strings.ts`, `The 99 - Card Surfaces.dc.html` (the canvas), `READINESS.md`.
- `design/design_handoff_the99_card_rows/` (R1, 🟢 Green) — `FLOOR-what-every-card-row-carries.md` (the slot contract), `STATES-card-rows.md`, `README.md`, `card-rows · copy strings.ts`, `The 99 - Card Row Parity.dc.html`, `READINESS.md`.

**Briefs:** `docs/superpowers/specs/2026-09-07-deck-card-view-cluster-design.md` (governs, per its Corrections section) and `docs/superpowers/specs/2026-09-07-card-line-item-parity-design.md`.

**Issues:** #349, #350, #351, #363.

---

## Readiness verdict — 🟢 Green, audited 2026-09-07 (R2)

Both handoffs self-assess Green. Card-surfaces R1 was Amber on a Product re-open and a defect; R2 closed both, and they closed as one drawing. Every load-bearing code claim in both folders was verified against `src/` at `main` and none was wrong.

Seven findings are recorded here because this is the document read during the build. **All seven are eng-resolvable. None needs a Design round-trip.**

**Finding 1 — the deck-detail read carries neither `manaCost` nor `imageUri`, and neither ledger says so.** `DeckDetailCard` (`src/lib/decks/grouping.ts:12-31`) is `{ oracleId, name, typeLine, cardTypeGroup, role, owned, quantity, auto, availability?, price? }`, and the query behind it (`src/lib/decks/read.ts:140-154`) selects `oracleId, name, typeLine, oracleText, keywords, owned, quantity, auto` from `cards`. The columns exist — `cards.manaCost` (`src/db/schema.ts:28`) and `cards.imageUri` (`:35`) — they are simply not read. **The pip track (#350), the tile (#349) and the hover preview (#351) all need them.** Resolution: PR C widens both, ahead of the three features. **`colorIdentity` is deliberately not added** — identity pips are refused on the decklist by both handoffs, so reading the column would be reading it for nobody.

**Finding 2 — the ownership dot's third-state API is eng's call, and this plan makes it.** Card-rows' READINESS explicitly leaves the shape open, with one constraint: *a caller without the aggregate keeps passing `owned` alone and gets two states.* **Resolution: add an optional `committed?: boolean` beside the existing `owned: boolean`.** A discriminated `state` union would force both production call sites (`decklist-row.tsx:192`, `export-dialog.tsx:472`) and six test cases to change in order to say the thing they already say; an optional flag changes none of them and is impossible to construct wrongly, because `committed` is only ever read when `owned` is true.

**Finding 3 — card-rows' Q2 and card-surfaces' ruling 3 disagree, and card-surfaces wins.** Card-rows Q2 says cost pips stay on one row (`card-search-row`). Card-surfaces ruling 3 puts them on the decklist row too, and its README records the supersession explicitly. **Resolution: cost pips reach exactly two rows of six. A task that appears to enforce card-rows Q2 has misread it.**

**Finding 4 — `synergy-row`'s availability slot (card-rows ledger item 9) is out of scope here.** It is blocked on a commander-route aggregate that does not exist, and card-rows says so. **Resolution: PR B ships slice A only — the dot swap and the radius. Do not infer an over-committed state from `committedTo`; that field is a single deck name and over-committed is arithmetic across every finished list.**

**Finding 5 — #363 is the only item with a real dependency, and it has no partial ship.** There is no `layout` column on `cards` or `printings` (verified against `src/db/schema.ts`; `skipped_printings` has one, but that table is tokens and emblems). Both handoffs forbid driving the mark off the `//` heuristic, because split and adventure cards carry the same separator and have no back. **Resolution: PR H does the data first and lands the mark and the flip control together. The `//` mark must not be added to the row as a "harmless" first step.**

**Finding 6 — the toggle's two surfaces must not split, and there is one thing to measure inside that PR.** Design ruled 44×44 phone / 32×32 desktop on both the deck bar and `/collection`. `/collection`'s phone filter bar absorbs +32px of width and +24px of height on that control. **Resolution: PR E ships both. If the phone bar cannot absorb it, that is a finding to bring back — not a licence to diverge, because a divergence returns us to two controls, which is the only thing the adoption was for.**

**Finding 7 — the two handoff files disagree by one on the pip cap, and the rule wins over the example.** `STATES-card-surfaces.md`'s pip ladder says a ten-symbol cost draws "4 + `+7`". `README.md:277-278` defines `+N` as the count of symbols not drawn, which for ten symbols over four drawn pips is `+6`. **Resolution: the README's rule governs and the unit test asserts `+6`.** An off-by-one in one cell of an example table is not a design call, and the same rule fixes the cap's other edge: five symbols fit five slots and never show `+N`.

---

## Locked rulings — do not re-litigate

A task that appears to contradict one of these has misread the task.

1. **The floor: every row and tile standing for a card carries its name and exactly one availability slot occupant.** Never zero, never two — the one ratified exception is the Shopping second-copy pair (over glyph + `2nd copy`), which cannot occur on a tile at all. `unresolved-row` and `DiffRowUnnamed` are exempt because they carry no oracle id.

2. **The buy tag collapses on the All tab; it does not leave.** `decklist-row.tsx` under `filter === "all"` renders a bare `$` in the same chip skin the row's full tag already draws — the `--warning` 13% wash, same radius, same position. *Same skin* is read off `PLATE.row` in `buy-tag.tsx`, which carries **no border**; the handoff's "same hairline" describes the tile variant's `PLATE.tile`, and copying it onto the row would give the All tab a border the Shopping tab does not have. Shopping keeps `buy $12.40` in full. `update-diff-row.tsx` keeps its full tag; the collapse is not global.

3. **The `$` chip does not restyle itself for sold-out.** A card with no price collapses to the same `$`. *Sold out* reads on Shopping only. A second glyph meaning *unpurchasable* would put two marks in a one-mark slot.

4. **The collapsed `$` chip is also what fills the unowned tile's top-left slot.** Marker chip when the card is owned, `$` chip when it is not. There is no `ownedCount` on `DeckDetailCard` — the fields are `owned: boolean`, `quantity: number` and `availability?`, and the slot keys on `owned` plus whatever `AvailabilityMarker` makes of `availability`. Owned staying empty is not the same defect — the marker returns `null` at `free` on every surface, and nothing to say is not nothing to show.

5. **Cost pips go where the reader is choosing or paying, never where they are auditing.** Two rows of six: `card-search-row` and `decklist-row`. Refused on `update-diff-row`, `synergy-row` and `unresolved-row`.

6. **A bare CMC integer is not the fallback for a long cost.** `{W}{W}{U}{U}{B}{B}{R}{R}{G}{G}` and `{10}` are the same integer and different cards. Six or more symbols draws four fanned pips plus a generic pip carrying `+N`.

7. **The track is fixed at 40px and never widens.** A variable track puts the pips of adjacent rows on different vertical lines, which is the failure `card-search-row`'s fixed 34px slot exists to prevent. Right-alignment is honoured within the track.

8. **The spoken cost is never capped.** The pips truncate at five slots; the `sr-only` string speaks every symbol.

9. **The view toggle does not persist and does not touch the URL.** Component state in `decklist.tsx`, defaulting to `"list"` at both widths. `/collection` writes `?view=`; the deck page does not, and the repo's *a cache lives for one visit* rule agrees.

10. **The toggle is absent under Shopping, not disabled.**

11. **Accent does not appear on the builder's control bar.** Selected state, pill and segment alike: `--fg` on `--elevated` with a 1px `--border-strong` ring, 600 weight — verbatim what the active `By type` / `By role` pill already draws. Eng should not "fix" the accent fill back.

12. **The tile is not unified to the row's radius or its inset ring.** Radius 7 and the inset ring are row rulings with row reasons (a border shunts a list). Tile radius stays 9/10 and the tile keeps its border tint.

13. **Phone decklist rows are 44px without a meta line and 52px with one. Desktop is 34px flat.** A land has no cost, so no pips, so no meta line — and lands are their own group under both groupings, so the height changes at a group boundary and never inside a group.

14. **Zero net motion.** No transition on any shell, dot, marker, pip, tile, glyph or preview. The hover preview appears rather than fades, the flip swaps rather than turns, the view change re-renders in place. A hover background swap is not motion.

15. **The hover preview is `aria-hidden` entirely, and is never a tap target.** So are the pips and the marker. The modal is the keyboard and screen-reader path.

---

## PR A — the shared atoms

Nothing user-visible changes except `synergy-panel`'s legend, which renders identically.

- [ ] **A1.** `src/components/ui/ownership-dot.tsx` gains an optional `committed?: boolean` beside `owned`. Committed draws filled at `--avail-hard-fg`; owned stays filled `--success`; unowned stays hollow with a 1px dashed `--fg-locked` border. Sizing stays with the caller, per the file's existing comment. Extend `ownership-dot.test.tsx` to cover the third state and to assert that a caller passing `owned` alone still gets exactly two states.
- [ ] **A2.** Move `LegendPip`, `AvailabilityDot` and `availabilityDotState` from `src/components/commanders/availability-dot.tsx` into `ownership-dot.tsx`, with `LegendPip` rendering the shared dot. `LegendPip` is `aria-hidden` (`availability-dot.tsx:60`) and carries no accessible name — the visible prose beside it in `synergy-panel.tsx:259-264` is the legend's reading path, and it stays where it is.
- [ ] **A3.** Repoint all four importers of `availability-dot`: `src/components/commanders/coverage-chip.tsx:23` and `src/components/commanders/synergy-row.tsx:16` (`AvailabilityDot`, `availabilityDotState`), `src/components/commanders/synergy-panel.tsx:20` and `src/components/commanders/coverage-section.tsx:10` (`LegendPip`). **Do not delete `availability-dot.tsx` in this PR** — `synergy-row.tsx` is rewritten in PR B, so the file is deleted there, after the last repoint. Grep for `availability-dot` before deleting.
- [ ] **A4.** Promote `CostPips` out of `src/components/decks/suggestion-tile.tsx` into `src/components/ui/cost-pips.tsx`. Add `size`, `track` and `cap` props, keep the shipped hybrid/Phyrexian treatment (135° split, numeral drawn whenever the symbol has one) and the shipped `WUBRG_COLOR` fills with their `inset 0 0 0 1px rgba(0,0,0,.45)` rim. Shingling engages from three slots at −5px. **The cap fires at six symbols, not five:** five symbols draws five pips; six or more draws four coloured pips plus the generic `--fg-faint` pip carrying `+N`, where `N = symbols − 4` (README § *The pip ladder*, "the count of symbols not drawn"). Unit-test the ladder against `STATES-card-surfaces.md` § *The pip ladder* — every row of that table is a case, **except that the ten-symbol row's `+7` is an arithmetic slip in `STATES`; the README's rule governs, so it is `4 + "+6"`.**
- [ ] **A5.** `CostPips` gains an `sr-only` sibling carrying the cost in words, from the mapper in `card-surfaces · copy strings.ts`. **The string is never capped**, even when the pips are. The pips themselves stay `aria-hidden`.
- [ ] **A6.** Repoint `src/components/decks/suggestion-tile.tsx` and `src/components/decks/card-search-row.tsx` (`:148`, the fixed 34px slot) at the shared component. Behaviour must be byte-identical at both call sites; if a snapshot moves, the port is wrong.

## PR B — the five parity rows

Metrics from card-rows call 4: 44px phone / 34px desktop, radius 7 both widths, gap 9/10, pad 8–4 / 9, name 12.5/13.5px, the over-committed tint an inset ring and never a border.

- [ ] **B1.** `src/components/commanders/synergy-row.tsx` slice A — swap to the shared dot, radius 8 → 7. **No availability slot** (finding 4). This is the last of the four repoints, so `src/components/commanders/availability-dot.tsx` is deleted here rather than in PR A. Grep for `availability-dot` to confirm no importer remains.
- [ ] **B2.** `src/components/collection/rows-view.tsx` — radius 8 → 7; the over-committed `border` becomes `inset 0 0 0 1px var(--avail-over-border)`. **Keeps its `×1` in `--accent` and gets no dot** — a count beats a gesture.
- [ ] **B3.** `src/components/decks/unresolved-row.tsx` — radius 6/7 → 7, and nothing else. It is exempt from the floor by data: no oracle id, no card, nothing whose availability could be stated. The `?` keeps the dot's slot so the name stays on one vertical line with the rows around it.
- [ ] **B4.** `src/components/decks/update-diff-row.tsx` — delete its private `OwnedDot` and its hand-rolled `buy` pill; render the shared dot, `BuyTag` (full, not collapsed) and `AvailabilityMarker`. Metrics with it: radius 8 → 7 at `:103`, `:148` and `:190`, and `gap-[10px]` → 9 phone / 10 desktop. `DiffRowUnnamed` stays exempt.
- [ ] **B5.** `DiffRowCard` gains `availability`. The preview is built in `previewDeckUpdate()` (`src/app/decks/update-actions.ts:166-167`) over `loadDeck()` (`:80-96`, which joins `deckCards`/`cards` for `oracleId, quantity, auto, name, typeLine`) and `withOwnership()` (`:188`); widen that path by reusing `loadAvailability(userId, { oracleIds })` from `src/lib/decks/availability-query.ts:40-43` rather than writing a second query. `src/lib/decks/update.ts` stays pure — it plans, it does not fetch. **This is the only data change in the card-rows handoff** and it ships with B4.
- [ ] **B6.** Export the row shell metrics once — one flex set and one grid set — instead of six hand-typed copies. Do this after B1–B5, so the extraction is over rows that already agree.

## PR C — the deck-detail data widening

- [ ] **C1.** `src/lib/decks/read.ts:140-154` selects `cards.manaCost` and `cards.imageUri` alongside the existing columns. No new join — both are on `cards`, which is already joined.
- [ ] **C2.** `DeckDetailCard` (`src/lib/decks/grouping.ts:12-31`) gains `manaCost?: string | null` and `imageUri?: string | null` — **optional, like the `availability?` and `price?` already beside them.** Roughly twenty call sites construct a `DeckDetailCard` (tests, fixtures, the update flow), and required fields would force every one of them to invent a value; the type's existing optional fields exist for exactly this reason. Consumers treat absent and null alike: no cost, no pips, no preview. **Not `colorIdentity`** (finding 1).
- [ ] **C3.** Ships alone, with no consumer. Putting it in a feature PR hides a read widening inside a diff about pixels.

## PR D — the decklist row: pips, the meta line, the collapsed tag

- [ ] **D1.** `src/components/decks/buy-tag.tsx` gains a collapsed density: a bare `$`, no word and no figure, in the same box, ink, radius and position. **Size is the row variant's own 9px phone / 9.5px desktop** (`PLACEMENT.row`) — the 10.5px figure in the handoff is the *tile* chip in PR F, and the two must not be conflated. **Skin is the row variant's skin:** a `--warning` 13% wash with **no border**; the scrim-plus-hairline in `PLATE.tile` belongs to the tile and does not come along. **Add an accessible name:** the row variant today passes no `label` and has no `sr-only` path, so a bare `$` would drop the word *buy* and the price out of the reading order entirely. The collapsed density speaks the word and the figure in full.
- [ ] **D2.** `src/components/decks/decklist-row.tsx` selects the collapsed density under `filter === "all"` and the full tag under Shopping. One prop, one call site.
- [ ] **D3.** Desktop: a fixed 40px right-aligned pip track between the name block and the availability slot. 12px pips, 3px gap, shingle from three, five drawn slots — so five symbols draw five pips and six or more draw four plus `+N`.
- [ ] **D4.** Phone: the pips join the meta line at 13px, plain and uncapped. Widen `hasShoppingMeta` (`decklist-row.tsx:112`) from *Shopping* to *Shopping or has a cost*, reusing that branch's existing shape. All tab: pips alone. Shopping: `pips · edhrec 24%`. **Nothing else joins the line, ever.**
- [ ] **D5.** Heights: 44px phone without a meta line, 52px with one; 34px desktop flat. Verify against a real deck that the change lands on group boundaries only — lands have no cost and stay 44px under both groupings.
- [ ] **D6.** Radius parity for the two decklist shells: `decklist-row.tsx:34` and `:38` are `rounded-[6px] md:rounded-[7px]` and become 7 at both widths, matching the PR B rows.
- [ ] **D7.** Check the measured budget in `DENSITY-four-hundred-pixels.md`: the desktop worst case is ~86–103px of card name, and a four-digit price cannot appear on the All tab any more.

## PR E — the view toggle, both surfaces, one release

**E1 and E2 must not be split.** They are one control on two surfaces.

- [ ] **E1.** `src/components/decks/group-toggle.tsx` — delete the inert `Group` label; add the `/collection` well at the bar's right end, rendered only when `filter === "all"`. Two new props (`view`, `onViewChange`). **Both are required, so the state that feeds them lands in this PR, not PR F:** `decklist.tsx` holds `view` as component state from here on, and all three `GroupToggle` call sites (`decklist.tsx:278`, `:338`, `:513`) are updated in the same change or the build breaks. PR E renders the list under both values; PR F is what makes `"card"` draw something different. Accessible names `List view` / `Card view`, from the copy file. Segments 44×44 phone / 32×32 desktop, container 94×48 / 70×36. The All/Shopping pills' active fill goes `--accent` → `--fg` on `--elevated` with a `--border-strong` ring (ruling 11).
- [ ] **E2.** `src/components/collection/filter-bar.tsx:256-285` — segments 28×24 → 44×44 phone and 30×28 → 32×32 desktop; active fill `--accent` → bone on `--elevated`.
- [ ] **E3.** Measure the phone bar at 390px. Design's figure for the deck bar is 218px of 358 on a line that already existed. **If `/collection`'s phone bar cannot absorb the growth, stop and report it — do not diverge the two surfaces** (finding 6).

## PR F — card view

- [ ] **F1.** `src/components/decks/decklist.tsx` branches on the `view` state PR E introduced (default `"list"` at both widths): under `"card"` it renders the tile grid in place of the row groups. **Grouping is unchanged and the group headers stay.**
- [ ] **F2.** A deck card tile component, built from `src/components/collection/grid-view.tsx`'s tile with four deltas: the ownership dot and the cost pips as one run on the art's bottom-left scrim; the set/rarity caption (`grid-view.tsx:82-86`) dropped; the quantity badge hidden at one copy (F3); the `✕` added to the caption, not the art. **Not a fork of `suggestion-tile.tsx`** — that one carries evidence bars, an Add button and a clamped two-line name it needs for shelf alignment.
- [ ] **F3.** Corners: top-left the availability slot (the marker when `owned` and `availability` gives it something to say, the collapsed `$` chip when the card is unowned — keyed on `owned`/`availability`, since `DeckDetailCard` has no `ownedCount`), top-right the quantity badge from `grid-view.tsx:57-63`, bottom-left the dot + pips run. **The badge is a fourth delta, not verbatim:** `grid-view` renders `×{quantity}` unconditionally, and the tile must drop it at one copy. **Bottom-right stays empty on purpose** — four marked corners is a frame, and keeping the `✕` out of it leaves the art a single click target.
- [ ] **F4.** Grid is `auto-fill minmax(132px, 1fr)` on desktop — **not 5-up**, because the add panel is 340–346px and opens. Phone stays 2-up at gap 12. Radius 9 phone / 10 desktop, border tint retained (ruling 12).
- [ ] **F5.** Targets: `✕` 44×44 phone / **32×32** desktop (not `grid-view`'s 24), revealed on tile hover with `--border-dashed` rest and `--fg-body` hover. The art is a `CardDetailTrigger` carrying its own `aria-label`; the chip is `spoken`, and the dot, badge and pips sit **outside** the trigger's subtree, as `suggestion-tile` already arranges its marks.
- [ ] **F6.** No buy tag beyond the `$`, no price, no auto tag, no set/rarity caption. The chip and the dot stay: a player cannot use the toggle to stop seeing that a card is unowned or spoken for.

## PR G — the hover preview

- [ ] **G1.** Desktop-only, under `@media (hover: hover)`. **One instance per decklist**, not one per row.
- [ ] **G2.** 252×352, radius 12, 1px `--border-strong`, `0 18px 40px -12px rgba(0,0,0,0.72)`. The card image alone, no chrome, no caption, no pips.
- [ ] **G3.** Anchored to the row's vertical centre, 14px outboard. Opens left; flips right when there is not 252 + 14px to the left. **Bounded by the decklist pane, not the viewport** — it may overlap rows, never the panel.
- [ ] **G4.** 240ms open, 80ms close, 0ms row-to-row while already open. **It does not fade or scale in** (ruling 14).
- [ ] **G5.** `aria-hidden` entirely, pointer-transparent, never focusable, no `title`. A two-faced card previews its front face only, with no flip on hover.

## PR H — #363, data first

- [ ] **H1.** Add a `layout` column to `cards` and back-face image storage; re-seed the catalog. `pnpm db:generate` then `pnpm db:migrate`; migrations apply automatically on the Vercel production build.
- [ ] **H2.** `toCardRow` (`src/lib/scryfall/transform.ts:13-34`) persists `layout` and, for two-faced layouts, the second face's `image_uris.normal`. It currently keeps exactly one image, taking the first face that has one.
- [ ] **H3.** The `//` mark: a mono `//` after the name at 11px plus a 6px gap, on both the row and the tile. **Driven by the `layout` column, never by the `//` heuristic** — split and adventure cards carry the same separator and have no back (finding 5).
- [ ] **H4.** The modal flip control: bottom-right of the art block, 34×34 desktop / 44×44 phone, radius 7, on an `--bg` scrim at 86% with a `--border-strong` hairline. **Its accessible name is the other face's name**, not "flip". The image swaps and does not animate. Prev/Next resets to the front face.
- [ ] **H5.** H3 and H4 land in the same PR, after H1 and H2. **No partial ship.**

---

## Testing

- **Unit.** The pip ladder (every row of `STATES-card-surfaces.md` § *The pip ladder*), the `sr-only` cost mapper including the uncapped case, the ownership dot's three states plus the two-state fallback, and `BuyTag`'s collapsed density including the no-price case.
- **Integration.** The widened deck read returns `manaCost` and `imageUri`; the diff query returns `availability`.
- **Manual, both widths, before each PR.** The design-review skill (property-table enumerate → verify → confirm) runs against the handoff tables before `gh pr create`. Mobile and desktop parity ship in the same PR.
- **The state matrix is the checklist.** Twenty-one of twenty-four row cells are drawn; two are impossible by construction (`/collection` lists what you own, so it has no unowned row and never draws a buy tag) and one is deferred (`synergy-row` over-committed). All four tile states are drawn at 148px desktop and 159px phone.

## Out of scope

- `synergy-row`'s availability slot (card-rows ledger item 9) — blocked on the commander-route aggregate.
- The Shopping pill's idle `--warning` tint. Design's recommendation is that it becomes a hairline pill like its peers, but that is shipped behaviour beyond the active state and belongs to refresh R3.
- Any change to the card modal beyond the flip control.
- Persisting the view, deep-linking it, or defaulting it per width.
