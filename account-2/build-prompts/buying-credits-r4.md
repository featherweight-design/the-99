# Build prompt · Buying credits R4 addendum (C1)

Paste into Claude Code on your machine once PR #2140 is merged.

---

Build the buying credits R4 addendum. Read `design/design_handoff_the99_buying_credits/addendum-r4/README.md` first, then `Free-Line.dc.html` (open it with `support.js` beside it). Work in a worktree under `.worktrees/`, as AGENTS.md says.

Only item 1 needs code. It closes C1 in `docs/superpowers/plans/2026-10-17-launch-epic.md`:

1. Add `viewsFree: "Browsing is always free. Anything we write just for you uses a credit."` to `creditsPageCopy` in `src/lib/copy/credits-page.ts`. This wording is final: Hugh signed it off with the copywriter on 2026-10-21. Do not reword it or send it to /copy-review.
2. In `src/components/credits/credits-head.tsx`, render it as a `<p>` after the sub: `m-0 mt-[4px] max-w-[900px] text-[13px] leading-[1.5] text-[color:var(--fg-body)]`. It is plain text, with no link, icon or tint. `CreditsHead` is shared by the page, its loading screen and its read-failed state, so all three carry the line. It also shows when payments are off and when buying is paused.
3. Put it in the head only (placement B). Placement A, under Get more credits, is drawn for the record only. Do not build it.
4. Add tests: the line renders in `CreditsView`, `CreditsLoading` and the read-failed state. No "AI", "model", "unlock", "premium" or "full access" appears in `creditsPageCopy`.
5. Check it at 390 and desktop in all six themes. It should be one line on desktop and two at 390, and nothing below the head should move.

Items 2 to 4 (pack first, the Plan and Packs cell rule, `Subscribe · $5 a month`) confirm what is already shipped, so leave them unchanged. No About entry is owed: this is a copy line on an existing page.

Payments stay off in production until this ships.
