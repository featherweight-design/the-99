# Finding the tools: build plan

Handoff: `design/design_handoff_the99_tool_discovery/` (merged as #3243, squash 80ee5f6c8). Approved by Hugh 2026-11-23 through R11. This plan records the engineering readiness audit, moves the READINESS verdict to **Yellow**, names the PR split before any code, and settles each Yellow gap from the nearest drawn pattern.

Read with the handoff README (calls 1 to 5, the Decisions, the engagement metrics), STATES.md and READINESS.md (G1 to G25).

## 1. Readiness audit (verified against origin/main bb4832f88, rechecked on 80ee5f6c8)

| # | Finding | Resolution |
|---|---|---|
| 1 | **G22's premise is wrong.** `LEAD_PRIORITY` (`src/lib/feed/kinds.ts:77`) already ranks `spare-request` first, ahead of `trade-match`. `leadStory` skips items that are not unseen and answer items. The desktop frame's trade match led because the offer had been seen, not because of rank. | Decided in §4. The work stays in PR G, which is held. |
| 2 | **The Consider retarget list misses call sites.** These are `last-slots-strip.tsx:78` (`onConsider`), `builder-shell.tsx` 1472 (`pendingShelf`), 1870, 1958, 2097 and 2228, `deck-open-loading.tsx:42,109`, `builder-screen.ts:32` and `deckViewSearch` (`builder-view.ts:71`). The `?tab=consider` tests are in builder-view, builder-screen, builder-initial-view and help-root. The URL is `?tab=consider`; G6's `?view=consider` names a parameter that does not exist. | B1 owns every site on this list (§3). |
| 3 | **Moments.** G6 moves M3 and M4 and keeps M2 "for the reading". M2 is `suggested-changes` (`src/lib/moments/registry.ts:20`), not the reading. All three anchor on the Analysis tab button (`builder-shell.tsx:1539-1559`, merged into `analysisTabRef`), each eligible only while Analysis is not the open tab. | **All three anchors move to the Tuning tab button**, eligible while Tuning is not open. The shortcut anchors stay where they are: M3 on the to-do card (`todo-card.tsx:308`) and M4 on the land cell (`role-counter-cell.tsx:76`). B2 builds this. |
| 4 | **`TOOLS` has no `consider` or `overview` entry,** and the welcome sheet's Which deck needs it most? row (`find-a-deck-read`) has no landing. `TOOLS` also drives About's Tools showcase (`showcase.ts`), so adding an entry would add an About card that was not drawn. The status line `14 you own · 26 to buy` has no loading or zero state drawn. | §5, gaps Y1 and Y2. |
| 5 | **Undrawn states.** Tuning on a brew or a deck with no data; Consider's desktop toolbar inside the hub (G5); the Home panel's popover on a short viewport; Ask on a tool whose switch is off for the reader. | §5, gaps Y3 to Y6. None needs a Design item. |
| 6 | **STATES.md, R8 row** still reads `Choose your notifications`. R9 renamed it to `Choose notifications`. | Errata row in READINESS. The build uses `Choose notifications` (G17). |
| 7 | **G21 needs a unit test per PostHog event** proving it carries no free text. | §6. |
| 8 | **G12: the copy has not been through copy-review.** | Done here, §7. |
| 9 | **The handoff folds in R11** (Home lead, Friends badge, offerer answer in the row, G22 to G25) and the Home reorder (R7 to R10). Hugh is sending Design a separate prompt on the Home lead, the Friends badge and the offerer's answer. | **PR G (G22 to G24) is held** until the orchestrator confirms which source of truth wins. G25 is no change. |

## 2. READINESS: Yellow

The verdict moves from Green to **Yellow** (amended in `READINESS.md`, with an errata table). The reasons: G6 names the wrong moment and the wrong URL parameter; G22's premise does not match the code; there is no landing for `consider`, `overview` or `find-a-deck-read`; four states are undrawn; the copy had not been reviewed. Each is settled in this plan from a drawn pattern. Nothing goes back to Design.

## 3. PR split (boundaries fixed before code)

One PR open at a time. No stacking. Each PR stays under about 20 files and about 800 runtime lines. Every PR ships the PostHog events for the surfaces it builds (G21).

### A · Find a deck on `/collection` (risky: migration)

- The call-out. On All it has `Show them`; on Free alone it has no button. Its ✕ closes it for good, per account.
- There is no store for that today. The welcome strip's `welcome_strip_dismissed_at` belongs to the welcome lot. So A adds `user_prefs.find_a_deck_closed_at`, written once while null, after `feed_offer_closed_at` and `closeFeedOffer`. That means a migration and a server action, so A is **risky**: `/code-review medium`, the checklist pass and `## Copilot off`.
- A button goes under each tile on Free alone. In row view, the phone gets a strip and the desktop gets a button.
- The card window gains a Fits entry. `open(oracleId, list, atPrinting, opts)` (`card-detail-provider.tsx`) takes `opts.view: "fits"`. Back returns to details and focus comes back. The README's `openCard(id, { view })` names no function that exists.
- Files: `schema.ts` plus a migration, the prefs action, `collection-client.tsx`/`browser.tsx`, the grid tile component, `rows-view.tsx`, new `find-a-deck-callout.tsx`, new `find-a-deck-button.tsx`, `card-detail-provider.tsx`, `src/lib/copy/find-a-deck.ts`, and new `src/lib/analytics/tool-events.ts` (§6).
- Events: `find_a_deck_opened` with `from` = `callout_show_them`, `tile_button`, `row_strip`, `row_button` or `card_door`.

### B1 · The view seam (no visible change)

- `BuilderView` gains `tuning` **alongside** `consider`. In B1, `tuning` draws today's Analysis tab with its hub. The tab row is unchanged, so Consider is still its own tab. As built: `drawnView` (`builder-view.ts`) opens `tuning` as `analysis`, and every way a view arrives from outside goes through it (`initialBuilderView` for the URL and a landing, and the nudge's `pressTool`), so the shell's own state never holds `tuning` in B1. B2 drops the mapping when it draws the tab.
- `?tab=tuning` reads as `tuning`.
- `deckViewOf` (`builder-screen.ts`) and About's `DeckView` map `tuning` to `analysis`, so the ? opens the Analysis section. `deckViewSearch` (which `help-root.tsx:61` uses) writes `?tab=tuning`, so ‹ Back returns to Tuning.
- `src/app/decks/[id]/page.tsx` (`readBuilderView`/`initialBuilderView`) passes `tuning` through.
- `tools.ts` lands the three tune tools on `tuning` (same screen in B1), with the `tools.test` and `fits-view.test` expectations.
- `ToolLands`' deck form already has the optional hub `tool` (shipped with `LANDINGS`); `HubRequest` (`tuning-hub.tsx:46`) gains `consider`, which is unused until B2.
- Files: `builder-view.ts`, `builder-screen.ts`, `page.tsx`, `help-root.tsx`, `tools.ts`, `tuning-hub.tsx` (the type only), `builder-shell.tsx` (the view switch only), and their tests.
- Events: none.

