# READINESS audit: the read (R1)

R1 audit, 2026-10-11. Audited against `docs/superpowers/design-briefs/2026-10-11-help-me-choose-rework.md`
(rulings 1 to 5, locks 1 to 8, open questions 1 to 6) and the tree at `origin/main` 673b657fc. The canvas
and frame were read as source (their `SC` scenes, `WHY_*` fixtures and style tables); nothing in `design/` is
imported.

## Verdict: YELLOW

Every state the brief asks for is drawn at 900 and 390, every lock is respected, and every open question is
answered. The build can produce everything drawn from data the tree already holds. One product gap stays
open: removing the free match from the box removes the only way to set the card answer (F1). That is a call
for Hugh, and if he wants a picker, a layout for Design. Nothing else blocks the plan.

## Brief coverage

| Check | Result |
|---|---|
| (a) Filters stay free and instant | Held. The no-credit press is never disabled and runs the free search (7c, 7l). An empty box draws no pill and charges nothing (7a). |
| (b) One optional box, read on submit, never chips | Held. The words field is renamed *Anything else?*, moved last, tagged `optional`. No offer phase (T2). The free match no longer reads it (T1); `d`, `n`, Not used and the deeper chip are retired. |
| (c) Whole pool, two steps, real commanders, filters hold | Held. Two named steps (scan N, weigh the closest) under one charge and one Stop. 7i (exactly Black, 268) shows the filter holding; 7j shows nothing fits rather than loosening. The reason hangs on a pool row and deck names are drawn by the app from a returned id (READINESS step 4). |
| (d) Same list re-ordered, top 10, one line each, never a score | Held, with F3. Rows 1 to 10 in the read's order, then *The rest of your results* in the free order. Nothing fits is said plainly with one Change answers link. |
| (e) States | All drawn: 7a/7b (box empty, filled), 7b/7c (press with and without a credit), 7d/7e (wait, Stop), 7g/7h/7i/7k (results), 7j (nothing fits), 7f (failed), 7e/7f (refunded). *Read as* becomes *Your answers* + *You wrote*. 7m (repeat), 7n (paused / owner share) and step 2 of the wait are described, not framed, as variants of drawn frames; acceptable. |
| (f) 900 and 390; STATES; design tables; About | Present: `STATES-the-read.md` 7a to 7n, `design-tables · the read.md`, `about · help me choose r2.ts` with the credits bullet. |
| (g) No card labels; `playerText` | Held. "card label" appears once, in a canvas note telling the build not to name one; no player-facing string mentions labels. The textarea, the 800 cap and `playerText` are kept. |
| (h) Open questions | Q1 last field, renamed, optional (with F1's consequence). Q2 refunds. Q3 named by commander only when the ask is about difference. Q4 one sentence in the panel lead. Q5 no warning; an exact repeat is free and says so. Q6 on the form beside the press when the box has text; on the results in the panel. |

## Findings

**F1. The card answer has no control once the box stops matching. Needs Hugh (product), then Design if yes.**
Verified: `intake-form.tsx:39-44` says the form "draws no card control, so its only card is one its words
name". The brief's Q1 text assumed "the existing pickers" cover a card; they cover themes, sets, colors,
budget and bracket only. After this round a player cannot set a build-around card at all. Design flagged it
and did not draw a picker, which is right: whether the card answer survives is Hugh's call, and its layout
is Design's. Until he rules, the build ships without the card answer (the search and rank already treat it
as optional) and states 4c to 4e stay open.

**F2. The read's progress needs a server-side phase. Eng-resolvable.**
The wait moves step 1's dot to step 2 when the shortlist ends. `intake_reads` has `status` and no phase
(`schema.ts:1973-1992`), and today's panel awaits one Server Action. The build adds a phase (a column, or a
second action call under the one reservation) that the panel can read. No visual change.

**F3. A fixture reason breaks the drawn rule "no digit". Eng-resolvable, decided.**
Titania's reason in `WHY_B` and `WHY_B0` says "come back as 5/3 Elementals", while READINESS tests assert no
reason contains a digit. Decision: the digit ban stands, because a number is the first thing that makes a
line read as a score and a validator can hold it exactly. The prompt asks for rules language without
figures; a reply carrying a digit or `%` is refused. The fixtures are illustrative, so the canvas is not
re-drawn for it.

