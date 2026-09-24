# Swap tools (sub-project 4): plan

**Lane:** `swap-tools` (brief: `boards/lanes/swap-tools.md`). **Written against** `origin/main` at
`4f3eff49`, and the handoff and audit on `design/swap-tools-handoff` (#929, not yet merged).
**Status:** APPROVED by Hugh on 2026-09-24 (d288c750), with one change to H3, recorded in
Decision 2. Migration 0059 is confirmed. Release ruling: every swap surface is behind
`SWAP_TOOLS_ENABLED`, on in staging and off in production until Hugh walks it (PR 1 adds it).
Revised once after a cold review. That review's twelve items are folded in below, and item 12's
questions are answered in §Decisions, each with its reason.

## Goal

When a player has to buy an expensive card, they see cheaper cards that do the same job. From any
card, they see which of their own decks it would fit. Every figure on either surface is a fact; none
is a score.

## Sources, in precedence order

1. **Hugh's rulings.**
   - Brief `design-briefs/2026-09-24-small-swap-tools.md`: §2 rulings 1–10 plus 5a; §3.5
     (commander fact is inclusion only, no synergy, and staples come from the shared definition);
     and §5.
   - `READINESS-audit.md` H1–H3:
     - **H1:** an Add with no spare copy adds the card as a buy.
     - **H2:** the swap's undo reads `Undo swap` everywhere, and tuning's `Put it back` is renamed
       to match.
     - **H3:** a utility land's stand-in names what it gives up, and never claims "gives up nothing"
       unless that is true.
2. **Design.** `design/design_handoff_the99_swap_tools/` (R4), plus the staple-read addendum that
   Design is drawing now. The audit's engineering findings F2–F15 are corrections, and the build
   follows them.
3. **Engineering.** Brief §6, `src/lib/staples/universal.ts` (#926), `printing_prices` per
   AGENTS.md, and the classifiers.

Where the brief or README contradicts a later ruling, the later ruling wins:

- **H2 over "Put it back".** The brief (:79, :162, :261) and README (:53, :74, :79, :88) still say
  "Put it back".
- **R2–R4 over the brief's always-open placement.** The Fits picker opens on demand from the modal
  footer, and `can't play it` is gone, overriding brief §3.5 and README :77, :106, :114.
- **F5 over the brief on a sold-out original.** A sold-out original is unpriced and never over the
  limit, where brief :101 compared it at the frozen price.

## Decisions this plan makes

Each has one defensible answer. They are stated here so review can check them.

1. **One engine, two readers.** Everything that decides a stand-in lives in `src/lib/swaps/` as pure
   functions over a card row, with the database gather kept separate. The land's colors, a fetch
   land's types and the drawbacks are **new pure readers over `oracle_text`/`type_line`**. They need
   no ingest and no column.
   - `recs/mana.ts`'s `producibleColors` unions a whole set of lands, and nothing outside its own test
     calls it. The swaps reader is a per-land variant in the swaps module. It imports
     `ANY_COLOR`, which `mana.ts` exports for this (a one-line change, requested in §Fence).
   - It carries the conditional exclusions from brief §6: Exotic Orchard and Reflecting Pool make
     nothing on their own, so they never count as making a color.
2. **"Does the same job"** is brief rulings 5, 5a and 6 and the §3.0 readings, exactly:
   - A **land** covers every color the original makes. An any-color grant counts, Command Tower
     included; one that depends on other permanents (Exotic Orchard, Reflecting Pool) does not.
   - A **fetch** finds the same land types.
   - A **spell** shares **at least one** role from `classifyRoles` (§3.0) and costs the same mana
     value or less, and the row names the roles it shares. `primaryRole` is the Fits need chip's
     rule alone (F9); it does not narrow stand-ins.
   - A card whose front face is a land is a land. Agadeem's Awakening is a spell.
   - **§5's guards on every stand-in:** it is legal in Commander, inside the commander's color
     identity, and not already in the draft.
   - **What the original gives up (H3, as Hugh changed it at approval):** every stand-in NAMES what
     the original did that it does not, from the original's own text, in two layers. First, a
     deterministic classifier over the original's non-mana abilities (`GIVES_UP_PATTERNS`, one test
     per pattern): "can't be countered" is `uncounterable spells`, becoming a creature is
     `becoming a creature`, channel is `its channel ability`, and so on. Second, where no pattern
     covers an ability, the fallback QUOTES the card's own ability text, trimmed to a budget with
     an ellipsis. It never reads `gives up nothing` unless that is true, and never the unnamed
     "couldn't name" line. This departs from Design's drawn unnamed line, per Hugh's ruling, and
     the fallback's wording and trimming go to `/copy-review` through the orchestrator.
     Measured over staging's decks: 90.7% of utility-land abilities are named, 9.3% quoted.
   - **Basics are stand-ins like any other land.** A basic is never on Shopping, so it is always
     free (§3.0), and under H3 a basic standing in for a utility land carries the unnamed gives-up
     line. Nothing in the rulings excludes basics, so none are excluded, and no question goes to
     Hugh.
   - A card with no role, or a land that neither makes a color nor fetches, gets **no** stand-in
     and one sentence saying why.
     - **Cabal Coffers is the one departure from ruling 6's own examples.** The ruling names it as
       a land that makes no color, but its text adds {B}. Read by the same rule as Gaea's Cradle,
       it takes black stand-ins, each giving up `its extra mana`. H3 is the later ruling, and it is
       what lets a utility land take stand-ins at all. Strip Mine makes only {C}, so it gets none.
   - Ranking: free copies first. Then lands by price. Then spells by the commander's inclusion
     (`commander_support_cards.inclusion`, or the pair table for a partner deck), with unlisted cards
     last, by price (F14).
3. **Staples.** Every candidate row carries `isUniversal` from `loadUniversalStaples`, from the
   first PR. What the row *draws* for a staple is the addendum's call, so that render is the last
   PR (see §PR 6). Nothing restates the rule (F1).
4. **Prices.** Read with `loadPrices`, and classified with `priceState`/`priceOf`.
   - "Stocked now" means `priced` or `foilOnly` (F6). A foil-only stand-in shows its foil figure.
   - An absent price is **never** read as free.
   - A sold-out original is unpriced: it is never over the limit, and its sheet lists free copies
     only (F5).
5. **The limit** is a new column, `decks.shopping_limit_cents int null`, with a check that it is at
   least 100 and a whole number of dollars. Null reads as $10 (ruling 4). It is written by a small
   server action, and its revalidation is deferred with `after()`.
6. **Take and Undo swap.** A take is tuning's Apply act (ruling 7). It swaps the cut for the add in
   the draft, with an undo.
   - **Shared body.** `applyItem`'s body (`src/lib/tuning/verdicts.ts:84`) becomes one shared swap
     body that both tools call. It returns a refusal *reason* (F11), so the "another tab" cause
     survives. A thrown error is a failure and renders `MutationError`.
   - **Undo storage.** Tuning keeps its undo on `deck_suggestion_items.undo_snapshot`, and swaps
     have no suggestion row. So swaps get their own table, `deck_swaps`:
     `id`, `deck_id` (FK, cascade), `user_id`, the cut and add oracle ids, `add_was_free`,
     `snapshot jsonb`, `created_at`, and `undone_at`.
   - The receipt reads its "free" from the take's own availability read, not from the list's (audit
     note).
   - The migration is **0059**. The orchestrator confirms that number before PR 2 is generated,
     because the notices lane shipped 0058.
7. **"Free after the take"** needs availability evaluated on the deck as it *would* be. No existing
   function does that.
   - It lives in `src/lib/swaps/availability-after.ts`.
   - Its definition is §3.0's: a stand-in is free **exactly when `isShoppingCard` is false for its
     row with the take applied**. That means the add's ask goes up by one, and the cut's own claim is
     released. It reads the claim figures `loadAvailability` already returns, and adjusts only the
     deck's own ask. It does not restate the claim model, and `loadAvailability` stays untouched.
   - `probe:swap-take` pins the result against a real claim.
8. **H2's rename.** `deck-tuning.ts:206` `undo: "Put it back"` becomes `Undo swap`, and both of
   tuning's design tables are swept to match. The review page's `Put back` for a removed card stays.
   The decklist row's removal undo already reads `Undo` (F10); that inventory goes to `/copy-review`
   and is not changed here.
9. **Fits your decks** (rulings 8–10, R4):
   - It opens on demand from `Find a deck for it →` in the card modal's footer. The door shows only
     when the card is Commander-legal and the player owns at least one deck. That needs
     `commanderLegal` and `hasDecks` added to the card-detail payload (F3).
   - Each fitting deck shows two chips side by side, and never a score:
     - the commander's inclusion (`in N% of X decks` / `not listed for X`);
     - this deck's role need (`role n of t`, from `primaryRole`; and `land N of T` only when
       `landMeasured`) (F9).
   - `recommendedMix` must return `rolesUsable` and `landMeasured`, which it computes today and
     does not return. The picker batches `loadDeckMix` rather than paying roughly 3 queries per deck.
   - **Add goes through its own action, `addFromFits`,** with no spare copy meaning a buy (H1).
     - `addCardToDeck`'s in-action revalidation is load-bearing for the five deck-page callers (see
       the comment at `actions.ts:499-503`), so it stays exactly as it is.
     - The write moves into an exported inner function that both actions call. `addFromFits` defers
       its revalidation with `after()`, because it is called from a modal on `/collection` and
       elsewhere, where in-action revalidation would ship the caller's page (the 1.6 MB lesson).
