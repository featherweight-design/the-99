# Design Brief (draft): How the app tells a returning reader what's new

**Date:** 2026-09-25 · **Branch:** `docs/about-rethink` (DRAFT: research and options for Hugh; nothing is
ruled and nothing goes to Design yet)
**Asked by:** Hugh, 2026-09-25: "About page needs a more granular navigation. We also need to revisit how
we surface updates to users. Two problems with the current flow: first, we force users to the About
page, which is annoying; second, when on the about page, there are SO many sections that finding that
small 'new' badge is tedious. Rethink how this is surfaced and how we emphasize new entries."
**Frame:** `/about` (`src/app/about/page.tsx`, `src/components/about/`), the version gate
(`src/proxy.ts`, `src/lib/about/gate.ts`), and the account menu's About row
(`src/components/shell/account-menu.tsx`). The handoff is `design/design_handoff_the99_about/`, rounds
R1 to R5.

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
  going>`. This happens on **every page navigation**, including the signed-in `/` and client-side
  transitions. Prefetches are exempt, and so are `/about`, `/api` and static files (`src/proxy.ts:25-65`,
  `src/lib/about/gate.ts:81-146`).
- **The cookie.** An `about_v` cookie (`<userId>.<version>`, one year) is set on the redirect itself. So
  one redirect per browser per version. **Another device redirects again** until the version is
  acknowledged (`proxy.ts:57-63`).
- **When `seen` is written.** Only by pressing **Got it** (`dismissAbout`,
  `src/app/about/actions.ts:21-24`), which then continues to `next`. Leaving any other way writes
  nothing to the database.
- **New accounts** have no row, so they read as 0. Their first navigation redirects too. The page then
  marks nothing, because `seen === 0` marks nothing.
- **Pinned by tests:** `src/proxy.test.ts:46-111`, `src/lib/about/gate.test.ts`, `read.test.ts`,
  `actions.test.ts`.

### 1.2 The page

- **Size.** Four chapters and **39 entries**: Your collection 8, Finding a commander 7, Building the 99
  15, Playing and tuning 9 (`src/components/about/about-page.tsx:30`). The module header still says 34
  (`about.ts:15`).
- **Entries.** Seven are insets and 32 are full-width plates, each with a figure, a caption and up to four
  key lines. By estimate the page runs **roughly 14,000 to 20,000px on desktop**. That is an estimate,
  not a measurement, and §6 asks for the real figure.
- **Navigation today** is chapter-level only:
  - a contents list of four rows linking to `#chapter-NN`;
  - on desktop (1000px and up), the list is a sticky 216px rail with scroll tracking;
  - below that, it sits in the flow (`contents-rail.tsx:106-205`);
  - every entry carries an anchor id, but **nothing lists entries or links to them**;
  - there is no search or filter.
- **How "new" is marked.** An entry is new when `seen > 0 && entry.since > seen`
  (`about-page.tsx:38-40`). Three things mark it:
  - a 9.5px accent `NEW` pill after the entry's title;
  - an eyebrow above the h1, "N new since you were last here";
  - "N new" on the chapter's contents row (`contents-rail.tsx:75-83`).
- **New entries stay where they are.** A new entry keeps its place inside its chapter, so a reader told
  "1 new" must scan up to 15 plates of one chapter to find a 9.5px pill.

### 1.3 A returning reader, step by step (seen 8, version 9)

1. They open `/decks` and land on `/about?next=%2Fdecks` instead.
2. The eyebrow reads "1 new since you were last here", and chapter 03's row reads "1 new".
3. The one new entry, "The other half of a combo", sits somewhere in chapter 03's 15 entries.
4. **Got it** sits in the sticky rail on desktop and in a bar above the tab bar on a phone, with "takes
   you to /decks" beneath it. Pressing it writes 9 and continues to `/decks`.
5. On another device, all of this happens again.

### 1.4 The rulings this touches

These are Hugh's standing rulings from the About rounds. Every option below names which ones it
overturns, and none overturns them quietly.
- **R-gate**, "The redirect is the notification": the notice is the redirect itself
  (`STATES-about.md` §5 A3).
- **R-only-here**, "The mark lives only on `/about`. No badge, dot or count on the avatar, the menu, the
  rail, the tab bar or Home." (`STATES-about.md:10-11`). The code restates it:
  `account-menu.tsx:24` says "About … carries no badge, at any width, ever".
- **R-in-place:** new entries stay in their chapters. W2 says the page must not "Reorder chapters to
  bring new entries up. Collapse unchanged chapters" (`STATES-about.md:23`). R2 D2 says it must not
  "Hoist new entries out of their chapters" (`STATES-about-r2.md:51`).
