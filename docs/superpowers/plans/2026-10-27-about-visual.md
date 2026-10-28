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
- No new app switch (d9 rule e). The new pages ship dark at `/about/[area]` (no link reaches them) until PR 6a swaps every way in at once.

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

1. **A returning reader is told nothing twice, at ANY version floor.** Today's entries carry `since` 1 to 16 (33 at 1, 22 at 14, 13 at 16), and unswitched entries are seen by the floor alone, never written to `ids`. A reader at floor 1, 9, 14 or 16 with the ids their visits wrote sees exactly what they would have seen unannounced before, no more. Test: Task 1.2 sweeps every floor from 0 to 16.
2. **A switch off for the reader removes the label from every surface at once**: page list, pin, rule card, tool card, banner crop, On this page chip. Test per surface in PR 3 to 6, driven from one `visibleSections(env)` result.
3. **A deep link to a retired id still lands.** `/about?tab=reference#credits`, `#locked-cards`, `#push` and the gate's `next=` keep reaching the content's new home. Test: `legacyHref` in PR 6.
4. **Theme and width mismatch.** A shot missing for a (theme, width) falls back to the dark reference at the same width, never the other width. Test in PR 2's `shotFor`.
5. **Pins on a re-taken capture.** A region box that moves past the frame edge, or two that overlap fully, does not draw a pin off the picture or two pins on one spot. Test in PR 3's `placePins`.

---

## PR boundaries

| PR | Scope | Files (approx) | Runtime lines (approx) |
|---|---|---|---|
| 1 | Copy model, seen translation, tool label targets, launch-rule docs, the plan | 12 | 750 |
| 2 | Capture pipeline at two widths beside the old one, region locators, fixtures, the new captures and manifest | 10 code + assets | 700 + generated |
| 3 | `/about/[area]`: strip, On this page, the labelled screen (pins, list, press-to-light), states | 14 | 750 |
| 4 | Good to know: the rule card and its diagrams | 12 | 700 |
| 5 | Try it: tool cards on the page, Show me navigate-then-light, the landing's New mark | 9 | 500 |
| 6a | Ways in: `/about` index, the ? on sectioned screens with the Back bar, `legacyHref` for every Reference link, their probes and tables | 16 | 650 |
| 6b | Launches: the banner and first-run line, seen writes, the sheet and the gate's redirect retire, their probes and tables | 16 | 600 |
| 7a | Retire How it works (method tags kept) | deletions | net negative |
| 7b | Retire the Reference, the cut entries and the 390-only shots | deletions | net negative |
| 8 | Close-out: inventory, contact sheet, feature-acceptance walk at 390 and 1300 | 4 | 100 |
| 9 | After Design: the two tools' placement and the nine screens' ?; the panel, the Tools tab and the last entries retire | tbd | tbd |

**Every PR keeps every shipped surface working.** Each PR that changes a string a probe, an inventory or a copy-drift design table quotes (`about.md`, `about-r6.md`, `about-how-it-works.md`, `about-launch-entries.md`, `discovery-r2-5-tools.md`, `discovery-r2-6a-reference.md`, `discovery-r2-8-help.md`) fixes that probe, inventory or table in the same PR, and every PR that touches pinned content re-pins `about.version.json` (no bump). 7a and 7b are deletion PRs; their added lines stay under 200, and if either passes 20 changed files of surviving code it splits again by directory. No PR stacks; each is cut from fresh `main`.

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
  - `interface AboutRule { text: string; switch: AboutLineSwitch | null; sentences?: Partial<Record<string, AboutLineSwitch>>; since: number; legacy: readonly string[] }`, keyed by `AboutRuleId`. The rule's diagram is PR 4's (as built: it is drawn from the Labels board there, not guessed here).
  - Labels carry the same `legacy: readonly string[]`: the entry ids (bare, or `<id>@<SWITCH>` for a variant) the unit's words came from, per the audit's keep and merge table.
  - `interface AboutSection { area: AboutArea; id: string; name: string; sub: string; screens: readonly AboutScreenRef[]; captures: { phone: readonly string[]; desktop: readonly string[] }; labels: readonly AboutLabel[]; rules: readonly string[]; tools: readonly ToolId[] }`
  - `ABOUT_AREAS`, `ABOUT_SECTIONS`, `ABOUT_RULES`, `ABOUT_STRINGS` (shapes as in `copy-strings.ts`, plus `captures` as an ordered list for second shots and `screens` naming which `AboutScreen`/`DeckView` each section covers)
  - `labelKey(section, label) => \`${section.area}/${section.id}/${label.id}\``, `ruleKey(id) => \`rule/${id}\`` and `sentenceKey(key, sw) => \`${key}@${sw}\`` (as built: in `pages-visible.ts`); a rule is listed by exactly one section, so its area and section resolve from the key

