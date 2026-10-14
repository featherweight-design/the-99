# The 99 — /commanders and /discover, two lanes (design handoff, R1)

`design/design_handoff_the99_commanders_discover/` · 2026-09-07

Structural sibling: `design/design_handoff_the99_game_log/` — same folder convention, same copy-export
shape, same READINESS format. The sheet is the one already drawn in
`design/design_handoff_the99_collection_filter/`, not a second pattern.

**Read first, and a blocker.** The brief names
`docs/superpowers/specs/2026-09-07-commanders-two-lanes-design.md` as source of truth. **That file is
not in this design project** — `docs/superpowers/` here holds only `design-tables/appshell.md`. This
handoff is built against the nine locked decisions **as the brief states them**, plus the shipped
handoffs (`design_handoff_the99_commanders_plane/`, `.../discovery/`, `.../collection_filter/`) and
the brand refresh. Anything in the spec beyond the nine is unverified — see gap 1.

Likewise `src/components/commanders/filter-bar.tsx`, `facet-strip.tsx` and `discovery-row.tsx` are
not in this project; `src/` holds only `shell/nav.tsx`. The rack, pip row and row anatomy are traced
from the handoff canvases that drew them. **If the component files disagree with the canvas, the
component files win** and the geometry notes below are what to correct.

| File | What it holds |
|---|---|
| `The 99 - Commanders and Discover.dc.html` | The deliverable. Both lanes at desktop, five rack states, five phone frames, the five-item nav measured, the four calls, the contract. |
| `STATES-filter-rack.md` | The six states × two lanes, in full, including what each one must not do. |
| `CHROME-five-item-nav.md` | The fifth nav item, measured at 390 and 320, and what it costs `nav.tsx`. |
| `commanders-discover · copy strings.ts` | Production strings for both lanes. |
| `READINESS.md` | Self-assessed readiness and what blocks a green. |
| `brand/` | The locked brand sheet, copied in for self-containment. |

**Alignment.** Everything here is drawn on the refresh (`design_handoff_the99_refresh/`): 32px hairline
pills, **one filled bone button per screen**, brass reserved for *in use / to buy* and for
active-filter state, Cinzel for names and headings, Plex Sans for body, Plex Mono for every figure
and label, and the five stroke rail icons at 19px / 1.5px. No new token, no new hex, no new modal.

---

## The nine locked decisions, and where each one is visible

| # | Locked | Where |
|---|---|---|
| 1 | Two destinations, not a toggle or a facet | Frames B and C are separate screens with separate rail items. The one link between them is a plain navigation pill, carrying no state. |
| 2 | Each lane carries only its own controls | Frame A's inventory; availability is drawn on B and absent from C, scope is drawn on C and absent from B. |
| 3 | Availability on the owned lane only | B's `Score against` group; C has no such group and no greyed stand-in. |
| 4 | Every control renders at all times, greyed rather than absent | B's colour match greys with no pip lit (call 1); the pips themselves never disappear. |
| 5 | Search on both lanes | Leading control in both racks; the persistent phone row on both. |
| 6 | Mobile is a persistent search+sort row, everything else behind Filters | Frames E1–E5. |
| 7 | Chips show only non-default controls | D1 (one chip) through D3 (five) and E5 (overflow). |
| 8 | One result line per screen | Bottom of every rack; the exact-mode aside is appended to it, never a second line. |
| 9 | Nav goes to five items | Frame F, measured. |

The facet is not reopened. `facet-strip.tsx` and `discovery-row.tsx` stay as they ship.

## The four calls left to Design

### Call 1 · Colour match with no pip lit → **greyed in place, and it remembers**

The wrapper flattens to `--surface-sunken` (`#171310`), both labels drop to `--fg-locked`
(`#6E6654`), hover fill is removed, the control keeps `aria-disabled="true"` and stays focusable so
AT users can find it. **The segment that is selected keeps its `#3A3229` hairline outline** — greying
may remove emphasis but it must not erase state, or the player lights a pip and the mode appears to
change by itself.

At 2.6:1 the greyed label fails AA, under the WCAG exemption for inactive controls; nothing depends
on reading it, because the live state is one pip-tap away. The **sheet** adds one mono 10.5px line
("Pick a colour and this decides how the pips combine") because in a sheet the pips are 60px above
and the relationship has to be said. The **desktop rack does not** — the modifier sits inside the pip
wrapper behind a hairline, 22px from the pips, and the geometry is the explanation.

