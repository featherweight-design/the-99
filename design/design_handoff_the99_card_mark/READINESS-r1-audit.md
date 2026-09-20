# Readiness audit — The card mark, Round 1

**Verdict: 🟡 Yellow.** Audited 2026-09-20 at R1 against
`docs/superpowers/design-briefs/2026-09-19-the-card-mark.md`, the adopted Round 0 frame
(`design/design_handoff_the99_deck_analysis/`, merged in PR #753) and the spec
(`docs/superpowers/specs/2026-09-19-deck-analysis-foundation-design.md` §7.1, §6.5, §11.1).

Audited by an agent that did not write the brief or the handoff.

**All four §5 calls are made, the claim limit holds, and the wordless-mark rule is satisfied with
a real measurement** — this is the first handoff in this repo to ship its contrast table as its own
artifact rather than asserting a floor in prose, which is the lesson the retired deck-status marks
bought. Every figure in it was recomputed during the audit and Design's arithmetic is accurate.

What keeps it off Green is one factual error about a shipped component that a load-bearing ruling
depends on, plus six smaller drifts. **Every one is engineering's to close; no Design round is owed
and no prompt is emitted.**

---

## The four §5 questions

| # | Question | Status | Evidence |
|---|---|---|---|
| 1 | The mark itself | **Answered** — three solid glyphs (bolt · stripped peak · turn again), no container, ONE shared ink `--fact #8FA6BE`, a static `drop-shadow` glow. Sizes 16 / 14 / 14–13 / 12, with a **12px floor**. The rejected options are drawn rather than asserted: a word, the letters `G L T`, three inks, a negated glyph, a count | `README.md:31`, `:38-108`; `STATES-card-mark.md:11-22` |
| 2 | Where it appears, and where it deliberately does not | **Answered** — the decklist row, the collection row, the collection tile, the modal and the key. Explicitly **not** on the art, not on a deck tile or band (that altitude is Round 0's), not on Home. Consider tiles and Add-panel rows are listed **severable, not refused** | `README.md:32`, `:112-157`; ledger `:251` |
| 3 | The modal's fuller treatment, and provenance | **Answered** — one block, *In the bracket rules*, between the oracle text and the availability receipt; glyph plus name per line; **no provenance** | `README.md:33`, `:161-177`; `STATES-card-mark.md:74-86` |
| 4 | The empty case | **Answered** — absence is the design. No reserved width, no height, no dash, no placeholder, no count, at any size | `README.md:34`; `STATES-card-mark.md:113-118` |

## The audited constraints

| Constraint | Status | Detail |
|---|---|---|
| §2 claim limit — nothing may imply completeness | **Satisfied** | Positive claims are refused by name: *"No tick, no `clean`, no `no MLD`"* (`README.md:106-108`), and the copy file carries a `NOT WRITTEN, ON PURPOSE` section (`card-mark · copy strings.ts:136-141`). The whole drop was swept for completeness language and every hit is a refusal. The tooltips state only what a **marked** card is |
| §5.3 provenance against §6a delta 4 | **Satisfied** | *"Provenance waits — the three detection sentences are fixed constants and Round 2 designs their slot"* (`README.md:174-176`). No slot is reserved, which the handoff notes would itself be a design decision |
| Wordless mark — weakest contrast measured BEFORE the build | **Satisfied**, with erratum 3 | `CONTRAST-the-card-mark.md:14-21`. Recomputed: amonkhet 6.89 / 7.17 / 6.75 / 7.49 against Design's 6.9 / 7.2 / 6.7 / 7.5; kamigawa 7.06 / 7.33 / 6.92 / 7.63 against 7.1 / 7.3 / 6.9 / 7.6 |
| Wordless mark — glossed | **Engineering-resolvable**, findings 1 and 2 | The gloss route is `MarkKey`, and the handoff is wrong about where it lives today |
| No collision at 390px in the row's densest state | **Satisfied** | The geometry is quoted from the components rather than asserted, and it holds. The collection row's name cell already hosts the name and an `AvailabilityMarker` inline, both `min-w-0` / `shrink-0` (`rows-view.tsx:93-127`), so *after the name, before the marker* is a drop-in; the decklist row's name block is `flex-auto min-w-0` with ellipsis (`decklist-row.tsx:122`, `:131`), so an 18px `flex-none` mark cannot overflow it; the tile caption's **157px at 390** is exactly right (a 175px tile less `pl-9` / `pr-9`) and a 12px glyph fits the 17px meta line |
| Legibly NOT the adopted bracket mark | **Satisfied** | Four axes against Round 0: an open diamond carrying a numeral, Ignition's warm golds, a pill, a 20px floor — against three natural silhouettes, a cool slate ink, no container, a 12px floor (`CONTRAST-the-card-mark.md:64-70`) |
| Payload — §4's collection-tile question | **Satisfied** | Answered **yes**, unprompted, with the widening named as Tier B work and a clean partial-slip rule: the bolt alone, with no change of form, ink, size or string (`README.md:230-236`) |
| Mobile and desktop ship together | **Satisfied** | Every matrix is two-column at 390 and desktop; the sizes fork where they need to (14 / 13 on the collection row) |

---

## Findings

**1 · `MarkKey` is not mounted on `/collection` at all, and the handoff says it is.** The
load-bearing one. `README.md:221` reads *"It sits above both the decklist and the collection grid,
so the gloss is on the same screen as every mark it explains."* On `origin/main` the only call
sites are `src/components/decks/decklist.tsx:548`, `:618` and `:754` — all three inside the deck
surface. Nothing under `src/components/collection` or `src/app/collection` references it.

Since §3's wordless ruling is the whole reason this mark is legal without words, and the handoff
puts marks on **both** collection views, **engineering must mount `MarkKey` on `/collection` (rows
and grid) in the same release as the marks.** The handoff already demands exactly that; it just
mis-states the starting position. Additive, and no new component.

**2 · "Always all five" contradicts the shipped key, and a third of it would print a falsehood.**
The handoff asks for *"always all five, never conditional on what is on screen"*
(`STATES-card-mark.md:94`). The component's own header says the opposite — *"IT RENDERS ONLY WHAT
THE VIEW CONTAINS, and nothing at all when the view has no marked rows. An empty legend is
furniture, and this app is strict about that"* (`mark-key.tsx:11-14`), and it returns `null` on an
empty list (`:33`), with entries built conditionally at `decklist.tsx:228-247`.

Forcing all five is not neutral. `decklist.tsx:220-226` records that an unconditional buy entry
prints `not owned` over rows the player owns — *"the exact falsehood this key's own ruling
forbids"*.

**The resolution, and it satisfies Design's stated reason verbatim:** keep `buy` and `proxy`
conditional exactly as they ship, and make the **three fact entries unconditional on any surface
that can draw a fact mark**. Design's reason is *"a player scanning for Game Changers needs the
entry to be there BEFORE they find one"* (`card-mark · copy strings.ts:50-51`) — which the fact
entries alone deliver, without reintroducing the ownership falsehood or an empty legend.

**3 · The contrast table covers two themes of six, and the true floor is 6.31:1.**
`CONTRAST-the-card-mark.md:14-21` measures amonkhet and kamigawa and calls 6.7:1 the floor.
Computed across all six theme blocks, the weakest ground is **kaldheim `--elevated-hover`
`#212229` at 6.31:1** (`globals.css:306`), with kaldheim `--surface` at 6.54. **The conclusion is
unchanged** — 6.31 clears the 3:1 graphics floor by 2.1× — and it lands on the very theme Design
flagged as the one to eyeball.

**4 · "The only cool ink" is not true, and the one cool neighbour is missing from the table.**
`CONTRAST-the-card-mark.md:60`. The blue mana pip is `--u: #3A6AA5`, identical in every theme, and
it is drawn inline on the same rows the mark lands on (`decklist-row.tsx:413`, `rows-view.tsx:152-156`)
— §3 names mana pips explicitly, and the seven-neighbour table omits them. Measured, the fact ink
against the blue pip is **2.21:1**, so these two are close in hue and the colour axis does not
separate them. **The container axis does, and survives intact**: a pip is a filled disc carrying a
letter, the mark is an uncontained silhouette. Design states either axis alone suffices, so the
ruling holds — but the claim must be corrected to *the only uncontained mark* rather than *the only
cool ink*.

**5 · `SET · rarity` is desktop-only today, not "both widths".** `README.md:146-147` says rarity
stays at both widths. `grid-view.tsx:118-120` draws `{primarySetCode}` alone under `md:hidden` and
`{primarySetCode} · {rarity}` under `hidden md:inline`. **The error is in engineering's favour** —
the phone trail is ~26px rather than ~54px, so the 12px glyph has more room than budgeted. **The
risk is the opposite reading:** guardrail 7 could be taken as instructing engineering to add rarity
to the phone. It must not.

**6 · The tile's count has no name-line slot to move into.** `README.md:122-123` moves `×N` from
the meta line to the name line. `CardTileCaption`'s name line takes only `name` and `nameSpoken`
(`card-tile-caption.tsx:139`); `trailing` is a full-height right rail, not a name-line slot.
Additive prop and engineering-resolvable, but it is an API change the ledger does not name — and
the count is `aria-hidden` today, so the accessible-name ordering must be re-checked once it moves.

**7 · Matrix 1's "densest" row is a desktop line quoted at both widths.**
`STATES-card-mark.md:34` lists `dot · name · ×2 · ⛰ · pips · short 1 · $ · ✕` as the same at 390px.
On the phone a row carrying a meta line puts the cost pips **below**, on that meta line
(`decklist-row.tsx:384-419`). Mark placement is unaffected — it is on the name line, after the
count — and `hasMetaLine` gains no clause. Cosmetic.

## Errata engineering carries

1. Mount `MarkKey` on `/collection`, both views, in the release that ships the marks.
2. Key composition: the three fact entries unconditional, `buy` and `proxy` conditional as shipped.
3. The true contrast floor is **6.31:1** on kaldheim `--elevated-hover`, still ~2.1× the governing floor.
4. Mana pips belong in the neighbour table; *only uncontained mark* is the correct claim.
5. Rarity is desktop-only on the tile — **do not add it to the phone**.
6. `CardTileCaption` needs a name-line slot for `×N`; re-check the sr-only ordering after the move.
7. The phone decklist's pips sit on the meta line, not the name line.
8. **`--fact` must be declared in all six theme blocks** or `pnpm check:tokens` fails by design —
   an unset custom property fails silently, which is the whole hazard that check exists for. Add
   the `@theme` mapping alongside its siblings if it is consumed as a utility.
9. Precedence, inherited from the package itself: *"Where a component and this handoff disagree,
   the component wins and these tables are what to correct"* (`README.md:25`) — which is the licence
   for every erratum above.

## Decisions that must survive the build

No container, which is semantic rather than stylistic. One ink for all three. Solid glyphs, never
strokes. The glow as a `filter: drop-shadow` only — never a `box-shadow`, plate, pulse or motion. A
12px floor with nothing substituted below it. No row or caption grows. No provenance anywhere;
Round 2 owns it. No tap target, no focus, no native `title`. **The key ships in the same release as
the marks.**

## Round 2

**Clear to be briefed.** Round 1 seeds nothing Round 2 owns: no provenance slot is drawn or
reserved, no threshold or count is invented, and the three names are fixed in one file serving the
key, the modal and every accessible name — which is the vocabulary Round 2's coverage sentence
attaches to. Carry forward the Round 0 audit's standing note: **Round 2's brief must require the
barometer counts to open to their cards.** This round supplies the mark that marks them.
