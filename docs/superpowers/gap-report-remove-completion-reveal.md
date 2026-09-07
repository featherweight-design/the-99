# Gap report — remove the completion reveal (#362)

Design-review skill, pre-PR gate. Property table: `docs/superpowers/design-tables/decks.md`,
state row **Builder · complete**.

Agent 1 (enumerate) was not run. This change removes a component rather than introducing one, so
there is no new design source to enumerate; the existing table row is the source of truth and was
edited to record the removal.

## Scope verified

The Builder page at 99/99, mobile and desktop, after the completion reveal was deleted. The row
now reads: *no band and no one-shot — the builder renders as it does mid-build, with the Spine at
99/99.*

## Pass 1 — visual properties

0 gaps. No branch, class, or conditional in `builder-shell.tsx` or `builder-spine.tsx` keys off
completion to change what renders. The only surviving completion-sensitive rendering is the
progress display the table already specifies: the `built / 99` figure, the bar filling to
`--success` at 99, and the `Complete` status pill. Both the mobile (`md:hidden`) and desktop
(`hidden md:flex`) branches were checked.

## Pass 2 — reachability

Export was the one acceptance criterion at risk, because the removed band carried an Export CTA.
It is unaffected: `BuilderSpine` renders unconditionally and gates Export only on
`deck.size === 0`, in both its mobile and desktop variants.

Four gaps were found and fixed in this branch:

1. `src/lib/copy/decks-builder.ts` — comment named the deleted `decksBuilderCopy.builderEmpty`.
2. `src/lib/copy/game-log.ts` — header listed `decksBuilderCopy.tabs.*` and
   `decksBuilderCopy.roleCounter.*`. Now names `addPanelCopy.tabs.*`; the `roleCounter` line went,
   as no such key exists anywhere in `src/lib/copy/`.
3. `src/lib/copy/decks-builder.test.ts` — same stale identifier.
4. `src/components/decks/use-local-flag.ts` — the hook's `setHere` and `clear` returns lost their
   only consumers with the reveal, taking the `setWhileWatched` set and the bit-packed snapshot
   with them. Reduced to `[isSet, set]` and a boolean snapshot. The load-bearing parts are
   unchanged: the server snapshot is still `true` so hydration cannot flash the gated surface, the
   `setThisSession` storage-throws fallback still retires its entry only on a confirmed read-back,
   and the cross-tab listener still filters on the key.

Agent 3 confirmed all four. **0 gaps remain.**

## Not fixed here

`docs/superpowers/design-tables/appshell.md` lists `--kaiju-body`, `--celebrate-top` and
`--celebrate-bottom` as tokens. None of the three is in `src/app/globals.css`, and none was there
before this branch either — the reveal did not use them. Pre-existing drift from the theme-system
run, left alone.
