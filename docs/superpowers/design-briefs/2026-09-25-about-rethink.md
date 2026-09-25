# Design Brief (draft): How the app tells a returning reader what's new

**Date:** 2026-09-25 · **Branch:** `docs/about-rethink` (DRAFT: research and options for Hugh; nothing is
ruled and nothing goes to Design yet)
**Asked by:** Hugh, 2026-09-25: "About page needs a more granular navigation. We also need to revisit how
we surface updates to users. Two problems with the current flow: first, we force users to the About
page, which is annoying; second, when on the about page, there are SO many sections that finding that
small 'new' badge is tedious. Rethink how this is surfaced and how we emphasize new entries."
**Spec:** `docs/superpowers/specs/2026-09-14-about-page-design.md`, whose rulings (`:26-47`) say "Do not
reopen without Hugh". This brief is Hugh reopening them, and §1.4 lists each one it touches.
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
  15, and Playing and tuning 9 (`src/components/about/about-page.tsx:30`). The module header still says
  34 (`about.ts:15`).
- **Entries.** 7 are insets and 32 are full-width plates, each with a figure, a caption and up to four
  key lines.
- **Length.** The handoff measured about four screens at desktop and eleven at phone for 24 entries
  (`READINESS-r2.md:37`), and five and a half at desktop for 32 (`READINESS-r4-audit.md:126`). At 39,
  that projects to roughly **seven screens at desktop and fifteen or more at phone**. This is an
  extrapolation, not a measurement (§6).
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

These are Hugh's standing rulings. Each option below names which of them it overturns.

**From the spec** (`2026-09-14-about-page-design.md:26-47`):
- **S1, "One artifact, not two."** No carousel or tour; "a carousel is a second copy of the same content
  that drifts from the page".
- **S2, "It re-surfaces when it materially changes."** A bump means "everyone sees the page once more,
  with the new entries marked". AGENTS.md restates this as the reason every feature owes an entry
  (`:1827`, `:1851`).
- **S3, "Reached by redirect, not by banner."** Its reason: "A banner on Home is the affordance readers
  learn to ignore, which defeats the purpose of ruling 2." **This is the strongest argument against
  replacing the redirect with a quieter notice, and the options must answer it.**

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
is announced, it has to ship first** (Q6).

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
them shows a reference page that opens on its own new entries, which is what Options A and B propose.

## §3 Options

### Option A: a quiet notice, and a page that opens on what's new

- **No redirect.** A count ("2 new") on the account menu's About row, and a small mark on the trigger
  that opens the menu, at both widths.
- **The page opens with an index of what's new.** The line "New since your last visit" is followed by
  one row per new entry, each giving its title and route and jumping to the entry. **The rows carry no
  caption or figure**, so they are an index, not a second copy of the content (S1). The entries stay in
  their chapters (H3).
- **Granular navigation:** the contents list shows each chapter's entries, with the new ones marked.
- **Overturns** S3 and H1.
- **Answering S3.** The notice sits where the reader already goes to reach About, and it names a count,
  not "something changed". It is still a notice the reader can ignore, and that is the honest trade.
- **S2 weakens** from "everyone sees the page" to "everyone is told".

### Option B: tell once, in place, then the same page as A

- **No redirect.** On the reader's first navigation while behind, a small non-blocking sheet appears over
  the page they opened. It reads "2 new in About", lists the titles only, and offers "Show me" and
  "Later".
- **The page is Option A's page.**
- **Keeps** S2's guarantee that every account is shown the news, without taking anyone anywhere.
- **Overturns** S3, since the sheet replaces the redirect. It also overturns H2's "Appear on any other
  route": the sheet names new entries on the route the reader opened.
- **Cost:** a sheet host in the shell. Per the vendor data above, about half of readers dismiss it. It
  still interrupts once per version on each device, as today's redirect does.

### Option C: A, plus a "New" pill on each feature

- **Option A,** plus a pill on the surface each new entry describes. The pill links to the entry and
  clears on first use or after a window.
