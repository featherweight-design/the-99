# States — account in Settings

| Surface | State | Trigger | Board |
|---|---|---|---|
| Account section | Default (name, email and sign-in, devices, delete) | `/settings` | Placement |
| Account section | Password account: sign-in line names password and email code | account's factors | Section-States |
| Name | Editing (shipped name field, Cancel / Save) | Change | Section-States |
| Name | Save failed: Friends' shipped toast | the write refuses | (shipped) |
| Devices | Loading: "Finding your devices…" | `getSessions()` in flight | Section-States |
| Devices | Read failed: line + Try again | `getSessions()` throws | Section-States |
| Devices | One device: one row, no Sign out | only this session | Section-States |
| Device | Signing out: row at .55, "Signing out…" | Sign out | Section-States |
| Device | Sign-out failed: toast, row back | revoke refuses | (toast copy) |
| Device | Signed out: the row leaves | revoke succeeds | — |
| Menu | Manage account removed (sheet and popover) | — | Placement |
| D1 | Empty: Delete account at .45 | Delete account… | Delete-Flow |
| D1 | Typed: Delete account live | the word | Delete-Flow |
| D1 | Paid credits, plan subscriber (split, plan line, widened refund line) | held plan + packs | Delete-Flow, Themes |
| D1 | Packs only (split, shipped refund line) | held packs | Delete-Flow |
| D1 | Deleting… (inside Clerk's window) | Delete account | Delete-Flow (D2 drawn) |
| D1 | Step-up cancelled: "Nothing was deleted." | ‹ on D2 | Delete-States |
| D1 | Failed delete: line, word kept | delete refused or dropped | Delete-States |
| D1 | Rate limited | our rule or Clerk's 429 | Delete-States |
| D2 | Password; typed; wrong password | password account | Re-Verify, Delete-States |
| D2 | Email code (sent on open, resend countdown); wrong or expired code | code account | Re-Verify, Delete-States |
| D2 | Google account: code to the Google email | Google-only account | Re-Verify |
| D2 | Deleting… | Confirm and delete | Delete-Flow |
| D2 | Rate limited (boxes keep the code, no danger edge) | 429 | Delete-States |
| Landing | Signed out with "Your account is deleted." toast | `/?deleted=1` | Delete-Flow |
| — | Removing the last sign-in method | **no trigger in the app** (stays on Clerk's page) | Delete-States (note) |
