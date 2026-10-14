# READINESS — Explaining the recommendation (R3, after the R2 re-review)

**Self-assessed: 🟠 Amber. One product decision blocks, and §4.3 is a numeric change, not a caption
change.**

Two audits have now found the same class of error in this handoff, twice from me: **a claim that
something was free.** R2 corrected the committed mark, which needs a read this route does not make.
R3 corrects §4.3 itself. The pattern is worth naming because it is the reviewable failure here —
I read the components for geometry and inferred the data and the arithmetic instead of reading
`score.ts` and `format.ts` line by line. Every "unchanged" and "no-op" in the four documents has
now been checked against source rather than asserted.

**What R3 corrects:**

| Was | Is |
|---|---|
| the fit bar is byte-identical; §4.3 is two strings and a rounding | `format.ts:27` is `Math.min(score, 100)` — delete the rescale and the bar renders at **32%**, not 80%. Keeping 80% is a change in `fitSegments`. |
| — *(not mentioned at all)* | the score is a **sort key** (`recommend.ts:214`, `store.ts:182`). Raw 0–40 scores **re-rank the owned list and the home hero.** Blocking, and not a design call. |
| "auditable by addition" holds; only the string changes | segments round to one decimal and the total rounds separately, so `12 + 20 + 42` sits under a hero of **75**. Needs an integer-rounding rule and a backfill. |
| three sort options | **two.** `RoleCard` has no rank, and `score.ts:144` already sorts by inclusion — two of the three were one behaviour. |
| `chipAria` appends to `Sol Ring, 94% inclusion` | shipped is `View details for Sol Ring. In 94% of decks.` (`recommendations.ts:32-35`). R2 **replaced** it, dropping the affordance clue, and missed the third branch. Now a suffix. |
| ramp: 11 owned, 5 visible, `+6 more` | impossible — `COVERAGE_CAP` is 12/6, so 11 renders whole and the overflow is negative. Redrawn at **17 owned**: 12 visible desktop `+5 more`, 6 visible phone `Show all 17`. |

Plus the smaller residue, all closed: the locked-constraints block said the no-synergy state prints
40 (it prints 32); the ramp panel was drawn in an order `byInclusionThenName` does not produce and
then asserted to be the shipped one; the badge and README title still said R1; PROSE's two example
sentences measured 120 and 126 against stated 119 and 125; the segment weights were called constants
when they are inline literals; sentence 3's joiner and terminal period belonged to no key; and the
copy module's own header still carried two R1 rules (`ROLE_NOUNS` for the sentence noun, and a
legend reading "3 of the 11 here") contradicted by the corrected code below them — as did STATES,
which specced the synergy dot at 1.5px two lines above prose saying it ships at 1px.

## Blocking — one, and it is not ours

1. **Deleting the rescale re-ranks the product, and that is a decision about what the app
   recommends.** `recommend.ts:214` sorts on `score` via `byScoreThenOracleId`; `store.ts:182`
   orders the persisted list by `desc(commanderScores.score)`. A no-synergy commander that stored a
   rescaled **80** stores a raw **32**, so it does not merely print differently — **it falls down the
   ranking**, moving the owned list's order and the home hero's first item.

   **Raising it, not resolving it.** Both answers are defensible:

   - **Let it fall** — a commander EDHREC cannot see has less evidence behind it, and ranking it
     beside one that earned 80 of 100 measured points is the same fabricated comparability §4.3
     exists to remove, in the ranking as well as the caption.
   - **Keep the order** — a data gap that is not the player's fault should not bury a commander their
     collection genuinely fits, and the ranking is what the product is for.

   If the answer is "keep the order", the shape is a separate `rankScore` retaining the rescale for
   ordering while `score` + `measurableTotal` carry the honest display pair. **That is more code
   than §4.3 implies and it belongs in the estimate, not a follow-up.** Nothing in this handoff's
   drawn output changes either way — which is why it blocks the estimate rather than the design.

## Also numeric, and specified here

2. **The rounding rule (README 1b).** Round each segment to an integer and define the score as the
   sum of those integers — so the key's equation is true **by construction at every commander**,
   not on average. Cost: stored scores move by up to ±1.5, so `commander_scores` needs a backfill,
   and combined with item 1 it can reorder ties. **No document says whether that backfill rides the
   index build or runs as a one-off**, and the two have different blast radii against a list users
   have already seen. The fallback is printing one decimal everywhere — true, checkable, and four
   decimals of noise in a 52px figure. Rejected, but honest.