- **Overturns** what A overturns, plus H2 across the app.
- **Cost:** every future About entry then needs a host on its feature, which Design draws each time. That
  is a larger cost for every feature, so it suits a later round.

**Keeping the redirect but landing on the new index** is not an option here: it fixes the second
complaint and not the first. It is kept as Q1's third answer for completeness.

### Recommendation

**Option B.** It removes the forced trip, which is Hugh's first complaint, and puts the new entries
at the top of the page, which is his second. Unlike A, it keeps S2's promise that every account is shown
what's new, and it answers S3's objection that readers learn to ignore banners. **Option A** is the
lighter choice if Hugh is willing to trade that promise for no interruption at all.
The page half, the index of what's new plus entry-level contents, is the same under A, B and C, and can be
built first.

## §4 Questions for Hugh (one decision each)

1. **How is a returning reader told there's something new?**
   - A small sheet over the page they opened, once (Option B, recommended).
   - A count on the account menu's About row, and nothing else (Option A).
   - The redirect, as today, landing on the new index.
2. **How are new entries emphasized on the page?**
   - An index of what's new at the top: titles and routes, each jumping to its entry, which stays in its
     chapter (recommended).
   - Move the new entries themselves to the top of the page.
   - Leave it as today's marks.
3. **When does an entry stop being new?**
   - When the reader has seen the index (opened `/about`, or pressed "Show me" on the sheet)
     (recommended). This keeps one integer `seen`, but the index is gone on reload.
   - Only when they press a "Mark as read" control. The list survives an interrupted visit, but H2's M3
     forbids a mark kept until it is manually cleared.
   - After a fixed window, such as 7 days from first sight. That needs a timestamp beside `seen`.
4. **How granular is the navigation?**
   - Entries listed under each chapter in the contents (recommended).
   - That, plus a search box.
   - That, plus filters by area, as GitHub does. Filtering hides chapters, which S1 and H3 forbid today.
5. **Pills on the features themselves (Option C):**
   - Later, as their own round (recommended).
   - In this round.
   - Never.
6. **Must this ship before the analysis line's launch bump?** Otherwise that launch redirects every
   account under today's rules.
   - Yes, and hold the bump for it (recommended if the redirect goes).
   - No, launch first.

## §5 Locked, and not open

- **The version and the entries stay.** Every feature still owes an About entry, and a new entry still
  bumps `ABOUT_VERSION` (AGENTS.md About rules). This brief changes how a bump is *announced*, not whether
  it happens.
- **A reader at `seen` 0 sees nothing marked** (`STATES-about.md:9`).
- **No ruling is dropped silently.** §1.4 names each one, and §3 says which option overturns it.

## §6 What engineering owns (not for Design)

- **The redirect branch** of `gateDecision` (`src/lib/about/gate.ts:140-146`) and its proxy tests
  (`src/proxy.test.ts:46-111`) change or go.
- **Behind is not known outside the proxy today.** Any in-app notice (A's count, B's sheet) needs the
  shell to know whether the reader is behind. There are two routes:
  - a new read of `seen`;
  - a cookie whose meaning changes from "sent to N" (`gate.ts:13`) to "acknowledged N", written by the
    acknowledgement.

  Neither is free, and the plan chooses.
- **Per-entry state.** Q3's "window" answer needs a timestamp column. A per-entry "reached" mark would
  need per-entry state, and no option here asks for one.
- **Measure the page** at 390 and 1300 before Design sizes the index and the expanded contents. §1.2's
  screens are an extrapolation from the handoff's audits.
- **AGENTS.md** (`:1827`, `:1851`) describes a bump as putting the page in front of every account. It
  also justifies batching a line's entries by the attention a forced trip costs. If Q1 drops the
  redirect, both need rewording. Batching still spares readers a notice per round, so it stands on its
  own. That file is outside this lane's fence, so the orchestrator owns the edit.

## §7 Sequence

This is a **draft**. Hugh answers §4, the brief is rewritten around his answers, then it gets a cold
review and his approval, and only then a Design prompt. The About entries the analysis line owes are
unaffected by any option. Q6 decides only whether their launch bump waits for this.
