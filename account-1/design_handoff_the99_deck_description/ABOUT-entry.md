# About entry: `suggested-changes` (H35, ruling 7)

A filled template in the format of `design_handoff_the99_analysis_tab/ABOUT-entry.md`. Artboard: canvas **1l**.
Copy is **queued for /copy-review**. There are no em dashes, and apostrophes are `’`.

**The bump.** `ABOUT_VERSION` 9 → **10** (`about.ts:41`), with one re-pin of `about.version.json`'s hash. Entries go 46 → 47.
Hugh ruled the bump (ruling 7). Note the tension with the file's own convention: a switched entry is announced by its switch, not by a bump, and this entry follows `ANALYSIS_TAB_ENABLED`. If the switch is still off when this ships, the bump redirects every reader below 10 to a page that hides the new entry. Engineering should confirm the switch is on first, or drop `switch`.

| Slot | Value |
|---|---|
| **id** | `suggested-changes` |
| **Title** | Suggested changes, told what you want |
| **Route** | `/decks` |
| **Opens** | opens a deck’s Analysis tab |
| **Chapter** | 04 · Playing and tuning, after `log-findings` |
| **Width** | plate |
| **switch** | `ANALYSIS_TAB_ENABLED` (see above) |
| **since** | 10 |

**Caption**

> Describe a deck in a sentence or two and it sits under the deck’s name; the pencil beside the name edits both. The Overview and Suggested changes read it the next time each runs, and saving it rewrites nothing already written. Suggested changes, at the foot of the Analysis tab, offers up to five swaps, each a card out and a card in. Three limits are kept for the deck: the most a card may cost, the sets an added card is printed in, and whether adds come only from cards you own. Additional notes take one run’s instructions in your words and are cleared once read.

**Key lines** (3 of 4)

1. the description is optional, and asked beside Analyze before a deck’s first reading. After that it is the pencil’s.
2. additional notes last one press and are never saved. What should hold every time belongs in the description or the limits.
3. the commander, a locked card and the limits always win. When the notes ask past one, the reply says in one line what it did not do, and the rest still lands.

**Edits to existing entries.** `deck-analysis`'s caption already ends "The same tab also holds an overview of the deck and Suggested changes." That stays true and needs no edit.
`locked-cards` says "Suggested changes won't propose it". That is consistent with key 3, so it needs no edit either.

**Specimen.** `TuningPanel` at plate width in the never-run state, cropped to the limits box and the action row. The manifest is not drawn: the entry is about what you tell it, not what it reads.

**Fixture props**: `fixtures.suggestedChanges`

```
state            never run · gameCount 0
limits           capCents 1000 · sets ["tla","tle"] · ownedOnly false
request          "more removal, and swap out Aang"   (typed, unpressed)
description      "A deck built to flip the commander into his transformed state, by utilizing fire, water, earth, and air bending."
```

**Phone reduction.** The three limits stack as 44px controls, with Printed in as its row form (`TLA, TLE ›`). The request sits above a full-width Suggest.
Must not: drop the `Kept for this deck` label, draw the request inside the limits box, or truncate the request text.

**Strings from**: `copy/deck-tuning.ts` (with this package's renames), `copy/help-me-choose.ts` (the reused cap placeholder and `poolOwn`), and `copy/lanes.ts` (Printed in). Nothing is retyped.
