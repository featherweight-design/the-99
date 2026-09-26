# Design Property Table — Top-Off Addendum R1

Sources: `design/design_handoff_the99_top_off/ADDENDUM-README.md`,
`addendum · copy strings.ts`, `The 99 - Top Off Addendum.dc.html`,
`READINESS-ADDENDUM.md` (engineering verdict — **its two amendments override the
addendum where they conflict**).

Breakpoint: **768px** (Tailwind `md:`). "Mobile" = 390px, "Desktop" = the 940px
frame the canvas draws the list at.

Every colour is a `var(--*)` token; the addendum adds **no new token, no new hex,
no new glyph, no new motion**. Focus everywhere is the global `:focus-visible`
from `@layer base` — 2px `var(--accent)` at +2px offset, **not restyled by any
element in this addendum**. The candidate row's tick box is the one place it
moves rather than changes: the checkbox is `sr-only`, so the ring is drawn on the
visible box beside it via `peer-focus-visible`, in the same accent and width the
base rule would have used on a box nobody can see.

**Amendments in force**

- **AMENDMENT 1 (READINESS-ADDENDUM)** — the narrowed figure columns were
  measured against a bare figure, but the row renders `+147 pts`. Synergy narrows
  `88 → 60px` (not 56) and Decks narrows `52 → 36px` (not 40). Every table below
  records the amended numbers; the canvas draws 56/40 and is superseded.
- **AMENDMENT 2 (READINESS-ADDENDUM)** — `list.cap` cannot render into two DOM
  homes and keep one `capLineId`. It renders **once**, into the home the current
  width selects via `src/components/ui/use-min-width.ts`; neither home is a
  `hidden md:block` twin.

---

## Component: Candidate row — decline control (`top-off-list.tsx`)

### Decline control — the button element (both widths)

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| element | `<button>` | `<button>` |
| nesting | **outside** the row's `<label>` (a tap inside would also toggle the tick) | **outside** the row's `<label>` |
| tab order | 2nd stop in the row (tick, then decline) | 2nd stop in the row (tick, then decline) |
| aria-label | `list.declineAria` — `Set {name} aside` (ratified verbatim) | `list.declineAria` — `Set {name} aside` |
| visible label | `Set aside` (`list.decline`) | `Set aside` (`list.decline`) |
| content | a word — **never** a glyph, never `×` | a word — never a glyph |
| font-family | `var(--font-mono)` / `font-mono` (IBM Plex Mono) | `var(--font-mono)` / `font-mono` |
| font-size | `10px` (inherited from the line-2 figure row) — see Ambiguity 1 | `10.5px` |
| font-weight | — (normal) | — (normal) |
| letter-spacing | — | — |
| text-transform | — (sentence case) | — |
| color | `var(--fg-faint)` | `var(--fg-faint)` |
| background | transparent (no plate) | transparent (no plate) |
| border | none | none |
| border-radius | — | — |
| display | `flex` | inline text inside a fixed-width slot |
| align-items | `center` | — (row-level `center`) |
| margin-left | `auto` | — |
| min-height | `44px` (the word's own box, not the row's) | — (inline; row is `34px`) |
| width | — (content) | `60px` (the slot) |
| flex | — | `none` |
| text-align | — (right, by `margin-left:auto`) | `right` |
| position in row | **line 2, right end** — not the right edge of the row | last slot, right-aligned |
| right-edge box | **deleted** — the shipped `w-[36px]` / `self-stretch` box is removed; the row's `pr` returns to `10px` and the name line gains 45px | replaced: the shipped `18px` glyph slot becomes a `60px` word slot |

### Decline control — the underline (inner `<span>`)

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| border-bottom | `1px dashed var(--border-dashed)` | `1px dashed var(--border-dashed)` |
| border (other sides) | — | — |
| background | transparent | transparent |
| rationale | dashed = this app's *reversible / unsettled* vocabulary; removal never wears it | same |

### Decline control — hover

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| color | `var(--fg-body)` | `var(--fg-body)` |
| border-bottom | unchanged `1px dashed var(--border-dashed)` | unchanged |
| everything else | unchanged | unchanged |
| hover-only affordance | **rejected** — the control is fully visible at rest at both widths | **rejected** |

### Decline control — focus-visible

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| outline | global `:focus-visible`, 2px `var(--accent)` | same |
| outline-offset | `+2px` | `+2px` |
| override | — (none in this addendum) | — |

### Decline control — disabled

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| disabled state | — (the control has none; a declined row swaps to the declined variant instead) | — |

### Conditional rendering

