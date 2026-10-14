# Design table: Admin (R2)

**Commit to `docs/superpowers/design-tables/admin.md`.** Mobile = 390, desktop = 900, from `md` up. Tokens only; no new tokens. Mono = `--font-mono` (Plex Mono), display = `--font-display`.

## R2 deltas (these win over the R1 rows below)
| Property | Mobile | Desktop |
|---|---|---|
| page | `flex:1; min-height:0` column filling `ShellMain` (audit finding 14: never `100dvh`, the shell already reserves the header and tab bar); head and pinned `flex:none`; body `flex:1; min-height:0` | same |
| head pinning | the eyebrow, title and sub scroll away; the tab strip stays pinned with the page's pinned bar under it (Hugh, 2026-10-13: the whole head took too much of the phone) | whole head pinned |
| pinned bar | pad 14 16 12, `--bg`; holds search + chips (Switches, Accounts) or the month bar (Costs) | pad 18 28 14 |
| list pages body | `overflow:hidden`, pad 0 16 12; table box `flex:1; min-height:0; overflow-y:auto` | pad 0 28 18 |
| other pages body | `overflow-y:auto` | same |
| sticky column head | `position:sticky; top:0; z-index:1` on `--surface-rail` | same |
| account search | full width | full width (no 420 max) |
| Clerk id line | mono 10.5 `--fg-muted`, under the email, breaks anywhere | same |
| cap source tag | LEFT of the row's name; mono 9.5 upper .08em `--fg-faint`, no border or pad: a label, not a control (Hugh, 2026-10-13: the bordered `set here` chip read as a button). `in code` / `recorded here` | same |
| trend cap lines | full-width rule at the value, 1.5px: plan solid `--fg-muted`; alarms dashed `--warning`; label mono 10 in the line's ink on `--surface`, above the rule. y scale ≥ plan + 10% | same |
| by-model row | as a caps row; label mono 13; figure mono 13 + share mono 11 `--fg-faint` (w44); 10px stacked bar, gap 2, inks per origin; sub 12 `--fg-muted` | same |
| group chip (account) | one chip, `Change group` | same |

## Page head (every admin page)
| Property | Mobile | Desktop |
|---|---|---|
| pad | 14 16 0 | 26 28 0 |
| eyebrow | `Admin` mono 10.5, tracking .16em, upper, `--fg-faint` | same |
| env chip | h22, pill, 1px `--border-strong`, mono 10.5 `--fg`; 6px dot `--warning` (staging) / `--danger` (production) | same |
| back link | right of the eyebrow row, 13 `--accent` | same |
| title | display 23 / 1.2 `--fg` | display 28 |
| variable (switch page) | mono 11.5 `--fg-muted`, baseline beside the title | same |
| sub | 13 / 1.6 `--fg-body`, max 720 | 13.5 |
| tab strip | gap 15; tab h42, 13.5; selected 500 `--fg` + 2px `--fg` underline; others `--fg-muted` | gap 24, h40, 14 |
| body | pad 16 16 28, gap 12 | pad 22 28 40 |
| section head | 15 / 600 `--fg` + mono 10.5 `--fg-faint` meta; pad-top 10 | same |

## Account menu row (`account-menu.tsx`)
| Property | Value |
|---|---|
| position | second, after About; `refs` grows to four, roving focus unchanged |
| element | `<Link href="/admin" role="menuitem">`, same row classes as About |
| trailing | env name mono 10.5 `--fg-faint`, `aria-hidden` (the page head says it) |
| gate | prop `adminDoor: boolean` from the server layout; absent → row not rendered |

