# Design Brief: Change commander (sub-project 7, #215)

**Date:** 2026-09-24 · **Branch:** `docs/alt-commander-brief` (approved by Hugh, 2026-09-24)
**Rulings:** Hugh, 2026-09-24, in the scoping conversation for this brief (§2). Ruling 5 is his
standing instruction for sub-projects 7 and 8, relayed by the orchestrator the same day.
**Specs:**
- `docs/superpowers/specs/2026-09-19-deck-analysis-foundation-design.md:27` lists #215 as "deck facts
  + support index", with no model. §14 row 7 (`:2272`) names it without specifying it.
- `docs/superpowers/specs/2026-08-29-recommendation-foundation-design.md:20` scopes #215 as a
  "Commander audit" over "one deck's 99". This brief departs from it on two points (§5).
**Design ticket:** #221, "audit a built deck's commander and offer alternatives"
(`docs/superpowers/design-pipeline-status.md:315`). This brief supersedes its audit framing (ruling 1).
**Frame:** the deck page's header, where the commander already sits (`src/components/decks/spine-desktop.tsx:128`,
its full-card trigger at `:222`; `spine-mobile.tsx:60`).

**Verified against `origin/main` at `435be070`.** Every file:line below was read on that commit.

This round asks: **how does a player who likes their 99 put a different commander at its head, and
see which candidate fits the deck they already have?**

---

## §1 What this is

A deck's commander cannot change today. It is written only when a deck is created or imported
(`src/app/decks/actions.ts:355`, `:433`; `import-actions.ts:241`), and updating a deck from a list that
names a different commander or partner is refused (`src/lib/decks/update.ts:111-125`). A player whose
commander has gone stale, become the table's archenemy or been banned must start a new deck.

This feature offers commanders who can lead the same 99 without changing a card: the same color
identity, and the same number of commanders. It shows how much of the deck each candidate's own decks
play, and it swaps the leader as an ordinary draft edit.

**Prior art, and where it falls short.**
- **No tool ranks commanders against an existing decklist.**
- **The closest method is EDHREC's "Unified Front"** article (MtGDS, Oct 2022). It finds commanders
  whose decks share cards, and groups them by color identity, which is the same limit this brief takes.
  It is a one-off analysis, not a tool. It ignores the player's own list, and it leaves out partners.
- **EDHMatch** matches commanders to a player's taste from a quiz.
- **DeckCheck and Recommander** suggest cards, never commanders.
- **None of them knows what the player owns.**

## §2 Rulings, locked (Hugh, 2026-09-24)

1. **The use case is a new leader for the same deck.** The player likes the 99 but not the commander.
   The feature is an action, not an audit report.
2. **Only commanders in the deck's exact color identity.** A candidate never forces a card out. Hugh
   rejected wider and narrower identities: a swap that cuts cards and needs refilling "effectively
   creates a brand new deck".
3. **Like for like.** A single-commander deck sees single commanders. A partner-pair deck sees pairs
   whose combined identity equals the deck's. The body never changes size.
4. **Each candidate shows how much of this deck its own decks run** ("41 of 62 are in its decks"), and
   the list is ordered by that figure. Candidates the player owns come first, marked free. Unowned
   candidates follow with a buy tag and price. An owned commander whose every copy another deck
   claims shows the usual held mark, not free.
