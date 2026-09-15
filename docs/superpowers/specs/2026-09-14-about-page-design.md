# About The 99 — design

**Date:** 2026-09-14
**Status:** brainstormed and approved; awaiting design handoff
**Routes:** `/about` (new)
**Surfaces touched:** `AccountMenu` (new third row), `src/proxy.ts` (existing Clerk middleware)
**Handoff:** not yet commissioned
**Readiness:** not yet filed

## The problem

Nothing in the app explains what the app does. A new account lands on Home's first-run
checklist, which is a competent *do this next* — upload a CSV, pick a commander, build a
deck — and says nothing about why any of those steps exist or what waits behind them.
Everything the app has learned to do since is discoverable only by wandering into it.

That has two costs. A new player never finds the features that would have sold them on the
thing: set completion, availability claims across decks, versions, the buy list. And a
feature that ships after someone's first week reaches nobody, because there is no surface
whose job is to say "this exists now, here is where it lives."

This is not a changelog. It reads as an information document about how The 99 supports a
Commander player, organised by what the player is trying to do. It assumes the reader
knows how Magic works and explains nothing about the game itself.

## Rulings

Settled during brainstorming on 2026-09-14. Do not reopen without Hugh.

1. **One artifact, not two.** A single `/about` route is both the first-run introduction
   and the permanent reference. No welcome carousel, no coach-mark tour over the live
   routes — a tour is not something you can return to, and a carousel is a second copy of
   the same content that drifts from the page every time a feature lands.
2. **It re-surfaces when it materially changes.** The page carries `ABOUT_VERSION`. Launch
   is version 1, so every existing account sees it on next visit. A feature that adds an
   entry bumps the version and everyone sees the page once more, with the new entries
   marked. Copy edits and typo fixes do not bump it.
3. **Reached by redirect, not by banner.** Anyone whose acknowledged version is behind is
   sent to `/about` before their destination. A banner on Home is the affordance readers
   learn to ignore, which defeats the purpose of ruling 2.
4. **Organised by what the reader is doing, each entry naming its route.** Four chapters in
   the order a Commander player actually moves. A feature's paragraph belongs to the
   chapter whose job it serves, not to the screen it renders on.
5. **Not public.** `/about` guards with `requireUserId()` exactly like `/decks`. The app is
   invite-only and stays that way for now. Revisit if that changes.
6. **The permanent entry point is the account menu.** A third row under Manage account and
   Sign out. One insertion covers both widths — the same `AccountMenu` is the rail trigger
   on desktop and the sheet at phone. It is not a sixth nav pillar.

## Content model

Content lives in `src/lib/copy/about.ts`, following the repo's copy-in-definitions
convention, as structured data rather than prose blobs:

```ts
export const ABOUT_VERSION = 1;

type Entry = {
  title: string;  // the feature, in the app's own vocabulary
  body: string;   // what it does for a Commander player
  route: string;  // a static, navigable href; rendered as a real link
  since: number;  // the ABOUT_VERSION that introduced this entry
};

type Chapter = { title: string; blurb: string; entries: Entry[] };

export const chapters: Chapter[] = [ /* the four below */ ];
```

Structured rather than MDX for three reasons. `pnpm check:copy-drift` already scans
`src/lib/copy`, so the page's copy is covered by the existing guard for free. `since` is a
field rather than a convention someone has to remember. And the route links are values a
test can resolve against `src/app`, so a renamed route fails CI instead of quietly 404ing
from the one page in the app whose job is telling people where things are.

**`route` is always a concrete static href, never a filesystem pattern.** Much of what
this page documents lives on a dynamic route (`/decks/[id]`) or in a modal with no route at
all (card detail, opened through `CardDetailProvider` and the route-agnostic
`getCardDetail` action). A pattern is not a navigable link and the page has no id to
substitute into one, so those entries link the list route that reaches the feature —
`/decks`, `/collection`, `/commanders` — and the body says where it opens once you are
there. One entry, one destination: an entry that wants to name two features is two entries.

