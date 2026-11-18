# The 99 — Card request history · R1 · awaiting Hugh's review

Account 2, 2026-11-18. Issue featherweight-design/the-99#2984. Canvas (account 2): "The 99 · Request History R1".
Open the `.dc.html` files with `support.js` beside them; frames are PNGs in `art/` (the shipped shell and Friends page
rendered from main with the shipped CSS, with the proposal applied).

## Calls
1. **Way in: "History ›" on Your requests' head**, after "newest first" (E1). Nothing open but a history: the head and
   "Nothing open right now." (E2). No history: section absent, as today. The answer sheet's "All your requests ›" stays.
2. **One page, `/friends/requests`**: "‹ Friends", title "Request history", one line, the shipped `SegmentedSwitch`
   (compact, `fill` on phone, `kind="tabs"`): **You asked · Asked of you**.
3. **Rows = Your requests' shipped rows** (card at card shape, friend's face in the corner, kicker, title, line) with
   **no ✕ and no Ask again** (one control per action; the live list keeps them). **The whole row opens card details.**
4. Kickers: You asked: Requested, Accepted, Declined, No answer, Withdrawn. Asked of you: Waiting on you, Accepted,
   Declined, No answer. Kicker date = when it ended (open: when asked). Line: deck and the day asked.
5. Open rows say where to act ("still open, 12 days left"; "Answer it under Waiting on you."), never offer it here.
6. Cleared asks show (✕ sets `asker_cleared_at`, never deletes). Withdrawn asks never show on the holder's side.
7. Month groups, newest first, 30 a page, "Show older requests".
8. Empty tab: a title and where requests come from (H3).

## For Hugh (recommendations stand unless Hugh says otherwise)
- **Q1 How far back?** Recommended: everything kept (rows live until account delete). Alt: 90 days like Collection history.
- **Q2 Ex-friends?** Recommended: hidden; faint foot line only when the viewer has some ("Requests with people you're no
  longer friends with don't show here. Add them back and they return."). Rows survive `unfriend`, so re-friending
  restores them; reads keep the friend-grant join. Alt: "A former friend", which needs a read outside the grant.

## Gaps
- G1 `loadRequestHistory(viewerId, { direction, cursor })` in `src/lib/social/`, friend_links join on the viewer, 30 a page; holder direction excludes `withdrawn`.
- G2 No stored time for a withdrawal: recommend nullable `withdrawn_at` written by both withdraw paths; expired date = `created_at + 14d` (as `requestText`).
- G3 Foot-line trigger: count of the viewer's own rows whose other side is not a friend (no names read).
- G4 `CardDetailProvider` around the list.
- G5 Copy review owed on the new strings (`scratch-gen/request-history.tsx`, `historyCopy`).

## scratch-gen
`request-history.tsx` (the page as code), `your-requests.diff` (the head link and empty state), `render.tsx` (frames).
Pipeline as `design_handoff_the99_friends_link/scratch-gen/README.md` (scratch copy of main, stubs, css.mjs, shoot.cjs).
