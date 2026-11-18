# READINESS · Card request history · R1d · Green

Approved by Hugh, 2026-11-18 ("This LGTM"). Issue #2984.

| Check | Verdict |
|---|---|
| Drawn over shipped UI | Yes: every frame is the shipped shell, `/friends` and its rows rendered from main with the shipped CSS, proposal applied (`scratch-gen/`). |
| Phone and desktop | Both: 390 for every state; 1300 for the history page; 1440 for the full `/friends` page with pods. |
| States with real triggers | Live and history rows from stored statuses; empty tabs; nothing open but a history; the ex-friend foot line only when the viewer has such rows. |
| Reads | New read stays in `src/lib/social/` with the friend-grant join (G1, G3); names via `PersonName`. |
| Open for the build | G2 `withdrawn_at` migration; G4 `CardDetailProvider`; **G5 copy review owed** on every new string before implementing. |

Decisions in force: Q1 show everything kept; Q2 ex-friends hidden with a foot line; R1b boxed sections and empty marks; R1d one Requests box with tabs, Request history in its foot, Pods on the right at 448. R1c's right-column move is superseded by R1d.
