# Design Brief: How the app reaches its answers

**Date:** 2026-09-28 · **Branch:** `docs/about-how-it-works-brief` · **Needs Hugh's review before merge.**
**Asked by:** Hugh wants a section on `/about` that explains how the app reaches its answers under
the hood, as a way to help players understand the app.
**Source:** the companion inventory `2026-09-28-how-it-works-inventory.md` (read on `main` at
`40a6f298f`). For every computed thing a player sees, it gives the source, method, cadence,
exactness, file:line, and whether About already covers it. Every figure below was re-read against
the code on `origin/main` at `911e97aa6` before being carried here.

## §1 Goal

A player can see where any answer the app gives them came from, how it was decided, how fresh it
is, and what it might miss.

## §2 Rows

Rows are grouped by what the app DECIDES, never by data source. Each row states four things:
where the answer comes from, how it is decided, how often it refreshes, and whether it is exact or
partial, with the misses named.

| # | What the app decides | Where it comes from | How it's decided | Refresh | Exact or partial |
|---|---|---|---|---|---|
| 1 | **Brackets**: the slot, and its four counts | The WotC bracket rules, transcribed. Game Changers from Scryfall's `game_changer` field. Land denial and extra turns from Spellbook's estimate plus our reading of the rules text. Two-card infinites from Spellbook's variants. Tutors from the rules text | The lowest bracket the deck satisfies. 1–2 and 4–5 stay ranges, and the player declares within them. Whether a deck sits at 3 or 4 is decided by whether its tutors (or the command zone) reach every piece of a combo | Computed when Analyze is pressed, and stored. It goes stale on an edit, never with time. Scryfall and Spellbook data refresh weekly; the rules and our readings change only with the code | Game Changers are exact. Land denial is 22 of 24, missing Wave of Vitriol and Cataclysm. The extra-turn reading has no misses among the 56 cards that mention one, but the loop check misses a card looping on itself (Nexus of Fate). Combos miss three-or-more-card combos and printing-specific ones. Tutors have no stated accuracy (§5) |
| 2 | **Roles and targets**: Ramp, Draw, Removal, Wipes, Land, and the "12 ramp against 10" strip | A card's role comes from its rules text and type line. Targets come from EDHREC's support lists, weighted by inclusion | Each role is a pattern read of the rules text, and a card can hold several. The deck's targets follow a chain: pair, then commander, then colour identity, then colour count, then the flat 10/10/8/3 and 37 lands, and the strip says which rung it used. The commander page's Role Coverage and the "Why this commander" thinnest role use the flat 10/10/8/3 only (§5) | Roles are live. The deck's targets update monthly; the flat ones never move | Roles are partial, with no miss rate stated. The deck's targets are measured, falling back to flat |
| 3 | **Themes**, which are two systems | Commander themes are EDHREC's tags. A card's themes are 21 patterns read from its rules text | Commander themes feed Discover's gap line, Help me choose and "Something new"; "played" counts every deck you have, brews included. Card themes feed only stand-ins and Find a deck | Commander themes update monthly. Card themes are live | Commander themes are exact to EDHREC. Card themes are partial, with no miss rate stated |
| 4 | **Commander recommendations**: the fit score, lanes, Discover and Ready to build | Your collection, plus EDHREC's support list | Fit = Pool 15 + Roles 25 + Synergy 60. Pool is full at 200 legal cards. Synergy is owned support ÷ EDHREC's total. The score is out of 40 when EDHREC has no list. "Something new" requires owning 30% of the support list. Ready to build is drawn from the top 28, and the two shown change daily at UTC midnight | Your collection is read live. The list updates monthly | The arithmetic is exact. The Roles part uses flat targets (§5) |
| 5 | **Availability and claims**: free, in a draft, none free, short N | Your collection and decks, plus your assignments and pulls | A committed deck claims from its newest version. A deck never committed claims softly from its live list. Commanders count as claims. Seniority is per card. Your assignment overrides seniority | Live | Exact |
| 6 | **Prices** | ManaPool's singles feed | One printing per card: a live row first, then non-foil stock over foil, then the cheapest | Weekly, Monday 09:00 UTC | Exact to the feed. A card with no price was never stocked, foil-only is a real state, and sold-out means the newest row is from an older run |
| 7 | **Stand-ins and Find a deck** | Rules text, the deck's colours, Spellbook, card themes and EDHREC synergy | A stand-in shares a job at the same or lower mana value. A card with no role gets no stand-in. Find a deck orders: completes a combo, then joins a theme, then EDHREC synergy, then name. A staple's decks are listed by name alone, because its figure is about every commander | Live | Partial, through the role and theme readings |
| 8 | **Model-written text and credits** | Anthropic models: the "Why this commander" sentence, the Overview, Suggested changes, and Look deeper | In the Overview and Suggested changes the figures are the app's and the model only phrases them. Look deeper maps your words onto the app's own theme, card, budget and bracket chips, never suggesting a commander. All model output is validated. A sentence that fails the checks is never shown. Credits: owner 10 and friends 3 per rolling 24 hours, one allowance shared by the Overview, Suggested changes and Look deeper. Only a successful answer spends one. The commander sentence is written by a scheduled job and costs the player nothing | The commander sentence updates monthly. The Overview and Suggested changes are written on a press, and the Overview is reused until the list changes | Not exact or partial: written |

