# The Commanders place

Menu and Home line, PR 1 (plan `docs/superpowers/plans/2026-10-22-menu-home.md`; handoff `design/design_handoff_the99_menu_home/`).
Always on (the `COMMANDERS_PLACE_ENABLED` switch is retired; `place-flag.ts` is gone). The name stays in About copy as historical identity, and `visible.ts` maps it to always-on.

## Shape

- `src/app/commanders/(list)/` holds the three tab routes: `page.tsx` (For you), `discover/page.tsx`, `choose/page.tsx` (Help me choose).
  `/commanders/[slug]` is a sibling OUTSIDE the group, so the strip never reaches it.
- `(list)/layout.tsx` mounts `CommandersPlaceHead` (title on desktop, then `PlaceStrip`) once. The strip is `src/components/place/place-strip.tsx`, extracted from `collection-place-head.tsx`
  so both places draw one strip (links, not ARIA tabs; the optimistic highlight; a layout so a press does not remount it).
- The retired addresses `/discover` and `/decks/new/choose` are thin pages: a TEMPORARY redirect to the tab with the
  query kept (`pathWithQuery`). Never a permanent redirect.
- **Every link names the place** (`lib/commanders/place-paths.ts`: `choosePath(place)`, `discoverPath(place)`, `atPlace`). A door,
  the lane toggle, a results link, a server redirect and a tool's Try it name `/commanders/choose` and `/commanders/discover`; `place` is now always true. Server code passes `true`; a client component reads the shell's `PlacePathsProvider`
  (`usePlace`, `useChoosePath`). There is no module-level `CHOOSE_PATH` any more: a builder takes its `path`, so a caller that forgets it fails typecheck.
- On: the Discover door ("Not sure what you want? Help me choose") and the guided banner's door are not drawn, and with them the M12
  moment's first two anchors. M12's bar-slot fallback (`helpOnSlot`) is PR 2's. The form's "‹ New deck" back link goes (`ChooseHeader`'s `back` is optional).
- A new path a collection change can stale goes in `COLLECTION_ROUTES` and `claimSurfaces`; the About screen for a path is `screenForPath`.

## The title line

"228 yours, not yet built · 3,068 to discover" is two COUNT statements (`loadCommanderCounts`), never the discovery payload: `owned` counts
the reader's stored `commander_scores` less built commanders (0 until `/commanders` has ranked once, and then left out of the line), `discover` is
`discoverCandidates` counted in the database. They are read live, not cached: building a deck moves both and no cache tag drops on a deck write.
The head re-reads them (`refreshCommanderCounts`) on a tab switch and on window focus, as Collection's head does.

## From AGENTS.md (moved 2026-10-28)

The rule-form bullets `AGENTS.md` carried for this area until 2026-10-28, verbatim. Where they and the text above differ in wording, both are current.

- **The Commanders place** (always on). `commanders/(list)/` holds For you, Discover and Help me choose under the Collection place's strip (`PlaceStrip`, extracted); `/commanders/[slug]` stays outside the group. `/discover` and `/decks/new/choose` redirect (temporary, query kept); every link and redirect names the place through `choosePath` / `discoverPath` (`lib/commanders/place-paths.ts`). A new path a collection change can stale goes in `COLLECTION_ROUTES`. Plan `2026-10-22-menu-home.md`, PR 1.
