# §4.3 / §4.4 — the search matrix, the exclusion sentences, and the two floor states

Read with `README.md` decisions 4 and 5. Every string here is production-final and lives in
`commanders-plane · copy strings.ts`.

---

## 1 · The field, four states

| State | Field | Count | Dismiss |
|---|---|---|---|
| Default | placeholder `Commander name` at `--fg-locked` | — | — |
| Focused | brand focus-visible ring from `globals.css` | — | — |
| Narrowing | value 12.5px `--fg` | `3/3,326` mono 10px `--fg-faint` | `✕` |
| Zero | value 12.5px `--fg` | `0/3,326` | `✕` |

**Blocker 7 — the in-field count and the pip row's are the same number.** `FilterBar` renders
`{filteredTotal}/{activeTotal}` from `filtered.length`, and search narrows that same array, so with
a query the pip row already reads `3/3,326`. Drawing it in the field too prints the figure twice,
against this file's own "the match figure appears once" rule. **Two exits, and Design does not
pick:** **(a)** drop the field count and let the pip row carry it — A4 draws this, and search loses
its own feedback; **(b)** re-scope `FilterBar`'s prop to pre-query `colourFiltered.length` so the
two figures mean different things (`61/3,326` on the pips, `3/3,326` in the field) — the states in
this file and canvas §C draw that, and it changes a shipped prop's meaning. Until it is settled the
two drawings differ on purpose, and each is labelled.

**The zero state does not colour the field.** No red border, no shake, no inline error. A zero
count is a fact about the pool, and the sentence explaining it belongs where the rows were. The
field is never the error.

**Both figures always print.** Matches and the pool they were found in — the same denominator rule
every other figure on this surface follows.

## 2 · The list region, three states

The split is whether a list still exists.

### 2a · No match anywhere

`FloorEmpty`'s geometry: centred, hairline + 6px diamond, heading Cinzel 600 18px, body 13.5px
`--fg-body` max 430px, ghost CTA 40px.

> **No commander is named "atrxa"**
>
> Nothing in the **3,326 you have not built** has that in its name, and neither does anything you
> have. Check the spelling.
>
> `[ Clear the search ]`

**One figure, one slot.** R2's body also claimed "the index carries 3,342 commanders", which needs
an index total the payload does not deliver; the clause and its argument are both gone.

The emphasis is on the population, not the query: the sentence's job is to say *where we looked*.
No aside — there is no second figure worth printing.

### 2b · Every match is excluded

Same geometry. Names the commander, names **one** control, and its single action is that control's
correction.

> **Krenko, Mob Boss is here — a filter is holding it back**
>
> It matches, but the **Green · Black** colour filter excludes it — its identity is Red.
>
> `[ Clear the colour filter ]`   `1 match, 0 shown`

**The heading takes the full name and the body opens with "It".** `DiscoveryItem` carries only
`name` — R2's `heldHeading` asked for a short name the payload does not have — so the name goes in
the heading once and the body does not repeat it. The aside prints the match/shown pair so the offer
is not a guess.

### 2c · Some matches survive

The list is the answer, so the list stays. The excluded row is reported *above* it in
`NoDecksBanner`'s furniture — `--surface`, `1px --border-strong`, `border-left 2px --accent`,
radius 8px, `role="status"`.

> **Atraxa, Praetors' Voice** also matches, but **Exactly** Green · Black excludes it — its
> identity is White · Blue · Black · Green.   `Switch to Contains`

The correction is a trailing button, not a primary one: the primary action is still reading the
rows. On the phone it wraps to its own line — **and it carries the identity clause in full**, which
is what `excluded.joinAlso` emits. There is no short variant: the clause is the reason the row was
excluded, so dropping it on the phone would leave the sentence naming a control without a cause.
The 375px aside is therefore 88px, and A4's measurement uses that figure.

**One aside, never a stack.** If several controls excluded matches, the outermost is named and the
sentence pluralises:

> **2 more matches are excluded by the Green · Black colour filter.**   `Clear the colour filter`

---

## 3 · The five exclusion sentences, and their precedence

