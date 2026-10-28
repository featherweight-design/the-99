# About as six visual pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (native) to implement this plan PR by PR. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace About's 83 text entries, its Reference tab, the ? panel (for sectioned screens), the one-time sheet and How it works with six visual pages of labelled real captures, each screen carrying numbered labels, Good to know rules and Try it tool cards, at phone and desktop widths.

**Architecture:** A new copy model (`about-pages.ts`: areas, sections, labels, rules) replaces `about-entries.ts` as the source of truth. Labels and rules are the announced unit (option B), seen by keys that accept every legacy entry id. `capture-about.mjs` shoots each section at 390x844 and 1300x900 in all six themes and measures every label region into a width-aware `shots.generated.ts`. `/about` becomes a six-tile index and `/about/[area]` the page; the ?, the banner and every link into the Reference retarget onto `/about/[area]#<section>`.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind 4, Vitest, Playwright (capture and probes), Drizzle (`user_prefs.about_seen_ids`, no migration).

**Spec:** `design/design_handoff_the99_about_visual/` (README calls 0 to 8, READINESS for engineering, `copy-strings.ts`, the boards) with inputs `docs/superpowers/about-visual/` (workshop, audit, walk rulings, errata).

## Rulings this plan builds on

- Handoff R3 approved by Hugh, 2026-10-28; engineering verdict Yellow (READINESS, engineering section).
- Hugh via d9, 2026-10-27: **How it works RETIRES**; a rule only it holds is folded into its page's Good to know copy through `/copy-review`. **The one-time About sheet RETIRES**; the banner carries launches, and a brand-new account's first-run line points at the `/about` index.
- Hugh via d9, 2026-10-27: the `precons` and `mana-balance` Tools cards and the ? on the nine unsectioned screens (card-details, sets, proxies, history, wishlist, new-deck, account, settings, credits) are **placement, sent to Design**. Until those boards land, both cards keep working and those nine screens keep today's ? panel. They are PR 9, after Design returns.
- Launch rule is discretionary (workshop ruling 6); PR 1 rewrites AGENTS.md and `docs/agents/design-pipeline.md` to it.
- No new app switch (d9 rule e). The new pages ship dark at `/about/[area]` (no link reaches them) until PR 6 swaps every way in at once.

## Global Constraints

- Every label, rule and page string goes through `/copy-review`; a breach blocks the merge. US English, no em dashes.
- The picture matches the device: phone readers see 390 captures, desktop readers 1300 captures, never the other width (call 0). Breakpoint is the app's `md`.
- Pins: 24px accent disc, 14px inside the region's top-left corner, at most five per picture; two pins under 28px apart, the later slides right along its region's top edge; numbers run in reading order across a screen's shots (call 1, G6).
- A feature off for the reader: its label, pin and rule card are gone and numbers close up; never greyed (call 8).
- Capture loading: frame at the capture's known size, a quiet skeleton, no pins; labels read without it (call 8).
- A section with no rules draws no Good to know heading (call 8).
- A visible label with no measured box fails readiness (`shots.test.ts`, G3).
- Account menu unchanged: "About The 99" stays first (call 4).
- Tool card: "How it works ›" becomes "Show me ›", landing on the label lit; the card's press stays Try it (call 6).
- Switch reads through `requestSwitchEnv`; nothing hands `process.env` on (`check:switch-reads`).
- Probes and capture write only on a 0.25 CU scratch branch of local-dev, listed to d9 for deletion.

## Review Focus

1. **A returning reader is told nothing twice.** Every legacy seen id (`<entry>`, `<entry>@<SWITCH>`, `how-it-works`) maps to the label and rule keys it became; a reader who saw everything at version 16 sees no banner line after the swap. Test: `legacySeen` table round-trip in PR 1.
2. **A switch off for the reader removes the label from every surface at once**: page list, pin, rule card, tool card, banner crop, On this page chip. Test per surface in PR 3 to 6, driven from one `visibleSections(env)` result.
3. **A deep link to a retired id still lands.** `/about?tab=reference#credits`, `#locked-cards`, `#push` and the gate's `next=` keep reaching the content's new home. Test: `legacyHref` in PR 6.
4. **Theme and width mismatch.** A shot missing for a (theme, width) falls back to the dark reference at the same width, never the other width. Test in PR 2's `shotFor`.
5. **Pins on a re-taken capture.** A region box that moves past the frame edge, or two that overlap fully, does not draw a pin off the picture or two pins on one spot. Test in PR 3's `placePins`.

---

## PR boundaries