## Switches list
| Property | Mobile | Desktop |
|---|---|---|
| search | h44, radius 9, 1px `--border-strong`, `--surface-sunken`, full width | h38, max-w 420 |
| chips | h36, pill, 12.5; selected `--elevated` + 1px `--border-dashed` `--fg`; else 1px `--border` `--fg-muted`; count mono 11 `--fg-faint` | h30 |
| list box | radius 12, 1px `--border-strong`, `--surface` | same |
| column head | none | grid `1fr 92 76 112 116`, gap 14, pad 9 14, `--surface-rail`, mono 9.5 upper .12em `--fg-faint` |
| group head | pad 8 14, `--surface-sunken`, mono 10 upper `--fg-muted` + note `--fg-faint` | same |
| row | flex column, pad 12 14, top hairline | grid as head |
| name | 14 / 500 `--fg` | same |
| tags | mono 9.5 upper, pad 2 6, radius 4; `model` 1px `--accent` ink `--accent`; `needs X` 1px `--border-strong` `--fg-muted` | same |
| variable | mono 10.5 `--fg-faint` | same |
| description | 12.5 / 1.45 `--fg-muted` | same |
| env | in meta line | mono 12.5; `true` `--fg-body`, `false` `--fg-muted`, `off` 600 `--danger` |
| resolved pill | 8px dot: on = `--success` fill; off = 1.5px `--fg-faint` ring; mixed = half fill + `--success` ring. Label 13 / 500 | same + mono 10.5 sub `N of 7 on` or the reason |
| meta line (mobile) | mono 10.5 `--fg-body`: `env · app-wide · overrides · N of 7 on` | — |

## Switch page
| Property | Mobile | Desktop |
|---|---|---|
| ladder | box radius 12; rung grid `84 1fr` (decides wraps under) | grid `120 1fr 150` |
| rung | pad 11 14; a rung that decides: `--surface-raised`, label `--accent`; else label `--fg-faint` | pad 12 16 |
| rung label | mono 10 upper .12em | same |
| rung value | 13.5; `None`/`Not set` `--fg-faint`; env mono; kill 600 `--danger` | same |
| decides | mono 11 | same, right-aligned |
| result foot | pad 12 14, `--surface-rail`, top 1px `--border-strong`, dot + 14 / 500 | same |
| App-wide seg | full width, 3 equal; option h40 | inline; option h32, pad 0 14 |
| seg | wrap pad 3, radius 9, 1px `--border-strong`, `--surface-sunken`; selected `--elevated` + 1px `--border-dashed` 500 `--fg`; disabled `--fg-disabled` | same |
| override row | stacked, pad 12 14, Clear top-right | flex: target · On/Off seg (h28) · note (italic 12.5 `--fg-muted`) + mono meta · Clear 13 `--accent` |
| refused | note in `--danger`, seg disabled | same |
| add button | h44, dashed 1px `--border-dashed`, 13.5 | h34 |
| banner | radius 12, `--surface-rail`, 1px tone border (`--danger` kill, `--warning` compound/disagreement); 8px rotated diamond in tone; title 14 / 600, body 13 `--fg-body`, link 13 `--accent` | same |
| check an account | stacked; select h44 full | row; select 200 × 36 |
| history row | stacked, pad 11 14 | grid `130 1fr`, pad 11 16; when mono 11 `--fg-faint`; what 13.5 `--fg`; note italic 12.5 `--fg-muted` |

## Confirm (model feature on-count rises)
| Property | Mobile | Desktop |
|---|---|---|
| surface | sheet, radius 20 20 0 0, pad 12 18 22 | dialog 540, radius 14, pad 24 24 20, `--modal-shadow` |
| backdrop | `color-mix(in oklab, var(--bg) 72%, transparent)` | same |
| title | display 20 / 1.3 | same |
| facts | box radius 10; rows grid `74 1fr` (k mono 10 upper `--fg-faint`; v 13 `--fg-body`) | `92 1fr` |
| note | h44 field, optional, goes to `admin_events.note` | h38 |
| buttons | Cancel ghost + primary (`--fg` fill, `--bg` ink), equal flex, h46 | right-aligned, h40 |

