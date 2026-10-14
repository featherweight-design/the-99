# R4 — Ratification pass on #43 (card availability)

`design/design_handoff_the99_availability/` · 2026-09-02 · **ratification, not a handoff**

#43 shipped whole on 2026-09-01 — marker, `Score against` toggle, `Availability ▾` filter and the
deck roll-up are live on main. This pass ratifies calls the build took. **Nothing in R1/R2/R3 is
reopened, no canvas is redrawn, and `availability · copy strings.ts` is not edited** (see
*Constraints*, below).

Canvas: `The 99 - Availability Ratification (R4).dc.html`.

**Verdict: 🟡 Yellow, on a missing input — not on a design question.** Everything the brief states
in full is answered. Six items named only by number are held because the file that states them is
not in this tree. See `R4-READINESS.md`.

---

## 0. The missing input

There is **no `ADDENDUM-2-READINESS.md`** in this folder, and no section called *Resolved
engineering-side — Design to ratify, not to redraw* anywhere in the project. Present are R1's
`README.md` / `READINESS.md`, R2's `ADDENDUM-README.md` / `ADDENDUM-READINESS.md`, and R3's
`ADDENDUM-2-README.md`.

**Items 1, 3, 4, 5, 6 and 10 are therefore held.** Ratifying a number I can't read is a rubber
stamp, not a review. Nothing in the answered set depends on them, and none of them looks likely to
disturb what is here — drop the file in and they land in one pass.

---

## 1. Item 11 → **the track holds; the pips shingle**

The only drawing call in this pass, and it predates availability entirely — the sweep found it.
Five mana pips overrun the `/collection` row's pip track at both widths: track `40px` phone /
`54px` desktop, five pips measure `67px` / `81px`.

**Not a wider track, not a wrap, not a `+2` affordance. Pips overlap by 45% of their own width
once there are four or more of them** — a shingle, like a fanned hand — and every colour stays
visible inside the shipped track.

- Widening moves a grid the last two passes went out of their way not to move, for the rarest row
  in a 1,418-row list.
- Wrapping breaks constant row height, which is the whole argument for the marker being inline.
- An overflow token hides colour identity, which is the one thing this cell exists to say.

**Five is the ceiling.** Colour identity cannot exceed WUBRG, so unlike a deck name this overflow
has a known worst case — solve it exactly once, never write a truncation rule. **One to three pips
render pixel-for-pixel as they ship today**; the shingle engages only where the row was already
broken.

### Spec

| | Value |
|---|---|
| Track | **unchanged** — `38px 40px 1fr auto` and `52px 54px 1fr 150px 92px 18px` ship as-is |
| Pip | 11px phone / 13px desktop, unchanged |
| Step, 1–3 pips | 14px / 17px — today's gap, unchanged |
| Step, 4–5 pips | **6px / 8px** → `margin-left: -5px` at both widths |
| Order & z | WUBRG left→right, **z descending**, so each pip's left edge sits above its neighbour |
| Ring | `0 0 0 1px` in the row's own background token — `--surface`, or `--elevated-hover` on hover |
| Row height | 34px / 44px, untouched — this is a horizontal fix only |
| Accessibility | unchanged; pips stay `aria-hidden`, colour identity is already in the row label |

**The ring is load-bearing, not decoration:** `--b` is `#1E1B1A` against a `#1E1A15` surface, so
without it black beside black is one shape. It is not a new token.

Measured, all five counts: phone `11 / 25 / 39 / 29 / 35`px against a 40px track; desktop
`13 / 30 / 47 / 37 / 45`px against 54px. Shipped-today figures for comparison: phone `53 / 67`,
desktop `64 / 81`.

**Worth saying out loud:** this is the third thing in this feature's history solved by *taking
space that already exists* rather than asking for more — the marker borrowing `1fr`, the deck name
dropping on collection, now the pips fanning. If a fourth shows up, the pattern is the answer.

---

## 2. Item 8 → **ratified, both halves**

