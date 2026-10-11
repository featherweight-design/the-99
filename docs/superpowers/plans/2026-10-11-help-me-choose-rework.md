# Help me choose rework: the read — build plan

2026-10-11. Builds `docs/superpowers/design-briefs/2026-10-11-help-me-choose-rework.md` against
Design's R1 (`design/design_handoff_the99_help_me_choose/addendum-the-read/`), with the GREEN audit's
rulings and errata (`READINESS-audit.md`) taking precedence over Design's files wherever they disagree.
Everything ships behind `HELP_ME_CHOOSE_ENABLED`, which stays off in production. Approved by the
orchestrator as Hugh's proxy on 2026-10-11, all seven decisions included.

## What changes, in one paragraph

The "Anything else?" box stops being matched to chips. Submitting the form with text in it reserves one
credit and starts a two-step read at submit (F8). Step 1 reads a cached compact list of every commander
inside the set filters and shortlists 30 to 40 by pool id. Step 2 judges that shortlist in full and
writes one line for each of the top ten. The results are the same free list, re-ordered, with the read's
picks first. No *Look deeper* step, no *Read it* button on results (F10), no card picker (F1): a card
named in the box is a build-around ask to the read.

## Decisions taken here (each the one defensible reading; flag any you overrule)

1. **The `a` (card) param is parsed and ignored**, like `n` and `d` (F9h). Since the box no longer
   becomes chips, no path sets it; old links keep loading. The free search takes no card (F1).
2. **The submit is a Server Action** (a form POST, replacing the GET to `v=submit`). It re-checks the
   switch, the 800-character cap (refusing, never trimming), budget and bracket. It then reserves and
   inserts the run, schedules the two calls with `after()` and redirects to results with `r=<run id>`.
   An empty box, or no credit standing, makes no reservation and redirects to the free results.
   A credit that ran out between the form render and the press lands on 7l, never a charge (F7).
3. **The phase is a column** (`intake_reads.phase`: `shortlist | judge`, null when settled). The
   results panel polls the existing `lookStatus`, and the dot moves when step 2 begins (F2).
4. **Both steps run inside the action's 120s `maxDuration`** with split deadlines: step 1 gets 35s,
   step 2 gets what remains, and the retry floor stays at 40s. The eval measures both steps' latency
   and sets the final split.
5. **Model: `claude-sonnet-5-5` at medium for both steps**, streamed, unless the eval shows step 1
   reaches the same shortlist on `claude-haiku-5-5`. The eval runs that arm too. Ceilings are set from
   measured output plus headroom, not guessed.
6. **A repeated "nothing fits" is the 7j line again**, still `No credit used`. Nothing fits is refunded,
   so there is no charged result to repeat. 7m's repeat line is only for a useful read.
7. **`ABOUT_VERSION` moves to the next free number at merge** (15 unless Deck stats or the cart lane
   bumps first; coordinate with both). The rewritten entry keeps
   `switch: 'HELP_ME_CHOOSE_ENABLED'`, and `unseenEntries` already hides a switched entry while its
   switch is off. Tests pin both sides: a reader at the previous version sees no sheet while the switch is off, and
   exactly the new entries (never an empty sheet) once it is on. The credits
   bullet about the read gets a `captionLineSwitches` entry for the same switch. All four rewritten
   keys go through `/prose-pass`; "You get five" stays out of scope (audit :129-134).

## PR boundaries (each under ~20 files / ~800 lines; no stacking, each merges before the next opens)

**PR 1: the engine, no UI.** `src/lib/intake/`, `src/lib/model/`, a migration.
- The compact commander list (name, colors, creature types, top themes; F1 adds what a card build-around
  needs, e.g. keywords and oracle snippets the eval shows step 1 uses). It is built once per catalog
  generation and memoized like `loadIntakeCatalog`, with its token count measured.
- `cache_control` on the system prefix in `client.ts` (F9b). The list goes in the cached prefix; the
  player's words and filters go after it.
- `FEATURE_CALLS.intake` repriced for two calls plus a cold cache write. `worstCaseMicroUsd` learns the
  1.25 write multiplier (F9c). The 6,000-token ceiling is re-measured.
- Step 1 and step 2 prompts and schemas: picks by pool id only, ids outside the filtered pool dropped,
  names never trusted. Words go through `playerText`. Decks reach the model as commander names plus
  leading themes only, deck mentions as an oracle-id placeholder kept only for the player's own deck
  commanders (F5). No `label_*` is sent (F6).
