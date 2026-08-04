# Implementation plan — Add panel overhaul (#158)

Handoff: `design/design_handoff_the99_add_panel/` (R2, verdict 🟢 Green)
Brief: `docs/superpowers/specs/2026-08-03-add-panel-overhaul-design.md`

The design replaces one 340px desktop rail plus a mobile bottom sheet with two constructs that
exist at both widths: a persistent **quick-add bar** pinned to the bottom of the deck column, and
**Consider**, a full-width peer tab of the decklist holding art-led tiles grouped into shelves.
*Retrieval is a bar, discovery is a room.*

## Sequencing

Six PRs. The payload work lands first so the UI is never built against a field that does not
exist — this is the Gate 1 state-reachability ordering, and `imageUri` is the field the whole
tile hierarchy rests on.

---

### PR 1 — Payload: carry `imageUri` to both surfaces

No UI. Makes the tile's primary element reachable before anything renders it.

- `src/lib/decks/suggest.ts` — add `imageUri` to `DeckSuggestion` and stop dropping it when
  building the payload. `PoolCard` already carries it (`src/lib/recs/score.ts`), so this is a
  field, not a query.
- `src/app/decks/[id]/search-action.ts` — add `imageUri` to the select (`:33-48`) and to
  `SearchResult`. This one *is* a column; the current select genuinely omits it.
- Tests: extend the existing `suggest.test.ts` payload assertions; add a `searchCards` assertion
  that the field is returned and is nullable.

**Gate 1 artifact:** `docs/superpowers/state-coverage-add-panel.md`, answering type / route /
runtime-reachability for every state in the handoff's table, including the two honest omissions
Design drew (`no art on file`, `no EDHREC figure`).

---

### PR 2 — Synergy/lift, defensively

- `src/lib/edhrec/parse.ts` — read `card.synergy` when it is a number and carry it on
  `EdhrecData`. The raw payload is already cached (`src/lib/edhrec/client.ts`), so this costs a
  parse line and no fetch.
- `src/lib/decks/suggest.ts` — surface lift on `DeckSuggestion` **only where positive**, per
  decision 6.
- The committed fixture is trimmed to `{ name }`, so add a fixture case carrying `synergy` and
  one without it. Absence is a supported shape, not a failure: when it is missing the tile falls
  back to the drawn `no EDHREC figure` omission.

This closes R1's blocker 2 in code rather than in prose.

---

### PR 3 — Copy and the role label

Small, self-contained, and unblocks the two UI PRs that consume the strings.

- `src/lib/copy/decks-builder.ts` — paste from `add-panel · copy strings.ts`. Notably:
  `captionFor` + `captionForMobile` collapse to a single `caption`, `cta: "Open suggestions"` is
  **deleted** (the sheet it opened is gone; the Consider tab and the quick-add bar are both live
  entrances on the same screen), and `roleHint` is promoted to both widths.
- `src/lib/copy/decks-builder.test.ts` asserts both captions today — update to the single one and
  drop the CTA assertion.
- `src/lib/decks/grouping.ts:65` — role `other` label becomes **"Threats & synergy"**. The `role`
  *value* stays `"other"`; this is one string, not a taxonomy change.
- Sweep `src/lib/copy/` for any other string naming a construct a player cannot see. Design found
  `captionFor` unprompted; the class is "copy that names a layout", and one grep is cheaper than
  finding the next one in review.

---

### PR 4 — Quick add bar

- New `src/components/decks/quick-add-bar.tsx`, replacing `search-pane.tsx` and
  `search-result-row.tsx`.
- Combobox per the a11y contract: `input[role=combobox]` with `aria-expanded`,
  `aria-controls=qa-results`, `aria-activedescendant`; `ul#qa-results[role=listbox]`. **Not a
  dialog** — DOM focus never leaves the input, no trap, no scroll lock. `↑↓` move the active
  descendant, `↵` adds, `Esc` dismisses and keeps the query, a second `Esc` clears it.
- Result rows carry a 30×42 thumbnail (a deliberate divergence from Archidekt, noted in the
  handoff), ownership as dot *and* word, `✓ In deck` as greyscale *and* label *and*
  `aria-disabled`.
