# Design Brief — Synergy discovery, and the last 31

**Workshop:** 2026-09-02, Hugh + agent, from live feedback on the shipped #130/#131 build. **Track 2, stage 1** — this brief is the source of truth the Claude Design handoff prompt points at.

**Verified against `origin/main` at `239b872` on 2026-09-02.** Every file:line below was read, not recalled. Every row count was queried against the staging database, not estimated.

**Provenance.** Three of Hugh's observations drive the whole brief:

> "One of the first questions I ask is 'What other creatures can support/synergize with this commander?' We should have a way to flesh this out for users. Also, it's worth calling out that the Role Coverage chips are clickable, but the EDHREC Synergy cards are not."

> "I should be able to choose additional creatures/threats from the EDHREC section to bolster the 'Build' click so I can hit that 99 instead of trying to fill in another 31."

> "We shouldn't re-invent EDHREC Synergy, but we also don't want redundancies from EDHREC and the Ramp/Removal/etc. categories we already call out. Creatures are a good focus, but we don't want to only focus on that."

---

## §0 Dependency — none. The data is already ingested.

An earlier draft of this brief recorded the offline support table as an open dependency. **That is no longer true.** The `Commander index` workflow ran to success on 2026-09-03 and populated staging:

| Table | Rows |
|---|---|
| `commander_support` | 3,342 commanders |
| `commander_support_cards` | 879,329 rows |
| …of those, carrying `inclusion` | 879,329 |
| …of those, carrying `synergy` | 879,329 |

Roughly 260 support cards per commander, each with both figures. For **The Chief Warg** specifically: 258 support cards, of which 66 are creatures and 56 are lands, with `synergy` spanning 0 to 0.83.

What is missing is a **read path**, not an ingest: nothing currently queries `commander_support_cards` on the commander detail route, and the type line needed for the type facet comes from a join to `cards.type_line` (`src/db/schema.ts:31`). That is ordinary eng work inside this feature, not a prerequisite project.

**This handoff is therefore not gated.** The readiness audit may treat it as ready-to-build.

---

## §1 Feature / surface + route

Two surfaces, one design cycle, because they are the two halves of one sentence — "here is what else supports this commander" and "here, put the ones you want in the deck."

- **A · EDHREC Synergy** on `/commanders/[slug]` — `SynergyPanel`, `src/components/commanders/detail.tsx:244-350` (desktop) and the mobile panel at `:525-596`. Today: a percentage headline, an "Owned — N" list of name chips, and a "Not in your collection — N · the gap to close" list of name chips.
- **B · The last 31** on `/decks/[id]` — the deck arrives from "Build this deck" holding 68 cards (`FILL_BASELINE_TOTAL`, `src/lib/decks/fill.ts:35-36`). This surface is how the remaining 31 get chosen.

---

## §2 Where it lives in the flow (entry → this → exit)

**Surface A**

- **Entry:** `/commanders` → a commander row → `/commanders/[slug]`. The panel sits below Role Coverage; there is no other way in.
- **This surface:** the cards EDHREC associates with this commander, ranked by synergy, browsable and inspectable, with ownership legible per card — and, per ruling 4, selectable into the build.
- **Exit:** the Card Detail modal (returns focus to the originating card), or "Build this deck" (`detail.tsx:758` mobile / `:853` desktop), which is surface B's entry.

**Surface B**

- **Entry:** "Build this deck" → `createDeck` → `/decks/[id]`, arriving with 68 cards placed, plus anything selected on surface A.
- **This surface:** the shipped deck builder, plus a way to reach 99 — by selection from a synergy shelf, or in one action.
- **Exit:** the player keeps building, or leaves. As on the shipped surface, there is no commit step: **the deck is real from the first frame.**

---

## §3 Design system / files to build from

