# Deck tuning suggestions from play results — design

**Date:** 2026-09-07
**Branch:** `design/deck-tuning-spec`
**Serves:** #10 (consumes the game log from #9; extends the deck page from #8)
**Status:** spec — approved in conversation 2026-09-07, pending Design handoff and implementation plan

---

## 1. Why this exists

#9 gave a deck a memory. It can now say *cards in hand hurt in 7 of 9 games* and stop, because naming the
gap was the whole of its job. What it cannot do is the thing the player actually wants, which is to know
what to change. A finding without a next move is a diagnosis with no prescription: correct, repeatable, and
not much use on a Friday night.

#10 closes that loop. It takes the game log's finding, the deck as it currently stands, and what the player
says the deck is trying to do, and it proposes specific cuts and adds with reasoning the player can argue
with. The motivating case is unchanged from #9 — the Gisa Zombies deck wins by going wide and loses by
emptying its hand around turn eight — but the output is different in kind. #9 says *this keeps happening*.
#10 says *cut this, add that, because of this*.

This is the first feature in the repo that calls a language model, and that is a deliberate choice rather
than a reach for a fashionable tool. The existing recommendation engine is deterministic and good at what
it does, which is scoring cards against a commander's colour identity and role gaps. It has no way to reason
about *why* a deck lost, because that reasoning depends on the interaction between a specific board state,
a specific plan, and prose a player typed at 11pm. The spec for the app reserved exactly this tier for an
LLM, and this is that tier.

### The constraint that shapes everything

An LLM will confidently name a card that does not exist, and it will confidently suggest a card that is
perfect for a deck other than yours. Both failures are fatal to trust in slightly different ways: the first
is obviously broken, the second is subtly wrong and much worse, because it costs the player a game to find
out.

Everything below is therefore built around a single principle: **the model's judgement is welcome, its
facts are not trusted.** It proposes; deterministic code verifies every claim it can verify — that the card
exists, that the cut is really in the deck, that the add is legal in the commander's identity, that the
suggestion cites evidence that exists — and drops anything that fails. What survives is grounded by
construction, not by hope.

The second constraint is money. Every generation is a paid call, so the feature must not spend without being
asked and must never spend twice for the same question. That produces the fingerprint gate in §5, which is
also, conveniently, the fastest possible response: when nothing has changed there is no call at all.

---

## 2. Scope

**In scope:**

- Two new free-text inputs: a per-game **note** on `deck_games`, and a standing **intent** on `decks`.
- Two new tables: a suggestion **run** and its **items**, plus the migration.
- An evidence-pack builder: a pure function turning a deck, its games, and its intent into the model's input.
- A generation server action, a validation layer, and the persistence of runs and items.
- Accept and dismiss actions on an individual suggestion. Accepting is what applies the change to the
  deck, so the verdict and the edit are one action throughout this document — `accepted` never means
  "approved but not yet applied".
- A **Tuning** surface on the deck page, plus changes to the #9 log form and history row.
- An evaluation harness (`pnpm check:tuning`) over fixture cases. It calls the live API and is run
  deliberately, never in CI on every commit — see §9.

**Out of scope:**

- **Deck versioning.** Raised while scoping this and filed as #389. The intent field is deliberately mutable
  and unversioned here; §3 notes the one thing that keeps versioning addable later.
- **Streaming responses.** Card names must clear validation before they are shown, so streaming rationale
  for cards that may be dropped shows the player work that is about to be thrown away. §7 covers what is
  done instead for perceived speed.
- **A job queue, a scheduler, or any background-work primitive.** §6 achieves durability without one, and
  introducing infrastructure for a handful of users would be building for a load that does not exist.
- **Cross-deck suggestions** ("your collection would support a better deck than this one"). That is #215's
  territory and a different question.
- **Automatic application of suggestions.** Every change to a deck is a decision the player makes.

---

## 3. The two new inputs

### Per-game notes

#9 ruled that strength and weakness capture is a fixed vocabulary, because free text can never be counted
across games. That ruling stands and is not being relaxed. What changes is that a second kind of note now
has a consumer.

The eight axes are the **countable** layer: they produce *cards in hand, 7 of 9*, and everything the panel
renders is built from them. A free-text note is the **nuance** layer: *"held removal a turn too long and
Atraxa resolved"* is not a category, will never be a category, and is exactly the sort of detail that changes
what a good suggestion looks like. It is read only by the model, never aggregated, never counted, and never
rendered as a statistic.

