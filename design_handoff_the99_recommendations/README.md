# The 99 — Recommendations you can act on (design handoff, R1)

Tickets **#130** (pre-populate a deck on "Build this deck") and **#131** (make Role Coverage
explanatory and inspectable). Source of truth:
`docs/superpowers/design-briefs/2026-08-31-recommendations-you-can-act-on.md` on `main`.

File: `The 99 - Recommendations.dc.html` (canvas — pan/zoom). Every state leads with the surface
it belongs to; phone and desktop sit side by side. Read
`design_handoff_the99_richness/README.md` for the locked voice before auditing the copy, and
`DENSITY-long-role.md` for the §11 max-render deliverable.

**The one-line summary:** *the chip carries a number, and the button carries a deck.*
Role Coverage chips become controls carrying `inclusionPct` and opening the shipped card-detail
modal. "Build this deck" writes 68 real rows, each marked `auto`, with one sweep to undo the lot.

**Gated on brief §0.** The offline EDHREC support table has not landed. Nothing here needs a
redraw when it does — but this is not ready-to-build until it merges.

## States delivered

| # | State | Phone | Desktop |
|---|---|---|---|
| 1 | Role at/above baseline, chips carrying figures | ✓ | ✓ |
| 2 | Role below baseline (`{n} short of baseline`) | — (same panel, header stacks) | ✓ |
| 3 | Role with an empty pool | — (unchanged from shipped) | ✓ |
| 4 | A chip whose figure is absent, among chips that have one | ✓ | ✓ |
| 5 | EDHREC unavailable for the whole commander | ✓ | ✓ |
| 6 | Long role — 34 ramp sources, resting and expanded | ✓ | ✓ |
| 7 | Modal opened from a chip | ✓ | ✓ |
| 8 | Freshly filled deck — 68, all auto | ✓ | ✓ |
| 9 | Partly pruned — auto, kept and hand-added in one list | — (row anatomy drawn at phone) | ✓ |
| 10 | All auto cleared — commander alone, reached by deletion | — (same block) | ✓ |
| 11 | Shopping populated by the fill | — (rows drawn at phone in state 8) | ✓ |
| 12 | Shopping empty because the collection covered every baseline | — | ✓ |
| 13 | A baseline the fill could not reach — 67 of 99 | — | ✓ |
| 14 | Optimistic / in-flight first frame | ✓ | — (same construct) |
| 15 | Deck created, fill failed | — | ✓ |

Plus: chip anatomy at both densities, auto-marker anatomy with all four row kinds, and the
token / a11y / motion contract.

**Addendum** — `The 99 - Recommendations Addendum.dc.html`, four frames the R1 audit found
undrawn, where "same construct at the other width" was not true:

| # | Frame | Phone | Desktop |
|---|---|---|---|
| A1 | Degraded EDHREC (the outage, with its retry placed) | ✓ | ✓ |
| A2 | The Shopping row at 390px — figure, group header, footer, shrink order | ✓ | — (drawn in R1) |
| A3 | In-flight at desktop — what the meter bar does with no number | — (drawn in R1) | ✓ |
| A4 | A short role cell at phone (state 13) | ✓ | — (drawn in R1) |

Three consistency fixes were made **in place** in the R1 canvas rather than restated: Card Draw
is now 14 owned (so 12 chips + `+2 more` agrees with `DENSITY-long-role.md`), Shopping gained
its Wipes group (five drawn rows → seven, matching the footer), and `aria-pressed` is off the
auto tag. State 13's provenance line and state 15's body now read verbatim from the copy file,
which was the production-final of the two.

---

## Decisions log

### 1. Chip density → **inline two-part pill on desktop; the wrap becomes a 44px list on the phone** *(§9.1 — tentative, this is the one worth arguing about)*
The figure goes **inside the chip**, right-hand side, on an `--elevated` plate, mono 10.5px
tabular in `--fg` — brighter than the name, because the number is the claim and the name is the
subject. Chip height 28px, shipped `OwnedChip` plate and dot otherwise untouched.

**No bar per chip.** A 4px bar works on a suggestion tile because there are twelve of them in a
grid with air around each. Forty of them inside a flex-wrap is a texture, and the texture reads
as a progress meter for something. The tile keeps its bar; the chip does not get one.

**The phone changes shape rather than shrinking.** At 390px a pill carrying name + figure + a
44px target is two chips per line, three lines deep, and the wrap has stopped being a wrap. So
the phone density is a **one-column list of 44px rows** — dot, name, figure hard right. The
figures form a column the eye can compare, which the wrap never could at any width, and the tap
target is the row.

**Ordering, both widths:** `inclusionPct` descending, **absent last**. The panel then reads
top-down as "most decks run this", and the unknowns pool at the end instead of interrupting.

