# Handoff: Add a partner to an existing deck (#491), R1

Account 2, 2026-11-21. Status: **R1, awaiting Hugh's review.** No handoff PR yet.

Canvas: https://claude.ai/artifact/3NbaxtK9hwjoTxmxa96Pob (boards Main, Door, List, Confirm, States, After, Rules).
Drawn over the shipped Change commander sheet (`change-commander-sheet.tsx`), its confirm (Plate + fates),
Suggested changes' cut line (`suggested-changes-pick-line.tsx`), the deck toast (`ToastFrame`), the review
Commander section and version history. Fixture: HD - Ishai (Ishai, Ojutai Dragonspeaker, W/U), 99 cards, 37 lands, v3.

Removing a partner is out of scope (#492).

## The calls

1. **Both doors.** Change commander gets an **Add a partner** section above the shipped list, which is now headed
   **Replace {short}**. The commander's card details on its own deck page gets a **Second commander** box (card facts
   box style) whose button opens the sheet on that section. Neither appears unless the deck has one commander and
   that commander prints a pair ability. Behind `CHANGE_COMMANDER_ENABLED`.
2. **Finding one.** Yours first, then To buy (first 5, Show all), each ordered by the shipped figure for the pair.
   Rows reuse the candidate row: art Thumb, name (opens card details), Mark (free / held in another deck / buy with
   price), cost, figure button, Choose. A row adds **widens to** with pips and the guild/shard name when the pair
   adds colors. A partner already in the 99 sits in this section with **in this deck · nothing leaves** (the shipped
   pairUpKeep case, which moves out of the shipped groups).
3. **The card that leaves.** A deck at 100 needs one cut. Suggested changes' Pick line, three suggestions, the first
   already picked so one tap confirms: a basic land while the deck runs 37+ lands (two commanders usually run 36),
   then the two cards the pair's decks run least. **Cut another card** searches the 99 and lists matches as the same
   lines. Exactly one pick; picking moves it. The out Plate and the sentence follow the pick.
4. **Wider colors.** A pair's identity is never narrower, so nothing becomes illegal. The confirm says
   **The deck becomes {name}.** with pips, and a figure-style button, **{n} of your {colors} cards are in their decks**,
   opens the names (owned cards in the new colors the pair's decks run).
5. **Room.** A deck under 100 has no cut section; the sentence says nothing leaves and gives the count after.
6. **Confirm, undo, history.** Shipped pair CTA (**Make {a} and {b} commanders**). It lands in pending changes as
   shipped; Discard puts the deck back. A deck toast follows with **Undo**, which restores the single commander and
   the cut in one write. On a brew (no version) the toast is the only way back, and the confirm says so. Review:
   shipped Commander section, **a partner joins**; the cut is in Going out. History: shipped
   **Ishai → Ishai & Bruse Tarl** line with the cut in the diff.
7. **Every ability.** Partner, Partner with (one row), restricted Partner (same label only), Friends forever,
   Choose a Background, Doctor's companion (both directions). Same flow; the section title, rule line and listed
   cards change.

## States

| Board | Frame | State |
|---|---|---|
| Door | D1 phone, desktop | Card details with the Second commander box |
| List | L1 phone, desktop | Add a partner section, Yours + To buy, Replace Ishai below |
| List | L2 phone | A partner's figure open |
| Confirm | C1 phone, desktop | Suggested cut (Plains) picked |
| Confirm | C2 phone | Another suggestion picked, the opened colors listed |
| Confirm | C3 phone | Cut another card: search "pon", Ponder picked |
| States | C4 phone | A partner to buy (Thrasios, Bant) |
| States | C5 phone | Deck has room, no cut |
| States | C6 phone | No version yet (brew) |
| States | C7 desktop | Write failed, Try again, pick kept |
| After | A1 phone, desktop | Deck page under the pair, Undo toast |
| After | A2 phone | Review Commander section, "a partner joins" |
| Rules | V1 | Choose a Background (Lae'zel) |
| Rules | V2 | Friends forever (Hargilde) |
| Rules | V3 | Doctor's companion (The Tenth Doctor) |
| Rules | V4 | Partner with (Pir, only Toothy) |

Loading and a failed list read are the shipped sheet's, unchanged.

## Engineering

- **G1** `canPair` (`src/lib/decks/partner.ts`) has no Background kinds. Choose a Background + Legendary Enchantment — Background, either order; a Background never leads alone.
- **G2** A write for an outside partner with a cut, e.g. `changeCommander(deckId, to, { cutOracleId })`, re-validated on the server: refused when the cut isn't in the 99 or is locked, or when the deck would end over 100. `offerable()` stops holding the outside case back.
- **G3** Toast Undo: restores the single commander and the cut card in one write, only while the draft still holds that change unchanged.
- **G4** Cut suggestions: lands vs 36, then least-run by the pair's support list (the `growingHits` read). No model spend.
- **G5** The opened-cards count and list, from the same support list.
- **G6** A deck already over 100 is not offered the add until it's at 100 or under (not drawn).

## Questions for Hugh

1. Both doors (as drawn), or Change commander only?
2. Backgrounds drawn as supported, which needs G1. Keep, or leave for later?
3. The toast Undo is new on this flow. Keep it, or rely on Discard (no way back on a brew)?

## Final copy

`copy/partner-add.ts` (proposal, for `/copy-review`). Reused shipped copy: `cc.sheet.figure`, `cc.confirm.ctaPair`,
`cc.confirm.failedRetry`, `pairUpKeep`, the review `notePartnerAdded`, history `commanderPair`, Pick line labels.

## Files

- `canvas.json`, `*.dc.html`, `art/*.webp`: the canvas.
- `copy/partner-add.ts`: copy.
- `scratch-gen/`: `partner-add.tsx` (proposal components: PartnerDoorBox, PartnerRow, AddPartnerSection,
  PartnerConfirm), `change-commander-sheet.exports.diff` (exports Mark, Thumb, Plate), `render.tsx` (fixtures and
  21 frames, SSR with shipped CSS), `shoot.cjs` (Playwright 2x), `gen_boards.py`. Card images came from Scryfall via
  the built-in browser.
