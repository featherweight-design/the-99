# Runbook — turning informed building on in production

**Feature:** sub-project 2 of the deck-analysis suite ("informed building").
**Shipped:** #787, #794, #796, #798, #804 — all on `main` as of 2026-09-21.
**Status in production:** the code is deployed and **dark in two separate ways**. They are
independent and either can be done without the other.

---

## What "dark" means here, precisely

Two switches, and confusing them is the thing this runbook exists to prevent.

| Switch | Controls | Where it lives |
|---|---|---|
| **Role averages in the database** | whether the fill and the strip use **measured** role targets or an asserted 10/10/8/3 | `commander_support.avg_ramp` etc., written by the `Commander index` workflow |

**"Measured" is not the same as "this commander's row."** `loadSkeletonForCommanders` resolves a
four-rung basis chain and takes the first hit: the **pair**, then the **commander**, then the
**identity bucket**, then the **count bucket** — and only then the flat baseline. A deck can be
measured against 200 decks of its exact pair, or against every three-colour commander, and the
profile reports which through `roleTargets.of`. The index fills the first two rungs;
`db:build:staples` (a step in the same leg) fills the other two. Read the operator's question as
*"is this deck compared to real decklists at all"*, never *"does this commander have a row"*.
| **`ANALYSIS_TAB_ENABLED`** | whether the Analysis tab exists, and whether the Recommended mix strip lives in it or in the deck header | a Vercel environment variable on the `the-99` project |

**Neither gates the other.** The fill, the Add panel ordering and the bulk control all work with
the flag off; the tab can be switched on before the index has ever run, and the strip will draw
its asserted figures inside it.

---

## Current production state (fill in before starting)

Run this against the production branch (`br-noisy-violet-a6vw4ess`) and record the answers — it
is the before-shot the verification step compares to:

```sql
select
  count(*)                                        as commanders,
  count(*) filter (where avg_ramp is not null)    as with_roles,
  count(*) filter (where avg_land is not null)    as with_types,
  max(computed_at)::date                          as index_date
from commander_support;
```

As of 2026-09-21, **staging** read `3380 / 0 / 3380 / 2026-09-20` — every type average, no role
averages. Production is expected to look the same. `with_roles = 0` is the dark state.

---

## Step 1 — run the Commander index against production

```
gh workflow run "Commander index" --ref main -f target=production
```

- **~3,000 rate-limited EDHREC requests.** Expect it to take a while; the workflow holds a
  single concurrency group so it cannot overlap another run or the staging leg.
- `COMMANDER_INDEX_ENABLED` is only needed for the SCHEDULED run. A manual dispatch fires
  regardless, and indexes **only** the environment it names.
- It also runs `db:build:staples` as a step in the same leg, which writes `format_staples` and
  `identity_composition`. That is deliberate — the floors are derived from the index that leg
  just wrote.
- If it aborts part-way, re-dispatch with `resume_since` set to the aborted run's start time
  rather than restarting; commanders recomputed at or after it are skipped.

**AGENTS.md's ordering.** The full sequence is catalog → combos → index, because the index
resolves against `cards` and a variant naming a card the catalog lacks is dropped. The weekly
catalog and combo refreshes already run on their own schedules (Mondays, 09:00 and 13:00 UTC),
so the index only needs them dispatched first if the catalog is known to be stale.

### Verify

Re-run the query above. `with_roles` should be close to `commanders` — on staging the
derivation reached 3,279 of 3,280. Then check a specific commander has plausible figures:

```sql
select c.name, cs.avg_ramp, cs.avg_draw, cs.avg_removal, cs.avg_wipes, cs.deck_count
from commander_support cs join cards c on c.oracle_id = cs.commander_oracle_id
where c.name = 'Kinnan, Bonder Prodigy';
```

**What a reader sees change:** the Recommended mix strip's gloss goes from
`A common starting point` to `EDHREC averages`, and the four role cells stop reading
10 / 10 / 8 / 3 on every deck — each deck now draws whichever rung of the chain served it. No redeploy is needed — the figures are read per request, and
the cached payloads carry the index generation in their key, so they retire themselves within
the hour ceiling at worst.

---

## Step 2 — enable the Analysis tab

```
# Set on the `the-99` Vercel project, Production scope:
ANALYSIS_TAB_ENABLED=true
```

**THEN REDEPLOY.** Vercel binds environment variables to a deployment, so setting this and
reloading shows no tab — with the code, the read and its own comment all apparently correct.
`analysis-flag.ts` says so in its own header; it is the mistake the file was commented against.

To deploy the current `main` rather than rebuilding the old commit (the dashboard "Redeploy"
button rebuilds the *same* commit):

```
POST https://api.vercel.com/v13/deployments?teamId=team_tBEQct4aCLPw5a8jbqRJbuPZ
{"name":"the-99","project":"the-99","target":"production",
 "gitSource":{"type":"github","repoId":1305223398,"ref":"main","sha":"<sha>"}}
```

Verify with `meta.githubCommitSha` on the returned deployment.

### What this switch moves

**One flag, two whole layouts.** The Recommended mix strip *leaves the deck header* and lives
in the Analysis tab — that move is what pays for the tab's vertical space. With the flag off the
strip stays in the header. So this is not "a tab appears"; it is a relayout of the deck page, and
it wants a look at both widths after the redeploy.

---

## Rollback

- **The tab:** unset `ANALYSIS_TAB_ENABLED` (or set it to anything but `true`) and redeploy. It
  defaults OFF, so absent is safe.
- **The role averages:** there is no un-write. A re-run of the index recomputes them. The app
  degrades safely in the other direction — a deck whose chain reaches nothing on any of its four
  rungs falls back to the asserted baseline and says so — so a partial index is not a broken state, only a mixed one.

---

## Known follow-ups, not blockers

- **The seed still ranks by synergy.** `last-slots-strip.tsx` pre-ticks the top N of the
  sleeveable pool on first open. #798 fixed the bulk *button*; Task 21 scoped only the button,
  so the seed was left alone and flagged in the code. It is the more visible half — the seed is
  the state a player is shown, the button is one they have to press.
- **The commander question has three answers.** `profile/types.ts` holds the ruling: against a
  MEASURED target the commander is out (EDHREC support lists never contain it), everywhere else
  `counts` folds it in. #798 obeys that. The Add panel's strip and shelves exclude commanders
  from everything, and `probe:bracket` counts them against every limit. Worth one ruling across
  all three rather than three readings.
