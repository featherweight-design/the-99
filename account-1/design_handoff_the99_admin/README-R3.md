# Handoff addendum: Admin R3, masking personal data

**Status:** R3, for Hugh's audit. Not approved; no handoff PR yet.
**Brief:** `docs/superpowers/design-briefs/2026-10-17-admin-pii-masking.md` (branch `docs/admin-pii-brief`, PR #2001). Rulings 1 to 6 are drawn as written.
**Canvas:** Design canvas "The 99 · Admin R3 · Masking". Export in `R3/`: `Main.dc.html` (calls and rulings), the scene `AdminR3.dc.html` (props `scene`, `phone`, `theme`), boards A1 to A6, B1, B2, C1 to C3 at 900 and 390, and TH (A2 in six themes).
**Also here:** `STATES-admin-R3.md`, `design-tables/admin-r3.md`, `admin-r3 · copy strings.ts`.
**Builds on R2.** Everything R3 does not name stays as R2 and the shipped pages draw it.
**No About entry** (brief §The About entry). The privacy-page line (ruling 5) is out of scope.

## Fixtures
Production, October. Colin, Peter, Max and Chris, plus one account Clerk holds no name for. Chris has only a Clerk username (`chrisplays`) so the fallback shows. The owner's own row is drawn as `You`, which keeps a real name off every board; this is a fixture choice, not a proposal. Clerk ids, emails and times are illustrative.

## Decisions log (brief §What Design owns)

| # | Item | Call | Boards |
|---|---|---|---|
| D1 | The masked name | First name and last initial (`Colin R.`). No Clerk name: the Clerk username as is (`chrisplays`). Neither: `Account ·9xQe`, the id's last four. One rule, replacing `accountName` in `src/lib/admin/names.ts`, applied on the server. | A1 |
| D2 | The masked email | First letter of the mailbox, `•••`, `@`, first letter of the domain's first label, `•••`, then the rest of the domain from its last dot (`c•••@g•••.com`, `m•••@p•••.me`). | A1 |
| D3 | The Clerk id | Leaves the rows, the account head, picker choices and member rows. It appears only on a revealed account, under the email, where it is the thing to copy into Clerk. The account URL keeps the id; that is engineering's call and is not drawn. | A1, A2, B2 |
| D4 | Avatars | Kept. Initials come from the masked name (`CR`, `CH`), so they show no letter the name doesn't. An account with no name gets the app's diamond instead of letters. The owner row uses the diamond too. | A1, B1, C1 |
| D5 | Where Show lives | Two places: each accounts-list row and the account page head. One control that reads Show, then Hide. The owner row has none. The invite tree, group members, the override picker, history lines, pending sentences and toasts stay masked and link to the account, which is where you reveal. | A2, B1 |
| D6 | The revealed state | Full name, full email, Clerk id, then `Shown and logged · hides at 19:42 UTC` in accent. A list row gains the accent ring and the raised surface. Only that account's own fields change: its inviter and invitees stay masked. | A2, B2 |
| D7 | Re-masking | On leaving the view (navigation, reload, closing the tab) or 5 minutes after the Show, whichever comes first, and at once on Hide. The timeout re-masks quietly, with no toast. A revealed list row does not carry over to the account page: that is a new view, with its own Show and its own log line. | A2, B2 |
| D8 | The reveal log | Visible, as lines in the account page's existing History list: `You showed Colin R.’s name and email`, with a small accent diamond marking it and its UTC time. No section of its own and no list-wide log. Lines name the account masked. | B1, B2 |
| D9 | Waiting invites | The recipient has no account, so there is nothing to Show or log against. The email stays masked everywhere (account page Invites section, invite tree) and Revoke works from the masked line. | B1, C1 |
| D10 | One search field | `Name, or a whole email`. Without an `@` it filters the masked names as you type, on the client, as today. With an `@` it stops filtering and says `Press Enter to look up this exact email.`; Enter (the phone keyboard's search key) asks the server. The match is the whole address, trimmed and case-folded. | A3, A4, A5 |
| D11 | Search hit | `One account holds this email.` and that account's row, masked, with its Show. The hit itself reveals nothing beyond what was typed. | A3 |
| D12 | Search miss | `No account holds this email.` and no rows: no near matches, no suggestions, no list underneath. The ✕ clears the field and brings the list back. | A4 |
| D13 | Failures | A failed lookup and a failed reveal (the log write included) are transient errors, so they use the shared toast (`ToastFrame`, centre placement) with `Try again`: `Couldn’t look up that email.` and `Couldn’t show Colin R. Nothing was shown.` The row stays masked; the list stays as it was. | A5, A6 |
| D14 | Masked assignment | The group member list, the override picker and the invite tree search on the masked name only (`Find an account by name`), since nothing else reaches the client. Each choice carries the masked email as its second line in place of the email or id. | C1, C2, C3 |

## Engineering notes (for the plan, not decisions)
- The Show button sits beside the row's link, never inside it: the phone row is a whole link today.
- In flight, Show holds its pressed state and the row stays masked; under 400ms needs no spinner (R1 F10).
- A Show of the viewer's own row is not drawn; the owner row has no Show.
- Costs per account (`costs-detail.tsx`) and the cap's "set by" draw the masked name in place of the Clerk id; no frame, see the design table.
- Model confirm (F3), the set-invites confirm and the group top-up name accounts masked; no frame, see the design table.

## Open for Hugh
- **G1.** The 5-minute timeout (D7). Shorter is safer on an open laptop; longer saves Shows. Design's pick is 5.
- **G2.** Waiting-invite emails never revealable (D9). If you want them revealable, the log would need a non-account subject.
