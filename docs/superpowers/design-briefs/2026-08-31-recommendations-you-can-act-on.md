# Design Brief — Recommendations you can act on (#130 · #131)

**Workshop:** 2026-08-31, Hugh + agent. **Track 2, stage 1** — this brief is the source of truth the Claude Design handoff prompt points at.

**Tickets:** #130 (pre-populate a deck on "Build this deck"), #131 (make Role Coverage explanatory and inspectable).

**#132 was closed during the workshop, not briefed.** Its two stated needs had already shipped: `getDeckSuggestions` returns up to five unowned EDHREC staples marked `owned: false` (`src/app/decks/actions.ts:105-170`, PR #206), and quick-add's search applies the ownership predicate only when the toggle is on (`src/app/decks/[id]/search-action.ts:89`), so an unowned card can be added and `decklist.tsx:49` files it under Shopping. What remained was a volume problem, and that is now §8 ruling 2 below.

**Verified against `main` at `0c99766` on 2026-08-31.** Every file:line in this brief was read, not recalled.

---

## §0 Dependency — read before scheduling

The chip figures in ruling 4 and the top-up in ruling 2 both need per-card EDHREC inclusion and synergy **for an arbitrary commander**, served offline. Today that data is fetched live per deck and cached (`edhrecCache`); the offline support table it needs is specified and planned but **not built** — see `docs/superpowers/specs/2026-08-29-recommendation-foundation-design.md` and `docs/superpowers/plans/2026-08-29-recommendation-foundation.md` on branch `feat/rec-foundation`.

Design can and should mock against this brief regardless — the rulings are settled and the data shapes are already drawn elsewhere in the app (§5). But the readiness audit must not read the resulting handoff as ready-to-build: **the foundation lands first.**

---

## §1 Feature / surface + route

Two surfaces, one design cycle, because they are the two halves of one sentence — "here is why this card is right for your commander" and "here, I put it in your deck."

- **A · Role Coverage** on `/commanders/[slug]` — `RolePanel`, `src/components/commanders/detail.tsx:271-336`. Today: a header row and a wrap of name-only chips.
- **B · The filled deck** on `/decks/[id]` immediately after "Build this deck" — the decklist, the role counter strip, and the Shopping tab.

---

## §2 Where it lives in the flow (entry → this → exit)

**Surface A**

- **Entry:** `/commanders` → a commander row → `/commanders/[slug]`. Role Coverage is a panel on that page; there is no other way in.
- **This surface:** four role panels (Ramp, Card Draw, Removal, Board Wipes), each with a count, a baseline verdict, and the cards from the user's pool that fill the role.
- **Exit:** either the Card Detail modal (new — opens over the page, returns focus to the chip), or the "Build this deck" primary button at `detail.tsx:758` (mobile) / `:853` (desktop), which is surface B's entry.

**Surface B**

- **Entry:** "Build this deck" → `/decks/new?commander=<oracleId>` → `createDeck` (`src/app/decks/actions.ts:40-55`) → redirect to `/decks/[id]`.
- **This surface:** the deck builder as it already ships, but arriving populated instead of empty, with provenance markers and one sweep control.
- **Exit:** the user keeps building, or leaves. There is no commit step and no wizard — the deck is real from the first frame.

---

## §3 Design system / files to build from

- **Brand tokens:** `design/design_handoff_the99_brand/`
- **Richness pass (current visual baseline):** `design/design_handoff_the99_richness/` — the `.dc.html` files there, not the v1 mocks.
- **Sibling to mirror — closest structural fit:** `design/design_handoff_the99_add_panel/` (🟢 Green; `README.md` plus `ADDENDUM-README.md`). It designed the Consider panel, the role counter strip, and the decklist rows this brief extends, and its `add-panel · copy strings.ts` is the copy-export convention.
- **Also relevant:** `design/design_handoff_the99_availability/` (most recent handoff) for how a per-card marker is drawn across rows, tiles and card detail without shouting — the `auto` marker in ruling 5 is the same class of problem.
- **Commanders surface:** `design/design_handoff_the99_commanders/`.

---

## §4 Interaction model

**Surface A — Role Coverage**

- Each chip becomes a control. Activating it opens the shared Card Detail modal (`src/components/decks/card-detail-provider.tsx`), which is already built, already tested, and today simply is not wired to this page.
- The chip is the only new control. There is no per-chip add button — Role Coverage is a *preview of what the fill will do*, and the fill is the action.
- Dismiss: Escape and backdrop, per the shipped modal. Focus returns to the originating chip.

**Surface B — the filled deck**

- No new panel. One new control: **Clear all auto**, which removes every still-untouched auto card in one action.
- An auto card is otherwise an ordinary deck card — removable, inspectable, groupable, exactly as a hand-added card is.
- Ruling 5 governs when the marker clears. Note the trap it exists to avoid: **opening a card must not clear its marker.**

---

## §5 Data contract

