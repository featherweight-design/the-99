# Readiness Review — Commander art wash · readability amendment

**Verdict:** 🟡 Yellow
**Audited:** 2026-09-08
**Related ticket(s):** none filed — the handoff arrived as a direct design drop. #336 ("Commander card art is cropped at the edges in the ranked list") is adjacent and should be re-read against decision 7 once this ships.
**Plan PR target:** TBD

## Summary

The design is ready; the codebase is not, and one gap is hard. The handoff is unusually
complete — ten decisions each carrying its reasoning, a token table, and four open items
already identified and labelled — and nothing in it requires a Design round-trip. But
decision 1 requires `image_uris.art_crop`, which this repo does not store and, per an
existing ruling in the schema, may not construct from the URL it does store. Until a column
exists and both catalog databases are re-seeded, no state in this handoff is reachable,
which is the pipeline's hard rule 3. Five smaller gaps are eng-side translation work:
theme tokens for the literal hexes, band heights on mobile (the canvas is desktop-only),
a no-art fallback that the handoff describes as existing but which only one of four surfaces
actually implements, the deck grid's narrow columns, and an accessibility rule that conflates
two different media queries.

All eight decisions below were walked through with Hugh on 2026-09-08 and are settled. The
plan PR implements them; it does not re-open them.

## Per-dimension findings

### 🗺️ Scope clarity

- [✅] Boundary is explicit and correct: four surfaces, two strategies, one component, and
  "nothing else on Decks, Commanders or Home is redesigned."
- [✅] Four open items are logged, each labelled with who owns it.
- [🟡] "Amendment to the shipped wash" is accurate for three surfaces. The Home resume row is
  today a 30×42px thumbnail (`src/components/home/resume-decks.tsx:79`), not a wash — the
  handoff replaces it with a 72px band, a 99px portrait column, an ambient layer and a
  116px type inset. That is a new row, and it grows each Home resume entry by roughly 10px.
  Settled: build as drawn (decision 5a below).

### 🎭 State coverage

- [✅] The no-art state is named, and correctly forbidden from collapsing the band.
- [🟡] **No mobile viewport is drawn.** The canvas frames are 900 / 1140 / 1300px; the file
  contains no phone frame and no breakpoint markers. Two of the four surfaces change row
  height, which is a phone question. Mitigated by decision 8 of the handoff, which makes the
  geometry width-independent by construction, so eng can apply one band height at both
  breakpoints — but the shipped commander row has separate phone and desktop darkening ramps
  (`src/components/commanders/commander-art.tsx:23-24`) that this collapses into one.
- [🟡] The handoff's rule that data lives "below a `1px` divider" (decision 4) has no "below"
  on the two `left-portrait` rows, where the row *is* the band. Read as horizontal: the
  scrim's final stop is flat ground at 264px, so everything past the portrait already
  satisfies the rule. Interpretive, and flagged for Design to ratify rather than round-trip.

### 🔌 Data contract

- [🔴→🟡] **`art_crop` is not stored.** `cards.imageUri` (`src/db/schema.ts:35`) is the only
  image column, and `src/lib/scryfall/transform.ts:20-21` reads `image_uris.normal` and
  nothing else. All four surfaces read that column
  (`src/lib/decks/read.ts:347`, `src/lib/recs/recommend.ts:149`).
- [✅] The `/normal/` → `/art_crop/` URL swap is closed off by an existing ruling, correctly:
  `src/db/schema.ts:64` — *"Stored, not constructed: Scryfall's docs forbid building image
  URLs."* The handoff's instruction to key off the Scryfall `id` rather than the mock's
  `named?exact=` convenience is right.
- [🟡] Eng-resolvable, but it is a prerequisite, not a detail: a migration, a field in the
  transform, a line in the seed's `onConflictDoUpdate` set (`src/lib/scryfall/seed.ts:16-33`),
  and a manual `pnpm db:seed` against **both** catalog-staging and catalog-production. The
  Monday refresh would backfill it, but waiting leaves the feature dark until then.

### 🧱 Codebase fit

- [🟡] The scrim, ink and chip are specified as literal hexes (`#0E0C09`, `rgba(14,12,9,…)`,
  `#1A160F`, `#F4EFE3`, `#C6B79A`, `#14110E`). Six themes ship, with `--bg` ranging
  `#0D0B0E`–`#14110E`. `commander-art.tsx:15-21` already carries the ruling: that literal is
  Amonkhet's background, and under the other five themes it ramps the art toward a colour the
  page underneath is not. The handoff anticipates this in its engineering notes; eng
  translates to `color-mix(in oklab, var(--bg) N%, transparent)`.
