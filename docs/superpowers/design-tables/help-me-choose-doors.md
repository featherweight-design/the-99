# Design Property Table — Help me choose PR 6b (doors, hand-off, credit strings)

**Source:** `design/design_handoff_the99_help_me_choose/` — `HANDOFF.md` §1, §6, §7, §8; `STATES-help-me-choose.md`
(1a, 1b, 6a, 6b); `READINESS.md`; `READINESS-audit.md` (F3, F5, F9, F10, F12 — these OVERRIDE the canvas);
`help-me-choose · copy strings.ts` (`door`, `handOff`); `Doors.dc.html` (`door`, `phone`); `Hand-off.dc.html`
(`state`, `phone`); `The 99 - Help Me Choose.dc.html` (frame captions 1a, 1b, 6a–6d).
Existing elements identified from `create-picker.tsx`, `create-pre-filled.tsx` and `credits.ts` only to exclude them.

**Scope:** only what is NEW or CHANGED. Everything else on `/decks/new`, the Discover rack and `CreatePreFilled`
ships as-is (HANDOFF §1 "The picker's rows, sidebar, dock and copy don't change"; §6 "Everything that ships stays
as-is"; §8.7 "Where they disagree, the code wins").

**Widths:** the canvas draws two discrete frames, 1300 (Desktop) and 390 (Mobile, `phone`). No breakpoint is drawn;
the app splits at `md:` (768px), which both `create-picker.tsx` and `create-pre-filled.tsx` already use.

**Global conventions**
- Mono = `var(--font-mono)` (canvas writes `'IBM Plex Mono',monospace`); sans = the body face.
- **Display face:** the canvas writes `var(--display)`. **Audit F12:** a canvas-local alias; ship the `font-display`
  class / `var(--font-display)`.
- **Switch (audit F3):** `HELP_ME_CHOOSE_ENABLED` gates the route and BOTH doors. Off → no picker door, no Discover
  link, `/decks/new/choose` answers not-found.
- **Copy (audit F10):** every new string below lives in the copy module, not inline, so `check:copy-drift` sees it.

---

## Component: CreatePicker door (`/decks/new`, create mode)

Source: `Doors.dc.html` `s.door`, `s.doorHead`, `s.doorBody`, `s.doorBtn`; HANDOFF §1.

### Placement

| Property | Mobile | Desktop |
|---|---|---|
| parent | picker's list column (left column) | same |
| order | FIRST child, above the search field; on a phone therefore also above the in-flow Deck name field | first child, above the search |
| never in | the dock (HANDOFF §1; `create-picker.tsx` B1 height rule) | the sidebar |
| gap below (to search) | 14px (canvas list column `gap: 14`) | 16px (canvas `gap: 16`) |
| mode | create mode only; **never** `mode="import"` (HANDOFF §7.2) | same |
| flag | renders only when `HELP_ME_CHOOSE_ENABLED` (F3) | same |

Note: the code's search carries `mb-[16px]` at both widths; the canvas's 14px phone gap is the door→search gap only.

### Door box

| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| flex-direction | column | row |
| align-items | stretch | center |
| gap | 10px | 18px |
| padding | 13px 14px | 15px 18px |
| border-radius | 10px | 11px |
| background | `var(--surface-sunken)` | `var(--surface-sunken)` |
| border | 1px solid `var(--border-strong)` | 1px solid `var(--border-strong)` |

### Text column (head over body)

| Property | Mobile | Desktop |
|---|---|---|
| display / direction | flex, column | flex, column |
| gap | 4px | 4px |
| flex | 1 | 1 |
| min-width | 0 | 0 |

### Head — "Not sure what to build?"

| Property | Mobile | Desktop |
|---|---|---|
| font-family | display (`font-display`) | display |
| font-weight | 600 | 600 |
| font-size | 14.5px | 16px |
| color | `var(--fg)` | `var(--fg)` |

HANDOFF §1 states display 600 16 (desktop); the 14.5 phone size is the canvas's only.

### Body line

| Property | Mobile | Desktop |
|---|---|---|
| font-size | 12.5px | 13px |
| line-height | 1.55 | 1.55 |
| color | `var(--fg-body)` | `var(--fg-body)` |

HANDOFF says "one line at 13"; at 390 it wraps (canvas does not clamp). No truncation is drawn.

### Button — "Help me choose →" (outlined in accent)

| Property | Mobile | Desktop |
|---|---|---|
| element | navigation to `/decks/new/choose` (canvas `role="button"` span; it navigates, so a link) | same |
| flex | none | none |
| width | full width (stretched by the column's `align-items: stretch`) | content |
| height | 44px | 38px |
| display / align / justify | flex, center, center | flex, center, center |
| padding | 0 16px | 0 16px |
| border-radius | 8px | 8px |
| border | 1px solid `var(--accent)` | 1px solid `var(--accent)` |
| background | — (transparent) | — |
| color | `var(--accent)` | `var(--accent)` |
| font-size | 13.5px | 13.5px |
| font-weight | 600 | 600 |
| hover | not drawn (canvas only sets `a:hover { color: var(--accent-hover) }` globally, and this is a span) | same |
| focus | not drawn | not drawn |

### Page sub (desktop) — changed

| Property | Mobile | Desktop |
|---|---|---|
| text | unchanged: "From your collection." (canvas agrees with the code) | "Pick a commander from your collection, or let us help." |
| styling | unchanged | unchanged (existing `md:` 14px `--fg-muted` span) |

**F9:** this replaces `addPanelCopy.createPicker.sub` ("Choose a commander from your collection.") and goes through
`/copy-review`. HANDOFF §1 and READINESS call the drawn line a placeholder.

---

## Component: Discover result-line link (`/discover` rack)

Source: `Doors.dc.html` `s.resultLine`, `s.link`; HANDOFF §1; audit F5.

### Placement (audit F5 overrides the canvas's structure)

| Property | Mobile | Desktop |
|---|---|---|
| mount | the chassis `resultTrailing` slot, passed by the rack on the **Discover lane only** | same |
| not on | `/commanders`, `/collection`, any other chassis route | same |
| position | its own line UNDER the count | right end of the result line (`margin-left: auto`) |
| rack height | grows by one row on a phone, below the controls row | unchanged |
| flag | only when `HELP_ME_CHOOSE_ENABLED` (F3) | same |

The canvas draws the result line itself (row, `align-items: baseline`, gap 16 desktop; column, `align-items:
flex-start`, gap 8 phone; `padding-bottom: 12`, `border-bottom: 1px solid var(--border)`). That line exists in
`ResultLine` today: **the code wins** for everything but the slot. The phone's own line under the count is new layout
in that slot (F5).

### Link wrapper — lead + link

| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| align-items | center | center |
| gap | 5px | 5px |
| margin-left | 0 | auto |
| min-height | 44px | auto |
| font-size | 12.5px | 12.5px |
| color (lead) | `var(--fg-muted)` | `var(--fg-muted)` |
| font-family | sans | sans |

### Link text — "Help me choose →"

| Property | Mobile | Desktop |
|---|---|---|
| color | `var(--accent)` | `var(--accent)` |
| underline | `border-bottom: 1px solid color-mix(in oklab, var(--accent) 50%, transparent)` ("a 50% underline") | same |
| text-decoration | none (the line is a border) | none |
| font-weight | inherits (not set) | inherits |
| hover | not drawn on the span; the canvas's global `a:hover` is `var(--accent-hover)` | same |
| focus | not drawn | not drawn |
| href | `/decks/new/choose` carrying Discover's `c` and `m` (lane-params encoding; `m=exact` = Exactly) | same |
| carries | colors only. Search, order and scope do NOT carry (HANDOFF §1) | same |

Tap target: the 44px min-height is on the wrapper; the link text alone is 12.5px. Make the 44px line the target.

---

## Component: CreatePreFilled, reached from Help me choose

Source: `Hand-off.dc.html` (`state="form"` / `"creating"`); HANDOFF §6. Everything not listed ships as today: the
header, the card, Legal · validated, the desktop Color identity row, Deck name, the button pair, the helper line.
Phone gets no identity row (HANDOFF §6).

### Mode

| Condition | Rendered |
|---|---|
| reached from Help me choose (answers in the URL) | back targets → results, both subs changed, the answers block, ghost reads "Back to results", `createDeck` receives budget, bracket and card (§7.6) |
| reached from the picker or a commander page | today's component, byte for byte |

### Back link — desktop

| Property | Mobile | Desktop |
|---|---|---|
| text | — (hidden) | "‹ Help me choose · results" (was "‹ Commanders · {name}") |
| href | — | the results screen, answers kept |
| styling | — | unchanged: mono 11, `--fg-faint`, block, mb 6 |

### Back chevron — phone

| Property | Mobile | Desktop |
|---|---|---|
| glyph | "‹" alone (canvas: 18px, line-height 1, `--fg-faint`) — unchanged | — |
| href | the results screen | — |
| accessible name | not drawn. Today's "Back to commander picker" becomes wrong; see open questions | — |

Disagreement: the copy file has `handOff.backPhone` "‹ Results", but the canvas draws the bare chevron. Canvas and
code agree on the bare chevron; treat `backPhone` as the chevron's accessible name, or drop it (open question).

### Subs

| Property | Mobile | Desktop |
|---|---|---|
| text | "From your answers" (was "Commander selected") | "Name your deck. It will be built from your answers." (was "Name your deck.") |
| styling | unchanged: mono 10, `--fg-faint`, mt 1 | unchanged: 14px sans, `--fg-muted`, mb 26 |

Disagreement: HANDOFF §6 lists "the mobile ‹ chevron row with *Commander selected*" as staying, then its "What
changes" says the phone sub reads *From your answers*. The canvas and the copy file both draw *From your answers*.
The "What changes" line wins; the chevron row stays, its sub changes.

### Ghost button

| Property | Mobile | Desktop |
|---|---|---|
| text | "Back to results" (was "Change commander") | same |
| href | the results screen, answers kept | same |
| styling | unchanged `GhostButton` (13px, p 11px 0) | unchanged (14px, p 13px 20px) |

### Primary button (creating, 6b)

Unchanged: "Creating…" at opacity 0.4. The block stays as drawn during creating (6b draws the same form).

### Answers block — "Built from your answers"

#### Position

| Property | Mobile | Desktop |
|---|---|---|
| after | the Legal · validated strip (mb 24 on a phone) | the Color identity row (mb 24) |
| before | the Deck name label | the Deck name label |
| margin-bottom | 24px | 24px |

#### Container

| Property | Mobile | Desktop |
|---|---|---|
| display / direction | flex, column | flex, column |
| gap | 12px | 12px |
| padding | 14px (all sides) | 16px 18px |
| border-radius | 11px | 11px |
| background | `var(--surface-rail)` | `var(--surface-rail)` |
| border | 1px solid `var(--border)` | 1px solid `var(--border)` |

#### Heading row

| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| align-items | baseline | baseline |
| gap | 10px | 10px |

Heading "Built from your answers":

| Property | Mobile | Desktop |
|---|---|---|
| font-family | mono | mono |
| font-size | 10px | 10px |
| letter-spacing | 0.14em | 0.14em |
| text-transform | uppercase | uppercase |
| color | `var(--fg-faint)` | `var(--fg-faint)` |

"Change":

| Property | Mobile | Desktop |
|---|---|---|
| margin-left | auto | auto |
| font-family | mono | mono |
| font-size | 11px | 11px |
| color | `var(--accent)` | `var(--accent)` |
| underline | — (none drawn) | — |
| target | not stated; presumably the intake FORM with its state kept (the results' "Change answers") | same |
| hover / focus | not drawn | not drawn |

#### Row

| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| flex-direction | column | row |
| align-items | baseline | baseline |
| gap | 4px | 12px |

Key (mono):

| Property | Mobile | Desktop |
|---|---|---|
| width | auto | 104px |
| flex | none | none |
| font-family | mono | mono |
| font-size | 10px | 10px |
| letter-spacing | 0.1em | 0.1em |
| text-transform | uppercase | uppercase |
| color | `var(--fg-locked)` | `var(--fg-locked)` |

Value column:

| Property | Mobile | Desktop |
|---|---|---|
| flex | 1 | 1 |
| min-width | 0 | 0 |
| display / direction | flex, column | flex, column |
| gap | 2px | 2px |

Value:

| Property | Mobile | Desktop |
|---|---|---|
| font-size | 13.5px | 13.5px |
| font-weight | 600 | 600 |
| color | `var(--fg)` | `var(--fg)` |
| card value only | `border-bottom: 1px dotted var(--accent)`, `align-self: flex-start` | same |

Buy tag after the card value (drawn; HANDOFF §3's card chip names `BuyTag variant="row"`, and the component wins):

| Property | Mobile | Desktop |
|---|---|---|
| margin-left | 8px | 8px |
| font | mono 9.5px, weight 400 | same |
| border-radius | 4px | 4px |
| padding | 1px 5px | 1px 5px |
| color | `var(--warning)` | same |
| background | `color-mix(in oklab, var(--warning) 13%, transparent)` | same |
| content | "buy" · separator (`--border-strong`, padding 0 3px) · price (`--fg-body`) | same |
| shown when | the card is not owned. Unpriced: `buy · no price` (HANDOFF §3 card chip) | same |

Consequence line:

| Property | Mobile | Desktop |
|---|---|---|
| font-size | 12px | 12px |
| line-height | 1.5 | 1.5 |
| color | `var(--fg-muted)` | `var(--fg-muted)` |

#### The rows, in order (canvas 6a: theme + card + $150 + bracket 2)

| # | Key text (canvas) | Value | Consequence (copy key) | Condition |
|---|---|---|---|---|
| 1 | THEME | the theme name, e.g. `Dinosaurs` | canvas: "91% of its decks are Dinosaurs." = `results.figTheme(pct, t)` + "." No `handOff` key exists | a theme was answered |
| 2 | BUILT AROUND | the card name, dotted accent underline, + buy tag | `handOff.placed` | a build-around card was answered |
| 3 | BUDGET | the cap, e.g. `$150` | `handOff.budgetFirst(card, price)` | budget AND a card with a price on record |
|   |   |   | `handOff.budgetUnknown(card)` | budget AND a card with no price on record |
|   |   |   | — no string exists | budget with NO card (undrawn; open question) |
| 4 | BRACKET | `{n} · {name}`, e.g. `2 · Core` | `handOff.bracket(n)` | a bracket was answered |

- **Absent answers:** a row renders only for an answer that was given ("No input is required", STATES; "listing
  only the answers given", HANDOFF §6 for the intent line). Colors and the words are never rows; colors show in the
  identity row.
- **No answer row at all** (a blank or colors-only submit): undrawn. Open question: hide the block.

Canvas vs copy disagreements (the canvas's consequence strings are not the copy file's):
- BUILT AROUND: canvas "Placed in the deck because you asked for it. **64% of its decks run it.**"; `placed` has no
  figure. The figure sentence has no key.
- BUDGET: canvas "Regisaur Alpha takes $1.10 of it first. The fill buys the rest while the price fits, **then**
  finishes with basics."; `budgetFirst` reads "…buys the rest **in its own order** while the price fits, **and**
  finishes with basics."
- BRACKET: canvas "Every card the fill chooses stays inside bracket 2."; `bracket` reads "The fill keeps every card it
  chooses inside bracket {n}’s limits."
- Row keys (THEME, BUILT AROUND, BUDGET, BRACKET) have no copy keys.

Which wins: copy wording goes to `/copy-review` (F9/F10 route); build from the copy file's keys and flag the three
disagreements there. The canvas's layout wins for layout.

---

## Widened credit strings (F9) — keys only

- `creditsCopy.spent` — its tail widens to name deeper looks. Ruled by Hugh (2026-09-25, /copy-review): "Suggestions,
  overviews and deeper looks share these credits." The canvas drew the list in the other order. The noun "overview" is Hugh's.
- `PAUSED_REASON` (read by `creditsCopy.paused` and `creditsCopy.pausedReason`) — widened in the same order: "…monthly limit for suggestions, overviews and deeper looks."
- `addPanelCopy.createPicker.sub` — the desktop picker sub (above).

All three go through `/copy-review`.

---

## State Coverage

| State | Triggering condition | Rendered | Key props/params |
|---|---|---|---|
| 1a door, create | `/decks/new`, create mode, flag on | door first in the list column; picker unchanged below | `mode="create"` |
| 1a door, import | picker in `mode="import"` | no door | `mode="import"` |
| door, flag off | `HELP_ME_CHOOSE_ENABLED` off | no door; picker sub unchanged? (open) | flag |
| 1a phone | < md | door stacked, button 44 full width, above the name field, not in the dock | — |
| 1b Discover link | Discover lane, flag on | lead + link in `resultTrailing`; right end desktop, own 44px line on a phone | `c`, `m` carried |
| 1b colors lit | e.g. Red · Green, Any | link URL carries `c=rg` (lane-params) and `m` only when Exactly | lane-params |
| Discover link elsewhere | `/commanders`, other chassis routes | nothing | lane = discover only |
| 6a hand-off form | row or best fit pressed on results | back link/chevron → results, new subs, answers block, "Back to results" | answers in the URL |
| 6a no card | card not answered | no BUILT AROUND row; BUDGET consequence undefined | — |
| 6a card owned | card owned | no buy tag | owned |
| 6a card unpriced | card has no price | buy tag `buy · no price`; BUDGET uses `budgetUnknown` | `cardUnpriced` |
| 6a no answers | blank / colors-only submit | undrawn (open question) | — |
| 6b creating | submit pending | "Creating…" at 0.4; block unchanged | `isPending` |
| 6c landed / 6d fill failed | out of scope for this table (6c: seeded intent line; 6d: `FillFailedBanner`, audit F1) | — | — |

## Copy keys

- Door head → `helpMeChooseCopy.door.head`: "Not sure what to build?"
- Door body → `door.body`: "Say what you want, and we’ll rank commanders by how well they fit it, owned or not."
- Door button and Discover link → `door.cta`: "Help me choose →"
- Discover lead → `door.discoverLead`: "Not sure what you want?"
- Picker desktop sub → `addPanelCopy.createPicker.sub` (F9), drawn: "Pick a commander from your collection, or let us
  help." (not in the copy strings file; placeholder)
- Desktop back link → `handOff.back`: "‹ Help me choose · results"
- Phone back → `handOff.backPhone`: "‹ Results" (not drawn; chevron only)
- Desktop sub → `handOff.sub`: "Name your deck. It will be built from your answers."
- Phone sub → `handOff.subPhone`: "From your answers"
- Block heading → `handOff.block`: "Built from your answers"
- Block action → `handOff.change`: "Change"
- BUILT AROUND consequence → `handOff.placed`: "Placed in the deck because you asked for it."
- BUDGET consequence, priced card → `handOff.budgetFirst`: `${card} takes ${price} of it first. The fill buys the rest in its own order while the price fits, and finishes with basics.`
- BUDGET consequence, unpriced card → `handOff.budgetUnknown`: `${card} has no price on record, so the budget can’t count it. The fill caps the rest as usual.`
- BRACKET consequence → `handOff.bracket`: `The fill keeps every card it chooses inside bracket ${n}’s limits.`
- THEME consequence → no `handOff` key; canvas text matches `results.figTheme`: `${pct}% of its decks are ${t}` (plus a closing period)
- Ghost button → `handOff.backToResults`: "Back to results"
- Row keys THEME / BUILT AROUND / BUDGET / BRACKET → no key (canvas text only)
- Bracket value name (`2 · Core`) → no key in this file (the bracket's existing name)
- `handOff.seededBriefAnswers` → 6c, out of scope here

## Open questions

1. BUDGET row with no build-around card: no consequence string exists and none is drawn.
2. THEME row: the consequence reuses a results figure (`figTheme`) that needs the chosen commander's percentage at
   hand-off; no `handOff` key. Several themes: one row per theme, or one row joined? Undrawn.
3. BUILT AROUND: the canvas appends "64% of its decks run it." with no key.
4. Three consequence strings differ between canvas and copy file (above); `/copy-review` decides.
5. The phone chevron's accessible name, and whether `handOff.backPhone` is drawn text or that name.
6. "Change": its target (form with state kept is assumed), and its tap target is 11px mono with no 44px box on a phone.
7. A submit with no row-worthy answer: hide the block, or draw it empty.
8. Whether the desktop picker sub changes when the flag is off (it says "or let us help").
9. Whether the card value opens `CardModal` here, as its dotted accent underline does on the results chips.