This reverses `commanders_plane`'s ruling that the modifier is *absent* with no colours lit. Locked
decision 4 is the newer instruction and it is followed; the cost is that a player who has touched
nothing now sees one dead control on both lanes. Accepted: greying teaches that the mode belongs to
the pips, where absence taught nothing and made the stack jump.

### Call 2 · Four or five active filters → **one line, collapse, never wrap, never scroll**

Desktop shows all five: measured at 612px of the 1,058px available at 1180px, so there is no wrap
state to design and none is drawn. Phone keeps **one line**, filled in control order
(search → colours → match → availability → order), with the remainder collapsed into a dashed
`+N` chip that **opens the sheet** and is not dismissable. `Clear` is pinned to the right edge.

Rejected: **wrapping** (a second chip line pushes the list down at the exact moment the player is
watching it shorten, and un-ticking a filter makes it jump back up), and **horizontal scroll**
(hides active filters behind a gesture, and can carry `Clear` off-screen — the one control that must
never be hard to reach). Multi-value axes collapse **before** the row does: two or more pips print as
`2 colours`, never five hue chips.

### Call 3 · 640–1024px → **the sheet wins to 1024px**

The inline rack needs 300px search + 190px pip wrapper + 250px `Score against` + 150px order —
**890px before a single gap**, so at 900px it wraps to two rows or squeezes search below usefulness.
One breakpoint at 1024px, chosen with `matchMedia`, and **both are never rendered at once** (the
sheet is `aria-modal`; a hidden duplicate rack breaks the a11y tree — the same rule
`collection_filter` set for the panel).

Between 640 and 1024 the persistent row keeps 44px targets and simply grows wider. The sheet stays a
sheet rather than becoming a centred dialog: the list behind it is still the thing being changed, and
a dimmed centre modal hides it.

### Call 4 · The Filters count badge → **brass pip, controls not values, search excluded**

999px pip, `#14110E` numeral on `#C9A24B`, mono 10.5/600, `1px 6px`, shown from the **first** active
filter; the button's border turns brass with it, so the state does not depend on reading a figure.

It counts **controls off default, not values** — two pips is `1`. It does **not** count search or
order, both of which sit on the row beside it showing their own state; a badge that includes what you
can already see makes the sheet look fuller than it is. The ceiling is therefore **4** on the owned
lane and **3** on discover, and no `9+` case exists.

Rejected: a bare dot (drops the count and buys nothing), and the count inside the label
(`Filters · 2` reads as a name rather than a state, and collides with the shipped `Shopping · 8`
pill convention where the number is content).

---

## Other decisions this handoff makes

**1 · Neither lane has a header CTA.** `New deck` is gone from /commanders and the `Your commanders`
pill from /discover. The row is the action on both lanes — `Start this deck` / `See the pool` — and a
filled header button competed with the thing the screen is for. The nav is how you cross between
lanes; a header pill naming the other lane would be a toggle wearing a link's clothes, and locked
decision 1 is that these are destinations.

**1a · The row keeps every figure it ships with.** Rank + diamond, name, the four
role counters against their targets (`RAMP 45/10`), the synergy bar with `own 98 of top 281`, the
availability receipt (`727 of your cards are free · ◆ 447 already in use`), the named receipts line,
fit with its delta (`61 /100 FIT`, `↓10 from 71`), and the Pool / Roles / Synergy split bar with its
legend. **Nothing was dropped to make room for the refresh.** What the refresh adds is the commander
art washed behind the row — the treatment from the refreshed deck tiles, and the only thing carried
over from them. The art **bleeds in from the leading edge and fades out**, rather than sitting under
the whole row: near full strength at the left edge, the name reading on top of it, and nothing left of
it by the time the figure columns start. Every figure therefore clears AA on flat `--bg` rather than
on a photograph, and the row still opens with the commander's picture. The receipts line is the tightest of them and it is
`--fg-faint` (`#8E8269`, 4.6:1) at mono 10.5px, **not** `--fg-locked`: the game-log package already
ruled that `#6E6654` at 2.8:1 is the one string that cannot afford to be hard to read, and receipts
is content, not an inactive control. Phone carries the same set in the shipped stacked order: rank ·
name · fit + delta, split bar, role chips, `own N of top M`, then the availability line — and no
thumbnail, per the table below.

**Thumbnail rule — one line, all three cases: no lane shows a thumbnail at rest, at any breakpoint.**

