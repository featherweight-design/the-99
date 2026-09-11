# READINESS — One filter chassis (handoff R2)

**Verdict: 🟢 Green.** Build starts now. The dependency in §4 gates the `/collection` slice alone — `/decks` and the two commander lanes share no files with it and are not blocked.

- **Handoff:** `design/design_handoff_the99_filter_chassis/` (R2, 2026-09-11)
- **Brief:** `docs/superpowers/design-briefs/2026-09-11-one-filter-chassis.md` (PR #518)
- **Audited:** 2026-09-11 against `origin/main` at `519486d`
- **Design self-assessment:** 🟡 amber, blocking on one decision. **Overturned to Green** — that
  decision is engineering scope and is ruled in §2 below, which is where it belonged.

## What was checked, and against what

Every load-bearing claim was checked against the shipped tree, and the two contrast claims were
recomputed from `globals.css` rather than taken on trust.

| Claim | Source | Result |
|---|---|---|
| `ui/filter-panel.tsx` is 42.5KB with 34.6KB of tests | `wc -c` | **Exact.** 42,569 and 34,647 bytes |
| The collection bar is five mounts of it | `filter-bar.tsx` | **Exact.** Five `<FilterPanel` |
| It is called "the reference implementation" | `rack/filter-sheet.tsx:4` | **True**, verbatim |
| `result-line.tsx` exists and can move rather than be rewritten | `rack/result-line.tsx` | **True** |
| `printings.setCode` is reachable for `Printed in` | `schema.ts:65` | **True**, and `printings_oracle_set_idx` on `(oracle_id, set_code)` already indexes the join the dimension needs |
| `color-pip.tsx` emits `Filter by R` | `color-pip.tsx:21` | **True** — the Task 9 test mismatch is real |
| The rack's wide pip group grounds on `--bg` | `colour-control.tsx:85` | **True.** The rack's own container is `--surface-sunken` (`filter-rack.tsx:92`), but the wide pip group paints its own `--bg` over it; the sheet form is `bg-transparent` and does inherit the rack's ground |
| The collection pip row grounds on `--surface-sunken` | `filter-bar.tsx:131` | **True** |
| Shipped unlit pip floors at 1.38:1 | recomputed | **Exact.** 1.37:1 at U/phyrexia against `--bg` — the handoff's own figure and pip, to rounding |
| Scryfall pip floors at 9.51:1 | recomputed | **Method exact, inputs assumed** — see finding 1 |

The pip floor was recomputed independently and returned **9.51:1 at R/kaldheim** from the
handoff's assumed hexes — the same figure at the same pip in the same theme. The measurement
method is sound and reproducible; only three of its five inputs were guesses.

## §2 The blocking decision, ruled here: **a new chassis around the existing panel**

Design declined to build until this was confirmed, and was right to ask. The answer is that
`FilterPanel` is kept, parameterised and mounted — not rewritten, not forked.

The brief's §2.1 rejects adopting an existing **chassis** — the collection bar's frame, the
commanders rack's frame — because neither was drawn against `/decks`'s five dimensions. It does not
reject every atom those chassis mount. A panel primitive is not a chassis.

Three things make the other reading untenable rather than merely expensive:

1. **The panel has its own ratification, and it is not the one I first cited.** `FilterPanel` is
   ratified in `docs/superpowers/design-tables/collection-filter-panel.md` and named "the reference
   implementation" in `rack/filter-sheet.tsx:4`. Set collections' "mounted, not forked" contract
   covers the **colour filter** — the row its Task 9 extracts into
   `collection/color-filter-row.tsx` — not the panel, and an earlier draft of this verdict cited it
   as though it did. What set collections does establish is weaker but still real: its plan keeps
   `filter-bar.tsx` working and mounting the extracted row, and `filter-bar.tsx` is five mounts of
   `FilterPanel`, so a build that retires the panel mid-round destabilises a Green handoff's host
   file while it is being implemented.
2. **The brief already resolved this collision in the same direction.** §5 rules that there is one
   colour control in the app and the set pages mount it. Replacing the panel beneath it would
   contradict the ruling one section earlier in the same document.
3. **Nothing visual turns on it.** Design states the panel's appearance is identical either way and
   that no redraw is needed to switch. A decision with no drawing consequence is not a design
   decision.

**No Design round-trip.** Nothing is redrawn; the handoff stands as delivered.

### What "parameterised" actually costs, stated so the build does not discover it

Keeping the panel is the ruling, but "mount it unchanged" would not satisfy the handoff. Two deltas
are real and one apparent delta is not:

- **The breakpoint is wrong and it is a bug, not a preference.** `FilterPanel` chooses popover
  versus sheet on `useIsDesktop()`, which is `(min-width: 768px)`
  (`src/components/ui/use-is-desktop.ts:8`). The chassis switches form at 1000px (decision 18, with
  §7's correction). **At 768–999px the compact chassis would open a desktop popover** — the phone frame with the desktop
  panel inside it. The panel must take its breakpoint from the caller rather than reading its own.
- **Desktop option rows are `min-h-[40px]`** (`filter-panel.tsx:465`), against the handoff's 34px
  control rhythm. The phone rows are `min-h-[48px]` and already clear the 44px floor, so only the
  desktop figure is in question, and it is a parameter rather than a redraw.
- **Width is not a delta.** `widthPx` is already a prop (`:99,:127`) — `Set` passes 340 and `Type`
  passes 300 today. Decision 4's 280px is a call-site argument, so the ratified collection panel is
  not touched by it.

### One composition problem, deferred with its route

`FilterPanel`'s compact branch is itself a fixed `aria-modal` sheet with its own scrim
(`filter-panel.tsx:879-894`). The chassis phone form is also a sheet. Mounting one inside the other
puts two modal dialogs and two scrims on screen, which no focus contract survives.

**This does not arise in PR 1 or PR 2.** `/decks` has no searchable dimension — its five are a
field, two chip groups, pips and sort — and `Printed in`, the only new searchable one, is cut from
this round. It arises on `/collection`, whose `Set ▾` needs the search field, and that route is PR 3
and blocked on other work regardless. Resolve it there, as a nested-list mode on the panel rather
than a second dialog.

## §3 Findings — five, all engineering-resolvable

1. **Three pip hexes were assumed and all three are wrong.** The handoff assumes `B` `#CBC2BF`,
   `R` `#F9AA8F`, `G` `#9BD3AE`, flagging them for confirmation on first fetch. Fetched:
   **`B` = `#CAC5C0`, `R` = `#E49977`, `G` = `#A3C095`.** `W` `#F8F6D8` and `U` `#C1D7E9` are
   confirmed correct. The real values are darker than assumed, so the floor moves **down**, from
   9.51:1 to **7.77:1** (still R, still kaldheim). It clears the 3:1 non-text floor with 4.77 points
   of headroom, so Design's conclusion holds unchanged and no drawing is affected. Build against the
   fetched values, not the table's.
2. **The defect is two controls wide, and the handoff measured the worse of them.**
   `rack/colour-control.tsx:126` dims to `0.34` in its wide form, over the `--bg` that group paints
   for itself (`:85`) — floor **1.37:1** at U/phyrexia, and **30 of 30** theme×pip combinations
   under the 3:1 non-text floor. `collection/color-pip.tsx:28` dims to `0.40` over
   `--surface-sunken` — floor **1.49:1**, slightly better and still failing, at **24 of 30**.
   So the handoff's figure is the app's true floor rather than an unrepresentative sample. **The
   handoff's "three live surfaces" is two**: `deck-filter-column.tsx:119-130`'s `ColourSwatch`
   carries no opacity at all and signals state with its border — `/decks` already does what this
   round's no-opacity rule generalises, which is a useful precedent rather than a gap. Two different
   unlit opacities over two different grounds, for one concept, is itself an argument for this
   round; the chassis picks one value rather than inheriting either. Pre-existing, and not caused by
   this handoff.
3. **Asset delivery, ruled: five static SVGs committed to the repository — a build deliverable, not
   yet a fact.** Nothing in this PR adds them; `design/` is reference-only and the canvas's own pip
   sources are remote Scryfall URLs. The first build PR owns fetching them into `public/mana/`. Design left this open and pushed back
   only on hotlinking. Concur, and going further: hotlinking a third party into the filter chrome of
   four routes plus the set pages makes a network fetch the single carrier of a filter's identity,
   and the canvas hotlinks for convenience only. Five SVGs are a handful of kilobytes and cacheable
   forever. Not a sprite — five independent files stay diffable and let `cost-pips.tsx` adopt them
   later without unpacking anything.
4. **`bodyOneFix` needs a query nobody has written.** The empty state promises the row count that
   dropping one control would return, which is one extra pass per active filter. The commander lanes
   compute this already; `/collection` does not, and at 2,472 cards × five dimensions it is five
   passes over an in-memory list. Cheap, but it must be built rather than assumed.
5. **The 1000px switch is a judgement, and it should ship as one.** Design flagged it rather than
   measuring it, and the alternative — a per-route breakpoint — would make the chassis stop being
   one thing. Ship 1000 — see §7 for why not 900 — and watch it. Recorded so the first report of a half-width laptop getting the
   phone treatment is recognised as a known trade rather than a bug.

## §4 Dependency — owned by another agent

**Set collections' Task 9 must land, and must land with its test rewritten — before the
`/collection` slice, not before the build.** That route mounts the control the task extracts;
`/decks` and the commander lanes touch none of the files it does, so they proceed in parallel. The
plan slices the work by route for exactly this reason. The task requires a verbatim extraction while its test expects
`getByRole("button")` named `/red/i` carrying `aria-pressed`; `color-pip.tsx:17-21` emits
`role="switch"` with `aria-checked` and the accessible name `Filter by R`. All three assertions fail
against the real component.

That plan is not this run's work and is in flight elsewhere. It is recorded here because the
`/collection` slice cannot start before it, and because the same round supplies a better accessible name —
`chassisCopy.colour.pipAria` — for whoever rewrites the test.

## §5 What the handoff got right that is worth naming

Design folded three corrections to the handoff prompt rather than building to it. **The prompt
instructed token-coloured masks; the brief had already corrected that to full-colour images, and
Design followed the brief.** Had they built to the prompt, every hybrid pip would have been
flattened to one colour. The brief being on `main` is what made that recoverable, and it is the
argument for merging a brief before the prompt goes out.

They also found a shipped accessibility defect while measuring their own work, and filed it against
the app rather than folding it into their round.


## §6 Errata against the handoff, carried here rather than sent back

Four corrections. None changes a drawing, so none is worth a Design round-trip; they are recorded
here because the handoff is the document an implementer reads.

| Handoff says | Correct | Why it matters |
|---|---|---|
| The shipped pip floors at 1.38:1 against `--surface-sunken` | **1.37:1 against `--bg`** — the rack's wide pip group paints its own ground (`colour-control.tsx:85`). The `--surface-sunken` figure is collection's, at 1.49:1 | Building toward the wrong ground preserves the wrong floor |
| Decision 4's panel is "what `FilterPanel` already does" | True of width, false of the breakpoint and the desktop row height | See the section above; the 768px/1000px gap is a live bug at 768–999px |
| `STATES` §181: the shipped panels share `useDialogA11y`, roving radiogroups and selection-follows-focus | They do not. `filter-panel.tsx` has its own panel and listbox key handling; `rack/select.tsx` has its own focus and menu logic | The "no new pattern" justification is what makes the a11y work look free. It is not free — the shared behaviour has to be written |
| `STATES` §104 lists only `Set` as searchable | `Printed in` is searchable too, per the canvas | Moot this round — `Printed in` is cut — but it must be settled before that dimension lands |
| Decision 18 derives the 900px switch from a 887px total | **The stated minimums total 987px**, and the switch moves to **1000px** — see §7 | At 900 the wide form wraps, which is the defect the decision exists to prevent |
| `STATES` §112 gives the wide panel `role="menu"` | `FilterPanel` renders `role="dialog"` containing a `role="listbox"` of `role="option"` rows (`filter-panel.tsx:546,863-877`) | A `menu` wrapper is invalid around those descendants. The shipped semantics stand; the contract in STATES does not |
| Asset delivery left open — "static assets, a sprite or a hotlink are all viable" | Ruled in finding 3: five static SVGs in the repository | The handoff reopens a decision this audit closed |
| `Printed in` drawn and specified as this round's new dimension | Cut from the round, on Design's own recommendation | Tracker, plan and this verdict all say cut; the handoff is the only document that still says otherwise |


## §7 The 900px switch cannot hold, and moves to 1000px

Decision 18 sets the wide/compact switch at 900px and derives it from `/collection`'s seven
controls: "132 + 148 + 150 + 78 + 120 + 1 + 160 + 70 + seven 12px gaps + 44px padding = **887px**".

**That sum is 987px.** The eight widths total 859, the seven gaps add 84, and the padding adds 44.
So at 900px — and anywhere up to 987 — the wide form does not fit, and row 1 wraps. Decision 18
exists precisely to stop row 1 wrapping, and R1's wrapping row was reported as a layout bug, so the
rule as drawn produces the defect it was written to prevent.

**Decided engineering-side: the switch moves to 1000px.** Design's rule is "the minimums, plus a
margin" — the rule is theirs and only its arithmetic was wrong, so applying it to 987 rather than to
887 is executing the decision rather than overriding it. It changes no drawing, and its one
consequence is the one Design already named and accepted at 900: a slightly wider band of laptops
gets the compact form on a pointer device. If that reads badly in the build we revisit it then, on
`/collection`, which is the only route the figure binds.

The two alternatives, recorded so the choice is legible rather than because they are still open:

1. **Narrow a control.** The 160 and the 150 are the two largest; either could give up the 87px.
   Rejected: it changes a drawn width, which is Design's, for no gain over a breakpoint the build can
   revisit.
2. **Let search shrink below its 132px minimum.** Already the only shrinking child, so it costs the
   least layout change — and the most legibility at the bottom of the range, which is why it loses.

**This never blocked the build or this verdict.** The figure is derived from
`/collection`'s seven controls; `/decks` has five and `/commanders` four, so PRs 1b and 2 are not at
risk. `/collection` is PR 3, which waits on set collections' Task 9 regardless. The question needs an
answer before that PR, not before this one — which is why the verdict stays 🟢 and this section names
the deadline instead of holding the round.
