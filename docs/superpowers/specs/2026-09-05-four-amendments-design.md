# Four amendments — design

Date: 2026-09-05
Branch: `design/four-amendments`
Handoff: `design/design_handoff_the99_amendments/` (R3)
Status: proposed

## Problem

Four unrelated defects came out of the eleven-item batch triaged on 2026-09-05.
Five items in that batch were code fixes and shipped in PR #289. These four
needed design input first, and were sent out as one handoff because each is
small and none of them share a surface:

| Issue | Amendment | Surface |
|---|---|---|
| #286 | The black mana pip is unreadable | `--b`, app-wide |
| #277 | A deck cannot be updated by re-importing its list | `/decks/[id]` |
| #280 | A deck can be pushed past 99 cards with no way to see it | `/decks/[id]` |
| #287 | "Full card" on mobile opens a worse surface than the modal | `/commanders/[slug]` |

Design returned the handoff over three rounds. This spec records the readiness
verdict, the rulings that came out of the audit, and what each amendment costs
to build.

## Readiness verdict

**Amendments 1, 3 and 4 are 🟢 Green and cleared to build. Amendment 2 is
🟡 Yellow on a build-order dependency only** — its open Product question was
answered during the audit and is recorded below.

The audit recomputed every figure in the package independently rather than
taking the handoff's word for it. All of them reconcile.

### Amendment 1 — the black pip

The pip ships at `#1E1B1A`, which is very nearly the page background. On a dark
canvas it is a hole, and the `--bg` glyph inside it is invisible.

Design proposed three values across three rounds. The first two failed gates
that the handoff had not checked, because both rounds asserted that "CI cannot
see this change — the theme tests assert key presence, not value." That is
wrong. `src/lib/theme/contract.test.ts` asserts values across all six themes,
including this one at line 145:

```ts
expect(deltaEOk(hex(key), hex("accent"))).toBeGreaterThanOrEqual(0.1);
```

`--b` is in `PIPS`, so the gate applies. Measured with the repository's own
`deltaEOk`, against each theme's `--accent`:

| candidate | worst theme | ΔE | result |
|---|---|---|---|
| `#1E1B1A` (shipped) | Oil and Iron | 0.349 | passes — on lightness alone |
| `#837D78` (R1, neutral) | Oil and Iron | 0.064 | **fails** |
| `#857A93` (R2, violet 305°) | Oil and Iron | 0.087 | **fails** |
| `#8E7792` (R3 candidate) | Oil and Iron | 0.100 | passes, no headroom |
| **`#98748F` (R3, called)** | Oil and Iron | **0.115** | **passes** |

The shipped near-black clears every accent by lightness. To carry a 12px `--bg`
glyph at 4.5:1 the pip has to become mid-lightness, which puts it in the same
band as the accents and leaves the chroma plane as the only remaining axis. At
C 0.040 the R2 violet was still close enough to neutral that hue direction could
not save it; the fix was more chroma, not a different hue.

`#98748F` — relative luminance 0.2115, C 0.0589, hue 335.4° — verified against
every gate:

| gate | floor | measured | binding case |
|---|---|---|---|
| pip vs `--accent`, ΔE OKLab | 0.100 | 0.1145 | Oil and Iron, then Rune Frost at 0.1146 |
| pip vs every other pip, ΔE | 0.100 | 0.122 | `--r` |
| `--bg` glyph on disc | 4.5:1 | 4.648 | Moonlit (Rune Frost is 4.650) |
| disc vs `--elevated` | 3:1 | 3.37 | Rune Frost |
| disc vs `--border-dashed` | none | 2.23 | Screen Glow, then Rune Frost at 2.31 |

The chroma budgets do not apply. `contract.test.ts` bounds chroma on surfaces
(≤ 0.02), borders (≤ 0.04) and the text ramp (≤ 0.03); WUBRG is its own class
and `--r` ships at C 0.138.