| | at rest | with a named printing |
|---|---|---|
| Owned, desktop | **no thumbnail** — art bleed only | 34×48, `I3` |
| Discover, desktop | **no thumbnail** — art bleed only | 34×48, `I3` |
| Phone, both lanes | **no thumbnail** — art bleed only | 28×40 in the same slot, same lift |

Any earlier mention of a 44×62 or 32×45 thumb, or of the discover row "keeping the thumb", is
superseded by that table.

**The one figure that is deliberately not redrawn is the printing thumbnail.** The art bleed is that
image, at size, so a 44×62 card box in front of it printed the same picture twice — the box went, the
picture stayed. **Confirmed at R2: the row identifies the commander, not a printing** — it names no
set, collector number or finish, and the bleed is whichever art the app already holds. Frame **I3**
is the contingency: the moment a printing *is* named on this row the 34×48 thumb returns between rank
and name (radius 3px, no border, `0 2px 10px rgba(0,0,0,.55)` lift so it separates from its own art)
with the printing line under the name in mono 10.5px. The content column loses 48px; the figure
columns don't move. If a printing is named the thumb is **not** optional — the bleed may be a
different printing's art, which is the one case where it actively misleads.

**1b · Discover keeps Best fit / Something new.** It is the lane's scope control and it leads the
rack (`Best fit ▾`, hairline at default, brass off it), with both glosses shown in the sheet —
*most of its support list already owned* / *farthest from the archetypes you have built*. It is
listed in frame A as a discover-only control, the mirror of availability. The owned lane has no scope
control: that lane **is** the owned scope.

**2 · Reading order is search → colours (+ match) → score against → order**, i.e. narrow precisely,
narrow coarsely, choose which cards count, choose the order — `commanders_plane`'s option 1, at the
leading edge. **Both variants are now drawn**: leading in <a href="#D2">D2</a>, trailing in **I1**.

Design recommends **leading**. Trailing puts search — the control people arrive with — farthest from
the eye entering the page, and it inverts the phone, where search is pinned left on the persistent
row and cannot mirror; a rack that reads right-to-left on desktop and left-to-right on a phone is two
racks to learn. Trailing's one real win is that search lands above the fit column and under the
header's right edge, so on a wide monitor the hand travels less between field and scrollbar. If
trailing wins, the redraw is I1 plus the chip row's justification and nothing else in the package.

**3 · The rack never moves.** It does not collapse at zero results, does not reorder, does not become
sticky, and the chip line holds its 22px of height at rest so the first chip does not push the list
down. Five stacked controls pinned at the top of a phone would leave under half the viewport for the
list, and the list is the surface.

**4 · The zero state names the control that emptied the list and offers one correction.** `Drop Red`,
`Switch to Any of these` — one specific fix, plus `Clear all filters` as the wholesale escape. The
heading is the shipped Cinzel line (*Nothing in the pile matches*); discover gets its own
(*No commander by that name*) plus one sentence explaining that owned commanders live on the other
lane, because on this lane "no match" most often means *you own it already*.

**5 · Discover rows carry counts, not a score.** Corrected at R3: R2's component notes gave discover
the owned row's `NN /100 FIT` block, delta and three-segment ramp. **Discovery does not blend** —
there is no 0–100 figure and no previous score to delta against — so drawing one invented a number
the app cannot produce. The right column is now the three figures that exist: the support count over
the EDHREC total (`71 OF TOP 248 OWNED`, with a single-fill ratio bar), the deck count, and the
novelty count. Also gone from this lane: the free / in-use line and the named receipts, both being
availability figures.

**5b · The count stack folds without losing a count.** Desktop's 246px column is three figures plus a
ratio bar; phone has two bands in 268px, and all three counts still fit because none of them is a
blend and none needs a second line of its own. Support takes band one's trailing edge (the owned
lane's fit slot — it is what the rank is on), the ratio bar spans the fold, and deck + novelty share
one line in band two. Nothing is dropped at 390 and nothing is dropped at 320; below 360 the two
counts stay on one line at 10px.

**5a · Recommendation, not a drawing: don't give discover a blended fit score.** `Best fit` can rank
the lane on the support ratio alone — that is a sort key, not a displayed score, and it needs no new
scoring. A 0–100 discovery score would have to blend a pool you cannot build from, and its delta has
no second reading to compare against. If it is ever wanted it should be spec'd as a scoring change
first; nothing in this package assumes it.

**6 · The result line is the only live region.** One per lane, `polite`, debounced 300ms. The exact-mode
aside (*Exactly excludes 6 that Any would show*) is appended to that same sentence rather than
becoming the second line `commanders_plane` had to suppress on mobile.

---

## Component notes

