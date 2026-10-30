# Help me choose — addendum: three new answers (approved 2026-09-26)

> Extends R1 (approved 2026-09-24). **Everything in `../HANDOFF.md` stands**; this adds three answers and changes
> nothing else. Canvas: `The 99 - Help Me Choose · Three Answers.dc.html` (§A0 key, §A1–A4 at 1300 and 390).
> Frames: `Help Me Choose Answers.dc.html`, R1's frame plus scenes `hugh`, `hughform`, `hughnarrow`, `hughzero`.

**Trigger.** Hugh's query returned nothing: *"I want a deck from the HOB or HOC sets using cards I own. The
commander can be one I have to buy. Tribal options are Orcs, Elves, Dwarves, or Wizards."* The four tribes were
read as all four at once, and the sets and "cards I own" ended up under Not used.

**Locked, not redrawn:** no model call is added, and the free match stays the default. Owned and unowned
commanders stay listed together. The "too narrow" never-zero fix and type-line tribe matching belong to engineering.

## 1 · Themes as any of

- **Form.** An **All / Any** segment at the right of the Theme label. It uses the color control's geometry (2px
  inset, 26 / 36 segments, `--elevated` on the selected one) and is **greyed until two themes are picked**. Like
  Any / Exactly, it keeps its value. Default **All**, today's behaviour. The caption states the rule: *All of
  these: a commander has to fit every one.* / *Any of these: a commander fits if it fits one, and ranks by the one
  it fits best.*
- **Words.** The free match reads theme names joined by **"or"** in one phrase as Any. Commas or "and" read as All.
  There is one join for all themes. If the control holds two or more themes, its join wins (R1: the control wins).
- **Chip.** Any-of is **one chip**: kind `any of`, names at 12.5 `--fg-body`, a mono 10 `--fg-faint` *or* between
  them. The accessible name is *Any of Orcs, Elves, Dwarves or Wizards*. All-of stays as one `theme` chip each.
- **Rank.** Within an any-of group, a commander's value is its **highest** figure. Across answers it's still the
  **lowest** (R1 §4.4), so the rank is min(max of the group, each other answer). The limiting figure is lit and
  tagged **SETS RANK**. Other themes in the group that it fits are shown dimmed, and ones it doesn't fit aren't
  shown. That's how a row says which theme it fits. The order line reads *Ordered by the theme each fits best*.
- **Too narrow.** When All is the reason for zero, the lead option is the join itself: *Any of the four themes, not
  all* (from `narrow.widenColors`), with its reason line.

## 2 · A set answer

- **Form.** A **Sets** field between Theme and the 99. It uses the **Set trigger's count treatment (#1050)**:
  `Set 0` / `Set 1` / `Sets 2`, width reserved for `Sets 9` so it never grows, accent border once something is
  chosen, and the shipped searchable `FilterPanel` over the **whole catalog** (not only owned sets). The names are
  chips beside it (`--elevated`, 26, ✕), each a mono code then the name: `HOB The Hobbit`. Caption: *Only
  commanders printed in one of these. Leave it empty for every set.*
- **Multiple sets are always "or".** A commander is printed in one set or another, so there's no join control.
- **Words.** Set codes and set names are matched for free against the set list (deterministic, like card names).
- **Chip.** Kind `printed in`, **codes only**, mono 12 / 600 `--fg`, joined by *or*: `HOB or HOC`. The chip stays
  one width whether it holds one set or five, and the accessible name gives full names.
- **Beside the count.** The results print no total (R1 §4.7), so the chip carries no count. It only appears
  next to a count in a narrow option (*Drop HOB or HOC · 61 commanders*), named the way the chip names it.
- **Row.** A mono 9.5 code tag after the pips (1px `--border-strong`, radius 4), titled with the set name.

## 3 · Build from what I own

- **Form.** **Cards for the 99**: two segments, *Any cards* (default) / *Only cards I own*, styled like Bracket.
  Caption, when on: *The 99 comes from your collection. The commander can still be one you'd buy, and it's priced
  on its own.*
- **Budget beside it.** Today the budget caps commander and cards together. With own-only there's nothing to buy
  for the 99, so the **budget caps the commander only**. The label stays; the caption changes: *With the 99 from
  your cards, this caps the commander only. It never ranks.* The fill never buys under own-only; missing slots
  are basics, as the fill already finishes.
- **Words.** A fixed phrase list (*cards I own*, *from my collection*, *what I have*…, eng's list) sets
  own-only. *The commander can be one I have to buy* restates the default, so it's absorbed and not listed under
  Not used.
- **Chip.** Kind `the 99`, value *from cards you own*, tail mono 9.5 `--fg-faint` *commander owned or not*.
- **It never narrows and never ranks.** It is never offered as a loosening.
- **Row.** The ownership line splits. First the mono 9.5 **COMMANDER** label, with the commander's own mark:
  `OwnershipDot` *owned · free*, `AvailabilityGlyph` *none free — in {deck}*, or `BuyTag` *buy · $4.20*. Then
  `· 99 from your cards · 58 of its usual 99 are yours`. Best-fit cards carry the same line.

## Hand-off

`CreatePreFilled`'s *Built from your answers* block gains rows for the three answers. The seeded intent line reads,
for example, *Built around Thorin: any of Orcs, Elves, Dwarves or Wizards, from HOB or HOC, the 99 from cards you
own.* It isn't redrawn; R1 §6 applies.

## Most likely to break

1. **Any-of ranked by the lowest figure**, which is today's zero. Within the group, rank by the highest.
2. **Own-only narrowing the list or hiding unowned commanders.** It scopes the fill and the price line only.
3. **The budget still counting the 99** under own-only.
4. **The set chip growing with names.** Codes on the chip, names in the form and the accessible name.

Fixture names (Thorin, Thranduil, Azog…) are placeholders for the HOB / HOC commanders. Copy: `addendum · copy strings.ts`.