- [ ] **Step 1:** Run `/copy-review` over `copy-strings.ts`, the audit's facts with no string (READINESS "Resolved by engineering", bullet 3) and the rules How it works alone holds. Record the result in the PR body. Every switched clause becomes a `sentences` entry keyed by its exact text, the same mechanism as `captionLineSwitches`.
- [ ] **Step 2:** Write tests in `about-pages.test.ts`: every label `region` is unique; every rule is listed by exactly one section; every section's `rules` name a key of `ABOUT_RULES`; every `switch` and `sentences` value is in `registry.ts`; at most five labels share one capture; every `AboutScreen` but the nine unsectioned ones and every `DeckView` is in exactly one section's `screens`; every `legacy` id is a real entry id (or `<id>@<variant switch>`). Add the new copy objects to `contentHash()` in `src/lib/copy/about.test.ts` (one hash, one pin) and re-pin `about.version.json`.
- [ ] **Step 3:** Run `pnpm vitest run src/lib/copy/about-pages.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 4:** Write `about-pages.ts` from the reviewed strings. A migrated unit's `since` is the HIGHEST `since` among its unswitched `legacy` entries (so a reader at a lower floor who never saw the newest source is still told once, and nobody is told twice); a unit with no unswitched source takes 16. The `home/home/help` label's words go to `/copy-review` with the note that the nine panel screens keep the panel until PR 9.
- [ ] **Step 5:** Run the test. Expected: PASS. Commit.

### Task 1.2: Visibility and seen

**Files:**
- Create: `src/lib/about/pages-visible.ts`, `src/lib/about/pages-visible.test.ts`
- Create: `src/lib/about/legacy-seen.ts`, `src/lib/about/legacy-seen.test.ts`

**Interfaces:**
- Consumes: Task 1.1's model; `SeenState` from `visible.ts`.
- Produces:
  - `visibleSections(env: SwitchEnv, sections = ABOUT_SECTIONS): VisibleSection[]`: labels and rules whose switch fails are dropped and switched sentences stripped (reuse `lineSwitchHolds` from `visible.ts`; export it there); empty sections are kept, so the page still lists the screen.
  - `unitSeen(unit: Pick<VisibleUnit, "key" | "since" | "legacy" | "switch">, seen: SeenState): boolean`:
    - seen when `seen.ids` holds `unit.key`;
    - else seen when `seen.ids` holds any of `unit.legacy` that is a SWITCHED entry's id or a variant id (those are the only legacy ids ever written, `switchedIds`, `visible.ts:228`);
    - else, for a unit that IS a switched entry's announcement (a legacy entry carries the unit's own switch, as `locked-cards` does for the lock label), NOT seen: such an entry was seen by id alone;
    - else, for an UNSWITCHED unit, seen when `unit.since <= seen.version`;
    - else, for a switched unit whose legacy sources are all unswitched entries, seen when `unit.since <= seen.version`, exactly as an unswitched unit. Today such a line was a `captionLineSwitches` line inside an unswitched entry, shown whenever the switch resolved on and seen with that entry by the floor. `visibleSections` only returns the unit while the switch resolves on for this reader (env plus `flag_overrides`, `requestSwitchEnv`), so the floor rule reproduces today's behaviour. Production has COMMANDERS_PLACE, FRIEND_DECKS, SPARE_REQUESTS, NEAR_COMBOS, STRATEGY_FOCUS, PUSH and HOME_FEED on app-wide through `flag_overrides` (d9, 2026-10-27), so treating these units as new would re-tell every production reader. A later off-to-on flip of such a switch is not announced, which is also what happens today.
  - A unit's switched sentences are announced too: each `sentences` switch gives the unit an announce key `<key>@<SWITCH>`, seen by that key or by a legacy variant id that carried the same switch (`upload-choice@COLLECTION_SYNC_ENABLED`, `friend-spares@SPARE_REQUESTS_ENABLED`).
  - `unseenUnits(visible: VisibleSection[], seen: SeenState): { key: string; area: AboutArea; section: string }[]`
  - `seenKeysOf(units): string[]`: every announce key of the given units, switched or not. A visit writes the keys of the PAGE visited; the version floor is never raised by a page visit (a visit to Decks must not mark Friends' new units seen), only by the banner's ✕, which writes every unseen key.

- [ ] **Step 1:** Tests: for every floor 0 to 16, a reader whose `ids` are `switchedIds(visibleEntries(allOn))` restricted to entries with `since <= floor` gets `unseenUnits` equal to the units whose sources include an unswitched entry with `since > floor` (fixture built from the real entry list, so it tracks it); a reader holding `upload-choice@COLLECTION_SYNC_ENABLED` has the replace rule's Sync announce key seen; a reader holding only `upload-choice` has it unseen; `commanders/for-you/places` is SEEN for a reader at floor 16 whose `COMMANDERS_PLACE_ENABLED` is on only through an app-wide `flag_overrides` row (env unset), and unseen for a reader at a floor below its source's `since`; a visit to Decks writes no Friends key and leaves the floor.
- [ ] **Step 2:** Run them. Expected: FAIL. Implement. Expected: PASS. Commit.

### Task 1.3: Tool cards aim at labels

**Files:**
- Modify: `src/lib/discovery/tools.ts`, `src/lib/discovery/entry-targets.ts` (gains `LABEL_TARGETS`, the client mirror of `Tool.label`), `src/lib/discovery/entry-targets.test.ts` (holds both mirrors equal), `src/lib/discovery/tools.test.ts`

**Interfaces:**
- Produces: each `Tool` gains `label: string | null` (a `labelKey`). `precons` and `mana-balance` get `null` until PR 9. `entry` stays until PR 9; 7b trims it to the remaining entries.

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

`page-shots` names replace `pageShotFor`'s source in every later PR; the old `shots.ts` is untouched until 7b.

### Task 2.2: Two widths, a second manifest

**Files:**
- Modify: `scripts/capture-about.mjs`
- Create: `src/lib/about/page-shots.ts`, `src/lib/about/page-shots.test.ts`, `src/lib/about/page-shots.generated.ts` (written by the script)

**Interfaces:**
- The OLD manifest, `shots.generated.ts`, its 390 frames and `REQUIRED_SHOTS` stay exactly as they are: the Reference, the panel, the tool cards and the tour read them until PR 7b. The script writes both manifests in one run.
- Produces:
  - Output `public/about/pages/<theme>/<width>/<capture>.webp` (`width` is `phone`, 390x844, or `desktop`, 1300x900) and `public/about/pages/<theme>/<width>/tools/<toolId>.webp`, the desktop card crop around the halo box.
  - `PAGE_SHOTS[theme][width][capture] = { w, h, regions: Record<region, Box>, tools: Record<ToolId, Box> }`.
  - `pageShotFor(theme, width, capture): PageShot | null`, falling back to `amonkhet` at the SAME width (Review Focus 4).
- [ ] **Step 1:** Tests in `page-shots.test.ts`: every visible label region has a box in every theme at both widths (fails readiness otherwise); no two labels on one capture have identical boxes (they would be one label, G6); `pageShotFor` never returns another width. FAIL.
- [ ] **Step 2:** Parameterise `VIEW` and the crop and fraction maths on width; drive the new frames from `ABOUT_SECTIONS[*].captures`; measure `ABOUT_REGIONS`; keep `disguise`, `assertScratchBranch` and merge-on-partial-run.
- [ ] **Step 3:** Run the full capture, six themes and both widths, on a 0.25 CU scratch branch of local-dev. Tests PASS. Commit code, images and manifest together.

The images are generated, so they sit outside the size gate, but they are many: about 28 captures x 2 widths x 6 themes plus the tool crops, 400 to 500 WebP files. At today's average (7.6 MB for 246 files) that is 15 to 20 MB more in `public/` until PR 7b deletes the 390-only set. The PR body states the count and the bytes.

### Task 2.3: Fixtures so every region is in shot (G1)

**Files:**
- Modify: `scripts/about-fixtures.mts`, `scripts/lib/about-fixture-ids.mjs`

- [ ] **Step 1:** Under the fixture ids, so `about-clear` and re-runs stay idempotent: a stored analysis on the Played deck (phone Analysis "What is in this deck"); a second fixture friend in the account's pod (desktop Friends "Rule 0 check"); the deck frames scrolled to show the Recommended mix and the commit band rather than shot with the tabs at the top; a locked card on the deck the desktop shot uses; and both Analysis captures taken on the same deck. Commit.

## PR 3: The page and the labelled screen

### Task 3.1: Route and strip

**Files:**
- Create: `src/app/about/[area]/page.tsx`, `src/app/about/[area]/page.test.tsx`
- Create: `src/components/about/pages/area-page.tsx`, `on-this-page.tsx`

**Interfaces:**
- Consumes: `visibleSections`, `pageShotFor` (`page-shots.ts`).
- Produces: `/about/[area]` renders the six-page strip (`PlaceStrip`, the shipped strip; Main board's strip), the area's name and line, On this page chips (the ? panel's chip component, imported as-is; the panel stays for the nine unsectioned screens until PR 9), then each section in order with id `#<section>`. An unknown area 404s. No link reaches the route until PR 6.

