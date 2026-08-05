# Epic Run Briefing — Deck import (Moxfield) · #42

Feature-specific facts for the epic-run of #42. Run mechanics live in the `epic-run` skill and
are not restated here. CLAUDE.md / AGENTS.md conventions apply in full.

## Source of truth (read in this order)

1. `docs/superpowers/plans/2026-08-04-deck-import-plan.md` — master sequencing: nine PRs, their
   tasks, and which gate fires where. Follow its order exactly.
2. `docs/superpowers/specs/2026-08-02-deck-import-design.md` — the merged design brief (#42),
   including the per-deck printing override that was **split back out** into #151 and is *not* in
   scope here.
3. `design/design_handoff_the99_deck_import/` — visual ground truth. Nineteen states at both
   breakpoints. `README.md` is the engineering entry point; `deck-import · copy strings.ts` is the
   verbatim copy source; `READINESS.md` carries the 🟢 Green verdict and the rulings.
4. `design/design_handoff_the99_add_panel/` — #42's states 13–19 sit inside the shell this handoff
   rewrote. Read it for the coverage strip and tab pair the unresolved banner sits above.
5. `docs/superpowers/design-tables/decks.md` — the existing property table for the builder.

## Current state (verified 2026-08-05)

- **#158 (Add panel overhaul) is fully merged and closed out.** All six PRs landed: #169, #170,
  #171, #173, #175, #180, with the close-out doc PR at #186. **This retires #42's only build-order
  dependency** — see "Build order" below.
- **`src/components/decks/quick-add-bar.tsx` exists**, verified by `ls`. PR 8's row-scoped combobox
  has something to take its construct from. The plan's PR 7/8 headings carried a "blocked on #158
  PR 6" note; it was removed in the same PR as this briefing.
- **No new environment variables, no new external accounts, no new services.** Moxfield fetch is an
  unauthenticated HTTP GET from a server action; there is no API key to place, no cron, no worker,
  no queue, no bucket. If PR 3's spike discovers an auth requirement, that is a hard pause point —
  see below.
- **`docs/superpowers/plans/2026-08-04-deck-import-plan.md` is merged** (PR #174) at the full
  Copilot bar, as is the design handoff.
- **Deliberately does not exist yet:** the `deck_unresolved_rows` table (PR 1), the
  `/decks/import` route (PR 4), and any `total` field on `deckCounts` (PR 6). `deckCounts`
  (`src/lib/decks/grouping.ts:41-49`) today returns exactly `{ built, ownedCount, toBuyCount }`.
- **Known anomaly to ignore:** `pnpm lint` reports ~128 pre-existing warnings on a clean `main`.
  Zero *errors* is the bar; do not spend the run driving the warning count down.

### Build order — the dependency is retired

The plan's §"Build order" previously made PRs 7–9 wait on #158's PR 6. **That condition is satisfied
as of 2026-08-05**, and the plan has been updated to match. All nine PRs may run in sequence with no
external wait. The merge-conflict watch on `src/components/decks/builder-shell.tsx` is likewise
moot — #158 went first, as planned, so PR 7 here simply builds on the current shell.

## Risk shape — **copy/IA-driven, with a content/data-driven first half**

Two halves with genuinely different failure modes, and the gates should be scoped accordingly.

**PRs 1–3 are content/data-driven.** The bugs will come from decklist text that does not look like
the happy-path sample: a Moxfield export with set codes and collector numbers, a line that is
`1x Lightning Bolt` rather than `1 Lightning Bolt`, a sideboard/maybeboard header, a double-faced
card named by only its front face, a commander declared by a `*CMDR*` annotation. The parser
already exists and is not being rewritten, so the risk is in the *matching* and in the four locked
edge cases, not in tokenisation.

**PRs 4–9 are copy/IA-driven.** Nineteen states is the tell. Seven of them are failures, and the
handoff's own decisions are about which container they share, how many times `Retry` may appear,
and whether two waiting states are one spinner. The bugs will be strings that say what the
surrounding UI already says, a failure with no way back, and — the highest-risk single item — the
unresolved row, which is a record the existing builder has no vocabulary for. It is outside both
counts, has no `oracleId`, and cannot be bought, so every surface that assumes "a deck card has an
oracle ID and is either owned or to-buy" is a candidate defect site.

**Gate 6 does not fire.** Nothing in this epic creates records in response to someone else's
action; every row is written by the importing user in their own request.

## Launch gating — unlinked until PR 6, then reachable

**Ruled by Hugh, 2026-08-05.** No flag, no env var, no runbook step.

`/decks/import` ships in **PR 4** but **nothing links to it**. It is reachable only by typing the
URL. The `Import a deck` entry point on `/decks` lands in **PR 6** — the PR that completes the
minimum coherent flow (route + commander picker + a builder that can render an unresolved row).

The gate is the absence of a link. This was chosen over the #158 precedent ("reachable on merge")
because #158 reshaped a surface that was already live, whereas #42 adds a new route: between PR 4
and PR 6 the flow would otherwise accept a decklist and then have no commander picker and no home
for unresolved rows. It was chosen over an env-var flag because a flag for a single private-beta
user is a thing to write, thread and later delete, and because a gate you cannot forget to flip
beats one you can.

**PRs 1–5 are therefore safe to merge and deploy in any state of partial completion** — a run that
stops after PR 3 leaves production exactly as it is today, and one that stops after PR 5 leaves an
unlinked route only a URL-typer can find.

**PR 6 is the PR that makes the vertical live.** This repo has no `releases.ts` and no
`progress.md`; user-visible change is recorded in the PR body and in
`docs/superpowers/design-pipeline-status.md`, so nothing is held back.

## Off-happy-path homes

**Ruled by Hugh, 2026-08-05** on the one open question (row 3).

| New state | Where it lives in the IA | How the user reaches it | Reversible? |
|---|---|---|---|
| A deck imported cleanly, all lines matched | `/decks` grid, then the builder — indistinguishable from a hand-built deck, by design | Normal navigation | n/a |
| A deck imported with unresolved rows | `/decks` grid, **with an unresolved-row count badge on its `DeckCard`** (below the counts line), plus the pinned `Couldn't identify` group and the warning banner inside the builder | The badge is the signal from outside the builder; `Take a look →` in the banner jumps to the group | Yes — resolving or deleting every row clears the badge, the banner and the group together |
| An unresolved row itself | The pinned-last `Couldn't identify` group in the decklist. Outside `built`, `ownedCount` and `toBuyCount`; inside the new `total`. **Hidden entirely by the Shopping filter** | Scroll, or the banner's jump link | Yes — resolve to a real card, or delete the row |
| Import abandoned mid-flow at the commander picker (PR 5) | **Nowhere — and deliberately so.** No deck row is written until a commander is chosen, because `decks.commanderOracleId` is `notNull` (`schema.ts:129`). The user is on `/decks/import` with nothing persisted | Back to `/decks`, or re-paste | n/a — nothing to reverse |
| Import of a list with no legendary creature (state 12) | A dead end on `/decks/import`, which must **read** as one. No deck is created | The way back is to `/decks`; the copy says plainly why this list cannot become a Commander deck | n/a — nothing created |
| A 99-card deck arrived at by import rather than by building | `/decks` as `Complete`, **but the completion reveal is suppressed** on the import arrival. It fires the first time the player adds a card themselves | Normal navigation | The suppression is one-shot per deck |
| A deck whose only content is unresolved rows | `/decks` as `Draft` (`built: 0`), with a non-zero `total` and the badge | Normal navigation | Yes |

The badge is additive: `statusPill`'s vocabulary is unchanged and no new pill value is introduced.
That was chosen because `Complete`/`shouldCelebrate` is already delicate and threading a new status
through both the server list and `useOptimisticDeckCards` multiplies the surfaces that can
disagree mid-mutation — the exact hazard `deckCounts`'s own comment warns about.

**The badge is a PR 6 deliverable** (`src/components/decks/deck-card.tsx`), landing in the same PR
as `total` and `unresolvedCount`, so no PR ships a deck that is short with no outside signal.

## User journeys — walk script

Three journeys. Each is walked forward, reverse, repeat and resume for Gate 5, which fires at PR 7.
All three can be exercised on local dev **except** the Moxfield fetch (journey A), which needs real
outbound HTTP — see the note under A.

### Journey A — Import from a Moxfield URL, clean list

**Entry:** `/decks` → `Import a deck` (from PR 6; before that, type `/decks/import`).

1. Land on `/decks/import`. **Expect:** mode chip row with **link selected first**, its input
   focused, three modes offered, no failure block visible.
2. Paste a public Moxfield deck URL, submit. **Expect:** state 2 — the third-party round-trip
   waiting treatment, visibly distinct from state 3's local-parse treatment.
3. Fetch and parse complete, source declares a commander. **Expect:** the commander picker is
   **skipped entirely** — no confirmation step for a fact we already have.
4. Deck created, redirect to `/decks/[id]`. **Expect:** the arrival strip (state 13) below the
   spine, `✓` in `--success`, dismiss ✕ present. No unresolved banner. Counts: `built` = `total`.
5. If the list was exactly 99 and fully owned. **Expect:** status `Complete` and **no completion
   reveal** — it is suppressed on import arrival.
6. Add any card by hand. **Expect:** the completion reveal fires now, once.

**Reverse:** delete the deck from `/decks`. Expect it gone from the grid, and no orphaned
`deck_unresolved_rows` (cascade).
**Repeat:** import the same URL again → a second, separate deck. Expect the arrival strip present
again (dismissal was keyed to the old deck ID, which died with it) and the completion reveal
suppressed again.
**Resume:** reload during step 2; reload on `/decks/[id]` after step 4 — the arrival strip is
**gone on the next visit either way**, dismissed or not.

> **Cannot be fully walked on local dev if outbound fetch to Moxfield is blocked or the endpoint
> shape differs from PR 3's spike.** Walk it on the Vercel preview deploy instead and say so in the
> Gate 5 artifact. Do not mark journey A green off a mocked fetch alone.

### Journey B — Import from paste, with unresolved rows

**Entry:** `/decks/import`, paste mode.

1. Select the paste chip. **Expect:** the paste box (`UploadEntry`'s verbatim), **no preview or
   review gate** — this flow does not have one.
2. Paste a ~99-line list containing 3 deliberate typos and 1 real legendary creature. Submit.
   **Expect:** state 3 — the local-parse waiting treatment.
3. **Expect:** deck created, redirect to the builder.
4. **Expect:** the unresolved banner (state 14) **above the coverage strip and tab pair**, naming
   the count and carrying the clause *they aren't counted in the mix or in either tab below*.
5. Click `Take a look →`. **Expect:** scroll to the `Couldn't identify` group, pinned **last**,
   count in `--warning`, rows sorted by `sourceLine` and each reading `line N of the import`.
6. Switch the decklist filter to **Shopping**. **Expect:** the group is **hidden entirely**.
7. Switch back. Expand one unresolved row. **Expect:** the row-scoped combobox inline, seeded with
   the failed name, owned-only **off with its caption visible**, identity filter off. On mobile,
   the global quick-add bar is unmounted while a row is expanded.
8. Pick a card. **Expect:** in the same frame — `built` 96→97, the group 3→2, `Your deck` tab, the
   role cell, and Consider's `✓ In deck` all move. One polite live region announces it.
9. Delete a second row. **Expect:** the same set moves; `built` unchanged, `total` down by one.
10. Resolve the last row. **Expect:** banner and badge disappear together at zero; the group
    unmounts.

**Reverse:** use undo after step 8. Expect the row back, counts restored, and the undo affordance
persisting **until the next action on the group** — not a timer.
**Repeat:** collapse and re-expand a row. Expect owned-only **reset to the overridden-off default**
— the override is per row and does not persist across rows or across collapses.
**Resume:** reload after step 8. Expect the resolved card still in the deck and the remaining rows
still unresolved. Reload mid-expansion — expect the expander closed and nothing lost.

### Journey C — Import failures

**Entry:** `/decks/import`. Each step is forced, not waited for.

1. A URL that is not a Moxfield deck URL. **Expect:** the malformed-URL failure, programmatically
   associated with the link field.
2. A Moxfield URL for a private/404 deck, and a mocked 500. **Expect:** distinct copy per case, and
   **`Retry` rendering on state 7 only** — exactly once across all seven failures.
3. A 4.1 MB `.xlsx`. **Expect:** the size/type failure. This is why deck import carries its **own
   2 MB constant** and does not reuse the collection's 5 MB — a 4.1 MB file passes a 5 MB check,
   and the handoff's own illustration of this failure would not fail.
4. A page of prose. **Expect:** state 9 — `noneMatched`. Every line parses; none match. The body
   strings are **functions taking a line count**. Paste is preserved.
5. A genuinely empty file. **Expect:** state 10 — zero rows.
6. A valid list with **no legendary creature**. **Expect:** state 12, a dead end that reads as one,
   and **no deck created**.
7. A valid list with three legendary creatures. **Expect:** the picker lists exactly those three,
   each with its `line N`.

**Reverse / Repeat / Resume:** after every failure, expect the pasted text or selected file still
present, the way out visible, and a resubmit to succeed without a reload. Reload on a failure —
expect a clean entry surface, not a stuck one.

## Hard pause points — stop and ask

1. **PR 3's Moxfield spike discovers an auth requirement, a rate limit, or no usable endpoint.**
   Do not silently fall back to paste-and-file only. "Import existing decks (Moxfield)" is the
   ticket title and the URL mode is the only one with no local equivalent. Escalate with what the
   spike found and the alternative fetch strategies considered.
2. **Any change to `statusPill`'s returned vocabulary.** The plan adds an *input*
   (`unresolvedCount`) and changes one return from `Complete` to `Playable`. Adding a new pill
   value is a product call, and the answer above was explicitly "no new pill value."
3. **Any migration run against a production database by hand.** Migrations apply during the Vercel
   production build; do not pre-apply.
4. **Widening `deck_unresolved_rows` with a foreign key to `cards`, or a unique key on
   `(deckId, rawName)`.** Both are deliberately absent — an unresolved row matches no card by
   definition, and a list can legitimately carry the same unmatched string twice.

## Notify-and-proceed

- **Merging PRs autonomously** once the Copilot bar and CI are green — standing authorization
  (2026-07-10). Verify the deploy workflows actually ran after each merge.
- **The mid-run cold-eyes review at PR 7.** Post the summary and the screenshot path, then **keep
  building**. Do not schedule a wakeup to wait for a reply.
- **Copy that the cold-eyes critic flags as redundant with `/collection`'s upload surface.** Fix it
  in the run rather than filing it; the two flows now describe the same operations and must not
  describe them in two voices. Capture the before/after in the PR body.
- **Filing follow-up issues** for anything genuinely out of scope — especially #151 (per-deck
  printing override), which is explicitly not this epic.

## Done means

1. **All nine PRs merged**, each at the full Copilot bar, with CI green and deploys verified.
2. **PR 6 has shipped the entry point**, so the vertical is live and linked from `/decks`.
3. **Gate artifacts committed, with evidence — commands run and output observed, not
   attestations.** None of the three exist yet; each is created by the run, in the PR named:
   - `docs/superpowers/state-coverage-deck-import.md` — Gate 1, in **two passes** (states 1–10
     before PR 4; states 11–19 after PR 6). Every row ✅; any ⚠️ ❌ 🚫 resolved before the dependent
     UI PR builds.
   - `docs/superpowers/design-tables/deck-import.md` — Gate 4 Agent 1, written **before any code**
     and passed into every build subagent's prompt.
   - `docs/superpowers/journey-lifecycle-deck-import.md` — Gate 5, all four passes for all three
     journeys above, with journey A's walk location named honestly.
   - Gate 2's forced conditions and Gate 3's sweep results recorded in each UI PR's body.
4. **The unresolved row is coherent everywhere it appears:** outside all three existing counts,
   inside `total`, hidden by the Shopping filter, adding no cell to the role strip, badged on the
   deck card, and clearing all its chrome at zero.
5. **The suppression ruling is captured as a named test** in `celebration.test.ts` — that test is
   the whole record of the 2026-08-04 ruling.
6. **The stale build-order text is corrected** in the plan, `READINESS.md` and the pipeline tracker
   (this PR does it), and `docs/superpowers/design-pipeline-status.md` moves #42 to ✅ Shipped at
   the end of the run.
7. **Each substantive PR's body carries its own record** — Gate 2's forced conditions, Gate 3's
   sweep, and the user-visible change. This repo has neither a `releases.ts` nor a `progress.md`;
   epic-run's generic bookkeeping step names both, and neither applies here.
8. **A morning report** in the `feature-run-report` format, including the infrastructure and
   environment-variable section — which, for this epic, is expected to read "none."
