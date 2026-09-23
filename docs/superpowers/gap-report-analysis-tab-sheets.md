# Gap report — Analysis tab: the sheets (PR A)

Verified against `docs/superpowers/design-tables/analysis-tab-sheets.md` (READINESS rulings applied; finding 10 honoured by the measured `closeReserve`). Worktree HEAD `b2e71583`.

## Pass 1 — row by row

### ModalChrome — container
- Position: ✅ MATCH (phone `h-[calc(100%-52px)]` + `items-end`; desktop centred)
- Width 560/700/760: ✅ MATCH (`WIDTH_CLASS`; receipt 760, 3b 700, reasoning 700, 3c 560)
- Background `--surface-raised`: ✅ MATCH (reasoning's `--elevated` via `ground` is out of this table)
- Border / radius: ✅ MATCH
- Shadow: ❌ MISMATCH — design: phone none, desktop `0 24px 60px rgba(0,0,0,.45)`, none when behind / impl: `var(--modal-shadow)` (`0 40px 100px rgba(0,0,0,.7)`) at both widths and in both states
- Overflow hidden: ✅ MATCH
- Layout (desktop block): ✅ MATCH in effect (flex column, no visible difference)
- Backdrop: ✅ MATCH

### Header row
- Height 43 / flex none; padding 0 6 0 16 (via `-mr-[10px]` on the 44px close): ✅ MATCH
- Desktop padding 14 18, gap 9/10, align, border, order: ✅ MATCH
- `mark` optional: ✅ MATCH

### Title
- Family/weight/colour: ✅ MATCH; 15/16 default, 3b 14 lh1.15 / md 16: ✅ MATCH; 3c nowrap (`truncate`): ✅ MATCH

### Aside
- mono 11.5/12 `--fg-faint`; receipt only (3b/3c pass none): ✅ MATCH

### Close
- 44×44, glyph mono 14 faint, `ml-auto`, labels `closeUpgradePath` / `closeProvenance`: ✅ MATCH

### Stacked — sheet behind
- Stays in place, same width: ✅ MATCH
- Background `--surface-sunken`, border steps to `--border`: ✅ MATCH
- Shadow none: ❌ MISMATCH — design: — / impl: `--modal-shadow` still applied
- Header opacity 0.55, title `--fg-muted`, body opacity 0.35: ✅ MATCH
- Second backdrop skipped: ✅ MATCH (card modal `transparent` when stacked)

### Card sheet (stacked)
- Phone top 96, radius 14 14 0 0, border-top strong, bg sunken; desktop bg rail, radius 16: ✅ MATCH
- Shadow: ❌ MISMATCH — design: phone `0 -10px 30px rgba(0,0,0,.35)`, desktop `0 -6px 40px rgba(0,0,0,.5)` / impl: `var(--modal-shadow)` in both
- Phone ✕ unchanged; nothing added but the pill: ✅ MATCH

### Back pill
- Drawn desktop only in `closeRefs[1]`: ✅ MATCH
- top 22 / right 24, height 34, padding 0 14 0 12, radius pill, bg raised, border strong, mono 11 `--fg`, nowrap, `← {label}`: ✅ MATCH
- Gap: ❌ MISMATCH — design: 7px / impl: `gap-[6px]`
- Display inline-flex: ✅ MATCH in effect (`flex`, absolutely positioned)
- Label source: receipt → finding label ✅; 3b → `BRACKET_NAMES[target]` ✅; reasoning → title (default) ✅
- Name-block reserve widened, measured: ✅ MATCH (`closeReserve = offsetWidth + 12`, ResizeObserver)
- Unset → shipped 34px ✕: ✅ MATCH

### Stack interaction
- Esc pops one, backdrop closes, focus returns: ✅ MATCH (per `useDialogA11y` and provider registration; not re-proved here)

### 3a Receipt
- Width 760, opener, title, aside count: ✅ MATCH
- Header mark 16px `--fact` + glow: ⚠️ glow is `CardFactMark`'s `color-mix(in srgb…)` (shared, shipped component) where the table says `oklab` — counted below
- Grid columns 2 / 4: ✅ MATCH
- Grid gap: ❌ MISMATCH — design: 14px row / 11px col (phone), 18px row / 12px col (desktop) / impl: `gap-[11px] md:gap-[9px]` (uniform)
- Grid padding: phone 14 16 ✅; desktop ❌ MISMATCH — design: 18px 20px 22px / impl: `md:px-[18px] md:py-[16px]`
- Tile layout gap: ❌ MISMATCH — design: 6px / 7px / impl: `gap-[5px] md:gap-[6px]`
- Tile art aspect 63/88, border strong: ✅ MATCH
- Tile art radius: ❌ MISMATCH — design: 8px / impl: `rounded-[6px]`
- No fact mark on tile: ✅ MATCH
- Tile name size: ❌ MISMATCH (phone) — design: 11.5px phone / 12px desktop / impl: `text-[12px]` both
- Tile name lh 1.3, `--fg-body`, sans, press opens stacked card: ✅ MATCH
- Combo body unchanged, 96px pair: ✅ MATCH

### 3b What would have to go
- Width 700, climb-below opener, 22px chip mark, title sentence, no aside, no chips/decklist link: ✅ MATCH
- Body padding: phone 14 16 ✅; desktop ❌ MISMATCH — design: 16px 18px 18px / impl: `md:px-[18px] md:py-4` (16 bottom)
- Body gap 11/13: ✅ on the outer column, but ❌ MISMATCH between rule boxes — design: rule boxes are body children at 13px desktop / impl: inner wrapper `md:gap-[9px]`
- Rule box (layout, grid 150/1fr baseline, gap 4 18, border, radius 9, sunken, padding 11 12 / 12 13, label, sentence 12.5/13 lh1.6, strong 600 `--fg`): ✅ MATCH
- Candidate list (phone col, start, gap 7, mt 2; desktop col 2 spacer, wrap, center, gap 6 14, mt 5): ✅ MATCH
- Item inline-flex gap 5, name 12.5 `--fg` dotted accent, press → stacked card with `← Upgraded`: ✅ MATCH
- Foot (border-top, pt 11, col gap 8 / row start gap 16, flex-1, 12 lh1.6 faint, bold 600 body): ✅ MATCH

### 3c How we make these decisions
- Width 560, no mark, no aside, title `provenance.toggle`, never stacks: ✅ MATCH
- Body content unchanged, lead `--fg-body`, base 12.5/1.6 muted: ✅ MATCH
- Padding: phone ✅; desktop ❌ MISMATCH — design: 16px 18px 18px / impl: `md:py-[16px]` (16 bottom)
- Gap: ❌ MISMATCH (phone) — design: 11px phone / 12px desktop / impl: `gap-[12px]` both
- Row (col, gap 3, border-top, pt 10), label 12 600 `--fg`: ✅ MATCH
- Outside link mono 10.5 accent, solid border, `↗`: ✅ MATCH
- Checked line mono 10.5 faint; why paragraph faint: ✅ MATCH

### Openers — climb lower rung
- Rendered when: ❌ MISMATCH — design: `below` rung **with a path** (blocked / satisfied not drawn) / impl: drawn on every `below` rung when `downgradeTargets` is non-empty, so a blocked or satisfied path still offers the opener and the sheet draws its `Blocked` / `Satisfied` body
- Phone placement: ❌ MISMATCH — design: own row, `justify-content:flex-end`, min-height 44px, align center, margin -6px 0 -8px / impl: `ml-[7px] w-fit`, left-aligned, no 44px min-height, no negative margins
- Desktop placement under the body, left: ✅ MATCH
- Type mono 11 accent, dotted accent underline, → in string: ✅ MATCH

### Openers — findings head row
- Phone placement (under box, flex, min-h 44, center): ✅ MATCH; desktop head row right end: ✅ MATCH (grid col 2 row 1)
- Type size: ❌ MISMATCH — design: mono 10px / impl: `text-[10.5px]`
- Gap: ❌ MISMATCH — design: 8px / impl: `gap-[6px]`
- Underline on label only, → separate: ✅ MATCH; caret retired: ✅ MATCH

## Pass 2 — state coverage
- 3a card list: ✅ REACHABLE
- 3a combo body: ✅ REACHABLE
- 3a stacked present / absent: ✅ REACHABLE (`openOracleId` drives `behind`)
- 3b open: ✅ REACHABLE
- 3b stacked present / absent: ✅ REACHABLE
- 3b blocked / satisfied "not drawn": ❌ NOT ENFORCED — the opener is not gated on a path, so both non-drawn states are reachable (bodies still rendered by `Blocked` / `Satisfied`)
- 3c open only, never stacks: ✅ REACHABLE (no card trigger in its body)
- CardModal stacked with backLabel (pill): ✅ REACHABLE
- CardModal stacked without / phone ✕: ✅ REACHABLE
- CardModal unstacked: ✅ REACHABLE

## Visual gaps
1. src/components/decks/receipt-modal.tsx:167 — ModalChrome sheet — box-shadow — phone none / desktop `0 24px 60px rgba(0,0,0,.45)` / none when behind → `var(--modal-shadow)` everywhere
2. src/components/cards/card-modal.tsx:1395 — stacked card sheet — box-shadow — phone `0 -10px 30px rgba(0,0,0,.35)`, desktop `0 -6px 40px rgba(0,0,0,.5)` → `var(--modal-shadow)`
3. src/components/cards/card-modal.tsx:1594 — back pill — gap — 7px → 6px
4. src/components/decks/receipt-modal.tsx:76 — receipt grid — gap — 14 row/11 col (phone), 18 row/12 col (desktop) → 11 / 9 uniform
5. src/components/decks/receipt-modal.tsx:76 — receipt grid — desktop padding — 18px 20px 22px → 16px 18px
6. src/components/decks/receipt-modal.tsx:239 — receipt tile — flex gap — 6 / 7 → 5 / 6
7. src/components/decks/receipt-modal.tsx:243 — receipt tile art — radius — 8px → 6px
8. src/components/decks/receipt-modal.tsx:252 — receipt tile name — phone size — 11.5px → 12px
9. src/components/cards/card-fact-mark.tsx:75 — receipt header fact mark — glow mix space — oklab → srgb (shared component)
10. src/components/decks/upgrade-path.tsx:77 — 3b body — desktop padding-bottom — 18px → 16px
11. src/components/decks/upgrade-path.tsx:85 — 3b rule boxes — desktop gap between boxes — 13px → 9px
12. src/components/decks/provenance-panel.tsx:80 — 3c body — desktop padding-bottom — 18px → 16px
13. src/components/decks/provenance-panel.tsx:80 — 3c body — phone gap — 11px → 12px
14. src/components/decks/bracket-climb.tsx:195 — climb opener — phone placement — own row, justify-end, min-h 44, margin -6px 0 -8px → `ml-[7px] w-fit`, left, no 44px target
15. src/components/decks/provenance-panel.tsx:41 — 3c opener — font size — 10px → 10.5px
16. src/components/decks/provenance-panel.tsx:41 — 3c opener — gap — 8px → 6px

## State reachability gaps
1. src/components/decks/bracket-climb.tsx:69 — climb opener rendered on every `below` rung with a downgrade target, not only when the path is actionable; 3b blocked / satisfied states (table: "not drawn") are reachable.

VERDICT: 16 visual gaps, 1 state gaps

## Resolution (author, after verify)

**Fixed:** visual gaps 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15 and 16.

- The receipt's grid gaps, padding, tile gap, 8px art radius and 11.5 / 12px name now apply to the 760 grid only. The combo body's fixed 96px plates are "unchanged" per `HANDOFF.md` §3, so they keep the shipped values.
- The phone rung opener (gap 14) is its own row at the rung's right with a 44px target. `probe:verdict-findings` now checks the height and the right edge. Mutation: with the wrapper reverted, the check fails.

**Declined, deliberately:**

- **Gap 1, the ModalChrome shadow, and gap 2, the stacked card's shadow.** `HANDOFF.md` §3 describes the chrome and the stacked `CardModal` as shipped ("nothing added to it"). The canvas's inline shadows are the drawing's stand-ins for the theme token `--modal-shadow`, which every modal in the app reads. Replacing it with literals on these two sheets would give the analysis sheets their own shadow, differing from every other modal.
- **Gap 9, `CardFactMark`'s glow color space.** It is a shared component shipped with the card mark, and the handoff reuses it unchanged. It is out of this PR's scope and not in the lane's fence.
- **State gap 1, the blocked 3b state being reachable.**
  - Satisfied cannot be reached from the rung. Every target sits below the reading's floor, so something always has to go.
  - Blocked is reachable, for example a [3] deck whose commander is a game changer, where Core is directly below. `HANDOFF.md` §3 puts "the shipped `UpgradePathPanel` body in the chrome", and the shipped body includes its blocked state. That state draws its rule box, the commander tag and the shortfall line, with the heading moved into the sheet's header.
  - Withholding the opener would leave the rung's own `dropBlocked` sentence with no way to its full answer. The frames not drawing the state is an omission of a carried-over shape (audit finding 13's pattern), not a ruling against it. The nearest-target line inside it is retired, because with one target it can never draw.
