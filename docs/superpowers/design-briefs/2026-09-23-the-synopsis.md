# Design Brief: The synopsis (sub-project 6)

**Date:** 2026-09-23 · **Branch:** `docs/synopsis-brief` (open as a PR; on `main` once merged)
**Spec:** `docs/superpowers/specs/2026-09-19-deck-analysis-foundation-design.md` §2.4 and the
Round 0 section (~:2116-2130), which deferred the synopsis's *content* design to this sub-project
**Frame:** `design/design_handoff_the99_deck_analysis/STATES-synopsis.md` (Round 0, merged #753)
**Chrome to reuse:** `ModalChrome` in `src/components/decks/receipt-modal.tsx`, which already carries
three bodies: the card list and the combo (#863) and the reasoning (#865)

**Verified against `origin/main` at `c476c931`.** The slot exists today as `SynopsisSlot` in
`src/components/decks/analysis-panel.tsx:211`, drawing its absent reading only.

This round asks: **what does a read-back of a finished deck look like, and how long is it?**

---

## §1 What changed since Round 0

Round 0 drew the synopsis as a short prose block (four sentences at most on desktop,
`README.md` open item 2), 15.5px in `--fg-body`, **beside the verdict, not stacked** (`README.md`
§3), with five states around it. Hugh has since set the content bar with a reference: deckcheck's "Full Synopsis"
for a Kratos/Atreus deck, which runs to five sections and several screens. He asked for most of it.
**Four sentences cannot hold that, so the synopsis becomes a short read in the tab that opens to a
full one.**

**It is drawn inside the Analysis-tab round already in progress**, not as a round of its own:
that round is drawing the tab (the Overview paragraph in the slot and a *View full synopsis*
entry point), and the modal that entry point opens belongs with it. **This brief is the
modal's half**, and it is kept as its own section of that handoff so the audit can read it
against §2 and §5 separately.

The five states in `STATES-synopsis.md` stay as they are. What changes is what the *present* state
holds, and that there is now a second place it is read.

**One Round 0 rule is amended, not reversed.** `README.md` §3 ratified that *"analysis reads the
live list, not the committed version"*. That still holds: the tab and the modal read the draft's
synopsis, written against the live list. What §2.4 adds is that committing COPIES the current
synopsis into the version, the same rule the declaration got on 2026-09-21.

## §2 Rulings, locked (Hugh, 2026-09-23)

1. **Written for the player first, and the pod second.** Its primary reader is the person who
   built the deck. The pod reading it before a game is a legitimate second use, so nothing in it
   may make sense only to the builder.
2. **It says how the deck plays and never how strong it is.** No bracket, no power, no score. The
   verdict beside it already states the bracket with receipts, and prose cannot carry receipts.
   This rules out everything like the reference's bottom panel (its "31" dial, its velocity and
   suppression figures) under the settled no-single-number ruling.
3. **Sections, from the reference:**
   - **Overview.** What the deck is and how it wins, in a paragraph.
   - **Primer**, in three parts. *Core strategy*: a short numbered sequence of the deck's plan.
     *Mulligan*: what to keep and what to send back. *Key tips*: **only interactions between
     cards in this deck**, never general rules advice.
   - **Key cards.** A named list, each with one line on the job it does *in this deck*.
   - **Weaknesses.** At most three, **untiered**. The reference's Critical / Moderate / Minor
     ranking is out: Hugh's read is that it reaches.
4. **A synopsis belongs to a version once committed, and a draft can be rewritten at any time.**
   The same rule as the declaration (2026-09-21): committing keeps the synopsis written for that
   exact list, and the version rail can show it. While editing, the draft has its own synopsis,
   which goes stale as cards change and can be rewritten on press at any point. A player
   tinkering through 14 changes can see a fresh read before committing.
5. **Written only on press**, as Round 0 already drew (`Write one`, `Write it again`). Never
   automatic, never retried silently.

## §3 What Design is asked to draw

### 3.1 The short read in the tab

Already being drawn in the Analysis-tab round (§1). This brief asks only that the Overview there
follows §2 and §5 too, and that its card names open the card, as the modal's do.

### 3.2 The full synopsis, as a fourth body in `ModalChrome`

Not a new modal. The receipt, combo and reasoning bodies already share one chrome, one header
row, one stacking rule for a card opened from inside it (the card sheet stacks, and the modal
steps down to `--surface-sunken`) and one phone treatment. The synopsis joins them. **Every card
name in the synopsis opens that card**, exactly as a name in a receipt does, and on a phone the
header rule the receipt established in #863 and the reasoning inherited (the header is pinned
to 43px and shown whole above a stacked card sheet) applies unchanged.

