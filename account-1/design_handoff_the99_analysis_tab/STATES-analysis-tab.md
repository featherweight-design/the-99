# States — the Analysis tab (final)

Canvas ids in brackets. `HANDOFF.md` §2 is the prose.

## §A The page, per state

| Canvas | State | Header chip | Tab body |
|---|---|---|---|
| 8a | opening the tab, fetching | none | the chip-mark row + *Loading…* only; nothing else, no mix (after 150ms, held 400ms) |
| 2a | never analyzed | none | Overview empty state: ring, heading, body, **Analyze** + *How we make these decisions →* |
| 2b | loading, never drawn | none | 2a with the ring animating, Analyze disabled, heading *Reading your deck…* |
| 2c | failed, never drawn | none | 2a with the ring at 0.3, failure copy, **Try again** |
| 2d | failed re-read over a held reading | the held bracket | banner *We couldn't re-analyze your changes…* + **Try again**; the held reading below, whole |
| 2e | range, asking | *Optimized or cEDH* | Overview · bracket box with the two declaration chips · climb · findings · mix |
| 2f | range, answered | the answer | as 2e; *Declared {name} for version {n}. change* in place of the chips |
| 2g | single | the bracket | as 2e; the version row when the last version read differently |
| 2h | single with a lean | the bracket | as 2g; the lean between the reason and the population foot |
| 2i | stale | the held bracket | banner *Your deck has changes since it was analyzed…* + **Re-analyze**; the reading below, whole, dated *before your changes* |

**Loading over a held reading:** the banner's button disables in place; the reading stays.
**Refused declaration write:** the shipped *That did not save. Try again.* inside the declaration.

## §B The bracket box, in order

Marks + name + `analyzed {when}` → reason → *lean* → *declaration section* (ask · answer · version
row, one at a time) → population foot. A hairline above each section after the reason.

## §C Date line

| Reading | String |
|---|---|
| asked | `analyzed 2 minutes ago` — relative under an hour, then the date |
| committed | `analyzed with version 3 · 18 Sept` |
| stale | `analyzed 18 Sept, before your changes` |

## §D Sheets

| Sheet | Opened from | Width | Stacks |
|---|---|---|---|
| Receipt | *see the card(s) / combo(s)* | 760 | a tile → CardModal, *← {finding}* |
| What would have to go | the lower rung | 700 | a candidate → CardModal, *← {target}* |
| How we make these decisions | findings head row · empty state | 560 | nothing |
| Reasoning (shipped) | *see the reasoning* | 700 | a card → CardModal, *← {title}* |
| Synopsis | *View full synopsis →* · Versions panel | 700 | a card → CardModal, *← Synopsis* |

Escape and ← pop one level; the page behind closes all. Focus returns to the opener.

## §E Announcements

On settle, once: `Analysis ready. Your cards permit {range}.` Failure: the heading or banner's own
`role="alert"`. The banner is `role="status"`, not announced on load.
