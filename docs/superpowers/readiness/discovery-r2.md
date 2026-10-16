# Readiness audit · Discovery and onboarding R2 (the showcase, About as a reference)

2026-10-16 · PR #1927 · handoff `design/design_handoff_the99_discovery_onboarding/` (R2 files: `README-r2.md`,
`STATES-showcase-reference.md`, `design-tables/discovery-r2.md`, `discovery-r2 · copy strings.ts`, `r2/*.dc.html`) ·
brief `docs/superpowers/design-briefs/2026-10-16-discovery-and-onboarding.md` §2, §4, open questions 3 to 6.

Audited independently of Design's `READINESS-r2.md`, against the tree at `origin/main` 09cf5619c.

## Verdict: 🟡 Yellow

Every R2 deliverable the brief lists is drawn at 390 and 1280, every brief lock for the round holds, and R2 does not
contradict R1's files or the rulings since the brief. Seventeen gaps remain, and engineering can resolve each one; none
needs another Design round. The resolutions below are binding on the plan unless Hugh overrules one.

## Coverage against the brief

| Brief item (R2) | Drawn | Note |
|---|---|---|
| Showcase, every tool, 1280 and 390 | `Showcase` S1 (ShowcaseDesk / ShowcasePhone), with Written for you on both | 14 tools in 5 groups, plus the credits section |
| A tool behind an off switch: absent | `Links` L2, as text | It is pure absence (no card, group shrinks, an empty group not drawn), so text is enough. Accepted |
| Try it with no fitting deck | `Tool-Card` T2: none without a door (Top off), none with a door (Friends' spares) | At 354 and 300 |
| Phone layout | S1 at 390: a sideways row per group | |
| Open Q3: set, order, framing, highlight | C2 | A tool is "something a reader presses"; marks and states stay in the Reference |
| Open Q4: Try it for no deck / no fitting deck | C3, T2 | Replaced by a line saying what it needs, plus a door where one helps |
| Open Q5: the "?" per screen | C4; H1 (deck), H2 (Shopping), H3 (Collection, card details), at both widths | In the chrome: rail foot at 1280, header at 390 |
| Open Q6: About's new shape, search, full list, specimens | C1, C5; R1 to R3 | Two tabs, Tools and Reference. The specimens are answered only implicitly (gap 9) |
| Search with results, with none | H2 and H3 (panel); `Reference-Search` R2 and R3 (both widths) | |
| The full list | `Reference` R1, both widths | 71 entries on 21 screens, plus How it works and the note |

## Code claims I checked

- **The 71 entries and the `screen` table.** Every id in README-r2's table is in `src/lib/copy/about.ts`, each one
  exactly once, and no entry is missing.
- **Switches.** Each of the 14 tools maps to an entry that carries the tool's switch in `src/lib/copy/about.ts`, and
  every switch is in `src/lib/switches/registry.ts`. Following `visibleEntries` (`src/lib/about/visible.ts`) gives the
  "switch off: absent" state.
- **Shipped strings the handoff quotes.**
  - These match: `Search reads entry titles only.`, `Nothing titled “q”.`, `Find an entry`, `N new since your last visit`,
    `pageTitle: 'Welcome to The 99'`, `pageIntro` and `How the app reaches its answers`.
  - The Tuning tile's `1 credit a run` (`src/lib/copy/tuning-hub.ts`) is as E16 says.
  - The credits entry's five spenders, and its captionLineSwitches, match Written for you.
- **Chrome.**
  - `MobileHeader` is not sticky (G15 holds).
  - The rail's foot holds `OfflinePill`, then `AccountMenu` (`src/components/shell/nav.tsx`).
  - The rail starts at `md`, not at 1280.
  - `mirrorUrl` exists (`src/lib/url/mirror.ts`).
  - The banner's target is `ABOUT_HREF = "/about"` (`src/components/home/arrivals-banner.tsx`). The banner already
    tells a first-run account from a returning one (`isFirstRun`), so G18 is buildable.
- **Collection deep links.** `/collection?avail=free` and `?card=<id>` both exist.

## Gaps, and engineering's resolution

1. **"The fitting deck the reader opened most recently" has no data behind it.** `decks` stores no opened time. Home's
   `resume` orders by what was TOUCHED last: edited, committed or played.
   - **Resolution:** order by resume's touched order, with no new column. The footer's words (`Opens <deck>`) need no
     change.
2. **"Under 99" and "at 99" are wrong for a partner deck.** The body is 99, or 98 with a partner (`deck-cuts.ts`), and
   the app's own words are "a full deck" and a total of 100 (`deck-analysis.ts`, `tuning-hub.ts`). R1 also says "under
   100" and "at 100".
   - **Resolution:** `fits` compares each deck against its own body size.
   - The none-lines go to /copy-review in "full deck" terms, not "99". Top off's line drops the figure.
3. **E10's "data the decks list already loads" does not hold for two tools.** A row over the limit needs the deck's
   price read, and a friend's spare needs `loadFriendSpares`, which runs one claim model per friend.
   - **Resolution:** compute `fits` on the server when `/about` loads.
   - Cheaper stand-ins fits a deck with a price limit and at least one buy row priced over it, from the price read the
     Shopping total already makes.
   - Friends' spares fits when at least one friend shares spares with the reader and a missing card has a spare. Run it
     once over the whole union of missing cards, with no cap. `MAX_SPARES_BATCH` limits one HTTP request to
     `/api/friend-spares`, not the server reader, and a cap would drop a fitting deck whose only spare matches the
     201st card. Eligibility calls `loadFriendSpares` directly; were it to go over HTTP, it would batch every id.
   - If that measures too slow, the card falls back to "needs no deck" with `Open Friends →`. Nothing else changes.
4. **The Proposed cuts chip.** The shipped tile reads `free · look deeper 1 credit`, and G13 draws `free`.
   - **Resolution:** the card carries the shipped chip verbatim. G13's rule is "only where the app already shows a
     cost", so the chip shows that cost as the app shows it.
5. **Card details' entries are out of reach while the dialog is open.** The dialog is modal and marks the rest of the
   page `inert` (`src/lib/a11y/inert-page.ts`), and that includes the rail and the header that hold the ?. At 390 the
   sheet also covers the header.
   - **Resolution:** at 1280, the ? opens the panel as its own dialog stacked over card details. Four parts:
     - **Inert and layering:** the ? and the panel's portal host are exempt from the dialog's inert pass, and the ?
       sits above the dialog's backdrop (which otherwise covers it), so a pointer reaches it.
     - **Keyboard:** `useDialogA11y` keeps wrapping Tab, but the ? joins its cycle as one extra stop after the last
       focusable in the dialog. The dialog stays `aria-modal`.
     - **Focus and Escape:** opening the panel moves focus into it and hands the trap to it, so one trap is live at a
       time. Escape closes the panel only and returns focus to the ?; a second Escape closes card details.
     - **Why stacked, not a released trap:** releasing the trap for the ? would let Tab leave the dialog into a page
       that is `inert` everywhere else. A stack keeps the dialog's contract whole, and the panel opens beside the
       dialog as H3 draws it.
   - At 390, card details' entries are reached through Collection's ? (`Elsewhere in Collection`) and through search.
     Card details gains no control.
   - If Hugh wants a ? inside card details at 390, that is a small Design call for later. It does not block this round.
6. **The ? panel cannot ship About's copy to every page.** `about.ts` is 1810 lines, and #1633's guard
   (`scripts/lib/client-graph.test.mts`) keeps copy modules out of Home and `/decks`. The switches also resolve per
   reader on the server.
   - **Resolution:** the panel fetches the reader's visible entries on its first open, and on intent at 1280, from a
     signed-in route that returns `visibleEntries(requestSwitchEnv(user))`. Each entry carries title, caption, keys,
     `screen` and `view`, with no specimens.
   - E12's client-side search runs over that payload. A caption line hidden by `captionLineSwitches` is never matched.
   - Extend the client-graph guard so no page outside `/about` imports the entry list.
7. **Show me needs an anchor for every entry's control.** R1's registry (R1 E3) holds the 16 moment anchors only.
   - **Resolution:** Show me is drawn only for an entry whose control is registered and in view, which is C4's rule
     already. The plan names which entries register an anchor (the 14 tools at least). Every other entry has no Show me.
8. **Collection Sync's visibility.** Its entry (`upload-choice`) lists `COLLECTION_EDIT_ENABLED` and
   `COLLECTION_SYNC_ENABLED`, so it can be visible with Sync off.
   - **Resolution:** each tool card names its own switch in the tool registry, Sync's being `COLLECTION_SYNC_ENABLED`,
     and is drawn only when that switch is on and the entry is visible.
9. **The specimens (open question 6).** The handoff never says what happens to them. It answers by implication: "an
   opened entry leads with a real screenshot of its screen". E9 captures only the 14 tool crops.
   - **Resolution:** the screenshot replaces the specimen in the Reference.
   - E9 captures one frame per SCREEN (21 screens, plus a deck tab or view where it differs), and each entry stores its
     halo box as fractions of its screen's frame.
   - A test fails when a visible entry has no frame or box.
   - The specimen figures and their fixtures (`src/lib/about/fixtures.ts`) are retired in the PR that lands the last
     capture. Until then an entry keeps its specimen, so no entry ever renders without a figure.
10. **Recording what's new as seen.** `/about` records the visit when it loads. With Tools as the default, a returning
    reader who opens About from the account menu would clear "N new" without seeing the Reference.
    - **Resolution:** record the visit when what's new is drawn: the Reference tab, or the banner's
      `/about?tab=reference#new`. A visit that stays on Tools leaves the banner standing.
11. **Find a deck's Try it has no landing.** `Try it on a card you own →` names no target, and E10's `fits(deck)` does
    not apply to it.
    - **Resolution:** it lands on `/collection?avail=free` with `?tool=fits-your-decks`. Opening any free card then
      haloes `Find a deck for it` once. With no free card, it goes to `/collection` with no halo.
12. **The tab parameter.** `?tab=reference` is mirrored through `mirrorUrl` when the tab changes, and Tools is the
    absence.
13. **The card sizes disagree.** README-r2 says 530 and 460 tall; the property table says 354 × 450 and 300 × 400.
    - **Resolution:** the widths are as drawn and no height is fixed. Cards in a row stretch to the tallest, and the
      table's heights are the target the fixture lands near.
14. **Stale text from before R2b.** READINESS-r2's "For the audit" item 3 ("plus a menu of the rest"), Main's C3
    paragraph (`2 more are over ▾`) and the `showcaseCopy.more` keys all describe options A and B.
    - **Resolution:** option C governs (README-r2 R2b). Drop `more` and `tryItOptionsCopy.slim` and `.chip` at
      /copy-review.
15. **The rail's foot.** `OfflinePill` already sits above the account button.
    - **Resolution:** the ? sits above `OfflinePill`, so the offline pill stays next to the account button. The drawn
      6px gap and box are unchanged. From `md` up to 1279 the rail and the panel behave as at 1280.
16. **G19, `ABOUT_VERSION`.** About entries are paused (no new entry, no bump) until the redesign is done.
    - **Resolution:** R2 bumps nothing.
    - E16's and E17's copy edits (`1 credit per run`, the note's title) are ordinary edits that re-pin the
      `about.test.ts` content hash.
    - Whether the finished redesign is announced is decided when the line closes.
17. **States described but not drawn** (the Elsewhere chip pressed, a screen with no entries, a deck gone since
    render). Each one is fully specified in STATES and L2.
    - **Resolution:** build from those words. No Design round is needed.

## Agreement with R1 and the rulings since the brief

- R2 does not touch the Friends Home card, and it carries no ✕ or dismissal for it, so it agrees with the
  permanent-section ruling. Its Friends and pods tool card follows `SOCIAL_FRIENDS_ENABLED` and opens `/friends`.
- R2 reuses R1's halo, reuses R1's anchor registry, and spends a tool's moment on a Try it landing. It never draws
  M16 or ruling 7.
- **Copy.**
  - No "tick" and no British spelling appears in new strings. ("grey" appears once, in a canvas caption that does not
    ship.)
  - The shipped `pageIntro` says "catalogued". It is Hugh's letter and R2 leaves it unchanged; /copy-review may offer
    "cataloged".
- **Assets.** Nothing from `design/` is copied into `public/`. E9 captures every picture fresh from a fixture account.

## Before build

- `/copy-review` of `discovery-r2 · copy strings.ts`, including gaps 2 and 14.
- Hugh's calls still open: G11 (one theme for screenshots) and G13's remaining chips (Help me choose and Find a deck
  draw none, which is the safe default).
- The plan names E8 to E17 as tasks, with the resolutions above.
