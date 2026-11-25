# Addendum: insert a fill-in (ed-fill), R1

Light addendum to this handoff, 2026-11-25. Boards: `Insert-Main.dc.html`, `Insert-Phone-F1..F3.dc.html`,
`Insert-Desktop-F1..F3.dc.html`. Drawn over the shipped editor (`src/components/copy-editor/editor.tsx`,
`fill-field.tsx`) on Help me choose, line `help-me-choose · intake.colorsAny`, its fill-in renamed `{colorNames}`.

## Ruling this addendum follows

Hugh, 2026-11-25: fill-in chips are no longer "moves, never deletes". An editor can remove a fill-in and insert one,
like inserting a variable. This replaces README row 4 ("chips that drag but can't be deleted") and line 54
("Moves, never deletes") for the chip. Everything else in R1 stands.

Locked by the brief: a line only uses fill-ins its code supplies; the insert list is that set minus the ones in the
text. Names become semantic (`{toolCount}`, not `{tools}`). The chip keeps its drag and its look.

## States

Art: `art/ce-<p|d>-ed-fill-<state>.webp` (phone 390 at 2x, desktop 1300 at 1.5x). These sit beside STATES.md row 5.

| # | State | Art | What shows |
|---|---|---|---|
| 5a | Fill-in removed, offered back | `ed-fill-removed` | The editor took `{colorNames}` out (✕ or Backspace). Field reads "Any color identity."; under it `Insert at cursor` and one dashed button `+ colorNames  White and Blue`. 3 words, preview. |
| 5b | Insert open, placing | `ed-fill-insert` | Caret between "with" and "in it."; the button hovered (desktop) or pressed (phone) and a faint dashed chip at the caret where it will land. |
| 5c | None left to insert | `ed-fill-none` | The chip is back with its ✕; no insert row. Note: "{colorNames} reads “White and Blue” here. Drag it to move it, or select ✕ to take it out." |

## Decisions

### I1. The insert control
- Directly under the New field (8px), above the word count, notes and preview: it acts on the field.
- Mono 10.5px caps label `Insert at cursor` (`--fg-faint`), then one button per fill-in the line supplies and the
  field doesn't use. No menu: the list is one or two items, so they sit in view.
- Button: height 32 (desktop) / 40 (phone), radius 8, `1px dashed` 55% accent, transparent, `+` glyph, the name in
  mono 12 `--accent-text`, the value in sans 13 `--fg-muted`. Hover or press: solid border, 16% accent fill.
- Selecting one puts the chip at the field's caret; the field keeps focus (phone keyboard stays up); the caret ends
  after the new chip. No caret placed yet: it lands at the end. The button leaves the row once its fill-in is in.
- Multiple items wrap under the label at phone width (drawn on Main with `playerName · Wren`, `toolCount · nine`).

### I2. The chip's ✕
- Always visible, after the name, on both widths. Chip otherwise unchanged (grip, mono 12, 16% fill, 55% border, radius 6).
- 10px stroke ✕ in a 16px round target, accent colour; desktop hover fills it 55% accent. Phone: 36px hit box
  centred on the ✕ (invisible), so a tap there never starts a drag. Grip and name still drag.
- Backspace or Delete beside a chip removes it too.
- `Now` keeps today's chip with no ✕ (Now isn't editable).

### I3. None left
- No row and no message. The note says ✕ takes it out; once one is out, it appears under the field.

### I4. Showing today's value
- In the note and on the insert button, never on the chip. The value is the text this page shows for that hole,
  from the matched visible text. A fill-in this page doesn't show today: name only, and the fallback note.

### I5. Note copy (replaces `editor.fill`)
- With a value: `{name} reads “{value}” here. Drag it to move it, or select ✕ to take it out.`
- Without: `{name} is filled in by the app. Drag it to move it, or select ✕ to take it out.`

## For engineering (suggested)
- Insert list = row's supplied fill-ins minus those in the field's value, recomputed on input. Values from the
  pattern captures in `src/lib/copy-editor/match.ts` (a `how: "pattern"` match knows each hole's text).
- Buttons `preventDefault` on pointerdown to keep the field's focus and selection; insert at the saved range.
  Keyboard: Tab goes field → insert buttons; Enter inserts and returns focus to the field after the chip.
- Validator: drop the "fill-in missing" refusal; still refuse braces naming a fill-in the code doesn't supply.
- New strings for `src/lib/copy/copy-editor.ts`: `editor.insert` "Insert at cursor",
  `editor.insertLabel(name)` "Insert {name} at the cursor", `editor.removeFill(name)` "Remove {name}",
  `editor.fill(name, value?)` per I5.
- `scratch-gen-insert/gen_ins.py` builds the boards; `art/ce-d-ed-fill-base.webp` is the R1 page with the old
  popover cleared (patched from `ce-d-target`).