**Build:** one CSS file. Six `--b` declarations in `src/app/globals.css`, plus
deleting `PIP_TEXT` from `src/components/commanders/lightbox.tsx` — which
amendment 4 deletes outright anyway. No component file changes; all 22 reads go
through `WUBRG_COLOR` → `var(--b)`.

**What CI cannot see** is the legibility half. There are no visual-regression
baselines for pips, so the six-theme frame in the handoff is the reference and a
reviewer's eyes are the gate. Run `pnpm test` before believing any candidate.

### Amendment 2 — update a deck by re-import

A player who keeps their list somewhere else can import it once, but cannot
re-import it to bring the deck up to date. The amendment adds a diff-and-apply
flow: paste the list, see what would be removed and added, apply.

**Product rulings taken during the audit (2026-09-05):**

1. **No undo, and the reason is not "the preview is thorough enough."** The diff
   is computed against the saved deck, not against a stored copy of whatever was
   pasted last time — there is no import history and no stored source. So the
   diff is accurate however the deck was edited in between, and there is nothing
   for an undo to recover that the preview did not already show.

2. **The "you added this" marker is deleted, not reworded.** Design drew a
   `--warning` marker on removal rows for cards the player added inside the app,
   plus a sentence counting them. The marker cannot do what its label claims:
   there is no column recording who placed a card. `deck_cards.auto` means "the
   fill placed this and the player has not claimed it", so `auto = false` is
   equally true of every card from the original import. The handoff acknowledges
   this — `README:169` calls it "a proxy" — but its copy file still says
   `"3 of them you added by hand"`, contradicting its own ruling.

   The deeper reason to delete it: once a list is uploaded, The 99 is the record.
   Re-pasting a list is the player declaring that something else is the record
   now, and the deck becoming the list is the whole point. Labelling one class of
   removal differently only makes sense if two sources of truth are still in
   play, and by then there is exactly one.

   No state in `STATES-reimport.md` is keyed on the marker, so this removes the
   `--warning` element from removal rows, the copy strings `handAdded` and
   `ariaHandAdded`, and the summary sentence's second clause — leaving
   "Your list does not name these." It needs no redraw and introduces no new
   state. **Design to ratify, not to redesign.**

3. **Deck versioning is a separate ticket, not a dependency.** It is the better
   feature and would make undo moot — snapshot on apply, and "restore the
   previous version" covers this case plus fill sweeps, the trim to 99 and bulk
   removes. It is also a schema-and-surfaces feature with its own open questions
   (what creates a version, how many are kept, whether they are visible or only a
   recovery path). It must not absorb this amendment.

**The dependency, which is the only thing still Yellow.** Amendment 3 must land
first. An update that would take a deck over 99 is refused by
`src/lib/decks/add-validation.ts:42`'s cap, so the player's list arrives short
with nothing on screen naming what went missing — the worst available outcome in
a feature whose promise is that the list becomes the deck. If amendment 3 slips,
amendment 2 needs a hard stop in the diff (refuse past 99, name the dropped
cards), which is a redraw of the apply bar and one new state.

**Build:** the only real one in the package. One route, three components, one
pure module, one server action, one URL param, 24 states. `buildDeckImport` is
reused unchanged.

The diff is computed **twice on purpose**: the client renders a plan, the server
re-parses and re-plans on Apply, and the only thing the client contributes is
the `keep` array. Trusting a client-computed diff would let a crafted request
delete an arbitrary set of cards.

Two non-visual calls worth carrying into the plan: Apply clears `auto` on every
unchanged card the list names, so a later `Clear all auto` sweep cannot delete
what the player just declared; and unresolved rows are replaced, not merged.

The only edit to shipped code outside the new files is `import-actions.ts`'s doc
comment, which currently warns against this feature arriving by accident. It
should point at `updateDeckFromList` and keep saying that `importDeck` itself
never dedupes.

### Amendment 3 — decks over 99

`validateCardForDeck` refuses at 99, but a deck can exceed it by other paths and
nothing on the deck surface says so. The amendment adds a fifth `statusPill`
value, `Over`, a two-segment progress bar and a trim line.

