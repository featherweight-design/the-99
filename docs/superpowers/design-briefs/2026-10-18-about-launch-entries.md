# Brief: the launch-end About batch, three entry artboards

2026-10-18. Three About entries owed by two lines that paused their entries until the About reshape landed: the
discovery line (R2 and R3, `design/design_handoff_the99_discovery_onboarding/README-r3.md:9`, "About entries are
paused until this line closes") and Rule 0 (`docs/superpowers/design-briefs/2026-10-16-rule-zero-table-check.md:165-169`
and `docs/superpowers/plans/2026-10-16-rule-zero.md:243-247`, "Its entry is owed when that redesign lands"). They ship
together, with one `ABOUT_VERSION` bump at the end of the launch.

**What this brief asks.** One per-entry artboard for each of the three entries, at 390 and 1300, and the call on what
each entry's picture shows. It proposes one Design round and one addendum folder.

The drafts come from two of the orchestrator's boards, which live outside this repository. Each draft is quoted in
full below, so nothing here needs those files open; their line numbers are kept only for the orchestrator.

## The batch

The words below are the CURRENT DRAFTS, quoted from the boards they were written on. They are copy, owned by
`/copy-review` (titles, `opens`, every key line), not Design. Design draws around them and does not rewrite them. A
draft line that names something the app does not draw is listed under "Draft vs code" for the copy lane to fix.

### Entry 1 · Getting help on any screen (`getting-help`)

