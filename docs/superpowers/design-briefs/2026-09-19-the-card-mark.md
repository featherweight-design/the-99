# Design Brief — The card mark (Round 1 of 5)

**Date:** 2026-09-19 · **Branch:** `spec/deck-analysis-foundation`
**Spec:** `docs/superpowers/specs/2026-09-19-deck-analysis-foundation-design.md` §7.1, §11.1
**Status:** QUEUED — fires when Round 0's audit lands. Drafted early so Design never idles
between rounds; nothing here depends on Round 0's frame beyond the fact that it exists.

Round 1 only. The verdict, the declaration and the push line are Rounds 2–4.

## §1 The ask

Three standing facts about a card — **Game Changer**, **mass land denial**, **extra turn** —
drawn wherever a card already appears: a collection tile or row, a decklist row, the card
modal. Both widths. This is the round that fits into EXISTING surfaces rather than designing
new real estate, which is why it is small and why it unblocks Rounds 2 and 4, both of which
reference the mark.

It answers a question a player has before any analysis surface exists: *which of my cards are
Game Changers?* — the thing checked before a Rule 0 conversation.

## §2 What the facts are, so the mark claims no more

- All three are **facts about the card with no deck in scope** — true on a collection tile
  for a card sleeved nowhere.
- **Game Changer** is WotC's own list, ~53 cards, refreshed weekly from Scryfall. The
  authoritative membership, not a judgement.
- **Mass land denial** and **extra turn** are classified by two sources (Spellbook's index
  plus our own rule implementing WotC's published definition), and detection is measured and
  *partial* — a card can be the thing without carrying the mark. Round 2 owns the sentence
  that says so; Round 1 should not imply completeness (e.g. avoid an "MLD-free" positive
  claim anywhere).
- Rarity, in practice: most decks hold zero or few marked cards. The mark is an exception
  glyph, not a per-row column.

## §3 Constraints from shipped rulings

- **A signal the owner cannot read is not a signal.** A wordless mark must be checked against
  the surface's existing conventions and its weakest contrast measured BEFORE the build — the
  deck-status marks shipped wordless and were retired in a day. Words or a glyph is Design's
  call; the lesson is on record.
- Card rows and tiles already carry: ownership state, availability markers, buy tags, mana
  pips, printing captions. The mark must not collide with any of those, at 390 px, in the
  row's densest state.
- No copy invents a threshold. "Game Changer" is a proper noun from the rules; the other two
  are the rule's own names.
- Mobile and desktop ship together.

## §4 What engineering has ready (Tier A, building now)

`game_changer` rides on the card row everywhere; the other two flags cost one join, already
wired into the card-detail read (`bracketFlags`, null-safe — a failed read means the modal
omits the block). Whatever Round 1 picks, the data is a prop by the time the handoff lands.
The browse list's payload does NOT carry the two joined flags yet — if Round 1 wants the mark
on collection tiles (not just the modal and deck rows), say so in the handoff and engineering
widens that read as part of the Tier B build, with the payload-ceiling arithmetic done there.

## §5 Open for this round

1. The mark itself — glyph, word, or both; one mark with three states or three marks.
2. Where it appears: row, tile, modal — and where it deliberately does not.
3. The modal's fuller treatment: the modal has room for the fact's name and, for the two
   classified facts, its provenance ("flagged by both sources") — does Round 1 want that, or
   does provenance wait for Round 2's detection language?
4. The empty case: most cards carry nothing — confirm the mark's absence IS the design, no
   reserved space.