10. **Stacking.** Two stacking directions are needed, and each is built once, in PR 4b, where it is
    first needed:
    - `CardDetailProvider` gains the reverse direction: a sheet over the card (F3). The Shopping
      door opens the stand-ins sheet over the card, and PR 5 reuses the same machinery for the
      picker.
    - The stacked card pages the sheet's own list with Prev/Next (README:9) on desktop, and has no
      phone Prev/Next (F8). A stand-in row shows the shipped hover preview on a fine pointer
      (README:8).
    - A card opened from the stand-ins sheet draws the Take footer, with `in place of {cut}`.
    - The Shopping door (`See cheaper stand-ins →`) needs the provider to know it was opened from a
      Shopping row, so the provider gets a new `origin` flag. Today the provider carries only
      `deckId`/`deckOracleIds`.
11. **The Fits door's hosts.** The door shows wherever a card modal opens (ruling 9), subject to the
    legal and has-decks gate. The About page's specimen modals are the exception: they hide the
    door, because a specimen is not the reader's card.
12. **Failure and refusal states (F4).**
    - The picker's load failure uses the sheet's `failed` shape.
    - A refused Add and a refused Undo swap each render `MutationError` under their row, with their
      own copy (`addRefused`, `undoRefused`).
    - A refused take renders the sheet's `refused` panel.
