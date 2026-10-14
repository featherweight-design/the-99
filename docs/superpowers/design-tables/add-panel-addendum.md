# Decks · Add panel **addendum** (#183 #177 #179 #185 #184 #176) — pre-implementation property table

Source of truth: `design/design_handoff_the99_add_panel/`.
Citations: `RM:<line>` = `ADDENDUM-README.md`; `CV:<line>` = `The 99 - Decks · Add Panel Addendum.dc.html`;
`CP:<line>` = `add-panel addendum · copy strings.ts`; `RD:<line>` = `ADDENDUM-READINESS.md`.

**Ruling that governs this table: where the canvas and the README disagree, the canvas wins.** Every
such disagreement is recorded in §8.

This table is derived from the design artefacts **only**. No application source was read. It is the
deterministic checklist the implementer builds against and the verifier checks the built UI against.

Canvas mock data (fabricated, not production values): commander `Kykar, Wind's Fury` · Jeskai; deck at
`47 / 99`; Consider at `64` with `59 owned · 5 you don't own`; strip `Ramp 4/10 · Draw 6/10 ·
Removal 2/10 · Wipes 3/3 · Land 34/37`; removed card `Arcane Signet`; announce examples use
`Sol Ring` at `46 of 99` / `47 of 99`. Inclusion percentages are explicitly fabricated (CV:662).

**Token hex map used below** (from the canvas token card CV:641–649 plus the palette shared with the
shipped tables): `--bg #14110E` · `--surface #1E1A15` · `--surface-sunken #181410` ·
`--elevated #2A241D` · `--elevated-hover #211C15` · `--border #2A241D` · `--border-strong #3A3229` ·
`--border-dashed #4A4033` · `--fg #EDE6D8` · `--fg-body #C6B79A` · `--fg-muted #A89B84` ·
`--fg-faint #8E8269` · `--fg-locked #6A6152` · `--brass #C9A24B` · `--brass-hover #D8B25E` ·
`--brass-mid #A9863E` · `--brass-shadow #6E5B33` · `--success #6FA368` · `--warning #E0913C` ·
danger/error `#C6533F`. Theme-independent, stated as such on the contract card: `#14110E` dock,
`#1A160F` row/bar, `#C9A24B` brass, `#E0913C` buy, `#6FA368` owned (CV:645-649).
**RM:217 and RD:116 both assert "no new token" — every value below must resolve to an existing
`var(--*)`; raw hexes live only in `globals.css`.**

---

## 0 · The bottom-of-viewport rule (#183 + #177, shared)

| # | Rule | Phone | Desktop (`md:`) | Source |
|---|---|---|---|---|
| **R1** | Three layers, fixed precedence: **L3 content** (scrolls) → **L2 route dock** (sticky) → **L1 shell tab bar** (fixed). | all three present | L1 absent | RM:37-41, CV:56-67 |
| **R2** | **L1 shell tab bar**: `fixed`, height **`80px`**, phone only, owns the true bottom edge on every route. Nothing drawn beneath it; nothing scrolls out from under it. | `80px` | not rendered | RM:40, CV:65-66, CV:139 |
| **R3** | **L2 route dock**: `sticky`, `bottom: 80px` phone / `bottom: 0` md. **At most one per route.** Builder's dock = the quick-add bar. `/decks/new`'s dock = `Create deck →`. | `bottom: 80px` | `bottom: 0` | RM:39, RM:44-46, CV:61-62 |
| **R4** | A route's primary action **is** the dock or **is in flow** — never "near" the dock. | — | — | CV:62 |
| **R5** | **Reserve arithmetic.** Scroll region `padding-bottom: dock + 80px + 12px` (phone) / `dock + 12px` (md). | `dock + 80 + 12` | `dock + 12` | RM:44-46, CV:73-75 |
| **R6** | **Centred content** uses `min-height: 100% − reserve` and centres **inside** the reserve, never through it. Replaces `flex-1` against the scrollport. | ✓ | ✓ | RM:47, RM:242-243, CV:58, CV:75, CV:190 |
| **R7** | `80px` is **not a new token** — it is the shipped hard-coded tab-bar height (`bottom-[80px]` in `builder-shell.tsx`). The dock's own height is **measured, not guessed**, because it is one element in one place per route. | ✓ | ✓ | RM:49-51, CV:77 |
| **R8** | **The cheap fix is forbidden.** Hiding the quick-add bar on the empty builder is explicitly ruled out — it deletes one of the two entrances the empty caption names. **The dock is not conditional; the reserve is.** | ✓ | ✓ | RM:54-56, CV:85 |
| **R9** | The reserve is stated as **arithmetic, not a token/shared component**. A third surface pinning a CTA low is the trigger to extract it. Not in scope here. | — | — | RM:310-311, RD:91-93 |

**Row count: 9 rules.**

---

## 1 · #183 — empty builder clipped behind the dock

### 1.1 Element property table