Rulings the audit confirms and does not reopen: `Over` is a fifth pill value
rather than reusing `Building`, because `Building` beside a `Complete` 99 makes
the bigger deck look less finished for no stated reason; `Complete` and
`Playable` narrow to exactly 99; `MATURE_DECK_SIZE` stays `>= 99` and must not
be narrowed for symmetry, because `availability-query.ts` uses it to decide
which decks hold cards hard; there is no numeric ceiling; and `deck-full` and its
message are deleted rather than reworded, which strands two tests
(`mutation-result.test.ts:6,23` and `add-validation.test.ts:66`).

**Build:** arithmetic in two components plus one branch in
`src/lib/decks/status.ts`, whose signature already carries the argument needed:

```ts
export function statusPill(args: {
  built: number;
  ownedCount: number;
  unresolvedCount?: number;
}): StatusPill
```

The thing to check first in review is that the pill, count, bar and both lines
all derive from `counts.built` — the optimistic list — and not `deck.built`, or
crossing 99 will flicker.

### Amendment 4 — "Full card" opens the wrong surface

`/commanders/[slug]` has a `⛶ Full card` control that opens a bespoke lightbox.
The app also has a rich card modal reached from every other card in the product.
The modal is a strict superset except art size, and the lightbox is 282 lines of
code that exists to be worse.

**Build:** a deletion plus two props. `src/components/commanders/lightbox.tsx`
(282 lines) and `lightbox.test.tsx` are deleted, not left unused;
`full-card-trigger.tsx` calls `open(oracleId)` from `CardDetailProvider`, which
`detail.tsx:240` already mounts. Nothing in `src/components/cards/` changes.

Called and not asked: the sharp art goes 262px → 180px, drawn at both sizes in
the handoff so review can judge rather than take the argument; `Tap anywhere to
close` is deleted while the gesture is kept; there is no sibling list, so the
modal reads `1 of 1`; there is no `Add` control on this route; and the desktop
trigger is beyond the brief and can be dropped on its own.

**`Full card` becomes `Card details`.** This is the only player-visible change
in the amendment, and it is load-bearing: if the old label is kept, the
262 → 180px art reduction becomes a regression rather than a trade, because the
control would still be promising a picture.

## Corrections owed to the handoff

Neither is a design question and neither blocks the build. Both were factual
self-contradictions rather than design calls, so both are **corrected in this
PR** and go back to Design as ratification alongside the marker deletion.

1. `READINESS.md` said "`#98748F` is minimum-passing on the *accent* gate."
   It contradicted the preceding sentence and `CONTRAST-black-pip.md:117`, both
   of which correctly report 0.115 against a 0.100 floor. `#8E7792` is the
   minimum-passing value, and it was rejected on headroom. The clause is
   removed; the sentence now reads "the *accent* gate is the binding one".
2. `deck-reimport · copy strings.ts` said "you added by hand" in the summary
   sentence, which the same file's own comment ruled out. The marker deletion
   above removes `handAdded`, `ariaHandAdded`, `outBodyHandAdded` and
   `outBodyMobileHandAdded`, leaving `outBody` as the single removal sentence.

## Build order

1. **Amendment 1** — independent, one file.
2. **Amendment 4** — independent; also removes `PIP_TEXT`, so it pairs with 1.
3. **Amendment 3** — must precede 2.
4. **Amendment 2** — depends on 3.

Amendments 1, 3 and 4 can be planned now. Amendment 2 gets its own plan once 3
has landed.

## Out of scope

- **Deck versioning**, per ruling 3 above.
- **Per-theme toning of `--b`.** One hex serves all six. Phyrexia's `--g`
  exception does not generalise.
- **A ring or outline on the pip** as an alternative to lifting its lightness.
  A ring cannot follow card art, so the fallback would be per-surface rings,
  which is a larger amendment than the one being avoided.
- The 36-key theme contract stays at 36 keys. No new token, no new hex beyond
  one value, no new motion class, no new modal, no toast, no schema change, and
  no `--danger` anywhere.