- [✅] "No new token is introduced" holds — `band`, `strategy` and the portrait multiplier are
  component props.
- [✅] Decision 10 (the apostrophe) is **already solved**: `cssUrl`
  (`src/lib/collection/browse.ts:103-104`) uses a double-quoted `url()` plus `encodeURI`, so
  an apostrophe cannot close the string. The extra `.replace(/'/g, '%27')` is not needed here.
- [🟡] Three inline wash implementations exist today (`decks/deck-card.tsx:144-158`,
  `home/hero-commander.tsx:20-26,66`, `home/resume-decks.tsx:78-85`) plus one shared primitive
  (`CommanderBleed`, used by `rec-card.tsx:124` and `discovery-row.tsx:328`). The handoff's
  insistence on one shared component is aimed at exactly the drift already present: all three
  inline scrims differ.

### ♿ Cross-cutting

- [✅] Contrast floors are stated (7:1 titles, 4.5:1 meta) and measured against a defined
  worst case (the scrim caps the art at L\*34).
- [🟡] Those floors were measured on Palette A only. Translating to `var(--bg)` percentages
  moves the mixed result per theme; verify on the darkest (`phyrexia`, `#0D0B0E`) and the
  lightest (`amonkhet`, `#14110E`).
- [🟡] `prefers-reduced-transparency`, `forced-colors`, `prefers-contrast` and
  `backdrop-filter` appear nowhere in `src/` — this would be the codebase's first
  user-preference media query. The handoff's rule also conflates two mechanisms: dimming the
  art suits reduced-transparency, but under `forced-colors` the OS replaces the palette and
  our scrim stops being ours, so the art should be dropped entirely rather than re-tuned.
- [✅] Rejecting `backdrop-filter` on cost-per-card grounds is right, and matches the repo's
  current state (it is used nowhere).

### ⏰ Drift from reality

- [🟡] The handoff says a missing crop "falls back to the **existing** colour-identity
  gradient." Only the commander row does that (`commander-art.tsx:54`). The deck card
  (`deck-card.tsx:150`), hero (`hero-commander.tsx:66`) and resume row (`resume-decks.tsx:84`)
  all use `ART_STRIPES`, each under a comment asserting stripes are deliberately the single
  answer.
- [🟡] Open item 1 rests on content the surface does not have. It asks for a product call on
  subtitle truncation, citing "Avatar Aang // Aang, Master of Elements" — a commander name.
  The shipped resume row prints the **deck** name (`resume-decks.tsx:94`), deliberately
  (`:88-91`: a renamed deck must show the name its owner gave it), with a status pill and a
  short mono `62 / 99 · 3 unowned` beneath (`:97-110`). The trade as framed does not exist;
  the item closes as moot unless the commander name is added to that row, which #437 decided
  against.
- [🟡] "Commander row band `148px`, was `78px`" — the shipped row has **no** fixed height.
  `CommanderBleed` is `absolute inset-y-0` (`commander-art.tsx:50`), so the art fills whatever
  the content produces, and phone uses a different two-band layout entirely
  (`rec-card.tsx:126`, `discovery-row.tsx:331`). 148px is therefore a new constraint rather
  than a change to an old one.
- [✅] Audited against `main` at `9e9eb7b`. The only `src/` change since the audit began was a
  test file (`commanders/rack/filter-rack.test.tsx`); no wash surface moved underneath it.

### 📝 Decision log

- [✅] Ten decisions, each with its reasoning and, where relevant, the alternative it beat.
  Decision 8 flags its own regression risk. Decision 6 explains why
  `background-position` percentages behave as they do so the value can be re-derived rather
  than cargo-culted. Locked and tentative are distinguishable throughout.

## Gaps requiring Design round-trip

None. Every finding is eng-resolvable or already answered by the handoff's own construction.

## Eng-side clarifications

Settled with Hugh, 2026-09-08. The plan PR implements these; it does not re-litigate them.

