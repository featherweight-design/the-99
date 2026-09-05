# Design Brief — Commander discovery: one ranked list, two sorts

**Workshop:** 2026-09-05, Hugh + agent, against **#220**, covering **#213** (fit) and **#214** (novelty). **Track 2, stage 1** — this brief is the source of truth the Claude Design handoff prompt points at.

**Verified against `origin/main` at `1a41942` on 2026-09-05.** Every file:line below was read, not recalled. Every row count was queried against the staging database (`br-polished-pond-a6e63y0b`), not estimated.

Both tickets recommend a commander the player is not currently playing, over the same candidate universe, off the same index, ending in the same action. They differ only in the sort. Designing them apart would invent two list surfaces for one job.

---

## §0 Dependency — none for the list itself. One signal is in flight.

The commander support index is populated. Queried 2026-09-05:

| Measure | Value |
|---|---|
| `commander_support` rows | 3,342 commanders |
| …with `synergy_state = 'ok'` | 3,342 (all of them) |
| …carrying at least one tag | 3,226 |
| …carrying a `similar_oracle_ids` list | 3,341 |
| Average tags per commander | 43 |
| Support-list length | ≈260 cards per commander |

Against the live 2,805-card collection: 242 of those 3,342 commanders are cards the player owns, 3,100 are not, and 8 already have decks built around them.

