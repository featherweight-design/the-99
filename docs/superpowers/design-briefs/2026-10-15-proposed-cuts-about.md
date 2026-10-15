# Brief: the Proposed cuts About entry

2026-10-15. A small item for the per-entry template (§8 of `design/design_handoff_the99_about/The 99 - About Page (R4).dc.html`; `STATES-about-r3.md` §G3). Proposed cuts shipped without an About entry. This brief covers what the tool does today, the two tuning entries to use as the pattern, and what the template still needs. Two slots are left open for Design: the specimen and the key lines.

## What Proposed cuts does today

It is for a deck over 100 cards. It is grounded in `src/components/decks/cuts-panel.tsx` and its copy, `src/lib/copy/deck-cuts.ts`.

- **A free count.** On open, the tool counts what runs long against the commander's EDHREC figures: roles, curve slots and bracket flags (`panel.facts`, "What we counted"). It names no card and uses no credit. The lead reads `Ten over the ninety-nine. Below is what we counted. To have the cards named, look deeper.` (`overLead` + `lead`).
- **Look deeper, 1 credit.** This names as many cards to cut as the deck is over. Each comes with a one-line reason that must cite a figure from the count. A reason whose figure doesn't match is dropped. A deck far over gets a capped first batch, with `N more are still over` (`deeper.resultMore`).
- **Cut and Keep, per card.** Cut writes to the decklist at once, and Undo puts the card back. Keep hides the suggestion, and Show it again restores it. The commander, locked cards and Key cards are never named (`panel.neverCut`).
- **Done.** Back at 99 the tool closes: `Back to 99 / 99. You cut N.`
- **History.** Each run is kept under Tuning in History and can be reopened, with every cut re-checked against today's deck. This exists only when the Tuning hub draws (two or more tools on).

**Where it opens.** Both entry points are on the deck page:
- The **Analysis tab**. The tool is a tile in the Tuning hub when two or more tools are on, or it mounts directly after Suggested changes when it is the only tool.
- The **deck header's trim line**. When the deck is over, the spine shows the over line with a `Proposed cuts →` press (`tuningHubShortcutsCopy.proposedCuts`, `spine-desktop.tsx` / `spine-mobile.tsx`). The press opens the tool on the Analysis tab. It is drawn only with the hub on (`builder-shell.tsx`, `onProposedCuts={tuningHubEnabled && proposedCutsEnabled ...}`).

**Already mentioned elsewhere.** The `mana-balance` caption names it: "the trade names the card that goes out: one Proposed cuts or Suggested changes already picked". So a reader can meet the name in About today with no entry of its own to explain it.

## The pattern: the two tuning entries

Both live in `src/lib/copy/about.ts`, chapter `04`, `route: '/decks'`, `opens: 'opens a deck’s Analysis tab'`, `width: 'plate'`, `marksPending: true`:

- **`suggested-changes`**: `switch: 'TUNING_ENABLED'`, since 10. A two-paragraph caption that opens on the reader's question ("Want a second opinion?") and gives one worked example. Three keys: limits, `Each run uses a credit.`, and History. The History key is gated by `keySwitches` on `TUNING_HUB_ENABLED`. Its specimen is the tool's own limits box (`SuggestedChangesFigure`, `components/about/figures.tsx`).
- **`mana-balance`**: `switch: 'MANA_BALANCE_ENABLED'`, since 14, no bump. Four paragraphs. The History line is gated by `captionLineSwitches` on `TUNING_HUB_ENABLED`. Four keys. Its specimen is the tool's own table (`ManaEvidenceTable`) from Gishath's figures (`MANA_BALANCE` in `lib/about/fixtures.ts`).

Proposed cuts sits between them, with the same chapter, route, `opens` and width. Like both, it should gate any History line on `TUNING_HUB_ENABLED`. Because the trim line's `Proposed cuts →` exists only with the hub on, a caption that mentions it needs the same line gate.

## The switch and the version (engineering, no Design call)

- **The entry follows `PROPOSED_CUTS_ENABLED`.** `proposedCutsEnabled(env)` (`src/lib/tuning/flag.ts`) already requires `ANALYSIS_TAB_ENABLED`. Today `AboutSwitch` (`src/lib/copy/about.ts`) and `SWITCHES` (`src/lib/about/visible.ts`) do not list it. Engineering adds `PROPOSED_CUTS_ENABLED: proposedCutsEnabled` to both, the same one-line pattern `MANA_BALANCE_ENABLED` uses.
- **No version bump.** A switched entry is announced when its switch flips, and its `since` is the current version. `ABOUT_VERSION` is 14 (`about.version.json`), so the entry is `since: 14`, the same as `mana-balance` and `deck-tokens`. The `about.test.ts` content hash is re-pinned, not bumped.

## The fixture (staging, read-only)

On staging, **HD - Zombies** (Zul Ashur, Lich Lord, no partner, no locked cards) is the only deck over 100: 109 cards in the body plus the commander, 110 in all, **10 over the 99**. A second deck named HD - Zombies, owned by the same account, sits at 99. The specimen's fixture should name the over deck, id `3119268e-f824-48ce-8e27-6b8cabe4cb61`, so nobody picks up its twin.

The figures a specimen draws (the count's rows, a named cut and its reason) are computed at run time and are not stored anywhere a SELECT reaches. Engineering will read the free count from the real panel against this deck and write the props into `lib/about/fixtures.ts` (as `MANA_BALANCE` was built from Gishath). A named cut can be taken from one real Look deeper run on staging (1 credit) or written as a fixture from the count. That choice belongs to the specimen.

## The template's slots

| Slot | Value |
|---|---|
| id | `proposed-cuts` |
| title | **Open for Design.** Pattern: a reader's task (`Tuning a deck with Suggested changes`, `Reading your deck’s mana`) |
| route | `/decks` |
| opens | `opens a deck’s Analysis tab` |
| chapter | `04` |
| width | `plate` |
| caption | Copy, via /copy-review. Pattern: open on the reader's question, then what the free count does, then Look deeper. Any History or trim-line mention is gated on `TUNING_HUB_ENABLED` |
| specimen component | **Open for Design** (below) |
| fixture props | From HD - Zombies, as above |
| key lines (up to four) | **Open for Design** (below) |
| phone reduction | **Open for Design**, with the specimen: the plate at phone width, as `mana-balance`'s table switches on the viewport |
| since | `14`, no bump |
| switch | `PROPOSED_CUTS_ENABLED` (engineering adds it to `AboutSwitch`) |
| copy file | `src/lib/copy/about.ts` (the entry); strings the specimen draws come from `src/lib/copy/deck-cuts.ts` |

## Open for Design

1. **The specimen.** The candidates the shipped panel already draws (`cuts-panel.tsx` states):
   - **C1, the free count**: `What we counted` with its rows and the Look deeper offer. This is the tool's answer before any spend.
   - **C3, named cuts**: a result with a reason line and Cut / Keep.
   - **C8, done**: `Back to 99 / 99. You cut N.` This is the smallest, but it shows the end and not the tool.

   Whichever is chosen, the specimen should be the panel's own component with fixture props, never a fork (§G3).
2. **The key lines.** Up to four. The facts most likely to belong there, all already true in code:
   - The count is free; Look deeper uses a credit, and a refused or failed run gives it back.
   - It never names the commander, a locked card or a Key card.
   - Each reason cites a figure from the count, and one that doesn't match is left out rather than replaced.
   - Cut writes to the list at once, with Undo.
   - It closes when the deck is back to 99.

   Design picks the four, or fewer.