## §3 Locked

- **Four methods, and every row names one or more:**
  - read from the card's rules text;
  - measured from other players' decks, with EDHREC and Commander Spellbook named;
  - written by a model;
  - your own input.
- **Nothing is new as a score or percentage.** The fit score is the only score, and it already
  exists.
- **Card labels are excluded** until something in the app reads them. Nothing does yet.
- **The words go through `/copy-review` after Design.**
- **It rides the next batched `ABOUT_VERSION` bump.** It is reference content, not a new
  capability, so it gets no bump of its own.

## §4 Open for Design

1. **Placement:** a fifth chapter, a closing appendix, or its own page reached from the intro.
2. **How the four methods are marked.** The marks should be reusable later in the Analysis tab's
   "How we make these decisions" sheet. That sheet is the precedent to mirror:
   `src/lib/copy/deck-analysis.ts:513-574`. Its `detection` rows each carry a `from` line, and three
   carry a `misses` line. Game Changers deliberately has none, because it is exact, and that
   contrast is what shows the others as partial. Its `provenance` block is the sheet's lead and
   source instead.
3. **Links from entries:** whether each feature entry links to its row.
4. **The phone reduction.**

## §5 Truth defects the inventory found (engineering's, not Design's)

1. **The Game Changer source.** The "How we make these decisions" sheet says "Wizards publishes
   the list, and we check your 99 against it" (`deck-analysis.ts:539`). The code reads Scryfall's
   `game_changer` field (`scryfall/transform.ts:69`). Scryfall carries Wizards' list, so the count
   is right, but the sentence names the wrong reader.
2. **EDHREC is read at two ages.** The stored index (targets, tags, staples, the fit score's list)
   is rebuilt monthly and fetched uncached, so it is at most a month old (`seed-index.ts:353`).
   The live readers (the fill, the deck page's suggestions, recommendations) go through a separate
   30-day payload cache (`client.ts:8`, `:55`). So one commander's figures can come from two
   snapshots. This corrects the inventory's "up to ~60 days": `client.ts:100-102` is the comment
   explaining why the index skips that cache.
3. **"Staple" means two things.** The fill's "staples you don't own" are EDHREC's top cards for
   the commander (`decks/suggestions-read.ts:92`). "Staple" in Find a deck and Change commander
   means the `format_staples` table.
4. **Three surfaces use the flat role targets** (`ROLE_TARGETS`, 10/10/8/3): the fit score
   (`recs/score.ts:167-171`), the commander page's Role Coverage headers ("N short of baseline",
   `commanders/coverage-section.tsx:141`), and the "Why this commander" thinnest role
   (`recs/weakest-role.ts:29`). The deck's role strip, the fill and Find a deck use the measured
   ones.
5. **The tutor classifier's accuracy is stated nowhere.** The sheet gives the other three bracket
   counts their `from` and `misses` lines and has no tutor row.
