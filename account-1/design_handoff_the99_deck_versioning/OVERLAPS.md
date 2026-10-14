# The two open calls — one problem, seen together

The spec leaves two questions to Design, at the end of §Surfaces and the end of Addendum R2, and
says they are the same class. They are, and the class is worth naming:

> **A surface that used to be the last word is now a step in a longer sentence.**

Top-off's buy list was a purchase. On a committed deck it is a contribution to one. The update
flow's preview was the confirmation. On a committed deck the commit is. Neither surface is wrong
and neither should be deleted. Each one **changes tense**, and the surface that owns the moment
keeps the full treatment.

---

## Call 1 · Two surfaces make a purchase claim

### The situation

Top-off places cards into a deck and prints what the pass costs:
`95 of 99 when added · 3 to buy · $42.80`. On a committed deck those adds land in the draft, so
that figure is now a preview of part of what the commit will ask for. Meanwhile the commit sheet
prints the deck's whole buy list, and the pending banner prints its total.

### The call

**There is only ever one buy list. It appears three times, and the grammar says which is which.**

R1's third correction already guarantees this: `loadDeckBuyRows` becomes a left join, so a
draft-added card is in the deck's buy list the moment it is added. There is no second list to
reconcile — so the fix is not to hide a figure, it is to mark the two appearances that are
**deltas**.

| Surface | Figure | Grammar | Link-out |
|---|---|---|---|
| Top-off commit row, committed deck | `+3 to buy · +$42.80` | **signed** — a contribution | no |
| Pending banner | `8 to buy · $254.10` | **bare** — the deck's position | no |
| Commit sheet | `8 · $254.10`, with `3 not owned · 5 still sleeved elsewhere` | **the total, and the breakdown** | **yes, and only here** |

Plus one mono line on top-off's commit row:
`adds to your pending changes — nothing is bought until you commit the deck`.

### Why this works

- **Two figures on one screen only confuse when they claim the same status.** Signed and unsigned
  cannot be mistaken for one another, and a player who taps `Add 27 cards` watches the banner's
  total absorb the delta on the very next screen. The relationship is demonstrated rather than
  explained.
- **The link-out is the actual claim.** Opening Mana Pool is the moment money is asked for, and
  it happens once, on the surface where the player has just read the whole list and the reasons.
- **The breakdown says why the money exists** — `3 not owned · 5 still sleeved elsewhere`. The
  word is **still**: five pulls are on the table and you have not taken them. R1 itemised all
  eight rows here, which duplicated the review page directly above it (see R1.2 in `README.md`);
  the *reconsider a pull* argument moved to where the pull controls are, and the money block links
  back up to them.

### On a brew, nothing changes

No plus signs, and top-off keeps its link-out — there is no commit, so top-off **is** the moment
the claim moves. The delta grammar is a committed-deck behaviour. The shopping list is untouched
in both cases: it is its own surface, with its own removals, and it owns money across the whole
app.

### Rejected

- **Suppressing top-off's money on a committed deck.** The figure is the *question* in that
  flow — the top-off handoff declined collapsing the buy tag to a bare `$` for exactly that
  reason — and removing it makes ticking three unowned rows a decision taken blind.
- **A basket accumulating across surfaces.** A cart is a fourth claim, and the buy tag already
  answers *what do I still need* everywhere in the product.
- **Leaving commit as a bare confirm**, with no money at all. §Decisions 3 says commit *emits* the
  buy list; a commit that does not show what it is asking for is the one thing the feature cannot
  do. The total and the breakdown are the minimum that satisfies it — the itemised rows are not.
- **A "pending purchases" surface** collecting deltas. That is a fourth surface to answer a
  question two already answer.

### Mechanical checks

1. Exactly one Mana Pool link-out renders anywhere in the versioning feature.
1b. The buy total renders in at most three places and the itemised rows in exactly one — the
   review page. If the commit sheet ever lists cards again, it is duplicating the surface directly
   above it.
2. Every money figure outside the commit sheet on a committed deck is either signed (top-off) or
   accompanied by the words `this commit will ask for` (banner).
3. On a deck with no version, no figure in top-off is signed.
4. The banner's total, the review page's chip and the sheet's sum are one query — they cannot
   disagree, and a test that lets them is a test of three code paths where there should be one.

---

## Call 2 · Two diffs describe the same deck

### The situation

`updateDeckFromList` previews its in/out list before writing. On a committed deck the write
lands in the draft, so the deck page then shows pending changes — a second diff of the same deck,
minutes later.

### The call

**They have different operands, so they are different facts — and only one of them is durable.**

| | Operands | Lives until | Carries a decision |
|---|---|---|---|
| Update preview | **paste vs draft** | the paste is applied or abandoned | **yes** — per-row `Keep` on the removals |
| Pending changes | **draft vs version** | the commit | no |

Three consequences, drawn:

1. **One component, two mountings.** Review changes reuses `update-diff-row`, its group headers
   and its count chips **verbatim**. No new diff row atom exists in this feature. What differs is
   declared: no `Keep` toggles, the pull control in the action slot, and the row's **type label
   replaced by a type group heading** — a change that lands on *both* mountings, which is the whole
   point of sharing the row. The freed 120px is what pays for the cost track (`COST-TRACK.md`).
2. **The preview gains one line, above its groups:**
   *This deck is on v2. Applying this list changes your pending changes, not the committed deck —
   you will still commit it yourself.* That is R2's guarantee, said once, at the only moment a
   player could believe otherwise.
3. **The arrival strip is suppressed on a committed deck.** The update flow's `19 in, 6 out, 1
   you kept` is dismissible, is about the paste, and lands on a page where the **pending banner
   already says the truer thing**: not what that paste did, but what the deck now owes. Same news
   twice, and the dismissible one is the one that can be wrong ten minutes later. On a brew the
   strip is unchanged.

### The counts can disagree, and that is correct

Paste twice and the preview says `2 in` while pending says `+19`. Recorded here so it is not
read as a bug later: **the preview's operand is the draft on screen, never the version.** Nothing
in the UI needs to explain this — the preview names the paste and the banner names the version —
but a reviewer comparing two numbers on two screens will notice.

### Both keep their own routes

`/decks/[id]/import` is about a paste you are considering; `/decks/[id]/changes` is about a deck
you are building. Merging them means a page that sometimes has a textarea at the top.

### Rejected

- **Dropping the preview on a committed deck** because pending changes will show the same thing
  afterwards. The preview is the only place the **deletions** get a per-row `Keep`, and a paste
  can delete nineteen hand-placed cards. That confirm was earned by the deletions in #289 and
  versioning does not repay it.
- **Committing at Apply**, so there is only ever one diff. This is R2's tempting reading, named
  in the spec, and it skips the one moment the feature exists for: seeing the buy list and being
  offered the pulls before the claims move.
- **Making the preview diff against the version** instead of the draft, so the two agree. Then the
  preview stops describing the paste — it would show cards the player added by hand last week as
  additions of *this* paste, and the `Keep` toggles would be attached to removals the paste is
  not making.
- **Merging the two into one "changes" route** with the textarea at the top. One page with two
  jobs, one of which is destructive.

### Mechanical checks

1. `update-diff-row` has exactly one definition and both surfaces import it.
2. The arrival strip's param is not set when the target deck has a version.
3. The preview's plan is computed against `deck_cards`; the banner's against the newest version's
   `deck_version_cards`. If either reads the other's operand, both surfaces lie.
4. Review changes renders no `Keep` toggle and no `aria-pressed` control.
5. Both mountings group by type and neither renders a per-row type label. If one of them still
   does, the row has forked.
