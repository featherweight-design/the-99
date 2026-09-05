# The 99 — Commander discovery: one ranked list, two sorts (design handoff, R1)

**Track 2, stage 1.** Source of truth:
`docs/superpowers/design-briefs/2026-09-05-commander-discovery.md` (verified against
`origin/main` at `1a41942`). Structural sibling:
`design/design_handoff_the99_synergy_discovery/` — most recent Green-at-R1 handoff, and it
extends the same page. Also read `design/design_handoff_the99_commanders/` for the page,
`design/design_handoff_the99_commanders_windowing/` for the long-list furniture, and
`design/design_handoff_the99_availability/` for the two controls discovery sits beside.

File: `The 99 - Commander Discovery.dc.html` (canvas — pan/zoom). Read
`design_handoff_the99_richness/README.md` for the locked voice before auditing copy,
`CONTROLS-four-above-one-list.md` for the §7.2 composition in full, and
`STATES-price-and-empties.md` for the §7.4 matrix and the three empty states.

**The one-line summary:** *one slot changes inside the row, and the accent follows the sort key.*
Scope swaps the candidate universe from the page header; sort replaces the inert
`Order: Fit ↓ · fixed` label in the filter bar. `RecCard` keeps its grid, its stretched link and
its ending — what changes is the justification line and what the right-hand column prints.

**Not gated.** §0's index is populated (3,342 commanders, 3,226 tagged, ≈260 support cards each).
Price and stock are #288, in flight, and the row is drawn complete without them. Readiness may
treat this as ready-to-build.

---

## The seven §7 calls