Source: the orchestrator's board `about-drafts-discovery-2026-10-18.md:54-87`. Screen `account`, chapter `04`, route `/`, opens `from the
? on any screen`, switch `HELP_PANEL_ENABLED`; the tour paragraph and key 4 follow `FIRST_RUN_TOUR_ENABLED`.

> Every screen has a ? with the About entries for what you’re looking at. Open one for the short version, or read the
> whole entry in the Reference.
>
> Where an entry is about a tool on the page, “Show me” scrolls to it and lights it up. Looking for something that
> lives on another screen? Search reads all of About from right there.
>
> And if you’d like the walk-through again, “Take the tour” in the account menu runs it on your own app. Six stops,
> about a minute.

Keys: 1 `The ? sits at the foot of the rail, or in the header on a phone.` 2 `On a deck or in Collection, chips open the
other tabs’ entries.` 3 `On desktop, the ? works over a card’s details too.` 4 `“Take the tour →” also sits at the top
of About.`

### Entry 2 · About, rebuilt (`about-rebuilt`)

Source: the orchestrator's board `about-drafts-discovery-2026-10-18.md:154-183`. Screen `account`, chapter `04`, route `/about`, NO
switch (so it is the entry the bump announces); three caption lines follow `HELP_PANEL_ENABLED`,
`HELP_ME_CHOOSE_ENABLED` and `FIRST_RUN_TOUR_ENABLED`.

> About used to be one long page. Now it starts with what the app can do for you.
>
> - Tools: what each tool is for, pictured on a real screen. “Try it” takes you there and lights it up.
> - Reference: every entry, by the screen it lives on, with search and what’s new since your last visit.
> - A ? on every screen, with that screen’s entries.
> - Help me choose, waiting on Decks, Home and Commanders while you have no decks yet.
> - A one-minute tour the first time you open Home.

Keys: 1 `A tool that needs a deck opens one that fits.` 2 `“How it works ›” on a tool opens its full entry.` 3 `My
note on why The 99 exists now closes the Reference.`

### Entry 3 · Checking tonight’s table (`rule-zero`)

Source: the orchestrator's board `about-drafts-rule-zero-2026-10-18.md:90-120`. Screen `friends`, chapter `04`, route `/friends`, opens
`from a pod’s “Rule 0 check”`, switch `RULE_ZERO_ENABLED`; the last paragraph follows `SOCIAL_GAMES_ENABLED`.

> The Rule 0 check puts tonight’s decks side by side before anyone shuffles. One of you seats the players from a pod and
> picks a deck for each seat. Everyone seated sees the same table, and it waits for them on Home.
>
> Each complete deck lands on the five brackets, measured from the middle of the table. A deck a bracket or more away is
> flagged above or below, with what puts it there, like a two-card combo it can tutor for or one Game Changer too many.
> Better to know now than on turn four.
>
> Flagged? We’ll show you a few of your own decks that sit closer, and a swap shows up for everyone at the table. The
> bracket is read from each list, so a flag is where the conversation starts.
>
> After the game, log it from the table and the seats come filled in. Anyone who isn’t your friend comes in by name and
> commander, marked “from the table”.

Keys: 1 `Start one from a pod’s “Rule 0 check”, for 2 to 8 players.` 2 `When you set the table, friends’ decks are
listed. Anyone else picks their own.` 3 `“Swap in” or “Change deck” changes yours. “Undo” changes it back.` 4 `A table
closes 24 hours after it’s set. Its logged games stay.`

## What an entry draws today (read from the shipped code)

The per-entry template was drawn for the one-page About (R3 §8, `design/design_handoff_the99_about/README.md:115-117`: title, route, opens,
chapter, width, caption, specimen component, fixture props, up to four keys, phone reduction, `since`, copy file). The
discovery reshape (R2·6b, #2013) changed what an entry renders. Today:

- **`/about` opens on Tools and the Reference is `?tab=reference`** (`src/app/about/page.tsx:120-132`;
  `src/components/about/tools/about-tabs.tsx`). An entry lives in the Reference as a row (its title and the caption's
  first sentence) that opens in place (`EntryRow`, `src/components/about/reference/reference-tab.tsx:85-115`; the first sentence is `entry.first`, `:104`).
- **An opened entry draws a picture, the caption and a numbered key list.** The picture is `EntryFrame`
  (`src/components/about/reference/entry-frame.tsx:1-3`): the entry's SCREEN's real capture in a 3:2 window, moved so
  the entry's control is in view, the control haloed and the rest dimmed. It is 330px wide from `lg`, full width below
  (`entry-frame.tsx:11`). The keys are a plain numbered list beside it (`reference-tab.tsx:44-55`); no number is placed on
  the picture.
- **The capture is one 390x844 frame per screen, in all six themes** (`scripts/capture-about.mjs:3-5,64,69`), showing
  the stand-in identity Sam (`capture-about.mjs:18`) and the fixture account's data (`scripts/about-fixtures.mts:15`: a
  friend, Alex, in a pod).
- **The halo is a measured box, per entry, per theme.** `scripts/lib/about-locators.mjs:1-12` maps every entry to one
  element on its screen's frame; when the entry's own control is not on the frame, the locator names the visible control
  that reaches it (`reaches: true`). On `account` and `card-details` the locator starts at the dialog
  (`about-locators.mjs:14-16`). Two tests hold this: every entry has a locator
  (`scripts/lib/about-locators.test.mts:9`), and every entry has a box on its frame in every theme
  (`src/lib/about/shots.test.ts:49-62`).
- **The ? panel** shows the same entry as a row with its first sentence, then the rest of the first paragraph and two
  keys when opened (`src/components/help/help-panel.tsx:359-390`). It draws no picture.
- **`width` and `marksPending` have no reader.** Both are typed on `AboutEntry` (`src/lib/copy/about.ts:162,183`), and no
  renderer reads either (only `visible.test.ts:390`, `:430` assert `width`).

## Decided (do not reopen)

1. **Every feature owes an entry; a multi-round line batches its entries at the launch end with one bump.**
   `docs/agents/design-pipeline.md:5-18,23-31`. This moves when, never whether.
2. **Design draws the entries; Hugh decides which features owe one** (`design-pipeline.md:56-58`). All three are owed:
   discovery by `README-r3.md:153`, Rule 0 by its brief and plan (cited above).
3. **Copy is not Design's call.** Every caption, key, title and `opens` string goes to `/copy-review`
   (`README-r2.md:37` lock "Wording goes to /copy-review"; addendum-social-line `README.md:42`, G6).
4. **The bump is 14 to 16, never 15** (`src/lib/copy/about.ts:77-83`: 15 was spent once by #1840). Only an UNSWITCHED
   entry moves the version; a switched entry is announced when its switch turns on and takes the version current when it
   ships (`about.ts:77-80`; the Social addendum's precedent, `addendum-social-line/README.md:27-29`). So of the three,
   `about-rebuilt` is the one the bump announces.
5. **A figure draws only what the app draws, from the surface's own copy** (`about.ts:48-57`, rules 2 and 4). The
   picture is a real capture (`README-r2.md:31`, lock "Real screenshots, not illustrations or detached snippets").
6. **One picture per screen, in one capture per theme.** An entry does not get a frame of its own; it gets a box on its
   screen's frame (`src/lib/about/shots.ts:6-10,75-91`).

## Open for Design to call

Per entry: what the picture depicts (which element is haloed on the frame), and which state of the surface the frame
is captured in. Each is constrained by "Decided" 5 and 6.

1. **`getting-help`.** Its screen is `account`, whose frame is the account menu sheet over Home
   (`capture-about.mjs:235-241`). The ? is on no frame at all: the capture starts the server with `HELP_PANEL_ENABLED`,
   `FIRST_RUN_TOUR_ENABLED`, `MOMENTS_ENABLED` and `ABOUT_SHEET_ENABLED` set to `off`, so no bubble, tour or sheet is
   photographed (`scripts/capture-about.mjs:11-12`, `docs/probes.md` capture:about). The shipped `account.webp`
   (amonkhet) shows only the `S` account button in the header. Call one: halo the `Take the tour` row (which exists only
   with `FIRST_RUN_TOUR_ENABLED` on, `src/components/shell/account-menu.tsx:96-99`), halo another menu row as the way
   in, or ask for a different screen. **Either ?-based or tour-row picture reverses that capture rule**: the capture
   would need those switches on for this frame, which is engineering's change and owed before the entry ships.
2. **`about-rebuilt`.** Also on `account`. The `About The 99` row is on the shipped frame and reaches `/about`; whether
   that is the halo, and whether the artboard also shows the reshaped `/about` itself (Tools at 390 and 1300) as context.
3. **`rule-zero`.** Its screen is `friends`, whose frame is `/friends` (`capture-about.mjs:234`). The shipped
   `friends.webp` shows the fixture's `About pod` card with no `Rule 0 check` row: it was captured without
   `RULE_ZERO_ENABLED`. Call one: halo the pod card's `Rule 0 check` row (`src/components/rule-zero/pod-row.tsx:77`,
   copy `src/lib/copy/rule-zero.ts:16-17`) on a frame recaptured with the switch on, or ask for a screen of its own for
   `/friends/table/[id]`, which no screen maps today (`src/lib/about/screen-for-path.ts:46`) and which would need a
   capture fixture holding an open table.
4. **The bump as a reader meets it.** Whether to draw Home's banner line naming the batch for a returning reader
   (`src/lib/about/notice.ts:5-6`), as the v10 batch drew its §0 (`addendum-launch-entries/README.md:7`).
5. **The template's dead slots.** Whether the artboard keeps `width`, specimen, fixture props and phone reduction,
   which the reshape no longer reads, or replaces them with frame, locator and capture state.

## Per entry

| Entry | Surface route | Component file | State to depict | Shipped or switched |
|---|---|---|---|---|
| `getting-help` | every route; the entry's screen is `account` (`/` with the account menu open) | `src/components/help/help-root.tsx`, `src/components/help/help-panel.tsx`; menu row in `src/components/shell/account-menu.tsx` | Open 1: the ? panel on one screen, or the menu's `Take the tour` row | Behind `HELP_PANEL_ENABLED` (`src/lib/switches/registry.ts:46`): staging `'true'`, production unset (`src/lib/discovery/onboarding-flag.ts:1-5`). Tour lines behind `FIRST_RUN_TOUR_ENABLED` (`registry.ts:44`), same states |
| `about-rebuilt` | `/about` (Tools), `/about?tab=reference`; screen `account` | `src/components/about/tools/about-tabs.tsx`, `tools-tab.tsx`, `tool-card.tsx`, `src/components/about/reference/reference-tab.tsx` | Open 2: the menu's `About The 99` row; Tools as context | Shipped to everyone, no switch (`onboarding-flag.ts:4`; #2013). Lines behind `HELP_PANEL_ENABLED`, `HELP_ME_CHOOSE_ENABLED` (`registry.ts:45`), `FIRST_RUN_TOUR_ENABLED` |
| `rule-zero` | `/friends` (pod row), `/friends/table/[id]` (the table) | `src/components/rule-zero/pod-row.tsx`; table: `table-body.tsx`, `read-card.tsx`, `swap.tsx`, `change-deck.tsx` | Open 3: the pod card with its `Rule 0 check` row | Behind `RULE_ZERO_ENABLED` (`registry.ts:63`, needs `SOCIAL_FRIENDS_ENABLED`): staging `'true'`, production unset (`src/lib/social/flag.ts:20-24`). Log lines behind `SOCIAL_GAMES_ENABLED` (`registry.ts:67`) |

## Draft vs code

Listed, not fixed. Copy items go to `/copy-review`; engineering items to whoever applies the entries.

1. **`rule-zero` sets `since: 15`** (rule-zero board line 119; section 6 reasons "if that bump is 14 → 15"). `about.ts:77-82`
   says the next bump is 16, never 15, and a switched entry takes the version current when it ships: 14 or 16.
2. **"What puts it there:"** (rule-zero board line 208, the specimen's second part). The shipped lead is `What puts it here:`
   (`src/lib/copy/rule-zero.ts:140`).
3. **`“Try it”` is quoted as a shipped label** (entry 2, Tools line; discovery board line 238). No Tools card draws it:
   the whole card is the press and its footer reads `Opens <deck>` or the tool's own press
   (`src/components/about/tools/tool-card.tsx:4,60-62`; `src/lib/copy/discovery.ts:90`). The words appear only as
   `Try it on <deck>`, an opened Reference entry's link and a card's accessible name (`discovery.ts:92`;
   `src/lib/about/reference.ts:56-60`), and as Find a deck's `Try it on a card you own` (`discovery.ts:102`).
4. **"Neither entry needs a new shot"** (discovery board line 16). The frame exists, but each new entry needs a box
   measured on it in all six themes (`shots.test.ts:49-62`) and a locator (`about-locators.test.mts:9`), and neither
   shipped frame shows the control: `account.webp` has no ? and no `Take the tour` row, `friends.webp` has no
   `Rule 0 check` row.
5. **The Rule 0 specimen is the table page** (rule-zero board lines 197-223: read card, flagged seat, Closer to the
   table, head meta line, number marks, phone primary with R2's desktop boards). The Reference draws the `friends` screen's
   frame (`/friends`), not the table, and places no numbers on it (see "What an entry draws today").
6. **The Rule 0 fixture is the handoff's** ("Colin's pod Thursday night", rule-zero board line 199). The capture's
   fixture is Sam with Alex in `About pod` (`scripts/about-fixtures.mts:14`, the pod made at `:285`).
7. **`width: 'plate'` and `marksPending: true`** in all three drafts, and the discovery board's own `marksPending` note.
   Neither field is read by any renderer today (see above).
8. **`HELP_PANEL_ENABLED`, `FIRST_RUN_TOUR_ENABLED` and `RULE_ZERO_ENABLED` are not in `AboutSwitch`**
   (`about.ts:108-139`), so all three drafts are type errors until they are added. Both boards say so.
9. **A `?` pressed on the table page offers nothing.** `screenForPath` maps only the exact path `/friends`
   (`screen-for-path.ts:46`), so the entry about `/friends/table/[id]` is never offered there. The Rule 0 board says so.
10. **Rule 0's last paragraph gates two sentences of ONE line as two lines.** `resolveLine` removes a literal substring
    (`src/lib/about/visible.ts:92-94`), so with `SOCIAL_GAMES_ENABLED` off the two removals leave a stray line break and a
    space behind.
11. **Holds, but partial:** entry 2's doors line names the zero-deck doors on Decks, Home and Commanders. Help me choose
    also has doors on the create picker and Discover's result line regardless of decks
    (`src/lib/copy/help-me-choose.ts:27`), and an entry of its own (`src/lib/copy/about-entries.ts:482`).
12. **Holds, with a nuance:** entry 2's tour line ("the first time you open Home") is true of accounts made after the
    tour ships only: an account past first run is never due (`src/lib/discovery/tour.ts:8-15`).

Every other claim in both drafts was checked against this tree (88f7e00f6, which contains every Rule 0 PR the board
cites) and holds.

## Deliverable

An addendum folder inside `design/design_handoff_the99_about/`, the convention the three earlier addenda follow
(`addendum-launch-entries/`, `addendum-social-line/`, `addendum-collection-edit/`), named so it does not collide with
the v10 `addendum-launch-entries/`. Mirror `addendum-social-line/`: a `Main` board for the calls above and the gaps, one
board per entry at 1300 and 390, a `canvas.json`, the three entry objects in a `.ts`, and a README with a per-entry
table (`addendum-social-line/README.md:9-14`).

## Out of scope

The entry words, the `AboutSwitch` and locator code, the recapture itself, and a Rule 0 tool card in the Tools tab (the
board's optional idea, `tools.ts:57-59`; it would need its own crop in every theme, `shots.ts:28-33`).
