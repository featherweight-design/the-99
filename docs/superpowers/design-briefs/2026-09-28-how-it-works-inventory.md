Inventory for the About how-it-works section (read-only, main @ 40a6f298f, 2026-09-28). Companion to `2026-09-28-how-it-works.md`; one line corrected on 2026-09-28, marked in place.

# How The 99 works under the hood: inventory for a player-facing About section

This covers where each figure or judgment a player sees comes from, how it is decided, how often it refreshes, and whether About already explains it. Everything here was read on `main` at 40a6f298f, and nothing was edited. Paths are relative to `/Users/huey/Projects/the-99`. "About" means an entry id in `src/lib/copy/about.ts`, and "HWMD" means the Analysis tab's "How we make these decisions" sheet (`src/lib/copy/deck-analysis.ts:513-574`).

## 1. Data sources

| Player-visible thing | Source | Method | Exact or partial | Refresh | file:line | On About? |
|---|---|---|---|---|---|---|
| Every card: name, text, type, colors, printings, art | Scryfall bulk data | measured data | Exact to Scryfall. A CSV row whose card the catalog does not hold yet lands in `unmatched` and is dropped | Weekly, Monday 09:00 UTC, staging and production | `.github/workflows/catalog-refresh.yml:12`; AGENTS.md "catalog refresh" | Partly. `import`/`import-issues` explain unplaced rows; Scryfall is never named (no match for "scryfall" in about.ts) |
| Game Changer flag | Scryfall's `game_changer` field | measured data (strict `=== true`) | Exact. HWMD says "Wizards publishes the list … exact", but the app actually reads Scryfall's copy of that list | Weekly, with the catalog | `src/lib/scryfall/transform.ts:69`; `deck-analysis.ts:538-541` | n. Only the mark is mentioned (`decklist-marks`, about.ts:421) |
| Commander support list: inclusion %, synergy, deck counts, tags, declared brackets | EDHREC commander JSON (`json.edhrec.com/pages/commanders/…`) | measured data. Inclusion is EDHREC's own %, or num_decks/potential_decks. Synergy is EDHREC's figure | Exact to EDHREC. A name the catalog cannot resolve still counts in the denominator, which lowers overlap | Monthly on the 3rd for the stored index, which fetches uncached (`fetchEdhrecUncached`, `seed-index.ts:353`), so it is at most a month old. The live readers (the fill, the deck page's suggestions, recommendations) go through a separate 30-day payload cache (`client.ts:8`, `:55`) | `src/lib/edhrec/client.ts:11`, `:8`, `:100-102`; `src/lib/edhrec/parse.ts:136-147`, `:102`; `commander-index.yml:11`; `src/lib/edhrec/support-overlap.ts:21-28` | Partly. Described as "most-played list" and "what other decks with your commander actually run" (about.ts:277, `roles`, `informed-build`). EDHREC is never named, and inclusion and synergy are never distinguished |
| Combos, plus Spellbook's per-card bracket estimate | Commander Spellbook: bulk variants file plus the `/estimate-bracket` sweep | measured data | Partial (see §4) | Weekly, Monday 13:00 UTC, after the catalog | `src/lib/spellbook/seed.ts:18`; `combo-refresh.yml:16` | Partly. `combo-awareness` says "it comes from Commander Spellbook" (about.ts:508) |
| Card prices | ManaPool `/prices/singles` | measured data. One printing per card: live row first, then non-foil stock over foil at any price, then cheapest | Exact to the feed. **Absent means never stocked in any run.** Foil-only is a real state. Sold out means the newest row is from an older run | Weekly, Monday 09:00 UTC, both environments | `src/lib/decks/price-query.ts:56-65`, `:90-99`; `src/lib/decks/price.ts:82-97`; `price-refresh.yml:10` | y. `buy-tag` (about.ts:235) names all four states and ManaPool; `sets` key (about.ts:222) |
| "Why this commander" opening sentence | Anthropic model (`claude-sonnet-4-6`) writing from EDHREC tags (top 8) | model-written. Prompted for 110–160 characters and accepted at 110–190 (`OK_MIN`, `HARD_MAX`); a sentence that fails the checks is not stored and nothing is shown | n/a. A failed commander shows no paragraph | Chained after the scheduled monthly index run (production). Staging copies sentences over for free | `scripts/generate-commander-prose.ts:4`; `src/lib/prose/prompt.ts:10-12`; `src/lib/prose/accept.ts:15-16`; `commander-prose.yml:1-9` | n |

## 2. Roles and role targets

| Player-visible thing | Source | Method | Exact or partial | Refresh | file:line | On About? |
|---|---|---|---|---|---|---|
| A card's role (Ramp, Draw, Removal, Wipes, Land) | Scryfall oracle text and type line | rule text: regexes over lowercased text. Land comes from the front-face type. Ramp needs "{T}: add", "add N/{c}" or a land-to-battlefield search. Wipes are "destroy all", "exile all" or "all creatures get -N". Removal is targeted destroy, exile, counter or damage, excluding "target … you control" | Partial. The app states no miss rate. A card can hold several roles | Live (pure function) | `src/lib/recs/roles.ts:9-47` | y. `roles` "Why a card is filed under Ramp" (about.ts:462-477), which says it counts by job but never says it is a text reading |
| The role strip's target ("12 ramp against 10") | EDHREC support lists, summed by probability (a card at 50% inclusion adds 0.5 to every role it fills). Front face only | measured data. The basis chain is **pair → commander → identity bucket → colour-count bucket → flat** | Measured where a rung has data. Otherwise falls back to the flat 10/10/8/3 and 37 lands, and the strip says which. A measured 0 stays 0 | Monthly, with the index. Role targets are published only when at least 90% of ok commanders derive | `src/lib/edhrec/role-targets.ts:44-74`, `:122`; `src/lib/profile/build.ts:288-313`; `src/lib/profile/load.ts:641-693`; `src/lib/decks/mix.ts:90-145` | y. `roles`, `informed-build` (about.ts:481-493) |
| Identity and colour-count buckets (`identity_composition`) | Derived from the commander index | measured data. A bucket needs 100 commanders. 0, 4 and 5 colours are "thin": colourless is keyed by its identity (`C`), and four and five colours fall back to `count:4` and `count:5` | as measured | Monthly, as a step in each index run | `src/lib/staples/condition.ts:56`, `:88-99`; `scripts/build-staples.ts:1-6` | n |
| Land target | Same chain (composition) | measured data, minus 1 for a partner unless the row measured is the pair's own. Fallback is 37, or 36 with a partner | as above | Monthly | `src/lib/decks/deck-size.ts:35-47` | y. `informed-build` key 1 |
| Fit score's "Roles" part | **The flat 10/10/8/3, not the measured targets** | rule text | n/a | Live | `src/lib/recs/score.ts:167-171` | Only implicitly (`fit-score`) |

## 3. Themes (two different systems)

| Player-visible thing | Source | Method | Exact or partial | Refresh | file:line | On About? |
|---|---|---|---|---|---|---|
| Commander themes: the gap line on Discover, Help me choose themes, "Something new" | EDHREC tags on each commander | measured data. "Played" means the tags of every deck you have, brews included | exact to EDHREC | Monthly | `src/lib/discovery/novelty.ts:44-48`, `:106-113`, `:130-140` | y. `discover` (about.ts:303-311), `help-me-choose` |
| A card's themes: 21 kinds (counters, pump, tokens, blink, landfall, tribal and so on). Used only by stand-ins and Find a deck | Oracle text, front face, reminder text stripped | rule text: one regex per theme. Tribal also checks the catalog's creature types | Partial. Sized on staging's 31,830 cards; no miss rate stated | Live | `src/lib/recs/themes.ts:1-15`, `:48-79`, `:115-121` | Only as "the theme it would join" (`fits-your-decks`) |
| "Joins 9 other mill cards", and a deck's key creature type | The deck's own cards | rule text. The card's theme that the most other deck cards share wins (ties go to the earlier theme). Key type is the most common creature type, needs at least 5, and the commander's type breaks a near tie within 10% | as the classifier | Live | `src/lib/swaps/fits.ts:280-316`; `src/lib/recs/themes.ts:130-152` | Partly (`fits-your-decks` key 2) |

## 4. Brackets

| Player-visible thing | Source | Method | Exact or partial | Refresh | file:line | On About? |
|---|---|---|---|---|---|---|
| Bracket limits (Game Changers 0/0/3; mass land denial 0; extra turns counted at bracket 1 only; two-card infinites forbidden at 1–2 and "late only" at 3) | WotC's published brackets, transcribed | rule text | "Report, never weight". Lateness cannot be computed, so it never violates bracket 3 | Code change only | `src/lib/bracket/rules.ts:14-48`, `:108-111` | n (bracket lines are batched for the end of the launch) |
| The slot (lowest bracket satisfied; 1–2 and 4–5 stay ranges, left to the player) | Counts below plus the tutor-reach test | rule text. 3 versus 4 is decided by whether the deck's tutors can find **every** piece of a combo; a piece in the command zone counts as found | Decisive, and the player can declare their own bracket over it | Computed when Analyze is pressed and stored. Goes stale after an edit | `rules.ts:115-165`; `deck-analysis.ts:420-440` (lean copy) | n. HWMD / lean only |
| Game Changers count | Scryfall flag | measured data | **Exact** (HWMD deliberately states no misses) | Weekly | `deck-analysis.ts:538-541`; `profile/load.ts:415` | n. HWMD only |
| Mass land denial | Spellbook estimate plus our regex (a card is flagged when either says so) | rule text + measured | **Partial: 22 of 24 on a curated set. Misses Wave of Vitriol and Cataclysm** | Weekly (combo refresh) | `src/lib/bracket/oracle-rules.ts:30`, `:150-172`; `deck-analysis.ts:542-558` | n. HWMD only |
| Extra turns | Spellbook estimate plus our regex | rule text + measured | **Partial: the card reading has no misses among the 56 cards that mention one. The separate loop check misses a single card looping on itself (Nexus of Fate)** | Weekly | `oracle-rules.ts:174-181`; `deck-analysis.ts:559-565`; `combo-features.ts:47-52` | n. HWMD only |
| Two-card infinites | Spellbook variants | measured data. Needs exactly 2 cards, no template requirement, a `must_be_commander` piece actually in the command zone, and a result that is `Infinite …` or game-ending. Spellbook's own bracket tag is deliberately ignored | **Partial: misses combos needing three or more cards, and ones needing a particular printing** | Weekly | `src/lib/profile/load.ts:113-174`; `src/lib/spellbook/combo-features.ts:3-35`, `:60-65`; `deck-analysis.ts:566-571` | n. HWMD; `combo-awareness` covers the near-miss side |
| Tutors (finding row; the tutor mark on a card) | Oracle text | rule text (`classifyTutor`, a reach classifier). A search for lands only is not a tutor. Stored weekly as a flag | Partial. **No miss is stated anywhere in the app.** No bracket limits tutors ("no limit") | Live, plus a weekly stored flag | `src/lib/bracket/tutor-targets.ts:1-35`, `:197`, `:298`; `spellbook/seed.ts:280-283`; `deck-analysis.ts:378` | Mark only (`decklist-marks`) |
| "What other players say" (N decks declared a bracket; M said X) | EDHREC `bracket_counts` | measured data. Never an input to the verdict | exact to EDHREC. Shown as absent when EDHREC has none | Monthly | `edhrec/parse.ts:102`; `deck-analysis.ts:321-357` | n |

## 5. Availability and claims

| Player-visible thing | Source | Method | Exact or partial | Refresh | file:line | On About? |
|---|---|---|---|---|---|---|
| Free / in a draft / none free / short N | Your collection plus decks | player's input plus rules. A committed deck claims firmly from its **newest committed version**. A deck never committed claims softly from its live list. Commanders count as claims | exact | Live | `src/lib/decks/availability-query.ts:20-35` | y. `availability` (about.ts:197-210), `commander-availability` |
| Who gets a contested copy | `deck_version_cards.since` | rule text. Seniority is per card: the deck that sleeved that card first keeps it | exact | Live | `availability-query.ts:77-82`, `:197` | y. `availability` key 4, `reservations` |
| Card assignments (hand a copy to a chosen deck) | Player's choice (`card_assignments`) | player's input, overriding seniority | exact | Live | `availability-query.ts:244-250`, `:288` | y. `reservations` (about.ts:836-846) |
| "Pull it" releases | Player's action (`pull_releases`) | player's input. Subtracts the pulled copy from the source deck's committed claim | exact | Live | `availability-query.ts:112-118` | y. `review-and-commit` |

## 6. Commander recommendations

| Player-visible thing | Source | Method | Exact or partial | Refresh | file:line | On About? |
|---|---|---|---|---|---|---|
| Fit score out of 100 (nominal: synergy is unclamped, so full overlap can read a point over) | Collection plus EDHREC support list | Pool 15 (full at 200 legal cards) + Roles 25 (flat targets, capped per role) + Synergy 60 (owned support ÷ EDHREC total). Out of 40 when there is no list; never rescaled | exact arithmetic | Collection is live; list monthly | `src/lib/recs/score.ts:93-104`, `:164-180` | y. `fit-score` (about.ts:270-283) |
| Commanders you can build today / "Build from" | Owned commanders not yet built, ranked by fit. Free mode counts only unclaimed cards | rule text | exact | Live | `src/lib/recs/free-ranking.ts` (not read line by line) | y. `commander-lane` |
| Discover orders; "Something new" 30% floor | Fit, number of unplayed EDHREC tags, deck count, name, release date | rule text. Something new ranks by unplayed tags, then owned support, and requires owning at least 30% of the support list | exact | Monthly (tags) | `src/lib/discovery/floor.ts:10`; `novelty.ts:39-41`, `:109-113`; `src/lib/copy/lanes.ts:236-247` | y. `discover` |
| Ready to build on Home | Top 28 by fit, 2 shown, changing daily at UTC midnight | rule text | exact | Daily | `src/lib/recs/ready-to-build.ts:23-31`; `daily-pick.ts:96-106` | y. `ready-to-build` |
| Help me choose: free match / Look deeper | Your words matched against theme labels, card names, `$N` and `bracket N`. Look deeper sends them to a model (`claude-sonnet-5`) for one credit | rule text / model-written | exact match; the model read is validated | Live | `src/lib/intake/match.ts:1-22`; `intake/limits.ts:9`; `intake/deeper-read.ts:1-14` | y. `help-me-choose` (does not say Look deeper is a model) |

## 7. Stand-ins and Fits your decks

| Player-visible thing | Source | Method | Exact or partial | Refresh | file:line | On About? |
|---|---|---|---|---|---|---|
| "Same job" for a stand-in | Oracle text | rule text. A land must make every color the original makes. A fetch must find every type the original finds. A spell must share at least one role at the same or lower mana value. A card with no role gets no stand-ins ("no guess") | Partial. Refined by `honestJobs`: an ability limited to a creature type the deck does not play counts for nothing, and ramp splits into four kinds | Live | `src/lib/swaps/stand-ins.ts:42-102`; `src/lib/swaps/honest.ts:1-31`, `:162` | y. `stand-ins` (about.ts:605-620) |
| Over-limit Shopping row | Price against the deck's limit (default $10) | player's input plus price | A card with no price, or sold out, is never over | Weekly prices | `src/lib/swaps/limit.ts:8-30` | y. `stand-ins` key 1 |
| Land stand-in order | Land text | rule text: untapped, then conditional or life cost, then tapped, then utility | as classifier | Live | `stand-ins.ts:190`; `swaps/land.ts:121-160` | y. `stand-ins` key 4 |
| Find a deck: which decks, what order, what reason | Your decks plus Spellbook plus card themes plus commander synergy | rule text. Deck colors must allow the card and the deck must not already hold it. Order: completes a combo, then joins a theme (most cards first), then EDHREC synergy, then name. Need = role count against the measured target | exact | Live | `src/lib/swaps/fits.ts:1-12`, `:86-140` | y. `fits-your-decks` (about.ts:552-570) |
| "Staple" on a card | `format_staples`: breadth of at least 50% of commanders and inclusion of at least 20% within an identity bucket. Universal = a staple in at least ¾ of buckets | measured data | exact | Monthly | `scripts/build-staples.ts:29-30`, `:137-138`; `src/lib/staples/universal.ts:1-18` | Partly (`fits-your-decks` key 3, `change-commander` key 2) |

## 8. Model-written text

| Player-visible thing | Source | Method | Exact or partial | Refresh | file:line | On About? |
|---|---|---|---|---|---|---|
| Overview (Primer, Mulligan, Key cards, Weaknesses) | `claude-sonnet-5` at low effort, given the stored analysis. The figures are the app's; the model only phrases them | model-written and validated. A Mulligan line quoting a number not in the facts is refused. A universal staple is never a Key card | n/a | Written when Analyze is pressed and this list has no overview yet, or on "Write one". Reused until the list changes; costs one credit | `src/lib/synopsis/model.ts:6-12`; `synopsis/types.ts:8`, `:17`; `synopsis/facts.ts:6-10`; `synopsis/read.ts:98-106`; `synopsis/limits.ts:11-21` | n |
| Suggested changes (up to 5 swaps) | `claude-sonnet-5`, given an evidence pack (the profile, game log, targets). Ownership, price and bracket are withheld from the model | model-written and validated | n/a | On press; costs a credit | `src/lib/tuning/limits.ts:39`, `:12`; `src/lib/tuning/prompt.ts:9-22`; `src/lib/tuning/evidence.ts:6-19` | Only in passing (`locked-cards`) |
| Credits | One allowance shared by every model feature: owner 10, friends 3 per rolling 24 hours. Only a successful answer spends | rule text | exact | Rolling 24 hours | `src/lib/model/allowance-rule.ts:1-25` | n |
| Card labels (per-card jobs and their limits) | `claude-sonnet-4-5` batch over the catalog. $55 hard cap, pause at $50, 95% coverage floor | model-written | n/a | Cron is daily at 14:00 UTC but grouped by ISO week, **disabled until `CARD_LABELS_ENABLED`**, staging only, then copied to production | `scripts/build-card-labels.ts:46-58`; `.github/workflows/card-labels.yml:1-29`; `src/lib/labels/types.ts:1-9` | n. **Nothing in the app reads the labels yet**: the only non-labels reference in `src/` is `src/db/schema.ts` |

## 9. Other computed figures

| Player-visible thing | Source | Method | Exact or partial | Refresh | file:line | On About? |
|---|---|---|---|---|---|---|
| The fill ("we build the 99") | Owned pool, plus unowned **EDHREC top cards for this commander** (a live or cached EDHREC fetch, not `format_staples`) | rule text. Owned first, then inclusion descending, then name. Role floors in ramp → draw → removal → wipes order, a type tie-break, then land sweeps and the residual | exact to its inputs. On an EDHREC outage it fills from the collection alone | On create or fill | `src/lib/decks/fill.ts:288-299`, `:343-420`; `src/app/decks/actions.ts:82-99`; `src/lib/decks/suggestions-read.ts:92-100` | y. `auto-fill` (about.ts:395-410). "Staples" there means EDHREC top cards |
| Last-31 list | EDHREC synergy for the commander | measured data. Synergy descending, then inclusion, then name. Drops cards already in the deck and any **negative** synergy. Pre-ticks owned cards that have a free copy | exact | Monthly | `src/lib/decks/last-slots.ts:55-104`; `src/lib/commanders/synergy-cards.ts:63-91` | y. `auto-fill` |
| Combo near-miss ("one card away") | Spellbook | measured data. Two-card variants with exactly one piece missing | Partial: no combos of three or more cards | Weekly | `src/lib/combos/near-miss.ts:5-9` | y. `combo-awareness` (about.ts:496-510) |
| Shopping / tile cost / Home total / set cost | ManaPool plus claims | measured data. Unpriced copies are counted but add nothing | as prices | Weekly | `price-query.ts:62-65` | y. `shopping`, `commitments`, `sets` |
| Stored analysis freshness | Your list's fingerprint | rule text. Fresh until an edit marks it dirty; never lapses with time; pinned to a version at commit | exact | On press | `src/lib/profile/stored.ts:118`, `:149`, `:230`, `:466`; AGENTS.md `probe:profile-store` | n |

## What About already explains, and what it doesn't

**Already on About** (`src/lib/copy/about.ts`, version 9): ManaPool prices and their four states (`buy-tag`, `sets`, `shopping`), availability, seniority and assignments (`availability`, `reservations`, `commitments`), fit score and lanes (`fit-score`, `commander-lane`, `discover`, `ready-to-build`, `help-me-choose`), roles and measured targets (`roles`, `informed-build`, `role-coverage`), the fill and last slots (`auto-fill`), Spellbook combos (`combo-awareness`), stand-ins and Find a deck (`stand-ins`, `fits-your-decks`), and Change commander. The page itself (`src/app/about/page.tsx`) only renders these entries.

**The closest prior art** is HWMD, `deck-analysis.ts:513-574`: four rows (Game Changers exact; land denial, extra turns and combos each with a named miss), plus the all-brackets sheet at `:587-611`.

**Never explained on About:**
- Scryfall and EDHREC are never named, and inclusion versus synergy is never explained.
- The refresh cadences, except "ManaPool weekly".
- How the bracket verdict works: exactness, misses, and the tutor-reach 3-versus-4 rule.
- That the tutor classifier's accuracy is stated nowhere.
- The declared-bracket population line.
- That the commander sentence, the Overview, Suggested changes and Look deeper are model-written, and the credits.
- Card themes as a separate classifier from EDHREC commander tags.
- Card labels (nothing in the app reads them yet).

## Discrepancies worth knowing before writing the copy

- **The fit score uses the flat role targets** (`score.ts:167-171`), while the role strip, the fill and Find a deck use the measured ones.
- **The fill's "staples you don't own" are EDHREC's top cards for that commander**, not the `format_staples` table that "staple" means in Find a deck and Change commander.
- **HWMD says Wizards publishes the Game Changer list and we check against it.** In code the flag is Scryfall's `game_changer` field.
- **EDHREC is read at two ages.** The stored index (targets, tags, staples, the fit score's list) is rebuilt monthly and fetched uncached, so it is at most a month old. The live readers (the fill, the deck page's suggestions, recommendations) read a separate 30-day payload cache. One commander's figures can therefore come from two different EDHREC snapshots. (Corrected 2026-09-28: this line first said "about 60 days old". `client.ts:100-102` is the comment explaining why the index SKIPS the cache to avoid exactly that.)
- **The card-labels workflow is called "weekly" but its cron is daily** at 14:00 UTC, keyed by ISO week, and it ships disabled.

Not checked line by line: `free-ranking.ts` and `commander-change/fit.ts`. For those rows I relied on the About copy.
