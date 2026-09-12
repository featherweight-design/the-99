# Design Brief — A shelf to put decks on

**Workshop:** 2026-09-11, Hugh + agent. No ticket — one of that workshop's five groups. This brief is
the source of truth the Claude Design handoff prompt points at.

**Verified against `origin/main` at `e4b40752` on 2026-09-12.** Every `file:line` below was read on
that commit, not recalled.

A player with a dozen decks has no way to group them. Folders are the answer that was chosen, and
the schema and queries for them are merged (PR #525, migration
`drizzle/0025_classy_romulus.sql`). Nothing draws them, and the reason is that folders need
something `/decks` does not have: a **nav model**. That is what this brief asks Design for — and it
asks it while another handoff is landing a shared filter frame on the same route, which is the
collision §5 exists for.

---

## §1 What is merged, and what it can already answer

| Thing | Where | Notes |
|---|---|---|
| `deck_folders` | `src/db/schema.ts:227` | Scoped to `user_id`; names unique within that scope |
| `decks.folder_id` | `src/db/schema.ts:259` | **Nullable** — unfiled is a first-class state, and every deck that exists today is in it |
| `on delete set null` | `src/db/schema.ts:259` | The delete rule, enforced by the foreign key rather than by a query |
| Indexes | `src/db/schema.ts:274`, `:278` | `(user_id, folder_id)` for the grid, `folder_id` alone for the delete's own scan |
| List with counts | `folders.ts:58` `listFolders` | Ordered by name, deck count per folder, empty folders included |
| Create | `folders.ts:83` `createFolder` | Trims and validates; duplicate names refused by the unique index |
| Move | `folders.ts:104` `moveDeck` | `folderId: null` unfiles. Refuses a folder that is not the player's |
| Delete | `folders.ts:162` `deleteFolder` | Returns false when already gone, so a double submit is not an error |
| Folder on the deck list | `read.ts:405-406`, `:530-531`, `:636-637` | `listDecksWithStats` carries `folderId` and `folderName` on every deck |

Two properties of that last row matter to the drawing: the pair is **always both or neither** (the
join is owner-scoped and the id is projected off the join, `read.ts:552-553`), and an unfiled deck
carries `null` for both. So a grid grouping by folder has, for free, a labelled group per **non-empty**
folder and one unlabelled group of everything unfiled. An empty folder has no deck row and therefore
no group to name — a surface that draws empty shelves reads `listFolders` (`folders.ts:58`) as well,
which returns them with a count of zero.

`pnpm probe:folders` proves the behaviour against a real Postgres, including the delete rule.

---

## §2 Decisions locked in the workshop

1. **A deck lives in exactly one folder, or in none.** Chosen deliberately **over tags**, which
   answer a different question — *what is this deck like* — from the one being asked here: *where do
   I keep it*. This is why the schema is a column and not a join table: two folders is not a state
   the app can reach, so nothing has to pick a winner at read time.
2. **Deleting a folder must not delete its decks.** They return to unfiled. This is a foreign key,
   not a confirmation dialog's promise, so it holds however the folder is deleted.
3. **Unfiled is permanent and normal, not a migration state.** Every deck is unfiled today and a
   player may never file one. "No folders yet" is a state the route lives in indefinitely, not a
   first-run screen it graduates from.

---

## §3 What Design is being asked to call — open

- **§3.1 The nav model.** This is the substance. `/decks` today is one flat grid with no hierarchy
  of any kind. Folders introduce a level above the decks, and the app's only navigation is the
  five-item primary nav (`shell/nav.tsx:35-39`: Home, Collection, Commanders, Discover, Decks).
  There is one existing in-app hierarchy to draw on and it is a thin one: the set pages carry a
  single-line breadcrumb — a `--fg-faint` mono line above the title
  (`src/app/collection/sets/page.tsx:30-32`, and a linked form at
  `src/app/collection/sets/[code]/page.tsx:24-26`). That is a route-to-route trail between two real
  pages, not a level *inside* a route, which is what folders need; Design should say whether folders
  extend that pattern or need their own. Design also says what the level looks like, whether it has
  its own URL, and whether a folder is a place you go or a grouping you see. **§5 constrains this
  answer.**
- **§3.2 Empty states, of which there are three and they are distinguished by where the reader is
  standing.** (i) No folders exist at all, so the route has no shelves to show. (ii) The reader is
  looking at one folder and it holds no decks. (iii) The reader is looking at the unfiled group and
  every deck is filed, so it is the *unfiled* bucket that is empty while folders hold everything.
  Whether (ii) and (iii) are even reachable as separate views depends on §5's answer, which is one
  more reason that question comes first. The route also
  already has a zero state for *no decks* (`DecksZero`, `decks-view.tsx:220-221`) and a separate
  filtered-empty state (`:233-249`), so folders add to a route that already distinguishes two kinds
  of nothing.
- **§3.3 Move.** Where the control lives — on a deck, on a folder, or both — and what it looks like
  for the two directions the query supports: filing a deck, and unfiling it (`folders.ts:104`
  takes `null` for exactly that). Multi-select is not in the schema's way and not in the workshop's
  decisions either; if Design wants it, say so and it becomes engineering scope.
- **§3.4 Delete, and what it promises.** The decks survive (decision 2), so the confirmation — if
  there is one — should say what actually happens rather than warn about what does not. Design
  writes that sentence; it is the one place a wrong word makes a safe action read as destructive.
- **§3.5 Create and rename.** Create is merged; **rename is not built** — there is no
  `renameFolder` in `folders.ts`, deliberately, because a rename affordance is a design question
  before it is a query. If Design draws one it is a small addition to the merged layer. Names are
  trimmed, capped at the deck-name ceiling and unique per player (`folder-name.ts`), so a duplicate
  name is a refusal the UI has to state.
