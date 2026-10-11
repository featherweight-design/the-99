# Tokens for my deck: R1/R2 audit, 2026-10-11

Audited against `docs/superpowers/design-briefs/2026-10-11-tokens-for-my-deck.md` (Hugh's four rulings, engineering's
ten locks, eight open questions, Fixtures) and the code on `origin/main` at `673b657fc`.

## Verdict: GREEN

The drop covers everything the brief asked Design for, and Hugh approved R2 (LGTM, 2026-10-11). Nothing needs another
Design round. Hugh closed the two product calls the audit raised on 2026-10-11 (findings 1 and 2). What remains is
engineering's: verify the Mana Pool line format before the link-out PR (finding 3), because the About entry and the
sends line both promise it.

## Which files are current

- **R2 is current.** The canvas is `The 99 - Tokens (R2).dc.html` and its frame component is `Tokens R2.dc.html`
  (`<dc-import name="Tokens R2">`). Build from these.
- **R1 is history.** `The 99 - Tokens (R1).dc.html` imports `Tokens.dc.html`. The README's file table says
  `Tokens.dc.html` is "imported by the canvas", which is true only of R1.
- `STATES-tokens.md` and `design-tables/tokens.md` each start with an R2 delta table, and below it the R1 tables
  unchanged. Where they differ, the delta wins (finding 6).

## Brief checklist

