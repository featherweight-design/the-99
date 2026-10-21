# Brief: When the collection can't reach the bracket asked for (Help me choose)

**For:** Claude Design. **Prompt:** 9 in `boards/design-prompts-2026-10-18.md`.
**Plan:** `docs/superpowers/plans/2026-10-21-bracket-reach.md` (PR 1 is the backend, PR 3 is this screen).
**Existing handoff to extend:** `design/design_handoff_the99_help_me_choose/` (the intake form, the result rows,
`Hand-off.dc.html`). Where a shipped component and that handoff disagree, the component wins.

## The problem

Hugh used Help me choose to build "HD - Horrors Test" (Captain N'ghathrod, UB) for **bracket 3**. The deck page's analysis
reads it as **1-2**. The builder used the bracket answer only as a ceiling: it kept every card inside bracket 3's limits but
never placed the one thing a bracket-3 deck needs, so the deck it built is a bracket-2 deck. The collection could have
reached 3 (a free Opposition Agent was in it). Some collections can't.

## Hugh's ruling (2026-10-20), which binds every screen here

1. Tell the player **before the build and before a credit is spent**. The check costs no model call.
2. If the collection can't reach the target, say so and **let them choose**:
   - **build from my collection**, landing in the lower bracket it can reach, or
   - **hit the target**, adding cards they don't own (to buy).
3. **Never pick for them.** Neither option is pre-selected, and the app never quietly buys toward a bracket.

When the collection CAN reach the target, there is no question to ask: PR 1 (behind a new `BRACKET_REACH_ENABLED` switch)
places the owned card that gets there (PR 1 is in review alongside this brief). That case may want a quiet "why this card is here" mark (open question 4) but no choice.

## What a bracket needs (so the copy can be specific)

The analysis's own rules. Help me choose uses the same ones.

| Target | The collection reaches it when it holds, free (not every copy in a committed deck) |
|---|---|
| 1, 2 | nothing: a deck with no Game Changer, combo, mass land denial or extra-turn card is a 1-2; one extra-turn card makes it a 2 |
| 3 | one Game Changer, or both halves of a two-card combo (not a turn loop) |
| 4 | four Game Changers, or a two-card combo plus searchers that find both halves |
| 5 | four Game Changers |

The app never adds mass land denial or an extra-turn loop to reach a bracket, even though either would count.

## Where it has to be said, and what the server can tell each screen

| # | Screen | When | What the server knows (no model call) |
|---|---|---|---|
| A | **The intake form**, under the Bracket field (`intake-form.tsx`, `BracketRadios`) | A bracket of 3 or more is picked. This is the only screen before the credit: pressing Find with "Anything else?" filled spends one. | Across the colors picked (or all five): `reaches` or `short`. If short: what a collection-only deck lands in (`1-2`, `2`, `3` or `4`: an extra-turn card alone reads 2, and a combo with tutors that find both halves reads 4), and the cheapest set to buy (card names, the dollar total, whether it is over the budget). No commander yet. |
| B | **A result row** (`choose-row.tsx`, the trial figures beside "you own 41 of its 99") | Every row, when a bracket of 3+ was asked. | Per commander, the same answer, and the deck it would build: `reaches` / `short, lands 1-2` / `short, can hit 3 for $X (cards)`. |
| C | **The hand-off** (`create-pre-filled.tsx` → `hand-off-answers.tsx`, the Bracket row: "The fill keeps every card it chooses inside bracket 3's limits.") | The commander is picked and **Create deck →** is next. | The same as B for the chosen commander. **This is where the choice is made**, as the last answer before Create deck. |

A is a heads-up (the commander may change everything); C is the decision. Design may decide B carries only a mark.

## Every state to draw

At **C** (the choice), at 390 and desktop:
1. **Reaches.** No choice. The Bracket row's line changes from the ceiling sentence to one that says the deck is built to land in bracket N (and, if Design wants it, names the card that gets it there).
2. **Short, buying reaches it, within budget.** Two options, neither selected, **Create deck →** disabled until one is picked:
   - *From my collection*: "lands in bracket 1-2".
   - *Hit bracket 3*: names the card(s) to buy and the cost (e.g. "adds Rhystic Study, about $32").
3. **Short, buying reaches it but over the budget.** The buy option is shown as over budget (with what it costs against the budget) and cannot be picked as-is. Design decides whether the row offers raising the budget.
4. **Short, own-only answer** ("Only cards I own"). Picking "hit the target" means relaxing own-only for those cards. Draw it, or rule that only the collection option shows plus a line saying why.
5. **Short, nothing reaches it at all** (nothing stocked, or the commander and its colors can't). A statement only: the deck lands in bracket N, here's why.
6. **The fixed cards are already above the target** (a build-around Game Changer with a bracket-2 answer). Today's rank screen filters these out; draw only if Design wants a guard line.

At **A** and **B**: the short and reaches lines for 2, 3 and 5, in a row's own figure style.

## What "from my collection" does

The answer becomes the bracket the collection reaches (the deck is then honestly a 1-2, and its analysis agrees). The
Bracket row on the deck's own page reads whatever was submitted. No new storage.

## What "hit the target" does

The build places the named cards; they arrive on the deck's Shopping list like any card to buy, priced as shown. The yes is
stored with the deck so a retried build places the same cards.

## Open for Design to call

1. The form (A): the shortfall MUST be said here when the read would spend a credit (the read starts on submit, before results; `submitChoose`), so A is required, not optional. Open is only its form: a line under the radios, a caption change, or a note beside Find.
2. The choice (C): two radio rows inside the Bracket row, a sheet, or an inline pair of buttons. **Create deck →** stays where it is.
3. The row (B): a third figure, a mark on the existing ownership figure, or nothing.
4. The reached case: should the placed card carry a mark on the deck page ("placed to reach bracket 3"), or is the Bracket row enough?
5. Bracket names: say "bracket 3" or "Upgraded" (`BRACKET_NAMES` in `src/lib/copy/deck-analysis.ts`) or both, as the radios' caption does.

## Copy

Every string goes through `/copy-review` after the boards land; draw the words as placeholders and keep them short. The
locked vocabulary: "Game Changer", "combo", "bracket". No "upgrade your collection", no "unlock".

## About entries

1. **Help me choose's entry** may owe an edit for this behavior (the answer is now a target, and the choice exists). Hugh
   decides whether it is a feature (a new line in the entry) or not; draw the edit so he can decide on a drawing.
2. **How credits work** (`credits`, Hugh approved 2026-10-21) is redrawn for buying credits. Facts, from
   `src/lib/copy/legal/terms.ts` and `docs/agents/payments.md`:
   - **What a credit is:** one run of a smart tool: Analysis, the Overview, Suggested changes, Help me choose's Look deeper
     ("Anything else?"), Which deck needs it most?, Proposed cuts' Look deeper. Every card, deck and collection view, and
     reading a deck's bracket, stays free.
   - **Where credits come from:** the free allowance (each one comes back 24 hours after use); 15 welcome credits for a new
     account; a monthly plan (60 a month); a pack (40 credits for $5); a gift from the app's admin.
   - **Spend order:** free allowance, then welcome, then plan, then gift, then pack.
   - **Expiry:** welcome credits expire 30 days after the account is made; plan credits roll over while subscribed and
     expire at the period end after a cancel; gift and pack credits never expire.
   - **Refunds:** a run that fails gives its credit back on its own. A refunded payment takes back the unspent credits it
     bought; a dispute holds them until it's decided.
   - Welcome, plan, gift and pack credits share one daily limit on how many can be spent (the free allowance has its own).
   The entry's screen and halo are Design's call (likely `/credits`'s balance row).

## Not in this brief

The backend (PR 1, in review alongside this brief). The bracket analysis itself. Any change to the bracket rules or the ceiling.
