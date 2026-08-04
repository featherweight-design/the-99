# Implementation plan — Add panel overhaul (#158)

Handoff: `design/design_handoff_the99_add_panel/` (R2, verdict 🟢 Green)
Brief: `docs/superpowers/specs/2026-08-03-add-panel-overhaul-design.md`
Briefing: `docs/superpowers/plans/2026-08-04-add-panel-briefing.md`

The design replaces one 340px desktop rail plus a mobile bottom sheet with two constructs that
exist at both widths: a persistent **quick-add bar** pinned to the bottom of the deck column, and
**Consider**, a full-width peer tab of the decklist holding art-led tiles grouped into shelves.
*Retrieval is a bar, discovery is a room.*

## How to read this plan

Six PRs, in order. Each has numbered tasks; each task names the file and what changes. Tests are
written first — this repo runs Vitest and every task below that touches logic names the assertion
before the implementation.

Two facts discovered while writing the tasks, which the sequencing draft did not have:

1. **`imageUri` has two omission sites, not one.** `suggest.ts` drops it from `DeckSuggestion`,
   *and* the unowned-staples branch in `actions.ts:113-124` selects explicit columns without it.
   Fixing only the first leaves the five unowned tiles art-less — a `no art on file` state that
   looks like the drawn honest omission but is actually a bug.
2. **Inclusion % is not available as a number.** `buildSuggestionPayload` consumes
   `inclusionByName` and emits it already interpolated into `reasonLabel`
   (`` `EDHREC · ${inclusion}% of decks` ``). The tile needs a 4px brass bar sized to the figure,
   so it needs the figure. PR 1 adds `inclusionPct: number | null` alongside the existing label
   rather than making the tile parse a sentence.

---

## PR 1 — Payload: `imageUri` and `inclusionPct` to both surfaces

No UI. Makes the tile's two primary elements reachable before anything renders them. This is the
Gate 1 ordering: build the field, then build against it.

1. **`src/lib/decks/suggest.ts`** — add `imageUri: string | null` and
   `inclusionPct: number | null` to `DeckSuggestion`.
2. **`src/lib/decks/suggest.ts`** — widen `buildSuggestionPayload`'s first parameter with
   `imageUri: string | null`, and return both new fields. Hoist the existing `inclusion` lookup
   (currently local to the `reason === "edhrec"` branch) so the resolved number is returned as
   `inclusionPct`. `reasonLabel` keeps its current text verbatim — it is still used by the
   degraded path and by the decklist, and changing it here would make PR 3 a rewrite instead of a
   paste. Role-sourced suggestions return `inclusionPct: null`.
3. **`src/lib/decks/suggest.test.ts`** — assert, in this order: an EDHREC suggestion with a known
   inclusion returns the number *and* the unchanged label; an EDHREC suggestion with **no**
   inclusion entry returns `inclusionPct: null` (this is the `no EDHREC figure` state); a
   role-sourced suggestion returns `inclusionPct: null`; and a card whose `imageUri` is `null`
   passes it through as `null` (the `no art on file` state).
4. **`src/app/decks/actions.ts:88-101`** (owned suggestions) — pass `imageUri: c.imageUri`. `c` is
   a `PoolCard`, which already carries it (`src/lib/recs/score.ts:6`), so this is a field, not a
   query.
5. **`src/app/decks/actions.ts:113-124`** (unowned staples) — add `imageUri: cards.imageUri` to
   the select, and pass it at the `buildSuggestionPayload` call at `:149`. **This is the site the
   sequencing draft missed.**
6. **`src/app/decks/[id]/search-action.ts`** — add `imageUri: string | null` to `SearchResult`,
   and `imageUri: cards.imageUri` to the select at `:33-41`. Unlike the suggestion path this one
   genuinely is a column that was never selected. The 30×42 thumbnail on quick-add rows depends on
   it.
7. Existing `searchCards` tests: assert the field is present and that a null image does not throw.
   The destructure at `:49` strips `oracleText`/`keywords` — confirm `imageUri` survives it.

**Gate 1 artifact:** `docs/superpowers/state-coverage-add-panel.md`. One row per state in the
handoff's table, each marked ✅ / ⚠️ / ❌ / 🚫 with the evidence — the type, the line that assigns
it, and the answer to *can this condition actually be true at runtime given how the component is
mounted*. The two honest omissions (`no art on file`, `no EDHREC figure`) are states in their own
right and each needs a row proving it is reachable, not just handled.

