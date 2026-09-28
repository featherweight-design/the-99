# The 99 — Deck tuning suggestions, five surfaces (design handoff, R2)

## Addendum, 2026-09-23: where the panel lives now that the deck has an Analysis tab

Canvas: `The 99 - Deck Tuning · Placement Addendum.dc.html` (A at 1300 / 390, B the allowance,
C the Games line). Read against `design_handoff_the99_analysis_tab/HANDOFF.md` (PR #882). Only
placement moved. The panel, its states and its copy stand as approved, except where noted below.

**Decision: the Analysis tab.** One panel, full width at the foot of the tab, under the
recommended mix and its own rule, mounted with the grid once the deck has a reading. The Games tab
keeps one line pointing there. This supersedes the Games-tab placement in §2 below
("below the aggregate, above the history").

**Why.**
1. **Games no longer gate it, and the Games tab gates by construction.** With no games, Games
   draws its empty state *instead of* the panel body (`games-panel.tsx`, the §8.4 branch), so
   tuning would be unreachable exactly where it now runs. Games still enrich the evidence; the
   manifest shows the games row only when there are games, as it already does for intent.
2. **Three of its four reads are the list.** The list, the note's deck, the collection: the
   Analysis tab is where the list is read.
3. **One allowance, one tab.** The synopsis and tuning spend the same daily allowance; on one tab
   a player sees both its spenders and the one sentence that says it is used.
4. **Split rejected.** A panel in two tabs breaks the panel's own rule ("one box in one place and
   it never leaves") and leaves two copies of held suggestions to keep in step. The Games line is
   a pointer, not a second panel.

**How it relates to the verdict and findings.**
- **Order:** banner · Overview · bracket box · climb · findings · mix · **Suggested changes**. The
  reading is computed; the panel is a proposal, so it comes last and never sits in the grid.
- **The reasoning never cites the bracket; the consequence does** (superseded in r3). The model's
  rationale names no bracket, finding or rung, and coming down a bracket is the climb's sheet (3b).
  A swap that would move the deck's bracket carries one app-computed line with the shipped
  `BracketChip` (r3, E1).
- **Suggestions are deterministic filters, never promises.** The validator's rules stand and now
  also drop any rationale that claims a bracket or result. Flagged for `/copy-review`, not changed
  here: *propose three swaps* (Ready) and *Three swaps, all aimed…* (Results) state a count the
  validator can undercut (gap 3); *up to three* is the honest form.
- **An applied swap is an edit.** It sets the deck's changes flag (ruling 5, `READINESS-r1-audit`)
  and the tab's one banner offers Re-analyze. The panel never re-analyzes; Re-analyze never re-runs
  the panel.
- **Staleness stays in the banner.** A stale reading does not dim, tag or hide the panel.
- **Before a first reading** (2a–2c) the tab is one empty state and the panel is absent. Analyze
  is free, so asking for it first costs nothing.

**State 1 retires as a gate.** *Below threshold* no longer disables the primary. With fewer than
`PATTERN_MIN` games the panel opens at Ready and reads the list, the collection and any intent;
the Fix line and the games row are absent. The Ready pitch for that case is owed copy (no new
string written here).

**The allowance, used up (B).** One string, `allowanceCopy.exhausted(time)`, imported by both the
panel and the Overview:

> You have used today’s allowance for synopses and suggestions. It resets at {time}.

In the panel: the primary disables in its corner (as state 1 did), the mono note carries the line,
and the body keeps whatever it held. No tag, no `--danger`, no *Try again*. In the Overview: under
*View full synopsis →*, with the synopsis in its stale state. Never in the banner, and Analyze /
Re-analyze never disable for it: the bracket, findings, climb and lean are never limited. `{time}`
is set by sub-project 6.

**The Games line (C).** After `GameFindings`, before History, 44px:
*Suggested changes reads these games.* **It is on the Analysis tab →**, calling
`setView('analysis')` as the header chip does. Shown only with a reading and at least one game.
The note's held `readBack` clause can ship as *and read by Suggested changes*.

**Phone (390).** Same order, one column, the panel last; its approved phone frame unchanged.

**New copy, for `/copy-review`:** the allowance line, the Games line, the `readBack` clause. No em
dash in any of them.

### Addendum r2, after Hugh's feedback (2026-09-23)

Canvas: `The 99 - Deck Tuning · Placement Addendum v2.dc.html` (r1's file is kept as history).
Placement is unchanged. **These override the approved panel wherever they differ.**

| Area | Now |
|---|---|
| **Count** | A run asks for **five**. The validator can drop some, so fewer is valid and the lead says so (*Three swaps this time. Two more did not hold up to checking.*). Never padded. Copy says *up to five*, never a promised number. |
| **No games** | Runs on the list, the recommended mix, the collection and intent. Said in the lead, in a dashed *Your games · none logged* manifest row with *Log a game →* (the one row shown unread, and labelled so), and at the end of the results' read line. No `games` / `note` chips; a new `mix` chip cites the strip. |
| **Seeing the cards** | Both names and both thumbnails are card-open triggers (dotted `--accent` underline). Desktop hover: the shipped `HoverPreview` (the tab mounts a provider; finding 9 already owes one). Click / tap: shipped `CardModal` with the pair as its list, cut first, so Prev / Next steps out ↔ in; stacked with `backLabel` *Suggested changes*. Nothing else added to the modal. |
| **Availability on the add** | The app's own vocabulary: green dot owned; hollow diamond *1 in a draft*; solid *none free*; dashed dot + the shipped `buy` chip (warning-tinted plate, `buy` · dotted leader · price, as on the decklist) when unowned; on the phone the marks take their own row under the pair. Owned and unclaimed is the green dot **alone**: the free state is never named (`availability.test.ts`). The cut carries no mark. Replaces `×1 owned` / `not owned` and the price-only atom. |
| **Removed** | The consequence line (*stays 99 / 99 · …*), the applied stamp's verdict and shopping clause. The marks carry it. |
| **Reject** | Replaces *Not this one*; the collapsed row reads `rejected` + *Show it again*. |
| **Credits** | Beside *Suggest again*: *Replaces these suggestions and uses a credit. You have {n} of {total} left today.* Beside a first *Suggest changes*: *Uses a credit. You have {n} of {total} left today.* Used up: *You have used all {total} of today’s credits. Synopses and suggestions share them; more at {time}.* (replaces r1's allowance line, same two surfaces). Total 5 is a fixture until sub-project 6 sets it. |
| **Every one answered** | The cards collapse to applied / rejected rows in their slots; lead *All five answered: 3 applied, 2 rejected. Suggest again for a new set, read from the deck as it is now.* Part-answered keeps open cards in place, footer counts them. |
| **Tie** | **To the version, not to Analyze.** Analyze is free; a run costs a credit, so it stays its own press. A commit retires the set: the panel returns to never-run with *Your last suggestions were for version 3. Committing version 4 cleared them…*. In a draft, a swap an edit broke (cut gone, or add already in) becomes a `no longer applies` row, checked deterministically; the rest stand. |
| **Loading** | The manifest ticks as before, and the body gains the brand's card-fan mark (`CardFanMark`), shuffling: each card steps left → centre → right, the front one lifts and slips to the back (2.4s loop, ⅓ offset per card; `aria-hidden`; reduced motion shows the static fan). Heading *Shuffling through your deck…* is the live region. It is not a progress figure; `2 of 4 read` still is. Drawn at 1300 (C2) and 390 (C2b). |
| **Notes** | **Game notes only** (`deck_games.note`, typed when logging a game). Version notes are not read. Manifest row *Notes on your games · on 2 of 9 games*; read line *2 game notes*. Intent, when set, is its own row. |
| **Phone** | Card padding 13 / 12, 11px between a card's rows, 12px between cards, 16px above the action row; marks on their own line under the add. |

**Settled 2026-09-23:** a stopped or failed run is refunded; Re-analyze states its credit before
the press (with the synopsis round). `backLabel` does not apply: the panel is inline, so the card
opens unstacked with its own ✕ (`open(id, [cut, add])`).

### Addendum r3, after the addendum audit (2026-09-23)

Canvas: section **E** at the top of `The 99 - Deck Tuning · Placement Addendum v2.dc.html`.
Audited against finding 1 and these items only.

| # | Item | Drawn |
|---|---|---|
| 1 | **Bracket flag** (finding 1, Hugh ruled twice) | E1 1300 / E1b 390, up and down; also on card 4 in A1 / A2. One line between the rationale and the actions, only when `bracket_after` differs from the current reading: *Applying it raises the deck’s bracket to* / *Applying it lowers the deck’s bracket to* + the shipped `BracketChip` with `permits` = the bracket after (24px desktop, 22px phone; a range reads unrounded as the chip already draws). `--fg-body` sentence; no new mark, no direction colour. The rationale rule stands (`noBracketClaim`). After Apply the header chip holds until Re-analyze. |
| 2 | **Intent line** (finding 8) | E2 1300 / E2b 390. Second in the header order: deck name → **intent** → pips + commander · colour → chips row → bar. 14px / 12.5px `--fg-body`, dashed underline, mono *edit*; wraps, never truncates. Absent means absent. The ask moves with the panel. |
| 3 | **Phone frames** | E3 Ready with no games · 390; E4 credits used up · 390 (replaces r1 B3). Both use the rolling-window copy. |
| 4 | **Ready, games logged, none marked** | E5 1300 / E5b 390. Lead: *Four games logged, and none is marked for what worked or hurt. We will read the results, your game notes, this list and what you own, and suggest up to five swaps. Mark what decided a game and suggestions can point at it.* Games row reads `4 games · no marks`. |
| 5 | **Synopsis round, noted** | When Re-analyze will also rewrite the synopsis, the banner says it uses a credit before the press, in the *Suggest changes* form. Not drawn. |

**Credits** roll over 24 hours: *{n} of {total} left · next one at {time}* (used up: *0 of {total} left · next one at {time}. Synopses and suggestions share these credits.*). New frames use it; older frames keep the calendar wording and engineering carries the change. New copy is for `/copy-review`; no em dash.

---

**R2 — density pass on the suggestion card, plus the phone frames it was missing.** Feedback: this
app's boxes run roomy and that costs the most on mobile. The suggestion card is now four rows at
9px padding instead of six at 14px (about 45px shorter each, so three cards plus the footer fit one
desktop screen), the accepted and dismissed states follow it, and **two phone frames were added** —
results with all three cards, and the after-the-tap pair. **Legibility floors and tap targets did
not move**: 12.5px body, 9.5px mono, 44px phone buttons. Nothing else in R1 changed.


**#10.** Source of truth:
`docs/superpowers/specs/2026-09-07-deck-tuning-suggestions-design.md`.
`design/design_handoff_the99_game_log/` is the structural sibling — same folder convention, same
copy-export shape, same READINESS format — and #10 literally changes two of its surfaces.

**⚠ What Design could not read, stated once and then worked around.** The spec is not in this
design project (it is merging on PR #392; only `docs/superpowers/design-tables/appshell.md` is
present here), and neither is `src/components/decks/`. So:

- The **five surfaces**, the **three locked rulings** and the **counting constraint** are drawn from
  the brief, verbatim.
- **§6's four failure classes are named as Design inferred them** — *unavailable*, *timed out*,
  *unusable answer*, *nothing held up*. The **count is four and the shape is one**; if §6 names or
  splits them differently it is a copy edit in `deck-tuning · copy strings.ts` and **no redraw**.
  This is the one open item in `READINESS.md`.
- Panel, form and history geometry is traced from `design_handoff_the99_game_log/The 99 - Game Log.dc.html`;
  the ownership atom is `decksBuilderCopy.rowOwned` as quoted in
  `design_handoff_the99_add_panel/add-panel · copy strings.ts` (`×{qty} owned` / `not owned`).
  **A price atom could not be located in this project** — the brief says one ships on the add
  panel's rows, so the `$1.20` figure here is drawn in that atom's shape (mono, tabular,
  `--fg-body`) and eng should substitute the real one. **If the components disagree, they win** and
  the component table below is what to correct.

File: `The 99 - Deck Tuning.dc.html` (canvas — pan/zoom). Read
`design_handoff_the99_game_log/README.md` and `LOW-N-summary.md` for the presentation rules #10
inherits, `STATES-tuning-panel.md` for the six-state matrix, `INTENT-where-it-lives.md` for the
deck-intent call.

**The one-line summary:** *it has to show its work, or it is a horoscope.* #9 named the weakness
and stopped; #10 proposes a cut and an add together, with the reason and the four sources it was
read from — and every claim it makes carries a count with its denominator, because a suggestion
that cannot cite a countable reason has no business being shown.

---

## The two open calls, and how they were called

| # | Call | Answer |
|---|---|---|
| 1 | Where deck intent lives on the deck page | **Under the deck name once it exists — never as an empty field.** The *ask* lives in the tuning panel, next to the payoff. |
| 2 | How six panel states share one container | **Three fixed slots — heading, body, action row.** Only the body changes shape. Six states, one layout. |

### 1 · Deck intent lives under the deck name, and its empty state does not exist

Intent is **a property of the deck**, not a setting of the tuning feature. It answers "what is this
pile trying to do", it is true on Decklist and on Consider, and burying it inside one tab would
make a fact about a deck read as a preference for a feature. So once it exists it prints under the
deck name, on every tab, in `--fg-body` with the shipped dashed-underline edit affordance — the
same one `played tonight` uses.

**But the empty state does not belong there.** An editable line in the header costs every deck a
grey *describe this deck* row, forever, to serve one panel — and a header full of unanswered
invitations is how a product tells you it has run out of things to say. **Absent means absent: no
line, no dashed placeholder, no prompt.**

**The ask lives where it pays** — inside the tuning panel, immediately above the button, phrased as
a sharpening and not a requirement, naming the actual gap it would close (*without it we can only
read the games*). Two entry points, one field, one string.

Four states are drawn: **empty** (header silent, ask in the panel), **the ask**, **set**, and
**app-seeded**.

**The seeded case is the interesting one.** When The 99 built the deck it genuinely knows the brief
it built to, so it prints it — with the shipped 18px provenance disc, a brass `from the build`
chip, and the same edit affordance. **The chip is removed permanently on the first edit**: it is a
statement about who wrote the sentence, and once the player rewrites it, the answer is them.

Rejected:

- **Intent as a prerequisite for generation.** It runs without one. The panel may say suggestions
  would be sharper with it — once, in the ask, never as a banner over results.
- **A picker** (casual / focused / cEDH, or an archetype select). Every option is a label the
  player must translate into their own table, the model learns more from eleven honest words than
  from a bucket, and it is the exact place a product starts telling people what kind of player they
  are.
- **Seeding intent from the decklist.** The app can describe a pile; it cannot know what you
  wanted. A guess printed under the deck name as if the player wrote it is a lie with an edit
  button. Attribution is the whole difference between a seed and a guess.
- **A textarea, or markdown.** Cap 120, one line — long enough for a sentence, short enough that it
  never becomes a second heading.

### 2 · Six states, three slots, one layout

The panel is **one box in one place and it never leaves** — below the aggregate, above the history,
`--surface-sunken` on `1px --border`, radius 12px. It renders in all six states including the ones
with nothing to say, because a panel that appears and disappears moves the history under the
player's cursor.

| Slot | Rule |
|---|---|
| **1 · Heading** | Cinzel 19px, always. Same rank, same words in four of six states, **never a state colour, never an icon, never a count.** A screen reader hears the same landmark every time. |
| **2 · Body** | **The only slot that changes shape** — a sentence, a manifest, three cards, a reason, or a failure. Always one column at the panel's full width, so the container's geometry is state-independent. Grows downward only. |
| **3 · Action row** | Fixed 56px band, **exactly one primary, always the same corner**, plus a mono note. Label changes; position and rank never do. |

That is what stops six states becoming six layouts: **the difference between any two states is the
content of one slot.** Colour lives in the body only, and in two states only — `--warning` on the
cited Fix axis, `--danger` on a failure tag.

The fixed action row is not tidiness. A five-second generation makes it likely that a tap arrives a
beat after a state change, and **a primary that moves between states is a primary that gets
mis-tapped** at exactly that moment.

## The six states

| # | State | Body | Primary |
|---|---|---|---|
| 1 | **Below threshold** | What it needs, and what the two games already lean toward (`2 of 2`) | `Suggest changes`, **disabled**, no error |
| 2 | **Ready** | A briefing: the four things that will be read, with counts | `Suggest changes` |
| 3 | **Generating** | **The same four rows, ticking off as each read lands** | `Reading…` + `Stop` |
| 4 | **Results** | Manifest collapsed to one mono line, then three suggestion cards | `Suggest again` |
| 5 | **Nothing has changed** | **The reason, in three countable lines** | `Suggest again anyway` |
| 6 | **Failure ×4** | One plain sentence + what survived | `Try again` |

Full matrix in `STATES-tuning-panel.md`.

### The generating state is a manifest, not a spinner

The brief is explicit that this must not read as a spinner with nothing to say, and it is the only
place in the app where a wait is expected. **Four lines, each with its count, ticking off in
order** — the games, the note, the list, the collection.

It earns the wait twice. It passes the time with something true, and it is **the honest disclosure
of what a model was handed**, which is the thing a player is most entitled to know and the thing a
spinner hides best.

Each line ticks **when that read actually completes**. No indeterminate bar, no invented staging,
no percentage (banned anyway) — the progress figure is `3 of 4 read`, with its denominator. If
three land instantly and the fourth takes four seconds, the panel looks like that.

**The manifest is the same four rows in states 2, 3 and 4** — unchecked, checking, then collapsed
to `read from 9 games · 1 note · 99 cards · your collection` above the results. Same content, three
densities, so the results are visibly the answer to the thing the player just watched.

**Cancellable**, because it costs money and time. `Stop` returns to state 2 with the manifest
unchecked and **no error** — a cancel is not a failure.

### State 5 is not a failure and is not drawn as one

The run worked; the answer is that the deck has not moved. So it takes the panel's ordinary ink and
**`--danger` appears nowhere in it**.

**The reason is the whole state.** "No new suggestions" with nothing after it is the app shrugging.
Three lines — games since the last run, the strongest axis, whether intent changed — let the player
see for themselves that there is nothing to say, and exactly what would change that. The primary
lets them insist anyway.

### Failure: four classes, one shape

Each is the same three slots with a `--danger` tag beside the heading, one plain sentence, **a line
confirming what survived**, and one `Try again`. No error codes, no stack, no *something went
wrong*.

**Every failure says what survived** — your games, your note, your list, and any suggestions
already on screen. The fear a failed AI call raises is that it *did* something; the copy answers it
before it is asked.

**The tag is the only place `--danger` is allowed on these surfaces.** Not the heading, not the
border, not the button. A red panel for a service that will work in a minute is a fire alarm for a
delay.

**Class 4 — *nothing held up* — is the one that matters.** Generation succeeded and produced
nothing usable: a card outside the colour identity, a cut that is not in the deck, a rationale with
no countable evidence, a percentage. The player is told it produced nothing we could stand behind,
which is true and better than showing them one. `0 of 4 suggestions survived checking.`

**Retry is a button, never automatic.** Manual-only applies to the second attempt as much as the
first, and a silent retry loop is how a wait becomes a bill.

## The suggestion card

- **The pair is one line and the arrow is the whole idea.** Cut, arrow, add — one 31px row with a
  22×31 thumbnail each side. A card that only named the add would be a shopping list; the cut is
  the part that costs something, so it keeps equal weight and equal size.
- **The card is deliberately tight: four rows, 9px padding.** Three of them plus a footer have to
  fit one screen, and this product's boxes run roomy. What was cut to get there: the `Cut` / `Add`
  column headings (the strike-through and the arrow already say direction), the cut card's type
  line (it is in your deck; you know what it is), the rule above the rationale, and 5px of every
  gap. Rationale 12.5px at 1.5, chips 9.5px. **Nothing legible was traded** — those are the
  product's existing floors, and no tap target moved.
- **The cut is struck through in `--fg-body`, never `--danger`.** It was not a mistake — it is a
  card that is not pulling its weight across nine specific games.
- **Ownership is a label, per the lock.** `×1 owned` in `--success`, `not owned` in `--fg-faint`.
  It never filters, ranks, sorts, or suppresses a card. The right card is the right card.
- **Price only when unowned**, and only as one mono figure. A price on a card you own is noise, and
  a total across three swaps turns a tuning panel into a basket — that is what the shopping list is
  for, and applying an unowned add puts it there.
- **The rationale is one sentence and must contain a count with its denominator.** A hard rule on
  the model's output, not a hope: no percentages, no nets, no *often*, no *consistently*. If it
  cannot cite a number it counted, it has nothing to say.
- **Evidence is cited as chips, each naming its source** — `games`, `note`, `decklist`, `intent`:
  the same four things the manifest read, so any claim traces back to something the player typed.
  **A candidate with no citable evidence is not shown.**
- **The note is quoted, never paraphrased**, in quotation marks with its date. Paraphrasing
  someone's sentence back to them as the app's reasoning is the fastest way this feature loses the
  room.
- **Three, not ten.** Ten swaps is a rebuild, and a rebuild is not a suggestion.
- **`Apply this swap` is brass outline, not brass solid.** `Build this deck` owns solid brass;
  applying a swap is not the app's goal.
- **The consequence prints before the tap** — the mono line beside the buttons is the verdict this
  swap would produce. Apply-plus-verdict, with the verdict half legible in advance.

### Accepted and dismissed, both in place

**Neither action removes the card.** Accepted keeps the pair, gains a `--success` frame, an
`applied` stamp, **the deck's post-swap verdict in the shipped status wording** (`99 / 99 ·
complete` or `99 / 99 · 1 to find`) and the shopping consequence in one clause. Dismissed collapses
to a one-line row **in the same slot**. The list never reorders and never shortens under the player.

`Put it back` is a real reversal of a real mutation, available for as long as the suggestion is on
screen — **the undo #9 wanted and could not have**, because here the thing being undone is still
visible.

**Dismissing asks no questions.** No "why not?", no thumbs, no reason picker: a feedback prompt on
a rejected suggestion charges the player for the app's mistake, and nothing in this release would
read the answer.

Applied and dismissed **survive a reload** and last until the next run replaces them. The footer
counts what is left — `1 of 3 applied · 1 dismissed`.

## The two changed surfaces

### The log form's note field

**An input, not a textarea, capped at 140.** A textarea invites a paragraph, a paragraph never gets
read back, and #10 would then be interpreting an essay written at midnight. One line is a sentence
a player will actually type after a loss, and it is short enough to print whole in a history row
and whole in a rationale.

Below both columns, above the buttons, **under its own rule** — last, because it is the only field
you cannot answer with a tap. Nothing above it moves. Counter reads `78 / 140` (a count with its
denominator), **absent until focus or content**, `--warning` from 130, hard stop at 140 with no
error: a cap you cannot exceed does not need one.

**Optional, and it says so** — the shipped optional-marks line gains three words and stays one
line. **Never required, even on a loss:** a form that demands an explanation for a bad night is a
form people stop opening, and the fifteen-second promise is why the log has any data at all.

**The note is never mined for axes.** Typing "never saw a second land" does not tick Mana. The
checkboxes are the structured answer and the note is the unstructured one; quietly inferring marks
from prose corrupts the aggregate the player thinks they control.

### The history row rendering one

**A second line inside the same row**, indented to the mark column with a 2px `--border-strong`
quote rule, italic 12.5px `--fg-muted`. Not a chip — a chip is a token and this is a sentence. Not
a tooltip — the thing you wrote about your own game should not need hovering.

**A row with no note is exactly the shipped 52px row, unchanged.** Nothing reserved, no empty
second line. **No truncation** — 140 characters wraps to two lines at 900px and three at 390px, and
that is the whole reason for the cap.

Everything else in #9 is untouched: the neutral `L`/`D` square, the 132px meta slot, the direction
dot in vocabulary order, the one inline delete confirm, the em dash for a game with no marks, no
pagination. **The aggregate panel is read by #10 and not redrawn by it.**

---

## Component notes

Hexes live only in `globals.css`. **No new token, no new hex, no new motion class, no new empty
state, no modal, no toast, no tray.**

| Component | Spec |
|---|---|
| **Note field** | min-height 46px (48px phone), `--surface-sunken` on `1px --border-strong`, radius 8px, 13.5px `--fg`. Mono 10px `--accent` label + mono 10px `--fg-locked` gloss and counter. Cap 140 hard; counter absent until focus/content, `--warning` from 130. |
| **History note line** | Second line in the shipped row, 40px indent, 2px `--border-strong` rule, italic 12.5px `--fg-muted`, no truncation, no reserved space when absent. |
| **Intent line** | 14px `--fg-body` under the deck name, `1px dashed --border-strong` underline, mono 10px `edit`. Cap 120. |
| **Seeded intent** | Adds the shipped 18px provenance disc and a brass `from the build` chip (mono 10px uppercase on `--accent` at 12%). Chip removed permanently on first edit. |
| **Intent ask** | Inside the panel body: mono 10px `--accent` label, 13.5px `--fg-body` pitch, 46px `1px dashed --border-strong` field with `--fg-locked` example, brass-outline `Save this`, mono skip note. |
| **Panel** | `--surface-sunken` on `1px --border`, radius 12px, padding `18px 20px`. Cinzel 19px heading. 56px action row above a `1px --border` rule. `1px --accent` border in the generating state only. |
| **Manifest row** | *Superseded 2026-09-28 by `addendum-manifest-affordance/` (the rows read as checkboxes): a read row is a ruled line, min-height 32px (36px phone), `1px --border` beneath and no fill, border or radius of its own, led by a 5px `--fg-locked` dot pending and a brass ✓ read, label `--fg-body` pending and `--fg` read, mono 11px count. The dashed empty-games row sits above the ruled list; its `Log a game →` is the one target, 38px (44px phone).* |
| **Suggestion card** | `--surface` on `1px --border`, radius 9px, padding `9px 12px`. Four rows: pair (31px) / rationale / actions + chips. Two 22×31 thumbnails, mono 13px `--accent` arrow, rationale 12.5px `--fg-body` at 1.5. **No column headings, no rule above the rationale, no type line on the cut.** `1px --success` when applied. |
| **Suggestion card · phone** | Same four rows; the pair breaks over two lines (cut, then arrow + add + ownership) so a long name never truncates. **The rationale is a shorter first clause from the model, never an ellipsis** — the card does not hide evidence behind a tap. Actions become two 44px halves of one row, consequence below. |
| **Ownership atom** | `decksBuilderCopy.rowOwned` unchanged — `×{qty} owned` mono 10.5px `--success`; `not owned` mono 10.5px `--fg-faint`. |
| **Price atom** | Mono 10.5px `--fg-body`, tabular, **only when not owned**. Substitute the shipped atom — see the warning at the top of this file. |
| **Citation chip** | Mono 9.5px on `--surface-sunken`, `1px --border`, radius 5px, `3px 7px`. Source name uppercase `--fg-locked`; value `--fg-muted`. Sits at the end of the action row on desktop, on its own line on phone. |
| **Applied stamp** | 16px `1px --success` box + ✓, mono 10px uppercase `--success` `applied`, then the verdict in mono 10.5px (`--fg-body` complete, `--warning` to-find), then the shopping clause in `--fg-faint`. |
| **Dismissed row** | One line, `--surface-sunken` on `1px --border`, radius 9px, `8px 12px`. Mono 11px uppercase `--fg-locked` `not this one`, 13px `--fg-faint` pair, neutral ghost `Show it again`. Same slot, no animation out. |
| **Failure tag** | Mono 9.5px uppercase `--danger` on `--danger` at 12%, radius 999px, `3px 9px`. **The only `--danger` on these surfaces.** |
| **Apply / dismiss** | Brass-outline `Apply` (32px desktop) / `Apply this swap` (44px phone), neutral ghost `Not this one`, mono consequence beside them on desktop and below them on phone. **The desktop card got denser; the phone card did not** — 44px is a floor, not a preference. |
| **Refusal** | Shipped `MutationError` **under the failing card's own action row**, not at panel level. |

## Notes for engineering

- **Two nullable single-line text columns:** `deck_games.note` (≤140), `decks.intent` (≤120). Both
  quoted verbatim to the model, **neither ever parsed for structure**.
- **Generation is manual, always.** No auto-run on load, on save, or on the third game; no
  automatic retry. Re-running is the same button in the same corner.
- **A post-generation validator that drops candidates**, not a prompt that asks nicely. The
  no-percentage / no-net / denominator rules run server-side **before anything renders**; a
  rationale that fails them is not shown and counts as a rejected candidate. All four rejected →
  failure class 4.
- **`PATTERN_MIN` is imported from #9's copy block.** The number 3 is inlined nowhere in #10. Note
  the difference in kind: #9 refuses to gate its *summary*; #10 does gate its *suggestions*,
  because a swap proposed off one game costs real cards.
- **Suggestion state persists** — open / applied / dismissed, per suggestion, per run — so a reload
  does not resurrect a swap the player already made or refused.
- **The apply mutation returns the deck's post-swap verdict** (count + status + shopping delta). The
  card prints it; the client does not compute it.
- **`Put it back` is a real inverse mutation**, not a client-side buffer, and it restores the
  shopping list too.
- **Revalidation goes through `deckSurfaces()`** like the log and the delete — applying a swap moves
  the deck list, the home page and the shopping list.
- **Live region:** the existing one. One message per settle — `Reading your deck`, `Three
  suggestions ready`, `Midnight Reaper swapped in. 99 of 99, complete.`, the reason, the failure.
  **Never one per manifest line.**
- **Motion:** the shipped panel transition, and an opacity change on a manifest tick. **No skeleton
  cards, no shimmer, no typewriter on the rationale** — text that types itself makes a machine's
  guess look like a person thinking.
- **Copy** lives in `src/lib/copy/deck-tuning.ts` and **adds only** — see
  `deck-tuning · copy strings.ts`. It imports `PATTERN_MIN` and `axisCopy` from `game-log.ts` and
  redefines neither.
- **Mock data** continues #9's Gisa Zombies deck at nine games: `5–4 across 9`, `card_flow` marked
  against in 7 of 9, one note on 26 Aug and one on 19 Aug, 11 of 99 cards at four mana or more,
  4 of 99 that draw. Every figure on the canvas is arithmetically consistent with that.

## Gap report

1. **§6's failure-class labels are inferred.** The count is four and the shape is one; the labels
   are Design's. This is the only thing in the handoff that could be wrong in substance rather than
   in judgement, and it is a copy edit either way.
2. **No price atom was locatable in this project.** The brief says one ships on the add panel's
   rows. The canvas draws one in that atom's shape; eng must substitute the real formatter,
   including its staleness and currency behaviour, neither of which Design has specified.
3. **The rationale is model output inside a hard copy rule.** Design is asking for a validator that
   drops candidates, which means a run can legitimately return fewer than three suggestions — and
   the results state is drawn with three. Two suggestions is a valid result and looks slightly thin.
   Not drawn; the panel handles it by simply rendering fewer cards.
4. **The manifest promises four reads and the fourth is vague.** *What you own, and what a card
   costs* is two things wearing one row, because splitting it to five rows made the wait look
   longer than it is. If pricing is a separate call, the row count should follow the calls.
5. **`Put it back` has no time limit, which makes it a permanent second action on every applied
   card.** After three runs a player could have a dozen applied cards each offering a reversal of a
   swap they have forgotten. Accepted for now — the alternative is a five-second window, which is
   the thing #9 could not have.
6. **Intent is one line for one deck, and it cannot express a change of plan.** A deck retuned
   toward a different table gets a rewritten sentence and no history, so the suggestions have no
   way to know the last four games were played under the old brief. The first thing to want at
   scale.
7. **Nothing surfaces suggestions outside the tab.** Manual-only plus no-badge means a player who
   never opens the Games tab never learns this exists. Deliberate, and it makes the empty state's
   scope line from #9 the only place the feature is ever hinted at.
8. **The note is capped at 140 and players will hit it.** "Mulliganed to five, missed my third land
   drop, and got wiped on turn seven" is already 78 characters. The cap is a real editorial
   constraint on the player's own words, chosen so the note prints whole everywhere — but it is a
   constraint, and it is the most likely thing to be asked to relax.

## Files
- `The 99 - Deck Tuning · Placement Addendum v2.dc.html` — **canonical for placement and the
  panel**: results at 1300 / 390, both cards up close, the lifecycle, no games logged.
- `The 99 - Deck Tuning · Placement Addendum.dc.html` — r1 of the addendum, history only.
- `The 99 - Deck Tuning.dc.html` — the R2 canvas: note field, history row, intent, failure classes.
- `README.md` — this file.
- `STATES-tuning-panel.md` — the six-state matrix, plus the note field's states.
- `INTENT-where-it-lives.md` — the deck-intent call in full, and what was rejected.
- `deck-tuning · copy strings.ts` — the copy block, production-final.
- `READINESS.md` — self-assessed readiness and the one open item.
- `brand/` — the locked brand sheet + brand README, copied in for self-containment.
- `support.js` — runtime for the HTML reference; not production code.