| Condition | Result |
|---|---|
| row is a live (non-declined) candidate | decline button renders |
| row is declined | the whole row swaps to the declined variant; the decline button is absent and `Show it again` takes its place |

---

## Component: Candidate row — geometry around the decline

### Phone row (390px) — container

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| display | `flex` | n/a |
| align-items | `center` | n/a |
| gap | `9px` | n/a |
| min-height | `52px` | n/a |
| padding | `0 10px 0 8px` (**right returns to 10px** — the 36px box is gone) | n/a |
| background | `var(--surface)` (unticked) / `var(--elevated-hover)` (ticked) | n/a |
| border | `1px solid var(--border)` (unticked) / `1px solid var(--accent-shadow)` (ticked) | n/a |
| border-radius | `7px` | n/a |

### Phone row — line 2 (the figure row that now hosts the decline)

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| display | `flex` | n/a |
| align-items | `center` | n/a |
| gap | `8px` | n/a |
| font-family | `var(--font-mono)` | n/a |
| font-size | `10px` | n/a |
| children, in order | pip cluster · synergy (`var(--accent)`) · inclusion (`var(--fg-faint)`) · **decline (`margin-left:auto`)** | n/a |
| height cost of the decline | `0` — line 2's right end was already empty | n/a |

### Desktop row — container and slots

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| display | n/a | `flex` |
| align-items | n/a | `center` |
| gap | n/a | `10px` (unchanged — slot count stays at three) |
| min-height | n/a | `34px` |
| padding | n/a | `0 9px` |
| border-radius | n/a | `7px` |
| background | n/a | `var(--surface)` / `var(--elevated-hover)` when ticked |
| border | n/a | `1px solid var(--border)` / `1px solid var(--accent-shadow)` when ticked |

### Desktop column widths

| Column | Shipped | Addendum canvas | **In force (Amendment 1)** |
|---|---|---|---|
| Tick | `18px` | `18px` | `18px` — unchanged |
| Availability dot | `7px` | `7px` | `7px` — unchanged |
| Card name | `flex: auto; min-width: 0` | `flex-auto` (+2px) | `flex-auto` (+2px) |
| Cost | `40px` | `40px` | `40px` — unchanged |
| Availability / buy tag | `84px` | `84px` | `84px` — unchanged |
| Synergy | `88px` | `56px` | **`60px`** (Amendment 1: `+147 pts` is 8 chars ≈ 57.6px) |
| Decks | `52px` | `40px` | **`36px`** (Amendment 1: widest is `100%` ≈ 26.4px) |
| Decline slot | `18px` (glyph) | `60px` | `60px` |
| arithmetic | — | 44 recovered vs 42 spent | 28 + 16 = **44 recovered vs 42 spent**; 2px to the name column |

### Desktop column-header spacers

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| display | n/a | `flex` |
| align-items | n/a | `center` |
| gap | n/a | `10px` |
| padding | n/a | `0 9px 7px` |
| font-family | n/a | `var(--font-mono)` |
| font-size | n/a | `9.5px` |
| letter-spacing | n/a | `0.12em` |
| text-transform | n/a | `uppercase` |
| color | n/a | `var(--fg-faint)` |
| spacer widths | n/a | `18px` · `7px` · `flex-auto` (Card) · `40px` (Cost) · `84px` · **`60px`** (Synergy) · **`36px`** (Decks) · `60px` (empty, was `18px`) |
| Synergy / Decks header text | n/a | `Synergy`, `Decks`, `text-align: right` |
| decline header text | n/a | — (empty spacer, no header word) |

### Figure cells (unchanged treatment, amended widths)

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| Synergy font | `var(--font-mono)`, `10px` | `var(--font-mono)`, `12px` |
| Synergy color | `var(--accent)` | `var(--accent)` |
| Synergy width | — (inline on line 2) | **`60px`**, `text-align: right`, `flex: none` |
| Decks font | `var(--font-mono)`, `10px` | `var(--font-mono)`, `11px` |
| Decks color | `var(--fg-faint)` | `var(--fg-faint)` |
| Decks width | — (inline on line 2) | **`36px`**, `text-align: right`, `flex: none` |

---

## Component: Declined row (unchanged — recorded as the register the decline mirrors)

### Container

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| display | `flex` | `flex` |
| align-items | `center` | `center` |
| gap | `10px` | `10px` |
| min-height | `34px` | `34px` |
| padding | `0 10px` | `0 10px` |
| background | `var(--surface-sunken)` | `var(--surface-sunken)` |
| border | `1px solid var(--border)` | `1px solid var(--border)` |
| border-radius | `7px` | `7px` |