13. **Widths.** ModalChrome gains `640` in its width union and `WIDTH_CLASS` (F7). That is two lines
    in `receipt-modal.tsx`.

## PRs, in order, with their boundaries

Each PR is about 20 files or fewer. Every UI PR runs design-review (enumerate, verify, confirm), a
probe at 390 and 1300 that **presses** its controls, mutation checks, and feature-acceptance per PR.
**Staple-dependent render is last** (PR 6), so Design's addendum can land first.

| PR | Contents | Proof |
|---|---|---|
| **1 · Engine** (lib only) | `src/lib/swaps/`: land colors (exports `ANY_COLOR` from `recs/mana.ts` rather than copying it), fetch types, drawbacks, the text-job test (H3), `sameJob`, §5's guards, the candidate gather (roles, MV, inclusion from the commander or pair table, `isUniversal`, prices, owned and free copies), ranking, and `availability-after`. Unit tests per reader, plus a fixture of named real cards (Plateau, Wooded Foothills, Cavern of Souls, Gaea's Cradle, Strip Mine, Cabal Coffers, Mana Vault, Command Tower, Exotic Orchard, Reflecting Pool, Agadeem's Awakening). | `probe:swap-engine` against local-dev: the gather over the real catalog, for a land, a fetch, a spell, a multi-role spell, a partner deck, a text-job land and a no-role card, with both sides of every relation asserted. |
| **2 · Storage and actions** | Migration 0059 (`decks.shopping_limit_cents`, `deck_swaps`), schema, the shared swap body extracted from `verdicts.ts`, and `src/lib/swaps/actions.ts` (`"use server"`: `takeStandIn`, `undoSwap`, `setShoppingLimit`, each revalidating in `after()`). Tuning's action switched to the shared body, and the H2 rename (copy, the `suggestion-card` test, the two tuning design tables). | `probe:swap-take`: take, then undo, then a take of a free copy, then a refused take after another tab edited the deck, reading back the draft and `deck_swaps` rows. Also "free after the take" against a real claim. Mutations: undo restoring nothing, a refusal reason dropped, free read off the list. The tuning probe re-runs green. |
| **3 · Shopping: limit and marks** | The limit line under `PriceStrip` (default / set / editing / none over / no feed; hidden when Shopping is empty), the row's ⇄ with its ring and `over $X` meta, and the 22px empty slot on desktop. The ⇄ opens nothing yet: it ships behind the sheet in PR 4a. | `probe:swap-shopping` at 390 and 1300: edit the limit, marks move, 44px targets on the phone, and the name's width at 390 and at the narrowest two-column desktop (F12). |
| **4a · Stand-ins sheet** | The 640 width (F7), and the sheet's every kind: lands, fetch, spells, partner, no-role, nothing cheaper, the sold-out original's free-only list (F5), loading, and failed. The ⇄ wired to open it. Rows show inclusion only; the staple form waits for PR 6. | `probe:swap-sheet` at 390 and 1300: presses ⇄ on each fixture row and reads each kind. Built fixture: a committed deck whose Shopping list holds an over-limit land, a fetch and a spell. |
| **4b · Take, receipt, stacking** | Take and every outcome (bought / free / one fewer), the refused panel, the taken state, the receipt with `Undo swap`, the strip's new total, `CardDetailProvider`'s reverse stacking, the modal's `See cheaper stand-ins →` door (opens the sheet over the card), the stacked stand-in card with its Take footer and Prev/Next, and the hover preview. | `probe:swap-sheet` grows: **presses** Take, then Undo swap, then opens a stand-in's card and presses Take from its footer, then pages Prev/Next. Covers all three take outcomes and the door from the card modal. |
| **5a · Fits data** (no UI) | `commanderLegal` and `hasDecks` on the card-detail payload, `recommendedMix` returning `rolesUsable`/`landMeasured`, the batched mix loader (`src/lib/decks/deck-mix.ts`), the Fits gather, and `addFromFits` plus the extracted inner add. | `probe:swap-fits-data`: the gather for a card across the fixture's decks, including colors ruling decks out and a deck that holds the card, plus the size of `addFromFits`'s reply called from `/collection`. |
| **5b · Fits picker, and the staple read** (**after the addendum lands**) | The footer door (F8's phone row), the picker (several / loading / failed / all hold it / colors rule them out / added; the copies line in every state, F15), Add and Add to buy (H1), `addRefused`, and the staple form of the commander chip per the addendum. | `probe:swap-fits` at 390 and 1300: presses the door on every host in the inventory, Add with a free copy, Add to buy with none, a refused Add, and reads the added state and `Open the deck →`. |
| **6 · Staple read on the stand-in row** (after the addendum) | The staple form of the stand-in row's fact line, and any lead or group copy the addendum changes. | design-review against the addendum. `probe:swap-sheet` gains the Sol Ring as a stand-in for Mana Vault case. |

The picker never reaches `main` without the staple read, so a universal staple is never shown as a
commander-specific fit (§3.5; the audit's "the picker waits on it"). The sheet may go first, as the
audit allows, and until PR 6 its rows show inclusion only.

**Split rule:** PRs 4 and 5 are already split at the named points above. If either half still runs
past about 20 files, it splits again at its tests-and-probe boundary before it opens, never after.

**About (batched, named here so it cannot evaporate):** the deck-analysis line batches its entries at
launch (ruling 2026-09-21). Two entries are owed, **Cheaper stand-ins** and **Find a deck for it**,
drawn by Design on the per-entry artboard. They land in the line's launch PR with the
`ABOUT_VERSION` bump. None of PRs 1–6 bumps the version.

## Route × viewport inventory (feature-acceptance)

| Surface | 390 | 1300 | Reached by |
|---|---|---|---|
| `/decks/[id]` Shopping: limit line and marks | ☐ | ☐ | Shopping group toggle |
| Stand-ins sheet, every kind | ☐ | ☐ | ⇄ on a row, and the modal door |
| Stacked stand-in card with Take | ☐ | ☐ | a name in the sheet |
| Receipt after a take | ☐ | ☐ | Take |
| Card modal: the `Find a deck for it →` door | ☐ | ☐ | a card on `/decks/[id]`, `/decks/[id]/changes` (review, update diff), `/collection`, `/collection/proxies`, `/commanders/[slug]` and a set page; absent on the `/about` specimens |
| Fits picker, every state | ☐ | ☐ | the door |
| Tuning's `Undo swap` (H2) | ☐ | ☐ | the tuning Apply flow |

`docs/superpowers/inventories/swap-tools.json` carries these rows. `check:shared` pins
`UndoRow`'s shell for the receipt, and the `LoadingScreen` for both loading states.

## Fence

The lane brief's proposed fence is **confirmed**, and this plan asks the orchestrator for the files
outside it, per PR:

- **Every PR:** `package.json` (its probe script).
- **PR 1:** `src/lib/recs/mana.ts` (export `ANY_COLOR`, one line).
- **PR 2:** `src/db/schema.ts`, `drizzle/0059_*` plus its `meta/` snapshot and journal,
  `src/lib/tuning/verdicts.ts`, `src/app/decks/tuning-actions.ts`, `src/lib/copy/deck-tuning.ts`
  plus its test, `suggestion-card.tsx` plus its test, and `design-tables/deck-tuning*.md` (H2).
- **PR 3:** `group-toggle.tsx`, `decklist-row.tsx`, `buy-tag.tsx`, and `src/app/decks/[id]/page.tsx`
  (reads the limit).
- **PR 4a/4b:** `receipt-modal.tsx` (640), `card-modal.tsx` (door, Take footer, Prev/Next over the
  sheet's list), `card-detail-provider.tsx` (reverse stacking, origin flag), and
  `hover-preview.tsx` only if a stand-in row cannot use its hook as shipped.
- **PR 5a/5b:** `card-modal.tsx` (footer door, F8), `src/app/card-detail-action.ts`,
  `src/lib/collection/card-detail.ts` (payload), `src/lib/decks/mix.ts` (return type), a new
  `src/lib/decks/deck-mix.ts`, `src/app/decks/actions.ts` (extract the inner add; the public action
  is unchanged), and the About specimen host (to hide the door).
- **Every UI PR:** its own `design-tables/swap-tools-*.md` and `gap-report-swap-tools-*.md`. Both are
  already inside the fence.

Hands off, as the orchestrator asked: `synopsis/types.ts`, the synopsis components and
`synopsis-actions.ts`, plus the notices lane's `deck-card.tsx`, spines, `builder-shell.tsx` and
`analysis-panel.tsx`. None of the PRs above needs them.

## Traps carried from the lane brief

- An absent price is not free. Foil-only is its own state. "Stocked now" compares `as_of` with the
  newest `as_of`.
- A Server Action that revalidates ships its caller's page, so every action here defers revalidation
  with `after()`.
- Rebase onto `origin/main` and typecheck right before every merge.
- A non-empty OUTSIDE list from the fence check halts the merge, unless that file was signed off
  above.

## Open for `/copy-review` (not for Design)

- The colors sentence: "neither of your commanders is" (canvas) against "none" (copy :175).
- `allHold`'s "They're listed above." (copy :171), which the canvas drops.
- F5: the free-copies-only lead, and the price-free empty sentence.
- F14: the lead dropping its second clause when the index lists nothing.
- H3: the named labels in `GIVES_UP_PATTERNS`, and the quoted fallback's wording and trimming.
- F13: README R1 keys `excludedOne`, `excludedMany`, `hardStop` and `fits.add` are dropped. The copy
  file is the source.