### Task 3.2: The labelled screen

**Files:**
- Create: `src/components/about/pages/labelled-screen.tsx`, `src/lib/about/pins.ts`, `src/lib/about/pins.test.ts`

**Interfaces:**
- Produces: `placePins(regions: { key: string; box: Box }[], frame: { w: number; h: number }): { key: string; n: number; x: number; y: number }[]`: 14px inside each box's top-left, clamped inside the frame, reading order (top then left), later pin slides right along its region's top edge when within 28px, never past the frame (Review Focus 5). Identical boxes are refused earlier, by Task 2.2's test.
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
- Produces: a section's tools, after its rules (phone: the first and "N more below"; desktop: a row of three). "Show me ›" links to `/about/<area>?lit=<labelKey>#<section>`; `label-landing.tsx` reads `lit`, lights the label, and when the label is unseen marks it **New** and draws its tool card directly under it (call 7, Ways-In board), then strips `lit` through `mirrorUrl`. The press stays Try it (`tryHref`, unchanged). A desktop card uses its tool's desktop crop. The Tools tab at `/about?tab=tools` is unchanged and stays until PR 9 (it holds the two unplaced tools); its "How it works ›" links go through `legacyHref` from PR 6a.
- [ ] Tests: `showcaseGroups` keeps a tool on a page only when its label is visible; Show me's href for every tool with a label; the landing draws New and the card under the label only for an unseen label.

