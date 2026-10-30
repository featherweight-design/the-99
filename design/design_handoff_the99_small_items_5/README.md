# The 99 · Small items 5 (account 2, 2026-10-30)

Canvas: https://claude.ai/artifact/EBiLRhpUNzdtn7Vcfs8D4f
Status: APPROVED by Hugh on 2026-10-30 ("This all LGTM") with the recommended call on every item. See READINESS.md.

Three small items, each drawn over the shipped surface it changes, at 390 and 1300. Brief: Hugh's "Three small items" design prompt, 2026-10-30. Everything not listed here stays as shipped. Strings marked as drafts are for /copy-review.

Open `Main.dc.html` for the calls, or a board's page; each needs `support.js` and `art/` beside it. `scratch-gen/tg.py` builds Main and the two tag boards over the overview_stages kit (`design_handoff_the99_overview_stages/scratch-gen/scg`); `scratch-gen/tw.py` builds Header-Art and Offer-Empty over the announcements kit (on `design-assets`, `account-2/design_handoff_the99_announcements/scratch-gen`).

Sources read: main @4c7ef47; `src/components/decks/{tuning-notes-field,deck-description-field,analysis-empty,tuning-panel,spine-desktop,spine-mobile,game-log-form}.tsx`, `src/components/decks/notes/note-field.tsx`, `src/components/cards/{tag-help-row,card-tag-picker}.tsx`, `src/components/intake/intake-form.tsx`, `src/components/decks/precons/open-precon-view.tsx`, `src/components/ui/commander-thumb.tsx`, `src/components/home/whats-new.tsx`, `src/lib/copy/{deck-description,deck-notes,help-me-choose,deck-tuning-games,game-log,feed}.ts`, `src/lib/feed/kinds.ts`; handoffs suggested_changes_v2 (`Intake.dc.html`, `.ft2`), deck_notes (R4), announcements (Offer, Early-List, Release-Arrival). The "Today" analysis capture is Hugh's `d-analysis-describe.webp` (suggested_changes_v2 art).

| Board | Item |
|---|---|
| `Main.dc.html` | The calls |
| `Tag-Control.dc.html` | 1 · Tag a card: the control, its states and anatomy |
| `Tag-Places.dc.html` | 1 · Tag a card: the five places (a–d) |
| `Header-Art.dc.html` | 2 · Precon page header art |
| `Offer-Empty.dc.html` | 3 · The offer when What's new is empty |

## 1 · One tag-a-card control

**Call: every box that takes a `[[` tag draws Suggested changes v2's request box** (`TuningNotesField framed`): one frame, the words on top, a foot row inside it with a bordered **[[ ]]**, the words **tag a card** and the counter at the right.

1. **Frame.** 1px `--border-strong`, radius 9, the field's own fill (`--surface`, or `--surface-sunken` where the field is sunken today). `--accent` on focus-within; `--danger` where the field already turns red. The deck page header's description stays dashed.
2. **Words.** The textarea or input with no border of its own, padding 10 12 4; it grows where it grows today. A one-line field (notes, game-log note) stays one line: Enter and whitespace folding unchanged.
3. **Foot.** Inside the frame, padding 2 12 8, gap 8, mono 11 `--fg-faint`: the key (24 high, radius 6, 1px `--border-strong`, padding 0 8, `--fg-muted`, aria-label "Insert a card tag"), then *tag a card* (aria-hidden), then the counter, `margin-left:auto`, tabular.
4. **The key.** Writes `[[]]` at the caret, caret between, opens the shipped `CardTagList`; mousedown prevented so the field keeps focus and a phone keyboard stays up. **Lit** (`--elevated`, `--fg`) while the caret is inside an open tag, in every box (from deck notes R4).
5. **Counter.** Always drawn, from `0 / N`. Each box keeps its cap and warn mark: description 240 (warn 220), deck note 140 (warn 120), game note 140 (warn 130), Anything else? 800, Additional notes / request 500. `--warning` from the mark, `--danger` over the cap where a paste can exceed it.
6. **Coarse pointer.** The key stays drawn 24 high; its hit box grows to 44 by padding. This amends the shipped framed box, which grows the drawn key to 44 (`pointer-coarse:h-[44px]`).
7. **The ⓘ** stays where each field has it (beside the label; inside a one-line field's right edge for notes). Its lines differ per box, so it is not the key.
8. **Engineering.** Lift the framed foot out of `TuningNotesField` into one shared piece (for example `TaggedBox` around `useTaggedField` / `useCardTagPicker`) and use it in every place below. `TagHelpRow` loses its button (or retires where the label row is otherwise plain).

### The places

- **(a) Deck description fields.** `DeckDescriptionField` (Analysis, empty state) and `DescribingInPlace` (Suggested changes): the key leaves the label row; the counter leaves the help line, which keeps its words. Blur still saves the empty state's field; the in-place editor keeps Save and Cancel.
- **(b) Help me choose, Anything else?** The 28px key leaves the `Field` header (ⓘ and *optional* stay). The counter, today under the box only once there are words, moves into the foot and always shows. The box stays sunken and turns accent while its words will be read.
- **(c) Deck notes. The foot row wins**, over both the shipped action row (counter, 44×40 key, Cancel, Add) and the deck notes handoff's R4 key (40×40 beside Add). The action row holds only **Add** (and **Cancel** in edit). Placeholder becomes *Add a note* at both widths (draft): the foot already says how to tag. See `design_handoff_the99_deck_notes/ERRATUM-tag-control.md`.
- **(d) Deck page description and the game-log note.** The header's dashed description box (spine-desktop/mobile) gains the foot, with the 240 counter (new here). The game-log note's counter (today in its label row, drawn only after focus) moves into the foot and always shows; the label row keeps *Note* and its hint.

## 2 · Precon page header art

**Call: the precon page follows the early list.** Phone 64×89 (`CommanderThumb` `summary`), from `md` 84×117 (`openWide` becomes 84×117; `open` becomes 64×89 or the head uses `summary`), radius 6, the colour ring as today. Reason: the early list's address sends the reader to the precon page when the release list lands, so at 46×64 the same card would shrink just as the precon becomes startable. Nothing else in the head moves; the meta line may wrap one word earlier on a phone. A commander pair keeps its 6px gap at the same size.

## 3 · The offer when What's new is empty

**Call: the shipped quiet line, then the same offer line as under rows.** A reader who has never chosen still has four kinds on from the start (Secret Lair drops, Commander decklists, Wizards news, friends asking for your spares), so *Nothing new right now. You hear about … here.* is true. The offer line follows as the box's last line: **Pick ▾** opens the shipped boxes in place with **Show these**; the ✕ saves an empty pick and the line is gone for good. The full opt-in panel (`OptIn`) retires. Engineering: `WhatsNew` draws `Quiet` + the offer line when `!chosen` and `items` is empty; the head's *Choose what shows ›* stays hidden while not chosen, as shipped. Amends the announcements handoff's Offer board note ("With nothing in the window and nothing chosen the box is today's opt-in, unchanged"): see `design_handoff_the99_announcements/ERRATUM-offer-empty.md`.
