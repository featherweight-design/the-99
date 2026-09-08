# Re-ruling — in-flight feedback for control flips that fetch (R2)

**R2 corrects the clause map.** R1 ruled on a three-clause subtitle; the page ships four under a
scope (`page-header.tsx:66-89`, `commander-discovery.ts:50-63`). The fourth names the pool and is
the only clause `Score against` changes. R1 assigned `re-reading…` to `read against N cards` — the
one clause guaranteed *not* to move, locked and tested at `list-wiring.test.ts:110-114`. That
assignment is withdrawn: see ruling 3. Everything else in R1 stands unchanged.

Supersedes the motion clause of three documents (see **Amendments**, last section). Read with
`design/design_handoff_the99_discovery/CONTROLS-four-above-one-list.md` and
`design/design_handoff_the99_commanders_plane/CONTROLS-six-above-one-list.md`.

## The premise that was wrong

All three rulings forbid animating, dimming or skeleton-ing the list on a control flip, and all
three give the same reason: the flips are *"state changes over data already on the client."*

For one control out of four that is true. For three it is not.

| Control | Where it lives | Client or server | Pending flag |
|---|---|---|---|
| **Scope** (`I own` / `To play`) | page header | **server** — different candidate universe | true |
| **Sort** (`Best fit` / `Something new`) | filter bar, `Order` slot | **server** — `list-nav.ts:110-113`: only the active (sort, avail) pair is ranked | true |
| **Availability under discovery** (`Score against`) | filter bar | **server** — re-reads the ranking against a different collection side | true |
| **Availability under the owned scope** | filter bar | client — 242 rows, both arrays already sent | **false** |
| Colour pips | filter bar | client — pure filter | false |

Measured: **~270 ms warm, 2,870 ms worst case** for a full recompute. A repeat flip served from the
client cache does not navigate at all — the pending flag is already false there, so nothing in this
document applies to it.

So the question the three rulings answered by accident is now open on purpose: **what does the
reader see between press and arrival?**

## The rulings

### 1. The prohibition stands. The reason changes.

**No skeleton, no dim, no blur, no transition, no reflow, no placeholder rows in the list region —
and this holds for a fetch, said explicitly so it stops being re-opened.**

The old reason was "nothing is being fetched." The real reason is stronger and survives the
correction: **the rows on screen are the previous answer, correctly rendered.** They are true, they
are readable, and every one of them is still a commander the reader can press. Replacing a true
answer with grey bars for up to 2.9 s trades information the reader has for a progress indicator
they did not ask for. A skeleton is right when there is nothing behind it. Here there is.

Also forbidden, for the same reason: `aria-busy` on the list region, and `pointer-events: none`
over it. The list is not busy — it is finished, with a newer one on the way. A reader who spots the
row they wanted in the outgoing list may press it, and that press must work.

### 2. Under 500 ms the in-control mark is the entire treatment.

