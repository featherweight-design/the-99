# The 99 — Decks · Add panel overhaul (design handoff, R2)

Ticket **#158**. A surface redesign of the deck builder's "Add cards" panel, end to end, at
mobile and desktop. The 340px right rail and the mobile sheet that impersonates it are both
retired; the two jobs they shared are given separate shapes.

File: `The 99 - Decks · Add Panel.dc.html` (canvas — pan/zoom). Every state leads with the
phone, desktop beside it. Read `design_handoff_the99_richness/README.md` for the locked voice
before auditing the copy.

**The one-line summary:** *retrieval is a bar, discovery is a room.*
**Quick add** is chrome pinned to the bottom of the deck column at both widths — type, `↵`,
done, no view change. **Consider** is a full-width peer tab of the decklist — art-led tiles
grouped into shelves ordered by the coverage the deck is short of.

## States delivered

| # | State | Phone | Desktop |
|---|---|---|---|
| 1 | Consider, populated (two shelves, in-deck tile, art-missing tile, no-figure tile) | ✓ | ✓ |
| 2 | Consider, empty | ✓ | — (identical layout; drawn once, deltas noted) |
| 3 | Degraded / EDHREC-offline | — (banner is the shipped `DegradedBanner` shape at both widths) | ✓ |
| 4 | Quick add, idle | ✓ (in states 1–2) | ✓ |
| 5 | Quick add, typing (4 results incl. active row, in-deck row, unowned row) | ✓ | ✓ |
| 6 | Quick add, no results | — (same block, 16px type) | ✓ |
| 7 | Card already in deck | ✓ tile + row | ✓ tile + row |
| 8 | Owned/unowned filter, position A and position B | ✓ | ✓ |
| 9 | **Empty deck** (first-run and returning) — R2 | ✓ ✓ | ✓ |

Plus: the shape diagram (before/after), full tile anatomy with four tile states, the role
taxonomy before/after, and the a11y + motion + token contract.

Where a state is drawn once, it is drawn at the width where the distinction is legible and the
other width's delta is stated in the adjacent note card. No construct in this handoff exists at
one width only.

---

## Decisions log

### 1. Search and suggestions → **two surfaces, and the tab bar goes**
Not "two tabs, wider." The tab bar was the mistake: it makes two unlike things trade places, so
every quick add costs a switch back and every browse sits behind a control the player has to
notice first. Retrieval is a **persistent bar** — always mounted, live in both views, never a
mode. Discovery is a **view**. Archidekt names this split (pinned quick-add bar + separate
visual search); Moxfield ships it too. What we had was neither one.

### 2. Discovery lives in the **main column, full width, as a peer tab to the decklist**
`Your deck · 47 | Consider · 99`. One tap from the deck at any deck length, full width at both
breakpoints, and the mobile sheet is deleted along with the rail — the same two constructs at
every width, which is the locked parity constraint met structurally rather than by mirroring.

**Not** appended below the decklist. Spotify's append-below pattern works on a 30-row playlist;
below 99 rows it is a scroll nobody takes. **Not** an overlay — an overlay hides the deck you
are reasoning about, and the coverage strip stays visible above the tabs precisely so the
argument for a suggestion is on screen with it.

### 3. Tile hierarchy → **art → name+cost → type → evidence → Add. Role is the shelf.**
Art at the shipped `63/88` from `rec-card.tsx`, `commanderGradient()` as the null-`imageUri`
fallback — the same pattern as grid-view, card-modal and builder-spine, not a new one. Cost pips
bottom-left at 14px using the existing WUBRG swatches; ownership dot top-right at 8px on a dark
halo so it clears any art. Name 12.5px/600 wrapping to two lines (finding 3 was truncation);
type line mono 9.5px (finding 1, answered before the tile is even read).

**Role is never printed on the tile** — it is the shelf heading. Repeating "removal" on twelve
tiles inside a shelf called Removal is the kind of noise that makes a dense grid unreadable.

Desktop tile `168px` in a 6-up grid; phone the same tile 2-up with a `44px` Add. One tile, two
densities.

### 4. Detail invitation → **the art and the name; Add is a separate target**
Both are `CardDetailTrigger`. The invitation is a hover affordance (`details ↗` over a bottom
scrim) plus the plain fact that card art has been clickable everywhere else in this app since
#127. Two clickable regions and one button per tile — nothing else on the tile is a target, so a
mis-tap never costs a card.

