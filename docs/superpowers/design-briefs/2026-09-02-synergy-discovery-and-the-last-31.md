# Design Brief — Synergy discovery, and the last 31

**Workshop:** 2026-09-02, Hugh + agent, from live feedback on the shipped #130/#131 build. **Track 2, stage 1** — this brief is the source of truth the Claude Design handoff prompt points at.

**Verified against `origin/main` at `239b872` on 2026-09-02.** Every file:line below was read, not recalled.

**Provenance.** Two of Hugh's observations drive the whole brief:

> "One of the first questions I ask is 'What other creatures can support/synergize with this commander?' We should have a way to flesh this out for users. Also, it's worth calling out that the Role Coverage chips are clickable, but the EDHREC Synergy cards are not."

> "I should be able to choose additional creatures/threats from the EDHREC section to bolster the 'Build' click so I can hit that 99 instead of trying to fill in another 31."

---

## §0 Dependency — read before scheduling

Everything in §5 needs per-card **type line** and per-card **synergy** for an arbitrary commander, served offline. Today the commander page has neither: the EDHREC Synergy panel is built from two arrays of bare card *names* (§5). The offline support table that carries them is specified and planned but **not built** — `commander_support_cards` exists in the schema (`src/db/schema.ts:280`, columns `inclusion` and `synergy`) and is not queried by the scoring path. See `docs/superpowers/specs/2026-08-29-recommendation-foundation-design.md` and `docs/superpowers/plans/2026-08-29-recommendation-foundation.md` on branch `feat/rec-foundation`.

This is the same dependency §0 of `2026-08-31-recommendations-you-can-act-on.md` recorded, and it is still open.

Design can and should mock against this brief regardless — the rulings are settled and every data shape is already drawn elsewhere in the app (§5). But the readiness audit must not read the resulting handoff as ready-to-build: **the foundation lands first.**

---

## §1 Feature / surface + route

Two surfaces, one design cycle, because they are the two halves of one sentence — "here is everything that supports this commander" and "here, put the ones you want in the deck."

- **A · EDHREC Synergy** on `/commanders/[slug]` — `SynergyPanel`, `src/components/commanders/detail.tsx:244-350` (desktop) and the mobile panel at `:525-596`. Today: a percentage, an "Owned — N" list of name chips, and a "Not in your collection — N · the gap to close" list of name chips.
- **B · The last 31** on `/decks/[id]` — the deck arrives from "Build this deck" holding 68 cards (`FILL_BASELINE_TOTAL`, `src/lib/decks/fill.ts:35-36`). This surface is how the remaining 31 get chosen.

---

## §2 Where it lives in the flow (entry → this → exit)

**Surface A**

- **Entry:** `/commanders` → a commander row → `/commanders/[slug]`. The panel sits below Role Coverage; there is no other way in.
- **This surface:** the cards EDHREC associates with this commander, browsable and inspectable, with the player's ownership legible per card.
- **Exit:** the Card Detail modal (returns focus to the originating card), or "Build this deck" (`detail.tsx:758` mobile / `:853` desktop), which is surface B's entry.

**Surface B**

- **Entry:** "Build this deck" → `createDeck` → `/decks/[id]`, arriving with 68 cards placed.
- **This surface:** the shipped deck builder, plus a way to reach 99 — by selection, or in one action.
- **Exit:** the player keeps building, or leaves. As on the shipped surface, there is no commit step: **the deck is real from the first frame.**

---

## §3 Design system / files to build from

- **Brand tokens:** `design/design_handoff_the99_brand/`
- **Six-theme visual system (current visual baseline):** the six themes are `amonkhet` "Gilded Stone" (default), `kamigawa` "Neon Rain", `innistrad` "Moonlit", `phyrexia` "Oil and Iron", `duskmourn` "Screen Glow", `kaldheim` "Rune Frost" (`src/app/globals.css`).
- **Sibling to mirror — closest structural fit:** `design/design_handoff_the99_recommendations/` (`README.md` + `ADDENDUM-README.md`). This brief extends exactly the surfaces that handoff designed, and its `recommendations · copy strings.ts` is the copy-export convention.
- **Also relevant:** `design/design_handoff_the99_add_panel/` for the Consider panel and the shelf idiom that surface B's selection reuses; `design/design_handoff_the99_commanders/` for the commander detail page.

---

## §4 Interaction model

**Surface A — EDHREC Synergy**

- Every card in the panel is a control, owned or not. Activating it opens the shared Card Detail modal via `CardDetailTrigger` (`src/components/cards/card-detail-provider.tsx:47-90`), which is already built, already tested, already mounted on this page (`detail.tsx:370`), and already wired to the Role Coverage chips (`src/components/commanders/coverage-chip.tsx:49-84`). The synergy chips simply were not wired to it. `open(oracleId, siblings?)` takes a sibling list, so the modal paginates across the panel.
- The panel gains a **type facet**, so "what creatures support this commander?" is one control away.
- **No add control on this surface.** See ruling 3.

**Surface B — the last 31**