| Brief requirement | Where | Result |
|---|---|---|
| Ruling 2: each token, its makers, whether the collection holds one | TokenRow, makers fold, dot plus `in your collection` | met |
| Ruling 3: an unowned token can join Shopping, by choice (lock 7) | `Add to Shopping` per row; Shopping `Tokens` group, last | met |
| Ruling 4: no emblems, no markers | none drawn; Must-nots | met (Copy: finding 1) |
| No verdict word or warning color on ownership | R2 drops the not-owned fact; `--warning` appears only on the shipped buy tag and the Shopping tab | met |
| Two tokens of one name read as different | X6 (Soldier W 1/1 vs R 2/2), Omnath's two Elementals; X7 text line for a full collision | met (X7 needs G4, decided below) |
| A token never changes a deck's status | S1 keeps `Shopping 0` and `Complete`; Must-nots | met |
| Not known yet, the first state players meet | T0 band at the group head, no dot, controls kept | met |
| Makers for one and for nineteen | M1 (Food, Momo), M2 (Thorin's Treasure, 19, scroll box past 9 / 5) | met |
| Card-details line | D1: one line in `In this deck` | met |
| Shopping row for a joined token | S1 (Aang), S2 (Omnath) | met |
| Aang, Omnath (14), Wizards (Copy only) | `read`, `omnath`, `wizards` scenes; Aang's four tokens and six makers are the brief's | met |
| 900 and 390 | every scene at both | met |
| STATES and design table | present | met, with drift (finding 6) |
| About entry | `about - tokens.ts`, §AB at 390 and 760 | met |
| Eight open questions | all answered in README; R2 revises Q2 (Copy) | met |
| Vocabulary: select/unselect, never tick | no `tick` in any file; R2 uses `mark` / `unmark` / `I have one` | nothing for `/copy-review` on this rule |

## Engineering facts, verified

- **`all_parts` is not stored.** It appears only in a comment (`src/lib/recs/score.ts:263`). The lock 1/3/4 ingest
  change (token record plus card-to-token link, parsed from the bulk files already fetched) is all new work.
- **`TOKEN_LAYOUTS` lives in `src/lib/cards/game-card.ts:24`**, not `src/db/schema.ts` (the schema only mentions it in
  a comment at `:162`). Upload uses it at `src/lib/collection/import.ts:104` to build `skippedIds`, and the matched
  token rows are counted and discarded. Lock 5 replaces that filter with a resolve to a token oracle id.
- **Shopping cannot hold a token today.** `isShoppingCard` works on a `DeckDetailCard` (a `cards` row); the
  commander rows are the only non-deck-card precedent. The price strip sits in `GroupToggle` above the list
  (`group-toggle.tsx:514`), so R2's "buy box first" matches the shipped page.
- **Mana Pool:** `manapoolDeckText` (`src/lib/manapool/links.ts:13`) writes `N Name` lines only. Token prices are
  dropped at ingest (lock 6). Nothing sends a set and number yet (finding 3).
- **Not known yet** has no source today. Lock 5's per-account read marker decides it; nothing records one.
- **Names the drop reuses all exist:** `HoverPreviewProvider`, `DecklistGroupHeader`, `buildMarkKeyEntries`,
  `pricedClause`, `summarisePrices`, `moneyStats`, `shoppingCount`, `BracketFactsDetail`, `AboutSwitch`, the
  `In this deck` box (`src/lib/copy/proxies.ts:90`), the stacked-sheets return in `card-detail-provider.tsx`.
- `ABOUT_VERSION` is 14 on main. The entry takes the next free number with the last PR, as the README says.

## Findings

1. **Ruled (Hugh, 2026-10-11) · Copy is a row; lock 9 is overridden.** `Copy` is an ordinary token row that can be
   owned, marked, joined and bought (Omnath 14, Thorin 8, Wizards 1), exactly as R2 draws it. Lock 9 is overridden.
2. **Ruled (Hugh, 2026-10-11) · A token's buy tag is pressable (G3 closed).** Pressing the buy tag on a token's
   Shopping row marks the token owned, the same record `I have one` writes (`source: manual`), and takes it off that
   deck's Shopping list in the same save. No confirm sheet. This overrides R2's inert tag (design table: `BuyTag row`,
   **no `press`**). It needs no new drawing, because it's the shipped tag pressed.
3. **eng-resolvable · Mana Pool format (G6), verify first.** The R2 sends line and About key line 4 both say a token
   is sent with its set and number. That assumes `add-deck` accepts `N Name [SET] number` lines mixed with name-only
   lines in one URL, and that the longer URL still fits. Verify before the link-out PR. If it fails, the sends copy
   and key line 4 change through `/copy-review` and Design isn't needed.
4. **eng-resolvable, decided · Same-name collisions (G4).** Add the token's oracle text to the token record. It comes
   from the same bytes at no cost and doesn't contradict lock 4's field list. Show it only when name, colors and P/T
   collide within a deck (X7).
5. **eng-resolvable, decided · Manual marks and the read marker (G2, G2a).** A manual mark never writes the
   per-account read marker. Otherwise one mark would turn every unmarked token from "not known" into "not owned",
   which the Must-nots forbid. Before the first upload, a row is either marked (owned) or unknown. The upload
   replaces only upload-sourced token rows and never touches a manual one, as G2a says.
6. **eng-resolvable · R1 tables still in STATES and the design table.** Below the R2 deltas, the R1 bodies still say
   `not in your collection`, `✓ On Shopping`, `Made by`, `count = rows (Copy excluded)`, a `CopyNote` component, a
   card-details `Makes` block (D1, D2 to D4), the strip's `+ N tokens` line, and a Must-not "No Copy row". All of that
   contradicts R2. The plan's commit to `docs/superpowers/design-tables/tokens.md` should fold the deltas in and drop
   the superseded rows. The copy file also keeps strings R2 may no longer draw (`strip.line`, `strip.lineNoPrice`,
   `strip.deckNone`, `makers.printing`). Prune them in `/copy-review`.
7. **eng-resolvable, decided · The box figure and lock 7.** R2's Shopping figure is what the link buys
   (`$271.18` = `67 cards · $270.48` plus `4 tokens · $0.70`). `summarisePrices`, `moneyStats`, `shoppingCount`, the
   status and the `/decks` roll-up stay card-only. The token sum is a separate figure added only in the box. That
   keeps lock 7 intact.
8. **eng-resolvable, decided · Leaving Shopping.** Pressing `I have one` deletes that deck's join in the same write.
   An upload that reads a joined token as owned deletes those joins in the upload's transaction. Unmarking doesn't
   restore a join (X1m goes to X2, which isn't joined).
9. **eng-resolvable · Fixtures (G1).** Omnath's 13 non-Copy names, Thorin's 19 makers, Wizards' Copy maker and every
   set code are illustrative. The canvas has Omnath at 17 makers where the brief measured 16. The plan's probes use
   the brief's read-only staging script, not the canvas data.
10. **eng-resolvable · Commanders as makers (G10), cart (G7), switch (G8), join read (G9).** These are as the README
    states. The token tables are per-user, so if `/decks` or Home ever reads them, `check:list-cache` will require the
    `user_data_touch` trigger. Lock 7 says neither page should read them.

## Decisions made here (only one answer is defensible)

Findings 4, 5, 7 and 8 are logic decisions. None changes a layout, and none needs Design.

## Copy for `/copy-review`

Every string in `tokens - copy strings.ts` and `about - tokens.ts` is a placeholder. No `tick`. The em-dashes in
`Tokens R2.dc.html` are only in quoted card oracle text, not in app copy.
