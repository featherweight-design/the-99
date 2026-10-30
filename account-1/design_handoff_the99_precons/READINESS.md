# READINESS: Commander precons (R1)

| Area | Ready | Note |
|---|---|---|
| /decks head (P1) | high | Reuses the approved cart line, adding one cell |
| New deck door (N1) | high | `HelpMeChooseDoor` verbatim, with new copy |
| List (L1–L4) | medium | Shell and chassis are shipped. The per-precon count query is new (G5) |
| Open precon (O1–O3, V1, V2) | medium | `DecklistGroup` needs a `readOnly` path (G9) |
| Start + arrival (S1, S2) | medium | Needs a new server action (G8) |
| Copy | low | All placeholders until `/copy-review` |

## Gap report

- **G1 · Fixture names.** The brief gives each precon's name, set and count, and four commanders (Kilo, The Wise Mothman, Ghoulcaller Gisa, plus Ulalek, Teval and Dogmeat, which are known). Commanders written as `‹FDC commander›`, `‹FRC commander›`, `‹MSC commander›` and `‹SOC commander›` are unknown. Every card name, group split and set number is illustrative. **Food and Fellowship (LTC, Frodo + Sam) is assumed** to be one of the five multi-commander decks. The read-only script should name the five, export each fixture's commanders and per-type split, and R2 will redraw with true rows.
- **G2 · The "shared" rule.** Proposed: a deck matches a precon when its commander oracle ids equal the precon's, and at least 75% of the precon's non-basic cards are in the deck's current list (draft included). Shown as `N shared`, the count of the precon's non-basic oracle ids in the deck. It's computed at read, never stored. Hugh's six HD Tune decks should all match. A probe should confirm no false match on a shared commander with a different list.
- **G3 · Twin key.** Lock 2 keeps no twin field. Proposed: at ingest, decks with an identical multiset of (oracle id, count, commander flag) group together, and the representative is the name without `Collector's Edition` (or else the earliest `fileName`). This needs one derived `twin_of` column, or a read-time grouping. The twin's route redirects to the representative.
- **G4 · The figure's denominator.** `of` = the distinct non-basic oracle ids that mapped, commanders included. Basic means the five basics plus Wastes, and snow-covered basics, by type line `Basic Land`. A card that didn't map is out of both figures and named (STATES O4, R5).
- **G5 · The list query.** Lock 6 computes ownership at read. 185 counts in one query: `precon_cards` (distinct non-basic oracle ids per deck) left-joined to the player's `collection_items`, grouped by deck. The route needs `cachePageForUser` keyed on the collection's write stamp, and a `check:list-cache` entry.
- **G6 · Leave out the unowned (Q6).** Not drawn. If Hugh wants it, it's one select in S1: `Leave out the 11 I don't own` (select / unselect), and the facts line becomes `89 cards · 11 left out`. That would make a draft under 100, which is legal for a draft.
- **G7 · Feature switch.** `PRECONS_ENABLED` gates the /decks line, the New deck door, both routes and the About entry. It needs a new `AboutSwitch` member.
- **G8 · Creating the draft.** `createDeck(commanderOracleId, name, selectedOracleIds, partnerOracleId)` takes oracle ids with no counts, so 15 Wastes can't pass through it. It would also trust a client list. Proposed: a new action `createDeckFromPrecon(fileName, name)`. It reads the precon server-side, writes the commander(s) and the feed's exact entries with counts (lock 7: never assumes 99), takes no printing (Q3), runs `requireMember`, and redirects with `?from=precon`. The legality pass skips as `createDeck` does. On the current feed it skips nothing.
- **G9 · `DecklistGroup` read-only.** It needs `readOnly` (or a `PreconGroup` wrapper) that drops the row's buy tag, lock, claim and menu, takes a `print` label for the right slot, and keeps `siblings` for details Prev/Next. `deckId` is null, so card details must render without deck actions.
- **G10 · Card details on a precon printing.** Details open on the feed's `scryfallId`. Its art is the catalog's printing art, already in `printings` (all 14,335 mapped).
- **G11 · "Tab" in ruling 3.** It's drawn as a route reached from a line on /decks, sharing the head with the cart. If Hugh meant a literal tab, /decks would gain a tab bar that nothing else there has, and the shelves would sit under one tab. Design recommends against that. **Hugh to confirm.**
- **G12 · Arrival flag.** `?from=precon` drives the strip once, and dismissing it writes a per-deck dismissal, as the import strip does. If the import strip keys on an import id, the precon strip needs its own source.