| # | Element | Typography | Colour | Spacing | Size | States | Source |
|---|---|---|---|---|---|---|---|
| **A1** | Empty `<section>` — **phone**. Stops being `flex-1` against the scrollport; becomes a reserved box. | — | radial gradient `radial-gradient(400px 220px at 50% 80%, rgba(201,162,75,0.07), transparent 70%)` (unchanged from shipped) | `padding: 20px 16px` (fixed frame draws `20px 16px`; the broken frame drew `200px 16px 0`) | `min-height: 100% − reserve`; canvas mock renders it at `514px` inside a `760px` frame | one state only (empty). No hover/focus/loading drawn. | CV:161, CV:123, RM:63-65 |
| **A2** | Empty `<section>` — **desktop** | — | same gradient | `padding: 24px` | `flex:1`; reserve = the dock's own height only | one state | CV:207, RM:193 |
| **A3** | Illustration row (crab + card fan) | — | — | `gap: 16px`; `align-items: flex-end`; phone `margin-bottom: 18px` (fixed) / `20px` (broken); desktop `margin-bottom: 20px` | see A4/A5 | one state | CV:162, CV:124, CV:208 |
| **A4** | Crab mark | mono `8.5px` placeholder label | placeholder box `1px dashed #3A3229` `--border-strong`, label `#6A6152` `--fg-locked` | — | **phone `64×64`** (was `72×72`); **desktop `88×88`** | shrinks only if the reserve leaves the composition tight; **the mark pays, never the copy** | RM:62-63, CV:163, CV:209, CV:192 |
| **A5** | Card-fan mark | `99` in Cinzel 800; phone `17px` (was `18px`), desktop placeholder | three cards `48×68` (broken) → **`44×62`** (fixed phone); fills `#221D16` / `#2A241D` `--elevated` / `#3E3020`; borders `1.5px #3A3229` / `#4A4033` `--border-dashed` / `#C9A24B` `--brass`; numeral `#C9A24B` | rotations `-15deg` / `0` / `+15deg`; `translateX ∓16px` (fixed) vs `∓18px` (broken) | **phone `88×94`** (was `96×104`); **desktop `104×112`** | one state | CV:126-130, CV:164-168, CV:210 |
| **A6** | Headline | Cinzel **700**, phone `21px`, desktop `24px` | `#EDE6D8` `--fg` | — | — | one state | CV:132, CV:170, CV:212 |
| **A7** | Caption | Plex Sans, phone `13.5px/1.6`, desktop `14px/1.65` | `#C6B79A` `--fg-body` | `margin-top: 10px` phone / `12px` desktop; `max-width: 320px` phone / `440px` desktop | — | one state. **Not droppable** — it is the only line telling a first-time builder what to do next | CV:171, CV:213, RM:64-66 |
| **A8** | Role hint | Plex Mono `11px` | `#8E8269` `--fg-faint` | `margin-top: 18px` phone (fixed) / `20px` desktop and broken phone | — | one state. **Not droppable** | CV:172, CV:214 |
| **A9** | Quick-add bar (the builder's dock) — **phone** | placeholder `16px` `#6A6152` `--fg-locked`; magnifier glyph `14px` `#8E8269` | fill `#14110E` `--bg`; `border-top: 1px solid #2A241D` `--border`; inner field `#181410` `--surface-sunken` with `1px #3A3229` `--border-strong` | dock padding `10px 16px 12px`; field `padding: 0 12px`, `gap: 9px` | field `height: 44px`, `radius 8px` | present unconditionally — **never hidden on the empty builder** | CV:174-175, RM:220, RM:54-56 |
| **A10** | Quick-add bar — **desktop** | placeholder `14px` `#6A6152` | same fills | dock padding `11px 30px` | field `height: 38px`, `max-width: 520px`, `radius 8px` | as A9 | CV:216-217, RM:220 |
| **A11** | Shell tab bar (context only, not built here) | mono `9px` labels | `#1A160F` fill, `1px #2A241D` top; active `#C9A24B`, inactive `#8E8269`; diamonds `9×9` rotated `45deg`, `#4A4033` / `#C9A24B` | `padding-bottom: 14px`, `justify-content: space-around` | `height: 80px` | phone only | CV:139-144, CV:177-182 |

### 1.2 Named states

| # | State | Trigger | Visual | Source |
|---|---|---|---|---|
| **A-N1** | Empty builder, **phone, correct** | deck has 0 cards, phone width | Section reserves `dock + 80 + 12`; every line of the caption and the role hint is above the dock; illustration at the shrunk sizes | CV:152-183 |
| **A-N2** | Empty builder, **desktop** | 0 cards, `md:` | Reserve is the dock's height only; illustration at full size (`88` / `104×112`) | CV:198-219 |
| **A-N3** | Empty builder, **first run** | onboarding banner + strip on screen simultaneously | Banner (`Step 3 of 3`) and the role strip are both above the tab list and consume scroll height; the reserve still holds | CV:114-118, CV:147 |
| **A-N4** | Empty builder, **shipped/defect** (reference only — must NOT ship) | today's build | Section centres through the reserve; caption tail + role hint clipped under the dock; `146px` of viewport taken and none given back | CV:123-145, CV:147 |

**Row count: 11 elements + 4 states.**

---

## 2 · #177 — `/decks/new`, Create becomes the route's dock

| # | Element | Typography | Colour | Spacing | Size | States | Source |
|---|---|---|---|---|---|---|---|
| **B1** | Route dock container — **phone** | — | fill `#14110E` `--bg`; `border-top: 1px solid #2A241D` `--border` | `padding: 10px 16px 12px` | full width; sticky `bottom: 80px` | present **from first paint**, both with and without a selection — the screen must never reflow under a thumb | CV:265, CV:276, RM:220, RM:74-75 |
| **B2** | Dock **summary line** | Plex Mono **`10.5px`** | `#8E8269` `--fg-faint` | `margin-bottom: 7px` | one line | two forms: selected (B2a) / empty (B2b). **Only on a dock whose button acts on a selection the dock covers.** | CV:266, RM:221 |
| **B2a** | — selected form | as B2 | as B2 | — | — | prints `{commander} · {identity}` | CV:266, CP:189 |
| **B2b** | — empty form | as B2 | as B2 | — | — | prints `Pick a commander to start`; button disabled | RM:73-74, CP:190 |
| **B3** | Dock **primary button** | Plex Sans `15px` / **600** | fill `#C9A24B` `--brass`; label `#14110E` `--bg` | full width of the dock's content box | `height: 48px`, `radius 8px` | enabled (drawn) / **disabled `opacity: .5`** (stated, **not drawn**) | CV:267, RM:222 |
| **B4** | Scroll region above the dock | mono `10px` mock note `#4A4033` | — | `padding: 12px 16px`, `gap: 9px`, `flex: 1` | — | the commander list **continues under the dock and scrolls**; the dock does not clip it | CV:257, CV:263 |
| **B5** | Commander result row (context, unchanged) | name `13.5px/600` `#EDE6D8`; meta Plex Mono `10.5px` `#8E8269`; `selected` mono `11px` `#C9A24B` | fill `#1E1A15` `--surface`; border `1px #2A241D` `--border`, selected `1px #C9A24B` `--brass` | `padding: 9px 11px`, `gap: 10px` | art `30×42`, `radius 5px`; row `radius 9px` | default / selected | CV:236-238, CV:259-261 |
| **B6** | Search field / name field (context, unchanged) | `14px` `#6A6152` | `#181410` fill, `1px #3A3229` | `padding: 0 12px` | `height: 40px`, `radius 8px` | default only | CV:235, CV:239 |
| **B7** | **Desktop `/decks/new`** | — | — | — | — | **Asserted unchanged, not redrawn.** No tab bar, no occlusion; the picker's Selected sidebar keeps the button where it is. **No desktop frame exists in the canvas.** | RM:75, RM:307-308, CV:284, RD:100-101 |

### 2.1 Named states

| # | State | Trigger | Visual | Source |
|---|---|---|---|---|
| **B-N1** | Dock, **commander selected** | a picker row is selected | Summary `Kykar, Wind's Fury · Jeskai`; button enabled brass | CV:266-267 |
| **B-N2** | Dock, **no selection** | first paint, nothing picked | Summary `Pick a commander to start`; button disabled at `opacity .5` | RM:73-74, RM:222 |
| **B-N3** | **Shipped/defect** (reference only) | today's build | `Create deck →` in flow, `height 48px`, inside the `80px` the tab bar owns — "enabled, has rects, cannot be clicked" | CV:240, CV:248, CV:250 |

**Row count: 7 elements + 3 states.**

---

## 3 · #179 — the decklist row's remove ✕ at both widths

| # | Element | Typography | Colour | Spacing | Size | States | Source |
|---|---|---|---|---|---|---|---|
| **C1** | Decklist row — **phone** | name Plex Sans `12.5px` `#EDE6D8` `--fg`, `text-overflow: ellipsis`, `nowrap` | fill `#1A160F` (theme-independent row/bar hex) | `padding: 0 4px 0 8px`; `gap: 9px` | `min-height: 44px`, `radius 6px` | idle / pressed / removed (see §4) | CV:302-306, CV:646 |
| **C2** | Decklist row — **desktop** | name `13.5px` `#EDE6D8` | idle `#1A160F`; **hover/pressed `#211C15` `--elevated-hover`** | `padding: 7px 9px`; `gap: 10px` | `min-height: 34px`, `radius 7px` | idle / hover-pressed / removed / error | CV:360-370 |
| **C3** | Ownership dot | — | owned `#6FA368` `--success`; unowned `1px dashed #8E8269` `--fg-faint`, transparent fill | first item in the row flex | phone `7×7`, desktop `8×8`, `border-radius: 999px` | owned / unowned; **`aria-hidden`** (per RM:129 the dot is the *only* current unowned signal, which #176 fixes) | CV:303, CV:309, CV:361, CV:366 |
| **C4** | Row `buy` tag (shipped, reused by #176) | Plex Mono **phone `9px` / desktop `9.5px`** | text `#E0913C` `--warning`; fill `rgba(224,145,60,0.13)` | `padding: 1px 5px` | `radius 4px` | present when the card is not owned | CV:311, CV:368 |
| **C5** | Multi-copy quantity | Plex Mono `11px` | `#8E8269` `--fg-faint` | inline after the name | — | e.g. `×8` | CV:333 |
| **C6** | **Remove ✕ — phone.** Loses `hidden md:block`. | glyph `13px` (**unchanged size**; the target is padding, not glyph) | idle `#4A4033` `--border-dashed`; **pressed `#C6B79A` `--fg-body`** | `flex: none`, last item in the row | **hit box `44×44`** | idle / pressed (`#2A241D` `--elevated` plate, `radius 6px`) / disabled while `isPending` (**stated in eng notes, not drawn**) / hover (**not applicable on phone**) | CV:305, CV:312, RM:223, RM:236 |
| **C7** | **Remove ✕ — desktop** | glyph `13px`, `line-height: 1` | idle `#4A4033`; hover/pressed `#C6B79A` `--fg-body` | `flex: none`, no added padding | **inline target unchanged** (i.e. **below 44px on desktop, accepted**) | idle / hover / pressed | CV:363, CV:369, RM:223, RM:270 |
| **C8** | Group heading | Plex Mono `10.5px`, `letter-spacing: 0.14em`, `text-transform: uppercase` | role `#C9A24B` `--brass`; count `#8E8269` `--fg-faint` with `letter-spacing: 0`, `text-transform: none` | `margin-bottom: 9px` | — | count **decrements immediately** on removal (`Artifacts 6 → 5`) | CV:299, CV:330, CV:354 |
| **C9** | Meta row | — | — | — | — | **The ✕ is never rendered on a meta row.** | RM:223 |

### 3.1 Named states

| # | State | Trigger | Visual | Source |
|---|---|---|---|---|
| **C-N1** | Row **idle** | default | Dot, name, ✕ at `#4A4033`, no plate | CV:302-306 |
| **C-N2** | Row **pressed** (phone) | touch-down on the ✕ | ✕ gains a `#2A241D` `--elevated` plate at `radius 6px`; glyph → `#C6B79A` | CV:312, RM:223 |
| **C-N3** | Row **hover** (desktop) | pointer over the row | Row fill → `#211C15` `--elevated-hover`; ✕ glyph → `#C6B79A` | CV:365, CV:369 |
| **C-N4** | Row **multi-copy** | `quantity > 1` | Name carries `×N`; removal decrements `8 → 7`; **the row stays and no undo row is drawn** — the count is the receipt | CV:331-336, RM:96-99 |
| **C-N5** | Row **pending** | `isPending` during a mutation | `disabled={isPending}` kept; **no visual specified** | RM:236 |

**Row count: 9 elements + 5 states.**

---

## 4 · #185 — undo in place, no toast, no timer

| # | Element | Typography | Colour | Spacing | Size | States | Source |
|---|---|---|---|---|---|---|---|
| **D1** | **Undo row** — replaces the removed row **in place**, same min-height as the row it replaces | — | fill `#181410` `--surface-sunken`; border **`1px dashed #3A3229` `--border-strong`** | phone `padding: 0 4px 0 8px`, `gap: 9px`; desktop `padding: 7px 9px`, `gap: 10px` | phone `min-height: 44px`, **`radius 6px`**; desktop `min-height: 34px`, **`radius 7px`** | available / refused (D5) | CV:315, CV:371, RM:224, CV:381 |
| **D2** | Undo row **dot slot** | — | none (empty spacer, preserves alignment) | first flex item | phone `7×7`, desktop `8×8` | always empty — no dot on a spent slot | CV:316, CV:372 |
| **D3** | Undo row **label** | Plex Mono **phone `11.5px` / desktop `12px`**; **no strikethrough** | `#6A6152` `--fg-locked` | `flex: 1`, ellipsis + `nowrap` on phone | — | one form: `{name} removed` | CV:317, CV:373, RM:224, CV:382 |
| **D4** | **Undo control — phone** | `13px` / **600** | `#C9A24B` `--brass` | `padding: 0 12px` | **`height: 44px`**, `flex: none` | idle drawn; hover/pressed **not drawn on phone** | CV:318, RM:225 |
| **D4a** | **Undo control — desktop** | `12.5px` / **600**, `line-height: 1.4` | `#C9A24B` `--brass`, **`border-bottom: 1px solid #6E5B33` `--brass-shadow`**; hover → `#D8B25E` `--brass-hover` | inline in the row | text button, no fixed height | idle drawn; hover stated (RM), **not drawn** | CV:374, RM:225 |
| **D5** | **Refused-undo row** | Plex Mono `12px` | text `#C6533F` (danger); row fill/border unchanged from D1 | as D1 | as D1 | The failure states itself **in the row** via the existing `MutationError` — **not** in the shell banner. **The Undo control is absent in this state as drawn.** | CV:376-379, CV:387, RM:99 |

### 4.1 Behavioural contract

| # | Rule | Source |
|---|---|---|
| **D-B1** | **No toast.** The app has no toast pattern, and the bottom of a phone is spoken for by §0. A toast would fight the dock or float over the tab bar. | RM:87-90, CV:348 |
| **D-B2** | **No timer.** The undo row never self-dismisses. | RM:91-95, CV:349 |
| **D-B3** | **Only a last copy gets an undo row.** Hangs off the existing `quantity <= 1` branch; a stack decrements and keeps its row. | RM:96-99, CV:350 |
| **D-B4** | The undo row is **decklist state, not row state** — it **survives a tab switch to Consider and back**, and survives any re-sort. | RM:101-105, CV:353 |
| **D-B5** | Cleared by **exactly three** things: Undo pressed · the next removal · leaving the builder route. Nothing else, and never a timer. | RM:103-105, CV:353 |
| **D-B6** | **One undo row at a time.** A second removal settles the first. | RM:94, RM:240-241 |
| **D-B7** | **The counts do not wait.** The group count above a spent slot and the `/99` count both decrement **immediately** on removal. A spent slot is a receipt, not a pending state. | RM:105-108, CV:354, CV:299 |
| **D-B8** | **Undo is a re-add, not a rollback** — `addCardToDeck(deckId, oracleId)` with the row's own optimistic add, the same call the tile makes. No new action, no new server state. | RM:238-239 |
| **D-B9** | **No new motion.** The undo row appears in place because it *is* the row that was already there. Nothing joins the `prefers-reduced-motion` block. | RM:263-264, CV:652 |
| **D-B10** | Precedent: the spent slot is the same principle as an accepted suggestion tile holding its slot marked `✓ In deck` (#158 decision 8). One design language. | RM:88-90, CV:348 |
| **D-B11** | **Judgement, not measurement** (open risk). If a long-lived spent slot reads as clutter in a 99-row list, the stated fallback is dismissal on the next successful *add*. Not in scope. | RM:304-306, RD:82-86 |

**Row count: 6 elements + 11 contract rules.**

---

## 5 · #184 — the coverage cell is the control; one strip-level rationale

| # | Element | Typography | Colour | Spacing | Size | States | Source |
|---|---|---|---|---|---|---|---|
| **E1** | **Strip cell (short) — desktop.** The whole cell is a `<button>`. | — | idle fill `#181410` `--surface-sunken`, border `1px #2A241D` `--border` | `padding: 11px 14px`; strip `gap: 8px`; `flex: 1` | `radius 9px`; **`72px` tall** (asserted in prose; **no `min-height` is set in the canvas markup**) | idle / hover / pressed / at-target (E4) | CV:408, CV:449, RM:118, RM:226 |
| **E1a** | — desktop **hover** | unchanged | fill `#211C15` `--elevated-hover`; border `1px #3A3229` `--border-strong`; caption → `#D8B25E` `--brass-hover` | unchanged | unchanged | pointer only | CV:415, CV:419, RM:226 |
| **E1b** | — desktop **pressed** | unchanged | fill `#14110E` `--bg`; border `1px #6E5B33` `--brass-shadow`; caption → `#A9863E` `--brass-mid` | unchanged | unchanged | active | CV:422, CV:426, RM:226 |
| **E1c** | — **focus-visible** | unchanged | global `:focus-visible` only — `2px var(--brass)` at `+2px` offset. **The strip cell adds nothing and overrides nothing.** | — | — | keyboard | RM:292-293, CV:652 |
| **E2** | **Strip cell — phone** | — | idle `#181410` / `1px #2A241D`; pressed `#14110E` / `1px #6E5B33` (Draw cell drawn pressed) | `padding: 7px 2px 6px`; `text-align: center`; strip `gap: 4px` | `radius 7px`; **`min-height: 62px`** (explicit) | idle / pressed / at-target | CV:457-461, CV:473 |
| **E3** | Cell **role label** | Plex Mono, desktop `10px` `letter-spacing: 0.1em` uppercase; phone `8.5px` `letter-spacing: 0.06em` uppercase | `#8E8269` `--fg-faint` | — | — | one form | CV:409, CV:457 |
| **E4** | Cell **figure** | Plex Mono **600**, desktop `16px` with `/ target` at `11px`; phone `13px` with the target moved to a `rec N` line | short `#C9A24B` `--brass`; **met `#6FA368` `--success`**; `/ target` and `rec N` `#8E8269` (desktop) / `#6A6152` (phone) | desktop `margin-top: 3px`; phone `margin-top: 2px` | — | short / met | CV:410, CV:431, CV:457, CV:460 |
| **E5** | Cell **progress bar** — desktop only | — | track `#2A241D` `--elevated`; fill short `#A9863E` `--brass-mid`, met `#6FA368` `--success` | `margin-top: 8px` | `height: 5px`, `radius 999px` | short / met. **Not drawn on the phone cell at all.** | CV:411, CV:432; absent CV:457-461 |
| **E6** | Cell **caption** `consider →` | Plex Mono **desktop `10px` / phone `9px`** | idle `#C9A24B` `--brass`; hover `#D8B25E`; pressed `#A9863E` | desktop in a `space-between` row beside `rec N`, `margin-top: 6px`; phone `margin-top: 3px` | — | **A label, not a target.** It is inside the cell and is never independently focusable. | CV:412, CV:457, RM:227 |
| **E7** | Cell caption, **met** | as E6 | **desktop `#4A4033` `--border-dashed`; phone `#3A3229` `--border-strong`** — the two widths disagree (§8-4) | as E6 | as E6 | prints a dash instead of `consider →` | CV:433, CV:460, RM:227 |
| **E8** | Strip **header row** | `Recommended mix` Plex Mono desktop `11px` `letter-spacing 0.12em` uppercase / phone `9px` `0.1em`; `a guide, not a gate` desktop `10.5px` / phone `9px` | desktop label `#C6B79A` `--fg-body`, sub `#8E8269`; phone label `#8E8269`, sub `#6A6152` | `margin-bottom: 12px` desktop / `8px` phone | — | one form | CV:401-404, CV:455 |
| **E9** | Strip **hint** (`strip.hint`) | Plex Mono `10.5px` | `#6A6152` `--fg-locked` | desktop: right-aligned in the header row via `margin-left: auto` | — | **Desktop only — the phone strip header does not render it** (§8-5) | CV:404; absent CV:455 |
| **E10** | **Rationale disclosure trigger** | Plex Mono `11px` | `#C9A24B` `--brass`, **`border-bottom: 1px solid #6E5B33` `--brass-shadow`**, `padding-bottom: 1px` | desktop: own row, `margin-top: 12px`, `gap: 14px` beside an explanatory mock note | — | closed (drawn desktop) / open (drawn phone). **No hover, focus or pressed state is drawn for the trigger.** | CV:444-446, RM:228 |
| **E11** | **Rationale panel** | — | fill `#181410` `--surface-sunken`; `1px #2A241D` `--border`; **`border-left: 3px #C9A24B` `--brass`** | `margin-top: 10px`; `padding: 11px 13px`; internal `gap: 7px` | `radius 9px` | open only. **The open panel is drawn on the phone only; desktop-open is not drawn.** | CV:463-471, RM:228 |
| **E12** | Panel **header** | Plex Mono `11px` both | title `#C9A24B` `--brass`; close `#8E8269` `--fg-faint` | `space-between`, `gap: 10px` | — | Title repeats `Why these numbers?`; close reads `Hide` | CV:464 |
| **E13** | Panel **rationale lines** | Plex Sans `12px` / `line-height: 1.55` | body `#C6B79A` `--fg-body`; role name **bold 600 `#EDE6D8` `--fg`** | `gap: 7px` between lines | — | **Exactly four lines** for five roles — Removal and Wipes share one line. Text is `RECOMMENDED_MIX[role].rationale`, **quoted not rewritten** | CV:466-469, RM:228, RM:312-314 |
| **E14** | Desktop worked-example callout | — | — | — | — | **Unchanged**, sits below the disclosure. Not redrawn. | RM:121-122, CV:482 |

### 5.1 Named states and behaviour

| # | State / rule | Trigger | Behaviour | Source |
|---|---|---|---|---|
| **E-N1** | Cell · **short** | `have < target` | Cell **is** a `<button>`. Caption `consider →`. Accessible name carries both figures. | RM:115-118, CV:412 |
| **E-N2** | Cell · **met** | `have >= target` | Cell renders as a `<div>` **figure with no action** and **is not focusable**. Caption replaced by a dash. Figure and bar turn `--success`. | RM:117, RM:277, CV:433 |
| **E-N3** | Cell activation | click / `Enter` on a short cell | **Three steps, in order:** switch to Consider → scroll to the role's shelf → **move focus to the `#shelf-<role>` heading** (which takes `tabIndex={-1}`). Focus movement is required, not just scroll. | RM:117, RM:251-252, CV:483 |
| **E-N4** | **Ten targets become six** | — | Five per-cell rationale buttons + five sub-44px `consider` anchors are deleted; replaced by ≤5 cell controls + 1 strip disclosure. The nested `<a>` inside the cell goes, and so does the per-cell `aria-expanded`. | RM:113-118, RM:247-249, CV:478 |
| **E-N5** | Disclosure · **closed** | default | Trigger only; no panel. | CV:444-446 |
| **E-N6** | Disclosure · **open** | trigger activated | One panel per strip carrying **all five** role rationales; `aria-expanded` on the trigger, `aria-controls="strip-rationale"`. | RM:277, CV:463-471 |
| **E-N7** | Keyboard order | — | Cells are in **DOM order**; `Enter` performs E-N3. No custom key handling stated. | CV:483 |
| **E-N8** | Tap-target consequence | — | `44px` arrives **for free** from the cell height (`72px` desktop / `62px` phone), not from padding bolted onto a text link. | RM:117-118, RM:288-289 |

**Row count: 14 elements + 8 states/rules.**

---

## 6 · #176 — unowned staples kept, marked `buy`, shelved last

**Product ruling: A — keep, marked. Ruled by Hugh 2026-08-06 (RD:5-8). Option B (drop the append) does not ship.**

| # | Element | Typography | Colour | Spacing | Size | States | Source |
|---|---|---|---|---|---|---|---|
| **F1** | Suggestion tile (shared shell) | name `12.5px/600` `line-height 1.25` `#EDE6D8`; type line Plex Mono `9.5px` `#8E8269`, ellipsis + `nowrap` | fill `#1E1A15` `--surface`; border `1px #2A241D` `--border` | `padding: 9px 9px 10px`; internal `gap: 8px` | **desktop `168px` wide**; `radius 10px`; name block `min-height: 2.5em` | owned / unowned / in-deck | CV:507-519, CV:521-532 |
| **F2** | Tile art | — | `linear-gradient(158deg,#3A3229 0%,#241F19 62%,#161311 100%)`; `box-shadow: inset 0 -26px 30px -22px rgba(0,0,0,.65), inset 0 0 0 1px rgba(0,0,0,.3)` | — | `aspect-ratio: 63/88`, `radius 7px` | unchanged | CV:508 |
| **F3** | **Ownership dot** (owned tile) | — | `#6FA368` `--success`, `box-shadow: 0 0 0 2px rgba(10,8,6,.7)` | `position: absolute; right: 6px; top: 6px` | `8×8`, `radius 999px` | owned only. `aria-hidden`. | CV:509 |
| **F4** | **`buy` tag** (unowned tile) — **takes the dot's slot** | Plex Mono `9px` | text `#E0913C` `--warning`; fill `rgba(20,17,14,.82)`; **`box-shadow: inset 0 0 0 1px rgba(224,145,60,.5)`** | `position: absolute; right: 6px; top: 6px`; `padding: 1px 5px` | `radius 4px` | unowned only. **Same hex and same word as the shipped decklist-row tag (C4)** | CV:523, RM:229 |
| **F5** | Copies-owned pips | Plex Mono `9px/600`, `#14110E` | `#8E8269` `--fg-faint`; second pip `#F4E9C4` | `left: 6px; bottom: 6px`, `gap: 3px` | `14×14`, `radius 999px` | existing behaviour, unchanged | CV:510, CV:524 |
| **F6** | **Evidence label** `edhrec` | Plex Mono `9px` | `#6A6152` `--fg-locked`; dimmed on an in-deck tile to `#4A4033` | **before the bar**, `gap: 6px` | — | **Present on every tile that prints a percentage** | CV:515, CV:529, CV:560, RM:231 |
| **F7** | Inclusion bar | percentage Plex Mono `10px` `#C6B79A` `--fg-body` | track `#2A241D` `--elevated`; fill `#C9A24B` `--brass` (in-deck: `#6E5B33`) | `flex: 1` between label and figure | `height: 4px`, `radius 999px` | normal / in-deck dimmed | CV:515, CV:560 |
| **F8** | Lift line | Plex Mono `9.5px` | `#6E5B33` `--brass-shadow` | in the evidence column, `gap: 3px` | one line on a `168px` tile | **Drawn on the owned tile; absent from the unowned tile** (§8-6) | CV:516, CV:521-531 |
| **F9** | Tile **Add — primary** (owned) | `12px/600`, centred | fill `#C9A24B` `--brass`; label `#14110E` `--bg` | `padding: 7px 0` | `radius 7px` | default. No hover/focus/pending drawn. | CV:518 |
| **F10** | Tile **Add — secondary** (unowned) | `12px/600`, centred | **`1px solid #3A3229` `--border-strong`**, label `#EDE6D8` `--fg`, no fill | `padding: 6px 0` (border makes up the 1px) | `radius 7px` | per the §404 CTA contract — adding a card you do not own is a real action, just not the deck's default one | CV:531, RM:228-229 |
| **F11** | Tile **In deck** (context, unchanged) | `12px/600` `#6FA368` `--success` | `1px #2A241D`; tile `opacity: .75`; art `filter: grayscale(.6); opacity: .5` | `padding: 6px 0` | `radius 7px` | reference only | CV:560 |
| **F12** | **Unowned shelf heading** | Plex Mono `11px`, `letter-spacing: 0.14em`, uppercase | `#C9A24B` `--brass` | `gap: 10px`, `margin-bottom: 11px` | — | Uses the **existing `shelf.labels.edhrec`** label (`Top picks for {commander}`) — no new role, no new taxonomy | CV:567, RM:143-145 |
| **F13** | Unowned shelf **coverage clause** | Plex Mono `11px`, **not uppercase** | `#E0913C` `--warning` | second item in the heading row | — | prints `not in your collection` | CV:568, RM:230 |
| **F14** | Unowned shelf **count clause** | Plex Mono `11px` | `#8E8269` `--fg-faint` | third item | — | prints `· N to consider` | CV:569, RM:230 |
| **F15** | Coverage shelf heading (context, unchanged) | Plex Mono `11px` uppercase `#C9A24B`; meta `11px` `#8E8269`; `Show all N →` `11px` `#C9A24B` at `margin-left: auto` | — | `margin-bottom: 11px` | — | The unowned staples (up to `SHELF_CAP`, 6) **never appear here** | CV:552-556 |
| **F16** | Shelf grid | — | — | `gap: 14px`; coverage shelf `margin-bottom: 24px` | `grid-template-columns: repeat(6, 1fr)` desktop | — | CV:557, CV:571 |
| **F17** | **Provenance line** | Plex Mono `10.5px` | `#8E8269` `--fg-faint` | in the Consider toolbar row, `gap: 14px` before the sort control | — | two forms — locked string when everything is owned, `provenanceWithUnowned` when the append put something on the shelves | CV:547, RM:146-148 |
| **F18** | Sort control (context, unchanged) | `12.5px` `#EDE6D8` | `#2A241D` fill, `1px #3A3229` | `padding: 7px 12px` | `radius 8px` | reads `Coverage gaps first` | CV:548 |
| **F19** | Cap marker | Plex Mono `9.5px` `#4A4033` | `1px dashed #2A241D` | `padding: 12px` | `radius 10px` | **Mock annotation only — do NOT build.** States the append is capped at `SHELF_CAP` (6) by `loadDeckSuggestions()` (5 until #391) | CV:577 |
| **F20** | Mobile tile | — | — | — | — | **`(tile 2-up identical)`** — no phone frame is drawn for #176; the phone tile is asserted identical | RM:25 |

### 6.1 Behavioural contract

| # | Rule | Source |
|---|---|---|
| **F-B1** | Unowned suggestions **filter out of every coverage shelf** and into a single trailing shelf keyed `edhrec`. A shelf that says *you have 2 of 10* is about cards you can play tonight. | RM:141-143, RM:255-256, CV:580 |
| **F-B2** | The unowned shelf **sorts last — after the targetless shelf**. | RM:144-145, RM:230 |
| **F-B3** | The unowned shelf is capped by the loader, at the same `SHELF_CAP` (6) as every other shelf, so the panel's cap never has more to trim. Was "`SHELF_CAP` does not apply; the append is already capped at 5" until #391 made the two one number. | RM:256 |
| **F-B4** | `provenanceWithUnowned` is used **only when `unownedCount > 0`**; the locked provenance string is unchanged when every suggestion is owned. | RM:146-148, RM:257, CP:161-168 |
| **F-B5** | `suggestion.owned === false` is the **only** new branch in the tile: `buy` tag + secondary Add. **No note line.** The `#176` comment in the file comes out with it. | RM:253-254 |
| **F-B6** | **Colour is never the sole signal.** Unowned is carried by three independent things: the tag word, its `aria-label`, and the shelf heading. | RM:285-286, CV:535, CV:652 |
| **F-B7** | The `Owned only` filter stays **out** of Consider — but the reasoning behind that "no" (the axis had one value) has changed and should be re-read, not inherited. **Open, not in scope.** | RM:300-303, RD:87-90 |
| **F-B8** | Contrast: `buy` `#E0913C` on `#1E1A15` ≈ **7.1:1** (README says "on `--surface`"; the canvas card says `#1E1A15`, which is `--surface` — they agree). | RM:290, CV:652 |

**Row count: 20 elements + 8 contract rules.**

---

## 7 · Strings — verbatim, with copy key

Every string below is authoritative from `add-panel addendum · copy strings.ts` unless marked
*(locked block)*, in which case it is an edit **inside** `addPanelCopy` that eng must make there.
Punctuation is significant: `·` U+00B7 middot, `→` U+2192, `✕` U+2715, `’` U+2019 curly apostrophe,
`…` single-character ellipsis. **No em dashes anywhere in new copy** — that rule covers aria-labels.

| # | Key | String (verbatim) | Notes | Source |
|---|---|---|---|---|
| **S1** | `row.remove` | `✕` | Glyph only; the accessible name comes from S2/S3 | CP:84 |
| **S2** | `row.removeAria(name)` | `Remove ${name}` | e.g. `Remove Sol Ring` | CP:85, CV:270 |
| **S3** | `row.removeCopyAria(name, quantity)` | `Remove one copy of ${name}, ${quantity} in deck` | Multi-copy form — says which of the two outcomes is about to happen | CP:88-89 |
| **S4** | `undo.removed(name)` | `${name} removed` | Canvas draws `Arcane Signet removed` | CP:96, CV:317 |
| **S5** | `undo.action` | `Undo` | | CP:97, CV:318 |
| **S6** | `undo.actionAria(name)` | `Undo removing ${name}` | | CP:98, CV:272 |
| **S7** | `undo.announceRemoved(name, built)` | `${name} removed · ${built} of 99 · undo available` | Canvas: `Sol Ring removed · 46 of 99 · undo available` | CP:100-101, CV:384 |
| **S8** | `undo.announceUndone(name, built)` | `${name} back in the deck · ${built} of 99` | Canvas: `Sol Ring back in the deck · 47 of 99` | CP:102-103, CV:384 |
| **S9** | `undo.failed` | `Couldn’t put that back. Try adding it again.` | Curly apostrophe. Renders **in the row**, not in a banner | CP:114, CV:378 |
| **S10** | `strip.cellLink` | `consider →` | The arrow is **part of the string** — the label is no longer a link and cannot borrow the affordance from one | CP:122, CV:412 |
| **S11** | `strip.cellLinkAria(role, have, target)` | `${role}, ${have} of ${target}. See ${role.toLowerCase()} cards to consider.` | Canvas: `Ramp, 4 of 10. See ramp cards to consider.` **Two sentences, no dash.** Role is the display label (`Land`, not `land`) | CP:126-127, CV:275, CV:631 |
| **S12** | `strip.cellStaticAria(role, have, target)` | `${role}, ${have} of ${target}` | Met cell. Canvas a11y contract: `Wipes, 3 of 3`. **No trailing full stop.** | CP:130-131, CV:278 |
| **S13** | `strip.rationaleToggle` | `Why these numbers?` | | CP:133, CV:445, CV:464 |
| **S14** | `strip.rationaleToggleAria` | `Show why each role has the target it has` | | CP:134 |
| **S15** | `strip.rationaleClose` | `Hide` | Drawn top-right of the open panel | CP:135, CV:464 |
| **S16** | `strip.hint` *(locked block — **overwrite**)* | `A cell under target opens its shelf below` | **REPLACES** `Click a cell for rationale · a cell under target links its shelf below`. **One live value only — do not merge the two objects and leave both.** | CP:136-137, CV:404, CV:622 |
| **S17** | `strip.shelfLink` *(locked block)* | **DELETE** (was `consider`) | Superseded by S10 | CP:62-66, CV:624-625 |
| **S18** | `strip.shelfLinkAria` *(locked block)* | **DELETE** (was `See ${role} cards to consider`) | Superseded by S11. **Was the only consumer of `RECOMMENDED_MIX.land`'s singular label `'land'` — delete that singular with it unless something else claims it** | CP:68-75, CV:627-628 |
| **S19** | `unowned.tag` | `buy` | Same word and same hex as the shipped decklist-row tag | CP:146, CV:523 |
| **S20** | `unowned.tagAria(name)` | `${name} is not in your collection` | Canvas a11y contract: `Smothering Tithe is not in your collection` | CP:147, CV:279 |
| **S21** | `unowned.shelfCoverage` | `not in your collection` | The trailing shelf's coverage clause, in `--warning` | CP:156, CV:568 |
| **S22** | `unowned.note` | **CUT — no replacement** (was `not owned · goes on your shopping list`) | Restated the tag and the shelf heading in a noun the app does not have | CP:148-153, CV:633-634, RM:184-188 |
| **S23** | `consider.provenanceWithUnowned(owned, unowned)` | `${owned} owned · ${unowned} you don’t own` | Canvas: `59 owned · 5 you don’t own`. **Explicitly NOT `N to buy`** — that phrase already counts a different set one tap away | CP:170-171, CV:547, RM:189-193 |
| **S24** | `tile.evidenceLabel` | `edhrec` | Lower-case, mono 9px, **before** the bar | CP:179, CV:515 |
| **S25** | `tile.lift(pts)` | `+${pts} pts vs. all decks` | **REPLACES** `+${n} pts vs. average`. Canvas: `+31 pts vs. all decks` | CP:181, CV:614 |
| **S26** | `createPicker.dockSummary(commander, identity)` | `${commander} · ${identity}` | Canvas: `Kykar, Wind’s Fury · Jeskai` | CP:189, CV:266 |
| **S27** | `createPicker.dockSummaryEmpty` | `Pick a commander to start` | Button disabled alongside it | CP:190, RM:73-74 |
| **S28** | `Create deck →` | unchanged label **and** unchanged aria | #177 introduces **no new string but the summary line** | CP:185-186, CV:267 |
| **S29** | `shelf.noTarget` *(locked block)* | `no target · this is the deck’s plan` | was `no target — this is the deck’s plan`. Mono meta row already separates with a middot | CP:15-19, CV:594-595 |
| **S30** | `degraded.body` *(locked block)* | `…not by what other ${c} decks run. The shelves are honest and the percentages are missing.` | was `… run — so the shelves are honest and the percentages are missing.` Two claims, two sentences | CP:21-26, CV:597-598 |
| **S31** | `quickAdd.ownedFilterOffNote` *(locked block)* | `filter off · N results you don’t own` | was `filter off — N results you don’t own` | CP:28-31, CV:600-601 |
| **S32** | `builderEmpty.caption` *(locked block — **two calls in one line**)* | `Ninety-nine slots, zero filled. Type a name below, or take the ones we’ve already picked out. ${commander} eats everything anyway.` | Em dash → full stop **and** the second `ninety-nine` → `the ones`. **`A king with no army.` and `eats everything anyway` are locked verbatim — only the joint between the clauses moved.** | CP:33-40, CV:171, CV:213, CV:604 |
| **S33** | `builderEmpty` headline *(locked)* | `A king with no army.` | Verbatim, untouched | CV:132, CV:170, CV:212 |
| **S34** | `builderEmpty` role hint *(locked)* | `Try filling your ramp, draw, removal, and wipe slots first.` | Untouched | CV:134, CV:172, CV:214 |
| **S35** | Rationale line 1 *(quoted from `RECOMMENDED_MIX.ramp.rationale`)* | `Ramp 10 — you want your commander out a turn early, every game.` | **Quoted, not rewritten** (RM:312-314). Note it contains an em dash — see §8-8 | CV:466 |
| **S36** | Rationale line 2 | `Draw 10 — a four-player table runs you out of cards before it runs you out of life.` | as S35 | CV:467 |
| **S37** | Rationale line 3 | `Removal 10 · Wipes 3 — three opponents means three threats you didn’t plan for.` | Two roles on one line | CV:468 |
| **S38** | Rationale line 4 | `Land ~37 — advisory: a cheap curve wants fewer, a heavy one wants more.` | as S35 | CV:469 |
| **S39** | Shelf label (existing, reused) | `Top picks for Kykar` → `Top picks for {commander}` | The unowned shelf takes the **existing `shelf.labels.edhrec`** — no new key | CV:567, RM:143-144 |
| **S40** | Unowned shelf count clause (existing shelf grammar) | `· 5 to consider` → `· N to consider` | Rendered in `--fg-faint` after S21 | CV:569, RM:230 |

**Row count: 40 strings.**

**Never-use list:** no toast copy of any kind (D-B1); no timer/countdown copy (D-B2); never `N to buy`
for the Consider provenance (S23); never a fourth ownership carrier on the tile (S22); never a second
live `strip.hint` (S16); never an em dash in any new string, aria-label included (S11, RM:182-183).

---

## 8 · Accessibility contract

| # | Property | Value | Source |
|---|---|---|---|
| **X1** | Row remove control | `<button aria-label="Remove Sol Ring">` inside `li.row` | CV:270, RM:269-270 |
| **X2** | Row remove tap target | **`44×44` phone**, inline (sub-44) on desktop | RM:270, RM:288, CV:305 |
| **X3** | Spent slot | `li.row[data-removed]` containing `span` (mono) `"Sol Ring removed"` + `<button aria-label="Undo removing Sol Ring">` | CV:271-272, RM:271-273 |
| **X4** | Undo tap target | **`44px` tall** on phone; desktop text button | RM:272, RM:288 |
| **X5** | Short strip cell | `<button class="cell" aria-label="Ramp, 4 of 10. See ramp cards to consider.">` | CV:275, RM:275 |
| **X6** | Met strip cell | `<div class="cell" aria-label="Wipes, 3 of 3">` — **not focusable, no action** | CV:278, RM:276 |
| **X7** | Strip cell tap target | `62px` phone / `72px` desktop; the caption is never an independent target | RM:288, CV:457, RM:118 |
| **X8** | Rationale disclosure | `<button aria-expanded aria-controls="strip-rationale">Why these numbers?</button>` — **one per strip**, replacing five per-cell `aria-expanded` buttons | CV:277, RM:248-249 |
| **X9** | Unowned tile tag | `li.tile span.tag[aria-label="Smothering Tithe is not in your collection"]` | CV:279, RM:279 |
| **X10** | **Live region** | Removal and undo announce on the **builder's existing live region** — one region, not a new one, and the same one the adds use so five fast edits read in order | RM:282-285 |
| **X11** | Announcement order | `Sol Ring removed · 46 of 99 · undo available`, then on undo `Sol Ring back in the deck · 47 of 99` | RM:283-284, CV:384 |
| **X12** | **Focus movement on cell activation** | Focus moves to the `#shelf-<role>` heading, which takes `tabIndex={-1}`. **Scroll alone is not sufficient** — `scrollToShelf` already exists and must be paired with focus | RM:251-252, CV:483 |
| **X13** | Focus ring | Global `:focus-visible` — `2px var(--brass)` at `+2px` offset. **Not overridden anywhere in this addendum; the strip cell adds nothing.** | RM:292-293, CV:652 |
| **X14** | Keyboard on the strip | Cells in DOM order; `Enter` performs X12's two-step. No custom key handling. | CV:483 |
| **X15** | Dock button tap target | `48px` | RM:288, CV:267 |
| **X16** | Colour is never the sole signal | Unowned = tag word + aria + shelf heading. Removed = dashed rule + word + announcement. Met cell = loses its caption as well as its colour. | RM:285-287, CV:652 |
| **X17** | Contrast | `buy` `--warning` on `--surface` ≈ **7.1:1**; undo label `--fg-locked` on `--surface-sunken` ≈ **4.6:1**, and **supplementary to the Undo control beside it** | RM:290-291, CV:652 |
| **X18** | Motion | **Nothing joins the `prefers-reduced-motion` block.** No new motion is introduced anywhere in this addendum. | RM:263-264, CV:652 |
| **X19** | Ownership dot | remains `aria-hidden` — which is precisely why the `buy` tag is needed | RM:128-129, CV:497 |
| **X20** | Parity | Every construct must exist at **both** widths. The locked #158 parity constraint is the reason #179 exists; a remove affordance that exists at one width is the same defect one surface over. | RM:83-85, CV:345 |

**Row count: 20 a11y properties.**

---

## 9 · States the design does not specify

Silence is a finding. Each item below is a state a reasonable implementer will need and the design
does not draw or describe.

1. **Dock primary button, disabled.** RM:222 states `opacity: .5` in prose; **no disabled frame is
   drawn** in the canvas. No disabled label colour, no `aria-disabled` vs `disabled` ruling, no
   statement on whether the disabled button is focusable.
2. **Dock button hover / focus / pressed / pending.** None drawn or described. Only the global focus
   ring (X13) applies by inheritance.
3. **Remove ✕ pending state.** RM:236 says "keep `disabled={isPending}`" but **no visual is given**
   for a disabled/pending ✕ at either width. Nor is it stated whether the 44×44 hit box remains.
4. **Remove ✕ hover on phone.** Only idle and pressed are drawn (CV:305, CV:312). Desktop hover is
   drawn (CV:369). Not a defect, but record it.
5. **Undo control hover/pressed on phone.** RM:225 gives desktop `--brass` → `--brass-hover`; the
   phone control has **no** second state drawn.
6. **Undo control pending state.** Undo is a re-add server call (D-B8) yet no in-flight state is drawn
   for the Undo button. It is also unstated whether the row shows the label, a spinner, or nothing
   while the re-add is optimistic.
7. **Refused-undo recovery.** CV:376-379 draws the error row **without an Undo control**. The design
   does not say whether the user can retry from that row, whether the row persists, or how it clears.
   The copy (`Try adding it again.`) implies it does not retry in place — but that is inference.
8. **Rationale disclosure open, on desktop.** Only the phone open state is drawn (CV:463). The
   desktop panel's width, placement relative to the worked-example callout, and whether it pushes or
   overlays are all unstated.
9. **Rationale trigger hover / focus / pressed.** No states drawn.
10. **Rationale panel close behaviour.** `Hide` (S15) is drawn as text; it is not stated whether it is
    a second button, whether the trigger itself toggles, where focus goes on close, or whether `Esc`
    closes.
11. **Strip cell, met, on desktop hover.** A met cell is not a control (E-N2) — but the design does
    not say whether it must suppress the hover treatment, or whether `cursor: default` applies.
12. **Strip cell, loading / degraded.** The strip has a shipped degraded mode (`degraded.body`,
    S30) where percentages are missing. Whether a cell is still a control in the degraded state is
    unstated.
13. **Unowned tile: hover, focus, pending, and `In deck` after adding an unowned card.** Only the
    default unowned tile is drawn. Whether an added-but-unowned card keeps its `buy` tag in the
    `✓ In deck` state is unspecified.
14. **The unowned shelf when `unownedCount === 0`.** F-B4 covers the provenance string; the shelf
    itself is presumed absent but that is never stated.
15. **The empty builder at desktop when the reserve is tight.** The 72→64 / 96→88 shrink is phone-only.
    No desktop shrink threshold is given.
16. **Error state for the `/decks/new` dock.** Creation failure has no drawn state.
17. **`#172` — failed `searchCards` inside the quick-add bar.** Explicitly out of scope and still
    undrawn, but it now inherits §0: a failure line inside the quick-add bar is inside the dock
    (RM:315-317, RD:97-99).
18. **Announcement politeness and atomicity.** X10 names "the builder's existing live region" but the
    addendum never restates `aria-live` politeness, `aria-atomic`, or the announcement ordering
    guarantee when a removal and an add land in the same tick.
19. **`data-removed`** appears in the a11y contract (CV:271) as the spent-slot hook but is not
    otherwise specified — it is not stated whether it is required, or merely descriptive.
20. **Landmark/heading semantics for `#shelf-<role>`.** X12 requires focus to move to it and requires
    `tabIndex={-1}`, but the element's tag/level is not restated in the addendum.

---

## 10 · Conflicts (canvas vs README, and internal)

**Ruling: the canvas value ships.**

1. **`actions.ts` line range for the unowned append.** README says `actions.ts:105-170` (RM:134);
   canvas says `actions.ts:149-163` (CV:499). **Canvas wins.** Both are documentation-only references
   — verify against the file at implementation time and correct whichever is stale.
2. **Met-cell dash character.** The addendum's whole thesis is the removal of em dashes from copy
   (S29–S32), and the ticket brief calls the met cell "an em-less dash" — but the canvas draws
   `&mdash;` (an actual em dash, U+2014) in the met cell at **both** widths (CV:433, CV:460), and
   RM:227 just says "prints `—`". **Canvas wins: ship U+2014.** There is also **no copy key** for the
   met-cell dash in `add-panel addendum · copy strings.ts` — it is an undeclared literal.
3. **Desktop strip-cell height.** RM:118 and RM:226 assert `72px`; the canvas sets **no `min-height`**
   on the desktop cell (CV:408) — 72px is the natural height of its content at `padding: 11px 14px`.
   The phone cell **does** carry an explicit `min-height: 62px` (CV:457). **Ship `min-height: 72px`
   explicitly on desktop** so the 44px claim (X7) cannot regress with a content change.
4. **Met-cell dash colour differs by width.** RM:227 says `--border-dashed` flat. Canvas draws
   **desktop `#4A4033` (`--border-dashed`, CV:433)** and **phone `#3A3229` (`--border-strong`,
   CV:460)**. Canvas wins per-width; but this is very likely a drawing slip, since nothing else in the
   addendum varies a disabled-ish colour by viewport. **Flag to Design.**
5. **`strip.hint` is desktop-only in the canvas.** S16 replaces the locked hint and the desktop strip
   renders it (CV:404), but the phone strip header renders only `Recommended mix` and
   `a guide, not a gate` (CV:455). The README never says the hint is desktop-only. This is a
   parity divergence in a handoff whose own locked constraint (X20) forbids width-only constructs.
   **Ship as drawn and flag**, or ratify a phone placement with Design.
6. **The unowned tile omits the lift line.** RM:231 says the evidence label is "present on every tile
   that prints a percentage" and says nothing about the lift line, but the canvas draws
   `+31 pts vs. all decks` on the owned tile (CV:516) and **omits it entirely from the unowned tile**
   (CV:521-531), including on all five shelf tiles (CV:572-576). Since S22 removed the note line, the
   unowned tile has one fewer row than the owned one. **Unclear whether the omission is by ownership
   or by data availability.** Ship as drawn (no lift on unowned) and flag.
7. **`buy` tag font size differs between the decklist row and the tile.** Row: phone `9px` /
   desktop `9.5px` (CV:311, CV:368). Tile: `9px` at both widths (CV:523). RM:229 and RM:223 both say
   "same hex, same word" and do not mention size. Not a conflict per se — record it so the verifier
   does not "fix" it.
8. **The rationale panel's own copy contains em dashes.** S35–S38 are quoted `RECOMMENDED_MIX`
   strings and all four use `—` (CV:466-469). The addendum's stated rule (RM:182-183, "an aria-label
   is copy, so the no-dash rule covers it") is not applied here because RM:312-314 explicitly says the
   rationale copy is **quoted, not rewritten**. **This is deliberate and must not be "fixed" during
   implementation** — but it means the disclosure is the one surface in the addendum that ships em
   dashes.
9. **Rationale panel: five roles, four lines.** RM:228 says "four lines"; the canvas draws four
   (CV:466-469) with Removal and Wipes merged into line 3. So the panel is **not** a mechanical
   `RECOMMENDED_MIX` map — it is four authored groupings. RM:250 says the disclosure "carries all
   five rationales, which `RECOMMENDED_MIX` already holds", which reads as a 1:1 map. **Canvas wins:
   four lines, with the merge as drawn.**
10. **Undo row label colour vs. the contrast claim.** RM:291 states `--fg-locked` on
    `--surface-sunken` ≈ 4.6:1; the canvas card states `#6A6152` on `#181410` ≈ 4.6:1 (CV:652). These
    agree, and 4.6:1 **clears AA for normal-size text by 0.1** against the 4.5:1 floor. It passes,
    but with no margin at `11.5px`, so any later darkening of either colour breaks it. The design
    pre-empts the question by calling the label "supplementary to the Undo control beside it".
    Record it; do not darken.
11. **`unowned.shelfCoverage`'s comment placement in the copy file.** CP:154-155 places the comment
    "The trailing shelf these sit in. Uses the existing `edhrec` label…" **inside** the block of
    comments explaining the cut `unowned.note`, immediately above `shelfCoverage`. Cosmetic, but the
    file reads as if the note-cut rationale and the shelf rationale are one paragraph.
12. **`tile` copy block is labelled `#182`.** CP:174 heads the tile-evidence block
    `Tile evidence labels (#182 copy call 6)`. #182 is not one of the addendum's six tickets
    (#183 #177 #179 #185 #184 #176), and RM:150 numbers this as copy call 6 with no ticket. Likely a
    typo for #184 or for "copy call 6". **Flag.**
13. **README "nine copy calls" vs. the drawn count.** RM:150 and CV:588 both say **nine**. The
    canvas's copy-call section draws **ten** rows: `shelf.noTarget`, `degraded.body`,
    `quickAdd.ownedFilterOffNote`, `builderEmpty.caption` (counted as two), `tile.inclusion`,
    `tile.lift`, `strip.hint`, `strip.shelfLink`, `strip.shelfLinkAria`, `strip.cellLinkAria`,
    `unowned.note` — that is 12 rows for 9 declared calls, because `cellLinkAria` and `unowned.note`
    are addendum-file changes rather than edits to the locked block. The `REPLACES` list in the copy
    file (CP:11-76) is the authoritative nine. **Use CP's numbering, not a count of canvas rows.**
14. **Empty-builder desktop illustration is not shrunk.** RM:63 gives one shrink pair (`72→64`,
    `96→88`) without qualifying it as phone-only; the canvas draws desktop at `88` / `104×112`
    (CV:209-210), unshrunk. **Canvas wins: the shrink is phone-only.**

---

## 11 · Open risks carried from the design's own gap report

| # | Item | Disposition | Source |
|---|---|---|---|
| **G1** | #176 was the only product ruling — **ruled A on 2026-08-06**, so all of §6 ships. | Closed. Design to ratify the verdict flip at R4. | RM:297-299, RD:3-9 |
| **G2** | The `Owned only` axis in Consider now has two values. Still the wrong control, but the reasoning has changed. | Re-read, do not inherit. Out of scope. | RM:300-303, RD:87-90 |
| **G3** | The undo row's persistence is a **judgement, not a measurement**. Fallback if it reads as clutter: dismiss on the next successful *add*. | Ship as specified; do not implement the fallback. | RM:304-306, RD:82-86 |
| **G4** | `/decks/new` **desktop is asserted, not redrawn** — no frame exists. | Verify desktop separately; there is nothing to check the built desktop against. | RM:307-308, RD:100-101 |
| **G5** | The reserve is arithmetic, not a token or a shared layout component. | Two routes copy the `calc()`. A third surface is the extraction trigger. | RM:309-311, RD:91-93 |
| **G6** | Rationale copy is **quoted, not rewritten**; as a set the four lines may want an editing pass. | Not this addendum's call. Ship verbatim (S35–S38). | RM:312-314, RD:94-96 |
| **G7** | **#172** (no drawn state for a failed `searchCards`) is untouched and still open. It shares the dock with everything here. | Out of scope; will have to obey §0 when drawn. | RM:315-317, RD:97-99 |

---

## Row-count summary

| Section | Rows |
|---|---|
| 0 · Bottom-of-viewport rule | 9 |
| 1 · #183 elements + states | 11 + 4 = 15 |
| 2 · #177 elements + states | 7 + 3 = 10 |
| 3 · #179 elements + states | 9 + 5 = 14 |
| 4 · #185 elements + contract | 6 + 11 = 17 |
| 5 · #184 elements + states | 14 + 8 = 22 |
| 6 · #176 elements + contract | 20 + 8 = 28 |
| 7 · Strings | 40 |
| 8 · Accessibility contract | 20 |
| 9 · Unspecified states | 20 |
| 10 · Conflicts | 14 |
| 11 · Carried risks | 7 |
| **Total** | **216** |
