# Deck description, and tailored Suggested changes

Design brief, 2026-10-03. A rework of an existing field (deck intent) plus new controls on an
existing panel (Suggested changes). No new surface; the Analysis tab and Suggested changes both
already ship.

## The finding

From Hugh's intake notes, item H35, in his words. (His intake notes are kept outside the repo
and are quoted in full below.)

> "Describe your deck in 1-2 sentences" replaces "What is this deck for?". Asked in the Analysis
> flow, it informs the overview and Suggested changes, one per deck, and is shown as the tagline.
>
> Tagline: remove the "i" icon and the "From the build" tag. The deck-name pencil edits the name
> and the tagline together, and the separate "edit" button goes.
>
> Suggested changes gets a free-form request box ("swap out X", "more removal", "replace cards
> over $X", "at least N"), a per-card price cap (Suggested changes' own, not Shopping's), a set
> filter, and "Only from my collection".

Hugh ruled seven points the same day (quoted in full under "The rulings," below).

## What ships today (the record)

1. **The field is "What is this deck for?"** — `deckTuningCopy.intent.askLabel`
   (`src/lib/copy/deck-tuning.ts`). It is stored per deck as `decks.intent` (text, max 120
   characters, enforced by a check constraint) and `decks.intent_seeded` (boolean, default false)
   (`src/db/schema.ts`).
2. **The ask lives inside Suggested changes, not the Analysis tab's empty state.**
   `DeckIntentAsk` (`src/components/decks/deck-intent.tsx`) renders above the panel's action row,
   shown only while the deck has no line, and only when the panel itself is visible — which means
   only after a first Analyze. The existing handoff is explicit about this placement and about
   what it rejected:

   > "Intent prints under the deck name, on every tab, once it exists. The ask for it lives inside
   > the tuning panel, next to the payoff. There is no empty state in the header."
   > — `design/design_handoff_the99_deck_tuning/INTENT-where-it-lives.md`

   That file also rejects "an editable line in the header at all times" on the grounds that every
   deck would pay for one panel's benefit. **Ruling 1 reverses the placement** (the ask moves to
   the Analysis tab's empty state, before any Analyze press); this round owes that file's rationale
   a replacement, not a silent override.
3. **The tagline is drawn by `DeckIntentLine`** (`src/components/decks/deck-intent-line.tsx`),
   second in the deck header, under the deck name and above the commander line. Three pieces ship
   today that Hugh's ruling removes:
   - An 18px `ProvenanceDisc` (the "i" icon) shown only when `intent_seeded` is true.
   - A brass `from the build` chip (`copy.seeded`), same condition.
   - A separate `edit` button (`copy.edit` / `copy.editAria`) that opens the line's own inline
     editor, independent of the deck-name's own rename control.
   A deck with no line draws no row at all (`if (line === null && !editing) return status`).
4. **The seeded line is auto-written, not typed**, when The 99 built the deck from a brief:
   `deckTuningCopy.intent.seededBrief` reads *"Built around {commanders}, from the cards you
   own."* (PLACEHOLDER copy, owed to `/copy-review`). Saving over a seeded line clears
   `intent_seeded` permanently (`DeckIntentLine`'s `submit`); there is no second chip for "edited."
5. **The field is read only by Suggested changes' prompt**, never by the overview. Suggested
   changes' prompt-builder quotes it verbatim: *"What the deck is for, in the player's words,
   verbatim after the colon: {text}"*, or *"What the deck is for: no stated intent."* when null
   (`src/lib/tuning/prompt.ts`). A repository-wide search of `src/lib/synopsis/*` (the overview's
   whole module) finds no reference to intent anywhere — the overview does not read it today.
   **Ruling text says it should inform both**, which is new wiring, not a rename.
6. **Suggested changes takes no request text, no price cap of its own, no set filter, and no
   "Only from my collection" today.** Its inputs are the stored deck list, the stored games, what
   the reader owns, the commander's recommended mix, the stored overview, the deck's key cards and
   universal staples, and any locked cards (`buildEvidencePack`, called from
   `src/app/decks/tuning-actions.ts:129-138`); the only per-deck memory is the intent line itself.
   (`TuningPanel`, `src/components/decks/tuning-panel.tsx`; the state machine is
   `src/lib/tuning/state.ts` and `src/lib/tuning/prompt.ts`.) The prior art is Help me choose,
   not Shopping: Help me choose already asks for a budget, sets (Printed in) and "Only cards I
   own" (`src/lib/copy/help-me-choose.ts`). Decks already store some of those answers per deck —
   `decks.answer_budget_cents` and `decks.answer_owned_only` (`src/db/schema.ts`, the block
   commented "What the player asked for in Help me choose") — but only for decks started from
   Help me choose, and only for the fill to read; `src/lib/copy/deck-tuning.ts` already renders
   them into the seeded line (`answerBudget`, `answerSets`, `answerOwn`). It is open for Design
   whether Suggested changes' per-deck cap, set filter and collection-only toggle reuse Help me
   choose's controls, and for engineering whether they seed from or share these columns. Hugh's
   ruling stands either way: this cap is Suggested changes' own and persists per deck.
7. **The Analysis tab's empty state** (`AnalysisEmpty`, `src/components/decks/analysis-empty.tsx`)
   draws the 150px bracket-mark ring, a heading, Analyze, and a credit note beside it on desktop
   (under it at 390) — and nothing else. There is no field here today. This is where ruling 1 asks
   the new description box to sit.
8. **About.** `ABOUT_VERSION` is 9 today (`src/lib/copy/about.ts`). The per-entry artboard pattern
   is `design/design_handoff_the99_analysis_tab/ABOUT-entry.md` — the template this round's new
   entry should follow.

## The rulings (Hugh, 2026-10-03, verbatim)

1. The description is asked BEFORE the first Analyze: optional, beside Analyze in the empty state.
   After that it's edited via the deck-name pencil.
2. Editing the description changes nothing already written. No banner and no model call; future
   overviews and Suggested changes read it.
3. Typed "What is this deck for?" answers carry over as the description. Auto-seeded lines
   ("Built around X, from the cards you own") are cleared.
4. The request box is in the moment: one Suggest press, never saved. Standing context belongs in
   the description.
5. The price cap, set filter and "Only from my collection" are remembered per deck.
6. A request that breaks a rule (commander, locked cards, the ceiling): the rules win, and the
   reply says in one line what it couldn't do.
7. About: a NEW entry plus an ABOUT_VERSION bump, drawn by Design in this round.

## What this brief asks Design to draw

### 1. The description field — new placement, new copy, new reach

- **Where it's asked.** The empty state (`AnalysisEmpty`), beside Analyze, optional. Draw the
  field's size, position relative to Analyze and the credit note, and its state at both the idle
  and loading phases (does the field remain editable while an Analyze press is in flight? Ruling 1
  doesn't say).
- **Where it's edited once saved.** "Via the deck-name pencil" (ruling 1) — the existing rename
  control that already sits on the deck name. The field is optional, so a player can press Analyze
  with no description ever typed; the boundary is keyed to a description having been SAVED, not to
  the first Analyze press, or a deck analyzed with no description would have nowhere for the
  original empty-state ask to go. Draw what that control looks like once it edits two fields (name
  and description) rather than one, and the inline editing surface for both.
- **Label and placeholder.** Hugh's own wording is "Describe your deck in 1-2 sentences" — decide
  whether that is the field's label, its placeholder, or both, and whether "What is this deck
  for?" survives anywhere.
- **The carry-over (ruling 3).** A deck that already has a typed line keeps it, relabeled. A deck
  whose line is still the auto-seeded sentence loses it — draw what that deck's empty state (or
  tagline, if the Analyze gate has already passed) shows: blank, or an invitation to fill it in.
- **The tagline, stripped (Hugh's ask).** No `ProvenanceDisc`, no `from the build` chip, no
  separate `edit` button. Draw the row with just the sentence and the shared rename affordance.
  Since the auto-seeded line and its chip are both gone, decide whether `intent_seeded` still
  means anything visually, or retires from the UI entirely (the column itself is an engineering
  question, not drawn here).
- **The two readers (ruling 2).** No banner, no model call on edit — draw nothing new for this;
  it is a statement about when the next Analyze/Suggest reads the new text, not a UI state.

### 2. Suggested changes — four new controls

- **The free-form request box.** One box, one Suggest press, never saved (ruling 4). Draw its
  placement relative to the existing action row, its placeholder (Hugh's examples: "swap out X,"
  "more removal," "replace cards over $X," "at least N"), and its state across a run (cleared on
  press? kept to re-edit?).
- **The per-card price cap.** Suggested changes' own — not Shopping's. Remembered per deck
  (ruling 5). Draw the control (a number field? a stepped set of amounts?) and where it sits
  relative to the request box and the action row.
- **The set filter.** Remembered per deck (ruling 5). Draw the control: likely a chip/picker
  matching the set-filter pattern already shipped on `/collection`'s Sets surface and the
  commander lanes' "Printed in" filter, for visual consistency — Design's call whether to reuse
  that pattern or something panel-scoped.
- **"Only from my collection."** A toggle, remembered per deck (ruling 5). Draw its on/off states
  and label.
- **The refusal line (ruling 6).** A request that collides with a hard rule (the commander,
  locked cards, the price ceiling) is refused in favor of the rule, with one line saying what
  could not be honored. Draw where that line appears (inline under the request box? as part of
  the result set's own failure copy, which already has five failure states, 6a-6e, per
  `tuning-panel.tsx`'s own documentation) and its tone.
- **Persistence surfacing.** Since the cap, set filter and collection-only toggle persist per
  deck (ruling 5) while the request box does not, the panel needs to read as two different kinds
  of control at a glance — draw what distinguishes "this sticks" from "this is for right now."

### 3. About entry (ruling 7)

- One new entry, drawn on the per-entry artboard
  (`design/design_handoff_the99_analysis_tab/ABOUT-entry.md` is the template to follow), plus the
  `ABOUT_VERSION` bump (today 9) that ships beside it per the standing About rule in `AGENTS.md`.
- Title, route, `opens`, caption, specimen component and fixture props, up to four key lines, and
  the phone reduction — same contract as every other entry.
- This is a genuine new capability (a description that now feeds two model calls, plus four new
  controls on an existing panel), not a cosmetic change, so it owes the entry outright — no
  judgment call needed here the way a restyle would need one.

## Deliverables

- 390 and 1300 frames for every state: the empty-state description field (idle, with text, over a
  running Analyze if that's reachable), the tagline (set, empty, mid-edit via the shared pencil),
  and Suggested changes with all four new controls (idle, populated, the refusal line, a run in
  progress if the controls remain visible then).
- A states table (`STATES-*.md`, matching `design_handoff_the99_deck_tuning/STATES-tuning-panel.md`
  and `design_handoff_the99_analysis_tab/STATES-analysis-tab.md`'s format).
- A copy strings file. Every new string is a PLACEHOLDER, owed to `/copy-review`, same convention
  as the existing `deck-tuning · copy strings.ts`.
- The About entry's artboard frame and its copy strings, same file or a sibling — Design's call.

## Out of scope

- **H35-E, the three engineering fixes** (no Design round; ship directly): the phone's Suggested
  changes reasoning truncated to one line while desktop shows the full text; "none logged" under
  Your games needing right padding while Suggested changes is running; Suggested changes giving at
  least 5 suggestions rather than up to 5.
- **Mix-and-match swaps** (parked, unranked): keeping a suggested add but pairing it with a
  different cut.
- **Suggestion history** (parked, unranked): reconsidering past suggestions or avoiding repeats.

## Copy rules

US English. No em dashes (the 2026-09-13 sweep's rule 4 applies here). Every new string in this
round's deliverable is a PLACEHOLDER; `/copy-review` resolves wording, not this brief or its
handoff.

## Where it lives

- `src/lib/copy/deck-tuning.ts`: `deckTuningCopy.intent` (the field's copy, to be renamed/replaced)
  and `deckTuningCopy.panel` (Suggested changes' existing copy).
- `src/db/schema.ts`: `decks.intent`, `decks.intent_seeded` (lines ~322, ~328, ~381).
- `src/components/decks/deck-intent-line.tsx`: the tagline (`DeckIntentLine`), the piece being
  stripped down.
- `src/components/decks/deck-intent.tsx`: `DeckIntentAsk`, the ask being relocated out of the
  panel.
- `src/components/decks/analysis-panel.tsx`, `src/components/decks/analysis-empty.tsx`: the
  Analysis tab body and its empty state, where the ask moves to.
- `src/components/decks/tuning-panel.tsx`: Suggested changes, where the four new controls land.
- `src/lib/tuning/prompt.ts`: reads the intent/description field today; gains the new controls'
  inputs.
- `src/lib/synopsis/`: the overview; currently reads no intent field at all, and will need to per
  the ruling text ("it informs the overview and Suggested changes").
- `src/lib/copy/about.ts`: `ABOUT_VERSION` (currently 9).
- Handoffs: `design/design_handoff_the99_deck_tuning/` (the ask's current placement rationale, in
  `INTENT-where-it-lives.md`, reversed by ruling 1) and
  `design/design_handoff_the99_analysis_tab/` (the Analysis tab's empty state this ask moves
  into, and the About entry template, `ABOUT-entry.md`).
- Intake: H35.
