# PR 4 handoff — the commander row, ready to build

Written 2026-09-16, at the point where PRs 1, 2, 3a and 3b are merged and **nothing
user-visible has changed yet**. PR 4 is the row itself. This file exists so the next session
starts warm rather than re-deriving what has already been measured.

Plan: `2026-09-15-commander-row.md`. Spec: `specs/2026-09-15-commander-row-play-style-design.md`.
Handoff: `design/design_handoff_the99_commander_row/` (§A–F of `STATES-commander-row.md` is the
row's authority). Measured amber figures: `gap-report-commander-row-amber.md`. Retirement
inventory: `2026-09-16-commander-row-pr4-inventory.md`.

## What is already in `main`

Every field the row draws is in both payloads and asserted:

| Field | Both lanes | Notes |
|---|---|---|
| `prose` | yes | null is a LEGITIMATE output — no paragraph, never a placeholder |
| `gapSlot` | yes | tagged union: `unplayed` / `allPlayed` / `noMechanics` |
| `score` + `measurableTotal` | yes | one `computeFit`, shared with `scoreCommander` |
| `deckCount` | yes | owned lane reads it via `loadSupportMeta` |
| `price` | yes | plus `priceOk` — see below |

`priceOk` is the one field the handoff does not mention, added after review found a failed
price read was cached for up to an hour as `absent` (which means *never stocked*). **State 5
`Unpriced` gains a second condition**: `price.kind === "absent"` OR `priceOk === false`. It
needs no new drawn state — omitting on a lost read is ruling D3 applied to the reading.

Cache versions after #700 and #702: `discoveryKey` **v4**, `commanderRankingsKey` **v7**. Both
are pinned in `src/lib/commanders/rankings.test.ts`; PR 4 changes the payload shape again, so
**both bump again** and that test is the one that will tell you.

## The three decisions PR 4 must make with a browser, not arithmetic

1. **`labelAtPx`.** The handoff says it drops to "one value for one band" and gives no number.
   The old values were 56 (discovery: rank column) and 63 (owned: identity column with a type
   line). The new block is rank + name + pips + sentence + gap + figures, so neither survives.
   Measure it; do not derive it.
2. **The sentence clamp.** Longest stored sentence is **190 characters** against a 190-character
   desktop budget — zero margin — and **75 commanders exceed the phone estimate**. The three
   real 190-char sentences are the fixtures; `Big Bertha`, `Ares` and `Trostani Discordant`.
   Compare `scrollHeight` to `clientHeight` on the sentence element: `innerText` reads back
   whole on a clamped element, so every text assertion passes over a truncated sentence.
   If it clips, the handoff's ruling governs — *widen the measure, do not add a third line*.
3. **Whether the clamp can host anything after it.** It cannot: `-webkit-line-clamp` forces an
   atomic box. Nothing may follow the sentence inside the same element.

## Scope decisions already taken

- **One PR, not 4a + 4b.** Reversed the earlier split: the bulk is ~1,250 deleted lines, which
  draw few findings, and a deletion reviewed without its replacement needs more context rather
  than less. Named risk: if it draws findings across unrelated surfaces, split it then.
- **The property-table rewrite is its own doc-only PR**, which merges in one round by policy.
  Draft in the inventory file. A table is a spec, so it legitimately precedes the code, and
  correcting it early is safe — `check:copy-drift` only fails on tables quoting strings the code
  has STOPPED emitting.
- **No About entry and no `ABOUT_VERSION` bump** — Hugh's call, 2026-09-16. `/about` is untouched
  by this feature. The existing `discover` entry goes factually false when the row ships (it says
  Discover *"prints counts, never a score"*); carried into his Design conversation, not fixed here.
- **`FitBar` is not dead code** — `about/figures.tsx` renders it. `RoleChips` does lose every
  caller.

## The 11 retired string groups

All verified by grep to have **zero consumers outside the row**. One `describe` block in
`src/lib/discovery/novelty.test.ts` tests `justify.sharedList` and goes with it.

`discoverCopy.row.notOwned` · `.novelty` · `.supportOwned` · `discoveryCopy.justify.tagList` ·
`.distanceNear` · `.distanceNone` · `.distanceLabel` · `.distanceAria` · `.sharedList` ·
`.floorNote` · `.floorNoteShort` · `.overlap` · `commandersCopy.row.action`

**`planeCopy.overflow.*` is kept**, per the handoff — recorded as an erratum because the row and
its own copy test were its only consumers, so after PR 4 it has none. The handoff says the plane
keeps them; the code says the plane never used them.

**`discoveryCopy.untagged` SURVIVES** and becomes the gap slot's third occupant. Nearly assumed
retired; it is in the reuse manifest.

## Process notes that cost this run time

- **Every new read must be guarded or deliberately hard, with the reason stated.** Answering a
  review finding by adding a MECHANISM spawned three rounds of consequences on #700.
- **Every documented contract needs a test that reaches it directly**, not through a caller that
  filters it out.
- **Sweep for stale prose after every change**, on two axes: renamed symbols must be absent
  repo-wide, and every measured figure in `src`/`scripts` must be current or marked historical.
  Six stale-comment findings on #700, five of them mine to have caught.
- **A green from your own tooling needs its subject checked, not just its verdict.** A `## Settled`
  entry discounted a real finding and reported the merge bar met; a CI watcher polled a
  merged PR and reported its green as the current one.
- **Re-run the full gate after a rebase.** #702 landed mid-review and taking the obvious side of
  its conflict would have reverted it silently.