Nothing here is invented. Both figures ruling 4 asks for are already served, already typed, and already drawn on the Consider panel's suggestion tiles:

- `DeckSuggestion.inclusionPct: number | null` — `src/lib/decks/suggest.ts:33`. The percentage of this commander's EDHREC decks that run the card.
- `DeckSuggestion.lift: number | null` — `src/lib/decks/suggest.ts:38`. Synergy, surfaced **only where positive**; zero and negative resolve to `null`, because "runs it less than average" is not a reason to add a card.
- Built by `buildSuggestionPayload` (`suggest.ts:60-95`) from `inclusionByName` / `synergyByName`.

**The null rule is load-bearing and already locked in code** (`suggest.ts:31-33`): *"Null is the drawn 'no EDHREC figure' state and must render as absence, never as 0%."* A zero draws a real bar for no data. Design must draw the absent state explicitly.

Role baselines, both already defined:

- `ROLE_TARGETS` — `src/lib/recs/roles.ts:4`: **ramp 10, draw 10, removal 8, wipes 3** (31 cards).
- `LAND_TARGET = 37` — `src/lib/decks/suggest.ts:45`; also `RECOMMENDED_MIX.land` at `src/lib/decks/mix.ts:72`, where it is `advisory: true` and captioned `rec ~37`.

So the fill's ceiling is **31 + 37 = 68 of 99**, leaving **31 open synergy slots**. Use these numbers in mocks; do not round them to something tidier.

The roster itself already exists: `suggestDeck` (`src/lib/decks/suggest.ts:120-165`) takes the commander, the owned pool and EDHREC's top cards and returns an ordered `Suggestion[]` filled to exactly these targets. #130 is not a new algorithm — it is committing what that function already returns, at create time, marked.

**New data needed:** one flag on the deck-card row recording that a card arrived from the fill and has not yet been touched. Naming is eng's call.

---

## §6 States to cover — name all

**Surface A**

1. Role at or above baseline, chips carrying figures.
2. Role below baseline — the shipped copy is `{n} short of baseline` (`detail.tsx:316`).
3. Role with an empty pool — shipped copy: `No {role} cards in your pool` (`detail.tsx:330`).
4. **A chip whose figure is absent** (`inclusionPct === null`). Per §5 this must read as absence. Draw it.
5. EDHREC data unavailable entirely for this commander — every chip in state 4 at once. Does the panel say something once at the top rather than forty times?
6. Long role — a deep collection can put far more than ten chips in Ramp. Say what the wrap does and where it stops.
7. Modal open from a chip, on both viewports.

**Surface B**

8. Freshly filled deck — 68 cards, all auto, before any interaction.
9. Partly pruned deck — still-auto, explicitly kept, and hand-added cards in one list.
10. All auto cleared — the deck drops to the commander alone. This is the old empty state; confirm it still reads correctly when reached by *deletion* rather than by never having been filled.
11. **Shopping populated by the fill** — the tab is about to have real contents for the first time. What does a to-buy card look like next to an owned one, and what does the tab's count read?
12. Shopping empty because the user's collection covered every baseline. Both empty-tab directions, per the template.
13. A role the fill could not reach even with unowned top-up (EDHREC offers too few in-colour candidates). Under baseline, in a deck the app just built. Say so honestly.
14. Optimistic / in-flight — the fill commits ~68 rows. Whether that is one write or a stream is eng's call, but Design should say what the first frame looks like.
15. Fill fails after the deck is created. The user is on a real, empty deck that was supposed to be full.

---

## §7 Copy

- **Lift every string verbatim into a copy file.** The convention is `src/lib/copy/<surface>.ts` — see `decks-builder.ts` and `commanders.ts`. Export it from the handoff as `recommendations · copy strings.ts`, mirroring `add-panel · copy strings.ts`.
- **Voice:** "Kitchen Table," locked 2026-07-20. Canonical statement is the "Voice snapshot (locked — verbatim)" section of `design/design_handoff_the99_richness/README.md`. Do not restate it; match it.
- **Every count and percentage in a mock is production data.** No "92%" that could not come from a real EDHREC page, no "Showing 12 of 12" over three rows.
- Existing strings to match rather than replace: `{n} short of baseline`, `At the {n}-source baseline`, `Well past the {n}-source baseline` (`detail.tsx:312-316`), and `RECOMMENDED_MIX_SOURCE_LINE` — `"EDHREC averages · a guide, not a gate"` (`mix.ts:82`). That last line is the posture the whole brief should inherit.

---

## §8 Locked — do not propose alternatives

Five rulings from the 2026-08-31 workshop, plus two derived from them.

1. **"Build this deck" fills the deck for real.** Not a staged roster, not opt-in per role, not a review screen. Ordinary deck-card rows written at create time, each carrying an `auto` flag, plus one **Clear all auto** sweep. Rejected: a staging state (a new persistence concept for control the user already has, since pruning a real deck is the same gesture) and per-role opt-in (four clicks minimum, so it only partly answers the ticket).

