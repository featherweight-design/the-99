# READINESS — Collection · Per-printing art selection (#105)

**Verdict: 🟠 Orange** — one locked decision is contradicted structurally and needs Design to
redraw. Everything else is correct, resolvable eng-side, or a Design claim the data disproves.

Audited 2026-07-29 against `docs/superpowers/specs/2026-07-29-per-printing-art-selection-design.md`
(ten locked decisions) and against the live `printings` / `sets` / `collection_items` schema on the
Neon `staging` branch. Design's R1 self-assessment is retained verbatim at the bottom.

---

## Blocker — returns to Design

**Locked decision 4 forbids modal modes; the handoff is built on one.**

Spec, decision 4: *"Inside the existing card detail modal. No new route, no modal modes."* In the
workshop the "second panel or tab within the modal, so the modal gains a mode" option was raised and
explicitly rejected.

`README.md` decision 1 is that exact rejected option: the chooser is a **second view of the same
modal**, with `card-modal.tsx` gaining `view: 'card' | 'printings'`. The canvas is composed around
it — the card view is replaced wholesale, there is a `Back to {cardName}` affordance
(`copy strings.ts:25`), and Prev/Next is reused across a view the card view doesn't have.

This isn't a copy or token correction; the picker's placement *is* the composition. It needs one
Design round to land the picker **inside** the card view rather than in place of it — an inline
region under the desktop art panel, and on mobile an inline expansion of the `Set` row the handoff
already promotes out of the 2×2 grid (that promotion is a good call and should survive).

Design's READINESS lists placement under "Ready to build … no open pixel questions," which is why
this is Orange rather than something eng absorbs.

---

## Corrections eng applies without a Design round

| # | Handoff says | Correct per spec / data |
|---|---|---|
| 1 | Pin identity must be the Scryfall print id; `setCode + collectorNumber` "is not unique for numberless promos and Secret Lair drops" | **Disproved.** `(oracle_id, set_code, collector_number)` has **zero** duplicate groups across all **100,601** rows of `printings`, and **zero** rows have a null or empty `collector_number` — there is no numberless-printing class. The print id is also the wrong key: `collection_items.scryfall_id` is **nullable** by design, because bare `Name,Qty` CSV exports carry no Scryfall ID, so pinning on it would deny the feature to exactly those users. The spec's `(set_code, collector_number)` key stands. |
| 2 | On replace, a pin whose printing isn't in the new export is **dropped silently** (`README.md:174-176`) | Locked decision 5 is the inverse: **keep the pick, fall back silently, re-acquiring reactivates it.** That's why `card_art_preferences` carries no FK to `collection_items` — the pin outlives a traded card. One-line behaviour change, no visual consequence. |
| 3 | "Your pick shows everywhere this card appears" (`copy strings.ts:29`); state 3 promises "the list, the grid, and every deck it's in" | Locked decision 2 scopes the pin to **collection surfaces only** — grid, rows, modal. Deck builder, recommendations and commanders keep the resolver's choice. Per-deck printing choice is explicitly deferred to **#42**. Reword to name the collection, not decks. |
| 4 | Payload should carry `collectorNumber` as "genuinely nullable" | `collection_items.collector_number` is `NOT NULL`; the bare-CSV case is the **empty string**. The `no number` treatment is still needed and still correct — it keys off `=== ''`. |
| 5 | Per-finish selection was rejected in "decision 5" | It's **decision 3**. Decision 5 is the replace/fallback behaviour. Number drift only. |

Payload otherwise lands as asked: `setName` / `releasedAt` come off `sets.name` / `sets.released_at`
(the latter is nullable, so the newest-first default sort needs a tiebreak), and `finish` must be
added to `BrowsePrinting`, which today stops at `{setCode, collectorNumber, quantity, imageUri}`.

## Confirmed sound

- Entry point on the printing caption, button only past one printing; mobile promoting `Set` to a
  full-width row with a 40×56 thumbnail.