### 3.3 The states, carried into the modal

The five states apply to the full synopsis too. Two need drawing inside the modal:
- **Stale**: the old synopsis demoted and tagged, as in the tab.
- **Refused**: here the count of failed claims (Round 0's *2 of 3 claims failed checking*)
  becomes per-section, because one of the four sections (Overview, Primer, Key cards,
  Weaknesses) can fail while the rest pass. **Does a synopsis with one refused section show the
  other three?** That is open (§4).

### 3.4 A version's synopsis

Where a committed version's synopsis is read from the version rail (`probe:versions` walks that
rail), and how it reads as a record of that version rather than of the current deck.

## §4 Open for Design to call

1. Section order and hierarchy inside the modal, and whether the Primer's three parts read as
   subsections or as peers.
2. Length budgets per section, stated in lines at both widths. Engineering writes the prompt
   and the accept contract to those budgets. **A budget is a design value and is not loosened to
   make generation easier**; `commander_support.prose` is the precedent (see
   `design/design_handoff_the99_commander_explained/PROSE-one-string-two-surfaces.md` §9).
3. A partially refused synopsis: show the passing sections with the failed one stated, or refuse
   the whole thing.
4. Whether a version's synopsis is read in the rail, behind a control, or only in the modal.
5. How the Mulligan part draws its keep/avoid pair.

## §5 Locked, and not open

- No bracket, score, number or strength word anywhere in the synopsis (§2.2).
- No tiers on Weaknesses, and never more than three.
- No general rules tips. A tip names only cards in the deck.
- No partial sentence ever renders, and no placeholder reserves space for prose that is not
  there. Both are `STATES-synopsis.md`'s rules and they carry over.
- No disclaimer line of the reference's *"may state specific details incorrectly"* kind.
  Every claim the app can check is checked before it is shown, and one that fails is refused
  and says so. A standing disclaimer would excuse exactly what the refused state exists to catch.
- `--danger` on the refused tag only, and retry is always a button.

## §6 What engineering owns (not for Design)

Recorded so the round is not asked about them:
- **The accept contract.** Every card named must be in the deck (or, in Weaknesses, must
  exist in the catalog). Every Key card's job is checked against its classified roles. The
  Mulligan's counts (lands, colour sources, ramp) are computed from the profile and handed
  to the model to phrase, not asked of it.
- **Themes.** The profile's theme slot is deliberately `null` (#724). The synopsis names the
  deck's strategy in prose, grounded in the cards it names, and never writes to or reads from a
  theme list.
- **Cost.** One model call per press, an hourly cap per
  player, and an unchanged list returns its stored synopsis instead of paying for new wording of
  the same facts. No model client exists under `src/` yet (the only caller is
  `scripts/generate-commander-prose.ts`, with its own `fetch`); whichever of the synopsis and #10
  deck tuning builds first creates it neutrally, for both.
- **Storage.** Keyed on the profile fingerprint, beside the stored analysis (#874), and copied
  into the version at commit.

## §7 Sequence

Ping when R1 lands; the audit reads it against §2 and §5. The About entry for this feature is
batched with the rest of the analysis line's entries at launch, so it is not drawn in this round.
