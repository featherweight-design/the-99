# Readiness: Public landing page

**Verdict: Green.** Hugh approved R4 on 2026-11-08. No migration. The one switch, `PUBLIC_LANDING_ENABLED`, is already
approved (plan, Rulings 2). New player-facing copy is DRAFT for `/copy-review`. The demo (Try it) is Green to build but
sequenced after the presentational splits (call 3 is B). Checked against `origin/main` @8c647c7.

## Addendum A2 (2026-11-11): refinements from Hugh's walk of the preview

**A2 verdict: Green, pending Hugh's approval.** Seven boards plus the calls; README § Addendum A2 has the detail. No
migration, no new switch (it rides `PUBLIC_LANDING_ENABLED`), nothing new in `globals.css`. Checked against
`origin/main` @dad1883.

- **The dialog reuses shipped parts.** `useDialogA11y` (scroll lock, focus trap, Escape, Back closes it),
  `useInertWhileOpen` for the page under it. `demo.tsx`'s phases, loading, card host and focus-on-heading carry over;
  only the frame changes: the section draws the start card (and the resume state), the steps and the end move into the
  dialog. Below 1024 (`lg`, not `md`) one column with pinned bars; from 1024 the 320/360px words column with Back/Next
  under it and the app side as the only scroller.
- **Next/Back** reset the app pane's (or the column's) scroll to 0 and focus the heading; the current
  `scrollIntoView` on the frame goes.
- **Trim (fixture, `scripts/lib/fictional-fixture/` and the demo export):** export 12 collection cards; 3 commanders;
  step 4 filters the rows to those carrying a mark (a demo-only wrapper around the shipped rows, *Show all 99* expands);
  step 5 draws the Overview's lead and stages only; Suggested changes' stored run has 3 swaps; **Giada becomes 101
  cards (2 over: Healer's Hawk, Thran Dynamo)** and **Zimone 96 (3 open)** with Top off ranking 5 candidates. Regenerate
  PR 3's stored outputs (Look deeper, Suggested changes) for the new sizes.
- **Coaches:** `ringPlace` gains a beside-right placement; step 4 rings a mark on pointer-fine (`(hover: hover) and
  (pointer: fine)`, the `FactTooltip` query) and a row otherwise; steps 7 and 8 return no ring target. A test pins that no
  ring label's box intersects the mark key's.
- **Card details:** `DemoCardModal` passes the buy URL so the shipped `ExternalLink` draws (new tab); `FitsDoor` gains a
  `disabled` variant (`--fg-locked`, `Lock` from `ui/lock.tsx`, `aria-disabled`, the description line). Update
  `card-modal-parity.test.ts` for the restored foot.
- **Written for real:** `LandingPrecon` gains the commander's art crop and colour identity (read from the precon's
  commander in the catalog, as the commander cards read theirs) and the full stored Overview content; the card becomes a
  button opening the shipped `PreconSynopsisModal` (stages shape, the precon's art map) with that content, plus the
  landing's teaser block after Weaknesses. No link to `/decks/precons/*`.
- **The end after launch:** the end's launch panel follows the same open/closed switch as the hero's, so it shows
  *Make your free account* the day sign-up opens with no further change.
- **Layout:** the loop's `<li>` lists get `mt-auto` at `md`, and the grid goes `md:grid-cols-2 lg:grid-cols-4`;
  Bring your collection at `lg` becomes a two-column grid (`440px 1fr`) across the section, phone unchanged.
- **Six themes:** the dialog reads only shipped tokens (A2-Themes draws step 4 in all six and step 5 in two more).
- **Tests and checks:** CI runs the suite; the design-review skill and `feature-acceptance` at 390, 768, 1024 and
  1440, signed out, keyboard (Tab order inside the dialog, Escape, Back) and reduced motion.
- **Copy:** every new string is DRAFT for `/copy-review` (README § A2 Strings).

## Addendum A1 (2026-11-08): audit findings 2, 3, 8 and 9

**A1 verdict: Green. Hugh approved A1 on 2026-11-08.** Boards `A1-Step-7.dc.html` and
`A1-Decks-Precon-Tokens.dc.html`; README § Addendum A1 has the detail. Only these four findings are answered here; the
rest of `READINESS-audit.md` stands as written.

- **Finding 2, Top off: drawn.** Step 7 at 390 and desktop. The app gets a two-tab deck switch (Giada, over; Zimone,
  under). Zimone's view is the shipped `TopOffList` open (strings from `top-off.ts`, no new ones) and a Mana Balance
  with a real fix (`mana-balance.ts`: *Help adding blue*, *Up to 2 Forests → Islands*, *Swap basics*, a Yavimaya Coast
  trade). Ticking works in the demo; Add, Swap and Trade are inert. This adds `top-off-list.tsx` and the Improve my mana
  door to the split list (audit finding 5 already counts them).
- **Finding 3, the decks: three, named.** Ashling 99/99 (steps 3 to 6 and 8), Giada 103/99 (step 7 Look deeper, step 8
  Which deck), Zimone 93/99 (step 7 Top off and Mana Balance). Step 3's Ashling line reads *97 of the 99*. The cards
  each deck must hold are listed in the README, for si10's fixture rebuild and the regenerated stored outputs (Look
  deeper now runs on Giada).
