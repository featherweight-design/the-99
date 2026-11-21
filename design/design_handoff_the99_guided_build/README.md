# Guided build · R1 (account 2, 2026-11-20)

A free or paid choice for every new deck. Canvas: https://claude.ai/artifact/RBX6c8vXYt7a3S9rQCEDbj (boards here are its exports, unchanged).

**Status: R1 approved (LGTM, Hugh, 2026-11-20). Copy review required before shipping.**

**Model:** `design/design_handoff_the99_precon_upgrade` (engine, chrome, wait, refunds). Also read: commanders_discover, discovery, help_me_choose, commanders.

Every frame is the SHIPPED screen (CreatePreFilled, CommanderDetail, the Upgrade flow's chrome and step markup) rendered with the shipped CSS from a scratch copy of main with the proposal patched in (`scratch-gen/proposal/`), Amonkhet theme, shell cut from the shipped About captures. Fixture: Ghalta, Primal Hunger, deck "Ghalta Stomps", 15 welcome credits.

## Locked (the brief)
- Every new deck from For you and Discover offers a free build (today's fill) or a paid guided build.
- Guided costs 2 credits, refunded on a failed or short run (fewer than 12), as Upgrade.
- Upgrade's engine: sharpens 12 to 18 cards and writes the deck's whole Overview (Hugh, 2026-11-20).
- Help me choose stays the way to find a commander; its answers carry into the build visibly.

## Design's calls
1. **Where the choice starts:** inline on the new-deck screen (For you, Discover, the commander page and Help me choose land there; Decks › New deck keeps its commander picker, which leads to the same screen once a commander is chosen). One radio group, `How we build it`, under Deck name: Free build (pre-marked), Guided build (2 credits, never pre-marked), Just the commander (free). Press: `Create deck →` / `Next · Strategy`.
2. **What guided asks:** Strategy › Bracket › Cards in Upgrade's sheet/720 dialog. Strategy: up to 3 commander themes your cards back (`MIN_BACKING`, `MAX_STRATEGIES`). Bracket: 2/3/4, none pre-picked; combos follow the bracket (no separate question). Cards: Only cards I own / Buy some (each under $12) / Buy within $N (from Help me choose). Cards to avoid: not asked (open question). The free build sees none of it, but still takes Help me choose's answers as shipped.
3. **Start empty:** yes, `Just the commander`.
4. **Commander page:** Role Coverage and EDHREC Synergy stay, with the + picks (board P-Picks). It stops promising a build. Phone bar drops READY TO BUILD and the promise, keeps the picks line, one button `Start a deck →`. Desktop: `Start a deck →`, seed note removed.
5. **Not enough credits:** Guided row stays, off, with the reason in `--warning`; `Get more credits →` when payments are on, no link when off.
6. **Help me choose:** the shipped `Built from your answers` block stays; in guided every step is pre-picked and marked `from your answers`; the build-around card is listed under `It keeps` and never cut.
7. **The run:** deck created at confirm with the free fill; wait shows Filled ✓ / Sharpening (clock) / Writing the deck's Overview; ✕ leaves, run continues; tile/page show `Sharpening toward X · 0:05`.
8. **Ready / short / failed:** Ready shows Strategy, Bracket, Sharpened, To buy and the deck's whole Overview (shipped SynopsisSections: summary, Game plan, Mulligan, Key tips, Key cards, Weaknesses), then `Open X`; no swap review. Short: both credits back, found cards stay. Failed: both credits back, deck keeps the free build; Try again / Open the deck.

## Gaps for engineering
- **G1** `createDeck` takes a build kind (free | guided | empty); empty skips `planFill`.
- **G2** Guided run = Upgrade's engine over the new deck's free fill; strategies from the commander's themes backed by owned cards; runs keyed per deck.
- **G3** The run writes the deck's whole Overview (contract 13, stages shape) via Upgrade's `writeUpgradedOverviewFor` path, inside the 2 credits, once per run; Ready waits for it and draws it with `SynopsisSections`.
- **G4** Pool input: owned only, per-card cap $12, or a total budget (new).
- **G5** Kept cards (build-around card, commander-page synergy picks) locked; the validator refuses cutting them.
- **G6** Run state on the deck (running, short, failed) for the tile and page after leaving.
- **G7** Refunds as Upgrade.
- **G9** The new-deck screen reads the ?select= picks (name, image, owned) to draw Your picks; every build kind keeps them (empty = commander + picks). The commander page's picks line becomes `Your N go into the new deck.` (SynergySelection takes a guided flag).
- **G8** Commander page copy: `stickyLabel`, `stickyPromise`, `seedNote` retire; button `Start a deck →`.

## Open for Hugh
1. Free pre-marked (drawn), or nothing marked?
2. Ready shows facts + the whole Overview, not the list of sharpened cards (drawn). List them?
3. Cards to avoid left out of R1. Add it?

## Boards
`Main` (calls, gaps) · `P-Picks` (synergy picks on the commander page and the new-deck screen, every option keeps them) · `E-Entries` (For you, Discover, commander page shipped vs proposed) · `N-Choice` (free, guided, empty, phone + desktop) · `N-Credits` (short, payments off) · `G-Steps` (strategy, bracket, cards, kept picks) · `R-Run` (wait, ready, short, failed) · `H-HelpMeChoose` (answers carried in).

Copy: `guided-build · copy strings.ts` (DRAFT; /copy-review resolves wording). States: `STATES-guided-build.md`.

Art: card images cut from earlier rounds (Scryfall is blocked). `scratch-gen/` holds the proposal components, the patch over main and the render scripts; reference only, never imported.
