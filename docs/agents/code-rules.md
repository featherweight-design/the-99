# Code rules (background)

The full text moved out of `AGENTS.md` on 2026-10-28, verbatim. `AGENTS.md` keeps each section's rule; this file keeps the mechanism, the evidence and the edge cases behind it.

## A correlated subquery in a single-table select must alias and qualify

Drizzle omits table qualification from column references interpolated into a `sql` template in
the **projection** of a select whose `from` names a **single** table. A correlated subquery
written the obvious way:

```ts
sql`select count(*) from ${deckGames} where ${deckGames.deckId} = ${decks.id}`
```

renders as `select count(*) from "deck_games" where "deck_id" = "id"`. Both bare names resolve
against `deck_games`, so it compares each row's foreign key to its own primary key — always
false, count always 0, no error. Alias the inner table and write both sides out:

```ts
sql<number>`(
  select count(*) from ${deckGames} dg
  where dg.deck_id = ${decks}.id
)::int`
```

- **The collision is what bites, not the missing prefix.** Unqualified names are harmless when
  the inner table has no column of that name, because Postgres then falls through to the outer
  query. `id` collides constantly; `built` in `getDeckReviewHeader` survived for months purely
  because `deck_cards` has no `id` column.
- **A join saves you, a `where` saves you, the projection does not.** With two tables in the
  `from`, or with the same `sql` in `.where()`, Drizzle qualifies correctly. Confirmed by
  rendering all three through `PgDialect.sqlToQuery`.
- **A `.toSQL()` test catches it; a component test never will.** Component tests receive the
  figure as a prop and stay green however the query was written. Rendering the query and asserting
  on the emitted string does catch it, needs no database, and is what `src/lib/decks/built.test.ts`
  already does for `notBuiltBy` — assert the qualified form, `"deck_games"."deck_id"`, rather than
  that the column name appears anywhere. Keep a probe for the returned figure: emitted SQL proves
  the question, a fixture whose true count is known proves the answer, and `probe:versions` asserts
  both tab-row figures for exactly that reason. When a count reads 0 and should not, print
  `.toSQL()` first.

## Any new model input from a player goes through `playerText`

SQL is parameterized (Drizzle), URL params parse to closed sets, server actions re-validate, and
a model's own OUTPUT goes through `validate.ts`. Free text a player TYPES — deck intent, a game
note, Look deeper's free-text question — is the one input that reached a prompt verbatim, framed
only by a sentence asking the model to read it "after the colon". That sentence is a request, not
a boundary. `playerText(label, text, maxChars)` in `src/lib/model/player-text.ts` is the boundary:
it collapses line breaks (so the text cannot start what reads as a new line of instructions),
breaks any literal occurrence of its own delimiter tags inside the text (so the player's words
cannot forge a close and continue past it), and re-checks the field's own cap. Every system prompt
that calls it also carries its one `PLAYER_TEXT_SYSTEM_RULE` line, naming the tags and stating
that anything between them is data, never an instruction.

**Any new free-text field a player types that reaches a model prompt goes through `playerText`.**
Catalog data (a card name, oracle text) is not in scope — the player cannot type it, so it carries
no injection surface — but intent, notes, a free-text question, or anything of that shape is. A
field that reaches a prompt without it is a defect.

## Writing the address bar without navigating

Every `history.replaceState` a page makes to mirror its own state (a filter, a sort, a view, an
open card) or to strip a one-time parameter goes through `mirrorUrl` (`src/lib/url/mirror.ts`),
never `history.replaceState` directly. Next patches `replaceState` so its router adopts the URL
it is given, and adopting a URL while a navigation is pending DROPS that navigation: on main,
`/collection`'s and `/discover`'s mirror effects re-wrote the page's own current URL about 700ms
after a push to `/decks`, and in 3 of 4 cases the reader never left (1f's startup diagnostic,
2026-09-29). `mirrorUrl` makes two rules one definition:

- **A write equal to the live URL is not made.** It changes nothing a reader sees, and it is the
  write that was adopted over the pending push. A path check alone does not catch it, because
  the path has not moved while the push is pending.
- **A write is made only on the page it describes.** Its path must be the live one, and the live
  one must be the path the router has committed, which the provider reports from `usePathname()`
  in a layout effect. A browser Back or Forward moves the address before Next commits the new
  page, so a late write from the page being left would otherwise land over the destination,
  whether it named its own path or read `location.pathname`. Next writes the address in an
  insertion effect, before the provider's layout effect, and every mirror runs in a passive
  effect after both, so a page's own first write sees its own path.
- **No rule about pending navigations.** One was built and dropped (#1145, rounds 4 to 9): every
  fix to when the pending state was published exposed the next timing edge, and no measured case
  showed a legitimate write racing a tap. The two rules above cover every dropped navigation 1f's
  diagnostic logged on main.

`src/lib/a11y/dialog.ts` is the one `replaceState` outside it, deliberately: it puts back the URL
a history POP moved, which is a restore rather than a mirror, and it already skips an equal
write.

## Caching a list a reader flips between

When a control re-fetches the same list under different parameters — a sort order, an
availability mode — cache the payloads in the component that renders them, keyed on those
parameters, and serve a repeat ask from that cache instead of navigating.
`useDiscoveryCache` in `src/components/commanders/discovery-cache.ts` is the reference
implementation; `commanders-view.tsx` shows the other valid answer, shipping every ranking
in one payload when the set of parameters is small enough to precompute.

- **Never Next's `staleTimes`.** It is a global router setting whose blast radius is every
  route in the app, and this codebase has already shipped a bug that way. Component-held
  state caches the one thing being cached and nothing else.
- **A cache lives for one visit.** Leaving the route unmounts it, so a change made elsewhere
  needs no invalidation — there is nothing left to invalidate by the time the reader returns.
  Do not extend a cache's life past its component without an invalidation story.
- **A fresh server payload always wins** over a cached entry for the same key, and is filed
  on its way past. Adjust that during render, not in an effect, or the previous list paints
  once before being corrected.
- **A cache hit still writes the URL**, via `mirrorUrl` rather than the router —
  routing is the request being avoided. Serialise defaults as absences, exactly as the
  navigating path does, and read every parameter you do not own back off the live URL rather
  than rebuilding it.
