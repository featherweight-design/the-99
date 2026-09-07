# Readiness audit — deck tuning suggestions (#10), R2 handoff

**Verdict: 🟢 Green. Ready for implementation. No Design round-trip.**

Design self-assessed 🟡 Yellow — their own wording is "Green with one open item" — over §6's
failure-class labels, which they inferred
because `docs/superpowers/specs/2026-09-07-deck-tuning-suggestions-design.md` was still on PR #392
when they drew. That spec has since merged, and this audit answers the open item: **the count is
five, not four.** Design pre-authorised that correction as a string-only change, and every other
finding in this audit is eng-resolvable against shipped code or the merged spec. Nothing returns to
Design.

Sources: the handoff at `design/design_handoff_the99_deck_tuning/`, the merged spec, the property
table at `docs/superpowers/design-tables/deck-tuning.md`, and the shipped #9 implementation under
`src/components/decks/` and `src/lib/`.

---

## A. Five failure classes, not four

The spec's §6 defines five, and the fifth is user-visible:

| Design's inferred label | Spec class | Notes |
|---|---|---|
| `unavailable` | `upstream_busy` | The provider could not be reached. |
| `timed out` | `timeout` | The run exceeded its budget. |
| `unusable answer` | `malformed` | The response could not be parsed. |
| `nothing held up` | `ungrounded` | Every candidate failed validation. |
| — **missing** | `interrupted` | The run died mid-call and the reaper wrote the row. |

`interrupted` was added in round 2 of PR #392's review, after the review found that the partial
unique index on `deck_id where status = 'pending'` keys on the *stored* status — so a row merely
*read* as dead still blocks the deck from ever generating again. The reaper therefore writes the
row to `failed` with `error_class = 'interrupted'`, which means a player who navigates away
mid-run and returns finds a failure state on screen and needs copy for it.

**Resolution (eng, no redraw):** add a fifth object to `deckTuningCopy.failure` following the exact
shape of the other four — `tag`, `body`, `kept`, `note`, sharing `retry`. Design's own words:
"*If §6 names or splits them differently, it is a string change in `deck-tuning · copy strings.ts`
and no layout, geometry or state changes.*" The failure frame's three slots, `--danger` tag, one
sentence, one survived-line and one `Try again` are unchanged. The wording of all five tags and
bodies is a `/copy-review` item, not a design call.

## B. "No automatic retry" is compatible with the spec's in-run retry

`READINESS.md` ruling 2 forbids automatic retry after any failure. Spec §6 gives `upstream_busy`
and `malformed` one bounded retry *inside* the run, before any failure row is written or any
failure state is rendered. The two do not conflict: no surface ever shows a self-retry, and once
the panel lands in state 6 the only path forward is the player pressing `Try again`. Recorded here
so the implementation plan does not drop the in-run retry on the mistaken belief that Design
forbade it.

## C. `Stop` is new and needs a spec home

`Stop` (panel state 3) has no counterpart in the merged spec. Three eng requirements follow, none
of which change what Design drew:

1. A cancelled run must be written under the same `where status = 'pending'` guard the reaper and
   the generation path use, or the deck stays blocked by the partial unique index.
2. A cancel must not consume the `input_fingerprint` gate — pressing `Suggest changes` again on
   the same inputs has to start a real run.
3. A cancel is not a failure: it returns to state 2 with the manifest unchecked, no error and no
   tag, and announces `Stopped. Nothing was changed.` Stopping does not refund an API call already
   in flight; nothing in the UI claims it does.

## D. The price atom exists — Design's gap 2 closes with no redraw

Design could not locate a price atom and drew `$1.20` in the ownership atom's shape, asking eng to
substitute the real formatter. It exists: `formatCents` at `src/lib/decks/price.ts:109-114`
produces exactly `"$1.20"`, and `BuyTag` at `src/components/decks/buy-tag.tsx:114-184` is the
shipped consumer. `deckTuningCopy.card.price` is a pass-through and should call `formatCents`.

