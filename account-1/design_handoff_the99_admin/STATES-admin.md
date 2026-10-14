# STATES: Admin (R2)

## R2 deltas
| Id | Change |
|---|---|
| L1, A1 | search and chips pinned; the table fills the height and scrolls; column head sticky |
| F2 | no disagreement banner; Check an account shows Theo: Off · group friends |
| F5 | banner `Off: the env var is off.` and body `DECK_BENCHMARKS_ENABLED=off refuses every override. Redeploy to change it. Clear still works.` |
| G1 | no disagreement banner; meta `7 accounts · N in no group` |
| G2 | member rows: name · email · Clerk id · current group; Theo `moves from friends` |
| G7 | (new, no frame) an account selected in a group it isn't in moves on Save: `member_removed` from the old group, then `member_added` |
| A1, A4 | Clerk id under the email; `Group`, singular |
| A5 | no disagreement banner; source ink `--danger` only for the kill |
| C1, C2 | month bar pinned; cap rows tagged `IN CODE` / `SET HERE`; the trend is player presses with lines at $10 (solid), $8 and $5 (dashed); By model block added |
| Must-not | an account in two groups |

---

Every frame is drawn at 900 and 390. `scene` is the prop on `Admin.dc.html`. Fixtures are in the README. `‹ ›` marks illustrative values.

## Door and access (D)
| Id | Scene | State | What draws |
|---|---|---|---|
| D1 | `door` | Hugh, any page | account menu: About, **Admin** `production`, Manage account, Sign out. Popover at 900, sheet at 390 |
| D2 | (no frame) | not in `ADMIN_USER_IDS` | no Admin row; menu as shipped |
| D3 | `notFound` | anyone else on `/admin…`, signed out included | the app's 404, unchanged (`shellCopy.notFound`) |
| D4 | (no frame) | an admin server action from a non-admin | `notFound()`; no error copy |

## Switches list (L)
| Id | Scene | State | What draws |
|---|---|---|---|
| L1 | `flags` | default | search, chips `All 21` (selected) · `Overridden 4` · `Off for anyone 6` · `Model features 4`; Features (18) A–Z; Plumbing (3) |
| L2 | (no frame) | chip selected | the rows that match; heads keep their counts; `None match` line + `Show all` when empty |
| L3 | (no frame) | search | matches name or variable, case-insensitive; Plumbing head hides when it has no rows |
| L4 | `flags` | kill switch row | env `off` in danger 600; resolved `Off` · `killed by the environment`; overrides `1 account, refused` |
| L5 | `flags` | compound row, parent off | resolved `Off` · `Collection edit is off` |
| L6 | `flags` | mixed | half-filled dot, `Mixed` · `N of 7 on` |

