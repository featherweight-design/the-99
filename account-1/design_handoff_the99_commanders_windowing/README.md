# The 99 — Commanders · list windowing (design handoff addendum)

Issue **#52**. A light addendum to the **shipped** Commanders surface: progressive disclosure for a
ranked recommendation list that can run ~200 cards long on a large collection. One control, its
states, and the layout impact around it. Nothing on the shipped surface is redesigned.

File: `The 99 - Commanders · Windowing.dc.html` (canvas — pan/zoom). Each state leads with the
phone, desktop beside it. Read
`design_handoff_the99_commanders/README.md` first — this document only records what is **added**.

**Locked decision honoured:** the list stays a **single ranked sequence**. No filtering by rank, no
jump-to-page, no page numbers, no "results per page". The only new affordance appends more of the
same sequence.

## States delivered
- **The control** — anatomy plus rest / hover / focus-visible / working / exhausted, desktop and
  mobile forms, and the keyboard + announcement spec.
- **1 · Default** — first batch shown, remainder hidden (214 generals from an 11,204-card collection).
- **1b · Default, color filter active** — the shipped filter count and the new window count side by
  side, desktop and mobile, at final copy.
- **2 · Mid-list** — after one reveal; control still offered, plus a **join inset** showing the
  batch boundary, the focus ring on the first revealed card, and the live-region text.
- **3 · Exhausted** — all 214 shown, control removed, end-of-ranking rule in its place.
- **4 · Short list** — the shipped 24-general case, where the control never appears at all.

Frames are drawn **scrolled to the end of the list**, because that is where the control lives; the
cards above are the shipped recommendation card, unchanged.

---

## Decisions log

### 1. Pattern → **Collection's "Show more", not a second invention**
`src/components/collection/browser.tsx:23` already ships batch-plus-reveal, so this surface adopts
it rather than introducing infinite scroll or a "load next 25" pager. Infinite scroll was rejected
on two counts: it makes the **end of the ranking unreachable as a fact** (a skeptic wants to know
the list *ended*, not that it stopped loading), and it steals the scroll position that Commanders
needs for back-navigation from `/commanders/:slug`. A deliberate click also matches the surface's
posture — the ranking is an argument you read down, not a feed.

### 2. Batch size → **25**
Two constraints met at once. 25 cards is roughly one-and-a-bit screens of scroll on mobile, so the
first reveal feels like *more of the same list* rather than a page turn. And **25 > 24**, the
general count the shipped surface produces from the reference 1,418-card collection — so the single
beta user's current data never sees the control, and the addendum is invisible until a collection is
actually large. Collection's `PAGE_SIZE = 200` is not reused verbatim: a card row there is ~40px, a
recommendation card is 120–150px, so 200 would be ~25,000px of list. Production constant:
`REVEAL_STEP = 25`.

### 3. Affordance → **the list's last row, not a page footer**
The control takes the recommendation card's own fill (`#1E1A15`), border (`1px #3A3229`) and sits in
the same `12px` card gap, full width of the list column, radius `8px` per the button token. It reads
as *the next thing in the sequence*, which is exactly what it produces. **A brass fill is deliberately
withheld.** `#C9A24B` is used on this surface both for the one primary action (*Build this deck*) and
for lightweight accents — the `Clear` link, the active-pip ring, focus rings — and a brass-*filled*
row would outweigh all of them; the reveal is a reading convenience, not the surface's most important
act. The chevron `↓` is the only directional cue:
it points down the ranking, and it turns brass on hover so the control still feels alive.

### 4. Placement → **in flow, at the end. Never sticky, never floating.**
A sticky or floating reveal was considered for mobile and rejected: it would sit on top of the
bottom tab bar's territory, and — worse — it would be visible while the reader is at rank 4, implying
there is something to do other than keep reading. The control appears only when you have reached the
bottom of what you asked for. Mobile: full-bleed in the list's `14px` padding, `52px` min height,
`24px` clearance above the tabs.

### 5. Remaining count → **wording that can't collide with the shipped filter count**
`/commanders` already renders `Showing {filtered} of {total}` in the desktop filter bar (and the
`N of 24` figure in the mobile pip row). That string belongs to the **color filter** and keeps it
verbatim — this addendum does not touch it. The **window** count therefore never uses
"showing … of …":