Prices come from our own `printing_prices` table, refreshed weekly by the ManaPool ingest — not a
live call. That also settles Design's gap 4: ownership and price are one database read, so the
fourth manifest row covering both is correct and the row count stays at four (five with intent).

## E. #9's shipped denominator rule is narrower than either document states

Shipped #9 prints `1 up`, `3 up · 1 down`, `Mana — 2 up, 2 down.` and `2 marked` — counts without
denominators. Design's stricter reading applies to #10's own five surfaces and to model output,
and that is right. **The risk is an implementer "fixing" #9's shipped strings to match.** They are
out of scope for #10 and must not change.

## F. Take Design's singular `deck_games.note`

The spec says `deck_games.notes`; Design says `deck_games.note`. Take the singular — `decks.notes`
already exists as a text column at `src/db/schema.ts:170`, and a plural sibling on a different
table invites exactly the confusion the naming should prevent. Caps: note ≤ 140, intent ≤ 120. The
app-seeded intent must also fit 120.

## G. R2 adds one ask to model output

A suggestion returns a **short rationale as well as a full one** — the phone card renders the short
one rather than truncating. Both obey the counting rules. This is the only thing R2 adds to the
engineering list and it belongs in the response schema (§8's zod validation).

## H. A sixth validation rule

Spec §8 lists five rules (schema, the card exists, the cut is real, the add is legal, the evidence
exists). Design's nine mechanical presentation checks — `noPercentage`, `noNet`, `denominator`,
`citation`, `quotedNote`, `colourIdentity`, `cutInDeck`, `onePair`, `ownershipNotRanking` — are a
sixth rule applied to model output. Rejections feed `dropped_count`, and a run where every
candidate is rejected lands in `ungrounded` (Design's `nothing held up`). Design is explicit that
this is a validator, not a politely-worded prompt.

## I. Three suggestions, fewer being legitimate

The spec is silent on count. Take Design's ruling: three, never ten, and fewer than three renders
fewer cards rather than an error or a filler. Design flagged the undrawn one- and two-card results
as their gap 3; the layout is a flex column with a fixed gap, so it needs no drawing.

## J. Two internal figure conflicts inside the handoff

Both are resolved here without a round-trip, because the handoff itself states the precedence.

1. The canvas `contract.never` string says "*the two 34×48 thumbnails*", while every drawn
   thumbnail and the component table say 22×31 desktop / 20×28 phone. **The drawn geometry wins** —
   34×48 is the pre-R2 figure and the R2 density pass is the later decision.
2. The drawn phone frames read `Again` and `Apply`, while the copy file and the component table
   read `Show it again` and `Apply this swap`. **The copy file wins**, per the handoff's own rule
   that a canvas label contradicting the copy file is a canvas artefact. Whether the phone should
   carry shorter labels at all is a `/copy-review` question, not a design one.

## K. Components win where the traced geometry disagrees

`src/components/decks/*` was not in Design's project, so panel, form, history and pill geometry are
traced from the game-log canvas. Design's instruction stands: if the shipped components disagree,
the components win. The property table records the traced values; the verify pass at pre-PR time
checks against shipped code, and a divergence there is a table correction, not a defect.

---

## Confirmed unchanged from #9

`PATTERN_MIN` as one imported constant, the eight axis keys and labels, Fix above Keep, a loss
never `--danger`, the aggregate panel, the tab pill (still counting games, not suggestions), the
history row's first line, the delete confirm and the empty state. `deckSurfaces()` at
`src/lib/decks/revalidate.ts:20-22` exists exactly as Design named it and is the revalidation for
apply and undo.

## Carried to `/copy-review`, not to Design

The wording of all five failure tags and bodies; the phone-versus-desktop label pairs in J2; the
`from the build` chip's phrasing. None of these blocks implementation.