### Eyebrow — `not this one`

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `9.5px` | `9.5px` |
| letter-spacing | `0.1em` | `0.1em` |
| text-transform | `uppercase` | `uppercase` |
| color | `var(--fg-locked)` | `var(--fg-locked)` |
| flex | `none` | `none` |

### Name

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| font-size | `13px` | `13px` |
| color | `var(--fg-faint)` | `var(--fg-faint)` |
| flex | `auto`, `min-width: 0` | `auto`, `min-width: 0` |

### Restore control — `Show it again`

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `10.5px` | `10.5px` |
| color | `var(--fg-faint)` | `var(--fg-faint)` |
| border-bottom | `1px dashed var(--border-dashed)` | `1px dashed var(--border-dashed)` |
| flex | `none` | `none` |
| aria-label | `list.restoreAria` (unchanged) | same |

---

## Component: Bulk restore — `Show all N again` (selection head)

### The button

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| element | `<button>` (a third `GhostButton`, right of `Clear all ticks`) | same |
| visible label | `list.restoreAll(declined)` → `Show all 38 again` | same |
| aria-label | `list.restoreAllAria(declined)` → `Put all 38 declined candidates back on the list` | same |
| display | `flex` | `inline-flex` |
| align-items | `center` | `center` |
| justify-content | `center` | — (padding-driven) |
| width | `100%` (its own full-width row) | — (content) |
| min-height / height | `min-height: 44px` | `height: 30px` |
| padding | — (centred, full width) | `0 11px` |
| border | `1px solid var(--border-strong)` | `1px solid var(--border-strong)` |
| border-radius | `8px` | `8px` |
| background | transparent | transparent |
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `11px` | `11px` |
| color | `var(--fg-body)` | `var(--fg-body)` |
| flex order | last of three; **wraps to its own row** via the container's `flex-wrap` | last of three, inline |
| onClick | `onDeclinedChange(new Set())` — no new action, no server call | same |
| ticks | **not** restored — a restored row returns unticked | same |
| announcement | `announce.restoredAll(declined, ticked, n)` | same |

### Bulk restore — hover / focus / disabled

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| hover | `GhostButton`'s shipped hover — no override in this addendum | same |
| focus | global `:focus-visible`, 2px `var(--accent)` at +2px | same |
| disabled | — (never disabled; it is only present when it has work to do) | — |
| `--danger` | — (never) | — |

### Conditional rendering

| Condition | Result |
|---|---|
| `declined.size >= 1` | the bulk restore renders |
| `declined.size === 0` | absent — the head shows its two shipped fixtures only |
| all-declined (`declinedHere === pool.length`) | **no special gating** — it is the same control, present since the first decline |

### Selection head container (desktop)

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| display | `flex` | `flex` |
| align-items | `center` | `center` |
| gap | `8px` | `12px` |
| flex-wrap | `wrap` | `wrap` |
| padding-bottom | — | `11px` |
| border-bottom | — | `1px solid var(--border)` |

### Selection head fixtures — `Tick the N I own` / `Clear all ticks`, disabled in S25

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| present | always — the head **does not change shape** because the player declined | always |
| flex | `1`, `min-width: 140px` | — (content) |
| min-height / height | `44px` | `30px` |
| padding | — (centred) | `0 11px` |
| border | `1px solid var(--border)` when disabled | `1px solid var(--border)` when disabled |
| border-radius | `8px` | `8px` |
| font | `var(--font-mono)`, `11px` | `var(--font-mono)`, `11px` |
| color (disabled) | `var(--fg-locked)` | `var(--fg-locked)` |
| opacity (disabled) | `0.5` | `0.5` |
| disable rule | `tickable === 0` / `tickedCount === 0` (shipped, unchanged) | same |

---

## Component: S25 line — all-declined variant of the zero-ticked line

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| element | the zero-ticked slot's **third variant** — no new slot | same |
| copy key | `commit.nothingTickedAllDeclined(cand)` | same |
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `10.5px` | `10.5px` |
| color | `var(--fg-locked)` | `var(--fg-locked)` |
| text-transform | — (lower case, matching its two siblings) | — |
| margin-top | `mt-[9px]` per the component-notes table (canvas draws `3px`) — see Ambiguity 2 | `mt-[9px]` per the component-notes table (canvas draws `11px`) — see Ambiguity 2 |
| line-height | `1.55` | — (canvas sets none) |
| background / plate | — (none) | — (none) |
| border | — (none) | — (none) |
| `--danger` | — (**never**; nothing has gone wrong) | — |
| `lastSlots.short` | **must never print here** | **must never print here** |

### Conditional rendering