3. **`format.ts:27` changes** — `pct = 100 * score / measurableTotal`, and `fitSegments` takes the
   denominator. Small, and it is the difference between the drawn 80% bar and a 32% one.

## Blocking — carried from R2, still open

4. **The committed mark has no data path on this route.** `page.tsx:36-40` is over role lists
   (`Object.values(commander.roleCards).flat()`), not decks; the route imports
   `resolveCommanderSlug`, `getRankedList`, `scoreOneCommander` and `readSynergyCards`, with no
   `loadAvailability`, and `scoreOneCommander` loads the collection pool and the EDHREC cache only.
   Neither carrier has a slot: `RoleCard` is `{ oracleId, name, inclusionPct }` and the synergy card
   carries `owned` alone.

   **What it needs** — one aggregate over this user's deck membership returning a set of oracle ids
   plus one deck name each, joined against ids the page already holds; one query, not per chip; no
   change to `scoreOneCommander`; plus one field on each of two carrier types. The same set answers
   all ten rendered surfaces **and** sentence 2's committed count, which is what keeps the sentence
   and the dots from disagreeing (gap 7).

   **The slice split, updated by R3's item on the sort.** R2 put the sort control in slice A; with
   *Availability* removed, slice A's menu would hold a single option, so **the whole control moves
   to slice B**:

   | Slice | Contents | Data change |
   |---|---|---|
   | **A** | the `/40 measurable` denominator, the key, the legend's points-over-weight | none in the mark's sense — but items 1–3 apply: `format.ts`, the rounding rule, and a `commander_scores` backfill |
   | **B** | the committed mark across all ten surfaces, the panel legends, the aria suffix, sentence 2's committed clause, **and the entire Role Coverage sort control** | one aggregate + two carrier fields |

   Slice A is #342's complaint and #366's bug. Slice B is #346 and #347 together.

## Needs a ruling — two more

5. **The owned list is now openly sorting across two scales, and this handoff does not draw the
   row.** §4.3 names the consequence and hands it forward; the row is another surface's committed
   table. Two answers, both cheap:
   - **A list-level line**, the plane handoff's exclusion-line shape:
     `14 of these are scored out of 40 — EDHREC doesn't index them`. One element, one string,
     already-available count. **Design's preference.**
   - **Per-row denominators**, so a row reading `32` carries `/40` the way the hero does. Honest and
     it changes `RecCard`'s fit column, which the discovery handoff just settled.
   Doing neither is the option to reject explicitly: it is a smaller lie than the fabricated 100,
   but it is the same kind of lie, and the audit will find it.

6. **Which gap is "the single largest" is a rule, not a fact, and §4.2 does not give one.** This
   handoff uses `argmin(roleCounts[role] - ROLE_TARGETS[role])`, ties broken by `ROLE_ORDER`.
   That treats board wipes at 2/10 and ramp at 8/10 as the same shortfall of 2. If eng weights the
   gaps — by role scarcity, by how much each costs to close, by the role's share of the 25 points —
   **the paragraph's sentence and its anchor point somewhere the section's own emphasis does not**,
   and the sentence is stored prose's neighbour. One line of copy either way; the ruling is which
   role the sentence names.

## Not blocking — §0 does not gate the prose

**The brief says so in as many words.** The material is precomputed (`commander_support`: `engine`,
`tags`, `bracketCounts`, `budgetCounts`, `similarOracleIds`, `deckCount`, `rank`, `saltScore`,
`synergyState`; `commander_support_cards`: `inclusion`, `synergy`), and the per-user figures are
already computed at request time. **What is missing is the generator, which has an eng cost and no
design dependency.**

**The prose-absent state is drawn as a normal state on both surfaces, at both widths** — the
denominator, the key, the mark and the sort all ship without a single paragraph existing. Note the
one dependency in the other direction: **sentence 2's committed clause needs slice B's read**, so on
slice A the paragraph renders with sentence 2's no-deck form.

## Called, not asked — flagged for the record

7. **The segment number is raw points over the segment's weight**, not a share and not a percentage
   of ceiling. The argument is that `12 + 20 + 42 = 74` makes the headline number auditable by
   addition, which is the shortest possible answer to #342 — and that points are the only form that
   prints the weights, which are what the key exists to teach. **This is what makes item 2
   load-bearing rather than tidy**: the claim is only worth making if the equation is true, and today
   it is not. If the audit prefers percentages of ceiling, the key's closing sum line goes with them
   and the hero stops being checkable; say so explicitly rather than keeping both.