| PR | Scope | Files (approx) | Runtime lines (approx) |
|---|---|---|---|
| 1 | Copy model, seen translation, tool label targets, launch-rule docs, the plan | 12 | 650 |
| 2 | Capture pipeline at two widths, region locators, fixtures for the two flagged regions | 10 | 700 |
| 2b | The captures and the regenerated manifest (generated assets only) | assets | generated |
| 3 | `/about/[area]`: strip, On this page, the labelled screen (pins, list, press-to-light), states | 14 | 750 |
| 4 | Good to know: the rule card and its diagrams | 12 | 700 |
| 5 | Try it: tool cards on the page, Show me navigate-then-light | 9 | 450 |
| 6 | The swap: `/about` index, the ?, the banner and first-run line, every link into the Reference | 16 | 700 |
| 7 | Retire: Reference, sheet, How it works, the panel's sectioned half, `about-entries.ts` minus the nine screens | deletions | net negative |
| 8 | Close-out: inventory, contact sheet, feature-acceptance walk at 390 and 1300 | 4 | 100 |
| 9 | After Design: the two tools' placement and the nine screens' ?; the panel and the last entries retire | tbd | tbd |

PR 7 is mostly deletion; its added lines stay under 200. No PR stacks on another; each is cut from fresh `main`.

---

## PR 1: Copy model and seen state

### Task 1.1: The page copy model

**Files:**
- Create: `src/lib/copy/about-pages.ts`
- Create: `src/lib/copy/about-pages.test.ts`
- Modify: `src/lib/copy/about.version.json` (hash re-pin, no bump)

**Interfaces:**
- Produces:
  - `type AboutArea = "home" | "collection" | "commanders" | "decks" | "shopping" | "friends"`
  - `interface AboutLabel { id: string; region: string; lead: string; rest: string; switch: AboutLineSwitch | null; sentences?: Partial<Record<string, AboutLineSwitch>>; since: number }`
  - `interface AboutRule { id: string; text: string; switch: AboutLineSwitch | null; sentences?: Partial<Record<string, AboutLineSwitch>>; diagram: RuleDiagram; since: number }`
  - `interface AboutSection { area: AboutArea; id: string; name: string; sub: string; screens: readonly AboutScreenRef[]; captures: { phone: readonly string[]; desktop: readonly string[] }; labels: readonly AboutLabel[]; rules: readonly string[]; tools: readonly ToolId[] }`
  - `ABOUT_AREAS`, `ABOUT_SECTIONS`, `ABOUT_RULES`, `ABOUT_STRINGS` (shapes as in `copy-strings.ts`, plus `captures` as an ordered list for second shots and `screens` naming which `AboutScreen`/`DeckView` each section covers)
  - `labelKey(section, label) => \`${section.area}/${section.id}/${label.id}\`` and `ruleKey(id) => \`rule/${id}\``

