# Design property table · Welcome credits (R2)

Source: `design/design_handoff_the99_welcome_credits/` — README (R2 section wins over R1), `STATES-welcome-credits.md`,
`READINESS.md`, `R2-Placement`, `R2-Sheet`, `R2-States`, `R2-Themes` (the four R2 boards share one identical stylesheet),
and R1 `Credits-Page` for the Welcome cell line. Values are Kamigawa (Neon Rain) `:root` unless a row says otherwise.
Copy wording is not matched here (owned by /copy-review); the String column names which string/structure renders.

Conventions: `—` = explicitly absent in the design. A blank Desktop cell = same as Mobile. "board" = a value that exists
only on the canvas (board furniture or board-local token aliasing), noted so it is not mistaken for a spec.

Board-local token aliasing (R2 stylesheet line 527-528): `--accent-dim: var(--accent-shadow)`, `--accent-text: var(--accent)`,
`--fg-locked: #606476` (Amonkhet `#6E6654`, Kaldheim `#5F6D6E`). The app's shipped `--accent-dim` / `--accent-text` /
`--fg-locked` tokens are what the build reads; **no new tokens** (README).

---

## 1 · The Home strip (`.ws`, `role="region"`, `aria-label="Welcome credits"`)

### 1a · Container `.ws`

| Category | Property | Mobile (390) | Desktop |
|---|---|---|---|
| Layout | display | `flex` | |
| Layout | align-items | `center` | |
| Layout | gap | `12px` | |
| Dimensions | min-height | `52px` | |
| Dimensions | width | fills its parent (first-run: page width less `.frs` margins; dashboard: `.dbb` column) | first-run: page content width (`.frs` margins 28px); dashboard: main column `.dbl` (`flex:1`, board drawn at 894px) |
| Spacing | padding | `7px 4px 7px 12px` | |
| Border | border | `1px solid var(--accent-dim)` | |
| Border | border-radius | `12px` | |
| Color | background | `var(--surface)` | |
| Typography | font-size | `13.5px` | |
| Typography | line-height | `1.45` | |
| Typography | font-family | inherited, `'IBM Plex Sans', sans-serif` | |
| Color | color | `var(--fg-body)` | |
| Hover/focus | — | none set | none set |
| Transitions | — | none (README: no new motion) | |

### 1b · Mark `.wsm` (the pack card's diamond with the count; `aria-hidden="true"`)

| Category | Property | Mobile | Desktop |
|---|---|---|---|
| Layout | flex | `none` | |
| Dimensions | width / height | `30px` / `30px` | |
| Layout | display / align / justify | `flex` / `center` / `center` | |
| SVG/glyphs | diamond `.wsm i` size | `22px × 22px` | |
| SVG/glyphs | diamond transform | `rotate(45deg)` | |
| Border | diamond border | `1.5px solid var(--accent)` | |
| Color | diamond background | `color-mix(in srgb, var(--accent) 12%, var(--surface))` | |
| Border | diamond border-radius | `3px` | |
| Layout | diamond display | `flex`, centered; `font-style: normal` | |
| SVG/glyphs | count `.wsm i b` transform | `rotate(-45deg)` (counter-rotated, upright) | |
| Typography | count font | `700 11px var(--disp)` | |
| Color | count color | `var(--accent)` | |
| String | count | the welcome credits left (`15`, `9`, `0`) | |
| Note | build | README: "the pack card's diamond (R2b offer art)"; READINESS audit: reuse `OfferArt({ count })` (`offer-art.tsx`). The board's CSS diamond is the drawing of it. | |

### 1c · Text `.wst` (lead `b`, body, link `u`)

