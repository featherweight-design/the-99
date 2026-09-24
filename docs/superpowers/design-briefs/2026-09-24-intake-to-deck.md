# Design Brief: Help me choose (sub-project 8, intake to deck)

**Date:** 2026-09-24 · **Branch:** `docs/intake-brief` (approved by Hugh, 2026-09-24)
**Rulings:** Hugh, 2026-09-24, in the scoping conversation for this brief (§2). The universal-staple
rule (§5) is his standing instruction for sub-projects 7 and 8, which the orchestrator relayed the same
day.
**Spec:** `docs/superpowers/specs/2026-09-19-deck-analysis-foundation-design.md:29` lists "Intake
questions → deck" as "intent parse → target facts", with a thin model part. §14 row 8 (`:2273`) names
it without specifying it.
**Frame:** `/decks/new`, which has two doors today. One is pre-filled when `?commander=` is valid; the
other is a picker over the commanders the player owns (`src/app/decks/new/page.tsx:1`, `:40`). Discover's
filters are the second way in.

**Verified against `origin/main` at `4f3eff49`.** Every file:line below was read on that commit.

This round asks: **how does a player who wants a new deck, but doesn't know what to build, say what
they want, see which commanders fit it best, and get a deck from the one they pick?**

---

## §1 What this is

Half of this exists already. Creating a deck fills it: `createDeck` (`src/app/decks/actions.ts:253`)
calls `buildFillPlan` (`:81`), which builds the 99 from the commander's measured skeleton, owned cards
first. What is missing is the front half: getting from "I want dinosaurs, cheap, for a casual table" to a
commander. Three gaps:
- The new-deck picker offers only commanders the player owns.
- The commander filters take color, text, owned or not, and an order
  (`src/lib/commanders/lane-params.ts:62-84`). None reads a theme, a budget or a bracket.
- The fill takes no budget and no bracket (`PlanFillArgs`, `src/lib/decks/fill.ts:73`).

**Prior art, and where it falls short.**
- **No tool covers the whole path.** Quizzes stop at a commander, generators start from one, and
  collection apps only check ownership.
- **EDHMatch** scores commanders from a playstyle quiz and returns names only. Its method is unpublished,
  and it takes no collection, budget or bracket.
- **EDHREC's average and budget decks** build a full list, but need the commander first. "Budget" there
  means the cheapest 10% of decks, not a price cap, and averaging produces artifacts: its budget Six list
  runs 44 lands.
- **ManaTap** takes a budget tier, a power setting and an owned-only switch. It appears to be
  model-built, and it tells the player to verify its cards.
- **LLM deck builders** are documented inventing cards, going off-color, duplicating cards and miscounting
  the deck (farseek.ai, "ChatGPT fails commander deckbuilding"). That is why a model here never picks a
  card or a commander.

## §2 Rulings, locked (Hugh, 2026-09-24)

1. **The answers get the player a commander, then a deck.** The intake narrows to commanders. Picking one
   creates the deck through today's creation flow. The theme and any build-around card choose the
   commander, and the budget and bracket also steer that commander's fill.