**Siblings is the shelf.** Passing the shelf's ordered oracle-ids means Prev/Next pages the role
group — so a player comparing six removal spells does it in the modal without closing it once.
Today suggestions pass no siblings and the modal renders "1 of 1"; this is free.

### 5. Owned filter → **search only, position A, default on**
`suggestDeck()` iterates `ownedPool` only, so **every suggestion is already owned**. A toggle in
Consider would be a control with one setting. Finding 4 is really "the filter exists in
`search-pane.tsx` and is buried inside a tab" — so it moves into the bar, where it is legible
*before* you type, which is when it changes what you are about to see.

Both positions are drawn. **A** (inline in the bar, always visible) is the call: it is the only
placement that makes an empty result actionable — with the toggle on screen, "no results" reads
as *you don't own it* and the fix is one tap, not a discovery. **B** (in the results header) buys
tighter resting chrome and loses the control exactly when it is needed.

**Default flips to on.** Today it ships `useState(false)`. The product premise is building from
what you own and the deck already carries a shopping list for the rest. This is the one item in
this handoff that changes a shipped default — flagged in the gap report.

### 6. Reason chip → **inclusion % as bar + figure; coverage line on role picks**
The qualitative chip goes. EDHREC-sourced picks get the inclusion percentage that
`buildSuggestionPayload` already computes (`inclusionByName`), rendered as a 4px brass bar with
the figure beside it — the bar is scannable across a grid, the figure is the claim.

Role-sourced picks quote the **coverage gap** instead of `rec 10`: the shelf header already says
`you have 4 of 10`, so the tile says `fills a removal slot` and doesn't repeat the arithmetic.

Two honest omissions are drawn rather than faked: a card with no `imageUri` gets a flat plate
that says `no art on file`; a card EDHREC has no figure for prints `no EDHREC figure` rather
than a 0% bar, which reads as a verdict rather than an absence.

**Synergy/lift: requested, not assumed.** The brief is right that popularity and distinctiveness
are different claims and one figure states only the first. The tile has room for a second line.
What Design wants is *inclusion in this commander's decks minus the card's overall inclusion
rate* — a plain lift figure, `+31 pts` style, shown only where positive. Whether that baseline is
in the EDHREC payload we already fetch is the engineering question; **no tile in this handoff
depends on it.** If it is cheap, it lands as a second evidence line; if not, nothing changes.

### 7. Role "other" → **"Threats & synergy"**
Ratifies the brief's proposed position. The five roles are a coverage checklist — quantities to
reach — and everything else is the deck's gameplan, not its residue. The Consider shelf for this
group sorts last (it has no target to be short of) and its header reads
`no target — this is the deck's plan` rather than an n-of-m.

Scope: one string in `grouping.ts:65` plus the shelf header. **The `role` value stays `"other"`**
— no migration, no classification work, and the label stays free to change again. The
*card-type* group "Other" is untouched; the brief is right that only one of the two is a problem.

