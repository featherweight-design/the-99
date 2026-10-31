# Readiness: small items 8

**Verdict: Green from Design.** Hugh approved every board on 2026-10-31 (R1b). Each call below was checked against `origin/main` @ebfb3e1, file by file. Nothing needs a migration or a new switch. The DRAFT strings go through `/copy-review` before they ship. Engineering's own audit may move any item; where an item changes shipped behaviour, the file and line it touches are named.

## For engineering, by item

Sizes: S under 150 lines, M 150 to 500, L over 500, tests included.

1. **Home banner, glyph not screenshot (S to M, lane About/Home).** `src/components/home/arrivals-banner.tsx`.
   - Swap `LaunchCrop` for a glyph plate: `NavIcon` (`shell/nav-icons.tsx`) of the page Show me opens, in `--accent`, on the `Mark` plate's tint (`color-mix(in srgb, var(--accent) 12%, transparent)` fill, 40% edge). Band: 28px plate, 7px radius, 16px glyph, top-aligned with the line's first text line. A launch alone: 36px plate, 8px radius, 19px glyph. Shopping maps to `/decks`. A rule keeps the diamond `Mark`.
   - In the band, the lines lose the shipped 32px indent (`ml-[32px]` on the About band's `<ul>`, `arrivals-banner.tsx:326`; the arrivals-only band at `:402` has no glyphs and keeps its indent): each plate sits at the band's left edge, under the heading's mark. The right margin stays.
   - One sentence a line: the label's `lead` plus the first sentence of its `rest`. Cut it where `AboutLaunch.text` is built (`lib/about/notice.ts`), not in the component, so every reader of `text` agrees. A rule or a new sentence alone is already one sentence.
   - Retire `LaunchCrop`, `CROP_SIZES`, `cropStyle`, `cropVars`, `BLANK_PIXEL`, `CROP_MEDIA` and the banner's `ThemeRefresh`. `AboutLaunch.phone/desktop` and the capture lookup that fills them go too. Check that nothing else imports `cropStyle` before you delete it.
   - Unblocks Suggested changes v2's About New mark.
2. **Sign-up with a ticket (M, lane auth/newcomer).** This depends on Small items 7 item 5, the custom sign-up pages, and builds in its PR 2 (the ticket path).
   - `/join` (invite QR, flyer): the `proven` step replaces `toSignUp` with the name step (field, hint, Make my account, `LegalLinks`). The press makes the account with the claim's ticket and the typed first name, then lands on Home. `handOverAction` and `handOverFlyerAction` stop returning a hosted URL.
   - The invitation email: Clerk's invitation needs `redirectUrl` set to `/sign-up`. The page reads `__clerk_ticket`, draws the sender's card, shows the email locked, and asks only for the first name.
   - The ticket errors stay as shipped: N12, flyer E1 to E3, and U4 for an existing account.
   - DRAFT: the three body lines and *from the invitation*.
3. **Cart toasts at 768 to 1223 (S, lane cart/shopping).**
   - Below `(min-width: 76.5rem)`, while a cart receipt is up, the failed ask goes into the cart stack (`cart-toast-stack.tsx`). From `md`, the stack host takes the receipt's fixed slot (`bottom-[22px] right-[22px] w-[380px]`). Today `useCartPhone` gates the stack below `md` only (`edit-toast.tsx:126`).
   - Alone, each toast keeps its shipped place. From 1224 nothing changes. No new string.
4. **Results beads (S, lane deck stats).** In `deck-stats-results.tsx:88`, draw `data-results-ends` only while `beads.length >= 5`. Update the test that pins the ends line at fewer beads.
5. **A v2 run with v2 off (S, lane Suggested changes).** When `v2 === null`, a stored v2 run gets History C's past-run box (`suggested-changes-run.tsx:545`, the `past.stale` branch): `pastNote(moved)` when the list moved, else `pastNoteUncounted`. This applies whether the run is opened from History or from the tile. Today a run opened from History with v2 off draws History B's live line, which promises a re-check that can't be applied. Rows and read-only already work (`tuning-panel.tsx:1241`). No new string.
6. **Report a problem after a crash (M, lane flyer, paused with the flyer line).** Build Small items 7 addendum 8 (`global-error.tsx`, a public `/report`) plus three states: a failed send is the shared toast with `reportCopy.failed` and Try again, the typed text kept; sent at 1300 uses the same column; with no `ref`, no code line is drawn. No new string.

## Errata

- (i) and (ii): confirmed against `credits.ts` (`two.freeAfter`, `creditShortStanding`) and `tuning-panel.tsx:1410, :1600–1620`. The `Errata` board replaces Small items 7 `SC-Cost` C, E, and B and D's why line. There is no code change.
- (iii): confirmed against `tuning-limits-box.tsx:140`. Keep the fine-pointer condition on the 14px.
- (iv): confirmed against `suggested-changes-run.tsx:377` and #2476. There is no code change.