**F4. What "the row is refused" does. Eng-resolvable, decided.**
The handoff says a reason over 140 characters (or, by F3, carrying a digit) is refused, not cut, without
saying what the row becomes. Decision: a pick whose reason fails validation is dropped from the read's top
ten and falls back to its free position; the next valid pick moves up. A read with no valid pick left is
nothing fits (7j), refunded under lock 7. Never a top-ten row with no line, which the drawing does not have.

**F5. Deck names in a reason come from ids. Eng-resolvable.**
The model returns a placeholder carrying a deck commander's oracle id; the validator keeps it only when the
id is one of the player's deck commanders, and the app draws the name in 600 `--fg`. Whether a deck is
named only "when the ask was about difference" is the model's judgement, so Ask A's "names no deck" is an
eval assertion, not a unit test.

**F6. Card labels are kept out by input, not by matching. Eng-resolvable, decided.**
The read's inputs are the compact list (name, colors, creature types from `cards.type_line`, top EDHREC
themes from `commander_support.tags`), rules text, collection support counts, and the player's deck
commanders and their themes. No `label_*` data is sent, so the model has no label vocabulary to name. A
string validator for labels would be unreliable (`ramp` is both a theme and a word) and is not built.

**F7. The form page reads no standing today. Eng-resolvable.**
`page.tsx:79` renders `IntakeForm` with no allowance; `readAllowance` runs only on the results branch, and
only with words (`page.tsx:93`). The form branch reads it too (Q6), failing soft to the plain button. The
press re-checks at submit: a credit that ran out between render and press lands on 7l, never a charge.

**F8. Start the read at submit, not on the results page's mount. Eng-resolvable.**
"The press goes straight to the results" with the read pending. If the results page started the read on
mount, a reload or Back would press again. The submit reserves and starts the run and puts its id (`r`) in
the address; the results page attaches to that id. The one-pending index
(`intake_reads_one_pending_idx`) stays the backstop.

**F9. The data the read needs exists; the builders do not. Eng-resolvable (build tasks, as the brief says).**
Present in the tree: colors, `type_line`, `commander_support.tags`, support-card ownership (`rank.ts`), and
deck commanders with their index tags. To build: the cached compact list, the `cache_control` marker in
`client.ts`, repricing `FEATURE_CALLS.intake` for two calls and a cold cache write, the widened fingerprint
(lock 7) replacing `wordsHash`, a stored result shape for picks and reasons, a `repeat` flag for 7m's line,
and the eval. The `n` and `d` params must still parse and be ignored, so an old link opens cleanly.

**F10. *Read it* on 7l. Needs Hugh (ruling 2), low.**
7l draws a disabled *Read it* with `0 left`. Not drawn: the same panel once a credit has come back. A live
*Read it* there is a second press on the results page, close to the *Look deeper* step ruling 2 retired.
Recommendation: keep it, since the words are already written and the press names its cost; until Hugh says
otherwise the build draws it live with the `1 credit` pill when the standing allows.

**F11. Best-fit art and phone rank changed outside the brief. Design's, accepted.**
`design-tables · the read.md` changes the best-fit art to `aspect-ratio: 626 / 457` and moves the phone rank
off the art. Neither is part of the read; both are layout and Design's to make. The build takes them as
drawn and lists them in the PR as a separate change so review reads them as such.

## Copy, to /copy-review (not Design)

- Every string in `the read · copy strings.ts` is marked placeholder and goes through `/copy-review`.
- The `creditsCopy` widening is given for the `tuning = true` branch only. `credits.ts:47-53, 76-80` also
  has the forms without suggestions (*Your overview and deeper looks share*, *overviews and deeper looks*);
  those need the same widening.
- The About credits entry (`about.ts:1168`) says "You get five"; the owner gets ten. Out of this round's
  scope, noted for the same pass.

## For Hugh

1. F1: should the card answer survive, as a picker on the form? If yes, Design draws it.
2. F10: a live *Read it* on the results page when a credit is back, or none.
3. `ABOUT_VERSION` 14 to 15 with the revised entry (Design recommends the bump; the brief argues for it).