- **Finding 9, the precon link: A, no link.** The Mutant Menace card ends after its Overview; *Open the precon's list ›*
  is dropped. B (link to sign-in) is drawn for comparison only.
- **Finding 8, tokens: no new token.** `#C9B98A` → the shipped `FitBar` tokens (`--accent-dim`, `--accent-mid`,
  `--accent`); `#9C9384` → none (`CostPips` draws symbol art); `#F5EEDF` → `--fg` with `INK_SHADOW`; `#B9C7D6` → none
  (a dead board-annotation rule); and `#E07A66` → `--danger`.
- **Supersedes:** step 7 and step 3's Ashling line on `Demo-390` and `Demo-Desktop`.

## For engineering

Maps onto `docs/superpowers/plans/2026-11-08-public-landing-demo.md`. Every UI PR ships 390 and desktop together and runs
the design-review skill and `feature-acceptance` (signed out, both switch states).

- **PR 4, the page** (behind `PUBLIC_LANDING_ENABLED`, under `src/components/landing/`): hero with headline A, the launch
  panel (`saveLandingLaunchEmailAction`, sent = already listed), theme switch, numbers strip (`landing-stats.ts`; drop
  the strip on any failed count), the loop with its Free line, Written for real (`precon-overview.ts`,
  `cached-commander.ts`), free and credits with the value block, tooltips and What credits cost, the close and the
  footer. Try it is absent from this PR. The hero's dummy Commanders phone is static markup over the fixture's art, not
  the signed-in component.
- **Under B, PR 5 becomes the presentational splits** (about nine: Commanders row, collection grid, deck rows with the
  marks, Analysis cells, Overview, Suggested changes, Proposed cuts, Shopping, Which deck), each a drawing half fed by
  props with the signed-in half unchanged, then the Try it section that feeds them Sam's fixture and PR 3's stored
  outputs. One open PR at a time. **PR 6 (`capture:landing`) is not needed under B** except for the About captures.
- **PR 7, Bring your collection and the first run:** the export guides (`src/lib/copy/collection-sources.ts`), the
  Moxfield note, the first-timer card, Scan your cards as its own row, the no-column error, the partial line, the
  success count, and Import a deck starting with "I own these cards" ticked. Confirm production holds the scan index
  first (plan, Onboarding backend).
- **Toast ✕ (small, independent):** `token-refusal-toast.tsx` and `credits-toast.tsx` gain the bare ✕; check
  `social-toast.tsx`'s no-action branch. Add the receipt-kind line to the toast rule.
- **Fixture (si10, `scripts/lib/fictional-fixture/`):** the boards need Jace, Multiverse Architect; Y'shtola, Night's
  Blessed; and Tam, the Possibility as owned, unbuilt commanders (fits about 84 / 79 / 72); Ashling, the Limitless as the
  built deck holding a proxy, a tutor, a game changer, two to buy, one short and one over-committed card; Giada, Font of
  Hope; and a Swords to Plowshares whose best deck is Giada's. `decks.ts` picks commanders algorithmically today, so
  pin these or accept the picks it makes and redraw nothing (the layout holds any three). PR 3's stored outputs are
  regenerated for the final fixture.
- **Motion:** the shipped tokens and classes only (`.anim-gentle-in`, `.anim-reveal`, `CountUp`); nothing new in
  `globals.css` beyond the drift, glow and diamond keyframes, all inside the reduced-motion guard.
- **Art:** card images come from Scryfall at runtime like every other surface; `art/` here is reference only and never
  copied into `public/`.
- **Tests:** the launch action's order (per-visitor cap, then `overAnonymousCeiling`) and its sent-equals-listed answer;
  the strip dropping on a failed count; tooltips one-at-a-time with Escape; the landing absent when signed in and when the
  switch is off.
- **About:** no change for the landing (signed out). The first-run changes touch the collection About page's captures;
  re-take with `pnpm capture:about` when PR 7 lands. No label.