**One control is named.** A row can be excluded by three at once, and naming all three turns a
one-tap fix into a diagnosis. Precedence is **outermost first** — the control that decides the
largest thing:

| Order | Control | Why it outranks the next |
|---|---|---|
| 1 | **Scope** | decides which commanders exist at all |
| 2 | **Colour pips / join mode** | decides which of those are shown |
| 3 | **Sort's novelty floor** | decides which of those qualify to be ranked |
| 4 | **`Score against`** | decides what the floor was measured against |

Within 2, the **join mode** is named rather than the pips when the mode is the cause — that is,
when the row would survive under `Contains`. Otherwise the pips are named.

### The sentences

**Scope.** The commander has a deck built around it, so it is not a candidate.

> **Brago, King Eternal** matches, but you have already built a deck around it.
> `Switch to Commanders I own`

**Colour pips** (mode is not the cause):

> **Krenko, Mob Boss** matches, but the **Green · Black** colour filter excludes it — its identity
> is Red.   `Clear the colour filter`

**The floor and `Score against` need `held*` variants too.** §2b's list-level state can be caused by
any of the four controls, and R3's copy file defined only `heldColors`, `heldJoin` and `heldScope`.
Added: `heldFloor` and `heldPool`, in the same "It matches, but…" shape.

**Join mode** (would survive under `Contains`):

> **Atraxa, Praetors' Voice** matches, but **Exactly** Green · Black excludes it — its identity is
> White · Blue · Black · Green.   `Switch to Contains`

**The novelty floor:**

> **Prosper, Tome-Bound** matches, but **Something new** only shows commanders you could build, and
> you own **12%** of its support list against the 30% floor.   `Rank by best fit instead`

**The pool** — the row falls below the floor here, but would clear it against the collection:

> **Prosper, Tome-Bound** matches and would clear the floor against everything you own — but not
> against the **214 free cards** in this pool.   `Score against everything I own`

**R6 restores the comparative clause R5 cut, and it is now also the discriminator.** R5 removed it
because asserting the row's standing in the *other* pool meant a second ranking pass. Hugh's
decision supplies the same fact from **one extra column in a query that already runs**, so the
sentence says what the R4 draft wanted to say — truthfully, and at a cost engineering has accepted.

**A pool exclusion is the floor's sub-case, not a fifth cause.** Cutting the clause in R5 also took
the pool keys' only trigger: the precedence table puts the floor above `Score against`, so the floor
branch won every time and `pool`, `poolAlso` and `heldPool` could never fire. The selection is now
one flag —

    floor is the cause AND clearsAgainstCollection  →  excluded.pool
    floor is the cause                              →  excluded.floor

— which leaves the four-tier precedence order untouched and makes the pool strings reachable.

**The free-card count stays**, because it is one figure the payload can add and "this pool" without
its size is a denominator the player cannot check.

Each names the control in the words the control uses. `Something new`, `Exactly`, `Commanders I
own` and `What's free` are all quoted from their own labels — a sentence that renames a control is
a sentence the player has to translate.

---

## 4 · The exclusion line

The non-empty counterpart of the states above: the list worked, and it still removed things.

**Geometry.** Between the bar and the first row, at the list's own padding (`0 34px` desktop,
`0 14px` mobile). Leading 6px `rotate(45deg)` `--border-strong` diamond, gap 10px. Mono 11.5px
`--fg-faint` (10.5px mobile), `line-height 1.6`, figures `--fg-body`. No accent.

**Clause order is tier order** — colour or mode, then floor — **never magnitude order.** Two clauses
at most, joined ` · `.

**There is no scope clause, and R2 deletes the key R1 wrote for it.** Under the discovery scope
every built commander is excluded by scope on every load, so a scope clause would render always —
against "absent when nothing was excluded" below — and it would report the plane’s own definition
as a loss. The subtitle already states the population. Scope still names itself in the
*excluded-match* sentence (§3), where the player searched for a specific row and it went missing.

**The floor prints its percentage in both forms** — the two-clause one and the floor-only sentence.
The floor is claimed nowhere without being printed; §6’s rule has no exceptions.