The field is optional. A log that demands prose is a log abandoned by game four, which was #9's other pole
and is still true.

### Deck intent

A short free-text statement of what the deck is trying to do — how it means to win, roughly how fast, any
house rules or power-level target. Without it, the model infers the plan from the decklist, and it will
sometimes infer a plan the player does not have and suggest a combo finish for a deck meant to win by
combat.

Where it comes from matters. When The 99 built the deck, the app already knows the plan — it recommended
the commander and filled the list against role gaps — so it seeds the intent with a plain statement of what
it built and why. The player edits or replaces it. For a deck the player brought themselves, the field
starts empty and the surface asks for it.

**The one forward-compatibility rule:** intent is a mutable field on the deck, and nothing in #10 may treat
its current value as a historical record. When #389 introduces versions, intent becomes versioned; anything
that assumed the field was append-only would have to be unpicked.

---

## 4. Data model

> **Amended 2026-09-23.** A third table joins these: **`model_calls`**, the per-player allowance ledger
> shared with the deck synopsis — one row per model run (`user_id`, `feature` in `tuning | synopsis`,
> `status` in `reserved | spent | refunded`, `created_at`), counted over a rolling 24 hours. Only a
> `spent` or in-flight `reserved` row counts; a failed or stopped run is `refunded` (Hugh, 2026-09-23).
> Rows are kept, like runs. `deck_suggestion_runs` gains `model_call_id` and `profile_version`, and
> `deck_suggestion_items` gains `bracket_after` and `undo_snapshot`. The implementation plan
> (`docs/superpowers/plans/2026-09-07-deck-tuning-suggestions.md` and its per-PR files) is
> authoritative for exact columns.

Two columns and two tables. Column and table names are indicative; the implementation plan settles exact
naming against Drizzle conventions already in `src/db/schema.ts`.

**`deck_games.notes`** — nullable text. Optional per-game prose, capped at a length that fits a phone
keyboard session rather than an essay.

**`decks.intent`** — nullable text. The standing statement from §3.

**`deck_suggestion_runs`** — one row per generation attempt:

- `deck_id`, `user_id`, `created_at`
- `input_fingerprint` — the hash from §5
- `model` and `prompt_version` — recorded so an evaluation can compare a change against what preceded it
- `status` — `pending`, `ok`, or `failed`
- `error_class` — populated on failure; see §6
- `dropped_count` — how many proposed cards did not survive validation, kept because a rising number is the
  first sign a prompt change has gone wrong

Runs are **kept, not replaced**. History is nearly free at this volume and it is what #389 will want.

**`deck_suggestion_items`** — one row per proposed change:

- `run_id` — a foreign key to `deck_suggestion_runs`, cascading on delete
- `add_oracle_id` — a real catalog card, enforced by foreign key
- `cut_oracle_id` — nullable, because a suggestion may be a pure addition
- `rationale` — the model's argument, as prose
- `evidence` — the specific axis tallies and game notes the suggestion cited
- `position` — the model's own ordering, preserved
- `verdict` — `pending`, `accepted`, or `dismissed`, with a timestamp

Two constraints do real work. A **partial unique index on `deck_id` where `status = 'pending'`** makes a
second concurrent generation for the same deck impossible, which is what stops a double-click or a second
tab from spending twice. And `add_oracle_id` being a foreign key to the catalog means a hallucinated card
cannot reach the database even if every check above it were removed.

---

## 5. When a generation is allowed

Generation is **manual**. There is a button; nothing spends money without it being pressed.

Pressing it is refused when nothing material has changed. The gate is a fingerprint: a hash over the
decklist (oracle ids and quantities), the set of logged games, their notes, the deck intent, and the
`prompt_version`. If that hash matches the last **successful** run, there is nothing new to say and the
button is disabled with the reason shown.

Three consequences worth stating outright:

- **A failed run does not consume the gate.** A failure is not an answer, and a player who hit a timeout must
  be able to try again immediately.
- **Including `prompt_version` in the hash is deliberate.** Improving the prompt is a material change, so it
  legitimately unlocks a regeneration on every deck. Leaving it out would freeze every deck on advice from
  the worst prompt the feature ever shipped.
- ~~**Generation requires `PATTERN_MIN` games.**~~ **Removed (2026-09-20 foundation ruling).** The Deck
  Profile is sufficient input on its own, so a deck built tonight gets an answer tonight. Games enrich the
  evidence when they exist and the panel says which it had; they never gate it.

