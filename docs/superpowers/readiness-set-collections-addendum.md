# READINESS — Set collections addendum (R2)

**Verdict: 🟢 Green.** Build may start, in four PRs.

- **Handoff:** `design/design_handoff_the99_set_collections/ADDENDUM-*` (R2, 2026-09-12)
- **Amends:** the R3 handoff and `docs/superpowers/readiness-set-collections.md`
- **Audited:** 2026-09-12
- **Design self-assessment:** 🟢 Green, one decision to confirm. Concur.

Five findings from Hugh's first real use of the shipped surface. Four are Design-owned and
are what this verdict covers; the fifth — the card modal opening the wrong printing — was
an engineering defect and shipped separately as PR #543.

## What was checked, and against what

Every load-bearing claim was checked against the tree, not against the document.

| Claim | Source | Result |
|---|---|---|
| The shipped unlit pip is a dimmed token, measuring 1.38:1 | `collection/color-pip.tsx:28` | **True** — `opacity-40` |
| The chassis rules pips as undimmed full-colour symbols | `ui/colour-pips.tsx:21-23` | **True, and already built.** Its own comment: "never masked, tinted or given an opacity … an opacity is what the shipped controls did wrong" |
| The symbol assets exist | `public/mana/` | **True** — `W U B R G .svg` |
| `filter-panel.tsx` mounts with `searchable={false}` | `ui/filter-panel.tsx:6` | **True**, and that is its documented rule |
| `rarity.all` and `rarity.value(r)` already ship, unused | `copy/set-collections.ts:15-16` | **Exact** |
| The shipped row lays 8 cells in 998px | arithmetic | **Exact** — 8×116 + 7×10 |
| The chassis pip's API suits a second mount | `ui/colour-pips.tsx:44` | **True** — `{ value, onToggle, form }`, and `form` carries the 22/44px split |

The pip finding is the strongest item in the package: the only one that closes a *measured*
accessibility failure rather than a consistency gap, and the component that closes it is
already on main.

## Erratum — the density is ruled twice, differently

§27's heading and the readiness table both rule **one constant, `minmax(146px, 1fr)`**.
§27's own body says:

> **F = 116 at `md` and up, 160 below it.** That is the only number that changes between widths.

Those are different pages. Against a 1112px content width, `minmax(146px, 1fr)` gives seven
tracks of ~150px; `minmax(116px, 1fr)` gives eight of ~130px.

**Resolved as stale R1 text, not escalated**, because the document answers it twice the
other way: the heading, the readiness table ("one declaration and one constant (146)"), and
§27's closing rationale — *"R2 could delete R1's phone exception: 146 is inside it, so the
desktop constant produces the phone answer for free and the two widths stop being two
rules."* The 116/160 sentence is the rule R2 deleted. **Design to ratify; no round-trip.**

**The build takes 146.**

## The pip floor is 7.77:1, and the addendum's open item 2 is already closed

§28 quotes **9.51:1** for the symbols themselves and files B, R and G's colours as
*"assumed, not quoted … must be confirmed on first fetch"*. Both are pre-fetch figures. The
fetch has happened: `public/mana/` is committed, and its files carry `B #CAC5C0`,
`R #E49977`, `G #A3C095` — exactly the values `design_handoff_the99_filter_chassis`'s own
three files already correct to, where the same line reads *"The Scryfall pip floor is
**7.77:1**, not 9.51:1, because three assumed colours were replaced by their real ones."*

So the addendum's open item 2 is closed, not open, and the figure the build should quote is
7.77:1. **Neither moves the verdict**: 7.77:1 clears the 3:1 non-text floor with 4.77 points
of headroom, and the ruling was never sensitive to which side of 9 the number landed on. But
the contract should not overstate its own margin, and a reader comparing this package against
the chassis package should not find two floors for one asset.

## Two smaller errata, neither touching a ruling

- The content width is **1112px**, not 1100: `max-w-[1180px]` less `px-[34px]` either side.
  The column count is seven either way, so no ruling moves.
