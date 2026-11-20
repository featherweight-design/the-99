# Readiness Review — History in local time (R1)

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-20 (cold audit, lane a6, rebased on origin/main e47c3e709)
**Related ticket(s):** #2986
**Plan PR target:** TBD

## Summary

Buildable as drawn: a display-only change to `src/lib/collection/history-view.ts`, `src/components/collection/history-list.tsx`, the revert confirm's `when` string and `collectionEditCopy.history`, on `/collection/history` (`src/app/collection/(list)/history/page.tsx`). Every file it names exists as named and both phone (390) and desktop (1280) are drawn, before and after. The one real correction is plumbing: the handoff proposes a new `tz` cookie, but the app already has one. `the99_tz` (`src/lib/zone/cookie.ts`) is written on every page by `<ZoneCookie />` in the root layout and read on the server by `resolveZone()` (`src/lib/zone/server.ts`, already used by Home and `/announcements`), validated with `validTimeZone` exactly as the handoff asks. The plan reuses it; no new cookie. The remaining items are eng-side and settled by the handoff's own notes or by existing patterns in the code.

## Per-dimension findings

### 🗺️ Scope clarity

- [✅] Boundary stated: "Nothing else on the page moves." Other UTC date helpers (collection head `last updated`, `date-figure.tsx`, `tuning/note-date.ts`, `decks/format.ts`, `format/when.ts`) are explicitly out of scope (Q3) as a follow-up. Filing that follow-up issue is for the orchestrator or Hugh, not the build lane.

### 🎭 State coverage

- [✅] Every time-slot state (under a minute, under an hour, older), every day-heading state (today, yesterday, 2 to 6 days, older, another year) and every sentence (`revertedBy`, revert-confirm lede, foot, empty state, aged revert title) is tabled, with the midnight case (06:40Z = 11:40 PM Denver) drawn.
- [✅] Phone and desktop both drawn (art/A1-*, art/B1-*); placement is unchanged from shipped.
- [🟡] First visit without the cookie: handoff says render slot and headings after mount, width kept. Existing pattern for this is `useHydrated()` (`src/components/ui/hydrated-art.tsx`) with a `"UTC"` stand-in until hydrated, as in `friends-view.tsx` and `friend-head.tsx`. In practice the root layout writes the cookie on the first page of any visit, so this branch is rare.
- [🟡] Live tick (once a minute while an entry is under an hour old; day groups recompute at local midnight) needs a client clock; today `nowMs` is a server prop read once (`readClock`). See clarifications.

### 🔌 Data contract