**Price and stock (#213's buy signal) are being built in parallel as #288** (ManaPool ingest). This brief treats price as a row element that Design draws with both a present and an absent state; the list does not depend on it and must not degrade without it.

**This handoff is therefore not gated.** The readiness audit may treat it as ready-to-build.

---

## §1 Feature / surface + route

**One surface: `/commanders`** — `src/app/commanders/page.tsx`, rendering `CommandersView` (`src/components/commanders/commanders-view.tsx`) and `RecCard` (`src/components/commanders/rec-card.tsx`).

Today the page answers one question: *how well is a commander I already own supported by my collection?* Discovery adds a second: *what should I play that I am not playing?* Same list, same row component, different candidate universe.

---

## §2 Where it lives in the flow (entry → this → exit)

- **Entry:** the shell's Commanders nav item, as today. There is no new route and no new entry point.
- **This surface:** a ranked list of commanders, whose universe is set by a **scope** control and whose order is set, under discovery, by a **sort** control.
- **Exit:** a commander row → `/commanders/[slug]` (unchanged), or "Build this deck" → `createDeck` → `/decks/[id]`. `createDeck` (`src/app/decks/actions.ts:179-274`) validates commander legality but **does not require the commander to be owned**, so discovery's ending already works — the unowned-commander pattern from #176 is live.

---

## §3 Design system / files to build from

- **Brand tokens:** `design/design_handoff_the99_brand/`
- **Six-theme visual system (current visual baseline):** `amonkhet` "Gilded Stone" (default), `kamigawa` "Neon Rain", `innistrad` "Moonlit", `phyrexia` "Oil and Iron", `duskmourn` "Screen Glow", `kaldheim` "Rune Frost" (`src/app/globals.css`).
- **Sibling to mirror — closest structural fit:** `design/design_handoff_the99_synergy_discovery/`. Most recent Green-at-R1 handoff, and it extends the same two surfaces.
- **Also relevant:** `design/design_handoff_the99_commanders/` for the page itself; `design/design_handoff_the99_commanders_windowing/` for the long-list problem, which discovery makes an order of magnitude worse (3,342 candidates against today's 242); `design/design_handoff_the99_availability/` for the `Score against` toggle and `Availability ▾` filter that discovery sits beside.

---

## §4 Interaction model

**Four controls now sit above one list.** Two already ship:

- `Score against` — "Everything I own" vs "What's free" (`commanders-view.tsx:65-150`). Operates on the *collection* side.
- `Availability ▾` — colour-identity filter with `?avail=` round-trip.

Discovery adds **scope** (which commanders are candidates) and, under discovery only, **sort** (how they are ordered). Scope and sort are different axes and were deliberately not collapsed into one tab strip at the workshop.

The list is windowed as it is today, and every row keeps its stretched link to the detail page and its "Build this deck" ending.

---

## §5 Data contract

Everything discovery reads is already stored. **No EDHREC fetch happens on this path** — a live fanout over 3,342 candidates is not viable, and the index exists precisely to avoid it.

| Signal | Source | Status |
|---|---|---|
| Support overlap (the fit sort) | `commander_support_cards` joined against `collection_items` | ingested |
| Support-list size (the denominator) | `commander_support.edhrec_total` | ingested |
| Archetype tags (the novelty sort) | `commander_support.tags` — `{slug, label, count}[]` | ingested |
| Commander owned / not | `collection_items` on the commander's own oracle id | present |
| Price + stock | #288, in flight | **not yet** |

**The claim on a discovery row must change, and this is a correction to #213's own wording.** The ticket says *"I own 71 of the 99 that support this commander."* The index does not hold a 99 — it holds EDHREC's support list, which averages **≈260 cards**. Measured against the live collection, the average candidate already has **79** of its support cards owned, the 90th percentile is **104**, and the best in the whole index is **153**. Nobody owns 71 of 99, and a row saying so would be inventing a denominator. The honest claim is *N of the M cards EDHREC associates with this commander*, and Design should draw it that way.

---

## §6 Rulings (locked — do not reopen)

1. **One surface, not two.** Discovery is a scope control on `/commanders`, reusing `RecCard`, the windowing, and both shipped controls. Rejected: a separate `/discover` route, and a flat three-tab strip collapsing scope and sort — the latter because which-commanders and how-ranked are different axes, and merging them makes the `Score against` toggle's relationship to the list unexplainable.

2. **The candidate universe is every indexed commander minus the ones you have already built a deck around.** Owning the commander is a *signal on the row*, not a filter. This is what lets one universe serve both tickets: #213's buy signal is simply the unowned rows, and #214 can return the commander already sitting in the binder that was never built. Rejected: a strictly-unowned universe, which would cost the novelty sort its cheapest wins.

3. **No blended score, upheld against #214's own Shape section.** The ticket says novelty ranks "on overlap with the collection **plus** distance", which is a blend, and blending was locked out at intake. Resolved: **fit sorts on overlap; novelty sorts on tag distance; buildability is a floor, never a term.** One sort key and one cutoff per sort, each nameable in a row.

4. **The novelty floor is proportional, and its value is measured rather than guessed.** A candidate must own **≥30% of its support list** to appear under the novelty sort. Against the live collection that admits 1,704 of 3,342 candidates — roughly half, which is the intended shape: the aspirational half is not hidden forever, it is just not what "something new I can build" means. The figure is a tunable constant, and the alternatives measured at the workshop are recorded here so it is not re-derived blind: an absolute floor of 60 owned support cards admits 2,843 (too loose to mean anything), and 80 admits 1,619.

5. **Commanders with no tags fall out of the novelty sort, and that is correct.** 116 of 3,342 carry no tags; 38 of those clear the fit floor. They appear under **Best fit** and are absent under **Something new**, because distance from an empty tag set is not a small number — it is no number, and the locked rule is that missing data is omitted, never zeroed. Design should not read the differing counts between the two sorts as a defect.

6. **The "71 of the 99" claim is retired**, per §5. The denominator is the support list, and it is shown.

7. **Price is displayed, never ranked on** (unchanged from intake), and the row must read correctly with the figure absent — #288 is in flight and the list ships without waiting for it.

8. **With no decks built, the novelty sort has nothing to measure against and is disabled with a stated reason.** Not silently empty, not a zero-distance list. This is a first-run state, not an edge case: it is every new player's first visit.

---

## §7 Open for Design to call

1. **How the row justifies its own ranking.** This is the hard problem #220 was filed around: *"you own 104 of the 258 cards EDHREC associates with this commander"* and *"you have never built anything with these tags"* are different justifications that must sit in the same list without it becoming two lists. The number, the reasoning, or both — Design's call, and the one that decides whether the surface works.

2. **Where scope and sort live** relative to the two shipped controls. Four controls now stack above one list at 390px. This is the composition risk in the whole feature.

3. **How owned-vs-unowned reads on a row**, now that one list mixes them. The existing vocabulary is the `buy` tag from the Add panel and the availability marker from #43 — both drawn for other jobs.

4. **Where price and stock sit in the row without reading as a score**, and what the row looks like before #288 lands, when the commander is not stocked, and when it is stocked but expensive.

5. **How "distance from what you have played" is expressed** — a per-row line naming the archetypes, a framing on the whole list, or a filter. Note it is a comparison against the player's own decks, so it can name them.

6. **The two empty states ruling 4 and ruling 8 create**: the novelty floor excluding everything, and the no-decks-yet case. They are different sentences.

7. **Discovery at 3,342 rows.** The windowing handoff solved 242. Whether the reveal step, the end-of-ranking treatment, or the count line need redrawing at this magnitude is Design's call.

---

## §8 Out of scope

- **#215** (audit a built deck's commander) and **#218** (which of my decks does this card fit) — separate design tickets (#221, #222) reading against this list. Whoever picks them up should read this brief first.
- **The ManaPool ingest itself** (#288) — in flight in parallel. This brief consumes its output and specifies the absent state; it does not design the job.
- **Narrowing the list by mechanic or popularity** — that is #159, already in the backlog, and it applies to both scopes rather than to discovery alone.