The strip keeps **"Recommended mix"**. It already frames itself as a guide ("a guide, not a
gate"); renaming it to "Coverage" spends a shipped, tested line on a synonym.

### 8. Staleness on accept → **the tile stays put, greyed and marked ✓ In deck**
The locked constraint is that accepting must not leave a dead row or a stale list. Removing the
tile satisfies the letter and breaks the interaction: a 6-up grid reflowing under the pointer
loses the player's place and re-targets the next Add button beneath their finger. So the tile
holds its slot for the session — art `grayscale(.6) opacity .5`, name lifted to `#A89B84`, Add
replaced by a non-interactive `✓ In deck`. What *does* update, immediately and optimistically:
the tab count, the shelf's `you have N of M`, and the coverage cell above. The list is not stale;
the accepted card is simply visibly spent.

### 9. Quick add carries a 30×42 thumbnail
A deliberate divergence from Archidekt, which loads no images in its quick-add on purpose. Magic
has a thousand cards whose names differ by one word, and a 30px crop settles *which* Study
faster than reading a type line. It is one column on `searchCards`'s select at four rows on
screen — not a grid of art, and not the reason the search feels fast or slow.

`↵` adds the top match; the active row carries the brass ring and an `↵ add` hint so the
shortcut is stated rather than assumed. No overlay, no dim: the results panel rises off the bar
and the deck stays lit behind it.

### 10. Add is always visible, never hover-revealed
EDHREC reveals its add affordance on hover. We don't. A hover-only primary action is invisible to
touch, invisible to keyboard, and invisible to anyone scanning a grid deciding whether this
surface does anything. The Add button is the surface's whole point; it gets a permanent slot.

---

## Component notes

Hexes live only in `globals.css`; everything below is `var(--*)`. **No new token is introduced.**

| Component | Spec |
|---|---|
| **Tab bar** | Replaces the panel tab bar in place, in the main column. Idle `500/14 --fg-faint`, active `600/14 --fg` + `2px --brass` bottom border; count in Plex Mono `12px`, brass when active. Mobile `13.5px`, `11px`. `role="tablist"`. |
| **Consider toolbar** | Right-aligned on desktop, split on mobile. Provenance mono `10.5px --fg-faint`; Sort is the shipped filter-button geometry (`--elevated` fill, `1px --border-strong`, radius `8px`, `7×12`). |
| **Shelf header** | Plex Mono `11px`, `letter-spacing .14em`, uppercase, `--brass`; coverage clause mono `11px --fg-faint`; `Show all N` link right. Mobile `10.5px` / `10px`. |
| **Tile** | `--surface` fill, `1px --border`, radius `10px`, padding `9px 9px 10px`, `gap 8px`. Hover `--elevated-hover` fill / `--border-strong` border. Desktop col `168px` (6-up at 1000px content), mobile 2-up. |
| **— art** | `aspect-ratio 63/88`, radius `7px`, `commanderGradient()` fallback, `inset 0 -26px 30px -22px rgba(0,0,0,.65)` + `inset 0 0 0 1px rgba(0,0,0,.3)` — lifted verbatim from `rec-card.tsx:222`. |
| **— cost pips** | `14px`, radius `999px`, WUBRG hexes from `browse.ts`, `inset 0 0 0 1px rgba(0,0,0,.45)`. Generic pip `--fg-faint` with the numeral in Plex Mono `9/600 --bg`. Bottom-left, `gap 3px`. |
| **— ownership dot** | `8px`, `--success`, `box-shadow 0 0 0 2px rgba(10,8,6,.7)` so it clears any art. Top-right. |
| **— name / type** | Name Plex Sans `12.5/600 --fg` (mobile `13`), two-line clamp. Type Plex Mono `9.5px --fg-faint` (mobile `10`), one line, ellipsed. |
| **— evidence** | Track `4px --border` radius `999px`; fill `--brass`. Figure Plex Mono `10px --fg-body`, tabular. Degraded / role picks replace the whole row with mono `10px --fg-faint`. |
| **— Add** | Full width, `--brass` fill, `--bg` label, `12/600`, radius `7px`, `7px 0`. Hover `--brass-hover`. Mobile `height 44px`, `14px`. |
| **— in deck** | Art `grayscale(.6) opacity .5`, name `--fg-muted`, bar `--brass-shadow`, button → `✓ In deck` `--success` `600/12` in a `1px --border` box, `aria-disabled`. |
| **Quick-add bar** | Container `--bg`, `1px --border` top. Field `--surface-sunken`, `1px --border-strong` → `1px --brass` on focus, radius `8px`, height `38px` desktop / `44px` mobile, text `14px` / **`16px`** (iOS zoom floor). Leading `⌕ --fg-faint`; trailing clear `✕` in a `--elevated` circle once a query exists. Reuses `SearchField` from `text-field.tsx`. |
| **Results panel** | Rises off the bar, `--bg`, `1px --border-strong` top, `0 -16px 40px rgba(0,0,0,.5)`. Max height `400px` desktop / `290px` mobile, scrolls. No backdrop, no dim. |
| **Result row** | `--surface`, `1px --border`, radius `9px`, min-height `52px` (mobile `56px`). Active row `1px --brass`. Thumb `30×42` (mobile `32×45`), radius `5px`. Name `14/600 --fg` with the matched substring in `--brass`; meta mono `11px --fg-faint`. Right slot: `↵ add` on the active row, `Add` ghost button otherwise, `✓ In deck` `--success` when present. |
| **Owned toggle** | The shipped `search-pane.tsx` toggle unchanged — `30×17` track, `13px` knob, `--brass` / `--elevated`. Moves from the search meta row into the bar. Default **on**. |
| **Degraded banner** | Reuses the shipped shape: `--surface-sunken`, `1px --border`, `border-left 3px --warning`, radius `9px`, `11×15`, `⚠` + `12.5px --fg-body`, underlined brass `Try again`. |
| **Consider empty** | Three `--border-strong` diamonds (card-fan stand-in — rebuild as `CardFan`), Cinzel `600/18 --fg`, body `13.5px --fg-body`, secondary CTA `1px --border-strong` per the §404 secondary-CTA contract. |

## Notes for engineering

- **`add-panel.tsx` is retired**, along with its `variant` discriminated union, `SheetWrapper`,
  and the `useDialogA11y` mount. Nothing in this design is modal, so no focus trap, no
  body-scroll lock, no focus-return.
- **`builder-shell.tsx`**: the `<aside width:340>` goes; `sheetOpen` state goes; the mobile
  sticky `+ Add cards` footer becomes the quick-add bar (same slot, same sticky). New
  `view: "deck" | "consider"` state beside the existing `filter` / `grouping`.
- **New:** `consider-panel.tsx` (shelves + grid), `suggestion-tile.tsx` (replaces
  `suggestion-card.tsx`), `quick-add-bar.tsx` (replaces `search-pane.tsx` +
  `search-result-row.tsx`).
- **Payload:** `suggest.ts` must stop dropping `imageUri` when building `DeckSuggestion` — one
  field. `search-action.ts` needs `imageUri` added to the select and to `SearchResult` — one
  column, one field. Both are named in the brief's §What already exists.
- **`role-counter-strip.tsx`** gains a link per under-target cell (`href="#shelf-removal"` +
  `onClick` switching to the Consider view). The strip's own layout is untouched.
- **`grouping.ts:65`** — one label string.
- **Optimistic-first is inherited unchanged.** `use-deck-mutation.ts` + `useAddOptimisticCard`
  drive both surfaces exactly as `suggestion-card.tsx` does today; the tile's `✓ In deck` is the
  existing `applied` flag and `MutationError` renders beneath the tile on refusal.
- **The one deliberate keep:** `AddPanel` is fed the **server** `deckOracleIds`, not the
  optimistic list, because `use-deck-mutation` clears a row's error whenever that value changes.
  Both new components must keep taking the server list for the same reason — the comment at
  `builder-shell.tsx:70` explains why, and it is easy to "fix" by accident.
- **No new dependency.** The grid is CSS; the combobox is `useState` plus key handling; 99 tiles
  need no virtualisation (`commanders-windowing` set the precedent at 214).
- **Motion:** one new class, `.anim-quickadd-in` — 140ms ease-out, opacity + 6px rise — joining
  the explicit list in the `prefers-reduced-motion` block at `globals.css:237-243`, per that
  block's stated explicit-fallback pattern. Reduced motion: appears in place, opaque. Dismissal
  is instant in both modes. Tiles do not animate on add.
- **`.anim-sheet-in` retires with the sheet.** It is the bottom sheet's entrance and has no
  other caller; remove the keyframes, the class, and its entry in the `prefers-reduced-motion`
  block at the same time as `variant="sheet"`. Net motion change for this pass: one class in,
  one class out.
- **Copy** lives in `src/lib/copy/decks-builder.ts` — see `add-panel · copy strings.ts` in this
  folder, keyed and ready to paste, following `shell.ts`'s shape.
- **Mock data:** card names, types and colour identities are real; a Jeskai deck
  (Kykar, Wind's Fury) at 47/99. Inclusion percentages are plausible but **fabricated** — do not
  read them as EDHREC figures.

## Accessibility contract

```
div[role=tablist]
  button[role=tab][aria-selected][aria-controls]
section[role=tabpanel][aria-label="Cards to consider"]
  section[aria-labelledby=shelf-removal]
    ul > li > (button.art + button.name + button.add)

input[role=combobox][aria-expanded][aria-controls=qa-results][aria-activedescendant]
ul#qa-results[role=listbox] > li[role=option][aria-selected]
```

- **Quick add is not a dialog.** DOM focus never leaves the input; `↑↓` move
  `aria-activedescendant`, `↵` adds the active row, `Esc` dismisses results and keeps the query,
  a second `Esc` clears it. No trap, no `aria-modal`, no scroll lock.
- **Consider** tabs in DOM order: art → name → Add → next tile. Shelves are labelled sections so
  a screen reader can skip a whole shelf.
- **Adds announce on the builder's existing live region** —
  `Sol Ring added · 48 of 99 · removal 5 of 10` — so five fast adds read in order rather than on
  top of each other. One region, not one per surface.
- **Colour is never the sole signal.** Ownership is a dot *and* a word in the row; "in deck" is
  greyscale *and* a `✓ In deck` label *and* `aria-disabled`.
- **Contrast:** tile name `--fg` on `--surface` ≈ 12.4:1; inclusion figure `--fg-body` ≈ 8.1:1;
  type line `--fg-faint` ≈ 4.6:1 (AA, and supplementary to the name). The inclusion bar is
  decoration for a figure that is always present in text.
- **Tap targets:** mobile Add `44px`, result rows `56px`, tab targets `44px`. Quick-add field
  text is `16px` on mobile so Safari does not zoom on focus — the gap the filter-panel handoff
  left open, closed here rather than deferred again.
- **Focus** is the global `:focus-visible` from `globals.css` — `2px var(--brass)` at `+2px` —
  not overridden anywhere in this flow.

## Gap report

Things this handoff deliberately does **not** answer, for the audit:

1. **The owned-filter default flips.** `search-pane.tsx` ships `useState(false)`; decision 5
   makes it `true`. It is the only shipped default this handoff changes, and it is a product
   call as much as a design one. If it stays `false`, nothing else in the design moves — the
   toggle is in the same place either way.
2. **Synergy/lift is requested, not designed against.** Decision 6 states what Design wants
   (`inclusion in this commander's decks − the card's overall inclusion rate`) and no state here
   depends on it. Engineering to confirm whether the baseline is in the payload we already
   fetch. If it is not, this closes as "one figure, as today."
3. **"Suggest cards you don't own" is a different feature.** `suggestDeck()` cannot produce
   unowned cards, so Consider has no owned/unowned axis. Whether the app should ever propose a
   card to *buy* is a real question — the deck already has a shopping list — but it is an
   algorithm change and out of scope per the brief.
4. **Shelf cap of 12 is a guess.** Twelve fills two desktop rows and six phone rows before
   `Show all`. Not user-tested; the number is a one-line change.
5. **`role-counter-strip.tsx` linking to shelves** assumes the strip stays above the tabs at
   both widths. It does today. If the mobile spine ever collapses the strip, the link needs
   somewhere else to live.
6. **Sort persistence.** The Consider sort is plain component state — it resets on navigation,
   like the decklist's grouping toggle. Consistent with the surface; not obviously right.
7. ~~**`docs/superpowers/design-tables/decks.md` is not in this project.**~~ **Closed at R2** —
   rows diffed audit-side; `§2182` added to the superseded list above.
   *(Original note retained for the record:)* **`docs/superpowers/design-tables/decks.md` is not in this project.** The App Shell table is,
   but the decks table is not, so I could not confirm which rows this supersedes beyond the
   components named above. The `§Panel`, `§Suggestion Card`, `§Search (within Add Panel)` and
   `§Bottom sheet` sections referenced in `add-panel.tsx`'s comments are all superseded by this
   pass; please diff before merging.
8. **Two shipped comments I did not want to break.** `builder-shell.tsx:70` (server list, not
   optimistic, feeds `inDeck`) and `card-detail-provider.tsx` (trigger never `disabled` while
   fetching, or focus-return has nothing to return to). Both carry into the new components and
   both are the kind of thing a rewrite quietly loses.

## Files
- `The 99 - Decks · Add Panel.dc.html` — the canvas (this handoff's deliverable).
- `add-panel · copy strings.ts` — the copy block for `src/lib/copy/decks-builder.ts`.
- `READINESS.md` — readiness rating and what is blocking a green.
- `brand/` — the locked brand sheet + brand README, copied in for self-containment.
- `support.js` — runtime for the HTML reference; not production code.
