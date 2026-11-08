# Readiness: Public landing page

**Verdict: Green.** Hugh approved R4 on 2026-11-08. No migration. The one switch, `PUBLIC_LANDING_ENABLED`, is already
approved (plan, Rulings 2). New player-facing copy is DRAFT for `/copy-review`. The demo (Try it) is Green to build but
sequenced after the presentational splits (call 3 is B). Checked against `origin/main` @8c647c7.

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
