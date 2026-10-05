# Card labels on three low-risk surfaces (item 7) Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax.

Written 2026-10-04 against `origin/main`, after the v8 relabel (#1241, #1246, #1250). No model call is made by any PR here.

**Goal:** Let a fresh card label drop a Consider role-gap pick whose label names no job of the role it fills, without moving any count, budget, fill, score, profile or tutor reading.

**Architecture:** Labels are read ONCE per deck-page request, AFTER the cached suggestions payload resolves, for the suggestion ids the page renders, in the same post-cache wave that already reads prices, availability, `candidateFacts` and combo completions. A pure function decides which role-gap picks to drop. Nothing label-derived enters `loadDeckSuggestions` or any `cacheForUser` entry.

**Tech Stack:** Next.js 16 server component, Drizzle raw SQL (`readLabels`), Vitest.

**Spec:** Hugh's approval of the comparison's ranked shortlist (2026-10-04), board `lanes/card-labels-item7-comparison.md` §6, §4, §3 and "Ranked shortlist".

**Global Constraints:**
- No change to `planFill`, role targets, `computeRoleCounts`/the mix strip, scoring, `deck_profiles`, `classifyTutor`/`isTutor`, or `relevant()` itself (stand-ins share it).
- A card with no fresh label (`readLabels` leaves it absent, including a stored `[]`) reads exactly as today. Every rule below is "label present AND says X", never "label absent means Y".
- One `readLabels` call per request, over rendered ids only (suggestion ids, at most `deckBodySize`), never catalog-wide.
- Switch off: `readLabels` is not called and the page is identical to main.
- No new browser probe in this lane. Verification is unit tests, mutation runs, a throwaway read-only staging measurement, and a contact sheet.
- US English, no em-dashes; every new string goes through `/copy-review`.

**Review Focus:** that the filter can never drop an EDHREC or Top pick, a land face, or a card with no fresh label; that the label read sits outside every cache.

---

## Findings that shape the plan

1. **Cached payloads.** `loadDeckSuggestions` is served through `cacheForUser(userId, ["deck-suggestions","2", id, indexGen])` (page.tsx L120). The key carries deployment and catalog generation, but a label publish (`publishRun`, `src/lib/labels/publish.ts`) moves neither, so a label read INSIDE that loader would serve the previous run's labels for up to the 1h `CEILING_SECONDS`. Reading after the cache avoids that, needs no key change, and keeps the switch out of the key (the switch is read per request; Vercel needs a redeploy to flip it anyway, which changes `DEPLOYMENT_ID`).
2. **`role` is load-bearing.** `suggestion-tile.tsx` `handleAdd` passes `suggestion.role` to `addOptimisticCard`, and the strip counts optimistic rows by `role` (`computeRoleCounts`, `src/lib/decks/mix.ts:32`). PR A therefore only removes picks and never edits a field on one.
3. **Shelf headers count the deck by text** (`buildShelves`, `consider-panel.tsx:47`), which is why PR B was dropped.
4. **`synergy-cards.ts` cannot take the filter safely:** on `/commanders/[slug]` there is no deck, and on the deck page it is the bulk-fill allow-list, so filtering it would change the fill.

## The switch

Add `LABEL_SURFACES_ENABLED` (`src/lib/labels/read.ts`, `labelSurfacesEnabled()`, exact string `'true'`, read per request). Reusing `STAND_IN_LABELS_ENABLED` would switch these Consider changes on in staging the moment they deploy and tie their production release to the stand-ins sheet's, which Hugh walks separately (every feature behind its own switch, the 2026-09-24 release ruling). No new About entry and no version bump (Hugh, 2026-10-04): if one is owed, it is an ordinary edit to an existing entry, so the switch is not added to `SWITCHES` in `src/lib/about/visible.ts`.

## Design round

None. PR A removes tiles from an existing shelf and adds no element or copy. PR C, the only item that
would have needed one, is deferred.

## PR A: Consider filter (item 1), role agreement

**Ruled 2026-10-04 (Hugh): role agreement, land faces exempt.** The first rule planned here, dropping a
role-gap pick whose label makes it irrelevant to the deck's types (`relevant()` under the deck lens),
was built and measured read-only on staging's 22 decks: it dropped 0 of 605 role picks, because
`suggestDeck` fills each role from unrestricted cards first and the type-restricted ones it would catch
are never picked. The deck lens extraction it needed was reverted with it.

**The rule** (`src/lib/labels/consider.ts`, `labelDisagrees`/`filterConsider`): a role-gap pick (its
`reason` is ramp, draw, removal, wipes or land) is dropped when it has a FRESH label (`readLabels`; a
stored `[]` reads as none) and none of its jobs is a kind that fills that role (`counterspell` fills
removal). A land face is never dropped. An EDHREC or Top pick is never judged.

**Measured** (staging, 22 decks, read-only, stored EDHREC data only): 14 drops, 13 correct:
graveyard hate the text classifier calls removal (Mirror Golem, Mourner's Shield, Soul-Guide Lantern,
Disruptor Wanderglyph), cycling or a Clue it calls draw (Lay Waste, Runaway Boulder, Zuko's Exile),
a scry it calls draw (Treasure Map), combat-only mana it calls ramp (Fire Sages). Gran-Gran's `ramp`
label looks wrong; its drop does no harm. **Trade-off:** Runaway Boulder and Zuko's Exile are good
removal and leave Consider entirely, since the removal role does not offer them separately.

**Wiring** (`src/lib/decks/consider-labels.ts`, the deck page): one `readLabels` call over the suggestion
ids, in the existing post-cache `Promise.all`, outside every `cacheForUser` entry; the filter applies
where `pricedSuggestions` is built, so the ancillary reads overfetch a dropped pick by one row. Off
(`LABEL_SURFACES_ENABLED` anything but `'true'`) reads nothing and returns the same list.

**Tests:** the rule (absent label kept, disagreement, agreement and counterspell, land face, EDHREC
never judged), the switch (exactly `'true'`, asserted on `enabled()`), the read (once, exactly the
suggestion ids), and a page boundary test (outside the cache, in the wave, filtering
`pricedSuggestions`). Each guard is mutation-checked.

## Dropped and deferred (Hugh, 2026-10-04)

- **PR B, shelf grouping for EDHREC picks: DROPPED.** The shelf header counts the deck by text, so a
  label-shelved add would leave its count unmoved.
- **PR C, card-note label lines: DEFERRED**, with no Design round.
- **Synergy relevance: Consider only.** `synergy-cards` stays unfiltered.
- **How it works and About:** an ordinary edit to an existing entry if one is owed; no new entry and no
  `ABOUT_VERSION` bump.

## PR D: version-aware freshness (APPROVED, Hugh 2026-10-04)

**Approved; engineering only, zero model calls, no relabel.** Each label records the prompt version
that wrote it and stays fresh under that version until it is deliberately redone; a prompt edit no longer
stales every row, and a change in the card's own TEXT still does. Any targeted relabel afterwards is a
separate spend Hugh approves with its exact scope, card count and dollars. Background: the 2026-10-04 relabel showed the cost: any
edit to `SYSTEM` restales every `card_labels` row (`labelInputHash` hashes the prompt), so a one-line
prompt fix becomes a 32,000-card, ~$60 run. A version-aware rule would keep a row fresh across a
prompt version unless that version names the row's card or one of its job kinds as changed, so a
targeted prompt fix relabels only what it targets. It touches `labelInputHash`, `freshLabels`, the
build's stale set and the copy's `planCopy`, so it is its own PR, and it waits on Hugh.

## Spend

None. Every PR here reads stored labels; no PR adds, triggers or widens a model call. Hugh's rule
(2026-10-04): no paid model call without his explicit confirmation of scope, card count and dollars.

## Rulings

All four open questions were answered on 2026-10-04 (see Dropped and deferred above).

## Risks

- A wrong or incomplete label drops a pick that does fill its role. Measured: 1 of 14 (Gran-Gran's label
  looks wrong; the drop is harmless). Lands are exempt because an incomplete label (Escape Tunnel) would
  otherwise drop a land pick.
- A good card offered for the wrong role leaves Consider entirely (Runaway Boulder, Zuko's Exile).
- Labels are one model run (precision about 0.92, recall about 0.86). The filter is browse-only and
  switch-gated.