The shipped `PendingLabel` (PRs #411, #416) stands in place of the pressed control's label — same
control width waiting as idle — at `PENDING_OPACITY` 0.55, never disabled. On a warm flip (~270 ms)
the reader presses, the crown pulses once, the list arrives. **Nothing else appears, at any width.**

The 500 ms gate is the whole reason a list-region treatment cannot simply be "always on": an
element that appears and leaves inside 270 ms is a flash, and a flash reads as a fault, not as
progress. The gate is a threshold on the pending flag, not a delay on the fetch.

### 3. Past 500 ms exactly one line changes, and it is a line already on the page.

**No region loader ships.** The header subtitle is the page's standing description of the list.
Under a scope it has **four** clauses:

> `3,100 commanders you have not built · ranked by best fit · read against 2,805 cards · free cards only`

**Each fetching control owns exactly one clause, and one clause is owned by nobody.** While a
control's flip is in flight past the gate, its clause is replaced by its own present participle in
`--fg-faint` with a single `…`; every other clause holds verbatim.

| # | Clause | Owner | In flight | Fits? |
|---|---|---|---|---|
| 1 | `3,100 commanders you have not built` | Scope | `counting…` | 10 in 35 |
| 2 | `ranked by best fit` | Sort — **discovery only** | `re-ranking…` | 11 in 18 |
| 3 | `read against 2,805 cards` | **nobody** | **never pending** | — |
| 4 | `free cards only` / `every card you own` | Availability | `re-scoring…` | 11 in 15 |

- `counting… · ranked by best fit · read against 2,805 cards · free cards only`
- `3,100 commanders you have not built · re-ranking… · read against 2,805 cards · free cards only`
- `3,100 commanders you have not built · ranked by best fit · read against 2,805 cards · re-scoring…`

**Clause 3 has no pending state, ever.** It is deliberately scoped to the whole collection rather
than the free pool, and that is locked and tested (`list-wiring.test.ts:110-114` — scoping it to
the free pool would make the number move when a deck is built). A constant cannot announce a
change, so putting a participle there would have had the one clause guaranteed not to move say it
was moving while the clause that actually moves went stale. R1's `re-reading…` is **retired** — do
not ship the string.

**Clause 4's participle is `re-scoring…`.** The pool clause is a bare noun phrase — it has no verb
of its own to conjugate — so the verb comes from the control that owns it: `Score against`. That is
also literally what the server does with a pool: re-score every commander against a different set
of available cards. 11 characters against the 15 of `free cards only`, so it fits the shortest form
of the clause it replaces at 390 px, and it collides with neither `re-ranking…` (order) nor the
retired `re-reading…`.

The clause that says it is changing is the clause that is about to change. The others hold and
describe the rows underneath, so the sentence and the list never disagree — which is precisely what
a skeleton or a dim cannot promise. On arrival the whole sentence rewrites at once: one change, one
moment, no clause-by-clause settling.

**A pending clause must never be longer than the clause it replaces.** All three are shorter at
every width — clause 4 measured against its *shortest* form, not its longest — so the subtitle's
wrap point can only move earlier and the list can never be pushed down. This is a copy constraint,
testable, and it is why the participles are bare: the pressed control, with a crown where its
label was, already names the object of the verb.

**The verb is the clause's own verb, or its owner's.** The population clause counts, the ordering
clause ranks, and the pool clause — having no verb — borrows `score` from the control that changes
it. Parallel by construction, and no new vocabulary.

**`re-ranking…` exists only under discovery.** The owned scope has no sort control, so clause 2 has
no pending state there. Two participles are reachable under `I own`, three under `To play`.

### 4. The ellipsis does not animate, and there is no second tier.

One `…` character, static. The pulsing crown is the only moving thing on the page during a flip and
stays that way — an animated ellipsis beside it is two clocks disagreeing.

**Nothing further appears at 1 s, 2 s or 2.9 s.** No spinner in the count row, no progress bar, no
"this is taking a moment" line. A wait with a moving mark on the control that caused it and a
sentence naming the work in progress is *described*; a third element arriving at 2 s is the page
apologising for itself, and it lands right when the reader is about to be rewarded anyway.

Hugh's standing position — dimming alone is not sufficient feedback — is met, and met above the
list rather than inside it: the crown replaces the label, and past the gate a sentence says what is
being computed.

### 4b. Search gets no treatment, explicitly.

Search fires its own server action (`findExcludedMatches`, `discovery-view.tsx:404`) but filters
the list **client-side** from data already held, so the visible list narrows on the keystroke with
no wait to report. **No crown in the field, no participle, no clause of its own** — search does not
appear in the subtitle at all, and the server action behind it is a receipt for the exclusion line,
not a state the reader waits on. It is named here only so its absence from the control inventory
is a decision rather than an oversight.

### 5. Nothing is announced mid-flight.

The pending clause is `aria-hidden`. `PendingLabel`'s accessible name is the only in-flight
announcement, and the page's existing live region speaks **once, on settle**, with the shipped
message (scope announces the new population and ordering; sort announces the re-rank). Two
announcements for one press is a stutter, and the settle message is the one carrying information.

### 6. Failure reverts the sentence whole.

If the fetch fails, the route error path owns the page as it does today, and the subtitle returns to
its **outgoing sentence verbatim** — the same three clauses that were true before the press. No
half-sentence, no participle left stranded, no error clause inside the subtitle. The subtitle
describes the list; it is not a status bar.

### 7. The boundary with `LoadingScreen`.

This is the line the region-loader ticket was reaching for, so it is stated as a test:

- **The list region has outgoing content** → rulings 1–6. In place, crown, one clause. Every
  control flip on a rendered `/commanders` is this case.
- **The list region has no outgoing content** → `LoadingScreen` (crown + `shellCopy.loading`),
  unchanged. First paint, a cold shared URL carrying `?scope=play&sort=new`, a reload. There is no
  previous answer to preserve, so the route-level skeleton is correct and stays the *only*
  skeleton.

No third component between them.

## 390 px

Identical rules, one string each, no shortened variants.

- The subtitle is mono 10.5 px and already wraps to two lines at the long form. Because every
  participle is shorter than the clause it replaces, the in-flight sentence fits on **one** line —
  the transient shift is a line *removed*, above the fold, and the list moves **up**, never down.
  If that half-row of movement is judged worse than a fixed height, the fix is a two-line
  `min-height` on the subtitle at 390 px only, and that is the one open item in `READINESS.md`.
- The four stacked controls are not sticky (§7.2), so a flip started at the top of the page can be
  scrolled away from. The crown goes with it; the list underneath stays exactly as it was, which is
  the ruling working rather than a gap.
- No sticky pending bar, no toast, no bottom-anchored status line. A reader who scrolls away from
  the control has told us they are reading the list they have.

## Amendments to the three documents

Same edit three times: strike the stated reason, keep the prohibition, add the fetching case.

**1 · `design_handoff_the99_discovery/CONTROLS-four-above-one-list.md:114-115`**

> ~~**Neither control may animate the list.** Both flips re-render in place. A dimmed or sliding
> list at 3,100 rows makes a state change look like a fetch even when it is one.~~

becomes

> **Neither control may animate the list — including when the flip is a fetch.** Both flips
> re-render in place. The rows on screen are the previous answer and stay until the new one
> arrives; in-flight feedback lives on the pressed control and, past 500 ms, in the one subtitle
> clause that control owns. See `RULING-in-flight-feedback.md`.

**2 · `design_handoff_the99_discovery/The 99 - Commander Discovery.dc.html:588`**

> ~~**Motion: none.** Both flips are state changes over data already on the client — no transition,
> no dimmed list, no skeleton. The list re-renders in place, as the shipped toggle does.~~

becomes

> **Motion: none, including while waiting.** Scope and sort are server round-trips; the list still
> re-renders in place with no transition, no dimmed list and no skeleton, because the outgoing rows
> are the previous answer. The pressed control carries the pulsing crown; past 500 ms one subtitle
> clause becomes its participle. See `RULING-in-flight-feedback.md`.

**3 · `design_handoff_the99_commanders_plane/CONTROLS-six-above-one-list.md:246`**

> ~~**Nothing above the list may animate the list.** Third statement of the same rule; at 3,326
> rows the reason is only stronger.~~

becomes

> **Nothing above the list may animate the list, and a fetch is not an exception.** Third statement
> of the same rule; at 3,326 rows the reason is only stronger, and the reason is that the rows are
> the previous answer rather than that nothing is being fetched. See
> `RULING-in-flight-feedback.md`.

## What must not happen

- **No `RegionLoader` component.** The treatment is a copy state on a line that already exists plus
  a shipped control mark. A component invites a second caller and a second placement.
- **The pending clause must not become a fourth clause.** It replaces; it never appends. Appending
  is the reflow this whole ruling exists to avoid.
- **The gate must not be tuned per control.** One threshold, 500 ms, all three fetching controls.
  Three thresholds means three different products depending on which knob you touched.
- **The client-side toggles must not gain a crown for consistency.** The owned-scope availability
  toggle and the colour pips have no pending flag because there is nothing to wait for. A mark that
  fires for 0 ms is a flicker with a reason attached.
- **The count line must not carry a pending state.** `Showing — of 3,100` is a dash, and the locked
  rule is that missing data is omitted, never zeroed or dashed. It holds its outgoing figures and
  rewrites with the list.