8. **`absent` and `degraded` print the same `/40 measurable`**, and — corrected from R1 — **the same
   note geometry**: `detail.tsx:186-191` renders one note for both non-`ok` hero states, so the two
   differ in their clause alone. The `2px --fg-faint` / `3px --warning` weight distinction R1 cited
   belongs to `coverage-section.tsx` and is not borrowed into the hero.

9. **The hero has no Retry and does not gain one.** R1 drew one inline in the D2 frame and annotated
   it "unchanged"; the page's only Retry is `coverage-section.tsx:411`. **Role Coverage owns the
   recovery** — a successful retry there re-renders the hero at `/100`, and the visible score goes
   32 → 74. Called, not hidden: it is the honest outcome of two denominators and why both print
   theirs.

10. **One shipped element is deleted.** The `Synergy —` placeholder chip in the legend row. At `/40`
   there is no missing third of a hundred for it to explain, and it is the one element in the hero
   below AA (9.5px `--fg-locked`). If the audit wants a third legend entry retained, the denominator
   argument has to be reopened with it.

11. **The committed mark reuses `--avail-hard-fg` rather than introducing a hue.** It is the token
   the availability receipt already spends on `N already in use`, which is the same fact about the
   same cards. See item 17 for the theme caveat — which R1 stated backwards.

12. **One sort control governs four panels, and it now offers two options, not three** — `Most
    played` (the shipped order, named for what `byInclusionThenName` does) and `Availability`.
    R2's third option named a field `RoleCard` does not carry and duplicated the second, because
    `score.ts:144` already sorts every figure-bearing panel by inclusion. Corrected in README 7b.
    **Ruling 8's justification for a menu is gone with the option that needed it** — there is no
    disabled row any more — so a segmented control is now a reasonable alternative, with the two
    sub-lines moving to the panel note. Design still prefers the menu for those sub-lines; it is no
    longer a strong preference. If the audit prefers per-panel controls instead, that is four
    triggers, four states and a page that can hold ramp by inclusion and draw by availability at
    once.

13. **§7 is answered "the stack holds", with one anchor added.** No tabs, no accordion, no
    reordering. **+355px on a 2,246px body** at 375px — R1's intro said "about 230px on a 2,270px
    page" against its own table's +355 / 2,246; the table was right and the prose is corrected. None
    of the additions is a container. The three rejected restructures are drawn in section G; the
    strongest argument is that tabs break the one relationship the key exists to teach.

14. **The paragraph is one string on two surfaces, with a band and a front-loading rule.** Answered
    in full in `PROSE-one-string-two-surfaces.md`. **The threshold is corrected to 55 characters**:
    R1 measured the 375px home-card column at ~233px and derived 70 from it, but the shipped column
    nets ~183px once the dashboard wrapper's padding, the 84px art column and the info area's padding
    come off 375 — which R1's own §9 had warned would force the threshold down. **Re-measure in the
    browser before the generator runs**; it is now the tightest constraint in the contract and there
    are only ~3 characters of slack. **A short second string for the home card stays rejected.**

15. **55 characters may be too short to be commander-specific, and that is a live question.** About
    nine words at 375px. If the generator cannot reliably say something true only of this commander
    inside it, **the honest answer is a shorter home-card treatment — one clamped line, or none —
    not a looser threshold.** Worth settling before ~3,300 paragraphs are written, because it is the
    one remaining decision that a re-backfill would be the cost of getting wrong.

## Not blocking, and worth reading before estimating

16. **`score.ts:172-184` loses the rescale, and the denominator becomes data.** Not a render-time
    branch — the list needs the same value (ruling 5) and so does `format.ts` (item 3), so
    `measurableTotal` travels with the score. `segPct` (`detail.tsx:53-56`) is deleted and nothing
    replaces it. **The three segment weights are inline literals, not constants** — `* 15`, `* 25`,
    `* 60` at `score.ts:179-181`; R2 called them constants. Naming them is part of this work, since
    the key prints them and `fitSegments` returns them, and three call sites would otherwise each
    carry their own copy of the number.

