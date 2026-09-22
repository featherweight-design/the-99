# Gap report — the card note (PR 8b)

Against `design/design_handoff_the99_push_line/` (Round 4 of 5, R1), audited 🟢 Green at R3 on
2026-09-21. Read with `docs/superpowers/inventories/card-note.json` and the contact sheet it
produces, and with `pnpm probe:card-note`.

**Scope:** the note on the deck page's own two add surfaces — the Consider tile and the top-off
row. The quick-add result row is PR 8c, named in the surface plan.

---

## What the handoff asked for, and where it is

| Ruling | Where |
|---|---|
| The note states what the CARD is and what the RULES say, never the deck's standing | `src/lib/bracket/card-note.ts`, and a sweep in its own tests over every sentence it can emit |
| "Your bracket" is only the DECLARED bracket; undeclared prints no deck clause | the `declared === null` branch per fact; `decks.declared_bracket` reached through `DeckDetail` |
| Two registers — flat for the list lookup, attributed for the two readings | `src/lib/copy/card-note.ts`, transcribed |
| The rules clause stays flat in both | asserted across all six declaration states |
| No tutor gate: a fact and never a limit | asserted identical at every bracket |
| One sentence per fact, in the table's order, two on a row and one on a tile | `FACT_CAP` |
| No `--warning`, no `--danger`, no confidence figure | asserted on the rendered slot |
| The row never reserves the height | `CardNote` returns null; `probe:card-note` measures a noted host against an un-noted one |
| Label mono 9px `--fg-muted` uppercase `.14em`, never `--fg-disabled` | asserted resolved, in the browser |
| Body 12.5px/1.6 on a row, 11.5px/1.45 on a tile | asserted resolved, in the browser |
| Inside the row's box, above a 1px `--border` rule | asserted as geometry, in the browser |
| Part of the row's accessible description, never a live region | `rowLabel` composes it through `cardNoteSpoken` |
| Mobile and desktop ship together | both widths, both surfaces, in one PR |

---

## Gaps, five, all named rather than closed quietly

**CLOSED 2026-09-22, by the follow-up PR: gaps 2 and 5, and §C2's marks.** Hugh asked two
questions of the shipped tile — *"why aren't we using the mass land denial mark to say this
without words?"* and *"shouldn't About this card have relevance to the deck?"* — and both
landed on real omissions. What the follow-up shipped:

- **§C2's three fact marks, on both add surfaces, with their key.** They were specified for
  exactly these surfaces (*"Card row (quick add, top-off): inline after the name"*; *"Consider
  tile: own line above the name"*) and drew on NEITHER. `CardFactMark` rendered on the decklist
  row, the deck card tile, both `/collection` views and the card modal — every surface showing a
  card you already have, and none of the three showing a card you are deciding to add. The note
  was carrying the whole load on the one surface where the glyph was meant to lead.
- **A key, which neither surface had at all.** `ComboClause` already drew `ComboGlyph` on both,
  and neither clause sentence contains the word "combo" — so the lemniscate had been arriving
  unglossed since sub-project 3. That is the rule the deck-status marks were retired in a day
  for breaking. The key is unconditional here, unlike the decklist's: these are windows on a
  ranked pool, so absence on screen is not absence among the candidates.
- **The mass-land-denial note states the CONSEQUENCE** — *"Nothing below Optimized allows it"* —
  which is what gap 2 was really about. It is available with no verdict because MLD is forbidden
  outright at 1, 2 and 3: there is no threshold to compute and no dependence on the rest of the
  deck, which is what separates it from the withdrawn push line. **74px, the same as every other
  note**, against the 124px the hedged form measured.
- **The hedge moved to the row**, which draws it on one line above `md:`. That closes gap 2's
  "two short sentences" question without inventing a string: the tile no longer needs one.

Routed through `/copy-review` rather than Design — the box is the same box.

**1 — n8, the combo completion, is not drawn.** `STATES-card-note.md` n8 says a candidate that
completes a two-card combo prints *This completes A + B, a two-card infinite.* Sub-project 3
shipped the same statement on the same two rows first, as `comboAwarenessCopy.clause.completes`
with the lemniscate beside it and a key entry glossing the glyph, and both hosts render it today
(`consider-combo.test.tsx`, `top-off-combo.test.tsx`). Two sentences about one combo on one row
is a defect; the shipped one is shorter and glossed. The string is transcribed and says in its
own comment what draws the fact instead. **Engineering's call, recorded in the surface plan.**

**2 — CLOSED. The tile draws ONE sentence, so the question is moot.**
It was: README §3 says register 2 *"truncates to `we read this as mass land denial`"* on the
tile, and the production-final module carries no such string. What shipped first was the full
sentence plus its disclaimer — two sentences, inside §Geometry's *"two sentences max"*, and at
124px the only note on the surface drawing six lines. The follow-up moved the hedge to the row
and restated the fact as a consequence, so the tile now draws one sentence at 74px and needs no
shortened string at all.

**3 — the row's indent is 49px at 390 and 46px above `md`, not the handoff's 27px.**
`HANDOFF.md` §Geometry states `padding-left:27px` for the 390 note; §C's host matrix states the
intent, *"indented to the name column"*. Those disagree against the SHIPPED row: its tick is
`w-[26px]` with a `gap-[9px]` at 390 and `w-[18px]` with a `gap-[10px]` above `md`, and an
ownership dot sits between the tick and the name — so the name column starts 49px and 46px in,
measured in a browser. 27px would put the note under the tick at 390. The figures live in the
code and `probe:card-note` asserts the PROPERTY they were derived from — the note starts at the
row's own laid-out name — so a later change to the tick or the dot fails the probe rather than
drifting. Same shape as `labelAtPx` in `probe:commander-row`. **Eng-resolvable; no redraw.**

**4 — the note's clause on the Consider tile cites the DECLARED bracket, which no player can set
yet.** Round 3's ask UI is PR 5. Until it lands every note ships in its undeclared form, which
is drawn and deliberately plain rather than a placeholder — `READINESS.md` gap 1, unchanged and
still accurate. Both branches are built and unit-tested; only one is reachable in the app today.

**5 — PARTLY CLOSED. The three shipped facts now have their marks and a key on both add
surfaces. The TUTOR still has neither**, and that half stands: `STATES-push-line.md` §C2 puts the
drawn-up glyph in Round 2's design and says so: *"if they land later, they appear at call sites
that already exist with no other change."* The note names the tutor in words, which needs no
glyph — but a reader who sees `A tutor, and your 6th` on a row has nothing marking that card on
the decklist afterwards, where Round 1's three marks are. **Design's, at whatever round draws the
lemniscate and the drawn-up.**

---

## One defect this PR introduced and fixed, with its figure

**The Adds in a Consider row went 90–91px out of level.** A tile is a grid item and stretches to
its row, so before the note every tile's content ended at the same height. The note is ~30px of
extra content on one tile in six, and the rest of the tile's content sat at its own height — so a
row holding a noted tile drew its six Add buttons at up to **91px** apart on desktop and **91px**
at 390, while the tiles around them still ended level. `mt-auto` on the Add absorbs the free space
instead. The alternative — reserving the note's height on every tile — is the one thing the
handoff forbids outright.

`probe:card-note` asserts it, grouping tiles by measured top edge rather than by index, and
**fails rather than passing when no row mixes a noted tile with an un-noted one**: every tile
carrying a note, or none of them, lines up on any build.

---

## Not a gap: `push-line - copy strings.ts` is not transcribed here

§4.1's premise was withdrawn on 2026-09-21 and `READINESS.md` puts it in the engineering list as
an exclusion — *"Not in the list: `bracketDelta` on any add surface."* Those five sentences are
the *verdict's* vocabulary now, and land with the surfaces that explain a determined verdict
(PR 4b and PR 9). Transcribing them here would ship a copy module nothing calls.

## Not a gap: the About entry

Deck analysis is a multi-round feature line, so its About entries batch at the end of the launch
(`AGENTS.md`, ruled 2026-09-21). The surface plan names the batched task.