---

## PR 6a: Ways in

**Files:**
- Modify: `src/app/about/page.tsx` (the index: six tiles, each its page's first capture at the reader's width; "Take the tour →" stays; `?tab=tools` still renders today's Tools tab), `src/components/help/help-root.tsx` and `nav.tsx` (the ?), `src/lib/about/screen-for-path.ts`, `src/lib/about/help-panel.ts` (its Reference links), `src/components/about/tools/tool-card.tsx` and `tools-tab.tsx` (their Reference links), `src/lib/copy/credits.ts`, the probes `probe-about.mjs` and `probe-help-panel.mjs`, the inventories and copy-drift tables that quote what changes
- Create: `src/lib/about/legacy-href.ts`, `src/components/about/pages/back-bar.tsx`, tests

**Interfaces:**
- `sectionForScreen(screen: AboutScreen, view?: DeckView): { area; section } | null`: null for the nine unsectioned screens, which keep opening today's panel.
- The ? on a sectioned screen navigates to `/about/<area>?from=<path>#<section>`; `back-bar.tsx` holds "‹ Back to {screen}" at the top while `from` is set.
- `legacyHref(href: string): string` maps `/about?tab=reference#<entry>` (and the bare Reference) to `/about/<area>#<section>` through each unit's `legacy` list, `#new` to `/about`, and an unknown hash to `/about`; `/about?tab=tools` is left alone. EVERY built Reference link goes through it: `CREDITS_HREF`, `help-panel.ts:82`, `tool-card.tsx:18`, `tools-tab.tsx:110` (Review Focus 3).
- [ ] Tests: `legacyHref` for `#credits`, `#locked-cards`, `#push`, `#new`, an unknown hash, and `?tab=tools` unchanged; `sectionForScreen` null for exactly the nine; the account menu's first row is still "About The 99" (call 4). Design-review against Ways-In and Main. Contact sheet of the index and the ? from one screen per area at both widths.

## PR 6b: Launches

**Files:**
- Modify: `src/components/home/arrivals-banner.tsx`, `src/lib/about/notice.ts`, `src/lib/copy/arrivals.ts`, `src/lib/about/gate.ts`, `src/proxy.ts`, `src/app/about/actions.ts`, `src/lib/about/read.ts`, `src/components/shell/shell.tsx`, `src/lib/switches/registry.ts` (retire `ABOUT_SHEET_ENABLED`), `probe-about-banner.mts`, the inventories and tables that quote what changes
- Delete: `src/components/shell/about-sheet.tsx`, `about-sheet-presence.ts`, `src/lib/about/sheet-state.ts`, `src/lib/about/flag.ts`, and their tests

**Interfaces:**
- The banner's lines come from `unseenUnits`: one launch is "New on {page}:" plus the unit's crop (64x48 phone, 56x38 desktop) and Show me; two or more, the "New in the app" band with a crop per line (Ways-In board). A brand-new account's first-run line links to `/about`.
- A page visit records `seenKeysOf` for that page's units (`recordAboutVisit`); the banner's ✕ records every unseen key and raises the floor (`dismissAbout`). Both merge as today (`read.ts`).
- The sheet retires (Hugh, 2026-10-27). `gateDecision`'s version redirect retires with it, because the banner carries launches; `proxy.ts` keeps only what the remaining About routes need. Both retire in this PR, so no legacy reader keeps firing after the new seen writes start.
- [ ] Tests: banner one and two launch forms from a fixture `SeenState`; a reader at floor 16 holding every switched id sees no banner line; a reader at floor 9 sees exactly the units Task 1.2's sweep names; `proxy.ts` no longer redirects to `/about`. Design-review against Ways-In.

## PR 7a: Retire How it works

Delete `how-it-works.tsx`, `how-rows.tsx`, `how-it-works-links.ts`, `how-it-works-flag.ts` and their reads in `decks/[id]/page.tsx`, `friends/table/[id]/page.tsx` and `deck-page-switches`, plus `probe-about-how-it-works.mjs`, its inventory and design table. Keep `howItWorksCopy.methods`/`bracketMethods`, moved to `src/lib/copy/method-tags.ts`, for `method-tag.tsx` and `provenance-panel.tsx` (and `builder-screen.ts`). Retire `HOW_IT_WORKS_ENABLED`. Any rule How it works alone held is already in its page's Good to know (PR 1's copy pass).