- **Brand tokens:** `design/design_handoff_the99_brand/`
- **Six-theme visual system (current visual baseline):** `amonkhet` "Gilded Stone" (default), `kamigawa` "Neon Rain", `innistrad` "Moonlit", `phyrexia` "Oil and Iron", `duskmourn` "Screen Glow", `kaldheim` "Rune Frost" (`src/app/globals.css`).
- **Sibling to mirror — closest structural fit:** `design/design_handoff_the99_recommendations/` (`README.md` + `ADDENDUM-README.md`). This brief extends exactly the surfaces that handoff designed, and its `recommendations · copy strings.ts` is the copy-export convention.
- **Also relevant:** `design/design_handoff_the99_add_panel/` for the Consider panel and shelf idiom surface B reuses; `design/design_handoff_the99_commanders_windowing/` for the long-list problem ruling 1 creates; `design/design_handoff_the99_commanders/` for the page itself.

---

## §4 Interaction model

**Surface A — EDHREC Synergy**

- Every card in the panel is a control, owned or not. Activating it opens the shared Card Detail modal via `CardDetailTrigger` (`src/components/cards/card-detail-provider.tsx:47-90`), which is already built, already tested, already mounted on this page (`detail.tsx:370`), and already wired to the Role Coverage chips (`src/components/commanders/coverage-chip.tsx:49-84`). The synergy chips simply were never wired to it. `open(oracleId, siblings?)` takes a sibling list, so the modal paginates across the panel.
- The panel is **ordered by synergy**, leads with creatures, and reaches the other types and the full list through progressive disclosure (ruling 1).
- Each card carries a **select-into-build** affordance (ruling 4). Selection is client state on the page; "Build this deck" carries it into `createDeck`. There is no tray to manage, no confirm step, and no change to the button's role.

**Surface B — the last 31**

- No new panel. The Consider panel and quick-add search already ship (`src/components/decks/consider-panel.tsx:230-347`, `src/components/decks/quick-add-bar.tsx:44-319`), and `addCardToDeck(deckId, oracleId)` (`src/app/decks/actions.ts:332-381`) already validates, enforces singletons and caps the deck at 99. The Consider panel gains a **synergy shelf** drawn from the same ranked list as surface A.
- Two new controls, per ruling 5: an owned-only **fill the rest for me**, and a separate, explicitly-labelled top-up that adds unowned staples.
- Everything either control places is an `auto` card (`src/components/decks/auto-tag.tsx`), governed by the shipped keep-and-clear behaviour.

---

## §5 Data contract

**What the panel has today, and why it is not enough.** `SynergyPanel` renders `c.overlapOwned` and `c.overlapMissing` (`detail.tsx:309`, `:342`) — two arrays of **card names**, derived from EDHREC's `topCards` (`src/lib/edhrec/parse.ts:103`) intersected against the collection. `OwnedChip` (`src/components/commanders/role-card-list.tsx:3-24`) and `MissingChip` (`detail.tsx:21-47`) are both inert `<span>`s. There is no oracle id, no type line, no image and no synergy figure anywhere in the panel's props.

**What it needs, and where each piece lives:**

| Piece | Source | Status |
|---|---|---|
| oracle id | `commander_support_cards.oracle_id` | ingested |
| inclusion % | `commander_support_cards.inclusion` (`src/db/schema.ts:280`) | ingested |
| synergy | `commander_support_cards.synergy` | ingested |
| type line | `cards.type_line` (`src/db/schema.ts:31`), joined on oracle id | present |
| owned quantity | the collection query already used by the page | present |

**Inclusion and synergy are different figures and must read differently.** Inclusion is how many of this commander's decks run the card; synergy is how much *more* often it appears here than in decks generally. A card can be 80% inclusion and near-zero synergy (Sol Ring — everyone runs it) or 30% inclusion and high synergy (the card that only makes sense with this commander). The panel is a **synergy** ranking, per ruling 1; inclusion is secondary context.

**The null rule is load-bearing and already locked in code** (`src/lib/decks/suggest.ts:31-33`): *"Null is the drawn 'no EDHREC figure' state and must render as absence, never as 0%."* A zero draws a real bar for no data. Design must draw the absent state explicitly, on both figures.

