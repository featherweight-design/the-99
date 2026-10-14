# §7.2 — four controls, one list, 390px

The composition risk in the whole feature, recorded in full because the canvas can only show the
outcome. Read with `README.md` decision 4.

## What is already there

| Control | Home today | Idiom | Axis |
|---|---|---|---|
| Colour pips | filter bar, left | pip row wrapper, `aria-pressed` | narrows the list |
| `Score against` | filter bar, third position (`commanders-view.tsx:65-150`) | radiogroup, two segments | changes the **collection** side |
| `Order: Fit ↓ · fixed` | filter bar, right-aligned | **inert label** | states the order |
| `Showing N of M` | filter bar, far right | inert label | count |

Two of those four are labels, and one of the labels describes exactly the thing discovery needs a
control for.

## The two new axes

- **Scope** — which commanders are candidates. Population.
- **Sort** — how they are ordered. Ranking.

Ruling 1 already refused to collapse them into one strip, because which-commanders and how-ranked
are different questions and merging them makes `Score against`'s relationship to the list
unexplainable. The remaining question is where each lands.

## Rejected shapes

**1. Both new controls into the filter bar.** Four peers in one row: colours, scope, scoring
basis, sort. At 1280px they fit and read as a bank of equal knobs, three of which change the
ranking and one of which changes what a ranking even is. At 900px the row wraps mid-bank and the
wrap point is arbitrary.

**2. Scope as a tab strip above the whole page.** Tabs promise a panel swap. Both scopes render
the same list with the same rows and the same controls beneath them, so a tab is a lie about what
the click does — the same reasoning that made `Score against` a radiogroup rather than a tablist.

**3. Sort as a third and fourth segment on `Score against`.** Six segments in one strip, mixing
collection-side and ranking-side options. This is ruling 1's rejected three-tab strip with an
extra half.

**4. A "Discovery" sub-header band holding scope and sort together.** Cleanest on paper: a second
bar under the header, present only under discovery. Rejected because the page then has *two*
control bars, and the shipped one is the sticky one — so scrolling hides the two new controls and
keeps the two old ones, which is precisely backwards.

## Drawn

**Tier 1 — scope, in the page header, beside the title.** It changes which commanders exist on
this page, which is the same class of change as the title. Label `Show`, two segments, the shipped
segmented geometry at 32px. The subtitle beneath the title restates the population in words on
every flip:

> `3,100 commanders you have not built · ranked by best fit · read against 2,805 cards`

That line is how the player knows the list changed without counting rows, and it is the reason
scope needs no count of its own.

**Tier 2 — sort, in the filter bar, in the `Order` label's slot.** A label that always announced
the order becomes the control that sets it. The filter bar gains a control without gaining a row,
and the two shipped controls keep their positions, their geometry and their pixels. Under the
owned scope the slot reverts to the shipped label verbatim.

**Reading order, left to right, is unchanged and now means something:** narrow (colours) → score
against (which cards count) → order (which sort). Scope is above all three because it precedes
all three.

## Why scope is segmented and sort is a menu

| | Scope | Sort |
|---|---|---|
| Options | 2, both always available | 2, one can be unavailable |
| Reason needed | never | **yes** — ruling 8's stated reason |
| Shape | segmented radiogroup | menu with sub-lines |

A segment cannot carry a sentence. The shipped disabled `What's free` segment gets by on
strikethrough plus an aria label *because its reason lives in a banner* — and a degraded read is
an outage, so a banner is owed. Novelty being unavailable is not an outage; it is the normal state
of every new account, and its reason has nowhere else to live. The menu row holds it:

> **Something new** — `needs a finished deck to compare against — build one and this turns on`

Each option also carries a one-line naming of its sort key (`most of its support list already
owned` / `farthest from the archetypes you have built`), because ruling 3 forbids a blend and two
unexplained words would imply one.

## 390px

Four rows, in decreasing scope:

1. **Title + subtitle**, then scope: 38px full-width halves, shipped mobile `ScoreAgainst`
   geometry. Labels shorten to `I own` / `To play` — the subtitle carries the long form, so the
   segments only need to be distinguishable, not self-explanatory.
2. **Colour pips**, unchanged, with the shipped inline `N/M` count.
3. **`Score against`**, unchanged: its own label, 38px halves, the `freeNote` beneath when free.
4. **Count row**: window count left, **sort trigger right** — 38px, mono 11.5px, `▾` in accent.
   This is the row that already read `Fit ↓ · fixed`.

**Nothing new becomes sticky.** Four stacked controls pinned at 390px leaves roughly a third of
the viewport for the list, and the list is the surface. Scrolling puts all four away together,
which is also what keeps the tiering legible: they are one block, in one order, in one place.

**Measured stack cost at 390px:** ~48px title, ~18px subtitle, 44px scope, 34px pips, 16px + 44px
score against, 38px count row ≈ 242px before the first row. The shipped page spends ~176px, so
discovery costs about 66px — one third of a row. Accepted; the alternative is hiding a control
behind a disclosure, and a control the player cannot see is a control they do not know changed the
list.

## What must not happen

- **Scope must not gain a third option.** "Everything" (all 3,342, built included) is a fourth
  question, and ruling 2 already answered it: the built ones are excluded because they are done.
- **Sort must not gain a "relevance" default.** That is a blend with a friendlier name.
- **Neither control may animate the list.** Both flips re-render in place. A dimmed or sliding
  list at 3,100 rows makes a state change look like a fetch even when it is one.
- **The subtitle must never be the only statement of the sort.** The sort control says it too. A
  player who arrives from a shared URL reads the control; a player who flips reads the subtitle.
