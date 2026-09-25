# Design Brief: How the app tells a returning reader what's new

**Date:** 2026-09-25 · **Branch:** `docs/about-rethink` (ruled by Hugh on 2026-09-25; §3)
**Asked by:** Hugh, 2026-09-25: "About page needs a more granular navigation. We also need to revisit how
we surface updates to users. Two problems with the current flow: first, we force users to the About
page, which is annoying; second, when on the about page, there are SO many sections that finding that
small 'new' badge is tedious. Rethink how this is surfaced and how we emphasize new entries."
**Spec:** `docs/superpowers/specs/2026-09-14-about-page-design.md`, whose rulings (`:26-47`) say "Do not
reopen without Hugh". Hugh reopened them on 2026-09-25. §1.4 lists each one this touches, and §3 says which his rulings overturn.
**Frame:**
- `/about`: `src/app/about/page.tsx` and `src/components/about/`.
- The version gate: `src/proxy.ts` and `src/lib/about/gate.ts`.
- The account menu's About row: `src/components/shell/account-menu.tsx`.
- The handoff: `design/design_handoff_the99_about/`, rounds R1 to R5.

**Measured on `origin/main` at `baa0cfa4`.** Every file:line below was read on that commit.

This round asks: **how does a returning reader learn what's new without being taken somewhere they
didn't ask to go, and, once they look, find the new things at a glance?**

---

## §1 What happens today

### 1.1 The gate

- **What decides whether a reader is behind.** `ABOUT_VERSION` is 9 (`src/lib/copy/about.ts:34`). A
  reader's acknowledged version is `user_prefs.about_version_seen`, which defaults to 0
  (`src/db/schema.ts:1385`).
- **The redirect.** A signed-in reader who is behind is sent with a 307 to `/about?next=<where they were
  going>`. That happens on every page navigation, including the signed-in `/` and client-side
  transitions. Prefetches are exempt, and so are `/about`, `/api` and static files
  (`src/proxy.ts:25-65`, `src/lib/about/gate.ts:81-146`).
- **The cookie.** `about_v` (`<userId>.<version>`, one year) is set on the redirect itself. It means "this
  browser has been sent to version N" (`gate.ts:13`), not "this reader acknowledged N". So one redirect
  per browser per version, and **another device redirects again** until the version is acknowledged
  (`proxy.ts:57-63`).
- **Who reads `seen`.** Only the proxy, when the cookie is missing or stale (`proxy.ts:46`), and the
  About page (`src/app/about/page.tsx:27`).
- **Who writes `seen`.** Only the **Got it** button (`dismissAbout`, `src/app/about/actions.ts:21-24`),
  which then continues to `next`. Leaving any other way writes nothing.
- **New accounts** have no row, so they read as 0 and their first navigation redirects too. The page
  marks nothing for them, because `seen === 0` marks nothing.
- **Pinned by tests:** `src/proxy.test.ts:46-111`, `src/lib/about/gate.test.ts`, `read.test.ts` and
  `actions.test.ts`.

### 1.2 The page