2. **Five inputs, all optional:** colors, theme (EDHREC's theme tags), budget, bracket, and a free-form
   box. The form tells the player that more detail helps.
3. **Free text is matched for free first, and a model reads it only when the player asks.**
   - The sentence is matched deterministically and shown back as editable chips.
   - If words are left over, the player is offered "Read it properly", which costs one allowance
     credit.
   - The model only turns words into chips from the real vocabulary. It never names a commander.
4. **A credit is spent only when the model reads free text.** Choices, the free match and editing chips
   cost nothing, and the form names the cost before the player spends. Hugh flagged that this needs
   careful UI.
5. **Results are ordered by fit to what the player asked, not by their collection.** A perfect commander
   the player owns no cards for belongs at the top: "the user is asking for a commander/deck based on a
   theme, not based on collection."
   - **Theme fit:** the share of that commander's decks carrying the tag ("62% of its decks are
     Dinosaurs").
   - **Card fit:** how often that commander's decks run the build-around card ("48% of its decks run
     Doubling Season").
   - **Several answers:** themes and a card together are ordered by the weakest of their figures, since
     a commander fits only as well as its worst answer. Every figure is shown.
   - **No theme and no card:** ordered by how many of the cards its decks run the player already owns.
     The results say that is the order, and suggest adding a theme.
6. **Colors and bracket filter; the budget caps the fill.**
   - A commander outside the colors or the bracket is not shown.
   - A commander that on its own costs more than the budget is not shown.
   - Otherwise the budget shapes the fill: unowned cards that would break the cap are skipped. A fill can
     always finish with basics, so the budget never removes a commander for any other reason.
7. **Ownership is a fact on each row, not the order:** "you own 41 of its 99 · about $120 to buy". An
   owned commander is marked free and keeps its place in the fit order.
8. **Too narrow is named, never loosened silently.** When few or no commanders pass, the results say
   which answer removes the most ("Dinosaurs leaves 2; without it, 31"), so the player can loosen it.
9. **Two doors:** a "Help me choose" path on `/decks/new`, beside the owned-commander picker, and a link
   from Discover's filters.
10. **Single commanders only, this round.** Partner pairs are not results: the pair index stores no
    theme tags, and today's creation flow takes one commander. The brief says so, so that no half a pair
    flow gets drawn.

## §3 What Design is asked to draw

Both widths, 390 and 1300, for everything below.

### 3.0 Readings settled in scoping

These follow from the rulings. Hugh has not ruled on them one by one, and he may overrule any of them.
- **Colors** use the existing control with its Any/Exactly modifier (`lane-params.ts:80`). No preference
  admits every identity, including five-color.
- **The free match** is against exact theme tag labels, card names from the whole catalog (a card the
  player does not own can be a build-around card), dollar figures, and "bracket N".
- **A build-around card is always placed in the deck** when it is created, because the player asked
  for it. If they don't own it, its price is counted first against the budget, and the fill caps what
  remains. A commander whose own price plus the card's exceeds the budget is not shown, and the
  too-narrow state names the budget.
- **Brackets 4 and 5** carry no stated limits (`src/lib/bracket/rules.ts:13`), so as a filter they
  admit everything. The row and the fill say nothing different for them.
- **The budget prices an owned copy** that committed decks already claim as a buy, the same rule the
  Shopping list uses. A card never stocked has no price and is left out of a budgeted fill. That rule is
  for the cards the fill chooses. A build-around card is placed anyway, because the player asked for it.
  When it has never been stocked the budget cannot count it, so the fill caps the rest as usual and the
  row says the build-around card's price is unknown, never $0. The row's "about $X to buy" then says
  it leaves that card out. Design draws that state.
- **After a model read**, words it could not map stay visible as "not understood". Editing any chip
  afterwards is free.

### 3.1 The intake

The five inputs, all optional, with the line that more detail helps:
- colors, using the existing control;
- theme: a picker over EDHREC's theme tags, which can hold more than one;
- budget: a dollar cap on what the player would buy to finish the deck;
- bracket: 1 to 5, or no preference;
- free text: a box with an example sentence.

### 3.2 The read-back

What the free text became, shown as chips the player can remove or edit before any results appear.
States:
- everything matched, so no credit was involved;
- words left over, with the "Read it properly" offer, which names the missed words and says it costs one
  credit;
- a model read in progress, then done, with its chips marked as read and anything not understood shown;
- the model read failed and the credit was refunded, or it returned no chips;
- no credits left: the allowance is a rolling 24 hours (`src/lib/model/allowance-rule.ts`), so the
  offer is replaced by the time the next credit arrives, never by "today" or a midnight reset, and the
  matched chips still work;
- the app-wide spend cap reached, which is a different message from the player's own allowance.

A card chip, owned or not, opens the card.

### 3.3 The results

A list of single commanders. Each row shows:
- the commander (its name opens the card), with identity pips;
- the fit figure or figures (ruling 5);
- ownership: "you own 41 of its 99 · about $120 to buy", with the commander marked free, held or priced
  (the usual marks).

States:
- ordered by a theme, by several themes, by a card, and by a theme plus a card;
- ordered by ownership because no theme or card was given, with the suggestion to add one;
- too narrow (ruling 8): few results or none, with the answer that removes the most named;
- a build-around card that has never been stocked (§3.0): its price reads unknown, never $0, and the
  row's "about $X to buy" says it leaves that card out;
- the list loading, and a row whose ownership figures are still loading or failed while the others show
  (each row runs a trial fill, §6);
- the whole list failing.

### 3.4 Picking one

A pick leads into the existing creation flow (the pre-filled door, `CreatePreFilled`) with the answers
carried along, and the deck is created and filled under them. Draw the hand-off: what the player sees
between pressing a result and landing on the new deck, and how the answers appear on the way. Also draw
creation landing on an empty deck, which is today's fallback when the fill fails (`actions.ts:432`).

### 3.5 The Discover link

The way into the intake from Discover's filters, at both widths.

## §4 Open for Design to call

1. **One page or steps:** the five inputs on one screen, or a short sequence. Every input stays optional
   either way.
2. **How the credit reads** before and after "Read it properly" (ruling 4). Hugh expects this to need
   creative UI. The offer must name its cost before the player spends.
3. **The chips:** how a matched chip, a model-read chip, a card chip and a "not understood" word differ.
4. **How several fit figures read** on one row, and which one is marked as the one ordering it.
5. **The too-narrow state:** how the most-removing answer is named, and whether loosening it is one
   press.
6. **The hand-off into creation** (3.4), and whether the answers stay visible on the new deck.
7. **How many results show,** and whether more can load.

## §5 Locked, and not open

- **The model never picks.** It turns words into chips from the real vocabulary: theme tags, catalog
  cards, a budget and a bracket. A chip that names nothing real is dropped. Every commander comes from a
  query, and every card comes from the catalog.
- **No score.** A row is ordered by one named figure, or by the weakest of several figures of the same
  unit, "% of its decks" (ruling 5). Colors and bracket are pass/fail, and the budget is a cap.
  Ownership is shown and never weighed against fit. It orders the list only when no theme or card was
  given, because Hugh ruled that case (ruling 5).
- **Never loosen an answer silently.**
- **No credit is spent without the player choosing it,** and the cost is named first.
- **Universal staples are ordinary cards here.** The fill places them like any other card: counted as
  owned when the player owns them, priced when not. They play no part in fit, which reads theme tags and
  one named card.
- **Not in this feature:**
  - partner pairs (ruling 10);
  - a deck built without picking a commander;
  - steering the fill for a commander the player already chose on `/decks/new`.

## §6 What engineering owns (not for Design)

- **Theme fit** is `count / deck_count` on `commander_support.tags` (`src/db/schema.ts:901`, `:906`;
  `EdhrecTag` at `src/lib/edhrec/parse.ts:1`).
  - The tag list is uncapped, and `deck_count` can be null.
  - When a theme is given, a commander with no tag, a null `deck_count`, or fewer decks than a sample
    floor is not a result. That includes commanders outside the index.
  - The plan measures the floor on staging, with `THEME_FLOOR_RATIO` (`src/lib/edhrec/gap-slot.ts:37`)
    as precedent for the long tail of accidental tags.
  - The theme picker offers tags that clear a vocabulary floor across commanders, deduplicated by slug.
- **Card fit** is the card's `inclusion` in `commander_support_cards`, found through the card-first
  index that the stand-ins and change-commander briefs also need.
- **The no-theme order** is the count of a commander's support cards the player owns. This is the
  `overlapOwned` the /commanders scorer already computes (`src/lib/recs/score.ts`), so it needs no fill.
- **The fill gains two constraints:**
  - **Budget** is a running cap: unowned cards are taken in the fill's own order while their price, the
    cheapest printing stocked now, fits in what remains. Basics finish the body.
  - **Bracket** applies the stated limits in `src/lib/bracket/rules.ts`: `GAME_CHANGER_LIMIT` (`:14`),
    `MASS_LAND_DENIAL_LIMIT` (`:24`), `EXTRA_TURN_LIMIT_BRACKET_1` (`:34`) and `COMBO_POLICY` (`:48`).
    - The commander counts against them, and so does a build-around card, which is always placed.
    - **This is also what "outside the bracket" means in ruling 6.** The fill keeps every card it
      chooses inside the limits, and it can always finish with basics, so only the commander or the
      build-around card can put a deck outside a bracket. For example, a Game Changer commander is
      outside brackets 1 and 2. The filter tests those one or two cards against the limits alone, so it
      needs no fill, and the too-narrow count uses the same test.
    - At brackets 1 and 2, the fill never places a card that completes a two-card infinite combo with a
      card already placed. That makes it a pairwise check during the fill, not a per-card filter.
    - At bracket 3 the fill may place combos, since lateness is not computable (`:36-46`). It must
      never produce a deck that `permitsFor` (`:91`) moves above 3, though. That happens when
      `comboLandsEarly` (`:120`) holds: tutors that reach both pieces, or reach one piece with the
      other as commander. A tutor that would complete that reach is skipped.
  - `PlanFillArgs` (`src/lib/decks/fill.ts:73`) and `buildFillPlan` (`actions.ts:81`) take both, and
    `createDeck` (`:253`) passes them, along with the build-around card in `selectedOracleIds`.
- **The trial fill per row** produces only that row's ownership figures, and it runs for rows on screen.
  Nothing filters on it, so no commander is ever dropped by a fill the player never saw.
- **The too-narrow count** re-runs the pass/fail filters (colors, bracket, the commander's own price, plus
  an unowned build-around card's, against the budget, theme and card presence) with each answer removed in turn. It runs no fills.
- **The model read** is a new `ModelFeature` beside `"tuning"` and `"synopsis"`. That touches:
  - the union (`src/lib/model/allowance-rule.ts:52`);
  - `FEATURE_CALLS` (`src/lib/model/prices.ts:74`);
  - a migration for the `model_calls_feature_check` constraint (`schema.ts:1600`).

  It draws on the same rolling 24-hour allowance (`allowance-rule.ts:24-25`) and the app-wide spend cap
  (`src/lib/model/spend-rule.ts`). Its output is validated against the tag vocabulary and the catalog
  before it becomes a chip, and a failed read is refunded.

## §7 Sequence

This brief waits for Hugh's approval before it goes to Design. The Tier A work can build before the
handoff:
- the fill's budget and bracket constraints;
- the theme-fit, card-fit and no-theme reads;
- the free matcher;
- the model read and its allowance feature.

The surfaces wait for READINESS. The About entry is batched with the rest of the analysis line's entries
at launch.
