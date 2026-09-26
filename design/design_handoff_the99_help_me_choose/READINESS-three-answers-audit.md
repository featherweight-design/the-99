# Readiness audit: Help me choose, three answers (`addendum-three-answers/`)

**Verdict: 🟡 Yellow.** One Design item is open: the row state for a commander matched on its type
line with no share to show (finding D1). Everything else is buildable from what is drawn, and the
engineering findings below resolve without a round trip. Audited 2026-09-27 against `origin/main`,
with #1059 (the never-zero note and the type-line tribe match, in review) read as the base the
build starts from. The drop is committed on `design/hmc-three-answers` as additions only.

Figures are from staging, read-only (`pnpm measure:intake-tribes` in #1059, and direct queries).

## Scope

- **In scope:**
  - `ADDENDUM-README.md` and `READINESS.md`;
  - `addendum · copy strings.ts`;
  - the canvas `The 99 - Help Me Choose · Three Answers.dc.html` (§A0 to §A4);
  - the frames `Help Me Choose Answers.dc.html` (scenes `hugh`, `hughform`, `hughnarrow`, `hughzero`).
- **The parent handoff is unchanged.** The export deleted it on main and the orchestrator restored
  it there; this branch adds the subfolder and this audit only.
- **About entry: an ordinary edit, no new entry and no bump.** `help-me-choose` in `about.ts` is
  switch-bound (`HELP_ME_CHOOSE_ENABLED`). Its caption lists the answers ("colors, a theme, a
  budget, a bracket, a card to build around, or a sentence"), so it gains the three new ones:
  any-of themes, sets, and the 99 from cards you own. The addendum draws no entry change and
  needs none, because an edit to an existing entry's words goes to `/copy-review`.

## Findings

### Design (one)

**D1. No row state for a type-line match with no share.** #1059 admits a commander whose type line
carries the tribe, but only when its EDHREC share rounds to 1% or more, because a row can print only
a percentage and "0% Dwarves" beside a Dwarf contradicts the match (the orchestrator's call). For
Hugh's own ask that rule holds back most of what he asked for. Of the tribal legends printed in HOB
or HOC:

| Tribe | Carry it | Backed by a measure | By the type line | Held at 0% |
|---|---|---|---|---|
| Dwarves | 21 | 8 | 3 (Bombur, Nori, Thorin) | 10 (Bofur, Dori, Óin, …) |
| Elves | 10 | 8 | 0 | 2 |
| Wizards | 7 | 4 | 0 | 3 |
| Orcs | 0 | – | – | – |

The addendum lists type-line matching under "Not drawn" as engineering's, but the row it produces
needs a figure that isn't a percentage (for example, the type named in place of a share), and
the SETS RANK and dimming rules need to say how such a figure ranks.

Engineering recommends limiting that state to thin commanders, those under the 27-deck floor.
Across all commanders, 294 type-line matches round to 0%, and many are large commanders whose
decks don't play the tribe: Nekusar and Gandalf are Wizards, and Wizards alone holds back 192.
Until D1 is drawn, the build ships #1059's rule and those rows stay out.

### Engineering (all resolved here)

1. **`widenWhy` states a data fact, so it is computed, not written.** "No commander's decks are more
   than two of {names} at once" is true today only by measure: one staging commander backs two of
   Hugh's four tribes, and none backs three. The build computes the most themes any candidate backs
   at once, by the same `backing` rule #1059 ranks with (type line included), and states that
   number, or drops the reason line when the count is 1. The wording goes to `/copy-review`. It also
   says "decks", which a type-line match makes loose.
2. **Sets share one set-matching query with filter-chassis `Printed in`.** That dimension is
   decision 9's "any printing", cut from the chassis's first round and not yet built. The build
   adds one predicate module (`printedIn(setCodes)`: a commander has a printing whose `set_code`
   is in the list, over `printings_oracle_set_idx (oracle_id, set_code)`). Whichever lands first
   owns it, and the other imports it. Codes are stored lower-case (`hob`, `hoc`); the chip prints
   them upper-case. On staging, HOB prints 48 indexed commanders and HOC 31.
3. **The never-zero note and *Any of the N themes, not all* are one mechanism.** `narrowOptions`
   already runs every offer (removals, and the colors widen) through one list: counted, filtered to
   `n > 0`, sorted by count, capped at three. The any-of widen joins that list as a third kind,
   counted by `passes` under the any-of join, so it can never read 0. #1059's size-ordered removal
   search also stops early when the any-of widen alone reaches the floor. For Hugh's ask the widen
   then leads, as the addendum draws.
4. **"58 of its usual 99 are yours" costs nothing new.** Every row already runs a trial fill
   (`trialFill`, `trial.ts`) whose `owned` is how much of the would-be 99 the player owns. That
   is the usual 99, from the ordinary pool. A separate top-99-by-inclusion query was measured at
   **1,060ms** across the 3,381 indexed commanders (a 40MB sort spilled to disk), which is why the
   figure comes from the trial the row already runs, per shown row. Under own-only the trial keeps
   the ordinary pool for this line; the fill that builds the deck is the one that goes own-only.
5. **Azog is a placeholder with no real counterpart.** No legendary Orc is printed in HOB or HOC on
   staging. Tests and probes use real commanders: Thorin, Bombur and Nori (Dwarves), Thranduil
   (Elf), Gandalf and Radagast (Wizards).
6. **Free-matching a bare set code would misread words.** `all`, `big`, `one`, `war`, `who`, `ice`,
   `fin` and `mid` are all set codes, so "a big deck with all the wizards" would read two sets. The
   free match takes a set **name** anywhere, and a **code** only as typed in capitals or beside
   "set(s)". Hugh's "the HOB or HOC sets" meets both conditions.
7. **"or" is a stop word today.** `match.ts` drops it silently, so the any-of reading needs the
   parser to keep "or" as a join between two theme matches before stop words are dropped. The
   addendum's rule (one join for all themes, and the control wins at two or more) is otherwise
   buildable as drawn.
8. **The build-around card under own-only.** The addendum doesn't say what happens to an unowned
   build-around card when the 99 comes from owned cards. It is an explicit answer, so it stays in
   the deck and is priced with the commander, and the budget caps the commander plus that card. The
   caption's "caps the commander only" is true whenever no unowned card is asked for; the wording
   of the exception goes to `/copy-review`.
9. **A frozen lead now reads wrong in one case.** `narrow.fewLead`, *Loosen one answer to see
   more:*, sits above offers that can drop two answers or keep one (#1059). That only happens when
   1 to 3 commanders pass and no single drop reaches 4. The string is quoted verbatim in the R1
   handoff, so #1059 kept it. This addendum is the place to change it, as a ratified divergence
   through `/copy-review`, not a Design round trip.

## Copy

`addendum · copy strings.ts` is marked PLACEHOLDER and owed to `/copy-review`, together with
findings 1, 8 and 9 and the About caption edit.

- **`widen` spells numbers only up to four.** It falls back to a digit past four ("Any of the 5
  themes"), which reads inconsistently. `/copy-review` decides the form.
- **`chipAria`** joins with "or", with no Oxford comma, which matches `nameList`.