| Component | Spec |
|---|---|
| **Rack container** | `--surface-sunken` (`#171310`), `1px --border` bottom, padding `14px 22px 12px`, three rows: controls / chips / result line, gap `11px`. |
| **Search field** | 300px × 34px desktop, full-width × 44px phone. `#100D0A` on `1px #3A3229`, radius 8px (10px phone); border → `#C9A24B` with a query. Leading ⌕ 14px `#8E8269`; trailing clear ✕ in a `#2A241D` disc once non-empty. Phone field is 16px text to clear the iOS zoom floor. |
| **Pip wrapper** | `1px #2A241D` on `#14110E`, radius 9px, height 34px; border → `#C9A24B` when any pip is lit. Holds five 22px pips (radius 6px), a `1px #2A241D` divider, then the match modifier. |
| **Pip — lit / unlit** | Lit: `1.5px #EDE6D8` border, full-opacity fill. Unlit: `1px #3A3229`, fill at `opacity .34`. Hue is never the only signal. Phone: 44px, radius 11px, `2px` bone border when lit. |
| **Colour match** | Two 22px mono 10.5px segments inside the wrapper. Selected: `#C9A24B` fill, `#14110E` label 600. Unselected: `#A89B84`. Greyed: see call 1. Phone: two 44px pills in the sheet, brass hairline + `rgba(201,162,75,.16)` when selected. |
| **Score against** *(owned only)* | Mono 10px uppercase label + a 32px two-segment control, `1px #3A3229` (→ `#C9A24B` when off default), radius 8px, selected segment `#241F18` / `#EDE6D8`. Phone: two 44px pills + one mono explainer line. |
| **Order trigger** | 32px hairline pill, `Order · fit ▾`, `1px #3A3229` → `#C9A24B` off default. Single-select menu, closes on pick — never a checkbox list. Phone: a 44px icon button on the persistent row opening the same menu, plus pills in the sheet. |
| **Chip** | Desktop 22px, phone 30px; `#241F18` on `1px #2A241D`, radius 999px, mono 10.5px `#C6B79A`, trailing ✕ `#8E8269`. Colour chips lead with 7–8px pip squares. |
| **Overflow chip** | `#171310` on `1px dashed #4A4033`, mono `+N`, opens the sheet, no ✕. |
| **Clear** | Mono 11px `#C9A24B`, no border, last in the chip row and pinned right on phone. `#6E6654` and inert with nothing active. |
| **Result line** | Mono 11.5px `#C6B79A`, tabular, one per screen. `N of M commanders match` filtered; `148 commanders you own and haven't built` / `3,301 commanders` at rest. |
| **Row (owned)** | Art wash: commander art **bleeds in from the leading edge**, a 470px band cropped wide, faded out with `mask-image: linear-gradient(90deg,#000 0,#000 42%,rgba(0,0,0,.5) 72%,transparent)` and darkened for legibility by `linear-gradient(90deg, rgba(20,17,14,.28) 0px, .42 108px, .78 220px, .94 336px, 1 452px)`. Art is at about three-quarters strength behind the rank and printing, the name sits on it, and everything from ~450px right is flat `--bg`. No card fill and no border on the art; `1px --border` divider between rows, no card fill. Columns: 24px rank (mono 19px + 6px diamond, brass at rank 1)  · content (Cinzel 17px name + 9px pips; four role chips; synergy row; availability line; receipts line at mono 10.5px `--fg-faint`, never `--fg-locked`) · 206px fit block · 32px `Start this deck` hairline pill on `rgba(20,17,14,.5)`. |
| **Role chip** | 22px, radius 6px, `rgba(36,31,24,.86)` on `1px #2A241D`, mono 10px `#8E8269` label at `.08em`, figure `#EDE6D8` 600. Four per row, target after the slash. |
| **Synergy row** | Mono 10px `SYNERGY` at `.14em` + 148×5 bar (track `--elevated`, fill **`--accent`**) + mono 11px `own **98** of top 281`. |
| **Fit block** | Mono 27px/600 figure + mono 11px `/100 FIT`; delta mono 10.5px `#A89B84` (`↓10 from 71`); 6px three-segment bar in a **three-step accent ramp** — `--accent-dim` `#5E4A22` / `--accent-mid` `#9B7C36` / `--accent` `#C9A24B` on `--elevated` — legend mono 9.5px with matching 7px swatches. The graphs are the one place accent is *measurement* rather than *in use / to buy*, which is how they ship; every other accent on the surface still means in-use, to-buy, or a filter that is on. Per-theme values come from `tokens.r6.json`. |
| **Row (discover)** | Same art wash, rank, name, pips and role chips. **No fit block, no delta, no split bar** — discovery does not blend, so the right column is a 246px stack of counts: mono 27px/600 support count + mono 11px `OF TOP 236 OWNED`, a single-fill `--accent` ratio bar (support ÷ EDHREC total, a proportion of two real counts and not a score), then `**1,209** decks tracked` and `**172** of its top cards new to you` in mono 10.5px. Content column ends on `not in your collection`. No availability receipt, no receipts line. Trailing `See the pool`. |
| **Row — phone** | Art wash as a 268px leading band, same mask, darkened by `linear-gradient(90deg, rgba(20,17,14,.26) 0px, .5 88px, .86 168px, 1 250px)` — art behind the thumb, rank and name, flat ground under the split bar, chips and figures. Two bands: 32×45 thumb · mono rank · name + pips · right-aligned fit / `FIT` / delta; then the split bar full width, the role chips wrapping, `own N of top M`, and the availability line. Whole row is the target. |
| **Scope trigger** *(discover only)* | 34px hairline pill, 7px brass diamond + label + `▾`; `1px #3A3229` at `Best fit`, `#C9A24B` at `Something new`. Sheet: two 48px option rows carrying the glosses, diamond filled brass when picked. |
| **Filters button** | 44px, `1px #3A3229` → `#C9A24B` when active, label 13.5px; badge per call 4. |
| **Sheet** | Reused verbatim from `collection_filter`: radius `22px 22px 0 0`, `1px #3A3229` top, `0 -20px 50px rgba(0,0,0,.5)`, backdrop `rgba(16,13,10,.74)`, 38×4 handle, `max-height 78vh`, bottom padding clears the tab bar. `role=dialog aria-modal`, focus trapped, Esc / handle-drag / backdrop / primary all dismiss. |
| **Sheet primary** | The screen's one filled bone button: `Show 4 commanders`. A dismiss that names what it reveals — it commits nothing, and swiping the sheet away loses nothing. |
| **Zero state** | Three `#3A3229` diamonds (card-fan mark stand-in), Cinzel 19px heading, 13.5px `#A89B84` body with the offending value in `#C6B79A`, one filled specific correction + one hairline `Clear all filters`. Phone stacks them full-width at 48px. |