17. **`--avail-hard-fg` equals `--accent` in exactly one theme, and the mark's clearance against
    `--success` is unmeasured.** R1 said three themes and cited "ΔE 0.13" as proof of clearance — it
    overstated the first and mis-stated the second, since a ΔE that small means indistinguishable.
    Corrected against `globals.css`: the collision is **Innistrad alone** (`#8AAFA1` for both, which
    the themes handoff records as deliberate); **New Phyrexia is not a case** (`#77A9A0` dot against
    `#52827A` accent) and neither is Duskmourn (`#54ADDD` against `#49A9DC` — close, distinct).
    Innistrad is safe **structurally, not numerically**: nothing in a role panel or the synergy panel
    paints a dot or a chip border in `--accent`, so the mark never sits beside an accent dot of the
    same hue. **That is a fact about the current panels, not a contract** — a future accent-coloured
    element inside one would collide.
    The pair that matters is **`--avail-hard-fg` against `--success`**, which do sit side by side in
    one row. Tightest is Innistrad, `#8AAFA1` against `#679F5F`: separated in hue rather than
    lightness, the separation a 7px dot can least afford. **ΔE00 for all six pairs is owed and
    Innistrad is the one that could fail.** If it does the fix is a token, not a redraw — the legend
    carries the count in words and the accessible name states the deck, so the panel reads correctly
    either way.

18. **The theme question.** Section H draws the six in `globals.css` and named in §3.
    `design_handoff_the99_theme_replacement` R6 retires Innistrad and Duskmourn for Ixalan and
    Eldraine. If it lands, two cards swap accent hue and **the only element here needing
    re-measurement is the committed dot's ΔE against the new `--success`**; no geometry in this
    handoff is keyed to a hue.