- **§3.6 Whether the folder appears on a deck.** `folderName` is on every deck the list returns, so
  a tile could state its shelf. Whether it should — or whether that is noise once the grid is
  grouped — is Design's.

---

## §4 What the route looks like today

`/decks` loads the list and hands it to `DecksView` (`src/app/decks/page.tsx:32-43`), which owns the
filters, the order and the URL that carries both. Filter state is client state written back with
`history.replaceState` (`decks-view.tsx:103-107`) rather than a navigation — the route does not
re-render when a filter changes.

The layout is a desktop **sidebar sibling** of the grid: `DeckFilterColumn` and the deck content sit
side by side in a `sm:flex-row` (`decks-view.tsx:223-224`), which is the width cost the chassis work
is removing. Sort is separate from the filters on desktop (`DeckSortMenu`, `decks-view.tsx:173`) and
inside the sheet on mobile.

**That sidebar is going.** `2026-09-11-one-filter-chassis.md` decision 4 removes it and the
commander-image brief spends the width it returns. So folders cannot be drawn as "the thing that
replaces the sidebar" without colliding with two briefs at once — the space is already allocated.

---

## §5 The collision — is a folder a filter dimension or a nav level?

**This has to be answered before either design is finished, because the answer changes both.**

The filter chassis is live right now. `docs/superpowers/readiness-filter-chassis.md` records
**🟢 Green, audited 2026-09-11 at R2**, and the tracker
(`docs/superpowers/design-pipeline-status.md:64`) has the build starting immediately, sliced by
route, with `/decks` in the first slice. The handoff is `design/design_handoff_the99_filter_chassis/`.
Its README (`:84`) states the chassis "holds five dimensions, mounts on four routes, and opens
every dimension with one panel shape"; on `/decks` those are search, status, colour and the
played-window. **Sort is not among them** — decision 19 (`README.md:192-193`) is the load-bearing
ruling here, and it gives the chassis "slots, not a dimension list": a field slot, a pip slot, an
ordered run of dimension slots, and **a trailing slot for sort**, which is why `Clear all filters`
(`README.md:150`) clears every dimension and never the sort. So the question below is whether a
folder is one more dimension slot in that ordered run.

**The chassis handoff says nothing about deck folders** — verified by search across its README and
`STATES-filter-chassis.md`; the only `folder` in either is `README.md:39` describing its own
directory. So the two designs currently have no shared answer, and there are only
two coherent ones:

**(a) A folder is one more dimension.** It becomes a slot in the chassis, opening the same panel
every other dimension opens, appearing in the same chip line, cleared by the same `Clear all
filters`. Consequences: folders inherit a frame that is drawn, audited and about to be built, and
`/decks` goes from four filter dimensions to five (`DeckFilters`, `src/lib/decks/filter.ts:38-43`,
is search, status, colour and the played-window; sort has its own trailing slot and is not one of
them) — **six controls in the bar, where the chassis was drawn and audited at five.** That makes
this branch an amendment to the chassis needing its own density pass at both widths, not a free
slot in a frame that already fits. It also
makes a folder *combinable* — folder plus status plus colour — and makes "which folder am I in"
survive only as long as a filter chip does. And `Clear all filters` would drop the folder along with every other dimension, returning the
reader to all decks — nothing is lost but the shelf they were standing in, which may be the right behaviour or may
be the tell that this branch is wrong.

**(b) A folder is a nav level above the filters.** The chassis stays at five dimensions and filters
*within* whatever the level selects. Consequences: folders need their own frame, their own URL
question (§3.1) and their own empty states, and the two must be drawn to sit above a chassis whose
placement relative to content is itself part of the chassis handoff. It also makes the two concepts
legible — a shelf is where the decks are, a filter is which of them you are looking at — at the cost
of a second piece of chrome on a route that just gave up its sidebar to reclaim width.

**The brief does not pick.** It names the pick as the first thing Design decides, because everything
in §3 follows from it and because the chassis is being built now: if the answer is (a), the folder
slot should reach the chassis team as an amendment before their `/decks` slice lands rather than
after. Either way, the requirement is one way to narrow the list, not two. A folder rail beside a
chassis that also filters by folder is the outcome this section exists to prevent.

**One engineering fact bears on the choice and should not be inferred either way.** Filters on
`/decks` are client-side over an already-loaded list, written to the URL with `replaceState` and no
navigation (`decks-view.tsx:103-107`); the folder is a column on every deck the page already loaded
(`read.ts:636-637`). So (a) is nearly free and (b) is a routing decision rather than a data one:
the deck payload is the same list under both. The one addition either branch may need is
`listFolders` (`folders.ts:58`) — `/decks` loads the deck list and the shopping roll-up and nothing
else today (`src/app/decks/page.tsx:32-43`), and a deck row cannot name a folder holding no decks,
so any surface that shows empty shelves reads that query as well.

---

## §6 Out of scope

- **Nesting.** One deck, one folder (decision 1) says nothing about whether folders nest, and
  nothing in the schema supports it — `deck_folders` has no parent column (`schema.ts:227-231`).
  Folders are flat in this round.
- **Folders anywhere but `/decks`.** Home renders decks in two lists and a
  roll-up (`ResumeDecks`, `DeckRail` and `CommitmentsCard`, `dashboard.tsx:115`, `:119`, `:123`),
  and the home redesign is a separate, later brief. Whether Home ever groups by folder is that
  brief's question, and it inherits whatever this one settles.
- **Rename** is open as a design question (§3.5) but its query does not exist yet; if Design draws
  it, engineering adds one function to a merged, probed layer.