---

## PR 2 — Synergy/lift, defensively

Closes R1's blocker 2 in code rather than in prose.

1. **`src/lib/edhrec/parse.ts`** — add `synergyByName: Record<string, number>` to `EdhrecData`,
   populated in the existing `cardviews` loop beside the `inclusion` read. Guard with
   `typeof card.synergy === "number"`. The raw payload is already cached
   (`src/lib/edhrec/client.ts`, `TTL_MS` 30 days), so this is a parse line and no fetch.
2. **`src/lib/edhrec/parse.test.ts`** — three cases: `synergy` present, `synergy` absent (the key
   is simply missing from the map — not `0`, which would render a real bar for no data), and a
   payload with no `cardlists` at all still returning the empty map.
3. **The committed fixture is trimmed to `{ name }`**, so `synergy` cannot be proven present from
   the repo. Add an inline fixture object in the test carrying it. Do not edit
   `__fixtures__/muldrotha.json` to add a field we have not observed upstream — that would be
   fabricating evidence of the API's shape.
4. **`src/lib/decks/suggest.ts`** — add `lift: number | null` to `DeckSuggestion`, and a
   `synergyByName` parameter to `buildSuggestionPayload`. Surface it **only where positive**
   (decision 6); zero and negative resolve to `null`.
5. **`src/app/decks/actions.ts`** — thread `data?.synergyByName ?? {}` into both call sites.
6. **`src/lib/decks/suggest.test.ts`** — positive lift is carried; zero is `null`; negative is
   `null`; absent is `null`.

When lift is absent the tile falls back to the drawn `no EDHREC figure` omission. Absence is a
supported shape, not a failure — that was the whole point of specifying the read defensively.

---

## PR 3 — Copy and the role label

Small, self-contained, and unblocks the two UI PRs that consume the strings.

1. **`src/lib/copy/decks-builder.ts`** — paste the `addPanelCopy` block from
   `design/design_handoff_the99_add_panel/add-panel · copy strings.ts`. It is authored against
   this file's existing shape (flat const, functions for interpolation, no JSX), so it lands as
   written.
2. Same file, `builderEmpty` — `captionFor` + `captionForMobile` collapse to a single `caption`,
   and `cta: "Open suggestions"` is **deleted**. The sheet it opened is gone; the Consider tab
   (with its count, 40px above the mark) and the quick-add bar are both live entrances on the same
   screen. Deleting it also retires the `// Flagged for Design ratification` comment sitting on
   `captionForMobile` — by deletion rather than ratification.
3. **`src/lib/copy/decks-builder.test.ts:16,22`** — assert the single `caption`; drop the CTA
   assertion. Add an assertion that `caption` no longer contains the word "right" — the defect
   Design found unprompted was a string naming a layout, and this is the cheap standing guard
   against it coming back.
4. **`src/components/decks/builder-shell.tsx:210,220,226,236,245`** — the five usage sites of the
   old strings. `roleHint` is promoted to both widths (mobile previously spent that vertical
   budget on the CTA). This PR only makes the call sites compile; the empty-state *layout* is
   PR 6's.
5. **`src/lib/decks/grouping.ts:65`** — `ROLE_GROUP_LABELS.other` becomes **"Threats & synergy"**.
   The `role` *value* stays `"other"` everywhere. One string, not a taxonomy change. Grep for the
   literal `"Other"` in decks components before and after — the card-type group of the same name
   (`CARD_TYPE_GROUP_ORDER`) must **not** change, and the two are easy to confuse.
6. **Sweep `src/lib/copy/` for any other string naming a construct a player cannot see.** Design
   found `captionFor` unprompted; the class is "copy that names a layout" — grep for `right`,
   `left`, `below`, `above`, `panel`, `sheet`, `tap away`. One grep is cheaper than finding the
   next one in review. This is Gate 3's rule applied to prose.

---

## PR 4 — Quick add bar

1. **New `src/components/decks/quick-add-bar.tsx`.** Replaces `search-pane.tsx` and
   `search-result-row.tsx` (deleted in PR 6, once nothing mounts them).
