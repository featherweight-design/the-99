# Readiness: About addendum, the menu and Home line

**Audited:** 2026-10-22 against `origin/main` at `1793e6de5` (#2194). The handoff says it was checked at `653499e`; main has
moved two commits since (#2193 Friends: Waiting on you + the board's pill on a friend's decks; #2194 deck messages close-out).
Handoff: PR #2196, `design/about-menu-home-line`, this folder. Read: README, `about · menu and home line.ts`, the four
`.dc.html` boards as text. Code read on main in a read-only worktree. Contrast figures re-measured from `src/app/globals.css`
(same arithmetic as `src/lib/theme/todo-warning-contrast.test.ts`).

## Verdict: GREEN

Nothing needs a Design round trip. Every drawn call holds against main; the seed pass-sheet line is the one change owed to deck
messages. Eight small MISMATCHES below are factual slips or code-shape details with one defensible answer each (all in section 3,
E1 to E8). Two things cannot be verified yet because their PR is unbuilt: Home's lead story / opt-in (menu and Home PR 6) and
G4's zero-deck Help me choose door on the feed Home.

## 1. Claims

| # | Claim | Result | Evidence (main) |
|---|---|---|---|
| 1.1 | Entry fields (`id`, `replaces`, `chapter`, `screen`, `switch`, `title`, `route`, `caption`, `captionLineSwitches`, `keys`, `keySwitches`, `since`) match `AboutEntry` | VERIFIED | `src/lib/copy/about.ts:165-229` (interface). No `width` (optional, "read by no renderer", `about.ts:~183`); no `marksPending` (optional). |
| 1.2 | `keys` is 4 | VERIFIED | `about.test.ts:150` (`<= 4`). |
| 1.3 | `route: '/'` resolves; title unique | VERIFIED | `about.test.ts:113-135`; no other "Home’s news, and the new bar". |
| 1.4 | `ready-to-build` exists, unswitched, Home, `since: 1`; `replaces` is the mechanism `buying-credits` uses | VERIFIED | `about-entries.ts:451-466`; `buying-credits` `replaces: 'credits'` `:1593-1622`; `visibleEntries` drops the replaced id `src/lib/about/visible.ts:~148-152`; `drawnEntry` follows `#ready-to-build` to the new one (`about.ts` `drawnEntry`). |
| 1.5 | "Replaces while the feed is on; draws again if the feed is off" | VERIFIED | `visibleEntries`: `drawn = entries.filter(!switch or SWITCHES[switch])`, replaced set built from drawn only. |
| 1.6 | `HOME_FEED_ENABLED` exists | VERIFIED | `src/lib/switches/registry.ts:49` (feature); `src/lib/feed/flag.ts:11` `homeFeedEnabled`. |
| 1.7 | `COMMANDERS_PLACE_ENABLED` exists; `AboutSwitch` "gains" both | VERIFIED (owed) | registry `:39`; `src/lib/commanders/place-flag.ts:7` `commandersPlaceEnabled`. Neither is in the `AboutSwitch` union (`about.ts:~100-153`) nor in the exhaustive `SWITCHES` record (`visible.ts:~44`): build adds both. |
| 1.8 | `AboutLineSwitch` takes ONE switch today (G1) | VERIFIED | `about.ts:157` `AboutSwitch \| \`!${AboutSwitch}\``; `visible.ts:108-110 lineKept`. Only `visible.ts:130-136` consumes it (plus comments in `copy/discovery.ts:114`, `discovery/showcase.ts:104`). A list is a 3-place change (type, `lineKept`, `visible.test.ts`). |
| 1.9 | Reference shows it first under Home where `ready-to-build` stood | VERIFIED if placed at `ready-to-build`'s array slot | `reference.ts` filters `entries` by screen in array order; `ready-to-build` is `about-entries.ts:451`, before `resume`/`commitments`/`getting-help` (all `:1660+`). |
| 1.10 | Locator `whats-new: { screen: 'home', locator: '[data-feed-lead]' }`, scope main | PARTLY | Shape matches `ABOUT_LOCATORS` (`scripts/lib/about-locators.mjs:23-`, home block `:24-37`). `[data-feed-lead]` does not exist on main (`rg data-feed` empty): Home's lead story is PR 6 and must carry it. See E5. |
| 1.11 | Caption fact: 14-day window, "opening Home marks it seen" | VERIFIED | `src/lib/feed/kinds.ts` `FEED_WINDOW_DAYS = 14`; `feed/prefs.ts:133` `markFeedSeen` (Home visit moves `feed_seen_at`). |
| 1.12 | "No email, ever", "a count on Home in the bar" | VERIFIED | `src/lib/copy/feed.ts:19` foot; `src/lib/copy/shell.ts` `nav.badge.home`. |
| 1.13 | Kinds named: set/precon, price drop on wishlist, combo, friend with a spare of a wishlist card | VERIFIED, one gate missing | `feed/kinds.ts` `FEED_KINDS`; `copy/feed.ts:11-16`. `feedKindAvailable` (`feed/flag.ts`): price-drop = `SOCIAL_WISHLIST_ENABLED` (matches), trade-match = friends AND wishlist (matches), **new-precon = `PRECONS_ENABLED`** (E6). Spare request unavailable (`return false`), unnamed (matches G5). |
| 1.14 | Line switches resolve to clean text in every on/off combination | VERIFIED | Simulated `resolveEntry` over all 16 combos of the four switches: residue is only trailing/doubled blank lines, which the renderer drops (`entry-caption.tsx` splits on `/\n\s*\n/` and filters empty blocks; `about/caption.ts:9`). All eight `captionLineSwitches` keys are verbatim in the caption. |
| 1.15 | "Old links to Discover and Help me choose land on their tabs" | VERIFIED | `src/app/discover/page.tsx` and `src/app/decks/new/choose/page.tsx` redirect with the place on, query kept (`place-redirect`). |
| 1.16 | Tab names "For you / Discover / Help me choose" | VERIFIED | `src/lib/copy/commanders-place.ts:16`. |
| 1.17 | Settings is in the account menu; spares threshold/keep back in Settings | VERIFIED | `src/components/shell/account-menu.tsx:104-114` (Settings takes the Friends row); `src/lib/copy/settings.ts`. |
| 1.18 | Privacy key is `socialCopy.page.decksSeen` verbatim | VERIFIED | `src/lib/copy/social.ts:51`. |
| 1.19 | Stale edit: `friends` caption "sentence 2" | MISMATCH (E1) | The sentence is the **third** ("Playing…?" / "Make them friends in The 99." / "Open “Friends” from your account menu, press…"). Text itself verified `about-entries.ts:1300`. |
| 1.20 | Stale edit: `discover` route `/commanders/discover` with the place on; `screenForPath` maps it to `discover` | VERIFIED / E3 | `src/lib/about/screen-for-path.ts:46-47` already maps `/commanders/discover` to `discover` and `/commanders/choose` to `new-deck`; `place-paths.ts` `discoverPath`/`choosePath` exist. But `AboutEntry.route` is a static string checked by `about.test.ts:113-135` and `/discover` still resolves with the place off: a conditional route has no mechanism (E3). |
| 1.21 | Stale edit: `help-me-choose` route `/commanders/choose`, screen stays `new-deck` | VERIFIED / E3 | `about-entries.ts:524-543` is `screen: 'new-deck'`, route `/decks/new/choose`, `HELP_ME_CHOOSE_ENABLED`. `screenForPath` already returns `new-deck` for `/commanders/choose`. |
| 1.22 | Stale edit: `about-rebuilt` line "Help me choose, waiting on Decks, Home and Commanders while you have no decks yet" | VERIFIED text; G4 OPEN | String is `about-entries.ts:1767`, switched `HELP_ME_CHOOSE_ENABLED` `:1770`. Home today carries the door (`dashboard.test.tsx:183`, `decks-zero-choose`); the feed Home is PR 6, so G4 is confirmed there, not here. |
| 1.23 | `ABOUT_VERSION` 16 to 17 at PR 8, `since: 17` | MISMATCH (E2) | `about.ts:~100` (comment above `ABOUT_VERSION`): the version "moves only for an entry with NO switch"; a switched entry is announced by its id and its `since` is the current version (`isSeen`, `visible.ts:~163`). `whats-new` is switched. |
| 1.24 | Friend page: privacy line under the name line, 11px mono `--fg-faint`, leaves while editing | VERIFIED | `src/components/social/friends-head.tsx:163-165` (`editing ? null : <p … font-mono text-[11px] … --fg-faint>`). |
| 1.25 | Four empty states in the dashed box; Spares has two (not shared / none to show) | VERIFIED | `friend-spares-tab.tsx:20-21,~76-82`, `friend-wishlist.tsx:~31`, `friend-decks-tab.tsx:~14-21`; all `1px dashed var(--border-dashed)`, Cinzel 18/19 title, 14px muted body, 600 max (`max-w-[600px]`). Copy `social.ts:96-114` word for word. |
| 1.26 | A spare is a press that opens the shipped card details with the friend's spares as siblings, no request | VERIFIED | `friend-spares-tab.tsx:1-4,~27-50` (`CardDetailTrigger`, `siblings`, comment "nothing asks for the card"; `onWishlistWrite` refreshes the page). |
| 1.27 | A friend's deck status "uses the shipped `statusPillStyle`" | MISMATCH (E4) | `friend-decks-tab.tsx:62-77` wraps it in `friendPillStyle` (#2193): Complete, To buy and Building lose the edge and Building takes `--fg-body` on an 18% plate. App-wide pills unchanged. |
| 1.28 | Over-the-99 as next step: title `--fg`, red off it; `+N` keeps red | VERIFIED | `src/components/decks/todo-card.tsx:164-170` (`warning && !next ? --avail-over-fg : --fg`), pinned by `todo-warning-contrast.test.ts:32`. Already built (#2183); no work. |
| 1.29 | `--avail-over-fg` on the next step's 7% tint: Low Sun 4.26, Neon 4.37, Canopy 4.24, Oil 4.38, Witching 4.49, Frost 4.38 | VERIFIED | Re-measured: 4.26 / 4.37 / 4.24 / 4.38 / 4.49 / 4.38. |
| 1.30 | On the card: 4.68 / 4.70 / 4.78 / 4.66 / 4.92 / 4.83; `--fg` on the tint 13.18 / 13.98 / 12.67 / 13.93 / 12.88 / 10.26 | VERIFIED | Re-measured identical. |
| 1.31 | `+N` mark `--danger` on its tint is "3.6 to 4.0" | MISMATCH (E7, minor) | Re-measured 3.61 / 3.72 / 3.65 / 3.81 / 3.69 / 3.61: range is 3.6 to 3.8. Floor is 3 (`test:7-9`), so no consequence. |
| 1.32 | `ledger.seedReversal` is "Clear all auto reverses it" | VERIFIED | `src/lib/copy/top-off.ts:339`. Used in the ledger line `provenance-line.tsx:277,325` in `--fg-locked`, 10px mono. |
| 1.33 | Seed pass sheet is Done only today | VERIFIED | `pass-sheet.tsx:107-108` (`undo` undefined for `seed`). Foot is a `flex-wrap` row `pass-sheet.tsx:~205-210` with `Done` at `md:ml-auto`; no seedReversal in it yet. |
| 1.34 | Sheet is a centred modal at desktop | VERIFIED | `receipt-modal.tsx:205` (`md:items-center` unless a card is open). |
| 1.35 | Sheet foot line in "mono `--fg-faint`" | NOTE (E8) | The ledger line it echoes is `--fg-locked` (`provenance-line.tsx:273`). `--fg-faint` clears 4.98 to 5.56 on `--surface`, so it is legible; the two lines will differ in ink. Design's token stands. |
| 1.36 | A10: History only when the start added cards (links that entry); else "You own N of its 99." no link | VERIFIED | `arrival-strip.tsx:~137-148` (`added ? … link` else none); `precons.ts:183-188`. Two copy variants differ from the board (E7): `All N cards added…` when nothing is unmapped, and `of` is the precon's own count not a literal 99. |
| 1.37 | A11: no mark | VERIFIED | `precons/precon-suggestion.tsx`: only `Link it` and the bare ✕ (`:53-96`); STATES row A11 "no ✓". Strings `precons.ts:195-200` match the board. |
| 1.38 | Credits erratum: "Running a deck's Analysis" is not a spender; `buying-credits` already omits it | VERIFIED | `about-entries.ts:1593-1622` and its comment `:1596-1597`; absent from all of `src/`. The string survives only in the bracket-reach handoff (`design/design_handoff_the99_help_me_choose/addendum-bracket-reach/bracket-reach · copy strings.ts:48`) and the launch-end credits board; `docs/superpowers/readiness/about-launch-end-r1.md:70` already records it. Reference material; no code change. |
| 1.39 | "Home 4 entries" on board E1 | VERIFIED | Home today: `ready-to-build`, `resume`, `commitments`, `getting-help` (4); the replacement keeps the count. |
| 1.40 | Reference count 75 on E1 | NOTE | Main draws different counts per switch set; not a claim of the entry. |

## 2. Numbers

Contrast: re-measured every figure on the Deck-Calls table, all 18 match to two places except the `+N` range (1.31). Sizes:
11px mono privacy line, 600px / Cinzel 19 / 14px empty box, 11px mono spares line all match code.

## 3. Errata

- **E1.** `friends` caption: the sentence to change is the third, not the second. Do it with two fragments in
  `captionLineSwitches`: `'Open “Friends” from your account menu, press '` as `'!COMMANDERS_PLACE_ENABLED'` and
  `'Press “Friends” in the bar, press '` as `'COMMANDERS_PLACE_ENABLED'` (`!` is supported, `lineKept`); keep clear of the
  existing fragment `' pick “They’re on The 99”,'`. Shipped sentence has no "Friends is in the bar" wording otherwise.
- **E2.** `since`/version. The code rule (`about.ts` above `ABOUT_VERSION`) bumps only for an unswitched entry; `whats-new` is
  switched, so its `since` is the version current when it ships (16) and a bump to 17 announces nothing (`unseenEntries` finds
  it by id; no unswitched entry is new). The plan and README G6 both say bump. Default: follow the code (`since: 16`, no bump)
  unless Hugh wants the pin moved; either way the content hash pin (`src/lib/copy/about.version.json`, read by `about.test.ts`) is re-pinned in the same commit. Engineering
  decides; no Design input needed.
- **E3.** `route` is a static string in `aboutEntries` and `about.test.ts` resolves it to a `page.tsx`. `/commanders/discover`
  and `/commanders/choose` both resolve (`src/app/commanders/(list)/{discover,choose}/page.tsx`), but "with the place on" has no
  switch for a route. Either repoint to the tab routes outright (the old addresses redirect, `/discover` and `/decks/new/choose`
  stay valid), or leave the routes and let the redirect carry the reader. Nothing in `src/` reads `entry.route` for navigation,
  so the choice is cosmetic. The plan says routes repoint "in the PR that moves them" (PR 1, already merged and did not): do it in PR 8.
- **E4.** Friend deck pill: README "left as built" cites `statusPillStyle`; main is `friendPillStyle` over it (#2193). Not an
  About matter; correct the README line.
- **E5.** `[data-feed-lead]` is unbuilt (Home PR 6). The lead-story section must carry it, or the locator changes. `ABOUT_LOCATORS`
  needs the `whats-new` key (every entry has one; `scripts/lib/about-locators.test.mts`), and `ready-to-build` keeps its own.
- **E6.** Caption line 1 "A set or a precon" names precons ungated; `new-precon` needs `PRECONS_ENABLED`. Optional: split the
  bullet, or accept. A reader without precons simply never sees the kind; the About line is the only place it is claimed.
- **E7.** README range "3.6 to 4.0" is 3.6 to 3.8; A10's "98 cards added" has an "All 98" variant when nothing is unmapped; "of its 99"
  is the precon's own count. Cosmetic.
- **E8.** The seed foot line is `--fg-faint`; the ledger twin is `--fg-locked`. Both pass; keep Design's token.
- **E9.** README "Checked against main at `653499e`": two commits behind. Nothing in the two newer commits moves a claim here except E4.
- **Plan drift.** `2026-10-22-menu-home.md` has no PR 9b; its "PR 8" is the close-out. The About entry, the edits and the locator
  belong to it.

## 4. Build list

### Deck messages (separate PR, off main, small)

1. **Seed pass sheet foot** (call 4). `src/components/decks/pass-sheet.tsx` `SheetFrame` foot (~`:190-215`): when
   `pass.kind === "seed"`, draw `ledger.seedReversal` (`src/lib/copy/top-off.ts:339`) as a non-interactive mono line in
   `--fg-faint`: centred above Done at 390, in Undo's place (left of Done) at md. `ledger` already imported in the file.
   Board: `Deck-Calls.dc.html`, frames "The seed · 390" and "The seed · 1300". No new copy. Needs a test (seed sheet shows the
   line and no Undo; a top-off sheet does not) and the contact-sheet row for the seed sheet at both widths.
2. Calls 3, 5, 6 and the credits erratum: **no work**. Already as built (#2183, #2190, #2191); the erratum is already in main.

### About entry / menu / Home / friend (menu and Home PR 8, close-out)

All in `design/design_handoff_the99_about/addendum-menu-home-line/`; boards `Main.dc.html`, `E1-Whats-new.dc.html`,
`Friend-Page.dc.html`; object in `about · menu and home line.ts`.

1. **Entry.** Add `whats-new` (`about-entries.ts`, at `ready-to-build`'s array slot `:451`). Words go through `/copy-review`
   (placeholders). Add `HOME_FEED_ENABLED` and `COMMANDERS_PLACE_ENABLED` to `AboutSwitch` and `SWITCHES` (`visible.ts`,
   `homeFeedEnabled`, `commandersPlaceEnabled`).
2. **G1.** `AboutLineSwitch` accepts a list, all on: `about.ts` types, `lineKept` (`visible.ts:108`), `visible.test.ts`.
3. **Titles-count test.** `about.test.ts:~140` asserts exactly one `replaces` entry (`titles.length - counted.length` is 1); it becomes 2.
4. **Locator + capture.** `scripts/lib/about-locators.mjs` `whats-new`; Home PR 6 must put `[data-feed-lead]` on the lead
   story. Recapture every screen (G3): bar has Friends and no Discover with the place on; `home` also feed on, wishlist on, one
   unseen item, no welcome strip. Run `pnpm capture:about`; `shots.generated.ts` and `public/about/shots/*` change.
5. **Stale entries.** `friends` caption (E1); `discover` and `help-me-choose` routes (E3); `about-rebuilt` G4 confirmed once PR 6 is on main.
6. **Docs that count.** `docs/superpowers/design-tables/about.md` and `gap-report-about.md` say "The code has 78": bump to 79
   (`about.test.ts` fails otherwise).
7. **Version.** E2: decide bump or no bump; re-pin the hash (`src/lib/copy/about.version.json`, read by `about.test.ts`).
8. **Friend page and menu.** No build: friend page (call 2), Settings in the account menu and Friends in the bar are shipped
   (#2178, #2186, #2193). The only edit is the README line in E4 (Design).