## Groups
| Property | Mobile | Desktop |
|---|---|---|
| cards | one column | two columns, gap 12 |
| card | radius 12, 1px `--border-strong`, `--surface`, pad 13 14; name mono 15 / 500; count mono 11 `--fg-faint`; Edit 13 `--accent` | pad 14 16 |
| override chip | h26, radius 6, `--surface-rail`, 1px `--border`, dot + 12 `--fg-body` | same |
| fields | stacked | grid `1fr 1.4fr` |
| member row | min-h 60, pad 8 14 | min-h 52, pad 8 16, state mono 10.5 at the end |
| selection mark | 22 square, radius 6; selected `--accent` fill + 2px `--accent`, inner 7px `--bg` diamond; unselected 2px `--border-dashed`, empty | same |
| selected row | `--surface-raised` | same |
| pending bar | stacked, pad 14, radius 12, 1px `--accent`, `--surface-raised`; Undo ghost + Save primary | row |
| list head | section head `‹N› groups` + meta `‹N› accounts · ‹M› in no group` (N = the account universe); `New group` 13 `--accent` at the end; empty: `No groups yet.` 13 `--fg-muted` (G5) | same |
| card body | description 13 `--fg-body` (none, no line); members 12.5 / 1.5 `--fg-muted`, joined `, `, or `No members.`; override chips wrap, gap 6 | same |
| head on a group's page | title the group's name (display, as every head), sub its description (none, no sub), `‹ Groups` back link, Groups tab selected; `/admin/groups/new` titles `New group` | same |
| field | label 12.5 `--fg-muted`; input h44, radius 8, 1px `--border-strong`, `--surface-sunken`, 16 (name and credits mono); hint 12 `--fg-faint`; refusal 12.5 `--danger` | h38, 13.5 |
| Daily credits | its own row, first column; empty is the default; hint `Members get this many credits in a rolling 24 hours. Empty means the default.` | same |
| members head | section head `Members` + meta `‹n› selected, ‹m› not saved` (m = adds and removes pending) | same |
| member search | full width, h44, radius 9, `--surface-sunken`; filters by name, email or id on the page; none: `No account matches.` | h38 |
| member row text | name 14 / 500 `--fg` + email mono 10.5 `--fg-faint` on one baseline; Clerk id mono 10.5 `--fg-muted`, breaks anywhere; sub 12 `--fg-muted`: `in ‹group›`, `moves from ‹group›` when selected here and saved elsewhere, none in no group | same |
| member state | hidden (the mark carries it) | mono 10.5: `selected, not saved` `--accent`; `selected` `--fg-body`; `unselected` `--fg-faint` |
| member row control | the whole row is one `role=checkbox` button | same |
| pending text | title 14 / 600; body 13 / 1.55 `--fg-body`; one sentence per change, naming the account and what it gains or loses, never a pronoun; a refusal 12.5 `--danger` under it; `Create` replaces `Save` on a new group | same |
| overrides carried | section head + count (`none`); rows in a box radius 12: label 14, On/Off with the resolved dot, `Open the switch ›` 13 `--accent` (grid `1fr auto`, the link on its own line); none: `This group carries no overrides.` | grid `1fr 70 1.5fr`, pad 11 16 |
| history | as the switch page's; foot `Times are UTC.`; none: `No changes yet. Times are UTC.` | same |
| confirm on save | the model confirm, lead `Saving changes who is in ‹group›, and so which overrides apply to them.`, no note field | same |