- **R-no-auto-seen:** "Must not auto-write `seen` on render" (`STATES-about.md` §6 G1).
- **R-reach**, AGENTS.md's About rules (`:1827`, `:1851`): "a bump puts the page in front of every
  account once more with the new entries marked". This is the stated reason every feature owes an
  entry and a bump.

The code already departs from the handoff in two places, both deliberate per its comments:
- Got it is sticky, or sits in a bar, rather than at the foot (W2, C4).
- The desktop rail sticks and tracks scroll (C1), citing R4's canvas.

The account menu also offers no Got it (G3), and the reason is in the code: "a button reading `Got it —
takes you home` would send them somewhere they never asked to go" (`about-page.tsx:150-152`).

### 1.5 Timing

The analysis line's launch batches its About entries and bumps `ABOUT_VERSION` (the board's release
plan: 39 → 41 entries). Under today's gate, that launch redirects every account once. **If this rethink
is to change how that launch is announced, it has to ship first** (Q7).

## §2 Prior art, and where each approach fails

- **The forced redirect or launch modal** (today's gate).
  - Appcues keeps modals for "major updates" and warns that overuse harms the experience.
  - Nielsen Norman Group lists feature announcements that interrupt a task among the worst popup
    patterns.
  - Chameleon's data (550M events): modals are dismissed about half the time. Tours the user starts
    complete 67% of the time, against 31% when triggered on a delay.
  - **Where it fails:** it spends the reader's attention before they have any reason to give it, which
    is Hugh's first complaint.
- **The unread dot on a "What's new" entry** (Beamer and Headway widgets; the help menus at Slack and
  Linear).
  - The reader chooses when to look, and nothing is interrupted.
  - **Where it fails:** a dot says something changed, not what, so it is easy to ignore for weeks.
    Beamer's claimed 3–10x engagement is a vendor figure.
- **An inline "New" pill on the feature itself** (Eleken's badge guidance; Polaris, unverified).
  - It points at the thing exactly where the reader will use it.
  - **Where it fails:** it becomes noise if it stays. The one persistence figure found is: clear on first
    use, after 5 days, or after 3 sessions. It also needs a host on every surface.
- **A release-notes page with anchors and contents** (Raycast "New in v2", Linear's changelog).
  - Good for reference and deep links.
  - **Where it fails:** nobody reads it unless something points at it. Arc shows the archive side of
    that: past notes become hard to find.
- **A changelog you can filter** (GitHub's 2025 redesign: three change types, 12 product-area filters, a
  monthly archive).
  - The strongest example found for finding a past change.
  - No product found offers full-text search on its changelog.
- **Coach marks and tooltips** (Nielsen Norman Group):
  - hints stacked back to back are dismissed faster "regardless of how helpful each may be";
  - tutorials read up front did not raise success (91% against 94%) and made the tasks feel harder.

The pattern across these sources is that **the notice and the reading are separate.** A light, reader-chosen
notice points at a page built for scanning. The page opens on what's new rather than hiding it among
the rest.

## §3 Options

Each option fixes both of Hugh's problems: the forced trip, and the new entry lost in the page.

### Option A: a quiet notice, and a page that opens on what's new (recommended)

- **No redirect.** The gate stops redirecting. The version, `seen` and the cookie stay, because they
  still decide what is new.
- **The notice is a mark on the About row** in the account menu, plus one on the avatar or menu trigger
  that opens it. The mark is a count ("2 new") or a dot, at both widths. It clears when `seen` catches up.
- **The page opens on a "New since your last visit" block** above the chapters. It holds one compact card
  per new entry: title, route and caption line. Each card jumps to the full entry, which stays in its
  chapter, and the entry gets a clear mark when reached. One press marks them all read.
- **Granular navigation.** The contents list expands to entries under each chapter, with new ones marked.
  The desktop rail can also filter to "new only".
- **When `seen` is written:** when the reader opens `/about` while behind, or presses "Mark as read"
  (Q4).
- **Overturns** R-gate, R-only-here and R-in-place. The block adds a *list* of new entries; each entry
  itself stays in its chapter. It also overturns R-no-auto-seen if Q4 picks "on open". It weakens
  R-reach: a bump no longer guarantees every account sees the page. It only guarantees they are told.
- **Cost:** mostly UI. The gate's redirect branch is removed and its tests change. The menu mark needs
  `seen` on the client (the shell), which is one read.

### Option B: tell once, in place, then the same page as A

- **No redirect.** On the reader's first navigation while behind, a small non-blocking sheet appears over
  whatever they opened. It shows "What's new: 2", with each entry's title and one line, "See it in
  About", and "Got it".
- **Pressing Got it**, or following an entry, writes `seen`. The page is Option A's page.
- **Keeps** the guarantee that every account is shown the news (R-reach), without taking the reader
  anywhere.
- **Overturns** R-gate (the notice becomes the sheet) and R-in-place. It keeps R-only-here for the menu,
  since the sheet is the notice.
- **Cost:** a sheet host in the shell, and the prior art's roughly 50% modal-dismiss rate. It still
  interrupts once per version, per device until acknowledged.

### Option C: A, plus a "New" pill at the feature itself

- **Everything in Option A**, plus a small "New" pill on the surface each new entry describes (the
  Analysis tab, the Shopping limit, and so on). The pill links to the entry and clears on first use or
  after a fixed window.
- **Most contextual**, and it is how the best prior art reaches readers who never open a menu.
- **Overturns** what A overturns, and adds pills across the app that R-only-here forbids by name.
- **Cost:** every About entry then needs a host on its feature, and Design draws each one. That makes
  every future feature's About task larger. It fits a later round better than this one.

### Recommendation

**Option A**, with its page built so that C's pills can be added later without redrawing it.
- It answers both complaints directly. There is no forced trip, and the new entries sit at the top of
  the page with a jump to each.
- It is the pattern the prior art converges on: a light notice the reader chooses to open, pointing at a
  page built for scanning.
- The one real loss is R-reach. A reader who never opens the menu never sees the news. If Hugh wants to
  keep that guarantee, **Option B is the answer**, and it costs one sheet per version.

## §4 Questions for Hugh (one decision each)

1. **Should the forced redirect go?**
   - Yes, replace it with a mark in the menu (Option A, recommended).
   - Replace it with a one-time sheet in place (Option B).
   - Keep it, but land the reader on the new block.
2. **Where does the notice live?**
   - On the account menu's About row and its trigger (recommended).
   - Also on Home.
   - Also on the nav rail and tab bar.
3. **How are new entries emphasized on the page?**
   - A "New since your last visit" block of cards at the top that jump to each entry, which stays in its
     chapter (recommended).
   - Move the new entries themselves to the top.
   - A "Show only new" filter and nothing else.
4. **When is an entry no longer new?**
   - When the reader opens `/about` (recommended with A: opening is the acknowledgement).
   - Only when they press "Mark as read".
   - When they scroll the entry into view.
5. **How granular is the navigation?**
   - Entries listed under each chapter in the contents (recommended).
   - Plus a search box.
   - Plus filters by area, as GitHub does.
6. **How long does "new" last?**
   - Until the next version.
   - For a fixed window after the reader first sees it (for example 7 days).
   - Until read, as in Q4 (recommended: one rule, not two).
7. **Timing: must this ship before the analysis line's launch bump?** Otherwise that launch redirects
   every account under today's rules.
   - Yes, and hold the bump for it (recommended if the redirect goes).
   - No, launch first.
8. **Pills on the features themselves (Option C):**
   - Later, as its own round (recommended).
   - In this round.
   - Never.

## §5 Locked, and not open

- **The version and the entries stay.** Every feature still owes an About entry, batched per line, and
  a new entry still bumps `ABOUT_VERSION` (AGENTS.md About rules). This brief changes how a bump is
  *announced*, not whether it happens.
- **A reader at `seen` 0 sees nothing marked** (`STATES-about.md:9`). A new account has nothing to catch
  up on.
- **No option drops a ruling silently.** §1.4 names each one, and §3 names which option overturns it.

## §6 What engineering owns (not for Design)

- **The redirect branch** of `gateDecision` (`src/lib/about/gate.ts:140-146`) and its proxy tests
  (`src/proxy.test.ts:46-111`) change or go. The cookie and the database read stay, whichever option
  wins, if the menu mark needs them.
- **The menu mark needs `behind` on the client.** The shell reads `seen` once per request, and that
  must not add a database read to every navigation. The cookie can carry it.
- **"Mark as read" on open** is `markAboutSeen` (`src/lib/about/read.ts:25-35`) called from the page.
  That overturns G1 if Q4 picks it.
- **Measure the page's real height** at 390 and 1300 before Design sizes the block and the expanded
  contents. The ~14,000–20,000px in §1.2 is an estimate.
- **AGENTS.md's About rationale** (`:1827`, `:1851`) describes a bump as putting the page in front of
  every account. If R-reach is given up, that text changes too. That file is outside this lane's fence,
  so the orchestrator owns the edit.

## §7 Sequence

This is a **draft**. Hugh answers §4, the brief is rewritten around his answers, then it gets a cold
review and his approval, and only then a Design prompt. The About entries owed by the analysis line are
unaffected by any option. Q7 decides only whether their launch bump waits for this.