| # | Call | Answer |
|---|---|---|
| 7.1 | How a row justifies its rank | **One slot, and the accent follows the sort key.** Overlap sentence with its denominator under Best fit; the archetypes, named, under Something new. Same y, same height, never both. |
| 7.2 | Where scope and sort live | **Two tiers.** Scope in the page header (it names the list); sort in the filter bar, in the slot the inert `Order` label already holds. Nothing shipped moves. |
| 7.3 | Owned vs. unowned on a row | **The rank pip, plus a word.** #43's 6px diamond — filled = in your collection, hollow = not — and a named clause on the receipt line. Never the `buy` tag. |
| 7.4 | Price and stock | **Last line of the fit column**, mono, `--fg-body`, no bar, no brass, colour never keyed to magnitude. Absent, the slot and its hairline **do not render**. |
| 7.5 | Distance, expressed | **A per-row line naming the tags**, which names one of your decks when there is one to name. No tag filter (#159). |
| 7.6 | The two empty sentences | No-decks disables the **sort option** with its reason plus a first-run banner (ruling 8); the floor excluding everything is a **list-level** state offering Best fit, never a looser floor. |
| 7.7 | 3,342 rows | **Step stays 25**, every figure locale-formatted, one dimmer line on the reveal naming the rank band. No search, no jump, no page numbers. |

## States delivered

| # | Frame | Desktop | Phone |
|---|---|---|---|
| A1 | Row under **Best fit** — unowned, price present | ✓ | ✓ |
| A2 | Row under **Something new** — owned, price suppressed | ✓ | ✓ |
| A3 | The price slot's four states | ✓ | — (same rule, below a hairline) |
| B1 | Four controls: header scope + filter bar | ✓ | ✓ (four stacked rows) |
| B2 | The sort menu open, with ruling 8's disabled option | ✓ | — (same menu) |
| C1 | The list at rest — five rows mixing owned, unowned, not-stocked, three-figure price, untagged | ✓ | — (row drawn in A) |
| D1 | Empty state 1 — no decks yet | ✓ | — (banner reflows) |
| D2 | Empty state 2 — the floor excludes everything | ✓ | — |
| D3 | Empty state 3 — filtered to zero inside discovery | ✓ | — |
| E1 | Windowing at 3,342 — count line, reveal, end-of-ranking | ✓ | ✓ (count row in B1) |
| E2 | Token / a11y / motion contract | ✓ | ✓ |

---

## Decisions log

### 1. §7.1 — one justification slot, and **the accent marks the sort key and nothing else**
This is the call the brief says decides whether the surface works, so it gets one rule rather
than a layout.

The two justifications the brief names — *"you own 104 of the 258 cards EDHREC associates with
this commander"* and *"you have never built anything with these tags"* — are the same kind of
statement about different data: **the sort key, in a sentence.** So they occupy the same slot,
the one the shipped Synergy line already holds, at the same y and the same 13px leading. Flipping
the sort does not reflow the list; it rewrites one line per row.

**Three shapes were rejected.**

- **Both justifications on every row.** It is honest and it is unreadable: two evidence lines per
  row at 3,100 rows, one of which is never the reason this row is here. It also implies a blend,
  which ruling 3 locked out.
- **A badge naming the sort** (`FIT` / `NEW`) beside the figure. The label is not the problem —
  the *reason* is. A badge says which list you are in, which the header already says twice.
- **Two lists side by side.** Ruling 1 deleted that at the scope level for the same reason it
  fails here.

**The accent rule is what keeps one list from reading as two.** Brass marks the sort key: under
fit it is the overlap bar and the `Support owned` label; under novelty it is the tag names
themselves. Everything else in the row — roles, receipts, ownership, price — stays neutral in both
sorts. A player who scans only the brass is scanning exactly the ranking, in either mode, and the
row never has two things competing to be the reason.

**Under novelty there is no bar.** A count of unplayed tags is not a proportion, and a track drawn
under it would invent a denominator — which is the exact mistake §5 corrects at the other end of
the row.

**The `score /100 FIT` stack does not appear under discovery.** A 0–100 score is what a blend
looks like, and ruling 3 forbids one. The column prints the sort key raw with its denominator:
`127 of 264` / `5 of 5 tags`.

### 2. §5 — **the denominator is printed everywhere the numerator is**
`104` alone invites the 99 the ticket invented. So the figure never appears without its M:
`104 of 258` in the column, *"you own 104 of the 258 cards EDHREC lists for this commander"* in
the sentence, `own 127 of 264 EDHREC lists` at 390px. Three lengths, one claim, and the shortest
still carries both numbers.

The wording is **"lists for"**, not "associates with", at every width: the honest verb, six
characters, and it survives 390px. The word *support* appears only in the column label
(`Support owned`), where it is a noun for the list rather than a claim about it.

### 3. §7.3 — ownership is **the rank pip, and a word**
`RecCard` already draws a decorative 6px diamond under the desktop rank numeral, and #43's
availability marker already draws a 6px rotated diamond, filled for a hard claim and hollow for a
soft one. Merging one list of owned and unowned commanders does not need new vocabulary; it needs
the existing glyph given a job.

- **Filled `--accent` diamond** — the commander is in your collection.
- **Hollow 1.5px `--fg-locked` diamond** — it is not.

The receipt line's first clause says which in words, always: `in your collection, never built` for
owned rows, `not in your collection` for the rest. **Both clauses always render**, so row height
never changes between two rows or two players — the same rule the shipped receipt line already
follows.

**Not the `buy` tag.** The Add panel's `buy` is a verb attached to an action the player is taking;
this is a fact about a row they have not acted on. Reusing it would put a shopping instruction on
3,100 rows.

**Not the availability marker's severity colours.** Those describe *cards in decks*; ownership of
a commander is a different axis, and colouring it `--avail-hard-fg` would make two unrelated facts
share a hue. The one place `--avail-hard-fg` still appears on the row is the shipped
`N already in use` clause, unchanged.

**Owned rows are not sorted, grouped, or boosted.** Ruling 2 makes ownership a signal, and a
signal that changes the order is a term.

### 4. §7.2 — **two tiers: scope names the list, sort orders it**
Four controls above one list is the composition risk in the feature, and the fix is that they are
not four peers.

**Scope goes in the page header, beside the title.** It changes *which commanders exist* on this
page — the same class of change as the title itself. The subtitle under the title restates the
population in words on every flip (`3,100 commanders you have not built · ranked by best fit ·
read against 2,805 cards`), which is how the player knows the list changed without counting rows.

**Sort takes the slot the inert `Order: Fit ↓ · fixed` label already occupies**, right-aligned in
the filter bar. This is the whole trick of the composition: a label that always announced the
order becomes the control that sets it, so the filter bar gains a control without gaining a row.
Under the owned scope it reverts to the shipped label, verbatim.

**Colours and `Score against` do not move**, and nothing about their appearance changes. The
brief's constraint was that scope and sort must not fight the shipped toggle idiom
(`commanders-view.tsx:65-150`); the answer is that only one of them uses that idiom, and the other
is a menu.

**Why scope is a segmented pair and sort is a menu.** Both halves of scope are always available.
Sort has an option that can be unavailable *with a reason* (ruling 8), and a segment cannot carry
a sentence — the shipped disabled `What's free` segment gets by on strikethrough plus an aria
label because its reason lives in a banner. Novelty's reason has nowhere else to live on a
first visit, so it lives in the menu row.

**At 390px the four controls stack in decreasing scope**: population, colours, scoring basis,
order. Scope borrows the shipped mobile `ScoreAgainst` geometry (38px, full-width halves) with
short labels — `I own` / `To play` — and lets the subtitle carry the long form. Sort is a 38px
trigger on the count row it shares with the window count: again, the row that already said
`Fit ↓ · fixed`. **Nothing new becomes sticky** — four pinned controls at 390px would leave a
third of the viewport for the list.

### 5. §7.5 — distance is a **per-row line that names the tags, and can name a deck**
Three shapes were available.

- **A list-level framing** (*"ranked by distance from what you play"*) — true, and it explains the
  list rather than the row. At rank 40 the player wants to know why *this* commander is at 40.
- **A filter over tags** — that is #159, it applies to both scopes, and a filter answers a
  different question than a justification.
- **A per-row line naming the archetypes.** **Chosen.** `treasure · vehicles · sacrifice — and
  two more. Nothing you have built plays these.`

The comparison is against the player's own decks, so it can name them, and it does when the
distance is partial: `blink · flicker — closest is your Brago list, which shares tokens.` Naming
one deck rather than counting them follows the same severity-not-inventory rule the availability
receipt already uses.

**Tag names are the accent under this sort**, per decision 1, and they are the only accent in the
row. Three names then `+N`: three fits 390px, and a fourth name buys nothing a count does not.

### 6. §7.4 — price is **the last line of the column**, and absence is not a dash
Ruling 7 says displayed, never ranked on. Four drawn states:

| State | Drawn |
|---|---|
| Stocked | filled 6px `--success` dot · `$18.40` in `--fg-body` · `manapool` in `--fg-locked` |
| Stocked, three figures | same, figure in `--fg` |
| Not stocked | hollow 1.5px `--fg-locked` dot · `not stocked` in `--fg-faint` |
| Before #288, **or** commander owned | the slot and its hairline do not render |

**Magnitude never changes the colour.** `$219.00` in `--warning` would be the product having an
opinion about the player's money, and a price in a semantic colour is one step from a price that
sorts. The single concession is brightness: at three figures the figure takes `--fg` so a big
number is not *quieter* than a small one.

**Absent means absent.** No em dash, no skeleton, no reserved height. A dash asserts something
about the card; #288 not having landed is a fact about us, and the locked rule is that missing
data is omitted, never zeroed. An owned commander suppresses the slot on the same logic — you are
not buying what you have — which is also why the whole list reads correctly today, before the
ingest, and reads correctly for a player whose candidates are all in the binder.

**Price sits below a hairline** at both widths precisely so it can vanish without leaving a hole.

### 7. §7.6 / ruling 8 — **three empty states, three sentences, three homes**
They are different failures and they must not converge on one apologetic paragraph.

1. **No decks yet.** The machinery is missing. The *sort option* is disabled with its reason
   (`needs a finished deck to compare against — build one and this turns on`) and a first-run
   `GuidedBanner` carries the long form: *Something new needs something old first.* **The list
   underneath is full** — 3,342 candidates by fit, since nothing is built to exclude. Two signals,
   one fact, no third sentence.
2. **The floor excludes everything.** The collection is early, not the machinery. A list-level
   state naming the floor as a percentage, naming the nearest miss so 30% is not arbitrary, and
   offering **the other sort — never a looser floor**. Ruling 4 fixes the constant; a "show me
   anyway" control is the aspirational half returning through the side door.
3. **Filtered to zero inside discovery.** The shipped `FilteredEmpty`, kept, with one clause
   added: under discovery a colour can come up empty *because the player already built those
   decks*, which is the only genuinely new reason this state has. Its second affordance is scope,
   because that is the control holding the missing rows. Under the owned scope it renders as today.

State 2 is drawn from `EndOfRanking`'s hairline-and-diamond furniture rather than a new empty
component; state 1 from `GuidedBanner`'s shape. No new empty state in the product.

### 8. §7.7 — **the step stays 25**, and one line is added
The windowing handoff solved 242; discovery is 3,100 in the same list. Three things were checked
and only one changed.

**The step is a reading unit, not a fraction of the list.** 25 rows is about a screen of decisions
at either width. Raising it to 100 because the list got longer makes each activation a wall and
still leaves 3,000 rows behind it. 134 activations is not the path to the bottom and is not meant
to be — the ranking's whole claim is that the answer is near the top.

**Every figure is locale-formatted.** `WindowCount` and the reveal control's label and aria-label
already are. The filter bar's `Showing {filtered.length} of {active.length}` is **not**, and at
four digits it must be — that is the one shipped string this handoff asks to change.

**One dimmer line on the reveal control**, naming the rank band it is about to add and pointing at
the colour filter: `ranks 26–50 of 3,100 · narrowing by colour is faster than scrolling`. At 242
rows the band was implicit. At 3,100, `Show 25 more` alone reads as an infinite scroller with
extra steps.

**No search, no page numbers, no jump-to-rank.** A jump control advertises that the interesting
rows might be at 2,000, which is the opposite of what a ranking claims. `EndOfRanking` is kept
unchanged and is now what a *narrowed* list ends on.

### 9. Untagged commanders are **noted on the row, not hidden from it**
Ruling 5 puts the 116 untagged commanders under Best fit and absent under Something new. On the
fit list the row carries the shipped **absent** note with one word changed (`No tag data` for
`No synergy data`) and, as shipped, **no Retry** — EDHREC not tagging a commander is a settled
fact, and a button that cannot change anything is worse than a sentence that explains it.

The two sorts therefore report different totals, which is ruling 5 working. Neither count is
labelled as a subset of the other, because the honest framing is that they are two questions.

---

## Component notes

Hexes live only in `globals.css`. **No new token, no new hex, no new motion class, no new empty
state, no new modal, no new component.**

| Component | Spec |
|---|---|
| **Scope control** | Page header, right-aligned, label `Show` mono 10px `--fg-faint` `letter-spacing .12em` uppercase. Segmented: `--surface-sunken` on `1px --border-strong`, radius 8px, 3px pad, segment height 32px (38px phone, `flex:1`), radius 6px, 13px. Selected: `--accent` fill, `--bg` label, 600. Radiogroup, roving tab stop. Labels `Commanders I own` / `Something to play`; phone `I own` / `To play`. |
| **Header subtitle** | Mono 12px `--fg-faint` (10.5px phone). Restates population · ordering · collection size. Rewritten on every scope and sort flip. |
| **Sort trigger** | Filter bar, right of `Score against`, in the `Order` label's slot. Height 30px (38px phone), `--surface-sunken` on `1px --border-strong`, radius 8px, padding `0 12px`, mono 12px `--fg`, caret `▾` in `--accent`. Owned scope: reverts to the shipped `Order: Fit ↓ · fixed` label. |
| **Sort menu** | `--surface-rail` on `1px --border-strong`, radius 10px, 6px pad, width 300px. Option: 11px/12px pad, radius 7px, 6px diamond (filled `--accent` selected, `1.5px --border-strong` otherwise), label 13.5px 600 `--fg`, sub-line mono 10.5px `--fg-faint` naming the sort key. Selected row `--elevated-hover`. |
| **— disabled option** | Label `--fg-locked` + `line-through`, sub-line carries the reason at full `--fg-faint`. `aria-disabled`, not `disabled`. Three signals, matching the shipped disabled `What's free` segment. |
| **Justification slot (fit)** | Row 3 of the evidence column, replacing the Synergy line. Label mono 10px uppercase `--fg-faint`; 110–120×6px track `--elevated` with `--accent` fill; sentence mono 12px `--fg-body`, N and M in `--fg` 600. |
| **Justification slot (novelty)** | Same y. Label `New to you`; sentence 13.5px `--fg-body` with tag names `--accent` 600, `— and N more` when over three, then the deck clause. **No bar.** |
| **Ranking figure (fit)** | Fit column: mono 600 30–34px `--fg` + `of {M}` mono 13px `--fg-faint`; label `Support owned` mono 10px `--accent` uppercase `letter-spacing .16em`; full-width 6px track beneath. |
| **Ranking figure (novelty)** | Same geometry, `{N} of {M} tags`, label `Unplayed tags`, then the floor line: mono 11.5px `--fg-faint`, percentage in `--fg-body`. No track. |
| **Ownership pip** | Rank column, under the numeral (phone: between numeral and name). 6px, `rotate(45deg)`. Owned: `--accent` fill. Unowned: `1.5px --fg-locked`, transparent. Replaces the decorative `--border-strong` diamond; `aria-hidden`. |
| **Ownership clause** | First clause of the shipped receipt line. `in your collection, never built` in `--avail-hard-fg`; `not in your collection` in `--fg-faint`. Always rendered, both scopes' discovery rows. |
| **Price slot** | Below a `1px --border` hairline at the column's foot. 6px dot (`--success` filled / `1.5px --fg-locked` hollow), figure mono 12.5px `--fg-body` (`--fg` at three figures), provenance `manapool` mono 10px `--fg-locked` right. Unmounts entirely when absent or owned. |
| **Untagged note** | Shipped **absent** variant: `--elevated-hover`, `1px --border-strong`, `border-left 2px --fg-faint`, radius 7px, `⚠` 13px `--fg-faint`, body 12.5px `--fg-muted`. Heading `No tag data`. No Retry. |
| **Empty · no decks** | `GuidedBanner` shape: `--surface` on `1px --border`, `border-left 3px --accent`, radius 10px, 16/18px pad. Heading Cinzel 600 16px; body 13.5px `--fg-body`. |
| **Empty · floor** | Centred, `EndOfRanking` hairline + 6px diamond above; heading Cinzel 600 18px; body 13.5px `--fg-body` max 430px; ghost CTA 40px `1px --accent` label `--accent` 600; mono 11.5px `--fg-faint` aside. |
| **Empty · filtered** | Shipped `FilteredEmpty` + one clause naming the built decks, and a second affordance pointing at scope. |
| **Reveal control** | Shipped geometry unchanged, plus one line: mono 10.5px `--fg-locked`, rank band + filter hint. |
| **Count line** | Shipped `WindowCount`. `Showing N of M` gains `toLocaleString`. |

## Notes for engineering

- **`CommandersView` gains two pieces of state, both URL-mirrored** through the existing
  `history.replaceState` effect: `?scope=play` and `?sort=new`. Only non-defaults are written, so
  today's URL is unchanged for a player who touches neither — the same rule `?avail=all` follows.
- **Scope changes the candidate set server-side.** The owned scope is today's `results` (242).
  Discovery is `commander_support` minus the commanders with decks, which is 3,100 rows and cannot
  be shipped as two full arrays the way `results` / `freeItems` are. Design's expectation: the
  discovery list is fetched for the active sort only, and a sort flip is allowed to be a fetch —
  which is why the sort control is a menu, and why neither flip animates.
- **A scope or sort flip resets `shown` to `REVEAL_STEP`**, exactly as `setAvail` does today. Both
  reasons apply: different commanders occupy the revealed range, and the window belongs to the
  result set rather than the session.
- **`rankMap` is built per (scope, sort) pair over the FULL candidate set**, pre-filter, so
  filtering still leaves gaps rather than renumbering. Four maps exist in principle; only the
  active one need be materialised.
- **The novelty floor and the tag distance are computed server-side.** `≥30% of edhrec_total`
  owned, then order by unplayed-tag count. Untagged commanders are excluded by the presence of
  `tags`, not by a zero — a zero-distance commander and an untagged one are different rows.
- **The deck clause needs the player's own tag set**, aggregated once per request over the
  commanders their finished decks are built around, plus the nearest-deck name for the partial
  case. One query, not one per row.
- **`RecCard` takes a `sort` prop, not two components.** The row is one component with one
  branching slot; forking it into `FitCard` / `NoveltyCard` duplicates the grid, the link, the
  chips and the receipt line, and guarantees they drift.
- **`ScoreDelta` does not apply under discovery.** The delta compares a commander to its own other
  score under `Score against`; it is orthogonal to scope and sort and is passed through unchanged.
  It is null under discovery's first release because the free re-rank is not computed over 3,100
  candidates — flagged in the gap report.
- **`edhrec_total` is the denominator and must be non-null wherever N is printed.** §0 says 3,341
  of 3,342 carry a `similar_oracle_ids` list; a row with N and no M prints neither figure and
  falls back to the receipt line alone rather than inventing 99.
- **Price is read from #288's table by oracle id, left-joined**, and `null` means the slot does not
  render. No placeholder row, no zero, no "—". Stock is a boolean; a stocked-but-priceless row is
  treated as absent.
- **Price never enters an `ORDER BY`.** Ruling 7, and worth restating next to the join.
- **One live region, three messages**, on the region the page already owns: scope announces the new
  population and ordering, sort announces the re-rank, the reveal keeps its shipped range message.
  Debounced to one per settle.
- **`Showing {filtered.length} of {active.length}` gains `toLocaleString`** — the one shipped
  string this handoff changes.
- **Copy** lives in `src/lib/copy/` — see `commander-discovery · copy strings.ts`. It adds a
  `discoveryCopy` block and **edits nothing** in `availability.ts`; the receipt line's clauses,
  the degraded strings and the `Score against` labels are all reused by reference.

## Gap report

1. **`What's free` × discovery is not computed.** The free re-rank exists today because both
   rankings arrive in one render over 242 commanders. Over 3,100 that is a second full scoring
   pass, and this handoff draws the control as available under discovery without specifying it.
   Either it re-ranks (a fetch), or it is disabled under discovery with a reason — **a ruling, not
   a redraw**, and the audit will find it.
2. **The score delta disappears under discovery**, per the note above. A player who flips
   `Score against` on the discovery list gets a re-rank with no `↓N from M` annotation. Consistent
   with item 1 and dependent on how it is settled.
3. **The floor's 30% is invisible on a passing row.** Ruling 4 makes the floor proportional and the
   novelty row states the percentage — but nothing on the *fit* list tells a player why a
   commander they just saw is missing from the other sort. Ruling 5 says the differing counts are
   not a defect; the reason is still unavailable per row.
4. **`≈260` is an average, and the row prints the real M.** Nothing here breaks at M = 40 or
   M = 600, but the sentence *"you own 12 of the 40 cards EDHREC lists"* ranks near the bottom
   while reading like a strong claim. The floor's proportionality is what saves the novelty sort
   from this; the fit sort has no equivalent guard, and a short support list is a cheap way to look
   well-supported.
5. **Tag distance is a count, not a distance.** Design draws "unplayed tags, N of M" because it is
   nameable in a row, per ruling 3's one-sort-key-one-cutoff. A genuine distance metric (weighted
   by tag `count`, or by how central the tag is to the commander) would rank differently and is not
   specified here. If engineering implements a weighted score, **the row's figure stops matching
   the ranking** and this needs redrawing.