## Switch page (F)
| Id | Scene | State | What draws |
|---|---|---|---|
| F1 | `flagCuts` | app + account | ladder (Account decides 1, App-wide decides 6); App-wide Off; Groups none; Accounts Hugh On; Check Mara: Off · app-wide override; 2 history rows |
| F2 | `flagSwap` | two groups disagree | Group rung decides 7; two group rows; warning banner naming Mara; Check Mara: `friends says off, testers says on; off wins` |
| F3 | `flagConfirm` | model feature, on-count rises | Not set ringed in accent dashed; confirm (desktop dialog, phone sheet): Who · Cost · What’s new · When; note; `Turn on for 6` |
| F4 | `flagCompound` | child on, parent off | warning banner + `Open Collection edit ›`; Needs rung decides 7; result Off for all 7 |
| F5 | `flagKill` | env `off` | danger banner; App-wide control and Add buttons disabled (`--fg-disabled`); account row `refused`; Clear stays live |
| F6 | (no frame) | Plumbing switch | no Groups or Accounts sections; App-wide and History only |
| F7 | (no frame) | adding an account override | `Add an account override` opens the account lookup inline (field + up to 7 results); picking one adds a row with On/Off unset and a note field; nothing is written until On or Off is pressed |
| F8 | (no frame) | adding a group override | as F7 with the two groups; a group that already has a row is unselectable with `already set` |
| F9 | (no frame) | Clear | one press; row leaves; history gains `override_cleared`; no confirm (clearing can't spend unless the inherited value is on for a model feature, in which case F3 fires) |
| F10 | (no frame) | write in flight | the pressed segment holds its pressed state; others disabled; ≤ 400ms needs no spinner |
| F11 | (no frame) | write failed | inline line under the control in `--danger`: `Didn’t save. Nothing changed.` + `Try again` |
| F12 | (no frame) | on-flip for a group, non-model feature | inline line under the group row: `Members see it in What’s new on their next visit.` |
| F13 | (no frame) | no history | `No override has been set or cleared for this switch.` + UTC/deploy footnote |

## Groups (G)
| Id | Scene | State | What draws |
|---|---|---|---|
| G1 | `groups` | two groups | two cards; disagreement banner |
| G2 | `groupEdit` | editing testers | Name, Description; Members with Hugh and Mara selected, Theo selected and not saved, four unselected; pending bar `Save` / `Undo`; overrides; history |
| G3 | (no frame) | New group | the editor with empty fields and no members; `Create` replaces `Save`; name required, lowercase, unique |
| G4 | (no frame) | unselecting a member | pending bar names what they lose, e.g. `Saving removes Mara from testers. She loses Overview v2.` |
| G5 | (no frame) | no groups | `No groups yet.` + `New group` |
| G6 | (no frame) | no disagreement | banner absent |

## Accounts (A)
| Id | Scene | State | What draws |
|---|---|---|---|
| A1 | `accounts` | empty query | all accounts, owner first, then A–Z |
| A2 | (no frame) | query | matches name, email or id prefix; `No account matches ‹q›.` |
| A3 | (no frame) | Clerk unreachable | ids only, with `Names didn’t load from Clerk.` above the list |
| A4 | `accountHugh` | owner | tiles (credits, spend vs owner share, presses, Tuning hub); groups; switches in three groups; spend by feature |
| A5 | `accountMara` | groups disagree | warning banner; Swap tools source in warning ink; Deck benchmarks source in danger ink |
| A6 | (no frame) | no presses this month | Spent `$0`; Presses `0`; spend-by-feature table replaced by `No presses in ‹Month›.` |
| A7 | (no frame) | credits all used | Credits `0 of 5 left`, sub `reset at ‹time›` |

## Costs (C)
| Id | Scene | State | What draws |
|---|---|---|---|
| C1 | `costsSparse` | staging October | as drawn; system ceiling `starts November`; account cap `Elsewhere is not entered` + `Enter elsewhere` |
| C2 | `costsBusy` | production November | pace banner; hatched pace on player bar; hatched elsewhere |
| C3 | (no frame) | month with no runs | tiles `$0`; trend shows the empty axis and `No model calls in ‹Month›.`; tables hidden except eval ledgers |
| C4 | (no frame) | a past month | `›` live; no pace line or pace banner; trend fills to the month’s end |
| C5 | (no frame) | 80% alarm reached | player tile sub in `--warning`; banner `Player presses are past 80% of the plan.` |
| C6 | (no frame) | hard stop reached | banner in `--danger`: `Presses are paused until ‹Month› 1.` (mirrors `creditsCopy.paused`) |
| C7 | (no frame) | Enter elsewhere | small dialog: amount ($), `as of` date, note; writes the settings row |
| C8 | (no frame) | a pending eval entry | ledger row shows `$X pending` beside settled, in `--warning` |

## Models (M)
| Id | Scene | State | What draws |
|---|---|---|---|
| M1 | `models` | default | feature table with location lines; job switches |
| M2 | (no frame) | no GitHub token | Value column reads `—`; line `Values need a GitHub token; names and locations are from the repo.` |

## Must-not
- an in-product "you are not allowed" page, or any hint that `/admin` exists, for a non-admin
- "instantly" or "immediately" anywhere a switch changes
- a split of a composite model (`claude-haiku-5-5+claude-sonnet-5-5`) by guesswork; pre-parts rows show by feature, effort `not recorded`
- ticked / unticked; members are selected / unselected, switches on / off
- a silent on-flip
- editing `BUDGET_USD`, `OWNER_SHARE_USD`, the alarms or the hard stop from the admin