~~A per-user ceiling of a small number of generations per hour, counted from the runs table.~~ **Replaced
2026-09-23 (Hugh):** one per-player DAILY allowance, shared with the deck synopsis through one model client,
so there is one counter and one number. Spending it is a stated state that says when it reopens, not a
silent refusal. The number is set once a call's cost is measured. See the plan's *Cost* section.

> **Amended 2026-09-23.** The fingerprint's decklist half is now the Deck Profile's own fingerprint
> (`src/lib/profile/fingerprint.ts`), so "the deck changed" has one definition; the tuning fingerprint
> adds the games, notes, intent and `prompt_version`.

---

## 6. Generation, durably

The naive shape — call the model inside a server action, write the result when it returns — loses the result
whenever the player navigates away, having already paid for it. The fix does not need a queue.

**The run row is written before the call.** A `pending` row is committed in its own transaction, so the
generation exists as a fact the moment it starts. The call then happens and the row is updated to `ok` with
its items or `failed` with a class. Because the record is durable from the first moment, leaving the page
and coming back shows a run in progress and then its result. Nothing depends on the client staying put.

**Interrupted runs are reaped on read.** If the function dies mid-call, its row would sit `pending`
forever and the partial unique index would block the deck from ever generating again. So a pending run older
than a few minutes is treated as interrupted, and the read path writes it to `failed` with the
`interrupted` class rather than merely displaying it that way. The distinction matters: the index keys on
the stored `status`, so a row that is only *read* as dead still blocks the deck.

**Both sides of that race are conditional, and that is what makes it safe.** The reaper writes:

```sql
update deck_suggestion_runs set status = 'failed', error_class = 'interrupted'
where status = 'pending' and created_at < :cutoff
```

The generation path writes its own outcome under the same `where status = 'pending'` guard, and treats zero
rows affected as "I was reaped" — it discards its result rather than resurrecting a run the deck has moved
past.
Without the second half the reaper could clobber a run that had just succeeded, which would be worse than
the deadlock it was added to prevent: the player paid for an answer and watched it turn into an error.
Exactly one of the two writes lands. This is a rule in the read path, not a scheduled job: no cron,
no queue, nothing new to operate. The cost is that a deck nobody looks at keeps its dead row until someone
does, which is exactly when it matters and not before.

**Timeouts are budgeted so a failure is always recorded.** The API call carries a hard timeout comfortably
shorter than the serverless function's own limit, leaving room to write the failure row. Being killed
mid-flight is the only case that produces an orphan, which is exactly why the read-time rule exists.

**Errors carry classes, because they are not the same situation:**

| Class | What happened | Behaviour |
|---|---|---|
| `upstream_busy` | Rate limited or overloaded | One bounded automatic retry inside the same run |
| `timeout` | The call exceeded its budget | Recorded; the player may retry |
| `malformed` | The response did not satisfy the schema | One bounded automatic retry, then recorded |
| `ungrounded` | Too little survived validation to be worth showing | Recorded; a prompt problem, not a user problem |
| `interrupted` | The function died mid-call and never wrote its own outcome | Written by the reaper above, not by the run itself; the player may retry |

The panel says which of these happened. "Something went wrong" is the message that makes a player stop
trusting a feature.

---

## 7. The pipeline

1. **Authorise** — the established pattern: `requireUserId()`, then ownership of the deck.
2. **Build the evidence pack** — a *pure* function over the Deck Profile (amended 2026-09-23: the profile
   holds the counts, roles, targets and staples this step used to gather for itself), the play-data group
   built from its games and notes, and its intent. It touches no network and no database, so the hardest
   part of the feature is unit-testable without an API key.
3. **Check the fingerprint** — §5. Refuse without spending.
4. **Write the pending run** — §6.
5. **Call the model** — one call, a schema-constrained response.
6. **Validate** — §8.
7. **Persist** — run and items in one transaction; revalidate the deck surfaces.

The evidence pack contains the decklist grouped by role, the game summary with its denominators intact, the
per-game notes, the deck intent, the role gaps, and the commander's EDHREC staples that are *not* already in
the deck. That last item is context, not a menu: the model may suggest anything legal, and the staples are
there so it knows what the deck has already declined.

**Model:** the current Sonnet (`claude-sonnet-5` at the 2026-09-23 revision), recorded per run, called through
the shared model client the synopsis also uses. The evaluation harness in §9 is what should decide
whether a larger model earns its cost, rather than an assumption in either direction.

---

## 8. Validation — what the model is not trusted about

Every proposed suggestion passes all of these or it is dropped:

1. **Schema.** The response satisfies a declared shape, parsed with zod. Anything else is `malformed`.
2. **The card exists.** The model answers in card names; every name is resolved against `cards.name` in the
   catalog to the oracle id that gets persisted. Names that do not resolve are dropped and counted.
3. **The cut is real.** A proposed cut must be a card currently in the deck.
4. **The add is legal.** Colour identity must fit the commander. This is deterministic and the model gets no
   say in it.
5. **The evidence exists.** Every suggestion cites the axis tallies or notes it responds to, and those
   citations are checked against the actual game log. **A suggestion citing nothing is dropped, not shown** —
   an ungrounded suggestion is indistinguishable from a guess, and the whole feature is the claim that these
   are not guesses.

If too little survives, the run fails as `ungrounded` rather than rendering a thin, strange-looking list.
Showing one surviving suggestion out of six proposed misrepresents how well the feature is working.

**Presentation rules inherited from #9, and they are not negotiable here either:** no percentage and no net
figure reaches the screen, and every count carries its denominator. A rationale that argues from *cards in
hand, 7 of 9* is making a checkable claim. One that argues from *78%* is making a claim about confidence
that nine games cannot support.

---

## 9. The harness

Two layers, because they answer different questions.

**Deterministic validators are unit-tested with no API at all.** Fingerprint stability, evidence-pack
assembly, catalog resolution, colour-identity checks, the citation check, and the interrupted-run reaper
are all pure logic and are tested as such. This is the majority of the code and none of it needs a key.

**Advice quality is tested by `pnpm check:tuning`.** Fixture cases — a deck, a game log with notes, an
intent, and assertions about what a good answer must and must not contain — run against the live API, gated
behind a repository variable, following the pattern the price refresh and contract checks already use. The
assertions are the kind a reviewer can argue about: *must cite the failing axis*, *must not leave the
commander's colour identity*, *must propose a cut that exists*, *must name at least one card from this set of
acceptable answers*.

This exists because prompt quality degrades silently. A change that makes advice slightly worse produces no
error, no failing type, and no red test — it just produces worse advice, indefinitely, until a person
notices. The eval is the thing that notices.

`prompt_version` is a single integer in one module. Changing the prompt bumps it, which invalidates every
fingerprint, which is correct.

---

## 10. Surfaces for Design

Five, of which one is a change to something already shipped.

1. **The game log form** (changed, from #9) — gains an optional note field. The form's speed is the reason
   #9 works, so this must not turn a fifteen-second log into a paragraph the player owes.
2. **The game history row** (changed, from #9) — shows a note when one exists.
3. **Deck intent** — needs a home, an empty state that asks for it, an editable state, and a distinct
   seeded state for when the app wrote the first draft because the app built the deck.
4. **The tuning panel** — states for: ~~below the threshold~~ (retired with the game gate, 2026-09-20), ready to generate (including with no games logged), the shared allowance spent, generating, results,
   nothing-has-changed (button disabled, with the reason), and each failure class from §6.
5. **The suggestion card** — the cut and add pair, an ownership label, a price when the card is not owned
   (the ManaPool data already ships), the rationale, the evidence it cites, and the accepted and dismissed
   states.

Mobile and desktop parity throughout, per the repo's standing rule.

---

## 11. Testing

- Pure unit tests for the evidence pack, the fingerprint, all five validation rules, and the interrupted-run
  reaper's cutoff.
- The durability contract is proved against a real Postgres by `pnpm probe:tuning-run` (amended
  2026-09-23; a stubbed action test proves only the SQL text, not what a transaction wrote): a pending row
  exists before the call, a second concurrent generation is refused, a failed run leaves the gate open, a
  successful one closes it, and a stale pending row is written to `interrupted` on read rather than merely
  displayed that way. The same probe covers the allowance race for a player's last unit and the refund on
  every failure path.
- Both halves of the reaper race, in that probe: a reaped run's late success is discarded rather than
  written, and a run that finishes first is not overwritten by a reaper firing behind it.
- Component tests for every state in §10, including each failure class.
- `pnpm check:tuning` for advice quality, run deliberately rather than on every commit.

---

## 12. What this deliberately does not do

- It does not apply anything automatically.
- It does not learn from accepted and dismissed verdicts. Recording them is enough for now; feeding them
  back into future generations is a real feature with its own design, and guessing at it here would ship a
  half-version of it.
- It does not suggest a different commander. That is #215.
- It does not track how the deck changed over time. That is #389.