- Validation: a reason over 140 characters, or holding a digit, `%`, a fit word or a rank, is refused
  (F3). Its pick falls back to its free position and the next valid one moves up; with no valid pick
  left the result is 7j, refunded (F4).
- A widened fingerprint replacing `wordsHash`: every filter, the index generation, the support counts,
  the deck commanders and themes, and the prompt version (F9d). Plus the stored result shape (picks with
  reasons, F9e), the `repeat` flag (F9f) and the `phase` column (F2). Credit rules carried over.
- Tests per module, mutation-checked.

**PR 2: the eval** (`scripts/eval/intake-read.mts`, results under `docs/superpowers/eval/`), cap $5.
- Fixtures (brief :237-249), on staging account `user_3GkZrrTwOJBdqUpq6GambP0BC8w`, read-only:
  - Hugh's two asks: *"a horrors deck that's scary and a little nasty"* (Ask A) and *"a Landfall deck
    unlike other decks I own"* (Ask B);
  - Ask A with Black only;
  - Landfall inside colorless (must be nothing fits);
  - an account with no decks;
  - a card named in the box (the build-around errata).
- Assertions: Ask A names no deck; Ask B names only Omnath or Teval, by commander; Black only yields
  no non-black pick; colorless Landfall yields nothing fits; every pick is in the filtered pool; no
  reason has a digit or `%` or runs over 140 characters.
- Measures: the list's token count, cache read and write tokens per press, cost per press (cold and
  warm), each step's latency, and the step-1 arm on Haiku 5.5. It reports against Hugh's $0.05 to
  $0.08 estimate. Cost per press, cold and warm, goes in PR 2's body for Hugh.
- Runs through the shared ledger with a worst-case reservation before each call. The model and ceiling
  choices in PR 1's constants are updated from these figures (a one-line follow-up in PR 3 if PR 1 has
  merged).

**PR 3: the submit and the form.** The route plus `intake-form.tsx`.
- The submit Server Action (decision 2) and the `after()` runner.
- The form page reads the allowance (F7), falling back to the plain button if that read fails.
  It draws 7a / 7b / 7c and 7n.
- The box never yields a chip. An empty box charges nothing and draws no pill.
- The old GET `v=submit` path redirects to the new flow, so bookmarked links survive.

**PR 4: the results.** `deeper-look.tsx` (or its replacement), `choose-results.tsx`, `choose-row.tsx`.
- The panel states 7d–7m: reading with the step dot, stopped, failed, Ask A and Ask B results, Black,
  nothing fits, no decks, unread without *Read it* or the `0 left` pill (F10), repeat.
- The reason line under each top-ten row, and the "rest" divider.
- `read.readIt` and `read.costSpent` are retired.
- Design's best-fit art change (`aspect-ratio: 626/457`) and the phone rank moving off the art are
  listed in the PR body as a separate change (F11).

**PR 5: About and credits.**
- The rewritten entry, its four keys and the credits bullet, through `/prose-pass`.
- `ABOUT_VERSION` → the next free number at merge, with both switch tests (decision 7).

## Surfaces and acceptance (feature-acceptance inventory, both widths)

| route | state | 900 | 390 | PR |
|---|---|---|---|---|
| `/decks/new/choose` | 7a empty, 7b filled, 7c spent, 7n paused | ✓ | ✓ | 3 |
| `…?v=results` | 7d reading (step 1 → 2), 7e stopped, 7f failed | ✓ | ✓ | 4 |
| `…?v=results` | 7g Ask A, 7h Ask B, 7i Black, 7j nothing, 7k no decks | ✓ | ✓ | 4 |
| `…?v=results` | 7l unread (no *Read it*), 7m repeat | ✓ | ✓ | 4 |
| Read as bar | revised (§B1) | ✓ | ✓ | 4 |
| `/about` | Help me choose entry, credits bullet | 760 | ✓ | 5 |

- **Every PR:** a contact sheet from `docs/superpowers/inventories/help-me-choose-read.json`.
- **PRs 3 and 4:** a browser probe that presses submit and watches the step dot move, against a stubbed
  model. The live model runs only in the eval.
- **Close-out:** a walk on staging with the switch on there, then the READINESS test list
  (`READINESS.md:15-23` plus the errata) checked line by line.

## Spend

- The eval is capped at $5, ledgered.
- No production spend: the switch stays off there.
- The staging walk at close-out costs one credit per press, about $0.10 by the brief's estimate.