2. **The fill reaches outside the collection, but only as far as baseline.** Owned cards first; unowned EDHREC staples top each role up to its target and no further. Those land in Shopping automatically. Rejected: owned-only (leaves Shopping starved, which is the problem #132 named) and fill-all-99 (the app stops being about your collection, and a 58-card Shopping tab reads as a bill).

3. **The ceiling is roles plus a mana base — 68 of 99.** The 31 open slots are deliberate: that is where the commander actually happens, and it is where the engine's picks are weakest. The deck is not meant to arrive finished.

4. **Role Coverage chips carry one figure and open the modal.** `inclusionPct` on the chip so the ordering is legible without tapping; the full separate-signals receipt in the modal. **No blended score anywhere** — this is a project-wide convention, not a per-surface call. The chip shows one real number or it shows absence.

5. **`auto` is a quiet marker cleared by a deliberate act.** Auto cards look like normal deck cards with one low-contrast marker. **Inspection is not endorsement** — opening the modal leaves the flag alone. The flag clears when the user keeps the card explicitly, and the card is gone if they remove it. **Clear all auto** sweeps only what is still untouched.

**Derived — flagged as derived, so it can be objected to:**

6. **The mana base prefers owned nonbasics, then fills with basics.** Basics are effectively unlimited, so they can always close the gap and must **never** enter Shopping. This follows from ruling 2 plus the fact that a basic land is not a purchase; it is called out because it is the one place ruling 2's "top up with unowned" does not apply.

7. **Surface A gets no per-chip add control.** Role Coverage is pre-deck: there is no deck to add to. The path from "good fit" to acting on it — #131's third gap — is "Build this deck", now that it builds something.

**Also locked, from elsewhere:** brand tokens and the richness baseline; the Kitchen Table voice; the existing Card Detail modal's dismiss and focus behaviour; the All / Shopping split being computed from ownership rather than stored as a status.

---

## §9 Open — propose options

1. **Chip density on surface A.** A figure per chip is a real density change to a flex-wrap of bare names, and it lands hardest on a phone. Propose the treatment — inline, a second line, a bar, something else — and show the long-role case from state 6.
2. **How the `auto` marker reads.** Ruling 5 fixes the semantics, not the drawing. It must be visible enough to prune by and quiet enough to live with across 68 rows.
3. **Where Clear all auto lives**, and whether it is destructive enough to confirm. Note the shipped undo row from PR #204 — if that pattern extends here, say so; the addendum already flagged a question about whether its long life reads as clutter in a 99-row list.
4. **How the fill announces itself on arrival.** The user pressed one button and got 68 cards. One line, a moment, or nothing at all.
5. **The to-buy card's treatment in the decklist and in Shopping.** The shipped `buy` tag (`src/components/decks/buy-tag.tsx`) exists — does it carry this, or does a fill-generated shopping list want more?
6. **Whether the role counter strip changes** now that a deck arrives at baseline rather than climbing to it. Its whole drawn language is about a gap closing.

---

## §10 Viewports + a11y baseline

- Mobile and desktop parity; both ship in the same PR.
- Chips become interactive controls — they need a real accessible name (the card name plus its figure, or the figure marked as supplementary), a visible focus ring meeting the brand contrast floor, and a tap target that survives the density chosen in §9 item 1.
- Modal: focus trap, Escape, first-focusable, and focus returned to the originating chip. Match the shipped `card-detail-provider` behaviour.
- The `auto` marker must not be carried by colour alone.
- WCAG AA minimum; the brand sheet's contrast floor governs.
- Clear all auto removes many rows at once — say what is announced.

---

## §11 Deliverables

Target folder: **`design/design_handoff_the99_recommendations/`**, mirroring `design/design_handoff_the99_add_panel/`.

- `The 99 - Recommendations.dc.html` — hi-fi mocks, mobile and desktop, covering **every** state in §6.
- `README.md` — decisions log marking locked vs tentative, plus a gap report.
- `recommendations · copy strings.ts` — every string, production-final.
- `brand/` and `support.js` per the folder convention (`support.js` is a runtime dependency of the `.dc.html` previews).
- Prefer one component with variant props over separate components.
- A max-rendered / density recommendation for the long-role case, so eng can choose virtualization or plain overflow.

---

## §12 Sequence

1. Design reads this brief and **restates its interaction and copy assumptions in chat before building.** Cheaper to correct a bullet than a mockup.
2. R1 lands → readiness audit against §8's locked decisions.
3. Audit verdict → `design/design_handoff_the99_recommendations/READINESS.md`.
4. Green or Yellow → plan PR, **gated on the recommendation foundation from §0 having merged.**

`design/design_handoff_the99_add_panel/` reached 🟢 Green, and `design/design_handoff_the99_printing_picker/` reached 🟢 at R3. One-pass Green is achievable here: the data shapes already exist, the modal already exists, and the roster function already exists.