| Active | Line |
|---|---|
| Colour + floor | `1,622 excluded by the Green · Black colour filter · 1,047 fall below the 30% support floor for this pool and 212 have no tags to measure` |
| Floor only | `3,089 commanders fall below the 30% support floor for this pool and 212 have no tags to measure. The closest is at 22%.` |
| Colour only | `1,622 excluded by the Green · Black colour filter` |
| Exact mode | `3,265 excluded by the exact Green · Black identity` |
| Unmeasurable only | `212 commanders have no tags to measure against your decks` |
| Nothing | **the line does not render** |

### The sort removes two populations, and both are named

Under `New`, two groups leave the list: rows whose distance was **measured and fell below the
floor**, and rows with **no tag data to measure at all**. R4's line counted only the first, so
`printed total − excluded` did not equal the rows on screen, and the second group was named nowhere
in the handoff.

**Both share one clause, with two figures.** They are the same tier — the sort's own doing — so
pairing them inside a single clause keeps tier order intact and leaves the second clause free for
colour. `exclusion.floorWithUnmeasured` and `.floorAloneWithUnmeasured` carry both; when there are
no floor casualties, `.unmeasuredAlone` carries the group by itself.

**Rejected:** *printing a denominator that already excludes the unmeasurable* hides a population the
player can act on — switching to Best fit ranks those rows, because fit needs no tag history — and
*dropping the arithmetic relationship* would make every figure on a surface built on printed
denominators unverifiable. Naming the group costs a few words; the other two options cost the
premise.

**"No tags to measure" rather than "no data".** The player's mental model is the archetype tags they
see on every row; "no tag data" is the system's account of the same fact. The sentence says what is
missing in the vocabulary the rows already use.

**The nearest-miss clause** (`The closest is at 22%.`) appears only when the floor is the sole
exclusion — it is the sentence §4.4 models, and it is a second sentence rather than a third clause.
With two clauses there is no room for it and the empty state is where it matters.

**Absent when nothing was excluded.** No "0 excluded", no reserved height: missing data is omitted,
never zeroed, and an absence of exclusions is missing data.

**Not a live region.** The page's existing live region announces the re-rank; announcing the
exclusions too would report one event twice.

### The one-report rule, 375px only

At 375px **at most one thing below the bar explains the list**:

1. **The excluded-match aside outranks the exclusion line.** The aside names a row the player just
   typed; the line describes the pool. When both would render, the line does not.
2. **The exact note is suppressed whenever a report already names the mode** — otherwise the same
   fact prints twice, about 100px apart.

Desktop renders both: it has the width and no viewport problem. The rule exists because the worst
reachable phone stack reaches 605px without it — 503px with it, against shipped’s 330px. The
measurement and the open call it leaves with Hugh are in `CONTROLS-six-above-one-list.md`.

### The window count is not relocated

**The displaced row is `WindowCount`, and it is not relocated.** The row search takes on mobile
says "25 shown · 3,301 more below" (`filter-bar.tsx:420-427`) — **not** `revealBand`, which is a
prop of `RevealControl` rendered inside the `<ul>` after the sliced items
(`discovery-view.tsx:316-333`). R1–R3 confused the two, and R3's promise that the count "keeps its
words on the line beneath" was wrong twice: the figures differ, and **the bar has no line beneath
that row**.

`revealBand` is untouched by this handoff and keeps both clauses. Design's position on
`WindowCount` is that `RevealControl` already states the same fact inside the list, where the player
acts on it, so the bar need not say it twice — **but that is a deletion of shipped content, and it
is blocker 6.** The match figure appears once; **where** it appears is blocker 7.

---

## 5 · The two floor states

### 5a · The floor took everything, and the pool is why

The shipped `FloorEmpty` offers *the other sort*. When the pool is the cause it offers **the other
pool**, because that is the control that took the rows.

> **Nothing clears the bar for "new" against free cards**
>
> Something new only shows commanders you could actually build — **at least 30% of their support
> list already in your collection**. Read against the **214 free cards** in this pool, 3,114 of the
> 3,326 fall below that bar and 212 have no tags to measure. **1,679 of them would clear it against
> everything you own.**
>
> `[ Score against everything I own ]`