### B2 · The Tuning tab

- The tabs become `Your deck · Analysis · Tuning · Games · Versions`. `consider` leaves `BuilderView`. `?tab=consider` reads as `tuning` and opens Consider through `HubRequest`.
- The hub moves into Tuning, so Analysis is the reading alone. The hub's h2 becomes `sr-only` and its top rule goes.
- Consider is the hub's first tile, spanning both columns from md, and opens `ConsiderPanel` in place.
- Every way in is retargeted to `setView("tuning")`:
  - `builder-shell.tsx`: 1472 (`pendingShelf`), 1564 (`proposedCutsPress`), 1870 (`onConsider`), 1923 (mana), 1930 (the role cell's Suggest, which today presses the hub without a `setView` and gains one), 1958, 2097 and 2228
  - `deck-open-loading.tsx:42,109`
  - `last-slots-strip.tsx:78`
  - `builder-tab-specs.ts`
  - `use-tool-landing.ts`
  - These stay on Analysis because they open the reading: `builder-shell.tsx` 1691 (`onOpenBracket`), 2415 (the notices' `toTab`) and `read-row.tsx:104`. The Games panel's link (2077, `onOpenAnalysis`) does not stay: handoff Q2 retargets it, so B2 renames it `onOpenTuning` and opens Tuning with Suggested changes open.
- Moments: `offAnalysis` (1539) becomes `view !== "tuning"`. The merged ref moves to the Tuning tab button, and the `anchor={{ view: "analysis" }}` at 1956 changes to `tuning`. M2, M3 and M4 all move. The shortcut anchors stay.
- Files: about 14. `builder-shell.tsx`, `tuning-hub.tsx`, `builder-tab-specs.ts`, `builder-view.ts`, `deck-open-loading.tsx`, `last-slots-strip.tsx`, `use-tool-landing.ts`, `src/lib/copy/tuning-hub.ts`, the tests (`builder-tab-specs`, `builder-tabs`, `builder-shell-nudges`, `tuning-hub*`, `builder-initial-view`, `use-visit-receipts`).
- Events: `tuning_opened` with `from` = `tab` or `url`, and `tool` = `consider`, `history`, `suggested`, `mana` or `cuts`. `ask` and `welcome_sheet` come with D and C.

### B3 · About labels for Tuning

- The labels `decks/analysis/{suggested,mana,cuts}` move under a Tuning section: `about-pages.ts`, `pages-visible.ts`, `about/shots.ts`, the labelled screen, and their tests.
- Split out now so B2 stays under 20 files.
- As built: `tuning` is a `DeckView` of its own (`about.ts`, `DECK_VIEW_NAMES`), and `deckViewOf("tuning")` returns it, so the ? on the Tuning tab opens `/about/decks#tuning`. A new Decks section `tuning` (named Tuning, sub line "Tools for this deck." plus the tools sentence that moved off Analysis) holds the three labels, the `pick` and `credits` rules and the three tool cards; Analysis keeps bracket, findings and Describe your deck and the `intent` rule. `/credits`' ? and the old About entries for the three tools and credits land on Tuning.
- The three labels keep their `decks/analysis/*` region keys. A region is also the label's seen and notice key, so a rename would tell every reader the same labels as New again. A label's key is therefore its `region`, not `<area>/<section>/<id>` (`labelKey`), and the section that draws a key is read from the pages (`labelAt`), never out of the key: Show me's `#section` (`showMeHref`, `sectionOf`) and the banner's unit lookup (`notice.ts`) use it.
- Pictures: no re-capture. `pnpm capture:about` needs `next start` of a local build, which is not run while Hugh is away (orchestrator ruling, 2026-11-23). The Tuning section shows the existing `p-analysis-tuning` and `d-analysis-tuning` shots (taken when the hub sat on Analysis) and the un-analyzed deck's `d-analysis-describe` for desktop Mana Balance. The capture frames for the two tuning shots now press the Tuning tab (`about-page-frames.mjs`, `capture-about.mjs`), so the re-shoot follow-up is one `pnpm capture:about` run plus pointing `decks/analysis/mana`'s desktop locator back at `d-analysis-tuning`.

### C · The welcome sheet

- Every row gets Try it. `overview` lands on the most recent deck's Analysis tab. `find-a-deck-read` lands on `/collection?avail=free`. The new Where lines apply.
- The free block (Consider, Find a deck) is added in all three shapes, on Home's strip and on the /credits Welcome cell's sheet.
- `tourCreditsFor` (`welcome-sheet.ts:110`) keeps listing only the spenders, so the free block stays out of it. A test pins this.
- Landings, Y1.
- `freeLine` is tightened (§7). The PR body flags it as the one approved string changed.
- Files: `welcome-sheet.ts`, `tools.ts` (`LANDINGS`), `fits.ts`, `showcase-input.ts`, `welcome-read.ts`, `src/lib/copy/discovery.ts`, the sheet components, and their tests.
- Events: `welcome_where_opened`, with `from` = `home_strip`, `credits_cell` or `tour`. README's `first_run` is the Home strip, so the event uses `home_strip`. `tuning_opened` with `from: welcome_sheet`.

### D · Ask in the card search

- The placeholder and the starters.
- `Tools for this`: up to three tools, best first, above the card results. Then `No card names match.` and the nothing-matches state with About.
- Phrase lists (G10, G13): `tools.ts` entries gain `ask: string[]`, with Consider's list in `LANDINGS`. A pure `matchTools(query, flags)` lives in `src/lib/discovery/ask.ts`.
- A tool that needs a deck the reader does not have still answers when typed. It shows the tool's shipped `none` line, and pressing it lands on New deck (STATES, Ask).
- **The shared listbox:** D extracts the combobox's listbox (two labelled groups) from `search-desktop.tsx`/`search-layer.tsx` into one component. E's popover reuses it, and `check:shared` pins it.
- G11's numbers: the search reads the reader's own figures only from a page context the page already provides, which is the collection count on `/collection` and the deck on `/decks/[id]`. On any other route the answer draws without a figure.
- Files: `card-search.tsx`, `search-desktop.tsx`, `search-layer.tsx`, new `search-listbox.tsx`, new `ask-results.tsx`, `ask.ts`, `tools.ts`, `src/lib/copy/card-search.ts`, and their tests. `card-search.tsx` is 803 lines, so read it in parts.
- Events:
  - `search_opened` with `from` = `rail`, `header` or `cmdk`
  - `ask_result`
  - `ask_miss`
  - `ask_tool_pressed` with `from` = `rail` or `phone_sheet`
  - `find_a_deck_opened` with `from: ask`
  - `tuning_opened` with `from: ask`

### E1 · Home's search panel

- Title, line, the 52px field, the fan and the starters (G14).
- On desktop it answers in place, in an anchored popover. The popover shares the search state and D's listbox. On a phone a press opens the sheet.
- The welcome credits become the panel's foot (G15): `welcome-strip.tsx` `place: "panel"`.
- Files: `dashboard.tsx`, new `home-search-panel.tsx`, the search provider, `welcome-strip.tsx`, `src/app/page.tsx`, `src/lib/copy/home.ts`, and their tests.
- Events:
  - `search_opened` with `from` = `home_field` or `home_starter`
  - `ask_tool_pressed` with `from: home_inline`
  - `welcome_where_opened` with `from: panel_foot`
- a6's page-speed PR touches Home's title and cache reads, so rebase before opening.

### E2 · Home's order and heads

- What's new sits under the lead (G16).
- `HomeSectionHead` (G18) covers What's new, the resume decks, Friends and Commitments.
- Game to log gets its ✕ (G19).
- The busy-day order (Q10 A).
- Files: `dashboard.tsx`, new `home-section-head.tsx`, `whats-new.tsx`, the resume decks, Friends and Commitments section files, `home-log-card.tsx`, and their tests.

### F · What's new in the rail, and the Show all sheet

- What's new tops the desktop rail from 1180, with compact rows (G17).
- The choose line is renamed `Choose notifications`. This updates `feed.ts:82` and the six `whats-new.test.tsx` assertions.
- The Show all sheet: kind chips, day groups and the fixed foot (G20). `/friends` keeps its in-place expand.
- Files: `whats-new.tsx`, `feed-item.tsx`, `show-all.tsx`, new `feed-sheet.tsx`, `src/lib/copy/feed.ts`, `dashboard.tsx`, and their tests.
- Events:
  - `feed_show_all`
  - `feed_sheet_filter`
  - `feed_sheet_clear`, which is new: README's dashboard 6 counts Clear all and no event covers it

### G · The offer lead, the ✕ move, answering in the row (G22 to G24): held

- Released by the orchestrator once Hugh's separate Design prompt settles which source wins.
- It builds after F, because G24's answer-in-row uses F's compact row.
- Not risky: it changes a Home feed read and touches no schema.

### H · PostHog dashboards

- The `Finding the tools` dashboard and its six insights, plus a two-week baseline taken from the credits ledger and the Find a deck and Tuning page views.
- Built in PostHog, with no repo code. Set up once A to F are in production, and recorded in the close-out.

**Build order:** A, B1, B2, B3, C, D, E1, E2, F, then G when released.

## 4. G22: may a seen, still-answerable ask lead?

**Yes.** Hugh's Q16 A says an unanswered, open ask or offer **always** leads over news. Unseen is the rule for news. An ask waits on the reader, so having seen it is no reason to stop leading with it.

Today the lead is chosen in `splitLead` (`home.ts:385`) before any ask is read. The ask or offer is read afterwards (`home.ts:389-392`), and only when the lead is already a `spare-request`. So G moves that read forward:

- When the feed holds any `spare-request` row without an answer, `loadHomeFeed` reads `loadIncomingAsks` and `loadIncomingOffers` before `splitLead`, beside the lookups (`Promise.all`).
- Cost: one or two extra reads, and only on a Home load that holds such a row. Today that read already runs whenever an ask leads. Measure it on staging before the PR opens.
- `splitLead` takes the answerable keys. An item is answerable when its ask or offer is in the read, which means open, unanswered and not run out.
- An answerable `spare-request` leads whether or not it has been seen, newest first. Every other kind keeps the unseen rule.
- `withLeadAsk` reuses the same read rather than reading again.
- The head's unseen count is unchanged: a seen lead does not count as unseen.

Tests:
- `kinds.test.ts` (the `leadStory` cases): a seen answerable ask leads over an unseen trade match, and a seen ask that has run out does not.
- `home.test` (`splitLead`, `withLeadAsk`): the read runs only when such a row exists.
- `lead-story.test.tsx:130` and `dashboard-feed.test.tsx:159` pass the lead in as a prop, so they do not change.

## 5. Yellow gaps, settled from the nearest drawn pattern

Each one becomes a 🔸 row in that PR's `## Design review` table.

- **Y1 · Landings for `consider`, `overview` and `find-a-deck-read` (PR C).** `TOOLS` stays the 14-tool showcase, so About is unchanged. `tools.ts` gains `LANDINGS`, which is `TOOLS` plus two entries that are not in the showcase. A `LandingSpot` type (named apart from `page-tools.ts`'s `Landing`; `landingSpotFor` reads one) carries `id`, `lands` and `needsDeck`, and no `target`, `credit` or `group`, so neither entry reaches the showcase, `TargetId` or the moments. The sheet's Try it builds its href from `LANDINGS`, not from `showcaseGroups`. `fits.ts` gives both a deck rule (the most recently touched deck), and `welcome-read.ts` loads it:
  - `consider`: `{ kind: "deck", tab: "tuning", tool: "consider" }` (`LANDINGS` shipped ahead of B1 with `tab: "consider"`, today's Consider tab. B1 moves the three tune tools to `tuning`, and B2 moves Consider there, since only B2's hub can open it), needs a deck
  - `overview`: `{ kind: "deck", tab: "analysis" }`, needs a deck

  The `?tool=` resolver and the deck picker (`fits.ts`) read `LANDINGS`. `ROW_TOOL` maps `overview` to `overview` and `find-a-deck-read` to the existing `find-a-deck` (`/collection?avail=free`). Ask's tool answers (PR D) match over `TOOLS` plus `consider`. Consider's name and line come from `tuningTabCopy.consider`, because `showcaseCopy.tools` has no Consider. `ToolLands`' deck form gains an optional `tool`, the hub tool to open; it shipped with `LANDINGS` ahead of C, and B2 reads it.
- **Y2 · The Consider tile's status line (PR B2).** It follows the hub tiles' shipped status pattern:
  - Loading: no status line, and the tile keeps its height, as the other tiles do before their reads land.
  - Both counts zero: `nothing to consider` (`tuningTabCopy.consider.none`).
  - Only one count zero: the line still draws (`0 you own · 26 to buy`).
  - Read failed: no status line.
- **Y3 · Tuning on a brew or a deck with no data (PR B2).** The handoff says the tab is always drawn because the hub draws for any deck. Each tile keeps its shipped empty or locked state, as Analysis shows them today. Consider opens the shipped `ConsiderPanel` empty state.
- **Y4 · Consider's desktop toolbar inside the hub (PR B2, G5).** From md it sits at the right end of the hub's underline row, where the deck tabs' row carries it today. On a phone it is the panel's own toolbar row, as drawn.
- **Y5 · The Home panel's popover on a short viewport (PR E).** It uses the rail dropdown's shipped rule: the listbox's max height is the viewport below the field, minus the rail dropdown's own bottom margin, and the list scrolls inside it. It is never a sheet on desktop.
- **Y6 · Ask on a tool whose switch is off (PR D).** STATES already draws this: that tool never answers. A starter whose only answer is a tool that is off, or that needs a deck the reader does not have (Find a deck), is left out, and the row closes up, as Home's STATES row says.
- **Y7 · Show all chips for kinds beyond the four named (PR F).** `feedSheetCopy.kinds` names four. A kind that is present but not named takes its shipped short label from `feedCopy` (the row kicker set at `feed.ts:185`), pluralized as the four are. If a kind has no short plural, the PR's copy-review settles it.

## 6. Events (G21)

`src/lib/analytics/tool-events.ts` (PR A) defines each event's props type. Each property is a literal union, a bounded integer or an array of tool ids. The typed `captureToolEvent(name, props)` lives in `posthog.ts` beside `captureScanFallback` and sends through the same `withClient`, so it uses the production hostnames only and gets the `release` and `standalone` properties every event has. `redactCapture` maps arrays element by element (`redactValue`), so a `tools` array passes through it intact.

The guard test (`tool-events.test.ts`) has one case per event. Each case builds that event's props and asserts:
- every string value is a member of that property's closed set;
- the only number is a 1-to-3 rank, a 1/2/3+ word bucket or a count bucket.

A type-level test also fails if any prop is typed `string`. No query text, typed card name or reader name can reach a property. The search field keeps `ph-no-capture`. Each PR adds its own events' cases.

## 7. Copy review (G12)

Mode: propose. Bound by `.claude/fwd/copy-review.md` (Kitchen Table voice, rule 4 applies). This pass covered every string in `copy strings.ts`, with the rendered neighbours read from the boards.

| String | Class | Verdict | Note |
|---|---|---|---|
| `findADeckCalloutCopy.eyebrow` "Find a deck" | Chrome | KEEP | Names the tool, and the title says something different. |
| `title` "N of your cards are in no deck" | Teaching | KEEP | |
| `bodyAll` "See which of your decks each one could go in." | Teaching | KEEP | |
| `show` "Show them" | Chrome | KEEP | |
| `bodyFree`, `bodyFreeRows`, `bodyFreeRowsPhone` | Teaching | KEEP | The screen does not explain the button without them. |
| `dismiss`, `buttonAria` | A11y | KEEP | |
| `askCopy.placeholder` "Search cards, or ask a question" | A11y / Chrome | KEEP | |
| `starters.heading` "Not sure where to go? Ask" | Teaching | KEEP | It is not drawn on Home, where the panel title says nearly the same. |
| `starters.questions` (four) | Teaching | KEEP | |
| `tools.heading` "Tools for this" | Chrome | KEEP | |
| `yours.spares` | Teaching | KEEP, **one key** | Same string as the call-out title. D reuses `findADeckCalloutCopy.title` rather than defining it twice. |
| `noCards` "No card names match." | Recovery | KEEP | |
| `noTool` title, body, about | Recovery | KEEP | |
| `tuningTabCopy.tab`, `tabAria` | Chrome / A11y | KEEP | The aria name starts with the visible word, so label-in-name holds. |
| `consider.purpose`, `status`, `none` | Teaching / Data | KEEP | |
| `welcomeSheetChanges` Where lines | Data | KEEP | |
| `freeLine` "Free, no credit needed" | Chrome | **TIGHTEN** to "No credit needed" | Rule 7: each row under it carries a `free` pill, so "Free" is said three times. |
| `free[]` rows | Data | KEEP | |
| `homeSearchCopy.title`, `line` | Teaching | KEEP | Adjacency: the field's placeholder repeats the line, but the placeholder goes as soon as the reader types, and the line is the panel's teaching. |
| `firstRunSearchCopy` | — | DEAD | Q12 B was not taken. Not built. |
| `feedChooseCopy.choose` "Choose notifications" | Chrome | KEEP | |
| `feedSheetCopy` (title, count, all, kinds, thisWeek, close) | Chrome / A11y | KEEP | `Today` and `Earlier` reuse `feedCopy` (`feed.ts:84-85`). |

Self-check: one TIGHTEN, no CUT, no em dash in any new string, nothing locked overruled. The TIGHTEN is a word cut on approved copy, applied in PR C. Copy alone does not warrant a Design round.

## 8. Feature acceptance: route × viewport inventory

Each PR adds `docs/superpowers/inventories/tool-discovery-<pr>.json` and runs `node scripts/contact-sheet.mjs` on it against a local dev server. Each PR's probe presses the control, passes on the branch and fails on main.

| Route / surface | 390 | 1300 | iPad 820 | PR |
|---|---|---|---|---|
| `/collection` grid, All (call-out with Show them) | ✅ | ✅ | ✅ | A |
| `/collection?avail=free` grid (buttons under tiles) | ✅ | ✅ | ✅ | A |
| `/collection?avail=free` rows (phone strip, desktop button) | ✅ | ✅ | ✅ | A |
| Card window opened on Find a deck, back to details | ✅ | ✅ | | A |
| `/decks/[id]` tab row (five tabs, Tuning third) | ✅ | ✅ | ✅ | B2 |
| `/decks/[id]?tab=tuning`, hub tiles with Consider first | ✅ | ✅ | ✅ | B2 |
| Tuning with Consider open (phone toolbar, desktop underline row) | ✅ | ✅ | | B2 |
| `/decks/[id]?tab=consider` (old link lands on Tuning with Consider open) | ✅ | ✅ | | B2 |
| `/about` deck pages, Tuning labels | ✅ | ✅ | | B3 |
| Welcome sheet, all three shapes (Home strip, /credits cell) | ☐ | ☐ | | C |
| Card search: nothing typed, a question, nothing matches (rail dropdown, phone sheet) | ☐ | ☐ | | D |
| Home: the panel, typing in place, the credits foot | ☐ | ☐ | ☐ | E1 |
| Home: quiet day and busy day order, section heads | ☐ | ☐ | ☐ | E2 |
| Home rail from 1180, What's new on top | | ✅ | | F |
| Show all sheet: All and one chip | ✅ | ✅ | | F |
| `/friends` Waiting on you (in-place expand unchanged) | ✅ | ✅ | | F |

Sameness checks: the Consider panel inside Tuning is the same import as before (`ConsiderPanel`). Home's in-place list and the rail's dropdown render the same listbox component. Each is checked with `pnpm check:shared` against the inventory's `shares` block.

## 9. Close-out

When the line closes, walk every row above on staging, run feature acceptance at the line's close, record the PostHog dashboard link (H), and confirm PR G's state with the orchestrator.
