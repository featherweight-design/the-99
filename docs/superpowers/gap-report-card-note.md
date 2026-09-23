# Gap report — the card note (PR 8b)

Against `design/design_handoff_the99_push_line/` (Round 4 of 5, R1), audited 🟢 Green at R3 on
2026-09-21. Read with `docs/superpowers/inventories/card-note.json` and the contact sheet it
produces, and with `pnpm probe:card-note`.

**Scope:** the note on the deck page's add surfaces — the Consider tile and the top-off row
(PR 8b), and the quick-add result row (PR 8c, section at the foot).

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
shipped the same statement on the same two rows first — the combo clause, drawn since 2026-09-22
as the lemniscate and the partner's name with the sentence spoken, and a key entry glossing the
glyph — and both hosts render it today
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

---

## PR 8c — the quick-add result row

§C's host matrix names three hosts; this is the third. `STATES-push-line.md` §C: *"Quick add result
row · sentence · below the row's line, inside its box · 52px meta row, atom unchanged"*, and §C2's
*"Card row (quick add, top-off): inline after the name"* for the marks.

| Asked for | Where it is | Proof |
|---|---|---|
| The sentence density on the row | `quick-add-bar.tsx`, `CardNote density="row"` | probe: 12.5px resolved, both widths |
| Below the row's line, inside its box | the option's last child, under `CardSearchRowBody` | probe: note rect inside the option |
| NOT indented — flush with the row's content edge | `CardNote` with no padding of its own | probe: label at the row line's own edge (13px at 1300, 11px at 390) |
| No reserved height | `CardNote` returns null for a card with no fact | probe: un-noted rows 18px below the line, noted from 71px |
| Marks inline after the name | `card-search-row.tsx`, `marks` beside `search-row-name` in one non-growing line | probe: 16px, 7px past the name's TEXT (via a Range), same line |
| `aria-hidden`, spoken by the row | both drawn hidden; the option's `aria-label` carries the marks then the note | unit + probe: spoken in the option's name |

**The payload answer is not 8b's.** The two pool-fed hosts read `loadCandidateFacts`, whose
expensive half is `completesCombos` — a question about the deck. The note reads none of that
(n8 is not drawn), so its input narrowed to `CardNoteFacts`, the four card-level facts, and
the search reads them on its own row: `game_changer` is on `cards`, the tutor reading is
`classifyTutor` over the oracle text the search already selected, and the two flags are a left
join onto `card_bracket_flags` — 163 rows on staging, 0.04ms for twenty ids. No keystroke pays a
round trip for it.

**The indent is the top-off row's, not this one's, and the first build carried it over.** §C's
host matrix gives *"sentence, indented to the name column"* to the top-off row alone and says
*"atom unchanged"* for quick add, and the canvas's quick-add artboard (§1c) draws the note with
no left padding at all. The first build indented it 42px to the name, by analogy with the host
it had just been built beside; the design-review enumerate pass read the matrix row by row and
found it. The probe asserts the flush edge now, and the inverse mutation — the indent put back —
fails at both widths.

The other conflicts that pass recorded (`docs/superpowers/design-tables/card-note-quick-add.md`,
C1–C11) are the ATOM's — margin, leading, label gap, the tile's cap — and the atom is 8b's,
reviewed there and shared by all three hosts unchanged, which is what "atom unchanged" asks.

**Verify pass: 0 gaps introduced by this PR.** It reported two against the table, and neither is
this PR's. The mark's glow reads `3px`/sRGB against the push-line canvas's `4px`/OKLab — but the
mark's OWN handoff (`design_handoff_the99_card_mark/CONTRAST-the-card-mark.md`) specifies 2–3px,
and the shared atom follows its owner, not a later drawing of it. And the canvas's five glyphs
after the name are three today: the lemniscate is placed by #864's ruling (meta line on the
phone, its own line on desktop), and the tutor's mark is the separate PR named below. n8 is
unreachable by the standing decision recorded in `src/lib/bracket/card-note.ts`. The row box's
own padding, radius and name weight differ from the canvas's simplified row and predate this PR.

**The ordinal keys on the committed list, not the optimistic one** — the trap the Consider tile
fell into in 8b, closed here from the start and pinned by a test whose action never settles.

**No key on this surface, deliberately.** The row's note names every fact it carries in words,
on the same row as the mark, and each mark carries its own hover. A key in a results popover
would cost the list a line on every search to gloss what the row beside the glyph already says.
The one case that would not hold is a card carrying three facts, where the row's cap of two drops
a sentence. None exists: measured on staging 2026-09-22, no card in the catalog carries two of
game changer, mass land denial and extra turns, so a third fact would need a flag the data does
not have. The commonest pairing is a flag plus a tutor — 12 game-changer tutors and *Twice Upon a
Time* — which is exactly two.

**The mark's tooltip opens below when a scroller would clip it**, found by the pre-open pass. The
bubble is `position: absolute` inside its mark and always opened above; the results list is its
own `overflow-y-auto` box, so on the first row the bubble was cut off by the list's top edge —
measured at -2px with the flip removed, and a wrapped two-line sentence is cut by more. The fix is
in `FactTooltip` rather than here, because the top-off list's desktop box is a scroller too and
drew the same mark from #859: at open it measures the room above the mark inside the nearest
clipping ancestor and takes the other side when the bubble would not fit.

**The resolution search draws no marks.** It shares `CardSearchRowBody` and answers "what was
this line?", where the bracket rules are not the question — the same reason it takes no combo
partner.

**Still owed:** the tutor's own mark, which `TutorGlyph` (#863) now makes drawable. It goes on
every surface a fact mark draws, as a separate PR with a stored tutor flag behind it.

