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
| The rack's pip row grounds on `--surface-sunken` | `filter-rack.tsx:92` | **True** |
| The collection pip row grounds on `--surface-sunken` | `filter-bar.tsx:131` | **True** |
| Shipped unlit pip floors at 1.38:1 | recomputed | **True for the control measured** — see finding 2 |
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

1. **Set collections locks it.** Its handoff reads "the colour filter is mounted, not forked", and
   its Task 9 extracts a control specifically so a second surface can mount it. Discarding the panel
   mid-build invalidates a Green handoff that is being implemented right now.
2. **The brief already resolved this collision in the same direction.** §5 rules that there is one
   colour control in the app and the set pages mount it. Replacing the panel beneath it would
   contradict the ruling one section earlier in the same document.
3. **Nothing visual turns on it.** Design states the panel's appearance is identical either way and
   that no redraw is needed to switch. A decision with no drawing consequence is not a design
   decision.

**No Design round-trip.** Nothing is redrawn; the handoff stands as delivered.

## §3 Findings — five, all engineering-resolvable

1. **Three pip hexes were assumed and all three are wrong.** The handoff assumes `B` `#CBC2BF`,
   `R` `#F9AA8F`, `G` `#9BD3AE`, flagging them for confirmation on first fetch. Fetched:
   **`B` = `#CAC5C0`, `R` = `#E49977`, `G` = `#A3C095`.** `W` `#F8F6D8` and `U` `#C1D7E9` are
   confirmed correct. The real values are darker than assumed, so the floor moves **down**, from
   9.51:1 to **7.77:1** (still R, still kaldheim). It clears the 3:1 non-text floor with 4.77 points
   of headroom, so Design's conclusion holds unchanged and no drawing is affected. Build against the
   fetched values, not the table's.
2. **The 1.38:1 figure is one of two shipped unlit pips, and the other is worse than the handoff
   implies.** The measurement is of `rack/colour-control.tsx:126`, which dims to `0.34` in its wide
   form. `collection/color-pip.tsx:28` ships `opacity-40` instead and floors at **1.49:1**. Both
   fail 3:1 — for the `0.40` control, **24 of 30** theme×pip combinations are under it. Two
   different unlit opacities for one concept is itself an argument for this round, and the chassis
   has to pick one value rather than inherit either. The defect is pre-existing and is not caused by
   this handoff.
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
