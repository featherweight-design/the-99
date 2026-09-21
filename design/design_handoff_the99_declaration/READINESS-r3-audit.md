# Readiness audit — the declaration, R6 (Round 3 of 5)

**Verdict: 🟡 Yellow.** Audited 2026-09-21 against `main`. **Both R2 Orange items are genuinely
answered**, and the round is out of Design's hands on everything it was asked for. Yellow for four
findings carried since R2 that were not applied, a skip that still survives in three files and one
live canvas annotation, and one newly reachable composition that nothing draws.

## The two Orange items

**1 · The draft state — ANSWERED.** §3a exists at both widths, with a new §0 and §A5 in the state
matrix, and every claim in it holds against the code. The analysis reads `deck_cards`, the live
commander columns and `decks.declared_bracket` in one snapshot transaction, and there is no
version-scoped profile loader anywhere — so R5's *"a re-analysis produces a later version"* is
correctly withdrawn. The wording follows the stage through one conditional clause rather than two
strings. And §A5 REFUSES the version comparison on a draft for exactly the reason the audit gave,
saying so in the copy file's own comment: a diff needs two settled readings, and a draft is one
moving one.

Two gaps inside the answer, neither fatal: the single-bracket draft is prose only at both widths,
and `declared.line`'s version argument has no stated derivation — the only way to know a draft is a
version is the draft-clean comparison, which the package never names.

**2 · Rank 5's mark — ANSWERED, and verified path by path.** Stripping the metadata blob and
listing every drawn element:

| file | elements |
|---|---|
| `bracket-4-optimized.svg` | inner diamond, mid diamond, four ticks, **four stud diamonds**, numeral — 10 paths |
| `bracket-5-cedh.svg` (shipped) | **the same ten, attribute for attribute**; only the numeral differs |
| `bracket-5-cedh-reissued.svg` | inner diamond, mid diamond, four ticks, **one closed ring** `M20 1.2 L38.8 20 L20 38.8 L1.2 20 Z`, numeral — 7 paths |

The four studs become a single ring through their own outer corners, at the same weight, with the
bounding box unchanged. The silhouette goes from *two rings and four dots* to *three rings*. **It
is a distinct mark.** The chip form sheds the mid ring and the ticks, leaving two paths, which
reads at 22px.

**But §3b's account of ranks 1 and 2 is wrong in both of its claims.** Rank 1 draws **one** path,
not two; rank 2 draws **two** and has **no ticks at all** — it differs from rank 1 by the mid ring,
not by ticks. And under §3b's own reduction rule, ranks 1, 2 **and 3** all reduce to the bare inner
diamond at chip size, so the collision it defers is three wide rather than two. Worth telling
Design before that conversation happens, since its premise is the part that is wrong.

## Back to Design — one question, no redraw

**§E and §A5 co-occur, and nothing composes them.** §3a rules that a commit copies
`declared_bracket` into the version only when it is inside that version's permits. Nothing clears
the deck-level declaration when that copy is refused — so immediately after such a commit the deck
holds both a draft whose declaration is outside its permits (§A5's faint line and the ask) **and**
a version-vs-version difference (§E's row, whose sentence already names the previous declaration).
The same fact, twice, in two voices, in one box — on the commonest path through the feature.

**The question:** when §E draws, is §A5's superseded line suppressed, or does the commit clear the
deck-level declaration instead? §A5 explicitly forbids the second — *stated, not deleted* — so
this likely settles in a caption rather than a frame, as the ask-and-lean exclusion did.

## Carried since R2 and still not applied

Each is resolvable by reading the code; `STATES` and the copy file are authoritative per Design's
own precedence convention.

- **The skip survives in three files and one live canvas annotation** — the ask row still specifies
  it, a build guardrail still says not to re-ask after one, the README describes a whole skipped
  state, and READINESS lists stored-skip as a data dependency while §11 of the same file withdraws
  it. There is no skip.
- **`STATES` still gives the lean's verdict as `[4,5]`** where the code sets `reachable` when the
  single permitted bracket is 4. Read it as `[4]`.
- **The lean's `combos.length > 0` precondition is still missing.** HANDOFF and READINESS both say
  it fires iff `permits.length === 1`; there are three conditions, and a `[3]` or `[4]` deck holding
  no combos draws no lean — which §2a's cards assume never happens.
- **`README` still instructs that `CardRef` must carry image uris.** It must not: the profile is
  fingerprint-cached, so art resolves at the draw.
- Six em dashes in shipping strings, same standing as R2.

## Two things the package has not caught up with

- **`decidedBy` shipped** (#792). The modal draws one combo and the lean now names which one; the
  package mentions it nowhere and §D still gives no rule for choosing.
- **The receipts reshape shipped too** (#792) — keyed per piece, exactly as asked. READINESS
  blocker 2 is closed, and the engineering item for it can come off the list.

## Two internal contradictions worth fixing before build

- **HANDOFF withdraws R5's mechanism sentence and then restates it** twenty lines later, under
  *what a version comparison is still for*, as current guidance. An implementer reading top to
  bottom meets the withdrawal and then the withdrawn claim.
- **`versionChange` calls the draft "this version".** R6 fixed exactly this category error in
  `declared.line` and did not carry it across. Resolve on the same draft-clean check.

## Coverage

Both widths for the ask, all five sub-line readings, the lean, drift's four shapes, the draft
out-of-range state and the mark set at 40/28/22.

Prose only: the single-bracket draft, the reasoning modal at 390, the `drawOnly` modal body, the
command-zone `found by` reading, and **every in-flight, failed or optimistic reading for the
declaration's write** — which is sharper than Design states it, because the write busts the profile
fingerprint and the next paint is therefore a full rebuild. That is precisely the case an in-flight
reading exists for.

`HANDOFF` still says the canvas is *one turn, sections 1a–1f*. It is 1a–1f, 2a, 3a, 3b — stale for
the second round running.

## Notes for the plan

- **Build order unchanged, still hard-gated on Round 2's block and modal chrome.** The copy
  dependency is now satisfied — `BRACKET_NAMES`, `bracketPhrase` and `bracketFace` all ship.
- **The migration is the one genuinely new schema item**, and it should land ahead of any UI:
  `deck_versions.declared_bracket` with the same 1–5 check, plus the version's `permits` snapshot,
  both copied at commit only when the declaration is inside that version's permits. Without the
  snapshot, §E costs a second profile build per load.
- **Drop the skip and the receipts reshape from the plan's PR 3 and PR 2.**
- **Record the `decidedBy` rule** rather than designing one.
- No About entry: the line batches its entries at launch.