- The addendum says nothing in it touches the card modal. True of its own rulings, but the
  modal changed underneath it on the same day (#543), which is why finding 5 is absent from
  the plan below.
- `ADDENDUM-READINESS.md`'s "if the page length is too much, the lever is the constant —
  116 → 8 columns, 160 → 6" reads, out of context, as two live alternatives to the one
  constant. It is a sensitivity note about a lever, not a second density rule. **The build
  takes 146 and nothing else**; see the erratum above.
- `ADDENDUM-STATES` puts the one-column threshold at "below ~330px of content". Two
  `minmax(146px, 1fr)` tracks and a 10px gap need 302px, so the threshold in *content* is
  ~302px — about 334px of viewport once the page's padding is taken off, which is what the
  figure describes. A probe asserting it must measure the viewport, not the content box.

## The upscale bound is wrong, and the named remedy would not reach it

Open item 1 states *"the worst upscale in the system is 1.21×, at 736px of content, and
1.19× on a phone"*, and offers, if review finds the cell soft, *"a larger source **for the
two-column grid only**"*.

1.21× is one sampled width, not a bound. With `minmax(146px, 1fr)` and a 10px gap, the
worst track at each column count sits **just below** the next count's threshold, and the
upscale climbs as the count falls:

| content width | tracks | track | upscale |
|---|---|---|---|
| 1237 | 7 | 168.1 | 1.15× |
| 1081 | 6 | 171.8 | 1.18× |
| 925 | 5 | 177.0 | **1.21×** ← the quoted figure |
| 769 | 4 | 184.8 | 1.27× |
| **613** | **3** | **197.7** | **1.35×** |
| 457 | 2 | 223.5 | 1.53× |

613px of content is a ~681px window — narrower than an iPad in portrait, reachable by
resizing. **So the worst reachable upscale is ~1.35×, not 1.21×, and it lands on the
three-column grid**, which the named remedy explicitly does not cover.

**This does not move the verdict**, because open item 1 is conditional: nothing is done
unless review finds the cell soft. But the bound it is reasoned from is wrong by a third,
and the remedy is scoped to the wrong grid. **Design to ratify**; no round-trip, because
there is nothing to build either way today.

## The figures derived from a 1100px content box

The addendum derives its columns from 1100px. The route's shell is `max-w-[1180px]` less
`px-[34px]` either side, so at the max width the content is **1112px** and the measured
tracks are **7 × 150.28px**, not 7 × 149.

Below the max width the content follows the viewport, so the count is not seven throughout
the range §27 quotes. Piecewise, with `content = min(1112, viewport − 68)`:

| viewport | content | tracks | track |
|---|---|---|---|
| 1024 | 956 | 6 | 151.0 |
| 1100 | 1032 | 6 | 163.7 |
| 1149 | 1081 | 6 | 171.8 ← widest before the seventh fits |
| 1150 | 1082 | 7 | 146.0 |
| 1180+ | 1112 | 7 | 150.3 |

So across 1024–1440 the track runs **146–172px**, not §27's 124–129 and not a flat
150–151. No ruling moves — the count is a consequence of the declaration at every width,
which is the point of there being one — but a probe or a comment quoting the canvas
arithmetic is quoting a number the route never produces, and "seven columns" is a statement
about the max width rather than about the range.

## What was NOT done, and why

`ADDENDUM-README.md` §27 still contains the stale `F = 116 … 160` line, and
`ADDENDUM-READINESS.md` still offers `116 → 8 columns, 160 → 6` and claims "one open item"
above a list of four. **Design handoffs are reference material and are not edited by
engineering** — the R3 files were locked and unedited on the first round for the same
reason, and the addendum itself names that precedent. Every contradiction is resolved here
instead, and this document is what the plan's global constraints are written from.

## Three things the rarity panel cannot do unforked, and what was done instead

§28's named dependency is *"mounts `filter-panel.tsx` … If this page lands first it must not
fork either"*, and that constraint decides all three. In each case the panel's own behaviour
is taken and the drawing is what gives.

**The marker.** §28 draws "a rotated diamond filled `--accent` when on". The panel draws a
square-and-tick under multi-select and a round dot under single. A marker shape is exactly
the kind of detail a fork would re-derive by hand; it is the chassis package's to change, in
one place, for four routes.

**The footer.** §28 draws `n of 4 on` beside a `Clear rarity`. The panel's `single` mode
drops the desktop footer, and `single` is the mode this control needs — `multi` exposes
`aria-multiselectable="true"` and promises a second value the caller then silently discards.
**A correct promise to a screen reader outranks a duplicated one to a mouse**, and the chip
line carries the same removal one row down. Build took `single`.

**Opening on the current value.** ADDENDUM-STATES §4 says *"Opening lands focus on the
current value, not the first row."* The panel's non-searchable open path calls
`openPanel(false)`, which leaves `activeCode` null. Unmet, and not forked around. It is a
one-line change in the shared panel and belongs in the chassis package, where four routes
get it.

None of the three blocks the build, and all three are the same trade the addendum itself
chose when it named the mount as the dependency. **Design to ratify.**

## What review changed in the implementation

Two findings that arrived through this PR were behaviour, not documentation, and are fixed
in PRs 3 and 4 rather than carried:

- The rarity panel announced itself as multi-selectable (above).
- The result line chose its wording from the badge's count, which deliberately excludes the
  query — so a query-only search stated the whole set's figures over a grid showing four.
  **The badge counts controls hidden behind the sheet; the line describes the page.** They
  are different questions and now read different values.

## Sequencing: the chassis pip has shipped, `/collection` has not adopted it

`filter-bar.tsx:139` still mounts `ColorFilterRow`, which wraps the dimmed `color-pip.tsx`.
Building the set page's rack against the chassis therefore makes the two routes show
visibly different colour controls until `/collection` migrates.

Not a reason to hold the work — the set page would be the correct one, and the migration is
the chassis's own — but PR 3 below is the one to schedule alongside that adoption rather
than ahead of it.

## Dependencies

- `ui/colour-pips.tsx` and `ui/filter-panel.tsx` — **mounted, never forked.**
- `ui/text-field.tsx`'s `SearchField` for finding 4.
- `SetGridFilters` gains a fourth field, and it must travel through `applyFilters`: the
  result line, the `Send N` label, the cost denominator and now the rarity panel's per-row
  counts are four readings of one computation.
