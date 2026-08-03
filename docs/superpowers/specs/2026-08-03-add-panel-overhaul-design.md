# Deck builder Add panel overhaul — design brief

**Ticket:** #158 · **Workshopped:** 2026-08-03 · **Status:** brief locked, awaiting Design handoff

## Problem

The builder's Add panel is a 340px right-hand column on desktop and a bottom sheet on mobile, with two tabs — Suggestions and Search. Each suggestion is one line: an ownership dot, the card name, a reason chip, an Add button, and the word "owned" or "not owned" underneath.

The panel does two unrelated jobs in one lane sized for neither. **Search is retrieval** — the player knows the card and wants it in the deck in under a second. **Suggestions is discovery** — the player does not know the card, and a bare name with no art, no type, no cost and no role is close to unusable. Suggestions is the app's differentiator and it is the thing rendered with the least information.

Four findings from Hugh's 2026-08-02 staging walk, all on this surface:

1. There is no way to tell which suggestions are creatures and which are ramp.
2. The role "Other" is presented as though it were a role.
3. The 340px column hides card detail and truncates names.
4. There is no owned/unowned filter.

## What already exists

Design does not need to invent these, and should reuse rather than re-solve:

- **Card art is available and free.** `PoolCard` already carries `imageUri` (`src/lib/recs/score.ts:6`); `src/lib/decks/suggest.ts` drops it when building `DeckSuggestion`. The search path selects `cards.imageUri` server-side then maps it away (`src/app/decks/[id]/search-action.ts`). Surfacing art on either path is a field, not a backend project.
- **An art pattern is already shipped.** `src/components/commanders/rec-card.tsx` renders card art at 36×50 mobile and 63×88 desktop, with a `commanderGradient()` fallback when `imageUri` is null.
- **Type and role are already on the payload.** `DeckSuggestion` carries `typeLine`, `cardTypeGroup` and `role` (`src/lib/decks/suggest.ts:19-21`). Surfacing them is presentational only.
- **A card detail modal already exists.** `src/components/decks/card-detail-provider.tsx` mounts above the whole builder tree and opens a modal with full art, formatted oracle text, and the printing picker. Design should not re-solve "see the card properly" — but should decide how a suggestion invites it.
- **The role counter strip already tells the player what the deck lacks.** `src/components/decks/role-counter-strip.tsx` shows Ramp · Draw · Removal · Wipes · Land against targets. Today it sits in the main column while the suggestions that would fix a gap sit in a separate rail, ungrouped by role.

## Evidence from comparable products

Researched 2026-08-03. Verified against Archidekt, EDHREC, Moxfield and Deckstats; TappedOut, MTGGoldfish and Scryfall could not be verified and are excluded.

- **Established builders ship two speeds, not one surface.** Archidekt names them: a text-only quick-add bar pinned to the deck page that deliberately loads no images, plus a separate search modal with art and drag-and-drop. Moxfield splits inline editor autocomplete from a separate advanced search page. Ours collapses both into one column.
- **Recommendations are treated as a visual task.** EDHREC — the nearest analogue to our Suggestions tab — is entirely art thumbnails grouped into functional boxes (ramp, removal, draw, lands), with an add affordance revealed on hover and tapped on mobile.
- **Recommendations are a tab inside the search surface, not a rival to it.** Archidekt's EDH Recs sits alongside its other search modes. Our two-tab split matches an existing pattern; what does not match is the width.
- **The justification is quantitative and two-dimensional.** EDHREC labels a card with inclusion percentage *and* a synergy/lift figure — popularity and distinctiveness to this commander are different claims. We show a single qualitative chip.
- **Adjacent products put proposals inside the artifact.** Spotify appends recommended tracks below the playlist being edited, in the playlist's own row format, rather than beside it in a sidebar. The most common complaint about that surface is suggestions going stale after one is accepted.

## Constraints — locked

- **Mobile and desktop parity in the same pass.** The current mobile sheet exists only to impersonate a desktop-only rail. Whatever replaces it should not require a construct that exists at one width only.
- **Art is on the table** at both widths, at no backend cost. It is not required, but "we can't show art" is not a reason.
- **The card detail modal is the answer to card detail.** Design decides the invitation, not the destination.
- **Suggestions must not go stale on accept.** Accepting a suggestion must not leave a dead row or a list that no longer reflects the deck.
- **Optimistic-first.** Adding a card draws immediately and only reverts on server error (`src/components/decks/use-deck-mutation.ts`). Any new add affordance inherits this.
- **One palette** — Palette A "Table Candlelight." Tokens per `src/app/globals.css`.
- **Voice: Kitchen Table**, locked verbatim in `design/design_handoff_the99_richness/README.md`.

## The role taxonomy, including "Other"

There are two different "Other" labels and only one is the problem.

`cardTypeGroup: "Other"` (`src/lib/decks/read.ts:53`) is a genuine and rare residue — Tribal and similar oddities. It is fine.

`role: "other"` (`src/lib/decks/grouping.ts:65`) is the problem, and it is **the largest group in almost every deck**, because it catches everything that is not ramp, draw, removal, a wipe or a land. That is the deck's win conditions and its entire commander synergy package, filed under a label that means "unclassified."

**Proposed position, open to Design's revision:** the five roles are not a taxonomy, they are a *coverage checklist* — quantities a deck needs enough of. Everything else is not leftover; it is the deck's gameplan. The group should therefore not be named for what it lacks. The direction is something like "Threats & synergy," with the role strip framed as coverage rather than classification.

Splitting that group further — threats vs. protection vs. tutors — would require new classification logic that does not exist today. Out of scope here; a candidate for a later phase.

## Open for Design to call

The brief deliberately does not pick a layout. These are the decisions:

1. **Do search and suggestions stay one surface, or become two?** If two, what is each one's shape?
2. **Where does discovery live** — main column beneath the decklist, a full-width panel, an overlay, its own step? The 340px rail is not assumed to survive.
3. **Information hierarchy of a suggestion row or tile** — art, name, type, role, mana cost, reason: which of these, in what order, at what density, at each width?
4. **How the suggestion invites the card detail modal.**
5. **Owned/unowned filter** — placement, and its default. Note the product premise is building from what you own.
6. **What replaces the qualitative reason chip.** Inclusion percentage is available from EDHREC data; a synergy/lift figure is not currently computed. Design should say what it wants and we will confirm what is honestly available.
7. **The label and framing that replace role "other"**, per the proposed position above.

## Out of scope

- Splitting `role: "other"` into finer roles — needs classification work that does not exist.
- Changing the suggestion algorithm itself (`src/lib/decks/suggest.ts`). This pass is presentation and information architecture.
- Deck import (#42), which is its own brief.
- The decklist's own grouping controls, except for the role label rename above.