| Condition | Result |
|---|---|
| `tickedCount === 0 && declinedHere === pool.length` | `commit.nothingTickedAllDeclined` |
| `tickedCount === 0` and some candidates live | shipped `commit.nothingTicked` (unchanged) |
| pool genuinely exhausted | shipped state 13 / `lastSlots.short` — a **different** state, never S25 |

---

## Component: Door note on the closed strip (phone-only change)

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| geometry | **unchanged** | unchanged |
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `10px` | `10px` |
| color | `var(--fg-locked)` | `var(--fg-locked)` |
| margin-top | `9px` (`mt-[9px]`) | `9px` |
| line-height | `1.55` | `1.55` |
| lines | exactly **one** at every count (longest form 56 chars ≈ 336px inside the strip's 366px) | up to three |
| first-open string | `strip.doorNoteMobile(seeded)` | shipped desktop string (unchanged) |
| reopen string | `strip.doorNoteAgainMobile` — **one** string for both reopen cases | shipped two reopen strings (unchanged) |
| string count | **2** | 3 |
| truncation / "more" disclosure | **rejected** | n/a |
| dropping the note | **rejected** | n/a |

### Door / strip chrome around it (unchanged, recorded for placement)

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| strip container | `background: var(--surface-rail)`, `border: 1px solid var(--border-strong)`, `border-radius: 10px`, `padding: 13px 14px` | same |
| eyebrow (`The last N`) | mono `10px`, `letter-spacing: 0.14em`, `uppercase`, `var(--accent)`, `margin-bottom: 4px` | same |
| caption | mono `10px`, `var(--fg-faint)`, `margin-bottom: 11px` | same |
| door button | `display: flex`, `align-items: center`, `justify-content: center`, `gap: 8px`, `min-height: 44px`, `border: 1px solid var(--accent)`, `border-radius: 8px`, `color: var(--accent)`, `font-size: 14px`, `font-weight: 600` | same |
| strip / door copy | **unchanged** — still `Choose the last 31` | unchanged |

---

## Component: The pinned bar's status line (the ladder) — phone

### The line

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| element | one `<div>`, one line, one height | n/a — desktop has no pinned bar |
| count | exactly **one** — gate as a **single ternary**, never three sibling conditionals | n/a |
| font-family | `var(--font-mono)` | n/a |
| font-size | `10px` | n/a |
| color | `var(--fg-locked)` (all three tenants) | n/a |
| flex order | `order-1` (first child of the bar) | n/a |
| line count | 1 at every tenant and every count | n/a |
| bar height | **unchanged** — `onBarHeight`'s reservation is not affected | n/a |

### Tenant priority

| Rung | Condition | Copy key | Longest measured form |
|---|---|---|---|
| 1 | `atCap` | `list.cap` — `Untick one to swap another in` | — |
| 2 | `openSlots - tickedCount > 0` | `commit.slotsStayOpen` | `31 slots stay open: you can come back to them`, 45 chars ≈ 281px inside 366px |

Rungs 1 and 2 partition the whole space by arithmetic: `atCap` is
`tickedCount >= openSlots`, which is exactly `openSlots - tickedCount <= 0`, so
no third rung has any residue to render into. The ladder ships with two rungs
and `dock.retired` renders nowhere; the fact it carried still reaches a screen
reader through `dock.retiredAnnounce` on open.

### The bar container (as drawn)

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| background | `var(--bg)` | n/a |
| border-top | `1px solid var(--border-strong)` | n/a |
| display | `flex` | n/a |
| flex-direction | `column` | n/a |
| gap | `9px` | n/a |
| padding | `11px 0 0` (in-context draw) | n/a |

### Bar count row (unchanged)

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| display | `flex`, `align-items: baseline`, `gap: 8px` | n/a |
| font | `var(--font-mono)`, `10.5px` | n/a |
| ticked count | `var(--fg-body)` | n/a |
| to-buy clause | `var(--warning)` | n/a |
| consequence (`N of 99 when added`) | `margin-left: auto`, `var(--fg-locked)` | n/a |

### `commit.slotsStayOpen` — the change

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| class removed | `hidden md:block` — **deleted** | n/a |
| new home | the bar's status line, rung 2 | **unchanged** — stays in the commit row at `md:ml-auto` |
| font-size | `10px` (the bar's status register) | `10.5px` |
| color | `var(--fg-locked)` | `var(--fg-locked)` |
| string | **unchanged** — no new key | unchanged |

---

## Component: `list.cap` — one line, two homes (Amendment 2)

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| home | the pinned commit bar, **rung 1** of the status ladder | the selection head, after the counts |
| mechanism | **AMENDMENT 2** — rendered once, home chosen in JS via `src/components/ui/use-min-width.ts`; **not** a `hidden md:block` pair, and the id is never dropped | same single element |
| id | `capLineId` — kept, single instance | `capLineId` |
| aria relationship | `aria-describedby` target of every inert tick box (unchanged) | same |
| copy | `list.cap` — `Untick one to swap another in`, **verbatim**, no count | same |
| count in the string | — (ratified as cut: it repeated `head` / `headMobile`) | — |
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `10px` | `10.5px` |
| color | `var(--fg-locked)` | `var(--fg-locked)` |
| border-left | — | `1px solid var(--border-strong)` (a divider, **not** a middot) |
| padding-left | — | `12px` |
| margin | — | — |
| position | first line of the bar | after the `N of N slots ticked · N candidates, N untouched` span, before the ghost buttons |
| old home | removed — it no longer renders after all 38 rows | removed |

### Conditional rendering

| Condition | Result |
|---|---|
| `atCap` true, viewport < 768px | renders as bar rung 1 |
| `atCap` true, viewport ≥ 768px | renders in the selection head |
| `atCap` false | absent at both widths; the bar falls to rung 2 or 3 |
| at the cap | the assurance (`slotsStayOpen`) is absent **by arithmetic** — the two can never both print |

### Selection-head counts span (its neighbour, unchanged)

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| font | n/a | `var(--font-mono)`, `11px` |
| ticked clause color | n/a | `var(--fg-body)` |
| trailing clause color | n/a | `var(--fg-locked)` |

---

## Component: Keep-all inline confirm (`clear-auto.tsx` → `ClearAutoButton`)

Pattern was `game-history-row.tsx`'s inline confirm **verbatim, minus the danger ink**. That inline
confirm was retired on 2026-09-27, when a game's delete moved onto the shared `DeleteConfirm` pane
(`ui/delete-confirm.tsx`); this table records the shape the Keep-all confirm was built to, and it is
unchanged.

### At rest — the two bulk controls (unchanged)

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| `Keep all N` | `flex: 1`, `min-height: 44px`, `border: 1px solid var(--border-strong)`, `border-radius: 8px`, mono `12px`, `var(--fg-body)` | `padding: 6px 12px`, `border: 1px solid var(--border-strong)`, `border-radius: 8px`, mono `12px`, `var(--fg-body)` |
| `Clear all auto · N` | `flex: 1`, `min-height: 44px`, `border: 1px solid var(--border-strong)`, `border-radius: 8px`, mono `12px`, `var(--fg-body)` | `padding: 6px 12px`, same treatment |
| container | `display: flex`, `gap: 8px` | `display: flex`, `align-items: center`, `gap: 12px` |
| shared class | `BULK_BUTTON_CLASS` — recommends neither answer | same |
| confirm on `Clear all auto` | — (**none**; it ships `SweepReceipt` with an undo) | — |

### Confirming — the question

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| element | `<span>` inside the toolbar `<span>` | `<span>` |
| copy key | `auto.keepAllConfirmMobile(count)` | `auto.keepAllConfirm(count)` |
| font-family | — (body sans, **not** mono) | — (body sans) |
| font-size | `11.5px` per the component-notes table (canvas draws `12px`) — see Ambiguity 3 | `11.5px` |
| color | `var(--fg-body)` | `var(--fg-body)` |
| line-height | `1.5` | — |
| margin-bottom | `9px` | — |
| margin-left | — | `auto` |
| background / border | — (none) | — (none) |
| noun used | *the record* / *the record of where they came from* — **never** *the ledger* | same |

### Confirming — `Keep them` (the yes answer)

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| copy key | `auto.keepAllConfirmYes` → `Keep them` | same |
| display | `flex`, `align-items: center`, `justify-content: center` | `inline-flex`, `align-items: center` |
| flex | `1` | — |
| min-height / height | `min-height: 44px` | `30px`-class inline (`padding: 6px 10px`) |
| padding | `px-14px` (component-notes table; canvas draws a centred full-flex box) — see Ambiguity 3 | `px-10px` / `padding: 6px 10px` |
| border | `1px solid var(--border-strong)` | `1px solid var(--border-strong)` |
| border-radius | `7px` per the component-notes table (canvas draws `8px`) — see Ambiguity 3 | `7px` |
| font-size | `13px` (canvas) / `11.5px` (notes) — see Ambiguity 3 | `11.5px` |
| color | `var(--fg-body)` | `var(--fg-body)` |
| `--danger` | — (**AMENDMENT: never**; keeping is a graduation, not a deletion) | — (never) |
| focus | receives focus when the question opens | receives focus when the question opens |

### Confirming — `Cancel` (the no answer)

| Property | Mobile (390px) | Desktop |
|----------|----------------|---------|
| copy key | `auto.keepAllConfirmNo` → `Cancel` | same |
| display | `flex`, `align-items: center`, `justify-content: center` | `inline-flex`, `align-items: center` |
| flex | `1` | — |
| min-height / height | `min-height: 44px` | `30px` inline (`padding: 6px 10px`) |
| padding | `px-14px` (notes) | `px-10px` / `padding: 6px 10px` |
| border | `1px solid var(--border)` (**weaker** than the yes answer) | `1px solid var(--border)` |
| border-radius | `7px` (notes) / `8px` (canvas) — Ambiguity 3 | `7px` |
| font-size | `13px` (canvas) / `11.5px` (notes) | `11.5px` |
| color | `var(--fg-body)` | `var(--fg-body)` |
| focus on activate | returns focus to `Keep all N` (the trigger unmounts) | same |

### Confirming — structure and conditions

| Condition | Result |
|---|---|
| `confirming === false` | both bulk controls render at rest |
| `confirming === true` | the question **replaces both** bulk controls, not just the one tapped |
| `busy` (in flight) | the shipped rule already disables the pair — unchanged |
| refusal | `MutationError` renders beneath | |
| adjacency | the confirm answers are **never** adjacent to `Clear all auto` — it is gone while the question is up | |
| pills (`All 99` / `Shopping N`) | unchanged in both states: `height: 30px` desktop / `32px` phone, `padding: 0 12px`, `border-radius: 999px`, `background: var(--elevated)`, mono `11.5px` | |

---

## State Coverage

| State | Triggering condition | Element rendered | Copy key used |
|---|---|---|---|
| S-D1 · decline at rest (phone) | any live candidate row, viewport < 768px | `<button>` on line 2, `margin-left:auto`, `min-height:44px`, dashed underline | `list.decline` (label) · `list.declineAria` (name) |
| S-D2 · decline at rest (desktop) | any live candidate row, viewport ≥ 768px | `<button>` in the `60px` right-aligned slot of a `34px` row | `list.decline` · `list.declineAria` |
| S-D3 · decline hover | pointer over the control | same element, `color: var(--fg-body)` | — |
| S-D4 · decline focus | keyboard focus | global `:focus-visible` ring, 2px `var(--accent)` +2px | — |
| S-D5 · row declined | the row is in `declined` | declined row: eyebrow + faint name + `Show it again` | `list.declined` · `list.restore` · `list.restoreAria` (all unchanged) |
| S-D6 · single decline announced | one row declined | live region | `announce.declined` (unchanged) |
| S25 · every candidate set aside | `declinedHere === pool.length` **and** `tickedCount === 0` | third variant of the zero-ticked line + full declined list + both fixtures disabled + bulk restore present | `commit.nothingTickedAllDeclined(cand)` |
| S-R1 · bulk restore present | `declined.size >= 1` | third `GhostButton` in the selection head (own full-width row at phone, inline at desktop) | `list.restoreAll(declined)` · `list.restoreAllAria(declined)` |
| S-R2 · bulk restore absent | `declined.size === 0` | — (two fixtures only) | — |
| S-R3 · bulk restore fired | `onDeclinedChange(new Set())` | all rows return **unticked**; live region announces | `announce.restoredAll(declined, ticked, n)` |
| S-N1 · door note, first open, phone | strip closed, no prior selection, `seeded >= 2`, < 768px | one-line mono note under the door | `strip.doorNoteMobile(seeded)` |
| S-N2 · door note, first open, one owned | `seeded === '1'` | one-line note | `strip.doorNoteMobile('1')` |
| S-N3 · door note, first open, none owned | `seeded === '0'` | one-line note | `strip.doorNoteMobile('0')` |
| S-N4 · door note, reopen, phone | a selection survives a close, < 768px | one-line note, no ownership figure | `strip.doorNoteAgainMobile` |
| S-N5 · door note, desktop | ≥ 768px | shipped three-clause sentence | shipped desktop strings (unchanged) |
| S-L1 · ladder rung 1 (phone) | `atCap` | the bar's single status line, mono 10px `--fg-locked`, carries `capLineId` | `list.cap` |
| S-L2 · ladder rung 2 (phone) | `!atCap && openSlots - tickedCount > 0` | the same single line | `commit.slotsStayOpen(n)` |
| S-C1 · cap line, desktop | `atCap`, ≥ 768px | span in the selection head behind a `1px var(--border-strong)` left divider, `padding-left: 12px`, carries `capLineId` | `list.cap` |
| S-C2 · cap announced | tick attempt settles at the cap | live region (unchanged) | `announce.capped` |
| S-K1 · keep-all at rest | `confirming === false` | `Keep all N` + `Clear all auto · N`, both `BULK_BUTTON_CLASS` | `auto.keepAll` / `auto.keepAllMobile` (unchanged) |
| S-K2 · keep-all confirming (desktop) | `confirming === true`, ≥ 768px | question + `Keep them` + `Cancel`, replacing **both** bulk controls | `auto.keepAllConfirm(count)` · `keepAllConfirmYes` · `keepAllConfirmNo` |
| S-K3 · keep-all confirming (phone) | `confirming === true`, < 768px | shortened question above a two-up 44px answer pair | `auto.keepAllConfirmMobile(count)` · `keepAllConfirmYes` · `keepAllConfirmNo` |
| S-K4 · keep-all in flight | `busy` | both bulk controls disabled (shipped rule) | — |
| S-K5 · keep-all refused | mutation error | `MutationError` beneath the toolbar | shipped error copy |
| S-K6 · confirm cancelled | `Cancel` activated | at-rest pair returns; focus moves back to `Keep all N` | — |

---

## Copy keys

### New — seven for the five gaps

| Key | Namespace | String | Arguments |
|---|---|---|---|
| `decline` | `topOffCopy.list` | `Set aside` | — |
| `restoreAll` | `topOffCopy.list` | `` `Show all ${declined} again` `` | `declined: string` |
| `restoreAllAria` | `topOffCopy.list` | `` `Put all ${declined} declined candidates back on the list` `` | `declined: string` |
| `doorNoteMobile` | `topOffCopy.strip` | `'0'` → `You own none of these. Nothing is added until you say so.` · `'1'` → `1 arrives ticked. Nothing is added until you say so.` · else → `` `${seeded} arrive ticked. Nothing is added until you say so.` `` | `seeded: string` |
| `doorNoteAgainMobile` | `topOffCopy.strip` | `Reopens where you left it, declines and all.` | — (not parameterised) |
| `nothingTickedAllDeclined` | `topOffCopy.commit` | `` `you've set all ${cand} aside: show any of them again to pick it up` `` | `cand: string` |
| `restoredAll` | `topOffCopy.announce` | `` `${declined} candidates back on the list. ${ticked} of ${n} ticked.` `` | `declined: string, ticked: string, n: string` |

### New — four for the ratified keep-all confirm

| Key | Namespace | String | Arguments |
|---|---|---|---|
| `keepAllConfirm` | `recommendationsCopy.auto` | `` `Keep all ${count}? You'll lose the record of where they came from.` `` | `count: string` |
| `keepAllConfirmMobile` | `recommendationsCopy.auto` | `` `Keep all ${count}? The record goes too.` `` | `count: string` |
| `keepAllConfirmYes` | `recommendationsCopy.auto` | `Keep them` | — |
| `keepAllConfirmNo` | `recommendationsCopy.auto` | `Cancel` | — |

### Edits — two, inside the locked file

| Key | Change | Detail |
|---|---|---|
| `list.cap` | **string verbatim, home moved** | `Untick one to swap another in`. Phone → the pinned bar (rung 1). Desktop → the selection head, after the counts, behind a `border-left: 1px var(--border-strong)` divider. Renders at both widths; `capLineId` never dropped. Amendment 2: one element, home selected by `use-min-width.ts`. |
| `commit.slotsStayOpen` | **string unchanged by this amendment, one class deleted** | `hidden md:block` removed; joins the phone ladder at rung 2. Desktop keeps `md:ml-auto` in the commit row. No new string. |

### Ratifications — three, adopted without change

| Item | Verdict |
|---|---|
| `list.declineAria` — `Set {name} aside` | ratified verbatim; the `ENG-INVENTED` marker comes off, the string stays |
| `list.cap`'s dropped count | ratified — the count repeated `head` at desktop and `headMobile` in the bar directly below |
| `plural` helper | ratified — it applies to every count-carrying string in this file |

Also ratified in the component rather than the copy, and not re-specced:
`captionMobileOpen`, `closeShort`, `colCost`, `markOne`, `markedRow`, and the
`unownedClause` / `toBuy` null branches.

### Untouched — must not change

`autoCopy.keptNote` / `.keep` / `.keepAll` / `.keepAllMobile` / `.keepAllAria`;
`autoCopy.clearAll` / `.clearAllAria` / `.swept` / `.sweptUndo` (**and no confirm
on the sweep**); every `ledger.*` string; `list.declined` / `.restore` /
`.restoreAria`; `list.illegal*`; `commit.refused` / `.refusedLabel`; `dock.*`;
the whole of `synergyCopy.lastSlots` — including `.short`, which **must not print
in S25**.

---

## Accessibility structure

```
div.row
  label
    input[type=checkbox][aria-label="…"]         ← tab stop 1
  button[aria-label="Set {name} aside"]          ← tab stop 2, OUTSIDE the label
                                                    44px tall (phone) / inline (desktop)

div.row[declined]
  span (mono 9.5px uppercase, "not this one")
  button[aria-label="Put {name} back on the list"]

div.head
  span  "N of N slots ticked · N candidates, N untouched"
  p#top-off-cap  "Untick one to swap another in"   ← aria-describedby target (desktop home)
  button[aria-label="Tick all N candidates you already own"]
  button "Clear all ticks"
  button[aria-label="Put all N declined candidates back on the list"]

div.bar (phone)
  p#top-off-cap | p.slotsStayOpen | p.dockRetired  ← ONE of three, order-1
                                                     (#top-off-cap only when atCap)

span.toolbar[confirming]
  span (question, --fg-body)
  button "Keep them"    ← receives focus on open
  button "Cancel"       ← returns focus to "Keep all N"
```

- Two tab stops per candidate row, in reading order: tick, then decline.
- The decline is **never adjacent to the commit** at either width.
- The confirm answers are never adjacent to the sweep — the question replaces both bulk controls.
- Targets: decline `44px` phone / inline desktop; bulk restore `44px` / `30px`;
  confirm answers `44px` / `30px`.
- Colour is never the only carrier: the decline is a word **and** an underline; a
  declined row is an eyebrow, a word **and** an announcement; the cap is a
  sentence **and** an inert glyph.
- `announce.capped` still fires on the settle; the inert box's `aria-describedby`
  still resolves (Amendment 2 is what keeps it resolving at both widths).

---

## Not added / not reopened (negative contract)

No dialog, modal, sheet, toast, second pinned element, sticky head, new row atom,
new glyph, new token, new motion, swipe, hover-only control, inner scroller, no
confirm on the decline, no confirm on the sweep, and **no fourth line in the bar**.
`--danger` keeps its single occupancy on this surface (a refused write).

---

## Ambiguities and internal contradictions

1. **Phone decline font-size.** The component-notes table says the decline is
   "Mono 10.5px `--fg-faint`" at both widths, but the canvas nests the phone
   control inside line 2, whose parent sets `font-size: 10px`, and sets no size on
   the control itself — so as drawn the phone word is **10px** and the desktop word
   is an explicit **10.5px**. The table records the drawn values. Resolve toward
   10px at phone (matching its own line) or 10.5px (matching the notes and the
   `Show it again` it mirrors) before implementing.
2. **S25 line `margin-top`.** The component-notes table says `mt-[9px]`; the
   canvas draws `margin-top: 3px` at phone and `margin-top: 11px` at desktop.
   Three different numbers for one element. Table records the notes value with the
   canvas values noted.
3. **Keep-all confirm answers, phone.** The notes table specifies `radius 7px`,
   `px-14px`, and an `11.5px` question at both widths; the phone canvas draws
   `border-radius: 8px`, `font-size: 13px` answers, and a `12px` question. The
   desktop canvas matches the notes (7px / 11.5px). The phone drawing is closer to
   the shipped 44px bulk buttons it replaces (8px radius), so this reads like the
   notes generalising from desktop.
4. **Amendment 1 vs the canvas.** The canvas draws Synergy `56px` and Decks
   `40px` in the header spacers and every row; the engineering readiness amends
   these to `60px` / `36px`. Implement the amended values — the canvas is
   superseded on this point only, and the recovered-vs-spent arithmetic still lands
   at 44 vs 42.
5. **Amendment 2 vs the addendum's explicit instruction.** The addendum forbids
   `md:hidden` on either cap-line home while requiring one `capLineId`; those
   cannot both hold with two DOM parents. `use-min-width.ts` renders one element
   into one home. The intent is preserved, the literal instruction is not.
6. **`dock.retired` at phone is fully dead, not near-dead.** The condition both
   readiness docs describe — a pass exactly full with the cap not reached — is
   arithmetically empty, so the key renders nowhere. Called a demotion by the
   docs; it is a retirement. `dock.retiredAnnounce` still carries the fact to a
   screen reader on open.
7. **`commit.consequence` at zero ticks** (`68 of 99 when added` while nothing
   will be added) is drawn in the S25 phone bar. Pre-existing, explicitly out of
   scope, and it ships looking wrong in the very state this addendum adds.