5. **Universal staples do not count toward the figure.** Every commander's decks run Sol Ring, so it
   says nothing about fit. The app is getting one shared definition of a universal staple, derived from
   `format_staples` (a staple in at least 12 of 16 conditions; today Sol Ring, Arcane Signet,
   Swiftfoot Boots, Reliquary Tower and Rogue's Passage). This feature reads that definition and keeps no
   list of its own. Basic lands are left out the same way. The figure counts the deck's distinct
   non-basic cards other than universal staples, so a typical deck reads something like "41 of 62".
6. **Taking one swaps in place, as a draft change.** A confirm step comes first, and the swap then lands
   in the draft like any edit. Each version already stores its own commander (`src/db/schema.ts:455-456`).
7. **The door is on the deck page's commander:** a "Change commander" action in the header. It is not
   an Analysis-tab section, because a swap is an edit.

## §3 What Design is asked to draw

Both widths, 390 and 1300, for everything below.

### 3.1 The door

"Change commander" on the deck header's commander, at both widths. The header already carries the
commander's name, identity pips, full-card trigger, bracket chip and status. Draw it on a single
commander and on a pair.

### 3.2 The candidate list

Each row shows:
- the commander, or the pair, whose name opens the card as names do everywhere;
- the figure: "41 of 62 are in its decks";
- ownership: free, a held mark when every copy the player owns is claimed by another deck (the usual
  availability marks), or a buy tag and price.

Owned candidates lead, and each group is ordered by the figure. Ties go alphabetically. A row can open
the deck's cards its decks run, so the player can see what the figure counts.

Draw a Gishath deck (Naya) with owned and unowned candidates, and a pair deck with pair candidates.

States:
- several candidates;
- only unowned candidates;
- none: nothing else shares this identity, or none for a pair;
- a candidate the index has no decks for, which is possible for an owned commander, shows "no deck
  data" instead of a figure and sorts last in its group;
- a candidate already in the deck's 99 (§3.3);
- loading and failed.

### 3.3 The confirm step

Before the swap, the player sees the old commander out and the new one in. When the new commander is
already one of the 99, **the two trade places**: the new one moves to the command zone and the old one
takes its slot. The body stays whole. Otherwise the old commander leaves the deck. Cancelling changes
nothing. Also draw the swap failing after confirm.

### 3.4 After the swap

The deck page under the new commander, with its pending draft. This includes the header, its art
band (the commander's art is the band, `spine-desktop.tsx:3`), and the draft banner. Draw what the
review page (`/decks/[id]/changes`) shows for a commander change.

## §4 Open for Design to call

1. **What the door looks like:** a control on the commander line, an item in an existing menu, or
   something else. It must work at 390, where the header is tight (`spine-mobile.tsx:77`).
2. **The list's container:** a sheet, a `ModalChrome` body (`src/components/decks/receipt-modal.tsx`)
   or a page.
3. **How long the list runs.** A common identity (mono-green) can have hundreds of candidates, so
   Design picks a cap, "show more", or search.
4. **How a row opens the cards its figure counts:** inline or in a nested view.
5. **How a pair reads** in a row and in the header's door.
6. **Where the commander change sits** on the review page relative to the card diff.

## §5 Locked, and not open

- **No model.** The figure comes from the deck and the commander index.
- **No score.** The row shows one fact, its figure. A commander's rank, popularity or price never moves
  its place.
- **Exact identity only, like for like.** No candidate ever requires a card to be cut or added.
- **Nothing happens without the confirm step.**
- **The current commander is never its own candidate.**
- **Departures from the recommendation spec**, ruled by Hugh:
  - Its "identity-safe by default with a deliberate toggle" (`:566`) becomes identity-safe with no
    toggle.
  - Its three axes (`:567`) become one, because two of them (what the deck keeps, and castability) are
    constant when the identity does not move.
- **Not in this feature:**
  - wider or narrower identities;
  - copying a deck into a new one;
  - a commander for a deck that does not exist yet (sub-project 8);
  - EDHREC's precomputed "similar commanders" graph (`commander_support.similar_oracle_ids`,
    `schema.ts:905`), which ignores the player's list.

## §6 What engineering owns (not for Design)

All of it is deterministic, with no model call.

- **The commander write is new.** No application code changes `decks.commander_oracle_id` or
  `partner_oracle_id` after insert (`schema.ts:277`, `:281`); only probe scripts do.
  - The swap is one transaction: the commander columns, the trade of places when the new commander was
    in the 99, and `touchDeck`.
  - `planDeckUpdate`'s refusal (`update.ts:111-125`) stays for imports, where a changed commander
    still means a different deck.
- **The draft does not know commanders.** `draft-diff.ts` and `draft-state.ts` compare `deck_cards`
  rows only, and `restoreDraftFromVersion` (`src/lib/decks/versions.ts:268`) restores only `deck_cards`.
  - A commander change needs its own entry in the diff, the review page and Discard.
  - Discard restores the version's commander columns (`schema.ts:455-456`).
  - A brew has no version to discard back to. There, the confirm step says the swap can only be undone by
    changing commander again, and that is the only behaviour this brief asks for on a brew.
- **Claims.** Other decks see a committed deck's claim through its newest version's commander
  (the newest-version read at `src/lib/decks/availability-query.ts:49-58`, the commander arms at `:92-97`), so a swap moves that claim at commit. The deck's own
  draft ask and a brew's claim (`:107-115`) read the live columns and move at once. The new leader's `commander_since`
  (`schema.ts:460`) starts at that commit.
- **Candidates:**
  - **Singles:** `cards.commander_legal` (`schema.ts:43`) and a legal-commander type. The identity is
    equal to the deck's, and the card is not the current commander.
  - **Pairs:** rows of `commander_pair_support` (`schema.ts:1021`), which exist only for pairs EDHREC
    has seen, so both halves are a legal pairing. The union of the two identities equals the deck's.
  - **Owned commanders** come from the collection whether or not the index has them. That is the
    "no deck data" state.
  - A reverse query over the card index (`commander_support_cards_oracle_idx`, `schema.ts:1003`), filtered
    to the identity, finds indexed candidates without scoring all of them. Nothing reads that index
    card-first yet.
- **The figure** is the deck's cards, less the universal staples, that appear in the candidate's
  `commander_support_cards` rows (`schema.ts:992`), or in `commander_pair_support_cards` (`:1071`) for a
  pair.
  - It counts distinct cards, and it drops basic lands from both sides explicitly. Support lists do
    hold basics (on staging, `commander_support_cards` carries more than 1,000 rows for each basic
    type), so a query that forgets this credits nearly every candidate with the deck's basics.
  - **Known bias:** a heavily indexed commander has a longer support list, so it can reach a higher figure.
    This brief accepts that as the cost of reporting a plain count. Hugh may overrule it.
- **Price:** the cheapest printing stocked now, the same rule as the stand-ins brief
  (`2026-09-24-small-swap-tools.md` §3.0).
- **The analysis follows the edit.** `touchDeck` marks the stored analysis dirty, like any edit.

## §7 Sequence

This brief waits for Hugh's approval before it goes to Design. It depends on the shared universal-staple
definition (ruling 5), which the orchestrator is sequencing. The commander write, the draft's commander
entry and the candidate query are Tier A and can build before the handoff. The surfaces wait for
READINESS. The About entry is batched with the rest of the analysis line's entries at launch.

Design ticket #221's row (`design-pipeline-status.md:315`) still describes the audit framing, and this
lane passes that to the orchestrator.
