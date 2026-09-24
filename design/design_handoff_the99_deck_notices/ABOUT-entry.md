# About entry: `deck-notices` (launch batch)

Filled §G template (`design_handoff_the99_about/STATES-about-r3.md`), drawn on the canvas at §2c. **Joins the
analysis tab's launch batch** (`design_handoff_the99_analysis_tab/ABOUT-entry.md`): same bump, `ABOUT_VERSION`
9 → 10, `since: 10`. Entries 36 → 37. One re-pin of `about.version.json`. The brief's §7 left this entry
undrawn; it is drawn at Hugh's instruction.

| Slot | Value |
|---|---|
| **id** | `deck-notices` |
| **Title** | When the cards change under a deck |
| **Route** | `/decks` |
| **Opens** | opens a deck |
| **Chapter** | 03 · Building the 99, directly after `deck-analysis` |
| **Width** | plate |
| **since** | 10 |

**Caption**

> The bracket on a deck holds until you re-analyze it, even when the world moves. A card joins or leaves the
> Game Changer list, a card starts or stops counting as mass land denial or extra turns, Commander Spellbook
> adds or removes a combo among your cards, or the bracket rules themselves change. When one of those touches
> a deck’s own cards, a small notice sits after its bracket on the deck page and its tile. Open it to see what
> changed, card by card, and decide whether to re-analyze.

**Key lines** (4 of 4)

1. reading the notices quiets them; they stay one tap away until you re-analyze, and leave the tile.
2. a notice never re-analyzes, never marks the deck as changed and never says whether the bracket would move.
3. the Re-analyze banner is about your own edits. A notice is about everything else.
4. a card that is not legal in Commander, or sits outside your commander’s colors, is a notice too. It stays until the card leaves, and while it stands the overview is not written, so no credit is spent on it.

**Specimen**: `NoticesBody` at the plate width (the 2a fixture trimmed to four groups: Not legal, Game
changers, Two-card combos, Bracket rules) above one header chips row (status pill, `BracketChip`, the tag).

**Fixture props**: `fixtures.deckNotices`

```
deck           HD - Yuriko · permits [4] · analyzed 18 Sept
groups         notLegal [Mana Crypt] · gameChangers added [Mystic Remora] 21 Sept
               combos added [Thassa's Oracle + Tainted Pact] "win the game" 22 Sept
               rules  "Game Changer limit" · "Upgraded now allows up to four…" 23 Sept   ← fixture rule, not a real change
tag            notLegal · unread
```

**Phone reduction**: the sheet body full width, the direction column 56px, dates stay on the row. Must not:
drop a date, abbreviate a group label, or draw direction as + / −.

**Strings from**: this package's `deck-notices · copy strings.ts` and `copy/deck-analysis.ts` (finding labels).
Queued for `/copy-review`; no em dash.