2. **Combobox, not a dialog.** `input[role=combobox]` with `aria-expanded`,
   `aria-controls="qa-results"`, `aria-activedescendant`; `ul#qa-results[role=listbox]` with
   `li[role=option]`. DOM focus never leaves the input — no focus trap, no scroll lock, no
   `useDialogA11y`. `↑↓` move the active descendant, `↵` adds the active row, `Esc` dismisses and
   **keeps** the query, a second `Esc` clears it.
3. **Owned-only toggle inline in the bar** (position A). Default is **`true`** — flipped from
   `search-pane.tsx:24`'s `useState(false)`, ruled by Hugh 2026-08-04. When the toggle is on and
   results were suppressed, show `ownedFilterOffNote`; the `dropFilter` affordance in the
   no-results state is what lets a user out.
4. **Result rows** carry the 30×42 thumbnail from PR 1's `imageUri` (a deliberate divergence from
   Archidekt, noted in the handoff), ownership as dot *and* word, and `✓ In deck` as greyscale
   *and* label *and* `aria-disabled`. Never colour alone, never disabled-without-label.
5. **Sizing:** field text `16px` on mobile so Safari does not zoom on focus; rows `56px`; Add
   target `44px`. The 16px floor is a vertical-budget cost this handoff pays rather than deferring
   a second time — see READINESS's non-blocking note.
6. **Motion:** new class `.anim-quickadd-in` — 140ms ease-out, opacity + 6px rise. Add it to the
   **explicit list** in the `prefers-reduced-motion` block at `globals.css:237-243` (the block
   enumerates classes; a new class is not covered by default). Reduced motion: appears in place,
   opaque. Dismissal is instant in both modes.
7. **Tests** (`quick-add-bar.test.tsx`): keyboard walk (`↑↓↵`), the two-stage `Esc`, the toggle
   default being on, an in-deck row being non-actionable via both keyboard and click, and the
   no-results state offering `dropFilter` only when the filter is actually on.

**Gate 2** (forced-state runtime — force empty results, force a search error, force the in-deck
row, throttle to see the loading state) and **Gate 3** (sibling duplicate sweep — grep every
string and constant this PR moves for surviving copies elsewhere) apply.

---

## PR 5 — Consider view

1. **New `src/components/decks/consider-panel.tsx`** (toolbar + shelves + grid) and
   **`suggestion-tile.tsx`** (replacing `suggestion-card.tsx`, deleted in PR 6).
2. **Tile hierarchy:** art → name + cost → type → evidence → Add. **Role is the shelf heading and
   is never printed on the tile** — the single most repeatable way this design regresses is a tile
   that re-states its own shelf. Art at the shipped `63/88` ratio. Desktop tile 168px, 6-up; phone
   2-up with a 44px Add. Add is **always visible**, never hover-revealed.
3. **Shelves** are ordered by coverage gap, capped at 12 tiles with `Show all N` / `Show fewer`.
   The cap is one constant — Design flags it as a guess that fills two desktop rows / six phone
   rows, so name it and make it easy to find.
4. **Shelf headers** quote the same numbers as the coverage strip above (`you have 4 of 10`). The
   "Threats & synergy" shelf has **no target** and reads `no target — this is the deck's plan`
   (decision 7).
5. **Evidence line:** inclusion % as a 4px brass bar plus the figure, from PR 1's `inclusionPct`;
   lift from PR 2 where positive; role picks read `fills a removal slot`. Both honest-omission
   states are drawn and both must be reachable — **never a 0% bar, never a blank plate**.
6. **Sort control** — coverage gaps / EDHREC / cheapest. Plain component state, resetting on
   navigation, matching the decklist's grouping toggle. READINESS flags this as consistent rather
   than obviously right; consistency wins until someone complains.
7. **Card detail:** both art and name are `CardDetailTrigger`. **Siblings are the shelf**, so the
   existing modal's Prev/Next pages the role group — a capability suggestions do not have today.
   The modal owns its own aria (`cardDetailCopy.triggerAria`); do not redeclare it on the tile.
8. **Staleness:** an accepted tile **stays put**, greyed with `✓ In deck`. It does not vanish, and
   the shelf does not reflow under the cursor. Counts update optimistically.
9. **No virtualisation.** 99 tiles; `commanders-windowing` set the precedent at 214.
10. **Adds announce on the builder's existing live region** — one region for both surfaces, using
    `announce.added` / `announce.addedNoRole`. Do not add a second region.