## Accounts
| Property | Mobile | Desktop |
|---|---|---|
| row | pad 11 14, min-h 64; avatar 34 radius 10 (accent ring, mono 11.5); spend right; meta line mono 10.5 indented 45 | grid `1.5fr 1fr 110 90`, pad 10 16 |
| account head | avatar 48 r14; email mono 11.5 `--fg-muted`; id mono 10.5 `--fg-faint`, breaks anywhere | avatar 44 r12 |
| tiles | 2 × 2, gap 8, pad 11 12 | 4-up, gap 12, pad 13 14 |
| tile figure | mono 19 / 500 | mono 22 |
| resolved row | grid `1fr auto` (source wraps under) | grid `1fr 70 1.5fr` |
| source ink | `--fg-muted`; disagreement `--warning`; kill `--danger` | same |
| environment group | two lists, `On · N` and `Off · N`, names 13 / 1.6 | same |
| head on the list | title `Accounts`; the head draws no sub (it does not read Clerk), so the page draws `‹N› accounts on ‹env›. Names and emails from Clerk; the app stores only the id.` under the tab strip, 13 / 1.6 `--fg-body` | 13.5 |
| head on an account's page | the head draws `‹ Accounts` and the tab strip, Accounts selected, and no title; the page's head block carries the title: the account's name (else its email, else its id), display 23 | display 28 |
| list order | the owner first, then A to Z by name, email, id (A1) | same |
| row text | name 14 / 500 `--fg`; email mono 10.5 `--fg-faint`; Clerk id mono 10.5 `--fg-muted`; spend mono 13 `--fg` at the right; meta `‹group› · ‹n› of ‹limit› left` mono 10.5 `--fg-body`, indented 45 | columns `Account`, `Group` (`No group`), `Credits now`, the month's name; group and credits mono 12 `--fg-body`; column head mono 9.5 upper on `--surface-rail`, sticky under the search |
| search | the shared `SearchField`, pinned under the head: a name or email holding the query, or a Clerk id starting with it; none: `No account matches ‹q›.` 13 `--fg-muted` (A2) | h38 |
| Clerk down | ids only, `Names didn’t load from Clerk.` 13 `--warning` above the list (A3) | same |
| role line | 12.5 `--fg-body`, from the account's own limit: `Owner. ‹n› credits a day, and a ‹$x› testing share each month.` or `‹n› credits a day.` | same |
| tile text | label 12 `--fg-muted`; sub mono 10.5 `--fg-faint`. Credits now `‹left› of ‹limit› left`, sub `reset at ‹time› UTC` only at 0 left (A7); Spent in ‹Month›, the owner's sub `‹p›% of the ‹$x› testing share`; Runs, no sub; Tuning hub `Drawn` / `Not drawn`, sub `‹n› of its tools on` | same |
| group | section head `Group`; the group a chip (h36, radius 8, pad 0 12, `--surface`, 1px `--border-strong`, mono 12.5 `--fg`) linking to its page, or `No group` 13 `--fg-muted`; `Change group` 13 `--accent` | chip h30 |
| change group | a box on `--surface-rail`, radius 12: a select `Move to` (`No group` first, then the groups A to Z) h44 full; Cancel ghost + Save primary, Save disabled at the current group; a refusal 12.5 `--danger`; a rise opens the model confirm, lead `Saving changes who is in ‹group›, and so which overrides apply to them.` (the group joined, else the one left), no note field | row; select 220 × 36 |
| switches | section head `Switches` + the count; one box radius 12: group heads mono 10 upper on `--surface-sunken` with a count; `Set by an override` (an account, group or app-wide override decides), `Off by a rule` (the env var's kill, or an off parent), `From the environment`; a row's label links to the switch's page | same |
| spend by feature | section head `Spend by feature` + meta `‹Month› so far`; rows pad 11 14, feature 14 / 500, spend mono 13 at the right, `‹n› runs` mono 10.5 `--fg-muted` under; a `Total` foot row, 600 on `--surface-rail`; none: `No runs in ‹Month›.` 13 `--fg-muted` (A6) | grid `1fr 90 90`, gap 12; head `Feature`, `Presses`, `Spent`, pad 9 14; rows pad 11 14, feature 13.5 / 500, presses mono 12.5 `--fg-body`, spent mono 12.5 `--fg` |
| figures | this UTC month's player presses (`origin = 'player'`), refunds included, as Costs' per-account table counts them; credits are the free allowance's own count (`readAllowance`, `dailyLimitFor`) | same |

## Models
| Property | Mobile | Desktop |
|---|---|---|
| head | title `Models`, sub `Which feature or job calls which model, at which effort, and where the constant lives. A model change shows here first.`; the fifth tab, after Accounts | same |
| features and jobs | section head `Features and jobs` + meta `‹Month› so far, ‹env›`; one card per row: name 14 / 500 + spend mono 13 at the right; meta mono 10.5 `--fg-muted`, `‹model› · ‹effort› · ‹origin› · ‹where it lives›` (M1) | grid `1.5fr 74 1fr 74 74`, gap 12, pad 11 14; head `Feature or job`, `Origin`, `Model`, `Effort`, the month's name, mono 9.5 upper on `--surface-rail`; name 13.5 / 500; origin, model, effort mono 12.5 `--fg-body`; spend mono 12.5 `--fg` right; a second line across every column, mono 10.5 `--fg-faint`, margin-top −6: where the constant lives |
| rows | from `src/lib/admin/models.ts`: model and effort imported from the constants the calls read; the two script jobs' models written out and checked against the scripts by `models.test.ts`; a job's model `‹model›, Batch` when it batches; no effort `none set` | same |
| spend | this UTC month from the Costs reads (`loadCosts`), summed by `model_calls.feature` at the row's origin (Overview split by model, Help me choose by step); card labels the Costs labels series, `‹$x› so far` while a run collects | same |
| footnote | `Overview’s free rewrite runs on the contract-8 model as system. Mana Balance makes no model call. Evals call whatever model they test and are under Costs, by ledger.` 13 / 1.6 `--fg-faint` | same |
| job switches | section head `Job switches` + meta `GitHub repository variables · read only`; card per row: variable mono 12 `--fg`, value mono 13 at the right, workflow mono 10.5 `--fg-muted` under; a listed variable the repository lacks reads `not set`; foot `Change these in the repository’s variables on GitHub. The admin only reads them.` 13 `--fg-faint` | grid `1.3fr 70 1fr`, gap 12; head `Variable`, `Value`, `Read at` |
| no token | every Value `—`, and `Values need a GitHub token; names and locations are from the repo.` 13 / 1.6 `--fg-muted` above the table (M2): no token, a non-2xx, a timeout or a body of the wrong shape | same |

## Costs
| Property | Mobile | Desktop |
|---|---|---|
| period | stacked; ‹ › 18, month display 19, range mono 10.5 | row, compare right |
| caps row | pad 12 14 13; bar h10 radius 3 on `--surface-sunken`; tick 2 × 18 at value; tick label mono 10, centered (edge ticks align inward) | pad 13 16 14 |
| series inks | player `--accent`; labels `--fact`; evals `--warning`; rewrites `--success`; elsewhere `--fg-faint` hatched 135° 3/3; pace = same ink hatched | same |
| trend | cumulative line 2.5 `--accent` + 12% area; pace dashed 2 `--fg-muted`; today hairline `--border-dashed`; h130 | h160 |
| by day | bars gap 2, h46, own scale; zero days 2px `--border-strong`; future 2px `--surface-sunken` | same |
| split | one 14px bar, gap 2; legend one column | legend two columns |
| tables | each row a card: title 14 / 500 + figure mono 13; meta mono 10.5 `--fg-muted` | grid per table (see `Admin.dc.html`); head mono 9.5 upper on `--surface-rail`; foot row 600 on `--surface-rail` |
| reserved bar | 12px dashed 1px `--border-dashed` box = reservation; fill `--accent` = mean | same |

## Data sources
| Figure | Source |
|---|---|
| model calls, by feature, refunds, per account | `model_calls` (status, origin, cost_micro_usd) |
| model, effort, per call | `model_call_parts` from its build; earlier rows by feature, effort `not recorded` |
| card labels | `card_label_batches` (workflow runs, staging only) plus `model_calls` `feature = 'labels'` (manual collector); disjoint, summed (audit findings 3, 8) |
| evals | `docs/superpowers/eval/ledger*.jsonl`, bundled at build, netted as `spent()` |
| caps in code | `spend-rule.ts`, `allowance-rule.ts`, `ledger.mts` constants, read-only |
| account cap, system ceiling, elsewhere | the admin settings table (locked rule 11) |
| names, emails | Clerk Backend API, server-side |
| job switches | GitHub repository variables API, server-side, read-only |
