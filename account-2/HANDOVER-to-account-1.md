# Handover: account 2 to account 1 (2026-10-28)

Give this file to account 1 at the start of its next Design session. Repo: `HartiganHM/the-99`. It replaces the 2026-10-16 handover (that version is in git history at `8a3d8bc`; its table is kept below).

## State on GitHub

- Everything account 2 designed is pushed to `design-assets` under `account-2/`. Tip at handover: `aa830cc` (Suggested changes v2 R2b).
- Every approved account-2 handoff is merged into main under `design/`, **except #2302** (Suggested changes v2), which is open, CI green and mergeable, waiting for Hugh to merge.
- Build prompts for Claude Code CLI are copied into `account-2/build-prompts/` (same files as the project's `build-prompts/` folder). Earlier rounds' prompts were handed to Hugh in chat and aren't in the folder.
- This note was delivered as a reference-only PR into `design-assets` (Hugh, 2026-10-28: "Just open a PR they can reference, no need to merge"). Read it from the PR branch `handover/account-2-to-account-1-2026-10-28`.

### Open PRs on the repo at handover

| PR | What | State |
|---|---|---|
| #2302 | Design handoff: Suggested changes v2 | Open, CI green, approved design. Hugh merges. |
| #2303 | Small items 3b: answer sheet over Home (code) | Open, engineering |
| #2299 | About visual PR 1: copy model, seen translation, tool labels (code) | Open, engineering |
| #2281 | chore: shared fwd-stack tsconfig and ESLint presets (code) | Open, engineering |

### Account-2 rounds since 2026-10-16

| Round | design-assets `account-2/` | Canvas | Handoff PR (main) | Build prompt |
|---|---|---|---|---|
| Buying credits R4 addendum (free-views line, placement B; Hugh's copy "Browsing is always free. Anything we write just for you uses a credit.") | design_handoff_the99_buying_credits/addendum-r4 (5288fb6..27d20af) | https://claude.ai/artifact/QKr6FLKgTyMmm9Zs4sbjHz | #2140 merged | buying-credits-r4.md |
| Help me choose bracket reach + How credits work About redraw | design_handoff_the99_help_me_choose/addendum-bracket-reach (19e1b81, 56de46d) | https://claude.ai/artifact/QCqMQe8fygDdKeUoV4iF8R | #2144 merged | (in chat) |
| Welcome credits onboarding (R2) | design_handoff_the99_welcome_credits (ad4eba8..dc3d8ce) | https://claude.ai/artifact/NSvXWeJpAUSfjdrfJsQREw | #2149 merged | welcome-credits.md |
| About launch-end batch halos (six entries) | design_handoff_the99_about/addendum-launch-end-batch (4576f77..902bb8d) | https://claude.ai/artifact/9LxtYGxzDzb6zPtudXpB5p | #2156 merged | (in chat) |
| Touch sizes and missing states addendum (item 1 scan not-ready WON'T BUILD) | design_handoff_the99_touch_sizes_addendum + addendum folders in collection_surfaces, commanders_discover, consider_tiles, decks, fan_content_notice, precons (f678543) | https://claude.ai/artifact/8QN9aKbTdh1B2rBZSk7TgZ | #2157 merged | (in chat) |
| Deck page messages (A2 to-do card, pass sheet) | design_handoff_the99_deck_messages (f1bde87..7c5b8b7) | https://claude.ai/artifact/CKv1LdWeXgSdqikozFPNe2 | #2170 merged | deck-messages.md |
| Menu and Home (Commanders tabs, Friends in the bar, Home feed, Settings; Home B) | design_handoff_the99_menu_home (5dba527, 083d650) | https://claude.ai/artifact/MhvPe5ucbxVLZ15jDCobpS | #2174 merged | menu-home.md |
| About entry for the menu + Home line, calls on what shipped | design_handoff_the99_about/addendum-menu-home-line (d153a92, cc1bc9c) | https://claude.ai/artifact/X32ArXv2R5NssZfiX9fFp1 | #2196 merged | — |
| Friend decks + Hidden from friends (R2) | design_handoff_the99_friend_decks (999b349..4dc0795) | https://claude.ai/artifact/Lp7STLn5477dNk36vRbPwr | #2203 merged | friend-decks.md |
| Spare requests (R2, Ask instead) | design_handoff_the99_spare_requests (18956eb..414544e) | https://claude.ai/artifact/9tqvZMRP6gmD5wenUKpA3P | #2205 merged | spare-requests.md |
| Combos one piece away (R1b) | design_handoff_the99_combos_close (c0e5563, 2c65499) | https://claude.ai/artifact/HTAi9E8E8CUMTPAydCDhx4 | #2214 merged | combos-close.md |
| Push notifications (delivery A) | design_handoff_the99_push (0713b9f, a5809ae) | https://claude.ai/artifact/G8WTrx3aMQmUCYqpD2aaxo | #2217 merged | push.md |
| Strategy focus (R2g ring + medallion; 35 strategy icons still owed) | design_handoff_the99_strategy_focus (3c8db5b..208a3ef) | https://claude.ai/artifact/5DXdxuVHyRhgFAEV83mirP | #2226 merged | strategy-focus.md |
| Friend decks About entry + ratify calls (Jaws ratified as shipped) | design_handoff_the99_about/addendum-friend-decks (71e1461..1dc79ad) | https://claude.ai/artifact/VGwkbjxhv51y1yMuzAYWS8 | #2241 merged | friend-decks-about.md |
| Signature card (any card, any printing) + spare asks outside Shopping (R1b) | design_handoff_the99_avatar (a077236, a88e642) | https://claude.ai/artifact/KC5YqYATfjhEwYLtFdYozK | #2265 merged | signature-card.md |
| About as six visual pages (R3) | design_handoff_the99_about_visual (31f9234..aea2370) | https://claude.ai/artifact/2xkvoZtTrCqsXYRg5RPhV9 | #2293 merged (Hugh's eng audit Yellow, ruled by A1) | (eng PRs from #2299) |
| About visual addendum A1 (Precons + Mana Balance placed, ? landings for nine screens) | same folder, board 8 (a2e811d) | same canvas | #2297 merged (Green) | — |
| Small items (cuts over+3, phone draft note, spare answer sheet, the ✕ + #2284/#2280/#2288, precon Overview, /friends two-column desktop, pod edit state) | design_handoff_the99_small_items (8026a5d..04a8b0e) | https://claude.ai/artifact/M6sfvrUxLdd3TWELr19b4x | #2294 merged | small-items.md |
| Suggested changes v2 (N in/N out at 99, request + chips, ~1.5N a side, streaming wait, bracket move, Apply 2N changes + Undo, history, About) | design_handoff_the99_suggested_changes_v2 (6ef08d1, 466aefe, e23c3a5, aa830cc) | https://claude.ai/artifact/QY9JsqnZvEcQNWvaAQ9QcJ | **#2302 OPEN** | suggested-changes-v2.md |

Inputs and specs that sit on main: About visual inputs `docs/superpowers/about-visual/` (#2283), Suggested changes v2 spec `docs/superpowers/specs/2026-10-27-suggested-changes-v2-design.md` (#2295), count-mechanism eval (#2291).

Account 1 can't open these canvases (different org). To revise a round, read its `account-2/` folder (README, boards, `scratch-gen/` generators) and rebuild; don't re-import `.dc.html`.

### Rounds before 2026-10-16 (from the previous handover, all merged)

Basic-lands stepper #1747 · Upcoming precons + Home banner #1751 · Small polish #1756 · Help me choose history #1765 · Collection Sync #1771 · Foil treatment R1 #1776 · No-collection entry #1788 · Proposed cuts About entry #1791 · Social R1 #1796 · Foil R2 #1797 · Social R3 #1798 · Announced reveal collapse #1849 · Social R2 #1858 · Social About entries #1873 · Foil mark addendum #1875 · Card rows one line #1901 · Card scanning #1903. Folders are the same names under `account-2/` and `design/`.

## Still open or in progress

- **#2302 Suggested changes v2 handoff**: approved, waiting for Hugh's merge. Build prompt is ready (seven PRs, backend through About).
- **TMNT / partner commanders** (code, not design): fix #2262 merged 2026-10-26 (single deck can grow into a pair when colours match exactly; pair→single still refused; needs `CHANGE_COMMANDER_ENABLED`). The thread is blocked on Hugh running the write probe on local-dev: `pnpm tsx scripts/probe-change-commander-write.ts` (all "grow" lines should PASS), then Peter testing his partner decks.
- **Push icon** (#2261 merged): Android grey "T" fix; on-device check by Hugh pending.
- **Bracket reach** form heads-up (option A) is on hold until engineering says whether the server can tell before submit.
- **Strategy focus**: 35 strategy icons owed.
- **Deck messages** open bits: ran-out Consider press, Commit/Discard in Review, About entry.
- **About visual** remaining data gaps: phone stored analysis, desktop pod captures.
- Account 1's own `buying_credits/addendum-r3` (2026-10-18) on design-assets has no PR; it was awaiting Hugh's audit.
- Idea not started: move the About notification into the Home banner.

## Sync rules

1. Before designing, pull `design-assets` and read `account-2/` (newest work) and `account-1/` (your own exports). For anything already built, main's `design/design_handoff_the99_*` is the approved version.
2. Don't re-import `.dc.html` files as Design projects. Use repo files as reference and rebuild canvases.
3. Commit Design exports unchanged to `design-assets` under `account-1/` only. Never write to `account-2/`. No restructuring, renaming or deduping.
4. Never merge `design-assets` into main and never open a PR from it to main. (This handover PR into `design-assets` is a one-off, reference-only, at Hugh's request.)
5. Commit messages name the account, the date and what changed, e.g. `account-1 2026-10-29: deck notes R1 for Hugh's audit`.
6. When Hugh approves a round, open a normal PR to main that adds `design/design_handoff_the99_<name>/` (or an `addendum-*` folder inside an existing handoff), mirroring earlier handoffs: README, READINESS, STATES, copy strings, boards, `art/`. Don't touch main's `design/` any other way. Design-only handoff PRs need no test run.
7. Push at the end of every session. The accounts alternate around the Friday usage reset; the other account starts from whatever is on GitHub.
8. Canvases can't load Scryfall images: upload images as canvas assets and reference them by their `/_blob` URL. Relative `art/` paths show as broken. Scryfall and MTGJSON are blocked from the cloud container; mtg.wtf works.

## Hugh's standing design rules

- Match the shipped UI on every design. Draw boards over the real shipped pages (screenshots or src), never a simplified app frame, and reuse shipped components (grid tile, card modal/sheet, ModalChrome, Shopping key). Extend shipped surfaces instead of inventing new ones.
- Prefer an inline option on the existing flow (like the precon "I own this" checkbox) over a follow-up banner or extra step.
- Give the player a choice, never lock them in (2026-10-27).
- Minimalist controls, one control per action, never split controls. Close buttons are a bare ✕ with no "Dismiss" text. Hugh dislikes redundant copy.
- Settings live in one place, with no duplicate fields. Don't add rows to the user menu; prefer a tab on an existing page.
- Hugh likes personality: card art, flips, subtle tilt. Plain screens read as unfinished.
- Never show a broken image. No board may be cut off: render and measure every board, size artboards to content, and give scrolling phone frames a fade + "scrolls on" so they don't read as cut off.
- Cards show as full card images at card shape (63/88), never the picture-frame crop used for user faces. Card text in a full-art band is fine; don't build machinery to hide something purely cosmetic.
- Card rows anywhere must match the shipped card rows, with all row info, and open card details on press.
- Dense rows (Shopping) stay uncrowded with large mobile hit boxes: a small marker explained in the key, opening a modal on desktop or a sheet on phone. Before adding a mark to a dense row, check the shipped row's full contents. Keys copy the shipped key layout exactly and group by order, never by dividers or new rows.
- No stamps or decoration foreign to the design system. Don't draw states or screens with no real trigger. Transient errors use the shared toast (ToastFrame).
- About visual: show only captures of the device the reader is on (desktop never shows phone shots).
- Friend names in fixtures: Colin, Peter, Max, Chris.
- Hugh sometimes opens option cards just to view mocks. Don't treat that as a pick; point to the canvas and ask in words, then wait for his words.

## Hugh's process preferences

- How a round runs: Hugh posts a design request (often with a brief or spec on main). Read the references from the repo, build canvases with the Design artifact type, commit to your folder, take Hugh's audit notes as R1b, R2 and so on, and on approval open the handoff PR to main. Hugh sometimes adds an engineering readiness audit to the PR; rule its items as an addendum. Once merged, write a build prompt; Hugh hands it to Claude Code CLI on his machine.
- Code PRs: rely on CI for the full suite, don't run it locally (targeted tests, typecheck, lint are fine); add `ci:full` when the change needs the whole suite. Have Copilot review at least twice, two more rounds if round 2 has findings. Hugh runs his pr-review skill on his machine before merging.
- Feature switches only when a regression is plausible; there are no PR previews.
- Don't draft messages for Hugh to send to friends or testers unless he asks.
- Sentry org slug is `fw-design` (use it when setting up Sentry for the-99).
