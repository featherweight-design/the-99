# READINESS — One filter chassis (handoff R2)

**Verdict: 🟢 Green.** Build may start, once the dependency in §4 lands.

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
  (`src/components/ui/use-is-desktop.ts:8`). The chassis switches form at 900px (decision 18). **At
  768–899px the compact chassis would open a desktop popover** — the phone frame with the desktop
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
   So the handoff's figure is the app's true floor rather than an unrepresentative sample. Two
   different unlit opacities over two different grounds, for one concept, is itself an argument for
   this round; the chassis picks one value rather than inheriting either. Pre-existing, and not
   caused by this handoff.
3. **Asset delivery, ruled: static assets in the repository.** Design left this open and pushed back
   only on hotlinking. Concur, and going further: hotlinking a third party into the filter chrome of
   four routes plus the set pages makes a network fetch the single carrier of a filter's identity,
   and the canvas hotlinks for convenience only. Five SVGs are a handful of kilobytes and cacheable
   forever. Not a sprite — five independent files stay diffable and let `cost-pips.tsx` adopt them
   later without unpacking anything.
4. **`bodyOneFix` needs a query nobody has written.** The empty state promises the row count that
   dropping one control would return, which is one extra pass per active filter. The commander lanes
   compute this already; `/collection` does not, and at 2,472 cards × five dimensions it is five
   passes over an in-memory list. Cheap, but it must be built rather than assumed.
5. **The 900px switch is a judgement, and it should ship as one.** Design flagged it rather than
   measuring it, and the alternative — a per-route breakpoint — would make the chassis stop being
   one thing. Ship 900 and watch it. Recorded so the first report of a half-width laptop getting the
   phone treatment is recognised as a known trade rather than a bug.

## §4 Dependency — owned by another agent

**Set collections' Task 9 must land, and must land with its test rewritten.** The chassis mounts the
control that task extracts. The task requires a verbatim extraction while its test expects
`getByRole("button")` named `/red/i` carrying `aria-pressed`; `color-pip.tsx:17-21` emits
`role="switch"` with `aria-checked` and the accessible name `Filter by R`. All three assertions fail
against the real component.

That plan is not this run's work and is in flight elsewhere. It is recorded here because the chassis
build cannot start before it, and because the same round supplies a better accessible name —
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
| Decision 4's panel is "what `FilterPanel` already does" | True of width, false of the breakpoint and the desktop row height | See the section above; the 768px/900px gap is a live bug at 768–899px |
| `STATES` §181: the shipped panels share `useDialogA11y`, roving radiogroups and selection-follows-focus | They do not. `filter-panel.tsx` has its own panel and listbox key handling; `rack/select.tsx` has its own focus and menu logic | The "no new pattern" justification is what makes the a11y work look free. It is not free — the shared behaviour has to be written |
| `STATES` §104 lists only `Set` as searchable | `Printed in` is searchable too, per the canvas | Moot this round — `Printed in` is cut — but it must be settled before that dimension lands |