| Figure | Copy | Means |
|---|---|---|
| Filter count *(shipped, unchanged)* | `Showing 96 of 214` | candidates matching the active colors |
| Window count *(new, header)* | `25 shown · 71 more below` | how much of the current result set is rendered |
| Window count *(new, control)* | `Show 25 more` + `71 remaining` | what one more click gets you |

Different verb, different shape, no shared denominator. The header window count carries **no total at
all**, which is what makes the two unmistakable side by side — the total lives in the filter count,
where a total is meaningful. It also reads as a running position in a sequence rather than an index:
`page 1 of 4` would be the navigable-index statement the locked decision forbids. Both new figures
count against the **filtered** length when a filter is active (`71 = 96 − 25`). Drawn at final copy,
both figures present, in **state 1b**. The header window count is omitted when nothing is hidden
(short list) and becomes `all 214 shown` when exhausted.

### 6. No batch seams
No divider, no "batch 2 · ranks 26–50" label, no animation sweeping the new cards in. The **rank
numerals already carry position**, and a drawn seam is a page boundary by another name — it invites
"take me to batch 4". The new cards simply extend the stack.

### 7. Exhausted → **the control is removed, and the ranking is declared finished**
A disabled button invites clicking and reads as breakage. In its place: a hairline rule with two
`#3A3229` diamonds and `END OF RANKING · 214 OF 214` in 10.5px Plex Mono `#8E8269` — the shell's
diamond vocabulary, at whisper volume. This is the one moment of typographic flavor allowed this far
down; per the brand rule the data UI stays quiet, so there is no Cinzel line and no seal here.

### 8. Reveal is instant, and stated as such
The reveal is a client-side slice of an array already in memory — no request, no dependency, no
skeleton. A `Revealing…` label is specced only so an engineer has one if a future server-paged API
lands; today it should never be visible for more than a frame. Scroll position is untouched: the
page grows beneath the reader.

### 9. Accessibility
- Native `<button>` — the last tab stop after the final card's *View breakdown* link. No custom
  roles, no `tabindex` juggling.
- Accessible name carries the count: **"Show 25 more commanders, 189 remaining"**, so a screen-reader
  user gets the same "is it worth it" information the sighted label gives.
- On activation, **focus moves to the first revealed card** (`ranks 26`, container gets
  `tabindex="-1"`), so the keyboard user lands inside the new material rather than at the top or on a
  button that has moved down 3,000px.
- An `aria-live="polite"` region announces **"Showing 50 of 214 commanders. Ranks 26 to 50 added."**
- Focus ring: `2px #C9A24B` at `2px` offset (brass is allowed as *focus*, per the brand token).
- Contrast: label `#EDE6D8` on `#1E1A15` ≈ 11.6:1; the mono count `#8E8269` on `#1E1A15` ≈ 4.6:1 —
  AA for its 11.5px size only because it is supplementary to the label; the label alone conveys the
  action.

### 10. Mobile / desktop parity
All four states exist on both. The desktop frames for states 2–4 omit the nav rail (unchanged from
the shell) to keep the control at readable scale; state 1 shows the complete frame including rail
as the alignment reference.

---

## Component notes (token references)

| Component | Spec |
|---|---|
| **Reveal control (desktop)** | full width of list column, in the stack's `12px` gap. `bg surface #1E1A15`, `1px line #3A3229`, radius `8px`, padding `15px 20px`. Label Plex Sans 600/14 `#EDE6D8`; count Plex Mono 11.5 `#8E8269`; chevron `↓` `#8E8269`. |
| **— hover** | `bg #211C15`, `border #4A4033`, count → `#A89B84`, chevron → accent `#C9A24B`. Same hover pair as the recommendation card. |
| **— focus-visible** | `outline 2px #C9A24B`, `outline-offset 2px`. Hover treatment applied alongside. |
| **— working** | `bg #1B1711`, label `#8E8269` "Revealing…", count `#6E6353`, `cursor:default`. Should not be perceptible client-side. |
| **Reveal control (mobile)** | full-bleed in list padding, two-line stack (label + count), `min-height 52px`, `24px` above the tab bar. Label 14.5px so it holds AA at tap scale. |
| **End-of-ranking rule** | `1px #2A241D` hairlines either side, two `6px #3A3229` diamonds, `END OF RANKING · N OF N` Plex Mono 10.5px `#8E8269`, letter-spacing `0.16em`. `16px` above the last card. |
| **Header window count** | Plex Mono 11px `#8E8269`, live figures in `#C6B79A`: `25 shown · 189 more below`, on its own line under `Ranked for your collection`, ahead of `Order: Fit ↓ · fixed`. Mobile: own row under the color filter, 10.5px. Never the string "showing … of …" — that belongs to the filter count. |
| **Top fade (mockup only)** | `linear-gradient` to transparent at the top of each frame — a drawing device indicating a scrolled viewport, **not** a component to build. |
| **Live region** | visually hidden, `aria-live="polite"`, `aria-atomic="true"`; text `Showing {shown} of {total} commanders. Ranks {from} to {to} added.` |