`since` is the entire "what's new" mechanism. There is no changelog, no dated entries and
no version history rendered anywhere. An entry is marked new when
`seen > 0 && entry.since > seen`, and the mark shows on that visit only.

The `seen > 0` half is the rule, not an edge case: a reader at version 0 — everyone at
launch, and every new account — would otherwise have every `since: 1` entry marked, which
is the whole page. Nothing is new to someone seeing all of it for the first time.

## The chapter inventory

The content skeleton. Each entry below names a shipped surface; the copy itself is written
in PR 1 and passed through `/copy-review` before any of it is drawn.

### 1 — Your collection

Everything downstream is scored against what you own, so this is where the app starts.

| Entry | Route | Opens |
|---|---|---|
| Import a collection | `/collection/replace` | — |
| Rows the import could not place | `/collection/replace` | the issue inspector |
| Browse what you own | `/collection` | — |
| Set completion | `/collection/sets` | — |
| What a card costs to buy | `/collection` | the card detail modal |
| The card itself — printings, art, both faces | `/collection` | the card detail modal |

Import takes a CSV export from Moxfield, Archidekt, Deckbox or ManaBox, or a pasted list.
The unmatched-rows entry has to be honest that a pasted list carries no set or collector
number, which is why a pasted collection cannot drive set completion. Prices come from
ManaPool and are refreshed weekly; the entry states that absence from the feed means never
stocked rather than free.

### 2 — Finding a commander

| Entry | Route | Opens |
|---|---|---|
| Commanders you can build today | `/commanders` | — |
| Commanders worth acquiring | `/discover` | — |
| Why this commander | `/commanders` | a commander's own page |
| What the deck would be made of | `/commanders` | a commander's own page |
| Partners | `/commanders` | a commander's own page |

The two lanes are the distinction worth drawing plainly: `/commanders` ranks what your
collection already supports, `/discover` ranks commanders you do not own. Both take a
colour-identity filter and an order control.

### 3 — Building the 99

| Entry | Route | Opens |
|---|---|---|
| Start a deck | `/decks/new` | — |
| Import a decklist you already have | `/decks/import` | — |
| The deck page | `/decks` | a deck |
| Adding cards | `/decks` | a deck's Add panel |
| Topping off the last slots | `/decks` | a deck |
| Who holds this card — availability across your decks | `/decks` | a deck |
| What you would need to buy | `/decks` | the shopping roll-up |
| Shelves | `/decks` | — |
| Versions | `/decks` | a deck's Versions tab |
| Reviewing a draft before you commit it | `/decks` | a deck's pending banner |
| Export a decklist | `/decks` | a deck |

Availability is the feature most likely to be misread and most worth explaining: a card
you own once cannot be in two committed decks at the same time, seniority decides which
deck holds it, and a card staged into a draft counts against the supply the moment you add
it. Versions need the draft-versus-committed distinction stated once, plainly.

Versions and the review screen are two entries because they are two surfaces. The version
rail draws inside the deck's own `Versions` tab rather than on a route of its own
(`version-history.tsx:6-10`), and `/decks/[id]/changes` is the *draft review* screen, which
redirects back to the deck when there is nothing to review
(`src/app/decks/[id]/changes/page.tsx:75`). Neither is linkable in the abstract, so both
entries point at `/decks`.

### 4 — Playing and tuning

| Entry | Route | Opens |
|---|---|---|
| Log a game | `/decks` | a deck's Games tab |
| What the log tells you | `/decks` | a deck's Games tab |
| Picking up where you left off | `/` | — |
| Where your collection is committed | `/` | — |

Home is described here rather than given a chapter of its own: it is the place you return
to, so it reads as the end of the loop rather than the start of it.

### Amended 2026-09-15 — the handoff's copy file is the entry set of record