| Category | Property | Mobile | Desktop |
|---|---|---|---|
| Layout | flex / min-width | `1` / `0` | |
| Typography | text-wrap | `pretty` | |
| Typography | lead `b` weight | `600` | |
| Color | lead `b` color | `var(--fg)` | |
| Typography | link `u` | underline (native `<u>`), `text-underline-offset: 3px` | |
| Color | link `u` color | `var(--fg)` | |
| Color | link `u` text-decoration-color | `color-mix(in srgb, var(--accent) 55%, transparent)` | |
| Layout | link `u` white-space | `nowrap` | |
| Layout | link `u` position | `relative` | |
| Dimensions | link hit area `u::after` | `content:''; position:absolute; left:-6px; right:-6px; top:-12px; bottom:-12px` | |
| String | structure (held) | `<b>{count} welcome credits</b>` + until-date sentence + `<u>Where they work</u>` (opens the sheet) | |
| String | structure (partly spent) | `<b>{left} of your {granted} welcome credits</b>` + left-until-date sentence + `<u>Where they work</u>` | |

### 1d · Close `.wsx` (`aria-label="Close"`, glyph `✕`)

| Category | Property | Mobile | Desktop |
|---|---|---|---|
| Layout | flex | `none` | |
| Dimensions | width / height | `44px` / `44px` | `32px` / `32px` |
| Spacing | margin-right | — | `4px` |
| Layout | display / align / justify | `flex` / `center` / `center` | |
| Color | color | `var(--fg-faint)` | |
| Typography | font-size | `13px` | |
| SVG/glyphs | glyph | text `✕` (bare, no border or background) | |
| Conditional | behaviour | closes the strip for good, stored per account (G2); never comes back on another device | |

### 1e · Variants of the strip

| Variant | Property | Value |
|---|---|---|
| Expiring `.ws.warn` | border-color | `color-mix(in srgb, var(--warning) 60%, var(--border-strong))` |
| Expiring | mark `i` border-color | `var(--warning)` |
| Expiring | mark `i` background | `color-mix(in srgb, var(--warning) 12%, var(--surface))` |
| Expiring | mark count `b` color | `var(--warning)` |
| Expiring | lead `b.w` color | `var(--warning)` (lead carries class `w`) |
| Expiring | link `u` | unchanged (`--fg`, accent underline) |
| Expiring | structure | `<b class="w">{left} welcome credits</b>` + expire-in-3-days sentence + `<u>Where they work</u>` |
| Expiring | never | `--danger` |
| Used up (dimmed mark) `.wsm.dim` | opacity | `.45` |
| Used up | filter | `saturate(.3)` |
| Used up | count | `0` |
| Used up | lead `b` | — (no bold lead; plain sentence) |
| Used up, payments on, nothing bought | link | `<u>` = teaser string (`See packs and the monthly plan`), to `/credits`; no `Where they work` |
| Used up, payments off (or after a purchase) | link | — (plain sentence, free-credit-comes-back line, no link) |
| Used up | border / container | unchanged from held (`--accent-dim`) |
| Partly spent / paid limit / also bought / switch off / payments off | visual | as held; only the string changes for partly spent and paid limit |

### 1f · Placement margins