## PR 7b: Retire the Reference

Delete the Reference tab and its files, `about-tabs.tsx`'s Reference half (Tools stays until PR 9), `reference.ts`, `caption.ts`, `reveal-entry.ts`, and the probes, inventories and design tables that quote them. Cut `about-entries.ts` to the entries the nine panel screens and the Tools tab still draw. `ENTRY_TARGETS` and `TOOLS.entry` keep exactly the ids that remain (the mirror test holds them equal). Delete the 390-only shots no remaining surface draws, and shrink `REQUIRED_SHOTS` and `shots.test.ts` to what remains; the tour's `tour-*.webp` stay.

## PR 8: Close-out

`docs/superpowers/inventories/about-visual.json` (every page, the index, the ? from one screen per area, banner one and two, Show me landing, the States), contact sheet at 390 and 1300, `pnpm check:shared` for the strip and chips, feature-acceptance walk against the brief, tracker row to Shipped.

## PR 9: After Design

Place `precons` and `mana-balance` and the nine screens' ? per Design's boards; then the panel, `/api/about/entries`, search, the Tools tab and `about-entries.ts` retire, and the remaining old shots go.

## Settled with d9 (2026-10-27)

Approved as Hugh's proxy, with (a), (b) and (c) as written below.

- **Announcing the redo.** Default: no announcement and no `ABOUT_VERSION` bump. The redo changes About itself, it is not a launch Hugh picked, and every migrated unit is already seen.
- **Where the two unplaced tools live between PR 6a and PR 9.** PR 6a makes `/about` the index, but `precons` and `mana-balance` have no section until Design returns. Default: `/about?tab=tools` keeps rendering today's Tools tab, all 14 cards. It isn't linked from the index, but any existing link still reaches it, and it retires in PR 9. The alternative, an index row for it, is placement and would go to Design.
- **Repository weight** (d9, 2026-10-27: accepted for now). PR 2 adds 400 to 500 generated WebP files, about 15 to 20 MB, until 7b removes the 390-only set (about 7.6 MB). Every re-capture adds a set to git history, so PR 2 measures a typical re-capture diff, writes only captures whose pixels changed, and picks the lowest WebP quality that still reads. If a re-capture would add more than about 5 MB, it goes to d9 before PR 2 merges.
- **Dark route.** The new pages are reachable by URL from PR 3 until PR 6a without a switch. Default: accept that, because nothing links there.