## Notes for engineering

- **`filter-bar.tsx` is replaced by two thin lane racks over one shared control set.** Search, pips +
  match, and order are the shared components; `ScoreAgainst` mounts on the owned lane only. Do not
  pass a `disabled` availability into discover — it is not in that lane's control list.
- **One `matchMedia('(min-width: 1024px)')` hook** decides rack or row+sheet. Never render both.
- **Every control is a URL parameter**, as today: `q`, `c` (comma-joined), `m=any|exact`,
  `a=all|free` (owned only), `o`. A filtered lane is linkable and survives reload; the chip row and
  the badge are both derived from those params, not from separate state.
- **The badge count is one function** over the params — `activeControlCount(params, lane)` — read by
  the badge, the chip row and `Clear`'s enabled state. Do not count in three places.
- **The reveal window is untouched.** `RevealControl` keeps printing "25 shown · N more below" inside
  the `<ul>`; the rack must not restate it and the result line is not a window count.
- **`facet-strip.tsx` and `discovery-row.tsx` are read, not edited.**
- **Copy** lives in `src/lib/copy/` — see `commanders-discover · copy strings.ts`. Two blocks,
  `commandersCopy` and `discoverCopy`, sharing one `filterCopy` for the strings that must not diverge.
- **`nav.tsx` gains one item and loses adjudication #1** (diamond + label only) — already retired by
  the refresh's icon rail. See `CHROME-five-item-nav.md`.
- **Mock data:** the owned lane's five rows are the commanders used across this project's handoffs;
  the 148 / 3,301 figures are the brief's, and every N-of-M in the canvas is arithmetically
  consistent within its own frame. Discover's deck counts are fabricated.

## Logged for later — real mana symbols instead of colour squares

Asked in review; not in this handoff. **LOE: about a day**, and the work is one `<ManaPip size>`
component plus a sweep of the ~6 places pips render (both racks, the sheet, the chip row, the rows,
the deck tiles). Two supply routes: the Mana webfont, or Scryfall's symbology SVGs cached locally —
prefer the SVGs here, for crisp small marks and no FOIT. Half a day for the component and the two
lanes, half for the remaining surfaces plus the **off** state, which the real symbols do not carry:
today a pip's lit state *is* its full-colour fill, so unlit needs the bone ring plus a dim/desaturate.