- No new panel. The Consider panel and the quick-add search already ship (`src/components/decks/consider-panel.tsx:230-347`, `src/components/decks/quick-add-bar.tsx:44-319`), and `addCardToDeck(deckId, oracleId)` (`src/app/decks/actions.ts:332-381`) already validates, enforces singletons and caps the deck at 99.
- One new control: **fill the rest for me** — a single action that takes the deck from wherever it is to 99.
- Cards it places are `auto` cards, identical in every respect to the 68 (`src/components/decks/auto-tag.tsx`), including the keep-and-clear behaviour ruling 5 of the prior brief governs.

---

## §5 Data contract

**What the panel has today, and why it is not enough.** `SynergyPanel` renders `c.overlapOwned` and `c.overlapMissing` (`detail.tsx:309`, `:342`) — two arrays of **card names**, derived from EDHREC's `topCards` (`src/lib/edhrec/parse.ts:103`) intersected against the collection. `OwnedChip` (`src/components/commanders/role-card-list.tsx:3-24`) and `MissingChip` (`detail.tsx:21-47`) are both inert `<span>`s. There is no oracle id, no type line, no image, and no synergy figure anywhere in the panel's props.

**What it needs, and where each piece already exists:**

- **oracle id** — required by `CardDetailTrigger`; today the panel has only a name.
- **type line** — `cards.typeLine` (`src/db/schema.ts:31`). Required for the type facet.
- **inclusion %** — `commanderSupportCards.inclusion` (`src/db/schema.ts:280`). Already drawn on the Consider panel's suggestion tiles and governed by the null rule below.
- **synergy** — `commanderSupportCards.synergy`. Parsed today as `synergyByName` (`src/lib/edhrec/parse.ts:10`) and then dropped: `scoreCommander` receives it and stores nothing.
- **owned quantity** — already available on the deck surfaces.

**The null rule is load-bearing and already locked in code** (`src/lib/decks/suggest.ts:31-33`): *"Null is the drawn 'no EDHREC figure' state and must render as absence, never as 0%."* A zero draws a real bar for no data. Design must draw the absent state explicitly, on both figures.

---

## §6 Rulings (locked — do not reopen)

1. **The Synergy panel stops being an ownership audit and becomes a card list.** Today it answers "how much of the EDHREC list do you own?", which is a scoring artefact. The player's question is "what supports this commander?" Owned and unowned merge into one list with ownership drawn per card; the percentage headline stays.

2. **Every card in the panel opens Card Detail — owned or not.** Parity with Role Coverage is the whole point of the complaint. The unowned card is the one the player most needs to read.

3. **Selection happens on the deck, not on the commander page.** Hugh's phrasing was "choose additional creatures from the EDHREC section to bolster the Build click", which reads as pre-build selection. Rejected: a selection tray that survives a redirect into `createDeck` is a wizard, and *the deck is real from the first frame* is a locked decision of the prior handoff. Surface A stays read-and-inspect; every add happens on surface B, where `addCardToDeck` and the Consider panel already are. The cost if this is wrong: the player inspects on one page and adds on the next, one extra step.

4. **The 68 baseline is unchanged and stays the default.** `stickyPromise` and `seedNote` (`src/lib/copy/recommendations.ts:76`, `:79`) keep their current strings. Reaching 99 is opt-in, never automatic — Hugh: *"I tend to agree with you about the baseline."*

5. **"Fill the rest for me" is one action, not a mode.** No configuration, no preview step, no confirm dialog. It obeys the same buy policy as the baseline fill: unowned EDHREC staples are allowed and are marked, exactly as the 68 marks them.

6. **Everything it adds is an `auto` card.** No new marker, no new provenance vocabulary. A player who dislikes the result reaches for the shipped `Clear all auto` sweep.

7. **Creatures are the emphasis, not a filter that hides the rest.** The type facet defaults to showing everything; creatures are one reach away. Hugh's question is the common one, not the only one.

---

## §7 Open for Design to call

1. **How surface A is drawn once it holds a real card list.** Two wrapped chip lists work at ~10 names and do not work at ~100 cards. Tiles, rows, windowing, a reveal control, a density recommendation — Design's call, at both widths. `design/design_handoff_the99_commanders_windowing/` is prior art for the windowing question.

2. **The shape of the type facet** and where it sits relative to the panel's percentage headline.

3. **How ownership reads per card** now that the two lists merge — the shipped green dot and dashed border are the existing vocabulary, but they were drawn for two separate lists with their own headers.

4. **Where "fill the rest for me" lives** in the deck toolbar relative to the shipped `Clear all auto`, and what it says while it is working. Note that the two controls are opposites sitting side by side.

5. **What surface B says when the deck cannot reach 99** — the collection and the EDHREC list together may not have 31 more legal cards. The shortfall vocabulary in `FillPlan.shortfalls` (`src/lib/decks/fill.ts:25`) is the existing precedent.

---

## §8 Out of scope

- **The mana base.** A separate defect is open: a filled deck can take all 37 land slots as one basic, with no colour balance and no utility lands (`src/lib/decks/fill.ts`, the land pass). It is being fixed as a bug, in code, with no design cycle.
- **Set weighting.** Hugh endorsed a slider that biases the fill toward a chosen set. It is a real feature and it is not this one; it gets its own brief.