### 2. Absent figure → **an em dash where the plate was; the panel-level note when it is all of them** *(locked by §5, drawing is ours)*
State 4 is a gap inside a set of known figures: an em dash in `--fg-locked`, plate removed, is
legible **because its neighbours give it meaning**. This is the device `FitHero` already uses
for `Synergy —` on the same page, so it is not a new idiom.

State 5 has no neighbours, so the dash means nothing there. The figure slot is **removed
entirely** — the chip is byte-for-byte today's chip — and one note at the top of the section says
why. Forty dashes is a broken panel; one sentence is a fact.

The note inherits `FitHero`'s distinction between **absent** (EDHREC does not index this
commander — permanent, no retry) and **degraded** (we could not reach EDHREC — retry offered).
Two strings, both in the copy file. Collapsing them would tell a player to retry forever.

### 3. Render cap → **12 desktop / 6 phone, expand to 40, then a count** *(§9.1, §11 deliverable)*
Full reasoning and the numbers in `DENSITY-long-role.md`. Headline: **plain overflow, no
virtualisation.** The worst case is 160 nodes and only one role is expanded in practice;
`commanders-windowing` set the precedent at 214 rows.

### 4. The `auto` marker → **the buy tag's geometry with no colour, and the tag is the keep control** *(semantics locked by §8.5; drawing and control are ours)*
`BuyTag`'s exact geometry — mono 9.5px, radius 4px, `1px 5px` — in `--fg-locked` on
`--elevated`. **Deliberately hueless.** Orange means "you need to buy this"; `auto` needs to mean
nothing at all until the player goes looking for it. It is a **word**, so §10's
not-by-colour-alone is satisfied by construction rather than by an added glyph.

Ruling 5 requires a deliberate keep, which requires a control — and a second button on 68 rows
is the exact clutter the ruling exists to avoid. **So the tag is the button**: `auto` at rest,
`keep ✓` on hover/focus, and activating it removes the tag for good. One target, no new row
furniture, and the act sits on the thing it clears.

Opening the modal from the name touches nothing (§8.5's trap). Two adjacent targets, and the
one that looks like a label is the one that changes state.

### 5. `Clear all auto` → **the decklist toolbar, count on its face, no dialog** *(§9.3)*
Right-aligned in the row that already holds list-wide controls, beside the All / Shopping filter.
Not the spine (identity, not action), not floating (nothing floats in this builder), not per
group (four sweeps is not one act). **Absent entirely at 0 auto** — no disabled control
advertising an unavailable thing.

**No confirmation dialog.** The count in the label is the disclosure a dialog usually provides,
and the act is reversible, which a dialog is not. PR #204's receipt **does** extend here — but
as **one strip, not 58 rows**: 58 dashed spent slots is a second list. Same lifetime rules as
#204 (decklist state; survives a tab switch; clears on Undo, the next mutation, or leaving the
route). Announced once on the existing live region.

### 6. The arrival → **one provenance line, no toast and no moment** *(§9.4)*
The shipped worked-example callout shape under the role strip:
*"We filled the roles and the mana base — 68 cards, 7 of them from outside your collection. The
other 31 are yours: that is where this commander actually happens, and it is where we are
worst."* It is not dismissible and it **leaves when the last auto card does** — a line that
describes the deck's state, not a notification about an event. §8 ruling 3's honesty about the
open slots is the only expressive moment on this surface, and it earns it by also being a
warning.