6. **Two decks sharing an archetype are counted once**, so a player with eight aristocrats decks
   and one Brago deck sees `blink` treated exactly as `sacrifice`. That is intended — you have
   played it or you have not — but it means the sort cannot express "you play this a little".
7. **Price staleness has no treatment.** #288's ingest cadence is unknown to this brief, and the
   row prints a figure with no as-of. If the ingest can lag by days, the slot needs a word and
   this handoff does not draw one.
8. **3,100 rows of role chips and receipts is a lot of server-side preformatting.** The receipts
   preview and `colorPoolSize` are computed per row today for 242. Nothing in this handoff reduces
   the per-row payload, and the windowed client only renders 25 of them — worth a look before the
   first discovery request goes out.
9. **No way back to a commander you scrolled past.** With no search, no jump and no persistence,
   a player who reveals to rank 200, navigates into a detail page and comes back lands at 25 again.
   The shipped windowing has the same property at 242, where it costs one activation; at 3,100 it
   costs eight. Deliberate — but this is the most likely first support ticket.

## Files
- `The 99 - Commander Discovery.dc.html` — the canvas (this handoff's deliverable).
- `README.md` — this file.
- `CONTROLS-four-above-one-list.md` — the §7.2 composition, both widths, with the rejected shapes.
- `STATES-price-and-empties.md` — the §7.4 price matrix and the three empty states in full.
- `commander-discovery · copy strings.ts` — the copy block, production-final.
- `READINESS.md` — self-assessed readiness and what blocks a green.
- `brand/` — the locked brand sheet + brand README, copied in for self-containment.
- `support.js` — runtime for the HTML reference; not production code.