**Design's recommendation is a size split, not a swap.** At 9px the round symbols with interior
glyphs read as mud, so keep flat colour squares for the small identity strips inside rows and chips,
and use true symbols at ≥16px — rack pips, sheet pips, card detail. Assets have to be dropped into
the project; none are drawn here.

## Dependency on the refresh — confirmed coupled

**This package is drawn on `design_handoff_the99_refresh/` and is meant to ship with it.** It is not
re-renderable against the shipped chrome in any useful sense: the five-item nav in
`CHROME-five-item-nav.md` is measured on the refresh's 19px stroke rail icons and 8px bar padding, and
it retires the refresh's own adjudication #1. Against the shipped chrome the fifth item would be a
fifth `RailDiamond`/`TabDiamond`, which the refresh already replaced — drawing that would be designing
a chrome nobody intends to ship.

Concretely, the two share **one** `nav.tsx` change: the refresh swaps the glyphs and this package adds
the fifth entry. Sequenced either way they are one edit to the same `ITEMS` array and the same
`NavItem['href']` union, so splitting them means shipping a nav that is half-refreshed. **Recommend:
one nav change, both packages behind it.** If /discover must ship before the refresh clears, the
fallback is the fifth item as a fifth diamond in the current chrome — a throwaway frame this package
does not contain, and one that will be redrawn the week the refresh lands.

The rest of this package is independent of that decision: the rows, both racks, the sheet and all six
states use only shipped tokens and the sheet geometry from `collection_filter`.

## Gap report

1. **The spec is not in this project.** The nine locked decisions are honoured as the brief states
   them; anything else in `2026-09-07-commanders-two-lanes-design.md` is unverified. Diff the four
   calls first — they are the ones written to fill silence.
2. **`filter-bar.tsx`, `facet-strip.tsx` and `discovery-row.tsx` were not readable.** Row anatomy and
   the pip row are traced from the handoff canvases. External geometry is preserved as drawn there,
   which should be the sufficient condition, but it is an assumption.
3. **Greying reverses a shipped ruling.** `commanders_plane` made the join mode *absent* with no pips
   lit and gave reasons; locked decision 4 overrides it. If the spec's decision 4 was about
   *availability* rather than *every* control, call 1 needs rewriting and the modifier goes back to
   conditional.
4. **The novelty count's exact wording is a guess.** `172 of its top cards new to you` is drawn
   against the figure discovery already computes; if the shipped label differs, take the shipped one.
   (`N decks tracked` is confirmed.)
5. **The row figures are transcribed from a screenshot, not from `discovery-row.tsx`.** Labels,
   targets and the delta wording (`↓10 from 71`) match what was shown; the exact token per figure,
   the delta's colour rule (drawn neutral) and whether the split bar's three segments are additive or
   overlapping are unverified.
5. **Resolved at R2 — discover's third order option should be `Recently released`.** Both menus are
   drawn in **I2**. Colour ordering does work the pips already do and does it worse: you cannot ask
   for "Black then Red" without lighting those pips, at which point the order is a grouping of a set
   you have already narrowed. `Recently released` (`released_at`, confirmed in the schema) answers
   the one question nothing else on the lane can — *what is new that I don't own?* — and it pairs
   with the lane's definition, since recency is the strongest predictor of "don't own it **yet**"
   changing. Three options either way, single-select either way: a copy-and-query change, not a
   layout one. The copy file carries both keys; delete `colour` when this is signed off.
6. **The 320px tier is drawn, not tested.** The 8.5px label clears at 4.9px per side by measurement;
   it has not been seen on a device, and the smallest supported width is not recorded anywhere in
   this project.
7. **Nothing here decides what happens when a discover commander becomes owned.** The row should
   leave the lane on the next collection read; no transition, receipt or explanation is drawn, and a
   row vanishing without a word is the most likely post-launch complaint.
8. **Accent now carries two meanings on this surface.** The synergy fill and the split bar are
   measurement; every other accent is *in use / to buy* or *this filter is on*. That is how the
   graphs ship and the review asked for it, but it is the one ambiguity in the refresh's
   colour rule and it should be recorded rather than discovered.
9. **The owned lane's "haven't built" rule is taken literally.** A commander you own *and* have built
   appears on neither lane. That is what the brief says; it is also a hole a player can fall into
   ("where did Krenko go?"), and it is not solved here.
