# Catalog ingest quirks (background)

The full text moved out of `AGENTS.md`, verbatim. `AGENTS.md` keeps each section's rules; this file keeps the history, measurements and derivations behind them.

- **`job=printings` alone is the sharp tool, and its blast radius is every set.** The ingest
  refuses to publish denominators from a run that skipped orphans, and skipping the oracle
  refresh is what produces orphans — so the two together used to blank `base_set_size` for
  the whole database and leave every set reading `not indexed yet` until a clean run, behind
  a green job. Since #704 the publish clears and fills in one transaction, so a refused run
  leaves the previous denominators standing and EXITS NON-ZERO instead. Dispatch `job=all`
  unless you have a reason not to; the run takes about a minute either way.

- **A `reversible_card` printing is ingested from its FACES**, since 2026-09-21. Scryfall gives
  that layout no top-level `oracle_id`, no `image_uris` and no `flavor_name` — all three sit on
  the faces — so the obvious read produces an FK orphan, and the ingest used to drop the whole
  layout. What that cost is a printing a player OWNS and the catalog denies: the art then
  resolves to the set's representative printing, which is a different collector number with a
  different picture, silently. All 82 that exist carry the SAME oracle id on both faces (one
  card printed on both sides, not two cards sharing stock), which is what makes face 0 an
  answer rather than a guess; the skip is kept for faces that disagree, which is a different
  thing and exists nowhere today. `skippedReversible` in the ingest report is therefore a
  narrow counter now, not a constant ~82.

- `pnpm fetch:mana` downloads Scryfall's mana symbols into `public/mana/` and rewrites the
  manifest the renderer checks before reaching for one. The five WUBRG files the color filter
  draws came from the same place; this is that set extended to the 59 symbols a mana cost can
  contain, filtered on Scryfall's own `appears_in_mana_costs` so tap, energy and loyalty never
  land here. The manifest exists because that list GROWS: a set with a new symbol arrives in the
  daily catalog refresh while these files move only when someone runs this, so the large pip
  falls back to a lettered disc for a symbol it has no art for rather than drawing a 26px hole.
  The script asserts per symbol that its slug equals Scryfall's own filename, which is the one
  way a rename would otherwise ship as a silent 404.

- `pnpm build:mana-sprite` rebuilds `public/mana/sprite.svg`, the ONE file every pip draws from,
  preloaded in the head of every document by the root layout (Hugh, 2026-09-28: pips popped in,
  because a symbol drawn as a CSS background is fetched only when its pip paints). It is a CLASSIC
  sprite: every symbol in its own 100-unit square cell of one row, 10 apart, and a pip picks its
  cell with `background-size` and `background-position` in percentages (`manaSpriteBackground`),
  which hold at any box size. NOT SVG `<view>` fragments, which was the first build: a fragment
  changes what the image shows but not its intrinsic size, so `contain` drew the whole sheet into
  every pip as a thin strip, in Chromium and WebKit alike, with markup identical to a working build.
  `fetch:mana` runs it after writing the files; run it by hand after editing one.
  `mana-sprite.test.ts` fails when the committed sprite is not the build of the committed files, or
  holds a cell for anything but the manifest's slugs; the build and the reader share one sorted order.