1. **`art_crop` storage → a new `cards.art_crop_uri` column.** Not on `printings`: all four
   surfaces key off the commander (`decks.commanderOracleId`), not a chosen printing, so a
   printing-level column would add a join to four hot queries to buy per-printing art nobody
   asked for — the same reasoning `commander-art.tsx` already gives for not drawing a printing
   thumbnail on the row. Requires a migration, a transform field, a line in the seed's update
   set, and a manual re-seed of catalog-staging **and** catalog-production.
2. **Every literal hex mixes off a theme token** — scrim, ink and chip alike. L1 becomes
   `var(--bg)`; title and subtitle take the theme's text ramp rather than `#F4EFE3` /
   `#C6B79A`; the on-art chip keeps its status-keyed colour (`src/lib/decks/status-style.ts:51-61`)
   and changes only its fill, from an 18% `color-mix` to opaque. Verify the 7:1 / 4.5:1 floors
   on `phyrexia` and `amonkhet`.
3. **One band height at both breakpoints — 148px**, applied as a `min-height` with the art
   still `inset-y-0`, so the portrait sizes off actual row height and stays flush when content
   overflows. This keeps decision 8 true. If the 203px portrait crowds the phone row in
   practice, revisit with a screenshot rather than a second drawn value.
4. **The colour-identity gradient is the no-art fallback on all four wash surfaces.**
   `ART_STRIPES` stays in use elsewhere (printing thumbnails, card grids); the three comments
   claiming stripes are the single answer are deleted, since they would then assert the
   opposite of what the code does.
5. **The resume row is built as drawn** (5a), open item 1 closes as moot (5b), and flat ground
   on `left-portrait` rows is read as horizontal — past the scrim's `264px` stop — rather than
   below a divider that does not exist there (5c).
6. **Deck card band: `aspect-[2.2/1]` with `min-h-[104px]`, no ceiling.** The grid is a fixed
   3-up from `sm` (`decks-view.tsx:251`) inside a shell with no max-width, minus a 62px rail
   from `md` (`shell/nav.tsx:148`), so a column is `(viewport − rail − 44 − 28) / 3` and the
   band is that over 2.2: **86px** at 640, 96px at 768, 135px at 1024, 174px at 1280, 198px at
   1440 — against today's fixed 118px. The floor protects the only case that breaks (labels
   plus status chip in 86px). No ceiling: a band taller than 2.2:1 never triggers decision 5's
   failure mode, only a wider one does.
7. **`prefers-reduced-transparency` and `forced-colors` get separate rules.** The former takes
   the handoff's values (L2 to `.3`, L3 to `.95 / .6 / .85`). The latter drops the art layers
   entirely and leaves flat ground, because a photograph under system-forced text is the
   unreadable case this handoff exists to fix. Extends the handoff's intent past what was
   written; for Design to ratify.
8. **One `<ArtWash>` in `src/components/ui/`**, absorbing `CommanderBleed`. Props are
   `strategy`, `band`, `imageUri` and `colorIdentity`, typed as a discriminated union on
   `strategy` so `band` reads as an aspect for `cover` and a px height for `left-portrait`.
   Focal, the L1/L2/L3 stack, the mask fraction, the scrim stops **and** the per-strategy
   opacities (`.58` cover, `.80`/`.85` sharp, `.20`/`.14` ambient) are internal — a call site
   cannot invent a new one. `IdentityPips` stays in `commander-art.tsx`.

## Decisions inherited

From the handoff, not to be re-opened by the plan:

- `art_crop` only, never the full card image; front face on a modal DFC.
- The three-layer stack in order, every time — base plate under the art, art at reduced
  luminance, gradient scrim over.
- No alpha colour on any ink over art. Chips on art are opaque.
- Band aspect `2.2:1`, focal `center top`, one value shipped for every card.
- Past roughly 4:1, switch strategy to `left-portrait` rather than crop harder.
- The fade belongs to the art (a `mask-image` fraction of the portrait), not to the row.
- Type never overlaps the art on the resume row; the absence of a `text-shadow` there is the
  tell that it is placed correctly.
- One shared component; divergent per-surface scrims are the named regression.

From the repo, and load-bearing here:

- Image URLs are stored, never constructed (`src/db/schema.ts:64`).
- Art is not themed — it is photography (ruling 17, `home/hero-commander.tsx:60`). The scrim
  over it is themed; those are different layers.
- The resume row prints the deck's name, not the commander's (`resume-decks.tsx:88-91`).