19. **`FitHero` becomes a client component** for one boolean (the key's open state). It has no other
    client need, so this is the smallest possible conversion. It is already rendered twice (phone,
    desktop) and **the two instances hold independent state**, which is correct — only one is
    visible.

20. **Nothing in slice A makes a request; slice B does.** R1 claimed the whole handoff added none.
    True for the paragraph (a stored column read with the commander) and for the sort (a client-side
    reorder of an array already in the payload); **false for the mark** — item 4. Still nothing
    streamed, suspended or skeletoned anywhere.

21. **The sort gets `CoverageSection`'s own `aria-live="polite"` node.** R1 said "the region the page
    already owns"; there is no shared region — `synergy-selection.tsx:222-243` derives its
    announcement wholly from pick state and owns it. One region per section, which is also what
    survives both widths being rendered at once.

22. **Three copy signatures were wrong in R1 and are fixed in the module.** `standing` took a
    `possessive` pronoun that exists nowhere in the schema or in any computed value (and cannot be
    derived from `name` — Kess's, Atraxa's, The Ur-Dragon's); the construction now avoids needing
    one. `gap` declared two arguments it never used. And **prose figures now spell out**: `committed`
    and `target` go through `spellOut`, so the keys emit "twelve" and "ten-source" as the frames draw
    them rather than "12" and "10-source".

23. **Sentence 3 takes its own subject-form role map.** `coverage-section.tsx:26-31` ships
    `ROLE_NOUNS` singular and attributive (`wipes: "board wipe"`) for "No board wipe cards in your
    pool". R1 specified that map for this sentence, which produces **"board wipe are where you are
    thinnest"**. The copy module adds `ROLE_SUBJECTS` and leaves the shipped map untouched — three of
    its four entries are identical, and `wipes` is the one that cannot be shared.

24. **The committed legend counts visible chips, both figures.** R1's note said "among visible" and
    its frames printed the role's total (`3 of 11` beside four visible chips, one marked) — which
    explains dots the cap is hiding, the one thing the shipped render condition exists to prevent. It
    now reads `2 of the 5 shown`, and **"shown" is what makes the denominator unambiguous.**

25. **The synergy panel's unowned dot ships at `1px`, not `1.5px`.** R1 drew 1.5 inside a table
    claiming the swap was "the same two declarations" on every surface. Corrected: **the unowned dot
    is not touched by this handoff at all** — only the owned fill is, and the claim now holds on nine
    of the ten surfaces with that one stated exception.

26. **#346 names five panels, which is ten rendered surfaces.** Four role panels plus the synergy
    panel, at two widths each. R1's STATES called it "five surfaces", conflating panels with renders.

27. **The committed flag is one aggregate per request**, not one lookup per chip, and it resolves
    alongside the exclusion pass rather than inside it (item 4). The deck named in the accessible
    name is the **first** deck, not a list — severity, not inventory — and it comes from the same read
    as sentence 2's count, so the two cannot drift.

28. **The generator's contract is three mechanical predicates** (character count, sentence count,
    first-break position) plus a hedge-vocabulary check. **A failing string is rejected, never
    truncated**, and that commander falls to the prose-absent state. Written out in
    `PROSE-one-string-two-surfaces.md` §4.

29. **The comma predicate does not catch a leading subordinate clause**, a hole R1's own failing
    example walked into: *"Built around cheap draw, recursion and a graveyard nobody else is using,
    Kess decks win by…"* has its first break at 23 and its claim at 124, so it passes the check and
    fails the reader. Catching it needs syntax, not position — **the prompt should require the
    sentence to open with its subject**, and review is the backstop. The checks enforce the shape a
    front-loaded sentence has; they cannot verify that the shape holds the claim.

30. **A prose band cannot be enforced against meaning.** The checks cannot catch a hedged sentence
    that says nothing true only of this commander. §4.1 constraint 1's review-before-ship is the
    mitigation, and **~3,300 paragraphs is a real review queue nobody has costed** — no admin
    surface, no per-commander flag, no way to reject one paragraph without a regeneration. Out of
    scope; it is the operational gap behind constraint 1.

31. **Sentence 2's "already in" count and the committed dots are the same fact in two places** — and
    now provably one source, since both come from item 4's read. Kept on the list because the
    *scoping* still has to match: the paragraph counts across all decks and the mark names the first,
    so a player counting dots must arrive at the paragraph's number.

32. **The sort is not persisted and the anchor is.** Arriving from the paragraph's link lands on a
    panel in whatever order the section last rendered — on a first visit, EDHREC rank, whose visible
    six can all be committed. Availability-first *on arrival from the anchor* was considered and
    rejected as too clever. Flagged.

## Not blocking

- No new token, no new hex, no new motion class, no new modal, no new empty state, no new component,
  no tooltip, no toast, no popover, no help page. **One new *element*** — the key panel — built from
  disclosure furniture already on the page.
- **The Fit Hero, its bar and its three-token gradient are untouched** (must-not 1): same card, same
  padding, same 12px bar, same `--accent-dim` / `--accent-mid` / `--accent` ramp, same 52px figure,
  **and one note geometry for both non-`ok` states, as shipped**. The changes are two strings in the
  denominator slot, one string per legend entry, one trigger appended to the legend row, one clause
  appended to the note, and one placeholder chip removed. **No Retry is added.** The bar's drawn
  geometry in the `/40` states is identical to what ships at 80% of track — but holding it there is
  a change in `format.ts:27` (item 3), not the no-op R1 and R2 both claimed, and the legend's
  integers depend on item 2's rounding rule.
- **The paragraph is never required** (must-not 3): three of its four states render without the
  generated sentence and one of them unmounts the section.
- **The per-user clause is never a buy prompt** (must-not 4): no price, no card names, no
  acquisition, no chip, no CTA. Sentence 3 names the weakest role and nothing else.
- **#366 is not solved with a hover-only tooltip** (must-not 5): a real `button` with
  `aria-expanded` / `aria-controls`, 44px effective target at both widths, no hover dependency
  anywhere in this handoff.
- **The paragraph states no card interactions and no rules text** (must-not 2): the contract forbids
  card names outright and requires the hedge; the subject is the commander's *decks*, from `engine`
  and `tags`.
- `CoverageSection`'s headings, sub-captions, notes, retry, baselines and disclosures;
  `CoverageChip` / `CoverageRow` / `CoverageDisclosure` geometry; `SynergyPanel`'s ownership bar,
  sub-caption, facet strip, legend, column header and disclosure; `FacetStrip` entirely;
  `HeroCommander`'s art column, pips, name, completeness row and fallbacks: **untouched in geometry
  and, except for the two hero notes and the four appended legend lines, in strings.**
- Every figure in the canvas is internally consistent **and drawn against the real caps**: pool
  12/15 + roles 20/25 + synergy 42/60 = 74/100 (integers, per item 2); the same commander with
  synergy absent is 32/40 measurable at 80% of track; 34 of the top 100 owned with twelve committed;
  board wipes 2 owned against a ten-source baseline, both under the cap so no disclosure; ramp 17
  owned — 12 visible desktop with `+5 more` and 3 of the 12 marked, 6 visible phone with
  `Show all 17`. Card names are real, all figures fabricated.
- The 99 appears nowhere as a denominator. `/100` is the score's ceiling, `/40 measurable` is the
  reduced ceiling, `/15` `/25` `/60` are segment weights, and `the 100 cards most played with this
  commander` is EDHREC's list.