| Home | Property | Mobile (390) | Desktop |
|---|---|---|---|
| First-run (no collection) | wrapper | `.frs`, directly after the About line `.abl` | |
| First-run | `.frs` margin | `8px 16px 0` | `10px 28px 0` |
| First-run | context: About line `.abl` margin above | `14px 16px 0` (min-height 46px, radius 10px, `--surface-rail`, `--border-strong`) | `18px 28px 0` |
| First-run | context: step stack `.frst` after | `padding: 16px 16px 20px; gap: 11px` | `padding: 20px 28px 26px; gap: 12px` |
| First-run | fold | above the fold at 390 × 844, step 1 starts under it | |
| Dashboard | position | first child of `.dbb` (column, `gap: 12px; padding: 14px 16px 16px`), over Ready to build | first child of `.dbl` main column (`flex-direction: column; gap: 11px; flex: 1; min-width: 0`), over Ready to build |
| Dashboard | own margin | — (spacing from the container's gap and padding) | — |
| Dashboard | context: page head `.dbh` above | `padding: 22px 16px 0` | `padding: 22px 26px 0` |
| Dashboard | context: `.dbb` | | `flex-direction: row; gap: 20px; padding: 20px 26px 26px; align-items: flex-start` |
| Dashboard | right column `.dbr` | n/a (`display: contents`) | `width: 316px`, Friends alone, nothing added |
| Dashboard | fold | above the fold at 390 × 844 | |

---

## 2 · The sheet / modal (`Where credits work`, the shipped SocialModal)

### 2a · Frame

| Category | Property | Mobile (390): sheet `.sht` | Desktop: modal `.mdl.wide` |
|---|---|---|---|
| Layout | position | `absolute; left:0; right:0; bottom:0` | `absolute; left:50%; margin-left:-230px; top:70px` |
| Dimensions | width | full width | `460px` on the board; **build uses the shipped 440 default** (READINESS audit, `social-modal.tsx:99`) |
| Layout | z-index | `31` | `31` |
| Color | background | `var(--surface-raised)` | `var(--surface-raised)` |
| Border | border | `border-top: 1px solid var(--border-strong)` | `1px solid var(--border-strong)` |
| Border | border-radius | `20px 20px 0 0` | `14px` |
| Color | box-shadow | `0 -20px 50px rgba(0,0,0,.5)` | `0 30px 70px rgba(0,0,0,.6)` |
| Spacing | padding-bottom | `26px` | `20px` |
| Layout | display | `flex; flex-direction: column` | block |
| Grab handle `.grab` | padding / layout | `9px 0 2px`, flex centered | — |
| Grab handle `.grab i` | size / radius / color | `40px × 4px`, radius `4px`, `var(--border-strong)` | — |
| Scrim `.scr` | | `position:absolute; inset:0; z-index:30; background: color-mix(in oklab, var(--bg) 72%, transparent)`; pressing it closes | same |
| Transitions | | shipped SocialModal's own; none new | |

### 2b · Head `.mhead`

| Category | Property | Mobile | Desktop |
|---|---|---|---|
| Layout | display / align / gap | `flex` / `flex-start` / `12px` | |
| Spacing | padding | `8px 18px 0` | `12px 20px 0` |
| Typography | title `h2` font | `700 18px var(--disp)` | font-size `19px` |
| Spacing | title padding-top | `10px` | |
| Layout | title | `flex:1; min-width:0; margin:0` | |
| String | title | `Where credits work` | |
| Close `.x` | size | `44px × 44px` | |
| Close `.x` | margin-right | `-10px` | |
| Close `.x` | color / font-size | `var(--fg-muted)` / `15px` | |
| SVG/glyphs | close | bare `✕` | |

### 2c · Body `.mbody` and its paragraphs

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| `.mbody` | padding | `6px 18px 0` | `6px 20px 0` |
| `.mbody` | layout | `flex; flex-direction: column; gap: 12px` | |
| `.mbody p` (all paragraphs) | font-size / line-height | `13.5px` / `1.55` | |
| `.mbody p` | color | `var(--fg-body)` | |
| `.mbody p` | margin / text-wrap | `0` / `pretty` | |
| L6 line (first `p`) | structure | R4's L6 line, reused from `creditsPageCopy.viewsFree`, identical to `/credits` | |
| Grant line `p.gl` | type / color | inherits `.mbody p` | |
| Grant line `p.gl b` | color / weight | `var(--fg)` / `600` | |
| Grant line | structure | `<b>{count} welcome credits</b>` (held) or `<b>{left} of your {granted} welcome credits</b>` (partly spent) + full-month date (`November 20`) + free-credit-goes-first sentence | |
| Grant line warn `p.gl.warn` and its `b` | color | `var(--warning)` (both the paragraph and the bold) | |
| Grant line warn | structure | `{left} welcome credits expire in 3 days, on {date}` + free-credit sentence; the whole line in the warning ink | |
| List wrapper | | an unclassed `<div>` holding lock/reason line, `ul.wl`(s), `.wlf` | |

### 2d · Row list `ul.wl` / `li`

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| `.wl` | margin / padding / list-style | `0` / `0` / `none` | |
| `.wl` | layout | `flex; flex-direction: column` | |
| `li` | display | `grid` | |
| `li` | grid-template-columns | `minmax(0,1fr) auto` | |
| `li` | gap | `3px 12px` | |
| `li` | padding | `10px 0` | |
| `li` | border-top | `1px solid var(--border)` (every row, first included) | |
| Name `.nm` | font-size / weight | `14px` / `600` (family inherited Plex Sans) | |
| Name `.nm` | color / align-self | `var(--fg)` / `center` | |
| Cost chip `.cp` | shape | `border-radius: 999px; border: 1px solid var(--accent-dim); padding: 2px 9px` | |
| Cost chip `.cp` | font | `11px 'IBM Plex Mono', monospace` | |
| Cost chip `.cp` | color | `var(--accent-text)` | |
| Cost chip `.cp` | white-space / align-self | `nowrap` / `center` | |
| Where line `.wh` | grid-column | `1 / -1` (full second row) | |
| Where line `.wh` | font / color | `11px 'IBM Plex Mono', monospace` / `var(--fg-faint)` | |
| Where line `.wh` | layout | `flex; align-items: center; gap: 6px` | |
| `.wh .try` | margin-left | `auto` (right end of the where line) | |
| Row structure | | name, cost chip, where line (+ `Try it ›` when it has one). Descriptions dropped (R2). Rows reused whole from `writtenForYouCopy.rows`, filtered by `captionLineSwitches` (G6) | |

### 2e · `Try it` `.try`

| Category | Property | Value |
|---|---|---|
| Layout | display / align / gap | `inline-flex` / `center` / `4px` |
| Dimensions | min-height | `24px` |
| Typography | font | `600 12.5px 'IBM Plex Sans', sans-serif` |
| Color | color | `var(--accent-text)` |
| Layout | position | `relative` |
| Dimensions | hit area `::after` | `content:''; position:absolute; left:-8px; right:-8px; top:-10px; bottom:-10px` |
| SVG/glyphs | chevron | `<i>›</i>`, `font-style: normal` |
| Conditional | before a collection | — (no Try it on any row) |
| Conditional | cards in, no deck | Help me choose only (it leads the list) |
| Conditional | with a deck | Suggested changes, Look deeper (Proposed cuts), Help me choose; Overview and Which deck needs it most? none |

### 2f · Lock line and reason line (`p.wlr`)

| Category | Property | `.wlr` rule (as written) | Effective rendered (board) |
|---|---|---|---|
| Spacing | margin | `0` | `0` |
| Spacing | padding | `9px 0 3px` | `9px 0 3px` |
| Border | border-top | `1px solid var(--border)` | same |
| Typography | font-family | `'IBM Plex Mono', monospace` | `'IBM Plex Mono', monospace` |
| Typography | font-size | `11px` | **`13.5px`** (`.mbody p`, specificity 0,1,1, beats `.wlr` 0,1,0) |
| Typography | line-height | `normal` (from the `font` shorthand) | **`1.55`** (`.mbody p`) |
| Color | color | `var(--fg-muted)` | **`var(--fg-body)`** (`.mbody p`) |
| Typography | text-wrap | — | `pretty` (`.mbody p`) |
| Layout | display / align / gap | `flex` / `center` / `8px` | same |
| Intent | README R1 §2 | "11px mono, `--fg-muted`, after a hairline" | the rendered PNG shows the 13.5px body-ink form; the written rule and README agree on 11px / `--fg-muted` |

| Element | Property | Value |
|---|---|---|
| Reason line diamond `.wlr i` | size | `6px × 6px` |
| | transform | `rotate(45deg)` |
| | border | `1px solid var(--fg-faint)` |
| | display / flex | `block` / `none` |
| Lock line glyph `.wlr .lock` | color | `var(--fg-locked)` |
| | SVG | `svg.lock` `11 × 14`, viewBox `0 0 11 14`: shackle `path d="M2.5 6V4a3 3 0 0 1 6 0v2"` `fill:none; stroke:currentColor; stroke-width:1.4`; body `rect x=.5 y=6 w=10 h=7.5 rx=1.5 fill=currentColor`; `.lock{display:inline-block;flex:none}` |
| Lock line | structure | lock glyph + shipped `step2Locked` string, once, ABOVE all five rows (before a collection) |
| Lock line | diamond | — |
| Reason line | structure | diamond + shipped `NEEDS_A_DECK` string, once, between Help me choose's `ul.wl` and a second `ul.wl` of the other four (cards in, no deck) |
| Reason line | glyph | — (no lock) |
| With a deck | lock / reason line | — (neither) |

Note on hairlines: the second `ul.wl` after the reason line keeps its first `li`'s `border-top`, so the reason line sits between two `--border` hairlines (its own top, the next row's top).