**The populations sum to the pool.** R5 fixed this on the exclusion line and left the same fault
here: "3,301 of the 3,326" leaves **25 unaccounted for**, which reads as 25 rows that cleared, in a
state whose entire premise is that none did. 3,114 + 212 = 3,326, and the state can be checked
against its own heading.

**The last clause is the CTA's evidence.** "1,679 would clear it elsewhere" is what makes
`Score against everything I own` an offer rather than a shrug — the same
`clearsAgainstCollection` flag that discriminates `excluded.pool`, so it costs nothing extra. The
nearest-miss percentage is dropped from this state: with a comparative figure available, the closest
miss is the weaker of the two facts, and two figures plus a threshold is already the state's limit.

Two doors out, both honest: change the pool, or change the sort. **Still never a looser floor** —
the floor is what makes `new` mean buildable, so loosening it on request would leave the sort
saying nothing.

**The comparative figure is back, as the body's last clause.** R2's `ctaNote` ("1,704 clear it
there") and R4's "clears the floor against everything you own" were both cut because knowing a row's
standing in the pool the player is *not* in meant a second ranking pass. `clearsAgainstCollection`
supplies it from one extra column, so the figure now sits **inside the body** rather than in a
separate aside — one sentence, one voice, and it is the evidence the CTA rests on.

### 5b · The floor took everything, and the collection is why

The shipped state, unchanged except for the floor becoming a printed figure rather than a constant:
`floorHeading` and `floorBody` as they ship, with `floorPct` now sourced from the scaling function.

---

## 6 · The floor as a figure

§4.4 makes the threshold a function of the pool, which turns `NOVELTY_FLOOR` from a constant into a
value. Every figure prints its denominator, so the floor prints wherever it is claimed:

**Seven call sites. This table is the contract.** R2 gave the count as three, five and six in
different files; R3 settled on six and still missed one — §5b changes the *collection*-variant
`FloorEmpty` to take the scaled figure, and that site (`emptyCopy.floorBody` / `.floorEmphasis`,
rendered at `discovery-view.tsx:243-248`) hardcodes `Math.round(NOVELTY_FLOOR * 100)`. Absent from
the enumeration it would keep the constant while the other six scale.

| # | Site | Key | String |
|---|---|---|---|
| 1 | Row, desktop | `floorNote.long` | `clears the 30% floor — you own 41% of its support list` |
| 2 | Row, mobile | `floorNote.short` | `clears the 30% floor — you own 41% of its list` |
| 3 | Exclusion line, two-clause | `exclusion.floor` | `1,047 fall below the 30% support floor for this pool` |
| 4 | Exclusion line, floor-only | `exclusion.floorAlone` / `.floorAloneWithUnmeasured` | `3,089 commanders fall below the 30% support floor for this pool and 212 have no tags to measure. The closest is at 22%.` |
| 5 | Pool empty state | `floorPool.body` / `.emphasis` | `at least 30% of their support list already in your collection` (+ the comparative clause) |
| 6 | Excluded match | `excluded.floor` / `.floorAlso` | `you own 12% of its support list against the 30% floor` |
| 7 | **Collection empty state** | `emptyCopy.floorBody` / `.floorEmphasis` | shipped strings, but `Math.round(NOVELTY_FLOOR * 100)` at `discovery-view.tsx:243-248` becomes the scaled figure |

**One source, seven call sites, and they must agree.** Site 7 is a **second shipped-string edit's
worth of change** in the sense that matters to engineering: the string is unchanged, the *value it
interpolates* is not.

**Naming, so this is unambiguous at the call sites:** `floorPct` is used in this handoff for **the
threshold**, and `novelty.ts:15-18` uses the same name for **a row's own support percentage**. In
every string above, the threshold is the argument named `floorPct` and the row's own figure is
`pct`. Engineering should expect to rename one of them; Design's preference is `floorPct` for the
threshold and `supportPct` for the row's, since the row's is what `novelty.ts` computes per item. The number the ranking applied is the number
every sentence prints. Design does not set the scaling function — gap 1.