## Notes for engineering
- **`commanders-view.tsx`** gains one state value, `shown`, initialised to `REVEAL_STEP`, a
  `.slice(0, shown)` on the already-sorted array, and the control after the map. Mirror Collection's
  naming so the two surfaces read as one pattern.
- **`rec-card.tsx` is untouched.** It only needs a forwarded ref if focus-on-reveal is implemented on
  the card rather than by querying the list container for the nth child.
- **Filter interaction:** changing the WUBRG color filter **resets `shown` to `REVEAL_STEP`** and
  recomputes remaining against the *filtered* length. The reveal window is a property of the current
  result set, not of the session. The filter's own `Showing N of M` count stays exactly as shipped;
  the window count is the new `{shown} shown · {filtered − shown} more below` string (decision 5).
  Both are drawn together in state 1b at final copy — no copy decision is left to implementation.
- **Ranks are global Fit ranks and do not renumber under a filter** (state 1b skips rank 25). Existing
  behaviour, restated because the window count's denominator is the filtered length while the rank
  numerals are not.
- **Sort is still fixed.** Windowing adds no ordering control and must not enable one.
- **Degraded states unaffected** — the global EDHREC banner and per-commander notes live inside
  cards; windowing only decides how many cards render.
- **Empty states never render the control** — no-candidates and filtered-to-zero have zero remaining.
- **Theme-aware values** (`surface`, `elevated`, `line`, text ramp, `accent`) come from
  `src/app/globals.css` `var(--*)` tokens; the hexes above are the standalone Palette A values for
  theme-independent reference only. No new token is introduced.
- **No new dependencies.** No virtualisation library: 214 cards at one batch of 25 never mounts
  enough DOM to need it. Revisit only if a real collection produces >400 generals.
- Mock data: commander and card names are real Oracle cards; counts, Fit scores and the 214/11,204
  figures are fabricated to exercise the long-list case.

## Resolved after the R1 audit
- **The two counts** (was gap #5) — decision 5 specs distinct copy for both figures; state 1b draws
  them together on desktop at final copy.
- **Back-navigation from `/commanders/:slug`** (was gaps #1 and #2) — settled by decision 1: adopting
  Collection's pattern means `shown` is plain state that resets on remount, exactly as Collection
  behaves today. **The window resets on return**; restoring it would be a new pattern and is filed
  separately.
- **Brass usage** — decision 3's reasoning corrected (the surface already uses `#C9A24B` for the
  `Clear` link and the active-pip ring). Conclusion unchanged: no brass fill on the control.

## Gap report
Things this addendum deliberately does **not** answer, for the audit:
1. **First-run interaction.** The guided-flow banner state (step 2) is drawn with a short list in the
   shipped surface; whether a first upload can even produce >25 generals is a data question. If it
   can, confirm the control below the banner doesn't read as "finish setup".
2. **Reduced-motion.** Nothing animates today, so there is no `prefers-reduced-motion` branch. If
   engineering adds a fade-in on new cards, it needs one.
3. **Batch size is a guess calibrated to layout, not behaviour.** 25 should be revisited once beta
   telemetry shows how far down the ranking anyone actually reads.

## Files
- `The 99 - Commanders · Windowing.dc.html` — the canvas (this addendum's deliverable).
- `brand/` — the locked brand sheet + brand README, copied in for self-containment.
- `support.js` — runtime for the HTML references; not production code.