**`none free` over `0 free`.** The marker is read, not counted. On a decklist row it lands as
`×1 owned · none free` — two numerals a bullet apart parse as a table; a word beside a numeral
parses as a sentence. It matches the soft state, which was always word-first (`1 in a brew` is a
count that *needs* to be a count), and it makes the visual and aria strings finally agree — the ear
already heard *"no free copies"*.

**The over clause unifies on `also in`,** which retires `decks want it` everywhere. Two phrasings
for one state was R1's drift risk. *Want* also personifies a list — exactly the overclaim the copy
file's own header bans: `also in` describes a list's contents, `wants it` gives it an appetite.

**But `hard` keeps plain `in`, and the asymmetry is deliberate — don't let a future sweep "fix"
it.** Hard's clause says *where the copies went* (`none free — in Atraxa`); over's clause says
*who else is holding one, from where you're standing* (`short 1 — also in Kykar`). `also` is only
true when there is a first — the deck you are inside. On `/collection`, where you stand nowhere,
there is no `also` to earn.

### The sweep — four edits, applied together

| Key | Shipped | Ratified |
|---|---|---|
| `marker.hard` | `0 free` | **`none free`** |
| `marker.hardIn` | `0 free — in Atraxa` | **`none free — in Atraxa`** |
| `marker.hardMulti` | `0 free — across 3 decks` | **`none free — across 3 decks`** |
| `marker.overWithDemand` | `short 1 — 2 decks want it` | **`short 1 — also in 2 decks`** |
| `marker.tileOver` | `2 decks want it` | **`also in 2 decks`** |
| `marker.overAlsoIn` | `short 1 — also in Kykar` | unchanged — it was the model |
| `marker.over`, `marker.soft`, all `*Aria` | — | unchanged; no numeral collision, no clause |

---

## 3. Item 9 → **`cards scanned` ratified as the header noun**

*Scanned* is the honest verb for what the job did: it looked at every card and formed no opinion
about most of them. *Checked* implies a pass/fail, *searched* implies the player asked for
something, *read* is engineering's word rather than a player's. It also sits correctly under the
no-candidates empty state, where the count is the consolation — *we looked at all of them* — and
that is the one place the noun carries weight. No sweep needed.

---

## 4. Post-dates the file → **one new key, and a symmetry rule**

Correct diagnosis, same shape as item 2's count-only `hardAria`. Every `*Aria` key in the over
family takes a deck count or a deck name; a read that returns *how short* but not *how many lists*
has nowhere to put the number, so the caller falls back to a key that drops it — and the shortfall,
the only fact the marker actually has, goes unspoken. **Silence is the default for a free card,
never for a degraded one.**

```ts
// Counts only — no deck name, no deck count. For a degraded read
// that resolves the shortfall but not the claimants. Describes lists.
overAriaCountOnly: (shortBy: number) =>
  shortBy === 1
    ? 'one copy short for the lists that include it'
    : `${shortBy} copies short for the lists that include it`,
```

**Name it to match item 2's.** If the count-only hard key shipped as `hardAriaCountOnly`, this is
`overAriaCountOnly`; if it shipped as `hardAriaNoDeck`, use that suffix. **The pair matters more
than either name** — the next person to add a state will copy whichever pattern is visible.

### Which key fires, by what the read returns

| Read | Key |
|---|---|
| Full — counts + names | `overAria` · `overAlsoInAria` |
| Counts, no names — deck count known | `overAria` (already count-only, unchanged) |
| **Shortfall only — no claimants at all** | **`overAriaCountOnly` — new** |
| No read — availability unavailable | none; marker absent, fails quiet per R2 |

**The rule this establishes, so the sweep ends here:** every marker state that names a deck needs a
sibling that doesn't. Three states name decks (hard, hard-multi, over) and a degraded read can
strip the name from any of them, so **the count-only variant is part of the state, not a fallback
bolted on later.** That is one line in the copy file's header and it is the durable half of this
answer.

---

## 5. Placement call → **§3.1 is the thing that's wrong**