- [✅] Only `createdAt` (and the reverting entry's `createdAt`) is read; both already reach the client in `HistoryListEntry`. No schema, API or action change. `loadCollectionHistory` paging returns the same shape.
- [🟡] `reachesBackLabel` and `shipLabel` are server-built strings (`dayLabel()` on the page). To land on the reader's day they must be built with the resolved zone on the server, or passed as instants and labelled in the client.

### 🧱 Codebase fit

- [✅] Slot keeps the shipped style (`font-mono text-[11.5px] text-[color:var(--fg-faint)]`, `history-list.tsx:258`); `--fg-faint` exists in `globals.css`. Headings keep the shipped mono uppercase style. No new tokens.
- [🟡] Cookie: use `the99_tz` via `resolveZone()`, not a new `tz` cookie (see summary).
- [🟡] Wall-clock helpers exist: `wall()` / `validTimeZone()` in `src/lib/time/zoned.ts`; grouping by the reader's day should use them (or `Intl` with `timeZone`) rather than new hand-spelled math.
- [✅] Copy changes are in `collectionEditCopy.history` (`src/lib/copy/collection-edit.ts:341`), marked DRAFT for `/copy-review`.

### ♿ Cross-cutting

- [✅] `<time dateTime={iso}>` with a full-stamp `title` improves the slot for assistive tech.
- [✅] Caching: no conflict. `/collection/history` is per-reader dynamic (`requireUserId`), is not one of the `cachePageForUser` pages (Home and `/decks`, `docs/agents/list-cache.md`) nor the deck page cache, and uses no `unstable_cache` / `"use cache"`. `resolveZone()` reads `cookies()` in the page body, as Home already does beside its own cache; the zone must not be read inside a cached function or folded into a cached payload. The cookie is written client-side by the existing `ZoneCookie`, so nothing new sets a cookie from a server render.
- [🟡] 12/24 hour follows the browser locale, which the server cannot know. See clarifications.

### ⏰ Drift from reality

- [✅] All named files exist on the rebased tree: `history-view.ts` (`dayLabel`, `timeLabel`, `groupByDay` on UTC, as the issue says), `history-list.tsx`, `revert-confirm.tsx` (`when` prop), `src/lib/time/zoned.ts` (`validTimeZone`), the history copy module.
- [🟡] The handoff predates its awareness of the zone cookie shipped in #2795 (`the99_tz`); corrected here, not a Design gap.

### 📝 Decision log

- [✅] Q1 to Q4 ruled by Hugh 2026-11-18 (LGTM, as recommended). Copy is marked DRAFT. Engineering notes are marked "not design calls".

## Gaps requiring a Design round-trip (Orange/Red only)

- None.

## Eng-side clarifications (Yellow only)

- Item 1: Zone source is the existing `the99_tz` cookie via `resolveZone()`; `ZoneCookie` in the root layout already sets it. No new cookie, no new writer.
- Item 2: Server render groups and labels with the cookie zone when present; with no cookie, follow the `useHydrated()` pattern (UTC-free stand-in at fixed slot width, real text after mount), per the handoff's "keep the slot's width, no flash of UTC".
- Item 3: Locale hour cycle: the day grouping and headings are zone-only and can render on the server; the slot clock and `whenPhrase` render the browser-locale form after mount (`useHydrated`), rather than relying on `suppressHydrationWarning` alone, which would leave the server's text in place.
- Item 4: Foot, empty state and aged-revert title (`reachesBackLabel`, `shipLabel`, `undidAged`) take the reader's day: build them with the zone on the server or pass instants to the client.
- Item 5: The once-a-minute tick and the local-midnight regroup run off a client clock (an interval started after mount, only while an entry is under an hour old, plus one timer to the next local midnight), seeded from the server's `nowMs`.
- Item 6: Revert confirm `when` becomes `whenPhrase(createdAt)`; `revertedBy` takes the same phrase (copy drops "at").

## Decisions inherited

- Every date and time on `/collection/history` is the reader's wall clock; nothing else on the page moves.
- Q1: weekday headings for 2 to 6 days ago (`Monday · Nov 16`).
- Q2: older rows show the clock time, not relative days.
- Q3: other UTC helpers are a follow-up, not this round.
- Q4: copy is DRAFT and goes through `/copy-review` (`revertedBy`, `weekday`, `justNow`, `minAgo`, the lower-case sentence forms).
- Tests pin `America/Denver` with an entry at 06:40Z (Yesterday, 11:40 PM), a DST change and another-year date.
- Flags: no migration, no new feature switch, no model call, no spend, no email.

## Design's own read (kept)

# READINESS · History in local time (R1, #2986)

**Verdict: Green.** R1 approved by Hugh 2026-11-18. Display-only change to `history-view.ts`, `history-list.tsx`, the revert confirm's `when` and the history copy, plus a `tz` cookie for the server render; no schema change.

- Q1 Weekday headings for 2 to 6 days ago (`Monday · Nov 16`). Ruled as drawn.
- Q2 Older rows show the clock time, not relative days. Ruled as drawn.
- Q3 Other UTC date helpers (collection head `last updated`, date-figure, tuning note dates, decks/format, format/when) are out of scope: follow-up issue.
- Q4 Copy is DRAFT: run /copy-review on `revertedBy`, `weekday`, `justNow`, `minAgo` before shipping.
- No hydration warning: zone from the `tz` cookie (validated with `validTimeZone`); without it, render the time slot and headings after mount; 12/24 h is the browser locale's.
- Tests pin America/Denver with an entry at 06:40Z (Yesterday, 11:40 PM), a DST change and another-year date.