- [ ] **Step 1:** Run `/copy-review` over `copy-strings.ts`, the audit's facts with no string (READINESS "Resolved by engineering", bullet 3) and the rules How it works alone holds. Record the result in the PR body. Every switched clause becomes a `sentences` entry keyed by its exact text, the same mechanism as `captionLineSwitches`.
- [ ] **Step 2:** Write tests in `about-pages.test.ts`: every label `region` is unique; every section's `rules` name a key of `ABOUT_RULES`; every `switch` and `sentences` value is in `registry.ts`; at most five labels share one capture; every `AboutScreen` but the nine unsectioned ones and every `DeckView` is in exactly one section's `screens`; the content hash matches `about.version.json`.
- [ ] **Step 3:** Run `pnpm vitest run src/lib/copy/about-pages.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 4:** Write `about-pages.ts` from the reviewed strings. `since` is 16 for every migrated label and rule (all already announced).
- [ ] **Step 5:** Run the test. Expected: PASS. Commit.

### Task 1.2: Visibility and seen

**Files:**
- Create: `src/lib/about/pages-visible.ts`, `src/lib/about/pages-visible.test.ts`
- Create: `src/lib/about/legacy-seen.ts`, `src/lib/about/legacy-seen.test.ts`

**Interfaces:**
- Consumes: Task 1.1's model; `SeenState` from `visible.ts`.
- Produces:
  - `visibleSections(env: SwitchEnv, sections = ABOUT_SECTIONS): VisibleSection[]`: labels and rules whose switch fails are dropped and switched sentences stripped (reuse `lineSwitchHolds` from `visible.ts`; export it there); empty sections are kept, so the page still lists the screen.
  - `labelSeen(key: string, since: number, switched: boolean, seen: SeenState): boolean`: an unswitched unit is seen when `since <= seen.version`; a switched one when `seen.ids` holds its key or any legacy id `LEGACY_SEEN` maps to it.
  - `LEGACY_SEEN: Readonly<Record<string, readonly string[]>>`: legacy id (`<entry>` or `<entry>@<SWITCH>`) to the new keys it covers. Written from the audit's keep/merge/cut table.
  - `unseenUnits(visible: VisibleSection[], seen: SeenState): { key: string; area: AboutArea; section: string }[]`
  - `seenKeysOf(visible: VisibleSection[]): string[]`: the switched keys a visit writes, the analogue of `switchedIds`.

- [ ] **Step 1:** Tests: a reader at version 16 whose `ids` hold every switched entry today's `switchedIds` would write has `unseenUnits` empty (build the fixture from `switchedIds(visibleEntries(allOn))`, so it tracks the real entry list); a reader holding only `upload-choice` sees the Sync label unseen and the upload label seen; `friend-spares@SPARE_REQUESTS_ENABLED` covers the spare label's switched sentence; every value in `LEGACY_SEEN` is a real key; every switched legacy entry id is a key of `LEGACY_SEEN` (the guard that keeps the table complete).
- [ ] **Step 2:** Run them. Expected: FAIL. Implement. Expected: PASS. Commit.

### Task 1.3: Tool cards aim at labels

**Files:**
- Modify: `src/lib/discovery/tools.ts`, `src/lib/discovery/entry-targets.ts`, `src/lib/discovery/tools.test.ts`

**Interfaces:**
- Produces: each `Tool` gains `label: string | null` (a `labelKey`). `precons` and `mana-balance` get `null` until PR 9. `entry` stays until PR 7.

| Tool | Label |
|---|---|
| help-me-choose | `commanders/for-you/places` |
| top-off | `decks/your-deck/mix` |
| proposed-cuts | `decks/analysis/cuts` |
| suggested-changes | `decks/analysis/suggested` |
| stand-ins | `shopping/deck-shopping/standins` |
| friend-spares | `shopping/deck-shopping/spare` |
| find-a-deck | `collection/cards/taken` |
| wishlist | `collection/cards/tabs` |
| collection-sync | `collection/upload/drop` |
| matchups | `decks/games/matchups` |
| lineup | `decks/your-decks/decks-stats` |
| friends | `friends/friends/add` |

The table is the handoff's placement (each section's `tools` list) read against the labels; where the key differs from the reviewed model, the model's key wins.

- [ ] **Step 1:** Test: every non-null `label` names a label in `ABOUT_SECTIONS` whose section lists that tool. Run (FAIL), implement, run (PASS), commit.

### Task 1.4: The launch rule

**Files:**
- Modify: `AGENTS.md` (the "No FEATURE launches without an About entry" bullet and the batching bullet above it), `docs/agents/design-pipeline.md` (the same two sections)

- [ ] **Step 1:** Replace both with the workshop's ruling 6: a launch Hugh picks adds one label and re-takes its screenshot; a Good to know rule only for a rule the screen cannot show; a cosmetic change only re-takes the screenshot; Hugh decides which launches get a label. Keep the switch rule (a label follows its feature's switch, so it never reaches production before the feature). Commit.

PR 1 ships the plan file and has no reader-visible change.

---

## PR 2: Captures at two widths

### Task 2.1: Region locators

**Files:**
- Modify: `scripts/lib/about-locators.mjs`, `scripts/lib/about-locators.test.mts`

**Interfaces:**
- Produces: `ABOUT_REGIONS: Record<region, { capture: string; locator: string; desktop?: string; reaches?: string }>`, one per label `region`. `desktop` overrides the locator when the control lives on the rail at 1300.

- [ ] **Step 1:** Test: every label region in `ABOUT_SECTIONS` has a locator; every `capture` is in its section's capture list. FAIL, write, PASS, commit.

### Task 2.2: Two widths, a width-aware manifest

**Files:**
- Modify: `scripts/capture-about.mjs`, `src/lib/about/shots.ts`, `src/lib/about/shots.test.ts`

**Interfaces:**
- Produces:
  - Output `public/about/shots/<theme>/<width>/<capture>.webp`, `width` is `phone` (390x844) or `desktop` (1300x900); tour shots keep their current path (the tour is unchanged).
  - Manifest `ABOUT_SHOTS[theme][width][capture] = { w, h, regions: Record<region, Box>, tools: Record<ToolId, Box> }`.
  - `pageShotFor(theme, width, capture): PageShot | null`, falling back to `amonkhet` at the same width (Review Focus 4).
  - Desktop tool-card crops: `tools/<toolId>.webp` per theme per width, cropped around the halo box.
- [ ] **Step 1:** Tests in `shots.test.ts`: every visible label region has a box in every theme at both widths (fails readiness otherwise); `pageShotFor` never returns another width. FAIL.
- [ ] **Step 2:** Parameterise `VIEW` and the crop and fraction maths on width; drive frames from `ABOUT_SECTIONS[*].captures`; measure `ABOUT_REGIONS`; keep `disguise`, `assertScratchBranch` and the merge-on-partial-run behaviour.
- [ ] **Step 3:** Run on a scratch branch for one theme to prove it; tests PASS against that partial manifest. Commit the code, not the images.

### Task 2.3: Fixtures for the two flagged regions

**Files:**
- Modify: `scripts/about-fixtures.mts`, `scripts/lib/about-fixture-ids.mjs`

- [ ] **Step 1:** Add a stored analysis on the Played deck (phone Analysis "What is in this deck") and a second fixture friend in the account's pod (desktop Friends "Rule 0 check"), both under the fixture ids so `about-clear` and re-runs stay idempotent. Commit.

PR 2b: run the full capture (six themes, two widths) on the scratch branch and commit only `public/about/shots/**` and `shots.generated.ts`. The old 390-only shots stay until PR 7 because the Reference and the panel still draw them.

---

## PR 3: The page and the labelled screen

### Task 3.1: Route and strip

**Files:**
- Create: `src/app/about/[area]/page.tsx`, `src/app/about/[area]/page.test.tsx`
- Create: `src/components/about/pages/area-page.tsx`, `on-this-page.tsx`

**Interfaces:**
- Consumes: `visibleSections`, `pageShotFor`.
- Produces: `/about/[area]` renders the six-page strip (`PlaceStrip`, the shipped strip; Main board's strip), the area's name and line, On this page chips (the ? panel's chip component, imported as-is; the panel stays for the nine unsectioned screens until PR 9), then each section in order with id `#<section>`. An unknown area 404s. No link reaches the route until PR 6.

### Task 3.2: The labelled screen

**Files:**
- Create: `src/components/about/pages/labelled-screen.tsx`, `src/lib/about/pins.ts`, `src/lib/about/pins.test.ts`

**Interfaces:**
- Produces: `placePins(regions: { key: string; box: Box }[], frame: { w: number; h: number }): { key: string; n: number; x: number; y: number }[]`: 14px inside each box's top-left, clamped inside the frame, reading order (top then left), later pin slides right when within 28px, fully overlapping boxes share a pin (Review Focus 5).
- Phone: capture full width, label list under it. Desktop: capture 700 wide, labels beside it (Decks-Desktop board). Pressing a label or a pin lights its region with the tool cards' halo (`HALO_ATTR` look). A section with two captures numbers on across both.
- Loading: the frame at the shot's `w`/`h`, a skeleton, no pins (States board).
- [ ] Tests: `placePins` on the boards' crowding study (3, 5, 8 regions); the label list renders no pin and no line for a label `visibleSections` dropped and numbers close up.

Before `gh pr create`: design-review property table against Decks-Phone, Decks-Desktop, Labels and States boards; feature-acceptance contact sheet of `/about/decks` at 390 and 1300.

---

## PR 4: Good to know

**Files:**
- Create: `src/components/about/pages/rule-card.tsx`, `rule-diagrams.tsx`, tests

**Interfaces:**
- Consumes: `ABOUT_RULES[id].diagram`: one of `card-row`, `deck-tile`, `buy-tag`, `bracket-medal`, `role-cell` with fixture props per rule (Labels board, call 2).
- Produces: a rule card (kicker with the banner's diamond mark, diagram, one or two sentences) built from the app's own components with fixture props, never screenshots. Phone: a swipe row with dots. Desktop: a grid of three under the labelled screen. Heading: ruled line above, Cinzel 18, the mark, a muted sub-line (R3).
- [ ] Tests: no rules after `visibleSections` means no heading; a switched sentence absent when its switch is off. Design-review against Labels, Decks and Other-Pages boards.

---

## PR 5: Try it

**Files:**
- Modify: `src/components/about/tools/tool-card.tsx`, `src/lib/discovery/showcase.ts`
- Create: `src/components/about/pages/try-it.tsx`, `src/components/discovery/label-landing.tsx`

**Interfaces:**
- Consumes: Task 1.3's `Tool.label`.
- Produces: a section's tools, after its rules (phone: the first and "N more below"; desktop: a row of three). "Show me ›" links to `/about/<area>?lit=<labelKey>#<section>`; `label-landing.tsx` reads `lit`, lights the label and strips the parameter through `mirrorUrl`. The press stays Try it (`tryHref`, unchanged). A desktop card uses its tool's desktop crop. The existing Tools tab keeps "How it works ›" until PR 6 removes the tab.
- [ ] Tests: `showcaseGroups` keeps a tool only when its label is visible; Show me's href for every tool with a label.

---

## PR 6: The swap

**Files:**
- Modify: `src/app/about/page.tsx` (the index: six tiles, each its page's first capture at the reader's width; "Take the tour →" stays), `src/components/help/help-root.tsx` and `nav.tsx` (the ?), `src/lib/about/screen-for-path.ts`, `src/components/home/arrivals-banner.tsx`, `src/lib/about/notice.ts`, `src/lib/copy/arrivals.ts`, `src/lib/copy/credits.ts`, `src/lib/about/gate.ts`, `src/proxy.ts`, `src/app/about/actions.ts`, `src/lib/about/read.ts`
- Create: `src/lib/about/legacy-href.ts`, `src/components/about/pages/back-bar.tsx`, tests

**Interfaces:**
- `sectionForScreen(screen: AboutScreen, view?: DeckView): { area; section } | null`: null for the nine unsectioned screens, which keep opening today's panel.
- The ? on a sectioned screen navigates to `/about/<area>?from=<path>#<section>`; `back-bar.tsx` holds "‹ Back to {screen}" at the top while `from` is set.
- The banner: one launch is "New on {page}:" plus the label's crop (64x48 phone, 56x38 desktop) and Show me; two or more, the "New in the app" band with a crop per line (Ways-In board). Its lines come from `unseenUnits`. A brand-new account's first-run line links to `/about`.
- `legacyHref(href: string): string` maps `/about?tab=reference#<entry>` and `/about?tab=tools` to the content's new home through `LEGACY_SEEN`; `CREDITS_HREF` and the gate's `next=` redirect go through it (Review Focus 3).
- A visit records `seenKeysOf(visible)` for the page visited, merged as today (`read.ts`).
- [ ] Tests: banner one and two launch forms from a fixture `SeenState`; `legacyHref` for `#credits`, `#locked-cards`, `#push`, an unknown hash (the index); a reader at 16 with every id shows no banner line. Design-review against Ways-In. Contact sheet of every way in at both widths.

---

## PR 7: Retire

Delete the Reference tab and its files, `about-tabs.tsx`'s Reference half, the one-time sheet (`about-sheet.tsx`, presence, state, `flag.ts`, `gate.ts`'s `sheetDecision`, its proxy wiring), How it works (`how-it-works.tsx`, `how-rows.tsx`, `how-it-works-links.ts`, `how-it-works-flag.ts` and its deck and friends-table reads), keeping `howItWorksCopy.methods`/`bracketMethods` moved to `src/lib/copy/method-tags.ts` for `method-tag.tsx` and `provenance-panel.tsx`. Cut `about-entries.ts` to the nine unsectioned screens' entries the panel still serves. Retire `ABOUT_SHEET_ENABLED` and `HOW_IT_WORKS_ENABLED` from the registry and `ALL_FEATURES` lists. Re-point every probe and inventory listed in the build map (§E) in the same PR; `probe-about.mjs` and `probe-about-how-it-works.mjs` become `probe-about-pages.mjs`. Old 390 shots no longer drawn are deleted.

## PR 8: Close-out

`docs/superpowers/inventories/about-visual.json` (every page, the index, the ? from one screen per area, banner one and two, Show me landing, the States), contact sheet at 390 and 1300, `pnpm check:shared` for the strip and chips, feature-acceptance walk against the brief, tracker row to Shipped.

## PR 9: After Design

Place `precons` and `mana-balance` and the nine screens' ? per Design's boards; then the panel, `/api/about/entries`, search and `about-entries.ts` retire.

## Open for d9

- **Announcing the redo.** Default: no announcement and no `ABOUT_VERSION` bump. The redo changes About itself, it is not a launch Hugh picked, and every migrated unit is already seen.
- **Where the two unplaced tools live between PR 6 and PR 9.** PR 6 makes `/about` the index, which removes the Tools tab, but `precons` and `mana-balance` have no section until Design returns. Default: `/about?tab=tools` keeps rendering today's Tools tab, all 14 cards, unlinked from the index but reachable from any existing link, and it retires in PR 9. The alternative, an index row for it, is placement and would go to Design.
- **Dark route.** The new pages are reachable by URL from PR 3 until PR 6 without a switch. Default: accept that, because nothing links there.