---

## §6 Rulings (locked — do not reopen)

1. **The panel stops being an ownership audit and becomes a synergy ranking, creatures led.** Today it answers "how much of the EDHREC list do you own?", which is a scoring artefact. The player's question is "what supports this commander?" Owned and unowned merge into one list ordered by synergy, creatures surfaced first because that is the question players arrive with — **but creatures are the emphasis, not the whole panel.** Every other type is reachable, and the full list is reachable, through progressive disclosure. The percentage headline stays.

2. **Do not re-invent EDHREC's synergy figure.** It is ingested (§0) and it is the ranking. The design job is presenting it, not deriving a competing score.

3. **The panel hides only what Role Coverage already draws.** Role Coverage renders owned cards from the player's pool that fill Ramp, Card Draw, Removal or Board Wipes. Exactly those cards are excluded from the synergy panel — nothing on the commander page appears twice. An *unowned* high-synergy ramp card **stays in the panel**, because nothing else on the page shows it. Rejected: excluding all four roles outright, which would hide unowned role staples the player has no other way to see.

4. **Selection happens on both surfaces.** On the commander page, cards can be selected into the build before clicking "Build this deck", which carries them into `createDeck`. On the deck page, the Consider panel gains a synergy shelf. This is deliberately two entry points for one job — Hugh's call, taken knowingly. Note the constraint it does *not* relax: no tray that outlives the page, no confirm step, no wizard. **The deck is still real from the first frame.**

5. **Auto-fill to 99 is owned-only, and buying is a second, explicit control.** The main action produces a deck the player can physically build tonight; if the pool runs out before 99 it stops short and says so. A separate labelled control tops up the remainder with unowned staples. Rejected: a single action inheriting the 68-card fill's buy policy, which would make shopping the default outcome.

6. **The 68 baseline is unchanged and stays the default.** `stickyPromise` and `seedNote` (`src/lib/copy/recommendations.ts:76`, `:79`) keep their current strings. Reaching 99 is opt-in, never automatic.

7. **Everything either fill control adds is an `auto` card.** No new marker, no new provenance vocabulary. A player who dislikes the result reaches for the shipped `Clear all auto` sweep.

---

## §7 Open for Design to call

1. **How surface A is drawn at ~260 cards.** Two wrapped chip lists work at ten names and collapse at 260. Tiles, rows, windowing, how much shows before the first reveal, and the density recommendation — Design's call, at both widths. `design/design_handoff_the99_commanders_windowing/` is the prior art.

2. **The progressive-disclosure ladder.** Ruling 1 fixes the order — creatures first, other types reachable, full list reachable — but not the shape. One facet control? Two stacked reveals? Named type groups? Design decides.

3. **How ownership reads per card** now that the two lists merge. The shipped green dot and dashed border are the existing vocabulary, but they were drawn for two separately-headed lists.

4. **The select-into-build affordance** on surface A, and how the "Build this deck" button reflects a non-empty selection. Note the copy tension: the button currently promises "We'll fill 68 of the 99", which stops being true the moment something is selected.

5. **Where the two fill controls live** on surface B relative to the shipped `Clear all auto`, how the owned-only one differs visually from the buying one, and what each says while working. Three controls of related shape end up adjacent.

6. **What surface B says when the deck cannot reach 99** — owned-only fill will frequently stop short. `FillPlan.shortfalls` (`src/lib/decks/fill.ts:25`) is the existing shortfall vocabulary.

---

## §8 Out of scope

- **The mana base.** A separate defect is open: a filled deck can take all 37 land slots as one basic, with no colour balance and no utility lands (`src/lib/decks/fill.ts`, the land pass). It is being fixed as a bug, in code, with no design cycle. Worth noting that §0's ingest is directly useful there — 56 of The Chief Warg's 258 support cards are lands.
- **Set weighting.** A slider biasing the fill toward a chosen set. Endorsed, real, and not this feature; it gets its own brief.