11. **Degraded state** renders the straight `degraded` block with a working `Try again`, and the
    shelves stay honest (ranked by what the deck is short of) with percentages absent rather than
    zeroed.
12. **Empty Consider** renders `considerEmpty`, whose CTA points at `/collection`.

**Gate 2**, **Gate 3**, and **Gate 4** (design-review both halves — enumerate against the handoff
*before* writing the components, pass that table into any build subagent, then verify and confirm
to 0 gaps) apply.

---

## PR 6 — Shell rewiring, empty states, and the deletions

The PR that removes the old surface and makes the journey reachable end to end.

1. **`src/components/decks/builder-shell.tsx`** — add `view: "deck" | "consider"` beside the
   existing `filter` and `grouping` state. Drop `sheetOpen` (`:46`, `:299`) and the
   `<aside width:340>` (`:280-296`).
2. **Tab bar:** `Your deck · 47 | Consider · 99` as `role=tablist` per the a11y contract, with the
   counts in the accessible names (`tabs.deckAria`, `tabs.considerAria`).
3. The mobile sticky `+ Add cards` footer slot survives; its **contents** become the quick-add
   bar. The slot geometry is unchanged.
4. **Delete `add-panel.tsx`** with its `variant` union, `SheetWrapper`, and `useDialogA11y` mount.
   Nothing in this design is modal. Also delete `suggestion-card.tsx`, `search-pane.tsx`,
   `search-result-row.tsx`, and their tests (`suggestion-card.test.tsx`,
   `search-result-row.test.tsx`).
5. **Retire `.anim-sheet-in`** — keyframes, class, and its `prefers-reduced-motion` entry — at the
   same time as `variant="sheet"`. Net motion change across the whole pass: one class in, one out.
6. **Empty-deck state** at both widths, with `roleHint` now on both and no CTA.
7. **`role-counter-strip.tsx`** gains a link per under-target cell — `href="#shelf-removal"` plus
   an `onClick` switching `view` to `"consider"`. The strip's own layout is untouched. This
   assumes the strip stays above the tabs at both widths, which it does today.
8. **Update the header comment at `builder-shell.tsx:2`.** It currently reads "Owns: Add-panel tab
   state, group toggle, All|Shopping filter, mobile Add sheet, export open" — three of those five
   are now wrong.

**Carry forward, and it is easy to break by accident:** both new components must be fed the
**server** `deckOracleIds`, not the optimistic list, because `use-deck-mutation` clears a row's
error whenever that value changes. The comment at `builder-shell.tsx:68-70` explains why. Keep the
comment as well as the behaviour — a rewrite tends to lose the reason and then lose the behaviour
one PR later.

**Gate 5** (journey lifecycle) fires here. Run all four passes on each journey in the briefing:

- **Forward** — quick add, and add from Consider, with realistic data.
- **Reverse** — remove the added card and confirm the tile returns from `✓ In deck` to addable,
  the shelf count restores, and the coverage strip restores.
- **Repeat** — add → remove → **add again**. This is the pass that finds keyed-state bugs. Ask of
  every dismissal and one-shot in the builder what key it is stored under and whether that key
  dies when the underlying thing dies.
- **Resume** — reload while Consider is the active tab, and reload with a query typed in the bar.

**Mutation feedback sub-check:** throttle the network and time the gap between clicking Add and
the visible change. The optimistic path already exists and must not be lost — a server-rendered
page with no optimistic path makes a working button look inert.

Record the passes in `docs/superpowers/journey-lifecycle-add-panel.md`.

---

## Superseded design-table rows

`docs/superpowers/design-tables/decks.md`: §Add Panel (`:1287-1376`, bottom-sheet rows
`:1299-1328` included), §Suggestion Card (`:1377-1458`), §Search within Add Panel
(`:1459-1586`), §"+ Add cards" sticky footer (`:2195`), and §2182 "Open suggestions" CTA. The
table is regenerated as part of PR 5's Gate 4 enumeration.

## Settled

The owned-only default flips `false` → `true` (`search-pane.tsx:24` today). Ruled by Hugh
2026-08-04. Design's reasoning: the product premise is building from what you own, and the deck
already carries a shopping list for the rest. Every state is drawn with both positions of the
switch, so a revert is one line with no redraw behind it.

## Not in scope

Virtualisation, price data, a per-printing art picker on tiles, and any change to the export path.
