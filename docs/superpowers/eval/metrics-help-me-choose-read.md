# Help me choose read: eval, 2026-10-11

Rework plan PR 2. `pnpm eval:intake-read` ran the read's two steps live on staging, read-only, for the
brief's fixtures on Hugh's account (`user_3GkZrrTwOJBdqUpq6GambP0BC8w`, 21 decks). It spent $1.01 of its
$5 cap, recorded in `ledger-help-me-choose.jsonl`. The answers are in `answers/intake-read-2026-10-11-*.json`.

The figures below were measured with the engine from #1443. The step-2 prompt then moved from asking
for 140 characters to asking for 120 (finding 4), so the refused-reason counts in the low and Sonnet
runs predate that change. The runs also validated without the pick's own name (`nameOf`), a
stricter check than the app's; it refused nothing it would have kept, since no refused reason named
its own commander.

## Cost per press

The shipping configuration is step 1 on claude-haiku-5-5 at medium effort, and step 2 on
claude-sonnet-5-5 at medium effort, streamed.

| press | step 1 | step 2 | press |
|---|---|---|---|
| whole list, cold cache | $0.093 (148,282 tokens written to the cache) | $0.014 to $0.020 | **about $0.11** |
| whole list, warm cache (within 5 minutes) | $0.008 to $0.013 (cache read) | $0.014 to $0.022 | **about $0.03** |
| filter set (pool lines only, uncached) | $0.0015 to $0.0018 | $0.006 to $0.014 | **about $0.007 to $0.016** |
| step 1 on claude-sonnet-5-5, for comparison | $0.372 cold, $0.031 warm | as above | about $0.39 cold, $0.05 warm |

- **Reservation.** The worst case per press is $0.599 (`FEATURE_CALLS.intake.steps`).
- **Time, shipping configuration.** Step 1 took 1.6s to 9.8s, and step 2 took 2.2s to 4.9s. Across
  every arm, step 1 ran 1.5s to 9.8s and step 2 1.4s to 5.9s.
- **Output size.** The longest step-1 reply was 2,138 tokens, against a ceiling of 4,000. The longest
  step-2 reply was 682 tokens, against a ceiling of 12,000.

## Why step 1 runs at medium

| fixture | pool | Haiku low: shortlist / picks | Haiku medium: shortlist / picks | Sonnet low: shortlist / picks |
|---|---|---|---|---|
| Ask A, horrors | 3,445 | 22 / 3 | 17 / 7 | 37 / 9 |
| Ask B, Landfall unlike my decks | 3,445 | 39 / 2 | 37 / 10 | 39 / 10 |
| Ask A, exactly black | 329 | **0 / 0** | 16 / 10 | not run |
| decks hidden, Landfall | 3,445 | **5 / 0** | 39 / 10 | 38 / 9 |
| card: Doubling Season | 3,445 | 29 / 10 | 30 / 10 | 30 / 9 |
| nothing fits: mono-blue Dinosaurs | 308 | 0 / 0 | 3 / 2 | not run |

- **At low effort, Haiku failed twice.** It returned no keys inside the mono-black pool. For the
  no-decks ask it shortlisted 5 commanders, and the judgement found nothing among them.
- **At medium, every fixture produced a shortlist the judgement could use** (16 to 39 commanders,
  7 to 10 picks), for about $0.004 more per warm press than at low.
- **It does not reach the same shortlist as Sonnet**, and this table is what the choice rests on.
  How far Haiku at medium and Sonnet at low agree:

  | fixture | shortlists (Haiku / Sonnet) | shared | Jaccard | picks shared |
  |---|---|---|---|---|
  | Ask A, horrors | 17 / 37 | 2 | 0.04 | 2 of 7 and 9 |
  | Ask B, Landfall unlike my decks | 37 / 39 | 25 | 0.49 | 4 of 10 |
  | decks hidden, Landfall | 39 / 38 | 24 | 0.45 | 5 of 10 and 9 |
  | card: Doubling Season | 30 / 30 | 30 | 1.00 | 6 of 10 and 9 |

  The card fixture agrees completely because both models shortlisted exactly the 30 commanders the
  request names as running the card. On a theme (Landfall) they share about half. On a tone (scary
  and a little nasty) they barely overlap: Sonnet leaned on the Horror creature type, and Haiku on
  what the cards do (shrinking boards, forced sacrifice, discard). Both sets of picks read as fitting
  the ask, but agreement is not a measure of which is better, and no gold list exists to score
  either. **The choice of Haiku rests on cost and on its picks reading as fitting, not on matching
  Sonnet**, and the overlap above is the evidence a reader should weigh against it.

