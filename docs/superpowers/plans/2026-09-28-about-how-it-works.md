# Plan: About, "How the app reaches its answers"

**Sources:**
- Handoff: `design/design_handoff_the99_about_how_it_works/` (R1, #1092), with its Yellow readiness audit.
- Brief: `docs/superpowers/design-briefs/2026-09-28-how-it-works.md` and its inventory.

**Status:** Hugh ruled both open items on 2026-09-28: a fifth method, `published list`, and one line on the sheet. Everything below applies the audit's eight engineering corrections.

## What ships

A closing appendix on `/about`: eight reference rows, one per thing the app decides.
- **Each row names four things:** where the answer comes from, how it is decided, how often it refreshes, and whether it is exact or partial, naming what it misses.
- **Each row carries method tags.** There are five methods, all drawn identically:
  - `rules text`;
  - `other decks`;
  - `model-written`;
  - `your input`;
  - `published list`.
- **The page links rows and entries both ways.** Each feature entry gains a `How this is decided ↓` line to its row. Each row lists `explained in` links back to its entries.
- **The contents gain a fifth group.** The rail and the phone list add it after chapter 04, and search counts row titles too.
- **The Analysis tab's "How we make these decisions" sheet reuses the tags**, including `published list` on Game Changers. That is Hugh's ruling, applied "in both places".
- **The next About sheet announces the appendix in one line**, with no bump of its own.

No new route and no new `AboutEntry`. `ABOUT_VERSION` stays 9, and the `about.test.ts` hash is re-pinned deliberately. Card labels stay excluded.

## About handling: a switch, not a bump

**`HOW_IT_WORKS_ENABLED`** (Hugh's release ruling, 2026-09-24: every feature ships behind its own switch, on in staging and off in production until he walks it). Its flag function sits in `src/lib/about/how-it-works-flag.ts`, the `helpMeChooseEnabled` shape: server-side, read per request, off for anything but `'true'`.

**Off, it changes nothing for a production reader.** Every piece reads the one flag:
- the appendix section and its method key;
- every entry's link line;
- the contents group in the rail and the phone list, and the search denominator's +8;
- the `pageIntro` clause;
- the tags in "How we make these decisions";
- the sheet line.

**The proof is a test, `how-it-works-off.test.tsx`.** With the switch off, it renders:
- the whole About page;
- the contents in both forms;
- the search count;
- the About sheet;
- the "How we make these decisions" sheet.

It asserts each renders byte-identical to a render made with the feature's modules absent: no `#how-it-works`, no `How this is decided`, no row title in the contents, no tag. A second case turns the switch on and asserts each piece appears, so the test cannot pass by never mounting anything. `probe:about-how-it-works` repeats the off case in a browser at 390 and 1300.

**Why not a bump.** Hugh ruled that the appendix gets no bump of its own. A bump would also put a sheet in front of every account for reference content, which is the case AGENTS.md's cosmetic rule argues against.

**The sheet line.** It is Hugh's "one line", and it **rides a sheet that is already drawing.** It never summons one: the proxy's decision to draw a sheet ignores it.
- **When it appears:** on any sheet a reader sees while the switch is on, until they have seen the appendix.
- **How "seen" is recorded:** with the id `how-it-works` in `about_seen_ids`, and only by a visit to `/about`. `recordAboutVisit` is the one writer of those ids. Today it records only switched `AboutEntry` ids (`switchedIds(visibleEntries())`), so PR C adds the appendix's id to that write while the switch is on. Later and Escape write nothing, as they do for entries (`about-sheet.tsx`), so a reader who presses Later sees the line again on the next sheet. That is the same rule an unseen entry follows. Show me leads to `/about`, so its visit records it.
- **What rules it out:** a brand-new account's one-line introduction to the page does not carry it, because that sheet introduces the whole page.
- **What stays out:** the rows are not entries. They never appear in the what's-new index, and they carry no NEW mark.

## The cadences

Every row's `refreshes` field states a schedule, and each is **already true on `main`**. Replicate PR 3 (#1123) set them, and no clock time is stated:
- **Prices "Daily":** `catalog-refresh.yml` runs `0 9 * * *`, with prices as its last step. `price-refresh.yml` has no schedule of its own.
- **"Card data refreshes daily and combos weekly":** the daily catalog, and `combo-refresh.yml`, which chains on each scheduled catalog run and builds on Mondays alone.
- **"Monthly, and about two weeks after each new expansion or Commander set":** `commander-index.yml` chains on the catalog and runs only when `db:index-due` says so. That is monthly from the 3rd, or 14 days after an `expansion` or `commander` set releases (`RELEASE_SET_TYPES`, `src/lib/catalog/index-due.ts`). The copy names those two kinds, because a reprint box or a supplemental set starts no build. And no line promises that a build has already happened: an empty ledger never auto-builds, and the first build is a dispatched catch-up (b1, 2026-09-28).

Replicate PR 4 is the fetch-once download seam and changes no schedule. So B and C are held on nothing but their own review, subject to d9's call.

**Before each of PR B and PR C merges,** every stated cadence is re-checked against the workflows on `main` at that moment, never against the replicate plan. The check is recorded in the PR body as a cron, the gate, and the sentence it backs, so a later schedule change that lands first is caught.

## PR boundaries

The line has three PRs, each under ~20 files and ~800 lines, with no stacking: each branches from `main` after the one before it merges.

**PR A: `MethodTag`, and the sheet's tags and truth fix.**
- `src/components/ui/method-tag.tsx` covers five keys: `rules`, `decks`, `model`, `you`, `list`.
- The flag function, plus `AboutSwitch` gaining `HOW_IT_WORKS_ENABLED` in `visible.ts`'s map.
- **"How we make these decisions" gains the tags behind the switch:**
  - Game Changers: `published list`;
  - land denial and extra turns: `rules text` + `other decks`;
  - combos: `other decks`.
- **The switch reaches the client sheet through `DeckPageSwitches`,** a general deck-page switches provider holding only `howItWorks` for now. The deck page already wraps its shell in `SwapToolsProvider` and `ChangeCommanderProvider`. A prop would cross the builder shell, the analysis panel, findings-block and analysis-empty. The page edit is one wrap. The existing switches stay where they are.
- **Brief §5.1, ungated:** Game Changers' line names Scryfall as the reader of Wizards' list. It is a truth fix to a shipped sentence, and it waits on nothing.
- Tests: `MethodTag` renders its five labels identically; the sheet with the switch on and off.
- No cadence.

**PR B: the appendix.**
- `howItWorksCopy` in `src/lib/copy/about.ts`, templated from the code's constants per the handoff's rule 2:
  - `ROLE_TARGETS`;
  - the fit weights, the 200 pool, 30%, 28;
  - the credits in `allowance-rule.ts`;
  - the bracket sub-rows, from the same detection constants as `deckAnalysisCopy.detection`.
- `HowRow` and the method key in `components/about/`.
- `section#how-it-works` after the chapters in `about-page.tsx`, and the `pageIntro` clause, all behind the switch.
- **Hash handling:** a hash opens its row before the jump lands. The wash and focus follow R6 §P1.
- `how-it-works-off.test.tsx`.
- Re-checks its cadences against `main`'s workflows before merging.

**PR C: the links, the contents, and the sheet line.**
- `Entry`'s link line from an `entryRow` map, and each row's `explained in` links.
- A non-chapter group in `ContentsRailR6` and `ContentsListR6`. Their types are keyed on `AboutChapter` today, so the group gets its own branch rather than a fifth chapter id.
- Rail tracking of rows.
- Search matching row titles, with the denominator +8, and a match opening the group on a phone.
- The sheet line.
- Extends the off test to all of it.
- Branches after PR B merges, since it links into PR B's rows. Its `src/app/about/actions.ts` edit waits for #1119 (1f's nav-pending) to reach `main`.
- Its body says `HOW_IT_WORKS_ENABLED` is a new switch Hugh sets himself: after `ABOUT_SHEET_ENABLED` in the release order, and it can ship with the base features.

## Audit corrections, where each lands

| # | Correction | Lands in |
|---|---|---|
| 1–3 | Prices "Daily." (no clock time); Brackets "Card data refreshes daily and combos weekly."; Roles, Themes and Recommendations add "and about two weeks after each new expansion or Commander set" (narrowed to `RELEASE_SET_TYPES`) | PR B, checked against `main`'s workflows |
| 4 | Detection keys are `landDenial` and `combos`. State follows the code's names: `opened`, `data-jumped`, `place` and `current`, never the README's | PR B, PR C |
| 5 | Tutors | PR B states that the tutor reading has no measured accuracy yet, which is true on `main`. Brief §5.5 (a measured accuracy) is not in this line. When it lands, that PR updates the row. |
| 6 | Three surfaces use the flat targets | PR B states it as the code does today (brief §5.4). The fix is a scoring change outside this line. Whichever PR fixes it must change the Roles and Recommendations rows in the same diff, and the Roles row carries a comment naming the three call sites so a grep finds it. |
| 7 | New engineering: `MethodTag`, `HowRow`, the entry line, the non-chapter contents group, search +8, the hash opening before the jump | A, B, C as above |
| 8 | Stand-ins also reads the deck's colors (`your input`), and Recommendations' Roles part reads rules text (`rules text`) | PR B |
| Hugh | The fifth method `published list` on Prices and Game Changers; the key reads "Five ways an answer is reached" | A (tag), B (key, rows) |

Every new or changed string goes through `/copy-review` in lane before the PR that first ships it opens: PR A's five tag labels and its Game Changers sentence, PR B's rows and key (with the audit's five notes), and PR C's link line and sheet line. Only the result is carried into the copy module.

## Proof

- **Unit:**
  - the off test (every piece absent, and present when on);
  - rows templated from their constants, so a changed constant changes the sentence;
  - the hash opens its row before the jump lands;
  - the search count gains 8 with the switch on, and 0 with it off;
  - the sheet line appears once and never summons a sheet.
- **`probe:about-how-it-works`** at 390 and 1300, with the switch on:
  - the appendix's geometry: the key's 100px `dt` column, the 2-column grid at 1300 and one column at 390, and 44/52px heads;
  - pressing a row;
  - landing on `#how-roles` from an entry link, open and washed, focus on the `h3`, and Back returning;
  - the rail marking the row current;
  - the phone contents group opening.
  - The off case is a separate pass against a server started with the switch unset, because a switch is read when the server starts (`probe:about --flip` owns and restarts its server for the same reason). The probe takes the pass from `PROBE_HOW_IT_WORKS=on|off` and fails if the server it finds draws the other state.
  - It writes only the About row, through `clearAboutSheet` with `captureAboutSeen`/`restoreAboutSeen`.
  - One mutation per fix.
- **`probe:about --flip`** gains a leg for the new switch: the line rides the next sheet and never draws one alone.
- **design-review** runs against the handoff per UI PR, and against the whole brief at close.
- **feature-acceptance:** the inventory below. A contact sheet goes in each PR body, and the whole inventory is walked at close.

## Route × viewport inventory

| Surface | 390 | 1300 | PR |
|---|---|---|---|
| "How we make these decisions" sheet with tags (Analysis tab) | ☐ | ☐ | A |
| `/about` appendix: heading, key, eight closed rows | ☐ | ☐ | B |
| One open row per method (Roles, Recommendations, Written text, Availability, Brackets, Prices) | ☐ | ☐ | B |
| `/about#how-roles`: landed, open, washed | ☐ | ☐ | B |
| An entry's link line, and the round trip back | ☐ | ☐ | C |
| Contents: the rail group (1300), the phone list's fifth row, open (390) | ☐ | ☐ | C |
| Search matching a row title | ☐ | ☐ | C |
| The About sheet carrying the one line | ☐ | ☐ | C |
| All of the above with the switch off: unchanged | ☐ | ☐ | B, C |

Inventory: `docs/superpowers/inventories/about-how-it-works.json`, with the switch on, and `clearAbout`.

## The About entry rule

This line is About content itself, so it owes no entry of its own. Its announcement is Hugh's one sheet line.

## Out of this line, named so they are not lost

- **Brief §5.2, EDHREC read at two ages:** the row says "monthly" for the stored index, which is true of what it describes.
- **Brief §5.3, "staple" meaning two things.**
- **Brief §5.4, the flat-target surfaces.**
- **Brief §5.5, tutor accuracy.**

Each is an engineering defect for d9 to schedule. Where one of them is later fixed, the matching row changes in that fix's PR.