The inventory above is the spec's original skeleton and is superseded by
`design/design_handoff_the99_about/about · copy strings.ts`, which R3 regenerated to 32 entries
across chapters of 7 / 6 / 10 / 9. Everything the skeleton listed survives; R3 added the deck
page, browsing the collection, the deck update flow, export, Put back, themes, reservations and
proxies.

One entry is owed beyond that set: **the post-import summary** — what a collection replace did to
your decks — which merged as #639 and #643 during the design round. It belongs in chapter 01
beside "Import a collection", because it is the consequence of an import rather than a deck
feature.

### Not documented

Deck tuning suggestions (#10) is designed but parked and renders nothing — it gets no
entry until it ships. Nothing in the backlog gets an entry ahead of its merge. The rule is
that the page describes the app as it is, which is also what makes the `since` marker
meaningful.

## The gate

Two markers, doing different jobs.

**Cookie `about_v`** — written by the gate on the redirect response, bound to the reader's
Clerk id: the value is `<userId>.<version>`. It means "this browser has been sent to
version N of the page, as this account." It clears the gate immediately, so a reader who
reads the page and navigates away without pressing anything is not bounced straight back.
Without it the redirect is a trap.

Binding to the id is not decoration. A bare version would be honoured for whoever signs in
next on that browser, so if you read About and then a friend signs in on your machine, the
gate would skip their `user_prefs` read and they would never see the page. `httpOnly`,
`sameSite=lax`, `path=/`. Forging it only skips a page, so it is not signed.

**The cookie is written by the gate, not by the page.** A Server Component cannot mutate
response cookies during render, so `/about` cannot set it on its way out; the redirect
response can, and that is the same moment the reader is sent there. A reader who reaches
`/about` from the account menu rather than by redirect was never behind, so there is
nothing to write.

**`user_prefs.about_version_seen`** — written by the dismiss action. Means "this account
has acknowledged version N," and is what keeps a second device quiet.

### Where the gate runs

**In `src/proxy.ts`, inside the existing `clerkMiddleware` callback.** Next 16 renamed the
middleware entrypoint and this repository already ships the renamed file (`src/proxy.ts:3-4`),
which today does one thing: `auth.protect()` on every route that is not `/`, `/api/health`
or `/api/cron(.*)`. A new `src/middleware.ts` would be ignored outright.

The gate therefore runs *after* the existing protection, never before it, and never as a
pass-through that would bypass it:

1. `auth.protect()` as today. An unauthenticated request never reaches the steps below —
   Clerk has already sent it to the Account Portal.
2. Request is for `/about` itself, or is not a document navigation → return.
3. Cookie `about_v` equals `<userId>.<ABOUT_VERSION>` → return, with no database read.
4. Otherwise one primary-key read of `user_prefs`. Current → return, setting the cookie so
   the read does not repeat. Behind → redirect to `/about`, setting the cookie on that same
   response.

The cookie is what keeps this from being a database read on every navigation: it costs one
read per browser per version per account.

### The `next` parameter

The redirect carries where the reader was going, as `/about?next=<path>`, and the dismiss
action sends them on. That value round-trips through a URL and a form, so it is
attacker-controlled and cannot be handed to `redirect()` as it arrives.

Construction: the full destination including its query string, `encodeURIComponent`'d whole.

Acceptance, before any redirect: the decoded value must begin with a single `/`, must not
begin with `//` or `/\`, and must contain no scheme or authority. Anything else — absent,
malformed, absolute, protocol-relative — falls back to `/` silently. Same-origin relative
paths only; there is no allowlist of external destinations because there are no external
destinations.

The dismiss control renders only when the reader is actually behind. Arrived by redirect,
pressing it writes the row and returns them to the validated `next`. Reached from the
account menu while already current, there is no button, because there is nothing to
acknowledge.

## Data model

One new table. Nothing in the schema keys on a users table today — every table carries the
Clerk `user_id` directly — so this is a new table either way.

```sql
create table user_prefs (
  user_id text primary key,
  about_version_seen integer not null default 0
);
```

Rejected alternatives. **Clerk `publicMetadata`** rides the session token and refreshes on
its own cycle, so a dismiss could bounce the reader straight back to `/about` for up to a
minute. **localStorage**, the repo's existing home for one-shot dismissals
(`use-local-flag.ts`), is per-device and would re-prompt on every browser — and ruling 2
makes that a recurring annoyance rather than a one-off.

The table is named for what it is rather than for this one feature; a second per-account
preference is a column, not a second table. It gains no columns speculatively.

## Staying current

A guard, `src/lib/copy/about.test.ts`, pinning four things:

1. **Content hash.** The hash of `about.ts`'s chapter data against a committed
   `{version, hash}` pair. Change the copy and CI fails: you either bump `ABOUT_VERSION`
   because the change is material, or re-pin the hash because it is a typo fix. Either is a
   deliberate act rather than a default.
2. **No entry claims a future version.** Every `since` is at most `ABOUT_VERSION`.
3. **Every route resolves, and none is dynamic.** Each `route` maps to a real `page.tsx`
   under `src/app` **with no dynamic segment** — a `[slug]` in a link the page has no id to
   fill is a guaranteed 404, so the guard rejects the pattern rather than resolving it.
   This page is the one place that teaches people where things live, so a stale link here
   is worse than a stale link anywhere else.
4. **No two entries share a title**, and every entry has a `route`.

What no guard can catch is a feature shipping with no paragraph written at all. That is a rule
in three places rather than a check, and `AGENTS.md` §Design pipeline is where it lives: the
entry is drawn in the feature's own design handoff, the `ABOUT_VERSION` bump is a named plan
task, and `feature-acceptance` does not pass without both. Saying so is better than building
something that reports green over it — the lesson `check:copy-drift` cost four review
rounds to learn.

## Surfaces, for acceptance

| Surface | Phone | Desktop |
|---|---|---|
| `/about`, reader at version 0 (everything, nothing marked) | ✓ | ✓ |
| `/about`, reader behind (new entries marked, dismiss present) | ✓ | ✓ |
| `/about`, reader current (no marks, no dismiss) | ✓ | ✓ |
| Account menu with the About row | ✓ | ✓ |
| Redirect from a deep link, and the return to `next` | ✓ | ✓ |

## What ships

`/about` is new UI and the account-menu row changes the appshell, so per `AGENTS.md` the
rendered half is gated on a design handoff with a READINESS verdict. The database and copy
half is not.

**PR 1 — data and copy, nothing rendered.** The `user_prefs` table and its migration,
`src/lib/copy/about.ts` with all four chapters written, and the guard. No page, no
gate, no menu row. The copy is the bulk of the real work and this is where
`/copy-review` goes over it, before any pixels exist.

**PR 2 — the surface, after READINESS.** The `/about` page, the account-menu row, the gate
inside `src/proxy.ts`, the dismiss server action, and the cookie. Both widths in the same PR, with a
contact sheet per `feature-acceptance`.

There is no third PR and these two do not stack: PR 1 merges to `main` before PR 2 branches.

## Open for Design

Carried into the handoff prompt rather than decided here.

- How a chapter and its entries are drawn — whether entries are rows, cards, or a
  definition list, and how the route link is expressed.
- What the "new" mark on an entry looks like, given the app already has several marks
  competing for that meaning.
- Whether the four chapters are all on one scrolling page or sectioned with a jump control
  at desktop width, and what the phone does instead.
- The dismiss control's placement and copy — bottom of the page, sticky, or at the top.
- What the account-menu row is called and where it sits relative to Manage account.

## Not in scope

- Any change to Home's first-run checklist. It keeps its job; `/about` runs ahead of it.
- A public or marketing-facing version of this page. Ruling 5.
- Per-feature tooltips, empty-state help text, or contextual hints on other routes.
- A changelog, release notes, or any dated history.