- Three non-colour signals for chosen vs default (ring weight + badge glyph + label) — the SC 1.4.1
  argument holds.
- Overflow: grid + search + finish chips + set group headers past 12 entries, no virtualisation.
  Correct for the real ceiling (**54** printings of `Forest`; 102 of 2,470 unique cards get a picker).
- Foil shown-not-chosen, and `no number` spelled out rather than hidden.
- Copy externalised, Kitchen Table voice intact, `chip-row.tsx` / `text-field.tsx` reused unchanged.

## Risk notes carried forward

- **The mobile art contradiction is real.** `card-modal.tsx:180` is `hidden md:flex` — mobile has no
  art panel today. The brief is right; the Collection handoff's drawing is stale. The Design round
  that clears the blocker should settle this in the same pass.
- **#59 collision** on tile ring weights, badge plate opacity and caption button fill stands.
- `no number` will be logged as a defect at least once. Accepted.

---

## Design's R1 self-assessment (verbatim)

**Rating: 🟡 Yellow** — buildable now; three references I could not read, and two data questions
that decide whether the pin lands on the right card at all.

Date: 2026-07-29 · Branch: `feat/printings-and-sets` · R1

### What Green would need
1. **The spec diffed against the commit model and caption behaviour.**
   `docs/superpowers/specs/2026-07-29-per-printing-art-selection-design.md` is not in this design
   project. The five open decisions are mine and final; the locked ten are honoured **as paraphrased
   in the brief**. Drawn: picking commits immediately, `Done` only dismisses, un-pin lives in the
   footer, the caption names the printing on every card and says `Your pick` when pinned. If any of
   that contradicts the locked text, say so and only the header/footer change.
2. **Pin identity confirmed as the Scryfall print id.** `setCode + collectorNumber` is not unique
   for numberless promos and Secret Lair drops (state 5). Everything else is layout; this one is
   correctness — the wrong key silently pins the wrong art after a replace.
3. **The per-printing payload.** The card query must return every owned printing with
   `{printId, setCode, setName, releasedAt, collectorNumber, qty, foilQty, imageUri}`, with
   `collectorNumber` genuinely nullable. The whole canvas assumes it.

### Ready to build
- Placement (second modal view), entry point, both widths — final. No open pixel questions.
- Chosen / default / hover / focus treatments and the SC 1.4.1 argument — final.
- Overflow behaviour at 54 entries: grid, search scope, finish chips, set grouping — final.
- Foil and missing-collector-number handling — final.
- Radiogroup + keyboard + live-region model — final.
- Copy — final and externalised (`printing-picker · copy strings.ts`).
- `chip-row.tsx`, `text-field.tsx`, the modal shell, Prev/Next — reused unchanged; no upstream edits
  requested.

### Not in this ticket
- Any change to the collection list, grid, filter bar or replace flow.
- Per-finish selection (foil vs non-foil as separate choices) — explicitly rejected, decision 5.
- Choosing art for cards you *don't* own a printing of.
- Bulk art selection ("use Kaldheim basics everywhere") — a real want, a different feature.
- #59's richness restyle of this modal.

### Risk notes
- **Mobile art is contradictory across documents.** The brief says the mobile modal has no art panel;
  the Collection handoff draws one. Drawn both-ways-safe, but it should be reconciled before build.
- **The property table row (`collection.md:743-1023`) is unverified.** External modal geometry is
  unchanged, which should be sufficient — it's an assumption.
- **#101's ratification may be against the wrong three decisions** (the issue text isn't here). The
  canvas flags this in an amber banner rather than pretending.
- **Collision surface with #59** is three values: tile ring weights, badge plate opacity, caption
  button fill. Small, but it's on the same modal.
- **`no number` will look like a bug to somebody.** It's deliberate, it's in the copy file, and it
  will get logged as a defect at least once.
