# Design table: first-run locked nav (rail well, tab-bar bracket, page line, notes)

Sources (design files only; no `src/` read):
- `design/design_handoff_the99_first_run_onboarding/README.md` (R) D5 `:75-90`, D6 `:92-102`, D7 `:104-106`
- `.../STATES-first-run-onboarding-r1.md` (S) §B `:17-31`, tokens `:61-66`
- `.../READINESS-audit.md` (A) O3 `:118-136`, corrections 1 and 3 `:140-149`, O1 ruling `:22-27`, copy `:186-188`, D7 `:213-215`
- `.../The 99 - First Run Onboarding (R1).dc.html` (C) frames 1a `:230-283`, 1b bar `:316-328`, 2a `:418-446`, 2b `:450-480`, 2c `:483-511`, data `:755-805`
- `.../first-run-onboarding · copy strings.ts` (K) `:22-29`

Precedence: A (Hugh's rulings + engineering corrections) > R/S > C. Where the canvas and the
README agree on a value and A is silent, the value stands. Copy is recorded as KEYS; the
approved wording for this PR (supersedes K `:23-27`, R `:83`, and the canvas text) is:

| Key | Approved wording |
|---|---|
| `lock.pageLine` | Collection, Commanders, Discover and Decks open once your cards are in. |
| `lock.note(label, others)` | {label} opens once your cards are in. So do {others}. |
| `lock.tabBracket` | Open once your cards are in |
| `lock.railLabel` | Locked |
| `lock.goToStep1` | Go to step 1 |
| `firstRun.step2Locked` | Opens once your cards are in |
| `firstRun.step3Locked` | Opens once you pick a commander |
| `lockedItemAria(label)` | {label}, locked |

Widths: **D** = desktop 1300 (rail), **M** = mobile 390 (tab bar). "—" = element absent at that width.

---

## 1. Rail well (D only; M —)

| # | Property | D 1300 | Source |
|---|---|---|---|
| 1.1 | Element | one container wrapping the 4 locked slots (Collection, Commanders, Discover, Decks); Home slot stays outside, above it | C `:236-241`, R `:77` |
| 1.2 | Replaces | the 34px divider and the lone padlock glyph | R `:81` |
| 1.3 | Width | 48px | R `:77`, C `:237` |
| 1.4 | Layout | flex column, align-items center | C `:237` |
| 1.5 | Gap | 4px (slot to slot, last slot to foot block) | R `:78`, C `:237` |
| 1.6 | Padding | top 4 / right 0 / bottom 9 / left 0 | R `:78`, C `:237` |
| 1.7 | Background | `var(--surface-sunken)` | R `:77`, C `:237` |
| 1.8 | Border | 1px solid `var(--border)` (resting) | R `:77`, C `:237` |
| 1.9 | Border while a slot is hovered/focused | stays 1px solid `var(--border)`: 2a draws `--border-strong` once and no prose states it, so it is ruled out (see Contradictions) | C `:426` vs `:237` — see Contradictions |
| 1.10 | Radius | 12px | R `:78`, C `:237` |
| 1.11 | Position in rail | directly after the Home slot, same 4px column gap as live slots (outer column gap 4) | C `:235-237` |
| 1.12 | Rail itself (context, unchanged) | 62px wide, `--surface-rail`, border-right 1px `--border`, padding 14/0 | C `:234` |

### 1a. Locked rail slot (D)

| # | Property | D 1300 | Source |
|---|---|---|---|
| 1a.1 | Size | 38 × 38 | C `:239` |
| 1a.2 | Radius | 10px | C `:239` |
| 1a.3 | Background | transparent (no fill in any state) | C `:239`, `:427` |
| 1a.4 | Glyph color | `var(--fg-locked)` ("dim slots") | S `:23`, C `:239` |
| 1a.5 | Glyph | production `NavIcon` (canvas shapes are scaffolding) | R `:30-31` |
| 1a.6 | Focus ring | the app's 2px accent ring: `0 0 0 2px var(--accent)` | C `:445`, `:801` (`lockablesFocus`) |
| 1a.7 | Hover visual on the slot itself | none drawn beyond the note opening (and well border, 1.9) | C `:427` |
| 1a.8 | Element | `<button>`, in the tab order (was `<span role="link" aria-disabled>`, out of tab order) | R `:89-90`, A `:120-121` |
| 1a.9 | Accessible name | `lockedItemAria(label)` = label + "locked", once; does not repeat the note | A `:130-131` |
| 1a.10 | `aria-disabled` | **absent** (dropped) | A `:124-125` (overrides R `:89`, C `:444`) |
| 1a.11 | `aria-expanded` | `true` while its note is open, `false` otherwise | A `:125` |
| 1a.12 | `aria-controls` | the id of its note | A `:125` |
| 1a.13 | `aria-describedby` | the note's sentence element, which is always in the document | R `:89`, A `:126-128` |
| 1a.14 | `title` attribute | **none** (removed) | A `:129` |
| 1a.15 | `aria-current` | kept on a locked slot whose route still renders (e.g. on `/collection`) | A `:136` |

### 1b. Well foot: padlock + LOCKED (D)

| # | Property | D 1300 | Source |
|---|---|---|---|
| 1b.1 | Block | flex column, align center, gap 5 (padlock to word), margin-top 3 | C `:240` |
| 1b.2 | Padlock size | 12 × 14 box; shackle 7 × 7.5 at left 2.5 top 0, radius 4 4 0 0, no bottom border; body 12 × 8.5 at bottom, radius 3 | C `:240` |
| 1b.3 | Padlock stroke | 1.5px `var(--fg-locked)` (up from `--fg-disabled`) | R `:79`, C `:240`, `:511` |
| 1b.4 | Word copy key | `lock.railLabel` | K `:24` |
| 1b.5 | Word family | mono (`--font-mono`; canvas IBM Plex Mono) | R `:79`, C `:240` |
| 1b.6 | Word size | 8.5px | R `:79`, C `:240` |
| 1b.7 | Word letter-spacing | .1em | R `:79`, C `:240` |
| 1b.8 | Word transform | uppercase (key is "Locked", drawn `LOCKED`) | C `:240` |
| 1b.9 | Word weight / line-height | not specified (inherit) | — |
| 1b.10 | Word color | `var(--fg-locked)` | R `:79`, C `:240` |
| 1b.11 | Aria | decorative duplicate of the slots' names: not stated; padlock glyph carries no text | — |

## 2. Desktop page line (D only; M —)

| # | Property | D 1300 | Source |
|---|---|---|---|
| 2.1 | Copy key | `lock.pageLine` | K `:23` |
| 2.2 | Placement | under the Home H1 ("Welcome to The 99"), inside the header block | R `:82`, C `:249-250` |
| 2.3 | Margin | top 12px | C `:250` |
| 2.4 | Layout | flex row, align-items center, gap 8px | C `:250` |
| 2.5 | Size | 12.5px | R `:82`, C `:250` |
| 2.6 | Color | `var(--fg-muted)` | R `:82`, C `:250` |
| 2.7 | Family / weight | body sans, regular (inherited) | C `:250` |
| 2.8 | Padlock | same 12 × 14 glyph as 1b.2, stroke 1.5 `var(--fg-locked)`, flex none, leading | C `:250` |
| 2.9 | Phone | not rendered; the bracket carries the reason | R `:83-84`, S `:21` |
| 2.10 | Account with decks but no collection (no checklist) | **no page line** (per this PR's brief); the audit leaves it open | A `:148-149` — see Contradictions |
| 2.11 | H1 context | display face 27px/1, 700, `--fg`; kicker mono 10px .18em `--fg-faint` above it, mb 7 | C `:248-249` |

## 3. Desktop note (rail, D)

| # | Property | D 1300 | Source |
|---|---|---|---|
| 3.1 | Width | 268px | R `:86`, C `:436` |
| 3.2 | Padding | top 14 / right 16 / bottom 16 / left 16 | C `:436` |
| 3.3 | Layout | flex column, gap 8px | C `:436` |
| 3.4 | Background | `var(--surface-raised)` | R `:86`, C `:436` |
| 3.5 | Border | 1px solid `var(--border-strong)` | R `:86`, C `:436` |
| 3.6 | Radius | 10px | R `:86`, C `:436` |
| 3.7 | Shadow | `0 18px 40px rgba(0,0,0,.45)` (raw, no token) | C `:436` |
| 3.8 | Anchor | the hovered/focused slot; left edge 12px right of the rail's edge (rail 62 → note at x=74) | R `:86-87`, C `:436`, `:444` |
| 3.9 | Vertical | caret level with the slot's centre (drawn: note top 146, caret top 28 → Commanders slot) | C `:436-437` |
| 3.10 | Caret | 10 × 10 square rotated 45°, `--surface-raised` fill, border-left + border-bottom 1px `--border-strong`, at left −6, top 28 | C `:437` |
| 3.11 | z-index | not specified; must sit above page content | — |
| 3.12 | Label copy key | `lock.railLabel` | R `:88`, K `:24` |
| 3.13 | Label type | mono 10px, letter-spacing .12em, uppercase, `var(--fg-faint)` | C `:438` |
| 3.14 | Sentence copy key | `lock.note(label, others)`; label = this slot, others = the other three locked labels joined | R `:88`, K `:26-27` |
| 3.15 | Sentence type | 13px, line-height 1.5, `var(--fg-body)`, text-wrap pretty | C `:439` |
| 3.16 | `{label}` span | `var(--fg)` | C `:439` |
| 3.17 | Button copy key | `lock.goToStep1` | K `:28` |
| 3.18 | Button | hairline: height 32, padding 0 13, radius 8, 1px `var(--border-strong)`, text `var(--fg)` 12.5px, no fill, align-self flex-start, margin-top 2 | R `:88`, C `:440`, `:445` |
| 3.19 | Button action | moves focus to Upload a CSV (scrolls if needed); with no checklist on screen → navigates to `/collection/replace` | S `:27`, C `:445`, A `:22-27`, `:145-146` |
| 3.20 | Opens on | hover, keyboard focus, or click on a locked slot | R `:86`, S `:24-25`, C `:444` |
| 3.21 | Closes on | Escape (returns focus to the slot); blur of slot-and-note; **not** on pointer leaving the slot (must be hoverable, WCAG 1.4.13) | A `:132-133` (overrides S `:26`, C `:444` "pointer-out") |
| 3.22 | Sentence presence | always in the document; visually hidden (sr-only) while closed, so `aria-describedby` is never empty | A `:126-128` |
| 3.23 | role | none required (not `role="status"`) | A `:134` by analogy — inference |
| 3.24 | One at a time | opening one slot's note replaces another's (implied by per-slot anchoring) | C `:444` — inference |

## 4. Tab-bar bracket (M only; D —)

| # | Property | M 390 | Source |
|---|---|---|---|
| 4.1 | Bar height while locked | 88px (from 74); `--tabbar-h: 88px` in first run only | R `:96`, S `:28`, C `:316`, `:327` |
| 4.2 | Bar padding while locked | top 7 / right 8 / bottom 14 / left 8 (live: 8/8/14/8, flex) | C `:316` vs `:405` |
| 4.3 | Bar bg / border | `var(--surface-rail)`, border-top 1px `var(--border)` (unchanged) | C `:316` |
| 4.4 | Bracket row | position relative, height 14px, margin-left one slot width (74.8 at 390 = (390−16)/5), spanning slots 2–5 to the bar's right padding | R `:94`, C `:317` |
| 4.5 | Bracket box | absolute, left 8 / right 8 (inset within its row), top 7, height 6; 1px `var(--border-strong)` on top/left/right, no bottom; radius 3 3 0 0 ("open box") | R `:94`, C `:318` |
| 4.6 | Label position | absolute, left 50%, top 0, translateX(−50%): centred on the box's top edge | R `:94`, C `:319` |
| 4.7 | Label knockout | padding 0 7px, background `var(--surface-rail)` (breaks the line behind it) | C `:319` |
| 4.8 | Label layout | inline flex, align center, gap 5, white-space nowrap | C `:319` |
| 4.9 | Label copy key | `lock.tabBracket` | K `:25` |
| 4.10 | Label type | mono 9px, line-height 14px, letter-spacing .08em, uppercase, `var(--fg-locked)` | R `:95`, C `:319` |
| 4.11 | Label padlock | 9 × 11 box; shackle 5 × 6 at left 2, radius 3 3 0 0; body 9 × 6.5, radius 2; stroke 1.2px `var(--fg-locked)` | R `:95`, C `:319` |
| 4.12 | Tabs row | flex, below the bracket row | C `:321` |
| 4.13 | Aria | not specified; bracket text is visible reason text (not a control) | — |

### 4a. Locked tab slot (M)

| # | Property | M 390 | Source |
|---|---|---|---|
| 4a.1 | Size | flex 1, height 52 | C `:322` |
| 4a.2 | Layout | flex column, centred, gap 5 | C `:322` |
| 4a.3 | Radius | 12px | C `:322` |
| 4a.4 | Background | transparent (locked slots never take the active `--surface-inset` fill) | C `:764-770` |
| 4a.5 | Color (glyph + label) | `var(--fg-locked)` | S `:23`, C `:769` |
| 4a.6 | Label type | mono 9px, letter-spacing .06em | C `:322` |
| 4a.7 | Tapped (note open) | inset outline `inset 0 0 0 1px var(--border-strong)`; never a fill | R `:98`, C `:470`, `:477`, `:771` |
| 4a.8 | Element / a11y | same contract as 1a.8-1a.15: button, name = `lockedItemAria`, `aria-expanded`/`aria-controls`, no `aria-disabled`, no `title`, `aria-current` kept where the route renders | A `:124-136` |
| 4a.9 | Focus after tap | stays on the slot; the note's button is next in tab order | A `:134-135` |

## 5. Phone note (M)

| # | Property | M 390 | Source |
|---|---|---|---|
| 5.1 | Position | absolute over content; left 12 / right 12; bottom = bar height + 10 (98 at 88) — "rises 10px above the bar" | R `:99`, C `:460`, `:477` |
| 5.2 | Padding | top 14 / right 16 / bottom 16 / left 16 | C `:460` |
| 5.3 | Layout | flex column, gap 10 | C `:460` |
| 5.4 | Background | `var(--surface-raised)` | R `:99`, C `:460` |
| 5.5 | Border | 1px solid `var(--border-strong)` | C `:460` |
| 5.6 | Radius | 12px | R `:99`, C `:460` |
| 5.7 | Shadow | `0 -12px 36px rgba(0,0,0,.45)` (raw) | C `:460` |
| 5.8 | Caret | 10 × 10 rotated 45°, `--surface-raised`, border-right + border-bottom 1px `--border-strong`, bottom −6, horizontally on the tapped slot's centre (canvas: right 37 for Decks) | R `:99`, C `:461` |
| 5.9 | z-index | not specified; above page content and below nothing in the bar | — |
| 5.10 | Label (`LOCKED`) | **not drawn** on the phone note | C `:460-465` |
| 5.11 | Sentence copy key | `lock.note(label, others)` | R `:100`, K `:27` |
| 5.12 | Sentence type | 14px, line-height 1.5, `var(--fg-body)`, text-wrap pretty; `{label}` in `var(--fg)` | C `:463` |
| 5.13 | Button copy key | `lock.goToStep1` | K `:28` |
| 5.14 | Button | full width, height 44, centred, radius 10, 1px `var(--border-strong)`, `var(--fg)` 14px, no fill | R `:100`, C `:464` |
| 5.15 | Button action | scrolls to and focuses Upload a CSV; no checklist → `/collection/replace` | S `:27`, A `:22-27` |
| 5.16 | Opens on | tap on a locked tab slot | R `:97-99`, S `:25` |
| 5.17 | Closes on | tap outside; a second tap on the slot; Go to step 1. No timeout | R `:101`, S `:26`, C `:478` |
| 5.18 | Escape | closes and returns focus to the slot (correction 1's rule, applied to both notes) | A `:133` — inference for M |
| 5.19 | role | **not** `role="status"` (it holds a button) | A `:134` (overrides R `:101-102`, C `:478`) |
| 5.20 | Sentence presence | always in the document, sr-only while closed | A `:126-128` |
| 5.21 | Hover / focus open | none on phone ("—") | S `:24` |

## 6. Step card locked lines (both widths; context for the copy keys)

| # | Element | Key | D | M | Source |
|---|---|---|---|---|---|
| 6.1 | Step 2 locked reason | `firstRun.step2Locked` | under title, `--fg-locked` | same | S `:10`, C `:267`, `:307` |
| 6.2 | Step 3 locked reason | `firstRun.step3Locked` | same treatment | same | S `:10`, C `:272`, `:312` |

## 7. Unlock (D7)

| # | Property | Value | Source |
|---|---|---|---|
| 7.1 | Unmounts | the well (slots return to the live list), the bracket, the page line, both notes (and their sr-only sentences) | R `:105`, S `:30` |
| 7.2 | `--tabbar-h` | back to 74px; bar padding back to 8/8/14 | S `:31`, C `:405`, `:409` |
| 7.3 | Animation / toast | none; no transition | R `:105`, S `:30`, C `:409` |
| 7.4 | Mark of the change | Home switches to the dashboard (the checklist unmounts once the collection is read) | A `:213-215` (overrides R `:105-106`) |
| 7.5 | Slot a11y after unlock | ordinary nav links again (no `aria-expanded`/`aria-controls`) | inference from 7.1 |

## 8. Theme coverage

| # | Property | Value | Source |
|---|---|---|---|
| 8.1 | Tokens only | `--surface-sunken`, `--surface-rail`, `--surface-raised`, `--border`, `--border-strong`, `--fg`, `--fg-body`, `--fg-muted`, `--fg-faint`, `--fg-locked`, `--accent`; no new tokens | S `:61-66` |
| 8.2 | Well vs rail | `--surface-sunken` separates from `--surface-rail` in all six themes; Phyrexia faintest; the 1px `--border` holds the group | C `:511` |

---

## State coverage

| State | Trigger | D 1300 renders | M 390 renders |
|---|---|---|---|
| L0 Locked, idle | collection empty (`uniqueCards === 0`), A1/A2 | well + LOCKED foot; page line (only when the checklist is on Home); slots `--fg-locked`, focusable | bracket over tabs 2–5; bar 88; slots `--fg-locked` |
| L1 Slot hovered | pointer over a locked slot | note anchored to that slot; well border stays `--border` (row 1.9) | — |
| L2 Slot focused (keyboard) | Tab onto a locked slot | 2px accent ring + note; `aria-expanded=true` | focus ring; note does not open on focus (S `:24`) |
| L3 Slot clicked/tapped | click / tap | note opens (same as L1) | slot inset outline + note rises; focus stays on slot |
| L4 Pointer leaves slot for the note | pointer-out toward note | note **stays open** | — |
| L5 Note dismissed | Escape / blur (D); tap outside, second tap, Go to step 1 (M) | note closes, sentence stays sr-only, Escape returns focus to slot | note closes, outline clears |
| L6 Go to step 1, checklist on Home | press button | focus (and scroll) to Upload a CSV | scroll to and focus Upload a CSV |
| L7 Go to step 1, no checklist (decks, no collection) | press button | navigate to `/collection/replace`; no page line on Home | navigate to `/collection/replace`; bracket still shown |
| L8 On a locked route that renders | e.g. `/collection` while empty | slot keeps `aria-current` and the locked contract | same |
| L9 Unlock | collection read | well, page line, notes unmount; no animation; Home shows dashboard | bracket and notes unmount; bar 74; no animation |
| L10 Theme switch | any of six themes | tokens only | tokens only |

## Contradictions and gaps (resolved as marked)

1. `aria-disabled`: R `:89` and C `:444` say `button[aria-disabled=true]`; A `:124-125` drops it for `aria-expanded` + `aria-controls`. **A wins.**
2. Hover note dismissal: S `:26` and C `:444` close on pointer-out; A `:132-133` forbids closing on pointer-out. **A wins.**
3. Phone note role: R `:101-102` and C `:478` use `role="status"`; A `:134` forbids it. **A wins.**
4. Unlock mark: R `:105-106` and S `:30` "ticked step 1 is the only mark"; A `:213-215` says Home switches to the dashboard. **A wins.**
5. Page line for decks-but-no-collection: A `:148-149` leaves placement open; this PR's brief rules none. Recorded as none.
6. Well border on hover: C `:426` draws `--border-strong`, C `:237` and R `:77` give `--border`, and no prose mentions a change.
7. "Every word in the lock uses `--fg-locked`" (C `:511`) vs the page line in `--fg-muted` (R `:82`, C `:250`) and the note's label in `--fg-faint` (C `:438`).
8. Trigger surface: C `:281` "hover, focus or click on the well" vs R `:86` "on a locked slot"; per-slot recorded.
9. Canvas 2c well (C `:492-494`: gap 1, padding 3/0/7, 30px slots, no padlock) differs from 1a (C `:237-240`); 2c only declares the tab strip simplified (C `:511`). 1a recorded.
10. Phone caret: C `:461` right 37 puts its centre ~54px from the right edge; the Decks slot centre is ~45px (C `:316`, 5 × 74.8). Rule "caret on the slot" recorded.
11. Copy: placeholder wording (K `:8`, `:23-27`, R `:83`) superseded by the approved list; K has no `step3Locked` key (only `step3LockedAfterRead`, `:15`, dead per A `:190-191`).