- **Size.** Four chapters and **39 entries**: Your collection 8, Finding a commander 7, Building the 99
  15, and Playing and tuning 9 (counted from each entry's `chapter` in `src/lib/copy/about.ts`; the chapter list is `src/components/about/about-page.tsx:30`). The module header still says
  34 (`about.ts:15`).
- **Entries.** 7 are insets and 32 are full-width plates, each with a figure, a caption and up to four
  key lines.
- **Length.** The handoff measured about four screens at desktop and eleven at phone for 24 entries
  (`READINESS-r2.md:37`), and five and a half at desktop for 32 (`READINESS-r4-audit.md:126`). At 39,
  that projects to roughly **seven screens at desktop and fifteen or more at phone**. This is an
  extrapolation, not a measurement (§7).
- **Navigation today.** Chapter-level only:
  - a contents list of four rows linking to `#chapter-NN`;
  - a sticky, scroll-tracking 216px rail at 1000px and wider, as W1 draws it;
  - an in-flow list below 1000px (`contents-rail.tsx:106-205`).

  Every entry carries an anchor id, but **nothing lists entries or links to them**, and there is no search
  or filter.
- **How "new" is marked.** An entry is new when `seen > 0 && entry.since > seen`
  (`about-page.tsx:38-40`). Three marks show it:
  - a 9.5px accent `NEW` pill after the title;
  - the eyebrow "N new since you were last here" above the h1;
  - "N new" on the chapter's contents row (`contents-rail.tsx:75-83`).
- **New entries stay in their chapters,** so a reader told "1 new" scans up to 15 plates of one chapter
  for a 9.5px pill.

### 1.3 A returning reader, step by step (seen 8, version 9)

1. They open `/decks` and land on `/about?next=%2Fdecks`.
2. The eyebrow reads "1 new since you were last here", and chapter 03's row reads "1 new".
3. The new entry, "The other half of a combo", sits somewhere among chapter 03's 15 entries.
4. **Got it** sits in the sticky rail on desktop and in a bar above the tab bar on a phone, with "takes
   you to /decks" beneath it. Pressing it writes 9 and continues.
5. On another device, all of it happens again.

### 1.4 The rulings this touches

These are Hugh's standing rulings. §3 records which of them his 2026-09-25 rulings overturn.

**From the spec** (`2026-09-14-about-page-design.md:26-47`):
- **S1, "One artifact, not two."** No carousel or tour; "a carousel is a second copy of the same content
  that drifts from the page".
- **S2, "It re-surfaces when it materially changes."** A bump means "everyone sees the page once more,
  with the new entries marked". AGENTS.md restates this as the reason every feature owes an entry
  (`:1827`, `:1851`).
- **S3, "Reached by redirect, not by banner."** Its reason: "A banner on Home is the affordance readers
  learn to ignore, which defeats the purpose of ruling 2." **This is the strongest argument against
  replacing the redirect with a quieter notice. Ruling 1's sheet answers it: every reader is still shown the news.**

**From the handoff:**
- **H1:** "The mark lives only on `/about`. No badge, dot or count on the avatar, the menu, the rail,
  the tab bar or Home" (`STATES-about.md:10-11`). The code restates it at `account-menu.tsx:24`.
- **H2:** the mark must not "Appear on more than one visit. Appear on any other route" (M1), nor stay
  "until it is manually cleared" (M3).
- **H3:** new entries stay in their chapters. The page must not "Reorder chapters to bring new entries
  up. Collapse unchanged chapters" (W2, `STATES-about.md:23`). It must not "Hoist new entries out of
  their chapters" (R2 D2, `STATES-about-r2.md:51`). It must not "Paginate, tab, or collapse a chapter",
  by ruling 1 (R2 D5, `:54`). `READINESS-r2.md:37-38` adds that ruling 1 "forbids the usual escapes
  (tabs, accordion, a tour)".
- **H4:** the page must not auto-write `seen` on render (G1).

**Where the code already departs from the handoff:**
- Got it is sticky on desktop and in a bar on the phone, not at the foot (W2, C4).
- G3 says a reader who is behind and arrives from the menu gets the dismiss ("takes you home"). The
  code refuses it on purpose: "a button reading `Got it — takes you home` would send them somewhere they
  never asked to go" (`about-page.tsx:150-152`).

### 1.5 Timing

The analysis line's launch batches its About entries and bumps `ABOUT_VERSION` (39 → 41 entries). Under
today's gate, that launch redirects every account once. **If this rethink is to change how that launch
is announced, it has to ship first**, and Hugh ruled that it will (ruling 6).

## §2 Prior art, and where each approach fails

Several of the sources below are vendors of the pattern they describe, and they are marked as such.

- **The forced redirect or launch modal** (today's gate).
  - Appcues, a vendor, keeps modals for "major updates" and warns that overuse harms the experience
    (appcues.com/blog/choosing-the-right-ui-pattern-for-your-product-update).
  - Nielsen Norman Group lists feature announcements that interrupt a task among the worst popup
    patterns (nngroup.com/articles/popups, /overlay-overload).
  - Chameleon, a vendor, reports from its own data that modals are dismissed about half the time. Tours
    the user starts complete 67% of the time, against 31% for tours started on a delay
    (chameleon.io/blog/mastering-product-tours).
  - **Where it fails:** it spends the reader's attention before they have a reason to give it, which is
    Hugh's first complaint.
- **The unread dot or count on a "What's new" entry.** Beamer and Headway (vendors) sell this; Slack and
  Linear put "What's new" in a help menu.
  - The reader chooses when to look.
  - **Where it fails:** a dot says something changed, not what, and readers learn to ignore it. That is
    exactly S3's objection. Beamer's claimed 3–10x engagement is a vendor figure.
- **An inline "New" pill on the feature itself.** The source is design guidance from Eleken, an agency.
  Shopify's Polaris guidance on the same pattern could not be confirmed.
  - It points at the feature where the reader will use it.
  - **Where it fails:** it becomes noise if it stays. The one persistence rule found is: clear on first
    use, after 5 days, or after 3 sessions. It also needs a host on every surface.
- **A release-notes page with anchors and contents** (Raycast "New in v2", Linear's changelog).
  - Good for reference and deep links.
  - **Where it fails:** nobody reads it unless something points at it, and past notes get hard to find
    (Arc).
- **A changelog you can filter.** GitHub's 2025 redesign has three change types, twelve product-area
  filters and a monthly archive (github.blog/changelog/2025-05-05). It is the strongest example found
  for finding a past change. No product was found with full-text search on its changelog.
- **Coach marks and tooltips.** Nielsen Norman Group found that back-to-back hints get dismissed faster
  "regardless of how helpful each may be", and that tutorials read up front did not raise success (91%
  against 94%).

**The author's reading, not a finding:** the sources separate the *notice* from the *reading*. None of
them shows a reference page that opens on its own new entries, which is what ruling 2's index does.

## §3 Rulings, locked (Hugh, 2026-09-25)

Hugh answered all six questions in the draft (§8 keeps them for the record).

1. **No redirect. A one-time sheet over the page the reader opened** (Option B). It shows "N new in
   About", lists the new entries' titles only, and offers **Show me** and **Later**. It overturns S3
   ("reached by redirect") and H2's "Appear on any other route". It keeps S2: every account is still
   shown what's new, without being taken anywhere.
2. **A what's-new index at the top of `/about`.** It holds the titles and routes of the new entries, and
   each one jumps to its entry. The entries themselves stay in their chapters (H3 kept). The index
   carries no caption or figure, so it is an index and not a second copy of the page (S1 kept).
3. **An entry stops being new once it is seen:** when the reader opens `/about`, or presses Show me,
   which opens it. The state stays one integer, `seen`. This overturns H4 (G1, no auto-write on render).
   The index is gone on a reload after that, and Hugh accepted that trade.
4. **Entry-level navigation: the contents list every entry under its chapter, plus a search box that
   filters that list by title.** The search filters the contents list only, never the page. No chapter is
   hidden, paginated or collapsed on the page, so S1 and H3 (D5) hold. **If Design finds the search must
   hide page chapters to work, that is a question back to Hugh, not a call for Design.**
5. **Pills on the features themselves (Option C) come later, as their own round.**
6. **This ships before the analysis line's launch bump, and that bump is held for it.**

## §4 What Design is asked to draw

Both widths, 390 and 1300, for everything below.

### 4.0 Readings settled here

These follow from the rulings. Hugh has not ruled on each one, and he may overrule any of them.
- **Show me** opens `/about` on the index. The page builds the index from `seen` as it stood before
  this visit, then records the visit, so the reader lands on a page that still shows what they came for.
- **Later** closes the sheet and records nothing. The sheet does not return in this browser for this
  version. `seen` stays behind, so another device shows the sheet once too, and `/about` still shows
  the index until it is opened.
- **Where the sheet never appears:** on `/about` itself, for a signed-out reader, and on any route the
  gate exempts today (`src/lib/about/gate.ts:81-91`).
- **A brand-new account** (`seen` 0) has nothing new, because everything is new (`STATES-about.md:9`).
  Its sheet does not list 39 titles. It introduces the page in one line and offers it. That keeps the
  first-run introduction the redirect used to give (S2), and it is shown once, like any sheet.
- **The Got it button retires.** With no redirect there is no `next` to continue to, so the page's
  dismiss goes. Opening the page is the acknowledgement (ruling 3).

### 4.1 The sheet

Over any route, non-blocking. It reads "N new in About", lists the new entries' titles, and offers Show
me and Later. The first-run variant (4.0) is a one-line introduction. Draw it:
- with one new entry, and with enough to need a limit (the analysis launch adds several at once);
- in the first-run variant;
- on a phone, where it must not cover the tab bar's controls for longer than the reader chooses.

### 4.2 The what's-new index

At the top of `/about`, above the chapters, for a reader who arrived behind. It shows each new entry's
title and route, and a press jumps to that entry in its chapter. Draw:
- the index;
- the entry as it looks when jumped to, which Design decides how to mark (§5);
- the page with no index, for a reader who is current or who arrived at `seen` 0.

### 4.3 The contents and the search

The contents list each chapter's entries under it, with new entries marked for a reader who arrived
behind. A search box filters that list by title. Draw:
- the expanded contents in the desktop rail and in the phone's in-flow list;
- a search with matches;
- a search with none;
- how a match is pressed (it jumps like an index row).

## §5 Open for Design to call

1. **The sheet's container and position** at both widths, and how it stays non-blocking (4.1).
2. **How many titles the sheet lists** before it summarizes the rest.
3. **How a jumped-to entry is marked**, and for how long on screen. The mark must not persist across
   visits (H2's M1 stands).
4. **The expanded contents:** whether chapters open fully, and how 39 rows plus a search fit the 216px
   rail and the phone's list.
5. **Where the search box sits** and how its empty state reads.
6. **What happens to the "N new" eyebrow and the chapter rows' "N new"** now that the index exists. They
   can be kept, merged into the index, or retired.

## §6 Locked, and not open

- **No redirect, ever, for an About bump.**
- **The search filters the contents list, never the page** (ruling 4).
- **New entries stay in their chapters.** The index points at them and never moves them (H3).
- **The index is an index:** titles and routes, no captions or figures (S1).
- **The version and the entries stay.** Every feature still owes an About entry, and a new entry still
  bumps `ABOUT_VERSION` (AGENTS.md About rules, reworded in this PR for the sheet). This changes how a
  bump is announced, not whether it happens.
- **A reader at `seen` 0 sees nothing marked as new** (`STATES-about.md:9`).
- **Nothing on the menu, the rail, the tab bar or Home** (H1 kept): the sheet is the notice.
- **Pills on features are not this round** (ruling 5).

## §7 What engineering owns (not for Design)

- **The redirect branch** of `gateDecision` (`src/lib/about/gate.ts:140-146`) goes. Its proxy tests
  (`src/proxy.test.ts:46-111`) are rewritten for the sheet.
- **The shell must know two things** before it can show the sheet: that the reader is behind, and that
  this browser has not shown it for this version. The proxy already reads `seen` when its cookie is
  stale (`proxy.ts:46`). One route is for it to keep that read and hand "behind" to the shell. The "sheet
  shown for N" marker must be a **new cookie name** (or an explicit version marker), never the old
  `about_v`. Browsers that were redirected but never pressed Got it already hold `about_v =
  <userId>.9` (`gate.ts:13`), and reading that as "sheet shown" would suppress the sheet for accounts
  that are still behind. The plan chooses the route, and must not add a database read to every
  navigation.
- **Recording the visit** is `markAboutSeen` (`src/lib/about/read.ts:37-39`, over the query at `:25-35`).
  It is called on an **actual open**, from a client effect or an action after the page has mounted with
  the index built from the pre-visit `seen`. **Never at render**: `/about` is a normal `<Link>` in the
  account menu (`account-menu.tsx:108-110`), so a render-time write could record a prefetch, hide the
  index on the real visit and break ruling 3. `dismissAbout` and the `next` handling retire
  (`src/app/about/actions.ts`, `gate.ts`'s `safeNext`).
- **The browser probes that clear the gate** write `about_version_seen` forward before they walk a page
  (for example `scripts/probe-verdict-block.mjs:127` and `probe-bracket-chip.mjs:97`; every
  `scripts/probe-*.mjs` that writes `about_version_seen`). They must go on clearing the sheet once it
  ships, since a sheet drawn over a measured page corrupts the measurement. Their header comments, and
  AGENTS.md's `probe:verdict-block` note about the redirect, are updated in the build PR.
- **The search** is client-side over the entries' titles, which the page already holds. It needs no new
  read.
- **AGENTS.md** (`:1827`, `:1851`) is reworded in this PR. A bump now shows every account a one-time
  sheet, and the text says the redirect applies until this ships.
- **Measure the page** at 390 and 1300 before Design sizes the index and the expanded contents. The
  screens in §1.2 are extrapolated from the handoff's audits.

## §8 Sequence, and the draft's questions

Hugh ruled on 2026-09-25. This brief goes to Design next. **The analysis line's `ABOUT_VERSION` bump is
held until this ships** (ruling 6), so its About entries are announced by the sheet and not the redirect.
Whether this feature owes an About entry is Hugh's call (AGENTS.md: Hugh decides which features owe
one). It changes how the page is reached rather than what the app can do, which argues for editing an
existing entry rather than adding a new one.

The draft's options, for the record:
- **A:** a count on the menu's About row;
- **B:** the one-time sheet, which is **chosen**;
- **C:** A plus feature pills, which is **later**.

Its six questions and their answers:
- **Q1, the notice:** B.
- **Q2, emphasis:** the index.
- **Q3, when an entry stops being new:** once seen.
- **Q4, navigation:** entries plus search.
- **Q5, pills:** later.
- **Q6, timing:** yes, before the bump.