### 2g · Teaser foot `.wlf` / `.tz`

| Category | Property | Value |
|---|---|---|
| Border | `.wlf` border-top | `1px solid var(--border)` |
| Spacing | `.wlf` margin-top | `2px` |
| Dimensions | `.tz` min-height | `44px` |
| Layout | `.tz` | `flex; align-items: center; justify-content: space-between` (label left, chevron right) |
| Typography | `.tz` font | `600 13.5px 'IBM Plex Sans', sans-serif` |
| Color | `.tz` color | `var(--accent-text)` |
| SVG/glyphs | chevron | `<i>›</i>`, `font-style: normal` |
| String | | teaser string (`See packs and the monthly plan`), to `/credits`; packs first |
| Conditional | shown | payments on for the reader AND nothing bought (`everBought` false, chip's rule) AND opened from Home |
| Conditional | absent (never disabled) | payments off; anything bought; opened from the `/credits` Welcome cell |

---

## 3 · `/credits` Welcome cell (`.cells` > `.cell`)

| Element | Property | Mobile (390) | Desktop |
|---|---|---|---|
| `.cells` | | `flex; align-items: stretch; border: 1px solid var(--border-strong); border-radius: 12px; background: var(--surface); overflow: hidden` | |
| `.cell` | padding | `12px 12px 13px` | `16px 18px` |
| `.cell` | layout | `flex: 1; min-width: 0; flex-direction: column; gap: 4px; position: relative` | |
| `.cell + .cell` | divider | `border-left: 1px solid var(--border)` + `::before` 8×8 diamond, `rotate(45deg)`, `left:-5px; top:50%; margin-top:-4px`, `background: var(--surface)`, `border-top/right: 1px solid var(--border-strong)` | |
| `.cell .k` (label `Welcome`) | | `.k`: `'IBM Plex Mono'`, `500`, `letter-spacing: .14em`, uppercase, `var(--fg-faint)`; `.cell .k` font-size `10px` | |
| `.cell .n` (count) | | `600 24px/1.05 'IBM Plex Mono'`, `var(--fg)`, `flex; align-items: baseline; gap: 4px` | font-size `30px` |
| Sub line `.cell .su` | font | `10.5px/1.4 'IBM Plex Mono', monospace` | |
| Sub line `.cell .su` | color | `var(--fg-muted)` | |
| Sub line | structure (R2) | date form (`expire {Nov 20}`), then `<br>`, then `<u>Where they work</u>` on its own line | |
| `Where they work` link `.cell .su u` | color | `var(--fg)` | |
| | text-decoration-color | `color-mix(in srgb, var(--accent) 55%, transparent)` | |
| | text-underline-offset | `3px` | |
| | hit-area expansion | — (none set on the cell link) | |
| | action | opens the same sheet, without the teaser | |
| Expiring `.cell .su.warn` (R1) | color | `var(--warning)` | |
| Expiring | structure | `expire in 3 days, {Nov 20}` (R1). R2 draws no expiring cell with the link (see ambiguities) | |
| Also bought (R1) | | Welcome cell sits beside the Packs cell (`never expire`) | |
| Conditional | shown | only while a welcome credit is held (`welcome > 0`); absent when used up or expired | |
| Timing | | date drawn after hydration, in the reader's own day (G4), like the Free cell's reset time | |
| Board only | `.new` | R1's `<span class="new">` = pink dashed "new" outline (`outline: 1.5px dashed rgba(255,77,154,.55); outline-offset: 3px`), board marker, not shipped; R2's span has empty class | |

---

## 4 · Themes (R2-Themes: Low Sun · Amonkhet, First Frost · Kaldheim)

| Token used | Kamigawa (`:root`) | Low Sun (`.th-amonkhet`) | First Frost (`.th-kaldheim`) |
|---|---|---|---|
| `--accent` | `#FF4D9A` | `#CF8745` | `#5C86C9` |
| `--accent-shadow` (board's `--accent-dim`) | `#843052` | `#6B482A` | `#2C405F` |
| `--warning` | `#E0913C` | `#DEAA29` | `#E0913C` |
| `--surface` | `#16181F` | `#1E1A15` | `#1E1F26` |
| `--surface-raised` | `#191B22` | `#211D18` | `#22232B` |
| `--border` | `#181C26` | `#2B241B` | `#1A1F2B` |
| `--border-strong` | `#262A35` | `#3A3229` | `#2E3340` |
| `--fg` | `#E6E8F0` | `#EDE6D8` | `#C6D2D3` |
| `--fg-body` | `#B1B6C7` | `#C0B8A6` | `#B3C0C2` |
| `--fg-muted` | `#959AAD` | `#A59C89` | `#95A4A6` |
| `--fg-faint` | `#6F7486` | `#8B8270` | `#7C8A8C` |
| `--fg-locked` | `#606476` | `#6E6654` | `#5F6D6E` |
| `--disp` (mark count, sheet title) | `'Chakra Petch', sans-serif` | `'Cinzel', serif` | `'Metamorphous', serif` |
| other | | | `.th-kaldheim * { font-synthesis-weight: none }` |

Theme notes: drawn per theme are held (first-run 390), expiring with the sheet open (390), used up (dashboard 390) and
expiring desktop. In Low Sun `--warning` sits close to the accent, so the expiring state is carried by its words; no
per-theme override of any strip or sheet rule. The board heads Low Sun "(the default)"; README says Kamigawa values unless
a board says otherwise.

---

## 5 · Cross-cutting categories

| Category | Finding |
|---|---|
| Hover/focus | None set anywhere on strip, sheet, rows, Try it, teaser or cell link. Use shipped focus treatment. |
| Transitions | None new (README: no new motion, no new dependencies). The sheet/modal open/close is the shipped SocialModal's. |
| Hit areas | strip link `u::after` −6/−12px; `.try::after` −8/−10px; `.wsx` 44×44 (390) / 32×32 (desktop); `.tz` min-height 44; sheet `.x` 44×44. |
| Responsive | Strip identical at both widths except `.wsx` (32px + `margin-right: 4px` on desktop) and placement margins. Sheet (390) vs modal (desktop) differ in frame, head padding, title size 18/19, body padding 18/20. Rows, lock/reason line, teaser identical. Cell padding and count size differ. |
| Accessibility | strip `role="region" aria-label="Welcome credits"`; mark `aria-hidden="true"`; ✕ `aria-label="Close"`; lock svg `aria-hidden="true"`. |
| Dates | Strip uses short month (`Nov 20`); sheet grant line uses full month (`November 20`); cell uses short. All in the reader's local day, after hydration (G4). |

---

## 6 · State coverage (STATES-welcome-credits.md + R2-States)

Fixtures: 15 credits granted Oct 21, expiring Nov 20; free 1 a day; reset 2:01 AM.

| State | Trigger | Home drawn on | Strip renders | Sheet | Chip | Welcome cell | Key props / must not |
|---|---|---|---|---|---|---|---|
| Held, unused | lot, not expired, welcome = 15 | first-run (or dashboard) | `.ws`, mark `15`, held lead + date + `Where they work`, ✕ | whole; first-run: lock line, no Try it | `16 credits` | `15` · date, then `Where they work` on its own line | never "unlock"; no view behind a credit |
| Expiring | welcome > 0, within 3 days | either (reachable at 0 cards, all 15 left) | `.ws.warn`: border, mark, count and lead `b.w` in `--warning`; expire-in-3-days sentence + `Where they work` | grant line `p.gl.warn` | warning chip, `… expire Nov 20` | `.su.warn`, `expire in 3 days, Nov 20` | never `--danger`; never arrives over an open surface |
| Expiring, partly spent | welcome > 0 and < 15, within 3 days | dashboard | as expiring, with the left count (`9`) | grant line warn | warning chip | warn | as expiring |
| Expired | expiresAt <= now | either | absent (Home as shipped) | unreachable | never-bought | absent | no last line |
| No lot | no welcome row | either | absent | unreachable | as shipped | absent | invent no grant |
| Switch off, lot held | `welcomeCreditsEnabled` false | either | as held | as held | as held | kept | hide no true facts |
| Payments off, lot held | `paymentsEnabled` false | either | as held | no teaser (absent) | no `Get more credits` | kept; page reduced | no disabled buy control |
| Partly spent | 0 < welcome < 15 (cards in) | dashboard only | mark `9`, `<b>9 of your 15 welcome credits</b>` + left-until + `Where they work` | Try it per deck state | `9 credits` | `9` | no colour change |
| Used up | welcome = 0, not expired (cards in) | dashboard only | `.wsm.dim` mark `0`; used-all sentence + `<u>` teaser link (payments on, nothing bought) or free-credit-comes-back sentence with no link; no `Where they work` | not linked | never-bought | absent | promise no more welcome credits; leaves on the date or ✕ |
| Used up, payments off | welcome = 0, `paymentsEnabled` false | dashboard | as used up, no link | not linked | | absent | |
| Paid limit | `paidAtLimit` (needs a purchase) | dashboard only | as partly spent; the press and line carry the limit (Line-and-Chip W6) | no teaser | count | kept | never `--danger` |
| Also bought | `everBought` | dashboard | as held | no teaser | total | beside Packs | promise no leftover conversion; used up after a purchase reads like payments off |
| Dismissed | ✕ pressed (per account) | either | absent for good | still reachable from the Welcome cell | as the lot | as the lot | never returns on another device |

Sheet by collection state (R2-Sheet):

| Sheet state | Lock/reason line | Row order | Try it | Teaser |
|---|---|---|---|---|
| Before a collection | lock line once, over all five | About's order | — | shown (payments on, nothing bought) |
| Cards in, no deck | reason line once, after Help me choose, over the other four | Help me choose first, then the four | Help me choose | shown |
| With a deck | — | About's order | the three with a landing | shown |
| Opened from `/credits` (390 drawn) | per collection state (drawn: with a deck) | About's order | per deck state | — |

---

## Ambiguities

1. **Reason/lock line size and ink.** `.wlr` says `11px` mono `--fg-muted` (README R1 agrees), but `.mbody p` overrides it on the board to `13.5px/1.55` `--fg-body`, which is what the PNGs show. Intent reads as the written 11px / `--fg-muted`; the build should match the shipped strings' own component if it reuses one.
2. **Modal width.** Board `460px`; READINESS audit rules the build uses the shipped SocialModal default `440px` and adds no width.
3. **Cost chip content.** The chip renders only the unit (`each`, `per run`, `per look`, `per search`, `per read`) with no number; take it from `writtenForYouCopy.rows` as reused.
4. **Expiring Welcome cell with the link.** R2 draws only the non-expiring cell with `Where they work`; R1 draws the expiring form without it. Presumably both: warn date, `<br>`, link.
5. **Desktop sheet over `/credits`.** Only the 390 sheet is drawn; desktop presumably the same modal without the teaser.
6. **Mark art.** The board draws a CSS diamond; README/READINESS say reuse the pack card's `OfferArt({ count })`. Its warn and dim forms are specified only in the board CSS.
7. **Default theme.** R2-Themes labels Low Sun "(the default)"; README says boards are Kamigawa unless stated.
8. **Partly spent on first-run Home** is not drawn (READINESS: the strip is one component, so it still reads correctly).