**No celebration.** `shouldCelebrate` fires at 99/99 and the fill deliberately stops at 68, so
this pass introduces no new collision with the kaiju reveal — unlike the import path (#42).

### 7. To-buy cards → **the shipped buy tag, plus role groups in Shopping** *(§9.5)*
`BuyTag` carries it in the decklist, unchanged, next to `auto`. Reading order puts the card's
own fact (`buy`) before its provenance (`auto`).

Shopping gets the one thing a fill-generated list needs and an ordinary one does not: **role
groups, each headed with the gap it closes** (`Ramp · 3 · closes 7→10`), and the same
`inclusionPct` figure per row. That makes the tab an argument rather than an invoice.

**No prices and no vendor links.** We hold no price data; a fabricated one is worse than an
omitted one, and "a 58-card Shopping tab reads as a bill" (§8.2) is a warning about tone we
should not then undo with currency.

### 8. The role counter strip → **unchanged** *(§9.6)*
Its gap language still has a job, and **state 13 is the proof**: the fill can miss a baseline
when EDHREC has too few in-colour candidates, and that cell is a short cell with a live
`see shelf` caption — exactly the shipped drawing. Arriving met is a state `roleCellState`
already handles (success figure, met cell, no caption, `—` in its place). Renaming or redrawing
it would spend a shipped, tested construct on a mood.

### 9. In-flight → **prefer one write and hold the redirect; if it streams, dashes not zeros** *(§9.4 / state 14)*
Design's preference is that state 14 **never renders**: the create already redirects, so the
fill belongs in the same transaction. If it must stream, the drawn frame invents no counts — the
role cells show `—`, never `0 / 10`, because a zero on a deck that is being built is a lie of
exactly the kind §5's null rule exists to prevent. Five plate rows, one mono line, no per-row
animation, one announcement on settle.

### 10. The swept-empty copy branches → **two strings, one flag** *(state 10)*
The shipped first-run empty copy welcomes a player to a deck they have not built. Reached by
deletion it would congratulate them on a demolition. One branch on "was this deck ever filled",
two headings. The empty deck's two live entrances (quick add, Consider) are unchanged — the
retry in state 15 is a **link in the banner**, not a third CTA.

---

## Component notes

Hexes live only in `globals.css`. **No new token, no new hex, no new motion class.**

| Component | Spec |
|---|---|
| **Coverage chip (desktop)** | Shipped `OwnedChip` plate `#221D16` / `1px #33402F`, radius 999px, height 28px, padding `0 4px 0 10px`, gap 8px. Dot 6px `--success`. Name mono 11.5px `--fg-body`. Hover: border `--brass`, name `--fg`. Now a `<button>`. |
| **— figure plate** | `--elevated` fill, radius 999px, `3px 7px`, mono 10.5px `--fg`, `tabular-nums`. |
| **— absent** | Plate removed, chip padding returns to `0 10px`, em dash mono 10.5px `--fg-locked`, `aria-hidden`. |
| **Coverage row (phone)** | `--surface` fill, `1px --border`, radius 8px, min-height 44px, padding `0 12px`, gap 9px. Dot 7px. Name 13.5px `--fg`, ellipsed. Figure mono 11.5px `--fg`, right, tabular. |
| **Disclosure** | Desktop: a dashed `--border-strong` chip, `+N more` mono 11px `--fg-faint` (`--brass` once expandable past the cap). Phone: full-width 44px dashed row, `Show all N` mono 12px `--brass`. |
| **Panel-level EDHREC note** | `#211C15`, `1px --border-strong`, `border-left 2px --fg-faint`, radius 8px, `9px 13px` — the shipped `synergyState` callout, verbatim. |
| **auto tag** | mono 9.5px `--fg-locked` on `--elevated`, radius 4px, `1px 5px`. Hover/focus: label `--brass`, `1px --brass-shadow`, text `keep ✓`. 44×44 hit box on phone. |
| **Clear all auto** | `GhostButton` (§404 secondary contract), mono 12px, label `Clear all auto · {n}`; phone `Clear auto · {n}`. Absent at 0. |
| **Sweep receipt** | `--surface-sunken`, `1px dashed --border-strong`, radius 8px, mono 12px `--fg-locked`, brass `Undo` with a `--brass-shadow` underline — the spent slot's plate at list scale. |
| **Provenance line** | `#181410`, `1px --border`, `border-left 3px --brass`, radius 9px, `11px 15px`, 20px `i` disc, body 12.5px `--fg-body`. Desktop and phone. |
| **Fill-failed banner** | Same shape, `border-left 3px --warning`, `⚠`, underlined brass `Try filling again`. |
| **Shopping group header** | mono 10px `--brass`, `letter-spacing .14em`, uppercase; gap clause mono 10px `--fg-faint`. Footer `{n} cards to buy · all {n} auto` mono 10.5px above a `1px --border` rule. |

## Notes for engineering

- **`detail.tsx`**: `OwnedChip` becomes a `CardDetailTrigger`, and `RolePanel` takes
  `cards: { oracleId, name, inclusionPct }[]` instead of `string[]`. `CardDetailProvider` must
  mount on `/commanders/[slug]` — today it only wraps the builder.
- **Siblings = the role's ordered oracle ids**, so Prev/Next walks the role group. Free; the
  modal already pages.
- **No Add control in the modal on this route** (§8 derived 7) — the modal must not assume a deck.
- **New payload field on the commander page**: per-role cards need `oracleId` and
  `inclusionPct`. This is the §0 dependency, and it is the only reason this handoff is not
  build-ready.
- **New flag on the deck-card row** recording "arrived from the fill, untouched". Naming is
  eng's (§5). It must be cleared by the keep control and by nothing else — **not** by the modal,
  **not** by a re-sort, **not** by a group change.
- **`suggestDeck` is not modified.** #130 commits what it already returns.
- **CORRECTION (addendum) — the unowned top-up is NOT free.** R1 recorded it as existing
  `getDeckSuggestions` behaviour bounded per role by `ROLE_TARGETS`. It is not: PR #206's top-up
  is a flat `slice(0, 5)` (`src/app/decks/actions.ts:106`, `:153`) with **no role
  classification at all**. Ruling 2 — "unowned staples top each role up to its target and no
  further" — therefore needs **new engine code**: classify the unowned candidates by role, and
  bound each role by its own remaining gap. The seven-card Shopping tab drawn in state 11 is not
  reachable from what ships today. **No drawing changes**; the estimate does.
- **Basics never enter Shopping** (§8 derived 6). One `auto` tag per stack, not per copy; the
  `+N more` meta row takes no marker, exactly as it takes no `✕` today.
- **`role-counter-strip.tsx` / `role-counter-cell.tsx`:** the **strip** is untouched (decision 8
  — no layout change, no rename, no new construct). The **cell** gains two state treatments from
  the addendum: the in-flight rule in place of its track (A3) and the `--border-strong` hairline
  on a short cell in a just-filled deck (A4). "No change" was true at R1 and is not now.
- **`decklist-row.tsx`** gains one slot between `BuyTag` and the `✕`. The marker's
  `shrink` ordering (name yields last) carries over from the availability marker.
- **The sweep is one server action**, one optimistic list update, one live-region message. Not
  58 calls, and not 58 spent slots.
- **Two shipped comments to preserve**: `builder-shell.tsx:70` (`inDeck` reads the *server*
  list) and `card-detail-provider.tsx` (the trigger is never `disabled` while fetching, or
  focus-return has nothing to return to). Both still apply.
- **Copy** lives in `src/lib/copy/` — see `recommendations · copy strings.ts`. It adds a
  `recommendationsCopy` block plus three `REPLACES` entries.
- **CORRECTION (addendum) — the three `REPLACES` targets are hardcoded JSX**, in
  `detail.tsx` itself, not in `decks-builder.ts` or `commanders.ts`. There is no copy module
  for this surface yet. Eng lifts those strings out of the component before editing them; that
  lift is part of the work.
- **Mock data:** card names, types and colour identities are real; a Jeskai deck (Kykar, Wind's
  Fury), continuous with the add-panel handoff. **Inclusion percentages are plausible but
  fabricated** — do not read them as EDHREC figures. The arithmetic is not fabricated: 10 + 10 +
  8 + 3 + 37 = 68, and state 13's 67 is deliberate.

## Gap report

1. **§0 is unresolved and this handoff cannot close it.** Per-card inclusion for an arbitrary
   commander, offline, is not built. Every chip figure and the unowned top-up depend on it.
   Readiness must not read this as ready-to-build.
2. **Chip density is the one call worth reopening.** The desktop chip is 28px — pointer-only by
   design, with the phone row as its accessible equivalent. If Product wants a keyboard-first
   desktop target at 44px, the desktop chip becomes the phone row at all widths and the wrap
   disappears entirely. That is a real option; it is not the one drawn.
3. **The keep control is inferred, not briefed.** §8.5 says the flag clears "when the user keeps
   the card explicitly" and names no gesture. Tag-as-button is Design's answer. If Product wants
   keep to be implicit (e.g. any edit to the row), the tag reverts to inert text and nothing else
   moves.
4. **Cap of 12 / 6 is a judgement, not a test result.** Two desktop rows, six phone rows. One
   constant.
5. **`inclusionPct` on a *pre-deck* surface may be a different query** than the builder's. The
   commander page has no deck id and no `edhrecCache` entry warmed by a deck. Cost is eng's call.
6. **State 14 may never exist.** Design prefers one write; if eng streams, the frame is drawn,
   but no one has measured how long 68 rows takes.
7. **The swept-empty branch needs a "was filled" bit** to pick its copy. If that is not cheap,
   the shipped first-run string ships in both places and reads slightly wrong in one of them —
   acceptable, but say so rather than discovering it.
8. **Ruling 2 needs engine work** (see the correction above): role-aware bounding of the unowned
   top-up does not exist. Sizing is eng's, but it is not a one-liner, and it gates state 11.
9. **No price data anywhere in the product**, so Shopping cannot total a cost. If pricing is on
   any roadmap, this tab is where it lands and this handoff has left it room.

## Files
- `The 99 - Recommendations.dc.html` — the canvas (this handoff's deliverable).
- `README.md` — this file.
- `The 99 - Recommendations Addendum.dc.html` + `ADDENDUM-README.md` — the R1-audit addendum.
- `DENSITY-long-role.md` — the §11 max-render / density recommendation for state 6.
- `recommendations · copy strings.ts` — the copy block, production-final.
- `READINESS.md` — self-assessed readiness and what blocks a green.
- `brand/` — the locked brand sheet + brand README, copied in for self-containment.
- `support.js` — runtime for the HTML reference; not production code.
