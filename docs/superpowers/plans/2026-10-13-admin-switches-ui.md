# Plan: Admin PR 8, the Switches UI

2026-10-13. This builds the Switches half of `design/design_handoff_the99_admin/` (R2 canvas, frames
A2 to A7; STATES L, F; design table sections Switches list, Switch page and Confirm). It sits on top
of what has shipped:

- Admin PRs 1 to 7d: the gate, the shell, Costs, the switch tables, the resolver, and adoption.
  Adoption is complete as of #1653, where `check:switch-reads` holds the rule.
- The approved plan is `boards/lane-handoffs/admin-plan-2026-10-12.md`. Hugh approved it in full,
  including its "Corrections the plan makes to the handoff".

Groups and Accounts management is PR 9. This plan reads groups and accounts only where Switches
needs to: the account universe, the group picker, and names in history.

Scope, from the approved plan:

- `/admin/switches` as the second tab, after Costs (Hugh's ruling).
- The list, rendered from the registry.
- Per-switch overrides at app-wide, group and account scope, following the ladder.
- The kill switch refuses overrides, and `Not set` deletes the row.
- A plumbing switch is app-wide only, and the action refuses any other scope.
- A confirm when a write raises a model feature.
- History from `admin_events`.
- Check an account.
- Every write runs mutate, then an `admin_events` row, in one transaction, and clears the memo
  after the commit.
- `requireAdmin()` is the first line of every action.
- Phone and desktop parity in each PR.

## What the code says today (measured, not assumed)

- **32 switches**, not 24 or 27 (`src/lib/switches/registry.ts`). Five more have landed since the
  plan: `LINEUP`, `RATE_LIMIT`, `SOCIAL_FRIENDS`, `SOCIAL_GAMES` and `SOCIAL_WISHLIST`.
  - **Tagged `model` (5):** `FIND_A_DECK_READ`, `HELP_ME_CHOOSE`, `OVERVIEW_V2`, `PROPOSED_CUTS`,
    `TUNING`.
  - **Tagged `plumbing` (3):** `LABEL_ROLE_COUNTS`, `LIST_CACHE`, `RATE_LIMIT`.
  - **Tagged `feature`:** the other 24.
- **Seven switches are compound, read from their flag functions:**
  - `ADDED_COPY` and `SHOPPING_MARK_BOUGHT` need `COLLECTION_EDIT`.
  - `FIND_A_DECK_READ` needs `SWAP_TOOLS`.
  - `MANA_BALANCE`, `PROPOSED_CUTS` and `TUNING` need `ANALYSIS_TAB`.
  - `SOCIAL_GAMES` needs `SOCIAL_FRIENDS`.

  The registry records none of these relationships.
- **Staging data**, read 2026-10-13 on branch `br-polished-pond-a6e63y0b`, with the branch id
  checked:
  - 0 `flag_overrides` rows, 0 `flag_groups` rows, 0 members.
  - 4 `admin_events` rows, all `setting_set`.
  - 2 accounts, by distinct `user_id` in `user_data_stamps` and in `model_calls`.

  So the first view is the empty one: nothing is overridden and no group exists.
- **The memo.** `clearSwitchSnapshot()` has no caller yet. `snapshot.ts` says it is called "after
  its transaction commits". It clears only the server bundle's memo. The proxy resolves every
  signed-in request through its own module instance (see `request.ts`), and hands pages its bits on
  `x-switches`. So even the admin's own next page can carry the old bits for up to 30 seconds. The
  copy already says "within 30 seconds", and the admin pages themselves read the tables fresh (see
  below), so this needs no change. It is why the clear is never promised as "instant on this server".
- **The action gate is already enumerated.** `src/app/admin/actions.test.ts` walks every
  `"use server"` module under `src/app/admin` recursively, and fails on an export whose first
  statement is not `await requireAdmin()`. A new `switches/actions.ts` is covered with no new
  machinery. **No such test exists for pages.** 8a adds one (see 8a's tests).
- **`check:switch-reads` constrains where the raw environment is read.** The admin page must show
  each variable's raw value (`off` included, which the `x-switches` bits cannot carry). It must also
  run the resolver over every account. Handing the `process.env` object to `resolveEnv` from
  `src/lib/admin/` would be a finding. So both helpers live under `src/lib/switches/`, which the
  check exempts, and the code outside that directory receives plain data.
- **There is no Clerk user lookup in `src/` yet.** The account universe (audit finding 6) is
  needed by Switches, for `N of T on`, Check an account, the account picker and the confirm's
  on-count. So it lands here in 8a, and PR 9 builds Accounts on it.

## PR boundaries (no stacking, one at a time)

The work splits into three PRs. Each one ships, works and is dark-safe on its own. The admin
answers 404 to anyone outside `ADMIN_USER_IDS`, and nowhere without `ADMIN_ENV_LABEL`. So "dark"
here means no player-visible change. Only 8c can change what a player sees, and only when Hugh
presses a control.

| PR | What | Files (est.) | Production lines (est.) | Test lines (est.) |
|---|---|---|---|---|
| 8a | The data layer and the list: `needs` in the registry, the flag map, the shared decide/explain, the account universe, `/admin/switches`, the Switches tab | 18 | ~850 | ~700 |
| 8b | The switch page, read-only: ladder, banners, override rows as text, history, Check an account | 11 | ~650 | ~450 |
| 8c | The writes: actions, the App-wide segment, On/Off/Clear on rows, add pickers, the model confirm, the probe | 17 | ~800 | ~650 |

**Why three PRs, not two.** The suggested two-way split was a read-only Switches PR, then a writes
PR. That puts the list, the detail page and Check an account in one PR: roughly 1,500 production
lines across about 25 files, against the ~800 and ~20 bar. The precedent is Costs, which shipped as
2b (core) and then 3b (detail).

**Why the writes stand alone.** They are the security-relevant diff:

- the gate on every export,
- the refusals,
- the transaction order,
- the memo clear.

Review rounds there should not be spent on layout.

**Named fallback boundaries.** These are named before the build, so splitting further is a
decision already taken, not one made under pressure.

- **8a.** If 8a measures over ~1,000 production lines at the pre-push gate, it splits into:
  - **8a-1, data, no UI:** registry `needs` and retags, `flags.ts`, `resolve.ts` / `explain`,
    `accounts.ts`, `switches.ts`, `switches-rule.ts` and their tests.
  - **8a-2, the list UI:** page, view, head tab, copy and inventory.
- **8c.** If 8c measures over ~1,000, the add pickers (STATES F7, F8) split into 8d.
  - 8c then ships the App-wide segment and the On/Off/Clear controls on existing rows, with the
    confirm.
  - 8d ships Add a group override and Add an account override.
  - Both are shippable: 8c alone can still set and clear app-wide overrides, which is the
    kill-a-feature job the phone exists for (README IA 5).

**8b's row links.** In 8a, list rows are plain text. 8b turns each into a link to the switch page,
so no 8a row leads to a 404.

## Route × viewport inventory (feature-acceptance artifact 1)

Acceptance widths are the contact sheet's: 390 and 1300. The handoff draws 900. The design table
reads "Desktop = 900, from `md` up", so 1300 renders the desktop layout.

| Route / state | PR | 390 | 1300 | Shares with |
|---|---|---|---|---|
| `/admin` head: tab strip now `Costs · Switches` | 8a | ☐ | ☐ | origin of `AdminHead` |
| `/admin/switches`: default (L1), Features then Plumbing | 8a | ☐ | ☐ | `AdminHead` |
| `/admin/switches`: chip `Model features` selected (L2) | 8a | ☐ | ☐ | — |
| `/admin/switches`: search, no match (L2/L3 `None match.` + `Show all`) | 8a | ☐ | ☐ | — |
| `/admin/switches`: scrolled, column head and pinned bar stay put (R2 delta 1) | 8a | ☐ | ☐ | sticky pattern from Costs' month bar |
| `/admin/switches`: kill row (L4), local server with `DECK_BENCHMARKS_ENABLED=off` | 8a | ☐ | ☐ | — |
| `/admin/switches`: compound row, parent off (L5), local `COLLECTION_EDIT_ENABLED=false` | 8a | ☐ | ☐ | — |
| `/admin/switches/[name]`: model switch, ladder + empty sections (F1 shape) | 8b | ☐ | ☐ | `AdminHead` detail mode |
| `/admin/switches/[name]`: compound, parent off (F4) | 8b | ☐ | ☐ | — |
| `/admin/switches/[name]`: kill (F5) | 8b | ☐ | ☐ | — |
| `/admin/switches/[name]`: plumbing, App-wide + History only (F6) | 8b | ☐ | ☐ | — |
| `/admin/switches/[name]?account=…`: Check an account | 8b | ☐ | ☐ | — |
| `/admin/switches/[name]`: no history (F13) | 8b | ☐ | ☐ | — |
| `/admin/switches/[name]`: App-wide segment live, Clear on rows (F9, F10) | 8c | ☐ | ☐ | — |
| `/admin/switches/[name]`: model confirm, dialog at 1300, sheet at 390 (F3) | 8c | ☐ | ☐ | `useDialogA11y` like `setting-dialog.tsx` |
| `/admin/switches/[name]`: kill, controls disabled and Clear live (F5) | 8c | ☐ | ☐ | — |
| `/admin/switches/[name]`: Add an account override open (F7) | 8c | ☐ | ☐ | — |
| `/admin/switches/[name]`: Add a group override, no groups yet (F8) | 8c | ☐ | ☐ | — |
| `/admin/switches/[name]`: group on-flip line (F12), once PR 9 makes a group | 8c / PR 9 close-out | ☐ | ☐ | — |
| `/admin/switches/[name]`: write failed (F11) | 8c | unit test only | unit test only | — |

**Fixture discipline.**

- 8a and 8b only read, so the contact sheet runs against a local `next start` pointed at local-dev
  or a scratch branch.
- The server is started with these set:
  - `ADMIN_USER_IDS` naming the signed-in account,
  - `ADMIN_ENV_LABEL`,
  - for the kill and compound rows, `DECK_BENCHMARKS_ENABLED=off` and
    `COLLECTION_EDIT_ENABLED=false`.
- 8c's rows press controls. The confirm row presses `On` on a model switch, and the confirm
  intercepts it, so nothing is written. Even so, **8c's sheet runs only against local-dev or a
  scratch branch, never staging.** Measuring on staging is read-only by rule.

**Draft inventory: rows appended to `docs/superpowers/inventories/admin.json`, each PR adding its
own.** The `clickRole` names follow the controls' accessible names as built. The App-wide segment
is a `radiogroup` named `App-wide`.

```json
[
  { "id": "admin-tabs-costs", "label": "/admin: the tab strip now reads Costs · Switches (8a)", "view": "src/components/admin/admin-head.tsx",
    "steps": [{ "goto": "/admin", "wait": "h1", "settle": 1500 }] },
  { "id": "admin-switches-list", "label": "/admin/switches: Features A to Z, then Plumbing (L1)", "view": "src/components/admin/switches-list.tsx",
    "steps": [{ "goto": "/admin/switches", "wait": "h1", "settle": 1500 }] },
  { "id": "admin-switches-model-chip", "label": "/admin/switches: Model features selected (L2)", "view": "src/components/admin/switches-list.tsx",
    "steps": [{ "goto": "/admin/switches", "wait": "h1", "settle": 1000 }, { "clickRole": "button", "name": "^Model features" }, { "settle": 400 }] },
  { "id": "admin-switches-none-match", "label": "/admin/switches: a search that matches nothing (L2, L3)", "view": "src/components/admin/switches-list.tsx",
    "steps": [{ "goto": "/admin/switches", "wait": "h1", "settle": 1000 }, { "fill": "input[type=search]", "text": "zzzz" }, { "settle": 400 }] },
  { "id": "admin-switches-scrolled", "label": "/admin/switches: scrolled to Plumbing; head, pinned bar and column head stay put (R2 delta 1)", "view": "src/components/admin/switches-list.tsx",
    "steps": [{ "goto": "/admin/switches", "wait": "h1", "settle": 1000, "scrollTo": "[data-testid='switches-plumbing-head']" }] },
  { "id": "admin-switch-model", "label": "/admin/switches/PROPOSED_CUTS_ENABLED: ladder, Needs rung, sections (F1 shape) (8b)", "view": "src/components/admin/switch-page.tsx",
    "steps": [{ "goto": "/admin/switches/PROPOSED_CUTS_ENABLED", "wait": "h1", "settle": 1500 }] },
  { "id": "admin-switch-compound", "label": "/admin/switches/SHOPPING_MARK_BOUGHT_ENABLED: parent off banner (F4); server COLLECTION_EDIT_ENABLED=false", "view": "src/components/admin/switch-page.tsx",
    "steps": [{ "goto": "/admin/switches/SHOPPING_MARK_BOUGHT_ENABLED", "wait": "h1", "settle": 1500 }] },
  { "id": "admin-switch-kill", "label": "/admin/switches/DECK_BENCHMARKS_ENABLED: kill banner, controls disabled, Clear live (F5); server DECK_BENCHMARKS_ENABLED=off", "view": "src/components/admin/switch-page.tsx",
    "steps": [{ "goto": "/admin/switches/DECK_BENCHMARKS_ENABLED", "wait": "h1", "settle": 1500 }] },
  { "id": "admin-switch-plumbing", "label": "/admin/switches/LIST_CACHE_ENABLED: App-wide and History only (F6)", "view": "src/components/admin/switch-page.tsx",
    "steps": [{ "goto": "/admin/switches/LIST_CACHE_ENABLED", "wait": "h1", "settle": 1500 }] },
  { "id": "admin-switch-check", "label": "/admin/switches/TUNING_ENABLED?account=: Check an account with its source", "view": "src/components/admin/check-account.tsx",
    "steps": [{ "goto": "/admin/switches/TUNING_ENABLED?account=${ADMIN_CHECK_USER_ID}", "wait": "h1", "settle": 1500, "scrollTo": "[data-testid='check-account']" }] },
  { "id": "admin-switch-history", "label": "/admin/switches/TUNING_ENABLED: History, or its empty line (F13)", "view": "src/components/admin/switch-page.tsx",
    "steps": [{ "goto": "/admin/switches/TUNING_ENABLED", "wait": "h1", "settle": 1500, "scrollTo": "[data-testid='switch-history']" }] },
  { "id": "admin-switch-confirm", "label": "/admin/switches/HELP_ME_CHOOSE_ENABLED: On raises a model feature, so the confirm opens (F3); server HELP_ME_CHOOSE_ENABLED=false; LOCAL-DEV ONLY (8c)", "view": "src/components/admin/model-confirm.tsx",
    "steps": [{ "goto": "/admin/switches/HELP_ME_CHOOSE_ENABLED", "wait": "h1", "settle": 1500 }, { "clickRole": "radio", "name": "^On$" }, { "wait": "[role=dialog]", "settle": 600 }] },
  { "id": "admin-switch-add-account", "label": "/admin/switches/SWAP_TOOLS_ENABLED: Add an account override, lookup open (F7) (8c)", "view": "src/components/admin/override-picker.tsx",
    "steps": [{ "goto": "/admin/switches/SWAP_TOOLS_ENABLED", "wait": "h1", "settle": 1500 }, { "clickRole": "button", "name": "^Add an account override$" }, { "settle": 400 }] },
  { "id": "admin-switch-add-group", "label": "/admin/switches/SWAP_TOOLS_ENABLED: Add a group override with no groups yet (F8) (8c)", "view": "src/components/admin/override-picker.tsx",
    "steps": [{ "goto": "/admin/switches/SWAP_TOOLS_ENABLED", "wait": "h1", "settle": 1500 }, { "clickRole": "button", "name": "^Add a group override$" }, { "settle": 400 }] }
]
```

There is no `shares` block. The one shared component is `AdminHead`, which the layout renders once
for every admin route. So `check:shared` has nothing to compare, and the `admin-tabs-costs` row is
the proof that the Costs page carries the new tab.

## The rules every PR holds

These cover resolution, the ladder, the counts and the confirm.

- **One decision function.** `resolve.ts` gains `decide(name, kind, base, snapshot, userId)`, which
  returns `{ value: "on" | "off", source }`. `source` is one of:
  - `kill`,
  - `account`,
  - `group` (with the group id),
  - `app`,
  - `env`.

  `resolveEnv` is rewritten as a map over `decide`, so Check an account, the ladder's `decides for
  N`, the list's counts and the confirm's on-count use the same rule as every request. The existing
  `resolve.test.ts` must pass unchanged. The README says "Check an account calls the same resolver
  as the request path, so it can't drift", and that is what this makes structurally true.
- **Effective means through the flag function.** `src/lib/switches/flags.ts` maps every
  `SwitchName` to its own flag function: `TUNING_ENABLED` to `tuningEnabled`, and so on. A switch
  is "on for an account" when its flag function returns true over that account's resolved env.
  So a child whose parent is off counts as off, with the source `parent`, which the Needs rung
  decides. That is how the handoff's L5 and F4 read.
- **The account universe** is `listAccounts()` (`src/lib/admin/accounts.ts`; audit finding 6):
  - Clerk `users.getUserList`, paged, server-side.
  - If that fails, the distinct `user_id` of `user_data_stamps` ∪ `model_calls`, with the
    `clerk: "down"` flag. `system` is never an account.
  - The order is owner first (`ADMIN_USER_IDS`), then A to Z by name, then by id.

  `T` in `N of T on` is its length. Signed-out readers are not counted. The footnote says how they
  resolve.
- **The admin reads the tables fresh, never through the memo.** `snapshot.ts` exports its
  repeatable-read reader as `readSwitchSnapshot()`, uncached. The admin's loaders call it, so a page
  drawn after a write shows that write. The 30-second window applies to players, not to this page.
- **The raw environment stays under `src/lib/switches/`.**
  - `switchEnvValues()` returns `{ [name]: string | undefined }` by member reads, which are not
    `check:switch-reads` findings.
  - `explainForAccounts(snapshot, userIds)` runs `decide` plus the flag functions with the
    process environment as the base.

  Admin code receives plain data.
- **The model rise** is what the confirm fires on (audit finding 2, which supersedes READINESS
  G3).
  - `MODEL_CAPABILITIES` in `flags.ts` lists, per `ModelFeature`, the predicate that decides
    whether an account can press it:
    - `synopsis` is `analysisTabEnabled`,
    - `overview_v2` is `analysisTabEnabled && overviewV2Enabled` (a change of method and model
      that moves spend),
    - `tuning` is `tuningEnabled`,
    - `proposed_cuts` is `proposedCutsEnabled`,
    - `intake` is `helpMeChooseEnabled`,
    - `fits_read` is `findADeckReadEnabled`.
  - A write raises when, for some capability, the count of accounts with it on is higher after the
    write than before. Both counts are computed with `decide` over the same snapshot, with the
    write applied in memory.
  - So turning `ANALYSIS_TAB` on for a group confirms, even though it is the parent, and clearing
    an app-wide `off` over an env `true` confirms, as F3 and F9 draw.
  - Turning something off never raises.

## PR 8a: the data layer and the list

### Files

**Change**

- `src/lib/switches/registry.ts`:
  - Add `needs?: SwitchName` on the seven compound entries.
  - Retag `ANALYSIS_TAB_ENABLED` as `model` (audit finding 2).
  - Retag `ABOUT_SHEET_ENABLED` and `HOW_IT_WORKS_ENABLED` as `plumbing`. This one is subject to
    open question 1, and lands only if it is ruled.
- `src/lib/switches/registry.test.ts`: the pinned plumbing and model sets move with the retags.
- `src/lib/switches/resolve.ts`: `decide()`, with `resolveEnv` rebuilt on it. No behavior change
  beyond the retags.
- `src/lib/switches/snapshot.ts`: export `readSwitchSnapshot()`, uncached. `switchSnapshot()`
  keeps its memo over it.
- `src/components/admin/admin-head.tsx`:
  - `ADMIN_TABS` gains `{ key: "switches", href: "/admin/switches" }` after Costs.
  - The `sub` is the handoff's `switches.sub`.
- `src/lib/copy/admin.ts`:
  - The `switches.*` list strings.
  - A `switchCopy: Record<SwitchName, { label; description }>` covering all 32 (see Copy).
- `docs/superpowers/inventories/admin.json`: 8a's rows.
- `AGENTS.md`: the "Feature switches resolve per reader" paragraph's list of plumbing switches
  moves with the retag, if open question 1 is ruled that way.

**Add**

- `src/lib/switches/flags.ts`: `SWITCH_FLAGS` (name to flag function) and `MODEL_CAPABILITIES`.
  Server-side by its imports. `src/lib/about/visible.ts` keeps its own `SWITCHES` map, which covers
  About's subset; 8c reads `visibleEntries` for the What's new count.
- `src/lib/switches/flags.test.ts`:
  - Every registry name is mapped.
  - `needs` agrees with the flag functions. With the parent false and everything else true, the
    child reads false. A switch with no `needs` reads true with every other switch false.
  - Every `model` switch, raised alone from all-off with its `needs` on, raises at least one
    capability.
- `src/lib/switches/explain.ts`: `switchEnvValues()` and `explainForAccounts()`, both under the
  exemption.
- `src/lib/switches/explain.test.ts`: every source kind. The kill switch beats an account `on`. A
  plumbing switch ignores group and account rows. `parent` when the raw value is on and the flag
  function is off. A rebuilt `resolveEnv` equals the old output over a table of snapshots.
- `src/lib/admin/accounts.ts`: `listAccounts()`. Nothing from Clerk is stored (G4).
- `src/lib/admin/accounts.test.ts`:
  - Clerk paged.
  - Clerk throws: ids from both tables, `system` dropped, `clerk: "down"`.
  - The order.
- `src/lib/admin/switches-rule.ts`, pure. Per switch:
  - the env value,
  - the app-wide override,
  - the override counts (groups, accounts, and refused under a kill),
  - resolved `on | off | mixed` with `n of T` and the all-off reason (kill, or parent off),
  - the chip predicates (`overridden`, `offForAnyone`, `model`),
  - search over the label and the variable, case-insensitive.

  It also gives the group heads, Features and Plumbing, with their counts.
- `src/lib/admin/switches-rule.test.ts`.
- `src/lib/admin/switches.ts`: `loadSwitchesList()`. It reads `readSwitchSnapshot()`,
  `listAccounts()` and `explainForAccounts()`, then the rule.
- `src/app/admin/switches/page.tsx`: `requireAdmin()` first. `generateMetadata` goes through
  `adminMetadata({ title: "Switches" })`.
- `src/components/admin/switches-list.tsx`, a client component:
  - search and chips, pinned `sticky` at `top: var(--admin-head-h)`, publishing its own height;
  - the column head `sticky` beneath both (desktop);
  - the two group heads;
  - rows with tags (`model`, `needs X`), the variable, the description, the env value (`off` in
    600 `--danger`), the resolved pill and the sub;
  - the phone's meta line;
  - the footnote.
- `src/components/admin/switches-list.test.tsx`:
  - chips filter, and the heads keep their counts;
  - `None match.` and `Show all`;
  - the Plumbing head hides with no rows;
  - kill and compound rows read per L4 and L5;
  - every `SwitchName` has a label and a description.
- `src/app/admin/pages.test.ts`: a static test, owed by the plan's Security section. Every
  `page.tsx` and `layout.tsx` under `src/app/admin` must:
  - await `requireAdmin()` as the first statement of its default export;
  - send any `generateMetadata` through `adminMetadata`.

  Its failure path is run before it is believed. The test is first run against a page with the gate
  moved to line 2.

That is 18 files.

### Guards

- 8a has no writes.
- The page runs `requireAdmin()` first. The layout already does too.
- An unknown `?` parameter is ignored.

### Tests to run

- `pnpm typecheck && pnpm lint && pnpm test`, plus the stub-DB build.
- `pnpm check:switch-reads`, `check:list-cache`, `check:tokens`, `check:border-collision` and
  `check:copy-drift`, since the design table quotes copy.

## PR 8b: the switch page, read-only

### Files

**Add**

- `src/app/admin/switches/[name]/page.tsx`: `requireAdmin()` first, then `isSwitchName(name)`,
  else `notFound()`. That order means a stranger learns nothing about which names exist. Reads
  `?account=`. `generateMetadata` goes through `adminMetadata` with the switch's label.
- `src/lib/admin/switch-page-rule.ts`, pure:
  - **The ladder:** Account, Group, App-wide, Env var, then Needs when the switch has a parent.
    Each rung's value and `decides for N` come from the per-account sources. The rungs that
    decide are raised.
  - **The result foot:** `On for all T` / `Off for all T` / `On for n of T: names`.
  - **Banners:** kill (F5) and compound with the parent off (F4).
  - **The rows:** override rows by scope, with their note, `updated_at` and `updated_by`, and
    `refused` under a kill.
  - **History rows** from `admin_events`, with the actor and target named through the account
    list, falling back to the id, and group names falling back to an id prefix when the group is
    gone.
  - **The per-account explanations** for Check an account.
- `src/lib/admin/switch-page-rule.test.ts`.
- `src/components/admin/switch-page.tsx`:
  - the ladder, the banners, App-wide shown as text in 8b;
  - Groups and Accounts sections, with no section for plumbing (F6) and `No group override.` /
    `No account override.` when empty;
  - History, `data-testid="switch-history"`, with `No overrides yet.` and the footnote.
- `src/components/admin/check-account.tsx`, a client component, `data-testid="check-account"`:
  - A select of the universe.
  - The result is `On`/`Off` with its source.
  - `clerkDown` above it when names failed.
  - The choice mirrors `?account=` through `mirrorUrl`. No navigation: the explanations for every
    account ship with the page, and T is small.
- `src/components/admin/switch-page.test.tsx` and `check-account.test.tsx`.

**Change**

- `src/lib/admin/switches.ts`: `loadSwitchPage(name)`. One `readSwitchSnapshot()`, the groups,
  `admin_events where switch = name order by at desc, id desc limit 100`, and the universe.
- `src/components/admin/admin-head.tsx`: detail mode, keyed on `/admin/switches/<NAME>`.
  - The title is the switch label, with the variable in mono beside it.
  - The tags.
  - `‹ Switches` at the right of the eyebrow row.
  - The sub is the description.
  - The tab strip stays, with Switches selected.
  - The label is looked up from `switchCopy` with the client-safe registry, so the layout keeps
    its single `AdminHead`.
- `src/components/admin/switches-list.tsx`: each row becomes a `<Link>` to its page.
- `src/lib/copy/admin.ts`: the switch-page strings.
- `docs/superpowers/inventories/admin.json`: 8b's rows.

That is 11 files.

### Guards

- 8b has no writes.
- The page runs `requireAdmin()` first, then validates the name.
- `?account=` is matched against the universe, and an unknown id selects nothing.

## PR 8c: the writes

### Files

**Add**

- `src/app/admin/switches/actions.ts`, `"use server"`, with two exports. Each one's first
  statement is `const { userId } = await requireAdmin();`, and each then calls the lib.
  - `setSwitchOverride({ switchName, scope, groupId?, targetUserId?, value: "on" | "off", note?, confirmed? })`
  - `clearSwitchOverride({ switchName, scope, groupId?, targetUserId?, confirmed? })`. App-wide
    `Not set` is this.
- `src/lib/admin/switch-writes.ts`: `writeOverride(actorId, input)`, the transaction (below).
  A static test pins that only `src/app/admin/**` imports it, so no other module can expose an
  ungated path to it.
- `src/lib/admin/switch-writes-rule.ts`, pure:
  - `validate(input, envValues, universe, groupIds)`, which returns a refusal or a normalized write.
  - `applyWrite(snapshot, write)`.
  - `modelRise(before, after, universe)`. Per capability, the accounts that gain it, with their
    names.
- `src/lib/admin/switch-writes-rule.test.ts` and `switch-writes.test.ts`. The latter uses a
  recording transaction, as `actions.test.ts` does.
- `src/components/admin/override-controls.tsx`, a client component:
  - The App-wide segment, `Not set` / `On` / `Off`, as a `radiogroup`.
  - On/Off on override rows, plus Clear.
  - F10: the pressed option holds, the others are disabled, and there is no spinner.
  - F11: `Didn’t save. Nothing changed.` plus `Try again`.
  - F5: disabled under a kill with `appRefused`. Clear stays live.
  - F12: the inline What's new line on a group on-flip of a non-model switch.
- `src/components/admin/override-picker.tsx`:
  - **F7.** `Add an account override` opens an inline lookup. It filters the page's universe by
    name, email or id prefix, and shows up to 7 results. Picking one adds a pending row, with
    On/Off unset and a note field. Nothing is written until On or Off is pressed.
  - **F8.** The same for groups. A group that already has a row reads `already set` and is
    unselectable. With no groups (staging today, until PR 9), the picker reads `No groups yet.`
- `src/components/admin/model-confirm.tsx` (F3): a dialog at desktop, a sheet at phone, through
  `useDialogA11y`, built as `setting-dialog.tsx` is.
  - The facts: Who, Cost, What's new, When.
  - An optional note.
  - `Turn on for n` / `Cancel`.
  - It renders the server's preview, never a figure computed in the client.
- `src/components/admin/override-controls.test.tsx`, `override-picker.test.tsx` and
  `model-confirm.test.tsx`.
- `scripts/probe-admin-switches.mts`, plus a `package.json` script `probe:admin-switches` and a
  `docs/probes.md` entry. On a scratch branch, by `neon.branch_id` and never staging or
  production, it checks that:
  - the constraint accepts all 32 names and refuses another;
  - set writes one row and one `override_set`;
  - a second set on the same target updates and does not insert;
  - clear deletes and writes `override_cleared` with `old_value`;
  - a kill or plumbing refusal writes nothing;
  - `readSwitchSnapshot()` after the commit carries the change.

**Change**

- `src/components/admin/switch-page.tsx`: mounts the controls and the pickers.
- `src/app/admin/actions.test.ts`: the "finds the admin's action modules" assertion lists
  `switches/actions.ts`. The rest of the static gate covers it already.
- `src/lib/copy/admin.ts`: the write and confirm strings.
- `docs/superpowers/inventories/admin.json`: 8c's rows.
- `AGENTS.md`: one sentence in the switches paragraph. An admin write commits, then clears its own
  instance's memo. The proxy's memo, which feeds every page's switches, catches up within 30
  seconds.

That is 17 files.

### The write, in order

1. **Outside any transaction:**
   - `requireAdmin()`, which is the action's first line;
   - `listAccounts()` (Clerk is never called while a connection is held);
   - `switchEnvValues()`;
   - `validate()`.

   `validate()` refuses each of the following. A refusal writes nothing and makes no event.

   | Code | Refused when |
   |---|---|
   | `switch` | `isSwitchName` fails |
   | `scope` | the scope is not one of the three |
   | `plumbing` | a plumbing switch, at any scope but `app` |
   | `killed` | a set while the env value is `off`. A clear is allowed, since F5 says "Clear still works" |
   | `target` | a group or account target missing, or one given where the scope takes none |
   | `account` | an account not in the universe |
   | `value` | the value is not one of the allowed ones |
   | `note` | a note over 500 characters, which is refused and never cut, the Costs rule |

2. **One transaction, `db.transaction`:**
   1. `pg_advisory_xact_lock(hashtextextended('admin_switches', 0))`. This is one key for every
      switch write, because a parent's write changes its children's rise. One admin means no
      contention.
   2. For a group scope, `select … from flag_groups where id = $1 for share`. A missing group is
      refused as `group`.
   3. Read the current snapshot inside the transaction: every override, and the memberships. Read
      the target row `for update`.
   4. Compute `modelRise(before, applyWrite(before, write), universe)`.
      - If anything rises and `confirmed` is not exactly the rise's account count, return
        `{ ok: false, error: "confirm", preview }`. The preview carries:
        - who: names, and the count;
        - per capability: the `featureWorstCaseMicroUsd` reservation, and the priced mean when one
          exists, by one `avg(cost_micro_usd)` over priced `model_calls` of that feature;
        - the credits: owner and friend limits from `allowance-rule.ts`;
        - What's new: the accounts whose `visibleEntries` gain an entry, before against after.
      - This happens before any write, so the transaction ends with nothing written.
      - A stale confirm, where the count moved since the dialog opened, gets a fresh preview rather
        than a write.
   5. If nothing changes (same value and same note), it is a no-op: `{ ok: true }`, with no write
      and no event.
   6. Mutate. A set is `insert … on conflict (switch, scope, group_id, user_id) do update`, with
      `value`, `note`, `updated_by` and `updated_at`. A clear is `delete` of the target row.
   7. Insert `admin_events`:
      - for a set, `override_set` with `switch`, `scope`, `group_id` / `user_id`, `old_value` (the
        prior value or null), `new_value` and `note`;
      - for a clear, `override_cleared` with `old_value`.
3. **After the commit only:**
   - `clearSwitchSnapshot()`. Clearing inside the transaction would let a concurrent request
     re-read the pre-commit rows and memo them for 30 seconds.
   - `revalidatePath("/admin/switches")` and `revalidatePath("/admin/switches/[name]", "page")`.

   Neither runs on a refusal, a confirm or a failure.
4. **A thrown error** is logged with the switch name only, and returns `{ ok: false, error:
   "failed" }`. The client shows F11.

No player-facing cache needs invalidating. Cached pages key on the resolved bits, and About's cookie
keys on the resolved entries (locked rules 6 and 9).

### Tests

**`switch-writes.test.ts`**, over a recording transaction:

- The order is lock, read, mutate, then event.
- Clear deletes and records `old_value`.
- A no-op writes nothing.
- A group that does not exist is refused.
- `clearSwitchSnapshot` is called once, after the transaction resolves. It is not called on a
  refusal, a confirm or a throw. This is asserted with call order against the transaction mock.

**`switch-writes-rule.test.ts`:**

- Each refusal code.
- `modelRise`:
  - turning `ANALYSIS_TAB` on for a group raises `synopsis`, plus `tuning` where `TUNING` is on;
  - clearing an app-wide `off` over env `true` raises;
  - an account `on` under a kill raises nothing;
  - any `off` raises nothing;
  - a plumbing switch never raises.

**Actions:** the existing static gate, plus a test that each action returns the lib's refusal
untouched.

**Components:**

- F10 and F11.
- The confirm renders the server preview verbatim.
- Kill: the segment is disabled and Clear stays enabled.
- The picker shows `already set` and `No groups yet.`

**The probe**, on a scratch branch, deleted after.

## Copy

All of the following lives in `src/lib/copy/admin.ts`.

### Verbatim from `admin · copy strings.ts` (R2)

| Area | Strings |
|---|---|
| `switches.*` | `title`, `sub`, `search`, `chips`, `heads`, including `plumbingNote`, `cols`, `resolved` and `count`, `killed`, `parentOff`, `tagModel`, `tagNeeds`, `footnote`, `noneMatch`, `showAll` |
| `switch.*` | `back`, `ladderHead`, `ladderMeta`, `rungs`, `decides`, `refused`, `killSet`, `result`, `appOpts`, `appNotSet`, `appNotSetNote`, `appRefused`, `notePrefix`, `groupsHead`, `accountsHead`, `noGroup`, `noAccount`, `addGroup`, `addAccount`, `clear`, `noNote`, `check`, `historyHead`, `historyFoot`, `noHistory`, `refusedMeta`, `saveFailed`, `tryAgain`, `whatsNewInline`, `kill`, `compound`, `history.set`, `history.cleared` |
| `confirmModel.*` | `title`, `facts`, `noMean`, `whatsNew`, `when`, `note`, `confirm`, `cancel` |
| Reused | `adminCopy.freshness`; `groups.none` (`No groups yet.`); `groups.already` (`already set`); `accounts.search`, `accounts.noMatch`, `accounts.clerkDown`; `accounts.fromEnv` |

The 21 label and description pairs drawn in the canvas (`n:` and `d:` in `Admin R2.dc.html`) are
taken as written, except for the three marked stale below.

### New, owed to /copy-review

The copy-review lane resolves these. They never go to Hugh.

1. **Labels and descriptions for the 11 switches the canvas does not draw:** `ADDED_COPY`,
   `ALL_DECKS_CART`, `DECK_NOTES`, `DECK_TOKENS`, `FIND_A_DECK_READ`, `LINEUP`, `PRECONS`,
   `RATE_LIMIT`, `SOCIAL_FRIENDS`, `SOCIAL_GAMES` and `SOCIAL_WISHLIST`. These follow plan
   correction 1 and READINESS G9. Feature owners confirm the facts first.
2. **Three stale canvas descriptions:**
   - `ANALYSIS_TAB`'s "Four switches need it." Three do now.
   - `COLLECTION_EDIT`'s "Mark bought needs it." Added copy needs it too.
   - `LABEL_ROLE_COUNTS`, drawn as a feature, which is now the plumbing role basis that scores
     are counted by.
3. **The Overrides column's cell:** for example `none`, `1 group · 2 accounts`, and the L4 shape
   `1 account, refused`.
4. **Check an account's sources:**
   - `env var is off` (reusing `killed`),
   - `account override`,
   - `group <name>`,
   - `app-wide override`,
   - `from the env var`,
   - `<Parent> is off` (reusing `parentOff`).

   F1's frame text shows the shape: `Off · app-wide override`.
5. **History's scope labels** (`app-wide`, `group <name>`, `account <name>`) and the actor (`you`
   when the actor is the viewer).
6. **The confirm's lead.** The handoff writes one scenario: "Clearing app-wide off falls back to
   the env var (true)…". It needs a variant per write:
   - app-wide on,
   - clearing an app-wide off,
   - group on,
   - account on,
   - a parent raising its children.
7. **The confirm's cost line.**
   - A mean line when a mean exists. The handoff has only `noMean`.
   - A cost line for a write that raises more than one capability.
   - The credits sentence, under audit finding 10: players are told about a rolling 24 hours, not
     "a day".
8. **A plumbing switch's non-app row,** listed as `ignored` if one exists (see mismatch 3).
9. **F13 disagrees with the copy file.** STATES F13 reads `No override has been set or cleared
   for this switch.`, while the copy file reads `No overrides yet.` The plan builds from the copy
   file, and the lane picks.

## About entry

**None, and no `ABOUT_VERSION` bump.** Three sources agree:

- the brief's §The About entry: "None. The admin is visible to Hugh alone and teaches a player
  nothing";
- the handoff README ("No About entry. The admin is Hugh-only…");
- READINESS ("No About entry: the admin is admin-only").

AGENTS.md's rule covers a FEATURE a reader can discover. Hugh decides which features owe an entry,
and his approval of the plan carried the brief's answer. What a switch flip does change is which
entries an account sees, and that is already each feature's own entry's job (locked rule 9).
`feature-acceptance` therefore checks no entry at close-out.

## Mismatches between the handoff, the brief, the plan and the code

| # | Mismatch | Status |
|---|---|---|
| 1 | The brief says 21 switches, the handoff 24, and the plan 27. The registry has **32**. | **Resolved** by plan correction 1: the list renders from the registry. Chips read `All 32`, and the heads read Features 27 / Plumbing 5 if open question 1 is ruled that way, or 29 / 3 if not. 11 descriptions are owed (Copy, new 1). |
| 2 | Model features: the handoff counts 5, including `ANALYSIS_TAB`. The registry tags 5 without it and with `FIND_A_DECK_READ`. | **Resolved** by audit finding 2 (accepted). 8a retags `ANALYSIS_TAB` `model`, so the chip reads `Model features 6`. The confirm fires on a capability rise, not on the tag, so a parent flip is caught either way. |
| 3 | Plumbing: the handoff names `ABOUT_SHEET`, `HOW_IT_WORKS` and `LIST_CACHE`. The registry names `LABEL_ROLE_COUNTS`, `LIST_CACHE` and `RATE_LIMIT`. | Partly resolved. `LABEL_ROLE_COUNTS` (#1626) and `RATE_LIMIT` (#1634) became plumbing by later rulings. Admin PR 4 kept `ABOUT_SHEET` and `HOW_IT_WORKS` as `feature` with no recorded reason, against Design's Q2 answer, which the audit accepted. **Open question 1.** If retagged, any existing group or account row for them stops applying. Staging holds none, and the list draws any such row as `ignored`, so it is visible and clearable rather than silent. |
| 4 | The handoff puts Switches at `/admin` and Costs at `/admin/costs`. | **Resolved** by plan correction 2 and Hugh's ruling: Costs is `/admin`, and Switches is `/admin/switches`, the second tab. Detail is `/admin/switches/[name]`, keyed on the variable's name. |
| 5 | The plan's correction 3 says to give `/admin(.*)` `auth()` only. | **Resolved otherwise, in PR 2a (#1536):** `/admin` stays protected, so a signed-out reader redirects to sign-in exactly as an unknown path does. Exempting it made it the one private path that did not redirect, which is a hint it exists. Out of PR 8's scope. Noted because the plan file still reads the old way. |
| 6 | R1 group disagreement (STATES F2, G1, A5 banners; Q1). | **Resolved** by R2 delta 4 and audit finding 13. `flag_group_members.user_id` is the primary key, and no disagreement copy ships. The resolver keeps off-wins as a backstop. |
| 7 | Design table R2 delta 1: the table box is `flex:1; min-height:0; overflow-y:auto`. The shipped layout scrolls the document with a sticky head (`src/app/admin/layout.tsx`, as Costs shipped). | **Resolved** by following the shipped layout. The pinned bar is `sticky` at `--admin-head-h`, and the column head is sticky beneath it. The visible behavior is the delta's: the head and the filters stay put, and the column head stays at the top of the list. |
| 8 | READINESS G3 fires the confirm on four tagged switches. | **Superseded** by audit finding 2: the confirm fires on a capability rise, computed through the flag functions. This plan builds that. |
| 9 | The approved plan says the write runs "mutate, then admin_events, then clears the memo, in one transaction". `snapshot.ts` says the clear comes after the commit. | **Resolved.** The database writes are one transaction. The clear runs after the commit, never inside it, or a concurrent read could re-memo the old rows. |
| 10 | "An admin write clears the memo on its own instance" reads as immediate on that instance. The proxy's own memo feeds every page's `x-switches`, and the write does not clear it. | **Resolved.** The copy already promises only "within 30 seconds". The admin's pages read the tables fresh. AGENTS.md gains one sentence in 8c. |
| 11 | The confirm's `credits a day` against About's rolling 24 hours (audit finding 10). | Open for /copy-review, not for Hugh (Copy, new 7). |
| 12 | STATES F13's empty-history line against the copy file's `noHistory`. | Open for /copy-review (Copy, new 9). |
| 13 | The canvas's `N of 7` and its seven fixture accounts. | **Resolved** by audit finding 6: the universe is Clerk, with a fallback. It lands in 8a, because Switches needs it before Accounts (PR 9). |
| 14 | F8 assumes groups exist. Staging has none, and groups are created in PR 9. | **Resolved.** The group picker reads `No groups yet.` (the handoff's string) until PR 9. F12 is accepted at PR 9's close-out, when a group can exist. |
| 15 | The design table draws desktop at 900, and acceptance photographs 1300. | **Resolved.** The design table's desktop column is "from `md` up". |
| 16 | The compound relations: the canvas knows 4 children of 2 parents. The code has 7 children of 4 parents. | **Resolved** by `needs` in the registry, pinned to the flag functions by `flags.test.ts`. |

## Open questions (real ones only)

1. **Should `ABOUT_SHEET_ENABLED` and `HOW_IT_WORKS_ENABLED` be app-wide only?**
   - Design answered Q2 "Plumbing, app-wide only", and the audit accepted it.
   - Admin PR 4 tagged both `feature`, so today a group or an account can get its own What's new
     sheet or How it works page.
   - **Recommended default: follow the accepted answer and retag both `plumbing` in 8a.** About
     content already follows each feature's own switch, so a per-group sheet is not needed to show a
     group a feature.
   - This is the one behavior change in PR 8 that a ruling could reverse. It is reversible, and no
     rows exist on staging.
   - If the ruling is to keep `feature`, 8a drops the retag, and the heads read Features 29 /
     Plumbing 3.

Nothing else is open. Every other mismatch above is resolved by the plan's corrections, by the
audit or by a later ruling, or it belongs to the /copy-review lane.

## Per-PR process

- A worktree under `.worktrees/<branch>`, with the root `.env` copied in.
- The pre-push gate, as in the commands above.
- `design-review` against the property table before `gh pr create`.
- The §10b pre-open pass.
- The contact sheet for that PR's rows in the PR body.
- The `pr-review` skill for the rounds.
- 8c is the PR whose review follows the clean-after-clean bar for a path that overwrites data: an
  override write replaces the prior value.
- At PR 8's close-out, before PR 9, walk the whole inventory on a running app. Every row is ticked
  at 390 and 1300, except F12, which is carried to PR 9's close-out.