## The READINESS assertions

| assertion | result |
|---|---|
| Ask A's reasons name no deck | holds in every arm |
| Ask B names only Omnath or Teval, by commander | holds: every deck token was Omnath's, and the app drew the name from its id |
| Exactly black: no non-black commander anywhere | holds: the pool is the free search's, and step 1 saw only black lines |
| No reason holds a digit or `%` | holds: the validator refuses them. The one digit seen, `+1/+1`, was rules text, and that reason was refused |
| A card named in the box reaches the read as a build-around ask | holds: every Doubling Season pick builds around token or counter doubling. Three modify the creation itself (Adrix and Nev, Vorinclex, Pir); the rest pay it off (Quina, Zaxara, Rhys, Ghave and others) |
| Nothing fits | **partial**. The app has no colorless filter, so the fixture was mono-blue Dinosaurs. It picked Nezahal, Primal Tide, the one blue Dinosaur, which is right. It also picked Thryx, the Sudden Storm, which is not a Dinosaur |

## Findings taken into the build

1. **Haiku at medium for step 1** (`READ_SHORTLIST_EFFORT`), for the reasons above.
2. **A filtered press is sent uncached.** Its prefix belongs to one player, so a cache write would only
   add the 1.25x premium.
3. **The reply shapes carry no length bounds.** The API does not enforce them, and one long reason
   would otherwise fail the whole reply.
4. **The prompt asks for at most 120 characters, and the validator stays at 140.** When asked for 140,
   replies ran 141 to 160 characters and were refused.

## The no-decks fixture

It is Hugh's account with his decks hidden from the read (`inputs.decks = []`), not an account with
no decks: his pool still excludes the commanders he has built, and the ownership figures are still
his. It measures what the reason lines say when there are no decks to compare against, which is
the state the panel's no-decks line describes; it does not measure a new player's pool.

## No gold list

No list of "the right commanders" exists for a tone, so recall is not scored. What is reported is the
READINESS assertions above, and the picks themselves, quoted whole in the answers files, for a person
to read.

## Prompt version 2: a named type or mechanic is a requirement (2026-10-11)

Hugh ruled that a creature type, keyword or mechanic the player names (`horrors`, `Landfall`, `Elves`,
`proliferate`) is a requirement for the shortlist, not a mood. Both steps now say so, and step 2
keeps no pick that lacks it. When only a few commanders qualify, it returns only those rather than
filling with near misses. Two deck rules came in at the same time, and the validator enforces both:
a deck is named at most once across the list, and never a deck whose commander shares a name with
the pick.

These runs used the shipped configuration: step 1 on Haiku 5.5 at medium, step 2 on Sonnet 5.5 at
medium, with no warm repeat. They cost $0.216 in all, against Hugh's $0.50 cap for the exercise. The
answers are in `intake-read-2026-10-11-21-27.json` (Ask A and Ask B) and
`intake-read-2026-10-11-21-30.json` (Ask B, with the deck-once wording that ships).

| Ask | Before (v1) | After (v2) |
|---|---|---|
| A (horrors) | 5 of 10 picks Horrors by type line | 10 of 10 Horrors by type line; shortlist narrowed to 16 |
| B (Landfall, unlike my decks) | 10 picks | 9 picks, every one a Landfall commander |

**The deck-once wording took two tries.** The first wording ("name each deck at most once") was
ignored: three reasons reused `{D14}`, and the validator refused two of them, taking Omnath, Locus
of Rage and Aesi out of a 7-pick list. Stating it as a token that appears in one reason only, with
the consequence spelled out, gave 9 picks and no repeats. The trade-off is fewer deck mentions: 1
reason in 9 names a deck, against 7 before.

The validator still refuses a reason that repeats a deck rather than stripping the token, because
the sentence left behind ("a plan unlike .") does not read whole.