- Field text is `16px` on mobile so Safari does not zoom on focus. Rows `56px`, Add `44px`.
- New motion class `.anim-quickadd-in` — 140ms ease-out, opacity + 6px rise — added to the
  explicit list in the `prefers-reduced-motion` block at `globals.css:237-243`. Reduced motion:
  appears in place, opaque. Dismissal is instant in both modes.
- Owned-only toggle inline in the bar (position A). **Default flips `false` → `true`** per
  decision 5 — see Open question below.

**Gate 2** (forced-state runtime) and **Gate 3** (sibling duplicate sweep) apply.

---

### PR 5 — Consider view

- New `src/components/decks/consider-panel.tsx` (shelves + grid) and `suggestion-tile.tsx`
  (replacing `suggestion-card.tsx`).
- Tile hierarchy: art → name + cost → type → evidence → Add. **Role is the shelf heading and is
  never printed on the tile.** Art at the shipped `63/88`. Desktop tile 168px, 6-up; phone 2-up
  with a 44px Add. Add is always visible, never hover-revealed.
- Shelves ordered by coverage gap, capped at 12 tiles (Design flags the cap as a guess — one
  constant, easy to revisit).
- Evidence: inclusion % as a 4px brass bar plus the figure; role picks read `fills a removal
  slot`. Both honest-omission states drawn.
- Both art and name are `CardDetailTrigger`. **Siblings are the shelf**, so the existing modal's
  Prev/Next pages the role group — a capability suggestions do not have today.
- Staleness: an accepted tile **stays put**, greyed with `✓ In deck`; counts update
  optimistically.
- 99 tiles need no virtualisation — `commanders-windowing` set the precedent at 214.
- Adds announce on the builder's **existing** live region, one region for both surfaces.

**Gate 2**, **Gate 3**, **Gate 4** (design-review both halves) apply.

---

### PR 6 — Shell rewiring, empty states, and polish

The PR that actually removes the old surface.

- `src/components/decks/builder-shell.tsx` — drop `<aside width:340>` (`:280-296`) and
  `sheetOpen` (`:46`, `:299`). Add `view: "deck" | "consider"` beside the existing `filter` and
  `grouping`. The mobile sticky `+ Add cards` footer becomes the quick-add bar in the same sticky
  slot.
- **Delete `add-panel.tsx`** with its `variant` union, `SheetWrapper` and `useDialogA11y` mount.
  Nothing in this design is modal.
- Delete `suggestion-card.tsx`, `search-pane.tsx`, `search-result-row.tsx` and their tests.
- Retire `.anim-sheet-in` — keyframes, class, and its `prefers-reduced-motion` entry — at the same
  time as `variant="sheet"`. Net motion change across the pass: one class in, one out.
- Empty-deck state (R2's addition) at both widths, with the roleHint now on both.
- `role-counter-strip.tsx` gains a link per under-target cell (`href="#shelf-removal"` plus an
  `onClick` switching to Consider). The strip's own layout is untouched.
- Tab bar: `Your deck · 47 | Consider · 99` as `role=tablist` per the a11y contract.

**Carry forward, and it is easy to break by accident:** both new components must be fed the
**server** `deckOracleIds`, not the optimistic list, because `use-deck-mutation` clears a row's
error whenever that value changes. The comment at `builder-shell.tsx:70` explains why. Keep it.

**Gate 5** (journey lifecycle — forward, reverse, repeat, resume) fires here, since this is the
PR that makes the journey reachable end to end. The repeat pass matters most: add → remove → add
again, and confirm the tile returns from `✓ In deck` to addable.

---

## Superseded design-table rows

`docs/superpowers/design-tables/decks.md`: §Add Panel (`:1287-1376`, bottom-sheet rows
`:1299-1328` included), §Suggestion Card (`:1377-1458`), §Search within Add Panel
(`:1459-1586`), §"+ Add cards" sticky footer (`:2195`), and §2182 "Open suggestions" CTA. The
table is regenerated as part of PR 5's Gate 4 enumeration.

## Open question — one line, reversible

The owned-only default flips `false` → `true` (`search-pane.tsx:24` today). Design's reasoning is
that the product premise is building from what you own, and the deck already carries a shopping
list for the rest. Every state is drawn with both positions of the switch, so if Product prefers
`false` it is a one-line revert with no redraw behind it. **Proceeding with `true`.**

## Not in scope

Virtualisation, price data, a per-printing art picker on tiles, and any change to the export
path.
