# The 99 — Win/loss tracking, the Games tab (design handoff, R1)

**#9, Phase 2.** Source of truth:
`docs/superpowers/specs/2026-09-05-deck-game-log-design.md`.
`design/design_handoff_the99_synergy_discovery/` is the structural sibling — same folder
convention, same copy-export shape, same READINESS format.

**Where the reuse was read from.** The brief points at `src/components/decks/builder-tabs.tsx` and
`src/components/decks/role-counter-strip.tsx`. Neither exists in this design project — `src/` here
holds only `shell/nav.tsx` — so the pill row and the counter cell were traced from
`design_handoff_the99_decks/The 99 - Decks.dc.html` (the shipped builder as that handoff drew it,
lines 509–538) plus the copied brand sheet. If the component files disagree with the canvas, the
component files win and the geometry table below is what to correct.

File: `The 99 - Game Log.dc.html` (canvas — pan/zoom). Read
`design_handoff_the99_richness/README.md` for the locked voice before auditing the copy,
`STATES-log-form.md` for the form matrix (§6's form, all states including the conflict), and
`LOW-N-summary.md` for the §8.5 ladder in full.

**The one-line summary:** *the denominator is the design.* §5 imposes no minimum-games gate, so
confidence is drawn instead of gated — every figure carries its own denominator, the heading is a
description below three games and a finding at three or more, and the state colours are earned at
three. Nothing is ever hidden for being thin.

**Phase 2 only.** §6 splits this ticket: schema, migration, the vocabulary constant, both server
actions and the read module are explicitly ungated and can ship as backend. This handoff gates the
Games tab, the form, the empty state and mobile/desktop parity. Nothing in here asks for a change
to Phase 1.

---

## The five §8 calls

| # | Call | Answer |
|---|---|---|
| 8.1 | Axis labels | **Plain nouns, plus a gloss that flips per column.** Eight labels, sixteen glosses, **zero key changes**. |
| 8.2 | Is Mixed shown | **Yes — as one line under a rule, not a third group.** Real finding, no ranking, no claim to parity with Fix. |
| 8.3 | Form presentation | **Inline, expanding in place.** The builder is dense; this tab is not. No dialog, no mobile sheet. |
| 8.4 | The empty state | Pitches the **third** game, quotes the real output sentence, states the cost in seconds, draws the scope line. |
| 8.5 | Low-N presentation | **Denominator, heading, ink** — three dials, one constant. No percentages at any N, ever. |

## Frames delivered

| # | Frame | Desktop | Phone |
|---|---|---|---|
| A1 | The eight labels with both glosses, and the rejected wordings | ✓ | — (same strings) |
| A2 | `BuilderTabs` with the third pill, selected and at zero games | ✓ | ✓ |
| B1 | Empty state — the whole pitch | ✓ | ✓ |
| B2 | The log form, expanded, three marks in | ✓ | ✓ |
| B3 | One game logged — tier 1, no buckets, no colour | ✓ | ✓ |
| B4 | Three games, a clear pattern — Fix / Keep / Mixed, history | ✓ | ✓ |
| C1 | The §8.5 ladder — one axis at N=1, N=2, N=5 | ✓ | — (same rule) |
| C2 | The conflict case, drawn as a move | ✓ | — (same rule) |
| C3 | History row anatomy | ✓ | ✓ (noted) |
| C4 | Token / a11y / motion contract | ✓ | ✓ |

---

## Decisions log

### 1. §8.1 — the labels are **plain nouns, and the gloss is the column's**

The constraint is unusual and it does the deciding: one vocabulary appears in *both* columns, so
**the label cannot carry a direction.** "Speed out of the gate" is fine under *What worked* and
faintly wrong under *What let me down*; `Speed` is fine under both, and it is the word said at the
table.

| Key | Label | Gloss · worked | Gloss · let me down |
|---|---|---|---|
| `speed` | **Speed** | got going fast | started too slow |
| `card_flow` | **Cards in hand** | kept drawing | ran out of gas |
| `mana` | **Mana** | hit every land drop | screwed or flooded |
| `interaction` | **Answers** | answered the threats | nothing for their threats |
| `board` | **Board presence** | built a board | got outsized |
| `resilience` | **Comebacks** | recovered from a wipe | never recovered |
| `engine` | **The deck's plan** | the plan fired | never came together |
| `closing` | **Closing the game** | converted the win | stalled out |

**A bare noun is ambiguous about which side it belongs on**, and that is the one error that
actually corrupts the aggregate: a mis-sided tick does not fail to count, it counts *backwards*.
`net` is `worked - hurt`, so one wrong side is worth two. Hence the gloss — mono 10px under the
label, **direction-specific**, and it is the entire reason a one-word label is safe. One
vocabulary, two readings, no new keys.

Order is the constant's order, roughly the order a game happens in. Not alphabetical, not by
frequency: a list that reorders itself as data arrives has to be re-read every time.

**Rejected wordings, and why:**

- **`Card flow`** — the spec's own placeholder and the clearest case. Nobody says it. "Cards in
  hand" is what running out of gas feels like, and it is what a player would search for.
- **`Interaction`, `Resilience`, `The engine`** — all correct, all the language of a deck review
  rather than a Tuesday night. `Answers`, `Comebacks` and `The deck's plan` say the same things in
  words already in use. "The engine" also assumes every deck has one; plenty do not.
- **`Finishing`** for `closing` — in this product *finish* already means foil or nonfoil
  (`collection_items_finish_check`). `Closing the game` is longer and unambiguous.
- **`Speed out of the gate`, `Board`, `Mana base`** — the first carries direction, the second is
  too close to "board wipe", the third narrows an axis that is also about flooding.

**The keys are untouched**, which is the point: #10 still joins on `card_flow`, and §3's promise
that relabelling is a copy change survives intact.

### 2. §8.2 — Mixed is shown, as **one line under a rule**

The spec is right that it is a genuine finding: "mana cut both ways" is not "mana is fine" and not
"mana is a problem". So it is not collapsed and not dropped.

But it **ranks nothing and prescribes nothing.** A third heading with its own strip of cells beside
Fix would claim equal standing with the bucket that is the entire reason to open the tab. So Mixed
prints as a sentence under a `1px --border` rule, with the same counts and no state colour:

> **Mixed** · Mana — 1 up, 1 down. Cut both ways so far.

Two consequences worth stating. It **always renders when non-empty**, at every N, so the data
layer's three buckets are all visible and the audit can check the UI against `summarizeGames`
directly. And when Keep and Fix are both empty but Mixed is not, the headline says so plainly
rather than falling back to a bare record line.

### 3. §8.3 — the form is **inline, expanding in place**

§8.3's premise is that the builder is dense — and it is, *on the other two tabs*. The Games tab is
a record line, a strip and a list. **There is nothing here worth interrupting, and a dialog exists
to interrupt.**

Three more reasons, in order of weight:

- **The history is context, not clutter.** People log by comparison — "same as last time but I drew
  better" — and a modal covers exactly the thing being compared against.
- **At 390px a dialog becomes a full-screen sheet**, a construct the product does not own. Inline
  needs none: the two columns become two stacked headed blocks, which is *clearer* at that width
  than side-by-side would be.
- **The empty state's button opens this same form, expanded.** One form, one place, two entry
  points, no second surface for the first log.

**Cost, stated:** the tab gets long while the form is open — form plus aggregate plus history is a
scroll at 390px. Accepted, because the form collapses to a 44px row on save or cancel, and that is
its resting state on every visit but the first.

**The form's shape.** Result is three 40px segments with **no default** — it is the one field only
the player knows, and a pre-picked result is a mislogged result. Pod size is seven 40px squares,
2–8, **defaulting to 4**: four is the standard table, so the common case is zero taps, and the
control *is* the `check` range rather than validating against it. `playedAt` is a dashed-underlined
`played tonight` that opens a date field — it exists so the morning-after log sorts to the night it
happened, and it defaults, so it costs nothing when it is right. Save enables on a result alone;
the line beside it says marks are optional, because two empty columns otherwise read as a required
field whose requirement you cannot see.

**Losing is not an error.** `Won` fills `--success`; `Lost` and `Draw` take `1px --accent` when
chosen and fill nothing. `--danger` never appears on a result, in the form or in history.

### 4. The conflict case is **a move**, not a state

The composite primary key makes one axis marked both ways **unrepresentable in the data**. The form
makes it **unreachable in the UI**, by the same logic rather than by a validator: **ticking an axis
on one side unticks it on the other**, the vacated row says `moved to what let me down` for one
beat, and there is no dialog, no error and no undo prompt.

Rejected:

- **Disabling the opposite row** — after four ticks on the left you have four disabled rows on the
  right, and a player who changes their mind has to find and untick the original first.
- **An error on save** — a rejection for something the interface allowed.
- **A three-state toggle per row** (worked / neutral / hurt) — tidier against the data model, and it
  deletes the two column headings that are doing all of the teaching.

§4's server-side validation stays exactly as specified. It is not dead code; it is what a crafted
request meets. The UI simply never generates one. Same for the dedupe: a checkbox cannot produce
`['mana','mana']`, and the rule stays for the request that can.

### 5. §8.5 — low N is **three dials and one constant**

`LOW-N-summary.md` carries it in full. The short version:

| Dial | Below three games | Three or more |
|---|---|---|
| **Denominator** | in the figure — `1 down`, `2 of 2` | in the figure — `4 of 5` |
| **Heading** | describes what was logged | states a finding about the deck |
| **Ink** | `--fg-body` figure, `--border-strong` bar | `--success` / `--warning` |

At **N=1** there are no bucket headings at all: the marks appear under *What that one game said*,
which is a true title, and the figure is a direction plus a count (`1 down`) — never a net, because
a net of −1 invites arithmetic that has not happened.

**No percentages at any N.** Not a low-N rule but a permanent one, and it is what makes the low-N
rule unnecessary elsewhere: "3 of 3" cannot be quoted out of context, and "100%" is designed to be.

**Three is the spec's own number**, twice — §1's *three games is enough for a person to notice*, and
*this happened three times out of three* as the sentence the feature exists to print. Design did not
pick a threshold; it drew the one already in the document, and put it in one constant beside the
copy so the audit can change it to four with no redraw.

Rejected: opacity (makes thin data harder to read rather than easier to weigh, and fails contrast
at exactly the wrong moment), a confidence badge or star rating (a second invented scale with no
definition in the data), and "2 more games for a pattern" as a progress meter (reinstates in copy
the gate §5 refused, and turns logging into a chore with a target).

### 6. §8.4 — the empty state pitches the **third** game

§1 says the log is worth close to nothing until the app can count across games, so the headline is
the count and not the act. *"Track your wins"* would sell the worthless half.

> **Three games is a pattern.**
> One game you already remember. The third one is where this tab earns its keep — it starts saying
> things like *ran out of gas, 3 of 3 games*, which is the kind of sentence you can actually act on.
> Logging takes about fifteen seconds: did you win, how big was the pod, and the two or three things
> that decided it.

Four things it is doing: quoting the **real output sentence** (showing the output is the only honest
way to pitch an output); stating the cost **in seconds**, because the objection is friction rather
than value; using the brand sheet's **card-fan mark**, which exists for "marketing and empty
states"; and drawing the scope line in the player's favour —

> This tab tells you **what is letting the deck down**. What to do about it stays your call.

True today, promises no roadmap, and lets #10 arrive as a gift rather than a correction.

Below it there is **no history heading and no empty aggregate strip**. An empty Keep / Fix strip is
three boxes explaining they have nothing in them.

### 7. The aggregate panel is `role-counter-cell`, with one meaning changed

Reuse, per the brief. **The geometry is verbatim**: radius 9px, padding `11px 14px`, mono 10px
uppercase label, mono 16px figure, 5px bar, mono 9.5px sub-line, `1px --border`.

Two differences, both deliberate. The **fill steps up one surface** — the role strip's cell is
`--surface-rail` on the builder's own ground, and the axis cell is `--surface` because it nests
inside a `--surface-rail` panel; same relationship, one level in. And the change to the bar's
**meaning**. Role counters fill one segment toward a target;
there is no target here, so the bar is **split — worked in `--success`, hurt in `--warning`** — and
the whole bar is *the games that marked this axis*, not the games played. At N=1 it is a single
neutral segment.

**The figure is `3 of 3`, not `−3`.** `net` sorts the buckets and never shows its face: a signed
integer needs a legend, and "3 of 3" carries its own denominator, which is the low-N strategy in
four characters.

**Fix is drawn above Keep.** The reason to open this tab is the thing that is wrong; Keep is what
you protect while fixing it. It is also what #10 reads first, so surface and successor agree on
what matters.

Sorting is `summarizeGames`' own — magnitude of `net` descending, then key ascending. **Design adds
no second sort**, so the panel's order is the pure function's order and stays testable.

### 8. The tab takes a **count, not a record**, and never disappears

The shipped pill takes a count when it has one (`Shopping · 8`), and the shipped convention is that
a control with nothing to say is absent. Applied here that lands on the **count**, never the tab: at
zero games the pill reads `Games`, because `Games · 0` is a tab advertising its own emptiness and
hiding the tab hides the feature from everyone who has not used it yet.

`Games · 2–1` is rejected — a different kind of number wearing the same clothes as `Decklist · 99`
in the same row.

---

## Component notes

Hexes live only in `globals.css`. **No new token, no new hex, no new motion class, no new empty
state, no modal, no toast, no tray.**

| Component | Spec |
|---|---|
| **Games tab pill** | `BuilderTabs` unchanged — 999px pill, 13px, brass solid selected, `1px --border` ghost at rest. Count appended as `· {n}` when `n > 0`; bare label at 0. |
| **Record line** | Cinzel 26px `--fg` headline (20px phone), body 13.5px `--fg-body` beneath, record itself mono 13px `--accent` tabular inside that body line. |
| **`Log a game` — collapsed** | Brass-outline button, `1px --accent`, label 13.5px 600 `--accent`, radius 8px, `10px 18px`; 44px full-width at phone. Never brass-solid: `Build this deck` owns solid brass, and logging is not the app's goal. |
| **Form container** | `--surface` on `1px --border-strong`, radius 12px, padding 20px. Replaces the collapsed row in place. |
| **Result group** | Three 40px segments (44px phone), radius 8px. Won selected: `--success` fill, `--base` label. Lost / Draw selected: `1px --accent`, label `--fg`, no fill. Unselected: `1px --border`, label `--fg-body`. Radio group, no default. |
| **Pod group** | Seven 40px squares (44px phone), radius 8px, mono 14px 600. Selected `1px --accent` + `--accent` label + `color-mix(--accent 12%, transparent)`. Default 4. Radio group. |
| **Axis column** | `fieldset` + `legend`. Legend mono 10px uppercase `letter-spacing .14em` — `--success` for worked, `--warning` for hurt — with a mono 10px `{n} marked` counter beside it in `--fg-locked`. |
| **Axis row** | `label` wrapping a checkbox. min-height 46px (48px phone), `--surface` on `1px --border`, radius 8px, padding `5px 12px`, gap 11px. Label 13.5px `--fg`; gloss mono 10px **`--fg-faint`** (`#8E8269` on `--surface` = 4.57:1 — **not** `--fg-locked`, which measures 2.84:1 and is the one string in this design that cannot afford to be hard to read). Checked: fill `--elevated-hover`, border `--accent-shadow`, gloss `--fg-muted` (6.19:1). |
| **Axis checkbox** | 18px (20px phone), radius 5px, `1px --border-strong`. Checked: `1px --accent`, fill `color-mix(--accent 12%, transparent)`, glyph `✓` in the **column's** colour. Decorative — the row is the hit area. |
| **Moved row** | Unticked, `1px dashed --border-strong` for one beat, gloss replaced by `moved to {other column}` in `--fg-locked`, then back to rest. |
| **Save / Cancel** | Brass solid `Save this game` (the shipped primary), neutral ghost `Cancel`. 48px / 44px stacked full-width at phone. Enabled on a result. |
| **Axis cell** | `role-counter-cell`'s **geometry** verbatim, fill one surface step up — see decision 7. 200px wide desktop, wrapping; a 44px row at phone with label · sub · figure. |
| **Split bar** | 5px, radius 999px, track `--elevated`, two flex segments: worked `--success`, hurt `--warning`. Single `--border-strong` segment below three games. No transition. |
| **Bucket heading** | Mono 10px uppercase `letter-spacing .14em`, `--warning` for Fix, `--success` for Keep, with a mono 10px `--fg-locked` gloss beside it. Absent entirely at N=1. |
| **Mixed line** | One line above a `1px --border` rule. Mono 10px uppercase `--fg-faint` label + mono 11px `--fg-muted` sentence. No cells, no colour. |
| **History row** | min-height 52px (64px phone, two lines), `--surface` on `1px --border`, radius 9px, padding `8px 12px 8px 14px`, gap 14px. Slots: result 26px · meta 132px mono 11px tabular · marks (wrapping) · delete 30px. |
| **Result square** | 26px, radius 7px, mono 12px 600. `W`: `1px --success`, label `--success`. `L` / `D`: `1px --border-strong`, label `--fg-body`. Never `--danger`. |
| **Mark chip** | mono 10.5px `--fg-body` on `--elevated`, radius 999px, padding `4px 11px 4px 8px`, with a 6px filled dot — `--success` worked, `--warning` hurt. Vocabulary order, **not** grouped by direction. |
| **— no marks** | Em dash mono `--fg-locked` in the chip slot. Absence, not a gap. |
| **Delete** | 30px `×` (44px phone), `1px --border`, glyph `--fg-locked`, `--danger` on hover. **One inline confirm** in the row: `Delete this game?` · `Delete` / `Keep`. §4 has no edit action, so this is the correction path and a stray tap loses the only copy. |
| **Empty state** | Brand sheet's card-fan mark at 150px (96px phone), Cinzel 26px (21px phone) headline, two body paragraphs at 14.5px `--fg-body`, brass-solid CTA, and the scope note in the shipped provenance shape (`--surface-sunken`, `border-left 3px --accent`, 20px `i` disc). |
| **Refusal** | Shipped `MutationError` under the save button, form state preserved. `logGame` returns `DeckMutationResult`, so no new surface. |

## Notes for engineering

- **The tab is the only new component.** `BuilderTabs` gains one entry; everything inside the tab
  composes existing boxes. There is no new panel primitive here.
- **Games data is fetched in `page.tsx`** (`listDeckGames` + `summarizeGames`) and passed to
  `BuilderShell` as props, per §6. The tab renders from props; nothing in the tab fetches.
- **The low-N threshold is one exported constant** beside the copy block — `PATTERN_MIN = 3` — read
  by the headline, the bucket headings and the cell's ink. Do not inline `3` in three components.
- **The headline is derived, not stored.** Strongest Fix → strongest Keep → Mixed-only → the N=1
  record line, in that order, using `summarizeGames`' existing sort. No new ranking rule.
- **`net` is never rendered.** It sorts. The cell prints `{marks} of {count}` and
  `{worked} up · {hurt} down`, all of which are already on the summary object.
- **No percentage formatter is needed anywhere in this feature.** If one appears in review, it is a
  defect.
- **The move behaviour is form state, not a server concern.** Ticking an axis in one column removes
  it from the other list before submit, so `worked` and `hurt` are disjoint by construction — §4's
  "no key appears in both lists" rule is never exercised by this UI.
- **`role-counter-strip.tsx` / `role-counter-cell.tsx` are read, not edited.** The axis cell is the
  same geometry rebuilt inside the Games tab with a two-segment bar; extracting a shared cell
  component is fine but is not asked for, and the role strip must not gain a split-bar mode it does
  not use.
- **Delete revalidates through `deckSurfaces()`** like the log, per §4 — the record line on the
  deck list and the home page both move when a game is deleted.
- **Live region:** the existing one. One message per settle — the move
  (`Mana moved to what let me down`), the save (`Game logged. 2–1 across 3 games.`), the delete.
  Never one per tick.
- **Motion:** the form's open/close is the shipped panel transition and is the only animated thing.
  No count-up, no bar growth — a bar that animates on load makes a two-game figure look like a
  measurement being taken.
- **Copy** lives in `src/lib/copy/` — see `game-log · copy strings.ts`. It is a new `gameLogCopy`
  block and **edits nothing**. The eight labels and sixteen glosses live there, not in
  `src/lib/decks/game-axes.ts`: the constant keeps `{ key, label }` as §3 specifies, and the gloss
  pair is copy. If eng prefers all label strings in the constant, that is a one-line move and
  Design has no objection — but the glosses must not become a fifth and sixth column of the
  database vocabulary.
- **Mock data:** the Gisa Zombies deck from §1, deliberately, so the canvas and the spec tell one
  story. 2–1 across three games; `card_flow` marked against in 3 of 3; `board` and `engine` at
  2 of 3 for; `mana` 1 up 1 down as the Mixed case; `interaction` at 1 of 3 against. Every figure
  in the canvas is arithmetically consistent with those three games, and the N=5 ladder panel is a
  separate hypothetical (4 of 5) labelled as such.

## Gap report

1. **The gloss pair doubles the copy surface of the vocabulary.** Eight labels became eight labels
   plus sixteen glosses, and every future axis costs three strings instead of one. Design considers
   that the price of a one-word label that reads correctly in both columns, but it is a real cost
   and the audit should price it.
2. **`PATTERN_MIN = 3` is a judgement, not a measurement.** It is the spec's own number and it is
   in one constant. Nothing validates that three games is where a player's confidence actually
   turns.
3. **The N=2 tier is the weakest of the three.** "A leaning" is a real state and its copy is the
   hardest to write without either overclaiming or sounding apologetic. The line delivered —
   *both of them, which is worth noticing and not yet worth calling a pattern* — is the fourth
   attempt and is the most likely copy in this handoff to be rewritten in review.
4. **No edit action means the confirm step carries the correction path.** §4's delete-and-relog is
   right at this scale, but it makes an accidental delete unrecoverable — the game is gone and the
   player has to remember it. The inline confirm is the mitigation; a five-second undo would be
   better and would need a toast, which this product does not have.
5. **Nothing prevents a player marking all eight axes.** Two-to-four is the expected load, the form
   does not cap, and eight marks per game makes every axis a pattern and the panel useless. Design
   deliberately did not add a cap — a form that refuses your honest answer is worse — but the
   failure mode is real and the counter beside each legend is the only nudge against it.
6. **Pod size defaults to 4 and is therefore the field most likely to be wrong.** A player at a
   five-person table who taps straight through logs a 4. The alternative — no default — costs a tap
   on every single log for a field that is 4 most of the time. Taken knowingly.
7. **The record line says nothing about pod size, and it should eventually.** "Does it fold in
   bigger pods" is one of §1's motivating questions and `podSize` is captured for it, but nothing in
   this surface reads it back beyond the history row. Not drawn, because a per-pod-size breakdown at
   three games is exactly the low-N lie this handoff exists to avoid. It is the first thing to add
   at N=10.
8. **The history has no filter and no grouping**, deliberately. At sixty games it is sixty rows and
   the aggregate panel is the answer to "what does all this mean". It is the most likely thing to be
   asked for after launch.

## Files
- `The 99 - Game Log.dc.html` — the canvas (this handoff's deliverable).
- `README.md` — this file.
- `STATES-log-form.md` — the form's state matrix, including the conflict case.
- `LOW-N-summary.md` — the §8.5 ladder, its rules and what was rejected.
- `game-log · copy strings.ts` — the copy block, production-final.
- `READINESS.md` — self-assessed readiness and what blocks a green.
- `brand/` — the locked brand sheet + brand README, copied in for self-containment.
- `support.js` — runtime for the HTML reference; not production code.
