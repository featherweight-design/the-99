# READINESS: Admin R3 (masking personal data)

**Verdict: Yellow.** Buildable now. Two surfaces from the brief's inventory have no design-table row; engineering applies D1 to them in the plan (gaps Y1, Y2). Nothing contradicts a locked ruling, nothing goes back to Design.

**Approved (LGTM, Hugh, 2026-10-17).**

**Build from:** `R3/AdminR3.dc.html` (scene component, props `scene`, `phone`, `theme`) through boards A1 to A6, B1, B2, C1 to C3 (each at 900 and 390) and TH (A2 in the six themes: amonkhet, kamigawa, ixalan, phyrexia, eldraine, kaldheim, matching `src/lib/theme`). Brief: `docs/superpowers/design-briefs/2026-10-17-admin-pii-masking.md` (on main, #2001). R2's READINESS stands for everything R3 does not name. No About entry (brief §The About entry).

## Files
| File | Role |
|---|---|
| `R3/Main.dc.html` | calls and rulings board |
| `R3/AdminR3.dc.html` | scene component with fixtures |
| `R3/A1`…`C3`, `R3/TH-Six-themes.dc.html` | boards, desktop 900 + phone 390 side by side |
| `README-R3.md` | decisions log D1 to D14, engineering notes, open items |
| `STATES-admin-R3.md` | rows A1 to A10, B1, B2, C1 to C5, must-nots |
| `design-tables/admin-r3.md` | per-surface measurements, keyed to the brief's inventory |
| `admin-r3 · copy strings.ts` | `adminMaskCopy`, placeholder wording for /copy-review |

## Locked rulings
| # | Ruling | Handoff | Holds |
|---|---|---|---|
| 1 | Masked by default everywhere | D1 name (`Colin R.`, username, else `Account ·<id tail>`), D2 email (`c•••@g•••.com`), D3 id off the rows | yes |
| 2 | Per-account Show, logged, no bulk | D5 (list row + account head only), D6, D7, D8 (History line), must-not "a bulk reveal" | yes |
| 3 | Exact-email search, no partial match | D10 to D12 (`@` switches to server lookup on Enter, whole address, trimmed and case-folded; miss shows nothing) | yes |
| 4 | Masking on the server | D1 "applied on the server"; D10/D14 filter only masked names on the client; must-not "unmasked value in a page payload before a Show" | yes |
| 5 | Privacy-page line | out of scope, noted | yes |
| 6 | Every assignment from masked rows | D9 (Revoke from the masked waiting line), D14 + C2 (group moves), C3 (override picker), B1 (set invites) | yes |

## States checklist (brief §States)
| State | Boards | 390 + desktop | Six themes |
|---|---|---|---|
| Masked list: accounts, invites tree, group members, override picker | A1, C1, C2, C3 | yes | TH covers A2 (standard) |
| Revealed row among masked neighbours; account head revealed | A2, B2 | yes | TH |
| Search hit | A3 | yes | |
| Search miss | A4 | yes | |
| Reveal failed (log write included) | A6; lookup failure A5 | yes | |

## Design's calls on the open items (brief §What Design owns)
| Item | Call |
|---|---|
| Masked row; Clerk id | First name + last initial, else username, else `Account ·<last four>`; masked email; Clerk id only on a revealed account (D1 to D3) |
| Show control + revealed state | Show/Hide on each list row and the account head only; revealed = full name, email, Clerk id, `Shown and logged · hides at <time> UTC`, accent ring (D5, D6) |
| Re-masking | On leaving the view or 5 minutes after Show, whichever first; at once on Hide; quiet; a list reveal does not carry to the account page (D7) |
| Reveal log | Visible as lines in the account page's existing History, accent diamond, masked name; no list-wide log (D8) |
| Invites tree, group members, waiting invites | Masked; waiting-invite emails never revealable, Revoke works masked (D9, D14) |
| Exact-email search | One field `Name, or a whole email`; hit shows one masked row with Show; miss shows no rows and no hints; failures are the shared toast with Try again (D10 to D13) |
| Avatars | Kept, initials from the masked name; the diamond for no-name accounts and the owner (D4) |
| Copy | Placeholders in `adminMaskCopy`, owed to /copy-review |

Design's two "Open for Hugh" items (G1 the 5-minute timeout, G2 waiting-invite emails never revealable) are settled by Hugh's approval of the handoff as drawn: 5 minutes, never revealable. G2 also follows from ruling 2, whose log subject is an account.

## Gaps
| # | Grade | Gap | Resolution |
|---|---|---|---|
| Y1 | Yellow | Groups list, group cards' member line (`src/components/admin/groups-list.tsx:49`, `groups-rule.ts:195`) is in the brief's inventory but has no design-table row or frame | Draw each member with the D1 masked name; no other change to the card |
| Y2 | Yellow | Switch page, resolved result (`switch-page.tsx:53`, `switch-page-rule.ts:171-174`, the names of the accounts a switch is on for) is not named; only "Switch meta and history" (`156-212`) is | Use D1 masked names in the result sentence, the same rule C4 applies to the model confirm |
| G1 | Green | Account URL `/admin/accounts/[clerkId]` and Check an account's `?account=<clerkId>` keep the Clerk id; D3 leaves it to engineering | Plan decides. The id is neither name nor email, so rulings 1 and 4 do not require removing it |
| G2 | Green | Account page invites history lines (set, revoked, sent, joined; `invites-rule.ts:124-131`) are covered by D5 ("history lines stay masked") but the table's History row names only the new reveal line | Apply D1 to every actor and account name in those lines |
| G3 | Green | Masked names can collide (two `Colin R.`) and the client filter sees only masked names | The masked email is every choice's second line (D14) and disambiguates; exact-email search is the precise path |
| G4 | Green | Costs per account and the cap's "set by" show a Clerk id today; masked names there need the Clerk lookup on the costs page | Plan reuses the server-side account universe; `You` for the viewer (C5) |
| G5 | Green | Reveal endpoint, `admin_events` kind, the 5-minute timer, server-side Clerk exact-email query | Engineering, brief §Out of scope. A failed log write must refuse the reveal (must-not, A6) |
| G6 | Green | `accountName` (`src/lib/admin/names.ts:5`) today falls back to email then id; D1 replaces it with no email fallback | Verified against the code: `accounts.ts:105` supplies `fullName || username`, so D1's username step already exists upstream |
| G7 | Green | README cites the brief by branch (`docs/admin-pii-brief`, PR #2001); it is now on main | No action |

Code claims verified on this branch: the phone accounts row is one whole `<Link>` (`accounts-list.tsx:46`), so Show must sit beside it (engineering note); every row renders `row.id` (`accounts-list.tsx:51`); the six theme keys exist in `src/lib/theme`.