§3.1 appends the marker to `×N owned` on a shared meta line. **The shipped decklist row draws
neither**, so the table was describing a row that doesn't exist — the build didn't deviate, it
found a stale spec. The `×N owned` host was chosen because it let the marker ride an existing
string rather than claim a column; **the name cell does the same job**, and it is the same slack the
collection row borrows in addendum 2. One reduction, two surfaces, same reasoning.

§3.1's hard constraints hold as written — **no new grid column, 34px / 44px row height.** Two
things to pin while amending:

- **The name yields, the marker doesn't.** Marker is `flex: none`, name truncates — a clipped name
  beside a legible marker beats the reverse, as on collection.
- **Marker before the buy tag, always.** The buy tag is an action; the marker is a fact about the
  card. Fact then action, left to right, and the tag keeps the row's right edge.

Amend §3.1's placement sentence; its constraints stand unedited. **Nothing on screen changes.**

---

## 6. #242 → **amend table 15.10 to `listbox`**

Eng is right and the table is over-specified. A `role="combobox"` search field owns a `listbox`
popup; ARIA 1.2 offers no variant where it owns a checkbox group. **The panel's search field is the
load-bearing part** — ~14 options with counts is exactly where search stops being optional — so the
role follows from a decision already shipped and correct.

**What 15.10 was protecting was multi-select, and `aria-multiselectable` protects it.** "Checkbox"
in the table was shorthand for "more than one at a time", which is why `Sort ▾` is deliberately
*not* this panel. Amend the row to name the behaviour instead of the widget: **multi-select,
`aria-multiselectable="true"`, selected state on each option, no exclusivity.**

Keep in the amended row, because it is what a reader will check: each option's accessible name
still carries its count ("In use, 61 cards"), and **zero-count options stay `aria-disabled`, not
removed** — a menu that changes length between players is worse than one with dim rows. Checkbox
visuals may stay if they already ship; the role is the amendment, not the pixels.

---

## Constraints

**The frozen record stays frozen.** `availability · copy strings.ts` in this folder is unedited.
Item 8's sweep and `overAriaCountOnly` land in the **shipped** `src/lib/copy/availability.ts`;
`R4 · copy diff.ts` is the patch to apply there.

One thing to carry across: the record's header says vocabulary is load-bearing and a swap happens
in **every string at once, never on one surface**. That paragraph is why this is a sweep and not
four edits — it should exist in the shipped file too, updated to name `none free` / `also in` and
the count-only pairing rule. A frozen record can't enforce anything; the file eng edits can.

**Every colour restated here is a token, not a hex.** The marker's four states resolve per theme
with no per-theme rules.

| Marker part | Token |
|---|---|
| Soft glyph + label | `--avail-soft` → `--fg-muted` |
| Hard glyph | `--avail-hard` → `--accent` |
| Hard label on scrim | `--avail-hard-fg` |
| Over label | `--avail-over-fg` |
| Over row border | `--avail-over-border` |
| Pip ring (item 11) | `--surface` / `--elevated-hover` |

`--avail-soft` and `--avail-hard` are **`var()` aliases, not literals** — per the theme token table,
flattening them to hexes is a silent bug. The over pair holds a literal on purpose: severity
shouldn't reskin.

**One flag for the theme pass, not a change request:** the hard glyph is `--accent` in all six, and
on Neon Rain that is `#FF4D9A`. The marker inherits the loudest colour each theme has — correct on
Gilded Stone, worth *looking at* once on Kamigawa and Duskmourn, where accent is also the
primary-action colour. Check it on a real row before beta.

---

## Files

- `The 99 - Availability Ratification (R4).dc.html` — this pass's canvas. Item 11 is drawn live at
  both widths for all five pip counts, shipped and ratified side by side; three tweaks
  (`overlapFrom`, `showShippedOverrun`, `pipRing`) exist to test the constraint, not to leave open.
- `R4-README.md` — this file.
- `R4-READINESS.md` — verdict, the held items, and what closes them.
- `R4 · copy diff.ts` — the patch for shipped `src/lib/copy/availability.ts`. **Not** an edit to the
  frozen record.
- R1/R2/R3 documents and all three earlier canvases: **unchanged.**
