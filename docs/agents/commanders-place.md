# The Commanders place

Menu and Home line, PR 1 (plan `docs/superpowers/plans/2026-10-22-menu-home.md`; handoff `design/design_handoff_the99_menu_home/`).
Behind `COMMANDERS_PLACE_ENABLED` (`commandersPlaceEnabled`, `src/lib/commanders/place-flag.ts`; unset in production).

## Shape

- `src/app/commanders/(list)/` holds the three tab routes: `page.tsx` (For you), `discover/page.tsx`, `choose/page.tsx` (Help me choose).
  `/commanders/[slug]` is a sibling OUTSIDE the group, so the strip never reaches it.
- `(list)/layout.tsx` mounts `CommandersPlaceHead` (title on desktop, then `PlaceStrip`) once. Off, the layout passes children through
  and every route draws as shipped. The strip is `src/components/place/place-strip.tsx`, extracted from `collection-place-head.tsx`
  so both places draw one strip (links, not ARIA tabs; the optimistic highlight; a layout so a press does not remount it).
- The retired addresses `/discover` and `/decks/new/choose` are thin pages: switch on, a TEMPORARY redirect to the tab with the
  query kept (`placeRedirect`); off, they render the tab's page in place. Never a permanent redirect: the switch can go back off.
- `CHOOSE_PATH` is `/commanders/choose` for every in-app link. Off, that address renders the page too (no strip, the "‹ New deck"
  back link stays). `laneHref` and the bar still point at `/discover` on purpose: the bar's Discover slot highlights by path, and
  PR 2 of the line takes it out of the bar.
- On: the Discover door ("Not sure what you want? Help me choose") and the guided banner's door are not drawn, and with them the M12
  moment's first two anchors. M12's bar-slot fallback (`helpOnSlot`) is PR 2's. The form's "‹ New deck" back link goes (`ChooseHeader`'s `back` is optional).
- A new path a collection change can stale goes in `COLLECTION_ROUTES` and `claimSurfaces`; the About screen for a path is `screenForPath`.

## Not done here

The desktop title's count line from the board ("228 yours, not yet built · 3,068 to discover") is not drawn: the Discover total
needs the whole discovery payload (about 3,000 rows) in a layout that every tab pays for. Each tab's own result line says its count.
